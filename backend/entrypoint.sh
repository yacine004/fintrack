#!/bin/sh
set -e

echo "==> Initialisation de la base de données..."
python - <<'EOF'
import subprocess, sys
from app import create_app
from extensions import db
from models import Etudiant

app = create_app()
with app.app_context():
    db.create_all()
    if db.session.query(Etudiant).count() == 0:
        print("==> Peuplement initial de la base...")
        subprocess.run([sys.executable, 'seed.py'], check=True)
    else:
        print("==> Données déjà présentes, seed ignoré.")
EOF

echo "==> Démarrage de gunicorn..."
exec gunicorn wsgi:app --bind 0.0.0.0:5000 --workers 2 --timeout 120
