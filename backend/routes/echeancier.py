from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import LigneEcheancier, AnneeScolaire
from bareme import NIVEAUX, calculer_echeancier, seed_bareme_defaut

echeancier_bp = Blueprint('echeancier', __name__)


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


def _annee_scolaire(annee_libelle):
    return db.session.query(AnneeScolaire).filter_by(libelle=annee_libelle).first()


TYPE_LABELS = {'inscription': "🟦 Droits d'inscription", 'scolarite': '🟧 Frais de scolarité', 'encadrement': '🟣 Encadrement & Soutenance'}


# ── LISTER les lignes brutes (édition RAF) ────────────────────────────────────
@echeancier_bp.route('/lignes', methods=['GET'])
@auth_required
def lister_lignes():
    annee  = request.args.get('annee', '').strip()
    niveau = request.args.get('niveau', '').strip()
    if not annee:
        return jsonify({'message': 'Année obligatoire'}), 400

    annee_obj = _annee_scolaire(annee)
    if not annee_obj:
        return jsonify({'message': f'Année scolaire "{annee}" introuvable'}), 404

    q = db.session.query(LigneEcheancier).filter_by(id_annee=annee_obj.id)
    if niveau:
        q = q.filter_by(niveau=niveau)
    lignes = q.order_by(LigneEcheancier.niveau, LigneEcheancier.ordre).all()

    return jsonify({'lignes': [l.to_dict() for l in lignes], 'annee': annee}), 200


# ── CRÉER une ligne (RAF uniquement) ───────────────────────────────────────────
@echeancier_bp.route('/lignes', methods=['POST'])
@raf_required
def creer_ligne():
    data   = request.get_json()
    annee  = (data.get('annee') or '').strip()
    niveau = (data.get('niveau') or '').strip()

    if niveau not in NIVEAUX:
        return jsonify({'message': f'Niveau invalide. Valeurs : {NIVEAUX}'}), 400
    if data.get('type_ligne') not in ('inscription', 'scolarite', 'encadrement'):
        return jsonify({'message': "type_ligne invalide. Valeurs : inscription, scolarite, encadrement"}), 400
    if not (data.get('label') or '').strip():
        return jsonify({'message': 'Libellé obligatoire'}), 400

    try:
        mois    = int(data.get('mois'))
        jour    = int(data.get('jour', 5))
        montant = float(data.get('montant'))
        decalage = int(data.get('decalage_annee', 0))
        if not (1 <= mois <= 12) or not (1 <= jour <= 28) or montant <= 0 or decalage not in (0, 1):
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'message': 'Mois (1-12), jour (1-28), montant (positif) ou décalage (0/1) invalide'}), 400

    annee_obj = _annee_scolaire(annee)
    if not annee_obj:
        return jsonify({'message': f'Année scolaire "{annee}" introuvable'}), 404

    ligne = LigneEcheancier(
        id_annee=annee_obj.id, niveau=niveau, type_ligne=data['type_ligne'],
        label=data['label'].strip(), mois=mois, jour=jour, decalage_annee=decalage,
        montant=montant, ordre=int(data.get('ordre', 0)),
    )
    db.session.add(ligne)
    db.session.commit()
    return jsonify({'message': 'Ligne créée', 'ligne': ligne.to_dict()}), 201


# ── MODIFIER une ligne (RAF uniquement) ───────────────────────────────────────
@echeancier_bp.route('/lignes/<int:lid>', methods=['PUT'])
@raf_required
def modifier_ligne(lid):
    ligne = db.session.get(LigneEcheancier, lid)
    if not ligne:
        return jsonify({'message': 'Ligne introuvable'}), 404

    data = request.get_json()
    try:
        if 'label' in data and data['label'].strip():
            ligne.label = data['label'].strip()
        if 'mois' in data:
            mois = int(data['mois'])
            if not (1 <= mois <= 12): raise ValueError
            ligne.mois = mois
        if 'jour' in data:
            jour = int(data['jour'])
            if not (1 <= jour <= 28): raise ValueError
            ligne.jour = jour
        if 'decalage_annee' in data:
            decalage = int(data['decalage_annee'])
            if decalage not in (0, 1): raise ValueError
            ligne.decalage_annee = decalage
        if 'montant' in data:
            montant = float(data['montant'])
            if montant <= 0: raise ValueError
            ligne.montant = montant
        if 'ordre' in data:
            ligne.ordre = int(data['ordre'])
    except (ValueError, TypeError):
        return jsonify({'message': 'Valeur invalide'}), 400

    db.session.commit()
    return jsonify({'message': 'Ligne modifiée', 'ligne': ligne.to_dict()}), 200


# ── SUPPRIMER une ligne (RAF uniquement) ──────────────────────────────────────
@echeancier_bp.route('/lignes/<int:lid>', methods=['DELETE'])
@raf_required
def supprimer_ligne(lid):
    ligne = db.session.get(LigneEcheancier, lid)
    if not ligne:
        return jsonify({'message': 'Ligne introuvable'}), 404
    db.session.delete(ligne)
    db.session.commit()
    return jsonify({'message': 'Ligne supprimée'}), 200


# ── BARÈME COMPLET calculé, groupé par niveau (consommé par le frontend) ─────
@echeancier_bp.route('/bareme', methods=['GET'])
@auth_required
def bareme():
    annee = request.args.get('annee', '').strip()
    if not annee:
        return jsonify({'message': 'Année obligatoire'}), 400

    annee_obj = _annee_scolaire(annee)
    if not annee_obj:
        return jsonify({'message': f'Année scolaire "{annee}" introuvable'}), 404

    resultat = {}
    for niveau in NIVEAUX:
        lignes_db = db.session.query(LigneEcheancier).filter_by(
            id_annee=annee_obj.id, niveau=niveau
        ).order_by(LigneEcheancier.ordre).all()

        items_tuples = calculer_echeancier(niveau, annee_obj)
        groupes = {'inscription': [], 'scolarite': [], 'encadrement': []}
        for ligne, (d, montant, label) in zip(lignes_db, items_tuples):
            groupes[ligne.type_ligne].append({
                'key': f'l_{ligne.id}', 'date': d.isoformat(), 'label': label, 'montant': montant,
            })

        total_inscription = sum(i['montant'] for i in groupes['inscription'])
        total_scolarite   = sum(i['montant'] for i in groupes['scolarite'])
        total_encadrement = sum(i['montant'] for i in groupes['encadrement'])
        frais_mensuel = groupes['scolarite'][0]['montant'] if groupes['scolarite'] else 0

        resultat[niveau] = {
            **groupes,
            'totalInscription': total_inscription,
            'totalScolarite':   total_scolarite,
            'totalEncadrement': total_encadrement,
            'totalAnnuel':      total_inscription + total_scolarite + total_encadrement,
            'niveau':           niveau,
            'fraisMensuel':     frais_mensuel,
        }

    return jsonify({'annee': annee, 'niveaux': resultat}), 200


# ── DUPLIQUER le barème d'une année vers une autre (RAF uniquement) ──────────
@echeancier_bp.route('/dupliquer', methods=['POST'])
@raf_required
def dupliquer():
    data            = request.get_json()
    annee_source    = (data.get('annee_source') or '').strip()
    annee_dest      = (data.get('annee_destination') or '').strip()

    src = _annee_scolaire(annee_source)
    dst = _annee_scolaire(annee_dest)
    if not src:
        return jsonify({'message': f'Année source "{annee_source}" introuvable'}), 404
    if not dst:
        return jsonify({'message': f'Année destination "{annee_dest}" introuvable'}), 404

    if db.session.query(LigneEcheancier).filter_by(id_annee=dst.id).count() > 0:
        return jsonify({'message': f"L'année {annee_dest} a déjà un barème — supprimez-le d'abord si vous voulez le remplacer"}), 409

    lignes_src = db.session.query(LigneEcheancier).filter_by(id_annee=src.id).all()
    if not lignes_src:
        return jsonify({'message': f"Aucune ligne à dupliquer depuis {annee_source}"}), 400

    for l in lignes_src:
        db.session.add(LigneEcheancier(
            id_annee=dst.id, niveau=l.niveau, type_ligne=l.type_ligne, label=l.label,
            mois=l.mois, jour=l.jour, decalage_annee=l.decalage_annee,
            montant=l.montant, ordre=l.ordre,
        ))
    db.session.commit()
    return jsonify({'message': f'{len(lignes_src)} ligne(s) dupliquée(s) de {annee_source} vers {annee_dest}'}), 201


# ── INITIALISER le barème par défaut ISM (RAF uniquement) ─────────────────────
@echeancier_bp.route('/initialiser', methods=['POST'])
@raf_required
def initialiser():
    data  = request.get_json()
    annee = (data.get('annee') or '').strip()
    annee_obj = _annee_scolaire(annee)
    if not annee_obj:
        return jsonify({'message': f'Année scolaire "{annee}" introuvable'}), 404
    if db.session.query(LigneEcheancier).filter_by(id_annee=annee_obj.id).count() > 0:
        return jsonify({'message': f"L'année {annee} a déjà un barème défini"}), 409

    n = seed_bareme_defaut(annee_obj.id)
    return jsonify({'message': f'Barème ISM par défaut initialisé : {n} lignes créées'}), 201
