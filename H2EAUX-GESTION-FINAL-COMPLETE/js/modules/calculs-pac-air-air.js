// ===== CALCULS PAC AIR/AIR MODULE =====
window.calculsPacAirAir = {
    data: [],
    currentEdit: null,

    async load() {
        try {
            this.data = await app.apiCall('/calculs-pac-air-air');
            this.render();
        } catch (error) {
            console.error('Error loading calculs PAC Air/Air:', error);
            this.data = [];
            this.render();
        }
    },

    render() {
        const container = document.getElementById('calculsPacAirAirList');
        
        if (this.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❄️</div>
                    <h3>Aucun calcul PAC Air/Air</h3>
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
                        <span class="pac-type-badge air-air">Air/Air</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="calculsPacAirAir.showEditModal('${calcul.id}')">Modifier</button>
                        <button class="btn-view" onclick="calculsPacAirAir.viewResults('${calcul.id}')">Résultats</button>
                        <button class="btn-export" onclick="calculsPacAirAir.exportPDF('${calcul.id}')">Export PDF</button>
                        <button class="btn-delete" onclick="calculsPacAirAir.delete('${calcul.id}', '${calcul.nom}')">Supprimer</button>
                    </div>
                </div>
                <div class="item-info">
                    ${calcul.client_nom ? `<div class="item-detail">👤 ${calcul.client_nom}</div>` : ''}
                    ${calcul.surface ? `<div class="item-detail">📏 ${calcul.surface} m²</div>` : ''}
                    ${calcul.puissance_calculee ? `<div class="item-detail">❄️ ${calcul.puissance_calculee} kW</div>` : ''}
                    <div class="item-detail">📅 ${app.formatDate(calcul.created_at)}</div>
                </div>
            </div>
        `).join('');
    },

    showAddModal() {
        this.currentEdit = null;
        this.showCalculModal('Nouveau Calcul PAC Air/Air', null);
    },

    showEditModal(calculId) {
        this.currentEdit = this.data.find(c => c.id === calculId);
        if (this.currentEdit) {
            this.showCalculModal('Modifier Calcul PAC Air/Air', this.currentEdit);
        }
    },

    async showCalculModal(title, calcul = null) {
        // Load clients for dropdown
        let clientsOptions = '<option value="">Sélectionner un client</option>';
        try {
            const clients = await app.apiCall('/clients');
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
                        <button class="tab-btn active" onclick="calculsPacAirAir.switchTab('general')">📋 Général</button>
                        <button class="tab-btn" onclick="calculsPacAirAir.switchTab('logement')">🏠 Logement</button>
                        <button class="tab-btn" onclick="calculsPacAirAir.switchTab('menuiseries')">🪟 Menuiseries</button>
                        <button class="tab-btn" onclick="calculsPacAirAir.switchTab('unites')">❄️ Unités Intérieures</button>
                        <button class="tab-btn" onclick="calculsPacAirAir.switchTab('calculs')">⚡ Calculs</button>
                        <button class="tab-btn" onclick="calculsPacAirAir.switchTab('resultats')">📊 Résultats</button>
                    </div>
                    
                    <form id="calculPacAirAirForm">
                        <!-- ONGLET GÉNÉRAL -->
                        <div id="tab-general" class="tab-content active">
                            <div class="form-section">
                                <h4>📋 Informations Générales</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Nom du projet *</label>
                                        <input type="text" id="calculNom" required value="${calcul?.nom || ''}" placeholder="Ex: PAC Air/Air Dupont">
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
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Type d'installation</label>
                                        <select id="calculTypeInstallation">
                                            <option value="mono_split" ${calcul?.type_installation === 'mono_split' ? 'selected' : ''}>Mono-split (1 unité ext + 1 int)</option>
                                            <option value="multi_split" ${calcul?.type_installation === 'multi_split' ? 'selected' : ''}>Multi-split (1 unité ext + plusieurs int)</option>
                                            <option value="gainable" ${calcul?.type_installation === 'gainable' ? 'selected' : ''}>Gainable (conduits)</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Mode d'utilisation</label>
                                        <select id="calculModeUtilisation">
                                            <option value="chauffage_seul" ${calcul?.mode_utilisation === 'chauffage_seul' ? 'selected' : ''}>Chauffage seul</option>
                                            <option value="climatisation_seule" ${calcul?.mode_utilisation === 'climatisation_seule' ? 'selected' : ''}>Climatisation seule</option>
                                            <option value="reversible" ${calcul?.mode_utilisation === 'reversible' ? 'selected' : ''}>Réversible (chaud/froid)</option>
                                        </select>
                                    </div>
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
                                        <label>Type d'isolation *</label>
                                        <select id="calculIsolation">
                                            <option value="rt2012" ${calcul?.isolation === 'rt2012' ? 'selected' : ''}>RT2012/RE2020 - Excellente</option>
                                            <option value="rt2005" ${calcul?.isolation === 'rt2005' ? 'selected' : ''}>RT2005 - Très bonne</option>
                                            <option value="bonne" ${calcul?.isolation === 'bonne' ? 'selected' : ''}>Bonne isolation</option>
                                            <option value="moyenne" ${calcul?.isolation === 'moyenne' ? 'selected' : ''}>Isolation moyenne</option>
                                            <option value="ancienne" ${calcul?.isolation === 'ancienne' ? 'selected' : ''}>Ancienne (avant 1975)</option>
                                            <option value="faible" ${calcul?.isolation === 'faible' ? 'selected' : ''}>Faible isolation</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Orientation principale</label>
                                        <select id="calculOrientation">
                                            <option value="sud" ${calcul?.orientation === 'sud' ? 'selected' : ''}>Sud (optimal)</option>
                                            <option value="sud_est" ${calcul?.orientation === 'sud_est' ? 'selected' : ''}>Sud-Est</option>
                                            <option value="sud_ouest" ${calcul?.orientation === 'sud_ouest' ? 'selected' : ''}>Sud-Ouest</option>
                                            <option value="est" ${calcul?.orientation === 'est' ? 'selected' : ''}>Est</option>
                                            <option value="ouest" ${calcul?.orientation === 'ouest' ? 'selected' : ''}>Ouest</option>
                                            <option value="nord" ${calcul?.orientation === 'nord' ? 'selected' : ''}>Nord</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Région climatique</label>
                                        <select id="calculRegion">
                                            <option value="H1" ${calcul?.region === 'H1' ? 'selected' : ''}>H1 - Nord/Est (froid)</option>
                                            <option value="H2" ${calcul?.region === 'H2' ? 'selected' : ''}>H2 - Centre/Ouest (tempéré)</option>
                                            <option value="H3" ${calcul?.region === 'H3' ? 'selected' : ''}>H3 - Sud (chaud)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET MENUISERIES -->
                        <div id="tab-menuiseries" class="tab-content">
                            <div class="form-section">
                                <h4>🪟 Menuiseries et Étanchéité</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Type de menuiseries *</label>
                                        <select id="calculMenuiseries" onchange="calculsPacAirAir.updateMenuiseriesCoeff()">
                                            <option value="simple" ${calcul?.menuiseries === 'simple' ? 'selected' : ''}>Simple vitrage</option>
                                            <option value="double_std" ${calcul?.menuiseries === 'double_std' ? 'selected' : ''}>Double vitrage standard</option>
                                            <option value="double_perf" ${calcul?.menuiseries === 'double_perf' ? 'selected' : ''}>Double vitrage performant</option>
                                            <option value="triple" ${calcul?.menuiseries === 'triple' ? 'selected' : ''}>Triple vitrage</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Surface vitrée (m²)</label>
                                        <input type="number" id="calculSurfaceVitree" value="${calcul?.surface_vitree || ''}" min="0" step="0.1" placeholder="m²">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Coefficient Uw (W/m².K)</label>
                                        <input type="number" id="calculUw" value="${calcul?.uw || ''}" min="0.5" max="6" step="0.1" placeholder="Calculé auto" readonly>
                                    </div>
                                    <div class="form-group">
                                        <label>Étanchéité à l'air</label>
                                        <select id="calculEtancheite">
                                            <option value="excellente" ${calcul?.etancheite === 'excellente' ? 'selected' : ''}>Excellente (RT2012)</option>
                                            <option value="bonne" ${calcul?.etancheite === 'bonne' ? 'selected' : ''}>Bonne</option>
                                            <option value="moyenne" ${calcul?.etancheite === 'moyenne' ? 'selected' : ''}>Moyenne</option>
                                            <option value="faible" ${calcul?.etancheite === 'faible' ? 'selected' : ''}>Faible</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Exposition au vent</label>
                                        <select id="calculVent">
                                            <option value="faible" ${calcul?.exposition_vent === 'faible' ? 'selected' : ''}>Faible (centre ville)</option>
                                            <option value="moyenne" ${calcul?.exposition_vent === 'moyenne' ? 'selected' : ''}>Moyenne (périphérie)</option>
                                            <option value="forte" ${calcul?.exposition_vent === 'forte' ? 'selected' : ''}>Forte (campagne/côte)</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Présence de ponts thermiques</label>
                                        <select id="calculPontsThermiques">
                                            <option value="non" ${calcul?.ponts_thermiques === 'non' ? 'selected' : ''}>Non (RT2012)</option>
                                            <option value="peu" ${calcul?.ponts_thermiques === 'peu' ? 'selected' : ''}>Peu nombreux</option>
                                            <option value="nombreux" ${calcul?.ponts_thermiques === 'nombreux' ? 'selected' : ''}>Nombreux</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET UNITÉS INTÉRIEURES -->
                        <div id="tab-unites" class="tab-content">
                            <div class="form-section">
                                <h4>❄️ Configuration des Unités Intérieures</h4>
                                <div class="unites-container" id="unitesContainer">
                                    <!-- Unités générées dynamiquement -->
                                </div>
                                <div class="unites-actions">
                                    <button type="button" class="btn-secondary" onclick="calculsPacAirAir.addUniteInterieure()">➕ Ajouter une unité</button>
                                    <button type="button" class="btn-secondary" onclick="calculsPacAirAir.autoRepartition()">🎯 Répartition automatique</button>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET CALCULS -->
                        <div id="tab-calculs" class="tab-content">
                            <div class="form-section">
                                <h4>⚡ Paramètres de Calcul</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Température intérieure hiver (°C)</label>
                                        <input type="number" id="calculTempIntHiver" value="${calcul?.temperature_int_hiver || '20'}" min="18" max="25" step="0.5" placeholder="°C">
                                    </div>
                                    <div class="form-group">
                                        <label>Température intérieure été (°C)</label>
                                        <input type="number" id="calculTempIntEte" value="${calcul?.temperature_int_ete || '26'}" min="22" max="28" step="0.5" placeholder="°C">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Température extérieure hiver (°C)</label>
                                        <input type="number" id="calculTempExtHiver" value="${calcul?.temperature_ext_hiver || '-7'}" min="-15" max="5" step="1" placeholder="°C">
                                    </div>
                                    <div class="form-group">
                                        <label>Température extérieure été (°C)</label>
                                        <input type="number" id="calculTempExtEte" value="${calcul?.temperature_ext_ete || '35'}" min="25" max="45" step="1" placeholder="°C">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Apports internes (W)</label>
                                        <input type="number" id="calculApports" value="${calcul?.apports || '5'}" min="0" max="15" step="1" placeholder="W/m²">
                                    </div>
                                    <div class="form-group">
                                        <label>Facteur de simultanéité</label>
                                        <input type="number" id="calculSimultaneite" value="${calcul?.simultaneite || '0.8'}" min="0.5" max="1" step="0.1" placeholder="0.8">
                                    </div>
                                </div>
                                <div class="calc-actions">
                                    <button type="button" class="btn-primary" onclick="calculsPacAirAir.calculatePower()">🔄 Calculer les Puissances</button>
                                    <button type="button" class="btn-secondary" onclick="calculsPacAirAir.resetCalcul()">🧹 Réinitialiser</button>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET RÉSULTATS -->
                        <div id="tab-resultats" class="tab-content">
                            <div class="form-section">
                                <h4>📊 Résultats du Dimensionnement</h4>
                                <div class="results-grid">
                                    <div class="result-card">
                                        <div class="result-label">Puissance chauffage</div>
                                        <div class="result-value" id="resultPuissanceChauffage">-- kW</div>
                                    </div>
                                    <div class="result-card">
                                        <div class="result-label">Puissance climatisation</div>
                                        <div class="result-value" id="resultPuissanceClim">-- kW</div>
                                    </div>
                                    <div class="result-card">
                                        <div class="result-label">SCOP (chauffage)</div>
                                        <div class="result-value" id="resultScop">--</div>
                                    </div>
                                    <div class="result-card">
                                        <div class="result-label">SEER (climatisation)</div>
                                        <div class="result-value" id="resultSeer">--</div>
                                    </div>
                                </div>
                                <div class="unites-results" id="unitesResults">
                                    <!-- Résultats par unité -->
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
                    <button class="btn-primary" onclick="calculsPacAirAir.save()">💾 Enregistrer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Initialize units
        setTimeout(() => {
            this.initializeUnites(calcul);
        }, 100);
        
        // Initialize calculations if editing
        if (calcul) {
            setTimeout(() => {
                this.loadCalculationResults(calcul);
            }, 200);
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
        document.querySelector(`[onclick="calculsPacAirAir.switchTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    },

    updateMenuiseriesCoeff() {
        const type = document.getElementById('calculMenuiseries').value;
        const uwField = document.getElementById('calculUw');
        
        const coefficients = {
            'simple': 5.8,
            'double_std': 2.8,
            'double_perf': 1.4,
            'triple': 0.8
        };
        
        uwField.value = coefficients[type] || 2.8;
    },

    initializeUnites(calcul) {
        const container = document.getElementById('unitesContainer');
        const typeInstallation = document.getElementById('calculTypeInstallation').value;

        if (calcul && calcul.unites_interieures) {
            // Load existing units
            const unites = JSON.parse(calcul.unites_interieures);
            unites.forEach((unite, index) => {
                this.addUniteInterieure(unite, index);
            });
        } else {
            // Add default unit
            this.addUniteInterieure();
        }
    },

    addUniteInterieure(unite = null, index = null) {
        const container = document.getElementById('unitesContainer');
        const unitIndex = index !== null ? index : container.children.length;

        const uniteDiv = document.createElement('div');
        uniteDiv.className = 'unite-interieure';
        uniteDiv.innerHTML = `
            <div class="unite-header">
                <h5>🏠 Unité ${unitIndex + 1}</h5>
                <button type="button" class="btn-delete-small" onclick="this.closest('.unite-interieure').remove()">🗑️</button>
            </div>
            <div class="forme-row">
                <div class="form-group">
                    <label>Pièce</label>
                    <input type="text" class="unite-piece" value="${unite?.piece || ''}" placeholder="Ex: Salon">
                </div>
                <div class="form-group">
                    <label>Surface (m²)</label>
                    <input type="number" class="unite-surface" value="${unite?.surface || ''}" min="5" step="0.1" placeholder="m²">
                </div>
                <div class="form-group">
                    <label>Type d'unité</label>
                    <select class="unite-type">
                        <option value="murale" ${unite?.type === 'murale' ? 'selected' : ''}>Murale</option>
                        <option value="console" ${unite?.type === 'console' ? 'selected' : ''}>Console</option>
                        <option value="cassette" ${unite?.type === 'cassette' ? 'selected' : ''}>Cassette</option>
                        <option value="gainable" ${unite?.type === 'gainable' ? 'selected' : ''}>Gainable</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Puissance (kW)</label>
                    <input type="number" class="unite-puissance" value="${unite?.puissance || ''}" min="1" max="10" step="0.1" placeholder="Auto" readonly>
                </div>
            </div>
        `;

        container.appendChild(uniteDiv);
    },

    autoRepartition() {
        const surface = parseFloat(document.getElementById('calculSurface').value) || 0;
        const unites = document.querySelectorAll('.unite-interieure');
        
        if (surface <= 0) {
            app.showMessage('Veuillez d\'abord saisir la surface totale', 'error');
            return;
        }

        if (unites.length === 0) {
            app.showMessage('Ajoutez au moins une unité intérieure', 'error');
            return;
        }

        // Répartir la surface équitablement
        const surfaceParUnite = surface / unites.length;
        
        unites.forEach((unite, index) => {
            const surfaceInput = unite.querySelector('.unite-surface');
            const pieceInput = unite.querySelector('.unite-piece');
            
            surfaceInput.value = surfaceParUnite.toFixed(1);
            
            if (!pieceInput.value) {
                const pieces = ['Salon', 'Chambre 1', 'Chambre 2', 'Chambre 3', 'Bureau', 'Cuisine'];
                pieceInput.value = pieces[index] || `Pièce ${index + 1}`;
            }
        });

        app.showMessage('Répartition automatique effectuée', 'success');
    },

    calculatePower() {
        const surface = parseFloat(document.getElementById('calculSurface').value) || 0;
        const hauteur = parseFloat(document.getElementById('calculHauteur').value) || 2.5;
        const isolation = document.getElementById('calculIsolation').value;
        const menuiseries = document.getElementById('calculMenuiseries').value;
        const tempIntHiver = parseFloat(document.getElementById('calculTempIntHiver').value) || 20;
        const tempExtHiver = parseFloat(document.getElementById('calculTempExtHiver').value) || -7;
        const tempIntEte = parseFloat(document.getElementById('calculTempIntEte').value) || 26;
        const tempExtEte = parseFloat(document.getElementById('calculTempExtEte').value) || 35;
        const apports = parseFloat(document.getElementById('calculApports').value) || 5;
        const simultaneite = parseFloat(document.getElementById('calculSimultaneite').value) || 0.8;

        if (surface <= 0) {
            app.showMessage('Veuillez saisir une surface valide', 'error');
            return;
        }

        // Coefficients selon isolation et menuiseries
        const coeffIsolation = {
            'rt2012': 30, 'rt2005': 40, 'bonne': 50, 'moyenne': 70, 'ancienne': 90, 'faible': 120
        };

        const coeffMenuiseries = {
            'simple': 1.4, 'double_std': 1.2, 'double_perf': 1.0, 'triple': 0.8
        };

        // Calcul puissance chauffage (W/m²)
        const coeffBase = coeffIsolation[isolation] || 70;
        const coeffMenu = coeffMenuiseries[menuiseries] || 1.2;
        const deltaTHiver = tempIntHiver - tempExtHiver;
        
        const puissanceChauffageM2 = (coeffBase * coeffMenu * deltaTHiver) / 25; // Base 25°C de ΔT
        const puissanceChauffageTotal = (puissanceChauffageM2 * surface) / 1000; // kW

        // Calcul puissance climatisation
        const deltaTEte = tempExtEte - tempIntEte;
        const apportsTotal = apports * surface;
        const puissanceClimTotal = ((surface * 60) + apportsTotal) / 1000; // kW

        // Calcul SCOP et SEER
        const scop = this.calculateSCOP(tempExtHiver);
        const seer = this.calculateSEER(tempExtEte);

        // Update results
        document.getElementById('resultPuissanceChauffage').textContent = puissanceChauffageTotal.toFixed(1) + ' kW';
        document.getElementById('resultPuissanceClim').textContent = puissanceClimTotal.toFixed(1) + ' kW';
        document.getElementById('resultScop').textContent = scop.toFixed(2);
        document.getElementById('resultSeer').textContent = seer.toFixed(2);

        // Calculate individual units
        this.calculateUnitesPuissances(puissanceChauffageTotal, puissanceClimTotal);

        // Generate recommendations
        this.generateRecommendations(puissanceChauffageTotal, puissanceClimTotal, scop, seer, isolation);

        // Switch to results tab
        this.switchTab('resultats');
    },

    calculateSCOP(tempExt) {
        // SCOP calculation based on external temperature
        const scopBase = 4.5 - (Math.abs(tempExt) * 0.05);
        return Math.max(2.5, Math.min(5.5, scopBase));
    },

    calculateSEER(tempExt) {
        // SEER calculation  
        const seerBase = 6.0 - ((tempExt - 30) * 0.1);
        return Math.max(4.0, Math.min(8.0, seerBase));
    },

    calculateUnitesPuissances(puissanceChauffage, puissanceClim) {
        const unites = document.querySelectorAll('.unite-interieure');
        const container = document.getElementById('unitesResults');
        
        let resultsHTML = '<h5>📊 Puissances par Unité</h5><div class="unites-results-grid">';

        unites.forEach((unite, index) => {
            const surface = parseFloat(unite.querySelector('.unite-surface').value) || 0;
            const piece = unite.querySelector('.unite-piece').value || `Pièce ${index + 1}`;
            const type = unite.querySelector('.unite-type').value;
            
            const surfaceTotale = parseFloat(document.getElementById('calculSurface').value) || 1;
            const ratioSurface = surface / surfaceTotale;
            
            const puissanceChauffageUnite = puissanceChauffage * ratioSurface;
            const puissanceClimUnite = puissanceClim * ratioSurface;
            
            // Update unite puissance field
            unite.querySelector('.unite-puissance').value = Math.max(puissanceChauffageUnite, puissanceClimUnite).toFixed(1);
            
            resultsHTML += `
                <div class="unite-result-card">
                    <div class="unite-result-header">${piece} (${type})</div>
                    <div class="unite-result-details">
                        <div>Surface: ${surface} m²</div>
                        <div>Chauffage: ${puissanceChauffageUnite.toFixed(1)} kW</div>
                        <div>Clim: ${puissanceClimUnite.toFixed(1)} kW</div>
                    </div>
                </div>
            `;
        });

        resultsHTML += '</div>';
        container.innerHTML = resultsHTML;
    },

    generateRecommendations(puissanceChauffage, puissanceClim, scop, seer, isolation) {
        const container = document.getElementById('recommendationsContainer');
        let recommendations = '<h5>💡 Recommandations</h5><div class="recommendations-list">';

        // Power recommendation
        recommendations += `<div class="recommendation">
            <strong>Puissance unité extérieure recommandée :</strong><br>
            Chauffage: ${Math.ceil(puissanceChauffage)} kW | Climatisation: ${Math.ceil(puissanceClim)} kW
        </div>`;

        // Efficiency recommendations
        if (scop > 4.0) {
            recommendations += `<div class="recommendation success">
                <strong>✅ Excellent SCOP :</strong> Performance énergétique optimale en chauffage (${scop.toFixed(2)}).
            </div>`;
        } else {
            recommendations += `<div class="recommendation warning">
                <strong>⚠️ SCOP moyen :</strong> Conditions difficiles, prévoir PAC haute performance.
            </div>`;
        }

        if (seer > 6.0) {
            recommendations += `<div class="recommendation success">
                <strong>✅ Excellent SEER :</strong> Performance énergétique optimale en climatisation (${seer.toFixed(2)}).
            </div>`;
        }

        // Isolation recommendation
        if (isolation === 'faible' || isolation === 'ancienne') {
            recommendations += `<div class="recommendation warning">
                <strong>💡 Amélioration recommandée :</strong> L'isolation actuelle nécessite une PAC surdimensionnée. 
                Envisager des travaux d'isolation pour optimiser l'installation.
            </div>`;
        }

        // Installation type recommendation
        const typeInstallation = document.getElementById('calculTypeInstallation').value;
        if (typeInstallation === 'multi_split') {
            recommendations += `<div class="recommendation info">
                <strong>ℹ️ Multi-split :</strong> Vérifier la simultanéité d'usage. Facteur appliqué: ${document.getElementById('calculSimultaneite').value}.
            </div>`;
        }

        recommendations += '</div>';
        container.innerHTML = recommendations;
    },

    loadCalculationResults(calcul) {
        if (calcul.puissance_chauffage) {
            document.getElementById('resultPuissanceChauffage').textContent = calcul.puissance_chauffage + ' kW';
        }
        if (calcul.puissance_climatisation) {
            document.getElementById('resultPuissanceClim').textContent = calcul.puissance_climatisation + ' kW';
        }
        if (calcul.scop) {
            document.getElementById('resultScop').textContent = calcul.scop;
        }
        if (calcul.seer) {
            document.getElementById('resultSeer').textContent = calcul.seer;
        }
        if (calcul.recommendations) {
            document.getElementById('recommendationsContainer').innerHTML = calcul.recommendations;
        }
    },

    resetCalcul() {
        if (confirm('Réinitialiser tous les calculs ?')) {
            document.getElementById('resultPuissanceChauffage').textContent = '-- kW';
            document.getElementById('resultPuissanceClim').textContent = '-- kW';
            document.getElementById('resultScop').textContent = '--';
            document.getElementById('resultSeer').textContent = '--';
            document.getElementById('unitesResults').innerHTML = '';
            document.getElementById('recommendationsContainer').innerHTML = '';
            
            // Reset unit powers
            document.querySelectorAll('.unite-puissance').forEach(input => {
                input.value = '';
            });
        }
    },

    collectUnitesData() {
        const unites = [];
        document.querySelectorAll('.unite-interieure').forEach(unite => {
            unites.push({
                piece: unite.querySelector('.unite-piece').value,
                surface: parseFloat(unite.querySelector('.unite-surface').value) || 0,
                type: unite.querySelector('.unite-type').value,
                puissance: parseFloat(unite.querySelector('.unite-puissance').value) || 0
            });
        });
        return unites;
    },

    async save() {
        const formData = this.collectFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            if (this.currentEdit) {
                await app.apiCall(`/calculs-pac-air-air/${this.currentEdit.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                app.showMessage('Calcul PAC Air/Air modifié avec succès', 'success');
            } else {
                await app.apiCall('/calculs-pac-air-air', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                app.showMessage('Calcul PAC Air/Air créé avec succès', 'success');
            }

            document.querySelector('.modal').remove();
            await this.load();
        } catch (error) {
            console.error('Error saving calcul PAC Air/Air:', error);
            app.showMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
        }
    },

    collectFormData() {
        const unites = this.collectUnitesData();
        
        return {
            nom: document.getElementById('calculNom').value.trim(),
            client_nom: document.getElementById('calculClient').value,
            adresse: document.getElementById('calculAdresse').value.trim(),
            type_installation: document.getElementById('calculTypeInstallation').value,
            mode_utilisation: document.getElementById('calculModeUtilisation').value,
            surface: parseFloat(document.getElementById('calculSurface').value) || 0,
            hauteur: parseFloat(document.getElementById('calculHauteur').value) || 2.5,
            annee_construction: parseInt(document.getElementById('calculAnnee').value) || null,
            isolation: document.getElementById('calculIsolation').value,
            orientation: document.getElementById('calculOrientation').value,
            region: document.getElementById('calculRegion').value,
            menuiseries: document.getElementById('calculMenuiseries').value,
            surface_vitree: parseFloat(document.getElementById('calculSurfaceVitree').value) || 0,
            uw: parseFloat(document.getElementById('calculUw').value) || 0,
            etancheite: document.getElementById('calculEtancheite').value,
            exposition_vent: document.getElementById('calculVent').value,
            ponts_thermiques: document.getElementById('calculPontsThermiques').value,
            temperature_int_hiver: parseFloat(document.getElementById('calculTempIntHiver').value) || 20,
            temperature_int_ete: parseFloat(document.getElementById('calculTempIntEte').value) || 26,
            temperature_ext_hiver: parseFloat(document.getElementById('calculTempExtHiver').value) || -7,
            temperature_ext_ete: parseFloat(document.getElementById('calculTempExtEte').value) || 35,
            apports: parseFloat(document.getElementById('calculApports').value) || 5,
            simultaneite: parseFloat(document.getElementById('calculSimultaneite').value) || 0.8,
            puissance_chauffage: document.getElementById('resultPuissanceChauffage').textContent.replace(' kW', ''),
            puissance_climatisation: document.getElementById('resultPuissanceClim').textContent.replace(' kW', ''),
            puissance_calculee: Math.max(
                parseFloat(document.getElementById('resultPuissanceChauffage').textContent.replace(' kW', '')) || 0,
                parseFloat(document.getElementById('resultPuissanceClim').textContent.replace(' kW', '')) || 0
            ),
            scop: document.getElementById('resultScop').textContent,
            seer: document.getElementById('resultSeer').textContent,
            unites_interieures: JSON.stringify(unites),
            recommendations: document.getElementById('recommendationsContainer').innerHTML,
            type_pac: 'air_air',
            created_at: new Date().toISOString()
        };
    },

    validateFormData(formData) {
        if (!formData.nom) {
            app.showMessage('Le nom du projet est obligatoire', 'error');
            this.switchTab('general');
            document.getElementById('calculNom').focus();
            return false;
        }

        if (formData.surface <= 0) {
            app.showMessage('La surface doit être supérieure à 0', 'error');
            this.switchTab('logement');
            document.getElementById('calculSurface').focus();
            return false;
        }

        const unites = JSON.parse(formData.unites_interieures);
        if (unites.length === 0) {
            app.showMessage('Ajoutez au moins une unité intérieure', 'error');
            this.switchTab('unites');
            return false;
        }

        return true;
    },

    async delete(calculId, calculNom) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le calcul "${calculNom}" ?`)) {
            return;
        }

        try {
            await app.apiCall(`/calculs-pac-air-air/${calculId}`, { method: 'DELETE' });
            app.showMessage('Calcul PAC Air/Air supprimé avec succès', 'success');
            await this.load();
        } catch (error) {
            console.error('Error deleting calcul PAC Air/Air:', error);
            app.showMessage('Erreur lors de la suppression: ' + error.message, 'error');
        }
    },

    viewResults(calculId) {
        const calcul = this.data.find(c => c.id === calculId);
        if (calcul) {
            this.showEditModal(calculId);
            setTimeout(() => this.switchTab('resultats'), 500);
        }
    },

    async exportPDF(calculId) {
        const calcul = this.data.find(c => c.id === calculId);
        if (calcul && window.pdfExport) {
            await pdfExport.exportCalculPacAirAir(calcul);
        }
    }
};