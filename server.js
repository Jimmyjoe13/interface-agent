const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

// Import des routes
const webhookRoutes = require('./routes/webhook');
const conversationRoutes = require('./routes/conversations');
const healthRoutes = require('./routes/health');

// Création de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"]
        }
    }
}));

// Compression des réponses
app.use(compression());

// Logging des requêtes
app.use(morgan('combined'));

// Configuration CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://*.railway.app', 'https://*.up.railway.app']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting global
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limite de 1000 requêtes par IP par fenêtre
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting spécifique pour les webhooks
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requêtes par minute pour les webhooks
    message: {
        error: 'Trop de requêtes webhook, veuillez ralentir.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(globalLimiter);

// Parsing du JSON et URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
}));

// Routes API
app.use('/api/health', healthRoutes);
app.use('/api/webhook', webhookLimiter, webhookRoutes);
app.use('/api/conversations', conversationRoutes);

// Route pour servir l'application principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware de gestion des erreurs 404
app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({
            error: 'Endpoint API non trouvé',
            path: req.originalUrl,
            method: req.method
        });
    } else {
        // Pour les routes non-API, rediriger vers l'application principale
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Middleware de gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    
    // Erreur de validation
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Données invalides',
            details: err.message
        });
    }
    
    // Erreur de parsing JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'JSON invalide',
            details: 'Le format des données envoyées est incorrect'
        });
    }
    
    // Erreur générique
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Erreur interne du serveur' 
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Gestion gracieuse de l'arrêt du serveur
process.on('SIGTERM', () => {
    console.log('SIGTERM reçu, arrêt gracieux du serveur...');
    server.close(() => {
        console.log('Serveur arrêté.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT reçu, arrêt gracieux du serveur...');
    server.close(() => {
        console.log('Serveur arrêté.');
        process.exit(0);
    });
});

// Démarrage du serveur
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📱 Application disponible sur http://localhost:${PORT}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    
    if (process.env.NODE_ENV === 'production') {
        console.log('🔒 Mode production activé');
    } else {
        console.log('🔧 Mode développement activé');
    }
});

// Export pour les tests
module.exports = app;
