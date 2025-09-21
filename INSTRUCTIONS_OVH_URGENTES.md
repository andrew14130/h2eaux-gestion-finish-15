# 🚨 **INSTRUCTIONS URGENTES - CORRIGER VOTRE APPLICATION SUR OVH**

## ⚡ **CORRECTION IMMÉDIATE - 5 MINUTES**

### **1. Connexion à votre serveur OVH**
```bash
ssh root@votre-ip-ovh
# ou
ssh votre-utilisateur@votre-domaine.com
```

### **2. Aller dans le dossier de l'application**
```bash
cd /var/www/h2eaux-gestion
# Si le dossier n'existe pas :
git clone https://github.com/votre-username/h2eaux-gestion.git /var/www/h2eaux-gestion
cd /var/www/h2eaux-gestion
```

### **3. Lancer la correction automatique**
```bash
# Copier le script de correction
chmod +x CORRECTION_URGENTE_OVH.sh
./CORRECTION_URGENTE_OVH.sh
```

### **4. Saisir votre domaine quand demandé**
```
Exemple: mondomaine.com
(SANS http:// ou https://)
```

---

## 🔧 **SI LE SCRIPT NE FONCTIONNE PAS - CORRECTION MANUELLE**

### **Étape 1 : Corriger le fichier app.js**
```bash
cd /var/www/h2eaux-gestion/frontend/js
nano app.js
```

**Chercher la ligne 5 et remplacer :**
```javascript
// ANCIEN (ligne 5) :
apiUrl: 'https://h2eaux-deploy.preview.emergentagent.com/api',

// NOUVEAU :
apiUrl: this.getApiUrl(),
```

**Ajouter après la ligne "this.init();" :**
```javascript
getApiUrl() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:8001/api`;
    }
    
    return `${protocol}//${hostname}/api`;
}
```

### **Étape 2 : Configurer le backend**
```bash
cd /var/www/h2eaux-gestion/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Créer le fichier .env
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=h2eaux_gestion
JWT_SECRET=h2eaux-secret-ultra-securise-changez-moi
ENVIRONMENT=production
ALLOWED_ORIGINS=*
EOF
```

### **Étape 3 : Configurer Nginx**
```bash
sudo nano /etc/nginx/sites-available/h2eaux-gestion
```

**Contenu du fichier (remplacez VOTRE-DOMAINE.COM) :**
```nginx
server {
    listen 80;
    server_name VOTRE-DOMAINE.COM www.VOTRE-DOMAINE.COM;
    
    location /api/ {
        proxy_pass http://localhost:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    location / {
        root /var/www/h2eaux-gestion/frontend;
        try_files $uri $uri/ /index.html;
    }
}
```

### **Étape 4 : Activer la configuration**
```bash
sudo ln -sf /etc/nginx/sites-available/h2eaux-gestion /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### **Étape 5 : Démarrer les services**
```bash
# Démarrer MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Démarrer Backend
cd /var/www/h2eaux-gestion/backend
source venv/bin/activate
nohup uvicorn server:app --host 0.0.0.0 --port 8001 > backend.log 2>&1 &

# Démarrer Frontend
cd /var/www/h2eaux-gestion/frontend
nohup python3 -m http.server 3000 > frontend.log 2>&1 &
```

### **Étape 6 : Tests**
```bash
# Test backend
curl http://localhost:8001/api/health

# Test complet
curl http://VOTRE-DOMAINE.COM/api/health
```

---

## ✅ **VÉRIFICATION FINALE**

### **1. Ouvrir votre navigateur**
```
http://VOTRE-DOMAINE.COM
```

### **2. Se connecter avec :**
```
Admin: admin / admin123
Employé: employe1 / employe123
```

### **3. Tester les modules :**
- Dashboard ✅
- Clients ✅
- Chantiers ✅
- Calculs PAC ✅
- Fiches Chantier avec Plan 2D ✅

---

## 🆘 **EN CAS DE PROBLÈME**

### **Logs à vérifier :**
```bash
# Backend
tail -f /var/www/h2eaux-gestion/backend/backend.log

# Frontend  
tail -f /var/www/h2eaux-gestion/frontend/frontend.log

# Nginx
sudo tail -f /var/log/nginx/error.log
```

### **Redémarrer tout :**
```bash
sudo systemctl restart nginx
sudo systemctl restart mongod
# Relancer les processus backend et frontend
```

---

## 📞 **CONTACT D'URGENCE**

Si ça ne fonctionne TOUJOURS pas après ces corrections :

1. **Vérifiez que votre domaine pointe vers votre serveur OVH**
2. **Vérifiez que les ports 80, 8001, 3000 sont ouverts**
3. **Vérifiez que MongoDB est démarré : `sudo systemctl status mongod`**

**L'application DOIT maintenant fonctionner à 100% !**