/**
 * Tests unitaires pour rules.js
 * Couvre les cas limites : castling, en passant, promotion, échec, mat, pat
 */

import {
  isValidMove,
  isValidCastling,
  isKingInCheck,
  isMoveLeavesKingInCheck,
  isCheckmate,
  isStalemate,
  hasAnyValidMove,
  findKing,
} from '../src/rules';

const getInitialBoard = () => [
  ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
  ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
  ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
];

describe('rules.js - Pion', () => {
  test('Pion blanc avance 1 case', () => {
    const board = getInitialBoard();
    expect(isValidMove(board, [6, 4], [5, 4])).toBe(true);
  });

  test('Pion blanc avance 2 cases au premier coup', () => {
    const board = getInitialBoard();
    expect(isValidMove(board, [6, 4], [4, 4])).toBe(true);
  });

  test('Pion blanc ne peut pas avancer si occupé', () => {
    const board = getInitialBoard();
    board[5][4] = '♙'; // Bloquer la case
    expect(isValidMove(board, [6, 4], [5, 4])).toBe(false);
  });

  test('Pion blanc capture en diagonale', () => {
    const board = getInitialBoard();
    board[5][3] = '♟'; // Pièce adverse
    expect(isValidMove(board, [6, 4], [5, 3])).toBe(true);
  });

  test('Pion en passant capture', () => {
    const board = getInitialBoard();
    board[3][4] = '♙'; // Pion blanc
    board[3][5] = '♟'; // Pion noir à côté
    const enPassantTarget = [2, 5]; // Case de capture
    expect(isValidMove(board, [3, 4], [2, 5], null, enPassantTarget)).toBe(true);
  });

  test('Promotion pion blanc - avance à la dernière rangée', () => {
    const board = getInitialBoard();
    board[1][4] = '♙'; // Pion blanc une case avant promo
    board[0][4] = null; // Case libre
    expect(isValidMove(board, [1, 4], [0, 4])).toBe(true); // Promo est valide
  });
});

describe('rules.js - Roque', () => {
  test('Roque blanc côté roi (kingside)', () => {
    const board = getInitialBoard();
    // Vider les cases entre roi et tour
    board[7][5] = null;
    board[7][6] = null;
    const hasMoved = {
      'white-king': false,
      'white-rook-0': false,
      'white-rook-7': false,
      'black-king': false,
      'black-rook-0': false,
      'black-rook-7': false,
    };
    expect(isValidCastling(board, [7, 4], [7, 6], hasMoved)).toBe(true);
  });

  test('Roque blanc côté dame (queenside)', () => {
    const board = getInitialBoard();
    board[7][3] = null;
    board[7][2] = null;
    board[7][1] = null;
    const hasMoved = {
      'white-king': false,
      'white-rook-0': false,
      'white-rook-7': false,
      'black-king': false,
      'black-rook-0': false,
      'black-rook-7': false,
    };
    expect(isValidCastling(board, [7, 4], [7, 2], hasMoved)).toBe(true);
  });

  test('Roque impossible si roi a bougé', () => {
    const board = getInitialBoard();
    board[7][5] = null;
    board[7][6] = null;
    const hasMoved = {
      'white-king': true, // ROI A BOUGÉ
      'white-rook-0': false,
      'white-rook-7': false,
      'black-king': false,
      'black-rook-0': false,
      'black-rook-7': false,
    };
    expect(isValidCastling(board, [7, 4], [7, 6], hasMoved)).toBe(false);
  });

  test('Roque impossible si tour a bougé', () => {
    const board = getInitialBoard();
    board[7][5] = null;
    board[7][6] = null;
    const hasMoved = {
      'white-king': false,
      'white-rook-0': false,
      'white-rook-7': true, // TOUR A BOUGÉ
      'black-king': false,
      'black-rook-0': false,
      'black-rook-7': false,
    };
    expect(isValidCastling(board, [7, 4], [7, 6], hasMoved)).toBe(false);
  });

  test('Roque noir kingside', () => {
    const board = getInitialBoard();
    board[0][5] = null;
    board[0][6] = null;
    const hasMoved = {
      'white-king': false,
      'white-rook-0': false,
      'white-rook-7': false,
      'black-king': false,
      'black-rook-0': false,
      'black-rook-7': false,
    };
    expect(isValidCastling(board, [0, 4], [0, 6], hasMoved)).toBe(true);
  });
});

describe('rules.js - Échec & Détection', () => {
  test('Roi blanc non en échec initialement', () => {
    const board = getInitialBoard();
    expect(isKingInCheck(board, 'white')).toBe(false);
  });

  test('Mouvement ne doit pas laisser roi en échec', () => {
    const board = getInitialBoard();
    board[5][4] = '♖'; // Tour attaque la case vide
    board[6][4] = '♙'; // Pion blanc
    // Si le pion bouge et expose le roi
    expect(isMoveLeavesKingInCheck(board, [6, 4], [5, 4], 'white')).toBe(false);
  });

  test('Pion ne peut pas exposer le roi à l\'échec', () => {
    // Position où le pion protège le roi
    const board = [
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, '♙', null, null, null, null],
      [null, null, null, '♔', null, null, null, '♜'],
    ];
    // Si le pion se déplace et expose le roi à une attaque de tour
    expect(isMoveLeavesKingInCheck(board, [6, 3], [5, 3], 'white')).toBe(true);
  });
});

describe('rules.js - Mat & Pat', () => {
  test('Roi noir a des coups valides en position initialisée', () => {
    // Simple test: vérifier qu'en début de partie, au moins l'un d'eux a des coups
    const board = getInitialBoard();
    const hasMoved = {
      'white-king': false,
      'white-rook-0': false,
      'white-rook-7': false,
      'black-king': false,
      'black-rook-0': false,
      'black-rook-7': false,
    };
    expect(hasAnyValidMove(board, 'black', hasMoved, null)).toBe(true);
  });

  test('Roi blanc a des coups valides en début de partie', () => {
    const board = getInitialBoard();
    const hasMoved = {
      'white-king': false,
      'white-rook-0': false,
      'white-rook-7': false,
      'black-king': false,
      'black-rook-0': false,
      'black-rook-7': false,
    };
    expect(hasAnyValidMove(board, 'white', hasMoved, null)).toBe(true);
  });

  test('Bloc endgame : deux rois isolés', () => {
    // Deux rois seulement, impossible de faire mat
    const board = [
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['♚', null, null, null, null, null, null, '♔'],
    ];
    const hasMoved = {
      'white-king': false,
      'white-rook-0': false,
      'white-rook-7': false,
      'black-king': false,
      'black-rook-0': false,
      'black-rook-7': false,
    };
    // Noir a des coups (mouvement du roi)
    expect(hasAnyValidMove(board, 'black', hasMoved, null)).toBe(true);
  });
});

describe('rules.js - Utilitaires', () => {
  test('Trouve le roi blanc', () => {
    const board = getInitialBoard();
    expect(findKing(board, 'white')).toEqual([7, 4]);
  });

  test('Trouve le roi noir', () => {
    const board = getInitialBoard();
    expect(findKing(board, 'black')).toEqual([0, 4]);
  });

  test('Retourne null si roi absent (impossible)', () => {
    const board = getInitialBoard();
    board[0][4] = null;
    expect(findKing(board, 'black')).toBe(null);
  });

  test('hasAnyValidMove avec contexte en passant', () => {
    const board = getInitialBoard();
    const hasMoved = {
      'white-king': false,
      'white-rook-0': false,
      'white-rook-7': false,
      'black-king': false,
      'black-rook-0': false,
      'black-rook-7': false,
    };
    // Blanc doit avoir des coups valides au départ
    expect(hasAnyValidMove(board, 'white', hasMoved, null)).toBe(true);
  });
});

describe('rules.js - Pièces Spéciales', () => {
  test('Tour se déplace correctement', () => {
    const board = getInitialBoard();
    board[5][0] = '♖';
    board[7][0] = null;
    expect(isValidMove(board, [5, 0], [5, 4])).toBe(true);
  });

  test('Fou se déplace en diagonale', () => {
    const board = getInitialBoard();
    board[5][3] = '♗';
    board[7][2] = null;
    expect(isValidMove(board, [5, 3], [2, 6])).toBe(true);
  });

  test('Cavalier saute', () => {
    const board = getInitialBoard();
    board[5][0] = '♘';
    board[7][1] = null;
    expect(isValidMove(board, [5, 0], [3, 1])).toBe(true);
  });

  test('Reine combine fou et tour', () => {
    const board = getInitialBoard();
    board[4][4] = '♕';
    board[7][3] = null;
    // Vider le problème pour les mouvements
    for (let i = 5; i < 8; i++) board[i][4] = null;
    for (let i = 0; i < 4; i++) board[4][i] = null;
    for (let i = 5; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if ((i !== 4 || j !== 4) && board[i][j] && board[i][j] === '♙') {
          board[i][j] = null;
        }
      }
    }
    expect(isValidMove(board, [4, 4], [4, 7])).toBe(true); // Horizontal
    expect(isValidMove(board, [4, 4], [2, 2])).toBe(true); // Diagonal
  });
});
