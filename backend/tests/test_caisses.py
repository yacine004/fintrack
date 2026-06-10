"""
Tests Sprint 2 — Gestion des Caisses
Couvre : CRUD, toggle activation, transactions, contrôle d'accès
"""
import pytest


class TestCaisses:
    """Tests des endpoints /api/caisses"""

    def test_liste_caisses(self, client, headers_raf):
        """T2.9 — GET /api/caisses → 200 + liste + KPIs"""
        res = client.get('/api/caisses', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'caisses' in data
        assert isinstance(data['caisses'], list)
        assert len(data['caisses']) >= 2
        assert 'kpis' in data
        assert data['kpis']['solde_total'] >= 0

    def test_liste_caisses_comptable(self, client, headers_comptable):
        """Comptable peut voir les caisses → 200"""
        res = client.get('/api/caisses', headers=headers_comptable)
        assert res.status_code == 200

    def test_creer_caisse_raf(self, client, headers_raf):
        """T2.8 — POST /api/caisses avec RAF → 201"""
        res = client.post('/api/caisses',
                          json={
                              'nom': 'Caisse Test Pytest',
                              'type_caisse': 'secondaire',
                              'description': 'Caisse créée par Pytest',
                              'solde_initial': 100000
                          },
                          headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 201
        assert data['caisse']['nom'] == 'Caisse Test Pytest'
        assert data['caisse']['solde_actuel'] == 100000.0

    def test_creer_caisse_comptable_403(self, client, headers_comptable):
        """POST /api/caisses avec Comptable → 403"""
        res = client.post('/api/caisses',
                          json={
                              'nom': 'Caisse Comptable',
                              'type_caisse': 'secondaire'
                          },
                          headers=headers_comptable)
        assert res.status_code == 403

    def test_creer_caisse_nom_existant(self, client, headers_raf):
        """Nom de caisse déjà utilisé → 409"""
        res = client.post('/api/caisses',
                          json={
                              'nom': 'Caisse Principale',
                              'type_caisse': 'principale'
                          },
                          headers=headers_raf)
        assert res.status_code == 409

    def test_creer_caisse_type_invalide(self, client, headers_raf):
        """Type de caisse invalide → 400"""
        res = client.post('/api/caisses',
                          json={
                              'nom': 'Caisse Invalide',
                              'type_caisse': 'invalide'
                          },
                          headers=headers_raf)
        assert res.status_code == 400

    def test_detail_caisse(self, client, headers_raf):
        """GET /api/caisses/1 → 200 + données"""
        res = client.get('/api/caisses/1', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'solde_actuel' in data
        assert 'statut' in data

    def test_detail_caisse_inexistante(self, client, headers_raf):
        """GET /api/caisses/999 → 404"""
        res = client.get('/api/caisses/999', headers=headers_raf)
        assert res.status_code == 404

    def test_modifier_caisse(self, client, headers_raf):
        """PUT /api/caisses/1 → 200"""
        res = client.put('/api/caisses/1',
                         json={'description': 'Description mise à jour'},
                         headers=headers_raf)
        assert res.status_code == 200

    def test_toggle_caisse(self, client, headers_raf):
        """PUT /api/caisses/1/toggle → 200 + statut changé"""
        res_avant = client.get('/api/caisses/1', headers=headers_raf)
        statut_avant = res_avant.get_json()['statut']

        res = client.put('/api/caisses/1/toggle', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200

        statut_apres = data['caisse']['statut']
        assert statut_apres != statut_avant

        # Remettre l'état initial
        client.put('/api/caisses/1/toggle', headers=headers_raf)

    def test_historique_transactions(self, client, headers_raf):
        """T2.10 — GET /api/caisses/1/transactions → 200"""
        res = client.get('/api/caisses/1/transactions', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'transactions' in data
        assert 'caisse' in data

    def test_filtre_caisses_par_type(self, client, headers_raf):
        """Filtre par type principale → caisses filtrées"""
        res = client.get('/api/caisses?type=principale', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        for c in data['caisses']:
            assert c['type_caisse'] == 'principale'
