"""
Configuration commune pour tous les tests FinTrack.
Fournit les fixtures réutilisables dans tous les fichiers de test.
"""
import pytest
import os
import sys

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db as _db
from models import Utilisateur, Etudiant, Caisse, Budget


@pytest.fixture(scope='session')
def app():
    """Créer l'application Flask en mode test avec base SQLite en mémoire."""
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    os.environ['JWT_SECRET_KEY'] = 'test-secret-key'

    application = create_app()
    application.config.update({
        'TESTING':                True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'JWT_SECRET_KEY':          'test-secret-key',
        'JWT_ACCESS_TOKEN_EXPIRES': False,
    })

    with application.app_context():
        _db.create_all()
        _seed_data()
        yield application
        _db.drop_all()


def _seed_data():
    """Insérer les données de base pour les tests."""
    from extensions import bcrypt

    # Utilisateurs
    raf = Utilisateur(
        nom='Diop', prenom='Moussa',
        email='raf@fintrack.sn',
        mot_de_passe_hash=bcrypt.generate_password_hash('raf123').decode(),
        role='raf', actif=True
    )
    comptable = Utilisateur(
        nom='Diallo', prenom='Abdoul',
        email='comptable@fintrack.sn',
        mot_de_passe_hash=bcrypt.generate_password_hash('comptable123').decode(),
        role='comptable', actif=True
    )
    inactif = Utilisateur(
        nom='Test', prenom='Inactif',
        email='inactif@fintrack.sn',
        mot_de_passe_hash=bcrypt.generate_password_hash('inactif123').decode(),
        role='comptable', actif=False
    )
    _db.session.add_all([raf, comptable, inactif])

    # Étudiants
    etudiants = [
        Etudiant(matricule='ISM001', nom='Fall', prenom='Cheikh',
                 email='c.fall@ism.sn', classe='L3', filiere='GLRS',
                 annee_academique='2025-2026'),
        Etudiant(matricule='ISM002', nom='Diallo', prenom='Fatou',
                 email='f.diallo@ism.sn', classe='L2', filiere='CDSD',
                 annee_academique='2025-2026'),
        Etudiant(matricule='ISM003', nom='Ndiaye', prenom='Omar',
                 email='o.ndiaye@ism.sn', classe='L1', filiere='GLRS',
                 annee_academique='2025-2026'),
    ]
    _db.session.add_all(etudiants)

    # Caisses
    caisses = [
        Caisse(nom='Caisse Principale', type_caisse='principale',
               solde_actuel=5000000.00, statut='active'),
        Caisse(nom='Caisse Scolarité', type_caisse='secondaire',
               solde_actuel=2000000.00, statut='active'),
        Caisse(nom='Caisse Inactive', type_caisse='projet',
               solde_actuel=0.00, statut='inactive'),
    ]
    _db.session.add_all(caisses)

    # Budgets
    budgets = [
        Budget(categorie='Fournitures', montant_alloue=500000,
               montant_consomme=0, annee='2026'),
        Budget(categorie='Salaires', montant_alloue=2000000,
               montant_consomme=0, annee='2026'),
    ]
    _db.session.add_all(budgets)

    _db.session.commit()


@pytest.fixture(scope='session')
def client(app):
    """Client de test Flask."""
    return app.test_client()


@pytest.fixture(scope='session')
def token_raf(client):
    """Token JWT pour le RAF."""
    res = client.post('/api/auth/login',
                      json={'email': 'raf@fintrack.sn', 'password': 'raf123'})
    return res.get_json()['token']


@pytest.fixture(scope='session')
def token_comptable(client):
    """Token JWT pour le Comptable."""
    res = client.post('/api/auth/login',
                      json={'email': 'comptable@fintrack.sn', 'password': 'comptable123'})
    return res.get_json()['token']


@pytest.fixture
def headers_raf(token_raf):
    """Headers avec token RAF."""
    return {'Authorization': f'Bearer {token_raf}', 'Content-Type': 'application/json'}


@pytest.fixture
def headers_comptable(token_comptable):
    """Headers avec token Comptable."""
    return {'Authorization': f'Bearer {token_comptable}', 'Content-Type': 'application/json'}
