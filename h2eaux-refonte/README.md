# 🚀 H2EAUX GESTION - PWA Déployable VPS Debian

[![Deploy Status](https://img.shields.io/badge/Deploy-Ready-green.svg)](https://github.com/andrew14130/h2eaux-gestion-finish-3)
[![PWA](https://img.shields.io/badge/PWA-Compatible-blue.svg)]()
[![Debian](https://img.shields.io/badge/Debian-Compatible-red.svg)]()

**Application PWA professionnelle** pour la gestion de plomberie, climatisation et chauffage avec Plan 2D MagicPlan intégré.

## 🎯 Déploiement One-Liner sur VPS Debian

### **Prérequis**
- VPS Debian fraîchement réinitialisé
- PowerShell sur votre PC Windows
- Accès SSH au VPS (clé SSH recommandée)

### **Variables à Configurer**
Remplacez ces variables dans la commande ci-dessous :
- `VPS_IP` : Adresse IP de votre VPS
- `VPS_USER` : Utilisateur SSH (généralement `root`)
- `DOMAIN` : Votre domaine (optionnel pour HTTPS ultérieur)

### **🚀 COMMANDE ONE-LINER À COPIER-COLLER :**

```powershell
# Téléchargement et exécution du script de déploiement
iwr -useb "https://raw.githubusercontent.com/andrew14130/h2eaux-gestion-finish-3/main/scripts_windows/deploy_local_to_vps.ps1" | iex; Deploy-H2eauxToVPS -VpsIp "VOTRE_VPS_IP" -VpsUser "root" -Domain "VOTRE_DOMAINE.com"
```

**Exemple concret :**
```powershell
iwr -useb "https://raw.githubusercontent.com/andrew14130/h2eaux-gestion-finish-3/main/scripts_windows/deploy_local_to_vps.ps1" | iex; Deploy-H2eauxToVPS -VpsIp "192.168.1.100" -VpsUser "root" -Domain "mondomaine.com"
```

### **Résultat Attendu (3-5 minutes)**
```
✅ Backend démarré sur http://VPS_IP:8001
✅ Frontend accessible sur http://VPS_IP
✅ PWA fonctionnelle avec Service Worker
✅ API Health check : OK
✅ Manifest.json configuré
✅ Prêt pour activation HTTPS
```

---

## 🔒 Activation HTTPS (Après Configuration DNS)

Une fois votre domaine pointé vers le VPS :

```powershell
# Script de mise à jour avec HTTPS
iwr -useb "https://raw.githubusercontent.com/andrew14130/h2eaux-gestion-finish-3/main/scripts_windows/enable_https.ps1" | iex; Enable-H2eauxHTTPS -VpsIp "VOTRE_VPS_IP" -Domain "VOTRE_DOMAINE.com"
```

---

## 🔄 Mise à Jour de l'Application

Pour mettre à jour l'application après modifications :

```powershell
# Script de mise à jour
iwr -useb "https://raw.githubusercontent.com/andrew14130/h2eaux-gestion-finish-3/main/scripts_windows/update_and_restart.ps1" | iex; Update-H2eauxApp -VpsIp "VOTRE_VPS_IP"
```

---

## 🏗️ Architecture Technique

### **Stack Technologique**
- **Backend** : FastAPI + Python 3.11
- **Frontend** : PWA (HTML5 + CSS3 + JavaScript)
- **Base de données** : MongoDB
- **Serveur web** : Nginx
- **Service** : Systemd
- **OS** : Debian stable

### **Structure du Projet**
```
h2eaux-gestion/
├── frontend/                 # PWA Frontend
│   ├── index.html           # Application principale
│   ├── manifest.json        # PWA Manifest
│   ├── sw-advanced.js       # Service Worker
│   └── assets/              # Ressources statiques
│
├── backend/                 # FastAPI Backend  
│   ├── server.py           # Serveur principal
│   ├── requirements.txt    # Dépendances Python
│   ├── .env.example       # Configuration template
│   └── tests/             # Tests unitaires
│
├── deployment/             # Configuration déploiement
│   ├── nginx/             # Configuration Nginx
│   ├── systemd/           # Services systemd
│   └── scripts/           # Scripts de vérification
│
├── scripts_windows/       # Scripts PowerShell
│   ├── deploy_local_to_vps.ps1
│   ├── update_and_restart.ps1
│   └── enable_https.ps1
│
└── docker-compose.yml     # Tests locaux
```

---

## 🧪 Tests et Validation

### **Checklist de Validation Automatique**
Le script de déploiement vérifie automatiquement :

- ✅ Service backend actif : `systemctl status h2eaux-backend`
- ✅ API Health : `curl http://localhost:8001/api/health`
- ✅ Frontend accessible : `curl http://localhost/`
- ✅ Manifest PWA : Content-Type correct
- ✅ Service Worker : Headers appropriés
- ✅ Mode hors ligne : Cache fonctionnel

### **Tests Manuel Post-Déploiement**
1. **Accès application** : `http://VPS_IP`
2. **Connexion PWA** : 
   - Admin : `admin` / `admin123`
   - Employé : `employe1` / `employe123`
3. **Service Worker** : DevTools > Application > Service Workers
4. **Mode hors ligne** : DevTools > Network > Offline

---

## 🔧 Modules Fonctionnels

### **✅ Modules Disponibles (10/10)**
1. **📊 Dashboard** - Vue d'ensemble et statistiques
2. **👥 Clients** - Gestion CRUD complète
3. **🏗️ Chantiers** - Suivi projets et statuts  
4. **🌡️ Calculs PAC** - Dimensionnement avec formules métier
5. **📋 Fiches Chantier** - **8 onglets + Plan 2D MagicPlan**
6. **📄 Documents** - Gestion documentaire
7. **📅 Calendrier** - Planning et rendez-vous
8. **🔄 MEG Integration** - Import/Export données
9. **💬 Chat Équipe** - Communication interne
10. **⚙️ Paramètres** - Administration système

### **🎯 Fonctionnalité Phare : Plan 2D MagicPlan**
- **5 outils professionnels** : Sélection, Dessin, Pièces, Cotation, Effacement
- **Canvas haute résolution** 800×600 avec grille
- **Échelles configurables** : 1:50, 1:100, 1:200
- **Sauvegarde JSON** persistante
- **Export PDF** avec plan intégré
- **Interface tactile** optimisée tablette

---

## 🐳 Tests Locaux avec Docker

```bash
# Tests en local avant déploiement VPS
git clone https://github.com/andrew14130/h2eaux-gestion-finish-3.git
cd h2eaux-gestion-finish-3
docker-compose up -d

# Accès local
# Frontend: http://localhost:3000
# Backend: http://localhost:8001
# API Health: http://localhost:8001/api/health
```

---

## 📞 Support et Dépannage

### **Logs de Debug**
```bash
# Sur le VPS après déploiement
sudo journalctl -u h2eaux-backend -f        # Logs backend
sudo tail -f /var/log/nginx/error.log       # Logs Nginx
sudo systemctl status h2eaux-backend        # Status service
```

### **Commandes Utiles**
```bash
# Redémarrer services
sudo systemctl restart h2eaux-backend
sudo systemctl reload nginx

# Vérifier configuration
sudo nginx -t
curl http://localhost:8001/api/health

# Ports utilisés
sudo netstat -tlnp | grep -E ':(80|443|8001|27017)'
```

### **Problèmes Courants**
1. **Port 8001 occupé** : Modifier dans `.env` et systemd service
2. **MongoDB non démarré** : `sudo systemctl start mongod`
3. **Nginx erreur config** : `sudo nginx -t` pour diagnostic
4. **Service Worker non chargé** : Vérifier headers MIME

---

## 🏷️ Version et Changelog

**Version actuelle** : 3.0.0
**Dernière mise à jour** : Septembre 2024
**Compatibilité** : Debian 11+, Python 3.11+, Node.js 18+

### **Changelog v3.0.0**
- ✅ Refonte complète pour déploiement VPS
- ✅ Scripts PowerShell one-liner
- ✅ Configuration Nginx/Systemd automatisée
- ✅ PWA Service Worker optimisé
- ✅ Tests de validation intégrés
- ✅ Support HTTPS avec Certbot
- ✅ Docker pour tests locaux

---

## 📄 Licence

MIT License - Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🎉 Contributeurs

**Développé pour les professionnels de la plomberie, climatisation et chauffage.**

**🚀 Prêt pour la production - Une seule commande PowerShell déploie tout !**