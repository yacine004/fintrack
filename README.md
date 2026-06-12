# FinTrack — Guide DevOps VPS

## Informations du Serveur

| Paramètre | Valeur |
|-----------|--------|
| IP | 51.91.59.61 |
| OS | Ubuntu 22.04 LTS |
| User | ubuntu |
| VPS | vps-5342b880.vps.ovh.net |

## Accès

- **Application** : http://51.91.59.61
- **Jenkins CI/CD** : http://51.91.59.61:8080

## Installation Rapide

```bash
# Se connecter au VPS
ssh ubuntu@51.91.59.61

# Lancer le script d'installation automatique
bash install_vps.sh
```

## Structure des Fichiers DevOps

```
fintrack/
├── docker-compose.yml      ← Orchestration des 3 conteneurs
├── Jenkinsfile             ← Pipeline CI/CD
├── install_vps.sh          ← Script d'installation automatique
├── .gitignore
├── backend/
│   └── Dockerfile          ← Image Flask + Gunicorn
└── frontend/
    ├── Dockerfile          ← Image React + Nginx (multi-stage)
    └── nginx.conf          ← Configuration reverse proxy
```

## Commandes Utiles

```bash
# Voir les conteneurs actifs
docker ps

# Voir les logs du backend
docker logs fintrack_backend -f

# Redémarrer l'application
docker-compose restart

# Rebuilder après modification du code
docker-compose up -d --build

# Arrêter l'application
docker-compose down

# Voir l'utilisation des ressources
docker stats
```

## Pipeline Jenkins

1. Ouvrir http://51.91.59.61:8080
2. Créer un pipeline "FinTrack-Pipeline"
3. Pointer vers le Jenkinsfile du repo GitHub
4. Lancer "Build Now"

## Comptes de Test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| RAF | raf@fintrack.sn | raf123 |
| Comptable | comptable@fintrack.sn | comptable123 |
