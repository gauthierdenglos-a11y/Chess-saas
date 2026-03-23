'use client';

import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export default function Home() {
  const [game, setGame] = useState(new Chess());
  const [boardPosition, setBoardPosition] = useState(game.fen());

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    const newGame = new Chess(game.fen());
    
    try {
      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      // Si le coup est légal, mettre à jour l'état
      if (move) {
        setGame(newGame);
        setBoardPosition(newGame.fen());
        return true;
      }
    } catch (error) {
      // Coup illégal : la pièce revient à sa place
      return false;
    }

    // Coup rejeté : la pièce revient à sa place
    return false;
  };

  const resetBoard = () => {
    const newGame = new Chess();
    setGame(newGame);
    setBoardPosition(newGame.fen());
  };

  const getCurrentPlayer = () => {
    return game.turn() === 'w' ? 'Blancs' : 'Noirs';
  };

  const gameStatus = () => {
    if (game.isCheckmate()) {
      return `Échec et mat! ${game.turn() === 'w' ? 'Noirs' : 'Blancs'} gagnent`;
    }
    if (game.isCheck()) {
      return `Échec! ${getCurrentPlayer()} sont en échec`;
    }
    if (game.isDraw()) {
      return 'Égalité';
    }
    return null;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="flex gap-8">
        {/* Échiquier - Côté gauche */}
        <div className="bg-slate-900 rounded-lg p-6 shadow-2xl">
          <Chessboard
            position={boardPosition}
            onPieceDrop={onDrop}
            boardWidth={400}
            customSquareStyles={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          />
        </div>

        {/* Panneau d'information - Côté droit */}
        <div className="bg-slate-800 rounded-lg p-8 shadow-2xl w-64 flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-4">Chess</h1>
            <div className="border-t border-slate-600"></div>
          </div>

          {/* Tour actuel */}
          <div className="text-center">
            <p className="text-gray-400 text-sm uppercase tracking-wide mb-2">Tour actuel</p>
            <p className="text-2xl font-bold text-blue-400">
              {getCurrentPlayer()}
            </p>
          </div>

          {/* Statut du jeu */}
          {gameStatus() && (
            <div className="bg-amber-900 bg-opacity-30 border border-amber-600 rounded-lg p-4">
              <p className="text-amber-200 text-center font-semibold">
                {gameStatus()}
              </p>
            </div>
          )}

          {/* Coups joués */}
          <div className="text-center">
            <p className="text-gray-400 text-sm uppercase tracking-wide mb-2">Coups joués</p>
            <p className="text-xl font-semibold text-white">
              {Math.floor(game.moves().length / 2)}
            </p>
          </div>

          {/* Bouton Reset */}
          <button
            onClick={resetBoard}
            className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
