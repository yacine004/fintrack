from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import AnneeScolaire, ConfigApp
from datetime import date

annees_bp = Blueprint('annees', __name__)


@annees_bp.route('', methods=['GET'])
@jwt_required()
def lister():
    annees = db.session.query(AnneeScolaire).order_by(AnneeScolaire.date_debut.desc()).all()
    return jsonify({'annees': [a.to_dict() for a in annees]}), 200


@annees_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active():
    a = db.session.query(AnneeScolaire).filter_by(active=True).first()
    if not a:
        return jsonify({'message': 'Aucune année active'}), 404
    return jsonify({'annee': a.to_dict()}), 200


@annees_bp.route('', methods=['POST'])
@jwt_required()
def creer():
    data = request.get_json()
    libelle = (data.get('libelle') or '').strip()
    if not libelle:
        return jsonify({'message': 'Libellé obligatoire (ex: 2026-2027)'}), 400
    if db.session.query(AnneeScolaire).filter_by(libelle=libelle).first():
        return jsonify({'message': f'L\'année {libelle} existe déjà'}), 409
    try:
        parts = libelle.split('-')
        debut = date(int(parts[0]), 9, 1)
        fin   = date(int(parts[1]), 8, 31)
    except Exception:
        return jsonify({'message': 'Format invalide — utiliser AAAA-AAAA (ex: 2026-2027)'}), 400

    a = AnneeScolaire(libelle=libelle, date_debut=debut, date_fin=fin, active=False)
    db.session.add(a)
    db.session.commit()
    return jsonify({'message': f'Année {libelle} créée', 'annee': a.to_dict()}), 201


@annees_bp.route('/<int:id>/activer', methods=['PUT'])
@jwt_required()
def activer(id):
    a = db.session.get(AnneeScolaire, id)
    if not a:
        return jsonify({'message': 'Année introuvable'}), 404
    # Bloquer si l'année n'a pas encore commencé chronologiquement
    if a.date_debut > date.today():
        return jsonify({
            'message': (
                f"Impossible d'activer l'année {a.libelle} : "
                f"elle ne commence que le {a.date_debut.strftime('%d/%m/%Y')}. "
                "Elle pourra être activée à cette date."
            )
        }), 400
    # Désactiver toutes les autres
    db.session.query(AnneeScolaire).update({'active': False})
    a.active = True
    db.session.commit()
    return jsonify({'message': f'Année {a.libelle} activée', 'annee': a.to_dict()}), 200


@annees_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def supprimer(id):
    a = db.session.get(AnneeScolaire, id)
    if not a:
        return jsonify({'message': 'Année introuvable'}), 404
    if a.active:
        return jsonify({'message': 'Impossible de supprimer l\'année active'}), 400
    db.session.delete(a)
    db.session.commit()
    return jsonify({'message': f'Année {a.libelle} supprimée'}), 200


# ── Config app (préfixe référence paiement, etc.) ────────────────────────────
@annees_bp.route('/config', methods=['GET'])
@jwt_required()
def get_config():
    configs = db.session.query(ConfigApp).all()
    return jsonify({c.cle: c.valeur for c in configs}), 200


@annees_bp.route('/config', methods=['POST'])
@jwt_required()
def set_config():
    data = request.get_json()
    for cle, valeur in data.items():
        c = db.session.query(ConfigApp).filter_by(cle=cle).first()
        if c:
            c.valeur = str(valeur)
        else:
            db.session.add(ConfigApp(cle=cle, valeur=str(valeur)))
    db.session.commit()
    return jsonify({'message': 'Configuration sauvegardée'}), 200
