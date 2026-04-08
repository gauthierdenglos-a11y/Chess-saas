/**
 * Client Supabase simplifié pour le MVP
 * À configurer avec les vraies clés d'environnement après
 */

import { createClient } from '@supabase/supabase-js';

// Pour le MVP local, on simule Supabase avec localStorage
class SupabaseSimulator {
  constructor() {
    this.games = this._loadGames();
    this.rooms = this._loadRooms();

    // Guarantee instance context even if methods are passed around.
    this.createRoom = this.createRoom.bind(this);
    this.getRoom = this.getRoom.bind(this);
    this.updateRoom = this.updateRoom.bind(this);
    this.onRoomChange = this.onRoomChange.bind(this);
  }

  _refreshGames() {
    this.games = this._loadGames();
    return this.games;
  }

  _refreshRooms() {
    this.rooms = this._loadRooms();
    return this.rooms;
  }

  _loadGames() {
    try {
      const stored = localStorage.getItem('chess-app-games-v1');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  _saveGames() {
    localStorage.setItem('chess-app-games-v1', JSON.stringify(this.games));
  }

  _loadRooms() {
    try {
      const stored = localStorage.getItem('chess-app-rooms-v1');
      const parsed = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) {
        return new Map();
      }
      return new Map(parsed.map((room) => [room.id, room]));
    } catch {
      return new Map();
    }
  }

  _saveRooms() {
    const roomsArray = Array.from(this.rooms.values());
    localStorage.setItem('chess-app-rooms-v1', JSON.stringify(roomsArray));
  }

  // Créer une partie
  createGame(gameData) {
    const game = {
      id: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      ...gameData,
    };
    this.games.push(game);
    this._saveGames();
    return Promise.resolve({ data: game, error: null });
  }

  // Récupérer toutes les parties
  getAllGames() {
    this._refreshGames();
    return Promise.resolve({ data: this.games, error: null });
  }

  // Récupérer une partie par ID
  getGameById(id) {
    this._refreshGames();
    const game = this.games.find(g => g.id === id);
    return Promise.resolve({ data: game, error: game ? null : 'Game not found' });
  }

  // Mettre à jour une partie
  updateGame(id, updates) {
    this._refreshGames();
    const idx = this.games.findIndex(g => g.id === id);
    if (idx === -1) {
      return Promise.resolve({ error: 'Game not found' });
    }
    this.games[idx] = { ...this.games[idx], ...updates };
    this._saveGames();
    return Promise.resolve({ data: this.games[idx], error: null });
  }

  // Créer une room multijoueur
  createRoom(roomData) {
    const roomId = roomData.id || `room-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const room = {
      id: roomId,
      createdAt: new Date().toISOString(),
      ...roomData,
    };
    this.rooms.set(room.id, room);
    this._saveRooms();
    return Promise.resolve(room);
  }

  // Rejoindre une room
  getRoom(roomId) {
    this._refreshRooms();
    const normalizedRoomId = (roomId || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedRoomId);
    return Promise.resolve({ data: room, error: room ? null : 'Room not found' });
  }

  // Mettre à jour une room
  updateRoom(roomId, updates) {
    this._refreshRooms();
    const normalizedRoomId = (roomId || '').trim().toUpperCase();
    const room = this.rooms.get(normalizedRoomId);
    if (!room) {
      return Promise.resolve({ error: 'Room not found' });
    }
    const updated = { ...room, ...updates };
    this.rooms.set(normalizedRoomId, updated);
    this._saveRooms();
    return Promise.resolve({ data: updated, error: null });
  }

  // Listener temps réel pour une room
  onRoomChange(roomId, callback) {
    const normalizedRoomId = (roomId || '').trim().toUpperCase();

    const emitLatestRoom = () => {
      this._refreshRooms();
      const room = this.rooms.get(normalizedRoomId);
      if (room) {
        callback({ new: room });
      }
    };

    // Simulation simple : polling toutes les 500ms
    const interval = setInterval(() => {
      emitLatestRoom();
    }, 500);

    const onStorage = (event) => {
      if (event.key === 'chess-app-rooms-v1') {
        emitLatestRoom();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }
}

class SupabaseRemote {
  constructor(url, anonKey) {
    this.client = createClient(url, anonKey);
  }

  async createGame(gameData) {
    const { data, error } = await this.client
      .from('games')
      .insert(gameData)
      .select('*')
      .single();

    return { data, error: error?.message || null };
  }

  async getAllGames() {
    const { data, error } = await this.client
      .from('games')
      .select('*')
      .order('startedAt', { ascending: false });

    return { data: data || [], error: error?.message || null };
  }

  async getGameById(id) {
    const { data, error } = await this.client
      .from('games')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return { data: data || null, error: error?.message || null };
  }

  async updateGame(id, updates) {
    const { data, error } = await this.client
      .from('games')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    return { data, error: error?.message || null };
  }

  async createRoom(roomData) {
    const { data, error } = await this.client
      .from('rooms')
      .insert(roomData)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Erreur de création de room');
    }

    return data;
  }

  async getRoom(roomId) {
    const normalizedRoomId = (roomId || '').trim().toUpperCase();
    const { data, error } = await this.client
      .from('rooms')
      .select('*')
      .eq('id', normalizedRoomId)
      .maybeSingle();

    return { data: data || null, error: error?.message || null };
  }

  async updateRoom(roomId, updates) {
    const normalizedRoomId = (roomId || '').trim().toUpperCase();
    const { data, error } = await this.client
      .from('rooms')
      .update({ ...updates, updatedAt: new Date().toISOString() })
      .eq('id', normalizedRoomId)
      .select('*')
      .single();

    return { data, error: error?.message || null };
  }

  onRoomChange(roomId, callback) {
    const normalizedRoomId = (roomId || '').trim().toUpperCase();
    const channel = this.client
      .channel(`room-${normalizedRoomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${normalizedRoomId}`,
        },
        (payload) => callback(payload),
      )
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }
}

import { WebSocketMultiplayerStore } from './websocketStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
const wsUrl = import.meta.env.VITE_WS_URL || null; // null = auto-detect
const isGitHubPagesHost =
  typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
const hasExplicitWebSocketConfig = Boolean(wsUrl);
const shouldPreferLocalStorage =
  !hasSupabaseConfig && isGitHubPagesHost && !hasExplicitWebSocketConfig;

export const isUsingSupabaseRemote = hasSupabaseConfig;
export const isUsingWebSocket = !hasSupabaseConfig && !shouldPreferLocalStorage;

// Stratégie : Supabase → WebSocket → localStorage (fallback)
let supabase;

if (hasSupabaseConfig) {
  if (import.meta.env.DEV) {
    console.log('[Supabase] Using Supabase Remote');
  }
  supabase = new SupabaseRemote(supabaseUrl, supabaseAnonKey);
} else {
  // Créer un wrapper qui bascule de WebSocket à localStorage silencieusement
  supabase = createAdaptiveStore(wsUrl);
}

export function getMultiplayerConnectionStatus() {
  if (hasSupabaseConfig) {
    return {
      mode: 'supabase',
      isConnected: true,
      isFallbackLocal: false,
      reconnectAttempts: 0,
    };
  }

  if (shouldPreferLocalStorage) {
    return {
      mode: 'localStorage',
      isConnected: true,
      isFallbackLocal: true,
      reconnectAttempts: 0,
    };
  }

  return {
    mode: 'websocket',
    isConnected: Boolean(supabase?.isConnected),
    isFallbackLocal: Boolean(supabase?.failedPermanently),
    reconnectAttempts: Number(supabase?.reconnectAttempts || 0),
  };
}

export function getMultiplayerDiagnostics() {
  const selectedMode = hasSupabaseConfig
    ? 'supabase'
    : shouldPreferLocalStorage
      ? 'localStorage'
      : 'websocket';

  return {
    selectedMode,
    hasSupabaseConfig,
    hasExplicitWebSocketConfig,
    shouldPreferLocalStorage,
    isGitHubPagesHost,
    host:
      typeof window !== 'undefined'
        ? {
            hostname: window.location.hostname,
            host: window.location.host,
            protocol: window.location.protocol,
          }
        : null,
    websocketState:
      selectedMode === 'websocket'
        ? {
            isConnected: Boolean(supabase?.isConnected),
            failedPermanently: Boolean(supabase?.failedPermanently),
            reconnectAttempts: Number(supabase?.reconnectAttempts || 0),
          }
        : null,
  };
}

if (typeof window !== 'undefined') {
  // Browser console helper: window.__CHESS_MULTIPLAYER_DIAG__()
  window.__CHESS_MULTIPLAYER_DIAG__ = getMultiplayerDiagnostics;
}

/**
 * Crée un store qui se connecte à WebSocket mais bascule à localStorage si ça échoue
 * Le basculement est silencieux en production (pas d'erreur affichée à l'utilisateur)
 */
function createAdaptiveStore(wsUrl) {
  const wsStore = new WebSocketMultiplayerStore(wsUrl);
  const localStore = new SupabaseSimulator();

  const asyncMultiplayerMethods = new Set(['createRoom', 'getRoom', 'updateRoom']);
  const syncMultiplayerMethods = new Set(['onRoomChange']);

  const callAsyncWithFallback = async (methodName, args) => {
    const wsMethod = wsStore[methodName];
    const localMethod = localStore[methodName];

    if (typeof wsMethod !== 'function' || typeof localMethod !== 'function') {
      if (typeof wsMethod === 'function') {
        return wsMethod.apply(wsStore, args);
      }
      return undefined;
    }

    // GitHub Pages cannot host a persistent WebSocket backend.
    if (shouldPreferLocalStorage) {
      return localMethod.apply(localStore, args);
    }

    try {
      const result = await wsMethod.apply(wsStore, args);

      // If WS call returns a transport error object, fallback immediately.
      if (result && typeof result === 'object' && result.error === 'WebSocket not connected') {
        return localMethod.apply(localStore, args);
      }

      return result;
    } catch (error) {
      const message = error?.message || '';
      if (message.includes('WebSocket not connected')) {
        return localMethod.apply(localStore, args);
      }
      throw error;
    }
  };

  const callSyncWithFallback = (methodName, args) => {
    const wsMethod = wsStore[methodName];
    const localMethod = localStore[methodName];

    if (typeof wsMethod !== 'function' || typeof localMethod !== 'function') {
      if (typeof wsMethod === 'function') {
        return wsMethod.apply(wsStore, args);
      }
      return undefined;
    }

    // Keep realtime subscription API synchronous for React cleanup handlers.
    if (shouldPreferLocalStorage || wsStore.failedPermanently || !wsStore.isConnected) {
      return localMethod.apply(localStore, args);
    }

    return wsMethod.apply(wsStore, args);
  };

  // Wrapper qui bascule automatiquement to localStorage après timeout
  const wrapper = new Proxy(wsStore, {
    get(target, prop) {
      if (typeof prop === 'string' && asyncMultiplayerMethods.has(prop)) {
        return (...args) => callAsyncWithFallback(prop, args);
      }

      if (typeof prop === 'string' && syncMultiplayerMethods.has(prop)) {
        return (...args) => callSyncWithFallback(prop, args);
      }

      // Si WebSocket échoue de façon permanente, basculer à localStorage
      if (target.failedPermanently && typeof target[prop] === 'function') {
        return (...args) => localStore[prop](...args);
      }

      // Pour les autres méthodes (jeux, status, etc.), conserver le comportement natif du store WS.
      if (typeof target[prop] === 'function') {
        return target[prop].bind(target);
      }
      return target[prop];
    },
  });

  return wrapper;
}

export default supabase;
