import React from 'react';

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

export default SettingsScreen;
