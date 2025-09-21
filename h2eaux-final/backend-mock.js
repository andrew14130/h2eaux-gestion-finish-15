// Backend Mock pour H2eaux Gestion - Fonctionnement Autonome
// Simule un backend complet avec localStorage

class H2eauxBackendMock {
    constructor() {
        this.initializeData();
    }

    // Initialiser les données par défaut
    initializeData() {
        if (!localStorage.getItem('h2eaux_users')) {
            const defaultUsers = [
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
            localStorage.setItem('h2eaux_users', JSON.stringify(defaultUsers));
        }

        if (!localStorage.getItem('h2eaux_clients')) {
            const defaultClients = [
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
            localStorage.setItem('h2eaux_clients', JSON.stringify(defaultClients));
        }

        if (!localStorage.getItem('h2eaux_chantiers')) {
            localStorage.setItem('h2eaux_chantiers', JSON.stringify([]));
        }

        if (!localStorage.getItem('h2eaux_calculs_pac')) {
            localStorage.setItem('h2eaux_calculs_pac', JSON.stringify([]));
        }

        if (!localStorage.getItem('h2eaux_documents')) {
            localStorage.setItem('h2eaux_documents', JSON.stringify([]));
        }
    }

    // Simulation des appels API
    async fetch(url, options = {}) {
        const method = options.method || 'GET';
        const path = url.replace('/api/', '');
        
        await this.delay(300); // Simule la latence réseau

        try {
            if (path === 'health') {
                return this.response({ status: 'ok', message: 'H2eaux Gestion Backend Mock' });
            }

            if (path === 'auth/login') {
                return this.handleLogin(options.body);
            }

            if (path === 'clients') {
                if (method === 'GET') return this.getClients();
                if (method === 'POST') return this.createClient(options.body);
            }

            if (path.startsWith('clients/')) {
                const id = path.split('/')[1];
                if (method === 'PUT') return this.updateClient(id, options.body);
                if (method === 'DELETE') return this.deleteClient(id);
            }

            if (path === 'chantiers') {
                if (method === 'GET') return this.getChantiers();
                if (method === 'POST') return this.createChantier(options.body);
            }

            if (path === 'calculs-pac') {
                if (method === 'GET') return this.getCalculsPac();
                if (method === 'POST') return this.createCalculPac(options.body);
            }

            return this.response({ error: 'Endpoint non trouvé' }, 404);
        } catch (error) {
            return this.response({ error: error.message }, 500);
        }
    }

    async handleLogin(body) {
        const data = JSON.parse(body);
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        
        const user = users.find(u => u.username === data.username && u.password === data.password);
        
        if (user) {
            const token = 'mock_token_' + user.id + '_' + Date.now();
            return this.response({
                access_token: token,
                token_type: 'bearer',
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    nom: user.nom,
                    email: user.email
                }
            });
        } else {
            return this.response({ detail: 'Identifiants incorrects' }, 401);
        }
    }

    async getClients() {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        return this.response(clients);
    }

    async createClient(body) {
        const data = JSON.parse(body);
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        
        const newClient = {
            id: Date.now().toString(),
            ...data,
            date_creation: new Date().toISOString()
        };
        
        clients.push(newClient);
        localStorage.setItem('h2eaux_clients', JSON.stringify(clients));
        
        return this.response(newClient, 201);
    }

    async updateClient(id, body) {
        const data = JSON.parse(body);
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        
        const index = clients.findIndex(c => c.id === id);
        if (index === -1) {
            return this.response({ error: 'Client non trouvé' }, 404);
        }
        
        clients[index] = { ...clients[index], ...data };
        localStorage.setItem('h2eaux_clients', JSON.stringify(clients));
        
        return this.response(clients[index]);
    }

    async deleteClient(id) {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        const filteredClients = clients.filter(c => c.id !== id);
        
        if (clients.length === filteredClients.length) {
            return this.response({ error: 'Client non trouvé' }, 404);
        }
        
        localStorage.setItem('h2eaux_clients', JSON.stringify(filteredClients));
        return this.response({ message: 'Client supprimé' });
    }

    async getChantiers() {
        const chantiers = JSON.parse(localStorage.getItem('h2eaux_chantiers') || '[]');
        return this.response(chantiers);
    }

    async createChantier(body) {
        const data = JSON.parse(body);
        const chantiers = JSON.parse(localStorage.getItem('h2eaux_chantiers') || '[]');
        
        const newChantier = {
            id: Date.now().toString(),
            ...data,
            date_creation: new Date().toISOString(),
            statut: 'en_attente'
        };
        
        chantiers.push(newChantier);
        localStorage.setItem('h2eaux_chantiers', JSON.stringify(chantiers));
        
        return this.response(newChantier, 201);
    }

    async getCalculsPac() {
        const calculs = JSON.parse(localStorage.getItem('h2eaux_calculs_pac') || '[]');
        return this.response(calculs);
    }

    async createCalculPac(body) {
        const data = JSON.parse(body);
        const calculs = JSON.parse(localStorage.getItem('h2eaux_calculs_pac') || '[]');
        
        const newCalcul = {
            id: Date.now().toString(),
            ...data,
            date_creation: new Date().toISOString()
        };
        
        calculs.push(newCalcul);
        localStorage.setItem('h2eaux_calculs_pac', JSON.stringify(calculs));
        
        return this.response(newCalcul, 201);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    response(data, status = 200) {
        return {
            ok: status >= 200 && status < 300,
            status: status,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data))
        };
    }
}

// Initialiser le backend mock
window.h2eauxBackend = new H2eauxBackendMock();

// Intercepter les appels fetch pour les rediriger vers le mock
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    // Si l'URL contient /api/ et que le mode est LOCAL_STORAGE, utiliser le mock
    if (typeof url === 'string' && url.includes('/api/') && 
        window.H2EAUX_CONFIG && window.H2EAUX_CONFIG.API_URL === 'LOCAL_STORAGE') {
        return window.h2eauxBackend.fetch(url, options);
    }
    
    // Sinon, utiliser le fetch normal
    return originalFetch.apply(this, arguments);
};