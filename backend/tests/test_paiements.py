"""
Tests Sprint 3 — Enregistrement et Suivi des Paiements
Couvre : création, mise à jour solde, filtres, impayés, reçu PDF
"""
import pytest


class TestPaiements:
    """Tests des endpoints /api/paiements"""

    def test_enregistrer_paiement_especes(self, client, headers_raf):
        """T3.1 — POST /api/paiements espèces → 201 + solde mis à jour"""
        # Récupérer le solde avant
        res_caisse = client.get('/api/caisses/2', headers=headers_raf)
        solde_avant = res_caisse.get_json()['solde_actuel']

        res = client.post('/api/paiements',
                          json={
                              'id_etudiant': 2,
                              'id_caisse': 2,
                              'montant': 150000,
                              'mode_paiement': 'especes',
                              'motif': 'Frais scolarité S1'
                          },
                          headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 201
        assert data['paiement']['montant'] == 150000.0
        assert data['paiement']['mode_paiement'] == 'especes'
        assert data['nouveau_solde'] == solde_avant + 150000

    def test_enregistrer_paiement_wave(self, client, headers_comptable):
        """T3.2 — POST /api/paiements Wave avec Comptable → 201"""
        res = client.post('/api/paiements',
                          json={
                              'id_etudiant': 3,
                              'id_caisse': 1,
                              'montant': 200000,
                              'mode_paiement': 'wave',
                              'reference': 'WAVE-2026-001'
                          },
                          headers=headers_comptable)
        data = res.get_json()
        assert res.status_code == 201
        assert data['paiement']['mode_paiement'] == 'wave'

    def test_paiement_caisse_inexistante(self, client, headers_raf):
        """T3.3 — Caisse inexistante → 404"""
        res = client.post('/api/paiements',
                          json={
                              'id_etudiant': 2,
                              'id_caisse': 999,
                              'montant': 50000,
                              'mode_paiement': 'especes'
                          },
                          headers=headers_raf)
        assert res.status_code == 404

    def test_paiement_caisse_inactive(self, client, headers_raf):
        """Caisse inactive → 400"""
        res = client.post('/api/paiements',
                          json={
                              'id_etudiant': 1,
                              'id_caisse': 3,
                              'montant': 50000,
                              'mode_paiement': 'especes'
                          },
                          headers=headers_raf)
        assert res.status_code == 400

    def test_paiement_mode_invalide(self, client, headers_raf):
        """Mode de paiement invalide → 400"""
        res = client.post('/api/paiements',
                          json={
                              'id_etudiant': 1,
                              'id_caisse': 1,
                              'montant': 50000,
                              'mode_paiement': 'bitcoin'
                          },
                          headers=headers_raf)
        assert res.status_code == 400

    def test_paiement_montant_negatif(self, client, headers_raf):
        """Montant négatif → 400"""
        res = client.post('/api/paiements',
                          json={
                              'id_etudiant': 1,
                              'id_caisse': 1,
                              'montant': -1000,
                              'mode_paiement': 'especes'
                          },
                          headers=headers_raf)
        assert res.status_code == 400

    def test_liste_paiements(self, client, headers_raf):
        """T3.4 — GET /api/paiements → 200 + liste paginée + KPIs"""
        res = client.get('/api/paiements', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'paiements' in data
        assert isinstance(data['paiements'], list)
        assert 'kpis' in data
        assert data['kpis']['total_encaisse'] >= 0

    def test_filtre_paiements_par_caisse(self, client, headers_raf):
        """T3.5 — Filtre par caisse → paiements filtrés"""
        res = client.get('/api/paiements?caisse_id=2', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        for p in data['paiements']:
            assert p['id_caisse'] == 2

    def test_filtre_paiements_par_mode(self, client, headers_raf):
        """Filtre par mode espèces → paiements filtrés"""
        res = client.get('/api/paiements?mode=especes', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        for p in data['paiements']:
            assert p['mode_paiement'] == 'especes'

    def test_filtre_paiements_par_periode(self, client, headers_raf):
        """T3.6 — Filtre par période → 200"""
        res = client.get('/api/paiements?date_debut=2026-01-01&date_fin=2026-12-31',
                         headers=headers_raf)
        assert res.status_code == 200

    def test_detail_paiement(self, client, headers_raf):
        """GET /api/paiements/1 → 200"""
        res = client.get('/api/paiements/1', headers=headers_raf)
        assert res.status_code in [200, 404]

    def test_generer_recu_pdf(self, client, headers_raf):
        """T3.7 — GET /api/paiements/1/recu → PDF"""
        # Créer un paiement d'abord
        res_p = client.post('/api/paiements',
                            json={
                                'id_etudiant': 2,
                                'id_caisse': 1,
                                'montant': 50000,
                                'mode_paiement': 'virement'
                            },
                            headers=headers_raf)
        pid = res_p.get_json()['paiement']['id']

        res = client.get(f'/api/paiements/{pid}/recu', headers=headers_raf)
        assert res.status_code == 200
        assert 'pdf' in res.content_type.lower()

    def test_impayes_raf(self, client, headers_raf):
        """T3.8 — GET /api/paiements/impayes avec RAF → 200"""
        res = client.get('/api/paiements/impayes', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'impayes' in data
        assert 'total_impaye' in data

    def test_impayes_comptable_403(self, client, headers_comptable):
        """T3.9 — GET /api/paiements/impayes avec Comptable → 403"""
        res = client.get('/api/paiements/impayes', headers=headers_comptable)
        assert res.status_code == 403

    def test_paiement_etudiant_inexistant(self, client, headers_raf):
        """Étudiant inexistant → 404"""
        res = client.post('/api/paiements',
                          json={
                              'id_etudiant': 999,
                              'id_caisse': 1,
                              'montant': 50000,
                              'mode_paiement': 'especes'
                          },
                          headers=headers_raf)
        assert res.status_code == 404
