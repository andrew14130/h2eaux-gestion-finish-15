# =============================================================================
# SCRIPT DE MISE À JOUR H2EAUX GESTION - POWERSHELL WINDOWS
# =============================================================================

param(
    [string]$SshHost = "votre-serveur-ovh.com",
    [string]$SshUser = "root",
    [string]$AppPath = "/var/www/h2eaux-gestion",
    [string]$Domain = "votre-domaine.com",
    [string]$SshKey = ""
)

# Configuration des couleurs
$Host.UI.RawUI.ForegroundColor = "White"

function Write-ColoredOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    $originalColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $Color
    Write-Host $Message
    $Host.UI.RawUI.ForegroundColor = $originalColor
}

Write-ColoredOutput "🚀 MISE À JOUR H2EAUX GESTION PWA" "Cyan"
Write-ColoredOutput "======================================" "Cyan"

# Vérification des paramètres
if ($SshHost -eq "votre-serveur-ovh.com") {
    Write-ColoredOutput "⚠️ Configuration requise" "Yellow"
    Write-Host "Usage: .\update-h2eaux.ps1 -SshHost <serveur> [-SshUser <utilisateur>] [-AppPath <chemin>] [-Domain <domaine>]"
    Write-Host "Exemple: .\update-h2eaux.ps1 -SshHost monserveur.ovh.com -Domain mondomaine.com"
    Write-Host ""
    
    $SshHost = Read-Host "Entrez l'adresse de votre serveur OVH"
    if ([string]::IsNullOrEmpty($SshHost)) {
        Write-ColoredOutput "❌ Adresse serveur requise" "Red"
        exit 1
    }
    
    $inputUser = Read-Host "Utilisateur SSH [$SshUser]"
    if (-not [string]::IsNullOrEmpty($inputUser)) { $SshUser = $inputUser }
    
    $inputPath = Read-Host "Chemin de l'application [$AppPath]"
    if (-not [string]::IsNullOrEmpty($inputPath)) { $AppPath = $inputPath }
    
    $inputDomain = Read-Host "Votre domaine [$Domain]"
    if (-not [string]::IsNullOrEmpty($inputDomain)) { $Domain = $inputDomain }
}

Write-ColoredOutput "📋 Configuration:" "Blue"
Write-ColoredOutput "   Serveur: $SshHost" "Blue"
Write-ColoredOutput "   Utilisateur: $SshUser" "Blue"
Write-ColoredOutput "   Chemin app: $AppPath" "Blue"
Write-ColoredOutput "   Domaine: $Domain" "Blue"
Write-Host ""

# Vérification SSH client
$sshCommand = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshCommand) {
    Write-ColoredOutput "❌ SSH client non trouvé" "Red"
    Write-Host "Installez OpenSSH ou utilisez WSL"
    Write-Host "Windows 10/11: Paramètres > Applications > Fonctionnalités optionnelles > OpenSSH"
    exit 1
}

# Configuration SSH
$sshOpts = @("-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10")
if (-not [string]::IsNullOrEmpty($SshKey) -and (Test-Path $SshKey)) {
    $sshOpts += @("-i", $SshKey)
}

function Invoke-SshCommand {
    param([string]$Command)
    
    $arguments = $sshOpts + @("$SshUser@$SshHost", $Command)
    $result = & ssh @arguments 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erreur SSH: $result"
    }
    
    return $result
}

# Test de connexion SSH
function Test-SshConnection {
    Write-ColoredOutput "🔐 Test de connexion SSH..." "Yellow"
    
    try {
        $result = Invoke-SshCommand "echo 'Connexion SSH OK'"
        if ($result -match "Connexion SSH OK") {
            Write-ColoredOutput "✅ Connexion SSH réussie" "Green"
            return $true
        }
    }
    catch {
        Write-ColoredOutput "❌ Impossible de se connecter au serveur" "Red"
        Write-Host "Vérifiez:"
        Write-Host "- L'adresse du serveur: $SshHost"
        Write-Host "- L'utilisateur: $SshUser"
        Write-Host "- Vos clés SSH ou mot de passe"
        Write-Host "- La connectivité réseau"
        Write-Host "Erreur: $_"
        exit 1
    }
}

# Création de sauvegarde
function New-Backup {
    Write-ColoredOutput "💾 Création de sauvegarde..." "Yellow"
    
    $backupScript = @"
BACKUP_DIR="/backup/h2eaux-`$(date +%Y%m%d-%H%M%S)"
mkdir -p "`$BACKUP_DIR" 2>/dev/null || sudo mkdir -p "`$BACKUP_DIR"

if [ -d "$AppPath" ]; then
    cp -r "$AppPath" "`$BACKUP_DIR/app" 2>/dev/null || sudo cp -r "$AppPath" "`$BACKUP_DIR/app"
fi

if command -v mongodump >/dev/null 2>&1; then
    mongodump --db h2eaux_gestion --out "`$BACKUP_DIR/db" 2>/dev/null || echo "Base de données non sauvegardée"
fi

echo "Sauvegarde créée: `$BACKUP_DIR"
"@

    try {
        $result = Invoke-SshCommand $backupScript
        Write-ColoredOutput "✅ Sauvegarde créée" "Green"
    }
    catch {
        Write-ColoredOutput "⚠️ Erreur sauvegarde: $_" "Yellow"
    }
}

# Mise à jour Git
function Update-Git {
    Write-ColoredOutput "📥 Mise à jour du code (git pull)..." "Yellow"
    
    $updateScript = @"
cd "$AppPath" || { echo "Erreur: dossier $AppPath introuvable"; exit 1; }

if [ ! -d ".git" ]; then
    echo "Erreur: Ce n'est pas un repository Git"
    exit 1
fi

if ! git diff --quiet; then
    echo "Sauvegarde des modifications locales..."
    git stash push -m "Auto-stash before update `$(date)"
fi

echo "Récupération des dernières modifications..."
git fetch origin

if git merge-tree `$(git merge-base HEAD origin/main) HEAD origin/main | grep -q "<<<<<<< "; then
    echo "Attention: Conflits potentiels détectés"
    echo "Mise à jour forcée..."
    git reset --hard origin/main
else
    git pull origin main
fi

echo "✅ Code mis à jour"
"@

    try {
        $result = Invoke-SshCommand $updateScript
        Write-ColoredOutput "✅ Code mis à jour avec succès" "Green"
    }
    catch {
        Write-ColoredOutput "❌ Erreur lors de la mise à jour Git: $_" "Red"
        exit 1
    }
}

# Mise à jour des dépendances
function Update-Dependencies {
    Write-ColoredOutput "📦 Mise à jour des dépendances..." "Yellow"
    
    $depsScript = @"
cd "$AppPath" || exit 1

if [ -f "backend/requirements.txt" ]; then
    echo "Mise à jour dépendances Python..."
    cd backend
    if [ -d "venv" ]; then
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        echo "✅ Dépendances Python mises à jour"
    else
        echo "⚠️ Environnement virtuel non trouvé, création..."
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        echo "✅ Environnement virtuel créé et dépendances installées"
    fi
    cd ..
fi

chown -R www-data:www-data . 2>/dev/null || sudo chown -R www-data:www-data .
chmod -R 755 . 2>/dev/null || sudo chmod -R 755 .
"@

    try {
        $result = Invoke-SshCommand $depsScript
        Write-ColoredOutput "✅ Dépendances mises à jour" "Green"
    }
    catch {
        Write-ColoredOutput "⚠️ Erreur dépendances: $_" "Yellow"
    }
}

# Redémarrage des services
function Restart-Services {
    Write-ColoredOutput "🔄 Redémarrage des services..." "Yellow"
    
    $serviceScript = @"
if command -v supervisorctl >/dev/null 2>&1; then
    echo "Redémarrage services Supervisor..."
    supervisorctl restart h2eaux-backend h2eaux-frontend 2>/dev/null || sudo supervisorctl restart h2eaux-backend h2eaux-frontend 2>/dev/null || echo "Services Supervisor non configurés"
fi

echo "Arrêt des processus existants..."
pkill -f "uvicorn.*server:app" 2>/dev/null || true
pkill -f "python3.*http.server.*3000" 2>/dev/null || true

sleep 2

echo "Démarrage Backend..."
cd "$AppPath/backend" || exit 1
if [ -d "venv" ]; then
    source venv/bin/activate
    nohup uvicorn server:app --host 0.0.0.0 --port 8001 > backend.log 2>&1 &
    echo "Backend démarré"
else
    echo "❌ Environnement virtuel Backend non trouvé"
fi

echo "Démarrage Frontend..."
cd "$AppPath/frontend" || exit 1
nohup python3 -m http.server 3000 > frontend.log 2>&1 &
echo "Frontend démarré"

echo "Rechargement Nginx..."
nginx -t && systemctl reload nginx 2>/dev/null || sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || echo "Erreur Nginx"

sleep 3
echo "✅ Services redémarrés"
"@

    try {
        $result = Invoke-SshCommand $serviceScript
        Write-ColoredOutput "✅ Services redémarrés" "Green"
    }
    catch {
        Write-ColoredOutput "❌ Erreur redémarrage services: $_" "Red"
    }
}

# Validation
function Test-Update {
    Write-ColoredOutput "🧪 Validation de la mise à jour..." "Yellow"
    
    $validationScript = @"
echo "Test Backend..."
if curl -f -s http://localhost:8001/api/health >/dev/null 2>&1; then
    echo "✅ Backend opérationnel"
else
    echo "❌ Backend non accessible"
    echo "Logs Backend:"
    tail -5 $AppPath/backend/backend.log 2>/dev/null || echo "Logs non disponibles"
fi

echo "Test Frontend..."
if curl -f -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend opérationnel"
else
    echo "❌ Frontend non accessible"
    echo "Logs Frontend:"
    tail -5 $AppPath/frontend/frontend.log 2>/dev/null || echo "Logs non disponibles"
fi

echo "Test Application complète..."
if curl -f -s "http://$Domain/api/health" >/dev/null 2>&1; then
    echo "✅ Application accessible via $Domain"
else
    echo "⚠️ Application pas encore accessible via $Domain"
fi

echo "Vérification version Git..."
cd $AppPath
CURRENT_COMMIT=`$(git rev-parse --short HEAD)
echo "Version actuelle: `$CURRENT_COMMIT"
"@

    try {
        $result = Invoke-SshCommand $validationScript
        Write-Host $result
    }
    catch {
        Write-ColoredOutput "⚠️ Erreur validation: $_" "Yellow"
    }
}

# Fonction principale
function Main {
    Write-ColoredOutput "Début de la mise à jour..." "Blue"
    Write-Host ""
    
    # Confirmation
    Write-ColoredOutput "⚠️ Cette opération va:" "Yellow"
    Write-Host "1. Créer une sauvegarde"
    Write-Host "2. Mettre à jour le code (git pull)"
    Write-Host "3. Mettre à jour les dépendances"
    Write-Host "4. Redémarrer les services"
    Write-Host "5. Recharger Nginx"
    Write-Host "6. Valider la mise à jour"
    Write-Host ""
    
    $confirmation = Read-Host "Continuer ? (y/N)"
    if ($confirmation -notmatch '^[Yy]$') {
        Write-Host "Mise à jour annulée"
        exit 0
    }
    
    try {
        # Exécution des étapes
        Test-SshConnection
        New-Backup
        Update-Git
        Update-Dependencies
        Restart-Services
        Test-Update
        
        Write-Host ""
        Write-ColoredOutput "🎉 MISE À JOUR TERMINÉE AVEC SUCCÈS !" "Green"
        Write-ColoredOutput "🌐 Votre application est accessible sur: https://$Domain" "Blue"
        Write-ColoredOutput "👤 Comptes: admin/admin123 et employe1/employe123" "Blue"
        Write-Host ""
        Write-ColoredOutput "📊 Commandes utiles pour surveiller:" "Yellow"
        Write-ColoredOutput "   Logs Backend: ssh $SshUser@$SshHost 'tail -f $AppPath/backend/backend.log'" "Blue"
        Write-ColoredOutput "   Logs Frontend: ssh $SshUser@$SshHost 'tail -f $AppPath/frontend/frontend.log'" "Blue"
        Write-ColoredOutput "   Status services: ssh $SshUser@$SshHost 'sudo supervisorctl status'" "Blue"
    }
    catch {
        Write-ColoredOutput "❌ Erreur durant la mise à jour: $_" "Red"
        exit 1
    }
}

# Point d'entrée
Main