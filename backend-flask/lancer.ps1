# Script PowerShell pour lancer le serveur Flask
Write-Host "🐍 Lancement du serveur Flask" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
pip install -r requirements.txt

Write-Host ""
Write-Host "🚀 Démarrage du serveur..." -ForegroundColor Green
Write-Host "URL: http://127.0.0.1:5000/" -ForegroundColor White
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Gray
Write-Host ""

python server.py

Read-Host "Appuyez sur Entrée pour quitter"