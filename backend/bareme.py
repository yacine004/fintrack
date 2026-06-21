# -*- coding: utf-8 -*-
"""
Calcul de l'échéancier de paiement (barème ISM) à partir des lignes
configurées en base (LigneEcheancier), pour un niveau et une année scolaire
donnés. Point d'entrée unique utilisé par alertes.py, etudiants.py,
routes/echeancier.py et dashboard.py — élimine la duplication qui existait
auparavant (barème codé en dur à 3 endroits différents).
"""
from extensions import db
from models import LigneEcheancier, AnneeScolaire
from datetime import date

NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2']


def get_niveau(classe):
    c = (classe or '').upper()
    if 'M2' in c: return 'M2'
    if 'M1' in c: return 'M1'
    if 'L3' in c: return 'L3'
    if 'L2' in c: return 'L2'
    return 'L1'


def calculer_echeancier(niveau, annee_scolaire):
    """Retourne une liste de tuples (date, montant, label) pour ce niveau,
    sur cette année scolaire (objet AnneeScolaire). Liste vide si aucune
    ligne n'est configurée (ex: année scolaire inconnue ou barème non saisi)."""
    if not annee_scolaire:
        return []
    debut = annee_scolaire.date_debut.year
    fin   = debut + 1

    lignes = db.session.query(LigneEcheancier).filter_by(
        id_annee=annee_scolaire.id, niveau=niveau
    ).order_by(LigneEcheancier.ordre).all()

    items = []
    for l in lignes:
        annee_cible = fin if l.decalage_annee else debut
        items.append((date(annee_cible, l.mois, l.jour), float(l.montant), l.label))
    return items


def echeancier_par_annee_libelle(niveau, annee_libelle):
    """Variante pratique acceptant un libellé '2025-2026' au lieu d'un objet AnneeScolaire."""
    annee_scolaire = db.session.query(AnneeScolaire).filter_by(libelle=annee_libelle).first()
    return calculer_echeancier(niveau, annee_scolaire)


def seed_bareme_defaut(id_annee):
    """Insère le barème ISM standard pour une année scolaire donnée
    (utilisé pour amorcer une nouvelle année ou migrer l'ancien barème codé
    en dur). N'écrase rien : à appeler seulement si aucune ligne n'existe
    déjà pour cette année."""
    lignes = []

    def di_licence():
        return [
            (9, 5, 0, "Tranche 1/4 — Droits d'inscription"),
            (10, 5, 0, "Tranche 2/4 — Droits d'inscription"),
            (2, 5, 1, "Tranche 3/4 — Droits d'inscription"),
            (3, 5, 1, "Tranche 4/4 — Droits d'inscription"),
        ]

    def di_master():
        return [
            (10, 5, 0, "Tranche 1/4 — Droits d'inscription"),
            (11, 5, 0, "Tranche 2/4 — Droits d'inscription"),
            (3, 5, 1, "Tranche 3/4 — Droits d'inscription"),
            (4, 5, 1, "Tranche 4/4 — Droits d'inscription"),
        ]

    MOIS_SCOLARITE = [
        (9, 0, 'Septembre'), (10, 0, 'Octobre'), (11, 0, 'Novembre'), (12, 0, 'Décembre'),
        (1, 1, 'Janvier'), (2, 1, 'Février'), (3, 1, 'Mars'), (4, 1, 'Avril'),
        (5, 1, 'Mai'), (6, 1, 'Juin'),
    ]

    # Frais d'encadrement et de soutenance de mémoire : 25 000 FCFA, L3 (mars) et M2 (mai) uniquement
    ENCADREMENT = {'L3': (3, 25000), 'M2': (5, 25000)}

    for niveau in NIVEAUX:
        is_master = niveau in ('M1', 'M2')
        frais_mensuel = 100000 if niveau == 'M1' else 97500 if niveau == 'M2' else 92500 if niveau == 'L3' else 95000
        ordre = 0

        for mois, jour, decalage, label in (di_master() if is_master else di_licence()):
            lignes.append(LigneEcheancier(
                id_annee=id_annee, niveau=niveau, type_ligne='inscription',
                label=label, mois=mois, jour=jour, decalage_annee=decalage,
                montant=112500, ordre=ordre,
            ))
            ordre += 1

        for mois, decalage, nom_mois in MOIS_SCOLARITE:
            lignes.append(LigneEcheancier(
                id_annee=id_annee, niveau=niveau, type_ligne='scolarite',
                label=f'Mensualité — {nom_mois}', mois=mois, jour=5, decalage_annee=decalage,
                montant=frais_mensuel, ordre=ordre,
            ))
            ordre += 1

        if niveau in ENCADREMENT:
            mois_enc, montant_enc = ENCADREMENT[niveau]
            lignes.append(LigneEcheancier(
                id_annee=id_annee, niveau=niveau, type_ligne='encadrement',
                label="Frais d'encadrement et de soutenance",
                mois=mois_enc, jour=5, decalage_annee=1, montant=montant_enc, ordre=ordre,
            ))

    db.session.add_all(lignes)
    db.session.commit()
    return len(lignes)
