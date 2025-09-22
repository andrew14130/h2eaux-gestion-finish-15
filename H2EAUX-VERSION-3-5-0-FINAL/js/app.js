// ===== MAIN APPLICATION CLASS =====
class H2EAUXGestion {
    constructor() {
        this.config = {
            apiUrl: this.getApiUrl(),
            version: '2.0.0',
            autoUpdate: true
        };
        
        this.state = {
            isLoggedIn: false,
            currentUser: null,
            currentModule: 'dashboard',
            loading: true
        };
        
        this.data = {
            clients: [],
            chantiers: [],
            calculsPac: [],
            users: []
        };
        
        this.init();
    }

    getApiUrl() {
        // Détecter l'URL automatiquement selon l'environnement
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;
        
        // Si on est en local
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:8001/api`;
        }
        
        // Si on est en production (OVH ou autre)
        return `${protocol}//${hostname}/api`;
    }

    // ===== INITIALIZATION =====
    async init() {
        try {
            this.setupEventListeners();
            await this.checkAuthStatus();
            await this.loadAppData();
            this.hideLoadingScreen();
            
            if (this.state.isLoggedIn) {
                this.showMainApp();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('App initialization error:', error);
            this.hideLoadingScreen();
            this.showLoginScreen();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const module = e.target.dataset.module;
                if (module) {
                    this.showModule(module);
                }
            });
        });

        // Initialize dropdown navigation
        document.querySelectorAll('.nav-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const moduleId = e.target.getAttribute('data-module');
                if (moduleId) {
                    this.showModule(moduleId);
                    // Close dropdown
                    e.target.closest('.nav-dropdown').classList.remove('active');
                }
            });
        });

        // Toggle dropdown
        document.querySelectorAll('.nav-dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const dropdown = e.target.closest('.nav-dropdown');
                const isActive = dropdown.classList.contains('active');
                
                // Close all dropdowns first
                document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('active'));
                
                // Toggle current dropdown
                if (!isActive) {
                    dropdown.classList.add('active');
                }
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-dropdown')) {
                document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('active'));
            }
        });

        // Auto-update check
        if (this.config.autoUpdate) {
            setInterval(() => this.checkUpdates(), 3600000); // Check every hour
        }
    }

    // ===== AUTHENTICATION =====
    async checkAuthStatus() {
        const token = localStorage.getItem('h2eaux_token');
        const userData = localStorage.getItem('h2eaux_user');
        
        if (token && userData) {
            try {
                this.state.currentUser = JSON.parse(userData);
                this.state.isLoggedIn = true;
                return true;
            } catch (error) {
                localStorage.removeItem('h2eaux_token');
                localStorage.removeItem('h2eaux_user');
            }
        }
        return false;
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            this.showMessage('Veuillez saisir vos identifiants', 'error');
            return;
        }

        this.setLoginLoading(true);

        try {
            const response = await this.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (response.access_token) {
                localStorage.setItem('h2eaux_token', response.access_token);
                localStorage.setItem('h2eaux_user', JSON.stringify(response.user));
                
                this.state.currentUser = response.user;
                this.state.isLoggedIn = true;
                
                this.showMessage('Connexion réussie !', 'success');
                await this.loadAppData();
                this.showMainApp();
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Erreur de connexion: ' + error.message, 'error');
        } finally {
            this.setLoginLoading(false);
        }
    }

    logout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            localStorage.removeItem('h2eaux_token');
            localStorage.removeItem('h2eaux_user');
            
            this.state.isLoggedIn = false;
            this.state.currentUser = null;
            this.data = { clients: [], chantiers: [], calculsPac: [], users: [] };
            
            this.showLoginScreen();
            this.showMessage('Déconnexion réussie', 'success');
        }
    }

    // ===== API CALLS =====
    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('h2eaux_token');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(`${this.config.apiUrl}${endpoint}`, finalOptions);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ===== DATA LOADING =====
    async loadAppData() {
        if (!this.state.isLoggedIn) return;

        // Check for version migration
        await this.checkVersionMigration();

        try {
            // Load all data in parallel
            const [clientsData, chantiersData, calculsPacData] = await Promise.allSettled([
                this.apiCall('/clients'),
                this.apiCall('/chantiers'),
                this.apiCall('/calculs-pac')
            ]);

            this.data.clients = clientsData.status === 'fulfilled' ? clientsData.value : [];
            this.data.chantiers = chantiersData.status === 'fulfilled' ? chantiersData.value : [];
            this.data.calculsPac = calculsPacData.status === 'fulfilled' ? calculsPacData.value : [];

            this.updateDashboardStats();
        } catch (error) {
            console.error('Error loading app data:', error);
        }
    }

    async checkVersionMigration() {
        const currentVersion = '3.1.0';
        const lastVersion = localStorage.getItem('h2eaux_app_version');
        
        if (lastVersion && lastVersion !== currentVersion) {
            console.log(`🔄 Migration from ${lastVersion} to ${currentVersion}`);
            
            // Clear potential incompatible data for major version changes
            if (!lastVersion.startsWith('3.1')) {
                // Clear cache and some stored data to avoid conflicts
                const preserveKeys = [
                    'h2eaux_users',
                    'h2eaux_current_user', 
                    'h2eaux_current_token',
                    'h2eaux_company_settings'
                ];
                
                // Clear non-essential localStorage data
                const keysToDelete = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('h2eaux_') && !preserveKeys.includes(key)) {
                        keysToDelete.push(key);
                    }
                }
                
                keysToDelete.forEach(key => {
                    console.log(`Clearing old data: ${key}`);
                    localStorage.removeItem(key);
                });
                
                // Clear service worker cache
                if ('serviceWorker' in navigator) {
                    try {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (let registration of registrations) {
                            await registration.unregister();
                        }
                        console.log('Service workers cleared for migration');
                    } catch (error) {
                        console.error('Error clearing service workers:', error);
                    }
                }
                
                this.showMessage(`🔄 Application mise à jour vers la version ${currentVersion}. Données compatibles préservées.`, 'success');
            }
        }
        
        localStorage.setItem('h2eaux_app_version', currentVersion);
    }

    updateDashboardStats() {
        document.getElementById('totalClients').textContent = this.data.clients.length;
        document.getElementById('totalChantiers').textContent = this.data.chantiers.length;
        document.getElementById('totalCalculs').textContent = this.data.calculsPac.length;
        
        const totalRevenu = this.data.chantiers.reduce((sum, chantier) => {
            return sum + (parseFloat(chantier.budget_estime) || 0);
        }, 0);
        
        document.getElementById('totalRevenu').textContent = 
            new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalRevenu);
    }

    // ===== UI MANAGEMENT =====
    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // Update user info
        if (this.state.currentUser) {
            document.getElementById('userName').textContent = this.state.currentUser.username;
            document.getElementById('userRole').textContent = 
                this.state.currentUser.role === 'admin' ? 'Administrateur' : 'Employé';
            document.getElementById('userRole').className = 
                `user-role ${this.state.currentUser.role}`;
            
            // Hide admin-only elements for non-admin users
            if (this.state.currentUser.role !== 'admin') {
                document.querySelectorAll('.admin-only').forEach(element => {
                    element.style.display = 'none';
                });
            } else {
                document.querySelectorAll('.admin-only').forEach(element => {
                    element.style.display = '';
                });
            }
        }
    }

    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            this.state.loading = false;
        }, 1500);
    }

    setLoginLoading(loading) {
        const btn = document.getElementById('loginBtn');
        const text = document.getElementById('loginBtnText');
        const spinner = document.getElementById('loginSpinner');
        
        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        spinner.classList.toggle('hidden', !loading);
    }

    async showModule(moduleId) {
        // Check permissions
        if (moduleId === 'parametres' && 
            (!this.state.currentUser || !this.state.currentUser.permissions.parametres)) {
            this.showMessage('Accès non autorisé aux paramètres', 'error');
            return;
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-module="${moduleId}"]`).classList.add('active');

        // Show module
        document.querySelectorAll('.module').forEach(module => {
            module.classList.remove('active');
        });
        
        const targetModule = document.getElementById(`${moduleId}Module`);
        if (targetModule) {
            targetModule.classList.add('active');
            this.state.currentModule = moduleId;
            
            // Load module data
            await this.loadModuleData(moduleId);
        }
    }

    async loadModuleData(moduleId) {
        // Load module data
        switch(moduleId) {
            case 'clients':
                if (window.clients) await clients.load();
                break;
            case 'chantiers':
                if (window.chantiers) await chantiers.load();
                break;
            case 'calculs-pac':
                if (window.calculsPac) await calculsPac.load();
                break;
            case 'calculs-pac-air-eau':
                if (window.calculsPacAirEau) await calculsPacAirEau.load();
                break;
            case 'calculs-pac-air-air':
                if (window.calculsPacAirAir) await calculsPacAirAir.load();
                break;
            case 'documents':
                if (window.documents) await documents.load();
                break;
            case 'fiches-chantier':
                if (window.fichesChantier) await fichesChantier.load();
                break;
            case 'calendrier-rdv':
                if (window.calendrier) await calendrier.load();
                break;
            case 'meg-integration':
                if (window.meg) await meg.load();
                break;
            case 'chat':
                if (window.chat) await chat.load();
                break;
            case 'parametres':
                if (window.settings) await settings.load();
                break;
        }
    }

    // ===== UTILITIES =====
    showMessage(message, type = 'info') {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        // Add to page
        document.body.appendChild(messageEl);
        
        // Position it
        messageEl.style.position = 'fixed';
        messageEl.style.top = '20px';
        messageEl.style.right = '20px';
        messageEl.style.zIndex = '10000';
        messageEl.style.maxWidth = '400px';
        
        // Auto remove
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('fr-FR');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    // ===== AUTO-UPDATE SYSTEM =====
    async checkUpdates() {
        try {
            const response = await fetch('/version.json');
            const versionInfo = await response.json();
            
            if (versionInfo.version !== this.config.version) {
                this.showUpdateAvailable(versionInfo);
            }
            
            localStorage.setItem('lastUpdateCheck', new Date().toISOString());
        } catch (error) {
            console.error('Update check failed:', error);
        }
    }

    showUpdateAvailable(versionInfo) {
        if (confirm(`Une nouvelle version (${versionInfo.version}) est disponible.\nVoulez-vous mettre à jour maintenant ?`)) {
            this.performUpdate();
        }
    }

    async performUpdate() {
        try {
            // Clear caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            // Reload page
            window.location.reload(true);
        } catch (error) {
            console.error('Update failed:', error);
            this.showMessage('Erreur lors de la mise à jour', 'error');
        }
    }
}

// ===== GLOBAL APP INSTANCE =====
window.app = new H2EAUXGestion();