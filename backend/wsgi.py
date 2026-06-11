"""Point d'entree WSGI pour gunicorn / Render."""
from app import create_app
from extensions import db, bcrypt

app = create_app()

with app.app_context():
    db.create_all()

    from models import Utilisateur, Caisse, Budget

    # Utilisateurs par defaut (idempotent — ne recrée pas si deja presents)
    comptes = [
        dict(nom='Diop',   prenom='Moussa',       email='raf@fintrack.sn',
             contact='77 000 00 01', role='raf',       mdp='raf123'),
        dict(nom='Faye',   prenom='Ibrahima',     email='raf2@fintrack.sn',
             contact='77 000 00 05', role='raf',       mdp='raf123'),
        dict(nom='Diallo', prenom='Abdoul Salif', email='comptable@fintrack.sn',
             contact='77 000 00 02', role='comptable', mdp='comptable123'),
        dict(nom='Ndiaye', prenom='Mariama',      email='m.ndiaye@fintrack.sn',
             contact='77 111 22 33', role='comptable', mdp='comptable123'),
        dict(nom='Fall',   prenom='Seydou',       email='s.fall@fintrack.sn',
             contact='77 444 55 66', role='comptable', mdp='comptable123'),
        dict(nom='Sene',   prenom='Awa',          email='a.sene@fintrack.sn',
             contact='77 777 88 99', role='comptable', mdp='comptable123'),
    ]
    for c in comptes:
        if not Utilisateur.query.filter_by(email=c['email']).first():
            db.session.add(Utilisateur(
                nom=c['nom'], prenom=c['prenom'], email=c['email'],
                contact=c['contact'], role=c['role'], actif=True,
                mot_de_passe_hash=bcrypt.generate_password_hash(c['mdp']).decode()
            ))
    db.session.commit()

    # Caisses par defaut
    if db.session.query(Caisse).count() == 0:
        db.session.add_all([
            Caisse(nom='Caisse Principale', type_caisse='principale',
                   description='Caisse principale de l etablissement', solde_actuel=5000000.0),
            Caisse(nom='Caisse Scolarite',  type_caisse='secondaire',
                   description='Paiements des frais de scolarite',     solde_actuel=3500000.0),
            Caisse(nom='Caisse Projets',    type_caisse='projet',
                   description='Financement des projets etudiants',    solde_actuel=750000.0),
            Caisse(nom='Caisse Examens',    type_caisse='secondaire',
                   description='Frais d examens et rattrapages',       solde_actuel=980000.0),
            Caisse(nom='Caisse Evenements', type_caisse='secondaire',
                   description='Organisation des evenements ISM',      solde_actuel=420000.0),
        ])
        db.session.commit()

    # Budgets par defaut
    if db.session.query(Budget).count() == 0:
        db.session.add_all([
            Budget(categorie='Fournitures',  montant_alloue=500000,  montant_consomme=312000,  annee='2026'),
            Budget(categorie='Salaires',     montant_alloue=2000000, montant_consomme=1650000, annee='2026'),
            Budget(categorie='Maintenance',  montant_alloue=300000,  montant_consomme=87500,   annee='2026'),
            Budget(categorie='Evenements',   montant_alloue=400000,  montant_consomme=215000,  annee='2026'),
            Budget(categorie='Informatique', montant_alloue=800000,  montant_consomme=620000,  annee='2026'),
            Budget(categorie='Formation',    montant_alloue=150000,  montant_consomme=178500,  annee='2026'),
        ])
        db.session.commit()
