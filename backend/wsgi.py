# -*- coding: utf-8 -*-
from app import create_app
from extensions import db, bcrypt
from datetime import datetime

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()

    from models import (Utilisateur, Etudiant, Caisse, Paiement,
                        Depense, Budget, Notification, Message, AuditLog)

    raf = Utilisateur(nom='Diop', prenom='Moussa', email='raf@fintrack.sn',
        mot_de_passe_hash=bcrypt.generate_password_hash('raf123').decode(),
        role='raf', actif=True, contact='77 100 00 01')
    comptable = Utilisateur(nom='Diallo', prenom='Abdoul Salif',
        email='comptable@fintrack.sn',
        mot_de_passe_hash=bcrypt.generate_password_hash('comptable123').decode(),
        role='comptable', actif=True, contact='77 100 00 02')
    db.session.add_all([raf, comptable])
    db.session.commit()

    c1 = Caisse(nom='Caisse Principale', type_caisse='principale',
        description='Caisse principale ISM', solde_actuel=5000000.00, statut='actif')
    c2 = Caisse(nom='Caisse Scolarite', type_caisse='secondaire',
        description='Frais de scolarite', solde_actuel=2500000.00, statut='actif')
    c3 = Caisse(nom='Caisse Projets', type_caisse='projet',
        description='Projets etudiants', solde_actuel=750000.00, statut='actif')
    db.session.add_all([c1, c2, c3])
    db.session.commit()

    e1 = Etudiant(matricule='ISM2026001', nom='Diallo', prenom='Mamadou',
        email='m.diallo@ism.edu.sn', contact='77 111 11 11',
        classe='L3', filiere='GLRS', annee_academique='2025-2026', statut='actif')
    e2 = Etudiant(matricule='ISM2026002', nom='Sarr', prenom='Fatou',
        email='f.sarr@ism.edu.sn', contact='77 222 22 22',
        classe='L3', filiere='CDSD', annee_academique='2025-2026', statut='actif')
    e3 = Etudiant(matricule='ISM2026003', nom='Ndiaye', prenom='Ousmane',
        email='o.ndiaye@ism.edu.sn', contact='77 333 33 33',
        classe='L2', filiere='GLRS', annee_academique='2025-2026', statut='actif')
    e4 = Etudiant(matricule='ISM2026004', nom='Ba', prenom='Aminata',
        email='a.ba@ism.edu.sn', contact='77 444 44 44',
        classe='L1', filiere='CDSD', annee_academique='2025-2026', statut='actif')
    e5 = Etudiant(matricule='ISM2026005', nom='Kone', prenom='Ibrahim',
        email='i.kone@ism.edu.sn', contact='77 555 55 55',
        classe='L3', filiere='GLRS', annee_academique='2025-2026', statut='actif')
    e6 = Etudiant(matricule='ISM2026006', nom='Fall', prenom='Marieme',
        email='m.fall@ism.edu.sn', contact='77 666 66 66',
        classe='L2', filiere='GLRS', annee_academique='2025-2026', statut='actif')
    db.session.add_all([e1, e2, e3, e4, e5, e6])
    db.session.commit()

    db.session.add_all([
        Budget(categorie='Fournitures', montant_alloue=500000, annee='2026', description='Fournitures de bureau'),
        Budget(categorie='Salaires', montant_alloue=2000000, annee='2026', description='Salaires du personnel'),
        Budget(categorie='Maintenance', montant_alloue=300000, annee='2026', description='Maintenance equipements'),
        Budget(categorie='Evenements', montant_alloue=400000, annee='2026', description='Evenements et ceremonies'),
        Budget(categorie='Informatique', montant_alloue=800000, annee='2026', description='Materiel informatique'),
    ])
    db.session.commit()

    db.session.add_all([
        Paiement(id_etudiant=e1.id, id_caisse=c1.id, montant=250000,
            mode_paiement='especes', type_frais='scolarite',
            enregistre_par=comptable.id, date_paiement=datetime(2026,1,15)),
        Paiement(id_etudiant=e2.id, id_caisse=c2.id, montant=300000,
            mode_paiement='wave', type_frais='scolarite',
            enregistre_par=comptable.id, date_paiement=datetime(2026,2,10)),
        Paiement(id_etudiant=e3.id, id_caisse=c1.id, montant=150000,
            mode_paiement='orange_money', type_frais='inscription',
            enregistre_par=comptable.id, date_paiement=datetime(2026,3,5)),
        Paiement(id_etudiant=e4.id, id_caisse=c2.id, montant=200000,
            mode_paiement='especes', type_frais='scolarite',
            enregistre_par=comptable.id, date_paiement=datetime(2026,4,20)),
        Paiement(id_etudiant=e5.id, id_caisse=c1.id, montant=350000,
            mode_paiement='virement', type_frais='scolarite',
            enregistre_par=comptable.id, date_paiement=datetime(2026,5,8)),
        Paiement(id_etudiant=e6.id, id_caisse=c2.id, montant=180000,
            mode_paiement='wave', type_frais='soutenance',
            enregistre_par=comptable.id, date_paiement=datetime(2026,6,1)),
    ])
    db.session.commit()

    db.session.add_all([
        Depense(id_caisse=c1.id, libelle='Achat fournitures bureau',
            montant=85000, categorie='Fournitures', statut='validee',
            enregistre_par=comptable.id, valide_par=raf.id,
            date_depense=datetime(2026,1,20)),
        Depense(id_caisse=c1.id, libelle='Maintenance climatiseurs',
            montant=120000, categorie='Maintenance', statut='validee',
            enregistre_par=comptable.id, valide_par=raf.id,
            date_depense=datetime(2026,2,15)),
        Depense(id_caisse=c3.id, libelle='Achat ordinateurs portables',
            montant=650000, categorie='Informatique', statut='en_attente',
            enregistre_par=comptable.id, date_depense=datetime(2026,3,10)),
        Depense(id_caisse=c1.id, libelle='Journee portes ouvertes',
            montant=180000, categorie='Evenements', statut='validee',
            enregistre_par=comptable.id, valide_par=raf.id,
            date_depense=datetime(2026,4,5)),
    ])
    db.session.commit()

    db.session.add_all([
        Notification(id_utilisateur=raf.id,
            titre='Depassement budget Informatique',
            message='Budget Informatique consomme a 81%.',
            type_notif='alerte_budget', priorite='haute', lue=False),
        Notification(id_utilisateur=raf.id,
            titre='Nouveau paiement enregistre',
            message='Paiement 350000 FCFA pour Kone Ibrahim.',
            type_notif='paiement', priorite='normale', lue=False),
        Notification(id_utilisateur=comptable.id,
            titre='Depense en attente',
            message='Achat ordinateurs portables attend validation.',
            type_notif='depense', priorite='normale', lue=False),
    ])
    db.session.commit()

    db.session.add_all([
        Message(id_expediteur=raf.id, id_destinataire=comptable.id,
            objet='Validation depense urgente',
            contenu='Merci de valider la depense informatique avant vendredi.',
            lu=False, date_envoi=datetime(2026,6,10)),
        Message(id_expediteur=comptable.id, id_destinataire=raf.id,
            objet='Rapport mensuel Mai 2026',
            contenu='Rapport Mai pret. Total encaisse 1430000 FCFA.',
            lu=True, date_envoi=datetime(2026,6,5)),
    ])
    db.session.commit()

    db.session.add_all([
        AuditLog(id_utilisateur=raf.id, action='CREATE',
            table_cible='utilisateur', description='Creation compte comptable',
            date_action=datetime(2026,1,1)),
        AuditLog(id_utilisateur=comptable.id, action='CREATE',
            table_cible='paiement', description='Paiement Diallo 250000 FCFA',
            date_action=datetime(2026,1,15)),
        AuditLog(id_utilisateur=raf.id, action='VALIDATE',
            table_cible='depense', description='Validation depense fournitures',
            date_action=datetime(2026,1,22)),
    ])
    db.session.commit()
    print('SEED OK')