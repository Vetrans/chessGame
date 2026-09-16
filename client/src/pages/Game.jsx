import React, { useState } from 'react';
import { ChessBoard } from '../components/ChessBoard';
import { PlayerBadge, GameControls } from '../components/GameInfo';
import { MoveHistory } from '../components/MoveHistory';
import { Trophy, AlertTriangle, Home } from 'lucide-react';
import { sound } from '../utils/sound';

export function Game({
  roomId,
  playerColor,
  gameState,
  onMove,
  onLeave,
  onResign,
  onOfferDraw,
  drawOfferedToMe,
  error,
  notification,
  onClearError,
}) {
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [soundMuted, setSoundMuted] = useState(sound.isMuted());

  const opponentColor = playerColor === 'white' ? 'black' : 'white';

  const isMyTurn = gameState && gameState.turn === playerColor && !gameState.isGameOver;
  const isOpponentTurn = gameState && gameState.turn === opponentColor && !gameState.isGameOver;

  const isUserInCheck = gameState?.inCheck && gameState.turn === playerColor;
  const isOpponentInCheck = gameState?.inCheck && gameState.turn === opponentColor;

  const isGameOver = gameState?.isGameOver;
  const gameOverData = gameState?.gameOver;
  const isAbandoned = gameState?.status === 'abandoned' || Boolean(notification);

  const handleFlipBoard = () => {
    setBoardFlipped((prev) => !prev);
  };

  const handleToggleSound = () => {
    const nextMuted = sound.toggleMute();
    setSoundMuted(nextMuted);
  };

  return (
    <div className="game-view-container">
      {/* Top control bar: Flip board, sound, draw, resign (No room code) */}
      <GameControls
        onFlipBoard={handleFlipBoard}
        onToggleSound={handleToggleSound}
        soundMuted={soundMuted}
        onOfferDraw={onOfferDraw}
        drawOfferedToMe={drawOfferedToMe}
        onResign={onResign}
        isGameOver={isGameOver || isAbandoned}
      />

      {error && (
        <div className="alert-box alert-error game-alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button className="alert-close" onClick={onClearError} type="button">
            &times;
          </button>
        </div>
      )}

      {drawOfferedToMe && !isGameOver && (
        <div className="alert-box alert-warning game-alert">
          <AlertTriangle size={18} />
          <span>Opponent offered a draw. Click &quot;Accept Draw&quot; above to agree.</span>
        </div>
      )}

      {notification && (
        <div className="alert-box alert-warning game-alert">
          <AlertTriangle size={18} />
          <span>{notification}</span>
        </div>
      )}

      <div className="game-layout">
        {/* Main Chess Arena */}
        <div className="chess-arena">
          {/* Opponent player card & 10m digital clock (Top) */}
          <PlayerBadge
            color={opponentColor}
            isUser={false}
            isTurn={isOpponentTurn}
            inCheck={isOpponentInCheck}
            clockTimeMs={gameState?.clocks?.[opponentColor]}
            isGameOver={isGameOver || isAbandoned}
            lastTurnTimestamp={gameState?.lastTurnTimestamp}
          />

          {/* 8x8 Chess Board with Premoves & High-Fidelity Styling */}
          <ChessBoard
            gameState={gameState}
            playerColor={playerColor}
            onMove={onMove}
            disabled={isGameOver || isAbandoned}
            isFlippedManual={boardFlipped}
          />

          {/* User player card & 10m digital clock (Bottom) */}
          <PlayerBadge
            color={playerColor}
            isUser={true}
            isTurn={isMyTurn}
            inCheck={isUserInCheck}
            clockTimeMs={gameState?.clocks?.[playerColor]}
            isGameOver={isGameOver || isAbandoned}
            lastTurnTimestamp={gameState?.lastTurnTimestamp}
          />
        </div>

        {/* Sidebar / Move History */}
        <div className="game-sidebar">
          <MoveHistory history={gameState?.history || []} />
        </div>
      </div>

      {/* Game Over / Abandoned Modal */}
      {(isGameOver || isAbandoned) && (
        <div className="modal-backdrop">
          <div className="game-over-modal">
            <div className="game-over-icon">
              {isAbandoned ? (
                <AlertTriangle size={40} className="icon-warning" />
              ) : gameOverData?.winner === playerColor ? (
                <Trophy size={40} className="icon-trophy" />
              ) : gameOverData?.winner ? (
                <div className="icon-loss">✕</div>
              ) : (
                <div className="icon-draw">½</div>
              )}
            </div>

            <h3 className="game-over-title">
              {isAbandoned
                ? 'Game Ended'
                : gameOverData?.winner === playerColor
                ? 'Victory!'
                : gameOverData?.winner
                ? 'Defeat'
                : 'Draw'}
            </h3>

            <p className="game-over-description">
              {isAbandoned
                ? notification || 'Opponent disconnected from the game.'
                : gameOverData?.result === 'timeout'
                ? `Time out — ${gameOverData.winner.toUpperCase()} won on time!`
                : gameOverData?.result === 'resignation'
                ? `${gameOverData.winner.toUpperCase()} won by resignation.`
                : gameOverData?.result === 'checkmate'
                ? `Checkmate — ${gameOverData.winner.toUpperCase()} wins the game!`
                : gameOverData?.result === 'stalemate'
                ? 'Stalemate — No legal moves available.'
                : gameOverData?.result === 'draw_agreement'
                ? 'Draw agreed by both players.'
                : gameOverData?.result === 'threefold_repetition'
                ? 'Draw by Threefold Repetition.'
                : gameOverData?.result === 'insufficient_material'
                ? 'Draw by Insufficient Material.'
                : 'Game ended in a draw.'}
            </p>

            <div className="game-over-actions">
              <button className="btn-primary" onClick={onLeave} type="button">
                <Home size={18} />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
