// =============================================================================
// APPLICATION PRINCIPALE - H2EAUX GESTION PWA v3.0.0
// =============================================================================

class H2eauxApp {
    constructor() {
        // Configuration de base
        this.config = {
            apiUrl: this.getApiUrl(),
            version: '3.0.0',
            appName: 'H2EAUX GESTION',
            autoSave: true,
            offline: false
        };

        // État de l'application
        this.state = {
            currentUser: null,
            currentModule: 'dashboard',
            isOnline: navigator.onLine,
            data: {
                clients: [],
                chantiers: [],
                calculsPac: [],
                fiches: []
            }
        };

        // Initialisation
        this.init();
    }

    // =============================================================================
    // INITIALISATION
    // =============================================================================

    async init() {
        try {
            console.log('🚀 Initialisation H2EAUX GESTION v3.0.0');
            
            // Configuration des événements
            this.setupEventListeners();
            
            // Gestion de la connectivité
            this.setupConnectivityHandlers();
            
            // Vérification de l'authentification
            await this.checkAuthentication();
            
            // Masquer le splash screen
            this.hideSplashScreen();
            
            console.log('✅ Application initialisée avec succès');
            
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            this.showMessage('Erreur lors de l\'initialisation', 'error');
        }
    }

    setupEventListeners() {
        // Formulaire de connexion
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const module = item.dataset.module;
                this.navigateToModule(module);
            });
        });

        // Déconnexion
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Actions rapides dashboard
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    setupConnectivityHandlers() {
        // Surveillance de la connectivité
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.updateConnectionStatus();
            this.showMessage('Connexion rétablie', 'success');
        });

        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.updateConnectionStatus();
            this.showMessage('Mode hors ligne activé', 'warning');
        });

        // État initial
        this.updateConnectionStatus();
    }

    // =============================================================================
    // GESTION URL API
    // =============================================================================

    getApiUrl() {
        // Détection automatique de l'URL API
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;
        
        // Configuration selon l'environnement
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Développement local
            return `${protocol}//${hostname}:8001/api`;
        }
        
        // Production (VPS, domaine)
        return `${protocol}//${hostname}/api`;
    }

    // =============================================================================
    // AUTHENTIFICATION
    // =============================================================================

    async checkAuthentication() {
        const token = localStorage.getItem('h2eaux_token');
        
        if (token) {
            try {
                // Vérifier la validité du token
                const response = await this.apiCall('/auth/verify', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response && response.user) {
                    this.state.currentUser = response.user;
                    this.showMainApp();
                    await this.loadDashboardData();
                } else {
                    this.showLoginScreen();
                }
            } catch (error) {
                console.warn('Token invalide, redirection vers login');
                localStorage.removeItem('h2eaux_token');
                this.showLoginScreen();
            }
        } else {
            this.showLoginScreen();
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        
        if (!username || !password) {
            this.showMessage('Veuillez remplir tous les champs', 'error');
            return;
        }

        // Interface de chargement
        this.setButtonLoading(loginBtn, true);

        try {
            const response = await this.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (response && response.access_token) {
                // Sauvegarder le token et les infos utilisateur
                localStorage.setItem('h2eaux_token', response.access_token);
                this.state.currentUser = response.user;

                this.showMessage('Connexion réussie', 'success');
                this.showMainApp();
                await this.loadDashboardData();
            } else {
                throw new Error('Réponse de connexion invalide');
            }
        } catch (error) {
            console.error('Erreur connexion:', error);
            this.showMessage('Identifiants incorrects', 'error');
        } finally {
            this.setButtonLoading(loginBtn, false);
        }
    }

    logout() {
        localStorage.removeItem('h2eaux_token');
        this.state.currentUser = null;
        this.state.data = { clients: [], chantiers: [], calculsPac: [], fiches: [] };
        this.showLoginScreen();
        this.showMessage('Déconnexion réussie', 'info');
    }

    // =============================================================================
    // INTERFACE UTILISATEUR
    // =============================================================================

    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // Mettre à jour les infos utilisateur
        this.updateUserInfo();
    }

    hideSplashScreen() {
        setTimeout(() => {
            const splashScreen = document.getElementById('splashScreen');
            if (splashScreen) {
                splashScreen.style.opacity = '0';
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                }, 300);
            }
        }, 1500); // Affichage 1.5s minimum
    }

    updateUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo && this.state.currentUser) {
            const userName = userInfo.querySelector('.user-name');
            const userRole = userInfo.querySelector('.user-role');
            
            if (userName) userName.textContent = this.state.currentUser.username;
            if (userRole) {
                const roleText = this.state.currentUser.role === 'admin' ? 'Administrateur' : 'Employé';
                userRole.textContent = roleText;
            }
        }
    }

    updateConnectionStatus() {
        const status = document.getElementById('connectionStatus');
        if (status) {
            const indicator = status.querySelector('.status-indicator');
            const text = status.querySelector('.status-text');
            
            if (this.state.isOnline) {
                indicator.className = 'status-indicator online';
                text.textContent = 'En ligne';
            } else {
                indicator.className = 'status-indicator offline';
                text.textContent = 'Hors ligne';
            }
        }
    }

    // =============================================================================
    // NAVIGATION
    // =============================================================================

    navigateToModule(moduleName) {
        // Désactiver l'ancien module
        document.querySelectorAll('.module').forEach(module => {
            module.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });

        // Activer le nouveau module
        const targetModule = document.getElementById(`${moduleName}Module`);
        const targetNav = document.querySelector(`[data-module="${moduleName}"]`);
        
        if (targetModule) {
            targetModule.classList.add('active');
            this.state.currentModule = moduleName;
        }
        
        if (targetNav) {
            targetNav.classList.add('active');
        }

        // Charger les données du module si nécessaire
        this.loadModuleData(moduleName);
    }

    async loadModuleData(moduleName) {
        switch (moduleName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'clients':
                await this.loadClients();
                break;
            case 'chantiers':
                await this.loadChantiers();
                break;
            // Autres modules...
        }
    }

    // =============================================================================
    // DONNÉES DASHBOARD
    // =============================================================================

    async loadDashboardData() {
        try {
            // Chargement parallèle des statistiques
            const [clients, chantiers, calculsPac] = await Promise.all([
                this.loadClients(false),
                this.loadChantiers(false),
                this.loadCalculsPac(false)
            ]);

            // Mise à jour des statistiques
            this.updateDashboardStats({
                clients: clients?.length || 0,
                chantiers: chantiers?.length || 0,
                calculsPac: calculsPac?.length || 0,
                ca: 0 // À calculer selon logique métier
            });

        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
            if (this.state.isOnline) {
                this.showMessage('Erreur chargement des données', 'error');
            }
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('statClients').textContent = stats.clients;
        document.getElementById('statChantiers').textContent = stats.chantiers;
        document.getElementById('statCalculsPac').textContent = stats.calculsPac;
        document.getElementById('statCA').textContent = `${stats.ca.toFixed(2)}€`;
    }

    // =============================================================================
    // GESTION DES DONNÉES
    // =============================================================================

    async loadClients(updateUI = true) {
        try {
            const clients = await this.apiCall('/clients');
            this.state.data.clients = clients || [];
            
            if (updateUI && typeof window.clients !== 'undefined') {
                window.clients.render();
            }
            
            return this.state.data.clients;
        } catch (error) {
            console.error('Erreur chargement clients:', error);
            return [];
        }
    }

    async loadChantiers(updateUI = true) {
        try {
            const chantiers = await this.apiCall('/chantiers');
            this.state.data.chantiers = chantiers || [];
            return this.state.data.chantiers;
        } catch (error) {
            console.error('Erreur chargement chantiers:', error);
            return [];
        }
    }

    async loadCalculsPac(updateUI = true) {
        try {
            const calculs = await this.apiCall('/calculs-pac');
            this.state.data.calculsPac = calculs || [];
            return this.state.data.calculsPac;
        } catch (error) {
            console.error('Erreur chargement calculs PAC:', error);
            return [];
        }
    }

    // =============================================================================
    // ACTIONS RAPIDES
    // =============================================================================

    handleQuickAction(action) {
        switch (action) {
            case 'new-client':
                this.navigateToModule('clients');
                setTimeout(() => {
                    if (typeof window.clients !== 'undefined') {
                        window.clients.showAddModal();
                    }
                }, 100);
                break;
                
            case 'new-chantier':
                this.navigateToModule('chantiers');
                break;
                
            case 'new-fiche':
                this.navigateToModule('fiches');
                break;
                
            case 'new-pac':
                this.navigateToModule('calculs-pac');
                break;
        }
    }

    // =============================================================================
    // API CALLS
    // =============================================================================

    async apiCall(endpoint, options = {}) {
        const url = `${this.config.apiUrl}${endpoint}`;
        const token = localStorage.getItem('h2eaux_token');

        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const requestOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, requestOptions);
            
            if (response.status === 401) {
                // Token expiré
                localStorage.removeItem('h2eaux_token');
                this.showLoginScreen();
                throw new Error('Session expirée');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (!this.state.isOnline) {
                console.warn('Requête échouée en mode hors ligne:', endpoint);
                throw new Error('Mode hors ligne');
            }
            throw error;
        }
    }

    // =============================================================================
    // UTILITAIRES UI
    // =============================================================================

    showMessage(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type] || 'ℹ️';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(toast);

        // Animation d'entrée
        setTimeout(() => toast.classList.add('show'), 10);

        // Suppression automatique
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    setButtonLoading(button, loading) {
        const text = button.querySelector('.btn-text');
        const loader = button.querySelector('.btn-loader');
        
        if (loading) {
            text.classList.add('hidden');
            loader.classList.remove('hidden');
            button.disabled = true;
        } else {
            text.classList.remove('hidden');
            loader.classList.add('hidden');
            button.disabled = false;
        }
    }

    // =============================================================================
    // MÉTHODES UTILITAIRES
    // =============================================================================

    formatDate(date) {
        return new Date(date).toLocaleDateString('fr-FR');
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString('fr-FR');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// =============================================================================
// INITIALISATION GLOBALE
// =============================================================================

// Instance globale de l'application
let app;

// Initialisation quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    app = new H2eauxApp();
    
    // Rendre l'app accessible globalement pour les modules
    window.app = app;
});

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = H2eauxApp;
}