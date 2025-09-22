// ===== AUTO-UPDATE MANAGER =====
class UpdateManager {
    constructor() {
        this.currentVersion = '3.5.0';
        this.checkInterval = 3600000; // 1 hour
        this.updateChannel = 'stable'; // stable, beta, dev
        this.config = {
            autoDownload: true,
            autoInstall: false,
            notifyUser: true,
            backgroundCheck: true
        };
        
        this.init();
    }

    init() {
        this.loadConfig();
        this.setupEventListeners();
        
        if (this.config.backgroundCheck) {
            this.startPeriodicCheck();
        }
        
        // Check on app start
        setTimeout(() => this.checkForUpdates(), 5000);
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('h2eaux_update_config');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load update config:', error);
        }
    }

    saveConfig() {
        try {
            localStorage.setItem('h2eaux_update_config', JSON.stringify(this.config));
        } catch (error) {
            console.error('Failed to save update config:', error);
        }
    }

    setupEventListeners() {
        // Service worker update events
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data.type === 'UPDATE_AVAILABLE') {
                    this.handleUpdateAvailable(event.data);
                }
            });

            // Check for waiting service worker
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service Worker controller changed - reloading');
                window.location.reload();
            });
        }

        // Visibility change - check when app becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        });

        // Network status change
        window.addEventListener('online', () => {
            setTimeout(() => this.checkForUpdates(), 1000);
        });
    }

    startPeriodicCheck() {
        setInterval(() => {
            if (navigator.onLine) {
                this.checkForUpdates();
            }
        }, this.checkInterval);
    }

    // ===== UPDATE CHECKING =====
    async checkForUpdates() {
        try {
            const versionInfo = await this.fetchVersionInfo();
            
            if (this.isUpdateAvailable(versionInfo)) {
                await this.handleUpdateAvailable({
                    version: versionInfo.version,
                    current: this.currentVersion,
                    info: versionInfo
                });
            }
            
            this.updateLastCheckTime();
            
        } catch (error) {
            console.error('Update check failed:', error);
        }
    }

    async fetchVersionInfo() {
        const response = await fetch('/version.json?' + Date.now());
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    }

    isUpdateAvailable(versionInfo) {
        return this.compareVersions(versionInfo.version, this.currentVersion) > 0;
    }

    compareVersions(version1, version2) {
        const v1parts = version1.split('.').map(Number);
        const v2parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
            const v1part = v1parts[i] || 0;
            const v2part = v2parts[i] || 0;
            
            if (v1part > v2part) return 1;
            if (v1part < v2part) return -1;
        }
        
        return 0;
    }

    updateLastCheckTime() {
        localStorage.setItem('h2eaux_last_update_check', new Date().toISOString());
    }

    // ===== UPDATE HANDLING =====
    async handleUpdateAvailable(updateData) {
        const { version, current, info } = updateData;
        
        console.log(`Update available: ${current} -> ${version}`);
        
        // Check if we should auto-download
        if (this.config.autoDownload) {
            await this.downloadUpdate();
        }
        
        // Check if we should auto-install
        if (this.config.autoInstall && !info.criticalUpdate) {
            await this.installUpdate();
            return;
        }
        
        // Show user notification
        if (this.config.notifyUser) {
            this.showUpdateNotification(updateData);
        }
    }

    async downloadUpdate() {
        try {
            console.log('Downloading update in background...');
            
            // Trigger service worker to cache new version
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration.active) {
                    registration.active.postMessage({ type: 'DOWNLOAD_UPDATE' });
                }
            }
            
        } catch (error) {
            console.error('Failed to download update:', error);
        }
    }

    async installUpdate() {
        try {
            console.log('Installing update...');
            
            // Show loading indicator
            this.showInstallProgress();
            
            // Clear old caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                const oldCaches = cacheNames.filter(name => 
                    name.includes('h2eaux') && !name.includes('v3.0.0')
                );
                await Promise.all(oldCaches.map(name => caches.delete(name)));
            }
            
            // Update service worker
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    return;
                }
            }
            
            // Force reload
            setTimeout(() => {
                window.location.reload(true);
            }, 2000);
            
        } catch (error) {
            console.error('Failed to install update:', error);
            this.hideInstallProgress();
            this.showErrorMessage('Échec de la mise à jour. Veuillez réessayer.');
        }
    }

    // ===== UI NOTIFICATIONS =====
    showUpdateNotification(updateData) {
        const { version, info } = updateData;
        const isCritical = info.criticalUpdate;
        
        const notification = document.createElement('div');
        notification.className = `update-notification ${isCritical ? 'critical' : ''}`;
        notification.innerHTML = `
            <div class="update-content">
                <div class="update-header">
                    <span class="update-icon">${isCritical ? '🔴' : '🔄'}</span>
                    <h4>Mise à jour ${isCritical ? 'critique' : 'disponible'}</h4>
                    <button class="update-close" onclick="this.closest('.update-notification').remove()">×</button>
                </div>
                
                <div class="update-body">
                    <p><strong>Version ${version}</strong> est maintenant disponible</p>
                    ${this.renderChangelog(info.changelog[version])}
                </div>
                
                <div class="update-actions">
                    ${!isCritical ? `
                        <button class="btn-secondary" onclick="updateManager.postponeUpdate()">
                            Plus tard
                        </button>
                    ` : ''}
                    <button class="btn-primary" onclick="updateManager.userInitiatedUpdate()">
                        ${isCritical ? 'Mettre à jour maintenant' : 'Installer'}
                    </button>
                </div>
                
                <div class="update-info">
                    <small>
                        📦 Taille: ~${info.performance.appSize} • 
                        ⚡ Temps d'installation: <30s
                    </small>
                </div>
            </div>
        `;
        
        this.styleUpdateNotification(notification, isCritical);
        document.body.appendChild(notification);
        
        // Auto-remove after 30 seconds (except critical updates)
        if (!isCritical) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 30000);
        }
    }

    renderChangelog(changelogEntry) {
        if (!changelogEntry || !changelogEntry.changes) return '';
        
        return `
            <div class="changelog">
                <p><strong>Nouveautés:</strong></p>
                <ul>
                    ${changelogEntry.changes.slice(0, 3).map(change => 
                        `<li>${change}</li>`
                    ).join('')}
                    ${changelogEntry.changes.length > 3 ? 
                        `<li><em>...et ${changelogEntry.changes.length - 3} autres améliorations</em></li>` : 
                        ''
                    }
                </ul>
            </div>
        `;
    }

    styleUpdateNotification(notification, isCritical) {
        const baseStyle = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            z-index: 10001;
            animation: slideInRight 0.4s ease-out;
            border-left: 4px solid ${isCritical ? '#f44336' : '#4CAF50'};
        `;
        
        notification.style.cssText = baseStyle;
    }

    showInstallProgress() {
        const overlay = document.createElement('div');
        overlay.id = 'update-progress';
        overlay.innerHTML = `
            <div class="progress-content">
                <div class="progress-spinner"></div>
                <h3>🔄 Mise à jour en cours</h3>
                <p>Installation de la nouvelle version...</p>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <small>Veuillez ne pas fermer l'application</small>
            </div>
        `;
        
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            backdrop-filter: blur(5px);
        `;
        
        document.body.appendChild(overlay);
        
        // Animate progress bar
        setTimeout(() => {
            const progressFill = overlay.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '100%';
            }
        }, 500);
    }

    hideInstallProgress() {
        const overlay = document.getElementById('update-progress');
        if (overlay) {
            overlay.remove();
        }
    }

    showErrorMessage(message) {
        const errorNotification = document.createElement('div');
        errorNotification.className = 'error-notification';
        errorNotification.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        errorNotification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10001;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(errorNotification);
        
        setTimeout(() => errorNotification.remove(), 5000);
    }

    // ===== USER ACTIONS =====
    postponeUpdate() {
        document.querySelector('.update-notification')?.remove();
        
        // Postpone for 4 hours
        const postponeUntil = new Date(Date.now() + 4 * 60 * 60 * 1000);
        localStorage.setItem('h2eaux_update_postponed', postponeUntil.toISOString());
    }

    async userInitiatedUpdate() {
        document.querySelector('.update-notification')?.remove();
        await this.installUpdate();
    }

    // ===== CONFIGURATION =====
    setUpdateConfig(config) {
        this.config = { ...this.config, ...config };
        this.saveConfig();
    }

    getUpdateConfig() {
        return { ...this.config };
    }

    // ===== DIAGNOSTICS =====
    async getUpdateInfo() {
        const lastCheck = localStorage.getItem('h2eaux_last_update_check');
        const postponed = localStorage.getItem('h2eaux_update_postponed');
        
        let serviceWorkerInfo = null;
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                serviceWorkerInfo = {
                    active: !!registration?.active,
                    waiting: !!registration?.waiting,
                    installing: !!registration?.installing
                };
            } catch (error) {
                serviceWorkerInfo = { error: error.message };
            }
        }
        
        return {
            currentVersion: this.currentVersion,
            updateChannel: this.updateChannel,
            config: this.config,
            lastCheck: lastCheck ? new Date(lastCheck).toLocaleString() : 'Jamais',
            postponedUntil: postponed ? new Date(postponed).toLocaleString() : null,
            serviceWorker: serviceWorkerInfo
        };
    }
}

// ===== INITIALIZE UPDATE MANAGER =====
window.updateManager = new UpdateManager();

// ===== ADD UPDATE STYLES =====
const updateStyles = document.createElement('style');
updateStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .update-notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .update-notification.critical {
        border-left-color: #f44336 !important;
    }
    
    .update-header {
        display: flex;
        align-items: center;
        padding: 15px 20px 10px;
        border-bottom: 1px solid #eee;
    }
    
    .update-icon {
        font-size: 1.2rem;
        margin-right: 10px;
    }
    
    .update-header h4 {
        flex: 1;
        margin: 0;
        color: #333;
        font-size: 1.1rem;
    }
    
    .update-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 24px;
        height: 24px;
    }
    
    .update-body {
        padding: 15px 20px;
    }
    
    .update-body p {
        margin: 0 0 10px;
        color: #555;
    }
    
    .changelog {
        margin-top: 10px;
    }
    
    .changelog ul {
        margin: 5px 0 0 20px;
        padding: 0;
    }
    
    .changelog li {
        margin: 3px 0;
        font-size: 0.9rem;
        color: #666;
    }
    
    .update-actions {
        display: flex;
        gap: 10px;
        padding: 15px 20px;
        border-top: 1px solid #eee;
        justify-content: flex-end;
    }
    
    .update-actions button {
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
    }
    
    .update-actions .btn-primary {
        background: #007AFF;
        color: white;
        border-color: #007AFF;
    }
    
    .update-actions .btn-secondary {
        background: white;
        color: #666;
    }
    
    .update-info {
        padding: 0 20px 15px;
        text-align: center;
        color: #888;
    }
    
    .progress-content {
        text-align: center;
        background: rgba(255,255,255,0.1);
        padding: 40px;
        border-radius: 12px;
        backdrop-filter: blur(10px);
    }
    
    .progress-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255,255,255,0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }
    
    .progress-bar {
        width: 200px;
        height: 4px;
        background: rgba(255,255,255,0.3);
        border-radius: 2px;
        margin: 20px auto;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background: #4CAF50;
        width: 0%;
        transition: width 2s ease-in-out;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

document.head.appendChild(updateStyles);

console.log('Update Manager initialized successfully');