/**
 * Gestionnaire de webhooks pour l'application (Version Backend)
 */

const WebhookManager = {
    // Configuration par défaut
    defaultConfig: {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 90000
    },

    // État actuel
    currentConfig: null,
    isConnected: false,
    lastError: null,

    /**
     * Initialise le gestionnaire de webhooks
     */
    init() {
        this.loadConfiguration();
        this.updateConnectionStatus();
    },

    /**
     * Charge la configuration depuis le stockage
     */
    loadConfiguration() {
        const config = Storage.loadWebhookConfig();
        if (config) {
            this.currentConfig = config;
            this.isConnected = true;
        }
    },

    /**
     * Configure un nouveau webhook
     * @param {Object} config - Configuration du webhook
     * @returns {Promise<boolean>} - True si la configuration est valide
     */
    async configure(config) {
        try {
            // Validation de la configuration
            const validation = this.validateConfig(config);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Nettoyer et préparer la configuration
            const cleanConfig = {
                url: Utils.cleanUrl(config.url),
                method: config.method || this.defaultConfig.method,
                headers: { ...this.defaultConfig.headers, ...config.headers }
            };

            this.currentConfig = cleanConfig;
            this.isConnected = true;
            this.lastError = null;

            // Sauvegarder la configuration
            Storage.saveWebhookConfig(cleanConfig);
            this.updateConnectionStatus();

            return true;
        } catch (error) {
            this.lastError = error.message;
            this.isConnected = false;
            this.updateConnectionStatus();
            throw error;
        }
    },

    /**
     * Teste la connexion au webhook via l'API backend
     * @param {Object} config - Configuration à tester (optionnel)
     * @returns {Promise<Object>} - Résultat du test
     */
    async testConnection(config = null) {
        const testConfig = config || this.currentConfig;
        
        if (!testConfig) {
            throw new Error('Aucune configuration de webhook disponible');
        }

        try {
            // Utiliser l'API backend pour tester la connexion
            const response = await fetch('/api/webhook/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: testConfig.url,
                    method: testConfig.method,
                    headers: testConfig.headers
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erreur lors du test');
            }

            return {
                success: result.success,
                status: result.status,
                statusText: result.statusText,
                responseTime: result.responseTime,
                message: result.message || 'Connexion réussie'
            };

        } catch (error) {
            console.error('Erreur test webhook:', error);
            return {
                success: false,
                error: error.message,
                message: 'Échec de la connexion'
            };
        }
    },

    /**
     * Envoie un message au webhook via l'API backend
     * @param {string} message - Message à envoyer
     * @param {string} conversationId - ID de la conversation
     * @returns {Promise<Object>} - Réponse du webhook
     */
    async sendMessage(message, conversationId = null) {
        if (!this.currentConfig) {
            throw new Error('Aucun webhook configuré');
        }

        if (!this.isConnected) {
            throw new Error('Webhook non connecté');
        }

        try {
            const payload = {
                message: message,
                conversation_id: conversationId || Utils.generateUUID(),
                user_id: 'user',
                metadata: {
                    source: 'ai_assistant_interface',
                    version: '1.0'
                }
            };

            // Utiliser l'API backend pour envoyer le message
            const response = await fetch('/api/webhook/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: this.currentConfig.url,
                    method: this.currentConfig.method,
                    headers: this.currentConfig.headers,
                    payload: payload
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erreur lors de l\'envoi');
            }

            return {
                content: result.content,
                metadata: result.metadata,
                responseTime: result.responseTime,
                status: result.status
            };

        } catch (error) {
            this.lastError = error.message;
            this.updateConnectionStatus();
            throw error;
        }
    },

    /**
     * Obtient des informations sur un webhook via l'API backend
     * @param {string} url - URL du webhook
     * @returns {Promise<Object>} - Informations sur le webhook
     */
    async getWebhookInfo(url) {
        try {
            const response = await fetch('/api/webhook/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Erreur info webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Valide une configuration de webhook
     * @param {Object} config - Configuration à valider
     * @returns {Object} - Résultat de la validation
     */
    validateConfig(config) {
        if (!config) {
            return { valid: false, error: 'Configuration manquante' };
        }

        if (!config.url) {
            return { valid: false, error: 'URL du webhook requise' };
        }

        if (!Utils.isValidUrl(config.url)) {
            return { valid: false, error: 'URL du webhook invalide' };
        }

        if (config.method && !['GET', 'POST', 'PUT', 'PATCH'].includes(config.method.toUpperCase())) {
            return { valid: false, error: 'Méthode HTTP non supportée' };
        }

        if (config.headers) {
            const headerValidation = Utils.validateHeaders(JSON.stringify(config.headers));
            if (!headerValidation.valid) {
                return { valid: false, error: headerValidation.error };
            }
        }

        return { valid: true };
    },

    /**
     * Met à jour le statut de connexion dans l'interface
     */
    updateConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;

        const statusIcon = statusElement.querySelector('i');
        const statusText = statusElement.querySelector('span');

        if (this.isConnected && this.currentConfig) {
            statusElement.className = 'connection-status connected';
            statusIcon.className = 'fas fa-circle';
            statusText.textContent = 'Connecté';
            statusElement.title = `Connecté à ${this.currentConfig.url}`;
        } else {
            statusElement.className = 'connection-status disconnected';
            statusIcon.className = 'fas fa-circle';
            statusText.textContent = 'Déconnecté';
            statusElement.title = this.lastError || 'Aucun webhook configuré';
        }

        // Mettre à jour l'état des contrôles de chat
        this.updateChatControls();
    },

    /**
     * Met à jour l'état des contrôles de chat
     */
    updateChatControls() {
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');

        if (messageInput && sendBtn) {
            const isEnabled = this.isConnected && this.currentConfig;
            
            messageInput.disabled = !isEnabled;
            sendBtn.disabled = !isEnabled;

            if (isEnabled) {
                messageInput.placeholder = 'Tapez votre message ici... (Ctrl+Entrée pour envoyer)';
            } else {
                messageInput.placeholder = 'Configurez un webhook pour commencer à discuter...';
            }
        }
    },

    /**
     * Déconnecte le webhook actuel
     */
    disconnect() {
        this.currentConfig = null;
        this.isConnected = false;
        this.lastError = null;
        
        Storage.removeWebhookConfig();
        this.updateConnectionStatus();
        
        Utils.showToast('Webhook déconnecté', 'info');
    },

    /**
     * Obtient les informations sur la configuration actuelle
     * @returns {Object} - Informations sur la configuration
     */
    getConfigInfo() {
        if (!this.currentConfig) {
            return null;
        }

        return {
            url: this.currentConfig.url,
            method: this.currentConfig.method,
            isConnected: this.isConnected,
            lastError: this.lastError,
            hasCustomHeaders: Object.keys(this.currentConfig.headers || {}).length > 1
        };
    },

    /**
     * Génère des templates de configuration prédéfinis
     * @returns {Array} - Liste des templates
     */
    getConfigTemplates() {
        return [
            {
                name: 'OpenAI Compatible',
                description: 'Configuration pour les APIs compatibles OpenAI',
                icon: 'fas fa-brain',
                config: {
                    url: 'https://api.openai.com/v1/chat/completions',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer YOUR_API_KEY'
                    }
                }
            },
            {
                name: 'Webhook Simple',
                description: 'Configuration basique pour webhook personnalisé',
                icon: 'fas fa-link',
                config: {
                    url: 'https://your-webhook-url.com/chat',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            },
            {
                name: 'API REST Custom',
                description: 'Configuration pour API REST avec authentification',
                icon: 'fas fa-server',
                config: {
                    url: 'https://your-api.com/v1/messages',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': 'YOUR_API_KEY'
                    }
                }
            }
        ];
    },

    /**
     * Applique un template de configuration
     * @param {Object} template - Template à appliquer
     */
    applyTemplate(template) {
        if (!template || !template.config) {
            throw new Error('Template invalide');
        }

        // Remplir les champs de configuration avec le template
        const urlInput = document.getElementById('webhook-url');
        const methodSelect = document.getElementById('http-method');
        const headersTextarea = document.getElementById('custom-headers');

        if (urlInput) urlInput.value = template.config.url;
        if (methodSelect) methodSelect.value = template.config.method;
        if (headersTextarea) {
            headersTextarea.value = JSON.stringify(template.config.headers, null, 2);
        }

        Utils.showToast(`Template "${template.name}" appliqué`, 'success');
    },

    /**
     * Obtient les statistiques d'utilisation via l'API backend
     * @returns {Promise<Object>} - Statistiques d'utilisation
     */
    async getUsageStats() {
        try {
            const response = await fetch('/api/health/stats');
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Erreur récupération stats:', error);
            return {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageResponseTime: 0,
                lastRequestTime: null
            };
        }
    }
};

// Export pour utilisation dans d'autres modules
window.WebhookManager = WebhookManager;
