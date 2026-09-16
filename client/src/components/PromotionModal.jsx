import React from 'react';
import { ChessPiece } from './ChessPieces';

export function PromotionModal({ color, onSelect }) {
  const pieces = ['q', 'r', 'b', 'n'];

  return (
    <div className="promotion-overlay">
      <div className="promotion-dialog">
        <h4 className="promotion-title">Promote Pawn</h4>
        <div className="promotion-options">
          {pieces.map((p) => (
            <button
              key={p}
              className="promotion-btn"
              onClick={() => onSelect(p)}
              type="button"
              title={
                p === 'q'
                  ? 'Queen'
                  : p === 'r'
                  ? 'Rook'
                  : p === 'b'
                  ? 'Bishop'
                  : 'Knight'
              }
            >
              <ChessPiece piece={p} color={color} size="44px" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
