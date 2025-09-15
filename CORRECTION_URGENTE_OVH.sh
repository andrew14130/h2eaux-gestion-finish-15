#!/bin/bash

# =============================================================================
# CORRECTION URGENTE H2EAUX GESTION - OVH
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🚨 CORRECTION URGENTE H2EAUX GESTION${NC}"
echo "============================================"

# Configuration
read -p "Entrez votre domaine OVH (ex: mondomaine.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Domaine requis !${NC}"
    exit 1
fi

echo -e "${BLUE}Domaine configuré: $DOMAIN${NC}"

# 1. Arrêter les services existants
echo -e "${YELLOW}🛑 Arrêt des services...${NC}"
sudo supervisorctl stop h2eaux-backend h2eaux-frontend 2>/dev/null || true
sudo pkill -f "uvicorn.*server:app" 2>/dev/null || true
sudo pkill -f "python.*http.server" 2>/dev/null || true

# 2. Installer les dépendances manquantes
echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
sudo apt update
sudo apt install -y python3 python3-pip python3-venv mongodb nginx supervisor curl

# 3. Configuration Backend
echo -e "${YELLOW}⚙️ Configuration Backend...${NC}"
cd /var/www/h2eaux-gestion/backend || { echo "Erreur: dossier backend introuvable"; exit 1; }

# Créer environnement virtuel si nécessaire
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Configuration .env backend
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=h2eaux_gestion
JWT_SECRET=$(openssl rand -hex 32)
ENVIRONMENT=production
ALLOWED_ORIGINS=https://$DOMAIN,http://$DOMAIN,https://www.$DOMAIN,http://www.$DOMAIN
EOF

# 4. Configuration Frontend
echo -e "${YELLOW}⚙️ Configuration Frontend...${NC}"
cd /var/www/h2eaux-gestion/frontend

# L'URL API est maintenant détectée automatiquement par le JavaScript

# 5. Démarrer MongoDB
echo -e "${YELLOW}🗄️ Configuration MongoDB...${NC}"
sudo systemctl start mongod
sudo systemctl enable mongod

# Initialiser la base de données
mongo h2eaux_gestion --eval "
db.users.createIndex({ 'username': 1 }, { unique: true });
db.users.createIndex({ 'id': 1 }, { unique: true });

db.users.insertOne({
    'id': 'cd113b6d-3fbd-4256-b0de-4bbd5c88ea17',
    'username': 'admin',
    'role': 'admin',
    'permissions': {
        'clients': true,
        'documents': true,
        'chantiers': true,
        'calculs_pac': true,
        'catalogues': true,
        'chat': true,
        'parametres': true
    },
    'hashed_password': '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewliCThGQ2jfNWHm',
    'created_at': new Date()
});

db.users.insertOne({
    'id': 'e7f8a9b0-1c2d-3e4f-5a6b-7c8d9e0f1a2b',
    'username': 'employe1',
    'role': 'employee',
    'permissions': {
        'clients': true,
        'documents': true,
        'chantiers': true,
        'calculs_pac': true,
        'catalogues': true,
        'chat': true,
        'parametres': false
    },
    'hashed_password': '\$2b\$12\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'created_at': new Date()
});
"

# 6. Configuration Supervisor
echo -e "${YELLOW}📋 Configuration Supervisor...${NC}"

# Backend supervisor
sudo tee /etc/supervisor/conf.d/h2eaux-backend.conf > /dev/null << EOF
[program:h2eaux-backend]
command=/var/www/h2eaux-gestion/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
directory=/var/www/h2eaux-gestion/backend
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/h2eaux-backend.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=3
user=www-data
environment=PATH="/var/www/h2eaux-gestion/backend/venv/bin:%(ENV_PATH)s"
EOF

# Frontend supervisor
sudo tee /etc/supervisor/conf.d/h2eaux-frontend.conf > /dev/null << EOF
[program:h2eaux-frontend]
command=/usr/bin/python3 -m http.server 3000
directory=/var/www/h2eaux-gestion/frontend
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/h2eaux-frontend.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=3
user=www-data
EOF

# 7. Configuration Nginx
echo -e "${YELLOW}🌐 Configuration Nginx...${NC}"

sudo tee /etc/nginx/sites-available/h2eaux-gestion > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    # PWA Service Worker
    location ~* sw.*\.js$ {
        root /var/www/h2eaux-gestion/frontend;
        add_header Content-Type application/javascript;
        add_header Service-Worker-Allowed "/";
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # PWA Manifest
    location ~* \.(webmanifest|json)$ {
        root /var/www/h2eaux-gestion/frontend;
        add_header Content-Type application/manifest+json;
        expires 1d;
    }
    
    # Static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/h2eaux-gestion/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Frontend PWA
    location / {
        root /var/www/h2eaux-gestion/frontend;
        try_files \$uri \$uri/ /index.html;
        
        # PWA headers
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/h2eaux-gestion /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 8. Permissions correctes
echo -e "${YELLOW}🔐 Configuration des permissions...${NC}"
sudo chown -R www-data:www-data /var/www/h2eaux-gestion
sudo chmod -R 755 /var/www/h2eaux-gestion

# 9. Redémarrage des services
echo -e "${YELLOW}🚀 Démarrage des services...${NC}"
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start h2eaux-backend h2eaux-frontend

# 10. Configuration firewall (si ufw est installé)
if command -v ufw >/dev/null 2>&1; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
fi

# 11. Tests de validation
echo -e "${YELLOW}🧪 Tests de validation...${NC}"
sleep 10

# Test backend
if curl -f http://localhost:8001/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend accessible${NC}"
else
    echo -e "${RED}❌ Backend non accessible${NC}"
    echo "Logs backend:"
    sudo tail -20 /var/log/supervisor/h2eaux-backend.log
fi

# Test frontend
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend accessible${NC}"
else
    echo -e "${RED}❌ Frontend non accessible${NC}"
    echo "Logs frontend:"
    sudo tail -20 /var/log/supervisor/h2eaux-frontend.log
fi

# Test complet
if curl -f "http://$DOMAIN/api/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Application accessible via $DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠️ Application pas encore accessible via $DOMAIN (DNS en cours)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 CORRECTION TERMINÉE !${NC}"
echo -e "${BLUE}🌐 Votre application est accessible sur :${NC}"
echo -e "${BLUE}   - http://$DOMAIN${NC}"
echo -e "${BLUE}   - http://www.$DOMAIN${NC}"
echo ""
echo -e "${BLUE}👤 Comptes de connexion :${NC}"
echo -e "${BLUE}   - Admin: admin / admin123${NC}"
echo -e "${BLUE}   - Employé: employe1 / employe123${NC}"
echo ""
echo -e "${YELLOW}📊 Commandes utiles :${NC}"
echo -e "${BLUE}   - Logs backend: sudo tail -f /var/log/supervisor/h2eaux-backend.log${NC}"
echo -e "${BLUE}   - Logs frontend: sudo tail -f /var/log/supervisor/h2eaux-frontend.log${NC}"
echo -e "${BLUE}   - Redémarrer: sudo supervisorctl restart h2eaux-backend h2eaux-frontend${NC}"
echo -e "${BLUE}   - Status: sudo supervisorctl status${NC}"