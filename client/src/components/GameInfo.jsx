import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Flag,
  Handshake,
  AlertTriangle,
} from 'lucide-react';

function formatTime(milliseconds) {
  const totalMs = Math.max(0, milliseconds || 0);
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  // If under 10 seconds, show decimal tenths
  if (totalSeconds < 10 && totalSeconds > 0) {
    const tenths = Math.floor((totalMs % 1000) / 100);
    return `${mm}:${ss}.${tenths}`;
  }

  return `${mm}:${ss}`;
}

export function ChessClock({
  color,
  initialTimeMs,
  isTurn,
  isGameOver,
  lastTurnTimestamp,
}) {
  const [remainingMs, setRemainingMs] = useState(initialTimeMs || 600000);

  useEffect(() => {
    setRemainingMs(initialTimeMs || 600000);
  }, [initialTimeMs]);

  useEffect(() => {
    if (!isTurn || isGameOver || !lastTurnTimestamp) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastTurnTimestamp;
      const current = Math.max(0, (initialTimeMs || 600000) - elapsed);
      setRemainingMs(current);
    }, 100);

    return () => clearInterval(interval);
  }, [isTurn, isGameOver, initialTimeMs, lastTurnTimestamp]);

  const isLowTime = remainingMs < 30000;
  const isCritical = remainingMs < 10000;

  return (
    <div
      className={`chess-clock ${isTurn ? 'clock-active' : ''} ${
        isCritical ? 'clock-critical' : isLowTime ? 'clock-low' : ''
      }`}
    >
      <span className="clock-digits">{formatTime(remainingMs)}</span>
    </div>
  );
}

export function PlayerBadge({
  color,
  isUser,
  isTurn,
  inCheck,
  clockTimeMs,
  isGameOver,
  lastTurnTimestamp,
}) {
  const displayColor = color.charAt(0).toUpperCase() + color.slice(1);

  return (
    <div className={`player-badge ${isTurn ? 'player-active-turn' : ''}`}>
      <div className="player-badge-left">
        <div
          className={`player-color-indicator ${
            color === 'white' ? 'white-piece-dot' : 'black-piece-dot'
          }`}
        />
        <div className="player-meta">
          <span className="player-title">
            {isUser ? 'You' : 'Opponent'}: <strong>{displayColor}</strong>
          </span>
        </div>
      </div>

      <div className="player-badge-right">
        {inCheck && <span className="badge badge-check">Check!</span>}
        {isTurn && !isGameOver && (
          <span className={`badge ${isUser ? 'badge-your-turn' : 'badge-opponent-turn'}`}>
            {isUser ? 'Your turn' : "Thinking..."}
          </span>
        )}

        {/* Digital Chess Clock */}
        <ChessClock
          color={color}
          initialTimeMs={clockTimeMs}
          isTurn={isTurn}
          isGameOver={isGameOver}
          lastTurnTimestamp={lastTurnTimestamp}
        />
      </div>
    </div>
  );
}

export function GameControls({
  onFlipBoard,
  onToggleSound,
  soundMuted,
  onOfferDraw,
  drawOfferedToMe,
  onResign,
  isGameOver,
}) {
  const [showResignModal, setShowResignModal] = useState(false);

  return (
    <>
      <header className="game-header-controls">
        <div className="game-brand">
          <h2 className="game-title">Chess</h2>
        </div>

        <div className="game-action-toolbar">
          {/* Flip board */}
          <button
            className="btn-toolbar"
            onClick={onFlipBoard}
            type="button"
            title="Flip Board Perspective"
          >
            <RotateCcw size={16} />
            <span className="btn-toolbar-text">Flip</span>
          </button>

          {/* Sound toggle */}
          <button
            className={`btn-toolbar ${soundMuted ? 'toolbar-active' : ''}`}
            onClick={onToggleSound}
            type="button"
            title={soundMuted ? 'Unmute Board Audio' : 'Mute Board Audio'}
          >
            {soundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span className="btn-toolbar-text">{soundMuted ? 'Muted' : 'Sound'}</span>
          </button>

          {/* Draw offer / accept */}
          <button
            className={`btn-toolbar ${drawOfferedToMe ? 'toolbar-draw-highlight' : ''}`}
            onClick={onOfferDraw}
            disabled={isGameOver}
            type="button"
            title={drawOfferedToMe ? 'Click to accept draw offer' : 'Offer a draw to opponent'}
          >
            <Handshake size={16} />
            <span className="btn-toolbar-text">
              {drawOfferedToMe ? 'Accept Draw' : 'Draw'}
            </span>
          </button>

          {/* Resign */}
          <button
            className="btn-toolbar btn-toolbar-resign"
            onClick={() => setShowResignModal(true)}
            disabled={isGameOver}
            type="button"
            title="Resign the game"
          >
            <Flag size={16} />
            <span className="btn-toolbar-text">Resign</span>
          </button>
        </div>
      </header>

      {/* Resign confirmation popup */}
      {showResignModal && (
        <div className="modal-backdrop">
          <div className="confirm-card">
            <AlertTriangle size={36} className="confirm-icon" />
            <h3 className="confirm-title">Resign Game?</h3>
            <p className="confirm-text">
              Are you sure you want to resign? Your opponent will be awarded the win.
            </p>
            <div className="confirm-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowResignModal(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  setShowResignModal(false);
                  onResign();
                }}
                type="button"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
