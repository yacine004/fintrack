from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import AffectationCaisse, Utilisateur, Caisse
from datetime import datetime

affectations_bp = Blueprint('affectations', __name__)


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


# ── Caisse active du caissier connecté ───────────────────────────────────────
@affectations_bp.route('/ma-caisse', methods=['GET'])
@auth_required
def ma_caisse():
    identity = get_jwt().get('user', {})
    user_id  = identity.get('id')
    now      = datetime.utcnow()

    aff = db.session.query(AffectationCaisse).filter(
        AffectationCaisse.id_utilisateur == user_id,
        AffectationCaisse.actif == True,
        AffectationCaisse.date_debut <= now,
        db.or_(AffectationCaisse.date_fin == None, AffectationCaisse.date_fin >= now)
    ).order_by(AffectationCaisse.date_debut.desc()).first()

    if not aff:
        return jsonify({'message': 'Aucune caisse assignée pour le moment', 'caisse': None}), 200

    caisse = db.session.get(Caisse, aff.id_caisse)
    if not caisse or caisse.statut == 'inactive':
        return jsonify({'message': 'La caisse assignée est inactive', 'caisse': None}), 200

    return jsonify({
        'affectation': aff.to_dict(),
        'caisse':      caisse.to_dict()
    }), 200


# ── Lister toutes les affectations (RAF) ─────────────────────────────────────
@affectations_bp.route('', methods=['GET'])
@raf_required
def lister():
    actif_only = request.args.get('actif', '').lower() == 'true'
    query = db.session.query(AffectationCaisse)
    if actif_only:
        query = query.filter_by(actif=True)
    affs = query.order_by(AffectationCaisse.date_debut.desc()).all()
    return jsonify({'affectations': [a.to_dict() for a in affs]}), 200


# ── Créer une affectation (RAF) ───────────────────────────────────────────────
@affectations_bp.route('', methods=['POST'])
@raf_required
def creer():
    data           = request.get_json()
    id_utilisateur = data.get('id_utilisateur')
    id_caisse      = data.get('id_caisse')
    date_debut_str = data.get('date_debut')
    date_fin_str   = data.get('date_fin') or None

    if not all([id_utilisateur, id_caisse, date_debut_str]):
        return jsonify({'message': 'Caissier, caisse et date de début sont obligatoires'}), 400

    user = db.session.get(Utilisateur, id_utilisateur)
    if not user or user.role not in ('comptable',):
        return jsonify({'message': 'L\'utilisateur doit avoir le rôle caissier (comptable)'}), 400

    caisse = db.session.get(Caisse, id_caisse)
    if not caisse:
        return jsonify({'message': 'Caisse introuvable'}), 404
    if caisse.statut == 'inactive':
        return jsonify({'message': 'Impossible d\'affecter une caisse inactive'}), 400

    try:
        date_debut = datetime.strptime(date_debut_str, '%Y-%m-%d')
        date_fin   = datetime.strptime(date_fin_str,   '%Y-%m-%d') if date_fin_str else None
    except ValueError:
        return jsonify({'message': 'Format de date invalide (AAAA-MM-JJ)'}), 400

    if date_fin and date_fin <= date_debut:
        return jsonify({'message': 'La date de fin doit être postérieure à la date de début'}), 400

    # Vérifier que la caisse n'est pas déjà assignée à un autre comptable actif
    conflit = db.session.query(AffectationCaisse).filter(
        AffectationCaisse.id_caisse == id_caisse,
        AffectationCaisse.actif == True,
        AffectationCaisse.id_utilisateur != id_utilisateur
    ).first()
    if conflit:
        autre = db.session.get(Utilisateur, conflit.id_utilisateur)
        nom_autre = f"{autre.prenom} {autre.nom}" if autre else "un autre comptable"
        return jsonify({
            'message': f'Cette caisse est déjà assignée à {nom_autre}. '
                       f'Terminez cette affectation avant d\'en créer une nouvelle.'
        }), 409

    # Clôturer les affectations actives existantes pour ce caissier
    anciennes = db.session.query(AffectationCaisse).filter_by(
        id_utilisateur=id_utilisateur, actif=True
    ).all()
    for a in anciennes:
        a.actif    = False
        a.date_fin = date_debut

    aff = AffectationCaisse(
        id_utilisateur=id_utilisateur,
        id_caisse=id_caisse,
        date_debut=date_debut,
        date_fin=date_fin,
    )
    db.session.add(aff)
    db.session.commit()

    return jsonify({'message': 'Affectation créée avec succès', 'affectation': aff.to_dict()}), 201


# ── Terminer une affectation (RAF) ────────────────────────────────────────────
@affectations_bp.route('/<int:aid>', methods=['DELETE'])
@raf_required
def terminer(aid):
    aff = db.session.get(AffectationCaisse, aid)
    if not aff:
        return jsonify({'message': 'Affectation introuvable'}), 404
    if not aff.actif:
        return jsonify({'message': 'Affectation déjà terminée'}), 400

    aff.actif    = False
    aff.date_fin = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Affectation terminée'}), 200
