import React, { useState, useMemo, useEffect } from 'react';
import { Chess } from 'chess.js';
import { ChessPiece } from './ChessPieces';
import { PromotionModal } from './PromotionModal';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function ChessBoard({
  gameState,
  playerColor,
  onMove,
  disabled = false,
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  // Synchronized client-side Chess instance for calculating legal moves
  const chess = useMemo(() => {
    const instance = new Chess();
    if (gameState?.fen) {
      try {
        instance.load(gameState.fen);
      } catch (e) {
        console.error('Failed to load FEN into client chess instance:', e);
      }
    }
    return instance;
  }, [gameState?.fen]);

  // Clear selection whenever gameState updates
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
    setPendingPromotion(null);
  }, [gameState?.fen]);

  // Determine board orientation based on player's assigned color
  const isFlipped = playerColor === 'black';
  const displayedFiles = useMemo(() => (isFlipped ? [...FILES].reverse() : FILES), [isFlipped]);
  const displayedRanks = useMemo(() => (isFlipped ? [...RANKS].reverse() : RANKS), [isFlipped]);

  const isMyTurn = gameState && gameState.turn === playerColor && !disabled && !gameState.isGameOver;

  // Identify check square for active king
  const checkSquare = useMemo(() => {
    if (!gameState?.inCheck) return null;
    const currentTurn = chess.turn(); // 'w' or 'b'
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === currentTurn) {
          const file = FILES[c];
          const rank = RANKS[r];
          return `${file}${rank}`;
        }
      }
    }
    return null;
  }, [gameState?.inCheck, chess]);

  const handleSquareClick = (square) => {
    if (!isMyTurn) return;

    const pieceOnSquare = chess.get(square);
    const myPieceColor = playerColor === 'white' ? 'w' : 'b';

    // If clicking the currently selected square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // If a piece was already selected and user clicked a target move square
    if (selectedSquare) {
      const isLegalTarget = possibleMoves.some((m) => m.to === square);
      if (isLegalTarget) {
        const selectedPiece = chess.get(selectedSquare);
        const isPawnPromotion =
          selectedPiece?.type === 'p' &&
          ((selectedPiece.color === 'w' && square.endsWith('8')) ||
            (selectedPiece.color === 'b' && square.endsWith('1')));

        if (isPawnPromotion) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        onMove(selectedSquare, square, 'q');
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }
    }

    // Otherwise, check if user clicked their own piece to select it
    if (pieceOnSquare && pieceOnSquare.color === myPieceColor) {
      setSelectedSquare(square);
      const legalMoves = chess.moves({ square, verbose: true });
      setPossibleMoves(legalMoves);
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const handlePromotionChoice = (promotionPiece) => {
    if (pendingPromotion) {
      onMove(pendingPromotion.from, pendingPromotion.to, promotionPiece);
      setPendingPromotion(null);
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const lastMove = gameState?.lastMove;

  return (
    <div className="board-wrapper">
      <div className="chess-board">
        {displayedRanks.map((rank, rankIndex) => (
          <div key={rank} className="board-row">
            {displayedFiles.map((file, fileIndex) => {
              const square = `${file}${rank}`;
              const fileIdx = FILES.indexOf(file);
              const rankIdx = parseInt(rank, 10);
              const isDark = (fileIdx + rankIdx) % 2 !== 0;

              const piece = chess.get(square);
              const isSelected = selectedSquare === square;
              const isLastMoveFrom = lastMove?.from === square;
              const isLastMoveTo = lastMove?.to === square;
              const isLastMove = isLastMoveFrom || isLastMoveTo;
              const isCheck = checkSquare === square;

              const moveTarget = possibleMoves.find((m) => m.to === square);
              const isLegalMove = Boolean(moveTarget);
              const isCapture = isLegalMove && Boolean(piece);

              const isFirstCol = fileIndex === 0;
              const isLastRow = rankIndex === displayedRanks.length - 1;

              return (
                <div
                  key={square}
                  className={`board-square ${isDark ? 'square-dark' : 'square-light'} ${
                    isSelected ? 'square-selected' : ''
                  } ${isLastMove ? 'square-last-move' : ''} ${isCheck ? 'square-in-check' : ''}`}
                  onClick={() => handleSquareClick(square)}
                  data-square={square}
                  role="button"
                  tabIndex={0}
                  aria-label={`${square} ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : 'empty'}`}
                >
                  {/* Rank coordinate label */}
                  {isFirstCol && (
                    <span className={`square-coordinate coord-rank ${isDark ? 'coord-dark' : 'coord-light'}`}>
                      {rank}
                    </span>
                  )}

                  {/* File coordinate label */}
                  {isLastRow && (
                    <span className={`square-coordinate coord-file ${isDark ? 'coord-dark' : 'coord-light'}`}>
                      {file}
                    </span>
                  )}

                  {/* Piece */}
                  {piece && (
                    <ChessPiece
                      piece={piece.type}
                      color={piece.color}
                      size="82%"
                    />
                  )}

                  {/* Legal move indicator */}
                  {isLegalMove && !isCapture && <div className="move-indicator-dot" />}
                  {isLegalMove && isCapture && <div className="move-indicator-capture" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {pendingPromotion && (
        <PromotionModal
          color={playerColor}
          onSelect={handlePromotionChoice}
        />
      )}
    </div>
  );
}
