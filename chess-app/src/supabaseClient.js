/**
 * Client Supabase simplifié pour le MVP
 * À configurer avec les vraies clés d'environnement après
 */

// Pour le MVP local, on simule Supabase avec localStorage
class SupabaseSimulator {
  constructor() {
    this.games = this._loadGames();
    this.rooms = new Map();
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

  // Créer une partie
  createGame(gameData) {
    const game = {
      id: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      ...gameData,
    };
    this.games.push(game);
    this._saveGames();
    return game;
  }

  // Récupérer toutes les parties
  getAllGames() {
    return Promise.resolve({ data: this.games, error: null });
  }

  // Récupérer une partie par ID
  getGameById(id) {
    const game = this.games.find(g => g.id === id);
    return Promise.resolve({ data: game, error: game ? null : 'Game not found' });
  }

  // Mettre à jour une partie
  updateGame(id, updates) {
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
    const room = {
      id: `room-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      ...roomData,
    };
    this.rooms.set(room.id, room);
    return room;
  }

  // Rejoindre une room
  getRoom(roomId) {
    const room = this.rooms.get(roomId);
    return Promise.resolve({ data: room, error: room ? null : 'Room not found' });
  }

  // Mettre à jour une room
  updateRoom(roomId, updates) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return Promise.resolve({ error: 'Room not found' });
    }
    const updated = { ...room, ...updates };
    this.rooms.set(roomId, updated);
    return Promise.resolve({ data: updated, error: null });
  }

  // Listener temps réel pour une room
  onRoomChange(roomId, callback) {
    // Simulation simple : polling toutes les 500ms
    const interval = setInterval(() => {
      const room = this.rooms.get(roomId);
      if (room) {
        callback({ new: room });
      }
    }, 500);

    return () => clearInterval(interval);
  }
}

// Exporter le simulator pour le MVP
export const supabase = new SupabaseSimulator();

export default supabase;
