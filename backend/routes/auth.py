from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt
from extensions import db, bcrypt
from models import Utilisateur
from routes.audit import log_action

auth_bp = Blueprint('auth', __name__)

# ── LOGIN ─────────────────────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'message': 'Email et mot de passe obligatoires'}), 400

    user = db.session.query(Utilisateur).filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.mot_de_passe_hash, password):
        return jsonify({'message': 'Email ou mot de passe incorrect'}), 401

    if not user.actif:
        return jsonify({'message': 'Compte inactif. Contactez votre administrateur.'}), 401

    token = create_access_token(
        identity=str(user.id_utilisateur),
        additional_claims={
            'user': {
                'id':     user.id_utilisateur,
                'nom':    user.nom,
                'prenom': user.prenom,
                'email':  user.email,
                'role':   user.role
            }
        }
    )
    log_action(user.id_utilisateur, 'LOGIN', 'Utilisateur', user.id_utilisateur, {'role': user.role})
    db.session.commit()

    return jsonify({'token': token, 'user': user.to_dict()}), 200

# ── GET PROFIL ────────────────────────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    identity = get_jwt().get('user', {})
    user = db.session.get(Utilisateur, identity.get('id'))
    if not user:
        return jsonify({'message': 'Utilisateur introuvable'}), 404
    return jsonify(user.to_dict()), 200

# ── MODIFIER PROFIL ───────────────────────────────────────────────────────────
@auth_bp.route('/profil', methods=['PUT'])
@jwt_required()
def modifier_profil():
    identity = get_jwt().get('user', {})
    user = db.session.get(Utilisateur, identity.get('id'))
    if not user:
        return jsonify({'message': 'Utilisateur introuvable'}), 404

    data = request.get_json()
    if 'nom' in data and data['nom'].strip():
        user.nom = data['nom'].strip()
    if 'prenom' in data and data['prenom'].strip():
        user.prenom = data['prenom'].strip()
    if 'contact' in data:
        user.contact = data['contact'].strip()
    if 'civilite' in data and data['civilite'] in ('M.', 'Mme'):
        user.civilite = data['civilite']

    db.session.commit()
    return jsonify({'message': 'Profil mis à jour', 'user': user.to_dict()}), 200

# ── CHANGER MOT DE PASSE ──────────────────────────────────────────────────────
@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    identity = get_jwt().get('user', {})
    user = db.session.get(Utilisateur, identity.get('id'))
    if not user:
        return jsonify({'message': 'Utilisateur introuvable'}), 404

    data        = request.get_json()
    ancien      = data.get('ancien_mot_de_passe') or data.get('ancien_password', '')
    nouveau     = data.get('nouveau_mot_de_passe') or data.get('nouveau_password', '')
    confirmation = data.get('confirmation') or data.get('nouveau_password', '')

    if not bcrypt.check_password_hash(user.mot_de_passe_hash, ancien):
        return jsonify({'message': 'Ancien mot de passe incorrect'}), 400
    if len(nouveau) < 6:
        return jsonify({'message': 'Le nouveau mot de passe doit contenir au moins 6 caractères'}), 400
    if nouveau != confirmation:
        return jsonify({'message': 'La confirmation ne correspond pas'}), 400

    user.mot_de_passe_hash = bcrypt.generate_password_hash(nouveau).decode()
    db.session.commit()
    return jsonify({'message': 'Mot de passe modifié avec succès'}), 200
