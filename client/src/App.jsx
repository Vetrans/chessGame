import React from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Home } from './pages/Home';
import { WaitingRoom } from './components/WaitingRoom';
import { Game } from './pages/Game';

export function App() {
  const {
    connected,
    roomId,
    playerColor,
    gameState,
    isWaiting,
    error,
    notification,
    createGame,
    joinGame,
    makeMove,
    leaveGame,
    resetToHome,
    clearError,
  } = useWebSocket();

  // If inside an active game session
  if (gameState) {
    return (
      <Game
        roomId={roomId}
        playerColor={playerColor}
        gameState={gameState}
        onMove={makeMove}
        onLeave={leaveGame}
        error={error}
        notification={notification}
        onClearError={clearError}
      />
    );
  }

  // If creator is waiting for opponent to join
  if (isWaiting && roomId) {
    return (
      <WaitingRoom
        roomId={roomId}
        onCancel={resetToHome}
      />
    );
  }

  // Default: Landing / Home page
  return (
    <Home
      onCreateGame={createGame}
      onJoinGame={joinGame}
      error={error}
      onClearError={clearError}
      connected={connected}
    />
  );
}

export default App;
