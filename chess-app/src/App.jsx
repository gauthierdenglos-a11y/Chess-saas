import React, { useState, useEffect } from 'react';
import ChessBoard from './ChessBoard';
import Sidebar from './Sidebar';
import MainMenu from './MainMenu';
import SettingsScreen from './SettingsScreen';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('menu'); // 'menu', 'solo', 'ai', 'settings'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('chess-theme');
    return saved || 'dark';
  });

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
                <p className="game-subtitle">Jouez contre un adversaire humain</p>
              </div>
              <ChessBoard
                key="solo-board"
                initialHumanVsAI={false}
                defaultAiLevel="moyen"
                enableAIControls={false}
                storageKey="chess-app-state-solo-v1"
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
              />
            </div>
          </div>
        );
      case 'settings':
        return <SettingsScreen theme={theme} toggleTheme={toggleTheme} />;
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
