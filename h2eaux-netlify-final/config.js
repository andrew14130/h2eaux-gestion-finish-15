// Configuration H2eaux Gestion - Netlify Build
// IMPORTANT: Modifiez l'URL du backend ci-dessous pour pointer vers votre serveur
window.H2EAUX_CONFIG = {
    // ⚠️ MODIFIEZ CETTE URL POUR VOTRE BACKEND DÉPLOYÉ
    API_URL: 'https://votre-backend.herokuapp.com/api',
    
    // Configuration application
    APP_NAME: 'H2eaux Gestion',
    VERSION: '3.0.0',
    
    // Sécurité
    DEBUG: false,
    
    // Fonctionnalités
    ENABLE_OFFLINE: true,
    ENABLE_NOTIFICATIONS: true,
    
    // Identifiants de test (à changer en production)
    TEST_CREDENTIALS: {
        admin: { username: 'admin', password: 'admin123' },
        employee: { username: 'employe1', password: 'employe123' }
    }
};