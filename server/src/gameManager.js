import { ChessGame } from './game.js';

// Clean character set without ambiguous characters (0, O, 1, I)
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRoomId() {
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return id;
}

export class GameManager {
  constructor(onStatsChange = null) {
    this.games = new Map(); // roomId -> ChessGame
    this.socketToRoom = new Map(); // ws -> roomId
    this.onStatsChange = onStatsChange;

    // Periodic sweep for stale games (older than 2 hours)
    setInterval(() => {
      const now = Date.now();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      let cleaned = false;
      for (const [roomId, game] of this.games.entries()) {
        if (now - game.createdAt > TWO_HOURS) {
          this.removeGame(roomId);
          cleaned = true;
        }
      }
      if (cleaned) {
        this.triggerStatsChange();
      }
    }, 15 * 60 * 1000);
  }

  getStats() {
    let waiting = 0;
    let playing = 0;
    for (const game of this.games.values()) {
      if (game.status === 'waiting') {
        waiting += 1;
      } else if (game.status === 'playing') {
        playing += 2;
      }
    }
    return { waiting, playing };
  }

  triggerStatsChange() {
    if (typeof this.onStatsChange === 'function') {
      try {
        this.onStatsChange(this.getStats());
      } catch (err) {
        console.error('Error triggering stats change:', err);
      }
    }
  }

  createGame(ws) {
    // If socket was in another game, clean up previous game
    this.handleDisconnect(ws);

    let roomId = generateRoomId();
    while (this.games.has(roomId)) {
      roomId = generateRoomId();
    }

    const game = new ChessGame(roomId, ws);
    this.games.set(roomId, game);
    this.socketToRoom.set(ws, roomId);

    ws.send(
      JSON.stringify({
        type: 'game_created',
        roomId,
        color: 'white',
      })
    );

    this.triggerStatsChange();
    return roomId;
  }

  joinRandomGame(ws) {
    // Find first available waiting game where the creator is not this socket
    let candidate = null;
    for (const game of this.games.values()) {
      if (game.status === 'waiting' && game.players.white?.ws !== ws) {
        candidate = game;
        break;
      }
    }

    if (candidate) {
      this.joinGame(ws, candidate.roomId);
    } else {
      this.createGame(ws);
    }
  }

  joinGame(ws, rawRoomId) {
    if (!rawRoomId || typeof rawRoomId !== 'string') {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid room code.' }));
      return;
    }

    const roomId = rawRoomId.trim().toUpperCase();
    const game = this.games.get(roomId);

    if (!game) {
      ws.send(JSON.stringify({ type: 'error', message: 'Game room not found.' }));
      return;
    }

    if (game.status !== 'waiting') {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: game.status === 'playing' ? 'Room is already full.' : 'Game has already ended.',
        })
      );
      return;
    }

    // Check if same socket tries to join their own game
    if (game.players.white?.ws === ws) {
      ws.send(JSON.stringify({ type: 'error', message: 'You have already joined this room as White.' }));
      return;
    }

    // Clean up any previous room this socket was in
    this.socketToRoom.delete(ws);

    const joinResult = game.addOpponent(ws);
    if (!joinResult.success) {
      ws.send(JSON.stringify({ type: 'error', message: joinResult.error }));
      return;
    }

    this.socketToRoom.set(ws, roomId);

    const state = game.getState();

    // Notify White player
    game.sendTo('white', {
      type: 'game_started',
      roomId,
      color: 'white',
      state,
    });

    // Notify Black player
    game.sendTo('black', {
      type: 'game_started',
      roomId,
      color: 'black',
      state,
    });

    this.triggerStatsChange();
  }

  handleMove(ws, { roomId, from, to, promotion }) {
    const game = this.getGameForSocket(ws, roomId);
    if (!game) {
      ws.send(JSON.stringify({ type: 'error', message: 'Game not found.' }));
      return;
    }

    const moveResult = game.makeMove(ws, from, to, promotion);
    if (!moveResult.success) {
      ws.send(JSON.stringify({ type: 'error', message: moveResult.error }));
      return;
    }

    // Authoritative state broadcast to all participants
    const currentState = game.getState();
    game.broadcast({
      type: 'game_state',
      ...currentState,
    });

    if (currentState.isGameOver && currentState.gameOver) {
      game.broadcast({
        type: 'game_over',
        result: currentState.gameOver.result,
        winner: currentState.gameOver.winner,
      });
      this.triggerStatsChange();
    }
  }

  handleLeaveGame(ws, roomId) {
    const game = this.getGameForSocket(ws, roomId);
    if (!game) return;

    const leavingColor = game.getPlayerColor(ws);
    const opponentColor = leavingColor === 'white' ? 'black' : 'white';

    game.sendTo(opponentColor, {
      type: 'opponent_disconnected',
      message: 'Opponent left the game. The game has ended.',
    });

    this.removeGame(game.roomId);
  }

  handleDisconnect(ws) {
    const roomId = this.socketToRoom.get(ws);
    if (!roomId) return;

    this.socketToRoom.delete(ws);
    const game = this.games.get(roomId);
    if (!game) return;

    const disconnectedColor = game.getPlayerColor(ws);
    const opponentColor = disconnectedColor === 'white' ? 'black' : 'white';

    // Notify remaining opponent if still open
    game.sendTo(opponentColor, {
      type: 'opponent_disconnected',
      message: 'Opponent disconnected. The game has ended.',
    });

    this.removeGame(roomId);
  }

  getGameForSocket(ws, requestedRoomId) {
    const roomId = requestedRoomId || this.socketToRoom.get(ws);
    if (!roomId) return null;
    const game = this.games.get(roomId);
    if (!game || !game.hasPlayer(ws)) return null;
    return game;
  }

  removeGame(roomId) {
    const game = this.games.get(roomId);
    if (game) {
      if (game.players.white?.ws) this.socketToRoom.delete(game.players.white.ws);
      if (game.players.black?.ws) this.socketToRoom.delete(game.players.black.ws);
      this.games.delete(roomId);
      this.triggerStatsChange();
    }
  }
}
