import React, { useState } from 'react';
import Square from './Square';
import { isValidMove } from './rules';

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

const ChessBoard = () => {
  // État pour stocker le plateau (matrice 8x8)
  const [board, setBoard] = useState(getInitialBoard());
  // État pour la case sélectionnée : [row, col] ou null
  const [selectedSquare, setSelectedSquare] = useState(null);

  // Fonction appelée quand on clique sur une case
  const handleSquareClick = (row, col) => {
    if (selectedSquare === null) {
      // Si aucune case sélectionnée et qu'il y a une pièce, la sélectionner
      if (board[row][col] !== null) {
        setSelectedSquare([row, col]);
      }
    } else {
      // Si une case est sélectionnée, vérifier si le mouvement est valide
      const [selectedRow, selectedCol] = selectedSquare;
      if (isValidMove(board, [selectedRow, selectedCol], [row, col])) {
        // Mouvement valide : déplacer la pièce
        const newBoard = board.map(r => [...r]); // Copie profonde du plateau
        newBoard[row][col] = newBoard[selectedRow][selectedCol]; // Déplacer la pièce
        newBoard[selectedRow][selectedCol] = null; // Vider l'ancienne case
        setBoard(newBoard); // Mettre à jour le plateau
      }
      setSelectedSquare(null); // Désélectionner dans tous les cas
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 50px)', gridTemplateRows: 'repeat(8, 50px)' }}>
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
              onSquareClick={() => handleSquareClick(rowIndex, colIndex)}
            />
          );
        })
      )}
    </div>
  );
};

export default ChessBoard;