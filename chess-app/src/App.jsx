import React, { useState, useEffect } from 'react';
import ChessBoard from './ChessBoard';
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

  const Sidebar = () => (
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
          <h2 className="sidebar-title">Chess Master</h2>
        )}
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentScreen === 'menu' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('menu')}
        >
          <span className="nav-icon">🏠</span>
          {!sidebarCollapsed && <span className="nav-text">Accueil</span>}
        </button>

        <button
          className={`nav-item ${currentScreen === 'solo' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('solo')}
        >
          <span className="nav-icon">👤</span>
          {!sidebarCollapsed && <span className="nav-text">Solo</span>}
        </button>

        <button
          className={`nav-item ${currentScreen === 'ai' ? 'active' : ''} disabled`}
          onClick={() => setCurrentScreen('ai')}
          disabled
        >
          <span className="nav-icon">🤖</span>
          {!sidebarCollapsed && <span className="nav-text">IA</span>}
        </button>

        <button
          className={`nav-item ${currentScreen === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('settings')}
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

  const MainMenu = () => (
    <div className="main-content">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-title-main">Chess Master</span>
            <span className="hero-title-accent">2026</span>
          </h1>
          <p className="hero-subtitle">
            L'expérience d'échecs ultime avec une interface moderne et intuitive
          </p>
        </div>
        <div className="hero-visual">
          <div className="floating-chess-pieces">
            <span className="floating-piece piece-1">♔</span>
            <span className="floating-piece piece-2">♕</span>
            <span className="floating-piece piece-3">♖</span>
            <span className="floating-piece piece-4">♗</span>
          </div>
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Partie Solo</h3>
          <p>Jouez tour par tour contre un adversaire humain avec toutes les règles complètes</p>
          <button
            className="feature-button primary"
            onClick={() => setCurrentScreen('solo')}
          >
            Jouer maintenant
          </button>
        </div>

        <div className="feature-card coming-soon">
          <div className="feature-icon">🤖</div>
          <h3>Contre IA</h3>
          <p>Affrontez l'intelligence artificielle avec différents niveaux de difficulté</p>
          <button className="feature-button secondary" disabled>
            Bientôt disponible
          </button>
        </div>

        <div className="feature-card">
          <div className="feature-icon">⚙️</div>
          <h3>Paramètres</h3>
          <p>Personnalisez votre expérience avec des thèmes et des options avancées</p>
          <button
            className="feature-button tertiary"
            onClick={() => setCurrentScreen('settings')}
          >
            Configurer
          </button>
        </div>
      </div>
    </div>
  );

  const SettingsScreen = () => (
    <div className="main-content">
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
              >
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {theme === 'dark' ? 'Sombre' : 'Clair'}
                </span>
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
  );

  const renderScreen = () => {
    switch (currentScreen) {
      case 'menu':
        return <MainMenu />;
      case 'solo':
        return (
          <div className="main-content">
            <div className="game-header">
              <h1>Partie Solo</h1>
              <p className="game-subtitle">Jouez contre un adversaire humain</p>
            </div>
            <ChessBoard />
          </div>
        );
      case 'ai':
        return (
          <div className="main-content">
            <div className="coming-soon-screen">
              <div className="coming-soon-content">
                <div className="coming-soon-icon">🤖</div>
                <h2>Mode IA à venir</h2>
                <p>Le mode contre intelligence artificielle sera bientôt disponible avec différents niveaux de difficulté.</p>
                <div className="coming-soon-features">
                  <div className="feature-item">♟️ Niveaux de difficulté adaptatifs</div>
                  <div className="feature-item">🧠 Algorithmes avancés</div>
                  <div className="feature-item">📊 Analyse de partie</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return <SettingsScreen />;
      default:
        return <MainMenu />;
    }
  };

  return (
    <div className={`chess-app ${theme}-theme`}>
      <Sidebar />
      <div className={`main-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderScreen()}
      </div>
    </div>
  );
}

export default App;
