import { WebSocketServer } from 'ws';
import { GameManager } from './gameManager.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });
  const gameManager = new GameManager();

  // Heartbeat interval to detect stale/dead TCP connections
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

          case 'make_move':
            gameManager.handleMove(ws, {
              roomId: message.roomId,
              from: message.from,
              to: message.to,
              promotion: message.promotion,
            });
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
