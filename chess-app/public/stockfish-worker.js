'use strict';

/**
 * stockfish-worker.js - UCI Bridge Worker
 *
 * Loads stockfish-18-lite-single.js via importScripts() into this Worker
 * context. Stockfish detects it is running as a Worker (window is undefined)
 * and locates the WASM file relative to self.location (same folder).
 * We intercept output by overriding postMessage before the script runs,
 * and forward UCI lines + structured bestmove events to the main thread.
 *
 * API - messages accepted FROM the main thread (raw UCI strings):
 *   string  — any UCI command (uci, isready, position, go movetime N, stop…)
 *
 * API - messages posted TO the main thread:
 *   string                               — raw UCI output line
 *   { type: "bestmove", uci, ponder? }   — structured bestmove
 *   { type: "error", message }           — fatal error
 */

/* ---- forward raw UCI lines + structured bestmove to main thread ---- */

var _nativePostMessage = self.postMessage.bind(self);

function forwardLine(line) {
  _nativePostMessage(line);
  if (line.indexOf('bestmove ') === 0) {
    var parts = line.split(/\s+/);
    var uci   = parts[1];
    if (!uci || uci === '(none)' || uci === '0000') return;
    var out = { type: 'bestmove', uci: uci };
    for (var i = 2; i + 1 < parts.length; i++) {
      if (parts[i] === 'ponder') { out.ponder = parts[i + 1]; break; }
    }
    _nativePostMessage(out);
  }
}

/* ---- redirect Stockfish output before loading the script ---- */

// Stockfish calls self.postMessage(line) for every UCI output line.
// We intercept that here so our forwardLine logic runs instead.
self.postMessage = function(data) {
  var line = (typeof data === 'string') ? data.trim() : '';
  if (line) forwardLine(line);
};

/* ---- load Stockfish into this Worker context ---- */

try {
  // importScripts resolves the URL relative to this worker's own location,
  // so stockfish-18-lite-single.wasm is fetched from the same directory.
  importScripts('stockfish-18-lite-single.js');
} catch (err) {
  _nativePostMessage({ type: 'error', message: 'importScripts failed: ' + String(err) });
}

/*
 * After importScripts the Stockfish glue code runs synchronously, sets up
 * its internal onmessage handler, and handles UCI commands directly.
 * The main thread can now postMessage UCI strings (uci, isready, go…)
 * and receive UCI output lines back.
 */
