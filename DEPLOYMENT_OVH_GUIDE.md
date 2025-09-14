# 🚀 Guide de déploiement H2EAUX GESTION sur OVH

## 📋 Prérequis

### Hébergement OVH recommandé
- **VPS OVH** (SSD 1 minimum) ou **Serveur Dédié**
- **Nom de domaine** avec certificat SSL
- **Ubuntu 22.04 LTS** ou **Debian 12**

### Spécifications techniques
- **RAM** : 2 GB minimum, 4 GB recommandé
- **Stockage** : 20 GB SSD minimum
- **Bande passante** : Illimitée recommandée
- **Python** : 3.11+
- **Node.js** : 18+ (pour les outils de build)

---

## 🔧 Installation sur serveur OVH

### 1. Connexion au serveur
```bash
ssh root@votre-serveur-ovh.com
```

### 2. Mise à jour du système
```bash
apt update && apt upgrade -y
apt install -y python3 python3-pip python3-venv nginx mongodb supervisor certbot python3-certbot-nginx git curl
```

### 3. Configuration MongoDB
```bash
# Démarrer MongoDB
systemctl start mongod
systemctl enable mongod

# Créer utilisateur admin (optionnel mais recommandé)
mongosh --eval "
db.createUser({
  user: 'h2eaux_admin',
  pwd: 'CHANGEZ_CE_MOT_DE_PASSE',
  roles: [{ role: 'readWrite', db: 'h2eaux_gestion' }]
})
"
```

### 4. Clonage et installation de l'application
```bash
# Créer utilisateur dédié
useradd -m -s /bin/bash h2eaux
su - h2eaux

# Cloner le projet
git clone https://github.com/andrew14130/h2eaux4.0.git h2eaux-app
cd h2eaux-app

# Installation backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 5. Configuration environnement
```bash
# Créer .env backend
cat > backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=h2eaux_gestion
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=https://votre-domaine.com
ENVIRONMENT=production
EOF

# Configuration supervisor
sudo tee /etc/supervisor/conf.d/h2eaux-backend.conf << EOF
[program:h2eaux-backend]
command=/home/h2eaux/h2eaux-app/backend/venv/bin/python /home/h2eaux/h2eaux-app/backend/server.py
directory=/home/h2eaux/h2eaux-app/backend
user=h2eaux
autostart=true
autorestart=true
stdout_logfile=/var/log/h2eaux-backend.log
stderr_logfile=/var/log/h2eaux-backend-error.log
environment=PORT=8001
EOF
```

### 6. Configuration Nginx
```bash
sudo tee /etc/nginx/sites-available/h2eaux << EOF
server {
    server_name votre-domaine.com www.votre-domaine.com;
    
    # Frontend
    location / {
        root /home/h2eaux/h2eaux-app/frontend;
        try_files \$uri \$uri/ /index.html;
        index index.html;
        
        # PWA optimizations
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Service Worker - no cache
        location = /sw-advanced.js {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        
        location = /sw.js {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        
        # Manifest
        location = /manifest.json {
            expires 7d;
            add_header Cache-Control "public";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

# Activer le site
sudo ln -s /etc/nginx/sites-available/h2eaux /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
```

### 7. Certificat SSL avec Let's Encrypt
```bash
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

### 8. Démarrage des services
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start h2eaux-backend
sudo systemctl restart nginx
```

---

## 🔄 Script de déploiement automatique

### Créer script de mise à jour
```bash
sudo tee /home/h2eaux/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Déploiement H2EAUX GESTION"

# Variables
APP_DIR="/home/h2eaux/h2eaux-app"
BACKUP_DIR="/home/h2eaux/backups/$(date +%Y%m%d_%H%M%S)"

# Sauvegarde
echo "📦 Création sauvegarde..."
mkdir -p "$BACKUP_DIR"
cp -r "$APP_DIR" "$BACKUP_DIR/"
mongodump --db h2eaux_gestion --out "$BACKUP_DIR/db/"

# Mise à jour du code
echo "📥 Mise à jour du code..."
cd "$APP_DIR"
git pull origin main

# Mise à jour des dépendances
echo "📚 Mise à jour des dépendances..."
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Redémarrage des services
echo "🔄 Redémarrage des services..."
sudo supervisorctl restart h2eaux-backend
sudo systemctl reload nginx

# Test de santé
echo "🏥 Test de santé..."
sleep 5
if curl -f http://localhost:8001/api/health > /dev/null 2>&1; then
    echo "✅ Déploiement réussi!"
else
    echo "❌ Échec du déploiement - restoration de la sauvegarde..."
    sudo supervisorctl stop h2eaux-backend
    rm -rf "$APP_DIR"
    cp -r "$BACKUP_DIR/h2eaux-app" "$APP_DIR"
    mongorestore --db h2eaux_gestion --drop "$BACKUP_DIR/db/h2eaux_gestion/"
    sudo supervisorctl start h2eaux-backend
    exit 1
fi

echo "🎉 Déploiement terminé avec succès!"
EOF

chmod +x /home/h2eaux/deploy.sh
```

---

## 📱 Optimisations PWA pour Android

### 1. Headers HTTP spéciaux
Ajouter dans la configuration Nginx :
```nginx
# Dans le bloc server
add_header X-PWA-Capable "yes";
add_header X-PWA-Theme-Color "#007AFF";

# Pour les fichiers manifest et service worker
location = /manifest.json {
    add_header Content-Type application/manifest+json;
    add_header Access-Control-Allow-Origin *;
}
```

### 2. Configuration des icônes
S'assurer que tous les fichiers d'icônes sont présents :
```bash
ls -la /home/h2eaux/h2eaux-app/frontend/assets/icon-*.png
```

### 3. Test PWA
Utiliser les outils de développement Chrome :
- Onglet "Application" > "Manifest"
- Vérifier "Service Workers"
- Tester "Add to Home Screen"

---

## 🔒 Sécurité Production

### 1. Firewall
```bash
sudo ufw enable
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
```

### 2. Sauvegarde automatique
```bash
# Crontab pour sauvegarde quotidienne
sudo crontab -e

# Ajouter cette ligne
0 2 * * * /home/h2eaux/backup.sh
```

### 3. Script de sauvegarde
```bash
sudo tee /home/h2eaux/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/h2eaux/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Sauvegarde application
tar -czf "$BACKUP_DIR/app.tar.gz" -C /home/h2eaux h2eaux-app

# Sauvegarde base de données
mongodump --db h2eaux_gestion --out "$BACKUP_DIR/db/"

# Nettoyage (garder 7 jours)
find /home/h2eaux/backups -type d -mtime +7 -exec rm -rf {} +
EOF

chmod +x /home/h2eaux/backup.sh
```

---

## 🚀 Mise en production

### 1. Configuration finale
- Modifier `js/app.js` : changer `apiUrl` vers votre domaine
- Vérifier tous les endpoints API
- Tester l'authentification

### 2. Optimisations performances
```bash
# Compression Brotli (optionnel)
sudo apt install nginx-module-brotli
```

### 3. Monitoring
```bash
# Logs en temps réel
sudo tail -f /var/log/h2eaux-backend.log
sudo tail -f /var/log/nginx/access.log
```

### 4. Test final
- Tester sur différents appareils Android
- Vérifier l'installation PWA
- Tester le mode hors ligne
- Vérifier les mises à jour automatiques

---

## 📞 Support et maintenance

### Commandes utiles
```bash
# Status des services
sudo supervisorctl status
sudo systemctl status nginx mongodb

# Redémarrage complet
sudo supervisorctl restart all
sudo systemctl restart nginx

# Logs détaillés
sudo journalctl -f -u supervisor
```

### Résolution de problèmes courants
1. **Service Worker ne se met pas à jour** : Vider le cache du navigateur
2. **API non accessible** : Vérifier les proxies Nginx
3. **MongoDB connection error** : Vérifier le statut du service
4. **Certificat SSL expiré** : `sudo certbot renew`

---

## 📈 Optimisations avancées

### CDN OVH (optionnel)
- Utiliser le CDN OVH pour les assets statiques
- Configuration dans les headers Nginx

### Cache Redis (optionnel)
- Pour les données fréquemment consultées
- Installation : `apt install redis-server`

### Surveillance
- Utiliser OVH Monitoring
- Configurer des alertes sur la charge serveur

---

**🎯 Votre application H2EAUX GESTION est maintenant prête pour la production sur OVH !**