// Backend Local pour H2eaux Gestion - Version Complète Autonome
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
                    date_creation: new Date().toISOString(),
                    permissions: {
                        clients: true,
                        chantiers: true,
                        documents: true,
                        fiches_chantier: true,
                        calculs_pac: true,
                        calendrier: true,
                        chat: true,
                        parametres: true
                    }
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
                    date_creation: new Date().toISOString(),
                    permissions: {
                        clients: true,
                        chantiers: true,
                        documents: true,
                        fiches_chantier: true,
                        calculs_pac: true,
                        calendrier: true,
                        chat: true,
                        parametres: false
                    }
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
        if (!localStorage.getItem('h2eaux_settings')) {
            const defaultSettings = {
                company_name: 'H2eaux Gestion',
                company_logo: null,
                theme: 'blue',
                notifications: true,
                auto_backup: true
            };
            localStorage.setItem('h2eaux_settings', JSON.stringify(defaultSettings));
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
                return this.createUser(options.body);
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

            if (path.startsWith('chantiers/')) {
                const chantierId = path.split('/')[1];
                if (method === 'PUT') return this.updateChantier(chantierId, options.body);
                if (method === 'DELETE') return this.deleteChantier(chantierId);
            }

            // Calculs PAC
            if (path === 'calculs-pac') {
                if (method === 'GET') return this.getCalculsPac();
                if (method === 'POST') return this.createCalculPac(options.body);
            }

            // IMPORTANTE: Support des deux endpoints pour les fiches chantier
            // Pour compatibilité avec l'ancien système (fiches-sdb) et le nouveau (fiches-chantier)
            if (path === 'fiches-sdb' || path === 'fiches-chantier') {
                if (method === 'GET') return this.getFichesChantier();
                if (method === 'POST') return this.createFicheChantier(options.body);
            }

            if (path.startsWith('fiches-sdb/') || path.startsWith('fiches-chantier/')) {
                const ficheId = path.split('/')[1];
                if (method === 'GET') return this.getFicheChantier(ficheId);
                if (method === 'PUT') return this.updateFicheChantier(ficheId, options.body);
                if (method === 'DELETE') return this.deleteFicheChantier(ficheId);
            }

            // Documents
            if (path === 'documents') {
                if (method === 'GET') return this.getDocuments();
                if (method === 'POST') return this.createDocument(options.body);
            }

            if (path.startsWith('documents/')) {
                const docId = path.split('/')[1];
                if (method === 'PUT') return this.updateDocument(docId, options.body);
                if (method === 'DELETE') return this.deleteDocument(docId);
            }

            // Settings
            if (path === 'settings') {
                if (method === 'GET') return this.getSettings();
                if (method === 'PUT') return this.updateSettings(options.body);
            }

            if (path === 'settings/logo') {
                if (method === 'POST') return this.uploadLogo(options.body);
                if (method === 'DELETE') return this.deleteLogo();
            }

            return this.createResponse({ error: 'Endpoint non trouvé' }, 404);

        } catch (error) {
            console.error('Backend local error:', error);
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
                    email: user.email,
                    permissions: user.permissions || {}
                }
            });
        } else {
            return this.createResponse({ detail: 'Identifiants incorrects' }, 401);
        }
    }

    // Users
    async getUsers() {
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        // Ne pas retourner les mots de passe
        const safeUsers = users.map(u => ({
            id: u.id,
            username: u.username,
            role: u.role,
            nom: u.nom,
            prenom: u.prenom,
            email: u.email,
            telephone: u.telephone,
            date_creation: u.date_creation,
            permissions: u.permissions || {}
        }));
        return this.createResponse(safeUsers);
    }

    async createUser(body) {
        const data = JSON.parse(body || '{}');
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        
        // Vérifier si l'utilisateur existe déjà
        if (users.find(u => u.username === data.username)) {
            return this.createResponse({ detail: 'Ce nom d\'utilisateur existe déjà' }, 400);
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
            date_creation: new Date().toISOString(),
            permissions: data.permissions || {
                clients: true,
                chantiers: true,
                documents: true,
                fiches_chantier: true,
                calculs_pac: true,
                calendrier: true,
                chat: true,
                parametres: data.role === 'admin'
            }
        };
        
        users.push(newUser);
        localStorage.setItem('h2eaux_users', JSON.stringify(users));
        
        // Retourner sans le mot de passe
        const { password, ...safeUser } = newUser;
        return this.createResponse(safeUser, 201);
    }

    async updateUser(userId, body) {
        const data = JSON.parse(body || '{}');
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return this.createResponse({ detail: 'Utilisateur non trouvé' }, 404);
        }
        
        // Mettre à jour les champs
        const updatedUser = { ...users[userIndex], ...data };
        users[userIndex] = updatedUser;
        
        localStorage.setItem('h2eaux_users', JSON.stringify(users));
        
        // Retourner sans le mot de passe
        const { password, ...safeUser } = updatedUser;
        return this.createResponse(safeUser);
    }

    async deleteUser(userId) {
        const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
        const filteredUsers = users.filter(u => u.id !== userId);
        
        if (users.length === filteredUsers.length) {
            return this.createResponse({ detail: 'Utilisateur non trouvé' }, 404);
        }
        
        localStorage.setItem('h2eaux_users', JSON.stringify(filteredUsers));
        return this.createResponse({ message: 'Utilisateur supprimé' });
    }

    // Clients
    async getClients() {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        return this.createResponse(clients);
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

    async getClient(clientId) {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        const client = clients.find(c => c.id === clientId);
        
        if (!client) {
            return this.createResponse({ detail: 'Client non trouvé' }, 404);
        }
        
        return this.createResponse(client);
    }

    async updateClient(clientId, body) {
        const data = JSON.parse(body || '{}');
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        
        const clientIndex = clients.findIndex(c => c.id === clientId);
        if (clientIndex === -1) {
            return this.createResponse({ detail: 'Client non trouvé' }, 404);
        }
        
        clients[clientIndex] = { ...clients[clientIndex], ...data };
        localStorage.setItem('h2eaux_clients', JSON.stringify(clients));
        
        return this.createResponse(clients[clientIndex]);
    }

    async deleteClient(clientId) {
        const clients = JSON.parse(localStorage.getItem('h2eaux_clients') || '[]');
        const filteredClients = clients.filter(c => c.id !== clientId);
        
        if (clients.length === filteredClients.length) {
            return this.createResponse({ detail: 'Client non trouvé' }, 404);
        }
        
        localStorage.setItem('h2eaux_clients', JSON.stringify(filteredClients));
        return this.createResponse({ message: 'Client supprimé' });
    }

    // Chantiers
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
            date_creation: new Date().toISOString()
        };
        
        chantiers.push(newChantier);
        localStorage.setItem('h2eaux_chantiers', JSON.stringify(chantiers));
        
        return this.createResponse(newChantier, 201);
    }

    async updateChantier(chantierId, body) {
        const data = JSON.parse(body || '{}');
        const chantiers = JSON.parse(localStorage.getItem('h2eaux_chantiers') || '[]');
        
        const chantierIndex = chantiers.findIndex(c => c.id === chantierId);
        if (chantierIndex === -1) {
            return this.createResponse({ detail: 'Chantier non trouvé' }, 404);
        }
        
        chantiers[chantierIndex] = { ...chantiers[chantierIndex], ...data };
        localStorage.setItem('h2eaux_chantiers', JSON.stringify(chantiers));
        
        return this.createResponse(chantiers[chantierIndex]);
    }

    async deleteChantier(chantierId) {
        const chantiers = JSON.parse(localStorage.getItem('h2eaux_chantiers') || '[]');
        const filteredChantiers = chantiers.filter(c => c.id !== chantierId);
        
        if (chantiers.length === filteredChantiers.length) {
            return this.createResponse({ detail: 'Chantier non trouvé' }, 404);
        }
        
        localStorage.setItem('h2eaux_chantiers', JSON.stringify(filteredChantiers));
        return this.createResponse({ message: 'Chantier supprimé' });
    }

    // Calculs PAC
    async getCalculsPac() {
        const calculs = JSON.parse(localStorage.getItem('h2eaux_calculs_pac') || '[]');
        return this.createResponse(calculs);
    }

    async createCalculPac(body) {
        const data = JSON.parse(body || '{}');
        const calculs = JSON.parse(localStorage.getItem('h2eaux_calculs_pac') || '[]');
        
        const newCalcul = {
            id: 'calcul_' + Date.now(),
            ...data,
            date_creation: new Date().toISOString()
        };
        
        calculs.push(newCalcul);
        localStorage.setItem('h2eaux_calculs_pac', JSON.stringify(calculs));
        
        return this.createResponse(newCalcul, 201);
    }

    // Fiches Chantier (Support des deux endpoints)
    async getFichesChantier() {
        const fiches = JSON.parse(localStorage.getItem('h2eaux_fiches_chantier') || '[]');
        return this.createResponse(fiches);
    }

    async getFicheChantier(ficheId) {
        const fiches = JSON.parse(localStorage.getItem('h2eaux_fiches_chantier') || '[]');
        const fiche = fiches.find(f => f.id === ficheId);
        
        if (!fiche) {
            return this.createResponse({ detail: 'Fiche non trouvée' }, 404);
        }
        
        return this.createResponse(fiche);
    }

    async createFicheChantier(body) {
        const data = JSON.parse(body || '{}');
        const fiches = JSON.parse(localStorage.getItem('h2eaux_fiches_chantier') || '[]');
        
        const newFiche = {
            id: 'fiche_' + Date.now(),
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        fiches.push(newFiche);
        localStorage.setItem('h2eaux_fiches_chantier', JSON.stringify(fiches));
        
        return this.createResponse(newFiche, 201);
    }

    async updateFicheChantier(ficheId, body) {
        const data = JSON.parse(body || '{}');
        const fiches = JSON.parse(localStorage.getItem('h2eaux_fiches_chantier') || '[]');
        
        const ficheIndex = fiches.findIndex(f => f.id === ficheId);
        if (ficheIndex === -1) {
            return this.createResponse({ detail: 'Fiche non trouvée' }, 404);
        }
        
        fiches[ficheIndex] = { 
            ...fiches[ficheIndex], 
            ...data,
            updated_at: new Date().toISOString()
        };
        localStorage.setItem('h2eaux_fiches_chantier', JSON.stringify(fiches));
        
        return this.createResponse(fiches[ficheIndex]);
    }

    async deleteFicheChantier(ficheId) {
        const fiches = JSON.parse(localStorage.getItem('h2eaux_fiches_chantier') || '[]');
        const filteredFiches = fiches.filter(f => f.id !== ficheId);
        
        if (fiches.length === filteredFiches.length) {
            return this.createResponse({ detail: 'Fiche non trouvée' }, 404);
        }
        
        localStorage.setItem('h2eaux_fiches_chantier', JSON.stringify(filteredFiches));
        return this.createResponse({ message: 'Fiche supprimée' });
    }

    // Documents
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

    async updateDocument(docId, body) {
        const data = JSON.parse(body || '{}');
        const documents = JSON.parse(localStorage.getItem('h2eaux_documents') || '[]');
        
        const docIndex = documents.findIndex(d => d.id === docId);
        if (docIndex === -1) {
            return this.createResponse({ detail: 'Document non trouvé' }, 404);
        }
        
        documents[docIndex] = { ...documents[docIndex], ...data };
        localStorage.setItem('h2eaux_documents', JSON.stringify(documents));
        
        return this.createResponse(documents[docIndex]);
    }

    async deleteDocument(docId) {
        const documents = JSON.parse(localStorage.getItem('h2eaux_documents') || '[]');
        const filteredDocuments = documents.filter(d => d.id !== docId);
        
        if (documents.length === filteredDocuments.length) {
            return this.createResponse({ detail: 'Document non trouvé' }, 404);
        }
        
        localStorage.setItem('h2eaux_documents', JSON.stringify(filteredDocuments));
        return this.createResponse({ message: 'Document supprimé' });
    }

    // Settings
    async getSettings() {
        const settings = JSON.parse(localStorage.getItem('h2eaux_settings') || '{}');
        return this.createResponse(settings);
    }

    async updateSettings(body) {
        const data = JSON.parse(body || '{}');
        const currentSettings = JSON.parse(localStorage.getItem('h2eaux_settings') || '{}');
        
        const updatedSettings = { ...currentSettings, ...data };
        localStorage.setItem('h2eaux_settings', JSON.stringify(updatedSettings));
        
        return this.createResponse(updatedSettings);
    }

    async uploadLogo(body) {
        // Simuler l'upload de logo (en base64)
        const data = JSON.parse(body || '{}');
        const settings = JSON.parse(localStorage.getItem('h2eaux_settings') || '{}');
        
        settings.company_logo = data.logo_data;
        localStorage.setItem('h2eaux_settings', JSON.stringify(settings));
        
        return this.createResponse({ 
            message: 'Logo uploadé avec succès',
            logo_url: data.logo_data 
        });
    }

    async deleteLogo() {
        const settings = JSON.parse(localStorage.getItem('h2eaux_settings') || '{}');
        settings.company_logo = null;
        localStorage.setItem('h2eaux_settings', JSON.stringify(settings));
        
        return this.createResponse({ message: 'Logo supprimé' });
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