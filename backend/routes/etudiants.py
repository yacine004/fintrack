from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Etudiant, Paiement

etudiants_bp = Blueprint('etudiants', __name__)


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


# ── Décorateur JWT (RAF + Comptable) ─────────────────────────────────────────
def auth_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


# ── LISTER avec recherche + filtre + pagination ───────────────────────────────
@etudiants_bp.route('', methods=['GET'])
@auth_required
def lister():
    search          = request.args.get('search', '').strip()
    classe          = request.args.get('classe', '').strip()
    filiere         = request.args.get('filiere', '').strip()
    annee           = request.args.get('annee', '').strip()
    statut          = request.args.get('statut', '').strip()
    page            = int(request.args.get('page', 1))
    limit           = int(request.args.get('limit', 10))

    query = db.session.query(Etudiant)

    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                Etudiant.nom.ilike(like),
                Etudiant.prenom.ilike(like),
                Etudiant.matricule.ilike(like),
                Etudiant.email.ilike(like)
            )
        )
    if classe:
        query = query.filter(Etudiant.classe == classe)
    if filiere:
        query = query.filter(Etudiant.filiere.ilike(f'%{filiere}%'))
    if annee:
        query = query.filter(Etudiant.annee_academique == annee)
    if statut in ('actif', 'archive'):
        query = query.filter(Etudiant.statut == statut)

    total    = query.count()
    etudiants = query.order_by(Etudiant.nom.asc())\
                     .offset((page - 1) * limit).limit(limit).all()
    nb_pages = (total + limit - 1) // limit

    return jsonify({
        'etudiants': [e.to_dict() for e in etudiants],
        'total':     total,
        'page':      page,
        'nb_pages':  nb_pages
    }), 200


# ── CRÉER ─────────────────────────────────────────────────────────────────────
@etudiants_bp.route('', methods=['POST'])
@auth_required
def creer():
    data = request.get_json()

    matricule        = data.get('matricule', '').strip()
    nom              = data.get('nom', '').strip()
    prenom           = data.get('prenom', '').strip()
    email            = data.get('email', '').strip().lower()
    contact          = data.get('contact', '').strip()
    classe           = data.get('classe', '').strip()
    filiere          = data.get('filiere', '').strip()
    annee_academique = data.get('annee_academique', '').strip()

    if not all([matricule, nom, prenom, classe, annee_academique]):
        return jsonify({'message': 'Matricule, nom, prénom, classe et année académique sont obligatoires'}), 400

    if db.session.query(Etudiant).filter_by(matricule=matricule).first():
        return jsonify({'message': 'Ce matricule est déjà utilisé'}), 409

    if email and db.session.query(Etudiant).filter_by(email=email).first():
        return jsonify({'message': 'Cet email est déjà utilisé'}), 409

    etudiant = Etudiant(
        matricule=matricule, nom=nom, prenom=prenom,
        email=email or None, contact=contact or None,
        classe=classe, filiere=filiere or None,
        annee_academique=annee_academique
    )
    db.session.add(etudiant)
    db.session.commit()

    return jsonify({
        'message':  'Étudiant créé avec succès',
        'etudiant': etudiant.to_dict()
    }), 201


# ── DÉTAIL ────────────────────────────────────────────────────────────────────
@etudiants_bp.route('/<int:eid>', methods=['GET'])
@auth_required
def detail(eid):
    etudiant = db.session.get(Etudiant, eid)
    if not etudiant:
        return jsonify({'message': 'Étudiant introuvable'}), 404
    return jsonify(etudiant.to_dict()), 200


# ── MODIFIER ──────────────────────────────────────────────────────────────────
@etudiants_bp.route('/<int:eid>', methods=['PUT'])
@auth_required
def modifier(eid):
    etudiant = db.session.get(Etudiant, eid)
    if not etudiant:
        return jsonify({'message': 'Étudiant introuvable'}), 404

    data = request.get_json()

    if 'nom' in data and data['nom'].strip():
        etudiant.nom = data['nom'].strip()
    if 'prenom' in data and data['prenom'].strip():
        etudiant.prenom = data['prenom'].strip()
    if 'email' in data:
        email = data['email'].strip().lower()
        existing = db.session.query(Etudiant).filter_by(email=email).first()
        if existing and existing.id_etudiant != eid:
            return jsonify({'message': 'Cet email est déjà utilisé'}), 409
        etudiant.email = email or None
    if 'contact' in data:
        etudiant.contact = data['contact'].strip() or None
    if 'classe' in data and data['classe'].strip():
        etudiant.classe = data['classe'].strip()
    if 'filiere' in data:
        etudiant.filiere = data['filiere'].strip() or None
    if 'annee_academique' in data and data['annee_academique'].strip():
        etudiant.annee_academique = data['annee_academique'].strip()

    db.session.commit()
    return jsonify({'message': 'Étudiant modifié', 'etudiant': etudiant.to_dict()}), 200


# ── ARCHIVER (RAF uniquement) ─────────────────────────────────────────────────
@etudiants_bp.route('/<int:eid>/archiver', methods=['PUT'])
@raf_required
def archiver(eid):
    etudiant = db.session.get(Etudiant, eid)
    if not etudiant:
        return jsonify({'message': 'Étudiant introuvable'}), 404

    etudiant.statut = 'archive' if etudiant.statut == 'actif' else 'actif'
    db.session.commit()

    return jsonify({
        'message':  f"Étudiant {'archivé' if etudiant.statut == 'archive' else 'réactivé'}",
        'etudiant': etudiant.to_dict()
    }), 200


# ── SUPPRIMER (RAF uniquement) ────────────────────────────────────────────────
@etudiants_bp.route('/<int:eid>', methods=['DELETE'])
@raf_required
def supprimer(eid):
    etudiant = db.session.get(Etudiant, eid)
    if not etudiant:
        return jsonify({'message': 'Étudiant introuvable'}), 404

    db.session.delete(etudiant)
    db.session.commit()
    return jsonify({'message': 'Étudiant supprimé avec succès'}), 200


# ── STATISTIQUES étudiants ────────────────────────────────────────────────────
@etudiants_bp.route('/stats', methods=['GET'])
@auth_required
def stats():
    total      = db.session.query(Etudiant).count()
    actifs     = db.session.query(Etudiant).filter_by(statut='actif').count()
    archives   = db.session.query(Etudiant).filter_by(statut='archive').count()

    return jsonify({
        'total':    total,
        'actifs':   actifs,
        'archives': archives
    }), 200


# ── PORTAIL PUBLIC : suivi paiements par matricule (sans JWT) ─────────────────
# Barème ISM 2025-2026 (identique à ModalEcheancier.jsx)
def _get_niveau(classe):
    c = (classe or '').upper()
    if 'M2' in c: return 'M2'
    if 'M1' in c: return 'M1'
    if 'L3' in c: return 'L3'
    if 'L2' in c: return 'L2'
    return 'L1'

def _generer_echeancier(classe):
    from datetime import date as _date
    niveau = _get_niveau(classe)
    frais_mensuel = 100_000 if niveau == 'M1' else 97_500 if niveau == 'M2' else 95_000
    an = 2025
    inscription = [
        {'date': _date(an,   9, 5), 'montant': 112_500},
        {'date': _date(an,  10, 5), 'montant': 112_500},
        {'date': _date(an+1, 1, 5), 'montant': 112_500},
        {'date': _date(an+1, 2, 5), 'montant': 112_500},
    ]
    mois = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6]
    scolarite = [{'date': _date(an if m >= 9 else an+1, m, 5), 'montant': frais_mensuel} for m in mois]
    encadrement = [{'date': _date(an+1, 3, 5), 'montant': 75_000}] if niveau == 'L3' else []
    items = inscription + scolarite + encadrement
    return items, sum(i['montant'] for i in items)

def _est_a_jour(items, total_paye):
    from datetime import date as _date
    today = _date.today()
    budget = total_paye
    for item in items:
        if budget >= item['montant']:
            budget -= item['montant']
        elif item['date'] <= today:
            return False
    return True

@etudiants_bp.route('/suivi', methods=['GET'])
def suivi_paiements():
    matricule = request.args.get('matricule', '').strip().upper()
    if not matricule:
        return jsonify({'message': 'Matricule requis'}), 400

    etudiant = db.session.query(Etudiant).filter_by(matricule=matricule).first()
    if not etudiant:
        return jsonify({'message': 'Aucun étudiant trouvé avec ce matricule'}), 404

    paiements = (db.session.query(Paiement)
                 .filter_by(id_etudiant=etudiant.id_etudiant)
                 .order_by(Paiement.date_paiement.asc())
                 .all())

    echeancier_items, tarif_annuel = _generer_echeancier(etudiant.classe)
    total_paye    = sum(float(p.montant) for p in paiements)
    solde_restant = max(0.0, tarif_annuel - total_paye)
    a_jour        = _est_a_jour(echeancier_items, total_paye)

    # S1 : septembre–janvier  |  S2 : février–juin
    def _is_s1(m): return m >= 9 or m == 1
    s1 = [p for p in paiements if _is_s1(p.date_paiement.month)]
    s2 = [p for p in paiements if not _is_s1(p.date_paiement.month)]

    return jsonify({
        'etudiant': {
            'matricule':        etudiant.matricule,
            'nom':              etudiant.nom,
            'prenom':           etudiant.prenom,
            'classe':           etudiant.classe,
            'filiere':          etudiant.filiere or '',
            'annee_academique': etudiant.annee_academique,
            'email':            etudiant.email or '',
        },
        'resume': {
            'tarif_annuel':  tarif_annuel,
            'total_paye':    total_paye,
            'solde_restant': solde_restant,
            'a_jour':        a_jour,
            'nb_paiements':  len(paiements),
            'total_s1':      sum(float(p.montant) for p in s1),
            'total_s2':      sum(float(p.montant) for p in s2),
        },
        'paiements': [
            {
                'id':             p.id_paiement,
                'reference':      p.reference or f'FT-{p.id_paiement:05d}',
                'montant':        float(p.montant),
                'mode_paiement':  p.mode_paiement,
                'motif':          p.motif or '',
                'caisse':         p.caisse.nom if p.caisse else '',
                'date_paiement':  p.date_paiement.strftime('%d/%m/%Y'),
                'semestre':       'S1' if _is_s1(p.date_paiement.month) else 'S2',
            }
            for p in paiements
        ],
    }), 200
