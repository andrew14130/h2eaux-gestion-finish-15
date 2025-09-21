// ===== FICHES CHANTIER MODULE COMPLET AVEC PLAN 2D =====
window.fichesChantier = {
    data: [],
    currentEdit: null,
    currentTab: 'general',
    
    // Plan 2D variables
    canvas: null,
    ctx: null,
    scale: 100, // 1:100 par défaut
    gridSize: 20,
    isDrawing: false,
    currentTool: 'select',
    planElements: [],
    planRooms: [],
    planMeasurements: [],
    selectedElement: null,
    undoStack: [],
    redoStack: [],
    maxUndoSteps: 20,

    async load() {
        try {
            this.data = await app.apiCall('/fiches-sdb');
            this.render();
        } catch (error) {
            console.error('Error loading fiches chantier:', error);
            app.showMessage('Erreur lors du chargement des fiches chantier', 'error');
            this.data = [];
            this.render();
        }
    },

    render() {
        const container = document.getElementById('fichesList');
        
        if (this.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>Aucune fiche chantier</h3>
                    <p>Cliquez sur "+ Nouvelle Fiche" pour commencer</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.map(fiche => `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">
                        ${fiche.nom}
                        <span class="fiche-type-badge">${fiche.type_intervention || 'Visite'}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="fichesChantier.showEditModal('${fiche.id}')">Modifier</button>
                        <button class="btn-view" onclick="fichesChantier.viewDetails('${fiche.id}')">Détails</button>
                        <button class="btn-export" onclick="fichesChantier.exportPDF('${fiche.id}')">Export PDF</button>
                        <button class="btn-delete" onclick="fichesChantier.delete('${fiche.id}', '${fiche.nom}')">Supprimer</button>
                    </div>
                </div>
                <div class="item-info">
                    ${fiche.client_nom ? `<div class="item-detail">👤 ${fiche.client_nom}</div>` : ''}
                    ${fiche.adresse ? `<div class="item-detail">📍 ${fiche.adresse}</div>` : ''}
                    ${fiche.date_rdv ? `<div class="item-detail">📅 RDV: ${fiche.date_rdv}</div>` : ''}
                    ${fiche.statut ? `<div class="item-detail">📊 ${fiche.statut}</div>` : ''}
                    <div class="item-detail">📅 Créé le ${app.formatDate(fiche.created_at)}</div>
                </div>
            </div>
        `).join('');
    },

    showAddModal() {
        this.currentEdit = null;
        this.showAdvancedModal('Nouvelle Fiche Chantier', null);
    },

    showEditModal(ficheId) {
        this.currentEdit = this.data.find(f => f.id === ficheId);
        if (this.currentEdit) {
            this.showAdvancedModal('Modifier Fiche Chantier', this.currentEdit);
        }
    },

    async showAdvancedModal(title, fiche = null) {
        // Load clients for dropdown
        let clientsOptions = '<option value="">Sélectionner un client</option>';
        try {
            const clients = await app.apiCall('/clients');
            clientsOptions += clients.map(client => 
                `<option value="${client.nom} ${client.prenom || ''}" ${fiche?.client_nom === `${client.nom} ${client.prenom || ''}` ? 'selected' : ''}>
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
                    <div class="fiche-tabs">
                        <button class="tab-btn active" onclick="fichesChantier.switchTab('general')">📋 Général</button>
                        <button class="tab-btn" onclick="fichesChantier.switchTab('client')">👤 Client</button>
                        <button class="tab-btn" onclick="fichesChantier.switchTab('logement')">🏠 Logement</button>
                        <button class="tab-btn" onclick="fichesChantier.switchTab('existant')">🔧 Existant</button>
                        <button class="tab-btn" onclick="fichesChantier.switchTab('besoins')">📝 Besoins</button>
                        <button class="tab-btn" onclick="fichesChantier.switchTab('technique')">⚙️ Technique</button>
                        <button class="tab-btn" onclick="fichesChantier.switchTab('plan2d')">📐 Plan 2D</button>
                        <button class="tab-btn" onclick="fichesChantier.switchTab('notes')">📄 Notes</button>
                    </div>
                    
                    <form id="ficheForm">
                        <!-- ONGLET GÉNÉRAL -->
                        <div id="tab-general" class="tab-content active">
                            <div class="form-section">
                                <h4>📋 Informations Générales</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Nom de la fiche *</label>
                                        <input type="text" id="ficheNom" required value="${fiche?.nom || ''}" placeholder="Ex: Fiche intervention Dupont">
                                    </div>
                                    <div class="form-group">
                                        <label>Date RDV</label>
                                        <input type="date" id="ficheDateRdv" value="${fiche?.date_rdv || ''}">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Type d'intervention</label>
                                        <select id="ficheTypeIntervention">
                                            <option value="visite_technique" ${fiche?.type_intervention === 'visite_technique' ? 'selected' : ''}>Visite technique</option>
                                            <option value="releve_existant" ${fiche?.type_intervention === 'releve_existant' ? 'selected' : ''}>Relevé existant</option>
                                            <option value="installation" ${fiche?.type_intervention === 'installation' ? 'selected' : ''}>Installation</option>
                                            <option value="maintenance" ${fiche?.type_intervention === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Statut</label>
                                        <select id="ficheStatut">
                                            <option value="planifie" ${fiche?.statut === 'planifie' ? 'selected' : ''}>Planifié</option>
                                            <option value="en_cours" ${fiche?.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
                                            <option value="termine" ${fiche?.statut === 'termine' ? 'selected' : ''}>Terminé</option>
                                            <option value="valide" ${fiche?.statut === 'valide' ? 'selected' : ''}>Validé</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET CLIENT -->
                        <div id="tab-client" class="tab-content">
                            <div class="form-section">
                                <h4>👤 Informations Client</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Client</label>
                                        <select id="ficheClient">${clientsOptions}</select>
                                    </div>
                                    <div class="form-group">
                                        <label>Téléphone</label>
                                        <input type="tel" id="ficheTelephone" value="${fiche?.telephone || ''}" placeholder="06 12 34 56 78">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Email</label>
                                        <input type="email" id="ficheEmail" value="${fiche?.email || ''}" placeholder="client@example.com">
                                    </div>
                                    <div class="form-group">
                                        <label>Nombre de personnes</label>
                                        <input type="number" id="ficheNbPersonnes" value="${fiche?.nb_personnes || 2}" min="1" max="20">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Adresse complète</label>
                                    <textarea id="ficheAdresse" rows="2" placeholder="Adresse complète du chantier">${fiche?.adresse || ''}</textarea>
                                </div>
                                <div class="form-group">
                                    <label>Budget estimé</label>
                                    <input type="text" id="ficheBudgetEstime" value="${fiche?.budget_estime || ''}" placeholder="Ex: 15 000€">
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET LOGEMENT -->
                        <div id="tab-logement" class="tab-content">
                            <div class="form-section">
                                <h4>🏠 Caractéristiques du Logement</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Type de logement</label>
                                        <select id="ficheTypeLogement">
                                            <option value="maison" ${fiche?.type_logement === 'maison' ? 'selected' : ''}>Maison</option>
                                            <option value="appartement" ${fiche?.type_logement === 'appartement' ? 'selected' : ''}>Appartement</option>
                                            <option value="studio" ${fiche?.type_logement === 'studio' ? 'selected' : ''}>Studio</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Année de construction</label>
                                        <input type="number" id="ficheAnneeConstruction" value="${fiche?.annee_construction || ''}" min="1900" max="2025" placeholder="AAAA">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Surface habitable (m²)</label>
                                        <input type="number" id="ficheSurface" value="${fiche?.surface || ''}" min="10" step="0.1" placeholder="m²">
                                    </div>
                                    <div class="form-group">
                                        <label>Type d'isolation</label>
                                        <select id="ficheIsolation">
                                            <option value="rt2012" ${fiche?.isolation === 'rt2012' ? 'selected' : ''}>RT2012/RE2020</option>
                                            <option value="bonne" ${fiche?.isolation === 'bonne' ? 'selected' : ''}>Bonne isolation</option>
                                            <option value="moyenne" ${fiche?.isolation === 'moyenne' ? 'selected' : ''}>Isolation moyenne</option>
                                            <option value="ancienne" ${fiche?.isolation === 'ancienne' ? 'selected' : ''}>Ancienne</option>
                                            <option value="faible" ${fiche?.isolation === 'faible' ? 'selected' : ''}>Faible isolation</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Type de menuiseries</label>
                                    <select id="ficheMenuiseries">
                                        <option value="simple" ${fiche?.menuiseries === 'simple' ? 'selected' : ''}>Simple vitrage</option>
                                        <option value="double" ${fiche?.menuiseries === 'double' ? 'selected' : ''}>Double vitrage</option>
                                        <option value="triple" ${fiche?.menuiseries === 'triple' ? 'selected' : ''}>Triple vitrage</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET EXISTANT -->
                        <div id="tab-existant" class="tab-content">
                            <div class="form-section">
                                <h4>🔧 Installation Existante</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Chauffage actuel</label>
                                        <input type="text" id="ficheChauffageActuel" value="${fiche?.chauffage_actuel || ''}" placeholder="Ex: Chaudière gaz, Radiateurs électriques...">
                                    </div>
                                    <div class="form-group">
                                        <label>État général</label>
                                        <select id="ficheEtatGeneral">
                                            <option value="bon" ${fiche?.etat_general === 'bon' ? 'selected' : ''}>Bon état</option>
                                            <option value="moyen" ${fiche?.etat_general === 'moyen' ? 'selected' : ''}>État moyen</option>
                                            <option value="mauvais" ${fiche?.etat_general === 'mauvais' ? 'selected' : ''}>Mauvais état</option>
                                            <option value="vetuste" ${fiche?.etat_general === 'vetuste' ? 'selected' : ''}>Vétuste</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Production ECS</label>
                                        <select id="ficheProductionEcs">
                                            <option value="chaudiere" ${fiche?.production_ecs === 'chaudiere' ? 'selected' : ''}>Chaudière</option>
                                            <option value="ballon_electrique" ${fiche?.production_ecs === 'ballon_electrique' ? 'selected' : ''}>Ballon électrique</option>
                                            <option value="chauffe_eau_gaz" ${fiche?.production_ecs === 'chauffe_eau_gaz' ? 'selected' : ''}>Chauffe-eau gaz</option>
                                            <option value="solaire" ${fiche?.production_ecs === 'solaire' ? 'selected' : ''}>Solaire</option>
                                            <option value="aucune" ${fiche?.production_ecs === 'aucune' ? 'selected' : ''}>Aucune</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Observations sur l'existant</label>
                                    <textarea id="ficheObservationsExistant" rows="3" placeholder="Détails sur l'installation actuelle, état, problèmes identifiés...">${fiche?.observations_existant || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET BESOINS -->
                        <div id="tab-besoins" class="tab-content">
                            <div class="form-section">
                                <h4>📝 Besoins et Attentes</h4>
                                <div class="form-group">
                                    <label>Besoins exprimés</label>
                                    <div class="checkbox-grid">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="besoin_chauffage" ${fiche?.besoins?.includes('chauffage') ? 'checked' : ''}>
                                            Chauffage
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="besoin_climatisation" ${fiche?.besoins?.includes('climatisation') ? 'checked' : ''}>
                                            Climatisation
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="besoin_ecs" ${fiche?.besoins?.includes('ecs') ? 'checked' : ''}>
                                            Eau chaude sanitaire
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="besoin_ventilation" ${fiche?.besoins?.includes('ventilation') ? 'checked' : ''}>
                                            Ventilation
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="besoin_isolation" ${fiche?.besoins?.includes('isolation') ? 'checked' : ''}>
                                            Isolation
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="besoin_autre" ${fiche?.besoins?.includes('autre') ? 'checked' : ''}>
                                            Autre
                                        </label>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Niveau de priorité</label>
                                        <select id="fichePriorite">
                                            <option value="haute" ${fiche?.priorite === 'haute' ? 'selected' : ''}>Haute priorité</option>
                                            <option value="moyenne" ${fiche?.priorite === 'moyenne' ? 'selected' : ''}>Priorité moyenne</option>
                                            <option value="basse" ${fiche?.priorite === 'basse' ? 'selected' : ''}>Basse priorité</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Délai souhaité</label>
                                        <select id="ficheDelaiSouhaite">
                                            <option value="immediat" ${fiche?.delai_souhaite === 'immediat' ? 'selected' : ''}>Immédiat</option>
                                            <option value="court" ${fiche?.delai_souhaite === 'court' ? 'selected' : ''}>Court terme (< 3 mois)</option>
                                            <option value="moyen" ${fiche?.delai_souhaite === 'moyen' ? 'selected' : ''}>Moyen terme (3-6 mois)</option>
                                            <option value="long" ${fiche?.delai_souhaite === 'long' ? 'selected' : ''}>Long terme (> 6 mois)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Contraintes particulières</label>
                                    <textarea id="ficheContraintes" rows="3" placeholder="Contraintes budgétaires, techniques, temporelles...">${fiche?.contraintes || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET TECHNIQUE -->
                        <div id="tab-technique" class="tab-content">
                            <div class="form-section">
                                <h4>⚙️ Aspects Techniques</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Compteur électrique</label>
                                        <input type="text" id="ficheCompteurElectrique" value="${fiche?.compteur_electrique || ''}" placeholder="Puissance, type (mono/tri)...">
                                    </div>
                                    <div class="form-group">
                                        <label>Arrivée gaz</label>
                                        <select id="ficheArriveeGaz">
                                            <option value="oui" ${fiche?.arrivee_gaz === 'oui' ? 'selected' : ''}>Oui, présente</option>
                                            <option value="non" ${fiche?.arrivee_gaz === 'non' ? 'selected' : ''}>Non</option>
                                            <option value="proche" ${fiche?.arrivee_gaz === 'proche' ? 'selected' : ''}>Proche (raccordement possible)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Évacuation des eaux</label>
                                        <input type="text" id="ficheEvacuationEaux" value="${fiche?.evacuation_eaux || ''}" placeholder="Tout à l'égout, fosse septique...">
                                    </div>
                                    <div class="form-group">
                                        <label>Accès matériel</label>
                                        <select id="ficheAccesMateriel">
                                            <option value="facile" ${fiche?.acces_materiel === 'facile' ? 'selected' : ''}>Facile</option>
                                            <option value="moyen" ${fiche?.acces_materiel === 'moyen' ? 'selected' : ''}>Moyen</option>
                                            <option value="difficile" ${fiche?.acces_materiel === 'difficile' ? 'selected' : ''}>Difficile</option>
                                            <option value="impossible" ${fiche?.acces_materiel === 'impossible' ? 'selected' : ''}>Impossible (grue nécessaire)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Contraintes techniques</label>
                                    <textarea id="ficheContraintesTechniques" rows="3" placeholder="Contraintes d'accès, de pose, réglementaires...">${fiche?.contraintes_techniques || ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- ONGLET PLAN 2D -->
                        <div id="tab-plan2d" class="tab-content">
                            <div class="plan2d-section">
                                <div class="plan2d-header">
                                    <h4>📐 Plan 2D - Style MagicPlan</h4>
                                    <div class="plan2d-controls">
                                        <div class="plan-tools">
                                            <button type="button" class="tool-btn active" data-tool="select" onclick="fichesChantier.selectTool('select')" title="Sélection">👆</button>
                                            <button type="button" class="tool-btn" data-tool="draw" onclick="fichesChantier.selectTool('draw')" title="Dessin libre">✏️</button>
                                            <button type="button" class="tool-btn" data-tool="room" onclick="fichesChantier.selectTool('room')" title="Ajouter pièce">🏠</button>
                                            <button type="button" class="tool-btn" data-tool="measure" onclick="fichesChantier.selectTool('measure')" title="Cotation">📏</button>
                                            <button type="button" class="tool-btn" data-tool="erase" onclick="fichesChantier.selectTool('erase')" title="Effacer">🗑️</button>
                                        </div>
                                        <div class="plan-options">
                                            <select id="planScale" onchange="fichesChantier.changeScale(this.value)">
                                                <option value="50">1:50</option>
                                                <option value="100" selected>1:100</option>
                                                <option value="200">1:200</option>
                                            </select>
                                            <button type="button" class="btn-secondary" onclick="fichesChantier.importPlan()">📁 Import</button>
                                            <button type="button" class="btn-secondary" onclick="fichesChantier.clearPlan()">🧹 Effacer</button>
                                            <button type="button" class="btn-secondary" onclick="fichesChantier.undoPlan()" id="undoBtn">↶ Annuler</button>
                                            <button type="button" class="btn-secondary" onclick="fichesChantier.redoPlan()" id="redoBtn">↷ Refaire</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="plan2d-container">
                                    <canvas id="planCanvas" width="800" height="600"></canvas>
                                    <div class="plan-info">
                                        <div class="plan-coords" id="planCoords">X: 0, Y: 0</div>
                                        <div class="plan-tool-info" id="planToolInfo">Outil: Sélection</div>
                                    </div>
                                </div>
                                <input type="file" id="planFileInput" accept="image/*,.pdf" style="display: none;" onchange="fichesChantier.handlePlanImport(event)">
                            </div>
                        </div>

                        <!-- ONGLET NOTES -->
                        <div id="tab-notes" class="tab-content">
                            <div class="form-section">
                                <h4>📄 Conclusions et Notes</h4>
                                <div class="form-group">
                                    <label>Solution recommandée</label>
                                    <textarea id="ficheSolutionRecommandee" rows="4" placeholder="Description de la solution technique recommandée...">${fiche?.solution_recommandee || ''}</textarea>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Budget final estimé</label>
                                        <input type="text" id="ficheBudgetFinal" value="${fiche?.budget_final || ''}" placeholder="Ex: 18 500€">
                                    </div>
                                    <div class="form-group">
                                        <label>Délai de réalisation</label>
                                        <input type="text" id="ficheDelaiRealisation" value="${fiche?.delai_realisation || ''}" placeholder="Ex: 2 semaines">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Points d'attention</label>
                                    <textarea id="fichePointsAttention" rows="3" placeholder="Points importants à retenir pour le suivi...">${fiche?.points_attention || ''}</textarea>
                                </div>
                                <div class="form-group">
                                    <label>Notes complémentaires</label>
                                    <textarea id="ficheNotes" rows="4" placeholder="Notes diverses, remarques...">${fiche?.notes || ''}</textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn-secondary" onclick="fichesChantier.exportCurrentPDF()">📄 Aperçu PDF</button>
                    <button class="btn-primary" onclick="fichesChantier.save()">💾 Enregistrer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Initialize Plan 2D
        setTimeout(() => {
            this.initializePlan2D();
            if (fiche && fiche.plan_data) {
                this.loadPlanData(fiche.plan_data);
            }
        }, 100);
        
        // Focus first input
        setTimeout(() => {
            modal.querySelector('#ficheNom').focus();
        }, 100);

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[onclick="fichesChantier.switchTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Reinitialize Plan 2D if switching to plan tab
        if (tabName === 'plan2d') {
            setTimeout(() => this.initializePlan2D(), 100);
        }
    },

    // ===== PLAN 2D FUNCTIONS =====
    initializePlan2D() {
        this.canvas = document.getElementById('planCanvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvasEvents();
        this.drawGrid();
        this.updateToolInfo();
    },

    setupCanvasEvents() {
        const canvas = this.canvas;
        
        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Touch events for tablets
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        }, { passive: false });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        }, { passive: false });
    },

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Snap to grid
        const snappedX = Math.round(x / this.gridSize) * this.gridSize;
        const snappedY = Math.round(y / this.gridSize) * this.gridSize;
        
        return { x: snappedX, y: snappedY };
    },

    handleMouseDown(e) {
        const coords = this.getCanvasCoords(e);
        this.isDrawing = true;
        
        switch (this.currentTool) {
            case 'draw':
                this.startDrawing(coords);
                break;
            case 'room':
                this.startRoom(coords);
                break;
            case 'measure':
                this.startMeasurement(coords);
                break;
            case 'select':
                this.selectElement(coords);
                break;
            case 'erase':
                this.eraseElement(coords);
                break;
        }
    },

    handleMouseMove(e) {
        const coords = this.getCanvasCoords(e);
        
        // Update coordinates display
        document.getElementById('planCoords').textContent = `X: ${coords.x}, Y: ${coords.y}`;
        
        if (!this.isDrawing) return;
        
        switch (this.currentTool) {
            case 'draw':
                this.continuDrawing(coords);
                break;
            case 'room':
                this.updateRoom(coords);
                break;
            case 'measure':
                this.updateMeasurement(coords);
                break;
        }
    },

    handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        const coords = this.getCanvasCoords(e);
        this.isDrawing = false;
        
        switch (this.currentTool) {
            case 'draw':
                this.finishDrawing(coords);
                break;
            case 'room':
                this.finishRoom(coords);
                break;
            case 'measure':
                this.finishMeasurement(coords);
                break;
        }
        
        this.saveToUndoStack();
        this.redrawCanvas();
    },

    selectTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        this.updateToolInfo();
    },

    updateToolInfo() {
        const toolNames = {
            'select': 'Sélection',
            'draw': 'Dessin libre',
            'room': 'Ajouter pièce',
            'measure': 'Cotation',
            'erase': 'Effacer'
        };
        
        document.getElementById('planToolInfo').textContent = `Outil: ${toolNames[this.currentTool]}`;
    },

    changeScale(scale) {
        this.scale = parseInt(scale);
        this.redrawCanvas();
    },

    drawGrid() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= canvas.width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= canvas.height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Draw scale indicator
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.fillText(`Échelle 1:${this.scale}`, 10, 20);
    },

    startDrawing(coords) {
        this.currentPath = [coords];
    },

    continuDrawing(coords) {
        if (this.currentPath) {
            this.currentPath.push(coords);
            this.redrawCanvas();
            
            // Draw current path
            const ctx = this.ctx;
            ctx.strokeStyle = '#007AFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            this.currentPath.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
        }
    },

    finishDrawing(coords) {
        if (this.currentPath && this.currentPath.length > 1) {
            this.planElements.push({
                type: 'line',
                points: [...this.currentPath],
                color: '#007AFF',
                width: 2,
                id: Date.now().toString()
            });
        }
        this.currentPath = null;
    },

    startRoom(coords) {
        this.currentRoom = {
            startX: coords.x,
            startY: coords.y,
            endX: coords.x,
            endY: coords.y
        };
    },

    updateRoom(coords) {
        if (this.currentRoom) {
            this.currentRoom.endX = coords.x;
            this.currentRoom.endY = coords.y;
            this.redrawCanvas();
            
            // Draw current room
            const ctx = this.ctx;
            const room = this.currentRoom;
            
            ctx.strokeStyle = '#FF6B6B';
            ctx.fillStyle = 'rgba(255, 107, 107, 0.1)';
            ctx.lineWidth = 2;
            
            const width = room.endX - room.startX;
            const height = room.endY - room.startY;
            
            ctx.fillRect(room.startX, room.startY, width, height);
            ctx.strokeRect(room.startX, room.startY, width, height);
        }
    },

    finishRoom(coords) {
        if (this.currentRoom) {
            const room = this.currentRoom;
            const width = Math.abs(room.endX - room.startX);
            const height = Math.abs(room.endY - room.startY);
            
            if (width > this.gridSize && height > this.gridSize) {
                const roomName = prompt('Nom de la pièce:', 'Pièce');
                if (roomName) {
                    this.planRooms.push({
                        type: 'room',
                        x: Math.min(room.startX, room.endX),
                        y: Math.min(room.startY, room.endY),
                        width: width,
                        height: height,
                        name: roomName,
                        id: Date.now().toString()
                    });
                }
            }
        }
        this.currentRoom = null;
    },

    startMeasurement(coords) {
        this.currentMeasurement = {
            startX: coords.x,
            startY: coords.y,
            endX: coords.x,
            endY: coords.y
        };
    },

    updateMeasurement(coords) {
        if (this.currentMeasurement) {
            this.currentMeasurement.endX = coords.x;
            this.currentMeasurement.endY = coords.y;
            this.redrawCanvas();
            
            // Draw current measurement
            const ctx = this.ctx;
            const m = this.currentMeasurement;
            
            ctx.strokeStyle = '#34C759';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(m.startX, m.startY);
            ctx.lineTo(m.endX, m.endY);
            ctx.stroke();
            
            // Calculate and display distance
            const distance = Math.sqrt(Math.pow(m.endX - m.startX, 2) + Math.pow(m.endY - m.startY, 2));
            const realDistance = (distance * this.scale / 100).toFixed(2); // Convert to real meters
            
            ctx.fillStyle = '#34C759';
            ctx.font = '12px Arial';
            ctx.fillText(`${realDistance}m`, (m.startX + m.endX) / 2, (m.startY + m.endY) / 2 - 5);
        }
    },

    finishMeasurement(coords) {
        if (this.currentMeasurement) {
            const m = this.currentMeasurement;
            const distance = Math.sqrt(Math.pow(m.endX - m.startX, 2) + Math.pow(m.endY - m.startY, 2));
            
            if (distance > this.gridSize) {
                const realDistance = (distance * this.scale / 100).toFixed(2);
                let measureText = prompt('Mesure (m):', realDistance);
                
                if (measureText !== null) {
                    this.planMeasurements.push({
                        type: 'measurement',
                        startX: m.startX,
                        startY: m.startY,
                        endX: m.endX,
                        endY: m.endY,
                        text: measureText + 'm',
                        id: Date.now().toString()
                    });
                }
            }
        }
        this.currentMeasurement = null;
    },

    selectElement(coords) {
        // Find element at coordinates
        this.selectedElement = null;
        
        // Check rooms
        for (const room of this.planRooms) {
            if (coords.x >= room.x && coords.x <= room.x + room.width &&
                coords.y >= room.y && coords.y <= room.y + room.height) {
                this.selectedElement = room;
                break;
            }
        }
        
        this.redrawCanvas();
    },

    eraseElement(coords) {
        let elementRemoved = false;
        
        // Check rooms
        this.planRooms = this.planRooms.filter(room => {
            const inRoom = coords.x >= room.x && coords.x <= room.x + room.width &&
                          coords.y >= room.y && coords.y <= room.y + room.height;
            if (inRoom) elementRemoved = true;
            return !inRoom;
        });
        
        // Check measurements
        this.planMeasurements = this.planMeasurements.filter(m => {
            const distance = Math.sqrt(Math.pow(coords.x - m.startX, 2) + Math.pow(coords.y - m.startY, 2));
            const distance2 = Math.sqrt(Math.pow(coords.x - m.endX, 2) + Math.pow(coords.y - m.endY, 2));
            const nearLine = distance < 20 || distance2 < 20;
            if (nearLine) elementRemoved = true;
            return !nearLine;
        });
        
        // Check lines
        this.planElements = this.planElements.filter(element => {
            if (element.type === 'line') {
                const nearLine = element.points.some(point => 
                    Math.sqrt(Math.pow(coords.x - point.x, 2) + Math.pow(coords.y - point.y, 2)) < 20
                );
                if (nearLine) elementRemoved = true;
                return !nearLine;
            }
            return true;
        });
        
        if (elementRemoved) {
            this.redrawCanvas();
        }
    },

    redrawCanvas() {
        this.drawGrid();
        
        const ctx = this.ctx;
        
        // Draw all elements
        this.planElements.forEach(element => {
            if (element.type === 'line') {
                ctx.strokeStyle = element.color;
                ctx.lineWidth = element.width;
                ctx.beginPath();
                
                element.points.forEach((point, index) => {
                    if (index === 0) {
                        ctx.moveTo(point.x, point.y);
                    } else {
                        ctx.lineTo(point.x, point.y);
                    }
                });
                ctx.stroke();
            }
        });
        
        // Draw rooms
        this.planRooms.forEach(room => {
            const isSelected = this.selectedElement === room;
            
            ctx.strokeStyle = isSelected ? '#FF3B30' : '#FF6B6B';
            ctx.fillStyle = isSelected ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 107, 107, 0.1)';
            ctx.lineWidth = isSelected ? 3 : 2;
            
            ctx.fillRect(room.x, room.y, room.width, room.height);
            ctx.strokeRect(room.x, room.y, room.width, room.height);
            
            // Draw room name
            ctx.fillStyle = '#333';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(room.name, room.x + room.width / 2, room.y + room.height / 2);
            ctx.textAlign = 'start';
        });
        
        // Draw measurements
        this.planMeasurements.forEach(m => {
            ctx.strokeStyle = '#34C759';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(m.startX, m.startY);
            ctx.lineTo(m.endX, m.endY);
            ctx.stroke();
            
            // Draw measurement text
            ctx.fillStyle = '#34C759';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(m.text, (m.startX + m.endX) / 2, (m.startY + m.endY) / 2 - 5);
            ctx.textAlign = 'start';
        });
    },

    importPlan() {
        document.getElementById('planFileInput').click();
    },

    handlePlanImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Draw image as background
                this.ctx.globalAlpha = 0.5;
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                this.ctx.globalAlpha = 1.0;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    clearPlan() {
        if (confirm('Êtes-vous sûr de vouloir effacer tout le plan ?')) {
            this.planElements = [];
            this.planRooms = [];
            this.planMeasurements = [];
            this.selectedElement = null;
            this.saveToUndoStack();
            this.redrawCanvas();
        }
    },

    saveToUndoStack() {
        const state = {
            elements: JSON.parse(JSON.stringify(this.planElements)),
            rooms: JSON.parse(JSON.stringify(this.planRooms)),
            measurements: JSON.parse(JSON.stringify(this.planMeasurements))
        };
        
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        this.redoStack = []; // Clear redo stack when new action is performed
        this.updateUndoButtons();
    },

    undoPlan() {
        if (this.undoStack.length > 0) {
            const currentState = {
                elements: JSON.parse(JSON.stringify(this.planElements)),
                rooms: JSON.parse(JSON.stringify(this.planRooms)),
                measurements: JSON.parse(JSON.stringify(this.planMeasurements))
            };
            
            this.redoStack.push(currentState);
            
            const previousState = this.undoStack.pop();
            this.planElements = previousState.elements;
            this.planRooms = previousState.rooms;
            this.planMeasurements = previousState.measurements;
            
            this.redrawCanvas();
            this.updateUndoButtons();
        }
    },

    redoPlan() {
        if (this.redoStack.length > 0) {
            const currentState = {
                elements: JSON.parse(JSON.stringify(this.planElements)),
                rooms: JSON.parse(JSON.stringify(this.planRooms)),
                measurements: JSON.parse(JSON.stringify(this.planMeasurements))
            };
            
            this.undoStack.push(currentState);
            
            const nextState = this.redoStack.pop();
            this.planElements = nextState.elements;
            this.planRooms = nextState.rooms;
            this.planMeasurements = nextState.measurements;
            
            this.redrawCanvas();
            this.updateUndoButtons();
        }
    },

    updateUndoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
    },

    loadPlanData(planDataString) {
        try {
            const planData = JSON.parse(planDataString);
            this.planElements = planData.elements || [];
            this.planRooms = planData.rooms || [];
            this.planMeasurements = planData.measurements || [];
            this.scale = planData.scale || 100;
            
            // Update scale selector
            const scaleSelect = document.getElementById('planScale');
            if (scaleSelect) scaleSelect.value = this.scale;
            
            this.redrawCanvas();
        } catch (error) {
            console.error('Error loading plan data:', error);
        }
    },

    // ===== SAVE/EXPORT FUNCTIONS =====
    async save() {
        const formData = this.collectFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            if (this.currentEdit) {
                await app.apiCall(`/fiches-sdb/${this.currentEdit.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                app.showMessage('Fiche chantier modifiée avec succès', 'success');
            } else {
                await app.apiCall('/fiches-sdb', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                app.showMessage('Fiche chantier créée avec succès', 'success');
            }

            document.querySelector('.modal').remove();
            await this.load();
            app.updateDashboardStats();
        } catch (error) {
            console.error('Error saving fiche chantier:', error);
            app.showMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
        }
    },

    collectFormData() {
        // Collect besoins checkboxes
        const besoins = [];
        document.querySelectorAll('[id^="besoin_"]:checked').forEach(checkbox => {
            besoins.push(checkbox.id.replace('besoin_', ''));
        });

        // Collect plan data
        const planData = JSON.stringify({
            elements: this.planElements,
            rooms: this.planRooms,
            measurements: this.planMeasurements,
            scale: this.scale,
            gridSize: this.gridSize,
            updated: new Date().toISOString()
        });

        return {
            nom: document.getElementById('ficheNom').value.trim(),
            client_nom: document.getElementById('ficheClient').value,
            adresse: document.getElementById('ficheAdresse').value.trim(),
            telephone: document.getElementById('ficheTelephone').value.trim(),
            email: document.getElementById('ficheEmail').value.trim(),
            date_rdv: document.getElementById('ficheDateRdv').value,
            type_intervention: document.getElementById('ficheTypeIntervention').value,
            statut: document.getElementById('ficheStatut').value,
            nb_personnes: parseInt(document.getElementById('ficheNbPersonnes').value) || 2,
            budget_estime: document.getElementById('ficheBudgetEstime').value.trim(),
            type_logement: document.getElementById('ficheTypeLogement').value,
            annee_construction: parseInt(document.getElementById('ficheAnneeConstruction').value) || null,
            surface: document.getElementById('ficheSurface').value.trim(),
            isolation: document.getElementById('ficheIsolation').value,
            menuiseries: document.getElementById('ficheMenuiseries').value,
            chauffage_actuel: document.getElementById('ficheChauffageActuel').value.trim(),
            etat_general: document.getElementById('ficheEtatGeneral').value,
            production_ecs: document.getElementById('ficheProductionEcs').value,
            observations_existant: document.getElementById('ficheObservationsExistant').value.trim(),
            besoins: JSON.stringify(besoins),
            priorite: document.getElementById('fichePriorite').value,
            delai_souhaite: document.getElementById('ficheDelaiSouhaite').value,
            contraintes: document.getElementById('ficheContraintes').value.trim(),
            compteur_electrique: document.getElementById('ficheCompteurElectrique').value.trim(),
            arrivee_gaz: document.getElementById('ficheArriveeGaz').value,
            evacuation_eaux: document.getElementById('ficheEvacuationEaux').value.trim(),
            acces_materiel: document.getElementById('ficheAccesMateriel').value,
            contraintes_techniques: document.getElementById('ficheContraintesTechniques').value.trim(),
            plan_data: planData,
            solution_recommandee: document.getElementById('ficheSolutionRecommandee').value.trim(),
            budget_final: document.getElementById('ficheBudgetFinal').value.trim(),
            delai_realisation: document.getElementById('ficheDelaiRealisation').value.trim(),
            points_attention: document.getElementById('fichePointsAttention').value.trim(),
            notes: document.getElementById('ficheNotes').value.trim(),
            
            // Legacy SDB fields for compatibility
            type_sdb: 'complete',
            carrelage_mur: '',
            carrelage_sol: '',
            sanitaires: '',
            robinetterie: '',
            chauffage: '',
            ventilation: '',
            eclairage: ''
        };
    },

    validateFormData(formData) {
        if (!formData.nom) {
            app.showMessage('Le nom de la fiche est obligatoire', 'error');
            this.switchTab('general');
            document.getElementById('ficheNom').focus();
            return false;
        }

        return true;
    },

    async delete(ficheId, ficheNom) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la fiche "${ficheNom}" ?`)) {
            return;
        }

        try {
            await app.apiCall(`/fiches-sdb/${ficheId}`, { method: 'DELETE' });
            app.showMessage('Fiche chantier supprimée avec succès', 'success');
            await this.load();
            app.updateDashboardStats();
        } catch (error) {
            console.error('Error deleting fiche chantier:', error);
            app.showMessage('Erreur lors de la suppression: ' + error.message, 'error');
        }
    },

    viewDetails(ficheId) {
        const fiche = this.data.find(f => f.id === ficheId);
        if (!fiche) {
            app.showMessage('Fiche non trouvée', 'error');
            return;
        }

        this.showDetailsModal(fiche);
    },

    showDetailsModal(fiche) {
        const modal = document.createElement('div');
        modal.className = 'modal modal-fullscreen';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">📋 Détails - ${fiche.nom}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="details-container">
                        <div class="details-section">
                            <h4>📋 Informations Générales</h4>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <label>Nom de la fiche:</label>
                                    <span>${fiche.nom || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Client:</label>
                                    <span>${fiche.client_nom || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Adresse:</label>
                                    <span>${fiche.adresse || '-'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Statut:</label>
                                    <span class="status-badge ${fiche.statut || 'planifie'}">${this.getStatusLabel(fiche.statut)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Date de création:</label>
                                    <span>${app.formatDate(fiche.created_at)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Dernière modification:</label>
                                    <span>${fiche.updated_at ? app.formatDate(fiche.updated_at) : app.formatDate(fiche.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        ${this.renderLogementDetails(fiche)}
                        ${this.renderExistantDetails(fiche)}
                        ${this.renderBesoinsDetails(fiche)}
                        ${this.renderTechniqueDetails(fiche)}
                        ${this.renderPlan2DDetails(fiche)}
                        ${this.renderNotesDetails(fiche)}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="fichesChantier.showEditModal('${fiche.id}')">✏️ Modifier</button>
                    <button class="btn-secondary" onclick="fichesChantier.exportPDF('${fiche.id}')">📄 Export PDF</button>
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    renderLogementDetails(fiche) {
        if (!fiche.surface && !fiche.pieces && !fiche.annee_construction) return '';
        
        return `
            <div class="details-section">
                <h4>🏠 Logement</h4>
                <div class="details-grid">
                    ${fiche.surface ? `<div class="detail-item"><label>Surface:</label><span>${fiche.surface} m²</span></div>` : ''}
                    ${fiche.pieces ? `<div class="detail-item"><label>Nombre de pièces:</label><span>${fiche.pieces}</span></div>` : ''}
                    ${fiche.annee_construction ? `<div class="detail-item"><label>Année construction:</label><span>${fiche.annee_construction}</span></div>` : ''}
                    ${fiche.type_logement ? `<div class="detail-item"><label>Type logement:</label><span>${fiche.type_logement}</span></div>` : ''}
                    ${fiche.isolation ? `<div class="detail-item"><label>Isolation:</label><span>${fiche.isolation}</span></div>` : ''}
                    ${fiche.chauffage_existant ? `<div class="detail-item"><label>Chauffage existant:</label><span>${fiche.chauffage_existant}</span></div>` : ''}
                </div>
            </div>
        `;
    },

    renderExistantDetails(fiche) {
        if (!fiche.equipements_existants) return '';
        
        return `
            <div class="details-section">
                <h4>🔧 Équipements Existants</h4>
                <div class="details-content">
                    <p>${fiche.equipements_existants}</p>
                </div>
            </div>
        `;
    },

    renderBesoinsDetails(fiche) {
        if (!fiche.besoins_client) return '';
        
        return `
            <div class="details-section">
                <h4>💭 Besoins Client</h4>
                <div class="details-content">
                    <p>${fiche.besoins_client}</p>
                </div>
            </div>
        `;
    },

    renderTechniqueDetails(fiche) {
        if (!fiche.specifications_techniques) return '';
        
        return `
            <div class="details-section">
                <h4>⚙️ Spécifications Techniques</h4>
                <div class="details-content">
                    <p>${fiche.specifications_techniques}</p>
                </div>
            </div>
        `;
    },

    renderPlan2DDetails(fiche) {
        if (!fiche.plan_2d_data) return '';
        
        return `
            <div class="details-section">
                <h4>📐 Plan 2D</h4>
                <div class="plan-preview">
                    <p>Plan 2D disponible - ${fiche.plan_2d_elements ? Object.keys(JSON.parse(fiche.plan_2d_elements)).length : 0} éléments</p>
                    <button class="btn-secondary" onclick="fichesChantier.showEditModal('${fiche.id}'); setTimeout(() => fichesChantier.switchTab('plan-2d'), 500)">
                        Voir le plan 2D
                    </button>
                </div>
            </div>
        `;
    },

    renderNotesDetails(fiche) {
        if (!fiche.notes_complementaires) return '';
        
        return `
            <div class="details-section">
                <h4>📝 Notes Complémentaires</h4>
                <div class="details-content">
                    <p>${fiche.notes_complementaires}</p>
                </div>
            </div>
        `;
    },

    getStatusLabel(status) {
        const statuses = {
            'planifie': 'Planifié',
            'en_cours': 'En cours',
            'termine': 'Terminé',
            'suspendu': 'Suspendu',
            'annule': 'Annulé'
        };
        return statuses[status] || 'Planifié';
    },

    async exportPDF(ficheId) {
        const fiche = this.data.find(f => f.id === ficheId);
        if (fiche && window.pdfExport) {
            await pdfExport.exportFicheChantier(fiche);
        }
    },

    async exportCurrentPDF() {
        const formData = this.collectFormData();
        if (window.pdfExport) {
            await pdfExport.exportFicheChantier(formData, true); // true for preview mode
        }
    }
};