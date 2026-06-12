from flask import Flask
from flask_cors import CORS
from datetime import timedelta
from dotenv import load_dotenv
import os
from prometheus_flask_exporter import PrometheusMetrics

load_dotenv()
metrics = PrometheusMetrics(app=None)

from extensions import db, bcrypt, jwt
from routes.auth import auth_bp
from routes.utilisateurs import utilisateurs_bp
from routes.etudiants import etudiants_bp
from routes.caisses import caisses_bp
from routes.paiements import paiements_bp
from routes.depenses import depenses_bp
from routes.budgets import budgets_bp
from routes.dashboard import dashboard_bp
from routes.rapports import rapports_bp
# ── Sprint 6 ──
from routes.messages import messages_bp
from routes.notifications import notifications_bp
from routes.audit import audit_bp


def create_app():
    app = Flask(__name__)
    metrics = PrometheusMetrics(app)

    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://fintrack-frontend-h7vv.onrender.com",
    ]
    CORS(app, resources={
        r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    app.config['SQLALCHEMY_DATABASE_URI']        = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY']                 = os.getenv('JWT_SECRET_KEY')
    app.config['JWT_ACCESS_TOKEN_EXPIRES']       = timedelta(hours=8)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp,            url_prefix='/api/auth')
    app.register_blueprint(utilisateurs_bp,    url_prefix='/api/utilisateurs')
    app.register_blueprint(etudiants_bp,       url_prefix='/api/etudiants')
    app.register_blueprint(caisses_bp,         url_prefix='/api/caisses')
    app.register_blueprint(paiements_bp,       url_prefix='/api/paiements')
    app.register_blueprint(depenses_bp,        url_prefix='/api/depenses')
    app.register_blueprint(budgets_bp,         url_prefix='/api/budgets')
    app.register_blueprint(dashboard_bp,       url_prefix='/api/dashboard')
    app.register_blueprint(rapports_bp,        url_prefix='/api/rapports')
    # Sprint 6
    app.register_blueprint(messages_bp,        url_prefix='/api/messages')
    app.register_blueprint(notifications_bp,   url_prefix='/api/notifications')
    app.register_blueprint(audit_bp,           url_prefix='/api/audit')

    return app


if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
        print("✅ Tables créées / vérifiées")

        from models import Utilisateur
        if db.session.query(Utilisateur).count() == 0:
            users = [
                Utilisateur(nom='Diop', prenom='Moussa', email='raf@fintrack.sn',
                            contact='77 000 00 01',
                            mot_de_passe_hash=bcrypt.generate_password_hash('raf123').decode(),
                            role='raf'),
                Utilisateur(nom='Diallo', prenom='Abdoul Salif', email='comptable@fintrack.sn',
                            contact='77 000 00 02',
                            mot_de_passe_hash=bcrypt.generate_password_hash('comptable123').decode(),
                            role='comptable'),
            ]
            db.session.add_all(users)
            db.session.commit()
            print("✅ Comptes créés")

        from models import Etudiant, Caisse, Budget
        if db.session.query(Etudiant).count() == 0:
            etudiants = [
                Etudiant(matricule='ISM2026001', nom='Diallo', prenom='Mamadou',
                         email='m.diallo@ism.edu.sn', contact='77 111 11 11',
                         classe='L3', filiere='GLRS', annee_academique='2025-2026'),
                Etudiant(matricule='ISM2026002', nom='Sarr', prenom='Fatou',
                         email='f.sarr@ism.edu.sn', contact='77 222 22 22',
                         classe='L3', filiere='CDSD', annee_academique='2025-2026'),
                Etudiant(matricule='ISM2026003', nom='Ndiaye', prenom='Ousmane',
                         email='o.ndiaye@ism.edu.sn', contact='77 333 33 33',
                         classe='L2', filiere='GLRS', annee_academique='2025-2026'),
                Etudiant(matricule='ISM2026004', nom='Ba', prenom='Aminata',
                         email='a.ba@ism.edu.sn', contact='77 444 44 44',
                         classe='L1', filiere='CDSD', annee_academique='2025-2026'),
                Etudiant(matricule='ISM2026005', nom='Koné', prenom='Ibrahim',
                         email='i.kone@ism.edu.sn', contact='77 555 55 55',
                         classe='L3', filiere='GLRS', annee_academique='2025-2026'),
            ]
            db.session.add_all(etudiants)
            db.session.commit()
            print("✅ Étudiants créés")

        if db.session.query(Caisse).count() == 0:
            caisses = [
                Caisse(nom='Caisse Principale', type_caisse='principale',
                       description='Caisse principale', solde_actuel=5000000.00),
                Caisse(nom='Caisse Scolarité', type_caisse='secondaire',
                       description='Frais scolarité', solde_actuel=2500000.00),
                Caisse(nom='Caisse Projets', type_caisse='projet',
                       description='Projets étudiants', solde_actuel=750000.00),
            ]
            db.session.add_all(caisses)
            db.session.commit()
            print("✅ Caisses créées")

        if db.session.query(Budget).count() == 0:
            budgets = [
                Budget(categorie='Fournitures',  montant_alloue=500000,  annee='2026'),
                Budget(categorie='Salaires',     montant_alloue=2000000, annee='2026'),
                Budget(categorie='Maintenance',  montant_alloue=300000,  annee='2026'),
                Budget(categorie='Evenements',   montant_alloue=400000,  annee='2026'),
                Budget(categorie='Informatique', montant_alloue=800000,  annee='2026'),
            ]
            db.session.add_all(budgets)
            db.session.commit()
            print("✅ Budgets créés")


    app.run(debug=True, port=5000)
