// Script d'initialisation MongoDB pour H2EAUX GESTION
// Ce script est exécuté lors du premier démarrage du conteneur MongoDB

// Sélection de la base de données
db = db.getSiblingDB('h2eaux_gestion');

// Création des utilisateurs par défaut avec mots de passe hachés
// Note: Les mots de passe sont hachés avec bcrypt

// Utilisateur Admin (admin/admin123)
db.users.insertOne({
    "id": "cd113b6d-3fbd-4256-b0de-4bbd5c88ea17",
    "username": "admin",
    "role": "admin",
    "permissions": {
        "clients": true,
        "documents": true,
        "chantiers": true,
        "calculs_pac": true,
        "catalogues": true,
        "chat": true,
        "parametres": true
    },
    "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewliCThGQ2jfNWHm",
    "created_at": new Date()
});

// Utilisateur Employé (employe1/employe123)
db.users.insertOne({
    "id": "e7f8a9b0-1c2d-3e4f-5a6b-7c8d9e0f1a2b",
    "username": "employe1",
    "role": "employee",
    "permissions": {
        "clients": true,
        "documents": true,
        "chantiers": true,
        "calculs_pac": true,
        "catalogues": true,
        "chat": true,
        "parametres": false
    },
    "hashed_password": "$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
    "created_at": new Date()
});

// Création des index pour optimiser les performances
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "id": 1 }, { unique: true });

db.clients.createIndex({ "id": 1 }, { unique: true });
db.clients.createIndex({ "nom": 1 });
db.clients.createIndex({ "created_at": -1 });

db.chantiers.createIndex({ "id": 1 }, { unique: true });
db.chantiers.createIndex({ "nom": 1 });
db.chantiers.createIndex({ "statut": 1 });
db.chantiers.createIndex({ "created_at": -1 });

db.documents.createIndex({ "id": 1 }, { unique: true });
db.documents.createIndex({ "type": 1 });
db.documents.createIndex({ "client_nom": 1 });
db.documents.createIndex({ "created_at": -1 });

db.fiches_sdb.createIndex({ "id": 1 }, { unique: true });
db.fiches_sdb.createIndex({ "nom": 1 });
db.fiches_sdb.createIndex({ "client_nom": 1 });
db.fiches_sdb.createIndex({ "created_at": -1 });

db.calculs_pac.createIndex({ "id": 1 }, { unique: true });
db.calculs_pac.createIndex({ "nom": 1 });
db.calculs_pac.createIndex({ "client_nom": 1 });
db.calculs_pac.createIndex({ "type_pac": 1 });
db.calculs_pac.createIndex({ "created_at": -1 });

// Insertion de données de démonstration (optionnel)
// Client exemple
db.clients.insertOne({
    "id": "client-demo-001",
    "nom": "Dupont",
    "prenom": "Jean",
    "telephone": "06.12.34.56.78",
    "email": "jean.dupont@email.com",
    "adresse": "123 Rue de la Paix",
    "ville": "Paris",
    "code_postal": "75001",
    "type_chauffage": "gaz",
    "notes": "Client de démonstration",
    "created_at": new Date(),
    "updated_at": new Date()
});

// Chantier exemple
db.chantiers.insertOne({
    "id": "chantier-demo-001",
    "nom": "Installation PAC Dupont",
    "adresse": "123 Rue de la Paix",
    "ville": "Paris",
    "code_postal": "75001",
    "client_nom": "Jean Dupont",
    "client_telephone": "06.12.34.56.78",
    "type_travaux": "Installation PAC Air/Eau",
    "statut": "en_cours",
    "date_debut": "2024-09-15",
    "date_fin_prevue": "2024-09-20",
    "budget_estime": "8500",
    "description": "Installation d'une pompe à chaleur air/eau avec plancher chauffant",
    "notes": "Chantier de démonstration",
    "created_at": new Date(),
    "updated_at": new Date()
});

// Calcul PAC exemple
db.calculs_pac.insertOne({
    "id": "calcul-demo-001",
    "nom": "Calcul PAC Maison Dupont",
    "client_nom": "Jean Dupont",
    "adresse": "123 Rue de la Paix, Paris",
    "batiment": "maison_individuelle",
    "type_pac": "air_eau",
    "surface_totale": "120",
    "altitude": "200",
    "zone_climatique": "H1",
    "isolation": "rt2012",
    "temperature_exterieure_base": "-7",
    "temperature_interieure_souhaitee": "20",
    "type_emetteur": "plancher_chauffant",
    "production_ecs": true,
    "volume_ballon_ecs": "300",
    "cop_estime": "3.5",
    "pieces": [
        {
            "id": "piece-001",
            "nom": "Salon",
            "type": "salon",
            "longueur": "6",
            "largeur": "5",
            "hauteur": "2.5",
            "surface": "30",
            "volume": "75",
            "temperature_souhaitee": "20",
            "delta_t": "27",
            "coefficient_g": "0.7",
            "ratio_norme_energetique": "1.0",
            "puissance_calculee": "5.67"
        },
        {
            "id": "piece-002",
            "nom": "Cuisine",
            "type": "cuisine",
            "longueur": "4",
            "largeur": "3",
            "hauteur": "2.5",
            "surface": "12",
            "volume": "30",
            "temperature_souhaitee": "19",
            "delta_t": "26",
            "coefficient_g": "0.7",
            "ratio_norme_energetique": "1.0",
            "puissance_calculee": "2.18"
        }
    ],
    "puissance_calculee": "7.85",
    "puissance_totale_calculee": "9.50",
    "notes": "Calcul de démonstration avec 2 pièces principales",
    "created_at": new Date(),
    "updated_at": new Date()
});

// Document exemple
db.documents.insertOne({
    "id": "document-demo-001",
    "nom": "Devis Installation PAC Dupont",
    "type": "devis",
    "client_nom": "Jean Dupont",
    "chantier_nom": "Installation PAC Dupont",
    "description": "Devis pour l'installation d'une PAC air/eau",
    "tags": "pac, devis, installation",
    "file_path": "",
    "file_size": 0,
    "mime_type": "application/pdf",
    "created_at": new Date(),
    "updated_at": new Date()
});

// Affichage de confirmation
print("✅ Base de données H2EAUX GESTION initialisée avec succès");
print("👤 Utilisateurs créés :");
print("   - admin / admin123 (Administrateur)");
print("   - employe1 / employe123 (Employé)");
print("📊 Données de démonstration ajoutées");
print("🔍 Index créés pour optimiser les performances");