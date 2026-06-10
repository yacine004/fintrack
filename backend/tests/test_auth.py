"""
Tests Sprint 1 — Authentification & Gestion des Utilisateurs
Couvre : login, profil, CRUD utilisateurs, contrôle d'accès par rôle
"""
import pytest


class TestLogin:
    """Tests de l'endpoint POST /api/auth/login"""

    def test_login_raf_valide(self, client):
        """T1.1 — Login RAF avec bonnes credentials → 200 + token"""
        res = client.post('/api/auth/login',
                          json={'email': 'raf@fintrack.sn', 'password': 'raf123'})
        data = res.get_json()
        assert res.status_code == 200
        assert 'token' in data
        assert isinstance(data['token'], str)
        assert data['user']['role'] == 'raf'

    def test_login_comptable_valide(self, client):
        """Login Comptable avec bonnes credentials → 200 + token"""
        res = client.post('/api/auth/login',
                          json={'email': 'comptable@fintrack.sn', 'password': 'comptable123'})
        data = res.get_json()
        assert res.status_code == 200
        assert 'token' in data
        assert data['user']['role'] == 'comptable'

    def test_login_mauvais_mot_de_passe(self, client):
        """T1.2 — Mauvais mot de passe → 401"""
        res = client.post('/api/auth/login',
                          json={'email': 'raf@fintrack.sn', 'password': 'mauvaismdp'})
        assert res.status_code == 401

    def test_login_email_inexistant(self, client):
        """Email inexistant → 401"""
        res = client.post('/api/auth/login',
                          json={'email': 'inconnu@fintrack.sn', 'password': 'test123'})
        assert res.status_code == 401

    def test_login_champs_manquants(self, client):
        """Champs obligatoires manquants → 400"""
        res = client.post('/api/auth/login', json={'email': 'raf@fintrack.sn'})
        assert res.status_code == 400

    def test_login_compte_inactif(self, client):
        """Compte désactivé → 401"""
        res = client.post('/api/auth/login',
                          json={'email': 'inactif@fintrack.sn', 'password': 'inactif123'})
        assert res.status_code == 401


class TestProfil:
    """Tests des endpoints /api/auth/me et /api/auth/profil"""

    def test_get_profil_raf(self, client, headers_raf):
        """T1.3 — GET /api/auth/me avec token RAF → 200 + données"""
        res = client.get('/api/auth/me', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert data['email'] == 'raf@fintrack.sn'
        assert data['role'] == 'raf'

    def test_get_profil_comptable(self, client, headers_comptable):
        """GET /api/auth/me avec token Comptable → 200"""
        res = client.get('/api/auth/me', headers=headers_comptable)
        data = res.get_json()
        assert res.status_code == 200
        assert data['role'] == 'comptable'

    def test_get_profil_sans_token(self, client):
        """GET /api/auth/me sans token → 401"""
        res = client.get('/api/auth/me')
        assert res.status_code == 401

    def test_modifier_profil(self, client, headers_raf):
        """T1.4 — PUT /api/auth/profil → 200"""
        res = client.put('/api/auth/profil',
                         json={'contact': '77 999 00 11'},
                         headers=headers_raf)
        assert res.status_code == 200

    def test_changer_mot_de_passe_valide(self, client, headers_comptable):
        """PUT /api/auth/change-password valide → 200"""
        res = client.put('/api/auth/change-password',
                         json={'ancien_password': 'comptable123',
                               'nouveau_password': 'nouveau123'},
                         headers=headers_comptable)
        assert res.status_code == 200

    def test_changer_mot_de_passe_mauvais_ancien(self, client, headers_raf):
        """PUT /api/auth/change-password mauvais ancien MDP → 400"""
        res = client.put('/api/auth/change-password',
                         json={'ancien_password': 'mauvais',
                               'nouveau_password': 'nouveau123'},
                         headers=headers_raf)
        assert res.status_code == 400


class TestUtilisateurs:
    """Tests des endpoints /api/utilisateurs"""

    def test_liste_utilisateurs_raf(self, client, headers_raf):
        """T1.5 — GET /api/utilisateurs avec token RAF → 200 + liste"""
        res = client.get('/api/utilisateurs', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'utilisateurs' in data
        assert isinstance(data['utilisateurs'], list)
        assert data['total'] >= 2

    def test_liste_utilisateurs_comptable_403(self, client, headers_comptable):
        """T1.8 — GET /api/utilisateurs avec token Comptable → 403"""
        res = client.get('/api/utilisateurs', headers=headers_comptable)
        assert res.status_code == 403

    def test_recherche_utilisateur(self, client, headers_raf):
        """T1.6 — GET /api/utilisateurs?search=Diallo → 200"""
        res = client.get('/api/utilisateurs?search=Diallo', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert isinstance(data['utilisateurs'], list)

    def test_creer_utilisateur(self, client, headers_raf):
        """T1.7 — POST /api/utilisateurs → 201"""
        res = client.post('/api/utilisateurs',
                          json={
                              'nom': 'Sarr', 'prenom': 'Ibrahima',
                              'email': 'i.sarr.test@fintrack.sn',
                              'password': 'sarr123',
                              'role': 'comptable'
                          },
                          headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 201
        assert 'utilisateur' in data

    def test_creer_utilisateur_email_existant(self, client, headers_raf):
        """POST /api/utilisateurs email déjà utilisé → 409"""
        res = client.post('/api/utilisateurs',
                          json={
                              'nom': 'Dup', 'prenom': 'Test',
                              'email': 'raf@fintrack.sn',
                              'password': 'test123',
                              'role': 'comptable'
                          },
                          headers=headers_raf)
        assert res.status_code == 409

    def test_liste_utilisateurs_pagination(self, client, headers_raf):
        """Pagination correcte → nb_pages présent"""
        res = client.get('/api/utilisateurs?page=1&limit=2', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'nb_pages' in data
        assert data['page'] == 1
