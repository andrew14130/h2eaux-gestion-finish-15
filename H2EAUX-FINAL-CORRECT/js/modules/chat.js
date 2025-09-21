// ===== CHAT ÉQUIPE MODULE =====
window.chat = {
    messages: [],
    currentUser: 'admin',
    isOnline: true,

    async load() {
        // Simulate loading chat messages
        this.messages = [
            {
                id: '1',
                user: 'employe1',
                username: 'Jean Dupont',
                message: 'Bonjour équipe ! RDV client Martin reporté à 14h.',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                type: 'message'
            },
            {
                id: '2',
                user: 'system',
                username: 'Système',
                message: 'Nouveau chantier créé : Installation PAC Dupont',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                type: 'system'
            },
            {
                id: '3',
                user: 'admin',
                username: 'Admin',
                message: 'Parfait, merci pour l\'info Jean.',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                type: 'message'
            }
        ];
        
        this.render();
    },

    render() {
        const container = document.getElementById('chatContainer');
        
        container.innerHTML = `
            <div class="chat-header">
                <div class="chat-title">
                    <h3>💬 Chat Équipe</h3>
                    <div class="online-status ${this.isOnline ? 'online' : 'offline'}">
                        ${this.isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
                    </div>
                </div>
                <div class="chat-users">
                    <div class="user-status online">👤 Admin</div>
                    <div class="user-status online">👤 Jean Dupont</div>
                    <div class="user-status offline">👤 Marie Martin</div>
                </div>
            </div>
            
            <div class="chat-messages" id="chatMessages">
                ${this.renderMessages()}
            </div>
            
            <div class="chat-input-area">
                <div class="message-input-container">
                    <input type="text" id="messageInput" placeholder="Tapez votre message..." 
                           onkeypress="if(event.key==='Enter') chat.sendMessage()">
                    <button class="btn-send" onclick="chat.sendMessage()">📤</button>
                </div>
                <div class="chat-actions">
                    <button class="btn-action" onclick="chat.sendQuickMessage('👍')">👍</button>
                    <button class="btn-action" onclick="chat.sendQuickMessage('❓')">❓</button>
                    <button class="btn-action" onclick="chat.sendQuickMessage('⚠️')">⚠️</button>
                    <button class="btn-action" onclick="chat.sendQuickMessage('✅')">✅</button>
                </div>
            </div>
        `;

        // Auto-scroll to bottom
        setTimeout(() => {
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    },

    renderMessages() {
        return this.messages.map(msg => {
            const isOwnMessage = msg.user === this.currentUser;
            const messageTime = new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            if (msg.type === 'system') {
                return `
                    <div class="message system-message">
                        <div class="message-content">
                            <div class="system-icon">ℹ️</div>
                            <div class="system-text">${msg.message}</div>
                            <div class="message-time">${messageTime}</div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="message ${isOwnMessage ? 'own-message' : 'other-message'}">
                    <div class="message-header">
                        <div class="message-user">${msg.username}</div>
                        <div class="message-time">${messageTime}</div>
                    </div>
                    <div class="message-content">
                        ${msg.message}
                    </div>
                    ${isOwnMessage ? '<div class="message-status">✓</div>' : ''}
                </div>
            `;
        }).join('');
    },

    sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message) return;

        const newMessage = {
            id: Date.now().toString(),
            user: this.currentUser,
            username: this.currentUser === 'admin' ? 'Admin' : 'Utilisateur',
            message: message,
            timestamp: new Date().toISOString(),
            type: 'message'
        };

        this.messages.push(newMessage);
        input.value = '';
        this.render();

        // Simulate response after 2-3 seconds
        if (Math.random() > 0.3) {
            setTimeout(() => {
                this.simulateResponse();
            }, 2000 + Math.random() * 3000);
        }
    },

    sendQuickMessage(emoji) {
        const quickMessage = {
            id: Date.now().toString(),
            user: this.currentUser,
            username: this.currentUser === 'admin' ? 'Admin' : 'Utilisateur',
            message: emoji,
            timestamp: new Date().toISOString(),
            type: 'message'
        };

        this.messages.push(quickMessage);
        this.render();
    },

    simulateResponse() {
        const responses = [
            'Reçu !',
            'D\'accord, je m\'en occupe.',
            'Merci pour l\'info.',
            'Parfait, à plus tard.',
            'Ok, je note.',
            'C\'est noté, merci !',
            'Bien reçu l\'information.'
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const responseMessage = {
            id: Date.now().toString(),
            user: 'employe1',
            username: 'Jean Dupont',
            message: randomResponse,
            timestamp: new Date().toISOString(),
            type: 'message'
        };

        this.messages.push(responseMessage);
        this.render();
    },

    toggleOnlineStatus() {
        this.isOnline = !this.isOnline;
        this.render();
        
        // Add system message about status change
        const statusMessage = {
            id: Date.now().toString(),
            user: 'system',
            username: 'Système',
            message: `${this.currentUser === 'admin' ? 'Admin' : 'Utilisateur'} est maintenant ${this.isOnline ? 'en ligne' : 'hors ligne'}`,
            timestamp: new Date().toISOString(),
            type: 'system'
        };

        this.messages.push(statusMessage);
        this.render();
    }
};