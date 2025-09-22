// ===== CALCULS PAC MODULE =====
window.calculsPac = {
    async load() {
        this.render();
    },

    render() {
        // Le contenu est maintenant directement dans le HTML
        console.log('Module PAC - Page de sélection chargée');
    },

    showPacAirEau() {
        window.app.showModule('calculs-pac-air-eau');
    },

    showPacAirAir() {
        window.app.showModule('calculs-pac-air-air');
    }

};