# 🔄 Guide de Mise à Jour H2EAUX GESTION PWA

## 📋 Scripts de Mise à Jour Automatique

Vous disposez maintenant de deux scripts pour mettre à jour votre application PWA sur le serveur OVH depuis votre PC :

### **🐧 Linux/Mac : `update-h2eaux.sh`**
### **🪟 Windows : `update-h2eaux.ps1`**

---

## ⚙️ Configuration Initiale

### **1. Modifier les Paramètres par Défaut**

**Linux/Mac** (`update-h2eaux.sh`) - Lignes 13-17 :
```bash
DEFAULT_SSH_HOST="votre-serveur-ovh.com"     # Remplacez par votre serveur
DEFAULT_SSH_USER="root"                      # Votre utilisateur SSH
DEFAULT_SSH_KEY=""                           # Chemin vers votre clé SSH (optionnel)
DEFAULT_APP_PATH="/var/www/h2eaux-gestion"   # Chemin de l'application
DEFAULT_DOMAIN="votre-domaine.com"           # Votre domaine
```

**Windows** (`update-h2eaux.ps1`) - Paramètres par défaut :
```powershell
param(
    [string]$SshHost = "mon-serveur.ovh.com",      # Votre serveur
    [string]$SshUser = "root",                     # Votre utilisateur
    [string]$AppPath = "/var/www/h2eaux-gestion",  # Chemin application
    [string]$Domain = "mon-domaine.com"            # Votre domaine
)
```

---

## 🚀 Utilisation

### **Linux/Mac**

```bash
# 1. Rendre le script exécutable
chmod +x update-h2eaux.sh

# 2. Utilisation avec paramètres par défaut
./update-h2eaux.sh

# 3. Utilisation avec paramètres personnalisés
./update-h2eaux.sh mon-serveur.ovh.com root /var/www/h2eaux-gestion mon-domaine.com
```

### **Windows PowerShell**

```powershell
# 1. Ouvrir PowerShell en tant qu'administrateur

# 2. Autoriser l'exécution de scripts (si nécessaire)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# 3. Utilisation avec paramètres par défaut
.\update-h2eaux.ps1

# 4. Utilisation avec paramètres personnalisés
.\update-h2eaux.ps1 -SshHost "mon-serveur.ovh.com" -Domain "mon-domaine.com"
```

---

## 🔧 Ce que Font les Scripts

### **Étapes Automatiques :**

1. **🔐 Test de Connexion SSH**
   - Vérification de l'accès au serveur
   - Validation des paramètres

2. **💾 Sauvegarde Automatique**
   - Sauvegarde de l'application dans `/backup/h2eaux-YYYYMMDD-HHMMSS/`
   - Sauvegarde de la base MongoDB (si disponible)

3. **📥 Mise à Jour du Code**
   - `git stash` des modifications locales
   - `git pull origin main`
   - Gestion automatique des conflits

4. **📦 Mise à Jour des Dépendances**
   - Mise à jour `pip` et `requirements.txt`
   - Création/activation environnement virtuel Python
   - Configuration des permissions

5. **🔄 Redémarrage des Services**
   - Arrêt des anciens processus
   - Redémarrage Backend (uvicorn)
   - Redémarrage Frontend (http.server)
   - Rechargement Nginx

6. **🧪 Validation**
   - Test Backend : `http://localhost:8001/api/health`
   - Test Frontend : `http://localhost:3000`
   - Test complet : `http://votre-domaine.com/api/health`
   - Affichage version Git

---

## 🔑 Configuration SSH

### **Clés SSH (Recommandé)**

1. **Générer une clé SSH** (si pas déjà fait) :
```bash
ssh-keygen -t rsa -b 4096 -C "votre-email@example.com"
```

2. **Copier la clé sur le serveur** :
```bash
ssh-copy-id root@votre-serveur-ovh.com
```

3. **Spécifier la clé dans le script** :
```bash
DEFAULT_SSH_KEY="/home/user/.ssh/id_rsa"  # Linux/Mac
```

### **Mot de Passe SSH**
Si vous utilisez un mot de passe SSH, il vous sera demandé automatiquement lors de l'exécution.

---

## 📊 Surveillance et Logs

### **Commandes de Surveillance Fournies :**

```bash
# Logs Backend en temps réel
ssh root@votre-serveur.com 'tail -f /var/www/h2eaux-gestion/backend/backend.log'

# Logs Frontend en temps réel
ssh root@votre-serveur.com 'tail -f /var/www/h2eaux-gestion/frontend/frontend.log'

# Status des services Supervisor
ssh root@votre-serveur.com 'sudo supervisorctl status'
```

### **Vérifications Manuelles :**

```bash
# Vérifier que l'application fonctionne
curl https://votre-domaine.com/api/health

# Vérifier la version Git
ssh root@votre-serveur.com 'cd /var/www/h2eaux-gestion && git log --oneline -5'
```

---

## ❌ Dépannage

### **Erreur : "SSH client non trouvé" (Windows)**
```powershell
# Installer OpenSSH sur Windows 10/11
# Paramètres > Applications > Fonctionnalités optionnelles > OpenSSH Client
```

### **Erreur : "Permission denied"**
```bash
# Vérifier la connexion SSH
ssh root@votre-serveur-ovh.com

# Vérifier les permissions du script
chmod +x update-h2eaux.sh
```

### **Erreur : "Repository not found"**
```bash
# Se connecter au serveur et vérifier
ssh root@votre-serveur-ovh.com
cd /var/www/h2eaux-gestion
git status
```

### **Services ne redémarrent pas**
```bash
# Se connecter au serveur
ssh root@votre-serveur-ovh.com

# Vérifier les processus
ps aux | grep -E "(uvicorn|python.*http.server)"

# Redémarrage manuel
cd /var/www/h2eaux-gestion
./LANCER_APPLICATION.sh
```

---

## 🔄 Workflow de Développement Recommandé

### **1. Développement Local**
```bash
# Modifications sur votre PC
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main
```

### **2. Mise à Jour Production**
```bash
# Depuis votre PC
./update-h2eaux.sh
```

### **3. Validation**
- Vérifier https://votre-domaine.com
- Tester les fonctionnalités modifiées
- Contrôler les logs si nécessaire

---

## ⚡ Utilisation Rapide

### **Commande Unique (Linux/Mac)**
```bash
curl -sSL https://raw.githubusercontent.com/votre-username/h2eaux-gestion/main/update-h2eaux.sh | bash -s votre-serveur.ovh.com
```

### **Alias Pratique**
```bash
# Ajouter à ~/.bashrc ou ~/.zshrc
alias update-h2eaux="~/path/to/update-h2eaux.sh"

# Utilisation
update-h2eaux
```

---

## 🎯 Avantages

✅ **Mise à jour en une seule commande**  
✅ **Sauvegarde automatique avant chaque mise à jour**  
✅ **Gestion des conflits Git automatique**  
✅ **Redémarrage intelligent des services**  
✅ **Validation complète post-déploiement**  
✅ **Support Windows et Linux/Mac**  
✅ **Logs détaillés pour debugging**  

---

**🎉 Vous pouvez maintenant mettre à jour votre PWA H2EAUX GESTION en une seule commande depuis votre PC !**