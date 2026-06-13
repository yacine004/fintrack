"""Point d'entree WSGI pour gunicorn."""
from app import create_app
from extensions import db, bcrypt
from datetime import datetime, date

app = create_app()

with app.app_context():
    db.create_all()
    print("✅ Tables créées sur Render")

    from models import Utilisateur, Etudiant, Caisse, Paiement, Depense, Budget, Notification, Message, AuditLog

    if db.session.query(Utilisateur).count() == 0:

        # ── Utilisateurs ──────────────────────────────
        raf = Utilisateur(
            nom='Diop', prenom='Moussa',
            email='raf@fintrack.sn',
            mot_de_passe_hash=bcrypt.generate_password_hash('raf123').decode(),
            role='raf', actif=True, contact='77 100 00 01'
        )
        comptable = Utilisateur(
            nom='Diallo', prenom='Abdoul Salif',
            email='comptable@fintrack.sn',
            mot_de_passe_hash=bcrypt.generate_password_hash('comptable123').decode(),
            role='comptable', actif=True, contact='77 100 00 02'
        )
        db.session.add_all([raf, comptable])
        db.session.commit()
        print("✅ Comptes créés")

        # ── Caisses ───────────────────────────────────
        c1 = Caisse(nom='Caisse Principale', type_caisse='principale',
                    description='Caisse principale ISM', solde_actuel=5000000.00, statut='actif')
        c2 = Caisse(nom='Caisse Scolarité', type_caisse='secondaire',
                    description='Frais de scolarité', solde_actuel=2500000.00, statut='actif')
        c3 = Caisse(nom='Caisse Projets', type_caisse='projet',
                    description='Projets étudiants', solde_actuel=750000.00, statut='actif')
        db.session.add_all([c1, c2, c3])
        db.session.commit()
        print("✅ Caisses créées")

        # ── Étudiants ─────────────────────────────────
        etudiants = [
            Etudiant(matricule='ISM2026001', nom='Diallo', prenom='Mamadou',
                     email='m.diallo@ism.edu.sn', contact='77 111 11 11',
                     classe='L3', filiere='GLRS', annee_academique='2025-2026', statut='actif'),
            Etudiant(matricule='ISM2026002', nom='Sarr', prenom='Fatou',
                     email='f.sarr@ism.edu.sn', contact='77 222 22 22',
                     classe='L3', filiere='CDSD', annee_academique='2025-2026', statut='actif'),
            Etudiant(matricule='ISM2026003', nom='Ndiaye', prenom='Ousmane',
                     email='o.ndiaye@ism.edu.sn', contact='77 333 33 33',
                     classe='L2', filiere='GLRS', annee_academique='2025-2026', statut='actif'),
            Etudiant(matricule='ISM2026004', nom='Ba', prenom='Aminata',
                     email='a.ba@ism.edu.sn', contact='77 444 44 44',
                     classe='L1', filiere='CDSD', annee_academique='2025-2026', statut='actif'),
            Etudiant(matricule='ISM2026005', nom='Kone', prenom='Ibrahim',
                     email='i.kone@ism.edu.sn', contact='77 555 55 55',
                     classe='L3', filiere='GLRS', annee_academique='2025-2026', statut='actif'),
            Etudiant(matricule='ISM2026006', nom='Fall', prenom='Marieme',
                     email='m.fall@ism.edu.sn', contact='77 666 66 66',
                     classe='L2', filiere='GLRS', annee_academique='2025-2026', statut='actif'),
        ]
        db.session.add_all(etudiants)
        db.session.commit()
        print("✅ Étudiants créés")

        # ── Budgets ───────────────────────────────────
        budgets = [
            Budget(categorie='Fournitures', montant_alloue=500000, annee='2026',
                   description='Fournitures de bureau'),
            Budget(categorie='Salaires', montant_alloue=2000000, annee='2026',
                   description='Salaires du personnel'),
            Budget(categorie='Maintenance', montant_alloue=300000, annee='2026',
                   description='Maintenance des équipements'),
            Budget(categorie='Evenements', montant_alloue=400000, annee='2026',
                   description='Événements et cérémonies'),
            Budget(categorie='Informatique', montant_alloue=800000, annee='2026',
                   description='Matériel informatique'),
        ]
        db.session.add_all(budgets)
        db.session.commit()
        print("✅ Budgets créés")

        # ── Paiements ─────────────────────────────────
        paiements = [
            Paiement(id_etudiant=etudiants[0].id, id_caisse=c1.id,
                     montant=250000, mode_paiement='especes',
                     type_frais='scolarite', enregistre_par=comptable.id,
                     date_paiement=datetime(2026, 1, 15)),
            Paiement(id_etudiant=etudiants[1].id, id_caisse=c2.id,
                     montant=300000, mode_paiement='wave',
                     type_frais='scolarite', enregistre_par=comptable.id,
                     date_paiement=datetime(2026, 2, 10)),
            Paiement(id_etudiant=etudiants[2].id, id_caisse=c1.id,
                     montant=150000, mode_paiement='orange_money',
                     type_frais='inscription', enregistre_par=comptable.id,
                     date_paiement=datetime(2026, 3, 5)),
            Paiement(id_etudiant=etudiants[3].id, id_caisse=c2.id,
                     montant=200000, mode_paiement='especes',
                     type_frais='scolarite', enregistre_par=comptable.id,
                     date_paiement=datetime(2026, 4, 20)),
            Paiement(id_etudiant=etudiants[4].id, id_caisse=c1.id,
                     montant=350000, mode_paiement='virement',
                     type_frais='scolarite', enregistre_par=comptable.id,
                     date_paiement=datetime(2026, 5, 8)),
            Paiement(id_etudiant=etudiants[5].id, id_caisse=c2.id,
                     montant=180000, mode_paiement='wave',
                     type_frais='soutenance', enregistre_par=comptable.id,
                     date_paiement=datetime(2026, 6, 1)),
        ]
        db.session.add_all(paiements)
        db.session.commit()
        print("✅ Paiements créés")

        # ── Dépenses ──────────────────────────────────
        depenses = [
            Depense(id_caisse=c1.id, libelle='Achat fournitures bureau',
                    montant=85000, categorie='Fournitures', statut='validee',
                    enregistre_par=comptable.id, valide_par=raf.id,
                    date_depense=datetime(2026, 1, 20)),
            Depense(id_caisse=c1.id, libelle='Maintenance climatiseurs',
                    montant=120000, categorie='Maintenance', statut='validee',
                    enregistre_par=comptable.id, valide_par=raf.id,
                    date_depense=datetime(2026, 2, 15)),
            Depense(id_caisse=c3.id, libelle='Achat ordinateurs portables',
                    montant=650000, categorie='Informatique', statut='en_attente',
                    enregistre_par=comptable.id,
                    date_depense=datetime(2026, 3, 10)),
            Depense(id_caisse=c1.id, libelle='Organisation journée portes ouvertes',
                    montant=180000, categorie='Evenements', statut='validee',
                    enregistre_par=comptable.id, valide_par=raf.id,
                    date_depense=datetime(2026, 4, 5)),
        ]
        db.session.add_all(depenses)
        db.session.commit()
        print("✅ Dépenses créées")

        # ── Notifications ─────────────────────────────
        notifs = [
            Notification(id_utilisateur=raf.id,
                         titre='Dépassement budget Informatique',
                         message='Le budget Informatique est consommé à 81%. Montant alloué : 800 000 FCFA.',
                         type_notif='alerte_budget', priorite='haute', lue=False),
            Notification(id_utilisateur=raf.id,
                         titre='Nouveau paiement enregistré',
                         message='Un paiement de 350 000 FCFA a été enregistré pour Kone Ibrahim.',
                         type_notif='paiement', priorite='normale', lue=False),
            Notification(id_utilisateur=comptable.id,
                         titre='Dépense en attente de validation',
                         message='La dépense "Achat ordinateurs portables" attend votre validation.',
                         type_notif='depense', priorite='normale', lue=False),
        ]
        db.session.add_all(notifs)
        db.session.commit()
        print("✅ Notifications créées")

        # ── Messages ──────────────────────────────────
        messages = [
            Message(id_expediteur=raf.id, id_destinataire=comptable.id,
                    objet='Validation dépense urgente',
                    contenu='Bonjour, merci de valider la dépense informatique avant vendredi. Cordialement.',
                    lu=False, date_envoi=datetime(2026, 6, 10)),
            Message(id_expediteur=comptable.id, id_destinataire=raf.id,
                    objet='Rapport mensuel Mai 2026',
                    contenu='Bonjour, le rapport du mois de Mai est prêt. Total encaissé : 1 430 000 FCFA.',
                    lu=True, date_envoi=datetime(2026, 6, 5)),
        ]
        db.session.add_all(messages)
        db.session.commit()