#!/bin/bash

# =============================================================================
# SCRIPT DE VÉRIFICATION DÉPLOIEMENT H2EAUX GESTION
# =============================================================================

set -e

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_PATH="/home/deploy/h2eaux-gestion"
BACKEND_PORT=8001
DOMAIN=${1:-"localhost"}

echo -e "${BLUE}🔍 VÉRIFICATION DÉPLOIEMENT H2EAUX GESTION${NC}"
echo "=================================================="

# =============================================================================
# FONCTIONS UTILITAIRES
# =============================================================================

print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
}

check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        print_status "OK" "$1 disponible"
        return 0
    else
        print_status "ERROR" "$1 non disponible"
        return 1
    fi
}

check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        print_status "OK" "Service $service actif"
        return 0
    else
        print_status "ERROR" "Service $service inactif"
        echo -e "${BLUE}   Logs: sudo journalctl -u $service -n 20${NC}"
        return 1
    fi
}

check_http() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        print_status "OK" "$description (HTTP $response)"
        return 0
    else
        print_status "ERROR" "$description (HTTP $response)"
        return 1
    fi
}

check_json_response() {
    local url=$1
    local description=$2
    local key=$3
    
    local response=$(curl -s --connect-timeout 10 "$url" 2>/dev/null || echo "{}")
    local value=$(echo "$response" | grep -o "\"$key\":[^,}]*" | cut -d'"' -f4 2>/dev/null || echo "")
    
    if [ -n "$value" ]; then
        print_status "OK" "$description ($key: $value)"
        return 0
    else
        print_status "ERROR" "$description (clé $key non trouvée)"
        echo -e "${BLUE}   Réponse: $response${NC}"
        return 1
    fi
}

# =============================================================================
# VÉRIFICATIONS SYSTÈME
# =============================================================================

echo -e "\n${YELLOW}📦 VÉRIFICATION SYSTÈME${NC}"
echo "========================"

# Commandes requises
COMMANDS_OK=true
for cmd in python3 nginx mongod curl systemctl; do
    if ! check_command "$cmd"; then
        COMMANDS_OK=false
    fi
done

# Utilisateur deploy
if id "deploy" >/dev/null 2>&1; then
    print_status "OK" "Utilisateur deploy existe"
else
    print_status "ERROR" "Utilisateur deploy n'existe pas"
    COMMANDS_OK=false
fi

# Dossier application
if [ -d "$APP_PATH" ]; then
    print_status "OK" "Dossier application existe"
else
    print_status "ERROR" "Dossier application manquant: $APP_PATH"
    COMMANDS_OK=false
fi

# =============================================================================
# VÉRIFICATIONS SERVICES
# =============================================================================

echo -e "\n${YELLOW}🔧 VÉRIFICATION SERVICES${NC}"
echo "========================="

SERVICES_OK=true

# MongoDB
if ! check_service "mongod"; then
    SERVICES_OK=false
fi

# Backend H2EAUX
if ! check_service "h2eaux-backend"; then
    SERVICES_OK=false
fi

# Nginx
if ! check_service "nginx"; then
    SERVICES_OK=false
fi

# =============================================================================
# VÉRIFICATIONS RÉSEAU
# =============================================================================

echo -e "\n${YELLOW}🌐 VÉRIFICATION RÉSEAU${NC}"
echo "======================="

NETWORK_OK=true

# Vérifier ports écoutés
echo "Ports en écoute :"
netstat -tlnp 2>/dev/null | grep -E ':(80|443|8001|27017)' | while read line; do
    echo -e "${BLUE}  $line${NC}"
done

# Backend API Health
if ! check_http "http://localhost:$BACKEND_PORT/api/health" "Backend Health Check"; then
    NETWORK_OK=false
fi

# Backend API version
if ! check_json_response "http://localhost:$BACKEND_PORT/api/health" "Backend Version" "version"; then
    NETWORK_OK=false
fi

# Frontend (via Nginx)
if ! check_http "http://localhost/" "Frontend accessible"; then
    NETWORK_OK=false
fi

# Test avec domaine si fourni
if [ "$DOMAIN" != "localhost" ]; then
    if ! check_http "http://$DOMAIN/" "Frontend via domaine"; then
        print_status "WARNING" "Frontend non accessible via $DOMAIN (DNS?)"
    fi
fi

# =============================================================================
# VÉRIFICATIONS PWA
# =============================================================================

echo -e "\n${YELLOW}📱 VÉRIFICATION PWA${NC}"
echo "==================="

PWA_OK=true

# Manifest PWA
if curl -s -I "http://localhost/manifest.json" | grep -q "application/manifest+json"; then
    print_status "OK" "Manifest PWA avec bon Content-Type"
else
    print_status "ERROR" "Manifest PWA Content-Type incorrect"
    PWA_OK=false
fi

# Service Worker
if curl -s -I "http://localhost/sw-advanced.js" | grep -q "application/javascript"; then
    print_status "OK" "Service Worker accessible"
else
    print_status "ERROR" "Service Worker non accessible"
    PWA_OK=false
fi

# Headers Service Worker
if curl -s -I "http://localhost/sw-advanced.js" | grep -q "Service-Worker-Allowed"; then
    print_status "OK" "Service Worker headers corrects"
else
    print_status "WARNING" "Headers Service-Worker-Allowed manquants"
fi

# =============================================================================
# VÉRIFICATIONS BASE DE DONNÉES
# =============================================================================

echo -e "\n${YELLOW}🗄️  VÉRIFICATION BASE DE DONNÉES${NC}"
echo "================================"

DB_OK=true

# Connexion MongoDB
if mongo --eval "db.adminCommand('ismaster')" >/dev/null 2>&1; then
    print_status "OK" "MongoDB accessible"
else
    print_status "ERROR" "MongoDB non accessible"
    DB_OK=false
fi

# Base H2EAUX
if mongo h2eaux_gestion --eval "db.stats()" >/dev/null 2>&1; then
    print_status "OK" "Base h2eaux_gestion accessible"
    
    # Vérifier collections
    local collections=$(mongo h2eaux_gestion --quiet --eval "db.getCollectionNames()" 2>/dev/null || echo "[]")
    if echo "$collections" | grep -q "users"; then
        print_status "OK" "Collection users présente"
    else
        print_status "WARNING" "Collection users manquante"
    fi
else
    print_status "ERROR" "Base h2eaux_gestion non accessible"
    DB_OK=false
fi

# =============================================================================
# VÉRIFICATIONS FICHIERS
# =============================================================================

echo -e "\n${YELLOW}📄 VÉRIFICATION FICHIERS${NC}"
echo "========================="

FILES_OK=true

# Fichiers critiques backend
BACKEND_FILES=(
    "$APP_PATH/backend/server.py"
    "$APP_PATH/backend/requirements.txt"
    "$APP_PATH/backend/.env"
    "$APP_PATH/backend/venv/bin/uvicorn"
)

for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "OK" "$(basename "$file") présent"
    else
        print_status "ERROR" "$(basename "$file") manquant"
        FILES_OK=false
    fi
done

# Fichiers critiques frontend
FRONTEND_FILES=(
    "$APP_PATH/frontend/index.html"
    "$APP_PATH/frontend/manifest.json"
    "$APP_PATH/frontend/sw-advanced.js"
    "$APP_PATH/frontend/js/app.js"
)

for file in "${FRONTEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "OK" "$(basename "$file") présent"
    else
        print_status "ERROR" "$(basename "$file") manquant"
        FILES_OK=false
    fi
done

# =============================================================================
# RÉSUMÉ ET COMMANDES UTILES
# =============================================================================

echo -e "\n${YELLOW}📊 RÉSUMÉ${NC}"
echo "========="

if $COMMANDS_OK && $SERVICES_OK && $NETWORK_OK && $PWA_OK && $DB_OK && $FILES_OK; then
    print_status "OK" "DÉPLOIEMENT VALIDÉ - TOUS LES TESTS PASSÉS"
    echo -e "\n${GREEN}🎉 Application H2EAUX GESTION prête à l'utilisation !${NC}"
    echo -e "${BLUE}🌐 Accès: http://localhost/ ou http://$DOMAIN/${NC}"
    echo -e "${BLUE}👤 Comptes: admin/admin123, employe1/employe123${NC}"
else
    print_status "ERROR" "DÉPLOIEMENT INCOMPLET - CORRECTIONS NÉCESSAIRES"
fi

echo -e "\n${YELLOW}🛠️  COMMANDES UTILES${NC}"
echo "=================="
echo -e "${BLUE}# Logs services${NC}"
echo "sudo journalctl -u h2eaux-backend -f"
echo "sudo journalctl -u nginx -f"
echo "sudo tail -f /var/log/nginx/h2eaux-error.log"

echo -e "\n${BLUE}# Contrôle services${NC}"
echo "sudo systemctl status h2eaux-backend"
echo "sudo systemctl restart h2eaux-backend"
echo "sudo systemctl reload nginx"

echo -e "\n${BLUE}# Tests manuels${NC}"
echo "curl http://localhost:$BACKEND_PORT/api/health"
echo "curl -I http://localhost/manifest.json"
echo "curl -I http://localhost/sw-advanced.js"

echo -e "\n${BLUE}# Base de données${NC}"
echo "mongo h2eaux_gestion --eval 'db.users.count()'"
echo "mongo h2eaux_gestion --eval 'db.getCollectionNames()'"

echo ""

# Code de sortie selon résultat
if $COMMANDS_OK && $SERVICES_OK && $NETWORK_OK && $PWA_OK && $DB_OK && $FILES_OK; then
    exit 0
else
    exit 1
fi