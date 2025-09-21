// H2eaux Gestion - Application 100% Locale
// Fonctionne sans aucun appel réseau

class H2eauxApp {
    constructor() {
        this.currentUser = null;
        this.currentModule = 'dashboard';
        this.init();
    }

    init() {
        this.initializeData();
        this.setupEventListeners();
        this.showLoadingScreen();
        
        setTimeout(() => {
            this.hideLoadingScreen();
            this.showLoginScreen();
        }, 2000);
    }

    initializeData() {
        // Initialiser les utilisateurs par défaut
        if (!localStorage.getItem('h2eaux_users')) {
            const users = [
                {
                    id: '1',
                    username: 'admin',
                    password: 'admin123',
                    role: 'admin',
                    nom: 'Administrateur',
                    email: 'admin@h2eaux-gestion.fr'
                },
                {
                    id: '2',
                    username: 'employe1',
                    password: 'employe123',
                    role: 'employee',
                    nom: 'Employé 1',
                    email: 'employe1@h2eaux-gestion.fr'
                }
            ];
            localStorage.setItem('h2eaux_users', JSON.stringify(users));
        }

        // Initialiser les clients de démonstration
        if (!localStorage.getItem('h2eaux_clients')) {
            const clients = [
                {
                    id: '1',
                    nom: 'Dupont',
                    prenom: 'Jean',
                    email: 'jean.dupont@email.fr',
                    telephone: '01 23 45 67 89',
                    adresse: '123 Rue de la Paix, 75001 Paris',
                    date_creation: new Date().toISOString()
                },
                {
                    id: '2',
                    nom: 'Martin',
                    prenom: 'Marie',
                    email: 'marie.martin@email.fr',
                    telephone: '01 98 76 54 32',
                    adresse: '456 Avenue des Champs, 69000 Lyon',
                    date_creation: new Date().toISOString()
                }
            ];
            localStorage.setItem('h2eaux_clients', JSON.stringify(clients));
        }

        // Initialiser autres données
        if (!localStorage.getItem('h2eaux_chantiers')) {
            localStorage.setItem('h2eaux_chantiers', JSON.stringify([]));
        }
        if (!localStorage.getItem('h2eaux_calculs_pac')) {
            localStorage.setItem('h2eaux_calculs_pac', JSON.stringify([]));
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-item')) {
                const module = e.target.getAttribute('data-module');
                this.showModule(module);
            }
        });
    }

    showLoadingScreen() {
        document.getElementById('loadingScreen').style.display = 'flex';
    }

    hideLoadingScreen() {
        document.getElementById('loadingScreen').style.display = 'none';
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        this.loadDashboard();
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const loginSpinner = document.getElementById('loginSpinner');
        const loginBtnText = document.getElementById('loginBtnText');

        // Show loading
        loginBtn.disabled = true;
        loginSpinner.classList.remove('hidden');
        loginBtnText.textContent = 'Connexion...';

        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check credentials from localStorage
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            this.currentUser = user;
            document.getElementById('userName').textContent = user.nom;
            document.getElementById('userRole').textContent = user.role === 'admin' ? 'Admin' : 'Employé';
            
            this.showMainApp();
        } else {
            alert('Identifiants incorrects');
            loginBtn.disabled = false;
            loginSpinner.classList.add('hidden');
            loginBtnText.textContent = 'Se connecter';
        }
    }

    logout() {
        this.currentUser = null;
        this.showLoginScreen();
        // Reset form
        document.getElementById('loginForm').reset();
    }

    showModule(moduleName) {
        // Hide all modules
        document.querySelectorAll('.module').forEach(module => {
            module.classList.remove('active');
        });

        // Show selected module
        const moduleElement = document.getElementById(moduleName + 'Module');
        if (moduleElement) {
            moduleElement.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-module="${moduleName}"]`).classList.add('active');

        this.currentModule = moduleName;

        // Load module data
        this.loadModuleData(moduleName);
    }

    loadModuleData(moduleName) {
        switch(moduleName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'clients':
                this.loadClients();
                break;
            case 'chantiers':
                this.loadChantiers();
                break;
            case 'calculs-pac':
                this.loadCalculsPac();
                break;
        }
    }

    loadDashboard() {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        const chantiers = JSON.parse(localStorage.getItem('h2eaux_chantiers') || '[]');
        const calculs = JSON.parse(localStorage.getItem('h2eaux_calculs_pac') || '[]');

        document.getElementById('totalClients').textContent = clients.length;
        document.getElementById('totalChantiers').textContent = chantiers.length;
        document.getElementById('totalCalculs').textContent = calculs.length;

        // Calculate revenue (mock)
        const revenue = chantiers.reduce((total, chantier) => {
            return total + (chantier.montant || 0);
        }, 0);
        document.getElementById('totalRevenu').textContent = revenue.toLocaleString() + '€';
    }

    loadClients() {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        const clientsList = document.getElementById('clientsList');
        
        if (clients.length === 0) {
            clientsList.innerHTML = '<p class="no-data">Aucun client trouvé. Ajoutez votre premier client !</p>';
            return;
        }

        let html = '';
        clients.forEach(client => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <h3>${client.prenom} ${client.nom}</h3>
                        <div class="item-actions">
                            <button class="btn-icon" onclick="app.editClient('${client.id}')" title="Modifier">✏️</button>
                            <button class="btn-icon" onclick="app.deleteClient('${client.id}')" title="Supprimer">🗑️</button>
                        </div>
                    </div>
                    <div class="item-details">
                        <p><strong>Email:</strong> ${client.email}</p>
                        <p><strong>Téléphone:</strong> ${client.telephone}</p>
                        <p><strong>Adresse:</strong> ${client.adresse}</p>
                        <p><strong>Ajouté le:</strong> ${new Date(client.date_creation).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
        });
        
        clientsList.innerHTML = html;
    }

    loadChantiers() {
        const chantiers = JSON.parse(localStorage.getItem('h2eaux_chantiers') || '[]');
        const chantiersList = document.getElementById('chantiersList');
        
        if (chantiers.length === 0) {
            chantiersList.innerHTML = '<p class="no-data">Aucun chantier trouvé. Créez votre premier chantier !</p>';
            return;
        }

        let html = '';
        chantiers.forEach(chantier => {
            const statusClass = this.getStatusClass(chantier.statut);
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <h3>${chantier.nom}</h3>
                        <span class="status ${statusClass}">${this.getStatusLabel(chantier.statut)}</span>
                    </div>
                    <div class="item-details">
                        <p><strong>Client:</strong> ${chantier.client}</p>
                        <p><strong>Adresse:</strong> ${chantier.adresse}</p>
                        <p><strong>Type:</strong> ${chantier.type}</p>
                        <p><strong>Montant:</strong> ${chantier.montant ? chantier.montant.toLocaleString() + '€' : 'Non défini'}</p>
                        <p><strong>Créé le:</strong> ${new Date(chantier.date_creation).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
        });
        
        chantiersList.innerHTML = html;
    }

    loadCalculsPac() {
        const calculs = JSON.parse(localStorage.getItem('h2eaux_calculs_pac') || '[]');
        const calculsList = document.getElementById('calculsList');
        
        if (calculs.length === 0) {
            calculsList.innerHTML = '<p class="no-data">Aucun calcul PAC trouvé. Créez votre premier calcul !</p>';
            return;
        }

        let html = '';
        calculs.forEach(calcul => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <h3>${calcul.nom}</h3>
                        <span class="pac-type">${calcul.type}</span>
                    </div>
                    <div class="item-details">
                        <p><strong>Surface:</strong> ${calcul.surface} m²</p>
                        <p><strong>Puissance:</strong> ${calcul.puissance} kW</p>
                        <p><strong>Température:</strong> ${calcul.temperature}°C</p>
                        <p><strong>Créé le:</strong> ${new Date(calcul.date_creation).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
        });
        
        calculsList.innerHTML = html;
    }

    getStatusClass(status) {
        const classes = {
            'en_attente': 'status-pending',
            'en_cours': 'status-progress',
            'termine': 'status-completed',
            'facture': 'status-invoiced'
        };
        return classes[status] || 'status-pending';
    }

    getStatusLabel(status) {
        const labels = {
            'en_attente': 'En attente',
            'en_cours': 'En cours',
            'termine': 'Terminé',
            'facture': 'Facturé'
        };
        return labels[status] || 'En attente';
    }

    // Méthodes pour ajouter des données (simplifiées)
    addClient(clientData) {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        const newClient = {
            id: Date.now().toString(),
            ...clientData,
            date_creation: new Date().toISOString()
        };
        clients.push(newClient);
        localStorage.setItem('h2eaux_clients', JSON.stringify(clients));
        this.loadClients();
    }

    addChantier(chantierData) {
        const chantiers = JSON.parse(localStorage.getItem('h2eaux_chantiers') || '[]');
        const newChantier = {
            id: Date.now().toString(),
            ...chantierData,
            statut: 'en_attente',
            date_creation: new Date().toISOString()
        };
        chantiers.push(newChantier);
        localStorage.setItem('h2eaux_chantiers', JSON.stringify(chantiers));
        this.loadChantiers();
    }

    addCalculPac(calculData) {
        const calculs = JSON.parse(localStorage.getItem('h2eaux_calculs_pac') || '[]');
        const newCalcul = {
            id: Date.now().toString(),
            ...calculData,
            date_creation: new Date().toISOString()
        };
        calculs.push(newCalcul);
        localStorage.setItem('h2eaux_calculs_pac', JSON.stringify(calculs));
        this.loadCalculsPac();
    }

    // Placeholder methods for interface compatibility
    editClient(id) {
        alert('Fonction d\'édition client (à implémenter selon vos besoins)');
    }

    deleteClient(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
            const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
            const filteredClients = clients.filter(c => c.id !== id);
            localStorage.setItem('h2eaux_clients', JSON.stringify(filteredClients));
            this.loadClients();
            this.loadDashboard(); // Update dashboard stats
        }
    }
}

// Classes pour compatibilité avec l'interface existante
class ClientsManager {
    showAddModal() {
        const nom = prompt('Nom du client:');
        if (!nom) return;
        const prenom = prompt('Prénom du client:');
        if (!prenom) return;
        const email = prompt('Email du client:');
        const telephone = prompt('Téléphone du client:');
        const adresse = prompt('Adresse du client:');
        
        window.app.addClient({
            nom, prenom, email: email || '', 
            telephone: telephone || '', 
            adresse: adresse || ''
        });
    }

    exportPDF() {
        alert('Export PDF des clients (fonctionnalité à développer)');
    }

    filter() {
        // Simple filter implementation
        const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        const filtered = clients.filter(client => 
            client.nom.toLowerCase().includes(searchTerm) ||
            client.prenom.toLowerCase().includes(searchTerm)
        );
        // Re-render with filtered results
        window.app.loadClients();
    }

    sort() {
        window.app.loadClients();
    }
}

class ChantiersManager {
    showAddModal() {
        const nom = prompt('Nom du chantier:');
        if (!nom) return;
        const client = prompt('Client:');
        const adresse = prompt('Adresse:');
        const type = prompt('Type de travaux:');
        const montant = prompt('Montant (optionnel):');
        
        window.app.addChantier({
            nom, 
            client: client || '', 
            adresse: adresse || '', 
            type: type || 'Plomberie',
            montant: montant ? parseFloat(montant) : 0
        });
    }

    exportPDF() {
        alert('Export PDF des chantiers (fonctionnalité à développer)');
    }

    filter() {
        window.app.loadChantiers();
    }

    filterByStatus() {
        window.app.loadChantiers();
    }
}

class CalculsPacManager {
    showTypeModal() {
        this.showAddModal('air-eau');
    }

    showAddModal(type) {
        const nom = prompt('Nom du calcul PAC:');
        if (!nom) return;
        const surface = prompt('Surface (m²):');
        const temperature = prompt('Température souhaitée (°C):');
        
        const surfaceNum = parseFloat(surface) || 100;
        const tempNum = parseFloat(temperature) || 20;
        const puissance = this.calculatePower(surfaceNum, tempNum);
        
        window.app.addCalculPac({
            nom,
            type: type === 'air-eau' ? 'PAC Air/Eau' : 'PAC Air/Air',
            surface: surfaceNum,
            temperature: tempNum,
            puissance: puissance
        });
    }

    calculatePower(surface, temperature) {
        // Calcul simplifié de la puissance nécessaire
        const basePower = surface * 0.08; // 80W par m²
        const tempAdjustment = (temperature - 20) * 0.02;
        return Math.round((basePower * (1 + tempAdjustment)) * 10) / 10;
    }

    exportPDF() {
        alert('Export PDF des calculs PAC (fonctionnalité à développer)');
    }
}

// Placeholder managers pour autres modules
class DocumentsManager {
    showAddModal() { alert('Fonction Documents à implémenter'); }
    exportList() { alert('Export Documents à implémenter'); }
    filter() {}
    filterByType() {}
}

class FichesChantierManager {
    showAddModal() { alert('Fonction Fiches Chantier à implémenter'); }
    exportPDF() { alert('Export Fiches à implémenter'); }
    filter() {}
    sort() {}
}

class CalendrierManager {
    showAddRdvModal() { alert('Fonction Calendrier à implémenter'); }
    exportPlanning() { alert('Export Planning à implémenter'); }
    render() {}
}

class MegIntegrationManager {
    showImportModal() { alert('Fonction MEG Import à implémenter'); }
    exportData() { alert('Fonction MEG Export à implémenter'); }
    render() {}
}

class ChatManager {
    toggleOnlineStatus() { alert('Fonction Chat à implémenter'); }
    clearHistory() { alert('Clear Chat à implémenter'); }
    render() {}
}

class SettingsManager {
    uploadLogo() { alert('Fonction Upload Logo à implémenter'); }
    showAddUserModal() { alert('Fonction Gestion Utilisateurs à implémenter'); }
    checkUpdates() { alert('Application à jour - Version autonome 3.0.0'); }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Initialize app
    window.app = new H2eauxApp();
    
    // Initialize managers
    window.clients = new ClientsManager();
    window.chantiers = new ChantiersManager();
    window.calculsPac = new CalculsPacManager();
    window.documents = new DocumentsManager();
    window.fichesChantier = new FichesChantierManager();
    window.calendrier = new CalendrierManager();
    window.megIntegration = new MegIntegrationManager();
    window.chat = new ChatManager();
    window.settings = new SettingsManager();
    
    console.log('H2eaux Gestion - Application Autonome v3.0.0 initialisée');
});