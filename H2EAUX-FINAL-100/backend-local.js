// Backend Local pour H2eaux Gestion - Version Complète
// Simule toutes les fonctionnalités du backend original

class H2eauxBackendLocal {
    constructor() {
        this.initializeDefaultData();
        this.interceptFetch();
    }

    initializeDefaultData() {
        // Utilisateurs par défaut
        if (!localStorage.getItem('h2eaux_users')) {
            const users = [
                {
                    id: '1',
                    username: 'admin',
                    password: 'admin123',
                    role: 'admin',
                    nom: 'Administrateur',
                    prenom: 'Admin',
                    email: 'admin@h2eaux-gestion.fr',
                    telephone: '01 23 45 67 89',
                    date_creation: new Date().toISOString()
                },
                {
                    id: '2',
                    username: 'employe1',
                    password: 'employe123',
                    role: 'employee',
                    nom: 'Martin',
                    prenom: 'Pierre',
                    email: 'pierre.martin@h2eaux-gestion.fr',
                    telephone: '01 98 76 54 32',
                    date_creation: new Date().toISOString()
                }
            ];
            localStorage.setItem('h2eaux_users', JSON.stringify(users));
        }

        // Clients de démonstration
        if (!localStorage.getItem('h2eaux_clients')) {
            const clients = [
                {
                    id: 'client_1',
                    nom: 'Dupont',
                    prenom: 'Jean',
                    email: 'jean.dupont@email.fr',
                    telephone: '01 23 45 67 89',
                    adresse: '123 Rue de la Paix, 75001 Paris',
                    ville: 'Paris',
                    code_postal: '75001',
                    date_creation: new Date().toISOString()
                },
                {
                    id: 'client_2',
                    nom: 'Martin',
                    prenom: 'Marie',
                    email: 'marie.martin@email.fr',
                    telephone: '01 98 76 54 32',
                    adresse: '456 Avenue des Champs, 69000 Lyon',
                    ville: 'Lyon',
                    code_postal: '69000',
                    date_creation: new Date().toISOString()
                }
            ];
            localStorage.setItem('h2eaux_clients', JSON.stringify(clients));
        }

        // Initialiser autres collections
        if (!localStorage.getItem('h2eaux_chantiers')) {
            localStorage.setItem('h2eaux_chantiers', JSON.stringify([]));
        }
        if (!localStorage.getItem('h2eaux_calculs_pac')) {
            localStorage.setItem('h2eaux_calculs_pac', JSON.stringify([]));
        }
        if (!localStorage.getItem('h2eaux_fiches_chantier')) {
            localStorage.setItem('h2eaux_fiches_chantier', JSON.stringify([]));
        }
        if (!localStorage.getItem('h2eaux_documents')) {
            localStorage.setItem('h2eaux_documents', JSON.stringify([]));
        }
    }

    interceptFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            // Si l'URL contient '/api/', utiliser le backend local
            if (typeof url === 'string' && url.includes('/api/')) {
                return this.handleLocalRequest(url, options);
            }
            
            // Sinon, utiliser fetch normal
            return originalFetch.apply(this, arguments);
        };
    }

    async handleLocalRequest(url, options) {
        const method = options.method || 'GET';
        const path = url.replace(/.*\/api\//, '');
        
        // Simuler délai réseau
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            // Health check
            if (path === 'health') {
                return this.createResponse({ status: 'ok', message: 'H2eaux Gestion Local Backend' });
            }

            // Authentication
            if (path === 'auth/login') {
                return this.handleLogin(options.body);
            }

            if (path === 'auth/register') {
                return this.handleRegister(options.body);
            }

            // Users management
            if (path === 'users') {
                if (method === 'GET') return this.getUsers();
                if (method === 'POST') return this.createUser(options.body);
            }

            if (path.startsWith('users/')) {
                const userId = path.split('/')[1];
                if (method === 'PUT') return this.updateUser(userId, options.body);
                if (method === 'DELETE') return this.deleteUser(userId);
            }

            // Password change
            if (path.startsWith('users/') && path.endsWith('/password')) {
                const userId = path.split('/')[1];
                return this.changePassword(userId, options.body);
            }

            // Clients
            if (path === 'clients') {
                if (method === 'GET') return this.getClients();
                if (method === 'POST') return this.createClient(options.body);
            }

            if (path.startsWith('clients/')) {
                const clientId = path.split('/')[1];
                if (method === 'GET') return this.getClient(clientId);
                if (method === 'PUT') return this.updateClient(clientId, options.body);
                if (method === 'DELETE') return this.deleteClient(clientId);
            }

            // Chantiers
            if (path === 'chantiers') {
                if (method === 'GET') return this.getChantiers();
                if (method === 'POST') return this.createChantier(options.body);
            }

            // Calculs PAC
            if (path === 'calculs-pac') {
                if (method === 'GET') return this.getCalculsPac();
                if (method === 'POST') return this.createCalculPac(options.body);
            }

            // Fiches chantier
            if (path === 'fiches-chantier') {
                if (method === 'GET') return this.getFichesChantier();
                if (method === 'POST') return this.createFicheChantier(options.body);
            }

            // Documents
            if (path === 'documents') {
                if (method === 'GET') return this.getDocuments();
                if (method === 'POST') return this.createDocument(options.body);
            }

            return this.createResponse({ error: 'Endpoint non trouvé' }, 404);

        } catch (error) {
            return this.createResponse({ error: error.message }, 500);
        }
    }

    // Authentication
    async handleLogin(body) {
        const data = JSON.parse(body || '{}');
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        
        const user = users.find(u => u.username === data.username && u.password === data.password);
        
        if (user) {
            const token = 'local_token_' + user.id + '_' + Date.now();
            localStorage.setItem('h2eaux_current_token', token);
            localStorage.setItem('h2eaux_current_user', JSON.stringify(user));
            
            return this.createResponse({
                access_token: token,
                token_type: 'bearer',
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    nom: user.nom,
                    prenom: user.prenom,
                    email: user.email
                }
            });
        } else {
            return this.createResponse({ detail: 'Identifiants incorrects' }, 401);
        }
    }

    // Users management
    async getUsers() {
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        return this.createResponse(users.map(u => ({ 
            ...u, 
            password: undefined // Ne pas exposer les mots de passe
        })));
    }

    async createUser(body) {
        const data = JSON.parse(body || '{}');
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        
        // Vérifier si l'utilisateur existe déjà
        if (users.find(u => u.username === data.username)) {
            return this.createResponse({ error: 'Nom d\'utilisateur déjà existant' }, 400);
        }
        
        const newUser = {
            id: 'user_' + Date.now(),
            username: data.username,
            password: data.password,
            role: data.role || 'employee',
            nom: data.nom || '',
            prenom: data.prenom || '',
            email: data.email || '',
            telephone: data.telephone || '',
            permissions: data.permissions || this.getDefaultPermissions(data.role),
            date_creation: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('h2eaux_users', JSON.stringify(users));
        
        return this.createResponse({ ...newUser, password: undefined }, 201);
    }

    async updateUser(userId, body) {
        const data = JSON.parse(body || '{}');
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        
        const index = users.findIndex(u => u.id === userId);
        if (index === -1) {
            return this.createResponse({ error: 'Utilisateur non trouvé' }, 404);
        }
        
        // Ne pas modifier le mot de passe s'il n'est pas fourni
        if (data.password) {
            users[index].password = data.password;
        }
        
        users[index] = { 
            ...users[index], 
            ...data,
            permissions: data.permissions || users[index].permissions
        };
        localStorage.setItem('h2eaux_users', JSON.stringify(users));
        
        return this.createResponse({ ...users[index], password: undefined });
    }

    getDefaultPermissions(role) {
        if (role === 'admin') {
            return {
                clients: true,
                chantiers: true,
                documents: true,
                calculs_pac: true,
                catalogues: true,
                chat: true,
                parametres: true
            };
        } else {
            return {
                clients: true,
                chantiers: true,
                documents: true,
                calculs_pac: true,
                catalogues: false,
                chat: true,
                parametres: false
            };
        }
    }

    async deleteUser(userId) {
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        const filteredUsers = users.filter(u => u.id !== userId);
        
        if (users.length === filteredUsers.length) {
            return this.createResponse({ error: 'Utilisateur non trouvé' }, 404);
        }
        
        localStorage.setItem('h2eaux_users', JSON.stringify(filteredUsers));
        return this.createResponse({ message: 'Utilisateur supprimé' });
    }

    // Clients
    async getClients() {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        return this.createResponse(clients);
    }

    async getClient(clientId) {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        const client = clients.find(c => c.id === clientId);
        if (!client) {
            return this.createResponse({ error: 'Client non trouvé' }, 404);
        }
        return this.createResponse(client);
    }

    async createClient(body) {
        const data = JSON.parse(body || '{}');
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        
        const newClient = {
            id: 'client_' + Date.now(),
            ...data,
            date_creation: new Date().toISOString()
        };
        
        clients.push(newClient);
        localStorage.setItem('h2eaux_clients', JSON.stringify(clients));
        
        return this.createResponse(newClient, 201);
    }

    async updateClient(clientId, body) {
        const data = JSON.parse(body || '{}');
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        
        const index = clients.findIndex(c => c.id === clientId);
        if (index === -1) {
            return this.createResponse({ error: 'Client non trouvé' }, 404);
        }
        
        clients[index] = { ...clients[index], ...data };
        localStorage.setItem('h2eaux_clients', JSON.stringify(clients));
        
        return this.createResponse(clients[index]);
    }

    async deleteClient(clientId) {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        const filteredClients = clients.filter(c => c.id !== clientId);
        
        if (clients.length === filteredClients.length) {
            return this.createResponse({ error: 'Client non trouvé' }, 404);
        }
        
        localStorage.setItem('h2eaux_clients', JSON.stringify(filteredClients));
        return this.createResponse({ message: 'Client supprimé' });
    }

    // Autres méthodes (Chantiers, PAC, etc.)
    async getChantiers() {
        const chantiers = JSON.parse(localStorage.getItem('h2eaux_chantiers') || '[]');
        return this.createResponse(chantiers);
    }

    async createChantier(body) {
        const data = JSON.parse(body || '{}');
        const chantiers = JSON.parse(localStorage.getItem('h2eaux_chantiers') || '[]');
        
        const newChantier = {
            id: 'chantier_' + Date.now(),
            ...data,
            statut: data.statut || 'en_attente',
            date_creation: new Date().toISOString()
        };
        
        chantiers.push(newChantier);
        localStorage.setItem('h2eaux_chantiers', JSON.stringify(chantiers));
        
        return this.createResponse(newChantier, 201);
    }

    async getCalculsPac() {
        const calculs = JSON.parse(localStorage.getItem('h2eaux_calculs_pac') || '[]');
        return this.createResponse(calculs);
    }

    async createCalculPac(body) {
        const data = JSON.parse(body || '{}');
        const calculs = JSON.parse(localStorage.getItem('h2eaux_calculs_pac') || '[]');
        
        const newCalcul = {
            id: 'pac_' + Date.now(),
            ...data,
            date_creation: new Date().toISOString()
        };
        
        calculs.push(newCalcul);
        localStorage.setItem('h2eaux_calculs_pac', JSON.stringify(calculs));
        
        return this.createResponse(newCalcul, 201);
    }

    async getFichesChantier() {
        const fiches = JSON.parse(localStorage.getItem('h2eaux_fiches_chantier') || '[]');
        return this.createResponse(fiches);
    }

    async createFicheChantier(body) {
        const data = JSON.parse(body || '{}');
        const fiches = JSON.parse(localStorage.getItem('h2eaux_fiches_chantier') || '[]');
        
        const newFiche = {
            id: 'fiche_' + Date.now(),
            ...data,
            date_creation: new Date().toISOString()
        };
        
        fiches.push(newFiche);
        localStorage.setItem('h2eaux_fiches_chantier', JSON.stringify(fiches));
        
        return this.createResponse(newFiche, 201);
    }

    async getDocuments() {
        const documents = JSON.parse(localStorage.getItem('h2eaux_documents') || '[]');
        return this.createResponse(documents);
    }

    async createDocument(body) {
        const data = JSON.parse(body || '{}');
        const documents = JSON.parse(localStorage.getItem('h2eaux_documents') || '[]');
        
        const newDocument = {
            id: 'doc_' + Date.now(),
            ...data,
            date_creation: new Date().toISOString()
        };
        
        documents.push(newDocument);
        localStorage.setItem('h2eaux_documents', JSON.stringify(documents));
        
        return this.createResponse(newDocument, 201);
    }

    // Utilitaire pour créer les réponses
    createResponse(data, status = 200) {
        return {
            ok: status >= 200 && status < 300,
            status: status,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data)),
            headers: new Map([['content-type', 'application/json']])
        };
    }
}

// Initialiser le backend local
console.log('Initialisation du backend local H2eaux Gestion...');
window.h2eauxBackendLocal = new H2eauxBackendLocal();
console.log('Backend local H2eaux Gestion initialisé avec succès');