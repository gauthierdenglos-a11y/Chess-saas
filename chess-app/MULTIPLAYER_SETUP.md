# Configuration Multijoueur - WebSocket Server

## 🔧 Problème Corrigé

Le multijoueur n'était fonctionnel que sur le **même PC** car l'application utilisait `localStorage` (isolé par machine). Désormais, un **serveur WebSocket** synchronise les rooms en temps réel entre les machines.

## 📋 Prérequis

- Node.js 16+ installé
- NPM ou Yarn

## 🚀 Installation & Démarrage

### 1. Installer les dépendances

```bash
npm install
```

Cela installe les nouvelles dépendances:
- `ws` - WebSocket serveur
- `concurrently` - Pour lancer le serveur et l'app en parallèle

### 2. Démarrer le serveur et l'app

```bash
npm start
```

Cette commande lance:
- **Serveur WebSocket** sur `ws://localhost:8080` (affiche un banner au démarrage)
- **Vite Dev Server** sur `http://localhost:5173` (ou le port suivant disponible)

### 3. Jouer entre deux machines

#### Sur le PC du créateur (Machine A):
1. Ouvrir `http://localhost:5173` 
2. Aller à **Multijoueur → Créer une Room**
3. Mettre son nom et cliquer **Créer une Room**
4. Copier le **code de 6 caractères** (ex: `ABCD12`)

#### Sur le PC de l'ami (Machine B):
1. Ouvrir `http://<IP_DE_A>:5173` (remplacer avec l'IP locale du PC A)
2. Aller à **Multijoueur → Rejoindre une Room**
3. Mettre son nom et entrer le **code de room** (ex: `ABCD12`)
4. Cliquer **Rejoindre**

## 🌐 Configuration Réseau

### Sur le même WiFi/réseau local

Si les deux machines sont sur le **même réseau**:

1. Trouver l'adresse IP du serveur (Machine A):
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Utiliser cette IP sur Machine B:
   - Remplacer `localhost` par l'IP trouvée
   - URL sur Machine B: `http://192.168.X.X:5173`

### À distance (internet)

Pour jouer sur **internet**, deux options:

#### Option 1: Utiliser un tunnel ngrok (simple)
```bash
# Terminal 1: Démarrer l'app normalement
npm start

# Terminal 2: Créer un tunnel WebSocket
npx ngrok start --all
```

Utiliser l'URL fournie par ngrok sur les deux machines.

#### Option 2: Déployer sur un serveur cloud
- Voir section "Déploiement Production" ci-dessous

## 🛑 Arrêter l'application

Appuyer sur `Ctrl+C` dans le terminal (arrête serveur + Vite).

## 🔄 Alternative: Lancer Serveur et App séparément

Si vous préférez deux terminaux:

```bash
# Terminal 1: Serveur WebSocket
npm run start:server

# Terminal 2: Application Vite
npm run dev
```

Le serveur WebSocket tournera sur `ws://localhost:8080`
L'app sera sur `http://localhost:5173`

## 🐛 Dépannage

### "Connection refused" ou "Cannot connect to server"

**Cause**: Le serveur WebSocket ne tourne pas.

**Solution**:
```bash
# Vérifier que npm start tourne correctement
# Vous devriez voir cet affichage:
# ╔══════════════════════════════════════════════╗
# ║  Chess App WebSocket Server Started          ║
# ║  Port: 8080                                  ║
# ║  URL: ws://localhost:8080                     ║
# ╚══════════════════════════════════════════════╝
```

### L'ami ne voit pas le code créé

**Cause**: Les deux machines ne sont pas connectées au serveur WebSocket.

**Solutions**:
1. Vérifier que les deux machines utilisent le **même serveur**
2. Si sur deux PC différents, vérifier l'**IP locale** du serveur
3. Vérifier que le **port 8080** n'est pas bloqué par le firewall

### "Room not found" lors de la connexion

**Cause**: 
- Code entré incorrectement
- Room créée mais serveur WebSocket pas accessible
- Code expiré (room supprimée après déconnexion du créateur)

**Solutions**:
1. Vérifier l'exactitude du code (6 caractères, majuscules)
2. Créer une nouvelle room si elle a expiré

## 📊 Architecture

```
┌─────────────────────────────────────────────┐
│         Machine A (Créateur)                │
├─────────────────────────────────────────────┤
│  React App          WebSocket Client        │
│  localhost:5173     ws://localhost:8080     │
└──────────────┬──────────────────────────────┘
               │ TCP connection
               │ (Port 8080)
┌──────────────▼──────────────────────────────┐
│      WebSocket Server (Node.js)             │
│         server.js                           │
│         localhost:8080                      │
│  - Room management                          │
│  - Real-time sync                           │
│  - Client subscriptions                     │
└──────────────┬──────────────────────────────┘
               │ TCP connection
               │ (Port 8080)
┌──────────────▼──────────────────────────────┐
│         Machine B (Ami)                     │
├─────────────────────────────────────────────┤
│  React App          WebSocket Client        │
│  192.168.X.X:5173   ws://192.168.X.X:8080  │
└─────────────────────────────────────────────┘
```

## 🎯 Fonctionnement

1. **Créer une room**:
   - Le client envoie `create_room` au serveur
   - Le serveur génère un code unique (6 chars)
   - Room stockée en mémoire avec timestamp

2. **Rejoindre une room**:
   - Le client envoie `join_room` avec le code
   - Le serveur vérifie que la room existe
   - Marque la room comme `in_progress`
   - Les deux clients sont `subscribers` à la room

3. **Synchronisation temps réel**:
   - Chaque mouvement est envoyé via `update_room`
   - Le serveur notifie les `subscribers`
   - Latence typique: < 50ms sur LAN

## 🌟 Prochaines étapes (optionnel)

### Utiliser Supabase à la place
Si vous voulez une base de données persistante:

1. Créer un compte [Supabase](https://supabase.com)
2. Créer une table `rooms` avec les colonnes appropriées
3. Ajouter le `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Déploiement production
- Déployer le serveur WebSocket sur un serveur cloud (Heroku, Railway, DigitalOcean, AWS...)
- Déployer l'app React sur Vercel ou Netlify
- Configurer les CORS et variables d'environnement appropriées

## 📝 Notes

- Les rooms sont **stockées en mémoire** (disparaissent au redémarrage du serveur)
- Pour une persistance, switcher à Supabase ou ajouter une BD
- Port par défaut : `8080` (configurable via `WS_PORT` env var)
- Timeout de reconnexion WebSocket : 5 secondes max
