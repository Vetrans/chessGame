import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  ArrowRight,
  AlertCircle,
  Swords,
  Shuffle,
  Users,
  Clock,
} from 'lucide-react';

export function Home({
  onCreateGame,
  onJoinGame,
  onJoinRandom,
  stats = { waiting: 0, playing: 0 },
  error,
  onClearError,
  connected,
}) {
  const [joinCode, setJoinCode] = useState('');
  const [invitedRoom, setInvitedRoom] = useState(null);

  // Auto-detect invite link with ?room=XYZ in query parameters
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        const cleanRoom = roomParam.trim().toUpperCase();
        setJoinCode(cleanRoom);
        setInvitedRoom(cleanRoom);
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinGame(joinCode.trim().toUpperCase());
  };

  const waitingCount = stats?.waiting || 0;
  const playingCount = stats?.playing || 0;

  return (
    <div className="home-container">
      <div className="home-card">
        <header className="home-header">
          <div className="home-logo">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v3" />
              <path d="M10 5h4" />
              <path d="m7 9 2 4h6l2-4" />
              <path d="M6 19h12" />
              <path d="M5 22h14" />
              <path d="M9 19v-4" />
              <path d="M15 19v-4" />
            </svg>
          </div>
          <h1 className="home-title">Chess</h1>
          <p className="home-subtitle">Instant 1v1 private games in your browser</p>

          {/* Real-time live player counts */}
          <div className="live-stats-bar" title="Live players on this server">
            <div className="stat-item">
              <Clock size={14} className="stat-icon-waiting" />
              <span className="stat-label">Waiting in lobby:</span>
              <span className="stat-val">{waitingCount}</span>
            </div>
            <span className="stat-separator">•</span>
            <div className="stat-item">
              <Users size={14} className="stat-icon-playing" />
              <span className="stat-label">Playing now:</span>
              <span className="stat-val">{playingCount}</span>
            </div>
          </div>
        </header>

        {invitedRoom && (
          <div className="invite-banner">
            <Swords size={16} />
            <span>Invited to join room <strong>{invitedRoom}</strong></span>
          </div>
        )}

        {error && (
          <div className="alert-box alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="home-actions">
          {/* Quick Play: Join random game */}
          <button
            className="btn-random"
            onClick={onJoinRandom}
            disabled={!connected}
            type="button"
            title="Quick play against an available waiting opponent or start a match"
          >
            <Shuffle size={18} />
            <span>Join Random Game</span>
            {waitingCount > 0 && (
              <span className="badge-available">{waitingCount} waiting</span>
            )}
          </button>

          {/* Create private game */}
          <button
            className="btn-primary btn-hero"
            onClick={onCreateGame}
            disabled={!connected}
            type="button"
          >
            <PlusCircle size={20} />
            <span>Create Private Game</span>
          </button>

          <div className="home-divider">
            <span>or join with code</span>
          </div>

          {/* Join game form */}
          <form className="join-form" onSubmit={handleJoinSubmit}>
            <div className="join-input-group">
              <input
                type="text"
                className="join-input"
                placeholder="Enter 6-letter room code"
                value={joinCode}
                onChange={(e) => {
                  if (error) onClearError();
                  setJoinCode(e.target.value.toUpperCase());
                }}
                maxLength={10}
                disabled={!connected}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                className="btn-secondary"
                type="submit"
                disabled={!connected || !joinCode.trim()}
              >
                <span>Join Match</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </div>

        <div className="home-footer">
          <span className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} />
          <span>{connected ? 'Server connected' : 'Connecting to game server...'}</span>
        </div>
      </div>
    </div>
  );
}
