# -*- coding: utf-8 -*-
"""Point d'entrée production (gunicorn wsgi:app).

bootstrap_db() crée les tables/colonnes manquantes et ne seed des comptes/données
de démo que si les tables sont vides — il ne supprime JAMAIS de données existantes.
"""
from app import create_app
from db_bootstrap import bootstrap_db

app = create_app()
bootstrap_db(app)
