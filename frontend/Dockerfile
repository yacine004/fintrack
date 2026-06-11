# ── Stage 1 : Build React ───────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du code source
COPY . .

# Variables d'environnement pour le build
ARG VITE_API_URL=http://51.91.59.61/api
ENV VITE_API_URL=${VITE_API_URL}

# Build de l'application React
RUN npm run build

# ── Stage 2 : Serveur Nginx ──────────────────────────────
FROM nginx:alpine

# Copie du build React vers Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copie de la configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposition du port
EXPOSE 80

# Démarrage de Nginx
CMD ["nginx", "-g", "daemon off;"]
