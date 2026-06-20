from flask import Flask
from flask_cors import CORS
from datetime import timedelta
from dotenv import load_dotenv
import os
from prometheus_flask_exporter import PrometheusMetrics

load_dotenv()
metrics = PrometheusMetrics(app=None)

from extensions import db, bcrypt, jwt, mail
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
# ── Sprint 7 ──
from routes.affectations import affectations_bp
from routes.inscriptions import inscriptions_bp
# ── Sprint 8 ──
from routes.annees import annees_bp
from routes.alertes import alertes_bp
from routes.autorisations import autorisations_bp
# ── Sprint 9 ──
from routes.frais_annexes import frais_annexes_bp


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

    # Flask-Mail (optionnel — désactivé si MAIL_SERVER absent)
    app.config['MAIL_SERVER']   = os.getenv('MAIL_SERVER', '')
    app.config['MAIL_PORT']     = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS']  = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@ism.edu.sn')

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)

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
    app.register_blueprint(affectations_bp,   url_prefix='/api/affectations')
    app.register_blueprint(inscriptions_bp,   url_prefix='/api/inscriptions')
    app.register_blueprint(annees_bp,         url_prefix='/api/annees-scolaires')
    app.register_blueprint(alertes_bp,        url_prefix='/api/alertes')
    app.register_blueprint(autorisations_bp,  url_prefix='/api/autorisations')
    app.register_blueprint(frais_annexes_bp,  url_prefix='/api/frais-annexes')

    return app


if __name__ == '__main__':
    from db_bootstrap import bootstrap_db
    app = create_app()
    bootstrap_db(app)
    app.run(debug=True, port=5000)
