from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Paiement, Etudiant, Caisse, Notification, Utilisateur, ConfigApp, SessionCaisse
from datetime import datetime
from routes.audit import log_action
from utils import generer_reference, prochain_numero_reference
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


@paiements_bp.route('/prochain-numero', methods=['GET'])
@auth_required
def prochain_numero():
    """Retourne la prochaine référence sans l'incrémenter (lecture seule)."""
    return jsonify({'reference': prochain_numero_reference()})


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
        identity = get_jwt().get('user', {})
        reference_auto = generer_reference()

        paiement = Paiement(
            id_etudiant=id_etudiant,
            id_caisse=id_caisse,
            id_createur=identity.get('id'),
            montant=montant,
            mode_paiement=mode_paiement,
            motif=motif or None,
            reference=reference_auto,
            annee_academique=etudiant.annee_academique
        )
        db.session.add(paiement)

        # Mise à jour solde caisse
        caisse.solde_actuel = float(caisse.solde_actuel) + montant

        # Mise à jour session du jour si ouverte
        from datetime import date as _date
        session_jour = db.session.query(SessionCaisse).filter_by(
            id_caisse=id_caisse, statut='ouverte'
        ).filter(SessionCaisse.date_session == _date.today()).first()
        if session_jour:
            session_jour.total_entrees = float(session_jour.total_entrees) + montant

        # Notification pour tous les RAFs
        rafs = db.session.query(Utilisateur).filter_by(role='raf', actif=True).all()
        for raf in rafs:
            db.session.add(Notification(
                id_utilisateur=raf.id_utilisateur,
                type='paiement',
                message=f"Paiement reçu : {etudiant.prenom} {etudiant.nom} — {montant:,.0f} FCFA ({mode_paiement})",
                priorite='normale'
            ))

        db.session.commit()

        log_action(identity.get('id'), 'CREATE', 'Paiement', paiement.id_paiement,
                   {'montant': montant, 'etudiant_id': id_etudiant, 'caisse': caisse.nom, 'mode': mode_paiement, 'reference': paiement.reference})
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
    annee       = request.args.get('annee', '').strip()
    date_debut  = request.args.get('date_debut', '').strip()
    date_fin    = request.args.get('date_fin', '').strip()
    page        = int(request.args.get('page', 1))
    limit       = int(request.args.get('limit', 10))

    query = db.session.query(Paiement)

    if id_etudiant:
        query = query.filter(Paiement.id_etudiant == int(id_etudiant))
    if annee:
        query = query.filter(Paiement.annee_academique == annee)
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
def _montant_en_lettres(n):
    """Convertit un entier en toutes lettres (français, jusqu'à 9 999 999)."""
    _units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
              'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
              'dix-sept', 'dix-huit', 'dix-neuf']
    _tens  = ['', '', 'vingt', 'trente', 'quarante', 'cinquante',
              'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

    def _lt100(x):
        if x == 0: return ''
        if x < 20: return _units[x]
        t, u = divmod(x, 10)
        if t == 7:  return 'soixante-' + _units[10 + u]
        if t == 9:  return ('quatre-vingt-' + _units[10 + u]) if u else 'quatre-vingt-dix'
        sep = '-et-' if u == 1 and t != 8 else ('-' if u else '')
        return _tens[t] + sep + _units[u]

    def _lt1000(x):
        if x == 0: return ''
        h, rem = divmod(x, 100)
        if h == 0: return _lt100(rem)
        cent = 'cent' if h == 1 else _units[h] + ' cent'
        return (cent + ' ' + _lt100(rem)).strip() if rem else cent

    def _words(x):
        if x == 0: return 'zero'
        if x >= 1_000_000:
            m, rest = divmod(x, 1_000_000)
            s = _lt1000(m) + ' million' + ('s' if m > 1 else '')
            return (s + ' ' + _words(rest)).strip() if rest else s
        if x >= 1000:
            m, rest = divmod(x, 1000)
            prefix = 'mille' if m == 1 else _lt1000(m) + ' mille'
            return (prefix + ' ' + _lt1000(rest)).strip() if rest else prefix
        return _lt1000(x)

    n = int(round(n))
    return _words(n) if n else 'zero'


MODE_LABELS = {
    'especes':  'Espèces',
    'virement': 'Virement bancaire',
    'cheque':   'Chèque',
    'wave':     'Wave / Mobile Money',
}


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
        from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                        Table, TableStyle, HRFlowable)
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

        buffer = io.BytesIO()
        doc    = SimpleDocTemplate(buffer, pagesize=A4,
                                   rightMargin=1.8*cm, leftMargin=1.8*cm,
                                   topMargin=1.5*cm, bottomMargin=1.5*cm)

        BLUE   = colors.HexColor('#1B3A6B')
        LBLUE  = colors.HexColor('#2D5FA8')
        GREEN  = colors.HexColor('#16A34A')
        GRAY   = colors.HexColor('#64748B')
        LGRAY  = colors.HexColor('#F1F5F9')
        BGRAY  = colors.HexColor('#E2E8F0')
        WHITE  = colors.white

        etudiant = paiement.etudiant
        caisse   = paiement.caisse
        montant  = float(paiement.montant)
        num_recu = paiement.reference or f'FT-{paiement.id_paiement:05d}'
        date_str = paiement.date_paiement.strftime('%d/%m/%Y')
        heure_str = paiement.date_paiement.strftime('%H:%M')
        mode_label = MODE_LABELS.get(paiement.mode_paiement, paiement.mode_paiement)
        montant_fmt = f"{montant:,.0f}".replace(',', ' ') + ' FCFA'
        montant_lettres = _montant_en_lettres(montant).capitalize() + ' francs CFA'

        elems = []

        # ── EN-TÊTE : bandeau bleu avec logo + infos école ────────────────────
        header_data = [[
            Paragraph(
                '<b>ISM DAKAR</b><br/>'
                'École d\'Ingénieurs et Digital Campus<br/>'
                'BP 3278 - Dakar, Senegal<br/>'
                'Tél : +221 33 825 00 00 | www.ism.edu.sn',
                ParagraphStyle('hl', fontSize=9.5, textColor=WHITE,
                               fontName='Helvetica-Bold', leading=14)
            ),
            Paragraph(
                f'<b>REÇU N°</b><br/><font size="18"><b>{num_recu}</b></font><br/>'
                f'Date : {date_str}<br/>Heure : {heure_str}',
                ParagraphStyle('hr', fontSize=9.5, textColor=WHITE,
                               fontName='Helvetica', leading=14, alignment=TA_RIGHT)
            ),
        ]]
        header_table = Table(header_data, colWidths=[10*cm, 7*cm])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BLUE),
            ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING',    (0,0), (-1,-1), 14),
            ('TOPPADDING', (0,0), (-1,-1), 16),
            ('BOTTOMPADDING',(0,0),(-1,-1), 16),
        ]))
        elems.append(header_table)

        # ── BANDEAU TITRE ─────────────────────────────────────────────────────
        elems.append(Table(
            [[Paragraph('REÇU DE SCOLARITÉ', ParagraphStyle(
                'rt', fontSize=13, textColor=WHITE, fontName='Helvetica-Bold',
                alignment=TA_CENTER))]],
            colWidths=[17*cm],
            style=[('BACKGROUND',(0,0),(-1,-1), LBLUE),
                   ('PADDING',(0,0),(-1,-1), 7)]
        ))
        elems.append(Spacer(1, 0.5*cm))

        # ── INFORMATIONS ÉTUDIANT ─────────────────────────────────────────────
        elems.append(Paragraph('INFORMATIONS ÉTUDIANT',
            ParagraphStyle('sh', fontSize=9, textColor=BLUE,
                           fontName='Helvetica-Bold', spaceBefore=0, spaceAfter=4)))

        et_nom    = f'{etudiant.prenom} {etudiant.nom}'.upper() if etudiant else 'N/A'
        et_mat    = etudiant.matricule if etudiant else 'N/A'
        et_fil    = f'{etudiant.classe} - {etudiant.filiere}' if etudiant else 'N/A'
        et_annee  = etudiant.annee_academique if etudiant else '-'

        # Styles Paragraph pour les cellules (wrapping automatique)
        _lbl = ParagraphStyle('elbl', fontSize=9, fontName='Helvetica-Bold',
                              textColor=BLUE, leading=12)
        _val = ParagraphStyle('eval', fontSize=9, leading=12)

        etu_data = [
            [Paragraph('Nom et Prénom',      _lbl), Paragraph(et_nom,    _val),
             Paragraph('Matricule',          _lbl), Paragraph(et_mat,    _val)],
            [Paragraph('Filière / Classe',   _lbl), Paragraph(et_fil,    _val),
             Paragraph('Année académique',   _lbl), Paragraph(et_annee,  _val)],
        ]
        # Col 1 (valeur filière) élargie à 6.5 cm pour absorber les noms longs
        etu_table = Table(etu_data, colWidths=[3.5*cm, 6.5*cm, 3.5*cm, 3.5*cm])
        etu_table.setStyle(TableStyle([
            ('BACKGROUND',(0,0), (0,-1), LGRAY),
            ('BACKGROUND',(2,0), (2,-1), LGRAY),
            ('GRID',      (0,0), (-1,-1), 0.5, BGRAY),
            ('PADDING',   (0,0), (-1,-1), 7),
            ('VALIGN',    (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elems.append(etu_table)
        elems.append(Spacer(1, 0.4*cm))

        # ── OBJET DU PAIEMENT ─────────────────────────────────────────────────
        motif = paiement.motif or 'Frais de scolarité'
        elems.append(Table(
            [[Paragraph(f'<b>OBJET :</b>  {motif}',
                ParagraphStyle('obj', fontSize=10, textColor=BLUE, leading=14))]],
            colWidths=[17*cm],
            style=[('BACKGROUND',(0,0),(-1,-1), LGRAY),
                   ('PADDING',(0,0),(-1,-1), 9),
                   ('BOX',(0,0),(-1,-1), 0.5, BGRAY)]
        ))
        elems.append(Spacer(1, 0.5*cm))

        # ── MONTANT ───────────────────────────────────────────────────────────
        elems.append(Paragraph('MONTANT REÇU',
            ParagraphStyle('sh2', fontSize=9, textColor=BLUE,
                           fontName='Helvetica-Bold', spaceAfter=4)))
        montant_data = [
            [Paragraph(f'<font size="26"><b>{montant_fmt}</b></font>',
                ParagraphStyle('mf', fontSize=26, textColor=GREEN,
                               fontName='Helvetica-Bold', alignment=TA_CENTER))],
            [Paragraph(f'<i>En lettres : {montant_lettres}</i>',
                ParagraphStyle('ml', fontSize=9, textColor=GRAY, alignment=TA_CENTER,
                               leading=13))],
        ]
        mt_table = Table(montant_data, colWidths=[17*cm], rowHeights=[1.8*cm, None])
        mt_table.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,-1), colors.HexColor('#F0FDF4')),
            ('BOX',          (0,0), (-1,-1), 1.5, GREEN),
            # Ligne 1 : le grand montant
            ('TOPPADDING',    (0,0), (0,0), 14),
            ('BOTTOMPADDING', (0,0), (0,0),  6),
            ('LEFTPADDING',   (0,0), (0,0), 12),
            ('RIGHTPADDING',  (0,0), (0,0), 12),
            ('VALIGN',        (0,0), (0,0), 'MIDDLE'),
            # Ligne 2 : en lettres
            ('TOPPADDING',    (0,1), (0,1),  8),
            ('BOTTOMPADDING', (0,1), (0,1), 14),
            ('LEFTPADDING',   (0,1), (0,1), 12),
            ('RIGHTPADDING',  (0,1), (0,1), 12),
            ('VALIGN',        (0,1), (0,1), 'TOP'),
            # Séparateur visuel entre les deux lignes
            ('LINEABOVE',     (0,1), (0,1), 0.5, colors.HexColor('#BBF7D0')),
        ]))
        elems.append(mt_table)
        elems.append(Spacer(1, 0.5*cm))

        # ── DÉTAILS DU PAIEMENT ───────────────────────────────────────────────
        elems.append(Paragraph('DÉTAILS DU PAIEMENT',
            ParagraphStyle('sh3', fontSize=9, textColor=BLUE,
                           fontName='Helvetica-Bold', spaceAfter=4)))
        ref = paiement.reference or '-'
        createur = db.session.get(Utilisateur, paiement.id_createur) if paiement.id_createur else None
        createur_nom = f"{createur.civilite or 'M.'} {createur.nom}" if createur else 'FinTrack / Comptabilité'
        det_data = [
            [Paragraph('Mode de paiement', _lbl), Paragraph(mode_label,              _val),
             Paragraph('Référence',         _lbl), Paragraph(ref,                     _val)],
            [Paragraph('Caisse',            _lbl), Paragraph(caisse.nom if caisse else '-', _val),
             Paragraph('Enregistré par',    _lbl), Paragraph(createur_nom,            _val)],
        ]
        det_table = Table(det_data, colWidths=[3.5*cm, 6.5*cm, 3.5*cm, 3.5*cm])
        det_table.setStyle(TableStyle([
            ('BACKGROUND',(0,0), (0,-1), LGRAY),
            ('BACKGROUND',(2,0), (2,-1), LGRAY),
            ('GRID',      (0,0), (-1,-1), 0.5, BGRAY),
            ('PADDING',   (0,0), (-1,-1), 7),
            ('VALIGN',    (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elems.append(det_table)
        elems.append(Spacer(1, 0.8*cm))

        # ── SIGNATURES ────────────────────────────────────────────────────────
        sig_data = [[
            Paragraph(
                '<b>Le Caissier / Comptable</b><br/><br/><br/><br/>Signature :',
                ParagraphStyle('sc', fontSize=9, fontName='Helvetica', textColor=BLUE, alignment=TA_CENTER, leading=14)
            ),
            Paragraph(
                '<b>Cachet et Signature RAF</b><br/><br/><br/><br/>Signature :',
                ParagraphStyle('sc2', fontSize=9, fontName='Helvetica', textColor=BLUE, alignment=TA_CENTER, leading=14)
            ),
            Paragraph(
                '<b><font color="#16A34A">BON POUR ACQUIT</font></b><br/><br/><br/><br/>'
                '<font color="#16A34A">Lu et approuvé</font>',
                ParagraphStyle('bpa', fontSize=9, fontName='Helvetica', alignment=TA_CENTER, leading=14)
            ),
        ]]
        sig_table = Table(sig_data, colWidths=[6*cm, 5.5*cm, 5.5*cm], rowHeights=[3.5*cm])
        sig_table.setStyle(TableStyle([
            ('BOX',        (0,0), (0,0), 0.5, BGRAY),
            ('BOX',        (1,0), (1,0), 0.5, BGRAY),
            ('BOX',        (2,0), (2,0), 1.5, GREEN),
            ('BACKGROUND', (2,0), (2,0), colors.HexColor('#F0FDF4')),
            ('PADDING',    (0,0), (-1,-1), 10),
            ('VALIGN',     (0,0), (-1,-1), 'TOP'),
            ('ALIGN',      (0,0), (-1,-1), 'CENTER'),
        ]))
        elems.append(sig_table)
        elems.append(Spacer(1, 0.6*cm))

        # ── PIED DE PAGE ──────────────────────────────────────────────────────
        elems.append(HRFlowable(width='100%', thickness=1, color=BLUE))
        elems.append(Spacer(1, 0.15*cm))
        elems.append(Paragraph(
            f'Document officiel - FinTrack | ISM Dakar Ecole d\'Ingenieurs et Digital Campus  |  '
            f'Réf. {num_recu}  |  {date_str}',
            ParagraphStyle('ft', fontSize=7.5, textColor=GRAY, alignment=TA_CENTER)
        ))
        elems.append(Paragraph(
            'Ce reçu fait foi de paiement. Conservez-le précieusement. Toute réclamation doit être présentée '
            'dans un délai de 30 jours à la Direction Administrative et Financière.',
            ParagraphStyle('ft2', fontSize=7, textColor=GRAY, alignment=TA_CENTER)
        ))

        doc.build(elems)
        pdf_bytes = buffer.getvalue()
        resp = make_response(pdf_bytes)
        resp.headers['Content-Type']        = 'application/pdf'
        resp.headers['Content-Disposition'] = f'inline; filename="recu_{num_recu}.pdf"'
        resp.headers['Content-Length']      = len(pdf_bytes)
        return resp

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
