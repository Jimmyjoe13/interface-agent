/**
 * Gestionnaire de stockage local pour l'application
 */

const Storage = {
    // Clés de stockage
    KEYS: {
        WEBHOOK_CONFIG: 'ai_assistant_webhook_config',
        PROFILES: 'ai_assistant_profiles',
        CHAT_HISTORY: 'ai_assistant_chat_history',
        CURRENT_CONVERSATION: 'ai_assistant_current_conversation',
        THEME: 'ai_assistant_theme',
        SETTINGS: 'ai_assistant_settings'
    },

    /**
     * Sauvegarde des données dans le localStorage
     * @param {string} key - Clé de stockage
     * @param {any} data - Données à sauvegarder
     * @returns {boolean} - True si la sauvegarde a réussi
     */
    save(key, data) {
        try {
            const serializedData = JSON.stringify(data);
            localStorage.setItem(key, serializedData);
            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            Utils.handleError(error, 'lors de la sauvegarde');
            return false;
        }
    },

    /**
     * Chargement des données depuis le localStorage
     * @param {string} key - Clé de stockage
     * @param {any} defaultValue - Valeur par défaut si aucune donnée trouvée
     * @returns {any} - Données chargées ou valeur par défaut
     */
    load(key, defaultValue = null) {
        try {
            const serializedData = localStorage.getItem(key);
            if (serializedData === null) {
                return defaultValue;
            }
            return JSON.parse(serializedData);
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            return defaultValue;
        }
    },

    /**
     * Suppression d'une clé du localStorage
     * @param {string} key - Clé à supprimer
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
        }
    },

    /**
     * Vérification de l'existence d'une clé
     * @param {string} key - Clé à vérifier
     * @returns {boolean} - True si la clé existe
     */
    exists(key) {
        return localStorage.getItem(key) !== null;
    },

    /**
     * Nettoyage complet du stockage
     */
    clear() {
        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            Utils.showToast('Données effacées avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
            Utils.handleError(error, 'lors du nettoyage');
        }
    },

    // === GESTION DE LA CONFIGURATION WEBHOOK ===

    /**
     * Sauvegarde la configuration du webhook
     * @param {Object} config - Configuration du webhook
     */
    saveWebhookConfig(config) {
        const configToSave = {
            url: config.url,
            method: config.method || 'POST',
            headers: config.headers || {},
            lastUpdated: new Date().toISOString()
        };
        
        if (this.save(this.KEYS.WEBHOOK_CONFIG, configToSave)) {
            Utils.showToast('Configuration sauvegardée', 'success');
        }
    },

    /**
     * Charge la configuration du webhook
     * @returns {Object|null} - Configuration du webhook ou null
     */
    loadWebhookConfig() {
        return this.load(this.KEYS.WEBHOOK_CONFIG);
    },

    /**
     * Supprime la configuration du webhook
     */
    removeWebhookConfig() {
        this.remove(this.KEYS.WEBHOOK_CONFIG);
        Utils.showToast('Configuration supprimée', 'info');
    },

    // === GESTION DES PROFILS ===

    /**
     * Sauvegarde un profil
     * @param {Object} profile - Profil à sauvegarder
     */
    saveProfile(profile) {
        const profiles = this.loadProfiles();
        const profileToSave = {
            id: profile.id || Utils.generateUUID(),
            name: profile.name,
            url: profile.url,
            method: profile.method || 'POST',
            headers: profile.headers || {},
            createdAt: profile.createdAt || new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        // Vérifier si le profil existe déjà
        const existingIndex = profiles.findIndex(p => p.id === profileToSave.id);
        if (existingIndex !== -1) {
            profiles[existingIndex] = profileToSave;
        } else {
            profiles.push(profileToSave);
        }

        if (this.save(this.KEYS.PROFILES, profiles)) {
            Utils.showToast(`Profil "${profile.name}" sauvegardé`, 'success');
        }
        
        return profileToSave;
    },

    /**
     * Charge tous les profils
     * @returns {Array} - Liste des profils
     */
    loadProfiles() {
        return this.load(this.KEYS.PROFILES, []);
    },

    /**
     * Charge un profil par son ID
     * @param {string} profileId - ID du profil
     * @returns {Object|null} - Profil trouvé ou null
     */
    loadProfile(profileId) {
        const profiles = this.loadProfiles();
        return profiles.find(p => p.id === profileId) || null;
    },

    /**
     * Supprime un profil
     * @param {string} profileId - ID du profil à supprimer
     */
    deleteProfile(profileId) {
        const profiles = this.loadProfiles();
        const filteredProfiles = profiles.filter(p => p.id !== profileId);
        
        if (this.save(this.KEYS.PROFILES, filteredProfiles)) {
            Utils.showToast('Profil supprimé', 'success');
        }
    },

    /**
     * Met à jour la date de dernière utilisation d'un profil
     * @param {string} profileId - ID du profil
     */
    updateProfileLastUsed(profileId) {
        const profiles = this.loadProfiles();
        const profile = profiles.find(p => p.id === profileId);
        
        if (profile) {
            profile.lastUsed = new Date().toISOString();
            this.save(this.KEYS.PROFILES, profiles);
        }
    },

    // === GESTION DE L'HISTORIQUE DES CONVERSATIONS ===

    /**
     * Sauvegarde une conversation
     * @param {Object} conversation - Conversation à sauvegarder
     */
    saveConversation(conversation) {
        const history = this.loadChatHistory();
        const conversationToSave = {
            id: conversation.id || Utils.generateUUID(),
            title: conversation.title || this.generateConversationTitle(conversation.messages),
            messages: conversation.messages || [],
            webhookUrl: conversation.webhookUrl,
            createdAt: conversation.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Vérifier si la conversation existe déjà
        const existingIndex = history.findIndex(c => c.id === conversationToSave.id);
        if (existingIndex !== -1) {
            history[existingIndex] = conversationToSave;
        } else {
            history.unshift(conversationToSave); // Ajouter au début
        }

        // Limiter l'historique à 100 conversations
        if (history.length > 100) {
            history.splice(100);
        }

        this.save(this.KEYS.CHAT_HISTORY, history);
        return conversationToSave;
    },

    /**
     * Charge l'historique des conversations
     * @returns {Array} - Liste des conversations
     */
    loadChatHistory() {
        return this.load(this.KEYS.CHAT_HISTORY, []);
    },

    /**
     * Charge une conversation par son ID
     * @param {string} conversationId - ID de la conversation
     * @returns {Object|null} - Conversation trouvée ou null
     */
    loadConversation(conversationId) {
        const history = this.loadChatHistory();
        return history.find(c => c.id === conversationId) || null;
    },

    /**
     * Supprime une conversation
     * @param {string} conversationId - ID de la conversation à supprimer
     */
    deleteConversation(conversationId) {
        const history = this.loadChatHistory();
        const filteredHistory = history.filter(c => c.id !== conversationId);
        
        if (this.save(this.KEYS.CHAT_HISTORY, filteredHistory)) {
            Utils.showToast('Conversation supprimée', 'success');
        }
    },

    /**
     * Recherche dans l'historique
     * @param {string} query - Terme de recherche
     * @returns {Array} - Conversations correspondantes
     */
    searchHistory(query) {
        if (!query || query.trim() === '') {
            return this.loadChatHistory();
        }

        const history = this.loadChatHistory();
        const searchTerm = query.toLowerCase();

        return history.filter(conversation => {
            // Recherche dans le titre
            if (conversation.title && conversation.title.toLowerCase().includes(searchTerm)) {
                return true;
            }

            // Recherche dans les messages
            return conversation.messages.some(message => 
                message.content && message.content.toLowerCase().includes(searchTerm)
            );
        });
    },

    /**
     * Génère un titre pour une conversation basé sur les messages
     * @param {Array} messages - Messages de la conversation
     * @returns {string} - Titre généré
     */
    generateConversationTitle(messages) {
        if (!messages || messages.length === 0) {
            return 'Nouvelle conversation';
        }

        // Prendre le premier message utilisateur
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage && firstUserMessage.content) {
            return Utils.truncateText(firstUserMessage.content, 50);
        }

        return `Conversation du ${Utils.formatDate(new Date())}`;
    },

    // === GESTION DE LA CONVERSATION COURANTE ===

    /**
     * Sauvegarde la conversation courante
     * @param {Object} conversation - Conversation courante
     */
    saveCurrentConversation(conversation) {
        this.save(this.KEYS.CURRENT_CONVERSATION, conversation);
    },

    /**
     * Charge la conversation courante
     * @returns {Object|null} - Conversation courante ou null
     */
    loadCurrentConversation() {
        return this.load(this.KEYS.CURRENT_CONVERSATION);
    },

    /**
     * Supprime la conversation courante
     */
    clearCurrentConversation() {
        this.remove(this.KEYS.CURRENT_CONVERSATION);
    },

    // === GESTION DU THÈME ===

    /**
     * Sauvegarde le thème
     * @param {string} theme - Thème à sauvegarder ('light' ou 'dark')
     */
    saveTheme(theme) {
        this.save(this.KEYS.THEME, theme);
    },

    /**
     * Charge le thème
     * @returns {string} - Thème chargé ou 'light' par défaut
     */
    loadTheme() {
        return this.load(this.KEYS.THEME, 'light');
    },

    // === GESTION DES PARAMÈTRES ===

    /**
     * Sauvegarde les paramètres
     * @param {Object} settings - Paramètres à sauvegarder
     */
    saveSettings(settings) {
        const currentSettings = this.loadSettings();
        const newSettings = { ...currentSettings, ...settings };
        this.save(this.KEYS.SETTINGS, newSettings);
    },

    /**
     * Charge les paramètres
     * @returns {Object} - Paramètres chargés
     */
    loadSettings() {
        return this.load(this.KEYS.SETTINGS, {
            autoSaveConversations: true,
            maxHistoryItems: 100,
            showTimestamps: true,
            enableNotifications: true,
            requestTimeout: 30000
        });
    },

    // === EXPORT/IMPORT ===

    /**
     * Exporte toutes les données
     * @returns {Object} - Données exportées
     */
    exportData() {
        const data = {};
        Object.entries(this.KEYS).forEach(([name, key]) => {
            data[name] = this.load(key);
        });
        
        data.exportDate = new Date().toISOString();
        data.version = '1.0';
        
        return data;
    },

    /**
     * Importe des données
     * @param {Object} data - Données à importer
     * @returns {boolean} - True si l'import a réussi
     */
    importData(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Format de données invalide');
            }

            // Vérifier la version (pour compatibilité future)
            if (data.version && data.version !== '1.0') {
                Utils.showToast('Version de données non supportée', 'warning');
            }

            // Importer chaque type de données
            Object.entries(this.KEYS).forEach(([name, key]) => {
                if (data[name] !== undefined) {
                    this.save(key, data[name]);
                }
            });

            Utils.showToast('Données importées avec succès', 'success');
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'import:', error);
            Utils.handleError(error, 'lors de l\'import');
            return false;
        }
    },

    /**
     * Calcule la taille du stockage utilisé
     * @returns {Object} - Informations sur l'utilisation du stockage
     */
    getStorageInfo() {
        let totalSize = 0;
        const details = {};

        Object.entries(this.KEYS).forEach(([name, key]) => {
            const data = localStorage.getItem(key);
            const size = data ? new Blob([data]).size : 0;
            details[name] = {
                size: size,
                sizeFormatted: this.formatBytes(size),
                exists: data !== null
            };
            totalSize += size;
        });

        return {
            totalSize: totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
            details: details,
            available: this.getAvailableStorage()
        };
    },

    /**
     * Formate les octets en format lisible
     * @param {number} bytes - Nombre d'octets
     * @returns {string} - Taille formatée
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Estime l'espace de stockage disponible
     * @returns {string} - Estimation de l'espace disponible
     */
    getAvailableStorage() {
        try {
            // Test approximatif de l'espace disponible
            const testKey = 'storage_test';
            const testData = 'x'.repeat(1024); // 1KB
            let available = 0;
            
            try {
                for (let i = 0; i < 5000; i++) { // Test jusqu'à ~5MB
                    localStorage.setItem(testKey + i, testData);
                    available += 1024;
                }
            } catch (e) {
                // Nettoyage des données de test
                for (let i = 0; i < 5000; i++) {
                    localStorage.removeItem(testKey + i);
                }
            }
            
            return this.formatBytes(available);
        } catch (error) {
            return 'Inconnu';
        }
    }
};

// Export pour utilisation dans d'autres modules
window.Storage = Storage;
