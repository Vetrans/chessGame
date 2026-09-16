import React, { useState } from 'react';
import { ChessBoard } from '../components/ChessBoard';
import { PlayerBadge, GameHeader } from '../components/GameInfo';
import { MoveHistory } from '../components/MoveHistory';
import { Trophy, AlertTriangle, Home, RotateCcw, Swords } from 'lucide-react';
import { getCapturedPieces } from '../utils/chessUtils';

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
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);

  const opponentColor = playerColor === 'white' ? 'black' : 'white';

  const isMyTurn = gameState && gameState.turn === playerColor && !gameState.isGameOver;
  const isOpponentTurn = gameState && gameState.turn === opponentColor && !gameState.isGameOver;

  const isUserInCheck = gameState?.inCheck && gameState.turn === playerColor;
  const isOpponentInCheck = gameState?.inCheck && gameState.turn === opponentColor;

  const isGameOver = gameState?.isGameOver;
  const gameOverData = gameState?.gameOver;
  const isAbandoned = gameState?.status === 'abandoned' || Boolean(notification);

  // Compute captured pieces and material differences
  const { whiteCaptured, blackCaptured, whiteAdvantage, blackAdvantage } = getCapturedPieces(
    gameState?.fen
  );

  const userCaptured = playerColor === 'white' ? whiteCaptured : blackCaptured;
  const opponentCaptured = opponentColor === 'white' ? whiteCaptured : blackCaptured;

  const userAdvantage = playerColor === 'white' ? whiteAdvantage : blackAdvantage;
  const opponentAdvantage = opponentColor === 'white' ? whiteAdvantage : blackAdvantage;

  // Board orientation (default to player color, can be manually flipped)
  const currentOrientation = boardFlipped ? opponentColor : playerColor;

  const handleFlipBoard = () => {
    setBoardFlipped((prev) => !prev);
  };

  const handleRequestResign = () => {
    if (isGameOver || isAbandoned) {
      onLeave();
    } else {
      setShowResignModal(true);
    }
  };

  const handleConfirmResign = () => {
    setShowResignModal(false);
    onLeave();
  };

  return (
    <div className="game-view-container">
      <GameHeader
        roomId={roomId}
        onLeave={handleRequestResign}
        onFlipBoard={handleFlipBoard}
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
            capturedPieces={opponentCaptured}
            advantage={opponentAdvantage}
          />

          {/* 8x8 Chess Board */}
          <ChessBoard
            gameState={gameState}
            playerColor={playerColor}
            orientation={currentOrientation}
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
            capturedPieces={userCaptured}
            advantage={userAdvantage}
          />
        </div>

        {/* Sidebar / Move History */}
        <div className="game-sidebar">
          <MoveHistory history={gameState?.history || []} />
        </div>
      </div>

      {/* Resign confirmation dialog */}
      {showResignModal && (
        <div className="modal-backdrop">
          <div className="confirm-modal">
            <h3 className="confirm-title">Resign Match?</h3>
            <p className="confirm-description">
              Leaving an active game will forfeit the match to your opponent.
            </p>
            <div className="confirm-actions">
              <button
                className="btn-danger"
                onClick={handleConfirmResign}
                type="button"
              >
                Confirm Resign
              </button>
              <button
                className="btn-ghost"
                onClick={() => setShowResignModal(false)}
                type="button"
              >
                Continue Playing
              </button>
            </div>
          </div>
        </div>
      )}

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
                ? 'Match Ended'
                : gameOverData?.result === 'checkmate'
                ? gameOverData.winner === playerColor
                  ? 'Victory!'
                  : 'Defeat'
                : 'Draw'}
            </h3>

            <p className="game-over-description">
              {isAbandoned
                ? notification || 'Opponent disconnected from the match.'
                : gameOverData?.result === 'checkmate'
                ? `Checkmate: ${gameOverData.winner.toUpperCase()} wins the game!`
                : gameOverData?.result === 'stalemate'
                ? 'Stalemate: No legal moves available.'
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
