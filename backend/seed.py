"""
Script de peuplement de la base de données FinTrack — ISM Dakar
Usage : python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv()

from app import create_app
from extensions import db, bcrypt
from models import (Utilisateur, Etudiant, Caisse, Paiement,
                    Depense, Budget, Message, Notification, AuditLog)
from datetime import datetime

app = create_app()

def seed():
    with app.app_context():
        db.create_all()
        print("✅ Tables vérifiées\n")

        # ── 1. Nettoyage dans l'ordre des FK ────────────────────────────────
        AuditLog.query.delete()
        Notification.query.delete()
        Message.query.delete()
        Paiement.query.delete()
        Depense.query.delete()
        Budget.query.delete()
        Etudiant.query.delete()
        Caisse.query.delete()
        db.session.commit()
        print("🗑️  Anciennes données supprimées\n")

        # ── 2. Utilisateurs ─────────────────────────────────────────────────
        comptes = [
            dict(nom='Diop',   prenom='Moussa',        email='raf@fintrack.sn',
                 contact='77 000 00 01', role='raf',        mdp='raf123'),
            dict(nom='Faye',   prenom='Ibrahima',      email='raf2@fintrack.sn',
                 contact='77 000 00 05', role='raf',        mdp='raf123'),
            dict(nom='Diallo', prenom='Abdoul Salif',  email='comptable@fintrack.sn',
                 contact='77 000 00 02', role='comptable',  mdp='comptable123'),
            dict(nom='Ndiaye', prenom='Mariama',       email='m.ndiaye@fintrack.sn',
                 contact='77 111 22 33', role='comptable',  mdp='comptable123'),
            dict(nom='Fall',   prenom='Seydou',        email='s.fall@fintrack.sn',
                 contact='77 444 55 66', role='comptable',  mdp='comptable123'),
            dict(nom='Sène',   prenom='Awa',           email='a.sene@fintrack.sn',
                 contact='77 777 88 99', role='comptable',  mdp='comptable123'),
        ]
        for c in comptes:
            if not Utilisateur.query.filter_by(email=c['email']).first():
                u = Utilisateur(
                    nom=c['nom'], prenom=c['prenom'], email=c['email'],
                    contact=c['contact'], role=c['role'],
                    mot_de_passe_hash=bcrypt.generate_password_hash(c['mdp']).decode()
                )
                db.session.add(u)
        db.session.commit()

        raf       = Utilisateur.query.filter_by(email='raf@fintrack.sn').first()
        comptable = Utilisateur.query.filter_by(email='comptable@fintrack.sn').first()
        print(f"✅ {Utilisateur.query.count()} utilisateurs  "
              f"(RAF id={raf.id_utilisateur}, Comptable id={comptable.id_utilisateur})")

        # ── 3. Étudiants ────────────────────────────────────────────────────
        # Filières L1-L3 : GLRS, MIAGE, TTL, MAIE, ETSE, MOSIEF, IA, CS
        # Filières M1-M2 : MBA/DIA, MBI/MSSI, MBA/ABDAQ, MBI/MIRSD, MMP, MMPI
        etudiants_data = [
            ('ISM2026001','Diallo',   'Mamadou',    'm.diallo@ism.edu.sn',   '77 111 11 11','L3','GLRS'),
            ('ISM2026002','Sarr',     'Fatou',      'f.sarr@ism.edu.sn',     '77 222 22 22','L3','MIAGE'),
            ('ISM2026003','Ndiaye',   'Ousmane',    'o.ndiaye@ism.edu.sn',   '77 333 33 33','L2','GLRS'),
            ('ISM2026004','Ba',       'Aminata',    'a.ba@ism.edu.sn',       '77 444 44 44','L1','TTL'),
            ('ISM2026005','Koné',     'Ibrahim',    'i.kone@ism.edu.sn',     '77 555 55 55','L3','MAIE'),
            ('ISM2026006','Traoré',   'Aïssatou',   'a.traore@ism.edu.sn',   '77 666 66 66','L2','ETSE'),
            ('ISM2026007','Camara',   'Lamine',     'l.camara@ism.edu.sn',   '77 777 77 77','L1','GLRS'),
            ('ISM2026008','Sow',      'Mariama',    'm.sow@ism.edu.sn',      '77 888 88 88','M1','MBA/DIA'),
            ('ISM2026009','Mbaye',    'Cheikh',     'c.mbaye@ism.edu.sn',    '77 999 99 99','M1','MBI/MSSI'),
            ('ISM2026010','Diouf',    'Rokhaya',    'r.diouf@ism.edu.sn',    '76 100 10 10','L3','MOSIEF'),
            ('ISM2026011','Gaye',     'Moustapha',  'm.gaye@ism.edu.sn',     '76 110 11 11','L2','IA'),
            ('ISM2026012','Fall',     'Ndèye',      'n.fall@ism.edu.sn',     '76 120 12 12','L1','CS'),
            ('ISM2026013','Diop',     'Amadou',     'a.diop2@ism.edu.sn',    '76 130 13 13','M2','MBA/ABDAQ'),
            ('ISM2026014','Touré',    'Kadiatou',   'k.toure@ism.edu.sn',    '76 140 14 14','L3','GLRS'),
            ('ISM2026015','Balde',    'Ibrahima',   'i.balde@ism.edu.sn',    '76 150 15 15','L2','MIAGE'),
            ('ISM2026016','Cissé',    'Coumba',     'c.cisse@ism.edu.sn',    '76 160 16 16','L1','TTL'),
            ('ISM2026017','Kane',     'Seydou',     's.kane@ism.edu.sn',     '76 170 17 17','M1','MBI/MIRSD'),
            ('ISM2026018','Diagne',   'Fatima',     'f.diagne@ism.edu.sn',   '76 180 18 18','L3','ETSE'),
            ('ISM2026019','Badji',    'Oumar',      'o.badji@ism.edu.sn',    '76 190 19 19','L2','MAIE'),
            ('ISM2026020','Mendy',    'Aïda',       'a.mendy@ism.edu.sn',    '76 200 20 20','L1','CS'),
            ('ISM2026021','Bodian',   'Serigne',    's.bodian@ism.edu.sn',   '76 210 21 21','L3','IA'),
            ('ISM2026022','Dème',     'Sokhna',     's.deme@ism.edu.sn',     '76 220 22 22','M1','MMP'),
            ('ISM2026023','Faye',     'Aliou',      'al.faye@ism.edu.sn',    '76 230 23 23','L2','GLRS'),
            ('ISM2026024','Ndour',    'Mame Diarra', 'm.ndour@ism.edu.sn',   '76 240 24 24','M2','MMPI'),
            ('ISM2026025','Tamba',    'Babacar',    'b.tamba@ism.edu.sn',    '76 250 25 25','L3','MOSIEF'),
            ('ISM2026026','Diallo',   'Boubacar',   'b2.diallo@ism.edu.sn',  '76 260 26 26','L2','MIAGE'),
            ('ISM2026027','Seck',     'Aminata',    'am.seck@ism.edu.sn',    '76 270 27 27','L1','MAIE'),
            ('ISM2026028','Thiaw',    'Modou',      'm.thiaw@ism.edu.sn',    '76 280 28 28','L3','CS'),
            ('ISM2026029','Diatta',   'Marie',      'ma.diatta@ism.edu.sn',  '76 290 29 29','M1','MBA/DIA'),
            ('ISM2026030','Mané',     'Oumar',      'o.mane@ism.edu.sn',     '76 300 30 30','L2','ETSE'),
            ('ISM2026031','Coly',     'Augustin',   'a.coly@ism.edu.sn',     '76 310 31 31','L1','GLRS'),
            ('ISM2026032','Tendeng',  'Rokhaya',    'r.tendeng@ism.edu.sn',  '76 320 32 32','M2','MBI/MSSI'),
            ('ISM2026033','Sané',     'Lamine',     'la.sane@ism.edu.sn',    '76 330 33 33','L3','TTL'),
            ('ISM2026034','Badji',    'Maimouna',   'mai.badji@ism.edu.sn',  '76 340 34 34','M1','MMPI'),
            ('ISM2026035','Sambou',   'Arfang',     'a.sambou@ism.edu.sn',   '76 350 35 35','L2','IA'),
        ]

        etudiants = []
        for mat, nom, prenom, email, contact, classe, filiere in etudiants_data:
            e = Etudiant(
                matricule=mat, nom=nom, prenom=prenom, email=email,
                contact=contact, classe=classe, filiere=filiere,
                annee_academique='2025-2026', statut='actif'
            )
            db.session.add(e)
            etudiants.append(e)
        db.session.commit()
        print(f"✅ {len(etudiants)} étudiants créés")

        # ── 4. Caisses ──────────────────────────────────────────────────────
        caisse_data = [
            ('Caisse Principale',  'principale', 'Caisse principale de l\'établissement',           5000000),
            ('Caisse Scolarité',   'secondaire', 'Frais de scolarité et inscriptions annuelles',    3500000),
            ('Caisse Projets',     'projet',     'Financement des projets et mémoires étudiants',    750000),
            ('Caisse Examens',     'secondaire', 'Frais d\'examens, rattrapages et soutenances',     980000),
            ('Caisse Événements',  'secondaire', 'Cérémonies, sorties pédagogiques et activités',   420000),
        ]
        caisses = []
        for nom, type_c, desc, solde in caisse_data:
            c = Caisse(nom=nom, type_caisse=type_c, description=desc, solde_actuel=solde)
            db.session.add(c)
            caisses.append(c)
        db.session.commit()
        c_princ    = caisses[0]
        c_scol     = caisses[1]
        c_projets  = caisses[2]
        c_examens  = caisses[3]
        c_events   = caisses[4]
        print(f"✅ {len(caisses)} caisses créées")

        # ── 5. Budgets ──────────────────────────────────────────────────────
        # Le budget Formation est intentionnellement dépassé → déclenche une alerte
        budgets_data = [
            ('Fournitures',    500000,  180000),
            ('Salaires',      2000000, 1480000),
            ('Maintenance',    300000,   85000),
            ('Evenements',     400000,  220000),
            ('Informatique',   800000,  350000),
            ('Communication',  200000,   45000),
            ('Formation',      150000,  178500),   # DÉPASSÉ à 119% → alerte critique
        ]
        for cat, alloue, consomme in budgets_data:
            db.session.add(Budget(
                categorie=cat, montant_alloue=alloue,
                montant_consomme=consomme, annee='2026'
            ))
        db.session.commit()
        print(f"✅ {len(budgets_data)} budgets créés (dont 1 dépassé — Formation)")

        # ── 6. Paiements ────────────────────────────────────────────────────
        paiements_planif = [
            # (idx_etudiant, caisse_obj, montant, mode, motif, date)
            # -- Scolarité S1
            (0,  c_scol,    500000,  'especes',  'Frais de scolarité S1',          datetime(2026,1,10)),
            (1,  c_scol,    750000,  'wave',     'Frais de scolarité S1',          datetime(2026,1,12)),
            (2,  c_scol,    500000,  'virement', 'Frais de scolarité S1',          datetime(2026,1,15)),
            (3,  c_scol,    350000,  'especes',  'Frais d\'inscription',           datetime(2026,1,18)),
            (4,  c_scol,    500000,  'cheque',   'Frais de scolarité S1',          datetime(2026,1,20)),
            (5,  c_scol,    350000,  'wave',     'Frais d\'inscription',           datetime(2026,1,22)),
            (6,  c_scol,    250000,  'especes',  'Frais de dossier',               datetime(2026,1,25)),
            (7,  c_scol,   1000000,  'virement', 'Frais de scolarité M1 S1',      datetime(2026,1,28)),
            (8,  c_scol,   1000000,  'cheque',   'Frais de scolarité M1 S1',      datetime(2026,2,3)),
            (9,  c_scol,    750000,  'wave',     'Frais de scolarité S1',          datetime(2026,2,5)),
            (10, c_scol,    500000,  'especes',  'Frais de scolarité S1',          datetime(2026,2,8)),
            (11, c_scol,    350000,  'wave',     'Frais d\'inscription',           datetime(2026,2,10)),
            (12, c_scol,   1500000,  'virement', 'Frais de scolarité M2 S1',      datetime(2026,2,14)),
            (13, c_scol,    750000,  'cheque',   'Frais de scolarité S1',          datetime(2026,2,18)),
            (14, c_scol,    500000,  'especes',  'Frais de scolarité S1',          datetime(2026,2,20)),
            (15, c_scol,    350000,  'wave',     'Frais d\'inscription',           datetime(2026,2,25)),
            # -- Scolarité S2
            (16, c_scol,   1000000,  'virement', 'Frais de scolarité M1 S2',      datetime(2026,3,3)),
            (17, c_scol,    750000,  'especes',  'Frais de scolarité S2',          datetime(2026,3,7)),
            (18, c_scol,    500000,  'wave',     'Frais de scolarité S2',          datetime(2026,3,10)),
            (19, c_scol,    500000,  'cheque',   'Frais de scolarité S2',          datetime(2026,3,14)),
            (20, c_scol,    750000,  'especes',  'Frais de scolarité S2',          datetime(2026,3,18)),
            (21, c_scol,    500000,  'virement', 'Frais de scolarité S2',          datetime(2026,3,22)),
            (22, c_scol,    350000,  'wave',     'Frais d\'inscription S2',        datetime(2026,3,25)),
            (23, c_scol,   1500000,  'cheque',   'Frais de scolarité M2 S2',      datetime(2026,4,2)),
            (24, c_scol,    750000,  'especes',  'Frais de scolarité S2',          datetime(2026,4,5)),
            # -- Examens (Caisse Examens)
            (0,  c_examens, 55000,   'especes',  'Frais d\'examen S1',             datetime(2026,4,10)),
            (2,  c_examens, 55000,   'wave',     'Frais d\'examen S1',             datetime(2026,4,12)),
            (4,  c_examens, 55000,   'especes',  'Frais d\'examen S1',             datetime(2026,4,14)),
            (1,  c_examens, 55000,   'especes',  'Frais d\'examen S2',             datetime(2026,5,10)),
            (9,  c_examens, 55000,   'wave',     'Frais d\'examen S2',             datetime(2026,5,15)),
            (10, c_examens, 80000,   'cheque',   'Frais de rattrapage',            datetime(2026,5,20)),
            # -- Projets / mémoires (Caisse Projets)
            (7,  c_projets, 150000,  'virement', 'Contribution projet fin études', datetime(2026,4,18)),
            (8,  c_projets, 150000,  'virement', 'Contribution projet fin études', datetime(2026,4,20)),
            (12, c_projets, 200000,  'cheque',   'Contribution mémoire M2',        datetime(2026,5,3)),
            (23, c_projets, 200000,  'virement', 'Contribution mémoire M2',        datetime(2026,5,5)),
            # -- Événements (Caisse Événements)
            (13, c_events,  25000,   'especes',  'Participation journée innovation',datetime(2026,3,28)),
            (14, c_events,  25000,   'especes',  'Participation journée innovation',datetime(2026,3,28)),
            (15, c_events,  25000,   'wave',     'Participation journée innovation',datetime(2026,3,29)),
            (16, c_events,  35000,   'virement', 'Frais sortie pédagogique',       datetime(2026,4,30)),
        ]

        for i_p, (idx, caisse_obj, montant, mode, motif, date) in enumerate(paiements_planif):
            ref = f"PAY2026{i_p+1:04d}"
            p = Paiement(
                id_etudiant=etudiants[idx].id_etudiant,
                id_caisse=caisse_obj.id_caisse,
                montant=montant, mode_paiement=mode,
                motif=motif, reference=ref, date_paiement=date
            )
            db.session.add(p)
        db.session.commit()
        print(f"✅ {Paiement.query.count()} paiements créés")

        # ── 7. Dépenses ─────────────────────────────────────────────────────
        depenses_data = [
            (c_princ,    45000,  'Achat ramettes de papier A4',                   'Fournitures',   'validee',    datetime(2026,1,20)),
            (c_princ,    85000,  'Cartouches d\'encre pour imprimantes',           'Fournitures',   'validee',    datetime(2026,2,5)),
            (c_princ,   120000,  'Maintenance climatiseurs salles de cours',       'Maintenance',   'validee',    datetime(2026,2,18)),
            (c_scol,    200000,  'Salaire agent de sécurité — janvier',            'Salaires',      'validee',    datetime(2026,1,31)),
            (c_scol,    350000,  'Salaire personnel administratif — janvier',      'Salaires',      'validee',    datetime(2026,1,31)),
            (c_scol,    200000,  'Salaire agent de sécurité — février',            'Salaires',      'validee',    datetime(2026,2,28)),
            (c_scol,    350000,  'Salaire personnel administratif — février',      'Salaires',      'validee',    datetime(2026,2,28)),
            (c_events,   75000,  'Organisation journée portes ouvertes ISM',       'Evenements',    'validee',    datetime(2026,3,3)),
            (c_projets, 180000,  'Achat matériel informatique — salle TP',         'Informatique',  'validee',    datetime(2026,3,10)),
            (c_princ,    60000,  'Frais de communication téléphonique',            'Communication', 'validee',    datetime(2026,3,22)),
            (c_scol,    200000,  'Salaire agent de sécurité — mars',               'Salaires',      'validee',    datetime(2026,3,31)),
            (c_scol,    350000,  'Salaire personnel administratif — mars',         'Salaires',      'validee',    datetime(2026,3,31)),
            (c_princ,    50000,  'Achat fournitures bureau direction',              'Fournitures',   'validee',    datetime(2026,4,8)),
            (c_projets, 170000,  'Achat licences logiciels pédagogiques',          'Informatique',  'validee',    datetime(2026,4,15)),
            (c_events,  145000,  'Organisation cérémonie — journée innovation',    'Evenements',    'validee',    datetime(2026,4,22)),
            (c_scol,    200000,  'Salaire agent de sécurité — avril',              'Salaires',      'validee',    datetime(2026,4,30)),
            (c_scol,    350000,  'Salaire personnel administratif — avril',        'Salaires',      'validee',    datetime(2026,4,30)),
            (c_princ,    30000,  'Frais internet et connexion',                    'Communication', 'validee',    datetime(2026,5,6)),
            (c_examens,  42000,  'Impression sujets d\'examens — session juin',    'Fournitures',   'validee',    datetime(2026,5,20)),
            (c_princ,    78500,  'Formation continue — outils pédagogiques',       'Formation',     'validee',    datetime(2026,4,3)),
            (c_princ,   100000,  'Formation séminaire management académique',      'Formation',     'validee',    datetime(2026,5,12)),
            # En attente
            (c_princ,    95000,  'Réparation système de vidéosurveillance',        'Maintenance',   'en_attente', datetime(2026,5,28)),
            (c_events,  150000,  'Organisation cérémonie remise de diplômes',      'Evenements',    'en_attente', datetime(2026,6,2)),
            (c_princ,    35000,  'Achat fournitures bureau secrétariat',           'Fournitures',   'en_attente', datetime(2026,6,5)),
            (c_scol,    110000,  'Nettoyage et entretien des locaux',              'Maintenance',   'en_attente', datetime(2026,6,7)),
        ]

        for caisse_obj, montant, motif, categorie, statut, date in depenses_data:
            db.session.add(Depense(
                id_caisse=caisse_obj.id_caisse, montant=montant, motif=motif,
                categorie=categorie, statut=statut, date_depense=date
            ))
        db.session.commit()
        print(f"✅ {len(depenses_data)} dépenses créées "
              f"({sum(1 for d in depenses_data if d[4]=='validee')} validées, "
              f"{sum(1 for d in depenses_data if d[4]=='en_attente')} en attente)")

        # ── 8. Messages ─────────────────────────────────────────────────────
        messages = [
            (raf.id_utilisateur, comptable.id_utilisateur,
             'Rapport mensuel mai 2026',
             'Bonjour, veuillez préparer le rapport mensuel de mai 2026 avec le détail des encaissements et des dépenses validées. Merci.',
             True, datetime(2026,6,1,9,30)),
            (comptable.id_utilisateur, raf.id_utilisateur,
             'RE: Rapport mensuel mai 2026',
             'Bonjour, le rapport de mai est prêt. Total encaissé : 8 750 000 FCFA. '
             'Total dépensé : 1 145 000 FCFA. Solde net : 7 605 000 FCFA.',
             True, datetime(2026,6,1,14,15)),
            (raf.id_utilisateur, comptable.id_utilisateur,
             'Validation dépenses en attente',
             'Merci de vérifier les 4 dépenses en attente de validation et de me soumettre '
             'vos remarques avant vendredi 13 juin.',
             True, datetime(2026,6,3,10,0)),
            (comptable.id_utilisateur, raf.id_utilisateur,
             'Étudiant ISM2026013 — Solde impayé S2',
             'Bonjour, l\'étudiant Amadou Diop (ISM2026013) n\'a pas encore réglé ses frais '
             'de scolarité du second semestre (1 500 000 FCFA). Faut-il envoyer une relance ?',
             False, datetime(2026,6,8,11,45)),
            (raf.id_utilisateur, comptable.id_utilisateur,
             'Clôture exercice académique 2025-2026',
             'La clôture de l\'exercice 2025-2026 est prévue pour le 30 juin. '
             'Préparez les états financiers complets et assurez-vous que tous les impayés '
             'sont traités avant cette date.',
             False, datetime(2026,6,9,8,0)),
            (comptable.id_utilisateur, raf.id_utilisateur,
             'Problème reçu paiement PAY-00012',
             'Le reçu du paiement PAY-00012 (Cheikh Mbaye) affiche un montant incorrect. '
             'Pouvez-vous vérifier dans le système ?',
             False, datetime(2026,6,9,16,30)),
        ]

        for exp, dest, objet, contenu, lu, date in messages:
            db.session.add(Message(
                id_expediteur=exp, id_destinataire=dest,
                objet=objet, contenu=contenu, lu=lu, date_envoi=date
            ))
        db.session.commit()
        print(f"✅ {len(messages)} messages créés")

        # ── 9. Notifications ────────────────────────────────────────────────
        notifs = [
            # RAF
            (raf.id_utilisateur, 'impaye',   'critique', False,
             '4 étudiants n\'ont pas réglé leurs frais de scolarité S2 — action requise'),
            (raf.id_utilisateur, 'depense',  'haute',    False,
             '4 dépenses en attente de validation pour un total de 390 000 FCFA'),
            (raf.id_utilisateur, 'budget',   'haute',    False,
             'Budget "Salaires" consommé à 74% — 520 000 FCFA restants'),
            (raf.id_utilisateur, 'paiement', 'normale',  False,
             'Nouveau paiement de 750 000 FCFA — Cheikh Mbaye (ISM2026009)'),
            (raf.id_utilisateur, 'message',  'haute',    False,
             'Nouveau message de Abdoul Salif Diallo : Étudiant ISM2026013 — Solde impayé S2'),
            (raf.id_utilisateur, 'paiement', 'normale',  True,
             'Paiement de 1 500 000 FCFA enregistré — Mame Diarra Ndour (ISM2026024)'),
            (raf.id_utilisateur, 'budget',   'critique', True,
             'Budget "Evenements" consommé à 55% — 180 000 FCFA restants'),
            (raf.id_utilisateur, 'paiement', 'normale',  True,
             'Paiement de 500 000 FCFA enregistré — Mamadou Diallo (ISM2026001)'),
            # Comptable
            (comptable.id_utilisateur, 'paiement', 'normale', False,
             'Nouveau paiement Mobile Money 350 000 FCFA — Fatou Sarr (ISM2026002)'),
            (comptable.id_utilisateur, 'message',  'haute',   False,
             'Nouveau message du RAF : Clôture exercice académique 2025-2026'),
            (comptable.id_utilisateur, 'impaye',   'critique', False,
             'Rappel : 4 étudiants avec solde impayé à régulariser avant le 30 juin'),
            (comptable.id_utilisateur, 'depense',  'haute',   True,
             'Votre dépense de 110 000 FCFA (Maintenance) est en attente de validation'),
            (comptable.id_utilisateur, 'paiement', 'normale', True,
             'Paiement de 200 000 FCFA enregistré — Babacar Tamba (ISM2026025)'),
        ]

        for user_id, type_n, priorite, lu, message in notifs:
            db.session.add(Notification(
                id_utilisateur=user_id, type=type_n,
                message=message, lu=lu, priorite=priorite
            ))
        db.session.commit()
        print(f"✅ {len(notifs)} notifications créées")

        # ── 10. Audit logs ──────────────────────────────────────────────────
        audits = [
            (raf.id_utilisateur,       'CONNEXION',  'auth',     None, 'Connexion réussie depuis 127.0.0.1'),
            (comptable.id_utilisateur, 'CONNEXION',  'auth',     None, 'Connexion réussie depuis 127.0.0.1'),
            (comptable.id_utilisateur, 'CREATION',   'paiement', 1,    'Paiement 500 000 FCFA — ISM2026001 Mamadou Diallo'),
            (comptable.id_utilisateur, 'CREATION',   'paiement', 2,    'Paiement 750 000 FCFA — ISM2026002 Fatou Sarr'),
            (raf.id_utilisateur,       'VALIDATION', 'depense',  1,    'Validation dépense Fournitures 45 000 FCFA'),
            (raf.id_utilisateur,       'VALIDATION', 'depense',  2,    'Validation dépense Fournitures 85 000 FCFA'),
            (raf.id_utilisateur,       'CREATION',   'etudiant', None, 'Import de 35 étudiants — promotion 2025-2026'),
            (raf.id_utilisateur,       'GENERATION', 'rapport',  None, 'Génération rapport mensuel — mai 2026'),
            (comptable.id_utilisateur, 'CREATION',   'paiement', 8,    'Paiement 1 000 000 FCFA — ISM2026008 Mariama Sow'),
            (raf.id_utilisateur,       'MODIFICATION','caisse',  1,    'Mise à jour solde Caisse Principale'),
        ]

        for user_id, action, entite, id_entite, details in audits:
            db.session.add(AuditLog(
                id_utilisateur=user_id, action=action, entite=entite,
                id_entite=id_entite, details=details
            ))
        db.session.commit()
        print(f"✅ {len(audits)} entrées d'audit créées")

        # ── Résumé ──────────────────────────────────────────────────────────
        print("\n" + "═" * 50)
        print("🎉  Base de données peuplée avec succès !")
        print("═" * 50)
        print(f"  👥 Utilisateurs  : {Utilisateur.query.count()}")
        print(f"  🎓 Étudiants     : {Etudiant.query.count()}")
        print(f"  🏦 Caisses       : {Caisse.query.count()}")
        print(f"  📋 Budgets       : {Budget.query.count()}")
        print(f"  💳 Paiements     : {Paiement.query.count()}")
        print(f"  💸 Dépenses      : {Depense.query.count()}")
        print(f"  💬 Messages      : {Message.query.count()}")
        print(f"  🔔 Notifications : {Notification.query.count()}")
        print(f"  🔍 Audit logs    : {AuditLog.query.count()}")
        print("═" * 50)
        print("\n  RAF       → raf@fintrack.sn       / raf123")
        print("  Comptable → comptable@fintrack.sn  / comptable123\n")

if __name__ == '__main__':
    seed()
