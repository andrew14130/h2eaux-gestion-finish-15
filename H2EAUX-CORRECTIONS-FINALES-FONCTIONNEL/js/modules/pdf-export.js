// ===== PDF EXPORT MODULE =====
window.pdfExport = {
    
    // Get company info for PDF header
    getCompanyInfo() {
        const saved = localStorage.getItem('h2eaux_company_settings');
        const defaults = {
            name: 'H2EAUX GESTION',
            slogan: 'PLOMBERIE • CLIMATISATION • CHAUFFAGE',
            logo: null
        };
        
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    },

    // Add company header to PDF
    async addHeader(doc, title) {
        const company = this.getCompanyInfo();
        
        // Add logo if available
        if (company.logo && company.logo.startsWith('data:image')) {
            try {
                doc.addImage(company.logo, 'PNG', 15, 15, 30, 15);
            } catch (error) {
                console.warn('Could not add logo to PDF:', error);
            }
        }
        
        // Company name
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text(company.name, company.logo ? 55 : 15, 25);
        
        // Company slogan
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(company.slogan, company.logo ? 55 : 15, 32);
        
        // Document title
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(title, 15, 50);
        
        // Date
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 15, 57);
        
        // Line separator
        doc.setDrawColor(0, 122, 255);
        doc.setLineWidth(0.5);
        doc.line(15, 65, 195, 65);
        
        return 75; // Return Y position for content start
    },

    // Add logo to PDF
    async addLogo(doc, x, y) {
        const company = this.getCompanyInfo();
        
        if (company.logo && company.logo.startsWith('data:image')) {
            try {
                doc.addImage(company.logo, 'PNG', x, y, 30, 15);
            } catch (error) {
                console.warn('Could not add logo to PDF:', error);
            }
        }
    },

    // Export single client
    async exportClient(client) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPos = await this.addHeader(doc, 'Fiche Client');
        
        // Client info
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`${client.nom} ${client.prenom || ''}`, 15, yPos);
        yPos += 10;
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        
        if (client.email) {
            doc.text(`Email: ${client.email}`, 15, yPos);
            yPos += 7;
        }
        
        if (client.telephone) {
            doc.text(`Téléphone: ${this.formatPhone(client.telephone)}`, 15, yPos);
            yPos += 7;
        }
        
        if (client.adresse) {
            doc.text(`Adresse: ${client.adresse}`, 15, yPos);
            yPos += 7;
        }
        
        if (client.code_postal && client.ville) {
            doc.text(`Ville: ${client.code_postal} ${client.ville}`, 15, yPos);
            yPos += 7;
        }
        
        doc.text(`Créé le: ${app.formatDate(client.created_at)}`, 15, yPos);
        
        // Footer
        this.addFooter(doc);
        
        doc.save(`Client_${client.nom.replace(/\s/g, '_')}.pdf`);
    },

    // Export all clients
    async exportClients(clients) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPos = await this.addHeader(doc, 'Liste des Clients');
        
        // Table data
        const tableData = clients.map(client => [
            `${client.nom} ${client.prenom || ''}`,
            client.email || '',
            this.formatPhone(client.telephone) || '',
            client.ville || '',
            app.formatDate(client.created_at)
        ]);
        
        doc.autoTable({
            head: [['Nom', 'Email', 'Téléphone', 'Ville', 'Créé le']],
            body: tableData,
            startY: yPos,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [0, 122, 255] }
        });
        
        this.addFooter(doc);
        doc.save('Liste_Clients.pdf');
    },

    // Export single chantier
    async exportChantier(chantier) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPos = await this.addHeader(doc, 'Fiche Chantier');
        
        // Chantier info
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(chantier.nom, 15, yPos);
        yPos += 10;
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        
        doc.text(`Statut: ${this.getStatusLabel(chantier.statut)}`, 15, yPos);
        yPos += 7;
        
        if (chantier.client_nom) {
            doc.text(`Client: ${chantier.client_nom}`, 15, yPos);
            yPos += 7;
        }
        
        if (chantier.description) {
            doc.text(`Description: ${chantier.description}`, 15, yPos);
            yPos += 7;
        }
        
        if (chantier.adresse) {
            doc.text(`Adresse: ${chantier.adresse}`, 15, yPos);
            yPos += 7;
        }
        
        if (chantier.date_debut) {
            doc.text(`Date de début: ${app.formatDate(chantier.date_debut)}`, 15, yPos);
            yPos += 7;
        }
        
        if (chantier.date_fin_prevue) {
            doc.text(`Date de fin prévue: ${app.formatDate(chantier.date_fin_prevue)}`, 15, yPos);
            yPos += 7;
        }
        
        if (chantier.budget_estime) {
            doc.text(`Budget estimé: ${app.formatCurrency(chantier.budget_estime)}`, 15, yPos);
            yPos += 7;
        }
        
        doc.text(`Créé le: ${app.formatDate(chantier.created_at)}`, 15, yPos);
        
        this.addFooter(doc);
        doc.save(`Chantier_${chantier.nom.replace(/\s/g, '_')}.pdf`);
    },

    // Export all chantiers
    async exportChantiers(chantiers) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPos = await this.addHeader(doc, 'Liste des Chantiers');
        
        const tableData = chantiers.map(chantier => [
            chantier.nom,
            this.getStatusLabel(chantier.statut),
            chantier.client_nom || '',
            chantier.budget_estime ? app.formatCurrency(chantier.budget_estime) : '',
            app.formatDate(chantier.created_at)
        ]);
        
        doc.autoTable({
            head: [['Nom', 'Statut', 'Client', 'Budget', 'Créé le']],
            body: tableData,
            startY: yPos,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [0, 122, 255] }
        });
        
        this.addFooter(doc);
        doc.save('Liste_Chantiers.pdf');
    },

    // Export single calcul PAC
    async exportCalculPac(calcul) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPos = await this.addHeader(doc, 'Calcul PAC');
        
        // Calcul info
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(calcul.nom, 15, yPos);
        yPos += 10;
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        
        doc.text(`Type de PAC: ${calcul.type_pac === 'air-eau' ? 'Air/Eau' : 'Air/Air'}`, 15, yPos);
        yPos += 7;
        
        if (calcul.client_nom) {
            doc.text(`Client: ${calcul.client_nom}`, 15, yPos);
            yPos += 7;
        }
        
        if (calcul.zone_climatique) {
            doc.text(`Zone climatique: ${calcul.zone_climatique}`, 15, yPos);
            yPos += 7;
        }
        
        doc.text(`Surface totale: ${calcul.surface_totale} m²`, 15, yPos);
        yPos += 7;
        
        if (calcul.puissance_calculee) {
            doc.text(`Puissance calculée: ${calcul.puissance_calculee} kW`, 15, yPos);
            yPos += 10;
        }
        
        // Type-specific details
        if (calcul.type_pac === 'air-eau') {
            doc.setFont(undefined, 'bold');
            doc.text('Détails du calcul Air/Eau:', 15, yPos);
            yPos += 7;
            
            doc.setFont(undefined, 'normal');
            if (calcul.hauteur_plafond) {
                doc.text(`Hauteur sous plafond: ${calcul.hauteur_plafond} m`, 15, yPos);
                yPos += 7;
            }
            if (calcul.isolation) {
                doc.text(`Type d'isolation: ${calcul.isolation}`, 15, yPos);
                yPos += 7;
            }
            if (calcul.delta_t) {
                doc.text(`Delta T: ${calcul.delta_t}°C`, 15, yPos);
                yPos += 7;
            }
        } else if (calcul.pieces && calcul.pieces.length > 0) {
            doc.setFont(undefined, 'bold');
            doc.text('Détail des pièces:', 15, yPos);
            yPos += 7;
            
            doc.setFont(undefined, 'normal');
            calcul.pieces.forEach(piece => {
                doc.text(`• ${piece.nom}: ${piece.surface} m²`, 20, yPos);
                yPos += 6;
            });
        }
        
        yPos += 5;
        doc.text(`Créé le: ${app.formatDate(calcul.created_at)}`, 15, yPos);
        
        this.addFooter(doc);
        doc.save(`Calcul_PAC_${calcul.nom.replace(/\s/g, '_')}.pdf`);
    },

    // Export all calculs PAC
    async exportCalculsPac(calculs) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPos = await this.addHeader(doc, 'Liste des Calculs PAC');
        
        const tableData = calculs.map(calcul => [
            calcul.nom,
            calcul.type_pac === 'air-eau' ? 'Air/Eau' : 'Air/Air',
            calcul.client_nom || '',
            `${calcul.surface_totale} m²`,
            calcul.puissance_calculee ? `${calcul.puissance_calculee} kW` : '',
            app.formatDate(calcul.created_at)
        ]);
        
        doc.autoTable({
            head: [['Nom', 'Type', 'Client', 'Surface', 'Puissance', 'Créé le']],
            body: tableData,
            startY: yPos,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [0, 122, 255] }
        });
        
        this.addFooter(doc);
        doc.save('Liste_Calculs_PAC.pdf');
    },

    // Add footer to PDF
    addFooter(doc) {
        const pageHeight = doc.internal.pageSize.height;
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(128, 128, 128);
        
        doc.text('Généré par H2EAUX GESTION - Application de gestion pour plomberie, climatisation et chauffage', 15, pageHeight - 15);
        doc.text(`Page 1 - ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`, 15, pageHeight - 10);
    },

    // Utility functions
    formatPhone(phone) {
        if (!phone) return '';
        return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1.$2.$3.$4.$5');
    },

    getStatusLabel(status) {
        const labels = {
            'en_attente': 'En attente',
            'en_cours': 'En cours',
            'termine': 'Terminé',
            'facture': 'Facturé'
        };
        return labels[status] || status;
    },

    // Export fiche chantier avec plan 2D
    async exportFicheChantier(fiche, isPreview = false) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Configuration
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            let yPos = margin;
            
            // En-tête avec logo (si disponible)
            await this.addLogo(doc, margin, yPos);
            yPos += 30;
            
            // Titre principal
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('FICHE CHANTIER', pageWidth / 2, yPos, { align: 'center' });
            yPos += 15;
            
            // Nom de la fiche
            doc.setFontSize(14);
            doc.text(fiche.nom || 'Fiche sans nom', pageWidth / 2, yPos, { align: 'center' });
            yPos += 20;
            
            // Section Général
            yPos = this.addFicheSection(doc, 'INFORMATIONS GÉNÉRALES', [
                ['Type d\'intervention', fiche.type_intervention || ''],
                ['Date RDV', fiche.date_rdv || ''],
                ['Statut', fiche.statut || '']
            ], margin, yPos, pageWidth);
            
            // Section Client
            yPos = this.addFicheSection(doc, 'CLIENT', [
                ['Client', fiche.client_nom || ''],
                ['Téléphone', fiche.telephone || ''],
                ['Email', fiche.email || ''],
                ['Adresse', fiche.adresse || ''],
                ['Nombre de personnes', fiche.nb_personnes?.toString() || ''],
                ['Budget estimé', fiche.budget_estime || '']
            ], margin, yPos, pageWidth);
            
            // Section Logement
            yPos = this.addFicheSection(doc, 'LOGEMENT', [
                ['Type', fiche.type_logement || ''],
                ['Année construction', fiche.annee_construction?.toString() || ''],
                ['Surface', fiche.surface || ''],
                ['Isolation', fiche.isolation || ''],
                ['Menuiseries', fiche.menuiseries || '']
            ], margin, yPos, pageWidth);
            
            // Nouvelle page pour le plan 2D si présent
            if (fiche.plan_data && fiche.plan_data !== '{}') {
                doc.addPage();
                yPos = margin;
                
                // Titre section Plan 2D
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('PLAN 2D', margin, yPos);
                yPos += 15;
                
                try {
                    // Créer un canvas temporaire pour rendre le plan
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = 400;
                    tempCanvas.height = 300;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    // Rendre le plan depuis les données JSON
                    const planData = JSON.parse(fiche.plan_data);
                    this.renderPlanToPDF(tempCtx, planData, tempCanvas.width, tempCanvas.height);
                    
                    // Ajouter l'image du plan au PDF
                    const planImageData = tempCanvas.toDataURL('image/png');
                    doc.addImage(planImageData, 'PNG', margin, yPos, 160, 120);
                    yPos += 130;
                    
                    // Informations sur le plan
                    doc.setFontSize(10);
                    doc.text(`Échelle: 1:${planData.scale || 100}`, margin, yPos);
                    yPos += 10;
                    
                    if (planData.rooms && planData.rooms.length > 0) {
                        doc.text('Pièces dessinées:', margin, yPos);
                        yPos += 5;
                        planData.rooms.forEach((room, index) => {
                            doc.text(`• ${room.name} (${(room.width * planData.scale / 1000).toFixed(1)}m × ${(room.height * planData.scale / 1000).toFixed(1)}m)`, margin + 5, yPos);
                            yPos += 5;
                        });
                    }
                    
                } catch (error) {
                    console.error('Error rendering plan to PDF:', error);
                    doc.setFontSize(10);
                    doc.text('Erreur lors du rendu du plan 2D', margin, yPos);
                    yPos += 10;
                }
            }
            
            // Nouvelle page pour les autres sections
            doc.addPage();
            yPos = margin;
            
            // Section Existant
            yPos = this.addFicheSection(doc, 'INSTALLATION EXISTANTE', [
                ['Chauffage actuel', fiche.chauffage_actuel || ''],
                ['État général', fiche.etat_general || ''],
                ['Production ECS', fiche.production_ecs || ''],
                ['Observations', fiche.observations_existant || '']
            ], margin, yPos, pageWidth);
            
            // Section Besoins
            let besoins = [];
            try {
                besoins = fiche.besoins ? JSON.parse(fiche.besoins) : [];
            } catch (e) {
                besoins = [];
            }
            
            yPos = this.addFicheSection(doc, 'BESOINS ET ATTENTES', [
                ['Besoins exprimés', besoins.join(', ') || ''],
                ['Priorité', fiche.priorite || ''],
                ['Délai souhaité', fiche.delai_souhaite || ''],
                ['Contraintes', fiche.contraintes || '']
            ], margin, yPos, pageWidth);
            
            // Section Technique
            yPos = this.addFicheSection(doc, 'ASPECTS TECHNIQUES', [
                ['Compteur électrique', fiche.compteur_electrique || ''],
                ['Arrivée gaz', fiche.arrivee_gaz || ''],
                ['Évacuation eaux', fiche.evacuation_eaux || ''],
                ['Accès matériel', fiche.acces_materiel || ''],
                ['Contraintes techniques', fiche.contraintes_techniques || '']
            ], margin, yPos, pageWidth);
            
            // Section Notes et Conclusions
            yPos = this.addFicheSection(doc, 'CONCLUSIONS ET NOTES', [
                ['Solution recommandée', fiche.solution_recommandee || ''],
                ['Budget final', fiche.budget_final || ''],
                ['Délai réalisation', fiche.delai_realisation || ''],
                ['Points d\'attention', fiche.points_attention || ''],
                ['Notes', fiche.notes || '']
            ], margin, yPos, pageWidth);
            
            // Pied de page sur toutes les pages
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(`Page ${i}/${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
                doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, margin, pageHeight - 10);
            }
            
            // Sauvegarder ou prévisualiser
            const filename = `Fiche_Chantier_${(fiche.nom || 'Sans_nom').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            
            if (isPreview) {
                // Ouvrir dans un nouvel onglet pour prévisualisation
                const pdfBlob = doc.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                window.open(pdfUrl, '_blank');
            } else {
                doc.save(filename);
            }
            
        } catch (error) {
            console.error('Error exporting fiche chantier to PDF:', error);
            
            // Afficher un message d'erreur plus spécifique
            if (error.message.includes('jsPDF')) {
                throw new Error('Bibliothèque PDF non chargée. Veuillez recharger la page.');
            } else {
                throw new Error('Erreur lors de la génération du PDF: ' + error.message);
            }
        }
    },

    // Fonction utilitaire pour ajouter une section à la fiche
    addFicheSection(doc, title, fields, margin, yPos, pageWidth) {
        // Titre de section
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(title, margin, yPos);
        yPos += 10;
        
        // Ligne de séparation
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;
        
        // Champs
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        fields.forEach(([label, value]) => {
            if (value && value.trim()) {
                // Si la valeur est longue, la découper
                const maxLineLength = 60;
                if (value.length > maxLineLength) {
                    const lines = doc.splitTextToSize(value, pageWidth - margin - 60);
                    doc.setFont(undefined, 'bold');
                    doc.text(label + ':', margin, yPos);
                    doc.setFont(undefined, 'normal');
                    lines.forEach((line, index) => {
                        doc.text(line, margin + (index === 0 ? 50 : 5), yPos + (index * 5));
                    });
                    yPos += lines.length * 5 + 2;
                } else {
                    doc.setFont(undefined, 'bold');
                    doc.text(label + ':', margin, yPos);
                    doc.setFont(undefined, 'normal');
                    doc.text(value, margin + 50, yPos);
                    yPos += 6;
                }
            }
        });
        
        yPos += 10; // Espacement entre sections
        return yPos;
    },

    // Rendre le plan 2D dans un canvas pour PDF
    renderPlanToPDF(ctx, planData, width, height) {
        // Effacer le canvas
        ctx.clearRect(0, 0, width, height);
        
        // Fond blanc
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Grille légère
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 0.5;
        const gridSize = 10;
        
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Facteur d'échelle pour ajuster le plan au canvas PDF
        const scaleX = width / 800;  // 800 était la largeur originale du canvas
        const scaleY = height / 600; // 600 était la hauteur originale du canvas
        const scale = Math.min(scaleX, scaleY);
        
        // Dessiner les éléments (lignes)
        if (planData.elements) {
            planData.elements.forEach(element => {
                if (element.type === 'line' && element.points) {
                    ctx.strokeStyle = element.color || '#007AFF';
                    ctx.lineWidth = (element.width || 2) * scale;
                    ctx.beginPath();
                    
                    element.points.forEach((point, index) => {
                        const scaledX = point.x * scale;
                        const scaledY = point.y * scale;
                        
                        if (index === 0) {
                            ctx.moveTo(scaledX, scaledY);
                        } else {
                            ctx.lineTo(scaledX, scaledY);
                        }
                    });
                    ctx.stroke();
                }
            });
        }
        
        // Dessiner les pièces
        if (planData.rooms) {
            planData.rooms.forEach(room => {
                const scaledX = room.x * scale;
                const scaledY = room.y * scale;
                const scaledWidth = room.width * scale;
                const scaledHeight = room.height * scale;
                
                // Rectangle de la pièce
                ctx.strokeStyle = '#FF6B6B';
                ctx.fillStyle = 'rgba(255, 107, 107, 0.1)';
                ctx.lineWidth = 2 * scale;
                
                ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
                ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
                
                // Nom de la pièce
                ctx.fillStyle = '#333';
                ctx.font = `${12 * scale}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText(room.name, scaledX + scaledWidth / 2, scaledY + scaledHeight / 2);
                ctx.textAlign = 'start';
            });
        }
        
        // Dessiner les mesures
        if (planData.measurements) {
            planData.measurements.forEach(m => {
                const scaledStartX = m.startX * scale;
                const scaledStartY = m.startY * scale;
                const scaledEndX = m.endX * scale;
                const scaledEndY = m.endY * scale;
                
                ctx.strokeStyle = '#34C759';
                ctx.lineWidth = 2 * scale;
                ctx.beginPath();
                ctx.moveTo(scaledStartX, scaledStartY);
                ctx.lineTo(scaledEndX, scaledEndY);
                ctx.stroke();
                
                // Texte de mesure
                ctx.fillStyle = '#34C759';
                ctx.font = `${10 * scale}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText(m.text, (scaledStartX + scaledEndX) / 2, (scaledStartY + scaledEndY) / 2 - 5);
                ctx.textAlign = 'start';
            });
        }
    }
};