import React, { useState, useEffect, useMemo } from 'react';
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
  const whitePieces = ['♔', '♕', '♖', '♘', '♗', '♙'];
  return whitePieces.includes(piece) ? 'white' : 'black';
}

// Aide : transforme (row,col) en notation d'échecs 'a1'..
function coordsToNotation(row, col) {
  const file = String.fromCharCode('a'.charCodeAt(0) + col);
  const rank = 8 - row;
  return `${file}${rank}`;
}

// Fonction helper pour obtenir la clé hasMoved d'une pièce
function getHasMovedKey(piece, row, col) {
  const color = getPieceColor(piece);
  if (!color) return null;

  if (piece === '♔' || piece === '♚') {
    return `${color}-king`;
  }
  if (piece === '♖' || piece === '♜') {
    return `${color}-rook-${col}`;
  }
  return null; // Autres pièces n'ont pas besoin de tracking pour le roque
}

function getDefaultHasMoved() {
  return {
    'white-king': false,
    'white-rook-0': false,
    'white-rook-7': false,
    'black-king': false,
    'black-rook-0': false,
    'black-rook-7': false,
  };
}

function loadStoredGameState(storageKey) {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

const ChessBoard = () => {
  const STORAGE_KEY = 'chess-app-state-v1';
  const initialState = useMemo(() => loadStoredGameState(STORAGE_KEY), []);
  
  // État pour stocker le plateau (matrice 8x8)
  const [board, setBoard] = useState(() => initialState?.board || getInitialBoard());
  // État pour la case sélectionnée : [row, col] ou null
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(() => initialState?.currentPlayer || 'white');
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [isCheck, setIsCheck] = useState(() => initialState?.isCheck ?? false);
  const [gameStatus, setGameStatus] = useState(() => initialState?.gameStatus ?? null);
  const [winner, setWinner] = useState(() => initialState?.winner ?? null);
  const [moveHistory, setMoveHistory] = useState(() => initialState?.moveHistory || []);
  const [lastMove, setLastMove] = useState(null);
  // État pour tracker les pièces qui ont bougé (nécessaire pour le roque)
  const [hasMoved, setHasMoved] = useState(() => initialState?.hasMoved || getDefaultHasMoved());
  // État pour la capture en passant
  const [enPassantTarget, setEnPassantTarget] = useState(() => initialState?.enPassantTarget || null);
  // État pour la promotion du pion
  const [promotionPending, setPromotionPending] = useState(() => initialState?.promotionPending || null); // {from: [row, col], to: [row, col], piece: '♙'}

  const resetGame = () => {
    setBoard(getInitialBoard());
    setSelectedSquare(null);
    setPossibleMoves([]);
    setCurrentPlayer('white');
    setIsCheck(false);
    setGameStatus(null);
    setWinner(null);
    setMoveHistory([]);
    setLastMove(null);
    setHasMoved(getDefaultHasMoved());
    setEnPassantTarget(null);
    setPromotionPending(null);
  };

  // Fonction pour finaliser la promotion du pion
  const completePromotion = (chosenPiece) => {
    if (!promotionPending) return;

    const { from, to, piece, capturedPiece, enPassantCapture, rookMove } = promotionPending;
    const [selectedRow, selectedCol] = from;
    const [row, col] = to;

    // Créer le nouveau plateau avec la pièce promue
    const newBoard = board.map(r => [...r]);

    // Gérer la capture en passant si elle existait
    if (enPassantCapture) {
      const [capturedRow, capturedCol] = enPassantCapture.position;
      newBoard[capturedRow][capturedCol] = null;
    }

    // Gérer le roque si nécessaire
    if (rookMove) {
      const [rookFromRow, rookFromCol] = rookMove.from;
      const [rookToRow, rookToCol] = rookMove.to;
      newBoard[rookToRow][rookToCol] = rookMove.piece;
      newBoard[rookFromRow][rookFromCol] = null;
    }

    // Placer la pièce promue
    newBoard[row][col] = chosenPiece;
    newBoard[selectedRow][selectedCol] = null;
    setBoard(newBoard);

    // Mettre à jour hasMoved
    const newHasMoved = { ...hasMoved };
    const movingPieceKey = getHasMovedKey(piece, selectedRow, selectedCol);
    if (movingPieceKey) {
      newHasMoved[movingPieceKey] = true;
    }

    // Si c'était un roque, marquer la tour comme ayant bougé
    if (rookMove) {
      const rookKey = getHasMovedKey(rookMove.piece, rookMove.from[0], rookMove.from[1]);
      if (rookKey) {
        newHasMoved[rookKey] = true;
      }
    }

    setHasMoved(newHasMoved);

    // Mettre à jour enPassantTarget (pas de double mouvement pour la promotion)
    setEnPassantTarget(null);

    // Historique du coup avec notation de promotion
    const fromNotation = coordsToNotation(selectedRow, selectedCol);
    const toNotation = coordsToNotation(row, col);
    let moveNotation = `${piece} ${fromNotation} → ${toNotation}`;

    // Ajouter la capture dans la notation
    if (capturedPiece) {
      moveNotation += ` x ${capturedPiece}`;
    } else if (enPassantCapture) {
      moveNotation += ` x ${enPassantCapture.piece} (en passant)`;
    }

    // Notation spéciale pour le roque
    if (rookMove) {
      const isKingside = col > selectedCol;
      moveNotation = `O-O${isKingside ? '' : '-O'}`;
    }

    // Ajouter la promotion
    moveNotation += `=${chosenPiece}`;

    setMoveHistory(prevHistory => [...prevHistory, moveNotation]);
    setLastMove({ from: [selectedRow, selectedCol], to: [row, col] });

    // Réinitialiser la promotion en attente
    setPromotionPending(null);

    // Alterner le joueur
    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    setCurrentPlayer(nextPlayer);

    // Vérifier l'état du jeu pour le joueur suivant
    if (isCheckmate(newBoard, nextPlayer, newHasMoved, null)) {
      setGameStatus('checkmate');
      setWinner(currentPlayer);
      setIsCheck(true);
    } else if (isStalemate(newBoard, nextPlayer, newHasMoved, null)) {
      setGameStatus('stalemate');
      setWinner(null);
      setIsCheck(false);
    } else {
      setIsCheck(isKingInCheck(newBoard, nextPlayer));
    }
  };

  // Sauvegarde dans localStorage quand l'état change
  useEffect(() => {
    const payload = {
      board,
      currentPlayer,
      isCheck,
      gameStatus,
      winner,
      moveHistory,
      hasMoved,
      enPassantTarget,
      promotionPending,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [board, currentPlayer, isCheck, gameStatus, winner, moveHistory, hasMoved, enPassantTarget, promotionPending]);

  // Fonction appelée quand on clique sur une case
  const handleSquareClick = (row, col) => {
    // Ne rien faire si une promotion est en attente
    if (promotionPending) return;

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
              if (isValidMove(board, [row, col], [toRow, toCol], hasMoved, enPassantTarget) && !isMoveLeavesKingInCheck(board, [row, col], [toRow, toCol], currentPlayer)) {
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
      if (isValidMove(board, [selectedRow, selectedCol], [row, col], hasMoved, enPassantTarget)) {
        // Vérification 2 : Le mouvement ne laisse-t-il pas le roi en échec ?
        if (!isMoveLeavesKingInCheck(board, [selectedRow, selectedCol], [row, col], currentPlayer)) {
          // Mouvement valide et sûr : déplacer la pièce
          const newBoard = board.map(r => [...r]); // Copie profonde du plateau
          const movingPiece = newBoard[selectedRow][selectedCol];
          const capturedPiece = newBoard[row][col];
          
          // Gérer le roque spécial (la tour bouge aussi)
          let rookMove = null;
          if ((movingPiece === '♔' || movingPiece === '♚') && Math.abs(col - selectedCol) === 2) {
            // C'est un roque !
            const isKingside = col > selectedCol; // roque côté roi si col augmente
            const rookFromCol = isKingside ? 7 : 0;
            const rookToCol = isKingside ? 5 : 3;
            const rookPiece = newBoard[selectedRow][rookFromCol];
            
            // Déplacer la tour
            newBoard[selectedRow][rookToCol] = rookPiece;
            newBoard[selectedRow][rookFromCol] = null;
            
            rookMove = {
              from: [selectedRow, rookFromCol],
              to: [selectedRow, rookToCol],
              piece: rookPiece
            };
          }
          
          // Gérer la capture en passant
          let enPassantCapture = null;
          if ((movingPiece === '♙' || movingPiece === '♟') && enPassantTarget && row === enPassantTarget[0] && col === enPassantTarget[1]) {
            // C'est une capture en passant !
            // Le pion capturé est sur la même colonne que la destination, mais sur la ligne de départ
            const capturedPawnRow = selectedRow;
            const capturedPawnCol = col;
            const capturedPiece = newBoard[capturedPawnRow][capturedPawnCol];
            
            // Retirer le pion capturé
            newBoard[capturedPawnRow][capturedPawnCol] = null;
            
            enPassantCapture = {
              position: [capturedPawnRow, capturedPawnCol],
              piece: capturedPiece
            };
          }
          
          // Vérifier si c'est une promotion de pion
          const isPromotion = (movingPiece === '♙' && row === 0) || (movingPiece === '♟' && row === 7);
          
          if (isPromotion) {
            // Promotion en attente : stocker les informations et attendre le choix du joueur
            setPromotionPending({
              from: [selectedRow, selectedCol],
              to: [row, col],
              piece: movingPiece,
              capturedPiece: capturedPiece,
              enPassantCapture: enPassantCapture,
              rookMove: rookMove
            });
            // Ne pas finaliser le mouvement maintenant
          } else {
            // Mouvement normal : finaliser immédiatement
            newBoard[row][col] = movingPiece; // Déplacer la pièce
            newBoard[selectedRow][selectedCol] = null; // Vider l'ancienne case
            setBoard(newBoard); // Mettre à jour le plateau

            // Mettre à jour hasMoved
            const newHasMoved = { ...hasMoved };
            const movingPieceKey = getHasMovedKey(movingPiece, selectedRow, selectedCol);
            if (movingPieceKey) {
              newHasMoved[movingPieceKey] = true;
            }
            
            // Si c'était un roque, marquer la tour comme ayant bougé
            if (rookMove) {
              const rookKey = getHasMovedKey(rookMove.piece, rookMove.from[0], rookMove.from[1]);
              if (rookKey) {
                newHasMoved[rookKey] = true;
              }
            }
            
            setHasMoved(newHasMoved);

            // Mettre à jour enPassantTarget
            let newEnPassantTarget = null;
            if ((movingPiece === '♙' || movingPiece === '♟') && Math.abs(row - selectedRow) === 2) {
              // Le pion a fait un double mouvement, définir la cible en passant
              newEnPassantTarget = [selectedRow + (row - selectedRow) / 2, col];
            }
            setEnPassantTarget(newEnPassantTarget);

            // Historique du coup
            const fromNotation = coordsToNotation(selectedRow, selectedCol);
            const toNotation = coordsToNotation(row, col);
            let moveNotation = `${movingPiece} ${fromNotation} → ${toNotation}`;
            
            // Ajouter la capture dans la notation
            if (capturedPiece) {
              moveNotation += ` x ${capturedPiece}`;
            } else if (enPassantCapture) {
              moveNotation += ` x ${enPassantCapture.piece} (en passant)`;
            }
            
            // Notation spéciale pour le roque
            if (rookMove) {
              const isKingside = col > selectedCol;
              moveNotation = `O-O${isKingside ? '' : '-O'}`; // O-O pour petit roque, O-O-O pour grand roque
            }
            
            setMoveHistory(prevHistory => [...prevHistory, moveNotation]);
            setLastMove({ from: [selectedRow, selectedCol], to: [row, col] });

            // Alterner le joueur
            const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
            setCurrentPlayer(nextPlayer);

            // Vérifier l'état du jeu pour le joueur suivant
            // Vérification 1 : Est-ce un échec et mat ?
            if (isCheckmate(newBoard, nextPlayer, newHasMoved, newEnPassantTarget)) {
              setGameStatus('checkmate');
              setWinner(currentPlayer); // Le joueur actuel gagne
              setIsCheck(true); // Le roi est en échec (maj)
            }
            // Vérification 2 : Est-ce un match nul (pat) ?
            else if (isStalemate(newBoard, nextPlayer, newHasMoved, newEnPassantTarget)) {
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
      }
      setSelectedSquare(null); // Désélectionner dans tous les cas
      setPossibleMoves([]); // Effacer l'affichage des coups possibles
    }
  };

  return (
    <div className="chessboard-container">
      <div className="toolbar">
        <span className="move-counter">Coup #{moveHistory.length}</span>
        <span className="player-status">Joueur actuel : {currentPlayer === 'white' ? '⚪ Blanc' : '⚫ Noir'}</span>
        <div className="button-row">
          <button className="new-game-btn" onClick={resetGame}>
            Nouvelle partie
          </button>
        </div>
      </div>

      <div className="status-stack">
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
      </div>
      
      <div className="board-area">
        {/* Plateau d'échecs avec légende */}
        <div className="chessboard-wrapper">
          {/* Labels des rangées (1-8) à gauche */}
          <div className="rank-labels">
            {[8, 7, 6, 5, 4, 3, 2, 1].map(rank => (
              <div key={rank} className="rank-label">{rank}</div>
            ))}
          </div>

          {/* Conteneur principal du plateau */}
          <div className="chessboard-container-main">
            {/* Plateau d'échecs */}
            <div className="chessboard">
              {board.map((row, rowIndex) =>
                row.map((piece, colIndex) => {
                  const isWhite = (rowIndex + colIndex) % 2 === 0;
                  const isSelected = selectedSquare && selectedSquare[0] === rowIndex && selectedSquare[1] === colIndex;
                  const moveIsLast = lastMove && (
                    (lastMove.from[0] === rowIndex && lastMove.from[1] === colIndex) ||
                    (lastMove.to[0] === rowIndex && lastMove.to[1] === colIndex)
                  );

                  return (
                    <Square
                      key={`${rowIndex}-${colIndex}`}
                      color={isWhite ? 'white' : 'black'}
                      piece={piece}
                      isSelected={isSelected}
                      isPossible={possibleMoves.some(pos => pos[0] === rowIndex && pos[1] === colIndex)}
                      isLastMove={moveIsLast}
                      onSquareClick={() => handleSquareClick(rowIndex, colIndex)}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Labels des colonnes (a-h) en bas */}
          <div className="file-labels">
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(file => (
              <div key={file} className="file-label">{file}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Interface de promotion du pion */}
      {promotionPending && (
        <div className="promotion-modal">
          <div className="promotion-content">
            <h3>Promotion du pion</h3>
            <p>Choisissez la pièce de promotion :</p>
            <div className="promotion-pieces">
              {currentPlayer === 'white' ? (
                // Pièces blanches
                <>
                  <button onClick={() => completePromotion('♕')} className="promotion-piece">
                    <img src="/Chess_qlt45.svg" alt="Reine" />
                    <span>Reine</span>
                  </button>
                  <button onClick={() => completePromotion('♖')} className="promotion-piece">
                    <img src="/Chess_rlt45.svg" alt="Tour" />
                    <span>Tour</span>
                  </button>
                  <button onClick={() => completePromotion('♗')} className="promotion-piece">
                    <img src="/Chess_blt45.svg" alt="Fou" />
                    <span>Fou</span>
                  </button>
                  <button onClick={() => completePromotion('♘')} className="promotion-piece">
                    <img src="/Chess_nlt45.svg" alt="Cavalier" />
                    <span>Cavalier</span>
                  </button>
                </>
              ) : (
                // Pièces noires
                <>
                  <button onClick={() => completePromotion('♛')} className="promotion-piece">
                    <img src="/Chess_qdt45.svg" alt="Reine" />
                    <span>Reine</span>
                  </button>
                  <button onClick={() => completePromotion('♜')} className="promotion-piece">
                    <img src="/Chess_rdt45.svg" alt="Tour" />
                    <span>Tour</span>
                  </button>
                  <button onClick={() => completePromotion('♝')} className="promotion-piece">
                    <img src="/Chess_bdt45.svg" alt="Fou" />
                    <span>Fou</span>
                  </button>
                  <button onClick={() => completePromotion('♞')} className="promotion-piece">
                    <img src="/Chess_ndt45.svg" alt="Cavalier" />
                    <span>Cavalier</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="history-container">
        <h3>Historique des coups</h3>
        {moveHistory.length === 0 ? (
          <p>Aucun coup joué pour le moment.</p>
        ) : (
          <ol>
            {moveHistory.map((move, index) => (
              <li key={index}>{move}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default ChessBoard;