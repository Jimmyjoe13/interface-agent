/**
 * Application principale - Assistant IA Universel
 */

const App = {
    // État de l'application
    currentTab: 'chat',
    isInitialized: false,
    theme: 'light',

    // Gestionnaires
    managers: {
        chat: ChatManager,
        webhook: WebhookManager,
        storage: Storage,
        utils: Utils
    },

    /**
     * Initialise l'application
     */
    async init() {
        try {
            console.log('🚀 Initialisation de l\'Assistant IA Universel...');

            // Initialiser les gestionnaires
            await this.initManagers();

            // Initialiser l'interface utilisateur
            this.initUI();

            // Charger le thème
            this.loadTheme();

            // Marquer comme initialisé
            this.isInitialized = true;

            console.log('✅ Application initialisée avec succès');
            Utils.showToast('Application prête !', 'success');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            Utils.handleError(error, 'lors de l\'initialisation');
        }
    },

    /**
     * Initialise tous les gestionnaires
     */
    async initManagers() {
        // Initialiser le gestionnaire de webhooks
        WebhookManager.init();

        // Initialiser le gestionnaire de chat
        ChatManager.init();

        console.log('📦 Gestionnaires initialisés');
    },

    /**
     * Initialise l'interface utilisateur
     */
    initUI() {
        this.initTabs();
        this.initThemeToggle();
        this.initConfigurationTab();
        this.initHistoryTab();
        this.bindGlobalEvents();

        console.log('🎨 Interface utilisateur initialisée');
    },

    /**
     * Initialise le système d'onglets
     */
    initTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Activer l'onglet par défaut
        this.switchTab(this.currentTab);
    },

    /**
     * Change d'onglet
     * @param {string} tabName - Nom de l'onglet à activer
     */
    switchTab(tabName) {
        // Mettre à jour les boutons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Mettre à jour le contenu
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');

        this.currentTab = tabName;

        // Actions spécifiques par onglet
        this.onTabSwitch(tabName);
    },

    /**
     * Actions à effectuer lors du changement d'onglet
     * @param {string} tabName - Nom de l'onglet activé
     */
    onTabSwitch(tabName) {
        switch (tabName) {
            case 'chat':
                // Mettre le focus sur l'input de message si connecté
                if (WebhookManager.isConnected) {
                    setTimeout(() => {
                        document.getElementById('message-input')?.focus();
                    }, 100);
                }
                break;
            case 'config':
                this.refreshConfigurationTab();
                break;
            case 'history':
                this.refreshHistoryTab();
                break;
        }
    },

    /**
     * Initialise le toggle de thème
     */
    initThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    },

    /**
     * Charge le thème depuis le stockage
     */
    loadTheme() {
        this.theme = Storage.loadTheme();
        this.applyTheme(this.theme);
    },

    /**
     * Bascule entre les thèmes clair et sombre
     */
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.theme);
        Storage.saveTheme(this.theme);
    },

    /**
     * Applique un thème
     * @param {string} theme - Thème à appliquer ('light' ou 'dark')
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            }
            themeToggle.title = theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair';
        }
    },

    /**
     * Initialise l'onglet de configuration
     */
    initConfigurationTab() {
        // Validation en temps réel de l'URL
        const urlInput = document.getElementById('webhook-url');
        if (urlInput) {
            urlInput.addEventListener('input', Utils.debounce(() => {
                this.validateWebhookUrl();
            }, 300));
        }

        // Validation des headers
        const headersTextarea = document.getElementById('custom-headers');
        if (headersTextarea) {
            headersTextarea.addEventListener('input', Utils.debounce(() => {
                this.validateHeaders();
            }, 300));
        }

        // Test de connexion
        const testBtn = document.getElementById('test-webhook');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testWebhookConnection());
        }

        // Sauvegarde de configuration
        const saveBtn = document.getElementById('save-config');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveWebhookConfig());
        }

        // Gestion des profils
        this.initProfileManagement();

        // Charger la configuration existante
        this.loadExistingConfig();
    },

    /**
     * Valide l'URL du webhook
     */
    validateWebhookUrl() {
        const urlInput = document.getElementById('webhook-url');
        const validationIcon = document.getElementById('url-validation');
        
        if (!urlInput || !validationIcon) return;

        const url = urlInput.value.trim();
        const icon = validationIcon.querySelector('i');

        if (!url) {
            validationIcon.className = 'validation-icon';
            icon.className = 'fas fa-question-circle';
            return;
        }

        if (Utils.isValidUrl(url)) {
            validationIcon.className = 'validation-icon valid';
            icon.className = 'fas fa-check-circle';
        } else {
            validationIcon.className = 'validation-icon invalid';
            icon.className = 'fas fa-exclamation-circle';
        }
    },

    /**
     * Valide les headers personnalisés
     */
    validateHeaders() {
        const headersTextarea = document.getElementById('custom-headers');
        if (!headersTextarea) return;

        const headersValue = headersTextarea.value.trim();
        const validation = Utils.validateHeaders(headersValue);

        // Supprimer les anciens messages de validation
        const existingFeedback = headersTextarea.parentNode.querySelector('.validation-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        if (!validation.valid) {
            const feedback = document.createElement('div');
            feedback.className = 'validation-feedback invalid';
            feedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${validation.error}`;
            headersTextarea.parentNode.appendChild(feedback);
        }
    },

    /**
     * Teste la connexion au webhook
     */
    async testWebhookConnection() {
        const testBtn = document.getElementById('test-webhook');
        const resultDiv = document.getElementById('test-result');
        
        if (!testBtn || !resultDiv) return;

        try {
            // Désactiver le bouton et afficher le chargement
            testBtn.disabled = true;
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test en cours...';

            // Récupérer la configuration
            const config = this.getConfigFromForm();
            if (!config) return;

            // Tester la connexion
            const result = await WebhookManager.testConnection(config);

            // Afficher le résultat
            resultDiv.style.display = 'block';
            if (result.success) {
                resultDiv.className = 'test-result success';
                resultDiv.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    ${result.message} (${result.responseTime}ms)
                `;
            } else {
                resultDiv.className = 'test-result error';
                resultDiv.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i>
                    ${result.message}: ${result.error}
                `;
            }

        } catch (error) {
            resultDiv.style.display = 'block';
            resultDiv.className = 'test-result error';
            resultDiv.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                Erreur: ${error.message}
            `;
        } finally {
            // Réactiver le bouton
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-vial"></i> Tester la connexion';

            // Masquer le résultat après 5 secondes
            setTimeout(() => {
                if (resultDiv) {
                    resultDiv.style.display = 'none';
                }
            }, 5000);
        }
    },

    /**
     * Sauvegarde la configuration du webhook
     */
    async saveWebhookConfig() {
        try {
            const config = this.getConfigFromForm();
            if (!config) return;

            await WebhookManager.configure(config);
            Utils.showToast('Configuration sauvegardée avec succès', 'success');

            // Basculer vers l'onglet chat
            this.switchTab('chat');

        } catch (error) {
            Utils.handleError(error, 'lors de la sauvegarde');
        }
    },

    /**
     * Récupère la configuration depuis le formulaire
     * @returns {Object|null} - Configuration ou null si invalide
     */
    getConfigFromForm() {
        const urlInput = document.getElementById('webhook-url');
        const methodSelect = document.getElementById('http-method');
        const headersTextarea = document.getElementById('custom-headers');

        if (!urlInput) return null;

        const url = urlInput.value.trim();
        if (!url) {
            Utils.showToast('URL du webhook requise', 'warning');
            return null;
        }

        if (!Utils.isValidUrl(url)) {
            Utils.showToast('URL du webhook invalide', 'error');
            return null;
        }

        const method = methodSelect?.value || 'POST';
        const headersValue = headersTextarea?.value.trim() || '';

        let headers = {};
        if (headersValue) {
            const validation = Utils.validateHeaders(headersValue);
            if (!validation.valid) {
                Utils.showToast(validation.error, 'error');
                return null;
            }
            headers = validation.headers;
        }

        return { url, method, headers };
    },

    /**
     * Charge la configuration existante dans le formulaire
     */
    loadExistingConfig() {
        const config = Storage.loadWebhookConfig();
        if (!config) return;

        const urlInput = document.getElementById('webhook-url');
        const methodSelect = document.getElementById('http-method');
        const headersTextarea = document.getElementById('custom-headers');

        if (urlInput) urlInput.value = config.url || '';
        if (methodSelect) methodSelect.value = config.method || 'POST';
        if (headersTextarea && config.headers) {
            const headersToShow = { ...config.headers };
            delete headersToShow['Content-Type']; // Ne pas afficher le Content-Type par défaut
            if (Object.keys(headersToShow).length > 0) {
                headersTextarea.value = JSON.stringify(headersToShow, null, 2);
            }
        }

        // Valider les champs
        this.validateWebhookUrl();
        this.validateHeaders();
    },

    /**
     * Initialise la gestion des profils
     */
    initProfileManagement() {
        // Bouton de sauvegarde de profil
        const saveProfileBtn = document.getElementById('save-profile');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.saveCurrentProfile());
        }

        // Charger les profils existants
        this.refreshProfiles();
    },

    /**
     * Sauvegarde le profil actuel
     */
    saveCurrentProfile() {
        const profileNameInput = document.getElementById('profile-name');
        const profileName = profileNameInput?.value.trim();

        if (!profileName) {
            Utils.showToast('Nom du profil requis', 'warning');
            return;
        }

        const config = this.getConfigFromForm();
        if (!config) return;

        const profile = {
            name: profileName,
            ...config
        };

        Storage.saveProfile(profile);
        profileNameInput.value = '';
        this.refreshProfiles();
    },

    /**
     * Actualise la liste des profils
     */
    refreshProfiles() {
        const container = document.getElementById('profiles-container');
        if (!container) return;

        const profiles = Storage.loadProfiles();
        
        if (profiles.length === 0) {
            container.innerHTML = '<p class="no-profiles">Aucun profil sauvegardé</p>';
            return;
        }

        container.innerHTML = profiles.map(profile => `
            <div class="profile-item" data-profile-id="${profile.id}">
                <div class="profile-info">
                    <div class="profile-name">
                        ${Utils.escapeHtml(profile.name)}
                        <span class="profile-badge">${profile.method}</span>
                    </div>
                    <div class="profile-url">${Utils.escapeHtml(profile.url)}</div>
                    <div class="profile-meta">
                        <span>Créé: ${Utils.formatRelativeDate(new Date(profile.createdAt))}</span>
                        <span>Utilisé: ${Utils.formatRelativeDate(new Date(profile.lastUsed))}</span>
                    </div>
                </div>
                <div class="profile-actions">
                    <button class="profile-btn load" onclick="App.loadProfile('${profile.id}')" title="Charger ce profil">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="profile-btn delete" onclick="App.deleteProfile('${profile.id}')" title="Supprimer ce profil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Charge un profil
     * @param {string} profileId - ID du profil à charger
     */
    loadProfile(profileId) {
        const profile = Storage.loadProfile(profileId);
        if (!profile) return;

        const urlInput = document.getElementById('webhook-url');
        const methodSelect = document.getElementById('http-method');
        const headersTextarea = document.getElementById('custom-headers');

        if (urlInput) urlInput.value = profile.url;
        if (methodSelect) methodSelect.value = profile.method;
        if (headersTextarea) {
            const headersToShow = { ...profile.headers };
            delete headersToShow['Content-Type'];
            if (Object.keys(headersToShow).length > 0) {
                headersTextarea.value = JSON.stringify(headersToShow, null, 2);
            } else {
                headersTextarea.value = '';
            }
        }

        Storage.updateProfileLastUsed(profileId);
        this.validateWebhookUrl();
        this.validateHeaders();
        this.refreshProfiles();

        Utils.showToast(`Profil "${profile.name}" chargé`, 'success');
    },

    /**
     * Supprime un profil
     * @param {string} profileId - ID du profil à supprimer
     */
    deleteProfile(profileId) {
        const profile = Storage.loadProfile(profileId);
        if (!profile) return;

        if (confirm(`Êtes-vous sûr de vouloir supprimer le profil "${profile.name}" ?`)) {
            Storage.deleteProfile(profileId);
            this.refreshProfiles();
        }
    },

    /**
     * Actualise l'onglet de configuration
     */
    refreshConfigurationTab() {
        this.refreshProfiles();
        this.loadExistingConfig();
    },

    /**
     * Initialise l'onglet d'historique
     */
    initHistoryTab() {
        // Recherche dans l'historique
        const searchInput = document.getElementById('search-history');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => {
                this.searchHistory();
            }, 300));
        }

        // Export de l'historique
        const exportBtn = document.getElementById('export-history');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportHistory());
        }

        // Import de l'historique
        const importBtn = document.getElementById('import-history');
        const importFile = document.getElementById('import-file');
        
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => this.importHistory(e));
        }
    },

    /**
     * Recherche dans l'historique
     */
    searchHistory() {
        const searchInput = document.getElementById('search-history');
        const query = searchInput?.value.trim() || '';
        
        const conversations = Storage.searchHistory(query);
        this.renderHistoryList(conversations);
    },

    /**
     * Actualise l'onglet d'historique
     */
    refreshHistoryTab() {
        this.searchHistory(); // Cela va charger toutes les conversations
    },

    /**
     * Affiche la liste des conversations
     * @param {Array} conversations - Liste des conversations
     */
    renderHistoryList(conversations) {
        const container = document.getElementById('history-list');
        if (!container) return;

        if (conversations.length === 0) {
            container.innerHTML = '<p class="no-history">Aucune conversation dans l\'historique</p>';
            return;
        }

        container.innerHTML = conversations.map(conversation => {
            const preview = conversation.messages.length > 0 
                ? Utils.truncateText(conversation.messages[0].content, 100)
                : 'Conversation vide';

            return `
                <div class="history-item" data-conversation-id="${conversation.id}">
                    <div class="history-item-header">
                        <div class="history-item-info">
                            <div class="history-item-title">${Utils.escapeHtml(conversation.title || 'Sans titre')}</div>
                            <div class="history-item-meta">
                                <span>${conversation.messages.length} message${conversation.messages.length > 1 ? 's' : ''}</span>
                                <span>${Utils.formatRelativeDate(new Date(conversation.updatedAt || conversation.createdAt))}</span>
                                ${conversation.webhookUrl ? `<span>${Utils.escapeHtml(new URL(conversation.webhookUrl).hostname)}</span>` : ''}
                            </div>
                        </div>
                        <div class="history-item-actions">
                            <button class="profile-btn load" onclick="App.loadHistoryConversation('${conversation.id}')" title="Charger cette conversation">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="profile-btn delete" onclick="App.deleteHistoryConversation('${conversation.id}')" title="Supprimer cette conversation">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="history-item-preview">${Utils.escapeHtml(preview)}</div>
                </div>
            `;
        }).join('');
    },

    /**
     * Charge une conversation depuis l'historique
     * @param {string} conversationId - ID de la conversation
     */
    loadHistoryConversation(conversationId) {
        ChatManager.loadConversation(conversationId);
        this.switchTab('chat');
    },

    /**
     * Supprime une conversation de l'historique
     * @param {string} conversationId - ID de la conversation
     */
    deleteHistoryConversation(conversationId) {
        const conversation = Storage.loadConversation(conversationId);
        if (!conversation) return;

        const title = conversation.title || 'cette conversation';
        if (confirm(`Êtes-vous sûr de vouloir supprimer "${title}" ?`)) {
            Storage.deleteConversation(conversationId);
            this.refreshHistoryTab();
        }
    },

    /**
     * Exporte l'historique
     */
    exportHistory() {
        try {
            const data = Storage.exportData();
            const filename = `assistant-ia-export-${new Date().toISOString().split('T')[0]}.json`;
            Utils.downloadFile(JSON.stringify(data, null, 2), filename);
            Utils.showToast('Historique exporté avec succès', 'success');
        } catch (error) {
            Utils.handleError(error, 'lors de l\'export');
        }
    },

    /**
     * Importe l'historique
     * @param {Event} event - Événement de changement de fichier
     */
    async importHistory(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const content = await Utils.readFile(file);
            const data = JSON.parse(content);
            
            if (Storage.importData(data)) {
                this.refreshHistoryTab();
                this.refreshConfigurationTab();
                
                // Recharger les gestionnaires
                WebhookManager.loadConfiguration();
                ChatManager.loadCurrentConversation();
            }
        } catch (error) {
            Utils.handleError(error, 'lors de l\'import');
        } finally {
            // Réinitialiser l'input file
            event.target.value = '';
        }
    },

    /**
     * Lie les événements globaux
     */
    bindGlobalEvents() {
        // Gestion des raccourcis clavier globaux
        document.addEventListener('keydown', (e) => {
            // Ctrl+1,2,3 pour changer d'onglet
            if (e.ctrlKey && ['1', '2', '3'].includes(e.key)) {
                e.preventDefault();
                const tabs = ['chat', 'config', 'history'];
                const tabIndex = parseInt(e.key) - 1;
                if (tabs[tabIndex]) {
                    this.switchTab(tabs[tabIndex]);
                }
            }
        });

        // Gestion de la visibilité de la page
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                // Actualiser les données quand la page redevient visible
                this.refreshCurrentTab();
            }
        });

        // Gestion des erreurs globales
        window.addEventListener('error', (e) => {
            console.error('Erreur globale:', e.error);
            Utils.handleError(e.error, 'globale');
        });

        // Gestion des promesses rejetées
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Promesse rejetée:', e.reason);
            Utils.handleError(e.reason, 'promesse rejetée');
        });
    },

    /**
     * Actualise l'onglet actuel
     */
    refreshCurrentTab() {
        switch (this.currentTab) {
            case 'config':
                this.refreshConfigurationTab();
                break;
            case 'history':
                this.refreshHistoryTab();
                break;
        }
    }
};

// Initialiser l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export pour utilisation globale
window.App = App;
