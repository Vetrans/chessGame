import React, { useEffect } from 'react';
import { ChessPiece } from './ChessPieces';

const PIECES = [
  { key: 'q', label: 'Queen', shortcut: '1' },
  { key: 'r', label: 'Rook', shortcut: '2' },
  { key: 'b', label: 'Bishop', shortcut: '3' },
  { key: 'n', label: 'Knight', shortcut: '4' },
];

export function PromotionModal({ color, onSelect, onCancel }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel();
        return;
      }
      const match = PIECES.find(
        (p) => p.shortcut === e.key || p.key === e.key.toLowerCase()
      );
      if (match) {
        onSelect(match.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelect, onCancel]);

  return (
    <div className="promotion-overlay" role="dialog" aria-modal="true" aria-label="Pawn Promotion">
      <div className="promotion-dialog">
        <h4 className="promotion-title">Promote Pawn</h4>
        <div className="promotion-options">
          {PIECES.map((p) => (
            <button
              key={p.key}
              className="promotion-btn"
              onClick={() => onSelect(p.key)}
              type="button"
              title={`${p.label} (Press ${p.shortcut})`}
              aria-label={`Promote to ${p.label}`}
            >
              <ChessPiece piece={p.key} color={color} size="44px" />
              <span className="promotion-shortcut">{p.shortcut}</span>
            </button>
          ))}
        </div>
        {onCancel && (
          <button className="promotion-cancel-btn" onClick={onCancel} type="button">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
