import React from 'react';

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

export default MainMenu;
