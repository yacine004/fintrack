from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db, bcrypt
from models import Utilisateur
from routes.audit import log_action

utilisateurs_bp = Blueprint('utilisateurs', __name__)

# ── Décorateur RAF requis ─────────────────────────────────────────────────────
def raf_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt().get('user', {})
        if identity.get('role') != 'raf':
            return jsonify({'message': 'Accès réservé au RAF'}), 403
        return fn(*args, **kwargs)
    return wrapper

# ── LISTER avec recherche + filtre + pagination ───────────────────────────────
@utilisateurs_bp.route('', methods=['GET'])
@raf_required
def lister():
    search  = request.args.get('search', '').strip()
    role    = request.args.get('role', '').strip()
    statut  = request.args.get('statut', '').strip()
    page    = int(request.args.get('page', 1))
    limit   = int(request.args.get('limit', 10))

    query = db.session.query(Utilisateur)

    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                Utilisateur.nom.ilike(like),
                Utilisateur.prenom.ilike(like),
                Utilisateur.email.ilike(like)
            )
        )
    if role in ('raf', 'comptable'):
        query = query.filter(Utilisateur.role == role)
    if statut == 'actif':
        query = query.filter(Utilisateur.actif == True)
    elif statut == 'inactif':
        query = query.filter(Utilisateur.actif == False)

    total    = query.count()
    users    = query.order_by(Utilisateur.date_creation.desc())\
                    .offset((page - 1) * limit).limit(limit).all()
    nb_pages = (total + limit - 1) // limit

    return jsonify({
        'utilisateurs': [u.to_dict() for u in users],
        'total':        total,
        'page':         page,
        'nb_pages':     nb_pages
    }), 200

# ── CRÉER ─────────────────────────────────────────────────────────────────────
@utilisateurs_bp.route('', methods=['POST'])
@raf_required
def creer():
    data = request.get_json()
    nom      = data.get('nom', '').strip()
    prenom   = data.get('prenom', '').strip()
    email    = data.get('email', '').strip().lower()
    contact  = data.get('contact', '').strip()
    role     = data.get('role', '').strip()
    password = data.get('password', '').strip()

    if not all([nom, prenom, email, role, password]):
        return jsonify({'message': 'Tous les champs obligatoires doivent être remplis'}), 400
    if role not in ('raf', 'comptable'):
        return jsonify({'message': 'Rôle invalide'}), 400
    if len(password) < 6:
        return jsonify({'message': 'Le mot de passe doit contenir au moins 6 caractères'}), 400
    if db.session.query(Utilisateur).filter_by(email=email).first():
        return jsonify({'message': 'Cet email est déjà utilisé'}), 409

    user = Utilisateur(
        nom=nom, prenom=prenom, email=email, contact=contact, role=role,
        mot_de_passe_hash=bcrypt.generate_password_hash(password).decode()
    )
    db.session.add(user)
    db.session.commit()
    identity = get_jwt().get('user', {})
    log_action(identity.get('id'), 'CREATE', 'Utilisateur', user.id_utilisateur, {'nom': f"{prenom} {nom}", 'role': role, 'email': email})
    db.session.commit()
    return jsonify({'message': 'Utilisateur créé avec succès', 'utilisateur': user.to_dict()}), 201

# ── MODIFIER ──────────────────────────────────────────────────────────────────
@utilisateurs_bp.route('/<int:uid>', methods=['PUT'])
@raf_required
def modifier(uid):
    user = db.session.get(Utilisateur, uid)
    if not user:
        return jsonify({'message': 'Utilisateur introuvable'}), 404

    data = request.get_json()
    if 'nom' in data and data['nom'].strip():
        user.nom = data['nom'].strip()
    if 'prenom' in data and data['prenom'].strip():
        user.prenom = data['prenom'].strip()
    if 'contact' in data:
        user.contact = data['contact'].strip()
    if 'role' in data and data['role'] in ('raf', 'comptable'):
        user.role = data['role']

    db.session.commit()
    identity = get_jwt().get('user', {})
    log_action(identity.get('id'), 'UPDATE', 'Utilisateur', uid, {'nom': f"{user.prenom} {user.nom}", 'role': user.role})
    db.session.commit()
    return jsonify({'message': 'Utilisateur modifié', 'utilisateur': user.to_dict()}), 200

# ── ACTIVER / DÉSACTIVER ──────────────────────────────────────────────────────
@utilisateurs_bp.route('/<int:uid>/toggle', methods=['PUT'])
@raf_required
def toggle(uid):
    identity = get_jwt().get('user', {})
    if identity.get('id') == uid:
        return jsonify({'message': 'Vous ne pouvez pas désactiver votre propre compte'}), 400

    user = db.session.get(Utilisateur, uid)
    if not user:
        return jsonify({'message': 'Utilisateur introuvable'}), 404

    user.actif = not user.actif
    db.session.commit()
    log_action(identity.get('id'), 'ACTIVER' if user.actif else 'DESACTIVER', 'Utilisateur', uid,
               {'nom': f"{user.prenom} {user.nom}", 'role': user.role})
    db.session.commit()
    return jsonify({
        'message': f"Compte {'activé' if user.actif else 'désactivé'}",
        'utilisateur': user.to_dict()
    }), 200

# ── ATTRIBUER / MODIFIER RÔLE ─────────────────────────────────────────────────
@utilisateurs_bp.route('/<int:uid>/role', methods=['PUT'])
@raf_required
def changer_role(uid):
    user = db.session.get(Utilisateur, uid)
    if not user:
        return jsonify({'message': 'Utilisateur introuvable'}), 404

    data = request.get_json()
    role = data.get('role', '').strip()
    if role not in ('raf', 'comptable'):
        return jsonify({'message': 'Rôle invalide'}), 400

    user.role = role
    db.session.commit()
    return jsonify({'message': f"Rôle modifié en {role}", 'utilisateur': user.to_dict()}), 200

# ── SUPPRIMER ─────────────────────────────────────────────────────────────────
@utilisateurs_bp.route('/<int:uid>', methods=['DELETE'])
@raf_required
def supprimer(uid):
    identity = get_jwt().get('user', {})
    if identity.get('id') == uid:
        return jsonify({'message': 'Vous ne pouvez pas supprimer votre propre compte'}), 400

    user = db.session.get(Utilisateur, uid)
    if not user:
        return jsonify({'message': 'Utilisateur introuvable'}), 404

    nom_complet = f"{user.prenom} {user.nom}"
    role_user   = user.role
    db.session.delete(user)
    db.session.commit()
    log_action(identity.get('id'), 'DELETE', 'Utilisateur', uid, {'nom': nom_complet, 'role': role_user})
    db.session.commit()
    return jsonify({'message': 'Utilisateur supprimé avec succès'}), 200
