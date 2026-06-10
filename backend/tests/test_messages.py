"""
Tests Sprint 6 — Messagerie, Notifications & Journal d'Audit
Couvre : envoi messages, réception, notifications, audit RAF
"""
import pytest


class TestMessages:
    """Tests des endpoints /api/messages"""

    def test_envoyer_message(self, client, headers_raf):
        """T6.2 — POST /api/messages → 201"""
        res = client.post('/api/messages',
                          json={
                              'id_destinataire': 2,
                              'objet': 'Test message Pytest',
                              'contenu': 'Contenu du message de test.'
                          },
                          headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 201
        assert data['msg']['objet'] == 'Test message Pytest'
        assert data['msg']['lu'] is False

    def test_envoyer_message_champs_manquants(self, client, headers_raf):
        """Champs obligatoires manquants → 400"""
        res = client.post('/api/messages',
                          json={'objet': 'Sans contenu'},
                          headers=headers_raf)
        assert res.status_code == 400

    def test_envoyer_message_destinataire_inexistant(self, client, headers_raf):
        """Destinataire inexistant → 404"""
        res = client.post('/api/messages',
                          json={
                              'id_destinataire': 999,
                              'objet': 'Test',
                              'contenu': 'Test'
                          },
                          headers=headers_raf)
        assert res.status_code == 404

    def test_boite_reception_comptable(self, client, headers_comptable):
        """T6.3 — GET /api/messages/recus → 200 + messages"""
        res = client.get('/api/messages/recus', headers=headers_comptable)
        data = res.get_json()
        assert res.status_code == 200
        assert 'messages' in data
        assert 'nb_non_lus' in data
        assert isinstance(data['messages'], list)

    def test_messages_envoyes_raf(self, client, headers_raf):
        """T6.5 — GET /api/messages/envoyes → 200"""
        res = client.get('/api/messages/envoyes', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'messages' in data

    def test_marquer_message_lu(self, client, headers_raf, headers_comptable):
        """T6.4 — PUT /api/messages/<id>/lu → 200 + lu = true"""
        # Envoyer un message
        res_send = client.post('/api/messages',
                               json={
                                   'id_destinataire': 2,
                                   'objet': 'À marquer lu',
                                   'contenu': 'Contenu test'
                               },
                               headers=headers_raf)
        mid = res_send.get_json()['msg']['id']

        # Marquer comme lu (par le destinataire)
        res = client.put(f'/api/messages/{mid}/lu', headers=headers_comptable)
        data = res.get_json()
        assert res.status_code == 200
        assert data['msg']['lu'] is True

    def test_marquer_message_lu_mauvais_user(self, client, headers_raf):
        """Marquer un message lu par quelqu'un d'autre → 403"""
        res_send = client.post('/api/messages',
                               json={
                                   'id_destinataire': 2,
                                   'objet': 'Test 403',
                                   'contenu': 'Test'
                               },
                               headers=headers_raf)
        mid = res_send.get_json()['msg']['id']

        # RAF essaie de marquer lu son propre message envoyé → 403
        res = client.put(f'/api/messages/{mid}/lu', headers=headers_raf)
        assert res.status_code == 403

    def test_destinataires_disponibles(self, client, headers_raf):
        """GET /api/messages/destinataires → 200 + liste"""
        res = client.get('/api/messages/destinataires', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'utilisateurs' in data
        # RAF ne doit pas se voir lui-même
        ids = [u['id'] for u in data['utilisateurs']]
        assert 1 not in ids


class TestNotifications:
    """Tests des endpoints /api/notifications"""

    def test_liste_notifications(self, client, headers_raf):
        """T6.6 — GET /api/notifications → 200"""
        res = client.get('/api/notifications', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'notifications' in data
        assert 'nb_non_lues' in data
        assert isinstance(data['notifications'], list)

    def test_liste_notifications_comptable(self, client, headers_comptable):
        """Comptable peut voir ses notifications → 200"""
        res = client.get('/api/notifications', headers=headers_comptable)
        assert res.status_code == 200

    def test_marquer_toutes_lues(self, client, headers_raf):
        """T6.7 — PUT /api/notifications/tout-lire → 200"""
        res = client.put('/api/notifications/tout-lire', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'message' in data

        # Vérifier que nb_non_lues = 0
        res2 = client.get('/api/notifications', headers=headers_raf)
        assert res2.get_json()['nb_non_lues'] == 0

    def test_notifications_sans_token(self, client):
        """Sans token → 401"""
        res = client.get('/api/notifications')
        assert res.status_code == 401


class TestAudit:
    """Tests des endpoints /api/audit"""

    def test_journal_audit_raf(self, client, headers_raf):
        """T6.8 — GET /api/audit avec RAF → 200 + logs"""
        res = client.get('/api/audit', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert 'logs' in data
        assert isinstance(data['logs'], list)
        assert 'total' in data

    def test_journal_audit_comptable_403(self, client, headers_comptable):
        """T6.10 — GET /api/audit avec Comptable → 403"""
        res = client.get('/api/audit', headers=headers_comptable)
        assert res.status_code == 403

    def test_filtre_audit_par_action(self, client, headers_raf):
        """T6.9 — GET /api/audit?action=CREATE → logs filtrés"""
        res = client.get('/api/audit?action=CREATE', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert isinstance(data['logs'], list)

    def test_filtre_audit_par_entite(self, client, headers_raf):
        """Filtre par entité → logs filtrés"""
        res = client.get('/api/audit?entite=Paiement', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200

    def test_pagination_audit(self, client, headers_raf):
        """Pagination du journal d'audit"""
        res = client.get('/api/audit?page=1&limit=5', headers=headers_raf)
        data = res.get_json()
        assert res.status_code == 200
        assert len(data['logs']) <= 5
        assert data['page'] == 1

    def test_audit_sans_token(self, client):
        """Sans token → 401"""
        res = client.get('/api/audit')
        assert res.status_code == 401
