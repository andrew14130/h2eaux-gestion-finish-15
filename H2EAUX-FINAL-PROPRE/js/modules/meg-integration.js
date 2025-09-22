// ===== MEG INTEGRATION MODULE =====
window.megIntegration = {
    importHistory: [],
    exportHistory: [],

    async load() {
        this.render();
    },

    render() {
        const container = document.getElementById('megContainer');
        
        container.innerHTML = `
            <div class="meg-header">
                <h3>🔄 Intégration MEG</h3>
                <p>Import et export de données vers votre logiciel de comptabilité MEG</p>
            </div>
            
            <div class="meg-sections">
                <div class="meg-section">
                    <div class="section-header">
                        <h4>📥 Import depuis MEG</h4>
                        <p>Importer des données depuis votre logiciel MEG</p>
                    </div>
                    <div class="import-options">
                        <div class="import-card" onclick="megIntegration.showImportModal('csv')">
                            <div class="import-icon">📊</div>
                            <h5>Import CSV</h5>
                            <p>Importer depuis un fichier CSV exporté de MEG</p>
                        </div>
                        <div class="import-card" onclick="megIntegration.showImportModal('xml')">
                            <div class="import-icon">📄</div>
                            <h5>Import XML</h5>
                            <p>Importer depuis un fichier XML MEG</p>
                        </div>
                        <div class="import-card" onclick="megIntegration.showImportModal('txt')">
                            <div class="import-icon">📝</div>
                            <h5>Import TXT</h5>
                            <p>Importer depuis un fichier texte structuré</p>
                        </div>
                    </div>
                </div>
                
                <div class="meg-section">
                    <div class="section-header">
                        <h4>📤 Export vers MEG</h4>
                        <p>Exporter vos données H2EAUX vers MEG</p>
                    </div>
                    <div class="export-options">
                        <div class="export-card" onclick="megIntegration.exportData('clients')">
                            <div class="export-icon">👥</div>
                            <h5>Export Clients</h5>
                            <p>Exporter la base clients vers MEG</p>
                        </div>
                        <div class="export-card" onclick="megIntegration.exportData('chantiers')">
                            <div class="export-icon">🏗️</div>
                            <h5>Export Chantiers</h5>
                            <p>Exporter les chantiers et facturations</p>
                        </div>
                        <div class="export-card" onclick="megIntegration.exportData('complet')">
                            <div class="export-icon">📦</div>
                            <h5>Export Complet</h5>
                            <p>Export global de toutes les données</p>
                        </div>
                    </div>
                </div>
                
                <div class="meg-section">
                    <div class="section-header">
                        <h4>📋 Historique des Opérations</h4>
                    </div>
                    <div class="history-container">
                        ${this.renderHistory()}
                    </div>
                </div>
            </div>
        `;
    },

    renderHistory() {
        const allHistory = [
            ...this.importHistory.map(h => ({...h, type: 'import'})),
            ...this.exportHistory.map(h => ({...h, type: 'export'}))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allHistory.length === 0) {
            return `
                <div class="empty-history">
                    <p>Aucune opération d'import/export effectuée</p>
                </div>
            `;
        }

        return `
            <div class="history-list">
                ${allHistory.map(operation => `
                    <div class="history-item ${operation.type}">
                        <div class="history-icon">
                            ${operation.type === 'import' ? '📥' : '📤'}
                        </div>
                        <div class="history-content">
                            <div class="history-title">${operation.title}</div>
                            <div class="history-details">
                                ${operation.details} • ${app.formatDate(operation.date)}
                                ${operation.status === 'success' ? 
                                    '<span class="status-success">✅ Réussi</span>' : 
                                    '<span class="status-error">❌ Échec</span>'
                                }
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    showImportModal(format) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">📥 Import ${format.toUpperCase()} depuis MEG</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="import-steps">
                        <div class="step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h5>Exporter depuis MEG</h5>
                                <p>Dans MEG, exportez vos données au format ${format.toUpperCase()}</p>
                            </div>
                        </div>
                        <div class="step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h5>Sélectionner le fichier</h5>
                                <div class="file-upload-area" onclick="document.getElementById('importFile').click()">
                                    <div class="file-upload-icon">📁</div>
                                    <div class="file-upload-text">
                                        <strong>Cliquer pour sélectionner le fichier ${format.toUpperCase()}</strong>
                                        <br><small>Fichier exporté depuis MEG</small>
                                    </div>
                                    <input type="file" id="importFile" accept=".${format}" style="display: none;">
                                </div>
                                <div id="selectedImportFile" class="selected-file-name" style="display: none;"></div>
                            </div>
                        </div>
                        <div class="step">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h5>Mapping des champs</h5>
                                <div class="mapping-info">
                                    <p>Les champs seront automatiquement mappés :</p>
                                    <div class="mapping-list">
                                        <div class="mapping-item">
                                            <span class="meg-field">Nom</span> → 
                                            <span class="h2eaux-field">Nom client</span>
                                        </div>
                                        <div class="mapping-item">
                                            <span class="meg-field">Téléphone</span> → 
                                            <span class="h2eaux-field">Téléphone</span>
                                        </div>
                                        <div class="mapping-item">
                                            <span class="meg-field">Adresse</span> → 
                                            <span class="h2eaux-field">Adresse</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="import-options-section">
                        <h5>Options d'import</h5>
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="importOverwrite" checked>
                                Remplacer les données existantes
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="importBackup" checked>
                                Créer une sauvegarde avant import
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn-primary" onclick="megIntegration.processImport('${format}')">Lancer l'import</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // File handling
        const fileInput = document.getElementById('importFile');
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('selectedImportFile').style.display = 'block';
                document.getElementById('selectedImportFile').innerHTML = `
                    <div class="file-info">
                        <span class="file-name">📄 ${file.name}</span>
                        <span class="file-size">(${this.formatFileSize(file.size)})</span>
                    </div>
                `;
            }
        });
    },

    processImport(format) {
        const fileInput = document.getElementById('importFile');
        const file = fileInput?.files[0];
        
        if (!file) {
            app.showMessage('Veuillez sélectionner un fichier à importer', 'error');
            return;
        }

        // Simulate import process
        const operation = {
            id: Date.now().toString(),
            title: `Import ${format.toUpperCase()} depuis MEG`,
            details: `${file.name} • ${this.formatFileSize(file.size)}`,
            date: new Date().toISOString(),
            status: 'success'
        };

        this.importHistory.unshift(operation);
        
        app.showMessage('Import réalisé avec succès', 'success');
        document.querySelector('.modal').remove();
        this.render();
    },

    exportData(type) {
        const exportTitles = {
            'clients': 'Export Clients vers MEG',
            'chantiers': 'Export Chantiers vers MEG',
            'complet': 'Export Complet vers MEG'
        };

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">📤 ${exportTitles[type]}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-info">
                        <div class="export-summary">
                            <h5>Données à exporter :</h5>
                            <div class="export-stats">
                                ${type === 'clients' || type === 'complet' ? '<div class="stat">👥 Clients : Simulation en cours...</div>' : ''}
                                ${type === 'chantiers' || type === 'complet' ? '<div class="stat">🏗️ Chantiers : Simulation en cours...</div>' : ''}
                                ${type === 'complet' ? '<div class="stat">🌡️ Calculs PAC : Simulation en cours...</div>' : ''}
                            </div>
                        </div>
                        
                        <div class="export-format">
                            <h5>Format d'export :</h5>
                            <div class="format-options">
                                <label class="radio-label">
                                    <input type="radio" name="exportFormat" value="csv" checked>
                                    CSV (Compatible MEG)
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="exportFormat" value="xml">
                                    XML (Format MEG avancé)
                                </label>
                            </div>
                        </div>
                        
                        <div class="export-options">
                            <h5>Options d'export :</h5>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="exportHeaders" checked>
                                    Inclure les en-têtes de colonnes
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="exportArchived">
                                    Inclure les données archivées
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="exportDateFilter">
                                    Filtrer par période (derniers 12 mois)
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn-primary" onclick="megIntegration.processExport('${type}')">Générer l'export</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    processExport(type) {
        const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'csv';
        
        // Simulate export process
        const operation = {
            id: Date.now().toString(),
            title: `Export ${type} vers MEG`,
            details: `Format ${format.toUpperCase()} • Génération automatique`,
            date: new Date().toISOString(),
            status: 'success'
        };

        this.exportHistory.unshift(operation);
        
        // Simulate file download
        const filename = `h2eaux_export_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
        
        app.showMessage(`Export généré avec succès : ${filename}`, 'success');
        document.querySelector('.modal').remove();
        this.render();
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
};