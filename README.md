# Assistant IA Universel

Interface d'assistant IA universel capable de se connecter à n'importe quel webhook REST.

## 🚀 Fonctionnalités

### Interface de Chat
- Interface de chat moderne et responsive
- Support du markdown pour les réponses de l'assistant
- Indicateur de frappe en temps réel
- Messages avec timestamps et statuts
- Auto-redimensionnement de la zone de saisie
- Raccourcis clavier (Ctrl+Entrée pour envoyer)

### Configuration de Webhook
- Formulaire de configuration complet
- Validation en temps réel des URLs
- Support des méthodes HTTP (POST, PUT, PATCH)
- Headers personnalisés en format JSON
- Test de connexion avant sauvegarde
- Gestion des profils sauvegardés

### Backend Express
- **Proxy CORS** : Résout les problèmes de cross-origin
- **Rate limiting** : Protection contre le spam
- **Validation** : Sécurisation des données
- **Monitoring** : Health checks et métriques
- **APIs REST** : Gestion des conversations et webhooks

### Fonctionnalités Avancées
- Thème clair/sombre avec basculement
- Stockage local persistant
- Notifications toast
- Interface responsive (mobile-friendly)
- Gestion d'erreurs robuste
- Architecture modulaire et extensible

## 🏗️ Architecture

```
interface-agent/
├── package.json              # Configuration Node.js
├── server.js                 # Serveur Express principal
├── routes/                   # Routes API
│   ├── webhook.js           # Proxy webhook et CORS
│   ├── conversations.js     # Gestion des conversations
│   └── health.js            # Health checks et monitoring
├── public/                   # Fichiers statiques frontend
│   ├── index.html           # Interface principale
│   ├── scripts/             # JavaScript frontend
│   └── styles/              # CSS et thèmes
├── .gitignore               # Fichiers à ignorer
└── README.md                # Documentation
```

## 🛠️ Installation et Développement

### Prérequis
- Node.js 16+ 
- npm ou yarn

### Installation locale
```bash
# Cloner le projet
git clone <repository-url>
cd interface-agent

# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev

# Ou démarrer en mode production
npm start
```

L'application sera disponible sur `http://localhost:3000`

## 🚀 Déploiement sur Railway

### Méthode 1 : Via GitHub (Recommandée)

1. **Pousser le code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. **Connecter à Railway**
   - Aller sur [railway.app](https://railway.app)
   - Se connecter avec GitHub
   - Cliquer sur "New Project"
   - Sélectionner "Deploy from GitHub repo"
   - Choisir votre repository

3. **Configuration automatique**
   - Railway détecte automatiquement Node.js
   - Le déploiement se lance automatiquement
   - L'URL sera générée automatiquement

### Méthode 2 : Via Railway CLI

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Initialiser le projet
railway init

# Déployer
railway up
```

### Variables d'environnement (optionnelles)

Dans Railway, vous pouvez configurer :
- `NODE_ENV=production`
- `PORT` (automatiquement défini par Railway)

## 📡 APIs Backend

### Webhook Proxy
- `POST /api/webhook/test` - Tester une connexion webhook
- `POST /api/webhook/send` - Envoyer un message via proxy
- `POST /api/webhook/info` - Obtenir des infos sur un webhook

### Conversations
- `GET /api/conversations` - Liste des conversations
- `POST /api/conversations` - Créer/mettre à jour une conversation
- `GET /api/conversations/:id` - Récupérer une conversation
- `DELETE /api/conversations/:id` - Supprimer une conversation

### Monitoring
- `GET /api/health` - Health check basique
- `GET /api/health/detailed` - Health check détaillé
- `GET /api/health/stats` - Statistiques du serveur

## 🔧 Configuration des Webhooks

L'application supporte tout webhook REST qui :
- Accepte les requêtes POST/PUT/PATCH
- Reçoit du JSON
- Retourne une réponse (texte ou JSON)

### Formats de réponse supportés

**Format simple (texte)**
```
"Voici ma réponse"
```

**Format structuré**
```json
{
  "response": "Voici ma réponse",
  "metadata": { ... }
}
```

**Format OpenAI-compatible**
```json
{
  "choices": [
    {
      "message": {
        "content": "Voici ma réponse"
      }
    }
  ]
}
```

## 🔒 Sécurité

- **Helmet.js** : Headers de sécurité HTTP
- **Rate limiting** : Protection contre le spam
- **CORS** : Configuration sécurisée
- **Validation** : Validation des entrées utilisateur
- **Sanitisation** : Nettoyage des données

## 📊 Monitoring

L'application inclut plusieurs endpoints de monitoring :

- `/api/health` - Status de base
- `/api/health/detailed` - Informations détaillées
- `/api/health/metrics` - Métriques Prometheus
- `/api/health/ready` - Readiness check (Kubernetes)
- `/api/health/live` - Liveness check (Kubernetes)

## 🎨 Personnalisation

### Thèmes
L'application supporte les thèmes clair et sombre avec des variables CSS personnalisables dans `public/styles/main.css`.

### Extensions
L'architecture modulaire permet d'ajouter facilement :
- Nouveaux types de webhooks
- Fonctionnalités de chat avancées
- Intégrations avec d'autres services
- Systèmes d'authentification

## 🐛 Dépannage

### Problèmes courants

**Erreur CORS**
- Utilisez le proxy backend intégré
- Vérifiez la configuration CORS dans `server.js`

**Webhook ne répond pas**
- Vérifiez l'URL et la méthode HTTP
- Testez avec l'outil de test intégré
- Consultez les logs du serveur

**Problème de déploiement Railway**
- Vérifiez que `package.json` contient le script `start`
- Assurez-vous que le port est configuré correctement
- Consultez les logs de déploiement

## 📝 Licence

MIT License - voir le fichier LICENSE pour plus de détails.

## 👨‍💻 Auteur

Jimmy - Interface d'Assistant IA Universel

---

🚀 **Prêt pour la production sur Railway !**
