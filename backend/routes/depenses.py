from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Depense, Caisse, Budget, Notification, Utilisateur
from datetime import datetime

depenses_bp = Blueprint('depenses', __name__)


# ── Décorateurs ───────────────────────────────────────────────────────────────
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


def creer_notification(id_utilisateur, type_notif, message):
    """Créer une notification automatique."""
    try:
        notif = Notification(
            id_utilisateur=id_utilisateur,
            type=type_notif,
            message=message
        )
        db.session.add(notif)
    except Exception:
        pass


# ── ENREGISTRER une dépense ───────────────────────────────────────────────────
@depenses_bp.route('', methods=['POST'])
@auth_required
def creer():
    identity = get_jwt().get('user', {})
    data     = request.get_json()

    id_caisse  = data.get('id_caisse')
    montant    = data.get('montant')
    motif      = data.get('motif', '').strip()
    categorie  = data.get('categorie', '').strip()

    if not all([id_caisse, montant, motif]):
        return jsonify({'message': 'Caisse, montant et motif sont obligatoires'}), 400

    try:
        montant = float(montant)
        if montant <= 0:
            return jsonify({'message': 'Le montant doit être positif'}), 400
    except (ValueError, TypeError):
        return jsonify({'message': 'Montant invalide'}), 400

    caisse = db.session.get(Caisse, id_caisse)
    if not caisse:
        return jsonify({'message': 'Caisse introuvable'}), 404
    if caisse.statut == 'inactive':
        return jsonify({'message': 'La caisse sélectionnée est inactive'}), 400
    if float(caisse.solde_actuel) < montant:
        return jsonify({'message': f'Solde insuffisant. Solde actuel : {float(caisse.solde_actuel):,.0f} FCFA'}), 400

    try:
        depense = Depense(
            id_caisse=id_caisse,
            montant=montant,
            motif=motif,
            categorie=categorie or None,
            statut='en_attente'
        )
        db.session.add(depense)

        # Mise à jour solde caisse
        caisse.solde_actuel = float(caisse.solde_actuel) - montant

        # Vérifier dépassement budget si catégorie définie
        alerte_budget = None
        if categorie:
            budget = db.session.query(Budget).filter_by(
                categorie=categorie,
                annee=datetime.utcnow().strftime('%Y')
            ).first()

            if budget:
                budget.montant_consomme = float(budget.montant_consomme) + montant
                taux = (float(budget.montant_consomme) / float(budget.montant_alloue)) * 100

                if taux >= 100:
                    alerte_budget = f"🚨 Budget '{categorie}' DÉPASSÉ ({taux:.0f}%)"
                elif taux >= 80:
                    alerte_budget = f"⚠️ Budget '{categorie}' à {taux:.0f}% — Attention"

                if alerte_budget:
                    # Notifier tous les RAF
                    rafs = db.session.query(Utilisateur).filter_by(role='raf', actif=True).all()
                    for raf in rafs:
                        creer_notification(raf.id_utilisateur, 'alerte_budget', alerte_budget)

        db.session.commit()

        return jsonify({
            'message':        'Dépense enregistrée avec succès',
            'depense':        depense.to_dict(),
            'nouveau_solde':  float(caisse.solde_actuel),
            'alerte_budget':  alerte_budget
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erreur : {str(e)}'}), 500


# ── LISTER dépenses avec filtres + pagination ─────────────────────────────────
@depenses_bp.route('', methods=['GET'])
@auth_required
def lister():
    id_caisse  = request.args.get('caisse_id', '').strip()
    categorie  = request.args.get('categorie', '').strip()
    statut     = request.args.get('statut', '').strip()
    date_debut = request.args.get('date_debut', '').strip()
    date_fin   = request.args.get('date_fin', '').strip()
    page       = int(request.args.get('page', 1))
    limit      = int(request.args.get('limit', 10))

    query = db.session.query(Depense)

    if id_caisse:
        query = query.filter(Depense.id_caisse == int(id_caisse))
    if categorie:
        query = query.filter(Depense.categorie.ilike(f'%{categorie}%'))
    if statut in ('en_attente', 'validee', 'rejetee'):
        query = query.filter(Depense.statut == statut)
    if date_debut:
        try:
            query = query.filter(Depense.date_depense >= datetime.strptime(date_debut, '%Y-%m-%d'))
        except ValueError:
            pass
    if date_fin:
        try:
            query = query.filter(Depense.date_depense <= datetime.strptime(date_fin, '%Y-%m-%d'))
        except ValueError:
            pass

    total    = query.count()
    depenses = query.order_by(Depense.date_depense.desc())\
                    .offset((page - 1) * limit).limit(limit).all()
    nb_pages = (total + limit - 1) // limit

    # KPIs
    toutes         = db.session.query(Depense).all()
    total_depense  = sum(float(d.montant) for d in toutes)
    nb_en_attente  = sum(1 for d in toutes if d.statut == 'en_attente')

    return jsonify({
        'depenses':  [d.to_dict() for d in depenses],
        'total':     total,
        'page':      page,
        'nb_pages':  nb_pages,
        'kpis': {
            'total_depenses':  len(toutes),
            'total_depense':   total_depense,
            'nb_en_attente':   nb_en_attente,
        }
    }), 200


# ── DÉTAIL ────────────────────────────────────────────────────────────────────
@depenses_bp.route('/<int:did>', methods=['GET'])
@auth_required
def detail(did):
    depense = db.session.get(Depense, did)
    if not depense:
        return jsonify({'message': 'Dépense introuvable'}), 404
    return jsonify(depense.to_dict()), 200


# ── VALIDER une dépense (RAF uniquement) ──────────────────────────────────────
@depenses_bp.route('/<int:did>/valider', methods=['PUT'])
@raf_required
def valider(did):
    depense = db.session.get(Depense, did)
    if not depense:
        return jsonify({'message': 'Dépense introuvable'}), 404
    if depense.statut != 'en_attente':
        return jsonify({'message': f'Cette dépense est déjà {depense.statut}'}), 400

    depense.statut = 'validee'
    db.session.commit()

    return jsonify({
        'message': 'Dépense validée avec succès',
        'depense': depense.to_dict()
    }), 200


# ── REJETER une dépense (RAF uniquement) ──────────────────────────────────────
@depenses_bp.route('/<int:did>/rejeter', methods=['PUT'])
@raf_required
def rejeter(did):
    depense = db.session.get(Depense, did)
    if not depense:
        return jsonify({'message': 'Dépense introuvable'}), 404
    if depense.statut != 'en_attente':
        return jsonify({'message': f'Cette dépense est déjà {depense.statut}'}), 400

    # Rembourser le solde de la caisse
    caisse = db.session.get(Caisse, depense.id_caisse)
    if caisse:
        caisse.solde_actuel = float(caisse.solde_actuel) + float(depense.montant)

    depense.statut = 'rejetee'
    db.session.commit()

    return jsonify({
        'message': 'Dépense rejetée — solde caisse remboursé',
        'depense': depense.to_dict()
    }), 200
