import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Square from './Square';
import { isValidMove, isKingInCheck, isMoveLeavesKingInCheck, isCheckmate, isStalemate } from './rules';

const PIECE_TO_FEN = {
  '♔': 'K',
  '♕': 'Q',
  '♖': 'R',
  '♗': 'B',
  '♘': 'N',
  '♙': 'P',
  '♚': 'k',
  '♛': 'q',
  '♜': 'r',
  '♝': 'b',
  '♞': 'n',
  '♟': 'p',
};

const WHITE_PROMOTION_MAP = { q: '♕', r: '♖', b: '♗', n: '♘' };
const BLACK_PROMOTION_MAP = { q: '♛', r: '♜', b: '♝', n: '♞' };
const PIECE_VALUE = {
  '♔': 0,
  '♕': 9,
  '♖': 5,
  '♗': 3,
  '♘': 3,
  '♙': 1,
  '♚': 0,
  '♛': 9,
  '♜': 5,
  '♝': 3,
  '♞': 3,
  '♟': 1,
};
const AI_LEVEL_MOVETIME = {
  facile: 120,
  moyen: 400,
  dur: 1200,
};
const AI_MOVE_TIMEOUT_MS = 15000;
const AI_ENGINE_READY_TIMEOUT_MS = 30000;
const AI_LEVEL_CONFIG = {
  facile: {
    mode: 'movetime',
    movetime: 160,
    depth: 8,
    multiPV: 3,
    pickWeights: [0.55, 0.3, 0.12],
    randomLegalRate: 0.03,
  },
  moyen: {
    mode: 'movetime',
    movetime: 500,
    depth: 12,
    multiPV: 3,
    pickWeights: [0.82, 0.13, 0.04],
    randomLegalRate: 0.01,
  },
  dur: {
    mode: 'movetime',
    movetime: 1600,
    depth: 18,
    multiPV: 2,
    pickWeights: [0.97, 0.03, 0],
    randomLegalRate: 0,
  },
};
const AI_THINKING_COPY = [
  'L\'IA analyse la position...',
  'Reflexion en cours.',
  'Un instant, l\'IA prepare son coup.',
];

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

function parseInfoLine(line) {
  if (typeof line !== 'string' || !line.startsWith('info ') || !line.includes(' pv ')) {
    return null;
  }

  const multipvMatch = line.match(/\bmultipv\s+(\d+)/);
  const pvMatch = line.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);

  if (!pvMatch) {
    return null;
  }

  return {
    rank: multipvMatch ? Number(multipvMatch[1]) : 1,
    move: pvMatch[1].toLowerCase(),
  };
}

function weightedIndex(weights) {
  const sum = weights.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) {
    return 0;
  }

  let cursor = Math.random() * sum;
  for (let i = 0; i < weights.length; i += 1) {
    cursor -= weights[i];
    if (cursor <= 0) {
      return i;
    }
  }
  return 0;
}

function pickMoveByLevel(levelCfg, topMoves, bestmove, legalMoves) {
  if (Math.random() < levelCfg.randomLegalRate && legalMoves.length > 0) {
    const withoutTopMove = legalMoves.filter((move) => move !== topMoves[0]);
    const pool = withoutTopMove.length > 0 ? withoutTopMove : legalMoves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (topMoves.length > 0) {
    const weights = levelCfg.pickWeights.slice(0, topMoves.length);
    const idx = weightedIndex(weights);
    return topMoves[idx] || topMoves[0];
  }

  if (bestmove) {
    return bestmove;
  }

  if (legalMoves.length > 0) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  return null;
}

function parseUciMove(uci) {
  if (typeof uci !== 'string' || uci.length < 4) return null;
  const fromCol = uci.charCodeAt(0) - 97;
  const fromRow = 8 - Number(uci[1]);
  const toCol = uci.charCodeAt(2) - 97;
  const toRow = 8 - Number(uci[3]);
  if ([fromRow, fromCol, toRow, toCol].some((n) => Number.isNaN(n) || n < 0 || n > 7)) return null;
  return { fromRow, fromCol, toRow, toCol, promotion: uci[4] ? uci[4].toLowerCase() : null };
}

function scoreLocalMove(uci, boardState, epTarget) {
  const parsed = parseUciMove(uci);
  if (!parsed) return -Infinity;

  const movingPiece = boardState[parsed.fromRow][parsed.fromCol];
  const targetPiece = boardState[parsed.toRow][parsed.toCol];
  if (!movingPiece) return -Infinity;

  const isPawn = movingPiece === '♟';
  const isPromotion = isPawn && parsed.toRow === 7;
  const isEnPassant =
    isPawn &&
    epTarget &&
    parsed.toRow === epTarget[0] &&
    parsed.toCol === epTarget[1] &&
    !targetPiece;

  let captureScore = 0;
  if (targetPiece) captureScore = PIECE_VALUE[targetPiece] || 0;
  if (isEnPassant) captureScore = 1;

  const centerDistance = Math.abs(3.5 - parsed.toRow) + Math.abs(3.5 - parsed.toCol);
  const centerBonus = 3.5 - centerDistance;

  return (isPromotion ? 20 : 0) + captureScore * 4 + centerBonus + Math.random() * 0.1;
}

function pickLocalMoveByDifficulty(level, legalMoves, boardState, epTarget) {
  if (!legalMoves.length) return null;

  const scored = legalMoves
    .map((move) => ({ move, score: scoreLocalMove(move, boardState, epTarget) }))
    .sort((a, b) => b.score - a.score);

  if (level === 'facile') {
    const pickFrom = scored.slice(0, Math.min(6, scored.length));
    return pickFrom[Math.floor(Math.random() * pickFrom.length)].move;
  }

  if (level === 'moyen') {
    const weights = [0.65, 0.25, 0.1];
    const top = scored.slice(0, Math.min(3, scored.length)).map((x) => x.move);
    if (top.length === 1) return top[0];
    const idx = weightedIndex(weights.slice(0, top.length));
    return top[idx] || top[0];
  }

  return scored[0].move;
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

const ChessBoard = ({
  initialHumanVsAI = false,
  defaultAiLevel = 'moyen',
  enableAIControls = true,
  storageKey = 'chess-app-state-v1',
}) => {
  const initialState = useMemo(() => loadStoredGameState(storageKey), [storageKey]);
  const workerRef = useRef(null);
  const applyMoveFromUciRef = useRef(() => false);
  const aiTimeoutRef = useRef(null);
  const aiRequestCounterRef = useRef(0);
  const activeAIRequestRef = useRef(null);
  const aiCandidatesByRankRef = useRef(new Map());
  const aiLegalMovesRef = useRef([]);
  const aiLevelConfigRef = useRef(AI_LEVEL_CONFIG[defaultAiLevel] || AI_LEVEL_CONFIG.moyen);
  
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
  const humanVsAI = enableAIControls && initialHumanVsAI;
  const [aiLevel, setAiLevel] = useState(defaultAiLevel);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiThinkingMessage, setAiThinkingMessage] = useState(AI_THINKING_COPY[0]);
  const [aiEngineReady, setAiEngineReady] = useState(!enableAIControls);
  const [aiEngineError, setAiEngineError] = useState('');
  const [aiBackend, setAiBackend] = useState(enableAIControls ? 'stockfish' : 'none');
  const [workerGeneration, setWorkerGeneration] = useState(0);

  const clearAITimeout = useCallback(() => {
    if (aiTimeoutRef.current !== null) {
      window.clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
  }, []);

  const markAIIdle = useCallback(() => {
    clearAITimeout();
    activeAIRequestRef.current = null;
    aiCandidatesByRankRef.current = new Map();
    aiLegalMovesRef.current = [];
    setAiThinking(false);
  }, [clearAITimeout]);

  const restartAIWorker = useCallback(() => {
    setAiBackend('stockfish');
    setAiEngineReady(false);
    setAiEngineError('');
    setWorkerGeneration((prev) => prev + 1);
  }, []);

  const getSideToMove = useCallback(() => (currentPlayer === 'white' ? 'w' : 'b'), [currentPlayer]);

  const getCastlingRights = useCallback((boardState, movedState) => {
    let rights = '';

    if (!movedState['white-king']) {
      if (!movedState['white-rook-7'] && boardState[7][7] === '♖') rights += 'K';
      if (!movedState['white-rook-0'] && boardState[7][0] === '♖') rights += 'Q';
    }

    if (!movedState['black-king']) {
      if (!movedState['black-rook-7'] && boardState[0][7] === '♜') rights += 'k';
      if (!movedState['black-rook-0'] && boardState[0][0] === '♜') rights += 'q';
    }

    return rights || '-';
  }, []);

  const getFen = useCallback(() => {
    const boardPart = board
      .map((row) => {
        let empty = 0;
        let rowFen = '';
        row.forEach((piece) => {
          if (!piece) {
            empty += 1;
            return;
          }
          if (empty > 0) {
            rowFen += String(empty);
            empty = 0;
          }
          rowFen += PIECE_TO_FEN[piece] || '';
        });
        if (empty > 0) rowFen += String(empty);
        return rowFen;
      })
      .join('/');

    const enPassant = enPassantTarget ? coordsToNotation(enPassantTarget[0], enPassantTarget[1]) : '-';
    const castling = getCastlingRights(board, hasMoved);
    const fullMove = Math.floor(moveHistory.length / 2) + 1;

    return `${boardPart} ${getSideToMove()} ${castling} ${enPassant} 0 ${fullMove}`;
  }, [board, enPassantTarget, getCastlingRights, getSideToMove, hasMoved, moveHistory.length]);

  const getLegalMovesUci = useCallback((boardState, player, movedState, epTarget) => {
    const legalMoves = [];

    for (let fromRow = 0; fromRow < 8; fromRow += 1) {
      for (let fromCol = 0; fromCol < 8; fromCol += 1) {
        const piece = boardState[fromRow][fromCol];
        if (!piece || getPieceColor(piece) !== player) {
          continue;
        }

        for (let toRow = 0; toRow < 8; toRow += 1) {
          for (let toCol = 0; toCol < 8; toCol += 1) {
            if (fromRow === toRow && fromCol === toCol) {
              continue;
            }

            if (!isValidMove(boardState, [fromRow, fromCol], [toRow, toCol], movedState, epTarget)) {
              continue;
            }

            if (isMoveLeavesKingInCheck(boardState, [fromRow, fromCol], [toRow, toCol], player)) {
              continue;
            }

            const from = coordsToNotation(fromRow, fromCol);
            const to = coordsToNotation(toRow, toCol);
            const isPromotion = (piece === '♙' && toRow === 0) || (piece === '♟' && toRow === 7);

            if (isPromotion) {
              legalMoves.push(`${from}${to}q`);
              legalMoves.push(`${from}${to}r`);
              legalMoves.push(`${from}${to}b`);
              legalMoves.push(`${from}${to}n`);
            } else {
              legalMoves.push(`${from}${to}`);
            }
          }
        }
      }
    }

    return legalMoves;
  }, []);

  const resetGame = () => {
    const hadInFlightRequest = activeAIRequestRef.current !== null;
    markAIIdle();

    if (workerRef.current) {
      try {
        workerRef.current.postMessage('stop');
      } catch {
        // Ignore worker communication errors during reset.
      }
    }

    if (hadInFlightRequest || (enableAIControls && !aiEngineReady)) {
      restartAIWorker();
    }

    setAiEngineError('');
    setAiThinking(false);
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

  const applyMoveFromUci = useCallback((uci) => {
    if (typeof uci !== 'string' || uci.length < 4 || gameStatus !== null || promotionPending) {
      return false;
    }

    const fromFile = uci[0];
    const fromRank = Number(uci[1]);
    const toFile = uci[2];
    const toRank = Number(uci[3]);
    const promotion = uci[4] ? uci[4].toLowerCase() : null;

    const selectedCol = fromFile.charCodeAt(0) - 'a'.charCodeAt(0);
    const selectedRow = 8 - fromRank;
    const col = toFile.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - toRank;

    if (
      selectedRow < 0 || selectedRow > 7 || selectedCol < 0 || selectedCol > 7 ||
      row < 0 || row > 7 || col < 0 || col > 7
    ) {
      return false;
    }

    const movingPiece = board[selectedRow][selectedCol];
    if (!movingPiece) {
      return false;
    }

    if (getPieceColor(movingPiece) !== currentPlayer) {
      return false;
    }

    if (!isValidMove(board, [selectedRow, selectedCol], [row, col], hasMoved, enPassantTarget)) {
      return false;
    }

    if (isMoveLeavesKingInCheck(board, [selectedRow, selectedCol], [row, col], currentPlayer)) {
      return false;
    }

    const newBoard = board.map((r) => [...r]);
    const capturedPiece = newBoard[row][col];

    let rookMove = null;
    if ((movingPiece === '♔' || movingPiece === '♚') && Math.abs(col - selectedCol) === 2) {
      const isKingside = col > selectedCol;
      const rookFromCol = isKingside ? 7 : 0;
      const rookToCol = isKingside ? 5 : 3;
      const rookPiece = newBoard[selectedRow][rookFromCol];
      newBoard[selectedRow][rookToCol] = rookPiece;
      newBoard[selectedRow][rookFromCol] = null;
      rookMove = {
        from: [selectedRow, rookFromCol],
        to: [selectedRow, rookToCol],
        piece: rookPiece,
      };
    }

    let enPassantCapture = null;
    if ((movingPiece === '♙' || movingPiece === '♟') && enPassantTarget && row === enPassantTarget[0] && col === enPassantTarget[1]) {
      const capturedPawnRow = selectedRow;
      const capturedPawnCol = col;
      const epPiece = newBoard[capturedPawnRow][capturedPawnCol];
      newBoard[capturedPawnRow][capturedPawnCol] = null;
      enPassantCapture = {
        position: [capturedPawnRow, capturedPawnCol],
        piece: epPiece,
      };
    }

    newBoard[row][col] = movingPiece;
    newBoard[selectedRow][selectedCol] = null;

    const isPromotion = (movingPiece === '♙' && row === 0) || (movingPiece === '♟' && row === 7);
    if (isPromotion) {
      const promotionMap = currentPlayer === 'white' ? WHITE_PROMOTION_MAP : BLACK_PROMOTION_MAP;
      newBoard[row][col] = promotionMap[promotion || 'q'] || promotionMap.q;
    }

    setBoard(newBoard);

    const newHasMoved = { ...hasMoved };
    const movingPieceKey = getHasMovedKey(movingPiece, selectedRow, selectedCol);
    if (movingPieceKey) {
      newHasMoved[movingPieceKey] = true;
    }

    if (rookMove) {
      const rookKey = getHasMovedKey(rookMove.piece, rookMove.from[0], rookMove.from[1]);
      if (rookKey) {
        newHasMoved[rookKey] = true;
      }
    }

    setHasMoved(newHasMoved);

    let newEnPassantTarget = null;
    if ((movingPiece === '♙' || movingPiece === '♟') && Math.abs(row - selectedRow) === 2) {
      newEnPassantTarget = [selectedRow + (row - selectedRow) / 2, col];
    }
    setEnPassantTarget(newEnPassantTarget);

    const fromNotation = coordsToNotation(selectedRow, selectedCol);
    const toNotation = coordsToNotation(row, col);
    let moveNotation = `${movingPiece} ${fromNotation} → ${toNotation}`;
    if (capturedPiece) {
      moveNotation += ` x ${capturedPiece}`;
    } else if (enPassantCapture) {
      moveNotation += ` x ${enPassantCapture.piece} (en passant)`;
    }
    if (rookMove) {
      const isKingside = col > selectedCol;
      moveNotation = `O-O${isKingside ? '' : '-O'}`;
    }
    if (isPromotion) {
      moveNotation += `=${newBoard[row][col]}`;
    }

    setMoveHistory((prevHistory) => [...prevHistory, moveNotation]);
    setLastMove({ from: [selectedRow, selectedCol], to: [row, col] });
    setSelectedSquare(null);
    setPossibleMoves([]);

    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    setCurrentPlayer(nextPlayer);

    if (isCheckmate(newBoard, nextPlayer, newHasMoved, newEnPassantTarget)) {
      setGameStatus('checkmate');
      setWinner(currentPlayer);
      setIsCheck(true);
    } else if (isStalemate(newBoard, nextPlayer, newHasMoved, newEnPassantTarget)) {
      setGameStatus('stalemate');
      setWinner(null);
      setIsCheck(false);
    } else {
      setIsCheck(isKingInCheck(newBoard, nextPlayer));
    }

    return true;
  }, [board, currentPlayer, enPassantTarget, gameStatus, hasMoved, promotionPending]);

  useEffect(() => {
    applyMoveFromUciRef.current = applyMoveFromUci;
  }, [applyMoveFromUci]);

  const requestAIMove = useCallback(() => {
    if (!humanVsAI || !aiEngineReady || currentPlayer !== 'black' || aiThinking || gameStatus !== null || promotionPending) {
      return;
    }

    if (activeAIRequestRef.current !== null) {
      return;
    }

    const levelCfg = AI_LEVEL_CONFIG[aiLevel] || AI_LEVEL_CONFIG.moyen;
    const movetimeBase = levelCfg.movetime ?? AI_LEVEL_MOVETIME[aiLevel] ?? AI_LEVEL_MOVETIME.moyen;
    const movetimeJitter = Math.round(movetimeBase * (0.9 + Math.random() * 0.2));
    const legalMoves = getLegalMovesUci(board, 'black', hasMoved, enPassantTarget);

    if (legalMoves.length === 0) {
      return;
    }

    aiLevelConfigRef.current = levelCfg;
    aiCandidatesByRankRef.current = new Map();
    aiLegalMovesRef.current = legalMoves;

    const requestId = ++aiRequestCounterRef.current;

    activeAIRequestRef.current = requestId;
    setAiThinkingMessage(AI_THINKING_COPY[Math.floor(Math.random() * AI_THINKING_COPY.length)]);
    setAiThinking(true);

    if (aiBackend === 'local') {
      clearAITimeout();
      aiTimeoutRef.current = window.setTimeout(() => {
        if (activeAIRequestRef.current !== requestId) {
          return;
        }
        const move = pickLocalMoveByDifficulty(aiLevel, legalMoves, board, enPassantTarget);
        markAIIdle();
        if (move) {
          try {
            applyMoveFromUciRef.current(move);
          } catch {
            // Silent local AI failure.
          }
        }
      }, Math.max(180, Math.min(1400, movetimeJitter)));
      return;
    }

    const worker = workerRef.current;
    if (!worker) {
      markAIIdle();
      return;
    }

    clearAITimeout();
    aiTimeoutRef.current = window.setTimeout(() => {
      if (activeAIRequestRef.current !== requestId) {
        return;
      }

      try {
        workerRef.current?.postMessage('stop');
      } catch {
        // Ignore communication errors during timeout handling.
      }

      // Fallback doux: appliquer un coup legal si Stockfish ne repond pas,
      // sans invalider le moteur (evite l'etat "IA indisponible" en boucle).
      const fallbackMoves = aiLegalMovesRef.current;
      markAIIdle();
      if (fallbackMoves.length > 0) {
        const fallback = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
        try {
          applyMoveFromUciRef.current(fallback);
        } catch {
          // Silent fallback failure.
        }
      }
    }, AI_MOVE_TIMEOUT_MS);

    try {
      worker.postMessage(`setoption name MultiPV value ${levelCfg.multiPV}`);
      worker.postMessage(`position fen ${getFen()}`);
      if (levelCfg.mode === 'depth') {
        worker.postMessage(`go depth ${levelCfg.depth}`);
      } else {
        worker.postMessage(`go movetime ${movetimeJitter}`);
      }
    } catch {
      if (activeAIRequestRef.current === requestId) {
        // Appliquer un coup légal aléatoire comme fallback plutôt que redémarrer le worker.
        // Redémarrer crée une boucle : aiEngineReady false→true→useEffect→requestAIMove→timeout.
        const fallbackMoves = aiLegalMovesRef.current;
        markAIIdle();
        if (fallbackMoves.length > 0) {
          const fallback = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
          try { applyMoveFromUciRef.current(fallback); } catch { /* silent */ }
        }
      }
    }
  }, [
    aiBackend,
    board,
    aiLevel,
    aiThinking,
    clearAITimeout,
    currentPlayer,
    enPassantTarget,
    gameStatus,
    getFen,
    getLegalMovesUci,
    hasMoved,
    humanVsAI,
    aiEngineReady,
    markAIIdle,
    promotionPending,
  ]);

  const stopAI = useCallback(() => {
    const hadInFlightRequest = activeAIRequestRef.current !== null;
    const worker = workerRef.current;

    markAIIdle();

    if (!worker) {
      return;
    }

    try {
      worker.postMessage('stop');
    } catch {
      // Ignore worker communication errors on manual stop.
    }

    // Restarting the worker guarantees we never apply a late bestmove.
    if (hadInFlightRequest) {
      restartAIWorker();
    }
  }, [markAIIdle, restartAIWorker]);

  useEffect(() => {
    if (!enableAIControls) {
      return undefined;
    }

    let disposed = false;
    let readyTimer = null;
    let currentWorker = null;

    const baseUrl = import.meta.env.BASE_URL || '/';
    const engineScript = new URL(`${baseUrl}stockfish-18-lite-single.js`, window.location.href).toString();
    const engineWasm = new URL(`${baseUrl}stockfish-18-lite-single.wasm`, window.location.href).toString();
    const directEngineWorker = `${engineScript}#${encodeURIComponent(engineWasm)},worker`;
    const bridgeWorker = new URL(`${baseUrl}stockfish-worker.js`, window.location.href).toString();
    const candidates = [directEngineWorker, bridgeWorker];

    const clearReadyTimer = () => {
      if (readyTimer !== null) {
        window.clearTimeout(readyTimer);
        readyTimer = null;
      }
    };

    const tryStartCandidate = (index) => {
      if (disposed) {
        return;
      }

      if (index >= candidates.length) {
        markAIIdle();
        setAiBackend('local');
        setAiEngineReady(true);
        setAiEngineError('Stockfish indisponible - mode IA local actif.');
        return;
      }

      let engineReady = false;
      const worker = new Worker(candidates[index]);
      currentWorker = worker;
      workerRef.current = worker;

      const moveToNextCandidate = (message) => {
        if (disposed) {
          return;
        }
        if (message) {
          setAiEngineError(message);
        }
        clearReadyTimer();
        try {
          worker.terminate();
        } catch {
          // Ignore termination errors.
        }
        if (workerRef.current === worker) {
          workerRef.current = null;
        }
        tryStartCandidate(index + 1);
      };

      worker.onmessage = (event) => {
      const payload = event?.data;

      // Le moteur stockfish-18-lite-single.js envoie uniquement des strings UCI brutes.
      if (typeof payload !== 'string') return;

      const line = payload.trim();
      if (!line) return;

      // readyok : moteur pret
      if (line.toLowerCase() === 'readyok') {
        engineReady = true;
        clearReadyTimer();
        setAiBackend('stockfish');
        setAiEngineReady(true);
        setAiEngineError('');
        return;
      }

      // bestmove e2e4 [ponder e7e5]
      if (line.startsWith('bestmove ')) {
        if (activeAIRequestRef.current === null) return;

        const bParts = line.split(/\s+/);
        const bestUci = bParts[1];

        if (!bestUci || bestUci === '(none)' || bestUci === '0000') {
          markAIIdle();
          return;
        }

        const levelCfg = aiLevelConfigRef.current || AI_LEVEL_CONFIG.moyen;
        const topMoves = Array.from(aiCandidatesByRankRef.current.entries())
          .sort((a, b) => a[0] - b[0])
          .map((entry) => entry[1]);
        const selectedMove = pickMoveByLevel(
          levelCfg,
          topMoves,
          bestUci.toLowerCase(),
          aiLegalMovesRef.current,
        );

        markAIIdle();

        const tryApplyMove = (move) => {
          if (!move) return false;
          try { return Boolean(applyMoveFromUciRef.current(move)); } catch { return false; }
        };

        const moveOptions = [selectedMove, bestUci.toLowerCase(), ...aiLegalMovesRef.current];
        const applied = moveOptions.some(
          (move, index) => move && moveOptions.indexOf(move) === index && tryApplyMove(move),
        );

        if (!applied) {
          setAiEngineReady(false);
          setAiEngineError('Le moteur IA a renvoye un coup invalide.');
        }
        return;
      }

      // Lignes info multipv : candidats pour la selection par niveau
      if (activeAIRequestRef.current !== null) {
        const parsed = parseInfoLine(line);
        if (parsed?.move) {
          aiCandidatesByRankRef.current.set(parsed.rank, parsed.move);
        }
      }
    };

      worker.onerror = () => {
        if (!engineReady) {
          moveToNextCandidate('Echec du chargement du moteur IA.');
          return;
        }
        markAIIdle();
        setAiEngineReady(false);
        setAiEngineError('Moteur IA indisponible.');
      };

      // Sequence d'initialisation UCI
      try {
        worker.postMessage('uci');
        worker.postMessage('isready');
        worker.postMessage('ucinewgame');
      } catch {
        moveToNextCandidate('Impossible d\'initialiser le moteur IA.');
        return;
      }

      readyTimer = window.setTimeout(() => {
        if (disposed || engineReady) {
          return;
        }
        moveToNextCandidate('Demarrage du moteur IA en echec.');
      }, AI_ENGINE_READY_TIMEOUT_MS);
    };

    tryStartCandidate(0);

    return () => {
      disposed = true;
      clearAITimeout();
      clearReadyTimer();
      if (currentWorker) {
        try {
          currentWorker.terminate();
        } catch {
          // Ignore termination errors.
        }
      }
      if (workerRef.current === currentWorker) {
        workerRef.current = null;
      }
    };
  }, [clearAITimeout, enableAIControls, markAIIdle, workerGeneration]);

  useEffect(() => {
    if (humanVsAI && currentPlayer === 'black' && gameStatus === null && !promotionPending) {
      const timer = window.setTimeout(() => {
        requestAIMove();
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
    return undefined;
  }, [currentPlayer, gameStatus, humanVsAI, promotionPending, requestAIMove]);

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
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [board, currentPlayer, isCheck, gameStatus, winner, moveHistory, hasMoved, enPassantTarget, promotionPending, storageKey]);

  // Fonction appelée quand on clique sur une case
  const handleSquareClick = (row, col) => {
    if (aiThinking) {
      return;
    }

    if (humanVsAI && currentPlayer !== 'white') {
      return;
    }

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
      <div className="game-status-panel">
        <div className="status-info" aria-live="polite">
          {enableAIControls && (
            <p className="status-eyebrow">Contre l'IA</p>
          )}
          <p className="status-primary">
            {currentPlayer === 'white' ? 'Blanc a jouer' : 'Noir a jouer'}
          </p>
          <p className="status-secondary">
            {enableAIControls ? (
              <>
                IA Stockfish - Difficulte :
                <label className="sr-only" htmlFor="ai-level-select">Niveau IA</label>
                <select
                  id="ai-level-select"
                  className="difficulty-inline-select"
                  value={aiLevel}
                  onChange={(e) => setAiLevel(e.target.value)}
                  disabled={!humanVsAI || aiThinking}
                  aria-label="Niveau IA"
                >
                  <option value="facile">Facile</option>
                  <option value="moyen">Moyen</option>
                  <option value="dur">Difficile</option>
                </select>
              </>
            ) : (
              `Coup ${moveHistory.length}`
            )}
          </p>
          {enableAIControls && (
            <p className="status-tertiary">Coup {moveHistory.length}</p>
          )}
        </div>

        <div className="status-actions">
          {enableAIControls && (
            <div className="ai-system" role="status" aria-live="polite">
              <span className={`ai-badge ${aiThinking ? 'is-active' : ''} ${!aiEngineReady ? 'is-error' : ''}`}>
                {!aiEngineReady ? 'IA indisponible' : `IA ${aiThinking ? 'en reflexion' : 'active'}`}
              </span>
            </div>
          )}

          {enableAIControls && (
            <button
              type="button"
              className="toolbar-btn toolbar-btn-ghost"
              onClick={stopAI}
              disabled={!humanVsAI || !aiThinking}
            >
              Arreter l'IA
            </button>
          )}

          <button type="button" className="toolbar-btn toolbar-btn-primary" onClick={resetGame}>
            Nouvelle partie
          </button>
        </div>
      </div>

      <div className="status-stack">
        {enableAIControls && humanVsAI && aiThinking && (
          <div className="ai-thinking" role="status" aria-live="polite" aria-atomic="true">
            <span className="ai-thinking-dot" aria-hidden="true" />
            <span className="ai-thinking-text">{aiThinkingMessage}</span>
          </div>
        )}

        {enableAIControls && aiEngineError && (
          <div className="status-box status-warning" role="status" aria-live="polite">
            {aiEngineError}
          </div>
        )}

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
            <div className={`chessboard ${enableAIControls && humanVsAI && aiThinking ? 'chessboard-thinking' : ''}`}>
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