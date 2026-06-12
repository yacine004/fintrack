# ── Stage 1 : Image Python ──────────────────────────────
FROM python:3.11-slim

# Répertoire de travail
WORKDIR /app

# Variables d'environnement
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Installation des dépendances système
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copie et installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copie du code source
COPY . .

# Rendre le script de démarrage exécutable
RUN chmod +x entrypoint.sh

# Exposition du port
EXPOSE 5000

# Commande de démarrage
CMD ["./entrypoint.sh"]
