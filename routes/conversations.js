const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Stockage en mémoire pour les conversations (en production, utiliser une base de données)
let conversations = new Map();
let conversationStats = {
    totalConversations: 0,
    totalMessages: 0,
    lastActivity: null
};

// Middleware de validation pour les conversations
const validateConversation = [
    body('id').optional().isUUID().withMessage('ID de conversation invalide'),
    body('title').optional().isString().isLength({ max: 200 }).withMessage('Titre trop long'),
    body('messages').optional().isArray().withMessage('Messages doivent être un tableau'),
    body('webhookUrl').optional().isURL().withMessage('URL webhook invalide')
];

const validateMessage = [
    body('role').isIn(['user', 'assistant', 'system']).withMessage('Rôle invalide'),
    body('content').isString().isLength({ min: 1, max: 10000 }).withMessage('Contenu invalide'),
    body('timestamp').optional().isISO8601().withMessage('Timestamp invalide')
];

// Route pour obtenir toutes les conversations
router.get('/', (req, res) => {
    try {
        const { search, limit = 50, offset = 0 } = req.query;
        let conversationList = Array.from(conversations.values());

        // Filtrage par recherche
        if (search) {
            const searchTerm = search.toLowerCase();
            conversationList = conversationList.filter(conv => 
                (conv.title && conv.title.toLowerCase().includes(searchTerm)) ||
                conv.messages.some(msg => 
                    msg.content && msg.content.toLowerCase().includes(searchTerm)
                )
            );
        }

        // Tri par date de mise à jour (plus récent en premier)
        conversationList.sort((a, b) => 
            new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
        );

        // Pagination
        const total = conversationList.length;
        const paginatedList = conversationList.slice(
            parseInt(offset), 
            parseInt(offset) + parseInt(limit)
        );

        res.json({
            success: true,
            conversations: paginatedList,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });

    } catch (error) {
        console.error('Erreur récupération conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des conversations'
        });
    }
});

// Route pour obtenir une conversation spécifique
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const conversation = conversations.get(id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation non trouvée'
            });
        }

        res.json({
            success: true,
            conversation
        });

    } catch (error) {
        console.error('Erreur récupération conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la conversation'
        });
    }
});

// Route pour créer ou mettre à jour une conversation
router.post('/', validateConversation, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: errors.array()
            });
        }

        const { id, title, messages = [], webhookUrl } = req.body;
        const conversationId = id || require('crypto').randomUUID();
        const now = new Date().toISOString();

        // Valider les messages
        for (const message of messages) {
            if (!message.role || !message.content) {
                return res.status(400).json({
                    success: false,
                    error: 'Messages invalides',
                    details: 'Chaque message doit avoir un rôle et un contenu'
                });
            }
        }

        const existingConversation = conversations.get(conversationId);
        const conversation = {
            id: conversationId,
            title: title || (existingConversation?.title) || generateTitle(messages),
            messages: messages,
            webhookUrl: webhookUrl,
            createdAt: existingConversation?.createdAt || now,
            updatedAt: now,
            messageCount: messages.length
        };

        conversations.set(conversationId, conversation);

        // Mettre à jour les statistiques
        if (!existingConversation) {
            conversationStats.totalConversations++;
        }
        conversationStats.totalMessages = Array.from(conversations.values())
            .reduce((total, conv) => total + conv.messages.length, 0);
        conversationStats.lastActivity = now;

        console.log(`💾 Conversation sauvegardée: ${conversationId} (${messages.length} messages)`);

        res.json({
            success: true,
            conversation,
            isNew: !existingConversation
        });

    } catch (error) {
        console.error('Erreur sauvegarde conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la sauvegarde de la conversation'
        });
    }
});

// Route pour ajouter un message à une conversation
router.post('/:id/messages', validateMessage, (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Message invalide',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { role, content, metadata = {} } = req.body;
        
        let conversation = conversations.get(id);
        if (!conversation) {
            // Créer une nouvelle conversation si elle n'existe pas
            conversation = {
                id,
                title: null,
                messages: [],
                createdAt: new Date().toISOString(),
                webhookUrl: null
            };
        }

        const message = {
            id: require('crypto').randomUUID(),
            role,
            content,
            timestamp: new Date().toISOString(),
            metadata
        };

        conversation.messages.push(message);
        conversation.updatedAt = new Date().toISOString();
        conversation.messageCount = conversation.messages.length;

        // Générer un titre si nécessaire
        if (!conversation.title && conversation.messages.length > 0) {
            conversation.title = generateTitle(conversation.messages);
        }

        conversations.set(id, conversation);

        // Mettre à jour les statistiques
        conversationStats.totalMessages++;
        conversationStats.lastActivity = new Date().toISOString();

        res.json({
            success: true,
            message,
            conversation
        });

    } catch (error) {
        console.error('Erreur ajout message:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'ajout du message'
        });
    }
});

// Route pour supprimer une conversation
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const conversation = conversations.get(id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation non trouvée'
            });
        }

        conversations.delete(id);

        // Mettre à jour les statistiques
        conversationStats.totalConversations--;
        conversationStats.totalMessages -= conversation.messages.length;

        console.log(`🗑️ Conversation supprimée: ${id}`);

        res.json({
            success: true,
            message: 'Conversation supprimée'
        });

    } catch (error) {
        console.error('Erreur suppression conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de la conversation'
        });
    }
});

// Route pour obtenir les statistiques
router.get('/stats/summary', (req, res) => {
    try {
        const conversationList = Array.from(conversations.values());
        
        // Calculer les statistiques avancées
        const totalMessages = conversationList.reduce((total, conv) => total + conv.messages.length, 0);
        const averageMessagesPerConversation = conversationList.length > 0 
            ? Math.round(totalMessages / conversationList.length) 
            : 0;

        // Messages par rôle
        const messagesByRole = { user: 0, assistant: 0, system: 0 };
        conversationList.forEach(conv => {
            conv.messages.forEach(msg => {
                if (messagesByRole.hasOwnProperty(msg.role)) {
                    messagesByRole[msg.role]++;
                }
            });
        });

        // Activité récente (dernières 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentConversations = conversationList.filter(conv => 
            new Date(conv.updatedAt || conv.createdAt) > oneDayAgo
        ).length;

        res.json({
            success: true,
            stats: {
                totalConversations: conversationList.length,
                totalMessages,
                averageMessagesPerConversation,
                messagesByRole,
                recentConversations,
                lastActivity: conversationStats.lastActivity,
                oldestConversation: conversationList.length > 0 
                    ? Math.min(...conversationList.map(c => new Date(c.createdAt))) 
                    : null
            }
        });

    } catch (error) {
        console.error('Erreur statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du calcul des statistiques'
        });
    }
});

// Route pour exporter toutes les conversations
router.get('/export/all', (req, res) => {
    try {
        const conversationList = Array.from(conversations.values());
        
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            totalConversations: conversationList.length,
            conversations: conversationList,
            stats: conversationStats
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="conversations-export.json"');
        res.json(exportData);

    } catch (error) {
        console.error('Erreur export:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'export'
        });
    }
});

// Route pour importer des conversations
router.post('/import', (req, res) => {
    try {
        const { conversations: importedConversations, overwrite = false } = req.body;

        if (!Array.isArray(importedConversations)) {
            return res.status(400).json({
                success: false,
                error: 'Format d\'import invalide'
            });
        }

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const conv of importedConversations) {
            try {
                if (!conv.id || !Array.isArray(conv.messages)) {
                    errors++;
                    continue;
                }

                const exists = conversations.has(conv.id);
                if (exists && !overwrite) {
                    skipped++;
                    continue;
                }

                conversations.set(conv.id, {
                    ...conv,
                    updatedAt: new Date().toISOString()
                });
                imported++;

            } catch (convError) {
                console.error('Erreur import conversation:', convError);
                errors++;
            }
        }

        // Recalculer les statistiques
        const conversationList = Array.from(conversations.values());
        conversationStats.totalConversations = conversationList.length;
        conversationStats.totalMessages = conversationList.reduce(
            (total, conv) => total + conv.messages.length, 0
        );
        conversationStats.lastActivity = new Date().toISOString();

        res.json({
            success: true,
            imported,
            skipped,
            errors,
            total: importedConversations.length
        });

    } catch (error) {
        console.error('Erreur import:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'import'
        });
    }
});

// Fonction utilitaire pour générer un titre de conversation
function generateTitle(messages) {
    if (!messages || messages.length === 0) {
        return 'Nouvelle conversation';
    }

    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage && firstUserMessage.content) {
        return firstUserMessage.content.substring(0, 50) + 
               (firstUserMessage.content.length > 50 ? '...' : '');
    }

    return `Conversation du ${new Date().toLocaleDateString('fr-FR')}`;
}

module.exports = router;
