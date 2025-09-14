#!/bin/bash

# =============================================================================
# Script de Déploiement OVH - H2EAUX GESTION PWA
# =============================================================================

set -e  # Arrêt en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="h2eaux-gestion"
DOMAIN="votre-domaine.com"
BACKEND_PORT=8001
FRONTEND_PORT=3000

echo -e "${BLUE}🚀 Déploiement H2EAUX GESTION PWA sur OVH${NC}"
echo "=================================================="

# Vérification des prérequis
check_requirements() {
    echo -e "${YELLOW}📋 Vérification des prérequis...${NC}"
    
    # Vérifier si Git est installé
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git n'est pas installé${NC}"
        exit 1
    fi
    
    # Vérifier si Python est installé
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 n'est pas installé${NC}"
        exit 1
    fi
    
    # Vérifier si MongoDB est installé ou accessible
    if ! command -v mongod &> /dev/null && ! command -v mongo &> /dev/null; then
        echo -e "${RED}❌ MongoDB n'est pas installé${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prérequis vérifiés${NC}"
}

# Installation des dépendances
install_dependencies() {
    echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
    
    # Backend Python
    cd backend
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    cd ..
    
    echo -e "${GREEN}✅ Dépendances installées${NC}"
}

# Configuration de l'environnement
setup_environment() {
    echo -e "${YELLOW}⚙️ Configuration de l'environnement...${NC}"
    
    # Backend .env
    if [ ! -f "backend/.env" ]; then
        echo -e "${BLUE}Création du fichier backend/.env${NC}"
        cat > backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=h2eaux_gestion
JWT_SECRET=$(openssl rand -hex 32)
ENVIRONMENT=production
ALLOWED_ORIGINS=https://$DOMAIN
EOF
    fi
    
    # Frontend .env
    if [ ! -f "frontend/.env" ]; then
        echo -e "${BLUE}Création du fichier frontend/.env${NC}"
        cat > frontend/.env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN/api
REACT_APP_VERSION=1.0.0
EOF
    fi
    
    echo -e "${GREEN}✅ Environnement configuré${NC}"
}

# Configuration Supervisor
setup_supervisor() {
    echo -e "${YELLOW}📋 Configuration Supervisor...${NC}"
    
    # Backend supervisor config
    sudo tee /etc/supervisor/conf.d/h2eaux-backend.conf > /dev/null << EOF
[program:h2eaux-backend]
command=$(pwd)/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port $BACKEND_PORT
directory=$(pwd)/backend
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/h2eaux-backend.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=3
user=$USER
environment=PATH="$(pwd)/backend/venv/bin:%(ENV_PATH)s"
EOF

    # Frontend supervisor config
    sudo tee /etc/supervisor/conf.d/h2eaux-frontend.conf > /dev/null << EOF
[program:h2eaux-frontend]
command=/usr/bin/python3 -m http.server $FRONTEND_PORT
directory=$(pwd)/frontend
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/h2eaux-frontend.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=3
user=$USER
EOF

    # Recharger supervisor
    sudo supervisorctl reread
    sudo supervisorctl update
    
    echo -e "${GREEN}✅ Supervisor configuré${NC}"
}

# Configuration Nginx
setup_nginx() {
    echo -e "${YELLOW}🌐 Configuration Nginx...${NC}"
    
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
    
    # API Backend
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API login with stricter rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:$BACKEND_PORT/api/auth/login;
    }
    
    # PWA Service Worker
    location ~* sw.*\.js$ {
        root $(pwd)/frontend;
        add_header Content-Type application/javascript;
        add_header Service-Worker-Allowed "/";
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # PWA Manifest
    location ~* \.(webmanifest|json)$ {
        root $(pwd)/frontend;
        add_header Content-Type application/manifest+json;
        expires 1d;
    }
    
    # Static assets with caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root $(pwd)/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Frontend PWA
    location / {
        root $(pwd)/frontend;
        try_files \$uri \$uri/ /index.html;
        
        # PWA headers
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
EOF

    # Activer le site
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    
    echo -e "${GREEN}✅ Nginx configuré${NC}"
}

# Configuration SSL avec Certbot
setup_ssl() {
    echo -e "${YELLOW}🔒 Configuration SSL...${NC}"
    
    if command -v certbot &> /dev/null; then
        sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        echo -e "${GREEN}✅ SSL configuré${NC}"
    else
        echo -e "${YELLOW}⚠️ Certbot non installé, SSL à configurer manuellement${NC}"
    fi
}

# Démarrage des services
start_services() {
    echo -e "${YELLOW}🚀 Démarrage des services...${NC}"
    
    # Démarrer MongoDB si nécessaire
    sudo systemctl start mongod
    sudo systemctl enable mongod
    
    # Démarrer les services H2EAUX
    sudo supervisorctl start h2eaux-backend
    sudo supervisorctl start h2eaux-frontend
    
    echo -e "${GREEN}✅ Services démarrés${NC}"
}

# Tests de validation
run_tests() {
    echo -e "${YELLOW}🧪 Tests de validation...${NC}"
    
    # Test backend
    sleep 5
    if curl -f http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend accessible${NC}"
    else
        echo -e "${RED}❌ Backend non accessible${NC}"
        return 1
    fi
    
    # Test frontend
    if curl -f http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend accessible${NC}"
    else
        echo -e "${RED}❌ Frontend non accessible${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Tests validés${NC}"
}

# Sauvegarde
create_backup() {
    echo -e "${YELLOW}💾 Création de sauvegarde...${NC}"
    
    BACKUP_DIR="/backup/h2eaux-$(date +%Y%m%d-%H%M%S)"
    sudo mkdir -p "$BACKUP_DIR"
    
    # Sauvegarde base de données
    mongodump --db h2eaux_gestion --out "$BACKUP_DIR/db"
    
    # Sauvegarde fichiers
    sudo cp -r "$(pwd)" "$BACKUP_DIR/app"
    
    echo -e "${GREEN}✅ Sauvegarde créée: $BACKUP_DIR${NC}"
}

# Fonction principale
main() {
    echo "Domaine cible: $DOMAIN"
    echo "Port backend: $BACKEND_PORT"
    echo "Port frontend: $FRONTEND_PORT"
    echo ""
    
    read -p "Continuer le déploiement ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    
    check_requirements
    install_dependencies
    setup_environment
    setup_supervisor
    setup_nginx
    setup_ssl
    start_services
    run_tests
    create_backup
    
    echo ""
    echo -e "${GREEN}🎉 Déploiement terminé avec succès !${NC}"
    echo -e "${BLUE}🌐 Application accessible: https://$DOMAIN${NC}"
    echo -e "${BLUE}📊 Logs backend: sudo tail -f /var/log/supervisor/h2eaux-backend.log${NC}"
    echo -e "${BLUE}📊 Logs frontend: sudo tail -f /var/log/supervisor/h2eaux-frontend.log${NC}"
    echo ""
    echo -e "${YELLOW}👤 Comptes par défaut:${NC}"
    echo -e "${BLUE}   Admin: admin / admin123${NC}"
    echo -e "${BLUE}   Employé: employe1 / employe123${NC}"
}

# Point d'entrée
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi