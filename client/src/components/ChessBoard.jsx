import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { ChessPiece } from './ChessPieces';
import { PromotionModal } from './PromotionModal';
import { sound } from '../utils/sound';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function ChessBoard({
  gameState,
  playerColor,
  onMove,
  disabled = false,
  orientation, // optional override
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const prevMoveRef = useRef(null);

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

  // Audio feedback for moves, captures, checks, and game over
  useEffect(() => {
    const last = gameState?.lastMove;
    if (last && JSON.stringify(last) !== JSON.stringify(prevMoveRef.current)) {
      if (prevMoveRef.current !== null) {
        if (gameState.inCheck) {
          sound.playCheck();
        } else if (last.san?.includes('x')) {
          sound.playCapture();
        } else {
          sound.playMove();
        }
      }
      prevMoveRef.current = last;
    }
  }, [gameState?.lastMove, gameState?.inCheck]);

  useEffect(() => {
    if (gameState?.isGameOver) {
      const isWin = gameState?.gameOver?.winner === playerColor;
      sound.playGameEnd(isWin);
    }
  }, [gameState?.isGameOver, gameState?.gameOver?.winner, playerColor]);

  // Clear selection whenever gameState updates
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
    setPendingPromotion(null);
  }, [gameState?.fen]);

  // Determine board orientation
  const effectiveColor = orientation || playerColor || 'white';
  const isFlipped = effectiveColor === 'black';
  const displayedFiles = useMemo(() => (isFlipped ? [...FILES].reverse() : FILES), [isFlipped]);
  const displayedRanks = useMemo(() => (isFlipped ? [...RANKS].reverse() : RANKS), [isFlipped]);

  const isMyTurn = gameState && gameState.turn === playerColor && !disabled && !gameState.isGameOver;

  // Identify check square for active king
  const checkSquare = useMemo(() => {
    if (!gameState?.inCheck) return null;
    const currentTurn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === currentTurn) {
          return `${FILES[c]}${RANKS[r]}`;
        }
      }
    }
    return null;
  }, [gameState?.inCheck, chess]);

  const handleSquareClick = (square) => {
    if (!isMyTurn) return;

    const pieceOnSquare = chess.get(square);
    const myPieceColor = playerColor === 'white' ? 'w' : 'b';

    // Deselect if clicking the same square
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // Move piece if legal target
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

    // Select piece if own color
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
      <div className="chess-board" role="grid" aria-label="Chess board">
        {displayedRanks.map((rank, rankIndex) => (
          <div key={rank} className="board-row" role="row">
            {displayedFiles.map((file, fileIndex) => {
              const square = `${file}${rank}`;
              const fileIdx = FILES.indexOf(file);
              const rankIdx = parseInt(rank, 10);
              const isDark = (fileIdx + rankIdx) % 2 !== 0;

              const piece = chess.get(square);
              const isSelected = selectedSquare === square;
              const isLastMove = lastMove?.from === square || lastMove?.to === square;
              const isCheck = checkSquare === square;

              const moveTarget = possibleMoves.find((m) => m.to === square);
              const isLegalMove = Boolean(moveTarget);
              const isCapture = isLegalMove && Boolean(piece);

              const isFirstCol = fileIndex === 0;
              const isLastRow = rankIndex === displayedRanks.length - 1;

              const isMyPiece = piece && piece.color === (playerColor === 'white' ? 'w' : 'b');

              return (
                <div
                  key={square}
                  className={`board-square ${isDark ? 'square-dark' : 'square-light'} ${
                    isSelected ? 'square-selected' : ''
                  } ${isLastMove ? 'square-last-move' : ''} ${isCheck ? 'square-in-check' : ''} ${
                    isMyPiece && isMyTurn ? 'square-interactive' : ''
                  }`}
                  onClick={() => handleSquareClick(square)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSquareClick(square);
                    }
                  }}
                  data-square={square}
                  role="gridcell"
                  tabIndex={isMyTurn && (isMyPiece || isLegalMove) ? 0 : -1}
                  aria-label={`${square}: ${
                    piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type.toUpperCase()}` : 'empty'
                  }${isLegalMove ? ' (legal move)' : ''}`}
                >
                  {/* Coordinates */}
                  {isFirstCol && (
                    <span className={`square-coordinate coord-rank ${isDark ? 'coord-dark' : 'coord-light'}`}>
                      {rank}
                    </span>
                  )}

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
                      size="84%"
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
          onCancel={() => setPendingPromotion(null)}
        />
      )}
    </div>
  );
}
