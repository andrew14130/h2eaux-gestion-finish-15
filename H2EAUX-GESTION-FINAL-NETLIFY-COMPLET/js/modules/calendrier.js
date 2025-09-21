// ===== CALENDRIER MODULE =====
window.calendrier = {
    currentDate: new Date(),
    currentView: 'month',
    rdvData: [],

    async load() {
        try {
            // Simulate loading RDV data
            this.rdvData = [
                {
                    id: '1',
                    title: 'Visite technique Dupont',
                    client: 'Dupont Jean',
                    type: 'visite_technique',
                    date: new Date(),
                    time: '09:00',
                    duration: 120,
                    status: 'confirme'
                },
                {
                    id: '2',
                    title: 'Installation PAC Martin',
                    client: 'Martin Pierre',
                    type: 'installation',
                    date: new Date(Date.now() + 86400000 * 2),
                    time: '14:00',
                    duration: 240,
                    status: 'planifie'
                }
            ];
            this.render();
        } catch (error) {
            console.error('Error loading calendar:', error);
            this.rdvData = [];
            this.render();
        }
    },

    render() {
        const container = document.getElementById('calendarContainer');
        
        container.innerHTML = `
            <div class="calendar-header">
                <div class="calendar-nav">
                    <button class="btn-nav" onclick="calendrier.previousPeriod()">‹</button>
                    <h3 class="calendar-title">${this.getCalendarTitle()}</h3>
                    <button class="btn-nav" onclick="calendrier.nextPeriod()">›</button>
                </div>
                <div class="calendar-views">
                    <button class="btn-view ${this.currentView === 'month' ? 'active' : ''}" onclick="calendrier.changeView('month')">Mois</button>
                    <button class="btn-view ${this.currentView === 'week' ? 'active' : ''}" onclick="calendrier.changeView('week')">Semaine</button>
                    <button class="btn-view ${this.currentView === 'day' ? 'active' : ''}" onclick="calendrier.changeView('day')">Jour</button>
                </div>
                <button class="btn-primary" onclick="calendrier.showAddRdvModal()">+ Nouveau RDV</button>
            </div>
            <div class="calendar-content">
                ${this.renderCalendarView()}
            </div>
        `;
    },

    getCalendarTitle() {
        const months = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        
        switch (this.currentView) {
            case 'month':
                return `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
            case 'week':
                const startWeek = new Date(this.currentDate);
                startWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
                const endWeek = new Date(startWeek);
                endWeek.setDate(startWeek.getDate() + 6);
                return `${startWeek.getDate()} - ${endWeek.getDate()} ${months[startWeek.getMonth()]} ${startWeek.getFullYear()}`;
            case 'day':
                return `${this.currentDate.getDate()} ${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        }
    },

    renderCalendarView() {
        switch (this.currentView) {
            case 'month':
                return this.renderMonthView();
            case 'week':
                return this.renderWeekView();
            case 'day':
                return this.renderDayView();
            default:
                return this.renderMonthView();
        }
    },

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let html = `
            <div class="calendar-month">
                <div class="calendar-weekdays">
                    <div class="weekday">Dim</div>
                    <div class="weekday">Lun</div>
                    <div class="weekday">Mar</div>
                    <div class="weekday">Mer</div>
                    <div class="weekday">Jeu</div>
                    <div class="weekday">Ven</div>
                    <div class="weekday">Sam</div>
                </div>
                <div class="calendar-days">
        `;

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.toDateString() === new Date().toDateString();
            const dayRdv = this.getRdvForDate(date);
            
            html += `
                <div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}"
                     onclick="calendrier.selectDate('${date.toISOString()}')">
                    <div class="day-number">${date.getDate()}</div>
                    <div class="day-events">
                        ${dayRdv.map(rdv => `
                            <div class="day-event ${rdv.type}" title="${rdv.title}">
                                ${rdv.time} ${rdv.client}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += `</div></div>`;
        return html;
    },

    renderWeekView() {
        const startWeek = new Date(this.currentDate);
        startWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
        
        let html = `
            <div class="calendar-week">
                <div class="week-header">
                    <div class="time-column"></div>
        `;
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startWeek);
            date.setDate(startWeek.getDate() + i);
            const isToday = date.toDateString() === new Date().toDateString();
            
            html += `
                <div class="week-day-header ${isToday ? 'today' : ''}">
                    <div class="day-name">${['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][i]}</div>
                    <div class="day-date">${date.getDate()}</div>
                </div>
            `;
        }
        
        html += `</div><div class="week-content">`;
        
        // Time slots
        for (let hour = 8; hour < 19; hour++) {
            html += `
                <div class="week-hour">
                    <div class="time-column">${hour}:00</div>
            `;
            
            for (let day = 0; day < 7; day++) {
                const date = new Date(startWeek);
                date.setDate(startWeek.getDate() + day);
                const hourRdv = this.getRdvForDateTime(date, hour);
                
                html += `
                    <div class="week-slot" onclick="calendrier.selectDateTime('${date.toISOString()}', ${hour})">
                        ${hourRdv.map(rdv => `
                            <div class="week-event ${rdv.type}" title="${rdv.title}">
                                ${rdv.title}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            html += `</div>`;
        }
        
        html += `</div></div>`;
        return html;
    },

    renderDayView() {
        const dayRdv = this.getRdvForDate(this.currentDate);
        
        let html = `
            <div class="calendar-day-view">
                <div class="day-timeline">
        `;
        
        for (let hour = 8; hour < 19; hour++) {
            const hourRdv = dayRdv.filter(rdv => parseInt(rdv.time) === hour);
            
            html += `
                <div class="timeline-hour">
                    <div class="hour-label">${hour}:00</div>
                    <div class="hour-content" onclick="calendrier.selectDateTime('${this.currentDate.toISOString()}', ${hour})">
                        ${hourRdv.map(rdv => `
                            <div class="timeline-event ${rdv.type}">
                                <div class="event-time">${rdv.time}</div>
                                <div class="event-title">${rdv.title}</div>
                                <div class="event-client">${rdv.client}</div>
                                <div class="event-duration">${rdv.duration} min</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        html += `</div></div>`;
        return html;
    },

    getRdvForDate(date) {
        return this.rdvData.filter(rdv => 
            rdv.date.toDateString() === date.toDateString()
        );
    },

    getRdvForDateTime(date, hour) {
        return this.rdvData.filter(rdv => 
            rdv.date.toDateString() === date.toDateString() && 
            parseInt(rdv.time) === hour
        );
    },

    previousPeriod() {
        switch (this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
        }
        this.render();
    },

    nextPeriod() {
        switch (this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
        }
        this.render();
    },

    changeView(view) {
        this.currentView = view;
        this.render();
    },

    selectDate(dateString) {
        this.currentDate = new Date(dateString);
        this.changeView('day');
    },

    selectDateTime(dateString, hour) {
        // Open add RDV modal with pre-selected date and time
        this.showAddRdvModal(new Date(dateString), `${hour}:00`);
    },

    async showAddRdvModal(preSelectedDate = null, preSelectedTime = null) {
        // Load clients for dropdown
        let clientsOptions = '<option value="">Sélectionner un client</option>';
        try {
            const clients = await app.apiCall('/clients');
            clientsOptions += clients.map(client => 
                `<option value="${client.nom} ${client.prenom || ''}">
                    ${client.nom} ${client.prenom || ''}
                </option>`
            ).join('');
        } catch (error) {
            console.error('Error loading clients:', error);
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Nouveau Rendez-vous</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="rdvForm">
                        <div class="form-group">
                            <label>Titre du RDV *</label>
                            <input type="text" id="rdvTitle" required placeholder="Ex: Visite technique, Installation...">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Client</label>
                                <select id="rdvClient">${clientsOptions}</select>
                            </div>
                            <div class="form-group">
                                <label>Type de RDV</label>
                                <select id="rdvType">
                                    <option value="visite_technique">Visite technique</option>
                                    <option value="releve">Relevé existant</option>
                                    <option value="installation">Installation</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="autre">Autre</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date *</label>
                                <input type="date" id="rdvDate" required value="${preSelectedDate ? preSelectedDate.toISOString().split('T')[0] : ''}">
                            </div>
                            <div class="form-group">
                                <label>Heure *</label>
                                <input type="time" id="rdvTime" required value="${preSelectedTime || '09:00'}">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Durée (minutes)</label>
                                <select id="rdvDuration">
                                    <option value="60">1 heure</option>
                                    <option value="120" selected>2 heures</option>
                                    <option value="180">3 heures</option>
                                    <option value="240">4 heures</option>
                                    <option value="480">Journée complète</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Statut</label>
                                <select id="rdvStatus">
                                    <option value="planifie">Planifié</option>
                                    <option value="confirme">Confirmé</option>
                                    <option value="en_cours">En cours</option>
                                    <option value="termine">Terminé</option>
                                    <option value="annule">Annulé</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="rdvNotes" rows="3" placeholder="Notes complémentaires..."></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn-primary" onclick="calendrier.saveRdv()">Enregistrer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.querySelector('#rdvTitle').focus();
        }, 100);
    },

    saveRdv() {
        const formData = {
            title: document.getElementById('rdvTitle').value.trim(),
            client: document.getElementById('rdvClient').value,
            type: document.getElementById('rdvType').value,
            date: new Date(document.getElementById('rdvDate').value),
            time: document.getElementById('rdvTime').value,
            duration: parseInt(document.getElementById('rdvDuration').value),
            status: document.getElementById('rdvStatus').value,
            notes: document.getElementById('rdvNotes').value.trim()
        };

        if (!formData.title || !formData.date || !formData.time) {
            app.showMessage('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }

        try {
            const newRdv = {
                ...formData,
                id: Date.now().toString()
            };
            
            this.rdvData.push(newRdv);
            this.render();
            
            app.showMessage('Rendez-vous créé avec succès', 'success');
            document.querySelector('.modal').remove();
        } catch (error) {
            console.error('Error saving RDV:', error);
            app.showMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
        }
    },

    // Alias for showAddRdvModal to match HTML interface
    showAddModal() {
        this.showAddRdvModal();
    },

    async exportCalendar() {
        try {
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text('Planning H2EAUX GESTION', 20, 20);
            
            doc.setFontSize(10);
            const monthName = this.currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            doc.text(`Planning du mois : ${monthName}`, 20, 30);
            doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 36);
            
            // Filter RDV for current month
            const currentMonth = this.currentDate.getMonth();
            const currentYear = this.currentDate.getFullYear();
            const monthRdv = this.rdvData.filter(rdv => 
                rdv.date.getMonth() === currentMonth && 
                rdv.date.getFullYear() === currentYear
            ).sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (monthRdv.length === 0) {
                doc.text('Aucun rendez-vous planifié ce mois-ci', 20, 50);
            } else {
                // Table data
                const tableData = monthRdv.map(rdv => [
                    rdv.date.toLocaleDateString('fr-FR'),
                    rdv.time,
                    rdv.title,
                    rdv.client || '-',
                    this.getTypeLabel(rdv.type),
                    this.getStatusLabel(rdv.status),
                    rdv.duration + ' min'
                ]);
                
                doc.autoTable({
                    head: [['Date', 'Heure', 'Titre', 'Client', 'Type', 'Statut', 'Durée']],
                    body: tableData,
                    startY: 45,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [0, 122, 255] },
                    columnStyles: {
                        0: { cellWidth: 25 },
                        1: { cellWidth: 20 },
                        2: { cellWidth: 40 },
                        3: { cellWidth: 35 },
                        4: { cellWidth: 25 },
                        5: { cellWidth: 25 },
                        6: { cellWidth: 20 }
                    }
                });
            }
            
            doc.save(`planning-h2eaux-${monthName.replace(' ', '-')}.pdf`);
            app.showMessage('Planning exporté avec succès', 'success');
            
        } catch (error) {
            console.error('Error exporting calendar:', error);
            app.showMessage('Erreur lors de l\'export PDF', 'error');
        }
    },

    getTypeLabel(type) {
        const types = {
            'visite_technique': 'Visite technique',
            'releve': 'Relevé',
            'installation': 'Installation',
            'maintenance': 'Maintenance',
            'autre': 'Autre'
        };
        return types[type] || type;
    },

    getStatusLabel(status) {
        const statuses = {
            'planifie': 'Planifié',
            'confirme': 'Confirmé',
            'en_cours': 'En cours',
            'termine': 'Terminé',
            'annule': 'Annulé'
        };
        return statuses[status] || status;
    }
};