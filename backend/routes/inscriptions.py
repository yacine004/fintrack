from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Etudiant, Paiement, Caisse, SessionCaisse
from utils import generer_reference

inscriptions_bp = Blueprint('inscriptions', __name__)


def auth_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


def raf_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt().get('user', {})
        if identity.get('role') != 'raf':
            return jsonify({'message': 'Accès réservé au RAF'}), 403
        return fn(*args, **kwargs)
    return wrapper


# ── Prochain matricule disponible ────────────────────────────────────────────
@inscriptions_bp.route('/prochain-matricule', methods=['GET'])
@auth_required
def prochain_matricule():
    annee = request.args.get('annee', '2025-2026')
    parts = annee.split('-')
    year_code = (parts[0][-2:] + parts[1][-2:]) if len(parts) == 2 else '2526'
    prefix = f'ISM{year_code}/DK-'

    etudiants = db.session.query(Etudiant).filter(
        Etudiant.matricule.like(f'{prefix}%')
    ).all()

    counters = []
    for e in etudiants:
        try:
            counters.append(int(e.matricule.split('-')[-1]))
        except (ValueError, IndexError):
            pass

    next_n = max(counters) + 1 if counters else 1
    return jsonify({'matricule': f'{prefix}{next_n:05d}'}), 200


# ── Rechercher un étudiant par matricule (réinscription) ─────────────────────
@inscriptions_bp.route('/etudiant', methods=['GET'])
@auth_required
def rechercher_etudiant():
    matricule = request.args.get('matricule', '').strip()
    if not matricule:
        return jsonify({'message': 'Matricule requis'}), 400

    etu = db.session.query(Etudiant).filter(
        Etudiant.matricule.ilike(f'%{matricule}%')
    ).first()

    if not etu:
        return jsonify({'message': f'Aucun étudiant avec le matricule "{matricule}"'}), 404

    total_paye = db.session.query(db.func.sum(Paiement.montant)).filter(
        Paiement.id_etudiant == etu.id_etudiant,
        Paiement.annee_academique == etu.annee_academique
    ).scalar() or 0

    return jsonify({'etudiant': etu.to_dict(), 'total_paye_annee': float(total_paye)}), 200


# ── Nouvelle inscription ──────────────────────────────────────────────────────
@inscriptions_bp.route('/nouvelle', methods=['POST'])
@raf_required
def nouvelle():
    data     = request.get_json()
    etu_data = data.get('etudiant', {})
    pmt      = data.get('paiement')

    required = ['matricule', 'nom', 'prenom', 'classe', 'annee_academique']
    for f in required:
        if not etu_data.get(f, '').strip():
            return jsonify({'message': f'Champ obligatoire manquant : {f}'}), 400

    if db.session.query(Etudiant).filter_by(matricule=etu_data['matricule'].strip()).first():
        return jsonify({'message': 'Ce matricule est déjà utilisé'}), 409

    email = etu_data.get('email', '').strip()
    if email and db.session.query(Etudiant).filter_by(email=email).first():
        return jsonify({'message': 'Cet email est déjà utilisé'}), 409

    try:
        etu = Etudiant(
            matricule=etu_data['matricule'].strip().upper(),
            nom=etu_data['nom'].strip(),
            prenom=etu_data['prenom'].strip(),
            email=email or None,
            contact=etu_data.get('contact', '').strip() or None,
            classe=etu_data['classe'].strip(),
            filiere=etu_data.get('filiere', '').strip() or None,
            annee_academique=etu_data['annee_academique'].strip(),
            statut='actif'
        )
        db.session.add(etu)
        db.session.flush()

        paiement_obj = _creer_paiement(etu, pmt)

        db.session.commit()
        return jsonify({
            'message':  f'{etu.prenom} {etu.nom} inscrit(e) avec succès',
            'etudiant': etu.to_dict(),
            'paiement': paiement_obj.to_dict() if paiement_obj else None
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erreur : {str(e)}'}), 500


# ── Réinscription ─────────────────────────────────────────────────────────────
@inscriptions_bp.route('/reinscription', methods=['POST'])
@raf_required
def reinscription():
    data           = request.get_json()
    id_etudiant    = data.get('id_etudiant')
    nouvelle_classe = data.get('nouvelle_classe', '').strip()
    nouvelle_annee  = data.get('nouvelle_annee', '').strip()
    pmt             = data.get('paiement')

    if not all([id_etudiant, nouvelle_classe, nouvelle_annee]):
        return jsonify({'message': 'Étudiant, nouvelle classe et nouvelle année sont obligatoires'}), 400

    etu = db.session.get(Etudiant, id_etudiant)
    if not etu:
        return jsonify({'message': 'Étudiant introuvable'}), 404

    # Bloquer selon le statut d'autorisation de passage
    from models import AutorisationPassage
    from routes.alertes import _calcul_retard
    auth = db.session.query(AutorisationPassage).filter_by(
        id_etudiant=id_etudiant, annee=etu.annee_academique
    ).first()

    if auth and auth.statut == 'exclu':
        return jsonify({'message': f'Réinscription impossible : {etu.prenom} {etu.nom} a été exclu(e) pour l\'année {etu.annee_academique}.'}), 403

    if auth and auth.statut == 'ajourn':
        total_paye = db.session.query(db.func.sum(Paiement.montant)).filter(
            Paiement.id_etudiant == etu.id_etudiant,
            Paiement.annee_academique == etu.annee_academique
        ).scalar() or 0
        montant_du, _ = _calcul_retard(etu, float(total_paye))
        if montant_du > 0:
            return jsonify({
                'message': f'Réinscription bloquée : {etu.prenom} {etu.nom} est ajourné(e) avec {montant_du:,.0f} FCFA d\'arriérés non soldés.'
            }), 403

    if auth and auth.statut == 'laissez_passer':
        from datetime import date as _lp_date
        lp_expire = (not auth.date_validite_lp) or (auth.date_validite_lp < _lp_date.today())
        if lp_expire:
            total_paye = db.session.query(db.func.sum(Paiement.montant)).filter(
                Paiement.id_etudiant == etu.id_etudiant,
                Paiement.annee_academique == etu.annee_academique
            ).scalar() or 0
            montant_du, _ = _calcul_retard(etu, float(total_paye))
            if montant_du > 0:
                date_exp = auth.date_validite_lp.strftime('%d/%m/%Y') if auth.date_validite_lp else '—'
                return jsonify({
                    'message': f'Réinscription bloquée : le laissez-passer de {etu.prenom} {etu.nom} a expiré le {date_exp} avec {montant_du:,.0f} FCFA d\'arriérés non soldés.'
                }), 403

    try:
        ancienne = f'{etu.classe} ({etu.annee_academique})'
        etu.classe           = nouvelle_classe
        etu.annee_academique = nouvelle_annee
        etu.statut           = 'actif'

        paiement_obj = _creer_paiement(etu, pmt)

        db.session.commit()
        return jsonify({
            'message':  f'Réinscription réussie : {ancienne} → {nouvelle_classe} ({nouvelle_annee})',
            'etudiant': etu.to_dict(),
            'paiement': paiement_obj.to_dict() if paiement_obj else None
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erreur : {str(e)}'}), 500


# ── Helper interne ────────────────────────────────────────────────────────────
def _creer_paiement(etu, pmt):
    if not pmt:
        return None
    try:
        montant = float(pmt.get('montant', 0))
    except (ValueError, TypeError):
        return None
    if montant <= 0:
        return None

    caisse = db.session.get(Caisse, int(pmt['id_caisse']))
    if not caisse or caisse.statut == 'inactive':
        raise ValueError('Caisse invalide ou inactive')

    p = Paiement(
        id_etudiant=etu.id_etudiant,
        id_caisse=caisse.id_caisse,
        montant=montant,
        mode_paiement=pmt.get('mode_paiement', 'especes'),
        motif=pmt.get('motif', '') or None,
        reference=generer_reference(),
        annee_academique=etu.annee_academique
    )
    db.session.add(p)
    caisse.solde_actuel = float(caisse.solde_actuel) + montant

    from datetime import date as _date
    session_jour = db.session.query(SessionCaisse).filter_by(
        id_caisse=caisse.id_caisse, statut='ouverte'
    ).filter(SessionCaisse.date_session == _date.today()).first()
    if session_jour:
        session_jour.total_entrees = float(session_jour.total_entrees) + montant

    return p
