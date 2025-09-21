// Configuration H2eaux Gestion - Version Autonome
// Cette configuration fonctionne de manière permanente sans dépendance externe
window.H2EAUX_CONFIG = {
    // Mode autonome - l'application fonctionne avec des données locales
    API_URL: 'LOCAL_STORAGE',
    
    // Configuration application
    APP_NAME: 'H2eaux Gestion',
    VERSION: '3.0.0',
    
    // Mode de fonctionnement
    MODE: 'AUTONOMOUS', // Mode autonome permanent
    
    // Fonctionnalités
    ENABLE_OFFLINE: true,
    ENABLE_NOTIFICATIONS: true,
    
    // Configuration pour futur backend (optionnel)
    FUTURE_BACKEND_URL: 'https://votre-backend-futur.com/api'
};