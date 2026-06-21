from flask import Blueprint, request, jsonify, send_file, make_response
from flask_jwt_extended import jwt_required
from extensions import db, mail
from models import Etudiant, Paiement, AnneeScolaire
from datetime import date
from bareme import get_niveau as _get_niveau, echeancier_par_annee_libelle as _echeancier
import io

alertes_bp = Blueprint('alertes', __name__)


def _calcul_retard(etudiant, total_paye, today=None):
    if today is None:
        today = date.today()
    niveau = _get_niveau(etudiant.classe)
    items  = _echeancier(niveau, etudiant.annee_academique)
    budget = total_paye
    du_total   = 0
    retards    = []
    for echeance_date, montant, label in items:
        if budget >= montant:
            budget -= montant
        else:
            if echeance_date <= today:
                manquant = montant - budget if budget > 0 else montant
                budget = 0
                du_total += manquant
                retards.append({'label': label, 'date': echeance_date.strftime('%d/%m/%Y'),
                                'montant': montant, 'manquant': manquant})
    return du_total, retards


def _annee_active():
    a = db.session.query(AnneeScolaire).filter_by(active=True).first()
    return a.libelle if a else '2025-2026'


# ── GET /alertes/impayes ──────────────────────────────────────────────────────
@alertes_bp.route('/impayes', methods=['GET'])
@jwt_required()
def impayes():
    annee   = request.args.get('annee') or _annee_active()
    classe  = request.args.get('classe', '').strip()
    filiere = request.args.get('filiere', '').strip()

    q = db.session.query(Etudiant).filter_by(annee_academique=annee, statut='actif')
    if classe:  q = q.filter_by(classe=classe)
    if filiere: q = q.filter(Etudiant.filiere.ilike(f'%{filiere}%'))
    etudiants = q.all()

    today   = date.today()
    results = []
    for etu in etudiants:
        total_paye = db.session.query(db.func.sum(Paiement.montant)).filter(
            Paiement.id_etudiant == etu.id_etudiant,
            Paiement.annee_academique == annee
        ).scalar() or 0

        du_total, retards = _calcul_retard(etu, float(total_paye), today)
        if du_total > 0:
            results.append({
                **etu.to_dict(),
                'total_paye': float(total_paye),
                'montant_du': du_total,
                'retards':    retards,
            })

    results.sort(key=lambda x: x['montant_du'], reverse=True)
    return jsonify({'impayes': results, 'total': len(results), 'annee': annee}), 200


# ── POST /alertes/envoyer-relances ────────────────────────────────────────────
@alertes_bp.route('/envoyer-relances', methods=['POST'])
@jwt_required()
def envoyer_relances():
    from flask import current_app
    data        = request.get_json()
    ids_etudiants = data.get('ids', [])   # [] = tous les retardataires de l'année
    annee       = data.get('annee') or _annee_active()

    q = db.session.query(Etudiant).filter_by(annee_academique=annee, statut='actif')
    if ids_etudiants:
        q = q.filter(Etudiant.id_etudiant.in_(ids_etudiants))
    etudiants = q.all()

    today   = date.today()
    envoyes = []
    echecs  = []

    for etu in etudiants:
        if not etu.email:
            echecs.append({'matricule': etu.matricule, 'raison': 'Email manquant'})
            continue
        total_paye = db.session.query(db.func.sum(Paiement.montant)).filter(
            Paiement.id_etudiant == etu.id_etudiant,
            Paiement.annee_academique == annee
        ).scalar() or 0
        du_total, retards = _calcul_retard(etu, float(total_paye), today)
        if du_total <= 0:
            continue

        lignes_retard = '\n'.join(
            f"  - {r['label']} ({r['date']}) : {r['manquant']:,.0f} FCFA"
            for r in retards
        )
        corps = (
            f"Bonjour {etu.prenom} {etu.nom},\n\n"
            f"Nous vous contactons concernant votre situation financière pour l'année académique {annee}.\n\n"
            f"Montant total en retard : {du_total:,.0f} FCFA\n\n"
            f"Détail des échéances non réglées :\n{lignes_retard}\n\n"
            f"Nous vous prions de bien vouloir régulariser votre situation dans les meilleurs délais.\n\n"
            f"Cordialement,\nService Financier — ISM Dakar"
        )
        try:
            from flask_mail import Message as MailMessage
            msg = MailMessage(
                subject=f"[ISM Dakar] Relance paiement — {annee}",
                recipients=[etu.email],
                body=corps,
                sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@ism.edu.sn')
            )
            mail.send(msg)
            envoyes.append(etu.matricule)
        except Exception as e:
            echecs.append({'matricule': etu.matricule, 'raison': str(e)})

    return jsonify({
        'message': f'{len(envoyes)} email(s) envoyé(s)',
        'envoyes': envoyes,
        'echecs':  echecs,
    }), 200


# ── GET /alertes/export-pdf ───────────────────────────────────────────────────
@alertes_bp.route('/export-pdf', methods=['GET'])
@jwt_required()
def export_pdf():
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import ParagraphStyle

    annee = request.args.get('annee') or _annee_active()
    q = db.session.query(Etudiant).filter_by(annee_academique=annee, statut='actif').all()
    today = date.today()
    retardataires = []
    for etu in q:
        total_paye = db.session.query(db.func.sum(Paiement.montant)).filter(
            Paiement.id_etudiant == etu.id_etudiant,
            Paiement.annee_academique == annee
        ).scalar() or 0
        du, _ = _calcul_retard(etu, float(total_paye), today)
        if du > 0:
            retardataires.append((etu, float(total_paye), du))

    retardataires.sort(key=lambda x: x[2], reverse=True)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                             leftMargin=2*cm, rightMargin=2*cm,
                             topMargin=2*cm, bottomMargin=2*cm)
    BLEU  = colors.HexColor('#1B3A6B')
    ROUGE = colors.HexColor('#DC2626')
    titre_style = ParagraphStyle('titre', fontSize=16, fontName='Helvetica-Bold',
                                  textColor=BLEU, spaceAfter=4)
    sous_titre  = ParagraphStyle('sous', fontSize=10, textColor=colors.HexColor('#64748B'), spaceAfter=16)

    elems = [
        Paragraph("ISM Dakar — Liste des Impayés", titre_style),
        Paragraph(f"Année académique : {annee} — Édité le {today.strftime('%d/%m/%Y')}", sous_titre),
        Spacer(1, 0.3*cm),
    ]

    headers = ['Matricule', 'Nom & Prénom', 'Classe', 'Filière', 'Payé (FCFA)', 'Dû (FCFA)']
    rows = [headers]
    for etu, paye, du in retardataires:
        rows.append([
            etu.matricule,
            f"{etu.prenom} {etu.nom}",
            etu.classe,
            (etu.filiere or '').split('(')[-1].replace(')', '').strip() if '(' in (etu.filiere or '') else (etu.filiere or ''),
            f"{paye:,.0f}",
            f"{du:,.0f}",
        ])

    col_widths = [3.5*cm, 5*cm, 1.8*cm, 3*cm, 2.8*cm, 2.8*cm]
    tbl = Table(rows, colWidths=col_widths)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0),  BLEU),
        ('TEXTCOLOR',    (0,0), (-1,0),  colors.white),
        ('FONTNAME',     (0,0), (-1,0),  'Helvetica-Bold'),
        ('FONTSIZE',     (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TEXTCOLOR',    (5,1), (5,-1), ROUGE),
        ('FONTNAME',     (5,1), (5,-1), 'Helvetica-Bold'),
        ('GRID',         (0,0), (-1,-1), 0.4, colors.HexColor('#E2E8F0')),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ('LEFTPADDING',  (0,0), (-1,-1), 6),
        ('ALIGN',        (4,0), (5,-1), 'RIGHT'),
    ]))
    elems.append(tbl)
    elems.append(Spacer(1, 0.5*cm))

    total_du = sum(du for _, _, du in retardataires)
    elems.append(Paragraph(
        f"<b>Total retardataires : {len(retardataires)} étudiant(s)</b>&nbsp;&nbsp;&nbsp;"
        f"<b>Montant total dû : {total_du:,.0f} FCFA</b>",
        ParagraphStyle('total', fontSize=10, textColor=BLEU, fontName='Helvetica-Bold')
    ))

    doc.build(elems)
    pdf_bytes = buf.getvalue()
    filename  = f"impayes_{annee.replace('-','_')}_{today.strftime('%Y%m%d')}.pdf"
    resp = make_response(pdf_bytes)
    resp.headers['Content-Type']        = 'application/pdf'
    resp.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    resp.headers['Content-Length']      = len(pdf_bytes)
    return resp


# ── GET /alertes/export-csv ───────────────────────────────────────────────────
@alertes_bp.route('/export-csv', methods=['GET'])
@jwt_required()
def export_csv():
    annee = request.args.get('annee') or _annee_active()
    q = db.session.query(Etudiant).filter_by(annee_academique=annee, statut='actif').all()
    today = date.today()

    lines = ['﻿Matricule;Nom;Prénom;Classe;Filière;Email;Contact;Payé (FCFA);Dû (FCFA)\n']
    for etu in q:
        total_paye = db.session.query(db.func.sum(Paiement.montant)).filter(
            Paiement.id_etudiant == etu.id_etudiant,
            Paiement.annee_academique == annee
        ).scalar() or 0
        du, _ = _calcul_retard(etu, float(total_paye), today)
        if du > 0:
            lines.append(
                f"{etu.matricule};{etu.nom};{etu.prenom};{etu.classe};"
                f"{etu.filiere or ''};{etu.email or ''};{etu.contact or ''};"
                f"{float(total_paye):,.0f};{du:,.0f}\n"
            )

    csv_bytes = ''.join(lines).encode('utf-8-sig')
    filename  = f"impayes_{annee.replace('-','_')}_{today.strftime('%Y%m%d')}.csv"
    resp = make_response(csv_bytes)
    resp.headers['Content-Type']        = 'text/csv; charset=utf-8'
    resp.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    resp.headers['Content-Length']      = len(csv_bytes)
    return resp
