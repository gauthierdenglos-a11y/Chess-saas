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
const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

export const isUsingSupabaseRemote = hasSupabaseConfig;
export const isUsingWebSocket = !hasSupabaseConfig;

// Stratégie : WebSocket (par défaut) → Supabase (si configuré) → localStorage (fallback)
let supabase;

if (hasSupabaseConfig) {
  console.log('[Supabase] Using Supabase Remote');
  supabase = new SupabaseRemote(supabaseUrl, supabaseAnonKey);
} else {
  console.log('[WebSocket] Attempting to use WebSocket server at', wsUrl);
  supabase = new WebSocketMultiplayerStore(wsUrl);
  
  // Fallback to localStorage if WebSocket fails to connect
  setTimeout(() => {
    if (!supabase.isConnected) {
      console.warn('[WebSocket] Connection failed. Falling back to localStorage.');
      supabase = new SupabaseSimulator();
    }
  }, 2000);
}

export default supabase;
