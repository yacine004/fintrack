from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Paiement, Etudiant, Caisse
from datetime import datetime
import io

paiements_bp = Blueprint('paiements', __name__)


# ── Décorateurs ───────────────────────────────────────────────────────────────
def raf_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt().get('user', {})
        if identity.get('role') != 'raf':
            return jsonify({'message': 'Accès réservé au RAF'}), 403
        return fn(*args, **kwargs)
    return wrapper

def auth_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


# ── ENREGISTRER un paiement ───────────────────────────────────────────────────
@paiements_bp.route('', methods=['POST'])
@auth_required
def creer():
    data = request.get_json()

    id_etudiant   = data.get('id_etudiant')
    id_caisse     = data.get('id_caisse')
    montant       = data.get('montant')
    mode_paiement = data.get('mode_paiement', '').strip()
    motif         = data.get('motif', '').strip()
    reference     = data.get('reference', '').strip()

    # Validations
    if not all([id_etudiant, id_caisse, montant, mode_paiement]):
        return jsonify({'message': 'Étudiant, caisse, montant et mode de paiement sont obligatoires'}), 400

    try:
        montant = float(montant)
        if montant <= 0:
            return jsonify({'message': 'Le montant doit être positif'}), 400
    except (ValueError, TypeError):
        return jsonify({'message': 'Montant invalide'}), 400

    if mode_paiement not in ('especes', 'virement', 'cheque', 'wave'):
        return jsonify({'message': 'Mode de paiement invalide. Valeurs : especes, virement, cheque, wave'}), 400

    etudiant = db.session.get(Etudiant, id_etudiant)
    if not etudiant:
        return jsonify({'message': 'Étudiant introuvable'}), 404
    if etudiant.statut == 'archive':
        return jsonify({'message': 'Impossible d\'enregistrer un paiement pour un étudiant archivé'}), 400

    caisse = db.session.get(Caisse, id_caisse)
    if not caisse:
        return jsonify({'message': 'Caisse introuvable'}), 404
    if caisse.statut == 'inactive':
        return jsonify({'message': 'La caisse sélectionnée est inactive'}), 400

    # Transaction atomique : créer le paiement + mettre à jour le solde
    try:
        paiement = Paiement(
            id_etudiant=id_etudiant,
            id_caisse=id_caisse,
            montant=montant,
            mode_paiement=mode_paiement,
            motif=motif or None,
            reference=reference or None
        )
        db.session.add(paiement)

        # Mise à jour solde caisse
        caisse.solde_actuel = float(caisse.solde_actuel) + montant

        db.session.commit()

        return jsonify({
            'message':  'Paiement enregistré avec succès',
            'paiement': paiement.to_dict(),
            'nouveau_solde': float(caisse.solde_actuel)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erreur lors de l\'enregistrement : {str(e)}'}), 500


# ── LISTER paiements avec filtres + pagination ────────────────────────────────
@paiements_bp.route('', methods=['GET'])
@auth_required
def lister():
    identity    = get_jwt().get('user', {})
    id_etudiant = request.args.get('etudiant_id', '').strip()
    id_caisse   = request.args.get('caisse_id', '').strip()
    mode        = request.args.get('mode', '').strip()
    date_debut  = request.args.get('date_debut', '').strip()
    date_fin    = request.args.get('date_fin', '').strip()
    page        = int(request.args.get('page', 1))
    limit       = int(request.args.get('limit', 10))

    query = db.session.query(Paiement)

    if id_etudiant:
        query = query.filter(Paiement.id_etudiant == int(id_etudiant))
    if id_caisse:
        query = query.filter(Paiement.id_caisse == int(id_caisse))
    if mode in ('especes', 'virement', 'cheque', 'wave'):
        query = query.filter(Paiement.mode_paiement == mode)
    if date_debut:
        try:
            query = query.filter(Paiement.date_paiement >= datetime.strptime(date_debut, '%Y-%m-%d'))
        except ValueError:
            pass
    if date_fin:
        try:
            query = query.filter(Paiement.date_paiement <= datetime.strptime(date_fin, '%Y-%m-%d'))
        except ValueError:
            pass

    total      = query.count()
    paiements  = query.order_by(Paiement.date_paiement.desc())\
                      .offset((page - 1) * limit).limit(limit).all()
    nb_pages   = (total + limit - 1) // limit

    # KPIs
    tous = db.session.query(Paiement).all()
    total_encaisse = sum(float(p.montant) for p in tous)

    return jsonify({
        'paiements': [p.to_dict() for p in paiements],
        'total':     total,
        'page':      page,
        'nb_pages':  nb_pages,
        'kpis': {
            'total_paiements': len(tous),
            'total_encaisse':  total_encaisse,
        }
    }), 200


# ── DÉTAIL d'un paiement ──────────────────────────────────────────────────────
@paiements_bp.route('/<int:pid>', methods=['GET'])
@auth_required
def detail(pid):
    paiement = db.session.get(Paiement, pid)
    if not paiement:
        return jsonify({'message': 'Paiement introuvable'}), 404
    return jsonify(paiement.to_dict()), 200


# ── GÉNÉRER REÇU PDF ──────────────────────────────────────────────────────────
@paiements_bp.route('/<int:pid>/recu', methods=['GET'])
@auth_required
def generer_recu(pid):
    paiement = db.session.get(Paiement, pid)
    if not paiement:
        return jsonify({'message': 'Paiement introuvable'}), 404

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

        buffer = io.BytesIO()
        doc    = SimpleDocTemplate(buffer, pagesize=A4,
                                   rightMargin=2*cm, leftMargin=2*cm,
                                   topMargin=2*cm, bottomMargin=2*cm)

        styles   = getSampleStyleSheet()
        elements = []

        BLUE  = colors.HexColor('#1B3A6B')
        GREEN = colors.HexColor('#27AE60')
        GRAY  = colors.HexColor('#64748B')
        LIGHT = colors.HexColor('#F1F5F9')

        style_title  = ParagraphStyle('title',  fontSize=22, textColor=BLUE, alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=4)
        style_sub    = ParagraphStyle('sub',    fontSize=11, textColor=GRAY, alignment=TA_CENTER, spaceAfter=2)
        style_h2     = ParagraphStyle('h2',     fontSize=13, textColor=BLUE, fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=6)
        style_normal = ParagraphStyle('normal', fontSize=11, textColor=colors.black)
        style_green  = ParagraphStyle('green',  fontSize=18, textColor=GREEN, fontName='Helvetica-Bold', alignment=TA_CENTER)

        # En-tête
        elements.append(Paragraph('FinTrack', style_title))
        elements.append(Paragraph('Plateforme de Gestion Financière — ISM Dakar', style_sub))
        elements.append(HRFlowable(width='100%', thickness=2, color=BLUE))
        elements.append(Spacer(1, 0.5*cm))

        # Titre reçu
        elements.append(Paragraph('REÇU DE PAIEMENT', ParagraphStyle('rtitle', fontSize=16,
            textColor=colors.white, alignment=TA_CENTER, fontName='Helvetica-Bold',
            backColor=BLUE, borderPadding=10)))
        elements.append(Spacer(1, 0.4*cm))

        # Numéro et date
        elements.append(Paragraph(f'N° : FT-{paiement.id_paiement:05d}', ParagraphStyle('ref',
            fontSize=11, textColor=GRAY, alignment=TA_RIGHT)))
        elements.append(Paragraph(f'Date : {paiement.date_paiement.strftime("%d/%m/%Y à %H:%M")}',
            ParagraphStyle('date', fontSize=11, textColor=GRAY, alignment=TA_RIGHT)))
        elements.append(Spacer(1, 0.5*cm))

        # Montant
        elements.append(Paragraph(f'{float(paiement.montant):,.0f} FCFA'.replace(',', ' '), style_green))
        elements.append(Spacer(1, 0.4*cm))
        elements.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#E2E8F0')))
        elements.append(Spacer(1, 0.3*cm))

        # Détails
        etudiant = paiement.etudiant
        caisse   = paiement.caisse

        data = [
            ['ÉTUDIANT', ''],
            ['Nom complet', f'{etudiant.prenom} {etudiant.nom}' if etudiant else 'N/A'],
            ['Matricule', etudiant.matricule if etudiant else 'N/A'],
            ['Classe / Filière', f'{etudiant.classe} — {etudiant.filiere or ""}' if etudiant else 'N/A'],
            ['', ''],
            ['PAIEMENT', ''],
            ['Mode de paiement', paiement.mode_paiement.capitalize()],
            ['Caisse', caisse.nom if caisse else 'N/A'],
            ['Motif', paiement.motif or 'Paiement scolarité'],
            ['Référence', paiement.reference or '—'],
        ]

        table = Table(data, colWidths=[5*cm, 11*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BLUE),
            ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
            ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',   (0, 0), (-1, 0), 11),
            ('SPAN',       (0, 0), (-1, 0)),
            ('ALIGN',      (0, 0), (-1, 0), 'CENTER'),
            ('BACKGROUND', (0, 5), (-1, 5), BLUE),
            ('TEXTCOLOR',  (0, 5), (-1, 5), colors.white),
            ('FONTNAME',   (0, 5), (-1, 5), 'Helvetica-Bold'),
            ('SPAN',       (0, 5), (-1, 5)),
            ('ALIGN',      (0, 5), (-1, 5), 'CENTER'),
            ('BACKGROUND', (0, 4), (-1, 4), colors.white),
            ('FONTNAME',   (0, 1), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR',  (0, 1), (0, -1), BLUE),
            ('FONTSIZE',   (0, 1), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT, colors.white]),
            ('GRID',       (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING',    (0, 0), (-1, -1), 8),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 1*cm))

        # Signature
        elements.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#E2E8F0')))
        elements.append(Spacer(1, 0.3*cm))
        sig_data = [['Signature du Caissier', 'Cachet de l\'établissement']]
        sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
        sig_table.setStyle(TableStyle([
            ('FONTNAME',  (0,0), (-1,-1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0,0), (-1,-1), GRAY),
            ('FONTSIZE',  (0,0), (-1,-1), 10),
            ('ALIGN',     (0,0), (-1,-1), 'CENTER'),
        ]))
        elements.append(sig_table)
        elements.append(Spacer(1, 2*cm))

        # Footer
        elements.append(HRFlowable(width='100%', thickness=1, color=BLUE))
        elements.append(Paragraph('Ce reçu est généré automatiquement par FinTrack — ISM Dakar',
            ParagraphStyle('footer', fontSize=9, textColor=GRAY, alignment=TA_CENTER)))

        doc.build(elements)
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=False,
            download_name=f'recu_FT{paiement.id_paiement:05d}.pdf'
        )

    except ImportError:
        return jsonify({'message': 'ReportLab non installé. Exécutez : pip install reportlab'}), 500
    except Exception as e:
        return jsonify({'message': f'Erreur génération PDF : {str(e)}'}), 500


# ── LISTE DES IMPAYÉS (RAF uniquement) ────────────────────────────────────────
@paiements_bp.route('/impayes', methods=['GET'])
@raf_required
def impayes():
    annee  = request.args.get('annee', '').strip()
    classe = request.args.get('classe', '').strip()
    page   = int(request.args.get('page', 1))
    limit  = int(request.args.get('limit', 10))

    # Tous les étudiants actifs
    query = db.session.query(Etudiant).filter_by(statut='actif')
    if annee:
        query = query.filter(Etudiant.annee_academique == annee)
    if classe:
        query = query.filter(Etudiant.classe == classe)

    tous_etudiants = query.all()

    # Calculer le total payé par étudiant
    montant_attendu = 500000  # 500 000 FCFA de frais de scolarité (exemple)

    impayes_list = []
    for etudiant in tous_etudiants:
        total_paye = sum(float(p.montant) for p in etudiant.paiements)
        solde_restant = montant_attendu - total_paye
        if solde_restant > 0:
            impayes_list.append({
                'etudiant':       etudiant.to_dict(),
                'total_paye':     total_paye,
                'montant_attendu': montant_attendu,
                'solde_restant':  solde_restant,
                'nb_paiements':   len(etudiant.paiements),
            })

    # Trier par solde restant décroissant
    impayes_list.sort(key=lambda x: x['solde_restant'], reverse=True)

    total    = len(impayes_list)
    debut    = (page - 1) * limit
    nb_pages = (total + limit - 1) // limit

    return jsonify({
        'impayes':  impayes_list[debut:debut+limit],
        'total':    total,
        'page':     page,
        'nb_pages': nb_pages,
        'total_impaye': sum(i['solde_restant'] for i in impayes_list)
    }), 200
