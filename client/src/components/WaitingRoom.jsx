import React, { useState } from 'react';
import { Copy, Check, ArrowLeft, Loader2, Link as LinkIcon, Share2 } from 'lucide-react';
import { getInviteUrl } from '../utils/chessUtils';

export function WaitingRoom({ roomId, onCancel }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteUrl = getInviteUrl(roomId);

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="waiting-container">
      <div className="waiting-card">
        <div className="waiting-header">
          <div className="waiting-pill">Match Created</div>
          <h2 className="waiting-title">Waiting for Opponent</h2>
          <p className="waiting-subtitle">
            Share the invite link or room code with a friend to play.
          </p>
        </div>

        <div className="room-display-box">
          <span className="room-display-label">ROOM CODE</span>
          <div className="room-code-display">{roomId}</div>

          <div className="waiting-action-group">
            <button
              className={`btn-primary ${copiedLink ? 'btn-copied' : ''}`}
              onClick={handleCopyLink}
              type="button"
            >
              {copiedLink ? (
                <>
                  <Check size={18} />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <LinkIcon size={18} />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>

            <button
              className={`btn-secondary ${copiedCode ? 'btn-copied' : ''}`}
              onClick={handleCopyCode}
              type="button"
            >
              {copiedCode ? (
                <>
                  <Check size={18} />
                  <span>Code Copied</span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span>Copy Code Only</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="waiting-status">
          <Loader2 className="spinner-icon" size={18} />
          <span>Listening for opponent to connect...</span>
        </div>

        <button className="btn-cancel" onClick={onCancel} type="button">
          <ArrowLeft size={16} />
          <span>Cancel & Return</span>
        </button>
      </div>
    </div>
  );
}
