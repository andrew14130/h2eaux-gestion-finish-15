// ===== OFFLINE MANAGER =====
class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        this.syncInProgress = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadOfflineQueue();
        this.updateOnlineStatus();
    }

    setupEventListeners() {
        // Online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateOnlineStatus();
            this.processPendingActions();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateOnlineStatus();
        });

        // Service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', event => {
                this.handleServiceWorkerMessage(event.data);
            });
        }

        // Visibility change - sync when app becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                this.syncOfflineData();
            }
        });
    }

    updateOnlineStatus() {
        const statusIndicator = this.createStatusIndicator();
        
        // Update existing indicator or create new one
        let existingIndicator = document.getElementById('offline-status');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        if (!this.isOnline) {
            document.body.appendChild(statusIndicator);
        }

        // Update app interface
        this.updateAppInterface();
    }

    createStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offline-status';
        indicator.className = 'offline-indicator';
        indicator.innerHTML = `
            <div class="offline-content">
                <span class="offline-icon">📴</span>
                <span class="offline-text">Mode hors ligne</span>
                <span class="offline-queue" id="offline-queue-count">${this.offlineQueue.length}</span>
            </div>
        `;
        
        // Add styles
        indicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            color: white;
            padding: 10px;
            text-align: center;
            z-index: 10000;
            font-weight: 500;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            animation: slideDown 0.3s ease-out;
        `;

        return indicator;
    }

    updateAppInterface() {
        // Add offline class to body
        document.body.classList.toggle('offline-mode', !this.isOnline);

        // Update buttons and forms
        const submitButtons = document.querySelectorAll('button[type="submit"], .btn-primary');
        submitButtons.forEach(button => {
            if (!this.isOnline) {
                button.setAttribute('data-original-text', button.textContent);
                button.textContent = '📴 ' + button.textContent;
                button.title = 'Action sera synchronisée une fois en ligne';
            } else if (button.getAttribute('data-original-text')) {
                button.textContent = button.getAttribute('data-original-text');
                button.removeAttribute('data-original-text');
                button.title = '';
            }
        });
    }

    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'SYNC_COMPLETE':
                this.onSyncComplete(data.processedCount);
                break;
                
            case 'UPDATE_AVAILABLE':
                this.showUpdateNotification(data.version);
                break;
                
            case 'OFFLINE_ACTION_QUEUED':
                this.addToOfflineQueue(data.action);
                break;
        }
    }

    // ===== OFFLINE QUEUE MANAGEMENT =====
    async loadOfflineQueue() {
        try {
            const saved = localStorage.getItem('h2eaux_offline_queue');
            this.offlineQueue = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load offline queue:', error);
            this.offlineQueue = [];
        }
    }

    saveOfflineQueue() {
        try {
            localStorage.setItem('h2eaux_offline_queue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.error('Failed to save offline queue:', error);
        }
    }

    addToOfflineQueue(action) {
        this.offlineQueue.push({
            id: Date.now(),
            action: action,
            timestamp: new Date().toISOString(),
            status: 'pending'
        });
        
        this.saveOfflineQueue();
        this.updateQueueDisplay();
    }

    updateQueueDisplay() {
        const queueDisplay = document.getElementById('offline-queue-count');
        if (queueDisplay) {
            queueDisplay.textContent = this.offlineQueue.filter(item => item.status === 'pending').length;
        }
    }

    // ===== SYNC OPERATIONS =====
    async processPendingActions() {
        if (this.syncInProgress || !this.isOnline) return;
        
        this.syncInProgress = true;
        
        try {
            // Trigger service worker sync
            if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('process-offline-queue');
            }
            
            // Also sync app data
            await this.syncOfflineData();
            
        } catch (error) {
            console.error('Failed to process pending actions:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    async syncOfflineData() {
        if (!this.isOnline) return;
        
        try {
            // Refresh all module data
            if (window.app && window.app.state.isLoggedIn) {
                await window.app.loadAppData();
                
                // Reload current module
                const currentModule = window.app.state.currentModule;
                if (currentModule && window.app.loadModuleData) {
                    window.app.loadModuleData(currentModule);
                }
            }
            
            console.log('Offline data synced successfully');
        } catch (error) {
            console.error('Failed to sync offline data:', error);
        }
    }

    onSyncComplete(processedCount) {
        // Remove processed items from local queue
        this.offlineQueue = this.offlineQueue.filter(item => item.status !== 'synced');
        this.saveOfflineQueue();
        this.updateQueueDisplay();
        
        // Show success message
        if (processedCount > 0) {
            this.showSyncNotification(processedCount);
        }
    }

    // ===== UPDATE SYSTEM =====
    showUpdateNotification(newVersion) {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <h4>🔄 Mise à jour disponible</h4>
                <p>Version ${newVersion} disponible</p>
                <div class="update-actions">
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Plus tard
                    </button>
                    <button class="btn-primary" onclick="offlineManager.performUpdate()">
                        Mettre à jour
                    </button>
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10001;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    async performUpdate() {
        try {
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            // Unregister service worker
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }
            
            // Show updating message
            this.showUpdatingMessage();
            
            // Reload page
            setTimeout(() => {
                window.location.reload(true);
            }, 2000);
            
        } catch (error) {
            console.error('Update failed:', error);
            alert('Erreur lors de la mise à jour. Veuillez rafraîchir manuellement.');
        }
    }

    showUpdatingMessage() {
        const overlay = document.createElement('div');
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
            font-size: 1.2rem;
            z-index: 10002;
        `;
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div class="spinner" style="margin-bottom: 20px;"></div>
                <div>🔄 Mise à jour en cours...</div>
                <div style="font-size: 0.9rem; margin-top: 10px; opacity: 0.8;">
                    Veuillez patienter
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    showSyncNotification(count) {
        const notification = document.createElement('div');
        notification.className = 'sync-notification';
        notification.innerHTML = `
            <div class="sync-content">
                <span class="sync-icon">✅</span>
                <span class="sync-text">${count} action(s) synchronisée(s)</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00d2d3, #54a0ff);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10001;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ===== STORAGE MANAGEMENT =====
    async checkStorageQuota() {
        if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
            return null;
        }
        
        try {
            const estimate = await navigator.storage.estimate();
            const usedMB = Math.round(estimate.usage / (1024 * 1024));
            const quotaMB = Math.round(estimate.quota / (1024 * 1024));
            const usagePercent = Math.round((estimate.usage / estimate.quota) * 100);
            
            return {
                used: usedMB,
                quota: quotaMB,
                percentage: usagePercent
            };
        } catch (error) {
            console.error('Failed to check storage quota:', error);
            return null;
        }
    }

    async cleanupOfflineData() {
        try {
            // Clean old cache entries
            const cacheNames = await caches.keys();
            const oldCaches = cacheNames.filter(name => 
                name.includes('h2eaux') && !name.includes('v3.0.0')
            );
            
            await Promise.all(oldCaches.map(name => caches.delete(name)));
            
            // Clean old queue items (older than 7 days)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            this.offlineQueue = this.offlineQueue.filter(item => 
                new Date(item.timestamp) > weekAgo
            );
            
            this.saveOfflineQueue();
            
            console.log('Offline data cleanup completed');
        } catch (error) {
            console.error('Failed to cleanup offline data:', error);
        }
    }

    // ===== DIAGNOSTICS =====
    async getDiagnosticInfo() {
        const info = {
            online: this.isOnline,
            queueSize: this.offlineQueue.length,
            serviceWorkerSupported: 'serviceWorker' in navigator,
            syncSupported: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
            storage: await this.checkStorageQuota()
        };
        
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                info.serviceWorkerActive = !!registration?.active;
                info.serviceWorkerWaiting = !!registration?.waiting;
            } catch (error) {
                info.serviceWorkerError = error.message;
            }
        }
        
        return info;
    }
}

// ===== INITIALIZE OFFLINE MANAGER =====
window.offlineManager = new OfflineManager();

// ===== ADD OFFLINE STYLES =====
const offlineStyles = document.createElement('style');
offlineStyles.textContent = `
    @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); }
        to { transform: translateX(100%); }
    }
    
    .offline-mode {
        filter: grayscale(0.2);
    }
    
    .offline-mode .nav-item:hover {
        background-color: rgba(255, 107, 107, 0.1) !important;
    }
    
    .update-notification h4 {
        margin: 0 0 10px 0;
        color: #333;
    }
    
    .update-notification p {
        margin: 0 0 15px 0;
        color: #666;
    }
    
    .update-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }
    
    .update-actions button {
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
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
`;

document.head.appendChild(offlineStyles);

console.log('Offline Manager initialized successfully');