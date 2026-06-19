from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Depense, Caisse, Budget, Notification, Utilisateur, SessionCaisse
from datetime import datetime
from routes.audit import log_action

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


def _notifier_rafs(type_notif, message, priorite='normale'):
    try:
        rafs = db.session.query(Utilisateur).filter_by(role='raf', actif=True).all()
        for raf in rafs:
            db.session.add(Notification(
                id_utilisateur=raf.id_utilisateur,
                type=type_notif,
                message=message,
                priorite=priorite
            ))
    except Exception:
        pass


# ── CRÉER une demande de dépense ──────────────────────────────────────────────
# Demandeur = raf ou comptable. Statut initial : en_attente. Aucun argent ne sort.
@depenses_bp.route('', methods=['POST'])
@auth_required
def creer():
    identity  = get_jwt().get('user', {})
    data      = request.get_json()
    id_caisse = data.get('id_caisse')
    montant   = data.get('montant')
    motif     = data.get('motif', '').strip()
    categorie = data.get('categorie', '').strip()

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

    try:
        depense = Depense(
            id_caisse=id_caisse,
            montant=montant,
            motif=motif,
            categorie=categorie or None,
            statut='en_attente',
            id_demandeur=identity.get('id'),
        )
        db.session.add(depense)
        db.session.flush()

        log_action(identity.get('id'), 'CREATE', 'Depense', depense.id_depense,
                   {'montant': montant, 'motif': motif, 'caisse': caisse.nom})
        db.session.commit()

        return jsonify({
            'message': 'Demande de dépense créée — en attente de validation RAF',
            'depense': depense.to_dict(),
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
    if statut in ('en_attente', 'validee', 'rejetee', 'payee'):
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

    toutes        = db.session.query(Depense).all()
    total_decaisse = sum(float(d.montant) for d in toutes if d.statut == 'payee')
    nb_en_attente  = sum(1 for d in toutes if d.statut == 'en_attente')
    nb_validees    = sum(1 for d in toutes if d.statut == 'validee')

    return jsonify({
        'depenses': [d.to_dict() for d in depenses],
        'total':    total,
        'page':     page,
        'nb_pages': nb_pages,
        'kpis': {
            'total_depenses':   len(toutes),
            'total_decaisse':   total_decaisse,
            'nb_en_attente':    nb_en_attente,
            'nb_validees':      nb_validees,
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
# L'argent ne sort pas encore ici. Il sort à l'étape payer().
@depenses_bp.route('/<int:did>/valider', methods=['PUT'])
@raf_required
def valider(did):
    identity = get_jwt().get('user', {})
    depense  = db.session.get(Depense, did)
    if not depense:
        return jsonify({'message': 'Dépense introuvable'}), 404
    if depense.statut != 'en_attente':
        return jsonify({'message': f'Cette dépense est déjà « {depense.statut} »'}), 400

    depense.statut          = 'validee'
    depense.id_validateur   = identity.get('id')
    depense.date_validation = datetime.utcnow()
    db.session.flush()

    log_action(identity.get('id'), 'VALIDER', 'Depense', did,
               {'montant': float(depense.montant), 'motif': depense.motif})
    db.session.commit()

    return jsonify({
        'message': 'Dépense validée — le caissier peut maintenant procéder au décaissement',
        'depense': depense.to_dict(),
    }), 200


# ── REJETER une dépense (RAF uniquement) ──────────────────────────────────────
@depenses_bp.route('/<int:did>/rejeter', methods=['PUT'])
@raf_required
def rejeter(did):
    identity = get_jwt().get('user', {})
    depense  = db.session.get(Depense, did)
    if not depense:
        return jsonify({'message': 'Dépense introuvable'}), 404
    if depense.statut not in ('en_attente', 'validee'):
        return jsonify({'message': f'Cette dépense est déjà « {depense.statut} »'}), 400

    depense.statut          = 'rejetee'
    depense.id_validateur   = identity.get('id')
    depense.date_validation = datetime.utcnow()
    db.session.flush()

    log_action(identity.get('id'), 'REJETER', 'Depense', did,
               {'montant': float(depense.montant), 'motif': depense.motif})
    db.session.commit()

    return jsonify({
        'message': 'Dépense rejetée',
        'depense': depense.to_dict(),
    }), 200


# ── DÉCAISSER une dépense (comptable uniquement) ─────────────────────────────
# C'est ici que l'argent sort réellement de la caisse.
@depenses_bp.route('/<int:did>/payer', methods=['PUT'])
@auth_required
def payer(did):
    identity = get_jwt().get('user', {})
    if identity.get('role') not in ('comptable', 'raf'):
        return jsonify({'message': 'Accès réservé au comptable ou RAF'}), 403

    depense = db.session.get(Depense, did)
    if not depense:
        return jsonify({'message': 'Dépense introuvable'}), 404
    if depense.statut != 'validee':
        return jsonify({'message': 'Seules les dépenses validées peuvent être décaissées'}), 400

    caisse = db.session.get(Caisse, depense.id_caisse)
    if not caisse:
        return jsonify({'message': 'Caisse introuvable'}), 404
    if caisse.statut == 'inactive':
        return jsonify({'message': 'La caisse est inactive'}), 400
    if float(caisse.solde_actuel) < float(depense.montant):
        return jsonify({
            'message': f'Solde insuffisant. Solde actuel : {float(caisse.solde_actuel):,.0f} FCFA'
        }), 400

    try:
        caisse.solde_actuel = float(caisse.solde_actuel) - float(depense.montant)

        # Mise à jour session du jour si ouverte
        from datetime import date as _date
        session_jour = db.session.query(SessionCaisse).filter_by(
            id_caisse=depense.id_caisse, statut='ouverte'
        ).filter(SessionCaisse.date_session == _date.today()).first()
        if session_jour:
            session_jour.total_sorties = float(session_jour.total_sorties) + float(depense.montant)

        depense.statut               = 'payee'
        depense.id_caissier          = identity.get('id')
        depense.date_paiement_sortie = datetime.utcnow()

        # Mise à jour budget si catégorie
        alerte_budget = None
        if depense.categorie:
            budget = db.session.query(Budget).filter_by(
                categorie=depense.categorie,
                annee=datetime.utcnow().strftime('%Y')
            ).first()
            if budget:
                budget.montant_consomme = float(budget.montant_consomme) + float(depense.montant)
                taux = (float(budget.montant_consomme) / float(budget.montant_alloue)) * 100
                if taux >= 100:
                    alerte_budget = f"Budget '{depense.categorie}' DÉPASSÉ ({taux:.0f}%)"
                    _notifier_rafs('alerte_budget', f"🚨 {alerte_budget}", 'critique')
                elif taux >= 80:
                    alerte_budget = f"Budget '{depense.categorie}' à {taux:.0f}%"
                    _notifier_rafs('alerte_budget', f"⚠️ {alerte_budget} — Attention", 'haute')

        db.session.flush()
        log_action(identity.get('id'), 'PAYER', 'Depense', did,
                   {'montant': float(depense.montant), 'motif': depense.motif,
                    'caisse': caisse.nom})
        db.session.commit()

        return jsonify({
            'message':       'Décaissement effectué avec succès',
            'depense':       depense.to_dict(),
            'nouveau_solde': float(caisse.solde_actuel),
            'alerte_budget': alerte_budget,
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erreur : {str(e)}'}), 500
