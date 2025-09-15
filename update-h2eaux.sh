#!/bin/bash

# =============================================================================
# SCRIPT DE MISE À JOUR H2EAUX GESTION - DEPUIS PC VERS SERVEUR OVH
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration par défaut (modifiez selon vos paramètres)
DEFAULT_SSH_HOST="votre-serveur-ovh.com"
DEFAULT_SSH_USER="root"
DEFAULT_SSH_KEY=""  # Chemin vers votre clé SSH (optionnel)
DEFAULT_APP_PATH="/var/www/h2eaux-gestion"
DEFAULT_DOMAIN="votre-domaine.com"

echo -e "${BLUE}🚀 MISE À JOUR H2EAUX GESTION PWA${NC}"
echo "======================================"

# Récupération des paramètres ou utilisation des valeurs par défaut
SSH_HOST=${1:-$DEFAULT_SSH_HOST}
SSH_USER=${2:-$DEFAULT_SSH_USER}
APP_PATH=${3:-$DEFAULT_APP_PATH}
DOMAIN=${4:-$DEFAULT_DOMAIN}

# Vérification des paramètres
if [ "$SSH_HOST" = "votre-serveur-ovh.com" ]; then
    echo -e "${YELLOW}⚠️ Configuration requise${NC}"
    echo "Usage: $0 <serveur> [utilisateur] [chemin-app] [domaine]"
    echo "Exemple: $0 monserveur.ovh.com root /var/www/h2eaux-gestion mondomaine.com"
    echo ""
    read -p "Entrez l'adresse de votre serveur OVH: " SSH_HOST
    read -p "Utilisateur SSH [$SSH_USER]: " input_user
    SSH_USER=${input_user:-$SSH_USER}
    read -p "Chemin de l'application [$APP_PATH]: " input_path
    APP_PATH=${input_path:-$APP_PATH}
    read -p "Votre domaine [$DOMAIN]: " input_domain
    DOMAIN=${input_domain:-$DOMAIN}
fi

echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "${BLUE}   Serveur: $SSH_HOST${NC}"
echo -e "${BLUE}   Utilisateur: $SSH_USER${NC}"
echo -e "${BLUE}   Chemin app: $APP_PATH${NC}"
echo -e "${BLUE}   Domaine: $DOMAIN${NC}"
echo ""

# Configuration SSH
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"
if [ -n "$DEFAULT_SSH_KEY" ] && [ -f "$DEFAULT_SSH_KEY" ]; then
    SSH_OPTS="$SSH_OPTS -i $DEFAULT_SSH_KEY"
fi

SSH_CMD="ssh $SSH_OPTS $SSH_USER@$SSH_HOST"

# Fonction de test de connexion
test_ssh_connection() {
    echo -e "${YELLOW}🔐 Test de connexion SSH...${NC}"
    if $SSH_CMD "echo 'Connexion SSH OK'" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Connexion SSH réussie${NC}"
        return 0
    else
        echo -e "${RED}❌ Impossible de se connecter au serveur${NC}"
        echo "Vérifiez:"
        echo "- L'adresse du serveur: $SSH_HOST"
        echo "- L'utilisateur: $SSH_USER"
        echo "- Vos clés SSH ou mot de passe"
        echo "- La connectivité réseau"
        exit 1
    fi
}

# Fonction de sauvegarde
create_backup() {
    echo -e "${YELLOW}💾 Création de sauvegarde...${NC}"
    
    BACKUP_SCRIPT=$(cat << 'EOF'
BACKUP_DIR="/backup/h2eaux-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR" 2>/dev/null || sudo mkdir -p "$BACKUP_DIR"

# Sauvegarde de l'application
if [ -d "APP_PATH_PLACEHOLDER" ]; then
    cp -r "APP_PATH_PLACEHOLDER" "$BACKUP_DIR/app" 2>/dev/null || sudo cp -r "APP_PATH_PLACEHOLDER" "$BACKUP_DIR/app"
fi

# Sauvegarde base de données
if command -v mongodump >/dev/null 2>&1; then
    mongodump --db h2eaux_gestion --out "$BACKUP_DIR/db" 2>/dev/null || echo "Base de données non sauvegardée"
fi

echo "Sauvegarde créée: $BACKUP_DIR"
EOF
    )
    
    # Remplacer le placeholder
    BACKUP_SCRIPT=${BACKUP_SCRIPT//APP_PATH_PLACEHOLDER/$APP_PATH}
    
    $SSH_CMD "$BACKUP_SCRIPT"
}

# Fonction de mise à jour Git
update_git() {
    echo -e "${YELLOW}📥 Mise à jour du code (git pull)...${NC}"
    
    UPDATE_SCRIPT=$(cat << 'EOF'
cd "APP_PATH_PLACEHOLDER" || { echo "Erreur: dossier APP_PATH_PLACEHOLDER introuvable"; exit 1; }

# Vérification que c'est un repository Git
if [ ! -d ".git" ]; then
    echo "Erreur: Ce n'est pas un repository Git"
    exit 1
fi

# Sauvegarder les modifications locales si nécessaire
if ! git diff --quiet; then
    echo "Sauvegarde des modifications locales..."
    git stash push -m "Auto-stash before update $(date)"
fi

# Récupération des dernières modifications
echo "Récupération des dernières modifications..."
git fetch origin

# Vérification des conflits potentiels
if git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main | grep -q "<<<<<<< "; then
    echo "Attention: Conflits potentiels détectés"
    echo "Mise à jour forcée..."
    git reset --hard origin/main
else
    git pull origin main
fi

echo "✅ Code mis à jour"
EOF
    )
    
    UPDATE_SCRIPT=${UPDATE_SCRIPT//APP_PATH_PLACEHOLDER/$APP_PATH}
    
    if $SSH_CMD "$UPDATE_SCRIPT"; then
        echo -e "${GREEN}✅ Code mis à jour avec succès${NC}"
    else
        echo -e "${RED}❌ Erreur lors de la mise à jour Git${NC}"
        exit 1
    fi
}

# Fonction de mise à jour des dépendances
update_dependencies() {
    echo -e "${YELLOW}📦 Mise à jour des dépendances...${NC}"
    
    DEPS_SCRIPT=$(cat << 'EOF'
cd "APP_PATH_PLACEHOLDER" || exit 1

# Mise à jour dépendances Python
if [ -f "backend/requirements.txt" ]; then
    echo "Mise à jour dépendances Python..."
    cd backend
    if [ -d "venv" ]; then
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        echo "✅ Dépendances Python mises à jour"
    else
        echo "⚠️ Environnement virtuel non trouvé, création..."
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        echo "✅ Environnement virtuel créé et dépendances installées"
    fi
    cd ..
fi

# Vérification des permissions
chown -R www-data:www-data . 2>/dev/null || sudo chown -R www-data:www-data .
chmod -R 755 . 2>/dev/null || sudo chmod -R 755 .
EOF
    )
    
    DEPS_SCRIPT=${DEPS_SCRIPT//APP_PATH_PLACEHOLDER/$APP_PATH}
    
    $SSH_CMD "$DEPS_SCRIPT"
}

# Fonction de redémarrage des services
restart_services() {
    echo -e "${YELLOW}🔄 Redémarrage des services...${NC}"
    
    SERVICE_SCRIPT=$(cat << 'EOF'
# Redémarrage Supervisor (si configuré)
if command -v supervisorctl >/dev/null 2>&1; then
    echo "Redémarrage services Supervisor..."
    supervisorctl restart h2eaux-backend h2eaux-frontend 2>/dev/null || sudo supervisorctl restart h2eaux-backend h2eaux-frontend 2>/dev/null || echo "Services Supervisor non configurés"
fi

# Redémarrage manuel si nécessaire
echo "Arrêt des processus existants..."
pkill -f "uvicorn.*server:app" 2>/dev/null || true
pkill -f "python3.*http.server.*3000" 2>/dev/null || true

sleep 2

# Redémarrage Backend
echo "Démarrage Backend..."
cd "APP_PATH_PLACEHOLDER/backend" || exit 1
if [ -d "venv" ]; then
    source venv/bin/activate
    nohup uvicorn server:app --host 0.0.0.0 --port 8001 > backend.log 2>&1 &
    echo "Backend démarré"
else
    echo "❌ Environnement virtuel Backend non trouvé"
fi

# Redémarrage Frontend
echo "Démarrage Frontend..."
cd "APP_PATH_PLACEHOLDER/frontend" || exit 1
nohup python3 -m http.server 3000 > frontend.log 2>&1 &
echo "Frontend démarré"

# Reload Nginx
echo "Rechargement Nginx..."
nginx -t && systemctl reload nginx 2>/dev/null || sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || echo "Erreur Nginx"

sleep 3
echo "✅ Services redémarrés"
EOF
    )
    
    SERVICE_SCRIPT=${SERVICE_SCRIPT//APP_PATH_PLACEHOLDER/$APP_PATH}
    
    $SSH_CMD "$SERVICE_SCRIPT"
}

# Fonction de validation
validate_update() {
    echo -e "${YELLOW}🧪 Validation de la mise à jour...${NC}"
    
    VALIDATION_SCRIPT=$(cat << EOF
# Test Backend
echo "Test Backend..."
if curl -f -s http://localhost:8001/api/health >/dev/null 2>&1; then
    echo "✅ Backend opérationnel"
else
    echo "❌ Backend non accessible"
    echo "Logs Backend:"
    tail -5 $APP_PATH/backend/backend.log 2>/dev/null || echo "Logs non disponibles"
fi

# Test Frontend
echo "Test Frontend..."
if curl -f -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend opérationnel"
else
    echo "❌ Frontend non accessible"
    echo "Logs Frontend:"
    tail -5 $APP_PATH/frontend/frontend.log 2>/dev/null || echo "Logs non disponibles"
fi

# Test Application complète
echo "Test Application complète..."
if curl -f -s "http://$DOMAIN/api/health" >/dev/null 2>&1; then
    echo "✅ Application accessible via $DOMAIN"
else
    echo "⚠️ Application pas encore accessible via $DOMAIN"
fi

# Vérification version
echo "Vérification version Git..."
cd $APP_PATH
CURRENT_COMMIT=\$(git rev-parse --short HEAD)
echo "Version actuelle: \$CURRENT_COMMIT"
EOF
    )
    
    $SSH_CMD "$VALIDATION_SCRIPT"
}

# Fonction principale
main() {
    echo -e "${BLUE}Début de la mise à jour...${NC}"
    echo ""
    
    # Confirmation
    echo -e "${YELLOW}⚠️ Cette opération va:${NC}"
    echo "1. Créer une sauvegarde"
    echo "2. Mettre à jour le code (git pull)"
    echo "3. Mettre à jour les dépendances"
    echo "4. Redémarrer les services"
    echo "5. Recharger Nginx"
    echo "6. Valider la mise à jour"
    echo ""
    read -p "Continuer ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Mise à jour annulée"
        exit 1
    fi
    
    # Exécution des étapes
    test_ssh_connection
    create_backup
    update_git
    update_dependencies
    restart_services
    validate_update
    
    echo ""
    echo -e "${GREEN}🎉 MISE À JOUR TERMINÉE AVEC SUCCÈS !${NC}"
    echo -e "${BLUE}🌐 Votre application est accessible sur: https://$DOMAIN${NC}"
    echo -e "${BLUE}👤 Comptes: admin/admin123 et employe1/employe123${NC}"
    echo ""
    echo -e "${YELLOW}📊 Commandes utiles pour surveiller:${NC}"
    echo -e "${BLUE}   Logs Backend: ssh $SSH_USER@$SSH_HOST 'tail -f $APP_PATH/backend/backend.log'${NC}"
    echo -e "${BLUE}   Logs Frontend: ssh $SSH_USER@$SSH_HOST 'tail -f $APP_PATH/frontend/frontend.log'${NC}"
    echo -e "${BLUE}   Status services: ssh $SSH_USER@$SSH_HOST 'sudo supervisorctl status'${NC}"
}

# Gestion des signaux pour nettoyage
trap 'echo -e "\n${YELLOW}Interruption détectée. Nettoyage...${NC}"; exit 1' INT TERM

# Point d'entrée
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi