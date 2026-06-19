from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Message, Utilisateur, Notification
from datetime import datetime

messages_bp = Blueprint('messages', __name__)


def auth_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


# ── ENVOYER un message ────────────────────────────────────────────────────────
@messages_bp.route('', methods=['POST'])
@auth_required
def envoyer():
    identity         = get_jwt().get('user', {})
    id_expediteur    = identity.get('id')
    data             = request.get_json()

    id_destinataire  = data.get('id_destinataire')
    objet            = data.get('objet', '').strip()
    contenu          = data.get('contenu', '').strip()

    if not all([id_destinataire, objet, contenu]):
        return jsonify({'message': 'Destinataire, objet et contenu sont obligatoires'}), 400

    destinataire = db.session.get(Utilisateur, id_destinataire)
    if not destinataire:
        return jsonify({'message': 'Destinataire introuvable'}), 404
    if not destinataire.actif:
        return jsonify({'message': 'Ce compte est désactivé'}), 400

    msg = Message(
        id_expediteur=id_expediteur,
        id_destinataire=id_destinataire,
        objet=objet,
        contenu=contenu
    )
    db.session.add(msg)

    # Notification pour le destinataire
    expediteur_obj = db.session.get(Utilisateur, id_expediteur)
    exp_nom = f"{expediteur_obj.prenom} {expediteur_obj.nom}" if expediteur_obj else "Quelqu'un"
    notif = Notification(
        id_utilisateur=id_destinataire,
        type='message',
        message=f"Nouveau message de {exp_nom} : {objet}",
        priorite='normale'
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({
        'message': 'Message envoyé avec succès',
        'msg':     msg.to_dict()
    }), 201


# ── BOÎTE DE RÉCEPTION ────────────────────────────────────────────────────────
@messages_bp.route('/recus', methods=['GET'])
@auth_required
def recus():
    identity = get_jwt().get('user', {})
    uid      = identity.get('id')
    page     = int(request.args.get('page', 1))
    limit    = int(request.args.get('limit', 10))

    query    = db.session.query(Message).filter_by(id_destinataire=uid)
    total    = query.count()
    msgs     = query.order_by(Message.date_envoi.desc())\
                    .offset((page - 1) * limit).limit(limit).all()
    nb_non_lus = db.session.query(Message)\
        .filter_by(id_destinataire=uid, lu=False).count()

    return jsonify({
        'messages':   [m.to_dict() for m in msgs],
        'total':      total,
        'page':       page,
        'nb_pages':   (total + limit - 1) // limit,
        'nb_non_lus': nb_non_lus
    }), 200


# ── MESSAGES ENVOYÉS ──────────────────────────────────────────────────────────
@messages_bp.route('/envoyes', methods=['GET'])
@auth_required
def envoyes():
    identity = get_jwt().get('user', {})
    uid      = identity.get('id')
    page     = int(request.args.get('page', 1))
    limit    = int(request.args.get('limit', 10))

    query  = db.session.query(Message).filter_by(id_expediteur=uid)
    total  = query.count()
    msgs   = query.order_by(Message.date_envoi.desc())\
                  .offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'messages': [m.to_dict() for m in msgs],
        'total':    total,
        'page':     page,
        'nb_pages': (total + limit - 1) // limit
    }), 200


# ── MARQUER COMME LU ──────────────────────────────────────────────────────────
@messages_bp.route('/<int:mid>/lu', methods=['PUT'])
@auth_required
def marquer_lu(mid):
    identity = get_jwt().get('user', {})
    uid      = identity.get('id')

    msg = db.session.get(Message, mid)
    if not msg:
        return jsonify({'message': 'Message introuvable'}), 404
    if msg.id_destinataire != uid:
        return jsonify({'message': 'Accès non autorisé'}), 403

    msg.lu = True
    db.session.commit()
    return jsonify({'message': 'Message marqué comme lu', 'msg': msg.to_dict()}), 200


# ── LISTE DES UTILISATEURS (pour sélectionner destinataire) ──────────────────
@messages_bp.route('/destinataires', methods=['GET'])
@auth_required
def destinataires():
    identity = get_jwt().get('user', {})
    uid      = identity.get('id')

    users = db.session.query(Utilisateur)\
        .filter(Utilisateur.id_utilisateur != uid, Utilisateur.actif == True).all()

    return jsonify({
        'utilisateurs': [u.to_dict() for u in users]
    }), 200
