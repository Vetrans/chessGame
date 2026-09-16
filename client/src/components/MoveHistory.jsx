import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function MoveHistory({ history = [] }) {
  const scrollRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Group history into pairs of moves: [ [whiteMove, blackMove], ... ]
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      round: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1] || null,
      isLatestWhite: i === history.length - 1,
      isLatestBlack: i + 1 === history.length - 1,
    });
  }

  const handleCopyHistory = () => {
    if (history.length === 0) return;
    const pgn = movePairs
      .map((p) => `${p.round}. ${p.white}${p.black ? ` ${p.black}` : ''}`)
      .join(' ');
    navigator.clipboard.writeText(pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="move-history-container">
      <div className="move-history-header">
        <span>Move Log ({history.length})</span>
        {history.length > 0 && (
          <button
            className="btn-copy-pgn"
            onClick={handleCopyHistory}
            title="Copy notation to clipboard"
            type="button"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}
      </div>

      <div className="move-history-list" ref={scrollRef}>
        {movePairs.length === 0 ? (
          <div className="move-history-empty">Moves will appear here</div>
        ) : (
          movePairs.map((pair) => (
            <div key={pair.round} className="move-history-row">
              <span className="move-num">{pair.round}.</span>
              <span className={`move-item move-white ${pair.isLatestWhite ? 'move-latest' : ''}`}>
                {pair.white}
              </span>
              <span className={`move-item move-black ${pair.isLatestBlack ? 'move-latest' : ''}`}>
                {pair.black || ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
