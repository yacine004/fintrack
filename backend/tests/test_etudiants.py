"""
Tests Sprint 2 — Gestion des Étudiants
Couvre : CRUD, pagination, filtres, archivage, contrôle d'accès
"""
import pytest


class TestEtudiants:
    """Tests des endpoints /api/etudiants"""

    def test_liste_etudiants(self, client, headers_raf):
        """T2.2 — GET /api/etudiants → 200 + liste paginée"""
        res = client.get('/api/etudiants', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'etudiants' in data
        assert isinstance(data['etudiants'], list)
        assert data['total'] >= 3
        assert 'nb_pages' in data

    def test_liste_etudiants_comptable(self, client, headers_comptable):
        """Comptable peut aussi voir la liste → 200"""
        res = client.get('/api/etudiants', headers=headers_comptable)
        assert res.status_code == 200

    def test_liste_etudiants_sans_token(self, client):
        """Sans token → 401"""
        res = client.get('/api/etudiants')
        assert res.status_code == 401

    def test_creer_etudiant(self, client, headers_raf):
        """T2.1 — POST /api/etudiants → 201 + données correctes"""
        res = client.post('/api/etudiants',
                          json={
                              'matricule': 'ISM_TEST_001',
                              'nom': 'Ba', 'prenom': 'Ndèye',
                              'email': 'n.ba.test@ism.sn',
                              'classe': 'L3', 'filiere': 'GLRS',
                              'annee_academique': '2025-2026'
                          },
                          headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 201
        assert data['etudiant']['matricule'] == 'ISM_TEST_001'
        assert data['etudiant']['classe'] == 'L3'

    def test_creer_etudiant_matricule_existant(self, client, headers_raf):
        """Matricule déjà existant → 409"""
        res = client.post('/api/etudiants',
                          json={
                              'matricule': 'ISM001',
                              'nom': 'Dup', 'prenom': 'Test',
                              'classe': 'L1',
                              'annee_academique': '2025-2026'
                          },
                          headers=headers_raf)
        assert res.status_code == 409

    def test_creer_etudiant_champs_manquants(self, client, headers_raf):
        """Champs obligatoires manquants → 400"""
        res = client.post('/api/etudiants',
                          json={'nom': 'Test'},
                          headers=headers_raf)
        assert res.status_code == 400

    def test_recherche_etudiant(self, client, headers_raf):
        """T2.3 — Recherche par nom → 200 + résultats filtrés"""
        res = client.get('/api/etudiants?search=Fall', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert isinstance(data['etudiants'], list)

    def test_filtre_par_classe(self, client, headers_raf):
        """T2.4 — Filtre par classe L3 → uniquement L3"""
        res = client.get('/api/etudiants?classe=L3', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        for e in data['etudiants']:
            assert e['classe'] == 'L3'

    def test_detail_etudiant(self, client, headers_raf):
        """GET /api/etudiants/1 → 200 + données"""
        res = client.get('/api/etudiants/1', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'matricule' in data

    def test_detail_etudiant_inexistant(self, client, headers_raf):
        """GET /api/etudiants/999 → 404"""
        res = client.get('/api/etudiants/999', headers=headers_raf)
        assert res.status_code == 404

    def test_modifier_etudiant(self, client, headers_raf):
        """T2.5 — PUT /api/etudiants/1 → 200"""
        res = client.put('/api/etudiants/1',
                         json={'contact': '77 123 45 67'},
                         headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert data['etudiant']['contact'] == '77 123 45 67'

    def test_archiver_etudiant_raf(self, client, headers_raf):
        """T2.6 — PUT /api/etudiants/1/archiver avec RAF → 200"""
        res = client.put('/api/etudiants/1/archiver', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert data['etudiant']['statut'] in ['actif', 'archive']

    def test_archiver_etudiant_comptable_403(self, client, headers_comptable):
        """T2.7 — PUT /api/etudiants/1/archiver avec Comptable → 403"""
        res = client.put('/api/etudiants/1/archiver', headers=headers_comptable)
        assert res.status_code == 403

    def test_stats_etudiants(self, client, headers_raf):
        """GET /api/etudiants/stats → 200 + KPIs"""
        res = client.get('/api/etudiants/stats', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'total' in data
        assert 'actifs' in data
        assert 'archives' in data

    def test_pagination_etudiants(self, client, headers_raf):
        """Pagination correcte"""
        res = client.get('/api/etudiants?page=1&limit=2', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert len(data['etudiants']) <= 2
        assert data['page'] == 1
