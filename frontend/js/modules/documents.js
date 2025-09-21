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
        this.showDocumentModal('Nouveau Document', null);
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

        const fileInput = document.getElementById('docFile');
        const file = fileInput.files[0];

        try {
            let fileData = null;
            let fileSize = 0;
            let mimeType = null;

            // Process file if one is selected
            if (file) {
                fileSize = file.size;
                mimeType = file.type;
                
                // Convert file to base64 for storage
                const reader = new FileReader();
                fileData = await new Promise((resolve, reject) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

            const newDoc = {
                ...formData,
                id: 'doc_' + Date.now(),
                taille: file ? this.formatFileSize(fileSize) : '0 KB',
                file_data: fileData,
                mime_type: mimeType,
                file_name: file ? file.name : null,
                created_at: new Date().toISOString()
            };
            
            // Save to backend local
            await app.apiCall('/documents', {
                method: 'POST',
                body: JSON.stringify(newDoc)
            });
            
            // Refresh data
            await this.load();
            
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