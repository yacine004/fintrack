"""
Tests Sprint 4 — Gestion des Dépenses & Contrôle Budgétaire
Couvre : création dépense, validation/rejet, CRUD budgets, alertes
"""
import pytest


class TestDepenses:
    """Tests des endpoints /api/depenses"""

    def test_enregistrer_depense(self, client, headers_raf):
        """T4.3 — POST /api/depenses → 201 + solde débité"""
        res_caisse = client.get('/api/caisses/1', headers=headers_raf)
        solde_avant = res_caisse.get_json()['solde_actuel']

        res = client.post('/api/depenses',
                          json={
                              'id_caisse': 1,
                              'montant': 50000,
                              'motif': 'Achat fournitures bureau',
                              'categorie': 'Fournitures'
                          },
                          headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 201
        assert data['depense']['montant'] == 50000.0
        assert data['depense']['statut'] == 'en_attente'
        assert data['nouveau_solde'] == solde_avant - 50000

    def test_enregistrer_depense_comptable(self, client, headers_comptable):
        """Comptable peut enregistrer une dépense → 201"""
        res = client.post('/api/depenses',
                          json={
                              'id_caisse': 1,
                              'montant': 10000,
                              'motif': 'Test comptable'
                          },
                          headers=headers_comptable)
        assert res.status_code == 201

    def test_depense_caisse_inactive(self, client, headers_raf):
        """Caisse inactive → 400"""
        res = client.post('/api/depenses',
                          json={
                              'id_caisse': 3,
                              'montant': 10000,
                              'motif': 'Test caisse inactive'
                          },
                          headers=headers_raf)
        assert res.status_code == 400

    def test_depense_solde_insuffisant(self, client, headers_raf):
        """Solde insuffisant → 400"""
        res = client.post('/api/depenses',
                          json={
                              'id_caisse': 1,
                              'montant': 999999999,
                              'motif': 'Dépassement solde'
                          },
                          headers=headers_raf)
        assert res.status_code == 400

    def test_depense_champs_manquants(self, client, headers_raf):
        """Champs obligatoires manquants → 400"""
        res = client.post('/api/depenses',
                          json={'montant': 10000},
                          headers=headers_raf)
        assert res.status_code == 400

    def test_depense_avec_alerte_budget(self, client, headers_raf):
        """T4.4 — Dépense dépassant budget → 201 + alerte_budget"""
        res = client.post('/api/depenses',
                          json={
                              'id_caisse': 1,
                              'montant': 600000,
                              'motif': 'Dépassement test',
                              'categorie': 'Fournitures'
                          },
                          headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 201
        assert data.get('alerte_budget') is not None

    def test_liste_depenses(self, client, headers_raf):
        """T4.5 — GET /api/depenses → 200 + liste + KPIs"""
        res = client.get('/api/depenses', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'depenses' in data
        assert 'kpis' in data
        assert data['kpis']['total_depenses'] >= 0

    def test_filtre_depenses_par_statut(self, client, headers_raf):
        """Filtre par statut en_attente → dépenses filtrées"""
        res = client.get('/api/depenses?statut=en_attente', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        for d in data['depenses']:
            assert d['statut'] == 'en_attente'

    def test_valider_depense_raf(self, client, headers_raf):
        """T4.6 — PUT /api/depenses/<id>/valider avec RAF → 200"""
        # Créer une dépense en attente
        res_d = client.post('/api/depenses',
                            json={
                                'id_caisse': 1,
                                'montant': 5000,
                                'motif': 'À valider'
                            },
                            headers=headers_raf)
        did = res_d.get_json()['depense']['id']

        res = client.put(f'/api/depenses/{did}/valider', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert data['depense']['statut'] == 'validee'

    def test_valider_depense_comptable_403(self, client, headers_comptable):
        """T4.7 — PUT /api/depenses/<id>/valider avec Comptable → 403"""
        res = client.put('/api/depenses/1/valider', headers=headers_comptable)
        assert res.status_code == 403

    def test_rejeter_depense_raf(self, client, headers_raf):
        """T4.8 — PUT /api/depenses/<id>/rejeter avec RAF → 200 + remboursement"""
        # Créer une dépense en attente
        res_d = client.post('/api/depenses',
                            json={
                                'id_caisse': 1,
                                'montant': 5000,
                                'motif': 'À rejeter'
                            },
                            headers=headers_raf)
        did = res_d.get_json()['depense']['id']

        res_caisse = client.get('/api/caisses/1', headers=headers_raf)
        solde_avant = res_caisse.get_json()['solde_actuel']

        res = client.put(f'/api/depenses/{did}/rejeter', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert data['depense']['statut'] == 'rejetee'

        # Vérifier remboursement
        res_caisse2 = client.get('/api/caisses/1', headers=headers_raf)
        solde_apres = res_caisse2.get_json()['solde_actuel']
        assert solde_apres == solde_avant + 5000

    def test_valider_depense_deja_validee(self, client, headers_raf):
        """Valider une dépense déjà validée → 400"""
        res_d = client.post('/api/depenses',
                            json={'id_caisse': 1, 'montant': 1000, 'motif': 'Test'},
                            headers=headers_raf)
        did = res_d.get_json()['depense']['id']
        client.put(f'/api/depenses/{did}/valider', headers=headers_raf)

        res = client.put(f'/api/depenses/{did}/valider', headers=headers_raf)
        assert res.status_code == 400


class TestBudgets:
    """Tests des endpoints /api/budgets"""

    def test_liste_budgets(self, client, headers_raf):
        """T4.2 — GET /api/budgets → 200 + taux consommation"""
        res = client.get('/api/budgets?annee=2026', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'budgets' in data
        assert 'kpis' in data
        for b in data['budgets']:
            assert 'taux_consommation' in b
            assert 'montant_restant' in b

    def test_creer_budget_raf(self, client, headers_raf):
        """T4.1 — POST /api/budgets avec RAF → 201"""
        res = client.post('/api/budgets',
                          json={
                              'categorie': 'Pytest Test',
                              'montant_alloue': 300000,
                              'annee': '2026'
                          },
                          headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 201
        assert data['budget']['categorie'] == 'Pytest Test'
        assert data['budget']['montant_alloue'] == 300000.0

    def test_creer_budget_comptable_403(self, client, headers_comptable):
        """POST /api/budgets avec Comptable → 403"""
        res = client.post('/api/budgets',
                          json={
                              'categorie': 'Test Comptable',
                              'montant_alloue': 100000,
                              'annee': '2026'
                          },
                          headers=headers_comptable)
        assert res.status_code == 403

    def test_creer_budget_categorie_existante(self, client, headers_raf):
        """Catégorie + année déjà existante → 409"""
        res = client.post('/api/budgets',
                          json={
                              'categorie': 'Fournitures',
                              'montant_alloue': 100000,
                              'annee': '2026'
                          },
                          headers=headers_raf)
        assert res.status_code == 409

    def test_modifier_budget(self, client, headers_raf):
        """PUT /api/budgets/1 → 200"""
        res = client.put('/api/budgets/1',
                         json={'montant_alloue': 600000},
                         headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert data['budget']['montant_alloue'] == 600000.0

    def test_supprimer_budget(self, client, headers_raf):
        """DELETE /api/budgets → 200"""
        res_create = client.post('/api/budgets',
                                 json={
                                     'categorie': 'À supprimer',
                                     'montant_alloue': 100000,
                                     'annee': '2026'
                                 },
                                 headers=headers_raf)
        bid = res_create.get_json()['budget']['id']

        res = client.delete(f'/api/budgets/{bid}', headers=headers_raf)
        assert res.status_code == 200
