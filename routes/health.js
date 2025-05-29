const express = require('express');
const router = express.Router();

// Informations sur l'application
const appInfo = {
    name: 'Assistant IA Universel',
    version: '1.0.0',
    description: 'Interface d\'assistant IA universel capable de se connecter à n\'importe quel webhook',
    author: 'Jimmy'
};

// Variables pour le monitoring
let serverStats = {
    startTime: new Date(),
    requestCount: 0,
    errorCount: 0,
    lastError: null,
    uptime: 0
};

// Middleware pour compter les requêtes
router.use((req, res, next) => {
    serverStats.requestCount++;
    serverStats.uptime = Math.floor((Date.now() - serverStats.startTime.getTime()) / 1000);
    next();
});

// Route de health check basique
router.get('/', (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: serverStats.uptime,
        environment: process.env.NODE_ENV || 'development',
        version: appInfo.version
    };

    res.json(healthStatus);
});

// Route de health check détaillé
router.get('/detailed', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const detailedHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        app: appInfo,
        server: {
            uptime: serverStats.uptime,
            startTime: serverStats.startTime,
            requestCount: serverStats.requestCount,
            errorCount: serverStats.errorCount,
            lastError: serverStats.lastError,
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        },
        memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
            external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
            arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024) + ' MB'
        },
        cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
        },
        features: {
            webhookProxy: true,
            conversationStorage: true,
            rateLimit: true,
            cors: true,
            compression: true,
            security: true
        }
    };

    res.json(detailedHealth);
});

// Route pour les métriques Prometheus (optionnel)
router.get('/metrics', (req, res) => {
    const metrics = `
# HELP app_requests_total Total number of requests
# TYPE app_requests_total counter
app_requests_total ${serverStats.requestCount}

# HELP app_errors_total Total number of errors
# TYPE app_errors_total counter
app_errors_total ${serverStats.errorCount}

# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds gauge
app_uptime_seconds ${serverStats.uptime}

# HELP nodejs_memory_heap_used_bytes Node.js heap memory used
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${process.memoryUsage().heapUsed}

# HELP nodejs_memory_heap_total_bytes Node.js heap memory total
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${process.memoryUsage().heapTotal}
`.trim();

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});

// Route de readiness check (pour Kubernetes)
router.get('/ready', (req, res) => {
    // Vérifier que l'application est prête à recevoir du trafic
    const isReady = serverStats.uptime > 5; // Prêt après 5 secondes
    
    if (isReady) {
        res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            uptime: serverStats.uptime
        });
    } else {
        res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            uptime: serverStats.uptime,
            reason: 'Application still starting'
        });
    }
});

// Route de liveness check (pour Kubernetes)
router.get('/live', (req, res) => {
    // Vérifier que l'application est vivante
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    
    // Considérer l'app comme non-vivante si elle utilise plus de 512MB de heap
    const isAlive = heapUsedMB < 512;
    
    if (isAlive) {
        res.json({
            status: 'alive',
            timestamp: new Date().toISOString(),
            memoryUsageMB: Math.round(heapUsedMB)
        });
    } else {
        res.status(503).json({
            status: 'not alive',
            timestamp: new Date().toISOString(),
            memoryUsageMB: Math.round(heapUsedMB),
            reason: 'High memory usage'
        });
    }
});

// Route pour obtenir les informations de version
router.get('/version', (req, res) => {
    res.json({
        ...appInfo,
        buildDate: serverStats.startTime,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Route pour obtenir les statistiques du serveur
router.get('/stats', (req, res) => {
    const stats = {
        ...serverStats,
        uptime: serverStats.uptime,
        requestsPerSecond: serverStats.uptime > 0 ? 
            Math.round(serverStats.requestCount / serverStats.uptime * 100) / 100 : 0,
        errorRate: serverStats.requestCount > 0 ? 
            Math.round(serverStats.errorCount / serverStats.requestCount * 10000) / 100 : 0,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
    };

    res.json(stats);
});

// Fonction pour enregistrer une erreur
function recordError(error) {
    serverStats.errorCount++;
    serverStats.lastError = {
        message: error.message,
        timestamp: new Date().toISOString(),
        stack: error.stack
    };
}

// Export des fonctions utilitaires
module.exports = router;
module.exports.recordError = recordError;
module.exports.getStats = () => serverStats;
