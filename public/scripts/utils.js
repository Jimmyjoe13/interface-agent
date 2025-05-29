/**
 * Utilitaires généraux pour l'application
 */

// Utilitaires de validation
const Utils = {
    /**
     * Valide une URL
     * @param {string} url - L'URL à valider
     * @returns {boolean} - True si l'URL est valide
     */
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    },

    /**
     * Valide un JSON
     * @param {string} jsonString - La chaîne JSON à valider
     * @returns {boolean} - True si le JSON est valide
     */
    isValidJson(jsonString) {
        if (!jsonString || jsonString.trim() === '') return true;
        try {
            JSON.parse(jsonString);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Génère un UUID simple
     * @returns {string} - UUID généré
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Formate une date
     * @param {Date} date - La date à formater
     * @returns {string} - Date formatée
     */
    formatDate(date) {
        return new Intl.DateTimeFormat('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    /**
     * Formate une date relative (il y a X minutes)
     * @param {Date} date - La date à formater
     * @returns {string} - Date relative formatée
     */
    formatRelativeDate(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'À l\'instant';
        if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
        if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
        if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
        
        return this.formatDate(date);
    },

    /**
     * Tronque un texte
     * @param {string} text - Le texte à tronquer
     * @param {number} maxLength - Longueur maximale
     * @returns {string} - Texte tronqué
     */
    truncateText(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * Échappe le HTML
     * @param {string} text - Le texte à échapper
     * @returns {string} - Texte échappé
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Convertit le markdown simple en HTML
     * @param {string} text - Le texte markdown
     * @returns {string} - HTML généré
     */
    markdownToHtml(text) {
        if (!text) return '';
        
        // Échapper le HTML d'abord
        let html = this.escapeHtml(text);
        
        // Remplacements markdown simples
        html = html
            // Gras
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italique
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code inline
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Liens
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
            // Sauts de ligne
            .replace(/\n/g, '<br>');
        
        return html;
    },

    /**
     * Debounce une fonction
     * @param {Function} func - La fonction à debouncer
     * @param {number} wait - Délai d'attente en ms
     * @returns {Function} - Fonction debouncée
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle une fonction
     * @param {Function} func - La fonction à throttler
     * @param {number} limit - Limite en ms
     * @returns {Function} - Fonction throttlée
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Copie du texte dans le presse-papiers
     * @param {string} text - Le texte à copier
     * @returns {Promise<boolean>} - True si la copie a réussi
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback pour les navigateurs plus anciens
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    },

    /**
     * Télécharge un fichier
     * @param {string} content - Le contenu du fichier
     * @param {string} filename - Le nom du fichier
     * @param {string} mimeType - Le type MIME
     */
    downloadFile(content, filename, mimeType = 'application/json') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Lit un fichier
     * @param {File} file - Le fichier à lire
     * @returns {Promise<string>} - Le contenu du fichier
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    },

    /**
     * Affiche une notification toast
     * @param {string} message - Le message à afficher
     * @param {string} type - Le type de notification (success, error, warning, info)
     * @param {number} duration - Durée d'affichage en ms
     */
    showToast(message, type = 'info', duration = 3000) {
        // Créer l'élément toast s'il n'existe pas
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }

        // Créer le toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 1rem 1.5rem;
            box-shadow: var(--shadow-lg);
            max-width: 300px;
            pointer-events: auto;
            transform: translateX(100%);
            transition: transform 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;

        // Icône selon le type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const colors = {
            success: 'var(--accent-color)',
            error: 'var(--danger-color)',
            warning: 'var(--warning-color)',
            info: 'var(--primary-color)'
        };

        toast.innerHTML = `
            <i class="${icons[type]}" style="color: ${colors[type]}; font-size: 1.2rem;"></i>
            <span style="color: var(--text-primary); font-size: 0.875rem;">${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Animation d'entrée
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);

        // Suppression automatique
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);

        // Suppression au clic
        toast.addEventListener('click', () => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        });
    },

    /**
     * Gère les erreurs de façon centralisée
     * @param {Error} error - L'erreur à gérer
     * @param {string} context - Le contexte de l'erreur
     */
    handleError(error, context = '') {
        console.error(`Erreur ${context}:`, error);
        
        let message = 'Une erreur inattendue s\'est produite';
        
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
            message = 'Erreur de connexion réseau';
        } else if (error.name === 'TypeError') {
            message = 'Erreur de configuration';
        } else if (error.message) {
            message = error.message;
        }
        
        this.showToast(message, 'error');
    },

    /**
     * Valide les headers HTTP
     * @param {string} headersString - Les headers en format JSON
     * @returns {Object} - Résultat de validation
     */
    validateHeaders(headersString) {
        if (!headersString || headersString.trim() === '') {
            return { valid: true, headers: {} };
        }

        try {
            const headers = JSON.parse(headersString);
            
            if (typeof headers !== 'object' || Array.isArray(headers)) {
                return { 
                    valid: false, 
                    error: 'Les headers doivent être un objet JSON' 
                };
            }

            // Vérifier que toutes les valeurs sont des chaînes
            for (const [key, value] of Object.entries(headers)) {
                if (typeof value !== 'string') {
                    return { 
                        valid: false, 
                        error: `La valeur du header "${key}" doit être une chaîne` 
                    };
                }
            }

            return { valid: true, headers };
        } catch (error) {
            return { 
                valid: false, 
                error: 'Format JSON invalide pour les headers' 
            };
        }
    },

    /**
     * Nettoie et formate une URL
     * @param {string} url - L'URL à nettoyer
     * @returns {string} - URL nettoyée
     */
    cleanUrl(url) {
        if (!url) return '';
        return url.trim().replace(/\/+$/, ''); // Supprime les slashes finaux
    }
};

// Export pour utilisation dans d'autres modules
window.Utils = Utils;
