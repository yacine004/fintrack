"""
Script de peuplement — ajoute des étudiants si le matricule n'existe pas déjà.
Lancer : python seed_data.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db, bcrypt
from models import Etudiant, Caisse, Paiement, Utilisateur
from datetime import datetime, timedelta
import random

app = create_app()

ETUDIANTS = [
    # ── L1 GLRS ────────────────────────────────────────────────────────────────
    ('ISM2026010', 'Diop',     'Cheikh',      'c.diop@ism.edu.sn',      '77 100 10 10', 'L1', 'GLRS'),
    ('ISM2026011', 'Fall',     'Rokhaya',     'r.fall@ism.edu.sn',      '77 100 10 11', 'L1', 'GLRS'),
    ('ISM2026012', 'Mbaye',    'Ibrahima',    'i.mbaye@ism.edu.sn',     '77 100 10 12', 'L1', 'GLRS'),
    ('ISM2026013', 'Gueye',    'Ndèye',       'n.gueye@ism.edu.sn',     '77 100 10 13', 'L1', 'GLRS'),
    ('ISM2026014', 'Thiam',    'Seydou',      's.thiam@ism.edu.sn',     '77 100 10 14', 'L1', 'GLRS'),
    ('ISM2026015', 'Cissé',    'Mariama',     'ma.cisse@ism.edu.sn',    '77 100 10 15', 'L1', 'GLRS'),
    ('ISM2026016', 'Sow',      'Abdoulaye',   'ab.sow@ism.edu.sn',      '77 100 10 16', 'L1', 'GLRS'),
    ('ISM2026017', 'Camara',   'Aïssatou',    'ai.camara@ism.edu.sn',   '77 100 10 17', 'L1', 'GLRS'),
    ('ISM2026018', 'Traoré',   'Moustapha',   'mo.traore@ism.edu.sn',   '77 100 10 18', 'L1', 'GLRS'),
    ('ISM2026019', 'Coulibaly','Fatoumata',   'fa.coulibaly@ism.edu.sn','77 100 10 19', 'L1', 'GLRS'),

    # ── L1 CDSD ────────────────────────────────────────────────────────────────
    ('ISM2026020', 'Niang',    'Pape',        'pa.niang@ism.edu.sn',    '77 100 20 20', 'L1', 'CDSD'),
    ('ISM2026021', 'Badji',    'Coumba',      'co.badji@ism.edu.sn',    '77 100 20 21', 'L1', 'CDSD'),
    ('ISM2026022', 'Diouf',    'Lamine',      'la.diouf@ism.edu.sn',    '77 100 20 22', 'L1', 'CDSD'),
    ('ISM2026023', 'Faye',     'Ndéye Astou', 'na.faye@ism.edu.sn',     '77 100 20 23', 'L1', 'CDSD'),
    ('ISM2026024', 'Mendy',    'Alphonse',    'al.mendy@ism.edu.sn',    '77 100 20 24', 'L1', 'CDSD'),
    ('ISM2026025', 'Diatta',   'Khady',       'kh.diatta@ism.edu.sn',   '77 100 20 25', 'L1', 'CDSD'),
    ('ISM2026026', 'Sylla',    'Oumar',       'ou.sylla@ism.edu.sn',    '77 100 20 26', 'L1', 'CDSD'),
    ('ISM2026027', 'Balde',    'Kadiatou',    'ka.balde@ism.edu.sn',    '77 100 20 27', 'L1', 'CDSD'),

    # ── L2 GLRS ────────────────────────────────────────────────────────────────
    ('ISM2025030', 'Touré',    'Mamadou Lamine','ml.toure@ism.edu.sn',  '77 200 30 30', 'L2', 'GLRS'),
    ('ISM2025031', 'Mbodj',    'Aminata',     'am.mbodj@ism.edu.sn',    '77 200 30 31', 'L2', 'GLRS'),
    ('ISM2025032', 'Sarr',     'El Hadji',    'eh.sarr@ism.edu.sn',     '77 200 30 32', 'L2', 'GLRS'),
    ('ISM2025033', 'Diallo',   'Binta',       'bi.diallo@ism.edu.sn',   '77 200 30 33', 'L2', 'GLRS'),
    ('ISM2025034', 'Ndiaye',   'Serigne',     'se.ndiaye@ism.edu.sn',   '77 200 30 34', 'L2', 'GLRS'),
    ('ISM2025035', 'Kane',     'Marième',     'ma.kane@ism.edu.sn',     '77 200 30 35', 'L2', 'GLRS'),
    ('ISM2025036', 'Dia',      'Bassirou',    'ba.dia@ism.edu.sn',      '77 200 30 36', 'L2', 'GLRS'),
    ('ISM2025037', 'Sané',     'Sophie',      'so.sane@ism.edu.sn',     '77 200 30 37', 'L2', 'GLRS'),
    ('ISM2025038', 'Barry',    'Ibrahima',    'ib.barry@ism.edu.sn',    '77 200 30 38', 'L2', 'GLRS'),

    # ── L2 CDSD ────────────────────────────────────────────────────────────────
    ('ISM2025040', 'Diakhaté', 'Mame Diarra', 'md.diakhate@ism.edu.sn', '77 200 40 40', 'L2', 'CDSD'),
    ('ISM2025041', 'Gomis',    'Christian',   'ch.gomis@ism.edu.sn',    '77 200 40 41', 'L2', 'CDSD'),
    ('ISM2025042', 'Coly',     'Adja',        'ad.coly@ism.edu.sn',     '77 200 40 42', 'L2', 'CDSD'),
    ('ISM2025043', 'Sambou',   'Julien',      'ju.sambou@ism.edu.sn',   '77 200 40 43', 'L2', 'CDSD'),
    ('ISM2025044', 'Dieme',    'Rokhaya',     'ro.dieme@ism.edu.sn',    '77 200 40 44', 'L2', 'CDSD'),
    ('ISM2025045', 'Bassène',  'Thomas',      'th.bassene@ism.edu.sn',  '77 200 40 45', 'L2', 'CDSD'),
    ('ISM2025046', 'Sagna',    'Marie',       'ma.sagna@ism.edu.sn',    '77 200 40 46', 'L2', 'CDSD'),

    # ── L3 GLRS ────────────────────────────────────────────────────────────────
    ('ISM2024050', 'Gassama',  'Alassane',    'al.gassama@ism.edu.sn',  '77 300 50 50', 'L3', 'GLRS'),
    ('ISM2024051', 'Mballo',   'Ndèye Khady', 'nk.mballo@ism.edu.sn',   '77 300 50 51', 'L3', 'GLRS'),
    ('ISM2024052', 'Dème',     'Cheikh Tidiane','ct.deme@ism.edu.sn',   '77 300 50 52', 'L3', 'GLRS'),
    ('ISM2024053', 'Seck',     'Awa',         'aw.seck@ism.edu.sn',     '77 300 50 53', 'L3', 'GLRS'),
    ('ISM2024054', 'Thiongane','Modou',        'mo.thiongane@ism.edu.sn','77 300 50 54', 'L3', 'GLRS'),
    ('ISM2024055', 'Fofana',   'Hawa',        'ha.fofana@ism.edu.sn',   '77 300 50 55', 'L3', 'GLRS'),
    ('ISM2024056', 'Diène',    'Pap',         'pa.diene@ism.edu.sn',    '77 300 50 56', 'L3', 'GLRS'),

    # ── L3 CDSD ────────────────────────────────────────────────────────────────
    ('ISM2024060', 'Manga',    'Elisabeth',   'el.manga@ism.edu.sn',    '77 300 60 60', 'L3', 'CDSD'),
    ('ISM2024061', 'Cissokho', 'Souleymane',  'so.cissokho@ism.edu.sn', '77 300 60 61', 'L3', 'CDSD'),
    ('ISM2024062', 'Tendeng',  'Aida',        'ai.tendeng@ism.edu.sn',  '77 300 60 62', 'L3', 'CDSD'),
    ('ISM2024063', 'Diouf',    'Serigne Mor', 'sm.diouf@ism.edu.sn',    '77 300 60 63', 'L3', 'CDSD'),
    ('ISM2024064', 'Badiane',  'Léontine',    'le.badiane@ism.edu.sn',  '77 300 60 64', 'L3', 'CDSD'),
    ('ISM2024065', 'Ngom',     'Abdou Khadre','ak.ngom@ism.edu.sn',     '77 300 60 65', 'L3', 'CDSD'),
]

MOTIFS = [
    'Frais de scolarité Semestre 1',
    'Frais de scolarité Semestre 2',
    'Frais d\'inscription',
    'Frais de stage',
    'Frais de soutenance',
    'Frais de bibliothèque',
    'Frais de TP',
    'Frais d\'examen de rattrapage',
]

MODES = ['especes', 'virement', 'wave', 'cheque']


def seed():
    with app.app_context():
        # ── Étudiants ────────────────────────────────────────────────────────
        existants = {e.matricule for e in Etudiant.query.all()}
        nouveaux = []
        for (mat, nom, prenom, email, contact, classe, filiere) in ETUDIANTS:
            if mat not in existants:
                nouveaux.append(Etudiant(
                    matricule=mat, nom=nom, prenom=prenom,
                    email=email, contact=contact,
                    classe=classe, filiere=filiere,
                    annee_academique='2025-2026', statut='actif'
                ))

        if nouveaux:
            db.session.add_all(nouveaux)
            db.session.commit()
            print(f'[OK] {len(nouveaux)} etudiants ajoutes')
        else:
            print('[INFO] Tous les etudiants existent deja')

        # ── Paiements de démonstration ────────────────────────────────────────
        if Paiement.query.count() < 10:
            caisses = Caisse.query.filter_by(statut='active').all()
            etudiants = Etudiant.query.all()
            if caisses and etudiants:
                paiements = []
                base_date = datetime(2026, 1, 15)
                for i, etudiant in enumerate(etudiants[:40]):
                    caisse = caisses[i % len(caisses)]
                    montant = random.choice([150000, 175000, 200000, 125000, 250000])
                    date = base_date + timedelta(days=random.randint(0, 140))
                    paiements.append(Paiement(
                        id_etudiant=etudiant.id_etudiant,
                        id_caisse=caisse.id_caisse,
                        montant=montant,
                        mode_paiement=random.choice(MODES),
                        motif=random.choice(MOTIFS),
                        date_paiement=date,
                    ))
                    caisse.solde_actuel = float(caisse.solde_actuel) + montant

                db.session.add_all(paiements)
                db.session.commit()
                print(f'[OK] {len(paiements)} paiements de demonstration ajoutes')
        else:
            print('[INFO] Paiements deja presents')

        # ── Résumé ────────────────────────────────────────────────────────────
        print('\n--- Etat de la base ---')
        print(f'  Utilisateurs : {Utilisateur.query.count()}')
        print(f'  Etudiants    : {Etudiant.query.count()}')
        print(f'  Caisses      : {Caisse.query.count()}')
        print(f'  Paiements    : {Paiement.query.count()}')
        for c in Caisse.query.all():
            print(f'  {c.nom} -> {float(c.solde_actuel):,.0f} FCFA')


if __name__ == '__main__':
    seed()
