from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import AutorisationPassage, Etudiant, Utilisateur, AnneeScolaire
from datetime import datetime

autorisations_bp = Blueprint('autorisations', __name__)


def _annee_active():
    a = db.session.query(AnneeScolaire).filter_by(active=True).first()
    return a.libelle if a else '2025-2026'


# ── GET liste ─────────────────────────────────────────────────────────────────
@autorisations_bp.route('', methods=['GET'])
@jwt_required()
def lister():
    annee   = request.args.get('annee') or _annee_active()
    statut  = request.args.get('statut', '').strip()
    classe  = request.args.get('classe', '').strip()

    q = db.session.query(AutorisationPassage).filter_by(annee=annee)
    if statut: q = q.filter_by(statut=statut)
    if classe:
        ids = [e.id_etudiant for e in db.session.query(Etudiant).filter_by(classe=classe).all()]
        q = q.filter(AutorisationPassage.id_etudiant.in_(ids))

    items = q.order_by(AutorisationPassage.date_creation.desc()).all()
    return jsonify({'autorisations': [i.to_dict() for i in items], 'annee': annee}), 200


# ── GET liste étudiants sans autorisation pour l'année ───────────────────────
@autorisations_bp.route('/etudiants-manquants', methods=['GET'])
@jwt_required()
def etudiants_manquants():
    annee = request.args.get('annee') or _annee_active()
    ids_avec = {a.id_etudiant for a in
                db.session.query(AutorisationPassage).filter_by(annee=annee).all()}
    etudiants = db.session.query(Etudiant).filter_by(annee_academique=annee, statut='actif').all()
    sans = [e.to_dict() for e in etudiants if e.id_etudiant not in ids_avec]
    return jsonify({'etudiants': sans, 'annee': annee}), 200


# ── POST créer / mettre à jour ────────────────────────────────────────────────
@autorisations_bp.route('', methods=['POST'])
@jwt_required()
def creer_ou_maj():
    data        = request.get_json()
    id_etudiant = data.get('id_etudiant')
    annee       = data.get('annee') or _annee_active()
    statut      = data.get('statut', 'en_attente')
    commentaire = data.get('commentaire', '').strip() or None
    id_raf      = get_jwt_identity()

    STATUTS = {'valide', 'ajourn', 'exclu', 'en_attente', 'laissez_passer'}
    if statut not in STATUTS:
        return jsonify({'message': f'Statut invalide. Valeurs : {sorted(STATUTS)}'}), 400

    etu = db.session.get(Etudiant, id_etudiant)
    if not etu:
        return jsonify({'message': 'Étudiant introuvable'}), 404

    # Valider la date de validité du laissez-passer
    date_validite_lp = None
    if statut == 'laissez_passer':
        dvlp_str = (data.get('date_validite_lp') or '').strip()
        if not dvlp_str:
            return jsonify({'message': 'Un laissez-passer nécessite une date de fin de validité'}), 400
        try:
            from datetime import date as _date
            date_validite_lp = datetime.strptime(dvlp_str, '%Y-%m-%d').date()
            if date_validite_lp < _date.today():
                return jsonify({'message': 'La date de validité du laissez-passer doit être dans le futur'}), 400
        except ValueError:
            return jsonify({'message': 'Format de date invalide (attendu : YYYY-MM-DD)'}), 400

    existing = db.session.query(AutorisationPassage).filter_by(
        id_etudiant=id_etudiant, annee=annee
    ).first()

    if existing:
        existing.statut          = statut
        existing.commentaire     = commentaire
        existing.date_validite_lp = date_validite_lp
        existing.id_raf          = id_raf
        existing.date_decision   = datetime.utcnow() if statut != 'en_attente' else None
        db.session.commit()
        return jsonify({'message': 'Autorisation mise à jour', 'autorisation': existing.to_dict()}), 200
    else:
        a = AutorisationPassage(
            id_etudiant=id_etudiant, annee=annee, statut=statut,
            commentaire=commentaire, date_validite_lp=date_validite_lp,
            id_raf=id_raf,
            date_decision=datetime.utcnow() if statut != 'en_attente' else None
        )
        db.session.add(a)
        db.session.commit()
        return jsonify({'message': 'Autorisation créée', 'autorisation': a.to_dict()}), 201


# ── POST traitement en masse ──────────────────────────────────────────────────
@autorisations_bp.route('/masse', methods=['POST'])
@jwt_required()
def masse():
    """Valide/ajourn/exclut une liste d'étudiants en une seule requête."""
    data    = request.get_json()
    annee   = data.get('annee') or _annee_active()
    statut  = data.get('statut', 'valide')
    ids     = data.get('ids', [])
    commentaire = data.get('commentaire', '').strip() or None
    id_raf  = get_jwt_identity()

    count = 0
    for id_etu in ids:
        existing = db.session.query(AutorisationPassage).filter_by(
            id_etudiant=id_etu, annee=annee
        ).first()
        now = datetime.utcnow()
        if existing:
            existing.statut = statut
            existing.commentaire = commentaire
            existing.id_raf = id_raf
            existing.date_decision = now
        else:
            db.session.add(AutorisationPassage(
                id_etudiant=id_etu, annee=annee, statut=statut,
                commentaire=commentaire, id_raf=id_raf, date_decision=now
            ))
        count += 1
    db.session.commit()
    return jsonify({'message': f'{count} autorisation(s) traitée(s)'}), 200


# ── GET rechercher un étudiant par matricule (pour décision individuelle) ─────
@autorisations_bp.route('/par-matricule', methods=['GET'])
@jwt_required()
def par_matricule():
    matricule = request.args.get('matricule', '').strip()
    annee     = request.args.get('annee') or _annee_active()
    if not matricule:
        return jsonify({'message': 'Matricule requis'}), 400

    etu = db.session.query(Etudiant).filter(
        Etudiant.matricule.ilike(f'%{matricule}%')
    ).first()
    if not etu:
        return jsonify({'message': f'Aucun étudiant avec le matricule « {matricule} »'}), 404

    # Total payé de l'année
    from models import Paiement
    total_paye = db.session.query(db.func.sum(Paiement.montant)).filter(
        Paiement.id_etudiant == etu.id_etudiant,
        Paiement.annee_academique == etu.annee_academique
    ).scalar() or 0

    auth = db.session.query(AutorisationPassage).filter_by(
        id_etudiant=etu.id_etudiant, annee=annee
    ).first()

    return jsonify({
        'etudiant':     etu.to_dict(),
        'total_paye':   float(total_paye),
        'autorisation': auth.to_dict() if auth else None,
        'annee':        annee,
    }), 200


# ── GET vérifier autorisation d'un étudiant (utilisé à la réinscription) ─────
@autorisations_bp.route('/verifier/<int:id_etudiant>', methods=['GET'])
@jwt_required()
def verifier(id_etudiant):
    annee = request.args.get('annee') or _annee_active()
    a = db.session.query(AutorisationPassage).filter_by(
        id_etudiant=id_etudiant, annee=annee
    ).first()
    if not a:
        return jsonify({'statut': 'non_definie', 'message': 'Aucune décision enregistrée pour cette année'}), 200
    return jsonify({'statut': a.statut, 'commentaire': a.commentaire or ''}), 200


# ── DELETE ────────────────────────────────────────────────────────────────────
@autorisations_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def supprimer(id):
    a = db.session.get(AutorisationPassage, id)
    if not a:
        return jsonify({'message': 'Introuvable'}), 404
    db.session.delete(a)
    db.session.commit()
    return jsonify({'message': 'Autorisation supprimée'}), 200
