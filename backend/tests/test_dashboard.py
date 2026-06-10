"""
Tests Sprint 5 — Dashboard & Rapports Financiers
Couvre : KPIs, évolution, génération PDF/Excel, historique
"""
import pytest


class TestDashboard:
    """Tests des endpoints /api/dashboard"""

    def test_dashboard_raf(self, client, headers_raf):
        """T5.1 — GET /api/dashboard avec RAF → 200 + KPIs complets"""
        res = client.get('/api/dashboard', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'kpis' in data
        assert 'evolution' in data
        assert 'top_caisses' in data
        assert 'repartition_modes' in data

    def test_dashboard_kpis_types(self, client, headers_raf):
        """KPIs ont les bons types"""
        res = client.get('/api/dashboard', headers=headers_raf)
        data = res.get_json()
        kpis = data['kpis']
        assert isinstance(kpis['total_encaisse'], (int, float))
        assert isinstance(kpis['total_depense'], (int, float))
        assert isinstance(kpis['solde_global'], (int, float))
        assert isinstance(kpis['nb_etudiants_actifs'], int)

    def test_dashboard_evolution_6_mois(self, client, headers_raf):
        """Évolution sur exactement 6 mois"""
        res = client.get('/api/dashboard', headers=headers_raf)
        data = res.get_json()
        assert len(data['evolution']) == 6
        for mois in data['evolution']:
            assert 'mois' in mois
            assert 'recettes' in mois
            assert 'depenses' in mois

    def test_dashboard_filtre_caisse(self, client, headers_raf):
        """T5.2 — GET /api/dashboard?caisse_id=1 → 200"""
        res = client.get('/api/dashboard?caisse_id=1', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'kpis' in data

    def test_dashboard_comptable(self, client, headers_comptable):
        """Dashboard accessible au Comptable → 200"""
        res = client.get('/api/dashboard', headers=headers_comptable)
        assert res.status_code == 200

    def test_dashboard_sans_token(self, client):
        """Sans token → 401"""
        res = client.get('/api/dashboard')
        assert res.status_code == 401

    def test_dashboard_alertes_budget(self, client, headers_raf):
        """Alertes budget présentes dans la réponse RAF"""
        res = client.get('/api/dashboard', headers=headers_raf)
        data = res.get_json()
        assert 'alertes_budget' in data
        assert isinstance(data['alertes_budget'], list)


class TestRapports:
    """Tests des endpoints /api/rapports"""

    def test_generer_rapport_mensuel_pdf(self, client, headers_raf):
        """T5.3 — POST /api/rapports mensuel PDF → 201"""
        res = client.post('/api/rapports',
                          json={
                              'type': 'mensuel',
                              'periode': '2026-06',
                              'format': 'pdf'
                          },
                          headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 201
        assert data['rapport']['type'] == 'mensuel'
        assert data['rapport']['format'] == 'pdf'
        assert 'donnees' in data
        assert 'total_recettes' in data['donnees']

    def test_generer_rapport_annuel_excel(self, client, headers_raf):
        """T5.4 — POST /api/rapports annuel Excel → 201"""
        res = client.post('/api/rapports',
                          json={
                              'type': 'annuel',
                              'periode': '2026',
                              'format': 'excel'
                          },
                          headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 201
        assert data['rapport']['type'] == 'annuel'
        assert data['rapport']['format'] == 'excel'

    def test_generer_rapport_trimestriel(self, client, headers_raf):
        """POST /api/rapports trimestriel → 201"""
        res = client.post('/api/rapports',
                          json={
                              'type': 'trimestriel',
                              'periode': '2026T2',
                              'format': 'pdf'
                          },
                          headers=headers_raf)
        assert res.status_code == 201

    def test_generer_rapport_type_invalide(self, client, headers_raf):
        """Type de rapport invalide → 400"""
        res = client.post('/api/rapports',
                          json={
                              'type': 'hebdomadaire',
                              'periode': '2026-06',
                              'format': 'pdf'
                          },
                          headers=headers_raf)
        assert res.status_code == 400

    def test_generer_rapport_format_invalide(self, client, headers_raf):
        """Format invalide → 400"""
        res = client.post('/api/rapports',
                          json={
                              'type': 'mensuel',
                              'periode': '2026-06',
                              'format': 'word'
                          },
                          headers=headers_raf)
        assert res.status_code == 400

    def test_exporter_rapport_pdf(self, client, headers_raf):
        """T5.5 — GET /api/rapports/<id>/export?format=pdf → PDF"""
        res_create = client.post('/api/rapports',
                                 json={'type': 'mensuel', 'periode': '2026-05', 'format': 'pdf'},
                                 headers=headers_raf)
        rid = res_create.get_json()['rapport']['id']

        res = client.get(f'/api/rapports/{rid}/export?format=pdf', headers=headers_raf)
        assert res.status_code == 200
        assert 'pdf' in res.content_type.lower()

    def test_exporter_rapport_excel(self, client, headers_raf):
        """T5.6 — GET /api/rapports/<id>/export?format=excel → Excel"""
        res_create = client.post('/api/rapports',
                                 json={'type': 'mensuel', 'periode': '2026-04', 'format': 'excel'},
                                 headers=headers_raf)
        rid = res_create.get_json()['rapport']['id']

        res = client.get(f'/api/rapports/{rid}/export?format=excel', headers=headers_raf)
        assert res.status_code == 200
        assert 'spreadsheetml' in res.content_type.lower()

    def test_historique_rapports(self, client, headers_raf):
        """T5.7 — GET /api/rapports → 200 + liste"""
        res = client.get('/api/rapports', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'rapports' in data
        assert isinstance(data['rapports'], list)
        assert data['total'] >= 1

    def test_rapport_inexistant(self, client, headers_raf):
        """Export rapport inexistant → 404"""
        res = client.get('/api/rapports/999/export?format=pdf', headers=headers_raf)
        assert res.status_code == 404
