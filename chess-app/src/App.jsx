import React, { useState, useEffect } from 'react';
import ChessBoard from './ChessBoard';
import './App.css';

function Sidebar({ sidebarCollapsed, setSidebarCollapsed, currentScreen, navigateTo }) {
  return (
    <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? '☰' : '✕'}
        </button>
        {!sidebarCollapsed && (
          <div className="sidebar-brand">
            <h2 className="sidebar-title">Liquid Chess</h2>
            <p className="sidebar-subtitle">Edition Studio</p>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentScreen === 'menu' ? 'active' : ''}`}
          onClick={() => navigateTo('menu')}
        >
          <span className="nav-icon">🏠</span>
          {!sidebarCollapsed && <span className="nav-text">Accueil</span>}
        </button>

        <button
          className={`nav-item ${currentScreen === 'solo' ? 'active' : ''}`}
          onClick={() => navigateTo('solo')}
        >
          <span className="nav-icon">👤</span>
          {!sidebarCollapsed && <span className="nav-text">Solo</span>}
        </button>

        <button
          className={`nav-item ${currentScreen === 'ai' ? 'active' : ''}`}
          onClick={() => navigateTo('ai')}
        >
          <span className="nav-icon">🤖</span>
          {!sidebarCollapsed && <span className="nav-text">IA</span>}
        </button>

        <button
          className={`nav-item ${currentScreen === 'settings' ? 'active' : ''}`}
          onClick={() => navigateTo('settings')}
        >
          <span className="nav-icon">⚙️</span>
          {!sidebarCollapsed && <span className="nav-text">Paramètres</span>}
        </button>
      </nav>

      <div className="sidebar-footer">
        {/* Theme toggle removed from sidebar */}
      </div>
    </div>
  );
}

function MainMenu({ navigateTo }) {
  return (
    <div className="main-content home-page">
      <div className="content-wrapper">
        <div className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="hero-title-main">Chess Studio</span>
            </h1>
            <p className="hero-subtitle">
              Une experience d'echecs inspiree des interfaces Apple, avec transparence,
              profondeur et details cinematographiques.
            </p>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Partie Solo</h3>
            <p>Jouez tour par tour contre un adversaire humain avec toutes les regles completes.</p>
            <button
              className="feature-button primary"
              onClick={() => navigateTo('solo')}
            >
              Jouer maintenant
            </button>
          </div>

          <div className="feature-card coming-soon">
            <div className="feature-icon">🤖</div>
            <h3>Contre IA</h3>
            <p>Affrontez l'intelligence artificielle avec differents niveaux de difficulte.</p>
            <button className="feature-button secondary" onClick={() => navigateTo('ai')}>
              Jouer contre IA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({ theme, toggleTheme }) {
  return (
    <div className="main-content settings-page">
      <div className="content-wrapper">
        <div className="settings-header">
          <h1>Paramètres</h1>
          <p className="settings-subtitle">Personnalisez votre expérience de jeu</p>
        </div>

        <div className="settings-grid">
          <div className="settings-section">
            <h2 className="section-title">Apparence</h2>
            <div className="setting-item">
              <div className="setting-info">
                <h3>Thème</h3>
                <p>Choisissez entre le thème sombre ou clair</p>
              </div>
              <div className="setting-control">
                <button
                  className={`theme-toggle-btn ${theme}`}
                  onClick={toggleTheme}
                  aria-label="Changer le theme"
                >
                  <span className="toggle-slider"></span>
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="section-title">Jeu</h2>
            <div className="setting-item">
              <div className="setting-info">
                <h3>Mode IA</h3>
                <p>Niveau de difficulté de l'intelligence artificielle</p>
              </div>
              <div className="setting-control">
                <select className="setting-select" disabled>
                  <option>Facile</option>
                  <option>Moyen</option>
                  <option>Difficile</option>
                  <option>Expert</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="section-title">À propos</h2>
            <div className="about-info">
              <p><strong>Chess Master 2026</strong></p>
              <p>Application d'échecs moderne avec interface intuitive</p>
              <p className="version">Version 1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
