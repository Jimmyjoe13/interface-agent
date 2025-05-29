/**
 * Gestionnaire de chat pour l'application
 */

const ChatManager = {
    // État du chat
    currentConversation: null,
    messages: [],
    isTyping: false,
    typingTimeout: null,

    // Éléments DOM
    elements: {
        chatMessages: null,
        messageInput: null,
        sendBtn: null,
        clearBtn: null
    },

    /**
     * Initialise le gestionnaire de chat
     */
    init() {
        this.initElements();
        this.bindEvents();
        this.loadCurrentConversation();
        this.setupAutoResize();
    },

    /**
     * Initialise les références aux éléments DOM
     */
    initElements() {
        this.elements.chatMessages = document.getElementById('chat-messages');
        this.elements.messageInput = document.getElementById('message-input');
        this.elements.sendBtn = document.getElementById('send-btn');
        this.elements.clearBtn = document.getElementById('clear-chat');
    },

    /**
     * Lie les événements aux éléments
     */
    bindEvents() {
        // Envoi de message
        if (this.elements.sendBtn) {
            this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Raccourcis clavier
        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Auto-resize du textarea
            this.elements.messageInput.addEventListener('input', () => {
                this.autoResizeTextarea();
            });
        }

        // Effacer le chat
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => this.clearChat());
        }
    },

    /**
     * Configure le redimensionnement automatique du textarea
     */
    setupAutoResize() {
        if (this.elements.messageInput) {
            this.autoResizeTextarea();
        }
    },

    /**
     * Redimensionne automatiquement le textarea
     */
    autoResizeTextarea() {
        const textarea = this.elements.messageInput;
        if (!textarea) return;

        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
        textarea.style.height = newHeight + 'px';
    },

    /**
     * Charge la conversation courante depuis le stockage
     */
    loadCurrentConversation() {
        const conversation = Storage.loadCurrentConversation();
        if (conversation) {
            this.currentConversation = conversation;
            this.messages = conversation.messages || [];
            this.renderMessages();
        } else {
            this.startNewConversation();
        }
    },

    /**
     * Démarre une nouvelle conversation
     */
    startNewConversation() {
        this.currentConversation = {
            id: Utils.generateUUID(),
            title: null,
            messages: [],
            createdAt: new Date().toISOString(),
            webhookUrl: WebhookManager.currentConfig?.url
        };
        this.messages = [];
        this.renderMessages();
        this.saveCurrentConversation();
    },

    /**
     * Sauvegarde la conversation courante
     */
    saveCurrentConversation() {
        if (this.currentConversation) {
            this.currentConversation.messages = this.messages;
            this.currentConversation.updatedAt = new Date().toISOString();
            Storage.saveCurrentConversation(this.currentConversation);
        }
    },

    /**
     * Envoie un message
     */
    async sendMessage() {
        const messageText = this.elements.messageInput?.value?.trim();
        if (!messageText) return;

        // Vérifier la connexion webhook
        if (!WebhookManager.isConnected) {
            Utils.showToast('Aucun webhook configuré', 'warning');
            return;
        }

        try {
            // Ajouter le message utilisateur
            const userMessage = this.addMessage('user', messageText);
            
            // Vider le champ de saisie
            this.elements.messageInput.value = '';
            this.autoResizeTextarea();

            // Afficher l'indicateur de frappe
            this.showTypingIndicator();

            // Envoyer le message au webhook
            const response = await WebhookManager.sendMessage(
                messageText, 
                this.currentConversation.id
            );

            // Masquer l'indicateur de frappe
            this.hideTypingIndicator();

            // Ajouter la réponse de l'assistant
            this.addMessage('assistant', response.content, {
                responseTime: response.responseTime,
                metadata: response.metadata
            });

            // Sauvegarder la conversation
            this.saveCurrentConversation();

        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('system', `Erreur: ${error.message}`);
            Utils.handleError(error, 'lors de l\'envoi du message');
        }
    },

    /**
     * Ajoute un message à la conversation
     * @param {string} role - Rôle du message (user, assistant, system)
     * @param {string} content - Contenu du message
     * @param {Object} metadata - Métadonnées optionnelles
     * @returns {Object} - Message créé
     */
    addMessage(role, content, metadata = {}) {
        const message = {
            id: Utils.generateUUID(),
            role: role,
            content: content,
            timestamp: new Date().toISOString(),
            status: 'sent',
            ...metadata
        };

        this.messages.push(message);
        this.renderMessage(message, true);
        this.scrollToBottom();

        return message;
    },

    /**
     * Affiche tous les messages
     */
    renderMessages() {
        if (!this.elements.chatMessages) return;

        // Vider le conteneur
        this.elements.chatMessages.innerHTML = '';

        if (this.messages.length === 0) {
            this.showWelcomeMessage();
        } else {
            this.messages.forEach(message => {
                this.renderMessage(message, false);
            });
            this.scrollToBottom();
        }
    },

    /**
     * Affiche un message individuel
     * @param {Object} message - Message à afficher
     * @param {boolean} animate - Si true, anime l'apparition
     */
    renderMessage(message, animate = false) {
        if (!this.elements.chatMessages) return;

        // Masquer le message de bienvenue s'il existe
        this.hideWelcomeMessage();

        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role}${animate ? ' new' : ''}`;
        messageElement.dataset.messageId = message.id;

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        let avatarIcon = 'fas fa-user';
        if (message.role === 'assistant') {
            avatarIcon = 'fas fa-robot';
        } else if (message.role === 'system') {
            avatarIcon = 'fas fa-info-circle';
        }
        
        avatar.innerHTML = `<i class="${avatarIcon}"></i>`;

        // Contenu
        const content = document.createElement('div');
        content.className = 'message-content';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        // Traiter le contenu (markdown simple)
        if (message.role === 'assistant') {
            bubble.innerHTML = Utils.markdownToHtml(message.content);
        } else {
            bubble.textContent = message.content;
        }

        // Métadonnées
        const meta = document.createElement('div');
        meta.className = 'message-meta';
        
        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = Utils.formatRelativeDate(new Date(message.timestamp));
        
        meta.appendChild(time);

        // Statut pour les messages utilisateur
        if (message.role === 'user') {
            const status = document.createElement('span');
            status.className = `message-status ${message.status}`;
            
            let statusIcon = 'fas fa-check';
            if (message.status === 'sending') {
                statusIcon = 'fas fa-clock';
            } else if (message.status === 'error') {
                statusIcon = 'fas fa-exclamation-triangle';
            }
            
            status.innerHTML = `<i class="${statusIcon}"></i>`;
            meta.appendChild(status);
        }

        // Temps de réponse pour l'assistant
        if (message.role === 'assistant' && message.responseTime) {
            const responseTime = document.createElement('span');
            responseTime.className = 'response-time';
            responseTime.textContent = `${message.responseTime}ms`;
            meta.appendChild(responseTime);
        }

        content.appendChild(bubble);
        content.appendChild(meta);

        messageElement.appendChild(avatar);
        messageElement.appendChild(content);

        this.elements.chatMessages.appendChild(messageElement);

        // Animation d'apparition
        if (animate) {
            setTimeout(() => {
                messageElement.classList.remove('new');
            }, 300);
        }
    },

    /**
     * Affiche le message de bienvenue
     */
    showWelcomeMessage() {
        if (!this.elements.chatMessages) return;

        const welcomeElement = document.createElement('div');
        welcomeElement.className = 'welcome-message';
        welcomeElement.innerHTML = `
            <div class="welcome-icon">
                <i class="fas fa-robot"></i>
            </div>
            <h3>Bienvenue dans l'Assistant IA Universel</h3>
            <p>Configurez votre webhook dans l'onglet Configuration pour commencer à discuter.</p>
        `;

        this.elements.chatMessages.appendChild(welcomeElement);
    },

    /**
     * Masque le message de bienvenue
     */
    hideWelcomeMessage() {
        const welcomeMessage = this.elements.chatMessages?.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
    },

    /**
     * Affiche l'indicateur de frappe
     */
    showTypingIndicator() {
        if (this.isTyping) return;

        this.isTyping = true;
        const typingElement = document.createElement('div');
        typingElement.className = 'message assistant typing-indicator';
        typingElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        this.elements.chatMessages.appendChild(typingElement);
        this.scrollToBottom();
    },

    /**
     * Masque l'indicateur de frappe
     */
    hideTypingIndicator() {
        if (!this.isTyping) return;

        this.isTyping = false;
        const typingIndicator = this.elements.chatMessages?.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    },

    /**
     * Fait défiler vers le bas
     */
    scrollToBottom() {
        if (this.elements.chatMessages) {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    },

    /**
     * Efface le chat actuel
     */
    clearChat() {
        if (this.messages.length === 0) return;

        if (confirm('Êtes-vous sûr de vouloir effacer cette conversation ?')) {
            // Sauvegarder dans l'historique avant d'effacer
            if (this.currentConversation && this.messages.length > 0) {
                Storage.saveConversation(this.currentConversation);
            }

            // Effacer la conversation courante
            this.messages = [];
            this.startNewConversation();
            this.renderMessages();
            
            Utils.showToast('Conversation effacée', 'info');
        }
    },

    /**
     * Charge une conversation depuis l'historique
     * @param {string} conversationId - ID de la conversation
     */
    loadConversation(conversationId) {
        const conversation = Storage.loadConversation(conversationId);
        if (conversation) {
            // Sauvegarder la conversation actuelle si elle a des messages
            if (this.currentConversation && this.messages.length > 0) {
                Storage.saveConversation(this.currentConversation);
            }

            this.currentConversation = conversation;
            this.messages = conversation.messages || [];
            this.renderMessages();
            this.saveCurrentConversation();

            Utils.showToast('Conversation chargée', 'success');
        }
    },

    /**
     * Exporte la conversation courante
     * @returns {Object} - Conversation exportée
     */
    exportCurrentConversation() {
        if (!this.currentConversation) return null;

        return {
            ...this.currentConversation,
            messages: this.messages,
            exportDate: new Date().toISOString()
        };
    },

    /**
     * Importe une conversation
     * @param {Object} conversationData - Données de conversation
     */
    importConversation(conversationData) {
        try {
            if (!conversationData || !conversationData.messages) {
                throw new Error('Format de conversation invalide');
            }

            // Sauvegarder la conversation actuelle
            if (this.currentConversation && this.messages.length > 0) {
                Storage.saveConversation(this.currentConversation);
            }

            // Charger la nouvelle conversation
            this.currentConversation = {
                id: conversationData.id || Utils.generateUUID(),
                title: conversationData.title,
                messages: conversationData.messages,
                createdAt: conversationData.createdAt || new Date().toISOString(),
                webhookUrl: conversationData.webhookUrl
            };

            this.messages = this.currentConversation.messages;
            this.renderMessages();
            this.saveCurrentConversation();

            Utils.showToast('Conversation importée', 'success');
        } catch (error) {
            Utils.handleError(error, 'lors de l\'import de conversation');
        }
    },

    /**
     * Obtient les statistiques de la conversation
     * @returns {Object} - Statistiques
     */
    getConversationStats() {
        const userMessages = this.messages.filter(m => m.role === 'user');
        const assistantMessages = this.messages.filter(m => m.role === 'assistant');
        const systemMessages = this.messages.filter(m => m.role === 'system');

        const totalChars = this.messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
        const avgResponseTime = assistantMessages.length > 0 
            ? assistantMessages.reduce((sum, m) => sum + (m.responseTime || 0), 0) / assistantMessages.length 
            : 0;

        return {
            totalMessages: this.messages.length,
            userMessages: userMessages.length,
            assistantMessages: assistantMessages.length,
            systemMessages: systemMessages.length,
            totalCharacters: totalChars,
            averageResponseTime: Math.round(avgResponseTime),
            conversationDuration: this.currentConversation 
                ? new Date() - new Date(this.currentConversation.createdAt)
                : 0
        };
    },

    /**
     * Recherche dans les messages
     * @param {string} query - Terme de recherche
     * @returns {Array} - Messages correspondants
     */
    searchMessages(query) {
        if (!query || query.trim() === '') return [];

        const searchTerm = query.toLowerCase();
        return this.messages.filter(message => 
            message.content && message.content.toLowerCase().includes(searchTerm)
        );
    },

    /**
     * Met à jour le titre de la conversation
     * @param {string} title - Nouveau titre
     */
    updateConversationTitle(title) {
        if (this.currentConversation) {
            this.currentConversation.title = title;
            this.saveCurrentConversation();
        }
    }
};

// Export pour utilisation dans d'autres modules
window.ChatManager = ChatManager;
