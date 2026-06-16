from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
from extensions import db
from models import Paiement, Depense, Caisse, Etudiant, Budget
from datetime import datetime, timedelta
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)

MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
        'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']


def auth_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


def _projection(serie, n=6):
    if len(serie) < 2:
        base = serie[0] if serie else 0
        return [max(0, round(base))] * n
    weights = list(range(1, len(serie) + 1))
    base = sum(v * w for v, w in zip(serie, weights)) / sum(weights)
    trend = (serie[-1] - serie[0]) / max(len(serie) - 1, 1)
    return [max(0, round(base + trend * i)) for i in range(1, n + 1)]


def _pct_evol(n, n1):
    if n1 == 0:
        return None
    return round(((n - n1) / n1) * 100, 1)


@dashboard_bp.route('', methods=['GET'])
@auth_required
def get_dashboard():
    identity  = get_jwt().get('user', {})
    role      = identity.get('role')
    id_caisse = request.args.get('caisse_id', '').strip()

    caisse_filter_p = (Paiement.id_caisse == int(id_caisse)) if id_caisse else True
    caisse_filter_d = (Depense.id_caisse  == int(id_caisse)) if id_caisse else True

    # ── KPIs globaux ──────────────────────────────────────────────────────────
    total_encaisse = db.session.query(
        func.coalesce(func.sum(Paiement.montant), 0)
    ).filter(caisse_filter_p).scalar()

    total_depense = db.session.query(
        func.coalesce(func.sum(Depense.montant), 0)
    ).filter(Depense.statut == 'validee').filter(caisse_filter_d).scalar()

    solde_global = db.session.query(
        func.coalesce(func.sum(Caisse.solde_actuel), 0)
    ).scalar()

    nb_etudiants_actifs = db.session.query(Etudiant).filter_by(statut='actif').count()

    nb_impayes         = 0
    impayes_par_classe = {}
    montant_attendu    = 500000
    if role == 'raf':
        etudiants = db.session.query(Etudiant).filter_by(statut='actif').all()
        for e in etudiants:
            total_paye = sum(float(p.montant) for p in e.paiements)
            if total_paye < montant_attendu:
                nb_impayes += 1
                classe = e.classe or 'Inconnue'
                impayes_par_classe[classe] = impayes_par_classe.get(classe, 0) + 1

    # ── Évolution 6 mois ─────────────────────────────────────────────────────
    evolution = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        mois_date  = now - timedelta(days=i * 30)
        mois_debut = mois_date.replace(day=1, hour=0, minute=0, second=0)
        mois_fin   = (mois_date.replace(year=mois_date.year + 1, month=1, day=1)
                      if mois_date.month == 12
                      else mois_date.replace(month=mois_date.month + 1, day=1))

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

        evolution.append({
            'mois':     MOIS[mois_debut.month - 1],
            'recettes': float(montant_mois),
            'depenses': float(depense_mois),
            'solde':    float(montant_mois) - float(depense_mois),
        })

    # ── Répartition modes de paiement ────────────────────────────────────────
    modes_query = db.session.query(
        Paiement.mode_paiement,
        func.count(Paiement.id_paiement).label('nb'),
        func.sum(Paiement.montant).label('total')
    ).group_by(Paiement.mode_paiement).all()

    repartition_modes = [
        {'mode': m.mode_paiement, 'nb': m.nb, 'total': float(m.total or 0)}
        for m in modes_query
    ]

    # ── Top caisses ───────────────────────────────────────────────────────────
    caisses = db.session.query(Caisse).filter_by(statut='active').all()
    top_caisses = sorted(
        [{'nom': c.nom, 'solde': float(c.solde_actuel), 'type': c.type_caisse} for c in caisses],
        key=lambda x: x['solde'], reverse=True
    )[:5]

    # ── Alertes budgets ───────────────────────────────────────────────────────
    alertes = []
    if role == 'raf':
        budgets = db.session.query(Budget).filter_by(annee=str(now.year)).all()
        for b in budgets:
            taux = (float(b.montant_consomme) / float(b.montant_alloue) * 100
                    if float(b.montant_alloue) > 0 else 0)
            if taux >= 80:
                alertes.append({
                    'categorie': b.categorie,
                    'taux':      round(taux, 1),
                    'type':      'depasse' if taux >= 100 else 'attention',
                })

    # ── Comparaison N vs N-1 ─────────────────────────────────────────────────
    annee_n  = now.year
    annee_n1 = now.year - 1

    recettes_n = float(db.session.query(
        func.coalesce(func.sum(Paiement.montant), 0)
    ).filter(func.extract('year', Paiement.date_paiement) == annee_n
    ).filter(caisse_filter_p).scalar())

    recettes_n1 = float(db.session.query(
        func.coalesce(func.sum(Paiement.montant), 0)
    ).filter(func.extract('year', Paiement.date_paiement) == annee_n1
    ).filter(caisse_filter_p).scalar())

    depenses_n = float(db.session.query(
        func.coalesce(func.sum(Depense.montant), 0)
    ).filter(
        func.extract('year', Depense.date_depense) == annee_n,
        Depense.statut == 'validee'
    ).filter(caisse_filter_d).scalar())

    depenses_n1 = float(db.session.query(
        func.coalesce(func.sum(Depense.montant), 0)
    ).filter(
        func.extract('year', Depense.date_depense) == annee_n1,
        Depense.statut == 'validee'
    ).filter(caisse_filter_d).scalar())

    comparaison = {
        'recettes_n':    recettes_n,
        'recettes_n1':   recettes_n1,
        'depenses_n':    depenses_n,
        'depenses_n1':   depenses_n1,
        'evol_recettes': _pct_evol(recettes_n, recettes_n1),
        'evol_depenses': _pct_evol(depenses_n, depenses_n1),
        'annee_n':       annee_n,
        'annee_n1':      annee_n1,
    }

    # ── Prévisions trésorerie (6 prochains mois) ──────────────────────────────
    proj_r = _projection([e['recettes'] for e in evolution])
    proj_d = _projection([e['depenses'] for e in evolution])
    previsions = []
    for i in range(6):
        mois_futur = now + timedelta(days=(i + 1) * 30)
        previsions.append({
            'mois':             MOIS[mois_futur.month - 1] + ' ▸',
            'recettes_prevues': proj_r[i],
            'depenses_prevues': proj_d[i],
        })

    # ── Alertes intelligentes ─────────────────────────────────────────────────
    alertes_intelligentes = []
    seuil_critique = 500000
    solde_f = float(solde_global)

    if solde_f < seuil_critique:
        alertes_intelligentes.append({
            'niveau':  'danger',
            'message': f"Trésorerie critique : solde global {solde_f:,.0f} FCFA — sous le seuil d'alerte de {seuil_critique:,.0f} FCFA",
        })
    elif solde_f < seuil_critique * 3:
        alertes_intelligentes.append({
            'niveau':  'warning',
            'message': f"Trésorerie basse : solde global {solde_f:,.0f} FCFA",
        })

    if role == 'raf' and impayes_par_classe:
        classe_max = max(impayes_par_classe, key=impayes_par_classe.get)
        nb_max = impayes_par_classe[classe_max]
        if nb_max >= 2:
            alertes_intelligentes.append({
                'niveau':  'warning',
                'message': f"Pic d'impayés : {nb_max} étudiant(s) en {classe_max} n'ont pas atteint le montant attendu",
            })

    return jsonify({
        'kpis': {
            'total_encaisse':      float(total_encaisse),
            'total_depense':       float(total_depense),
            'solde_global':        float(solde_global),
            'nb_etudiants_actifs': nb_etudiants_actifs,
            'nb_impayes':          nb_impayes,
        },
        'evolution':             evolution,
        'repartition_modes':     repartition_modes,
        'top_caisses':           top_caisses,
        'alertes_budget':        alertes,
        'alertes_intelligentes': alertes_intelligentes,
        'comparaison':           comparaison,
        'previsions':            previsions,
        'role':                  role,
    }), 200
