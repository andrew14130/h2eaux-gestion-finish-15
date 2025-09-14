# 🚀 Guide de Déploiement H2EAUX GESTION PWA

## 📋 Table des Matières

1. [Sauvegarde GitHub](#sauvegarde-github)
2. [Déploiement OVH Hébergement Web](#déploiement-ovh-hébergement-web)
3. [Déploiement OVH VPS](#déploiement-ovh-vps)
4. [Déploiement Docker](#déploiement-docker)
5. [Tests et Validation](#tests-et-validation)
6. [Maintenance](#maintenance)

---

## 🐙 Sauvegarde GitHub

### 1. Préparation du Repository

```bash
# Initialiser le repository Git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "🎉 Initial commit - H2EAUX GESTION PWA v1.0.0"

# Créer le repository sur GitHub (via interface web)
# Puis lier le repository local

git remote add origin https://github.com/votre-username/h2eaux-gestion.git
git branch -M main
git push -u origin main
```

### 2. Structure .gitignore

Le fichier `.gitignore` est déjà configuré pour exclure :
- Fichiers de configuration sensibles (`.env`)
- Cache et fichiers temporaires
- Logs et base de données locale
- Dépendances (`node_modules/`, `__pycache__/`)

### 3. Workflow de Développement

```bash
# Nouvelle fonctionnalité
git checkout -b feature/nouvelle-fonctionnalite
git add .
git commit -m "✨ Add: description de la fonctionnalité"
git push origin feature/nouvelle-fonctionnalite

# Créer une Pull Request sur GitHub
# Après validation, merger vers main

git checkout main
git pull origin main
git tag v1.1.0
git push origin main --tags
```

---

## 🌐 Déploiement OVH Hébergement Web

### 1. Préparation des Fichiers

```bash
# Créer une archive optimisée
zip -r h2eaux-gestion-web.zip frontend/ -x "frontend/node_modules/*" "frontend/.git/*"
```

### 2. Configuration FTP

1. **Connexion FTP** à votre hébergement OVH
2. **Upload** le contenu de `frontend/` dans `/www/`
3. **Créer** le dossier `/www/api/`
4. **Upload** le contenu de `backend/` dans `/www/api/`

### 3. Configuration .htaccess

Créer `/www/.htaccess` :

```apache
RewriteEngine On

# API Backend (si PHP disponible)
RewriteRule ^api/(.*)$ api/index.php/$1 [QSA,L]

# PWA Frontend
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

# Cache statique
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
</FilesMatch>
```

### 4. Adaptation Backend pour Hébergement Mutualisé

Si votre hébergement ne supporte pas Python/FastAPI, créer une version PHP simplifiée ou utiliser un VPS.

---

## 🖥️ Déploiement OVH VPS (Recommandé)

### 1. Script de Déploiement Automatique

```bash
# Cloner le repository
git clone https://github.com/votre-username/h2eaux-gestion.git
cd h2eaux-gestion

# Configurer le domaine dans le script
nano deployment/deploy-ovh.sh
# Modifier DOMAIN="votre-domaine.com"

# Rendre le script exécutable
chmod +x deployment/deploy-ovh.sh

# Lancer le déploiement
./deployment/deploy-ovh.sh
```

### 2. Configuration Manuelle Étape par Étape

#### **Étape 1: Connexion et Préparation**

```bash
# Connexion SSH
ssh root@votre-vps-ip

# Mise à jour du système
apt update && apt upgrade -y

# Installation des dépendances
apt install -y python3 python3-pip python3-venv mongodb nginx supervisor git curl certbot python3-certbot-nginx
```

#### **Étape 2: Clonage et Configuration**

```bash
# Cloner le projet
cd /var/www
git clone https://github.com/votre-username/h2eaux-gestion.git
cd h2eaux-gestion

# Configuration backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copier et configurer .env
cp deployment/.env.example backend/.env
nano backend/.env
# Modifier les valeurs selon votre environnement

# Copier .env frontend
cp deployment/.env.example frontend/.env
nano frontend/.env
# Configurer REACT_APP_BACKEND_URL=https://votre-domaine.com/api
```

#### **Étape 3: Configuration MongoDB**

```bash
# Démarrer MongoDB
systemctl start mongod
systemctl enable mongod

# Créer la base de données
mongo
> use h2eaux_gestion
> db.createUser({user:"h2eaux_user", pwd:"mot_de_passe_securise", roles:["readWrite"]})
> exit
```

#### **Étape 4: Configuration Supervisor**

```bash
# Copier les configurations
cp deployment/supervisor-backend.conf /etc/supervisor/conf.d/h2eaux-backend.conf
cp deployment/supervisor-frontend.conf /etc/supervisor/conf.d/h2eaux-frontend.conf

# Modifier les chemins dans les fichiers de configuration
nano /etc/supervisor/conf.d/h2eaux-backend.conf
# Remplacer /path/to/... par les vrais chemins

# Recharger supervisor
supervisorctl reread
supervisorctl update
supervisorctl start h2eaux-backend h2eaux-frontend
```

#### **Étape 5: Configuration Nginx**

```bash
# Copier la configuration
cp deployment/nginx-site.conf /etc/nginx/sites-available/h2eaux-gestion

# Modifier le domaine
nano /etc/nginx/sites-available/h2eaux-gestion
# Remplacer votre-domaine.com par votre vrai domaine

# Activer le site
ln -s /etc/nginx/sites-available/h2eaux-gestion /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### **Étape 6: SSL avec Let's Encrypt**

```bash
# Obtenir le certificat SSL
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Renouvellement automatique
crontab -e
# Ajouter : 0 3 * * * certbot renew --quiet
```

### 3. Vérification du Déploiement

```bash
# Vérifier les services
supervisorctl status
systemctl status nginx
systemctl status mongod

# Tester les endpoints
curl https://votre-domaine.com/api/health
curl https://votre-domaine.com/

# Logs
tail -f /var/log/supervisor/h2eaux-backend.log
tail -f /var/log/nginx/access.log
```

---

## 🐳 Déploiement Docker

### 1. Déploiement Développement

```bash
# Build et démarrage
docker-compose up -d

# Vérifier les services
docker-compose ps
docker-compose logs -f
```

### 2. Déploiement Production

```bash
# Variables d'environnement
cp deployment/.env.example .env
nano .env
# Configurer toutes les variables de production

# Déploiement production
docker-compose -f docker-compose.prod.yml up -d

# Monitoring
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Maintenance Docker

```bash
# Mise à jour
git pull origin main
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Sauvegarde
docker exec h2eaux-mongodb-prod mongodump --out /backup/$(date +%Y%m%d)

# Nettoyage
docker system prune -f
```

---

## 🧪 Tests et Validation

### 1. Tests Locaux

```bash
# Tests backend
cd backend
source venv/bin/activate
pytest tests/ -v

# Tests frontend
cd frontend
# Tester manuellement avec les comptes :
# admin / admin123
# employe1 / employe123
```

### 2. Tests de Production

```bash
# Health checks
curl https://votre-domaine.com/api/health
curl https://votre-domaine.com/

# Tests PWA
# 1. Ouvrir https://votre-domaine.com dans Chrome
# 2. DevTools > Application > Service Workers
# 3. Vérifier l'installation PWA
# 4. Tester mode hors ligne
```

### 3. Tests de Performance

```bash
# Tests de charge (optionnel)
# Installation d'Apache Bench
apt install apache2-utils

# Test API
ab -n 100 -c 10 https://votre-domaine.com/api/health

# Test frontend
ab -n 100 -c 10 https://votre-domaine.com/
```

---

## 🔧 Maintenance

### 1. Sauvegardes Automatiques

```bash
# Script de sauvegarde
cat > /usr/local/bin/backup-h2eaux.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/h2eaux-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Base de données
mongodump --db h2eaux_gestion --out "$BACKUP_DIR/db"

# Application
cp -r /var/www/h2eaux-gestion "$BACKUP_DIR/app"

# Logs
cp -r /var/log/supervisor/h2eaux* "$BACKUP_DIR/logs"

# Nettoyage (garder 30 jours)
find /backup -name "h2eaux-*" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-h2eaux.sh

# Cron job
crontab -e
# Ajouter : 0 2 * * * /usr/local/bin/backup-h2eaux.sh
```

### 2. Monitoring

```bash
# Vérification des services
cat > /usr/local/bin/check-h2eaux.sh << 'EOF'
#!/bin/bash
# Vérifier les services
supervisorctl status h2eaux-backend h2eaux-frontend
systemctl is-active nginx mongod

# Tester les endpoints
curl -f https://votre-domaine.com/api/health || echo "Backend DOWN"
curl -f https://votre-domaine.com/ > /dev/null || echo "Frontend DOWN"
EOF

chmod +x /usr/local/bin/check-h2eaux.sh
```

### 3. Mise à Jour

```bash
# Script de mise à jour
cat > /usr/local/bin/update-h2eaux.sh << 'EOF'
#!/bin/bash
cd /var/www/h2eaux-gestion

# Sauvegarde avant mise à jour
/usr/local/bin/backup-h2eaux.sh

# Récupération des modifications
git pull origin main

# Mise à jour des dépendances si nécessaire
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Redémarrage des services
supervisorctl restart h2eaux-backend h2eaux-frontend
systemctl reload nginx
EOF

chmod +x /usr/local/bin/update-h2eaux.sh
```

### 4. Logs et Debugging

```bash
# Logs principaux
tail -f /var/log/supervisor/h2eaux-backend.log
tail -f /var/log/supervisor/h2eaux-frontend.log
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
tail -f /var/log/mongodb/mongod.log

# Espace disque
df -h
du -sh /var/www/h2eaux-gestion
du -sh /backup

# Processus
ps aux | grep -E "(uvicorn|python|nginx|mongod)"
supervisorctl status
```

---

## 🆘 Dépannage

### Problèmes Courants

**1. Erreur 502 Bad Gateway**
```bash
# Vérifier le backend
supervisorctl status h2eaux-backend
tail -f /var/log/supervisor/h2eaux-backend.log
```

**2. Service Worker ne se charge pas**
```bash
# Vérifier les headers nginx
curl -I https://votre-domaine.com/sw-advanced.js
```

**3. Base de données inaccessible**
```bash
systemctl status mongod
mongo --eval "db.adminCommand('ismaster')"
```

**4. Certificat SSL expiré**
```bash
certbot certificates
certbot renew --dry-run
```

---

## 🎉 Validation Finale

### Checklist de Déploiement

- [ ] Repository GitHub créé et configuré
- [ ] Application déployée et accessible
- [ ] SSL configuré et fonctionnel
- [ ] Tous les modules accessibles
- [ ] Plan 2D opérationnel
- [ ] Exports PDF fonctionnels
- [ ] PWA installable sur mobile
- [ ] Mode hors ligne testé
- [ ] Sauvegardes configurées
- [ ] Monitoring en place
- [ ] Documentation à jour

### Accès Final

- **URL Production** : https://votre-domaine.com
- **Admin** : admin / admin123
- **Employé** : employe1 / employe123

**🚀 Votre application H2EAUX GESTION PWA est maintenant en production !**