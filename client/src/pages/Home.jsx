import React, { useState } from 'react';
import { PlusCircle, ArrowRight, AlertCircle } from 'lucide-react';

export function Home({ onCreateGame, onJoinGame, error, onClearError, connected }) {
  const [joinCode, setJoinCode] = useState('');

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinGame(joinCode.trim());
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <header className="home-header">
          <div className="home-logo">
            <svg viewBox="0 0 45 45" width="48" height="48" fill="#38bdf8">
              <g fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
                <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.02,5.05 19.5,6.5 C 20,7.5 19,9 20,9 C 21,9 21.5,8 22,8.5 C 22.5,9 22.5,10 22,10 z" />
              </g>
            </svg>
          </div>
          <h1 className="home-title">Chess</h1>
          <p className="home-subtitle">Minimal 1v1 private games</p>
        </header>

        {error && (
          <div className="alert-box alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="home-actions">
          {/* Create game button */}
          <button
            className="btn-primary"
            onClick={onCreateGame}
            disabled={!connected}
            type="button"
          >
            <PlusCircle size={20} />
            <span>Create Game</span>
          </button>

          <div className="home-divider">
            <span>OR</span>
          </div>

          {/* Join game form */}
          <form className="join-form" onSubmit={handleJoinSubmit}>
            <div className="join-input-group">
              <input
                type="text"
                className="join-input"
                placeholder="Enter Room Code (e.g. ABC123)"
                value={joinCode}
                onChange={(e) => {
                  if (error) onClearError();
                  setJoinCode(e.target.value.toUpperCase());
                }}
                maxLength={8}
                disabled={!connected}
                autoCapitalize="characters"
                spellCheck="false"
              />
              <button
                className="btn-secondary"
                type="submit"
                disabled={!connected || !joinCode.trim()}
              >
                <span>Join Game</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </div>

        <div className="home-footer">
          <span className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} />
          <span>{connected ? 'Server Connected' : 'Connecting to Server...'}</span>
        </div>
      </div>
    </div>
  );
}
