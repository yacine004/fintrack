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

    print('Tables reinitialisees — seed en cours...')

    raf = Utilisateur(nom='Diop', prenom='Moussa', email='raf@fintrack.sn',
        mot_de_passe_hash=bcrypt.generate_password_hash('raf123').decode(),
        role='raf', actif=True, contact='77 100 00 01')
    comptable = Utilisateur(nom='Diallo', prenom='Abdoul Salif',
        email='comptable@fintrack.sn',
        mot_de_passe_hash=bcrypt.generate_password_hash('comptable123').decode(),
        role='comptable', actif=True, contact='77 100 00 02')
    db.session.add_all([raf, comptable])
    db.session.flush()
    db.session.commit()

    c1 = Caisse(nom='Caisse Principale', type_caisse='principale',
        description='Caisse principale ISM',
        solde_actuel=5000000.00, statut='active')
    c2 = Caisse(nom='Caisse Scolarite', type_caisse='secondaire',
        description='Frais de scolarite',
        solde_actuel=2500000.00, statut='active')
    c3 = Caisse(nom='Caisse Projets', type_caisse='projet',
        description='Projets etudiants',
        solde_actuel=750000.00, statut='active')
    db.session.add_all([c1, c2, c3])
    db.session.flush()
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
    db.session.flush()
    db.session.commit()

    db.session.add_all([
        Budget(categorie='Fournitures', montant_alloue=500000,
            montant_consomme=85000, annee='2026'),
        Budget(categorie='Salaires', montant_alloue=2000000,
            montant_consomme=0, annee='2026'),
        Budget(categorie='Maintenance', montant_alloue=300000,
            montant_consomme=120000, annee='2026'),
        Budget(categorie='Evenements', montant_alloue=400000,
            montant_consomme=180000, annee='2026'),
        Budget(categorie='Informatique', montant_alloue=800000,
            montant_consomme=650000, annee='2026'),
    ])
    db.session.commit()

    paiements_e1 = [
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=112500, mode_paiement='especes',
            motif='Tranche 1/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,9,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='especes',
            motif='Mensualite Septembre 2025',
            date_paiement=datetime(2025,9,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=112500, mode_paiement='wave',
            motif='Tranche 2/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,10,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Octobre 2025',
            date_paiement=datetime(2025,10,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Novembre 2025',
            date_paiement=datetime(2025,11,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Decembre 2025',
            date_paiement=datetime(2025,12,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=112500, mode_paiement='virement',
            motif='Tranche 3/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2026,1,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='virement',
            motif='Mensualite Janvier 2026',
            date_paiement=datetime(2026,1,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=112500, mode_paiement='virement',
            motif='Tranche 4/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2026,2,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='virement',
            motif='Mensualite Fevrier 2026',
            date_paiement=datetime(2026,2,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Mars 2026',
            date_paiement=datetime(2026,3,5)),
        Paiement(id_etudiant=e1.id_etudiant, id_caisse=c1.id_caisse,
            montant=75000, mode_paiement='wave',
            motif='Frais encadrement L3',
            date_paiement=datetime(2026,3,5)),
    ]

    paiements_e2 = [
        Paiement(id_etudiant=e2.id_etudiant, id_caisse=c2.id_caisse,
            montant=112500, mode_paiement='virement',
            motif='Tranche 1/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,9,10)),
        Paiement(id_etudiant=e2.id_etudiant, id_caisse=c2.id_caisse,
            montant=95000, mode_paiement='virement',
            motif='Mensualite Septembre 2025',
            date_paiement=datetime(2025,9,10)),
        Paiement(id_etudiant=e2.id_etudiant, id_caisse=c2.id_caisse,
            montant=112500, mode_paiement='wave',
            motif='Tranche 2/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,10,10)),
        Paiement(id_etudiant=e2.id_etudiant, id_caisse=c2.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Octobre 2025',
            date_paiement=datetime(2025,10,10)),
        Paiement(id_etudiant=e2.id_etudiant, id_caisse=c2.id_caisse,
            montant=95000, mode_paiement='especes',
            motif='Mensualite Novembre 2025',
            date_paiement=datetime(2025,11,15)),
    ]

    paiements_e3 = [
        Paiement(id_etudiant=e3.id_etudiant, id_caisse=c1.id_caisse,
            montant=112500, mode_paiement='orange_money',
            motif='Tranche 1/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,9,5)),
        Paiement(id_etudiant=e3.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='orange_money',
            motif='Mensualite Septembre 2025',
            date_paiement=datetime(2025,9,5)),
        Paiement(id_etudiant=e3.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='especes',
            motif='Mensualite Octobre 2025',
            date_paiement=datetime(2025,10,8)),
        Paiement(id_etudiant=e3.id_etudiant, id_caisse=c1.id_caisse,
            montant=112500, mode_paiement='orange_money',
            motif='Tranche 2/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,11,8)),
        Paiement(id_etudiant=e3.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Novembre 2025',
            date_paiement=datetime(2025,12,8)),
    ]

    paiements_e4 = [
        Paiement(id_etudiant=e4.id_etudiant, id_caisse=c2.id_caisse,
            montant=112500, mode_paiement='especes',
            motif='Tranche 1/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,9,5)),
        Paiement(id_etudiant=e4.id_etudiant, id_caisse=c2.id_caisse,
            montant=95000, mode_paiement='especes',
            motif='Mensualite Septembre 2025',
            date_paiement=datetime(2025,10,5)),
    ]

    paiements_e5 = [
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=112500, mode_paiement='virement',
            motif='Tranche 1/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,9,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='virement',
            motif='Mensualite Septembre 2025',
            date_paiement=datetime(2025,9,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=112500, mode_paiement='virement',
            motif='Tranche 2/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,10,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='virement',
            motif='Mensualite Octobre 2025',
            date_paiement=datetime(2025,10,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Novembre 2025',
            date_paiement=datetime(2025,11,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Decembre 2025',
            date_paiement=datetime(2025,12,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=112500, mode_paiement='virement',
            motif='Tranche 3/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2026,1,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='virement',
            motif='Mensualite Janvier 2026',
            date_paiement=datetime(2026,1,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=112500, mode_paiement='virement',
            motif='Tranche 4/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2026,2,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='virement',
            motif='Mensualite Fevrier 2026',
            date_paiement=datetime(2026,2,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='virement',
            motif='Mensualite Mars 2026',
            date_paiement=datetime(2026,3,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=75000, mode_paiement='virement',
            motif='Frais encadrement L3',
            date_paiement=datetime(2026,3,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Avril 2026',
            date_paiement=datetime(2026,4,8)),
        Paiement(id_etudiant=e5.id_etudiant, id_caisse=c1.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Mai 2026',
            date_paiement=datetime(2026,5,8)),
    ]

    paiements_e6 = [
        Paiement(id_etudiant=e6.id_etudiant, id_caisse=c2.id_caisse,
            montant=112500, mode_paiement='wave',
            motif='Tranche 1/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,9,5)),
        Paiement(id_etudiant=e6.id_etudiant, id_caisse=c2.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Septembre 2025',
            date_paiement=datetime(2025,9,5)),
        Paiement(id_etudiant=e6.id_etudiant, id_caisse=c2.id_caisse,
            montant=112500, mode_paiement='especes',
            motif='Tranche 2/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2025,10,5)),
        Paiement(id_etudiant=e6.id_etudiant, id_caisse=c2.id_caisse,
            montant=95000, mode_paiement='especes',
            motif='Mensualite Octobre 2025',
            date_paiement=datetime(2025,11,5)),
        Paiement(id_etudiant=e6.id_etudiant, id_caisse=c2.id_caisse,
            montant=95000, mode_paiement='wave',
            motif='Mensualite Novembre 2025',
            date_paiement=datetime(2025,12,5)),
        Paiement(id_etudiant=e6.id_etudiant, id_caisse=c2.id_caisse,
            montant=112500, mode_paiement='orange_money',
            motif='Tranche 3/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2026,1,5)),
        Paiement(id_etudiant=e6.id_etudiant, id_caisse=c2.id_caisse,
            montant=95000, mode_paiement='orange_money',
            motif='Mensualite Decembre 2025',
            date_paiement=datetime(2026,2,5)),
        Paiement(id_etudiant=e6.id_etudiant, id_caisse=c2.id_caisse,
            montant=112500, mode_paiement='wave',
            motif='Tranche 4/4 - Droits inscription 2025-2026',
            date_paiement=datetime(2026,2,5)),
    ]

    db.session.add_all(paiements_e1 + paiements_e2 + paiements_e3 +
                       paiements_e4 + paiements_e5 + paiements_e6)
    db.session.commit()

    db.session.add_all([
        Depense(id_caisse=c1.id_caisse, montant=85000,
            motif='Achat fournitures bureau',
            categorie='Fournitures', statut='validee',
            date_depense=datetime(2026,1,20)),
        Depense(id_caisse=c1.id_caisse, montant=120000,
            motif='Maintenance climatiseurs',
            categorie='Maintenance', statut='validee',
            date_depense=datetime(2026,2,15)),
        Depense(id_caisse=c3.id_caisse, montant=650000,
            motif='Achat ordinateurs portables',
            categorie='Informatique', statut='en_attente',
            date_depense=datetime(2026,3,10)),
        Depense(id_caisse=c1.id_caisse, montant=180000,
            motif='Journee portes ouvertes',
            categorie='Evenements', statut='validee',
            date_depense=datetime(2026,4,5)),
    ])
    db.session.commit()

    db.session.add_all([
        Notification(id_utilisateur=raf.id_utilisateur,
            type='alerte_budget',
            message='Budget Informatique consomme a 81%.',
            priorite='haute', lu=False),
        Notification(id_utilisateur=raf.id_utilisateur,
            type='paiement',
            message='Paiement 95000 FCFA pour Kone Ibrahim (Mensualite Mai 2026).',
            priorite='normale', lu=False),
        Notification(id_utilisateur=comptable.id_utilisateur,
            type='depense',
            message='Achat ordinateurs portables attend validation.',
            priorite='normale', lu=False),
    ])
    db.session.commit()

    db.session.add_all([
        Message(id_expediteur=raf.id_utilisateur,
            id_destinataire=comptable.id_utilisateur,
            objet='Validation depense urgente',
            contenu='Merci de valider la depense informatique avant vendredi.',
            lu=False, date_envoi=datetime(2026,6,10)),
        Message(id_expediteur=comptable.id_utilisateur,
            id_destinataire=raf.id_utilisateur,
            objet='Rapport mensuel Mai 2026',
            contenu='Rapport Mai pret. Total encaisse 4617500 FCFA.',
            lu=True, date_envoi=datetime(2026,6,5)),
    ])
    db.session.commit()

    db.session.add_all([
        AuditLog(id_utilisateur=raf.id_utilisateur,
            action='CREATE', entite='utilisateur',
            details='Creation compte comptable',
            date_action=datetime(2026,1,1)),
        AuditLog(id_utilisateur=comptable.id_utilisateur,
            action='CREATE', entite='paiement',
            details='Paiement Diallo 112500 FCFA - Tranche 3/4 inscription',
            date_action=datetime(2026,1,5)),
        AuditLog(id_utilisateur=raf.id_utilisateur,
            action='VALIDATE', entite='depense',
            details='Validation depense fournitures',
            date_action=datetime(2026,1,22)),
    ])
    db.session.commit()
    print('SEED OK')
