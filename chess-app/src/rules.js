// rules.js - Règles de mouvement des pièces d'échecs

/**
 * Vérifie si un mouvement est valide pour un pion
 * @param {Array} board - Le plateau d'échecs (8x8)
 * @param {Array} from - Position de départ [row, col]
 * @param {Array} to - Position d'arrivée [row, col]
 * @returns {boolean} true si le mouvement est valide
 */
export function isValidMove(board, from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = board[fromRow][fromCol];

  // Vérifier que la pièce est un pion
  if (piece !== '♙' && piece !== '♟') {
    return false; // Pas un pion
  }

  const isWhite = piece === '♙'; // ♙ blanc, ♟ noir
  const direction = isWhite ? -1 : 1; // Blanc avance vers le haut (row diminue), noir vers le bas (row augmente)
  const startRow = isWhite ? 6 : 1; // Ligne de départ pour le premier mouvement

  // Calculer la différence de lignes et colonnes
  const rowDiff = toRow - fromRow;
  const colDiff = Math.abs(toCol - fromCol);

  // Condition 1 : Le pion ne peut pas reculer
  if ((isWhite && rowDiff >= 0) || (!isWhite && rowDiff <= 0)) {
    return false;
  }

  // Condition 2 : Mouvement en avant (même colonne)
  if (colDiff === 0) {
    // Case d'arrivée doit être vide
    if (board[toRow][toCol] !== null) {
      return false;
    }

    // Mouvement d'une case
    if (rowDiff === direction) {
      return true;
    }

    // Mouvement de deux cases (premier mouvement seulement)
    if (rowDiff === 2 * direction && fromRow === startRow) {
      // Vérifier que la case intermédiaire est vide
      const middleRow = fromRow + direction;
      if (board[middleRow][fromCol] === null) {
        return true;
      }
    }

    return false;
  }

  // Condition 3 : Capture en diagonale
  if (colDiff === 1 && rowDiff === direction) {
    // Il doit y avoir une pièce adverse sur la case d'arrivée
    const targetPiece = board[toRow][toCol];
    if (targetPiece !== null) {
      const isTargetWhite = ['♔', '♕', '♖', '♘', '♗', '♙'].includes(targetPiece);
      return isWhite !== isTargetWhite; // Couleur différente
    }
  }

  // Autres mouvements invalides
  return false;
}