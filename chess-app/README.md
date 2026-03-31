# Chess Master 2026

Application d'echecs frontend (React + Vite) avec interface moderne, mode solo local, persistance de partie, historique des coups et gestion des regles avancees.

## Demarrage

Pre-requis:
- Node.js 20+

Installation et lancement:

```bash
npm install
npm run dev
```

Scripts disponibles:

```bash
npm run dev      # serveur de dev Vite
npm run build    # build de production
npm run preview  # previsualisation du build
npm run lint     # verification ESLint
```

## Stack technique

- React 19
- Vite 8
- ESLint 9 (flat config)

## Architecture

Structure principale:

```text
src/
	main.jsx         # point d'entree React
	App.jsx          # shell applicatif + navigation interne + theme
	ChessBoard.jsx   # logique de partie + interactions utilisateur
	rules.js         # moteur de regles (validations des coups, echec/mat/pat)
	Square.jsx       # rendu d'une case de l'echiquier
	App.css          # styles de l'application
	index.css        # styles globaux
```

Separation des responsabilites:
- `App.jsx`: navigation par ecran (`menu`, `solo`, `ai`, `settings`), sidebar et theme.
- `ChessBoard.jsx`: etat de la partie, deplacements, historique, promotion, fin de partie.
- `rules.js`: logique metier pure des regles d'echecs (independante de l'UI).

## Flux d'etat

### Navigation et theme (`App.jsx`)

- `currentScreen`: ecran courant de l'app (`menu`, `solo`, `ai`, `settings`).
- `sidebarCollapsed`: etat d'ouverture/fermeture de la sidebar.
- `theme`: `dark` ou `light`, persiste dans `localStorage` (`chess-theme`).
- Un effet synchronise le theme dans `document.documentElement` via `data-theme`.

### Etat de jeu (`ChessBoard.jsx`)

La partie est pilotee par ces etats:
- `board`: matrice 8x8 de pieces Unicode.
- `selectedSquare`: case selectionnee.
- `possibleMoves`: cases de destination valides pour la piece selectionnee.
- `currentPlayer`: joueur actif (`white` ou `black`).
- `isCheck`: vrai si le roi du joueur actif est en echec.
- `gameStatus`: `null`, `checkmate` ou `stalemate`.
- `winner`: `white`, `black` ou `null`.
- `moveHistory`: liste textuelle des coups joues.
- `lastMove`: dernier coup pour le highlight visuel.
- `hasMoved`: suivi des rois/tours pour valider le roque.
- `enPassantTarget`: case cible de capture en passant.
- `promotionPending`: mouvement en attente de choix de promotion.

Persistance:
- Cle `localStorage`: `chess-app-state-v1`.
- L'etat est charge a l'initialisation puis sauvegarde a chaque changement pertinent.
- `resetGame` remet l'ensemble des etats au jeu initial.

## Regles metier implementees

### Validation des mouvements

Le moteur `rules.js` gere:
- Pion: avance simple/double, capture diagonale, en passant.
- Tour: horizontal/vertical avec verification de chemin libre.
- Fou: diagonale avec verification de chemin libre.
- Cavalier: mouvement en L.
- Reine: combinaison tour + fou.
- Roi: mouvement d'une case et roque.

La validation principale passe par `isValidMove(board, from, to, hasMoved, enPassantTarget)`.

### Roque

Le roque est autorise si:
- le roi n'a pas bouge,
- la tour concernee n'a pas bouge,
- les cases entre roi et tour sont libres,
- le roi n'est pas en echec,
- le roi ne traverse ni n'atterrit sur une case attaquee.

Le suivi s'appuie sur `hasMoved` avec les cles:
- `white-king`, `black-king`
- `white-rook-0`, `white-rook-7`
- `black-rook-0`, `black-rook-7`

### En passant

- Lors d'un double pas de pion, une `enPassantTarget` est definie.
- Un pion adverse peut capturer sur cette case au coup suivant.
- La piece capturable est retiree explicitement du plateau.

### Promotion

- Si un pion atteint la derniere rangee, un modal de promotion s'affiche.
- Le mouvement est mis en attente dans `promotionPending`.
- Le joueur choisit la piece (reine, tour, fou, cavalier), puis le coup est finalise.

### Echec, mat et pat

- `isKingInCheck`: detecte si le roi est attaque.
- `isCheckmate`: roi en echec + aucun coup legal disponible.
- `isStalemate`: roi non en echec + aucun coup legal disponible.

La detection mat/pat utilise le contexte complet des coups speciaux:
- `hasMoved` pour le roque
- `enPassantTarget` pour en passant

## UX et ecrans

- `Accueil`: ecran principal avec acces au mode solo.
- `Solo`: partie locale 2 joueurs sur le meme appareil.
- `IA`: present dans la navigation mais desactive (coming soon).
- `Parametres`: bascule de theme, options IA placeholder.

## Conventions du projet

- Unicode pour la representation des pieces sur le plateau.
- Notation des coups stockee sous forme texte dans `moveHistory`.
- CSS centralise principalement dans `App.css`.

## Limites actuelles

- Pas de backend, pas de multi-joueur reseau.
- Pas d'IA fonctionnelle a ce stade (UI uniquement).
- Pas de tests automatises unitaires/integration pour le moteur.

## Prochaines evolutions recommandees

- Ajouter une suite de tests pour `rules.js` (cas de regles speciaux et fin de partie).
- Ajouter la notation echecs standard (SAN/PGN) pour l'historique.
- Finaliser le mode IA (niveau, profondeur, heuristiques).
