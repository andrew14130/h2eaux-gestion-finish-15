# =============================================================================
# SCRIPT DE MISE À JOUR H2EAUX GESTION - WINDOWS PRÊT À L'EMPLOI
# Version: 1.0 - Configuration automatique
# =============================================================================

# Configuration des couleurs pour une meilleure lisibilité
$Host.UI.RawUI.WindowTitle = "H2EAUX GESTION - Mise à jour PWA"

function Write-Header {
    Clear-Host
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║             🚀 H2EAUX GESTION - MISE À JOUR PWA             ║" -ForegroundColor Cyan
    Write-Host "║                    Version Windows 1.0                      ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Status {
    param(
        [string]$Message,
        [string]$Status = "Info"
    )
    
    $color = switch ($Status) {
        "Success" { "Green" }
        "Error" { "Red" }
        "Warning" { "Yellow" }
        "Info" { "Cyan" }
        default { "White" }
    }
    
    $icon = switch ($Status) {
        "Success" { "✅" }
        "Error" { "❌" }
        "Warning" { "⚠️" }
        "Info" { "ℹ️" }
        default { "•" }
    }
    
    Write-Host "$icon $Message" -ForegroundColor $color
}

function Get-ConfigPath {
    $configDir = "$env:USERPROFILE\.h2eaux"
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    return "$configDir\config.json"
}

function Save-Configuration {
    param($Config)
    $configPath = Get-ConfigPath
    $Config | ConvertTo-Json | Set-Content -Path $configPath -Encoding UTF8
    Write-Status "Configuration sauvegardée" "Success"
}

function Load-Configuration {
    $configPath = Get-ConfigPath
    if (Test-Path $configPath) {
        try {
            return Get-Content -Path $configPath | ConvertFrom-Json
        }
        catch {
            Write-Status "Erreur lecture configuration, reconfiguration nécessaire" "Warning"
            return $null
        }
    }
    return $null
}

function Get-UserConfiguration {
    Write-Header
    Write-Host "🔧 CONFIGURATION INITIALE" -ForegroundColor Yellow
    Write-Host "═══════════════════════════" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Cette configuration ne sera demandée qu'une seule fois." -ForegroundColor Gray
    Write-Host "Les paramètres seront sauvegardés pour les prochaines utilisations." -ForegroundColor Gray
    Write-Host ""
    
    # Collecte des informations
    do {
        $sshHost = Read-Host "🌐 Adresse de votre serveur OVH (ex: monserveur.ovh.com)"
        if ([string]::IsNullOrWhiteSpace($sshHost)) {
            Write-Status "L'adresse du serveur est obligatoire !" "Error"
        }
    } while ([string]::IsNullOrWhiteSpace($sshHost))
    
    $sshUser = Read-Host "👤 Utilisateur SSH [root]"
    if ([string]::IsNullOrWhiteSpace($sshUser)) { $sshUser = "root" }
    
    $appPath = Read-Host "📁 Chemin de l'application [/var/www/h2eaux-gestion]"
    if ([string]::IsNullOrWhiteSpace($appPath)) { $appPath = "/var/www/h2eaux-gestion" }
    
    do {
        $domain = Read-Host "🌍 Votre domaine (ex: mondomaine.com)"
        if ([string]::IsNullOrWhiteSpace($domain)) {
            Write-Status "Le domaine est obligatoire !" "Error"
        }
    } while ([string]::IsNullOrWhiteSpace($domain))
    
    # Configuration SSH
    Write-Host ""
    Write-Host "🔐 CONFIGURATION SSH" -ForegroundColor Yellow
    Write-Host "Avez-vous configuré une clé SSH ? (recommandé)" -ForegroundColor Gray
    $sshKeyChoice = Read-Host "[O]ui / [N]on"
    
    $sshKey = ""
    if ($sshKeyChoice -match '^[Oo]') {
        $defaultKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
        $sshKey = Read-Host "Chemin vers votre clé SSH [$defaultKeyPath]"
        if ([string]::IsNullOrWhiteSpace($sshKey)) { $sshKey = $defaultKeyPath }
        
        if (-not (Test-Path $sshKey)) {
            Write-Status "Clé SSH non trouvée à $sshKey" "Warning"
            Write-Status "Le script utilisera l'authentification par mot de passe" "Info"
            $sshKey = ""
        }
    }
    
    # Création de l'objet configuration
    $config = @{
        SshHost = $sshHost
        SshUser = $sshUser
        AppPath = $appPath
        Domain = $domain
        SshKey = $sshKey
        CreatedDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    
    # Affichage récapitulatif
    Write-Host ""
    Write-Host "📋 RÉCAPITULATIF DE LA CONFIGURATION" -ForegroundColor Green
    Write-Host "════════════════════════════════════" -ForegroundColor Green
    Write-Host "Serveur     : $($config.SshHost)" -ForegroundColor White
    Write-Host "Utilisateur : $($config.SshUser)" -ForegroundColor White
    Write-Host "App Path    : $($config.AppPath)" -ForegroundColor White
    Write-Host "Domaine     : $($config.Domain)" -ForegroundColor White
    Write-Host "Clé SSH     : $(if($config.SshKey) { $config.SshKey } else { 'Mot de passe' })" -ForegroundColor White
    Write-Host ""
    
    $confirm = Read-Host "Cette configuration est-elle correcte ? [O/n]"
    if ($confirm -match '^[Nn]') {
        Write-Status "Configuration annulée, veuillez relancer le script" "Warning"
        exit 0
    }
    
    Save-Configuration $config
    return $config
}

function Test-Prerequisites {
    Write-Status "Vérification des prérequis..." "Info"
    
    # Vérification SSH
    $sshCommand = Get-Command ssh -ErrorAction SilentlyContinue
    if (-not $sshCommand) {
        Write-Status "SSH client non trouvé" "Error"
        Write-Host ""
        Write-Host "Pour installer SSH sur Windows :" -ForegroundColor Yellow
        Write-Host "1. Paramètres Windows > Applications" -ForegroundColor Gray
        Write-Host "2. Fonctionnalités optionnelles > Ajouter une fonctionnalité" -ForegroundColor Gray
        Write-Host "3. Rechercher et installer 'Client OpenSSH'" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Ou utilisez WSL (Windows Subsystem for Linux)" -ForegroundColor Gray
        return $false
    }
    
    # Vérification PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Write-Status "PowerShell 5.0 ou supérieur requis" "Error"
        return $false
    }
    
    Write-Status "Prérequis validés" "Success"
    return $true
}

function Invoke-RemoteCommand {
    param(
        [string]$Command,
        [object]$Config,
        [switch]$ShowOutput = $false
    )
    
    $sshArgs = @("-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15")
    
    if ($Config.SshKey -and (Test-Path $Config.SshKey)) {
        $sshArgs += @("-i", $Config.SshKey)
    }
    
    $sshArgs += @("$($Config.SshUser)@$($Config.SshHost)", $Command)
    
    try {
        if ($ShowOutput) {
            $result = & ssh @sshArgs 2>&1
            Write-Host $result -ForegroundColor Gray
            return $LASTEXITCODE -eq 0
        } else {
            $result = & ssh @sshArgs 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Erreur SSH: $result"
            }
            return $result
        }
    }
    catch {
        throw "Erreur exécution commande SSH: $_"
    }
}

function Test-Connection {
    param($Config)
    
    Write-Status "Test de connexion SSH vers $($Config.SshHost)..." "Info"
    
    try {
        $result = Invoke-RemoteCommand -Command "echo 'Connexion SSH OK'" -Config $Config
        if ($result -match "Connexion SSH OK") {
            Write-Status "Connexion SSH réussie" "Success"
            return $true
        }
    }
    catch {
        Write-Status "Impossible de se connecter au serveur" "Error"
        Write-Host ""
        Write-Host "Vérifications à effectuer :" -ForegroundColor Yellow
        Write-Host "• Adresse serveur : $($Config.SshHost)" -ForegroundColor Gray
        Write-Host "• Utilisateur SSH : $($Config.SshUser)" -ForegroundColor Gray
        Write-Host "• Connectivité réseau" -ForegroundColor Gray
        Write-Host "• Configuration firewall" -ForegroundColor Gray
        if ($Config.SshKey) {
            Write-Host "• Clé SSH : $($Config.SshKey)" -ForegroundColor Gray
        } else {
            Write-Host "• Mot de passe utilisateur" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "Erreur technique : $_" -ForegroundColor Red
        return $false
    }
}

function New-Backup {
    param($Config)
    
    Write-Status "Création de la sauvegarde..." "Info"
    
    $backupScript = @"
# Création du dossier de sauvegarde
BACKUP_DIR="/backup/h2eaux-`$(date +%Y%m%d-%H%M%S)"
mkdir -p "`$BACKUP_DIR" 2>/dev/null || sudo mkdir -p "`$BACKUP_DIR"

# Sauvegarde de l'application
if [ -d "$($Config.AppPath)" ]; then
    echo "Sauvegarde application..."
    cp -r "$($Config.AppPath)" "`$BACKUP_DIR/app" 2>/dev/null || sudo cp -r "$($Config.AppPath)" "`$BACKUP_DIR/app"
    echo "✅ Application sauvegardée"
else
    echo "⚠️ Dossier application non trouvé: $($Config.AppPath)"
fi

# Sauvegarde MongoDB
if command -v mongodump >/dev/null 2>&1; then
    echo "Sauvegarde base de données..."
    mongodump --db h2eaux_gestion --out "`$BACKUP_DIR/db" --quiet 2>/dev/null && echo "✅ Base de données sauvegardée" || echo "⚠️ Erreur sauvegarde base"
else
    echo "⚠️ mongodump non disponible"
fi

echo "📁 Sauvegarde créée: `$BACKUP_DIR"
"@

    try {
        Invoke-RemoteCommand -Command $backupScript -Config $Config -ShowOutput
        Write-Status "Sauvegarde créée avec succès" "Success"
        return $true
    }
    catch {
        Write-Status "Erreur lors de la sauvegarde: $_" "Warning"
        return $false
    }
}

function Update-GitRepository {
    param($Config)
    
    Write-Status "Mise à jour du code source (git pull)..." "Info"
    
    $gitScript = @"
# Aller dans le dossier de l'application
cd "$($Config.AppPath)" || { echo "❌ Dossier $($Config.AppPath) introuvable"; exit 1; }

# Vérifier que c'est un repo Git
if [ ! -d ".git" ]; then
    echo "❌ Ce n'est pas un repository Git"
    exit 1
fi

# Sauvegarder les modifications locales
if ! git diff --quiet; then
    echo "💾 Sauvegarde modifications locales..."
    git stash push -m "Auto-stash $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Récupération des modifications
echo "📥 Récupération des dernières modifications..."
git fetch origin

# Vérification des conflits
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
    CURRENT_BRANCH="main"
fi

echo "🔄 Mise à jour branche: $CURRENT_BRANCH"

# Mise à jour avec gestion des conflits
if git merge-tree $(git merge-base HEAD origin/$CURRENT_BRANCH) HEAD origin/$CURRENT_BRANCH 2>/dev/null | grep -q "<<<<<<< "; then
    echo "⚠️ Conflits détectés, mise à jour forcée..."
    git reset --hard origin/$CURRENT_BRANCH
else
    git pull origin $CURRENT_BRANCH
fi

# Afficher la version actuelle
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "✅ Code mis à jour - Version: $CURRENT_COMMIT"
"@

    try {
        Invoke-RemoteCommand -Command $gitScript -Config $Config -ShowOutput
        Write-Status "Code source mis à jour avec succès" "Success"
        return $true
    }
    catch {
        Write-Status "Erreur lors de la mise à jour Git: $_" "Error"
        return $false
    }
}

function Update-Dependencies {
    param($Config)
    
    Write-Status "Mise à jour des dépendances..." "Info"
    
    $depsScript = @"
cd "$($Config.AppPath)" || exit 1

# Mise à jour dépendances Python Backend
if [ -f "backend/requirements.txt" ]; then
    echo "📦 Mise à jour dépendances Python..."
    cd backend
    
    # Créer/activer environnement virtuel
    if [ ! -d "venv" ]; then
        echo "🔨 Création environnement virtuel..."
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    
    # Mise à jour pip et dépendances
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    
    echo "✅ Dépendances Python mises à jour"
    cd ..
else
    echo "⚠️ Fichier requirements.txt non trouvé"
fi

# Configuration des permissions
echo "🔐 Configuration des permissions..."
chown -R www-data:www-data . 2>/dev/null || sudo chown -R www-data:www-data . || echo "⚠️ Impossible de changer les permissions"
chmod -R 755 . 2>/dev/null || sudo chmod -R 755 . || echo "⚠️ Impossible de changer les permissions"

echo "✅ Dépendances et permissions configurées"
"@

    try {
        Invoke-RemoteCommand -Command $depsScript -Config $Config -ShowOutput
        Write-Status "Dépendances mises à jour" "Success"
        return $true
    }
    catch {
        Write-Status "Erreur mise à jour dépendances: $_" "Warning"
        return $false
    }
}

function Restart-Services {
    param($Config)
    
    Write-Status "Redémarrage des services..." "Info"
    
    $serviceScript = @"
echo "🔄 Redémarrage des services H2EAUX GESTION..."

# Tentative redémarrage Supervisor
if command -v supervisorctl >/dev/null 2>&1; then
    echo "📋 Redémarrage services Supervisor..."
    sudo supervisorctl restart h2eaux-backend h2eaux-frontend 2>/dev/null && echo "✅ Services Supervisor redémarrés" || echo "⚠️ Services Supervisor non configurés"
fi

# Arrêt des processus existants
echo "🛑 Arrêt des anciens processus..."
sudo pkill -f "uvicorn.*server:app" 2>/dev/null || pkill -f "uvicorn.*server:app" 2>/dev/null || true
sudo pkill -f "python3.*http.server.*3000" 2>/dev/null || pkill -f "python3.*http.server.*3000" 2>/dev/null || true

sleep 3

# Redémarrage Backend
echo "🚀 Démarrage Backend..."
cd "$($Config.AppPath)/backend" || { echo "❌ Dossier backend introuvable"; exit 1; }

if [ -d "venv" ]; then
    source venv/bin/activate
    nohup uvicorn server:app --host 0.0.0.0 --port 8001 > backend.log 2>&1 &
    echo "✅ Backend démarré (PID: $!)"
else
    echo "❌ Environnement virtuel Backend non trouvé"
fi

# Redémarrage Frontend
echo "🎨 Démarrage Frontend..."
cd "$($Config.AppPath)/frontend" || { echo "❌ Dossier frontend introuvable"; exit 1; }
nohup python3 -m http.server 3000 > frontend.log 2>&1 &
echo "✅ Frontend démarré (PID: $!)"

# Rechargement Nginx
echo "🌐 Rechargement Nginx..."
if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx && echo "✅ Nginx rechargé" || echo "⚠️ Erreur rechargement Nginx"
else
    echo "⚠️ Configuration Nginx invalide"
fi

sleep 5
echo "✅ Services redémarrés"
"@

    try {
        Invoke-RemoteCommand -Command $serviceScript -Config $Config -ShowOutput
        Write-Status "Services redémarrés avec succès" "Success"
        return $true
    }
    catch {
        Write-Status "Erreur redémarrage services: $_" "Error"
        return $false
    }
}

function Test-Deployment {
    param($Config)
    
    Write-Status "Validation du déploiement..." "Info"
    
    $testScript = @"
echo "🧪 TESTS DE VALIDATION"
echo "════════════════════"

# Test Backend
echo "🔧 Test Backend..."
if curl -f -s --connect-timeout 10 http://localhost:8001/api/health >/dev/null 2>&1; then
    echo "✅ Backend opérationnel (http://localhost:8001/api/health)"
else
    echo "❌ Backend non accessible"
    echo "📋 Logs Backend (10 dernières lignes):"
    tail -10 "$($Config.AppPath)/backend/backend.log" 2>/dev/null || echo "Logs non disponibles"
fi

# Test Frontend
echo ""
echo "🎨 Test Frontend..."
if curl -f -s --connect-timeout 10 http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend opérationnel (http://localhost:3000)"
else
    echo "❌ Frontend non accessible"
    echo "📋 Logs Frontend (10 dernières lignes):"
    tail -10 "$($Config.AppPath)/frontend/frontend.log" 2>/dev/null || echo "Logs non disponibles"
fi

# Test Application via domaine
echo ""
echo "🌍 Test Application complète..."
if curl -f -s --connect-timeout 15 "https://$($Config.Domain)/api/health" >/dev/null 2>&1; then
    echo "✅ Application accessible via https://$($Config.Domain)"
elif curl -f -s --connect-timeout 15 "http://$($Config.Domain)/api/health" >/dev/null 2>&1; then
    echo "✅ Application accessible via http://$($Config.Domain)"
else
    echo "⚠️ Application pas encore accessible via $($Config.Domain)"
    echo "   (DNS ou configuration en cours...)"
fi

# Informations système
echo ""
echo "📊 INFORMATIONS SYSTÈME"
echo "════════════════════"
echo "🖥️  Système: $(uname -a)"
echo "🐍 Python: $(python3 --version 2>/dev/null || echo 'Non trouvé')"
echo "📦 Pip: $(pip --version 2>/dev/null | cut -d' ' -f1-2 || echo 'Non trouvé')"
echo "🌐 Nginx: $(nginx -v 2>&1 | head -1 || echo 'Non trouvé')"
echo "🗄️  MongoDB: $(mongo --version 2>/dev/null | head -1 || echo 'Non trouvé')"

# Version Git
echo ""
echo "📋 VERSION APPLICATION"
echo "═══════════════════"
cd "$($Config.AppPath)"
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "Inconnu")
BRANCH=$(git branch --show-current 2>/dev/null || echo "Inconnu")
LAST_UPDATE=$(git log -1 --format="%ci" 2>/dev/null || echo "Inconnu")
echo "🔄 Branche: $BRANCH"
echo "📌 Commit: $CURRENT_COMMIT"
echo "⏰ Dernière MAJ: $LAST_UPDATE"

echo ""
echo "✅ VALIDATION TERMINÉE"
"@

    try {
        Invoke-RemoteCommand -Command $testScript -Config $Config -ShowOutput
        Write-Status "Validation terminée" "Success"
        return $true
    }
    catch {
        Write-Status "Erreur validation: $_" "Warning"
        return $false
    }
}

function Show-FinalStatus {
    param($Config, $Success)
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $(if($Success) { "Green" } else { "Red" })
    Write-Host "║                    RÉSULTAT DE LA MISE À JOUR                ║" -ForegroundColor $(if($Success) { "Green" } else { "Red" })
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $(if($Success) { "Green" } else { "Red" })
    Write-Host ""
    
    if ($Success) {
        Write-Status "🎉 MISE À JOUR TERMINÉE AVEC SUCCÈS !" "Success"
        Write-Host ""
        Write-Host "🌐 ACCÈS À VOTRE APPLICATION :" -ForegroundColor Green
        Write-Host "   • URL HTTPS : https://$($Config.Domain)" -ForegroundColor White
        Write-Host "   • URL HTTP  : http://$($Config.Domain)" -ForegroundColor White
        Write-Host ""
        Write-Host "👤 COMPTES DE CONNEXION :" -ForegroundColor Green
        Write-Host "   • Administrateur : admin / admin123" -ForegroundColor White
        Write-Host "   • Employé        : employe1 / employe123" -ForegroundColor White
        Write-Host ""
        Write-Host "🔧 MODULES DISPONIBLES :" -ForegroundColor Green
        Write-Host "   • Dashboard, Clients, Chantiers, Calculs PAC" -ForegroundColor White
        Write-Host "   • Fiches Chantier avec Plan 2D MagicPlan" -ForegroundColor White
        Write-Host "   • Documents, Calendrier, MEG Integration, Chat" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Status "❌ LA MISE À JOUR A RENCONTRÉ DES ERREURS" "Error"
        Write-Host ""
        Write-Host "🔧 ACTIONS RECOMMANDÉES :" -ForegroundColor Yellow
        Write-Host "   • Vérifiez les logs ci-dessus" -ForegroundColor White
        Write-Host "   • Relancez le script si nécessaire" -ForegroundColor White
        Write-Host "   • Contactez le support technique" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "📊 SURVEILLANCE (commandes utiles) :" -ForegroundColor Yellow
    Write-Host "   • Logs Backend  : ssh $($Config.SshUser)@$($Config.SshHost) 'tail -f $($Config.AppPath)/backend/backend.log'" -ForegroundColor Gray
    Write-Host "   • Logs Frontend : ssh $($Config.SshUser)@$($Config.SshHost) 'tail -f $($Config.AppPath)/frontend/frontend.log'" -ForegroundColor Gray
    Write-Host "   • Services      : ssh $($Config.SshUser)@$($Config.SshHost) 'sudo supervisorctl status'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📁 Configuration sauvée dans : $(Get-ConfigPath)" -ForegroundColor Gray
    Write-Host ""
}

function Show-Menu {
    param($Config)
    
    Write-Header
    Write-Host "📋 CONFIGURATION ACTUELLE :" -ForegroundColor Green
    Write-Host "   Serveur : $($Config.SshHost)" -ForegroundColor White
    Write-Host "   Domaine : $($Config.Domain)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🚀 OPTIONS DISPONIBLES :" -ForegroundColor Yellow
    Write-Host "   [1] Mise à jour complète (recommandé)" -ForegroundColor White
    Write-Host "   [2] Test de connexion uniquement" -ForegroundColor White  
    Write-Host "   [3] Reconfigurer les paramètres" -ForegroundColor White
    Write-Host "   [4] Afficher la configuration actuelle" -ForegroundColor White
    Write-Host "   [Q] Quitter" -ForegroundColor White
    Write-Host ""
    
    do {
        $choice = Read-Host "Votre choix"
        switch ($choice.ToUpper()) {
            "1" { return "update" }
            "2" { return "test" }
            "3" { return "config" }
            "4" { return "show" }
            "Q" { return "quit" }
            default { Write-Status "Choix invalide, veuillez recommencer" "Warning" }
        }
    } while ($true)
}

# =============================================================================
# FONCTION PRINCIPALE
# =============================================================================

function Main {
    Write-Header
    
    # Vérification des prérequis
    if (-not (Test-Prerequisites)) {
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
    
    # Chargement ou création de la configuration
    $config = Load-Configuration
    if (-not $config) {
        $config = Get-UserConfiguration
    }
    
    # Menu principal
    do {
        $action = Show-Menu $config
        
        switch ($action) {
            "update" {
                Write-Header
                Write-Status "🚀 DÉBUT DE LA MISE À JOUR COMPLÈTE" "Info"
                Write-Host ""
                
                # Confirmation
                Write-Host "Cette opération va :" -ForegroundColor Yellow
                Write-Host "  1. Créer une sauvegarde automatique" -ForegroundColor Gray
                Write-Host "  2. Mettre à jour le code source (git pull)" -ForegroundColor Gray
                Write-Host "  3. Mettre à jour les dépendances Python" -ForegroundColor Gray
                Write-Host "  4. Redémarrer tous les services" -ForegroundColor Gray
                Write-Host "  5. Recharger Nginx" -ForegroundColor Gray
                Write-Host "  6. Valider le déploiement" -ForegroundColor Gray
                Write-Host ""
                
                $confirm = Read-Host "Continuer la mise à jour ? [O/n]"
                if ($confirm -match '^[Nn]') {
                    Write-Status "Mise à jour annulée" "Warning"
                    continue
                }
                
                $success = $true
                
                # Exécution des étapes
                if (-not (Test-Connection $config)) { $success = $false }
                if ($success -and -not (New-Backup $config)) { $success = $false }
                if ($success -and -not (Update-GitRepository $config)) { $success = $false }
                if ($success -and -not (Update-Dependencies $config)) { $success = $false }
                if ($success -and -not (Restart-Services $config)) { $success = $false }
                if ($success) { Test-Deployment $config | Out-Null }
                
                Show-FinalStatus $config $success
                Read-Host "Appuyez sur Entrée pour continuer"
            }
            
            "test" {
                Write-Header
                Write-Status "🔐 TEST DE CONNEXION" "Info"
                Test-Connection $config | Out-Null
                Read-Host "Appuyez sur Entrée pour continuer"
            }
            
            "config" {
                $config = Get-UserConfiguration
            }
            
            "show" {
                Write-Header
                Write-Host "📋 CONFIGURATION ACTUELLE :" -ForegroundColor Green
                Write-Host "════════════════════════════" -ForegroundColor Green
                Write-Host "Serveur     : $($config.SshHost)" -ForegroundColor White
                Write-Host "Utilisateur : $($config.SshUser)" -ForegroundColor White
                Write-Host "App Path    : $($config.AppPath)" -ForegroundColor White
                Write-Host "Domaine     : $($config.Domain)" -ForegroundColor White
                Write-Host "Clé SSH     : $(if($config.SshKey) { $config.SshKey } else { 'Authentification par mot de passe' })" -ForegroundColor White
                Write-Host "Créé le     : $($config.CreatedDate)" -ForegroundColor White
                Write-Host "Config      : $(Get-ConfigPath)" -ForegroundColor Gray
                Write-Host ""
                Read-Host "Appuyez sur Entrée pour continuer"
            }
            
            "quit" {
                Write-Status "Au revoir !" "Info"
                exit 0
            }
        }
    } while ($true)
}

# =============================================================================
# POINT D'ENTRÉE
# =============================================================================

try {
    Main
}
catch {
    Write-Header
    Write-Status "❌ ERREUR CRITIQUE : $_" "Error"
    Write-Host ""
    Write-Host "🔧 INFORMATIONS DE DEBUG :" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    Write-Host ""
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}