import React, { useState, useEffect } from 'react';
import ChessBoard from './ChessBoard';
import Sidebar from './Sidebar';
import MainMenu from './MainMenu';
import SettingsScreen from './SettingsScreen';
import GameHistory from './GameHistory';
import MultiplayerLobby from './MultiplayerLobby';
import GameService from './gameService';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('menu'); // 'menu', 'solo', 'ai', 'settings', 'history', 'multiplayer', 'multiplayer-game'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('chess-theme');
    return saved || 'dark';
  });
  const [currentRoomData, setCurrentRoomData] = useState(null); // Données de la room multijoueur

  // Sauvegarder le thème dans localStorage
  useEffect(() => {
    localStorage.setItem('chess-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const navigateTo = (screen) => {
    setCurrentScreen(screen);
  };

  // Callback pour quand une partie multijoueur commence
  const handleMultiplayerGameStart = (roomData) => {
    setCurrentRoomData(roomData);
    setCurrentScreen('multiplayer-game');
  };

  // Callback pour quand une partie se termine
  const handleGameEnd = async (gameData) => {
    const playerName = localStorage.getItem('chess-player-name') || 'Joueur';
    await GameService.saveGame({
      mode: currentScreen,
      playerWhite: gameData.winner === 'white' ? playerName : 'Adversaire',
      playerBlack: gameData.winner === 'black' ? playerName : 'Adversaire',
      result: gameData.status,
      winner: gameData.winner,
      moves: gameData.moves,
      reason: gameData.status,
    });
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'menu':
        return <MainMenu navigateTo={navigateTo} />;
      case 'solo':
        return (
          <div className="main-content game-page">
            <div className="content-wrapper">
              <div className="game-header">
                <h1>Partie Solo</h1>
                <p className="game-subtitle">Jouez tour par tour contre un adversaire humain</p>
              </div>
              <ChessBoard
                key="solo-board"
                initialHumanVsAI={false}
                defaultAiLevel="moyen"
                enableAIControls={false}
                storageKey="chess-app-state-solo-v1"
                onGameEnd={handleGameEnd}
              />
            </div>
          </div>
        );
      case 'ai':
        return (
          <div className="main-content game-page">
            <div className="content-wrapper">
              <div className="game-header">
                <h1>Contre l'IA</h1>
                <p className="game-subtitle">Vous jouez les blancs, Stockfish joue les noirs</p>
              </div>
              <ChessBoard
                key="ai-board"
                initialHumanVsAI
                defaultAiLevel="moyen"
                enableAIControls
                storageKey="chess-app-state-ai-v1"
                onGameEnd={handleGameEnd}
              />
            </div>
          </div>
        );
      case 'settings':
        return <SettingsScreen theme={theme} toggleTheme={toggleTheme} />;
      case 'history':
        return <GameHistory />;
      case 'multiplayer':
        return <MultiplayerLobby onGameStart={handleMultiplayerGameStart} />;
      case 'multiplayer-game':
        return currentRoomData ? (
          <div className="main-content game-page">
            <div className="content-wrapper">
              <div className="game-header">
                <h1>👥 Multijoueur</h1>
                <p className="game-subtitle">
                  {currentRoomData.playerColor === 'white' ? '⚪ Vous jouez Blanc' : '⚫ Vous jouez Noir'}
                </p>
              </div>
              <ChessBoard
                key={`multiplayer-${currentRoomData.roomId}`}
                initialHumanVsAI={false}
                defaultAiLevel="moyen"
                enableAIControls={false}
                storageKey={`chess-app-state-multiplayer-${currentRoomData.roomId}`}
                onGameEnd={handleGameEnd}
                isMultiplayer
                multiplayerRoomId={currentRoomData.roomId}
                multiplayerPlayerColor={currentRoomData.playerColor}
              />
            </div>
          </div>
        ) : (
          <MainMenu navigateTo={navigateTo} />
        );
      default:
        return <MainMenu navigateTo={navigateTo} />;
    }
  };

  return (
    <div className={`chess-app ${theme}-theme`}>
      <div className="ambient-layer" aria-hidden="true">
        <span className="ambient-orb orb-1" />
        <span className="ambient-orb orb-2" />
        <span className="ambient-orb orb-3" />
      </div>
      <Sidebar
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        currentScreen={currentScreen}
        navigateTo={navigateTo}
      />
      <div className={`main-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderScreen()}
      </div>
    </div>
  );
}

export default App;
