// ===== CALCULS PAC MODULE AVANCÉ =====
window.calculsPac = {
    data: [],
    currentEdit: null,
    pieces: [],
    coefficientsG: {
        'rt2012': { 'H1': 0.7, 'H2': 0.6, 'H3': 0.5 },
        'bonne': { 'H1': 0.9, 'H2': 0.8, 'H3': 0.7 },
        'moyenne': { 'H1': 1.1, 'H2': 1.0, 'H3': 0.9 },
        'ancienne': { 'H1': 1.4, 'H2': 1.3, 'H3': 1.2 },
        'faible': { 'H1': 1.8, 'H2': 1.7, 'H3': 1.6 }
    },
    ratiosEmetteurs: {
        'plancher_chauffant': 1.0,
        'radiateurs_bt': 1.1,
        'radiateurs_ht': 1.2,
        'ventilo_convecteurs': 1.05
    },

    async load() {
        try {
            this.data = await app.apiCall('/calculs-pac');
            this.render();
        } catch (error) {
            console.error('Error loading calculs PAC:', error);
            app.showMessage('Erreur lors du chargement des calculs PAC', 'error');
            this.data = [];
            this.render();
        }
    },

    render() {
        const container = document.getElementById('calculsList');
        
        if (this.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🌡️</div>
                    <h3>Aucun calcul PAC</h3>
                    <p>Cliquez sur un type de PAC ci-dessus pour commencer un dimensionnement</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.map(calcul => `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">
                        ${calcul.nom}
                        <span class="pac-type-badge ${calcul.type_pac}">${calcul.type_pac === 'air_eau' ? '🌡️ Air/Eau' : '❄️ Air/Air'}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="calculsPac.showEditModal('${calcul.id}')">Modifier</button>
                        <button class="btn-view" onclick="calculsPac.viewDetails('${calcul.id}')">Détails</button>
                        <button class="btn-delete" onclick="calculsPac.delete('${calcul.id}', '${calcul.nom}')">Supprimer</button>
                    </div>
                </div>
                <div class="item-info">
                    ${calcul.client_nom ? `<div class="item-detail">👤 ${calcul.client_nom}</div>` : ''}
                    <div class="item-detail">🌍 Zone ${calcul.zone_climatique || 'H2'}</div>
                    <div class="item-detail">📐 ${calcul.surface_totale || 0} m²</div>
                    <div class="item-detail">⚡ ${calcul.puissance_totale_calculee || calcul.puissance_calculee || 0} kW</div>
                    ${calcul.pieces && calcul.pieces.length ? `<div class="item-detail">🏠 ${calcul.pieces.length} pièce(s)</div>` : ''}
                    <div class="item-detail">📅 ${app.formatDate(calcul.created_at)}</div>
                </div>
            </div>
        `).join('');
    },

    showAddModal(type) {
        this.currentEdit = null;
        this.pieces = [];
        const typeLabel = type === 'air_eau' ? 'Air/Eau' : 'Air/Air';
        this.showAdvancedModal(`Nouveau Calcul PAC ${typeLabel}`, null, type);
    },

    showEditModal(calculId) {
        this.currentEdit = this.data.find(c => c.id === calculId);
        if (this.currentEdit) {
            this.pieces = this.currentEdit.pieces || [];
            const typeLabel = this.currentEdit.type_pac === 'air_eau' ? 'Air/Eau' : 'Air/Air';
            this.showAdvancedModal(`Modifier Calcul PAC ${typeLabel}`, this.currentEdit, this.currentEdit.type_pac);
        }
    },

    async showAdvancedModal(title, calcul = null, type = 'air_eau') {
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
        modal.className = 'modal modal-large';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="pac-tabs">
                        <button class="tab-btn active" onclick="calculsPac.switchTab('general')">📋 Informations Générales</button>
                        <button class="tab-btn" onclick="calculsPac.switchTab('pieces')">🏠 Pièces & Calculs</button>
                        <button class="tab-btn" onclick="calculsPac.switchTab('resultats')">📊 Résultats</button>
                    </div>
                    
                    <form id="calculForm">
                        <input type="hidden" id="calculType" value="${type}">
                        
                        <!-- ONGLET GÉNÉRAL -->
                        <div id="tab-general" class="tab-content active">
                            <div class="form-section">
                                <h4>🏢 Informations Projet</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Nom du projet *</label>
                                        <input type="text" id="calculNom" required value="${calcul?.nom || ''}" placeholder="Ex: Maison Dupont - PAC Air/Eau">
                                    </div>
                                    <div class="form-group">
                                        <label>Client</label>
                                        <select id="calculClient">${clientsOptions}</select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Adresse du bâtiment</label>
                                        <input type="text" id="calculAdresse" value="${calcul?.adresse || ''}" placeholder="Adresse complète">
                                    </div>
                                    <div class="form-group">
                                        <label>Type de bâtiment</label>
                                        <select id="calculBatiment">
                                            <option value="maison_individuelle" ${calcul?.batiment === 'maison_individuelle' ? 'selected' : ''}>Maison individuelle</option>
                                            <option value="appartement" ${calcul?.batiment === 'appartement' ? 'selected' : ''}>Appartement</option>
                                            <option value="bureau" ${calcul?.batiment === 'bureau' ? 'selected' : ''}>Bureau</option>
                                            <option value="commerce" ${calcul?.batiment === 'commerce' ? 'selected' : ''}>Commerce</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4>🌍 Caractéristiques Environnementales</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Zone climatique *</label>
                                        <select id="calculZone">
                                            <option value="H1" ${calcul?.zone_climatique === 'H1' ? 'selected' : ''}>H1 - Zone froide (>800m altitude ou Nord)</option>
                                            <option value="H2" ${calcul?.zone_climatique === 'H2' ? 'selected' : ''}>H2 - Zone tempérée (Centre France)</option>
                                            <option value="H3" ${calcul?.zone_climatique === 'H3' ? 'selected' : ''}>H3 - Zone chaude (Sud, littoral)</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Altitude (m)</label>
                                        <input type="number" id="calculAltitude" value="${calcul?.altitude || '200'}" min="0" max="2000" step="10">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Surface totale à chauffer (m²) *</label>
                                        <input type="number" id="calculSurface" required min="10" step="0.1" value="${calcul?.surface_totale || ''}" placeholder="Surface habitable">
                                    </div>
                                    <div class="form-group">
                                        <label>Type d'isolation *</label>
                                        <select id="calculIsolation">
                                            <option value="rt2012" ${calcul?.isolation === 'rt2012' ? 'selected' : ''}>RT2012 / RE2020 (Neuf)</option>
                                            <option value="bonne" ${calcul?.isolation === 'bonne' ? 'selected' : ''}>Bonne isolation (après 2000)</option>
                                            <option value="moyenne" ${calcul?.isolation === 'moyenne' ? 'selected' : ''}>Isolation moyenne (1980-2000)</option>
                                            <option value="ancienne" ${calcul?.isolation === 'ancienne' ? 'selected' : ''}>Ancienne isolation (1950-1980)</option>
                                            <option value="faible" ${calcul?.isolation === 'faible' ? 'selected' : ''}>Faible isolation (avant 1950)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Année de construction</label>
                                        <input type="number" id="calculAnnee" value="${calcul?.annee_construction || ''}" min="1900" max="2025" placeholder="AAAA">
                                    </div>
                                    <div class="form-group">
                                        <label>DPE (Diagnostic Performance Énergétique)</label>
                                        <select id="calculDPE">
                                            <option value="" ${!calcul?.dpe ? 'selected' : ''}>Non connu</option>
                                            <option value="A" ${calcul?.dpe === 'A' ? 'selected' : ''}>A - Très performant (≤50 kWh/m²/an)</option>
                                            <option value="B" ${calcul?.dpe === 'B' ? 'selected' : ''}>B - Performant (51-90 kWh/m²/an)</option>
                                            <option value="C" ${calcul?.dpe === 'C' ? 'selected' : ''}>C - Assez performant (91-150 kWh/m²/an)</option>
                                            <option value="D" ${calcul?.dpe === 'D' ? 'selected' : ''}>D - Peu performant (151-230 kWh/m²/an)</option>
                                            <option value="E" ${calcul?.dpe === 'E' ? 'selected' : ''}>E - Consommateur (231-330 kWh/m²/an)</option>
                                            <option value="F" ${calcul?.dpe === 'F' ? 'selected' : ''}>F - Énergivore (331-450 kWh/m²/an)</option>
                                            <option value="G" ${calcul?.dpe === 'G' ? 'selected' : ''}>G - Très énergivore (>450 kWh/m²/an)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4>🌡️ Paramètres Thermiques</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Température extérieure de base (°C)</label>
                                        <input type="number" id="calculTempExt" value="${calcul?.temperature_exterieure_base || '-7'}" min="-15" max="5" step="0.5">
                                        <small>Température extérieure de dimensionnement selon zone</small>
                                    </div>
                                    <div class="form-group">
                                        <label>Température intérieure souhaitée (°C)</label>
                                        <input type="number" id="calculTempInt" value="${calcul?.temperature_interieure_souhaitee || '20'}" min="18" max="24" step="0.5">
                                    </div>
                                </div>
                                
                                ${type === 'air_eau' ? `
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Type d'émetteurs *</label>
                                        <select id="calculEmetteur">
                                            <option value="plancher_chauffant" ${calcul?.type_emetteur === 'plancher_chauffant' ? 'selected' : ''}>Plancher chauffant (35°C)</option>
                                            <option value="radiateurs_bt" ${calcul?.type_emetteur === 'radiateurs_bt' ? 'selected' : ''}>Radiateurs basse température (45°C)</option>
                                            <option value="radiateurs_ht" ${calcul?.type_emetteur === 'radiateurs_ht' ? 'selected' : ''}>Radiateurs haute température (65°C)</option>
                                            <option value="ventilo_convecteurs" ${calcul?.type_emetteur === 'ventilo_convecteurs' ? 'selected' : ''}>Ventilo-convecteurs</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Production ECS</label>
                                        <div class="checkbox-group">
                                            <label class="checkbox-label">
                                                <input type="checkbox" id="calculECS" ${calcul?.production_ecs ? 'checked' : ''}>
                                                Inclure la production d'eau chaude sanitaire
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row ecs-config" ${calcul?.production_ecs ? '' : 'style="display:none"'}>
                                    <div class="form-group">
                                        <label>Volume ballon ECS (L)</label>
                                        <select id="calculVolumeECS">
                                            <option value="200" ${calcul?.volume_ballon_ecs === '200' ? 'selected' : ''}>200L (2-3 personnes)</option>
                                            <option value="250" ${calcul?.volume_ballon_ecs === '250' ? 'selected' : ''}>250L (3-4 personnes)</option>
                                            <option value="300" ${calcul?.volume_ballon_ecs === '300' ? 'selected' : ''}>300L (4-5 personnes)</option>
                                            <option value="500" ${calcul?.volume_ballon_ecs === '500' ? 'selected' : ''}>500L (5+ personnes)</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>COP estimé ECS</label>
                                        <input type="number" id="calculCOPECS" value="${calcul?.cop_estime || '3.0'}" min="2.0" max="5.0" step="0.1">
                                    </div>
                                </div>
                                ` : `
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Type d'installation *</label>
                                        <select id="calculInstallation">
                                            <option value="mono_split" ${calcul?.type_installation === 'mono_split' ? 'selected' : ''}>Mono-split (1 unité extérieure + 1 intérieure)</option>
                                            <option value="multi_split" ${calcul?.type_installation === 'multi_split' ? 'selected' : ''}>Multi-split (1 unité extérieure + plusieurs intérieures)</option>
                                            <option value="gainable" ${calcul?.type_installation === 'gainable' ? 'selected' : ''}>Gainable (distribution par conduits)</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>SCOP estimé (froid)</label>
                                        <input type="number" id="calculSCOP" value="${calcul?.scop_estime || '4.0'}" min="3.0" max="7.0" step="0.1">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>SEER estimé (chaud)</label>
                                        <input type="number" id="calculSEER" value="${calcul?.seer_estime || '5.0'}" min="4.0" max="8.0" step="0.1">
                                    </div>
                                </div>
                                `}
                            </div>
                        </div>

                        <!-- ONGLET PIÈCES -->
                        <div id="tab-pieces" class="tab-content">
                            <div class="pieces-header">
                                <h4>🏠 Gestion Pièce par Pièce</h4>
                                <button type="button" class="btn-primary" onclick="calculsPac.addPiece()">+ Ajouter une pièce</button>
                            </div>
                            <div id="piecesContainer">
                                <!-- Les pièces seront ajoutées ici dynamiquement -->
                            </div>
                        </div>

                        <!-- ONGLET RÉSULTATS -->
                        <div id="tab-resultats" class="tab-content">
                            <div id="resultsContainer">
                                <h4>📊 Résultats des Calculs</h4>
                                <div class="results-summary">
                                    <div class="result-card">
                                        <div class="result-label">Puissance totale calculée</div>
                                        <div class="result-value" id="resultPuissanceTotal">- kW</div>
                                    </div>
                                    <div class="result-card">
                                        <div class="result-label">Surface totale</div>
                                        <div class="result-value" id="resultSurfaceTotal">- m²</div>
                                    </div>
                                    <div class="result-card">
                                        <div class="result-label">Ratio W/m²</div>
                                        <div class="result-value" id="resultRatio">- W/m²</div>
                                    </div>
                                </div>
                                <div id="resultsPiecesDetail">
                                    <!-- Détail par pièce sera affiché ici -->
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn-secondary" onclick="calculsPac.calculateAll()">🧮 Recalculer</button>
                    <button class="btn-primary" onclick="calculsPac.save()">💾 Enregistrer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Initialiser les pièces
        if (calcul && calcul.pieces) {
            this.pieces = [...calcul.pieces];
        } else {
            this.pieces = [];
            this.addPiece(); // Ajouter une pièce par défaut
        }
        
        this.renderPieces();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial calculation
        setTimeout(() => this.calculateAll(), 100);
        
        // Focus first input
        setTimeout(() => {
            modal.querySelector('#calculNom').focus();
        }, 100);

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    setupEventListeners() {
        // ECS toggle
        const ecsCheckbox = document.getElementById('calculECS');
        if (ecsCheckbox) {
            ecsCheckbox.addEventListener('change', (e) => {
                const ecsConfig = document.querySelector('.ecs-config');
                if (ecsConfig) {
                    ecsConfig.style.display = e.target.checked ? 'flex' : 'none';
                }
            });
        }

        // Auto-calculation triggers
        const autoCalcIds = ['calculSurface', 'calculZone', 'calculIsolation', 'calculTempExt', 'calculTempInt', 'calculEmetteur'];
        autoCalcIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    setTimeout(() => this.calculateAll(), 100);
                });
            }
        });
    },

    switchTab(tabName) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[onclick="calculsPac.switchTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        if (tabName === 'resultats') {
            this.calculateAll();
        }
    },

    addPiece() {
        const newPiece = {
            id: Date.now().toString(),
            nom: '',
            type: 'salon',
            longueur: '',
            largeur: '',
            hauteur: '2.5',
            surface: '',
            volume: '',
            temperature_souhaitee: '20',
            delta_t: '',
            coefficient_g: '',
            ratio_norme_energetique: '1.0',
            puissance_calculee: '',
            type_unite_interieure: 'murale',
            radiateurs_existants: '',
            commentaires: ''
        };
        
        this.pieces.push(newPiece);
        this.renderPieces();
    },

    removePiece(pieceId) {
        this.pieces = this.pieces.filter(p => p.id !== pieceId);
        this.renderPieces();
        this.calculateAll();
    },

    renderPieces() {
        const container = document.getElementById('piecesContainer');
        if (!container) return;

        if (this.pieces.length === 0) {
            container.innerHTML = `
                <div class="empty-pieces">
                    <p>Aucune pièce ajoutée. Cliquez sur "Ajouter une pièce" pour commencer.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.pieces.map((piece, index) => `
            <div class="piece-card" data-piece-id="${piece.id}">
                <div class="piece-header">
                    <h5>🏠 Pièce ${index + 1}</h5>
                    <button type="button" class="btn-delete-small" onclick="calculsPac.removePiece('${piece.id}')" title="Supprimer cette pièce">🗑️</button>
                </div>
                
                <div class="piece-content">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nom de la pièce</label>
                            <input type="text" id="piece_${piece.id}_nom" value="${piece.nom}" placeholder="Ex: Salon, Chambre parentale..." onchange="calculsPac.updatePieceField('${piece.id}', 'nom', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Type de pièce</label>
                            <select id="piece_${piece.id}_type" onchange="calculsPac.updatePieceField('${piece.id}', 'type', this.value)">
                                <option value="salon" ${piece.type === 'salon' ? 'selected' : ''}>Salon</option>
                                <option value="cuisine" ${piece.type === 'cuisine' ? 'selected' : ''}>Cuisine</option>
                                <option value="chambre" ${piece.type === 'chambre' ? 'selected' : ''}>Chambre</option>
                                <option value="salle_bain" ${piece.type === 'salle_bain' ? 'selected' : ''}>Salle de bain</option>
                                <option value="bureau" ${piece.type === 'bureau' ? 'selected' : ''}>Bureau</option>
                                <option value="autre" ${piece.type === 'autre' ? 'selected' : ''}>Autre</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Longueur (m) *</label>
                            <input type="number" id="piece_${piece.id}_longueur" value="${piece.longueur}" min="1" max="20" step="0.1" placeholder="0.0" onchange="calculsPac.updatePieceField('${piece.id}', 'longueur', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Largeur (m) *</label>
                            <input type="number" id="piece_${piece.id}_largeur" value="${piece.largeur}" min="1" max="20" step="0.1" placeholder="0.0" onchange="calculsPac.updatePieceField('${piece.id}', 'largeur', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Hauteur sous plafond (m)</label>
                            <input type="number" id="piece_${piece.id}_hauteur" value="${piece.hauteur}" min="2" max="4" step="0.1" onchange="calculsPac.updatePieceField('${piece.id}', 'hauteur', this.value)">
                        </div>
                    </div>
                    
                    <div class="form-row calculated-values">
                        <div class="form-group">
                            <label>Surface calculée (m²)</label>
                            <input type="number" id="piece_${piece.id}_surface" value="${piece.surface}" readonly class="readonly-field">
                        </div>
                        <div class="form-group">
                            <label>Volume calculé (m³)</label>
                            <input type="number" id="piece_${piece.id}_volume" value="${piece.volume}" readonly class="readonly-field">
                        </div>
                        <div class="form-group">
                            <label>Température souhaitée (°C)</label>
                            <input type="number" id="piece_${piece.id}_temperature" value="${piece.temperature_souhaitee}" min="16" max="25" step="0.5" onchange="calculsPac.updatePieceField('${piece.id}', 'temperature_souhaitee', this.value)">
                        </div>
                    </div>
                    
                    <div class="form-row technical-values">
                        <div class="form-group">
                            <label>Delta T calculé (°C)</label>
                            <input type="number" id="piece_${piece.id}_delta_t" value="${piece.delta_t}" readonly class="readonly-field">
                        </div>
                        <div class="form-group">
                            <label>Coefficient G</label>
                            <input type="number" id="piece_${piece.id}_coeff_g" value="${piece.coefficient_g}" readonly class="readonly-field">
                        </div>
                        <div class="form-group">
                            <label>Puissance calculée (kW)</label>
                            <input type="number" id="piece_${piece.id}_puissance" value="${piece.puissance_calculee}" readonly class="readonly-field power-result">
                        </div>
                    </div>
                    
                    ${document.getElementById('calculType')?.value === 'air_air' ? `
                    <div class="form-row">
                        <div class="form-group">
                            <label>Type d'unité intérieure</label>
                            <select id="piece_${piece.id}_unite" onchange="calculsPac.updatePieceField('${piece.id}', 'type_unite_interieure', this.value)">
                                <option value="murale" ${piece.type_unite_interieure === 'murale' ? 'selected' : ''}>Murale</option>
                                <option value="cassette" ${piece.type_unite_interieure === 'cassette' ? 'selected' : ''}>Cassette plafond</option>
                                <option value="gainable" ${piece.type_unite_interieure === 'gainable' ? 'selected' : ''}>Gainable</option>
                                <option value="console" ${piece.type_unite_interieure === 'console' ? 'selected' : ''}>Console au sol</option>
                            </select>
                        </div>
                    </div>
                    ` : `
                    <div class="form-row">
                        <div class="form-group">
                            <label>Radiateurs existants</label>
                            <input type="text" id="piece_${piece.id}_radiateurs" value="${piece.radiateurs_existants}" placeholder="Ex: 2 radiateurs fonte 60x80cm" onchange="calculsPac.updatePieceField('${piece.id}', 'radiateurs_existants', this.value)">
                        </div>
                    </div>
                    `}
                    
                    <div class="form-group">
                        <label>Commentaires</label>
                        <textarea id="piece_${piece.id}_commentaires" rows="2" placeholder="Remarques spécifiques à cette pièce..." onchange="calculsPac.updatePieceField('${piece.id}', 'commentaires', this.value)">${piece.commentaires}</textarea>
                    </div>
                </div>
            </div>
        `).join('');
    },

    updatePieceField(pieceId, field, value) {
        const piece = this.pieces.find(p => p.id === pieceId);
        if (piece) {
            piece[field] = value;
            
            // Recalcul automatique si dimensions changées
            if (['longueur', 'largeur', 'hauteur', 'temperature_souhaitee'].includes(field)) {
                this.calculatePiece(pieceId);
            }
        }
    },

    calculatePiece(pieceId) {
        const piece = this.pieces.find(p => p.id === pieceId);
        if (!piece) return;

        const longueur = parseFloat(piece.longueur) || 0;
        const largeur = parseFloat(piece.largeur) || 0;
        const hauteur = parseFloat(piece.hauteur) || 2.5;
        const tempPiece = parseFloat(piece.temperature_souhaitee) || 20;
        const tempExt = parseFloat(document.getElementById('calculTempExt')?.value) || -7;
        const zone = document.getElementById('calculZone')?.value || 'H2';
        const isolation = document.getElementById('calculIsolation')?.value || 'moyenne';
        const emetteur = document.getElementById('calculEmetteur')?.value || 'radiateurs_bt';

        // Calculs de base
        piece.surface = longueur && largeur ? (longueur * largeur).toFixed(2) : '';
        piece.volume = longueur && largeur && hauteur ? (longueur * largeur * hauteur).toFixed(2) : '';
        piece.delta_t = (tempPiece - tempExt).toFixed(1);

        // Coefficient G selon isolation et zone
        piece.coefficient_g = this.coefficientsG[isolation] ? this.coefficientsG[isolation][zone] : 1.0;
        
        // Ratio selon émetteur (pour Air/Eau)
        const type = document.getElementById('calculType')?.value;
        if (type === 'air_eau') {
            piece.ratio_norme_energetique = this.ratiosEmetteurs[emetteur] || 1.0;
        } else {
            piece.ratio_norme_energetique = 1.0; // Air/Air
        }

        // Calcul de puissance : Puissance = Surface × Coefficient G × Delta T × Ratio / 1000
        if (piece.surface && piece.coefficient_g && piece.delta_t) {
            const surface = parseFloat(piece.surface);
            const coeffG = parseFloat(piece.coefficient_g);
            const deltaT = parseFloat(piece.delta_t);
            const ratio = parseFloat(piece.ratio_norme_energetique);
            
            piece.puissance_calculee = ((surface * coeffG * deltaT * ratio) / 1000).toFixed(2);
        }

        // Mettre à jour l'affichage
        this.updatePieceDisplay(pieceId);
    },

    updatePieceDisplay(pieceId) {
        const piece = this.pieces.find(p => p.id === pieceId);
        if (!piece) return;

        const fields = ['surface', 'volume', 'delta_t', 'coeff_g', 'puissance'];
        fields.forEach(field => {
            const element = document.getElementById(`piece_${pieceId}_${field}`);
            if (element) {
                element.value = piece[field === 'coeff_g' ? 'coefficient_g' : field === 'puissance' ? 'puissance_calculee' : field] || '';
            }
        });
    },

    calculateAll() {
        // Calculer chaque pièce
        this.pieces.forEach(piece => {
            this.calculatePiece(piece.id);
        });

        // Calculer les totaux
        this.updateResults();
    },

    updateResults() {
        const surfaceTotal = this.pieces.reduce((sum, piece) => sum + (parseFloat(piece.surface) || 0), 0);
        const puissanceTotal = this.pieces.reduce((sum, piece) => sum + (parseFloat(piece.puissance_calculee) || 0), 0);
        
        // Ajout ECS si applicable
        let puissanceECS = 0;
        const type = document.getElementById('calculType')?.value;
        if (type === 'air_eau' && document.getElementById('calculECS')?.checked) {
            const volumeECS = parseFloat(document.getElementById('calculVolumeECS')?.value) || 200;
            puissanceECS = volumeECS * 0.01; // Approximation : 1kW par 100L
        }

        const puissanceTotaleFinal = puissanceTotal + puissanceECS;
        const ratioWM2 = surfaceTotal > 0 ? Math.round((puissanceTotaleFinal * 1000) / surfaceTotal) : 0;

        // Mettre à jour l'affichage des résultats
        const resultPuissanceTotal = document.getElementById('resultPuissanceTotal');
        const resultSurfaceTotal = document.getElementById('resultSurfaceTotal');
        const resultRatio = document.getElementById('resultRatio');

        if (resultPuissanceTotal) resultPuissanceTotal.textContent = `${puissanceTotaleFinal.toFixed(2)} kW`;
        if (resultSurfaceTotal) resultSurfaceTotal.textContent = `${surfaceTotal.toFixed(1)} m²`;
        if (resultRatio) resultRatio.textContent = `${ratioWM2} W/m²`;

        // Détail par pièce
        const detailContainer = document.getElementById('resultsPiecesDetail');
        if (detailContainer && this.pieces.length > 0) {
            detailContainer.innerHTML = `
                <h5>📋 Détail par pièce</h5>
                <div class="results-table">
                    <div class="results-header">
                        <span>Pièce</span>
                        <span>Surface</span>
                        <span>Delta T</span>
                        <span>Coeff G</span>
                        <span>Puissance</span>
                    </div>
                    ${this.pieces.map(piece => `
                        <div class="results-row">
                            <span>${piece.nom || `Pièce ${piece.type}`}</span>
                            <span>${piece.surface || '-'} m²</span>
                            <span>${piece.delta_t || '-'}°C</span>
                            <span>${piece.coefficient_g || '-'}</span>
                            <span class="power-value">${piece.puissance_calculee || '-'} kW</span>
                        </div>
                    `).join('')}
                    ${puissanceECS > 0 ? `
                        <div class="results-row ecs-row">
                            <span>🚿 Production ECS</span>
                            <span>-</span>
                            <span>-</span>
                            <span>-</span>
                            <span class="power-value">${puissanceECS.toFixed(2)} kW</span>
                        </div>
                    ` : ''}
                    <div class="results-row total-row">
                        <span><strong>TOTAL</strong></span>
                        <span><strong>${surfaceTotal.toFixed(1)} m²</strong></span>
                        <span>-</span>
                        <span>-</span>
                        <span class="power-value"><strong>${puissanceTotaleFinal.toFixed(2)} kW</strong></span>
                    </div>
                </div>
            `;
        }
    },

    async save() {
        const formData = this.collectFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            if (this.currentEdit) {
                await app.apiCall(`/calculs-pac/${this.currentEdit.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                app.showMessage('Calcul PAC modifié avec succès', 'success');
            } else {
                await app.apiCall('/calculs-pac', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                app.showMessage('Calcul PAC créé avec succès', 'success');
            }

            document.querySelector('.modal').remove();
            await this.load();
            app.updateDashboardStats();
        } catch (error) {
            console.error('Error saving calcul PAC:', error);
            app.showMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
        }
    },

    collectFormData() {
        // Calculer les totaux finaux
        this.calculateAll();
        
        const surfaceTotal = this.pieces.reduce((sum, piece) => sum + (parseFloat(piece.surface) || 0), 0);
        const puissanceTotal = this.pieces.reduce((sum, piece) => sum + (parseFloat(piece.puissance_calculee) || 0), 0);
        
        const type = document.getElementById('calculType').value;
        let puissanceECS = 0;
        if (type === 'air_eau' && document.getElementById('calculECS')?.checked) {
            const volumeECS = parseFloat(document.getElementById('calculVolumeECS')?.value) || 200;
            puissanceECS = volumeECS * 0.01;
        }

        const formData = {
            nom: document.getElementById('calculNom').value.trim(),
            client_nom: document.getElementById('calculClient').value,
            adresse: document.getElementById('calculAdresse').value.trim(),
            batiment: document.getElementById('calculBatiment').value,
            type_pac: type,
            surface_totale: surfaceTotal.toFixed(1),
            zone_climatique: document.getElementById('calculZone').value,
            isolation: document.getElementById('calculIsolation').value,
            altitude: document.getElementById('calculAltitude').value,
            annee_construction: document.getElementById('calculAnnee').value,
            dpe: document.getElementById('calculDPE').value,
            temperature_exterieure_base: document.getElementById('calculTempExt').value,
            temperature_interieure_souhaitee: document.getElementById('calculTempInt').value,
            puissance_calculee: puissanceTotal.toFixed(2),
            puissance_totale_calculee: (puissanceTotal + puissanceECS).toFixed(2),
            pieces: this.pieces,
            notes: ''
        };

        if (type === 'air_eau') {
            formData.type_emetteur = document.getElementById('calculEmetteur').value;
            formData.production_ecs = document.getElementById('calculECS')?.checked || false;
            formData.volume_ballon_ecs = document.getElementById('calculVolumeECS')?.value || '';
            formData.cop_estime = document.getElementById('calculCOPECS')?.value || '';
        } else {
            formData.type_installation = document.getElementById('calculInstallation').value;
            formData.scop_estime = document.getElementById('calculSCOP').value;
            formData.seer_estime = document.getElementById('calculSEER').value;
        }

        return formData;
    },

    validateFormData(formData) {
        if (!formData.nom) {
            app.showMessage('Le nom du projet est obligatoire', 'error');
            this.switchTab('general');
            document.getElementById('calculNom').focus();
            return false;
        }

        if (!formData.surface_totale || parseFloat(formData.surface_totale) <= 0) {
            app.showMessage('La surface totale doit être supérieure à 0', 'error');
            this.switchTab('general');
            document.getElementById('calculSurface').focus();
            return false;
        }

        if (this.pieces.length === 0) {
            app.showMessage('Vous devez ajouter au moins une pièce', 'error');
            this.switchTab('pieces');
            return false;
        }

        // Vérifier que toutes les pièces ont des dimensions
        for (const piece of this.pieces) {
            if (!piece.longueur || !piece.largeur || parseFloat(piece.longueur) <= 0 || parseFloat(piece.largeur) <= 0) {
                app.showMessage(`La pièce "${piece.nom || 'sans nom'}" doit avoir des dimensions valides`, 'error');
                this.switchTab('pieces');
                return false;
            }
        }

        return true;
    },

    async delete(calculId, calculNom) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le calcul "${calculNom}" ?`)) {
            return;
        }

        try {
            await app.apiCall(`/calculs-pac/${calculId}`, { method: 'DELETE' });
            app.showMessage('Calcul PAC supprimé avec succès', 'success');
            await this.load();
            app.updateDashboardStats();
        } catch (error) {
            console.error('Error deleting calcul PAC:', error);
            app.showMessage('Erreur lors de la suppression: ' + error.message, 'error');
        }
    },

    viewDetails(calculId) {
        const calcul = this.data.find(c => c.id === calculId);
        if (!calcul) return;

        const modal = document.createElement('div');
        modal.className = 'modal modal-large';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">📊 Détails Calcul PAC - ${calcul.nom}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="calcul-details">
                        <div class="detail-section">
                            <h4>🏢 Informations Projet</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Type PAC:</label>
                                    <span class="pac-type-badge ${calcul.type_pac}">${calcul.type_pac === 'air_eau' ? '🌡️ Air/Eau' : '❄️ Air/Air'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Client:</label>
                                    <span>${calcul.client_nom || 'Non renseigné'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Adresse:</label>
                                    <span>${calcul.adresse || 'Non renseignée'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Zone climatique:</label>
                                    <span>${calcul.zone_climatique || 'H2'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4>📊 Résultats</h4>
                            <div class="results-summary">
                                <div class="result-card">
                                    <div class="result-label">Surface totale</div>
                                    <div class="result-value">${calcul.surface_totale} m²</div>
                                </div>
                                <div class="result-card">
                                    <div class="result-label">Puissance calculée</div>
                                    <div class="result-value">${calcul.puissance_totale_calculee || calcul.puissance_calculee} kW</div>
                                </div>
                                <div class="result-card">
                                    <div class="result-label">Ratio</div>
                                    <div class="result-value">${Math.round(((calcul.puissance_totale_calculee || calcul.puissance_calculee) * 1000) / calcul.surface_totale)} W/m²</div>
                                </div>
                            </div>
                        </div>

                        ${calcul.pieces && calcul.pieces.length > 0 ? `
                            <div class="detail-section">
                                <h4>🏠 Détail des Pièces</h4>
                                <div class="pieces-table">
                                    <div class="table-header">
                                        <span>Pièce</span>
                                        <span>Dimensions</span>
                                        <span>Surface</span>
                                        <span>Puissance</span>
                                    </div>
                                    ${calcul.pieces.map(piece => `
                                        <div class="table-row">
                                            <span>${piece.nom || `${piece.type || 'Pièce'}`}</span>
                                            <span>${piece.longueur}×${piece.largeur}×${piece.hauteur}m</span>
                                            <span>${piece.surface} m²</span>
                                            <span>${piece.puissance_calculee} kW</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="detail-section">
                            <h4>📅 Informations</h4>
                            <p><strong>Créé le:</strong> ${app.formatDate(calcul.created_at)}</p>
                            ${calcul.updated_at !== calcul.created_at ? `<p><strong>Modifié le:</strong> ${app.formatDate(calcul.updated_at)}</p>` : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                    <button class="btn-primary" onclick="calculsPac.exportCalculPDF('${calcul.id}')">📄 Export PDF</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    async exportPDF() {
        if (window.pdfExport) {
            await pdfExport.exportCalculsPac(this.data);
        }
    },

    async exportCalculPDF(calculId) {
        const calcul = this.data.find(c => c.id === calculId);
        if (calcul && window.pdfExport) {
            await pdfExport.exportCalculPac(calcul);
        }
    }
};