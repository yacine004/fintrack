from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Budget
from datetime import datetime

budgets_bp = Blueprint('budgets', __name__)


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


# ── LISTER budgets avec taux de consommation ──────────────────────────────────
@budgets_bp.route('', methods=['GET'])
@auth_required
def lister():
    annee = request.args.get('annee', datetime.utcnow().strftime('%Y')).strip()
    query = db.session.query(Budget).filter_by(annee=annee)
    budgets = query.order_by(Budget.categorie.asc()).all()

    result = []
    for b in budgets:
        alloue    = float(b.montant_alloue)
        consomme  = float(b.montant_consomme)
        taux      = round((consomme / alloue) * 100, 1) if alloue > 0 else 0
        restant   = max(0, alloue - consomme)

        result.append({
            **b.to_dict(),
            'taux_consommation': taux,
            'montant_restant':   restant,
            'alerte':            'depasse' if taux >= 100 else 'attention' if taux >= 80 else 'normal'
        })

    # KPIs globaux
    total_alloue   = sum(float(b.montant_alloue) for b in budgets)
    total_consomme = sum(float(b.montant_consomme) for b in budgets)
    nb_depasses    = sum(1 for b in budgets if float(b.montant_consomme) >= float(b.montant_alloue))

    return jsonify({
        'budgets': result,
        'kpis': {
            'total_alloue':   total_alloue,
            'total_consomme': total_consomme,
            'nb_depasses':    nb_depasses,
            'taux_global':    round((total_consomme / total_alloue) * 100, 1) if total_alloue > 0 else 0
        }
    }), 200


# ── CRÉER un budget (RAF uniquement) ──────────────────────────────────────────
@budgets_bp.route('', methods=['POST'])
@raf_required
def creer():
    data = request.get_json()

    categorie      = data.get('categorie', '').strip()
    montant_alloue = data.get('montant_alloue')
    annee          = data.get('annee', datetime.utcnow().strftime('%Y')).strip()

    if not all([categorie, montant_alloue]):
        return jsonify({'message': 'Catégorie et montant alloué sont obligatoires'}), 400

    try:
        montant_alloue = float(montant_alloue)
        if montant_alloue <= 0:
            return jsonify({'message': 'Le montant doit être positif'}), 400
    except (ValueError, TypeError):
        return jsonify({'message': 'Montant invalide'}), 400

    # Vérifier si un budget existe déjà pour cette catégorie/année
    existing = db.session.query(Budget).filter_by(categorie=categorie, annee=annee).first()
    if existing:
        return jsonify({'message': f'Un budget existe déjà pour "{categorie}" en {annee}'}), 409

    budget = Budget(
        categorie=categorie,
        montant_alloue=montant_alloue,
        montant_consomme=0.0,
        annee=annee
    )
    db.session.add(budget)
    db.session.commit()

    return jsonify({
        'message': 'Budget créé avec succès',
        'budget':  budget.to_dict()
    }), 201


# ── MODIFIER un budget (RAF uniquement) ───────────────────────────────────────
@budgets_bp.route('/<int:bid>', methods=['PUT'])
@raf_required
def modifier(bid):
    budget = db.session.get(Budget, bid)
    if not budget:
        return jsonify({'message': 'Budget introuvable'}), 404

    data = request.get_json()

    if 'montant_alloue' in data:
        try:
            montant = float(data['montant_alloue'])
            if montant <= 0:
                return jsonify({'message': 'Le montant doit être positif'}), 400
            budget.montant_alloue = montant
        except (ValueError, TypeError):
            return jsonify({'message': 'Montant invalide'}), 400

    if 'categorie' in data and data['categorie'].strip():
        budget.categorie = data['categorie'].strip()

    db.session.commit()
    return jsonify({'message': 'Budget modifié', 'budget': budget.to_dict()}), 200


# ── SUPPRIMER un budget (RAF uniquement) ──────────────────────────────────────
@budgets_bp.route('/<int:bid>', methods=['DELETE'])
@raf_required
def supprimer(bid):
    budget = db.session.get(Budget, bid)
    if not budget:
        return jsonify({'message': 'Budget introuvable'}), 404

    db.session.delete(budget)
    db.session.commit()
    return jsonify({'message': 'Budget supprimé'}), 200
