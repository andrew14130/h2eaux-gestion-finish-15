// ===== CALCULS PAC AIR/EAU MODULE =====
window.calculsPacAirEau = {
    data: [],
    currentEdit: null,

    async load() {
        try {
            this.data = await window.window.app.apiCall('/calculs-pac-air-eau');
            this.render();
        } catch (error) {
            console.error('Error loading calculs PAC Air/Eau:', error);
            this.data = [];
            this.render();
        }
    },

    render() {
        const container = document.getElementById('calculsPacAirEauList');
        
        if (this.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🌡️</div>
                    <h3>Aucun calcul PAC Air/Eau</h3>
                    <p>Cliquez sur "+ Nouveau Calcul" pour commencer</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.map(calcul => `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">
                        ${calcul.nom}
                        <span class="pac-type-badge air-eau">Air/Eau</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="calculsPacAirEau.showEditModal('${calcul.id}')">Modifier</button>
                        <button class="btn-view" onclick="calculsPacAirEau.viewResults('${calcul.id}')">Résultats</button>
                        <button class="btn-export" onclick="calculsPacAirEau.exportPDF('${calcul.id}')">Export PDF</button>
                        <button class="btn-delete" onclick="calculsPacAirEau.delete('${calcul.id}', '${calcul.nom}')">Supprimer</button>
                    </div>
                </div>
                <div class="item-info">
                    ${calcul.client_nom ? `<div class="item-detail">👤 ${calcul.client_nom}</div>` : ''}
                    ${calcul.surface ? `<div class="item-detail">📏 ${calcul.surface} m²</div>` : ''}
                    ${calcul.puissance_calculee ? `<div class="item-detail">⚡ ${calcul.puissance_calculee} kW</div>` : ''}
                    <div class="item-detail">📅 ${window.app.formatDate(calcul.created_at)}</div>
                </div>
            </div>
        `).join('');
    },

    showAddModal() {
        this.currentEdit = null;
        this.showCalculModal('Nouveau Calcul PAC Air/Eau', null);
    },

    showEditModal(calculId) {
        this.currentEdit = this.data.find(c => c.id === calculId);
        if (this.currentEdit) {
            this.showCalculModal('Modifier Calcul PAC Air/Eau', this.currentEdit);
        }
    },

    async showCalculModal(title, calcul = null) {
        // Load clients for dropdown
        let clientsOptions = '<option value="">Sélectionner un client</option>';
        try {
            const clients = await window.app.apiCall('/clients');
            clientsOptions += clients.map(client => 
                `<option value="${client.nom} ${client.prenom || ''}" ${calcul?.client_nom === `${client.nom} ${client.prenom || ''}` ? 'selected' : ''}>
                    ${client.nom} ${client.prenom || ''}
                </option>`
            ).join('');
        } catch (error) {
            console.error('Error loading clients:', error);
        }

        const modal = document.createElement('div');
        modal.className = 'modal modal-fullscreen';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="pac-tabs">
                        <button class="tab-btn active" onclick="calculsPacAirEau.switchTab('general')">📋 Général</button>
                        <button class="tab-btn" onclick="calculsPacAirEau.switchTab('logement')">🏠 Logement</button>
                        <button class="tab-btn" onclick="calculsPacAirEau.switchTab('radiateurs')">🔥 Radiateurs Existants</button>
                        <button class="tab-btn" onclick="calculsPacAirEau.switchTab('calculs')">⚡ Calculs</button>
                        <button class="tab-btn" onclick="calculsPacAirEau.switchTab('resultats')">📊 Résultats</button>
                    </div>
                    
                    <form id="calculPacAirEauForm">
                        <!-- ONGLET GÉNÉRAL -->
                        <div id="tab-general" class="tab-content active">
                            <div class="form-section">
                                <h4>📋 Informations Générales</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Nom du projet *</label>
                                        <input type="text" id="calculNom" required value="${calcul?.nom || ''}" placeholder="Ex: PAC Air/Eau Dupont">
                                    </div>
                                    <div class="form-group">
                                        <label>Client</label>
                                        <select id="calculClient">${clientsOptions}</select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Adresse du projet</label>
                                    <textarea id="calculAdresse" rows="2" placeholder="Adresse complète du projet">${calcul?.adresse || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET LOGEMENT -->
                        <div id="tab-logement" class="tab-content">
                            <div class="form-section">
                                <h4>🏠 Caractéristiques du Logement</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Surface habitable (m²) *</label>
                                        <input type="number" id="calculSurface" required value="${calcul?.surface || ''}" min="10" step="0.1" placeholder="m²">
                                    </div>
                                    <div class="form-group">
                                        <label>Hauteur sous plafond (m)</label>
                                        <input type="number" id="calculHauteur" value="${calcul?.hauteur || '2.5'}" min="2" max="4" step="0.1" placeholder="m">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Année de construction</label>
                                        <input type="number" id="calculAnnee" value="${calcul?.annee_construction || ''}" min="1900" max="2025" placeholder="AAAA">
                                    </div>
                                    <div class="form-group">
                                        <label>Type d'isolation</label>
                                        <select id="calculIsolation">
                                            <option value="rt2012" ${calcul?.isolation === 'rt2012' ? 'selected' : ''}>RT2012/RE2020</option>
                                            <option value="bonne" ${calcul?.isolation === 'bonne' ? 'selected' : ''}>Bonne isolation</option>
                                            <option value="moyenne" ${calcul?.isolation === 'moyenne' ? 'selected' : ''}>Isolation moyenne</option>
                                            <option value="ancienne" ${calcul?.isolation === 'ancienne' ? 'selected' : ''}>Ancienne</option>
                                            <option value="faible" ${calcul?.isolation === 'faible' ? 'selected' : ''}>Faible isolation</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Région climatique</label>
                                        <select id="calculRegion">
                                            <option value="H1" ${calcul?.region === 'H1' ? 'selected' : ''}>H1 - Nord/Est de la France</option>
                                            <option value="H2" ${calcul?.region === 'H2' ? 'selected' : ''}>H2 - Centre/Ouest de la France</option>
                                            <option value="H3" ${calcul?.region === 'H3' ? 'selected' : ''}>H3 - Sud de la France</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Température extérieure de base (°C)</label>
                                        <input type="number" id="calculTempExt" value="${calcul?.temperature_ext || '-7'}" min="-15" max="5" step="1" placeholder="°C">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET RADIATEURS EXISTANTS -->
                        <div id="tab-radiateurs" class="tab-content">
                            <div class="form-section">
                                <h4>🔥 Installation de Chauffage Existante</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Type de radiateurs existants</label>
                                        <select id="calculTypeRadiateurs" onchange="calculsPacAirEau.updateRadiateurOptions()">
                                            <option value="fonte" ${calcul?.type_radiateurs === 'fonte' ? 'selected' : ''}>Radiateurs fonte</option>
                                            <option value="acier" ${calcul?.type_radiateurs === 'acier' ? 'selected' : ''}>Radiateurs acier</option>
                                            <option value="aluminium" ${calcul?.type_radiateurs === 'aluminium' ? 'selected' : ''}>Radiateurs aluminium</option>
                                            <option value="plancher" ${calcul?.type_radiateurs === 'plancher' ? 'selected' : ''}>Plancher chauffant</option>
                                            <option value="mixte" ${calcul?.type_radiateurs === 'mixte' ? 'selected' : ''}>Installation mixte</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Température départ existante (°C)</label>
                                        <input type="number" id="calculTempDepart" value="${calcul?.temperature_depart || '70'}" min="30" max="90" step="5" placeholder="°C">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Température retour existante (°C)</label>
                                        <input type="number" id="calculTempRetour" value="${calcul?.temperature_retour || '50'}" min="25" max="70" step="5" placeholder="°C">
                                    </div>
                                    <div class="form-group">
                                        <label>Puissance installée existante (kW)</label>
                                        <input type="number" id="calculPuissanceExistante" value="${calcul?.puissance_existante || ''}" min="5" step="0.5" placeholder="kW">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Nombre de radiateurs</label>
                                    <input type="number" id="calculNbRadiateurs" value="${calcul?.nb_radiateurs || ''}" min="1" max="50" placeholder="Nombre total">
                                </div>
                                <div class="form-group">
                                    <label>Observations sur l'installation existante</label>
                                    <textarea id="calculObservationsRadiateurs" rows="3" placeholder="État des radiateurs, tuyauterie, vanne thermostatique, etc.">${calcul?.observations_radiateurs || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET CALCULS -->
                        <div id="tab-calculs" class="tab-content">
                            <div class="form-section">
                                <h4>⚡ Paramètres de Calcul</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Température intérieure souhaitée (°C)</label>
                                        <input type="number" id="calculTempInt" value="${calcul?.temperature_int || '20'}" min="18" max="25" step="0.5" placeholder="°C">
                                    </div>
                                    <div class="form-group">
                                        <label>Apports internes (W)</label>
                                        <input type="number" id="calculApports" value="${calcul?.apports || '300'}" min="0" max="1000" step="50" placeholder="W">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Coefficient de déperdition G (W/K)</label>
                                        <input type="number" id="calculCoeffG" value="${calcul?.coeff_g || ''}" min="50" step="10" placeholder="Calculé automatiquement" readonly>
                                    </div>
                                    <div class="form-group">
                                        <label>Facteur de correction</label>
                                        <input type="number" id="calculFacteurCorrection" value="${calcul?.facteur_correction || '1.1'}" min="1" max="1.5" step="0.1" placeholder="1.1">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>ECS (Eau Chaude Sanitaire)</label>
                                        <select id="calculEcs">
                                            <option value="oui" ${calcul?.ecs === 'oui' ? 'selected' : ''}>Oui - PAC avec ECS</option>
                                            <option value="non" ${calcul?.ecs === 'non' ? 'selected' : ''}>Non - Chauffage seul</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Puissance ECS (kW)</label>
                                        <input type="number" id="calculPuissanceEcs" value="${calcul?.puissance_ecs || '2'}" min="0" max="10" step="0.5" placeholder="kW">
                                    </div>
                                </div>
                                <div class="calc-actions">
                                    <button type="button" class="btn-primary" onclick="calculsPacAirEau.calculatePower()">🔄 Calculer la Puissance</button>
                                    <button type="button" class="btn-secondary" onclick="calculsPacAirEau.resetCalcul()">🧹 Réinitialiser</button>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET RÉSULTATS -->
                        <div id="tab-resultats" class="tab-content">
                            <div class="form-section">
                                <h4>📊 Résultats du Dimensionnement</h4>
                                <div id="resultsContainer" class="results-container">
                                    <div class="result-card">
                                        <div class="result-label">Puissance de chauffage calculée</div>
                                        <div class="result-value" id="resultPuissanceChauffage">-- kW</div>
                                    </div>
                                    <div class="result-card">
                                        <div class="result-label">Puissance totale avec ECS</div>
                                        <div class="result-value" id="resultPuissanceTotale">-- kW</div>
                                    </div>
                                    <div class="result-card">
                                        <div class="result-label">Température de fonctionnement</div>
                                        <div class="result-value" id="resultTemperature">-- °C</div>
                                    </div>
                                    <div class="result-card">
                                        <div class="result-label">COP estimé</div>
                                        <div class="result-value" id="resultCop">--</div>
                                    </div>
                                </div>
                                <div class="recommendations" id="recommendationsContainer">
                                    <!-- Recommandations générées automatiquement -->
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn-primary" onclick="calculsPacAirEau.save()">💾 Enregistrer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Initialize calculations if editing
        if (calcul) {
            setTimeout(() => {
                this.loadCalculationResults(calcul);
            }, 100);
        }
        
        // Focus first input
        setTimeout(() => {
            modal.querySelector('#calculNom').focus();
        }, 100);
    },

    switchTab(tabName) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[onclick="calculsPacAirEau.switchTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    },

    updateRadiateurOptions() {
        const type = document.getElementById('calculTypeRadiateurs').value;
        const tempDepart = document.getElementById('calculTempDepart');
        const tempRetour = document.getElementById('calculTempRetour');
        
        // Set default temperatures based on radiator type
        const defaults = {
            'fonte': { depart: 70, retour: 50 },
            'acier': { depart: 75, retour: 55 },
            'aluminium': { depart: 65, retour: 45 },
            'plancher': { depart: 35, retour: 30 },
            'mixte': { depart: 60, retour: 45 }
        };
        
        if (defaults[type]) {
            tempDepart.value = defaults[type].depart;
            tempRetour.value = defaults[type].retour;
        }
    },

    calculatePower() {
        const surface = parseFloat(document.getElementById('calculSurface').value) || 0;
        const hauteur = parseFloat(document.getElementById('calculHauteur').value) || 2.5;
        const tempInt = parseFloat(document.getElementById('calculTempInt').value) || 20;
        const tempExt = parseFloat(document.getElementById('calculTempExt').value) || -7;
        const isolation = document.getElementById('calculIsolation').value;
        const apports = parseFloat(document.getElementById('calculApports').value) || 300;
        const facteur = parseFloat(document.getElementById('calculFacteurCorrection').value) || 1.1;
        const ecsActive = document.getElementById('calculEcs').value === 'oui';
        const puissanceEcs = parseFloat(document.getElementById('calculPuissanceEcs').value) || 2;

        if (surface <= 0) {
            window.app.showMessage('Veuillez saisir une surface valide', 'error');
            return;
        }

        // Coefficient de déperdition selon isolation
        const coefficients = {
            'rt2012': 0.6,
            'bonne': 0.8,
            'moyenne': 1.1,
            'ancienne': 1.4,
            'faible': 1.8
        };

        const volume = surface * hauteur;
        const coeffG = coefficients[isolation] * surface;
        const deltaT = tempInt - tempExt;
        
        // Calcul puissance de chauffage
        const puissanceChauffage = ((coeffG * deltaT) - apports) * facteur / 1000;
        const puissanceTotale = puissanceChauffage + (ecsActive ? puissanceEcs : 0);

        // Température de fonctionnement adaptée
        const tempDepart = parseFloat(document.getElementById('calculTempDepart').value) || 70;
        const tempFonctionnement = Math.max(35, tempDepart * 0.7); // Réduction pour PAC

        // COP estimé
        const cop = this.calculateCOP(tempFonctionnement, tempExt);

        // Update results
        document.getElementById('resultPuissanceChauffage').textContent = puissanceChauffage.toFixed(1) + ' kW';
        document.getElementById('resultPuissanceTotale').textContent = puissanceTotale.toFixed(1) + ' kW';
        document.getElementById('resultTemperature').textContent = tempFonctionnement.toFixed(0) + '°C';
        document.getElementById('resultCop').textContent = cop.toFixed(2);
        
        // Update hidden coefficient
        document.getElementById('calculCoeffG').value = coeffG.toFixed(0);

        // Generate recommendations
        this.generateRecommendations(puissanceTotale, tempFonctionnement, cop, isolation);

        // Switch to results tab
        this.switchTab('resultats');
    },

    calculateCOP(tempFonctionnement, tempExt) {
        // COP calculation based on temperatures
        const deltaT = tempFonctionnement - tempExt;
        const copBase = 6.5 - (deltaT * 0.03);
        return Math.max(2.0, Math.min(5.5, copBase));
    },

    generateRecommendations(puissance, tempFonctionnement, cop, isolation) {
        const container = document.getElementById('recommendationsContainer');
        let recommendations = '<h5>💡 Recommandations</h5><div class="recommendations-list">';

        // Power range recommendation
        const puissanceMin = Math.round(puissance * 0.9);
        const puissanceMax = Math.round(puissance * 1.1);
        recommendations += `<div class="recommendation">
            <strong>Puissance recommandée :</strong> ${puissanceMin} à ${puissanceMax} kW
        </div>`;

        // Temperature recommendation
        if (tempFonctionnement > 55) {
            recommendations += `<div class="recommendation warning">
                <strong>⚠️ Attention :</strong> Température de fonctionnement élevée (${tempFonctionnement}°C). 
                Envisager des radiateurs basse température pour améliorer l'efficacité.
            </div>`;
        } else {
            recommendations += `<div class="recommendation success">
                <strong>✅ Bon :</strong> Température de fonctionnement optimale (${tempFonctionnement}°C) pour PAC air/eau.
            </div>`;
        }

        // COP recommendation
        if (cop < 3.0) {
            recommendations += `<div class="recommendation warning">
                <strong>⚠️ COP faible :</strong> Rendement énergétique limité. Vérifier l'isolation et les émetteurs.
            </div>`;
        } else {
            recommendations += `<div class="recommendation success">
                <strong>✅ Bon COP :</strong> Rendement énergétique satisfaisant (${cop.toFixed(2)}).
            </div>`;
        }

        // Isolation recommendation
        if (isolation === 'faible' || isolation === 'ancienne') {
            recommendations += `<div class="recommendation warning">
                <strong>💡 Conseil :</strong> Améliorer l'isolation avant installation pour optimiser les performances.
            </div>`;
        }

        recommendations += '</div>';
        container.innerHTML = recommendations;
    },

    loadCalculationResults(calcul) {
        if (calcul.puissance_calculee) {
            document.getElementById('resultPuissanceChauffage').textContent = calcul.puissance_chauffage + ' kW';
            document.getElementById('resultPuissanceTotale').textContent = calcul.puissance_calculee + ' kW';
            document.getElementById('resultTemperature').textContent = calcul.temperature_fonctionnement + '°C';
            document.getElementById('resultCop').textContent = calcul.cop || '--';
            
            if (calcul.recommendations) {
                document.getElementById('recommendationsContainer').innerHTML = calcul.recommendations;
            }
        }
    },

    resetCalcul() {
        if (confirm('Réinitialiser tous les calculs ?')) {
            document.getElementById('resultPuissanceChauffage').textContent = '-- kW';
            document.getElementById('resultPuissanceTotale').textContent = '-- kW';
            document.getElementById('resultTemperature').textContent = '-- °C';
            document.getElementById('resultCop').textContent = '--';
            document.getElementById('recommendationsContainer').innerHTML = '';
            document.getElementById('calculCoeffG').value = '';
        }
    },

    async save() {
        const formData = this.collectFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            if (this.currentEdit) {
                await window.app.apiCall(`/calculs-pac-air-eau/${this.currentEdit.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                window.app.showMessage('Calcul PAC Air/Eau modifié avec succès', 'success');
            } else {
                await window.app.apiCall('/calculs-pac-air-eau', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                window.app.showMessage('Calcul PAC Air/Eau créé avec succès', 'success');
            }

            document.querySelector('.modal').remove();
            await this.load();
        } catch (error) {
            console.error('Error saving calcul PAC Air/Eau:', error);
            window.app.showMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
        }
    },

    collectFormData() {
        return {
            nom: document.getElementById('calculNom').value.trim(),
            client_nom: document.getElementById('calculClient').value,
            adresse: document.getElementById('calculAdresse').value.trim(),
            surface: parseFloat(document.getElementById('calculSurface').value) || 0,
            hauteur: parseFloat(document.getElementById('calculHauteur').value) || 2.5,
            annee_construction: parseInt(document.getElementById('calculAnnee').value) || null,
            isolation: document.getElementById('calculIsolation').value,
            region: document.getElementById('calculRegion').value,
            temperature_ext: parseFloat(document.getElementById('calculTempExt').value) || -7,
            temperature_int: parseFloat(document.getElementById('calculTempInt').value) || 20,
            type_radiateurs: document.getElementById('calculTypeRadiateurs').value,
            temperature_depart: parseFloat(document.getElementById('calculTempDepart').value) || 70,
            temperature_retour: parseFloat(document.getElementById('calculTempRetour').value) || 50,
            puissance_existante: parseFloat(document.getElementById('calculPuissanceExistante').value) || 0,
            nb_radiateurs: parseInt(document.getElementById('calculNbRadiateurs').value) || 0,
            observations_radiateurs: document.getElementById('calculObservationsRadiateurs').value.trim(),
            apports: parseFloat(document.getElementById('calculApports').value) || 300,
            coeff_g: parseFloat(document.getElementById('calculCoeffG').value) || 0,
            facteur_correction: parseFloat(document.getElementById('calculFacteurCorrection').value) || 1.1,
            ecs: document.getElementById('calculEcs').value,
            puissance_ecs: parseFloat(document.getElementById('calculPuissanceEcs').value) || 2,
            puissance_chauffage: document.getElementById('resultPuissanceChauffage').textContent.replace(' kW', ''),
            puissance_calculee: document.getElementById('resultPuissanceTotale').textContent.replace(' kW', ''),
            temperature_fonctionnement: document.getElementById('resultTemperature').textContent.replace('°C', ''),
            cop: document.getElementById('resultCop').textContent,
            recommendations: document.getElementById('recommendationsContainer').innerHTML,
            type_pac: 'air_eau',
            created_at: new Date().toISOString()
        };
    },

    validateFormData(formData) {
        if (!formData.nom) {
            window.app.showMessage('Le nom du projet est obligatoire', 'error');
            this.switchTab('general');
            document.getElementById('calculNom').focus();
            return false;
        }

        if (formData.surface <= 0) {
            window.app.showMessage('La surface doit être supérieure à 0', 'error');
            this.switchTab('logement');
            document.getElementById('calculSurface').focus();
            return false;
        }

        return true;
    },

    async delete(calculId, calculNom) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le calcul "${calculNom}" ?`)) {
            return;
        }

        try {
            await window.app.apiCall(`/calculs-pac-air-eau/${calculId}`, { method: 'DELETE' });
            window.app.showMessage('Calcul PAC Air/Eau supprimé avec succès', 'success');
            await this.load();
        } catch (error) {
            console.error('Error deleting calcul PAC Air/Eau:', error);
            window.app.showMessage('Erreur lors de la suppression: ' + error.message, 'error');
        }
    },

    viewResults(calculId) {
        const calcul = this.data.find(c => c.id === calculId);
        if (calcul) {
            this.showEditModal(calculId);
            setTimeout(() => this.switchTab('resultats'), 500);
        }
    },

    async exportList() {
        try {
            // Vérifier que jsPDF est chargé
            if (typeof window.jsPDF === 'undefined') {
                window.app.showMessage('Chargement de la bibliothèque PDF...', 'info');
                await this.loadJsPDF();
            }

            const jsPDF = window.jsPDF?.jsPDF || window.jsPDF;
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text('Calculs PAC Air/Eau', 20, 20);
            
            doc.setFontSize(10);
            doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
            
            if (this.data.length === 0) {
                doc.text('Aucun calcul PAC Air/Eau enregistré', 20, 50);
            } else {
                // Table data
                const tableData = this.data.map(calcul => [
                    calcul.nom,
                    calcul.client_nom || '-',
                    calcul.surface + ' m²' || '-',
                    calcul.puissance_calculee + ' kW' || '-',
                    window.app.formatDate(calcul.created_at)
                ]);
                
                doc.autoTable({
                    head: [['Nom', 'Client', 'Surface', 'Puissance', 'Date']],
                    body: tableData,
                    startY: 40,
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [255, 107, 53] }
                });
            }
            
            doc.save('calculs-pac-air-eau.pdf');
            window.app.showMessage('Export PDF généré avec succès', 'success');
            
        } catch (error) {
            console.error('Error exporting PAC Air/Eau:', error);
            window.app.showMessage('Erreur lors de l\'export PDF: ' + error.message, 'error');
        }
    },

    async loadJsPDF() {
        // Réutilise la fonction de documents.js
        if (window.documents && window.documents.loadJsPDF) {
            return await window.documents.loadJsPDF();
        }
        
        return new Promise((resolve, reject) => {
            if (typeof window.jsPDF !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Impossible de charger jsPDF'));
            document.head.appendChild(script);
        });
    },

    filter() {
        const searchTerm = document.getElementById('calculAirEauSearch')?.value.toLowerCase() || '';
        const filterType = document.getElementById('calculAirEauFilter')?.value || 'all';
        
        let filteredData = this.data;
        
        // Apply search filter
        if (searchTerm) {
            filteredData = filteredData.filter(calcul => 
                calcul.nom.toLowerCase().includes(searchTerm) ||
                (calcul.client_nom && calcul.client_nom.toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply type filter
        if (filterType !== 'all') {
            filteredData = filteredData.filter(calcul => {
                if (filterType === 'recent') {
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return new Date(calcul.created_at) > monthAgo;
                }
                return true;
            });
        }
        
        // Re-render with filtered data
        const originalData = this.data;
        this.data = filteredData;
        this.render();
        this.data = originalData;
    },

    async exportPDF(calculId) {
        const calcul = this.data.find(c => c.id === calculId);
        if (calcul && window.pdfExport) {
            try {
                await pdfExport.exportCalculPacAirEau(calcul);
                window.app.showMessage('PDF du calcul exporté avec succès', 'success');
            } catch (error) {
                console.error('Error exporting individual PDF:', error);
                window.app.showMessage('Erreur lors de l\'export PDF: ' + error.message, 'error');
            }
        }
    }
};