#!/bin/bash

# =============================================================================
# LANCEMENT RAPIDE H2EAUX GESTION - LOCAL
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🚀 LANCEMENT H2EAUX GESTION${NC}"
echo "==============================="

# Vérifier les dépendances
echo -e "${YELLOW}📋 Vérification des dépendances...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 requis${NC}"
    exit 1
fi

if ! command -v mongod &> /dev/null && ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ MongoDB ou Docker requis${NC}"
    exit 1
fi

# Démarrer MongoDB
echo -e "${YELLOW}🗄️ Démarrage MongoDB...${NC}"
if command -v mongod &> /dev/null; then
    sudo systemctl start mongod 2>/dev/null || mongod --fork --logpath /tmp/mongodb.log
else
    echo "Démarrage MongoDB avec Docker..."
    docker run -d --name h2eaux-mongo -p 27017:27017 mongo:5.0 2>/dev/null || docker start h2eaux-mongo
fi

# Configuration Backend
echo -e "${YELLOW}⚙️ Configuration Backend...${NC}"
cd backend

# Créer .env si inexistant
if [ ! -f ".env" ]; then
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=h2eaux_gestion
JWT_SECRET=h2eaux-secret-key-local-$(openssl rand -hex 8)
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF
fi

# Installer dépendances Python
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Démarrer Backend
echo -e "${YELLOW}🔧 Démarrage Backend...${NC}"
uvicorn server:app --host 0.0.0.0 --port 8001 --reload > /tmp/h2eaux-backend.log 2>&1 &
BACKEND_PID=$!

# Attendre que le backend soit prêt
sleep 5

# Tester backend
if curl -f http://localhost:8001/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend opérationnel${NC}"
else
    echo -e "${RED}❌ Erreur backend${NC}"
    tail -20 /tmp/h2eaux-backend.log
    exit 1
fi

# Démarrer Frontend
echo -e "${YELLOW}🎨 Démarrage Frontend...${NC}"
cd ../frontend
python3 -m http.server 3000 > /tmp/h2eaux-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3

# Tester frontend
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend opérationnel${NC}"
else
    echo -e "${RED}❌ Erreur frontend${NC}"
    tail -20 /tmp/h2eaux-frontend.log
    exit 1
fi

# Initialiser la base de données
echo -e "${YELLOW}🗄️ Initialisation base de données...${NC}"
mongo h2eaux_gestion --eval "
db.users.createIndex({ 'username': 1 }, { unique: true });
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
" 2>/dev/null

echo ""
echo -e "${GREEN}🎉 APPLICATION DÉMARRÉE AVEC SUCCÈS !${NC}"
echo ""
echo -e "${BLUE}🌐 Accès à l'application :${NC}"
echo -e "${BLUE}   URL: http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}👤 Comptes de connexion :${NC}"
echo -e "${BLUE}   Admin: admin / admin123${NC}"
echo -e "${BLUE}   Employé: employe1 / employe123${NC}"
echo ""
echo -e "${BLUE}🔧 API Backend: http://localhost:8001/api${NC}"
echo ""
echo -e "${YELLOW}📊 PIDs des processus :${NC}"
echo -e "${BLUE}   Backend PID: $BACKEND_PID${NC}"
echo -e "${BLUE}   Frontend PID: $FRONTEND_PID${NC}"
echo ""
echo -e "${YELLOW}🛑 Pour arrêter l'application :${NC}"
echo -e "${BLUE}   kill $BACKEND_PID $FRONTEND_PID${NC}"
echo ""

# Ouvrir automatiquement le navigateur (si disponible)
if command -v xdg-open &> /dev/null; then
    echo -e "${BLUE}🌐 Ouverture automatique du navigateur...${NC}"
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    echo -e "${BLUE}🌐 Ouverture automatique du navigateur...${NC}"
    open http://localhost:3000
fi

echo -e "${GREEN}✅ L'application est maintenant opérationnelle !${NC}"