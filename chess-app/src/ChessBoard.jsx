import React, { useState } from 'react';
import Square from './Square';
import { isValidMove, isKingInCheck, isMoveLeavesKingInCheck, isCheckmate, isStalemate } from './rules';

// Fonction pour initialiser le plateau d'échecs
const getInitialBoard = () => [
  ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'], // Ligne 0 : pièces noires
  ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'], // Ligne 6 : pions blancs
  ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']  // Ligne 7 : pièces blanches
];

/**
 * Vérifie si une pièce est blanche ou noire
 * @param {string} piece - Caractère Unicode de la pièce
 * @returns {string} 'white', 'black' ou null
 */
function getPieceColor(piece) {
  if (!piece) return null;
  // Les pièces blanches sont : ♔, ♕, ♖, ♘, ♗, ♙
  const whitePieces = ['♔', '♕', '♖', '♘', '♗', '♙'];
  return whitePieces.includes(piece) ? 'white' : 'black';
}

const ChessBoard = () => {
  // État pour stocker le plateau (matrice 8x8)
  const [board, setBoard] = useState(getInitialBoard());
  // État pour la case sélectionnée : [row, col] ou null
  const [selectedSquare, setSelectedSquare] = useState(null);
  // État pour tracker le joueur actuel (blanc joue en premier)
  const [currentPlayer, setCurrentPlayer] = useState('white');
  // Coups possibles affichés quand une pièce est sélectionnée
  const [possibleMoves, setPossibleMoves] = useState([]);
  // État pour tracker si le roi du joueur actuel est en échec
  const [isCheck, setIsCheck] = useState(false);
  // État pour tracker la fin de la partie : null, 'checkmate', 'stalemate'
  const [gameStatus, setGameStatus] = useState(null);
  // État pour tracker le gagnant (en cas de mat)
  const [winner, setWinner] = useState(null);

  // Fonction appelée quand on clique sur une case
  const handleSquareClick = (row, col) => {
    // Si la partie est terminée, empêcher les mouvements
    if (gameStatus !== null) {
      return; // Partie terminée, pas de jouabilité
    }

    if (selectedSquare === null) {
      // Si aucune case sélectionnée et qu'il y a une pièce, la sélectionner
      const piece = board[row][col];
      if (piece !== null) {
        // Vérifier que la pièce appartient au joueur actuel
        const pieceColor = getPieceColor(piece);
        if (pieceColor === currentPlayer) {
          setSelectedSquare([row, col]);

          // Calculer les coups possibles (tous les toRow/toCol)
          const nextMoves = [];
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              if (row === toRow && col === toCol) continue;
              if (isValidMove(board, [row, col], [toRow, toCol]) && !isMoveLeavesKingInCheck(board, [row, col], [toRow, toCol], currentPlayer)) {
                nextMoves.push([toRow, toCol]);
              }
            }
          }
          setPossibleMoves(nextMoves);
        }
      }
    } else {
      // Si une case est sélectionnée, vérifier si le mouvement est valide
      const [selectedRow, selectedCol] = selectedSquare;
      
      // Vérification 1 : Le mouvement est-il légal ?
      if (isValidMove(board, [selectedRow, selectedCol], [row, col])) {
        // Vérification 2 : Le mouvement ne laisse-t-il pas le roi en échec ?
        if (!isMoveLeavesKingInCheck(board, [selectedRow, selectedCol], [row, col], currentPlayer)) {
          // Mouvement valide et sûr : déplacer la pièce
          const newBoard = board.map(r => [...r]); // Copie profonde du plateau
          newBoard[row][col] = newBoard[selectedRow][selectedCol]; // Déplacer la pièce
          newBoard[selectedRow][selectedCol] = null; // Vider l'ancienne case
          setBoard(newBoard); // Mettre à jour le plateau

          // Alterner le joueur
          const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
          setCurrentPlayer(nextPlayer);

          // Vérifier l'état du jeu pour le joueur suivant
          // Vérification 1 : Est-ce un échec et mat ?
          if (isCheckmate(newBoard, nextPlayer)) {
            setGameStatus('checkmate');
            setWinner(currentPlayer); // Le joueur actuel gagne
            setIsCheck(true); // Le roi est en échec (maj)
          }
          // Vérification 2 : Est-ce un match nul (pat) ?
          else if (isStalemate(newBoard, nextPlayer)) {
            setGameStatus('stalemate');
            setWinner(null); // Match nul
            setIsCheck(false);
          }
          // Vérification 3 : Le roi du joueur suivant est-il en échec ?
          else {
            setIsCheck(isKingInCheck(newBoard, nextPlayer));
          }
        }
      }
      setSelectedSquare(null); // Désélectionner dans tous les cas
      setPossibleMoves([]); // Effacer l'affichage des coups possibles
    }
  };

  return (
    <div className="chessboard-container">
      {/* Affichage du joueur actuel */}
      <div style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>
        Joueur actuel : {currentPlayer === 'white' ? '⚪ Blanc' : '⚫ Noir'}
      </div>

      {/* Affichage de l'état d'échec */}
      {isCheck && gameStatus === null && (
        <div className="status-box status-check">
          ⚠️ ÉCHEC ! Le roi est attaqué !
        </div>
      )}

      {/* Affichage du checkmate */}
      {gameStatus === 'checkmate' && (
        <div className="status-box status-checkmate">
          ♖ ÉCHEC ET MAT ! ♖<br />
          {winner === 'white' ? '⚪ Blanc' : '⚫ Noir'} a gagné !
        </div>
      )}

      {/* Affichage du stalemate */}
      {gameStatus === 'stalemate' && (
        <div className="status-box status-stalemate">
          🤝 MATCH NUL (PAT) 🤝<br />
          Aucun joueur ne peut se déplacer sans mettre son roi en danger.
        </div>
      )}
      
      {/* Plateau d'échecs */}
      <div className="chessboard">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const isWhite = (rowIndex + colIndex) % 2 === 0;
            const isSelected = selectedSquare && selectedSquare[0] === rowIndex && selectedSquare[1] === colIndex;
            return (
              <Square
                key={`${rowIndex}-${colIndex}`}
                color={isWhite ? 'white' : 'black'}
                piece={piece}
                isSelected={isSelected}
                isPossible={possibleMoves.some(pos => pos[0] === rowIndex && pos[1] === colIndex)}
                onSquareClick={() => handleSquareClick(rowIndex, colIndex)}
              />
            );
          })
        )}
      </div>

      {/* Bouton de réinitialisation */}
      {gameStatus !== null && (
        <button
          className="new-game-btn"
          onClick={() => {
            setBoard(getInitialBoard());
            setSelectedSquare(null);
            setPossibleMoves([]);
            setCurrentPlayer('white');
            setIsCheck(false);
            setGameStatus(null);
            setWinner(null);
          }}
        >
          Nouvelle partie
        </button>
      )}
    </div>
  );
};

export default ChessBoard;