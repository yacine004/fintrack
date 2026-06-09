from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Paiement, Depense, Caisse, Etudiant, Budget
from datetime import datetime, timedelta
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)


def auth_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


@dashboard_bp.route('', methods=['GET'])
@auth_required
def get_dashboard():
    identity   = get_jwt().get('user', {})
    role       = identity.get('role')
    id_caisse  = request.args.get('caisse_id', '').strip()

    # ── Filtre caisse optionnel ──
    caisse_filter_p = (Paiement.id_caisse == int(id_caisse)) if id_caisse else True
    caisse_filter_d = (Depense.id_caisse  == int(id_caisse)) if id_caisse else True

    # ── KPIs globaux ──
    total_encaisse = db.session.query(
        func.coalesce(func.sum(Paiement.montant), 0)
    ).filter(caisse_filter_p).scalar()

    total_depense = db.session.query(
        func.coalesce(func.sum(Depense.montant), 0)
    ).filter(Depense.statut == 'validee').filter(caisse_filter_d).scalar()

    solde_global = db.session.query(
        func.coalesce(func.sum(Caisse.solde_actuel), 0)
    ).scalar()

    nb_etudiants_actifs = db.session.query(Etudiant)\
        .filter_by(statut='actif').count()

    nb_impayes = 0
    montant_attendu = 500000
    if role == 'raf':
        etudiants = db.session.query(Etudiant).filter_by(statut='actif').all()
        for e in etudiants:
            total_paye = sum(float(p.montant) for p in e.paiements)
            if total_paye < montant_attendu:
                nb_impayes += 1

    # ── Évolution paiements sur 6 mois ──
    evolution = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        mois_date  = now - timedelta(days=i * 30)
        mois_debut = mois_date.replace(day=1, hour=0, minute=0, second=0)
        if mois_date.month == 12:
            mois_fin = mois_date.replace(year=mois_date.year+1, month=1, day=1)
        else:
            mois_fin = mois_date.replace(month=mois_date.month+1, day=1)

        montant_mois = db.session.query(
            func.coalesce(func.sum(Paiement.montant), 0)
        ).filter(
            Paiement.date_paiement >= mois_debut,
            Paiement.date_paiement < mois_fin
        ).filter(caisse_filter_p).scalar()

        depense_mois = db.session.query(
            func.coalesce(func.sum(Depense.montant), 0)
        ).filter(
            Depense.date_depense >= mois_debut,
            Depense.date_depense < mois_fin,
            Depense.statut == 'validee'
        ).filter(caisse_filter_d).scalar()

        MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
        evolution.append({
            'mois':      MOIS[mois_debut.month - 1],
            'recettes':  float(montant_mois),
            'depenses':  float(depense_mois),
            'solde':     float(montant_mois) - float(depense_mois)
        })

    # ── Répartition par mode de paiement ──
    modes_query = db.session.query(
        Paiement.mode_paiement,
        func.count(Paiement.id_paiement).label('nb'),
        func.sum(Paiement.montant).label('total')
    ).group_by(Paiement.mode_paiement).all()

    repartition_modes = [
        {'mode': m.mode_paiement, 'nb': m.nb, 'total': float(m.total or 0)}
        for m in modes_query
    ]

    # ── Top caisses ──
    caisses = db.session.query(Caisse).filter_by(statut='active').all()
    top_caisses = sorted(
        [{'nom': c.nom, 'solde': float(c.solde_actuel), 'type': c.type_caisse} for c in caisses],
        key=lambda x: x['solde'], reverse=True
    )[:5]

    # ── Alertes budgets ──
    alertes = []
    if role == 'raf':
        annee  = str(now.year)
        budgets = db.session.query(Budget).filter_by(annee=annee).all()
        for b in budgets:
            taux = (float(b.montant_consomme) / float(b.montant_alloue)) * 100 if float(b.montant_alloue) > 0 else 0
            if taux >= 80:
                alertes.append({
                    'categorie': b.categorie,
                    'taux':      round(taux, 1),
                    'type':      'depasse' if taux >= 100 else 'attention'
                })

    return jsonify({
        'kpis': {
            'total_encaisse':       float(total_encaisse),
            'total_depense':        float(total_depense),
            'solde_global':         float(solde_global),
            'nb_etudiants_actifs':  nb_etudiants_actifs,
            'nb_impayes':           nb_impayes,
        },
        'evolution':        evolution,
        'repartition_modes': repartition_modes,
        'top_caisses':      top_caisses,
        'alertes_budget':   alertes,
        'role':             role,
    }), 200
