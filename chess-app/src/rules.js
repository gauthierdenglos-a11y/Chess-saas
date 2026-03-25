// rules.js - Règles de mouvement des pièces d'échecs

// ============ FONCTIONS UTILITAIRES ============

/**
 * Détermine si une pièce est blanche ou noire
 * @param {string} piece - Caractère Unicode de la pièce
 * @returns {boolean} true si blanc, false si noir
 */
function isWhitePiece(piece) {
  return ['♔', '♕', '♖', '♘', '♗', '♙'].includes(piece);
}

/**
 * Vérifie si le chemin entre deux cases est libre (pour tour et fou)
 * @param {Array} board - Le plateau d'échecs
 * @param {Array} from - Position départ [row, col]
 * @param {Array} to - Position arrivée [row, col]
 * @returns {boolean} true si le chemin est libre
 */
function isPathClear(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;

  // Déterminer la direction du mouvement
  const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
  const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

  // Parcourir le chemin sans la destination
  let currentRow = fromRow + rowStep;
  let currentCol = fromCol + colStep;

  while (currentRow !== toRow || currentCol !== toCol) {
    if (board[currentRow][currentCol] !== null) {
      return false; // Collision
    }
    currentRow += rowStep;
    currentCol += colStep;
  }

  return true; // Chemin libre
}

/**
 * Vérifie si la case de destination est libre ou contient une pièce adverse
 * @param {Array} board - Le plateau d'échecs
 * @param {string} piece - La pièce qui se déplace
 * @param {Array} to - Position d'arrivée
 * @returns {boolean} true si capture possible ou case vide
 */
function isDestinationValid(board, piece, to) {
  const [toRow, toCol] = to;
  const targetPiece = board[toRow][toCol];

  // Case vide
  if (targetPiece === null) {
    return true;
  }

  // Case occupée : doit être pièce adverse
  return isWhitePiece(piece) !== isWhitePiece(targetPiece);
}

// ============ RÈGLES PAR PIÈCE ============

/**
 * Valide un mouvement de PION
 * @param {Array} board - Le plateau d'échecs
 * @param {Array} from - Position de départ [row, col]
 * @param {Array} to - Position d'arrivée [row, col]
 * @param {Array} enPassantTarget - Position du pion pouvant être capturé en passant [row, col] ou null
 */
function isValidPawnMove(board, from, to, enPassantTarget = null) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = board[fromRow][fromCol];

  const isWhite = isWhitePiece(piece);
  const direction = isWhite ? -1 : 1;
  const startRow = isWhite ? 6 : 1;

  const rowDiff = toRow - fromRow;
  const colDiff = Math.abs(toCol - fromCol);

  // Le pion ne peut pas reculer
  if ((isWhite && rowDiff >= 0) || (!isWhite && rowDiff <= 0)) {
    return false;
  }

  // Mouvement en avant (même colonne)
  if (colDiff === 0) {
    if (board[toRow][toCol] !== null) {
      return false; // Case occupée
    }

    // Une case en avant
    if (rowDiff === direction) {
      return true;
    }

    // Deux cases en avant (premier coup seulement)
    if (rowDiff === 2 * direction && fromRow === startRow) {
      const middleRow = fromRow + direction;
      return board[middleRow][fromCol] === null; // Case intermédiaire vide
    }

    return false;
  }

  // Capture en diagonale (une case)
  if (colDiff === 1 && rowDiff === direction) {
    const targetPiece = board[toRow][toCol];
    if (targetPiece !== null) {
      return isWhite !== isWhitePiece(targetPiece); // Pièce adverse
    }

    // Capture en passant
    if (enPassantTarget && toRow === enPassantTarget[0] && toCol === enPassantTarget[1]) {
      return true;
    }
  }

  return false;
}

/**
 * Valide un mouvement de TOUR
 * Mouvement : horizontal ou vertical, illimité
 */
function isValidRookMove(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = board[fromRow][fromCol];

  // La tour ne bouge que horizontalement ou verticalement
  const isStraightLine = fromRow === toRow || fromCol === toCol;
  if (!isStraightLine) {
    return false;
  }

  // Vérifie que le chemin est libre
  if (!isPathClear(board, from, to)) {
    return false;
  }

  // Destination valide (vide ou pièce adverse)
  return isDestinationValid(board, piece, to);
}

/**
 * Valide un mouvement de FOU
 * Mouvement : diagonal, illimité
 */
function isValidBishopMove(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = board[fromRow][fromCol];

  // Calcule les distances
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  // Le fou se déplace en diagonale (même distance ligne et colonne)
  if (rowDiff !== colDiff || rowDiff === 0) {
    return false;
  }

  // Vérifie que le chemin est libre
  if (!isPathClear(board, from, to)) {
    return false;
  }

  // Destination valide (vide ou pièce adverse)
  return isDestinationValid(board, piece, to);
}

/**
 * Valide un mouvement de CAVALIER
 * Mouvement : en L (2 cases dans une direction, 1 case perpendiculaire)
 * Le cavalier peut sauter par-dessus les autres pièces
 */
function isValidKnightMove(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = board[fromRow][fromCol];

  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  // Le cavalier fait un mouvement en L : (2,1) ou (1,2)
  const isValidL = (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  if (!isValidL) {
    return false;
  }

  // Destination valide (vide ou pièce adverse)
  return isDestinationValid(board, piece, to);
}

/**
 * Valide un mouvement de REINE (♕/♛)
 * Mouvement : combinaison de la tour et du fou
 * - Horizontal ou vertical (comme tour) illimité
 * - Diagonal (comme fou) illimité
 */
function isValidQueenMove(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = board[fromRow][fromCol];

  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  // La reine se déplace horizontalement, verticalement ou diagonalement
  const isStraightOrDiagonal = fromRow === toRow || fromCol === toCol || rowDiff === colDiff;
  if (!isStraightOrDiagonal) {
    return false;
  }

  // Vérifie que le chemin est libre
  if (!isPathClear(board, from, to)) {
    return false;
  }

  // Destination valide (vide ou pièce adverse)
  return isDestinationValid(board, piece, to);
}

/**
 * Valide un mouvement de ROI (♔/♚)
 * Mouvement : une seule case dans n'importe quelle direction
 * (horizontal, vertical ou diagonal)
 * OU roque : mouvement de 2 cases horizontalement
 */
function isValidKingMove(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = board[fromRow][fromCol];

  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  // Mouvement normal : une seule case max
  if (rowDiff <= 1 && colDiff <= 1) {
    return isDestinationValid(board, piece, to);
  }

  // Roque potentiel : 2 cases horizontalement, même ligne
  if (rowDiff === 0 && colDiff === 2) {
    // Le roque sera validé séparément dans isValidCastling
    return true;
  }

  return false;
}

/**
 * Vérifie si le roque est valide
 * @param {Array} board - Le plateau d'échecs
 * @param {Array} from - Position du roi [row, col]
 * @param {Array} to - Position d'arrivée du roi [row, col]
 * @param {Object} hasMoved - État des pièces qui ont bougé
 * @returns {boolean} true si le roque est valide
 */
export function isValidCastling(board, from, to, hasMoved) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = board[fromRow][fromCol];

  // Vérifications de base
  if (fromRow !== toRow) return false; // Même ligne
  const colDiff = toCol - fromCol;
  if (Math.abs(colDiff) !== 2) return false; // Exactement 2 cases

  const isWhite = isWhitePiece(piece);
  const color = isWhite ? 'white' : 'black';
  const kingKey = `${color}-king`;

  // Le roi n'a pas bougé
  if (hasMoved[kingKey]) return false;

  // Le roi n'est pas en échec
  if (isKingInCheck(board, color)) return false;

  // Déterminer le côté du roque
  const isKingside = colDiff > 0; // true pour roque côté roi, false pour côté dame
  const rookCol = isKingside ? 7 : 0;
  const rookKey = `${color}-rook-${rookCol}`;

  // La tour n'a pas bougé
  if (hasMoved[rookKey]) return false;

  // La tour est à sa position initiale
  const expectedRook = isWhite ? '♖' : '♜';
  if (board[fromRow][rookCol] !== expectedRook) return false;

  // Cases entre roi et tour sont vides
  const startCol = Math.min(fromCol, rookCol) + 1;
  const endCol = Math.max(fromCol, rookCol) - 1;
  for (let col = startCol; col <= endCol; col++) {
    if (board[fromRow][col] !== null) return false;
  }

  // Le roi ne passe pas par une case attaquée
  const kingPathCol = isKingside ? fromCol + 1 : fromCol - 1;
  const enemyColor = color === 'white' ? 'black' : 'white';

  // Vérifier la case intermédiaire
  for (let col = Math.min(fromCol, kingPathCol); col <= Math.max(fromCol, kingPathCol); col++) {
    if (isSquareAttacked(board, [fromRow, col], enemyColor)) return false;
  }

  // Vérifier la case d'arrivée du roi
  if (isSquareAttacked(board, [toRow, toCol], enemyColor)) return false;

  return true;
}

/**
 * Vérifie si une case est attaquée par une pièce de la couleur donnée
 * @param {Array} board - Le plateau d'échecs
 * @param {Array} square - Position [row, col]
 * @param {string} attackingColor - 'white' ou 'black'
 * @returns {boolean} true si la case est attaquée
 */
function isSquareAttacked(board, square, attackingColor) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece !== null && isWhitePiece(piece) === (attackingColor === 'white')) {
        if (canPieceAttackSquare(board, [row, col], square)) {
          return true;
        }
      }
    }
  }
  return false;
}

// ============ FONCTION PRINCIPALE ============

/**
 * Vérifie si un mouvement est valide (toutes pièces)
 * @param {Array} board - Le plateau d'échecs (8x8)
 * @param {Array} from - Position de départ [row, col]
 * @param {Array} to - Position d'arrivée [row, col]
 * @param {Object} hasMoved - État des pièces qui ont bougé (optionnel, pour le roque)
 * @param {Array} enPassantTarget - Position du pion pouvant être capturé en passant [row, col] ou null
 * @returns {boolean} true si le mouvement est valide
 */
export function isValidMove(board, from, to, hasMoved = null, enPassantTarget = null) {
  const [fromRow, fromCol] = from;
  const piece = board[fromRow][fromCol];

  // Pas de pièce à la position de départ
  if (!piece) {
    return false;
  }

  // Pas de déplacement sur soi-même
  if (fromRow === to[0] && fromCol === to[1]) {
    return false;
  }

  // Vérifier si c'est un roque (roi qui bouge de 2 cases horizontalement)
  if ((piece === '♔' || piece === '♚') && Math.abs(to[1] - fromCol) === 2 && fromRow === to[0]) {
    if (!hasMoved) return false; // hasMoved requis pour le roque
    return isValidCastling(board, from, to, hasMoved);
  }

  // Valider selon le type de pièce
  switch (piece) {
    case '♙':
    case '♟':
      return isValidPawnMove(board, from, to, enPassantTarget);
    case '♖':
    case '♜':
      return isValidRookMove(board, from, to);
    case '♗':
    case '♝':
      return isValidBishopMove(board, from, to);
    case '♘':
    case '♞':
      return isValidKnightMove(board, from, to);
    case '♕':
    case '♛':
      return isValidQueenMove(board, from, to);
    case '♔':
    case '♚':
      return isValidKingMove(board, from, to);
    default:
      return false; // Pièce inconnue
  }
}

// ============ DÉTECTION D'ÉCHEC ============

/**
 * Trouve la position du roi sur le plateau
 * @param {Array} board - Le plateau d'échecs
 * @param {string} color - 'white' ou 'black'
 * @returns {Array} Position [row, col] ou null si roi non trouvé
 */
export function findKing(board, color) {
  const kingPiece = color === 'white' ? '♔' : '♚';
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === kingPiece) {
        return [row, col]; // Roi trouvé
      }
    }
  }
  
  return null; // Roi non trouvé (situation impossible en jeu)
}

/**
 * Vérifie si une pièce peut attaquer une case donnée
 * (similaire à isValidMove mais ignore les pièces alliées)
 * @param {Array} board - Le plateau d'échecs
 * @param {Array} from - Position de la pièce attaquante [row, col]
 * @param {Array} to - Position cible [row, col]
 * @returns {boolean} true si la pièce peut attaquer cette case
 */
function canPieceAttackSquare(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = board[fromRow][fromCol];

  // Pas de pièce à la position de départ
  if (!piece || fromRow === toRow && fromCol === toCol) {
    return false;
  }

  // Utiliser les mêmes règles que isValidMove
  switch (piece) {
    case '♙':
    case '♟':
      return isValidPawnMove(board, from, to);
    case '♖':
    case '♜':
      return isValidRookMove(board, from, to);
    case '♗':
    case '♝':
      return isValidBishopMove(board, from, to);
    case '♘':
    case '♞':
      return isValidKnightMove(board, from, to);
    case '♕':
    case '♛':
      return isValidQueenMove(board, from, to);
    case '♔':
    case '♚':
      return isValidKingMove(board, from, to);
    default:
      return false;
  }
}

/**
 * Vérifie si le roi d'une couleur est en échec
 * Le roi est en échec si une pièce adverse peut l'attaquer
 * @param {Array} board - Le plateau d'échecs
 * @param {string} color - 'white' ou 'black'
 * @returns {boolean} true si le roi est en échec
 */
export function isKingInCheck(board, color) {
  // Trouver la position du roi
  const kingPosition = findKing(board, color);
  if (!kingPosition) {
    return false; // Pas de roi (impossible)
  }

  const [kingRow, kingCol] = kingPosition;
  const enemyColor = color === 'white' ? 'black' : 'white';

  // Parcourir tout le plateau pour trouver les pièces adverses
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];

      // Si la case contient une pièce adverse
      if (piece !== null && isWhitePiece(piece) === (enemyColor === 'white')) {
        // Vérifier si cette pièce peut attaquer le roi
        if (canPieceAttackSquare(board, [row, col], [kingRow, kingCol])) {
          return true; // Le roi est en échec
        }
      }
    }
  }

  return false; // Le roi n'est pas en échec
}

/**
 * Vérifie si un mouvement laisserait le roi en échec
 * Simule le mouvement et vérifie l'état du roi ensuite
 * @param {Array} board - Le plateau d'échecs
 * @param {Array} from - Position de départ [row, col]
 * @param {Array} to - Position d'arrivée [row, col]
 * @param {string} playerColor - Couleur du joueur qui fait le mouvement
 * @returns {boolean} true si le mouvement leave le roi en danger
 */
export function isMoveLeavesKingInCheck(board, from, to, playerColor) {
  // Créer une copie du plateau pour simuler le mouvement
  const simulatedBoard = board.map(r => [...r]);

  // Effectuer le mouvement
  simulatedBoard[to[0]][to[1]] = simulatedBoard[from[0]][from[1]];
  simulatedBoard[from[0]][from[1]] = null;

  // Vérifier si le roi est en échec après le mouvement
  return isKingInCheck(simulatedBoard, playerColor);
}

// ============ DÉTECTION FIN DE PARTIE ============

/**
 * Vérifie si un joueur a au moins un coup valide disponible
 * Teste TOUS les coups possibles de toutes les pièces
 * Très important pour détecter mat et pat
 * @param {Array} board - Le plateau d'échecs
 * @param {string} color - 'white' ou 'black'
 * @returns {boolean} true si le joueur a au moins un coup valide
 */
export function hasAnyValidMove(board, color) {
  // Parcourir tout le plateau
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];

      // Ignorer les cases vides et les pièces adverses
      if (piece === null || isWhitePiece(piece) !== (color === 'white')) {
        continue; // Pas notre pièce
      }

      // Tester TOUS les coups possibles pour cette pièce
      for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
          // Ignorer la case de départ
          if (fromRow === toRow && fromCol === toCol) {
            continue;
          }

          // Vérifier si le coup est légal
          if (isValidMove(board, [fromRow, fromCol], [toRow, toCol])) {
            // Vérifier si le coup est sûr (ne laisse pas le roi en échec)
            if (!isMoveLeavesKingInCheck(board, [fromRow, fromCol], [toRow, toCol], color)) {
              return true; // Au moins un coup valide trouvé
            }
          }
        }
      }
    }
  }

  return false; // Aucun coup valide
}

/**
 * Vérifie si c'est l'échec et mat
 * Conditions : 
 * - Le roi est EN ÉCHEC
 * - Aucun coup valide n'existe
 * @param {Array} board - Le plateau d'échecs
 * @param {string} color - 'white' ou 'black'
 * @returns {boolean} true si c'est le mat
 */
export function isCheckmate(board, color) {
  // Le roi doit être en échec
  if (!isKingInCheck(board, color)) {
    return false; // Pas en échec = pas de mat possible
  }

  // Aucun coup valide ne doit exister
  return !hasAnyValidMove(board, color);
}

/**
 * Vérifie si c'est un match nul (stalemate)
 * Conditions :
 * - Le roi N'EST PAS en échec
 * - Aucun coup valide n'existe
 * C'est une situation où le joueur ne peut pas jouer mais n'est pas menacé
 * @param {Array} board - Le plateau d'échecs
 * @param {string} color - 'white' ou 'black'
 * @returns {boolean} true si c'est un pat (match nul)
 */
export function isStalemate(board, color) {
  // Le roi ne doit PAS être en échec
  if (isKingInCheck(board, color)) {
    return false; // En échec = pas de pat possible
  }

  // Aucun coup valide ne doit exister
  return !hasAnyValidMove(board, color);
}