import React, { useState } from 'react';
import { Copy, Check, ArrowLeft, Loader2 } from 'lucide-react';

export function WaitingRoom({ roomId, onCancel }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="waiting-container">
      <div className="waiting-card">
        <div className="waiting-header">
          <span className="waiting-badge">White Player</span>
          <h2 className="waiting-title">Game Created</h2>
          <p className="waiting-subtitle">
            Share this room code with a friend to start playing.
          </p>
        </div>

        <div className="room-display-box">
          <span className="room-display-label">ROOM CODE</span>
          <div className="room-code-display">{roomId}</div>
          <button
            className={`btn-copy-code ${copied ? 'btn-copied' : ''}`}
            onClick={handleCopy}
            type="button"
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copied to clipboard</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy Room Code</span>
              </>
            )}
          </button>
        </div>

        <div className="waiting-status">
          <Loader2 className="spinner-icon" size={18} />
          <span>Waiting for opponent to join...</span>
        </div>

        <button className="btn-cancel" onClick={onCancel} type="button">
          <ArrowLeft size={16} />
          <span>Cancel & Back</span>
        </button>
      </div>
    </div>
  );
}
