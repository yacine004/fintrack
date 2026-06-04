from flask import Flask
from flask_cors import CORS
from datetime import timedelta
from dotenv import load_dotenv
from sqlalchemy import inspect, text
import os

load_dotenv()

from extensions import db, bcrypt, jwt
from routes.auth import auth_bp
from routes.utilisateurs import utilisateurs_bp

def create_app():
    app = Flask(__name__)

    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    app.config['SQLALCHEMY_DATABASE_URI']    = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY']             = os.getenv('JWT_SECRET_KEY')
    app.config['JWT_ACCESS_TOKEN_EXPIRES']   = timedelta(hours=8)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp,          url_prefix='/api/auth')
    app.register_blueprint(utilisateurs_bp,  url_prefix='/api/utilisateurs')

    return app

if __name__ == '__main__':
    app = create_app()

    with app.app_context():
        db.create_all()

        inspector = inspect(db.engine)
        if inspector.has_table('utilisateur'):
            columns = [col['name'] for col in inspector.get_columns('utilisateur')]
            if 'contact' not in columns:
                db.session.execute(text('ALTER TABLE utilisateur ADD COLUMN contact VARCHAR(50);'))
                db.session.commit()
                print('✅ Colonne contact ajoutée à la table utilisateur')

        from models import Utilisateur
        if db.session.query(Utilisateur).count() == 0:
            users = [
                Utilisateur(
                    nom='Diop', prenom='Moussa',
                    email='raf@fintrack.sn',
                    contact='77 000 00 01',
                    mot_de_passe_hash=bcrypt.generate_password_hash('raf123').decode(),
                    role='raf'
                ),
                Utilisateur(
                    nom='Diallo', prenom='Abdoul Salif',
                    email='comptable@fintrack.sn',
                    contact='77 000 00 02',
                    mot_de_passe_hash=bcrypt.generate_password_hash('comptable123').decode(),
                    role='comptable'
                ),
            ]
            db.session.add_all(users)
            db.session.commit()
            print("✅ Comptes de test créés")

    app.run(debug=True, port=5000)
