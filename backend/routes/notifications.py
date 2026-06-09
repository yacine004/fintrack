from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Notification

notifications_bp = Blueprint('notifications', __name__)


def auth_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


# ── LISTER notifications de l'utilisateur connecté ───────────────────────────
@notifications_bp.route('', methods=['GET'])
@auth_required
def lister():
    identity = get_jwt().get('user', {})
    uid      = identity.get('id')
    page     = int(request.args.get('page', 1))
    limit    = int(request.args.get('limit', 20))
    non_lues = request.args.get('non_lues', '').lower() == 'true'

    query = db.session.query(Notification).filter_by(id_utilisateur=uid)
    if non_lues:
        query = query.filter_by(lu=False)

    total  = query.count()
    notifs = query.order_by(Notification.date_creation.desc())\
                  .offset((page - 1) * limit).limit(limit).all()

    nb_non_lues = db.session.query(Notification)\
        .filter_by(id_utilisateur=uid, lu=False).count()

    return jsonify({
        'notifications': [n.to_dict() for n in notifs],
        'total':         total,
        'page':          page,
        'nb_pages':      (total + limit - 1) // limit,
        'nb_non_lues':   nb_non_lues
    }), 200


# ── MARQUER UNE notification comme lue ───────────────────────────────────────
@notifications_bp.route('/<int:nid>/lu', methods=['PUT'])
@auth_required
def marquer_lu(nid):
    identity = get_jwt().get('user', {})
    uid      = identity.get('id')

    notif = db.session.get(Notification, nid)
    if not notif:
        return jsonify({'message': 'Notification introuvable'}), 404
    if notif.id_utilisateur != uid:
        return jsonify({'message': 'Accès non autorisé'}), 403

    notif.lu = True
    db.session.commit()
    return jsonify({'message': 'Notification marquée comme lue'}), 200


# ── MARQUER TOUTES comme lues ─────────────────────────────────────────────────
@notifications_bp.route('/tout-lire', methods=['PUT'])
@auth_required
def tout_lire():
    identity = get_jwt().get('user', {})
    uid      = identity.get('id')

    db.session.query(Notification)\
        .filter_by(id_utilisateur=uid, lu=False)\
        .update({'lu': True})
    db.session.commit()

    return jsonify({'message': 'Toutes les notifications marquées comme lues'}), 200
