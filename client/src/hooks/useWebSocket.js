import { useState, useEffect, useCallback } from 'react';
import { wsService } from '../services/websocket';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({ waiting: 0, playing: 0 });

  useEffect(() => {
    wsService.connect();
    const unsubStatus = wsService.onStatusChange((status) => {
      setConnected(status);
    });

    const unsubMsg = wsService.subscribe((msg) => {
      switch (msg.type) {
        case 'server_stats':
          setStats({
            waiting: msg.waiting || 0,
            playing: msg.playing || 0,
          });
          break;

        case 'game_created':
          setRoomId(msg.roomId);
          setPlayerColor('white');
          setIsWaiting(true);
          setError(null);
          setNotification(null);
          break;

        case 'game_started':
          setRoomId(msg.roomId);
          setPlayerColor(msg.color);
          setIsWaiting(false);
          setGameState(msg.state);
          setError(null);
          setNotification(null);
          break;

        case 'game_state':
          setGameState((prev) => ({
            ...prev,
            ...msg,
          }));
          break;

        case 'game_over':
          setGameState((prev) => ({
            ...prev,
            isGameOver: true,
            gameOver: {
              result: msg.result,
              winner: msg.winner,
            },
          }));
          break;

        case 'opponent_disconnected':
          setNotification(msg.message || 'Opponent disconnected. The game has ended.');
          setGameState((prev) => (prev ? { ...prev, status: 'abandoned' } : null));
          break;

        case 'error':
          setError(msg.message);
          break;

        default:
          break;
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, []);

  const createGame = useCallback(() => {
    setError(null);
    setNotification(null);
    wsService.send({ type: 'create_game' });
  }, []);

  const joinRandomGame = useCallback(() => {
    setError(null);
    setNotification(null);
    wsService.send({ type: 'join_random_game' });
  }, []);

  const joinGame = useCallback((code) => {
    if (!code || !code.trim()) {
      setError('Please enter a valid room code.');
      return;
    }
    setError(null);
    setNotification(null);
    wsService.send({
      type: 'join_game',
      roomId: code.trim().toUpperCase(),
    });
  }, []);

  const makeMove = useCallback(
    (from, to, promotion = 'q') => {
      if (!roomId) return;
      setError(null);
      wsService.send({
        type: 'make_move',
        roomId,
        from,
        to,
        promotion,
      });
    },
    [roomId]
  );

  const leaveGame = useCallback(() => {
    if (roomId) {
      wsService.send({
        type: 'leave_game',
        roomId,
      });
    }
    setRoomId(null);
    setPlayerColor(null);
    setGameState(null);
    setIsWaiting(false);
    setError(null);
    setNotification(null);
  }, [roomId]);

  const resetToHome = useCallback(() => {
    setRoomId(null);
    setPlayerColor(null);
    setGameState(null);
    setIsWaiting(false);
    setError(null);
    setNotification(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    connected,
    roomId,
    playerColor,
    gameState,
    isWaiting,
    error,
    notification,
    stats,
    createGame,
    joinGame,
    joinRandomGame,
    makeMove,
    leaveGame,
    resetToHome,
    clearError,
  };
}
