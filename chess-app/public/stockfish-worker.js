'use strict';

/**
 * stockfish-worker.js - UCI Bridge Worker
 *
 * Problem: stockfish-18-lite-single.js is an Emscripten build that locates
 * the WASM file relative to self.location. When loaded via importScripts()
 * inside another worker, self.location stays on the outer worker URL, so
 * Emscripten looks for "<outer-worker-name>.wasm" which does not exist.
 *
 * Fix: launch stockfish-18-lite-single.js as a nested dedicated Worker with
 * the hash-URL pattern "#<wasm-path>,worker" that the Emscripten glue code
 * uses to (a) locate the WASM file and (b) detect it is running as a worker.
 *
 * API - messages accepted FROM the main thread:
 *   { type: "go",      fen: string, depth?: number, movetime?: number }
 *   { type: "stop" }
 *   { type: "uci_cmd", line: string }
 *
 * API - messages posted TO the main thread:
 *   <string>   raw UCI output line (e.g. "info depth 12 score cp 30 ...")
 *   { type: "bestmove", uci: string, ponder?: string }
 *   { type: "error",    message: string }
 */

var ORIGIN      = self.location.origin;
var ENGINE_JS   = ORIGIN + '/stockfish-18-lite-single.js';
var ENGINE_WASM = ORIGIN + '/stockfish-18-lite-single.wasm';

// Hash tells Emscripten: (1) WASM path, (2) run as worker thread.
var ENGINE_URL  = ENGINE_JS + '#' + encodeURIComponent(ENGINE_WASM) + ',worker';

var engineWorker = null;
var cmdQueue     = [];  // UCI strings buffered before the engine is live.

/* ---- helpers ---- */

function forwardBestmove(line) {
  var parts = line.trim().split(/\s+/);
  var uci   = parts[1];
  if (!uci || uci === '(none)' || uci === '0000') return;

  var ponder;
  for (var i = 2; i + 1 < parts.length; i++) {
    if (parts[i] === 'ponder') { ponder = parts[i + 1]; break; }
  }

  var out = { type: 'bestmove', uci: uci };
  if (ponder) out.ponder = ponder;
  self.postMessage(out);
}

function sendToEngine(cmd) {
  if (!engineWorker) { cmdQueue.push(cmd); return; }
  engineWorker.postMessage(cmd);
}

/* ---- launch nested Stockfish worker ---- */

function init() {
  try {
    engineWorker = new Worker(ENGINE_URL);
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: 'Cannot create engine worker: ' + String(err)
    });
    return;
  }

  engineWorker.onmessage = function(ev) {
    var raw  = ev.data;
    var line = (typeof raw === 'string') ? raw.trim() : String(raw != null ? raw : '').trim();
    if (!line) return;

    // Forward every raw UCI line to the main thread.
    self.postMessage(line);

    // Emit structured bestmove event in addition.
    if (line.indexOf('bestmove ') === 0) forwardBestmove(line);
  };

  engineWorker.onerror = function(err) {
    var msg = (err && err.message) ? err.message : String(err);
    self.postMessage({ type: 'error', message: msg });
  };

  // Flush any commands that arrived before the worker was ready.
  for (var i = 0; i < cmdQueue.length; i++) {
    engineWorker.postMessage(cmdQueue[i]);
  }
  cmdQueue.length = 0;

  // Boot UCI session.
  engineWorker.postMessage('uci');
  engineWorker.postMessage('isready');
  engineWorker.postMessage('ucinewgame');
}

/* ---- handle messages from the main thread ---- */

self.onmessage = function(ev) {
  var msg = ev && ev.data;

  // Raw UCI string pass-through.
  if (typeof msg === 'string') { sendToEngine(msg); return; }

  if (!msg || typeof msg !== 'object') return;

  switch (msg.type) {

    case 'go': {
      var fen = (typeof msg.fen === 'string') ? msg.fen.trim() : '';
      if (!fen) {
        self.postMessage({ type: 'error', message: 'go: missing fen' });
        return;
      }
      sendToEngine('position fen ' + fen);
      if (isFinite(msg.depth) && msg.depth > 0) {
        sendToEngine('go depth ' + Math.max(1, Math.floor(msg.depth)));
      } else if (isFinite(msg.movetime) && msg.movetime > 0) {
        sendToEngine('go movetime ' + Math.max(1, Math.floor(msg.movetime)));
      } else {
        sendToEngine('go depth 12');
      }
      break;
    }

    case 'stop':
      sendToEngine('stop');
      break;

    case 'uci_cmd':
      if (typeof msg.line === 'string' && msg.line.trim()) {
        sendToEngine(msg.line.trim());
      }
      break;

    default:
      break;
  }
};

// Start the engine immediately.
init();
