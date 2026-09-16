import React, { useState } from 'react';
import { Copy, Check, LogOut, Volume2, VolumeX, RotateCcw, Link as LinkIcon } from 'lucide-react';
import { ChessPiece } from './ChessPieces';
import { sound } from '../utils/sound';
import { getInviteUrl } from '../utils/chessUtils';

export function PlayerBadge({
  color,
  isUser,
  isTurn,
  inCheck,
  connected = true,
  capturedPieces = [],
  advantage = 0,
}) {
  const displayColor = color.charAt(0).toUpperCase() + color.slice(1);
  const capturedColor = color === 'white' ? 'black' : 'white';

  return (
    <div className={`player-badge ${isTurn ? 'player-active-turn' : ''}`}>
      <div className="player-badge-left">
        <div className={`player-color-indicator ${color === 'white' ? 'white-piece-dot' : 'black-piece-dot'}`} />
        <div className="player-meta">
          <div className="player-title-row">
            <span className="player-title">
              {isUser ? 'You' : 'Opponent'} <span className="player-color-tag">({displayColor})</span>
            </span>
            {inCheck && <span className="badge badge-check">Check</span>}
            {isTurn && (
              <span className={`badge ${isUser ? 'badge-your-turn' : 'badge-opponent-turn'}`}>
                {isUser ? 'Your turn' : 'Thinking...'}
              </span>
            )}
          </div>

          <div className="player-subrow">
            {/* Captured pieces strip */}
            <div className="player-captured-pieces">
              {capturedPieces.map((pieceType, index) => (
                <span key={`${pieceType}-${index}`} className="captured-piece-mini">
                  <ChessPiece piece={pieceType} color={capturedColor} size="16px" />
                </span>
              ))}
              {advantage > 0 && <span className="advantage-score">+{advantage}</span>}
            </div>

            <span className="player-connection">
              <span className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} />
              <span>{connected ? 'Connected' : 'Disconnected'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GameHeader({ roomId, onLeave, onFlipBoard }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [soundOn, setSoundOn] = useState(sound.isEnabled());

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!roomId) return;
    const url = getInviteUrl(roomId);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleSound = () => {
    const nextState = sound.toggle();
    setSoundOn(nextState);
  };

  return (
    <header className="game-header">
      <div className="game-header-brand">
        <h1 className="game-title">Chess</h1>
      </div>

      <div className="game-header-actions">
        {/* Room Code button */}
        <button
          className="header-pill-btn"
          onClick={handleCopyCode}
          title="Copy room code"
          type="button"
        >
          <span className="pill-label">Room:</span>
          <span className="room-code-text">{roomId}</span>
          {copiedCode ? <Check size={14} className="icon-success" /> : <Copy size={13} />}
        </button>

        {/* Copy Invite Link button */}
        <button
          className="header-icon-btn"
          onClick={handleCopyLink}
          title="Copy direct invite link"
          type="button"
        >
          {copiedLink ? <Check size={16} className="icon-success" /> : <LinkIcon size={16} />}
        </button>

        {/* Board Flip button */}
        {onFlipBoard && (
          <button
            className="header-icon-btn"
            onClick={onFlipBoard}
            title="Flip board orientation"
            type="button"
          >
            <RotateCcw size={16} />
          </button>
        )}

        {/* Sound toggle */}
        <button
          className="header-icon-btn"
          onClick={toggleSound}
          title={soundOn ? 'Mute sound effects' : 'Unmute sound effects'}
          type="button"
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* Resign / Leave button */}
        <button
          className="btn-leave"
          onClick={onLeave}
          title="Leave match"
          type="button"
        >
          <LogOut size={15} />
          <span>Resign</span>
        </button>
      </div>
    </header>
  );
}
