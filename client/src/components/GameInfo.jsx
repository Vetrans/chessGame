import React, { useState } from 'react';
import { Copy, Check, LogOut } from 'lucide-react';

export function PlayerBadge({ color, isUser, isTurn, inCheck, connected = true }) {
  const displayColor = color.charAt(0).toUpperCase() + color.slice(1);

  return (
    <div className={`player-badge ${isTurn ? 'player-active-turn' : ''}`}>
      <div className="player-badge-left">
        <div className={`player-color-indicator ${color === 'white' ? 'white-piece-dot' : 'black-piece-dot'}`} />
        <div className="player-meta">
          <span className="player-title">
            {isUser ? 'You' : 'Opponent'}: <strong>{displayColor}</strong>
          </span>
          <span className="player-connection">
            <span className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="player-badge-right">
        {inCheck && <span className="badge badge-check">Check!</span>}
        {isTurn && (
          <span className={`badge ${isUser ? 'badge-your-turn' : 'badge-opponent-turn'}`}>
            {isUser ? 'Your turn' : "Opponent's turn"}
          </span>
        )}
      </div>
    </div>
  );
}

export function GameHeader({ roomId, onLeave }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="game-header">
      <div className="game-header-brand">
        <h1 className="game-title">Chess</h1>
      </div>

      <div className="game-header-actions">
        <button
          className="room-pill-btn"
          onClick={handleCopy}
          title="Click to copy room code"
          type="button"
        >
          <span className="room-label">Room:</span>
          <span className="room-code-text">{roomId}</span>
          {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
        </button>

        <button
          className="btn-leave"
          onClick={onLeave}
          title="Leave game"
          type="button"
        >
          <LogOut size={15} />
          <span>Leave</span>
        </button>
      </div>
    </header>
  );
}
