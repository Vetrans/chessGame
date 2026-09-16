import React, { useState } from 'react';
import { ChessBoard } from '../components/ChessBoard';
import { PlayerBadge, GameHeader } from '../components/GameInfo';
import { MoveHistory } from '../components/MoveHistory';
import { Trophy, AlertTriangle, Home, RefreshCw } from 'lucide-react';

export function Game({
  roomId,
  playerColor,
  gameState,
  onMove,
  onLeave,
  error,
  notification,
  onClearError,
}) {
  const opponentColor = playerColor === 'white' ? 'black' : 'white';

  const isMyTurn = gameState && gameState.turn === playerColor && !gameState.isGameOver;
  const isOpponentTurn = gameState && gameState.turn === opponentColor && !gameState.isGameOver;

  const isUserInCheck = gameState?.inCheck && gameState.turn === playerColor;
  const isOpponentInCheck = gameState?.inCheck && gameState.turn === opponentColor;

  const isGameOver = gameState?.isGameOver;
  const gameOverData = gameState?.gameOver;
  const isAbandoned = gameState?.status === 'abandoned' || Boolean(notification);

  return (
    <div className="game-view-container">
      <GameHeader roomId={roomId} onLeave={onLeave} />

      {error && (
        <div className="alert-box alert-error game-alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button className="alert-close" onClick={onClearError} type="button">
            &times;
          </button>
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
          {/* Opponent player card (Top) */}
          <PlayerBadge
            color={opponentColor}
            isUser={false}
            isTurn={isOpponentTurn}
            inCheck={isOpponentInCheck}
            connected={!isAbandoned}
          />

          {/* 8x8 Chess Board */}
          <ChessBoard
            gameState={gameState}
            playerColor={playerColor}
            onMove={onMove}
            disabled={!isMyTurn || isGameOver || isAbandoned}
          />

          {/* User player card (Bottom) */}
          <PlayerBadge
            color={playerColor}
            isUser={true}
            isTurn={isMyTurn}
            inCheck={isUserInCheck}
            connected={true}
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
                : gameOverData?.result === 'checkmate'
                ? gameOverData.winner === playerColor
                  ? 'Victory!'
                  : 'Defeat'
                : 'Game Draw'}
            </h3>

            <p className="game-over-description">
              {isAbandoned
                ? notification || 'Opponent disconnected from the game.'
                : gameOverData?.result === 'checkmate'
                ? `Checkmate — ${gameOverData.winner.toUpperCase()} wins the game!`
                : gameOverData?.result === 'stalemate'
                ? 'Stalemate — No legal moves available.'
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
