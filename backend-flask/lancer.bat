@echo off
echo 🐍 Lancement du serveur Flask
echo ==============================

echo 📦 Installation des dependances...
pip install -r requirements.txt

echo.
echo 🚀 Demarrage du serveur...
echo URL: http://127.0.0.1:5000/
echo Appuyez sur Ctrl+C pour arreter
echo.

python server.py

pause