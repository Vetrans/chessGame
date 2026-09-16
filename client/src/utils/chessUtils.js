const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

const STARTING_COUNTS = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
};

/**
 * Calculates captured pieces and material differences based on current FEN.
 */
export function getCapturedPieces(fen) {
  if (!fen) {
    return {
      whiteCaptured: [], // pieces captured by white (black pieces lost)
      blackCaptured: [], // pieces captured by black (white pieces lost)
      whiteAdvantage: 0,
      blackAdvantage: 0,
    };
  }

  const boardPlacement = fen.split(' ')[0] || '';
  const currentWhite = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  const currentBlack = { p: 0, n: 0, b: 0, r: 0, q: 0 };

  for (const char of boardPlacement) {
    const lower = char.toLowerCase();
    if (PIECE_VALUES[lower]) {
      if (char === char.toUpperCase()) {
        currentWhite[lower] = (currentWhite[lower] || 0) + 1;
      } else {
        currentBlack[lower] = (currentBlack[lower] || 0) + 1;
      }
    }
  }

  // Black pieces captured by White:
  const blackCaptured = []; // e.g. pieces white lost
  const whiteCaptured = []; // e.g. pieces black lost

  // Pieces White lost (captured by Black)
  for (const [piece, max] of Object.entries(STARTING_COUNTS)) {
    const missing = Math.max(0, max - (currentWhite[piece] || 0));
    for (let i = 0; i < missing; i++) {
      blackCaptured.push(piece);
    }
  }

  // Pieces Black lost (captured by White)
  for (const [piece, max] of Object.entries(STARTING_COUNTS)) {
    const missing = Math.max(0, max - (currentBlack[piece] || 0));
    for (let i = 0; i < missing; i++) {
      whiteCaptured.push(piece);
    }
  }

  // Sort pieces by value descending (Q -> R -> B -> N -> P)
  const pieceOrder = { q: 5, r: 4, b: 3, n: 2, p: 1 };
  whiteCaptured.sort((a, b) => pieceOrder[b] - pieceOrder[a]);
  blackCaptured.sort((a, b) => pieceOrder[b] - pieceOrder[a]);

  let whiteMaterial = 0;
  let blackMaterial = 0;

  for (const [piece, val] of Object.entries(PIECE_VALUES)) {
    whiteMaterial += (currentWhite[piece] || 0) * val;
    blackMaterial += (currentBlack[piece] || 0) * val;
  }

  const diff = whiteMaterial - blackMaterial;

  return {
    whiteCaptured, // Black pieces captured by White
    blackCaptured, // White pieces captured by Black
    whiteAdvantage: diff > 0 ? diff : 0,
    blackAdvantage: diff < 0 ? Math.abs(diff) : 0,
  };
}

/**
 * Builds a shareable invite URL given a room ID.
 */
export function getInviteUrl(roomId) {
  if (typeof window === 'undefined') return '';
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?room=${encodeURIComponent(roomId)}`;
}
