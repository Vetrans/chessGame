import React, { useEffect, useRef } from 'react';

export function MoveHistory({ history = [] }) {
  const scrollRef = useRef(null);

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
    });
  }

  return (
    <div className="move-history-container">
      <div className="move-history-header">Move History</div>
      <div className="move-history-list" ref={scrollRef}>
        {movePairs.length === 0 ? (
          <div className="move-history-empty">Game in progress...</div>
        ) : (
          movePairs.map((pair) => (
            <div key={pair.round} className="move-history-row">
              <span className="move-num">{pair.round}.</span>
              <span className="move-item move-white">{pair.white}</span>
              <span className="move-item move-black">{pair.black || ''}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
