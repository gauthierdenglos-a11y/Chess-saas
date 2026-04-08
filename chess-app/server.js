/**
 * Serveur WebSocket simple pour synchronisation temps réel multijoueur
 * Permet à deux joueurs sur des machines différentes de créer/rejoindre des rooms
 */

import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';

const PORT = process.env.WS_PORT || 8080;

// Stockage en mémoire des rooms et clients
const rooms = new Map();
const clients = new Map();
let clientId = 0;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Chess App WebSocket Server is running');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const id = clientId++;
  clients.set(id, ws);
  
  console.log(`[Connection] Client ${id} connected (${clients.size} clients)`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(id, ws, data);
    } catch (err) {
      console.error(`[Error] Invalid JSON from client ${id}:`, err.message);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    console.log(`[Disconnection] Client ${id} disconnected (${clients.size} clients)`);
    
    // Notifier les abonnés si ce client était propriétaire d'une room
    for (const [roomId, room] of rooms.entries()) {
      if (room.subscribers.has(id)) {
        room.subscribers.delete(id);
      }
      // Supprimer la room si elle est vide et en attente
      if (room.subscribers.size === 0 && room.status === 'waiting_for_opponent') {
        rooms.delete(roomId);
        console.log(`[Room] Deleted empty room ${roomId}`);
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`[Error] WebSocket error for client ${id}:`, err.message);
  });
});

function handleMessage(clientId, ws, data) {
  const { type, payload, messageId } = data;

  switch (type) {
    case 'create_room':
      createRoom(clientId, ws, payload, messageId);
      break;
    case 'join_room':
      joinRoom(clientId, ws, payload, messageId);
      break;
    case 'update_room':
      updateRoom(clientId, ws, payload, messageId);
      break;
    case 'get_room':
      getRoom(clientId, ws, payload, messageId);
      break;
    case 'subscribe_room':
      subscribeRoom(clientId, ws, payload, messageId);
      break;
    case 'unsubscribe_room':
      unsubscribeRoom(clientId, ws, payload, messageId);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${type}`, messageId }));
  }
}

function createRoom(clientId, ws, payload, messageId) {
  const { id, playerWhite, status } = payload;
  const roomId = id.toUpperCase();

  if (rooms.has(roomId)) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room already exists',
      messageId,
    }));
    return;
  }

  const room = {
    id: roomId,
    playerWhite,
    playerBlack: null,
    status: status || 'waiting_for_opponent',
    moves: [],
    currentPlayer: 'white',
    board: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subscribers: new Set([clientId]),
    ...payload,
  };

  rooms.set(roomId, room);
  console.log(`[Room] Created room ${roomId}`);

  ws.send(JSON.stringify({
    type: 'room_created',
    roomId,
    room,
    messageId,
  }));
}

function joinRoom(clientId, ws, payload, messageId) {
  const { roomId, playerName } = payload;
  const normalizedRoomId = roomId.trim().toUpperCase();

  const room = rooms.get(normalizedRoomId);
  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found',
      messageId,
    }));
    return;
  }

  if (room.status !== 'waiting_for_opponent') {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room is not available',
      messageId,
    }));
    return;
  }

  room.playerBlack = playerName;
  room.status = 'in_progress';
  room.updatedAt = new Date().toISOString();
  room.subscribers.add(clientId);

  console.log(`[Room] Player ${playerName} joined room ${normalizedRoomId}`);

  // Notifier tous les clients abonnés à cette room
  broadcastToRoom(normalizedRoomId, {
    type: 'room_updated',
    roomId: normalizedRoomId,
    room,
  });

  ws.send(JSON.stringify({
    type: 'room_joined',
    roomId: normalizedRoomId,
    room,
    messageId,
  }));
}

function updateRoom(clientId, ws, payload, messageId) {
  const { roomId, updates } = payload;
  const normalizedRoomId = roomId.trim().toUpperCase();

  const room = rooms.get(normalizedRoomId);
  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found',
      messageId,
    }));
    return;
  }

  Object.assign(room, updates, { updatedAt: new Date().toISOString() });
  console.log(`[Room] Updated room ${normalizedRoomId}`);

  // Notifier tous les clients abonnés
  broadcastToRoom(normalizedRoomId, {
    type: 'room_updated',
    roomId: normalizedRoomId,
    room,
  });

  ws.send(JSON.stringify({
    type: 'room_updated_ack',
    roomId: normalizedRoomId,
    room,
    messageId,
  }));
}

function getRoom(clientId, ws, payload, messageId) {
  const { roomId } = payload;
  const normalizedRoomId = roomId.trim().toUpperCase();

  const room = rooms.get(normalizedRoomId);
  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found',
      messageId,
    }));
    return;
  }

  ws.send(JSON.stringify({
    type: 'room_data',
    room,
    roomId: normalizedRoomId,
    messageId,
  }));
}

function subscribeRoom(clientId, ws, payload, messageId) {
  const { roomId } = payload;
  const normalizedRoomId = roomId.trim().toUpperCase();

  const room = rooms.get(normalizedRoomId);
  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found',
      messageId,
    }));
    return;
  }

  room.subscribers.add(clientId);
  console.log(`[Room] Client ${clientId} subscribed to room ${normalizedRoomId}`);

  ws.send(JSON.stringify({
    type: 'subscribed',
    roomId: normalizedRoomId,
    messageId,
  }));
}

function unsubscribeRoom(clientId, ws, payload, messageId) {
  const { roomId } = payload;
  const normalizedRoomId = roomId.trim().toUpperCase();

  const room = rooms.get(normalizedRoomId);
  if (!room) {
    return;
  }

  room.subscribers.delete(clientId);
  console.log(`[Room] Client ${clientId} unsubscribed from room ${normalizedRoomId}`);

  if (room.subscribers.size === 0 && room.status === 'waiting_for_opponent') {
    rooms.delete(normalizedRoomId);
    console.log(`[Room] Deleted empty room ${normalizedRoomId}`);
  }

  ws.send(JSON.stringify({
    type: 'unsubscribed',
    roomId: normalizedRoomId,
    messageId,
  }));
}

function broadcastToRoom(roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return;

  const msgStr = JSON.stringify(message);
  for (const clientId of room.subscribers) {
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  }
}

// S'assurer que le serveur écoute sur tous les interfaces (0.0.0.0) pour la production
// Si port est 8080 en dev, écouter sur localhost; sinon (prod), écouter sur 0.0.0.0
const hostname = PORT === 8080 ? 'localhost' : '0.0.0.0';

server.listen(PORT, hostname, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  Chess App WebSocket Server Started          ║
║  Port: ${PORT}                                  ║
║  Hostname: ${hostname}                         ║
║  URL: ws://0.0.0.0:${PORT}                      ║
╚══════════════════════════════════════════════╝
  `);
});
