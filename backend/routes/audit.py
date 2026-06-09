from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import AuditLog, Utilisateur
from datetime import datetime

audit_bp = Blueprint('audit', __name__)


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


def log_action(id_utilisateur, action, entite, id_entite=None, details=None):
    """Utilitaire pour enregistrer une action dans l'audit log."""
    import json
    try:
        log = AuditLog(
            id_utilisateur=id_utilisateur,
            action=action,
            entite=entite,
            id_entite=id_entite,
            details=json.dumps(details) if details else None
        )
        db.session.add(log)
        db.session.flush()
    except Exception:
        pass


# ── LISTER le journal d'audit (RAF uniquement) ────────────────────────────────
@audit_bp.route('', methods=['GET'])
@raf_required
def lister():
    action     = request.args.get('action', '').strip().upper()
    entite     = request.args.get('entite', '').strip()
    id_user    = request.args.get('utilisateur_id', '').strip()
    date_debut = request.args.get('date_debut', '').strip()
    date_fin   = request.args.get('date_fin', '').strip()
    page       = int(request.args.get('page', 1))
    limit      = int(request.args.get('limit', 20))

    query = db.session.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action.ilike(f'%{action}%'))
    if entite:
        query = query.filter(AuditLog.entite.ilike(f'%{entite}%'))
    if id_user:
        query = query.filter(AuditLog.id_utilisateur == int(id_user))
    if date_debut:
        try:
            query = query.filter(AuditLog.date_action >= datetime.strptime(date_debut, '%Y-%m-%d'))
        except ValueError:
            pass
    if date_fin:
        try:
            query = query.filter(AuditLog.date_action <= datetime.strptime(date_fin, '%Y-%m-%d'))
        except ValueError:
            pass

    total  = query.count()
    logs   = query.order_by(AuditLog.date_action.desc())\
                  .offset((page - 1) * limit).limit(limit).all()
    nb_pages = (total + limit - 1) // limit

    # Enrichir avec le nom de l'utilisateur
    result = []
    for log in logs:
        d = log.to_dict()
        user = db.session.get(Utilisateur, log.id_utilisateur)
        d['utilisateur_nom'] = f"{user.prenom} {user.nom}" if user else 'Inconnu'
        d['utilisateur_role'] = user.role if user else ''
        result.append(d)

    return jsonify({
        'logs':     result,
        'total':    total,
        'page':     page,
        'nb_pages': nb_pages
    }), 200
