# -*- coding: utf-8 -*-
"""Point d'entree WSGI pour gunicorn."""
from app import create_app
from extensions import db, bcrypt
from datetime import datetime

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()
    print("OK Tables reinitialisees")

    from models import (Utilisateur, Etudiant, Caisse, Paiement,
                        Depense, Budget, Notification, Message, AuditLog)

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
    print("OK Utilisateurs crees")

    c1 = Caisse(nom='Caisse Principale', type_caisse='principale',
                description='Caisse principale ISM',
                solde_actuel=5000000.00, statut='actif')
    c2 = Caisse(nom='Caisse Scolarite', type_caisse='secondaire',
                description='Frais de scolarite',
                solde_actuel=2500000.00, statut='actif')
    c3 = Caisse(nom='Caisse Projets', type_caisse='projet',
                description='Projets etudiants',
                solde_actuel=750000.00, statut='actif')
    db.session.add_all([c1, c2, c3])
    db.session.commit()
    print("OK Caisses creees")

    e1 = Etudiant(matricule='ISM2026001', nom='Diallo', prenom='Mamadou',
                  email='m.diallo@ism.edu.sn', contact='77 111 11 11',
                  classe='L3', filiere='GLRS',
                  annee_academique='2025-2026', statut='actif')
    e2 = Etudiant(matricule='ISM2026002', nom='Sarr', prenom='Fatou',
                  email='f.sarr@ism.edu.sn', contact='77 222 22 22',
                  classe='L3', filiere='CDSD',
                  annee_academique='2025-2026', statut='actif')
    e3 = Etudiant(matricule='ISM2026003', nom='Ndiaye', prenom='Ousmane',
                  email='o.ndiaye@ism.edu.sn', contact='77 333 33 33',
                  classe='L2', filiere='GLRS',
                  annee_academique='2025-2026', statut='actif')
    e4 = Etudiant(matricule='ISM2026004', nom='Ba', prenom='Aminata',
                  email='a.ba@ism.edu.sn', contact='77 444 44 44',
                  classe='L1', filiere='CDSD',
                  annee_academique='2025-2026', statut='actif')
    e5 = Etudiant(matricule='ISM2026005', nom='Kone', prenom='Ibrahim',
                  email='i.kone@ism.edu.sn', contact='77 555 55 55',
                  classe='L3', filiere='GLRS',
                  annee_academique='2025-2026', statut='actif')
    e6 = Etudiant(matricule='ISM2026006', nom='Fall', prenom='Marieme',
                  email='m.fall@ism.edu.sn', contact='77 666 66 66',
                  classe='L2', filiere='GLRS',
                  annee_academique='2025-2026', statut='actif')
    db.session.add_all([e1, e2, e3, e4, e5, e6])
    db.session.commit()
    print("OK Etudiants crees")

    budgets = [
        Budget(categorie='Fournitures', montant_alloue=500000,
               annee='2026', description='Fournitures de bureau'),
        Budget(categorie='Salaires', montant_alloue=2000000,
               annee='2026', description='Salaires du personnel'),
        Budget(categorie='Maintenance', montant_alloue=300000,
               annee='2026', description='Maintenance des equipements'),