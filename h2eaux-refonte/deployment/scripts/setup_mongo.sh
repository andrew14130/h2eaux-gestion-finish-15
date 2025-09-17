#!/bin/bash

# =============================================================================
# SCRIPT CONFIGURATION MONGODB - H2EAUX GESTION
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🗄️  CONFIGURATION MONGODB H2EAUX GESTION${NC}"
echo "============================================="

# =============================================================================
# INSTALLATION MONGODB (SI NÉCESSAIRE)
# =============================================================================

install_mongodb() {
    echo -e "${YELLOW}📦 Installation MongoDB...${NC}"
    
    # Import de la clé GPG MongoDB
    curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
    
    # Ajout du repository
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    
    # Installation
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    
    echo -e "${GREEN}✅ MongoDB installé${NC}"
}

# Vérifier si MongoDB est installé
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB non détecté${NC}"
    read -p "Installer MongoDB ? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_mongodb
    else
        echo -e "${RED}❌ MongoDB requis pour l'application${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ MongoDB déjà installé${NC}"
fi

# =============================================================================
# CONFIGURATION MONGODB
# =============================================================================

echo -e "${YELLOW}🔧 Configuration MongoDB...${NC}"

# Démarrer MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Attendre que MongoDB soit prêt
echo "En attente du démarrage de MongoDB..."
for i in {1..30}; do
    if mongo --eval "db.adminCommand('ismaster')" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB démarré${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Timeout MongoDB${NC}"
        exit 1
    fi
    sleep 1
done

# =============================================================================
# INITIALISATION BASE DE DONNÉES
# =============================================================================

echo -e "${YELLOW}📊 Initialisation base de données...${NC}"

# Script d'initialisation MongoDB
mongo h2eaux_gestion << 'EOF'
// Suppression des collections existantes (dev uniquement)
db.users.drop();
db.clients.drop();
db.chantiers.drop();

// Création des index
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "id": 1 }, { unique: true });
db.clients.createIndex({ "id": 1 }, { unique: true });
db.clients.createIndex({ "nom": 1 });
db.clients.createIndex({ "created_at": -1 });
db.chantiers.createIndex({ "id": 1 }, { unique: true });
db.chantiers.createIndex({ "nom": 1 });
db.chantiers.createIndex({ "created_at": -1 });

// Utilisateurs par défaut
db.users.insertOne({
    "id": "admin-001",
    "username": "admin",
    "role": "admin",
    "permissions": {
        "clients": true,
        "documents": true,
        "chantiers": true,
        "calculs_pac": true,
        "catalogues": true,
        "chat": true,
        "parametres": true
    },
    "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewliCThGQ2jfNWHm",
    "created_at": new Date()
});

db.users.insertOne({
    "id": "employe-001",
    "username": "employe1",
    "role": "employee",
    "permissions": {
        "clients": true,
        "documents": true,
        "chantiers": true,
        "calculs_pac": true,
        "catalogues": true,
        "chat": true,
        "parametres": false
    },
    "hashed_password": "$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
    "created_at": new Date()
});

// Clients de démonstration
db.clients.insertOne({
    "id": "client-demo-001",
    "nom": "Dupont",
    "prenom": "Jean",
    "telephone": "06.12.34.56.78",
    "email": "jean.dupont@email.com",
    "adresse": "123 Rue de la Paix",
    "ville": "Paris",
    "code_postal": "75001",
    "type_chauffage": "gaz",
    "notes": "Client de démonstration",
    "created_at": new Date(),
    "updated_at": new Date()
});

db.clients.insertOne({
    "id": "client-demo-002",
    "nom": "Martin",
    "prenom": "Sophie",
    "telephone": "06.98.76.54.32",
    "email": "sophie.martin@email.com",
    "adresse": "456 Avenue des Champs",
    "ville": "Lyon",
    "code_postal": "69001",
    "type_chauffage": "electrique",
    "notes": "Rénovation complète prévue",
    "created_at": new Date(),
    "updated_at": new Date()
});

// Chantiers de démonstration
db.chantiers.insertOne({
    "id": "chantier-demo-001",
    "nom": "Installation PAC Dupont",
    "adresse": "123 Rue de la Paix",
    "ville": "Paris",
    "code_postal": "75001",
    "client_nom": "Jean Dupont",
    "client_telephone": "06.12.34.56.78",
    "type_travaux": "Installation PAC Air/Eau",
    "statut": "en_cours",
    "date_debut": "2024-09-15",
    "date_fin_prevue": "2024-09-20",
    "budget_estime": "8500",
    "description": "Installation d'une pompe à chaleur air/eau avec plancher chauffant",
    "notes": "Chantier de démonstration",
    "created_at": new Date(),
    "updated_at": new Date()
});

print("✅ Base de données initialisée");
print("👤 Utilisateurs créés :");
print("   - admin / admin123 (Administrateur)");
print("   - employe1 / employe123 (Employé)");
print("📊 Données de démonstration ajoutées");
print("🔍 Index créés pour optimiser les performances");
EOF

# =============================================================================
# VÉRIFICATION
# =============================================================================

echo -e "${YELLOW}🧪 Vérification installation...${NC}"

# Test connexion
if mongo --eval "db.adminCommand('ismaster')" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Connexion MongoDB OK${NC}"
else
    echo -e "${RED}❌ Erreur connexion MongoDB${NC}"
    exit 1
fi

# Test base de données
USER_COUNT=$(mongo h2eaux_gestion --quiet --eval "db.users.count()")
CLIENT_COUNT=$(mongo h2eaux_gestion --quiet --eval "db.clients.count()")

echo -e "${GREEN}✅ Utilisateurs créés: $USER_COUNT${NC}"
echo -e "${GREEN}✅ Clients de démo: $CLIENT_COUNT${NC}"

# =============================================================================
# CONFIGURATION SÉCURITÉ (OPTIONNEL)
# =============================================================================

echo -e "${YELLOW}🔒 Configuration sécurité MongoDB...${NC}"

# Créer un utilisateur admin MongoDB (production)
read -p "Configurer l'authentification MongoDB ? (recommandé en production) (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Création utilisateur admin MongoDB..."
    
    # Générer mot de passe aléatoire
    MONGO_ADMIN_PASSWORD=$(openssl rand -base64 32)
    
    mongo admin << EOF
use admin
db.createUser({
    user: "h2eaux_admin",
    pwd: "$MONGO_ADMIN_PASSWORD",
    roles: [
        { role: "userAdminAnyDatabase", db: "admin" },
        { role: "readWriteAnyDatabase", db: "admin" }
    ]
});
EOF
    
    echo -e "${GREEN}✅ Utilisateur MongoDB créé${NC}"
    echo -e "${BLUE}Username: h2eaux_admin${NC}"
    echo -e "${BLUE}Password: $MONGO_ADMIN_PASSWORD${NC}"
    echo -e "${YELLOW}⚠️  Sauvegardez ces identifiants !${NC}"
    
    # Mise à jour du .env backend
    if [ -f "/home/deploy/h2eaux-gestion/backend/.env" ]; then
        sed -i "s|MONGO_URL=.*|MONGO_URL=mongodb://h2eaux_admin:$MONGO_ADMIN_PASSWORD@localhost:27017/h2eaux_gestion?authSource=admin|" /home/deploy/h2eaux-gestion/backend/.env
        echo -e "${GREEN}✅ .env backend mis à jour${NC}"
    fi
    
    # Activer l'authentification
    echo "Activation de l'authentification MongoDB..."
    if ! grep -q "^security:" /etc/mongod.conf; then
        echo -e "\n# Sécurité\nsecurity:\n  authorization: enabled" | sudo tee -a /etc/mongod.conf
    fi
    
    # Redémarrer MongoDB
    sudo systemctl restart mongod
    echo -e "${GREEN}✅ Authentification MongoDB activée${NC}"
fi

# =============================================================================
# FINALISATION
# =============================================================================

echo -e "\n${GREEN}🎉 Configuration MongoDB terminée !${NC}"
echo "===================================="

echo -e "${BLUE}📊 Informations de connexion :${NC}"
echo "Base de données : h2eaux_gestion"
echo "Port : 27017"
echo "Collections : users, clients, chantiers"

echo -e "\n${BLUE}🧪 Tests de validation :${NC}"
echo "mongo h2eaux_gestion --eval 'db.users.count()'"
echo "mongo h2eaux_gestion --eval 'db.clients.find().pretty()'"

echo -e "\n${BLUE}🔧 Gestion du service :${NC}"
echo "sudo systemctl start mongod"
echo "sudo systemctl stop mongod"
echo "sudo systemctl status mongod"

echo -e "\n${YELLOW}⚠️  Notes importantes :${NC}"
echo "- Sauvegardez régulièrement avec mongodump"
echo "- Surveillez les logs : sudo journalctl -u mongod -f"
echo "- Configurez firewall si accès distant nécessaire"

exit 0