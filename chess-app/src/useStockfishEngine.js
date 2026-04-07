import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook personnalisé pour gérer le moteur Stockfish
 * Encapsule la logique du worker, retry, et fallback
 * 
 * @param {boolean} enabled - Activer/désactiver le hook
 * @param {number} generation - Trigger un redémarrage du worker
 * @returns {Object} {isReady, error, requestMove, stopMove}
 */
export function useStockfishEngine(enabled = true, generation = 0) {
  const workerRef = useRef(null);
  const activeRequestRef = useRef(null);
  const timeoutRef = useRef(null);
  
  const [isReady, setIsReady] = useState(!enabled);
  const [error, setError] = useState('');

  // Callback du premier démarrage du worker
  const initializeWorker = useCallback(() => {
    if (!enabled || isReady) {
      return;
    }

    try {
      // En production, utiliserait le path correct selon l'environnement
      const workerPath = new URL(
        '../public/stockfish-worker.js',
        import.meta.url
      ).href;
      
      workerRef.current = new Worker(workerPath);
      
      // Gérer les messages du worker
      workerRef.current.onmessage = (event) => {
        try {
          const message = event.data;
          if (typeof message === 'string') {
            if (message.startsWith('readyok')) {
              setIsReady(true);
              setError('');
            }
          }
        } catch (err) {
          console.error('Worker message error:', err);
        }
      };

      // Gérer les erreurs du worker
      workerRef.current.onerror = (err) => {
        console.error('Worker error:', err);
        setError(err.message || 'Erreur du worker Stockfish');
        setIsReady(false);
        // Fallback à l'IA locale
      };

      // Envoyer la commande de démarrage
      workerRef.current.postMessage('uci');
    } catch (err) {
      console.error('Failed to initialize worker:', err);
      setError(err.message);
      setIsReady(false);
    }
  }, [enabled, isReady]);

  // Nettoyer le worker
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (workerRef.current) {
      try {
        workerRef.current.postMessage('stop');
        workerRef.current.terminate();
      } catch {
        // Ignore cleanup errors
      }
      workerRef.current = null;
    }
    
    activeRequestRef.current = null;
    setIsReady(false);
  }, []);

  // Redémarrer le worker à chaque changement de generation
  useEffect(() => {
    // Cleanup synchrone (pas de setState)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (workerRef.current) {
      try {
        workerRef.current.postMessage('stop');
        workerRef.current.terminate();
      } catch {
        // Ignore cleanup errors
      }
      workerRef.current = null;
    }
    
    activeRequestRef.current = null;

    // Async init
    if (enabled) {
      const initTimer = setTimeout(() => {
        initializeWorker();
      }, 100);
      return () => clearTimeout(initTimer);
    }
    return undefined;
  }, [generation, enabled, initializeWorker]);

  // Stopper proprement quand le composant unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Demander un mouvement au moteur
  const requestMove = useCallback((fen, level = 'moyen', onMove, onTimeout) => {
    if (!isReady || !workerRef.current) {
      if (onTimeout) onTimeout();
      return;
    }

    const requestId = Symbol('request');
    activeRequestRef.current = requestId;

    const handleBestmove = (event) => {
      if (activeRequestRef.current !== requestId) return;
      
      const message = event.data;
      if (typeof message === 'string' && message.startsWith('bestmove')) {
        const move = message.split(' ')[1];
        workerRef.current.removeEventListener('message', handleBestmove);
        clearTimeout(timeoutRef.current);
        activeRequestRef.current = null;
        
        if (move && onMove) {
          onMove(move);
        }
      }
    };

    try {
      workerRef.current.addEventListener('message', handleBestmove);

      // Timeout par défaut
      const timeout = level === 'facile' ? 500 : level === 'moyen' ? 2000 : 5000;
      timeoutRef.current = setTimeout(() => {
        if (activeRequestRef.current === requestId) {
          activeRequestRef.current = null;
          workerRef.current?.removeEventListener('message', handleBestmove);
          if (onTimeout) onTimeout();
        }
      }, timeout);

      // Envoyer la position
      workerRef.current.postMessage(`position fen ${fen}`);
      
      // Configurer Stockfish selon le niveau
      const depth = level === 'facile' ? 8 : level === 'moyen' ? 12 : 18;
      const movetime = level === 'facile' ? 160 : level === 'moyen' ? 500 : 1600;
      
      workerRef.current.postMessage(`go depth ${depth} movetime ${movetime}`);
    } catch (err) {
      console.error('Request move failed:', err);
      if (onTimeout) onTimeout();
    }
  }, [isReady]);

  // Arrêter la recherche
  const stopMove = useCallback(() => {
    if (workerRef.current && activeRequestRef.current) {
      try {
        workerRef.current.postMessage('stop');
      } catch {
        // Ignore stop errors
      }
      activeRequestRef.current = null;
    }
  }, []);

  return {
    isReady,
    error,
    requestMove,
    stopMove,
    terminate: cleanup,
  };
}
