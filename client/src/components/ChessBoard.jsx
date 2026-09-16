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
  isFlippedManual = false,
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  // Premove state
  const [premoveFrom, setPremoveFrom] = useState(null);
  const [premove, setPremove] = useState(null); // { from, to, promotion }
  const prevLastMoveRef = useRef(null);

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

  const isMyTurn = Boolean(
    gameState && gameState.turn === playerColor && !disabled && !gameState.isGameOver
  );

  // Sound effects on state updates
  useEffect(() => {
    if (!gameState) return;

    if (gameState.isGameOver) {
      sound.playGameOver();
      return;
    }

    if (gameState.lastMove && gameState.lastMove !== prevLastMoveRef.current) {
      prevLastMoveRef.current = gameState.lastMove;
      if (gameState.inCheck) {
        sound.playCheck();
      } else if (gameState.lastMove.san?.includes('x')) {
        sound.playCapture();
      } else {
        sound.playMove();
      }
    }
  }, [gameState?.lastMove, gameState?.inCheck, gameState?.isGameOver]);

  // Execute or discard queued premove when turn becomes active
  useEffect(() => {
    if (isMyTurn && premove) {
      const { from, to, promotion } = premove;
      try {
        // Test if premove is valid in the current position
        const legalMoves = chess.moves({ square: from, verbose: true });
        const matchedMove = legalMoves.find((m) => m.to === to);

        if (matchedMove) {
          // Send move with isPremove = true (server deducts 0.01s)
          onMove(from, to, promotion || 'q', true);
        }
      } catch (e) {
        console.error('Error executing premove:', e);
      }

      // Clear premove regardless of success or failure
      setPremove(null);
      setPremoveFrom(null);
    }
  }, [isMyTurn, premove, chess, onMove]);

  // Clear normal selections when FEN changes
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
    setPendingPromotion(null);
  }, [gameState?.fen]);

  // Determine board orientation (White default bottom, Black top; flipped by manual toggle)
  const baseFlipped = playerColor === 'black';
  const isFlipped = isFlippedManual ? !baseFlipped : baseFlipped;

  const displayedFiles = useMemo(() => (isFlipped ? [...FILES].reverse() : FILES), [isFlipped]);
  const displayedRanks = useMemo(() => (isFlipped ? [...RANKS].reverse() : RANKS), [isFlipped]);

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
    if (disabled || gameState?.isGameOver) return;

    const pieceOnSquare = chess.get(square);
    const myPieceColor = playerColor === 'white' ? 'w' : 'b';

    // ----------------------------------------------------
    // CASE 1: IT IS MY TURN (Standard Move Interaction)
    // ----------------------------------------------------
    if (isMyTurn) {
      // Clear any remaining premove
      if (premove) setPremove(null);

      // Deselect clicked square
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      // If a piece was selected and clicking destination
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

          onMove(selectedSquare, square, 'q', false);
          setSelectedSquare(null);
          setPossibleMoves([]);
          return;
        }
      }

      // If clicking own piece
      if (pieceOnSquare && pieceOnSquare.color === myPieceColor) {
        setSelectedSquare(square);
        const legalMoves = chess.moves({ square, verbose: true });
        setPossibleMoves(legalMoves);
      } else {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
      return;
    }

    // ----------------------------------------------------
    // CASE 2: IT IS NOT MY TURN (Premove Interaction)
    // ----------------------------------------------------
    if (!isMyTurn) {
      // If clicking already selected premoveFrom, cancel it
      if (premoveFrom === square) {
        setPremoveFrom(null);
        return;
      }

      // If already have premoveFrom and clicking target destination
      if (premoveFrom) {
        // If clicking another of my own pieces, switch source
        if (pieceOnSquare && pieceOnSquare.color === myPieceColor) {
          setPremoveFrom(square);
          return;
        }

        // Set queued premove
        setPremove({
          from: premoveFrom,
          to: square,
          promotion: 'q',
        });
        setPremoveFrom(null);
        sound.playPremove();
        return;
      }

      // Selecting initial piece for premove
      if (pieceOnSquare && pieceOnSquare.color === myPieceColor) {
        setPremoveFrom(square);
        setPremove(null);
      } else {
        // Clicking elsewhere cancels premove
        setPremove(null);
        setPremoveFrom(null);
      }
    }
  };

  const handleContextMenu = (e) => {
    // Right click cancels premove & normal selection
    e.preventDefault();
    setSelectedSquare(null);
    setPossibleMoves([]);
    setPremove(null);
    setPremoveFrom(null);
  };

  const handlePromotionChoice = (promotionPiece) => {
    if (pendingPromotion) {
      onMove(pendingPromotion.from, pendingPromotion.to, promotionPiece, false);
      setPendingPromotion(null);
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const lastMove = gameState?.lastMove;

  return (
    <div className="board-wrapper" onContextMenu={handleContextMenu}>
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
              const isLastMove = lastMove?.from === square || lastMove?.to === square;
              const isCheck = checkSquare === square;

              // Premove states
              const isPremoveOrigin = premove?.from === square || premoveFrom === square;
              const isPremoveTarget = premove?.to === square;

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
                  } ${isLastMove ? 'square-last-move' : ''} ${
                    isCheck ? 'square-in-check' : ''
                  } ${isPremoveOrigin ? 'square-premove-from' : ''} ${
                    isPremoveTarget ? 'square-premove-to' : ''
                  }`}
                  onClick={() => handleSquareClick(square)}
                  data-square={square}
                  role="button"
                  tabIndex={0}
                  aria-label={`${square} ${
                    piece ? `${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : 'empty'
                  }`}
                >
                  {/* Rank coordinate label */}
                  {isFirstCol && (
                    <span
                      className={`square-coordinate coord-rank ${
                        isDark ? 'coord-dark' : 'coord-light'
                      }`}
                    >
                      {rank}
                    </span>
                  )}

                  {/* File coordinate label */}
                  {isLastRow && (
                    <span
                      className={`square-coordinate coord-file ${
                        isDark ? 'coord-dark' : 'coord-light'
                      }`}
                    >
                      {file}
                    </span>
                  )}

                  {/* Piece */}
                  {piece && (
                    <ChessPiece piece={piece.type} color={piece.color} size="82%" />
                  )}

                  {/* Legal move indicator */}
                  {isLegalMove && !isCapture && <div className="move-indicator-dot" />}
                  {isLegalMove && isCapture && <div className="move-indicator-capture" />}

                  {/* Premove target indicator ring */}
                  {isPremoveTarget && <div className="premove-target-ring" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {pendingPromotion && (
        <PromotionModal color={playerColor} onSelect={handlePromotionChoice} />
      )}
    </div>
  );
}
