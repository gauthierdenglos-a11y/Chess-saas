# Configuration WebSocket pour la Production

## Problème Corrigé
L'erreur "WebSocket not connected" en production était due au serveur WebSocket n'écoutant que sur `localhost` au lieu de tous les interfaces (`0.0.0.0`).

## Corrections Appliquées

### 1. **server.js** 
- Le serveur écoute maintenant sur `0.0.0.0` en production (tous les interfaces réseau)
- Sur le port spécifié par `WS_PORT` (défaut: 8080)

### 2. **websocketStore.js**
- Support d'une variable d'environnement `VITE_WS_URL` pour configurer l'URL WebSocket en production
- Priorité: `VITE_WS_URL` → `ws://hostname:port` (fallback)

## Configuration en Production

### **Méthode 1: Reverse Proxy (RECOMMANDÉ)**

Utiliser **nginx** pour proxy le trafic `/ws`:

```nginx
server {
    listen 443 ssl;
    server_name votre-domaine.com;

    # Servir le frontend
    location / {
        proxy_pass http://localhost:5173;  # Port Vite
    }

    # Proxy WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Puis configurer:
```bash
VITE_WS_URL=wss://votre-domaine.com/ws
```

### **Méthode 2: Port Direct (Non Sécurisé)**

Exposer directement le port 8080 (déconseillé en production):

```bash
VITE_WS_URL=wss://votre-domaine.com:8080
WS_PORT=8080
```

### **Méthode 3: Port Personnalisé**

Utiliser un port custom via variable d'environnement:

```bash
WS_PORT=3000
VITE_WS_PORT=3000
```

## Instructions de Déploiement

1. **Installer les dépendances:**
   ```bash
   npm install
   ```

2. **Créer `.env.production`** (copier depuis `.env.production.example`):
   ```bash
   cp .env.production.example .env.production
   ```

3. **Configurer `VITE_WS_URL`** selon votre infrastructure

4. **Build:**
   ```bash
   npm run build
   ```

5. **Lancer le serveur WebSocket:**
   ```bash
   WS_PORT=8080 npm run start:server
   ```

6. **Servir le frontend** (via Nginx, Vercel, etc.):
   ```bash
   # Fichier statique depuis dist/
   npm run preview
   ```

## Vérification

Pour tester la connexion WebSocket en production:

```javascript
// Dans la console du navigateur
const ws = new WebSocket('wss://votre-domaine.com/ws');
ws.onopen = () => console.log('✓ WebSocket connecté');
ws.onerror = (e) => console.log('✗ Erreur:', e);
```

## Variables d'Environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `WS_PORT` | `8080` | Port du serveur WebSocket |
| `VITE_WS_URL` | Auto | URL WebSocket complete (prod only) |
| `VITE_WS_PORT` | `8080` | Port WebSocket côté client |

## Troubleshooting

- **"WebSocket not connected"**: Vérifier que `WS_PORT` est accessible et qu'un proxy redirige `/ws` correctement
- **Timeout de connexion**: Vérifier les pare-feu, régles CORS WebSocket, et la stabilité du serveur
- **Mixed content error**: Utiliser `wss://` pour les connexions HTTPS

