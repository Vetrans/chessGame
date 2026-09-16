import { Chess } from 'chess.js';

const TEN_MINUTES_MS = 10 * 60 * 1000;

export class ChessGame {
  constructor(roomId, creatorWs) {
    this.roomId = roomId;
    this.chess = new Chess();
    this.status = 'waiting'; // 'waiting' | 'playing' | 'game_over' | 'abandoned'
    this.createdAt = Date.now();
    this.lastMove = null;

    this.players = {
      white: { ws: creatorWs, connected: true },
      black: { ws: null, connected: false },
    };

    // 10-minute game clocks for White and Black
    this.clocks = {
      white: TEN_MINUTES_MS,
      black: TEN_MINUTES_MS,
    };
    this.lastTurnTimestamp = null;
    this.clockInterval = null;
    this.drawOfferedBy = null;
  }

  hasPlayer(ws) {
    return this.players.white?.ws === ws || this.players.black?.ws === ws;
  }

  getPlayerColor(ws) {
    if (this.players.white?.ws === ws) return 'white';
    if (this.players.black?.ws === ws) return 'black';
    return null;
  }

  startClock() {
    this.stopClock();
    this.lastTurnTimestamp = Date.now();

    this.clockInterval = setInterval(() => {
      if (this.status !== 'playing') {
        this.stopClock();
        return;
      }

      const activeColor = this.chess.turn() === 'w' ? 'white' : 'black';
      const now = Date.now();
      const elapsed = now - (this.lastTurnTimestamp || now);
      const remaining = this.clocks[activeColor] - elapsed;

      if (remaining <= 0) {
        this.clocks[activeColor] = 0;
        this.status = 'game_over';
        this.stopClock();

        const winner = activeColor === 'white' ? 'black' : 'white';
        this.broadcast({
          type: 'game_over',
          result: 'timeout',
          winner,
        });

        this.broadcast({
          type: 'game_state',
          ...this.getState(),
        });
      }
    }, 500);
  }

  stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  addOpponent(ws) {
    if (this.players.black.ws !== null) {
      return { success: false, error: 'Room is already full.' };
    }
    this.players.black = { ws, connected: true };
    this.status = 'playing';
    this.startClock();
    return { success: true };
  }

  makeMove(ws, from, to, promotion = 'q', isPremove = false) {
    if (this.status !== 'playing') {
      return { success: false, error: 'Game is not in playing state.' };
    }

    const playerColor = this.getPlayerColor(ws);
    if (!playerColor) {
      return { success: false, error: 'You are not a participant in this game.' };
    }

    const currentTurn = this.chess.turn() === 'w' ? 'white' : 'black';
    if (playerColor !== currentTurn) {
      return { success: false, error: 'It is not your turn.' };
    }

    // Input validation
    if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
      return { success: false, error: 'Invalid move coordinates.' };
    }

    const cleanFrom = from.trim().toLowerCase();
    const cleanTo = to.trim().toLowerCase();
    if (!/^[a-h][1-8]$/.test(cleanFrom) || !/^[a-h][1-8]$/.test(cleanTo)) {
      return { success: false, error: 'Move squares must be valid algebraic coordinates.' };
    }

    const cleanPromo = promotion ? String(promotion).trim().toLowerCase() : 'q';
    if (!['q', 'r', 'b', 'n'].includes(cleanPromo)) {
      return { success: false, error: 'Promotion piece must be q, r, b, or n.' };
    }

    try {
      // Deduct time: if premove, exactly 0.01 sec (10ms) is deducted; otherwise calculate elapsed
      const now = Date.now();
      const elapsed = isPremove
        ? 10 // 0.01s for premove
        : Math.max(10, now - (this.lastTurnTimestamp || now));

      this.clocks[playerColor] = Math.max(0, this.clocks[playerColor] - elapsed);
      this.lastTurnTimestamp = now;

      // Reset any active draw offer on move
      this.drawOfferedBy = null;

      // Validate and apply move
      const moveResult = this.chess.move({
        from: cleanFrom,
        to: cleanTo,
        promotion: cleanPromo,
      });

      if (!moveResult) {
        return { success: false, error: 'Illegal move.' };
      }

      this.lastMove = {
        from: moveResult.from,
        to: moveResult.to,
        piece: moveResult.piece,
        san: moveResult.san,
      };

      let gameOverData = null;
      if (this.chess.isGameOver()) {
        this.status = 'game_over';
        this.stopClock();

        if (this.chess.isCheckmate()) {
          gameOverData = {
            result: 'checkmate',
            winner: playerColor,
          };
        } else if (this.chess.isStalemate()) {
          gameOverData = {
            result: 'stalemate',
            winner: null,
          };
        } else if (this.chess.isThreefoldRepetition()) {
          gameOverData = {
            result: 'threefold_repetition',
            winner: null,
          };
        } else if (this.chess.isInsufficientMaterial()) {
          gameOverData = {
            result: 'insufficient_material',
            winner: null,
          };
        } else {
          gameOverData = {
            result: 'draw',
            winner: null,
          };
        }
      }

      return {
        success: true,
        move: moveResult,
        gameOver: gameOverData,
      };
    } catch (err) {
      return { success: false, error: err.message || 'Illegal move.' };
    }
  }

  handleResign(ws) {
    if (this.status !== 'playing') return null;
    const playerColor = this.getPlayerColor(ws);
    if (!playerColor) return null;

    this.status = 'game_over';
    this.stopClock();

    const winner = playerColor === 'white' ? 'black' : 'white';
    const gameOverData = {
      result: 'resignation',
      winner,
    };

    this.broadcast({
      type: 'game_over',
      ...gameOverData,
    });

    return gameOverData;
  }

  handleDrawOffer(ws) {
    if (this.status !== 'playing') return null;
    const playerColor = this.getPlayerColor(ws);
    if (!playerColor) return null;

    const opponentColor = playerColor === 'white' ? 'black' : 'white';

    // If opponent already offered draw, this is an agreement
    if (this.drawOfferedBy === opponentColor) {
      this.status = 'game_over';
      this.stopClock();
      const gameOverData = {
        result: 'draw_agreement',
        winner: null,
      };

      this.broadcast({
        type: 'game_over',
        ...gameOverData,
      });

      return { agreed: true, gameOver: gameOverData };
    }

    // Otherwise record offer and notify opponent
    this.drawOfferedBy = playerColor;
    this.sendTo(opponentColor, {
      type: 'draw_offered',
      from: playerColor,
    });

    return { agreed: false };
  }

  getState() {
    let gameOver = null;
    if (this.chess.isGameOver()) {
      if (this.chess.isCheckmate()) {
        const winner = this.chess.turn() === 'w' ? 'black' : 'white';
        gameOver = { result: 'checkmate', winner };
      } else if (this.chess.isStalemate()) {
        gameOver = { result: 'stalemate', winner: null };
      } else if (this.chess.isThreefoldRepetition()) {
        gameOver = { result: 'threefold_repetition', winner: null };
      } else if (this.chess.isInsufficientMaterial()) {
        gameOver = { result: 'insufficient_material', winner: null };
      } else {
        gameOver = { result: 'draw', winner: null };
      }
    }

    // Calculate current live clocks
    const currentClocks = { ...this.clocks };
    if (this.status === 'playing' && this.lastTurnTimestamp) {
      const activeColor = this.chess.turn() === 'w' ? 'white' : 'black';
      const elapsed = Date.now() - this.lastTurnTimestamp;
      currentClocks[activeColor] = Math.max(0, currentClocks[activeColor] - elapsed);
    }

    return {
      roomId: this.roomId,
      status: this.status,
      fen: this.chess.fen(),
      turn: this.chess.turn() === 'w' ? 'white' : 'black',
      inCheck: this.chess.inCheck(),
      isGameOver: this.status === 'game_over' || this.chess.isGameOver(),
      gameOver,
      lastMove: this.lastMove,
      history: this.chess.history(),
      clocks: currentClocks,
      lastTurnTimestamp: this.lastTurnTimestamp,
      drawOfferedBy: this.drawOfferedBy,
    };
  }

  broadcast(message) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    for (const color of ['white', 'black']) {
      const player = this.players[color];
      if (player?.ws && player.ws.readyState === 1 /* OPEN */) {
        player.ws.send(payload);
      }
    }
  }

  sendTo(color, message) {
    const player = this.players[color];
    if (player?.ws && player.ws.readyState === 1 /* OPEN */) {
      player.ws.send(typeof message === 'string' ? message : JSON.stringify(message));
    }
  }

  destroy() {
    this.stopClock();
  }
}
