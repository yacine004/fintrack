"""Point d'entree WSGI pour gunicorn."""
from app import create_app

app = create_app()
