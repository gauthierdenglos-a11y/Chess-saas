import React from 'react';

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
          className={`nav-item ${currentScreen === 'multiplayer' || currentScreen === 'multiplayer-game' ? 'active' : ''}`}
          onClick={() => navigateTo('multiplayer')}
        >
          <span className="nav-icon">👥</span>
          {!sidebarCollapsed && <span className="nav-text">Multijoueur</span>}
        </button>

        <button
          className={`nav-item ${currentScreen === 'history' ? 'active' : ''}`}
          onClick={() => navigateTo('history')}
        >
          <span className="nav-icon">📚</span>
          {!sidebarCollapsed && <span className="nav-text">Historique</span>}
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

export default Sidebar;
