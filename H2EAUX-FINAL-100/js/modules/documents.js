// ===== DOCUMENTS MODULE =====
window.documents = {
    data: [],
    
    async load() {
        try {
            this.data = await app.apiCall('/documents');
            this.render();
        } catch (error) {
            console.error('Error loading documents:', error);
            // Simulate document data for demonstration
            this.data = [
                {
                    id: '1',
                    nom: 'Devis PAC Dupont',
                    type: 'devis',
                    client_nom: 'Dupont Jean',
                    chantier: 'Installation PAC Air/Eau',
                    taille: '245 KB',
                    created_at: new Date().toISOString()
                },
                {
                    id: '2',
                    nom: 'Facture Installation Martin',
                    type: 'facture',
                    client_nom: 'Martin Pierre',
                    chantier: 'Maintenance climatisation',
                    taille: '187 KB',
                    created_at: new Date(Date.now() - 86400000).toISOString()
                }
            ];
            this.render();
        }
    },

    render() {
        const container = document.getElementById('documentsList');
        
        if (this.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <h3>Aucun document</h3>
                    <p>Cliquez sur "+ Nouveau Document" pour commencer</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.map(doc => `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">
                        ${doc.nom}
                        <span class="doc-type-badge ${doc.type}">${this.getTypeLabel(doc.type)}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-view" onclick="documents.viewDocument('${doc.id}')">Voir</button>
                        <button class="btn-edit" onclick="documents.showEditModal('${doc.id}')">Modifier</button>
                        <button class="btn-delete" onclick="documents.delete('${doc.id}', '${doc.nom}')">Supprimer</button>
                    </div>
                </div>
                <div class="item-info">
                    ${doc.client_nom ? `<div class="item-detail">👤 ${doc.client_nom}</div>` : ''}
                    ${doc.chantier ? `<div class="item-detail">🏗️ ${doc.chantier}</div>` : ''}
                    <div class="item-detail">📦 ${doc.taille}</div>
                    <div class="item-detail">📅 ${app.formatDate(doc.created_at)}</div>
                </div>
            </div>
        `).join('');
    },

    getTypeLabel(type) {
        const types = {
            'facture': 'Facture',
            'devis': 'Devis',
            'contrat': 'Contrat',
            'fiche_technique': 'Fiche technique',
            'rapport': 'Rapport',
            'autre': 'Autre'
        };
        return types[type] || 'Document';
    },

    showAddModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';

        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3>📄 Nouveau Document</h3>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="documentForm">
                            <div class="form-group">
                                <label for="docName">Nom du document *</label>
                                <input type="text" id="docName" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="docType">Type de document *</label>
                                <select id="docType" required>
                                    <option value="">Sélectionner un type</option>
                                    <option value="facture">Facture</option>
                                    <option value="devis">Devis</option>
                                    <option value="contrat">Contrat</option>
                                    <option value="fiche_technique">Fiche technique</option>
                                    <option value="rapport">Rapport</option>
                                    <option value="autre">Autre</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="docClient">Client associé</label>
                                <select id="docClient">
                                    <option value="">Aucun client</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="docDescription">Description</label>
                                <textarea id="docDescription" rows="3"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="docFile">Fichier PDF</label>
                                <input type="file" id="docFile" accept=".pdf,application/pdf">
                                <small class="form-help">Taille max: 10MB - Format: PDF uniquement</small>
                            </div>
                        </form>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                        <button type="button" class="btn-primary" onclick="documents.saveDocument()">Enregistrer</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modals').appendChild(modal);

        // Charger la liste des clients
        this.loadClientsForDocument();
    },

    async loadClientsForDocument() {
        try {
            const response = await app.apiCall('/clients');
            const clients = await response.json();
            
            const clientSelect = document.getElementById('docClient');
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.prenom} ${client.nom}`;
                clientSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    },

    async saveDocument() {
        const name = document.getElementById('docName').value.trim();
        const type = document.getElementById('docType').value;
        const clientId = document.getElementById('docClient').value;
        const description = document.getElementById('docDescription').value.trim();
        const fileInput = document.getElementById('docFile');

        if (!name || !type) {
            app.showMessage('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }

        let fileData = null;
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            // Vérifier la taille (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                app.showMessage('Le fichier est trop volumineux (max 10MB)', 'error');
                return;
            }
            
            // Vérifier le type
            if (file.type !== 'application/pdf') {
                app.showMessage('Seuls les fichiers PDF sont acceptés', 'error');
                return;
            }

            // Convertir en base64
            try {
                fileData = await this.fileToBase64(file);
            } catch (error) {
                app.showMessage('Erreur lors du traitement du fichier', 'error');
                return;
            }
        }

        const documentData = {
            nom: name,
            type: type,
            client_id: clientId || null,
            description: description,
            file_data: fileData,
            file_name: fileInput.files.length > 0 ? fileInput.files[0].name : null,
            file_size: fileInput.files.length > 0 ? fileInput.files[0].size : null
        };

        try {
            await app.apiCall('/documents', {
                method: 'POST',
                body: JSON.stringify(documentData)
            });

            app.showMessage('Document ajouté avec succès', 'success');
            document.querySelector('.modal').remove();
            await this.render();
        } catch (error) {
            console.error('Error saving document:', error);
            app.showMessage('Erreur lors de l\'enregistrement', 'error');
        }
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    viewDocument(documentId) {
        const documents = JSON.parse(localStorage.getItem('h2eaux_documents') || '[]');
        const document = documents.find(d => d.id === documentId);
        
        if (!document || !document.file_data) {
            app.showMessage('Document non trouvé ou aucun fichier associé', 'error');
            return;
        }

        // Ouvrir le PDF dans un nouvel onglet
        const newWindow = window.open();
        newWindow.document.write(`
            <html>
                <head>
                    <title>${document.nom}</title>
                    <style>
                        body { margin: 0; padding: 0; }
                        iframe { width: 100%; height: 100vh; border: none; }
                    </style>
                </head>
                <body>
                    <iframe src="${document.file_data}"></iframe>
                </body>
            </html>
        `);
    },

    downloadDocument(documentId) {
        const documents = JSON.parse(localStorage.getItem('h2eaux_documents') || '[]');
        const document = documents.find(d => d.id === documentId);
        
        if (!document || !document.file_data) {
            app.showMessage('Document non trouvé ou aucun fichier associé', 'error');
            return;
        }

        // Créer un lien de téléchargement
        const link = document.createElement('a');
        link.href = document.file_data;
        link.download = document.file_name || `${document.nom}.pdf`;
        link.click();
    },

    showEditModal(docId) {
        const doc = this.data.find(d => d.id === docId);
        if (doc) {
            this.showDocumentModal('Modifier Document', doc);
        }
    },

    async showDocumentModal(title, doc = null) {
        // Load clients and chantiers for dropdowns
        let clientsOptions = '<option value="">Sélectionner un client</option>';
        let chantiersOptions = '<option value="">Sélectionner un chantier</option>';
        
        try {
            const clients = await app.apiCall('/clients');
            clientsOptions += clients.map(client => 
                `<option value="${client.nom} ${client.prenom || ''}" ${doc?.client_nom === `${client.nom} ${client.prenom || ''}` ? 'selected' : ''}>
                    ${client.nom} ${client.prenom || ''}
                </option>`
            ).join('');
            
            const chantiers = await app.apiCall('/chantiers');
            chantiersOptions += chantiers.map(chantier => 
                `<option value="${chantier.nom}" ${doc?.chantier === chantier.nom ? 'selected' : ''}>
                    ${chantier.nom}
                </option>`
            ).join('');
        } catch (error) {
            console.error('Error loading data:', error);
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="documentForm">
                        <div class="form-group">
                            <label>Nom du document *</label>
                            <input type="text" id="docNom" required value="${doc?.nom || ''}" placeholder="Nom du fichier">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Type de document</label>
                                <select id="docType">
                                    <option value="facture" ${doc?.type === 'facture' ? 'selected' : ''}>Facture</option>
                                    <option value="devis" ${doc?.type === 'devis' ? 'selected' : ''}>Devis</option>
                                    <option value="contrat" ${doc?.type === 'contrat' ? 'selected' : ''}>Contrat</option>
                                    <option value="fiche_technique" ${doc?.type === 'fiche_technique' ? 'selected' : ''}>Fiche technique</option>
                                    <option value="rapport" ${doc?.type === 'rapport' ? 'selected' : ''}>Rapport</option>
                                    <option value="autre" ${doc?.type === 'autre' ? 'selected' : ''}>Autre</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Tags</label>
                                <input type="text" id="docTags" value="${doc?.tags || ''}" placeholder="urgent, important, etc.">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Client associé</label>
                                <select id="docClient">${clientsOptions}</select>
                            </div>
                            <div class="form-group">
                                <label>Chantier associé</label>
                                <select id="docChantier">${chantiersOptions}</select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Fichier</label>
                            <div class="file-upload-area" onclick="document.getElementById('docFile').click()">
                                <div class="file-upload-icon">📁</div>
                                <div class="file-upload-text">
                                    <strong>Cliquer pour sélectionner un fichier</strong>
                                    <br>ou glisser-déposer ici
                                    <br><small>PDF, Images, Documents acceptés</small>
                                </div>
                                <input type="file" id="docFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" style="display: none;">
                            </div>
                            <div id="selectedFileName" class="selected-file-name" style="display: none;"></div>
                        </div>
                        
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="docDescription" rows="3" placeholder="Description du document...">${doc?.description || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn-primary" onclick="documents.save()">Enregistrer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // File upload handling
        const fileInput = document.getElementById('docFile');
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('selectedFileName').style.display = 'block';
                document.getElementById('selectedFileName').innerHTML = `
                    <div class="file-info">
                        <span class="file-name">📄 ${file.name}</span>
                        <span class="file-size">(${this.formatFileSize(file.size)})</span>
                    </div>
                `;
            }
        });
        
        // Focus first input
        setTimeout(() => {
            modal.querySelector('#docNom').focus();
        }, 100);
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    async save() {
        const formData = {
            nom: document.getElementById('docNom').value.trim(),
            type: document.getElementById('docType').value,
            tags: document.getElementById('docTags').value.trim(),
            client_nom: document.getElementById('docClient').value,
            chantier: document.getElementById('docChantier').value,
            description: document.getElementById('docDescription').value.trim()
        };

        if (!formData.nom) {
            app.showMessage('Le nom du document est obligatoire', 'error');
            document.getElementById('docNom').focus();
            return;
        }

        try {
            // Simulate save (would normally upload file and save metadata)
            const newDoc = {
                ...formData,
                id: Date.now().toString(),
                taille: '125 KB',
                created_at: new Date().toISOString()
            };
            
            this.data.unshift(newDoc);
            this.render();
            
            app.showMessage('Document enregistré avec succès', 'success');
            document.querySelector('.modal').remove();
        } catch (error) {
            console.error('Error saving document:', error);
            app.showMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
        }
    },

    viewDocument(docId) {
        const doc = this.data.find(d => d.id === docId);
        if (doc) {
            app.showMessage('Fonctionnalité de visualisation en cours de développement', 'info');
        }
    },

    delete(docId, docNom) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le document "${docNom}" ?`)) {
            return;
        }

        try {
            this.data = this.data.filter(d => d.id !== docId);
            this.render();
            app.showMessage('Document supprimé avec succès', 'success');
        } catch (error) {
            console.error('Error deleting document:', error);
            app.showMessage('Erreur lors de la suppression: ' + error.message, 'error');
        }
    }
};