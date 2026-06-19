from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import TypeFraisAnnexe, FraisAnnexe, Etudiant, Caisse, SessionCaisse
from datetime import datetime, date
from utils import generer_reference
import io

frais_annexes_bp = Blueprint('frais_annexes', __name__)


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


MODES_VALIDES = ('especes', 'virement', 'cheque', 'wave')


# ── CATALOGUE DES TYPES DE FRAIS ───────────────────────────────────────────────
@frais_annexes_bp.route('/types', methods=['GET'])
@auth_required
def lister_types():
    q = db.session.query(TypeFraisAnnexe)
    if request.args.get('actif') == '1':
        q = q.filter_by(actif=True)
    types = q.order_by(TypeFraisAnnexe.nom).all()
    return jsonify({'types': [t.to_dict() for t in types]}), 200


@frais_annexes_bp.route('/types', methods=['POST'])
@raf_required
def creer_type():
    data = request.get_json()
    nom  = (data.get('nom') or '').strip()
    try:
        montant = float(data.get('montant', 0))
    except (ValueError, TypeError):
        return jsonify({'message': 'Montant invalide'}), 400
    if not nom or montant <= 0:
        return jsonify({'message': 'Nom et montant (positif) obligatoires'}), 400
    if db.session.query(TypeFraisAnnexe).filter_by(nom=nom).first():
        return jsonify({'message': 'Ce type de frais existe déjà'}), 409

    t = TypeFraisAnnexe(nom=nom, montant=montant,
                         description=(data.get('description') or '').strip() or None)
    db.session.add(t)
    db.session.commit()
    return jsonify({'message': 'Type de frais créé', 'type': t.to_dict()}), 201


@frais_annexes_bp.route('/types/<int:tid>', methods=['PUT'])
@raf_required
def modifier_type(tid):
    t = db.session.get(TypeFraisAnnexe, tid)
    if not t:
        return jsonify({'message': 'Type introuvable'}), 404
    data = request.get_json()
    if 'nom' in data and (data['nom'] or '').strip():
        t.nom = data['nom'].strip()
    if 'montant' in data:
        try:
            montant = float(data['montant'])
            if montant <= 0:
                return jsonify({'message': 'Montant invalide'}), 400
            t.montant = montant
        except (ValueError, TypeError):
            return jsonify({'message': 'Montant invalide'}), 400
    if 'description' in data:
        t.description = (data['description'] or '').strip() or None
    if 'actif' in data:
        t.actif = bool(data['actif'])
    db.session.commit()
    return jsonify({'message': 'Type mis à jour', 'type': t.to_dict()}), 200


@frais_annexes_bp.route('/types/<int:tid>', methods=['DELETE'])
@raf_required
def supprimer_type(tid):
    t = db.session.get(TypeFraisAnnexe, tid)
    if not t:
        return jsonify({'message': 'Type introuvable'}), 404
    if db.session.query(FraisAnnexe).filter_by(id_type=tid).count() > 0:
        t.actif = False
        db.session.commit()
        return jsonify({'message': 'Des frais existent déjà pour ce type : il a été désactivé au lieu d\'être supprimé'}), 200
    db.session.delete(t)
    db.session.commit()
    return jsonify({'message': 'Type supprimé'}), 200


# ── FRAIS ANNEXES (instances facturées à un étudiant) ─────────────────────────
@frais_annexes_bp.route('', methods=['GET'])
@auth_required
def lister():
    statut      = request.args.get('statut', '').strip()
    id_etudiant = request.args.get('etudiant_id', '').strip()
    page        = int(request.args.get('page', 1))
    limit       = int(request.args.get('limit', 10))

    q = db.session.query(FraisAnnexe)
    if statut:      q = q.filter_by(statut=statut)
    if id_etudiant: q = q.filter_by(id_etudiant=int(id_etudiant))

    total = q.count()
    items = q.order_by(FraisAnnexe.date_creation.desc()).offset((page - 1) * limit).limit(limit).all()

    en_attente_count = db.session.query(FraisAnnexe).filter_by(statut='en_attente').count()
    total_encaisse = db.session.query(db.func.sum(FraisAnnexe.montant)).filter_by(statut='paye').scalar() or 0

    return jsonify({
        'frais':    [f.to_dict() for f in items],
        'total':    total,
        'page':     page,
        'nb_pages': (total + limit - 1) // limit,
        'kpis': {'en_attente': en_attente_count, 'total_encaisse': float(total_encaisse)},
    }), 200


@frais_annexes_bp.route('', methods=['POST'])
@auth_required
def creer():
    """Enregistre une demande de frais annexe pour un étudiant (statut en_attente)."""
    data        = request.get_json()
    id_etudiant = data.get('id_etudiant')
    id_type     = data.get('id_type')
    commentaire = (data.get('commentaire') or '').strip() or None

    etu = db.session.get(Etudiant, id_etudiant)
    if not etu:
        return jsonify({'message': 'Étudiant introuvable'}), 404
    typ = db.session.get(TypeFraisAnnexe, id_type)
    if not typ:
        return jsonify({'message': 'Type de frais introuvable'}), 404

    try:
        montant = float(data.get('montant', typ.montant))
        if montant <= 0:
            return jsonify({'message': 'Montant invalide'}), 400
    except (ValueError, TypeError):
        return jsonify({'message': 'Montant invalide'}), 400

    identity = get_jwt().get('user', {})
    f = FraisAnnexe(
        id_etudiant=id_etudiant, id_type=id_type, montant=montant,
        commentaire=commentaire, id_createur=identity.get('id'),
    )
    db.session.add(f)
    db.session.commit()
    return jsonify({'message': 'Frais annexe enregistré', 'frais': f.to_dict()}), 201


@frais_annexes_bp.route('/<int:fid>/valider', methods=['POST'])
@raf_required
def valider(fid):
    f = db.session.get(FraisAnnexe, fid)
    if not f:
        return jsonify({'message': 'Frais introuvable'}), 404
    if f.statut != 'en_attente':
        return jsonify({'message': 'Seule une demande en attente peut être validée'}), 400

    identity = get_jwt().get('user', {})
    f.statut          = 'validee'
    f.id_validateur   = identity.get('id')
    f.date_validation = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Demande validée — elle peut maintenant être encaissée', 'frais': f.to_dict()}), 200


@frais_annexes_bp.route('/<int:fid>/rejeter', methods=['POST'])
@raf_required
def rejeter(fid):
    f = db.session.get(FraisAnnexe, fid)
    if not f:
        return jsonify({'message': 'Frais introuvable'}), 404
    if f.statut != 'en_attente':
        return jsonify({'message': 'Seule une demande en attente peut être rejetée'}), 400

    data = request.get_json() or {}
    identity = get_jwt().get('user', {})
    f.statut          = 'rejetee'
    f.motif_rejet      = (data.get('motif_rejet') or '').strip() or None
    f.id_validateur   = identity.get('id')
    f.date_validation = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Demande rejetée', 'frais': f.to_dict()}), 200


@frais_annexes_bp.route('/<int:fid>/encaisser', methods=['POST'])
@auth_required
def encaisser(fid):
    f = db.session.get(FraisAnnexe, fid)
    if not f:
        return jsonify({'message': 'Frais introuvable'}), 404
    if f.statut != 'validee':
        return jsonify({'message': 'Ce frais doit d\'abord être validé par le RAF avant encaissement'}), 400

    data      = request.get_json()
    id_caisse = data.get('id_caisse')
    mode      = (data.get('mode_paiement') or '').strip()

    caisse = db.session.get(Caisse, id_caisse)
    if not caisse or caisse.statut == 'inactive':
        return jsonify({'message': 'Caisse invalide ou inactive'}), 400
    if mode not in MODES_VALIDES:
        return jsonify({'message': 'Mode de paiement invalide'}), 400

    montant = float(f.montant)
    f.statut        = 'paye'
    f.id_caisse     = id_caisse
    f.mode_paiement = mode
    f.reference     = generer_reference()
    f.date_paiement = datetime.utcnow()
    caisse.solde_actuel = float(caisse.solde_actuel) + montant

    session_jour = db.session.query(SessionCaisse).filter_by(
        id_caisse=id_caisse, statut='ouverte'
    ).filter(SessionCaisse.date_session == date.today()).first()
    if session_jour:
        session_jour.total_entrees = float(session_jour.total_entrees) + montant

    db.session.commit()
    return jsonify({'message': 'Frais encaissé avec succès', 'frais': f.to_dict()}), 200


@frais_annexes_bp.route('/<int:fid>', methods=['DELETE'])
@raf_required
def annuler(fid):
    f = db.session.get(FraisAnnexe, fid)
    if not f:
        return jsonify({'message': 'Frais introuvable'}), 404
    if f.statut == 'paye':
        return jsonify({'message': 'Impossible d\'annuler un frais déjà encaissé'}), 400
    db.session.delete(f)
    db.session.commit()
    return jsonify({'message': 'Demande annulée'}), 200


# ── REÇU PDF ───────────────────────────────────────────────────────────────────
@frais_annexes_bp.route('/<int:fid>/recu', methods=['GET'])
@auth_required
def recu(fid):
    f = db.session.get(FraisAnnexe, fid)
    if not f or f.statut != 'paye':
        return jsonify({'message': 'Reçu indisponible : frais introuvable ou non encaissé'}), 404

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT

        etu     = db.session.get(Etudiant, f.id_etudiant)
        typ     = db.session.get(TypeFraisAnnexe, f.id_type)
        caisse  = db.session.get(Caisse, f.id_caisse)
        montant = float(f.montant)

        BLUE  = colors.HexColor('#1B3A6B')
        LBLUE = colors.HexColor('#2D5FA8')
        GREEN = colors.HexColor('#16A34A')
        GRAY  = colors.HexColor('#64748B')
        LGRAY = colors.HexColor('#F1F5F9')
        BGRAY = colors.HexColor('#E2E8F0')
        WHITE = colors.white

        MODE_LABELS = {'especes': 'Espèces', 'virement': 'Virement bancaire',
                       'cheque': 'Chèque', 'wave': 'Wave / Mobile Money'}

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.8*cm, leftMargin=1.8*cm,
                                 topMargin=1.5*cm, bottomMargin=1.5*cm)
        elems = []

        hdr = [[
            Paragraph('<b>ISM DAKAR</b><br/>École d\'Ingénieurs et Digital Campus<br/>'
                      'BP 3278 - Dakar, Senegal | www.ism.edu.sn',
                      ParagraphStyle('hl', fontSize=9.5, textColor=WHITE, fontName='Helvetica-Bold', leading=14)),
            Paragraph(f'<b>REÇU N°</b><br/><font size="18"><b>{f.reference}</b></font><br/>'
                      f'Date : {f.date_paiement.strftime("%d/%m/%Y")}<br/>Heure : {f.date_paiement.strftime("%H:%M")}',
                      ParagraphStyle('hr', fontSize=9.5, textColor=WHITE, fontName='Helvetica',
                                     leading=14, alignment=TA_RIGHT)),
        ]]
        ht = Table(hdr, colWidths=[10*cm, 7*cm])
        ht.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), BLUE), ('PADDING', (0,0), (-1,-1), 14),
                                 ('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
        elems.append(ht)

        elems.append(Table([[Paragraph('REÇU DE FRAIS ANNEXE', ParagraphStyle(
            'rt', fontSize=13, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_CENTER))]],
            colWidths=[17*cm], style=[('BACKGROUND', (0,0), (-1,-1), LBLUE), ('PADDING', (0,0), (-1,-1), 7)]))
        elems.append(Spacer(1, 0.5*cm))

        _lbl = ParagraphStyle('elbl', fontSize=9, fontName='Helvetica-Bold', textColor=BLUE, leading=12)
        _val = ParagraphStyle('eval', fontSize=9, leading=12)
        etu_data = [
            [Paragraph('Nom et Prénom', _lbl), Paragraph(f'{etu.prenom} {etu.nom}'.upper() if etu else 'N/A', _val),
             Paragraph('Matricule', _lbl), Paragraph(etu.matricule if etu else 'N/A', _val)],
            [Paragraph('Classe', _lbl), Paragraph(etu.classe if etu else '-', _val),
             Paragraph('Année académique', _lbl), Paragraph(etu.annee_academique if etu else '-', _val)],
        ]
        etu_table = Table(etu_data, colWidths=[3.5*cm, 6.5*cm, 3.5*cm, 3.5*cm])
        etu_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), LGRAY), ('BACKGROUND', (2,0), (2,-1), LGRAY),
            ('GRID', (0,0), (-1,-1), 0.5, BGRAY), ('PADDING', (0,0), (-1,-1), 7),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elems.append(etu_table)
        elems.append(Spacer(1, 0.4*cm))

        elems.append(Table([[Paragraph(f'<b>OBJET :</b>  {typ.nom if typ else "Frais annexe"}',
            ParagraphStyle('obj', fontSize=10, textColor=BLUE, leading=14))]],
            colWidths=[17*cm], style=[('BACKGROUND', (0,0), (-1,-1), LGRAY),
                                       ('PADDING', (0,0), (-1,-1), 9), ('BOX', (0,0), (-1,-1), 0.5, BGRAY)]))
        elems.append(Spacer(1, 0.5*cm))

        montant_fmt = f"{montant:,.0f}".replace(',', ' ') + ' FCFA'
        mt_table = Table([[Paragraph(f'<font size="26"><b>{montant_fmt}</b></font>',
            ParagraphStyle('mf', fontSize=26, textColor=GREEN, fontName='Helvetica-Bold', alignment=TA_CENTER))]],
            colWidths=[17*cm], rowHeights=[1.8*cm])
        mt_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDF4')), ('BOX', (0,0), (-1,-1), 1.5, GREEN),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elems.append(mt_table)
        elems.append(Spacer(1, 0.5*cm))

        det_data = [
            [Paragraph('Mode de paiement', _lbl), Paragraph(MODE_LABELS.get(f.mode_paiement, f.mode_paiement or '-'), _val),
             Paragraph('Référence', _lbl), Paragraph(f.reference or '-', _val)],
            [Paragraph('Caisse', _lbl), Paragraph(caisse.nom if caisse else '-', _val),
             Paragraph('Statut', _lbl), Paragraph('Payé', _val)],
        ]
        det_table = Table(det_data, colWidths=[3.5*cm, 6.5*cm, 3.5*cm, 3.5*cm])
        det_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), LGRAY), ('BACKGROUND', (2,0), (2,-1), LGRAY),
            ('GRID', (0,0), (-1,-1), 0.5, BGRAY), ('PADDING', (0,0), (-1,-1), 7),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elems.append(det_table)
        elems.append(Spacer(1, 0.6*cm))

        elems.append(HRFlowable(width='100%', thickness=1, color=BLUE))
        elems.append(Spacer(1, 0.15*cm))
        elems.append(Paragraph(
            f'Document officiel - FinTrack | ISM Dakar École d\'Ingénieurs et Digital Campus  |  '
            f'Réf. {f.reference}  |  {f.date_paiement.strftime("%d/%m/%Y")}',
            ParagraphStyle('ft', fontSize=7.5, textColor=GRAY, alignment=TA_CENTER)))

        doc.build(elems)
        pdf_bytes = buffer.getvalue()
        resp = make_response(pdf_bytes)
        resp.headers['Content-Type']        = 'application/pdf'
        resp.headers['Content-Disposition'] = f'inline; filename="recu_{f.reference}.pdf"'
        resp.headers['Content-Length']      = len(pdf_bytes)
        return resp

    except ImportError:
        return jsonify({'message': 'ReportLab non installé'}), 500
    except Exception as e:
        return jsonify({'message': f'Erreur génération PDF : {str(e)}'}), 500
