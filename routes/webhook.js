const express = require('express');
const fetch = require('node-fetch');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Utilitaire pour valider les URLs
const isValidUrl = (string) => {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
};

// Middleware de validation pour les webhooks
const validateWebhookRequest = [
    body('url')
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('URL invalide')
        .custom((value) => {
            if (!isValidUrl(value)) {
                throw new Error('URL doit utiliser le protocole HTTP ou HTTPS');
            }
            return true;
        }),
    body('method')
        .optional()
        .isIn(['GET', 'POST', 'PUT', 'PATCH'])
        .withMessage('Méthode HTTP non supportée'),
    body('headers')
        .optional()
        .isObject()
        .withMessage('Headers doivent être un objet'),
    body('payload')
        .optional()
        .isObject()
        .withMessage('Payload doit être un objet')
];

// Route pour tester la connexion à un webhook
router.post('/test', validateWebhookRequest, async (req, res) => {
    try {
        // Vérifier les erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: errors.array()
            });
        }

        const { url, method = 'POST', headers = {} } = req.body;
        const startTime = Date.now();

        // Payload de test
        const testPayload = {
            message: "Test de connexion depuis l'Assistant IA Universel",
            timestamp: new Date().toISOString(),
            test: true,
            source: 'ai-assistant-interface'
        };

        // Configuration de la requête
        const requestOptions = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AI-Assistant-Interface/1.0',
                ...headers
            },
            body: JSON.stringify(testPayload),
            timeout: 30000 // 30 secondes de timeout
        };

        console.log(`🔍 Test de connexion webhook: ${method} ${url}`);

        // Effectuer la requête
        const response = await fetch(url, requestOptions);
        const responseTime = Date.now() - startTime;

        // Lire la réponse
        let responseData;
        const contentType = response.headers.get('content-type');
        
        try {
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
        } catch (parseError) {
            responseData = 'Impossible de parser la réponse';
        }

        // Log du résultat
        console.log(`✅ Test webhook réussi: ${response.status} en ${responseTime}ms`);

        res.json({
            success: true,
            status: response.status,
            statusText: response.statusText,
            responseTime: responseTime,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData,
            message: 'Test de connexion réussi'
        });

    } catch (error) {
        console.error('❌ Erreur test webhook:', error.message);

        let errorMessage = 'Erreur de connexion';
        let errorCode = 'CONNECTION_ERROR';

        if (error.code === 'ENOTFOUND') {
            errorMessage = 'Serveur introuvable';
            errorCode = 'DNS_ERROR';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connexion refusée';
            errorCode = 'CONNECTION_REFUSED';
        } else if (error.code === 'ETIMEDOUT' || error.name === 'AbortError') {
            errorMessage = 'Timeout de connexion';
            errorCode = 'TIMEOUT';
        } else if (error.message.includes('Invalid URL')) {
            errorMessage = 'URL invalide';
            errorCode = 'INVALID_URL';
        }

        res.status(400).json({
            success: false,
            error: errorMessage,
            code: errorCode,
            details: error.message,
            message: 'Échec du test de connexion'
        });
    }
});

// Route pour envoyer un message via le proxy webhook
router.post('/send', validateWebhookRequest, async (req, res) => {
    try {
        // Vérifier les erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: errors.array()
            });
        }

        const { url, method = 'POST', headers = {}, payload } = req.body;
        const startTime = Date.now();

        if (!payload || !payload.message) {
            return res.status(400).json({
                success: false,
                error: 'Message requis',
                details: 'Le payload doit contenir un message'
            });
        }

        // Enrichir le payload avec des métadonnées
        const enrichedPayload = {
            ...payload,
            timestamp: new Date().toISOString(),
            source: 'ai-assistant-interface',
            version: '1.0'
        };

        // Configuration de la requête
        const requestOptions = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AI-Assistant-Interface/1.0',
                ...headers
            },
            body: JSON.stringify(enrichedPayload),
            timeout: 30000
        };

        console.log(`📤 Envoi message webhook: ${method} ${url}`);

        // Effectuer la requête
        const response = await fetch(url, requestOptions);
        const responseTime = Date.now() - startTime;

        // Vérifier le statut de la réponse
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Lire la réponse
        let responseData;
        const contentType = response.headers.get('content-type');
        
        try {
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
        } catch (parseError) {
            responseData = 'Réponse reçue mais impossible à parser';
        }

        // Traiter la réponse pour extraire le message de l'assistant
        let assistantMessage = '';
        let metadata = {};

        if (typeof responseData === 'string') {
            assistantMessage = responseData;
        } else if (responseData && typeof responseData === 'object') {
            // Formats de réponse courants
            if (responseData.response || responseData.message) {
                assistantMessage = responseData.response || responseData.message;
            } else if (responseData.choices && responseData.choices[0]) {
                // Format OpenAI-like
                assistantMessage = responseData.choices[0].message?.content || 
                                 responseData.choices[0].text || '';
            } else if (responseData.text) {
                assistantMessage = responseData.text;
            } else if (responseData.content) {
                assistantMessage = responseData.content;
            } else {
                // Fallback: convertir l'objet en chaîne
                assistantMessage = JSON.stringify(responseData, null, 2);
            }

            // Extraire les métadonnées
            metadata = {
                model: responseData.model,
                usage: responseData.usage,
                finish_reason: responseData.finish_reason,
                ...responseData.metadata
            };
        }

        console.log(`✅ Message envoyé avec succès en ${responseTime}ms`);

        res.json({
            success: true,
            content: assistantMessage,
            metadata: metadata,
            responseTime: responseTime,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
        });

    } catch (error) {
        console.error('❌ Erreur envoi webhook:', error.message);

        let errorMessage = 'Erreur lors de l\'envoi';
        let errorCode = 'SEND_ERROR';

        if (error.code === 'ENOTFOUND') {
            errorMessage = 'Serveur introuvable';
            errorCode = 'DNS_ERROR';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connexion refusée';
            errorCode = 'CONNECTION_REFUSED';
        } else if (error.code === 'ETIMEDOUT' || error.name === 'AbortError') {
            errorMessage = 'Timeout de connexion';
            errorCode = 'TIMEOUT';
        } else if (error.message.includes('HTTP')) {
            errorMessage = error.message;
            errorCode = 'HTTP_ERROR';
        }

        res.status(400).json({
            success: false,
            error: errorMessage,
            code: errorCode,
            details: error.message
        });
    }
});

// Route pour obtenir des informations sur un webhook
router.post('/info', [
    body('url').isURL().withMessage('URL invalide')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'URL invalide',
                details: errors.array()
            });
        }

        const { url } = req.body;

        try {
            // Faire une requête HEAD pour obtenir les informations
            const response = await fetch(url, { 
                method: 'HEAD',
                timeout: 10000
            });

            res.json({
                success: true,
                url: url,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                accessible: response.ok
            });

        } catch (error) {
            res.json({
                success: false,
                url: url,
                accessible: false,
                error: error.message
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la vérification',
            details: error.message
        });
    }
});

module.exports = router;
