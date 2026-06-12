#!/bin/bash
# ================================================================
# Script d'installation DevOps — FinTrack
# VPS Ubuntu 22.04 — OVH
# Usage : bash install_vps.sh
# ================================================================

set -e  # Arrêt si erreur

echo "========================================"
echo "  FinTrack — Installation DevOps VPS"
echo "========================================"
echo ""

# ── 1. Mise à jour du système ────────────────────────────
echo "📦 [1/6] Mise à jour du système..."
sudo apt update && sudo apt upgrade -y
echo "✅ Système mis à jour"
echo ""

# ── 2. Installation de Docker ────────────────────────────
echo "🐳 [2/6] Installation de Docker..."
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
echo "✅ Docker installé : $(docker --version)"
echo "✅ Docker Compose : $(docker-compose --version)"
echo ""

# ── 3. Installation de Java + Jenkins ───────────────────
echo "⚙️  [3/6] Installation de Jenkins..."
sudo apt install openjdk-17-jdk -y

curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt update
sudo apt install jenkins -y
sudo systemctl enable jenkins
sudo systemctl start jenkins
echo "✅ Jenkins installé et démarré"
echo ""

# ── 4. Installation de Nginx ────────────────────────────
echo "🌐 [4/6] Installation de Nginx..."
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
echo "✅ Nginx installé et démarré"
echo ""

# ── 5. Clone du projet ──────────────────────────────────
echo "📥 [5/6] Clone du repository GitHub..."
cd /home/ubuntu
if [ -d "fintrack" ]; then
  echo "⚠️  Dossier fintrack existant — mise à jour..."
  cd fintrack && git pull origin main
else
  git clone https://github.com/yacine004/fintrack.git
  cd fintrack
fi
git checkout main
echo "✅ Repository cloné — branche : $(git branch --show-current)"
echo ""

# ── 6. Lancement de l'application ───────────────────────
echo "🚀 [6/6] Lancement de FinTrack avec Docker Compose..."
docker-compose up -d --build
sleep 15
echo ""
echo "✅ Conteneurs démarrés :"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# ── Résumé ──────────────────────────────────────────────
VPS_IP=$(curl -s ifconfig.me)
echo "========================================"
echo "  ✅ INSTALLATION TERMINÉE !"
echo "========================================"
echo ""
echo "🌐 Application : http://$VPS_IP"
echo "⚙️  Jenkins    : http://$VPS_IP:8080"
echo ""
echo "🔑 Mot de passe Jenkins initial :"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
echo ""
echo "========================================"
