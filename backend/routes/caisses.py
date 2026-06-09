from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Caisse

caisses_bp = Blueprint('caisses', __name__)


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


# ── LISTER toutes les caisses ─────────────────────────────────────────────────
@caisses_bp.route('', methods=['GET'])
@auth_required
def lister():
    statut      = request.args.get('statut', '').strip()
    type_caisse = request.args.get('type', '').strip()
    page        = int(request.args.get('page', 1))
    limit       = int(request.args.get('limit', 10))

    query = db.session.query(Caisse)

    if statut in ('active', 'inactive'):
        query = query.filter(Caisse.statut == statut)
    if type_caisse in ('principale', 'secondaire', 'projet'):
        query = query.filter(Caisse.type_caisse == type_caisse)

    total    = query.count()
    caisses  = query.order_by(Caisse.nom.asc())\
                    .offset((page - 1) * limit).limit(limit).all()
    nb_pages = (total + limit - 1) // limit

    # KPIs globaux
    toutes_caisses  = db.session.query(Caisse).all()
    solde_total     = sum(float(c.solde_actuel) for c in toutes_caisses)
    nb_actives      = sum(1 for c in toutes_caisses if c.statut == 'active')

    return jsonify({
        'caisses':    [c.to_dict() for c in caisses],
        'total':      total,
        'page':       page,
        'nb_pages':   nb_pages,
        'kpis': {
            'solde_total': solde_total,
            'nb_actives':  nb_actives,
            'nb_total':    len(toutes_caisses)
        }
    }), 200


# ── CRÉER une caisse (RAF uniquement) ─────────────────────────────────────────
@caisses_bp.route('', methods=['POST'])
@raf_required
def creer():
    data = request.get_json()

    nom         = data.get('nom', '').strip()
    description = data.get('description', '').strip()
    type_caisse = data.get('type_caisse', '').strip()
    solde_init  = float(data.get('solde_initial', 0))

    if not all([nom, type_caisse]):
        return jsonify({'message': 'Nom et type de caisse sont obligatoires'}), 400

    if type_caisse not in ('principale', 'secondaire', 'projet'):
        return jsonify({'message': 'Type invalide. Valeurs acceptées : principale, secondaire, projet'}), 400

    if db.session.query(Caisse).filter_by(nom=nom).first():
        return jsonify({'message': 'Une caisse avec ce nom existe déjà'}), 409

    caisse = Caisse(
        nom=nom,
        description=description or None,
        type_caisse=type_caisse,
        solde_actuel=solde_init
    )
    db.session.add(caisse)
    db.session.commit()

    return jsonify({
        'message': 'Caisse créée avec succès',
        'caisse':  caisse.to_dict()
    }), 201


# ── DÉTAIL d'une caisse ───────────────────────────────────────────────────────
@caisses_bp.route('/<int:cid>', methods=['GET'])
@auth_required
def detail(cid):
    caisse = db.session.get(Caisse, cid)
    if not caisse:
        return jsonify({'message': 'Caisse introuvable'}), 404
    return jsonify(caisse.to_dict()), 200


# ── MODIFIER une caisse (RAF uniquement) ──────────────────────────────────────
@caisses_bp.route('/<int:cid>', methods=['PUT'])
@raf_required
def modifier(cid):
    caisse = db.session.get(Caisse, cid)
    if not caisse:
        return jsonify({'message': 'Caisse introuvable'}), 404

    data = request.get_json()

    if 'nom' in data and data['nom'].strip():
        nom_existant = db.session.query(Caisse).filter_by(nom=data['nom'].strip()).first()
        if nom_existant and nom_existant.id_caisse != cid:
            return jsonify({'message': 'Ce nom de caisse est déjà utilisé'}), 409
        caisse.nom = data['nom'].strip()
    if 'description' in data:
        caisse.description = data['description'].strip() or None
    if 'type_caisse' in data and data['type_caisse'] in ('principale', 'secondaire', 'projet'):
        caisse.type_caisse = data['type_caisse']

    db.session.commit()
    return jsonify({'message': 'Caisse modifiée', 'caisse': caisse.to_dict()}), 200


# ── ACTIVER / DÉSACTIVER une caisse (RAF uniquement) ──────────────────────────
@caisses_bp.route('/<int:cid>/toggle', methods=['PUT'])
@raf_required
def toggle(cid):
    caisse = db.session.get(Caisse, cid)
    if not caisse:
        return jsonify({'message': 'Caisse introuvable'}), 404

    caisse.statut = 'inactive' if caisse.statut == 'active' else 'active'
    db.session.commit()

    return jsonify({
        'message': f"Caisse {'activée' if caisse.statut == 'active' else 'désactivée'}",
        'caisse':  caisse.to_dict()
    }), 200


# ── HISTORIQUE des transactions d'une caisse ──────────────────────────────────
@caisses_bp.route('/<int:cid>/transactions', methods=['GET'])
@auth_required
def transactions(cid):
    from models import Paiement, Depense

    caisse = db.session.get(Caisse, cid)
    if not caisse:
        return jsonify({'message': 'Caisse introuvable'}), 404

    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))

    # Récupérer paiements (entrées)
    paiements = db.session.query(Paiement)\
        .filter_by(id_caisse=cid)\
        .order_by(Paiement.date_paiement.desc()).all()

    # Récupérer dépenses (sorties)
    depenses = db.session.query(Depense)\
        .filter_by(id_caisse=cid)\
        .order_by(Depense.date_depense.desc()).all()

    # Fusionner et trier par date
    transactions_list = []
    for p in paiements:
        transactions_list.append({
            'type':   'entree',
            'montant': float(p.montant),
            'motif':   p.motif or f"Paiement — {p.etudiant.prenom} {p.etudiant.nom}" if p.etudiant else 'Paiement',
            'date':    p.date_paiement.strftime('%d/%m/%Y %H:%M'),
            'ref':     p.reference or ''
        })
    for d in depenses:
        transactions_list.append({
            'type':   'sortie',
            'montant': float(d.montant),
            'motif':   d.motif,
            'date':    d.date_depense.strftime('%d/%m/%Y %H:%M'),
            'ref':     ''
        })

    # Trier par date décroissante
    transactions_list.sort(key=lambda x: x['date'], reverse=True)

    total    = len(transactions_list)
    debut    = (page - 1) * limit
    fin      = debut + limit
    nb_pages = (total + limit - 1) // limit

    return jsonify({
        'caisse':       caisse.to_dict(),
        'transactions': transactions_list[debut:fin],
        'total':        total,
        'page':         page,
        'nb_pages':     nb_pages
    }), 200


# ── SUPPRIMER une caisse (RAF uniquement) ─────────────────────────────────────
@caisses_bp.route('/<int:cid>', methods=['DELETE'])
@raf_required
def supprimer(cid):
    caisse = db.session.get(Caisse, cid)
    if not caisse:
        return jsonify({'message': 'Caisse introuvable'}), 404

    if float(caisse.solde_actuel) != 0:
        return jsonify({'message': 'Impossible de supprimer une caisse avec un solde non nul'}), 400

    db.session.delete(caisse)
    db.session.commit()
    return jsonify({'message': 'Caisse supprimée avec succès'}), 200
