import React, { useState, useEffect } from 'react';
import GameService from './gameService';

function GameHistory() {
  const [games, setGames] = useState([]);
  const [filters, setFilters] = useState({ mode: '', winner: '' });
  const [loading, setLoading] = useState(true);

  const loadGames = async () => {
    setLoading(true);
    const filterObj = {};
    if (filters.mode) filterObj.mode = filters.mode;
    if (filters.winner) filterObj.winner = filters.winner;

    const history = await GameService.getGameHistory(filterObj);
    setGames(history);
    setLoading(false);
  };

  useEffect(() => {
    loadGames();
  }, [filters]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDurationMinutes = (start, end) => {
    return Math.round((new Date(end) - new Date(start)) / 60000);
  };

  const getModeLabel = (mode) => {
    const labels = {
      solo: '👤 Solo',
      ai: '🤖 Contre IA',
      multiplayer: '👥 Multijoueur',
    };
    return labels[mode] || mode;
  };

  const getResultLabel = (result, winner) => {
    if (result === 'checkmate') {
      return winner === 'white' ? '⚪ Blanc gagne' : '⚫ Noir gagne';
    }
    if (result === 'stalemate') {
      return '🤝 Match nul (Pat)';
    }
    if (result === 'resignation') {
      return winner === 'white' ? '⚪ Blanc gagne' : '⚫ Noir gagne';
    }
    return '❓ Inconnue';
  };

  return (
    <div className="main-content game-history-page">
      <div className="content-wrapper">
        <div className="game-header">
          <h1>📚 Historique des parties</h1>
          <p className="game-subtitle">Consultez vos parties précédentes</p>
        </div>

        <div className="history-filters">
          <div className="filter-group">
            <label htmlFor="filter-mode">Mode :</label>
            <select
              id="filter-mode"
              className="setting-select"
              value={filters.mode}
              onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
            >
              <option value="">Tous les modes</option>
              <option value="solo">Solo</option>
              <option value="ai">Contre IA</option>
              <option value="multiplayer">Multijoueur</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-result">Résultat :</label>
            <select
              id="filter-result"
              className="setting-select"
              value={filters.winner}
              onChange={(e) => setFilters({ ...filters, winner: e.target.value })}
            >
              <option value="">Tous les résultats</option>
              <option value="white">Blanc gagne</option>
              <option value="black">Noir gagne</option>
              <option value="null">Nul</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="history-loading">Chargement...</div>
        ) : games.length === 0 ? (
          <div className="history-empty">
            <p>Aucune partie trouvée.</p>
            <p>Commencez une partie pour la voir ici !</p>
          </div>
        ) : (
          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Joueurs</th>
                  <th>Résultat</th>
                  <th>Coups</th>
                  <th>Durée</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id} className="history-row">
                    <td>{formatDate(game.startedAt)}</td>
                    <td>{getModeLabel(game.mode)}</td>
                    <td>
                      <div className="players-cell">
                        <span className="player-white">⚪ {game.playerWhite || 'Blanc'}</span>
                        <span className="vs">vs</span>
                        <span className="player-black">⚫ {game.playerBlack || 'Noir'}</span>
                      </div>
                    </td>
                    <td>{getResultLabel(game.result, game.winner)}</td>
                    <td>{game.moves?.length || 0}</td>
                    <td>{getDurationMinutes(game.startedAt, game.endedAt)}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameHistory;
