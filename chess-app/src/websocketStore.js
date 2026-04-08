/**
 * WebSocket Multiplayer Store
 * Client-side WebSocket connection pour synchroniser les rooms temps réel
 * Compatible avec l'API de SupabaseSimulator/SupabaseRemote
 */

// Construire l'URL WebSocket dynamiquement
function getWebSocketUrl(configUrl) {
  // Si URL explicite fournie, l'utiliser
  if (configUrl && configUrl !== 'ws://localhost:8080') {
    return configUrl;
  }

  // En développement local, utiliser localhost:8080
  if (import.meta.env.DEV) {
    return 'ws://localhost:8080';
  }

  // En production, construire l'URL à partir du host courant
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // includes hostname + port if non-standard
  return `${protocol}//${host}`;
}

export class WebSocketMultiplayerStore {
  constructor(configUrl = null) {
    this.wsUrl = getWebSocketUrl(configUrl);
    this.ws = null;
    this.messageHandlers = new Map();
    this.subscriptions = new Map();
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.failedPermanently = false;

    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      this.ws.onerror = (event) => {
        if (import.meta.env.DEV) {
          console.error('[WebSocket] Error:', event);
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.isConnected = false;
        this.reconnect();
      };
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
      this.reconnect();
    }
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.failedPermanently = true;
      if (import.meta.env.DEV) {
        console.warn(
          '[WebSocket] Max reconnection attempts reached. Using localStorage fallback.'
        );
      }
      return;
    }

    this.reconnectAttempts += 1;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    if (import.meta.env.DEV) {
      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    }

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  handleMessage(data) {
    const { type, messageId, roomId } = data;

    // Handle room subscription updates
    if (type === 'room_updated' && roomId && this.subscriptions.has(roomId)) {
      const callbacks = this.subscriptions.get(roomId);
      callbacks.forEach((callback) => callback(data));
    }

    // Handle request responses (replies with messageId)
    if (messageId !== undefined && this.pendingRequests.has(messageId)) {
      const { resolve } = this.pendingRequests.get(messageId);
      this.pendingRequests.delete(messageId);
      resolve(data);
    }
  }

  send(message) {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.failedPermanently) {
        resolve({ error: 'WebSocket not connected' });
        return;
      }

      const messageId = this.messageId++;
      const messageToSend = { ...message, messageId };

      this.pendingRequests.set(messageId, { resolve });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(messageId)) {
          this.pendingRequests.delete(messageId);
          resolve({ error: 'Request timeout' });
        }
      }, 5000);

      this.ws.send(JSON.stringify(messageToSend));
    });
  }

  async createGame(gameData) {
    // Not used for multiplayer, just return success
    return Promise.resolve({ data: { ...gameData, id: `game-${Date.now()}` }, error: null });
  }

  async getAllGames() {
    // Not implemented for WebSocket version
    return Promise.resolve({ data: [], error: null });
  }

  async getGameById() {
    // Not implemented for WebSocket version
    return Promise.resolve({ data: null, error: 'Not implemented' });
  }

  async updateGame() {
    // Not implemented for WebSocket version
    return Promise.resolve({ data: null, error: 'Not implemented' });
  }

  async createRoom(roomData) {
    const response = await this.send({
      type: 'create_room',
      payload: roomData,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.type === 'error') {
      throw new Error(response.message);
    }

    return response.room || response.payload;
  }

  async getRoom(roomId) {
    const response = await this.send({
      type: 'get_room',
      payload: { roomId },
    });

    if (response.type === 'error') {
      return { data: null, error: response.message };
    }

    return { data: response.room || null, error: null };
  }

  async updateRoom(roomId, updates) {
    const response = await this.send({
      type: 'update_room',
      payload: { roomId, updates },
    });

    if (response.type === 'error') {
      return { data: null, error: response.message };
    }

    return { data: response.room || null, error: null };
  }

  onRoomChange(roomId, callback) {
    const normalizedRoomId = (roomId || '').trim().toUpperCase();

    // Subscribe to room updates
    if (!this.subscriptions.has(normalizedRoomId)) {
      this.subscriptions.set(normalizedRoomId, new Set());
      this.send({
        type: 'subscribe_room',
        payload: { roomId: normalizedRoomId },
      });
    }

    this.subscriptions.get(normalizedRoomId).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(normalizedRoomId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(normalizedRoomId);
          this.send({
            type: 'unsubscribe_room',
            payload: { roomId: normalizedRoomId },
          });
        }
      }
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
