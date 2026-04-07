import React, { useEffect, useState } from 'react';
import GameService from './gameService';

function MultiplayerLobby({ onGameStart }) {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('chess-player-name') || '';
  });
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');

  useEffect(() => {
    if (!createdRoomId) {
      return undefined;
    }

    const unsubscribe = GameService.onRoomChanges(createdRoomId, (payload) => {
      const room = payload?.new;
      if (!room) {
        return;
      }

      if (room.status === 'in_progress' && room.playerBlack) {
        onGameStart({
          roomId: createdRoomId,
          playerName,
          playerColor: 'white',
          gameData: room,
        });
      }
    });

    return unsubscribe;
  }, [createdRoomId, onGameStart, playerName]);

  const handleNameChange = (e) => {
    const name = e.target.value;
    setPlayerName(name);
    localStorage.setItem('chess-player-name', name);
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const room = await GameService.createMultiplayerRoom(playerName);
      setCreatedRoomId(room.id);
      // Attendre que l'adversaire rejoigne
      // Ici, on peut montrer un QR code ou un lien à partager
    } catch (err) {
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }
    if (!roomCode.trim()) {
      setError('Veuillez entrer un code de room');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await GameService.joinRoom(roomCode, playerName);
      if (result.success) {
        onGameStart({
          roomId: result.roomId,
          playerName,
          playerColor: 'black',
          gameData: result.room,
        });
      } else {
        const backendHint = result.error === 'Room not found'
          ? ' Verifiez le code partage par l\'hote (6 caracteres).' : '';
        setError((result.error || 'Impossible de rejoindre la room') + backendHint);
      }
    } catch (err) {
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content multiplayer-lobby">
      <div className="content-wrapper">
        <div className="game-header">
          <h1>👥 Multijoueur</h1>
          <p className="game-subtitle">Jouez contre un ami en temps réel</p>
        </div>

        <div className="lobby-container">
          {!createdRoomId ? (
            <>
              {/* Saisie du nom du joueur */}
              <div className="settings-section lobby-section">
                <h2 className="section-title">Votre Nom</h2>
                <input
                  type="text"
                  className="lobby-input"
                  placeholder="Entrez votre nom..."
                  value={playerName}
                  onChange={handleNameChange}
                  disabled={loading}
                />
              </div>

              {/* Tabs : Créer ou Rejoindre */}
              <div className="settings-section lobby-section">
                <div className="lobby-tabs">
                  <button
                    className={`lobby-tab ${mode === 'create' ? 'active' : ''}`}
                    onClick={() => setMode('create')}
                    disabled={loading}
                  >
                    ➕ Créer une Room
                  </button>
                  <button
                    className={`lobby-tab ${mode === 'join' ? 'active' : ''}`}
                    onClick={() => setMode('join')}
                    disabled={loading}
                  >
                    🔗 Rejoindre une Room
                  </button>
                </div>

                {mode === 'create' ? (
                  <div className="lobby-content">
                    <p>Créez une room et partagez le code avec votre ami.</p>
                    <button
                      className="feature-button primary"
                      onClick={handleCreateRoom}
                      disabled={loading || !playerName.trim()}
                    >
                      {loading ? 'Création...' : 'Créer une Room'}
                    </button>
                  </div>
                ) : (
                  <div className="lobby-content">
                    <p>Entrez le code de la room à rejoindre.</p>
                    <input
                      type="text"
                      className="lobby-input"
                      placeholder="ex: ABC123"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      disabled={loading}
                      maxLength="6"
                    />
                    <button
                      className="feature-button primary"
                      onClick={handleJoinRoom}
                      disabled={loading || !playerName.trim() || !roomCode.trim()}
                    >
                      {loading ? 'Connexion...' : 'Rejoindre'}
                    </button>
                  </div>
                )}
              </div>

              {error && <div className="lobby-error">{error}</div>}
            </>
          ) : (
            <div className="settings-section lobby-section lobby-waiting">
              <h2 className="section-title">✅ Room Créée</h2>
              <div className="room-code-display">
                <p>Code à partager:</p>
                <div className="room-code">{createdRoomId}</div>
                <button
                  className="feature-button secondary"
                  onClick={() => navigator.clipboard.writeText(createdRoomId)}
                >
                  📋 Copier
                </button>
              </div>
              <p className="waiting-message">En attente d'un adversaire...</p>
              <p className="waiting-message" style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                Astuce: le code de room contient 6 caracteres (ex: A1B2C3).
              </p>
              <button
                className="feature-button secondary"
                onClick={() => {
                  setCreatedRoomId('');
                  setRoomCode('');
                }}
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MultiplayerLobby;
