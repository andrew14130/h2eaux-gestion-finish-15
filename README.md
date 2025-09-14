# 🚀 H2EAUX GESTION - Application PWA Professionnelle

## 📋 Description

**H2EAUX GESTION** est une application PWA (Progressive Web App) professionnelle destinée aux entreprises de plomberie, climatisation et chauffage. Elle offre une solution complète de gestion avec un module Plan 2D MagicPlan intégré.

### ✨ Fonctionnalités Principales

- **📊 Dashboard** - Vue d'ensemble avec statistiques
- **👥 Clients** - Gestion complète CRUD + Export PDF
- **🏗️ Chantiers** - Gestion de projets avec statuts
- **🌡️ Calculs PAC** - Dimensionnement avec formules métier
- **📋 Fiches Chantier** - **8 onglets + Plan 2D MagicPlan**
- **📄 Documents** - Upload et gestion de fichiers
- **📅 Calendrier** - Planning avec 3 vues
- **🔄 MEG Integration** - Import/Export données
- **💬 Chat Équipe** - Communication interne
- **⚙️ Paramètres** - Administration utilisateurs

### 🎯 Module Plan 2D MagicPlan (Unique)

**Canvas professionnel** avec 5 outils :
- 👆 **Sélection** - Déplacement d'éléments
- ✏️ **Dessin libre** - Tracé main levée
- 🏠 **Pièces** - Rectangles nommés avec dimensions
- 📏 **Cotation** - Mesures modifiables
- 🗑️ **Effacement** - Suppression sélective

**Fonctionnalités avancées :**
- Échelles configurables (1:50, 1:100, 1:200)
- Sauvegarde JSON persistante
- Export PDF avec plan intégré
- Interface tactile optimisée tablette

---

## 🏗️ Architecture Technique

### **Stack Technologique**
- **Frontend** : HTML5 + CSS3 + JavaScript Vanilla + PWA
- **Backend** : FastAPI (Python 3.11+)
- **Base de données** : MongoDB
- **Authentification** : JWT + bcrypt
- **PWA** : Service Worker + Manifest + Offline

### **Structure du Projet**
```
h2eaux-gestion/
├── backend/                    # API FastAPI
│   ├── server.py              # Serveur principal
│   ├── requirements.txt       # Dépendances Python
│   └── .env                   # Variables d'environnement
├── frontend/                  # Application PWA
│   ├── index.html            # Application principale
│   ├── manifest.json         # Manifest PWA
│   ├── sw-advanced.js        # Service Worker
│   ├── css/                  # Styles
│   ├── js/                   # Scripts JavaScript
│   └── assets/               # Ressources (icônes, images)
├── deployment/               # Scripts de déploiement
├── docs/                    # Documentation
└── README.md               # Ce fichier
```

---

## 🚀 Installation et Lancement Local

### **Prérequis**
- Python 3.11+
- MongoDB 4.4+
- Node.js 16+ (optionnel pour outils dev)
- Git

### **1. Cloner le Projet**
```bash
git clone https://github.com/votre-username/h2eaux-gestion.git
cd h2eaux-gestion
```

### **2. Configuration Backend**
```bash
# Installer les dépendances Python
cd backend
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres
```

### **3. Configuration Base de Données**
```bash
# Démarrer MongoDB
sudo systemctl start mongod
# ou avec Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### **4. Lancement de l'Application**

**Terminal 1 - Backend :**
```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend :**
```bash
cd frontend
python3 -m http.server 3000
```

### **5. Accès à l'Application**
- **URL** : http://localhost:3000
- **Admin** : admin / admin123
- **Employé** : employe1 / employe123

---

## 📦 Sauvegarde et Versioning GitHub

### **1. Création du Repository GitHub**

```bash
# Initialiser le repository local
git init
git add .
git commit -m "🎉 Initial commit - H2EAUX GESTION PWA v1.0.0"

# Lier au repository GitHub
git remote add origin https://github.com/votre-username/h2eaux-gestion.git
git branch -M main
git push -u origin main
```

### **2. Structure .gitignore**
```gitignore
# Environnement
.env
__pycache__/
*.pyc
node_modules/
.venv/

# Logs
*.log
logs/

# Base de données locale
*.db
*.sqlite

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Temporaires
temp/
tmp/
```

### **3. Workflow de Développement**
```bash
# Créer une branche pour une nouvelle fonctionnalité
git checkout -b feature/nouvelle-fonctionnalite
git add .
git commit -m "✨ Add: nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite

# Merger vers main
git checkout main
git merge feature/nouvelle-fonctionnalite
git tag v1.1.0
git push origin main --tags
```

---

## 🌐 Déploiement OVH

### **Option 1 : Hébergement Web Classique OVH**

#### **1. Préparation des Fichiers**
```bash
# Créer l'archive de déploiement
./deployment/create-deployment-package.sh
```

#### **2. Upload via FTP**
- Connectez-vous à votre FTP OVH
- Uploadez le contenu de `frontend/` dans `/www/`
- Uploadez `backend/` dans `/www/api/`

#### **3. Configuration Serveur (.htaccess)**
```apache
# Fichier /www/.htaccess
RewriteEngine On

# API Backend
RewriteRule ^api/(.*)$ api/server.py/$1 [QSA,L]

# Frontend PWA
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [QSA,L]

# Headers PWA
<FilesMatch "manifest.json">
    Header set Content-Type application/manifest+json
</FilesMatch>

<FilesMatch "sw-.*\.js">
    Header set Service-Worker-Allowed "/"
    Header set Content-Type application/javascript
</FilesMatch>
```

### **Option 2 : VPS OVH (Recommandé)**

#### **1. Configuration Serveur**
```bash
# Connexion SSH au VPS
ssh user@votre-vps-ovh.com

# Installation des dépendances
sudo apt update
sudo apt install python3 python3-pip nginx mongodb git supervisor

# Cloner le projet
git clone https://github.com/votre-username/h2eaux-gestion.git
cd h2eaux-gestion
```

#### **2. Configuration Backend**
```bash
# Installation Python
cd backend
pip3 install -r requirements.txt

# Configuration Supervisor
sudo cp deployment/supervisor-backend.conf /etc/supervisor/conf.d/h2eaux-backend.conf
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start h2eaux-backend
```

#### **3. Configuration Nginx**
```bash
# Copier la configuration
sudo cp deployment/nginx-site.conf /etc/nginx/sites-available/h2eaux-gestion
sudo ln -s /etc/nginx/sites-available/h2eaux-gestion /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### **4. Configuration SSL (Let's Encrypt)**
```bash
sudo certbot --nginx -d votre-domaine.com
```

---

## 🐳 Déploiement Docker (Alternative)

### **1. Build et Déploiement**
```bash
# Build des images
docker-compose build

# Lancement en production
docker-compose -f docker-compose.prod.yml up -d
```

### **2. Monitoring**
```bash
# Vérifier les logs
docker-compose logs -f

# Redémarrer les services
docker-compose restart
```

---

## 🧪 Tests et Validation

### **1. Tests Backend**
```bash
cd backend
python -m pytest tests/ -v
```

### **2. Tests Frontend**
```bash
# Tests manuels avec les comptes
Admin: admin / admin123
Employé: employe1 / employe123
```

### **3. Tests PWA**
- Installation sur mobile
- Mode hors ligne
- Service Worker
- Notifications

---

## 📊 Monitoring et Maintenance

### **1. Logs à Surveiller**
```bash
# Backend
tail -f /var/log/supervisor/h2eaux-backend.log

# Nginx
tail -f /var/log/nginx/h2eaux-gestion.access.log
tail -f /var/log/nginx/h2eaux-gestion.error.log

# MongoDB
tail -f /var/log/mongodb/mongod.log
```

### **2. Sauvegardes**
```bash
# Base de données
mongodump --db h2eaux_gestion --out /backup/$(date +%Y%m%d)

# Fichiers
tar -czf /backup/h2eaux-files-$(date +%Y%m%d).tar.gz /var/www/h2eaux-gestion
```

### **3. Mises à Jour**
```bash
# Récupérer les dernières modifications
git pull origin main

# Redémarrer les services
sudo supervisorctl restart h2eaux-backend
sudo systemctl reload nginx
```

---

## 🔧 Configuration Environnement

### **Variables d'Environnement (.env)**
```env
# Backend
MONGO_URL=mongodb://localhost:27017
DB_NAME=h2eaux_gestion
JWT_SECRET=votre-secret-jwt-ultra-securise

# Production
ENVIRONMENT=production
ALLOWED_ORIGINS=https://votre-domaine.com
```

### **Configuration Frontend (.env)**
```env
REACT_APP_BACKEND_URL=https://votre-domaine.com/api
REACT_APP_VERSION=1.0.0
```

---

## 🆘 Dépannage

### **Problèmes Courants**

**1. Erreur de connexion API**
```bash
# Vérifier le backend
curl http://localhost:8001/api/health
```

**2. Problème PWA**
```bash
# Vérifier le Service Worker
# DevTools > Application > Service Workers
```

**3. Erreur base de données**
```bash
# Vérifier MongoDB
sudo systemctl status mongod
```

---

## 📞 Support et Contribution

### **Bugs et Fonctionnalités**
- **Issues GitHub** : https://github.com/votre-username/h2eaux-gestion/issues
- **Wiki** : Documentation détaillée

### **Développement**
```bash
# Contribuer
git checkout -b fix/probleme-identifie
# ... développement ...
git push origin fix/probleme-identifie
# Créer une Pull Request
```

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

## 🎉 Crédits

**Développé pour les professionnels de la plomberie, climatisation et chauffage.**

**Version :** 1.0.0  
**Dernière mise à jour :** Septembre 2024  
**Compatibilité :** Chrome 80+, Safari 13+, Firefox 75+

---

**🚀 Votre application H2EAUX GESTION est prête pour la production !**