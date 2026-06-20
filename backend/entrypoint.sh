#!/bin/sh
set -e

# bootstrap_db() (appelé par wsgi.py) gère déjà la création des tables, les
# migrations et le seed conditionnel. --preload garantit qu'il ne s'exécute
# qu'une seule fois (dans le process maître), avant le fork des workers —
# sans ce flag, les 2 workers l'exécuteraient chacun en parallèle au premier
# démarrage, avec un risque de race condition sur une base vide.
echo "==> Démarrage de gunicorn..."
exec gunicorn wsgi:app --bind 0.0.0.0:5000 --workers 2 --timeout 120 --preload
