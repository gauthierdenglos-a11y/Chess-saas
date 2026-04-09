/**
 * Service de gestion des parties (historique, création, abandon, etc.)
 */

import supabase from './supabaseClient';

class GameService {
  /**
   * Sauvegarder une partie complétée ou abandon écute
   */
  static async saveGame(gameData) {
    const {
      mode, // 'solo' | 'ai' | 'multiplayer'
      playerWhite,
      playerBlack,
      result, // 'checkmate' | 'stalemate' | 'resignation'
      winner, // 'white' | 'black' | null (draw)
      moves,
      startedAt,
      endedAt,
      reason, // 'checkmate' | 'stalemate' | 'resignation' | 'player_abandoned'
      extraData, // optionnel: aiLevel, roomId, etc.
    } = gameData;

    const game = {
      mode,
      playerWhite,
      playerBlack,
      result,
      winner,
      moves: Array.isArray(moves) ? moves : [],
      startedAt: startedAt || new Date().toISOString(),
      endedAt: endedAt || new Date().toISOString(),
      reason,
      extraData: extraData || {},
    };

    const { data, error } = await supabase.createGame(game);
    if (error) {
      console.error('Error saving game:', error);
      return null;
    }
    return data;
  }

  /**
   * Récupérer l'historique des parties
   */
  static async getGameHistory(filters = {}) {
    const { data, error } = await supabase.getAllGames();
    if (error) {
      console.error('Error fetching games:', error);
      return [];
    }

    let filtered = data || [];

    // Appliquer les filtres
    if (filters.mode) {
      filtered = filtered.filter(g => g.mode === filters.mode);
    }
    if (filters.playerWhite) {
      filtered = filtered.filter(g => g.playerWhite === filters.playerWhite);
    }
    if (filters.playerBlack) {
      filtered = filtered.filter(g => g.playerBlack === filters.playerBlack);
    }
    if (filters.winner) {
      filtered = filtered.filter(g => g.winner === filters.winner);
    }

    // Trier par date décroissante
    return filtered.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }

  /**
   * Créer une room multijoueur
   */
  static async createMultiplayerRoom(playerName) {
    const inviteCode = await this._generateUniqueInviteCode();
    const room = await supabase.createRoom({
      id: inviteCode,
      playerWhite: playerName,
      playerBlack: null,
      status: 'waiting_for_opponent', // 'waiting_for_opponent' | 'in_progress' | 'completed'
      moves: [],
      currentPlayer: 'white',
      board: null,
      inviteCode,
    });

    return room;
  }

  /**
   * Rejoindre une room
   */
  static async joinRoom(roomCode, playerName) {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      return { success: false, error: 'Code de room invalide (6 caractères alphanumériques)' };
    }

    const { data: room, error } = await supabase.getRoom(normalizedCode);
    if (error || !room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'waiting_for_opponent') {
      return { success: false, error: 'Room is not available' };
    }

    const { data: updated, error: updateError } = await supabase.updateRoom(normalizedCode, {
      playerBlack: playerName,
      status: 'in_progress',
    });

    if (updateError) {
      return { success: false, error: updateError };
    }

    return { success: true, room: updated, roomId: normalizedCode };
  }

  /**
   * Mettre à jour une partie en cours
   */
  static async updateRoomGame(roomId, updates) {
    const { data, error } = await supabase.updateRoom(roomId, updates);
    if (error) {
      console.error('Error updating room:', error);
      return null;
    }
    return data;
  }

  /**
   * Récupérer une room
   */
  static async getRoom(roomId) {
    const { data, error } = await supabase.getRoom(roomId);
    if (error) {
      console.error('Error fetching room:', error);
      return null;
    }
    return data;
  }

  /**
   * Écouter les changements d'une room en temps réel
   */
  static onRoomChanges(roomId, callback) {
    return supabase.onRoomChange(roomId, callback);
  }

  /**
   * Générer un code d'invitation court
   */
  static _generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static async _generateUniqueInviteCode(maxAttempts = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = this._generateInviteCode();
      const { data: existingRoom } = await supabase.getRoom(candidate);
      if (!existingRoom) {
        return candidate;
      }
    }

    throw new Error('Impossible de générer un code de room unique, veuillez réessayer');
  }

  /**
   * Enregistrer un abandon
   */
  static async recordResignation(gameId, roomId, resigningPlayer) {
    const winningPlayer = resigningPlayer === 'white' ? 'black' : 'white';

    if (roomId) {
      // Partie multijoueur
      const updates = {
        status: 'completed',
        winner: winningPlayer,
        reason: 'resignation',
        endedAt: new Date().toISOString(),
      };
      await supabase.updateRoom(roomId, updates);
    }

    // Sauvegarder le jeu dans l'historique
    // (à faire après)
  }
}

export default GameService;
