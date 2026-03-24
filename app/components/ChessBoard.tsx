'use client';

import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface ChessBoardProps {
  boardWidth: number;
}

export default function ChessBoard({ boardWidth }: ChessBoardProps) {
  const [game, setGame] = useState(new Chess());

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    // Créer une copie du jeu actuel
    const gameCopy = new Chess(game.fen());

    try {
      // Tenter le mouvement avec gameCopy.move()
      const result = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      // Si valide, mettre à jour l'état
      if (result) {
        setGame(gameCopy);
        return true;
      }
    } catch (error) {
      // Coup illégal : la pièce revient à sa place
      return false;
    }

    // Coup rejeté : la pièce revient à sa place
    return false;
  };

  return (
    <Chessboard
      position={game.fen()}
      onPieceDrop={onDrop}
      boardWidth={boardWidth}
      customSquareStyles={{
        border: '0px',
        borderRadius: '0px',
        margin: '0px',
        padding: '0px',
        gap: '0px',
      }}
      customBoardStyle={{
        borderRadius: '0px',
        boxShadow: 'none',
        gap: '0px',
        padding: '0px',
      }}
      darkSquareStyle={{
        gap: '0px',
        border: 'none',
      }}
      lightSquareStyle={{
        gap: '0px',
        border: 'none',
      }}
    />
  );
}
