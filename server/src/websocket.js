import { WebSocketServer } from 'ws';
import { GameManager } from './gameManager.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  const broadcastStats = (stats) => {
    const payload = JSON.stringify({
      type: 'server_stats',
      ...stats,
    });
    wss.clients.forEach((client) => {
      if (client.readyState === 1 /* OPEN */) {
        client.send(payload);
      }
    });
  };

  const gameManager = new GameManager(broadcastStats);

  // Heartbeat interval to detect stale TCP connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        gameManager.handleDisconnect(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;

    // Send initial server stats to newly connected client
    try {
      ws.send(
        JSON.stringify({
          type: 'server_stats',
          ...gameManager.getStats(),
        })
      );
    } catch (e) {
      console.error('Error sending initial stats:', e);
    }

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (!message || typeof message.type !== 'string') {
          ws.send(JSON.stringify({ type: 'error', message: 'Malformed message format.' }));
          return;
        }

        switch (message.type) {
          case 'create_game':
            gameManager.createGame(ws);
            break;

          case 'join_game':
            gameManager.joinGame(ws, message.roomId);
            break;

          case 'join_random_game':
            gameManager.joinRandomGame(ws);
            break;

          case 'get_stats':
            ws.send(
              JSON.stringify({
                type: 'server_stats',
                ...gameManager.getStats(),
              })
            );
            break;

          case 'make_move':
            gameManager.handleMove(ws, {
              roomId: message.roomId,
              from: message.from,
              to: message.to,
              promotion: message.promotion,
              isPremove: message.isPremove,
            });
            break;

          case 'resign':
            gameManager.handleResign(ws, message.roomId);
            break;

          case 'offer_draw':
            gameManager.handleDrawOffer(ws, message.roomId);
            break;

          case 'leave_game':
            gameManager.handleLeaveGame(ws, message.roomId);
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${message.type}` }));
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON payload.' }));
      }
    });

    ws.on('close', () => {
      gameManager.handleDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      gameManager.handleDisconnect(ws);
    });
  });

  return { wss, gameManager };
}
