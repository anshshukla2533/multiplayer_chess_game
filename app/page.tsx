"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
type PieceColor = 'w' | 'b';
type Piece = { type: PieceType; color: PieceColor } | null;
type Board = Piece[][];
type Position = { row: number; col: number };

interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured: Piece;
  promotion?: PieceType;
  castling?: { rookFrom: Position; rookTo: Position };
  enPassant?: Position;
}

// Initialize chess board
const initialBoard = (): Board => {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Pawns
  for (let i = 0; i < 8; i++) {
    b[1][i] = { type: 'p', color: 'b' };
    b[6][i] = { type: 'p', color: 'w' };
  }
  
  // Pieces
  const pieces: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let i = 0; i < 8; i++) {
    b[0][i] = { type: pieces[i], color: 'b' };
    b[7][i] = { type: pieces[i], color: 'w' };
  }
  
  return b;
};

// Utility functions
const copyBoard = (board: Board): Board => 
  board.map(row => row.map(p => p ? { ...p } : null));

const posEqual = (a: Position | null, b: Position | null): boolean =>
  a !== null && b !== null && a.row === b.row && a.col === b.col;

const inBounds = (p: Position): boolean => 
  p.row >= 0 && p.row < 8 && p.col >= 0 && p.col < 8;

const findKing = (board: Board, color: PieceColor): Position | null => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece?.type === 'k' && piece.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
};

const isSquareAttacked = (board: Board, pos: Position, byColor: PieceColor): boolean => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== byColor) continue;
      
      const moves = getMoves(board, { row: r, col: c }, false);
      if (moves.some(m => posEqual(m, pos))) return true;
    }
  }
  return false;
};

const isInCheck = (board: Board, color: PieceColor): boolean => {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  return isSquareAttacked(board, kingPos, color === 'w' ? 'b' : 'w');
};

// Get legal moves for a piece
const getMoves = (board: Board, from: Position, checkSafety = true): Position[] => {
  const piece = board[from.row][from.col];
  if (!piece) return [];
  
  const moves: Position[] = [];
  const { type, color } = piece;
  
  const addMove = (to: Position) => {
    if (!inBounds(to)) return false;
    const target = board[to.row][to.col];
    if (target?.color === color) return false;
    moves.push(to);
    return !target;
  };
  
  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    
    const fwd = { row: from.row + dir, col: from.col };
    if (inBounds(fwd) && !board[fwd.row][fwd.col]) {
      moves.push(fwd);
      if (from.row === startRow) {
        const fwd2 = { row: from.row + 2 * dir, col: from.col };
        if (!board[fwd2.row][fwd2.col]) moves.push(fwd2);
      }
    }
    
    for (const dc of [-1, 1]) {
      const to = { row: from.row + dir, col: from.col + dc };
      if (inBounds(to) && board[to.row][to.col]?.color !== color && board[to.row][to.col]) {
        moves.push(to);
      }
    }
  } else if (type === 'n') {
    const offs = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    offs.forEach(([dr, dc]) => addMove({ row: from.row + dr, col: from.col + dc }));
  } else if (type === 'b') {
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr, dc]) => {
      for (let i = 1; i < 8; i++) {
        if (!addMove({ row: from.row + i*dr, col: from.col + i*dc })) break;
      }
    });
  } else if (type === 'r') {
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => {
      for (let i = 1; i < 8; i++) {
        if (!addMove({ row: from.row + i*dr, col: from.col + i*dc })) break;
      }
    });
  } else if (type === 'q') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => {
      for (let i = 1; i < 8; i++) {
        if (!addMove({ row: from.row + i*dr, col: from.col + i*dc })) break;
      }
    });
  } else if (type === 'k') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => {
      addMove({ row: from.row + dr, col: from.col + dc });
    });
  }
  
  if (!checkSafety) return moves;
  
  return moves.filter(to => {
    const test = copyBoard(board);
    test[to.row][to.col] = test[from.row][from.col];
    test[from.row][from.col] = null;
    return !isInCheck(test, color);
  });
};

const getPieceSymbol = (piece: Piece): string => {
  if (!piece) return '';
  const symbols = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
  return symbols[piece.type];
};

const playSound = (freq: number) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
};

export default function ChessGame() {
  const [board, setBoard] = useState<Board>(initialBoard());
  const [turn, setTurn] = useState<PieceColor>('w');
  const [selected, setSelected] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [moveStack, setMoveStack] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{from: Position; to: Position} | null>(null);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [showPromo, setShowPromo] = useState<Position | null>(null);
  const [stackAnim, setStackAnim] = useState<'push' | 'pop' | null>(null);

  const hasLegalMoves = (b: Board, c: PieceColor): boolean => {
    for (let r = 0; r < 8; r++) {
      for (let col = 0; col < 8; col++) {
        if (b[r][col]?.color === c && getMoves(b, {row: r, col}).length > 0) return true;
      }
    }
    return false;
  };

  // AI Move Generator for Black
  const getAIMove = (b: Board): { from: Position; to: Position } | null => {
    const allMoves: { from: Position; to: Position }[] = [];
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]?.color === 'b') {
          const moves = getMoves(b, { row: r, col: c });
          moves.forEach(m => allMoves.push({ from: { row: r, col: c }, to: m }));
        }
      }
    }
    
    if (allMoves.length === 0) return null;
    
    // Prioritize moves: captures > piece advancement > random
    const scoredMoves = allMoves.map(m => {
      const target = b[m.to.row][m.to.col];
      let score = Math.random() * 10;
      
      if (target) score += 100; // Captures
      if (b[m.from.row][m.from.col]?.type === 'p') score += 5; // Pawn advancement
      
      return { move: m, score };
    });
    
    const bestMove = scoredMoves.reduce((best, curr) => curr.score > best.score ? curr : best);
    return bestMove.move;
  };

  const makeMove = useCallback((from: Position, to: Position, promo?: PieceType) => {
    const newBoard = copyBoard(board);
    const piece = newBoard[from.row][from.col];
    if (!piece) return;
    
    const captured = newBoard[to.row][to.col];
    const move: Move = { from, to, piece: {...piece}, captured };
    
    if (promo) {
      newBoard[to.row][to.col] = { type: promo, color: piece.color };
      newBoard[from.row][from.col] = null;
    } else {
      newBoard[to.row][to.col] = piece;
      newBoard[from.row][from.col] = null;
    }
    
    setBoard(newBoard);
    setTurn(turn === 'w' ? 'b' : 'w');
    setSelected(null);
    setLegalMoves([]);
    setMoveStack([...moveStack, move]);
    setLastMove({ from, to });
    setStackAnim('push');
    setTimeout(() => setStackAnim(null), 300);
    
    playSound(captured ? 400 : 300);
    
    const nextTurn = turn === 'w' ? 'b' : 'w';
    if (!hasLegalMoves(newBoard, nextTurn)) {
      if (isInCheck(newBoard, nextTurn)) {
        setGameOver(`Checkmate! ${turn === 'w' ? 'White' : 'Black'} wins!`);
        playSound(600);
      } else {
        setGameOver('Stalemate! Draw!');
      }
    } else if (isInCheck(newBoard, nextTurn)) {
      playSound(500);
    }
  }, [board, turn, moveStack]);

  const undoMove = () => {
    if (moveStack.length === 0) return;
    
    const move = moveStack[moveStack.length - 1];
    const newBoard = copyBoard(board);
    
    newBoard[move.from.row][move.from.col] = move.piece;
    newBoard[move.to.row][move.to.col] = move.captured;
    
    setBoard(newBoard);
    setTurn(turn === 'w' ? 'b' : 'w');
    setMoveStack(moveStack.slice(0, -1));
    setLastMove(moveStack.length > 1 ? 
      { from: moveStack[moveStack.length - 2].from, to: moveStack[moveStack.length - 2].to } : null);
    setGameOver(null);
    setStackAnim('pop');
    setTimeout(() => setStackAnim(null), 300);
    playSound(300);
  };

  const handleSquareClick = (row: number, col: number) => {
    if (gameOver) return;
    if (turn === 'b') return; // Black AI moves, human can't click
    
    const pos = { row, col };
    const piece = board[row][col];
    
    if (selected) {
      const isLegal = legalMoves.some(m => posEqual(m, pos));
      
      if (isLegal) {
        const p = board[selected.row][selected.col];
        if (p?.type === 'p' && ((p.color === 'w' && row === 0) || (p.color === 'b' && row === 7))) {
          setShowPromo(pos);
          return;
        }
        makeMove(selected, pos);
      } else if (piece?.color === turn) {
        setSelected(pos);
        setLegalMoves(getMoves(board, pos));
      } else {
        setSelected(null);
        setLegalMoves([]);
      }
    } else if (piece?.color === turn) {
      setSelected(pos);
      setLegalMoves(getMoves(board, pos));
    }
  };

  const reset = () => {
    setBoard(initialBoard());
    setTurn('w');
    setSelected(null);
    setLegalMoves([]);
    setMoveStack([]);
    setLastMove(null);
    setGameOver(null);
    setShowPromo(null);
  };

  // AI makes move after white's turn
  useEffect(() => {
    if (turn === 'b' && !gameOver) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board);
        if (aiMove) {
          const newBoard = copyBoard(board);
          const piece = newBoard[aiMove.from.row][aiMove.from.col];
          if (piece) {
            const captured = newBoard[aiMove.to.row][aiMove.to.col];
            const move: Move = { from: aiMove.from, to: aiMove.to, piece: {...piece}, captured };
            
            newBoard[aiMove.to.row][aiMove.to.col] = piece;
            newBoard[aiMove.from.row][aiMove.from.col] = null;
            
            setBoard(newBoard);
            setTurn('w');
            setSelected(null);
            setLegalMoves([]);
            setMoveStack([...moveStack, move]);
            setLastMove({ from: aiMove.from, to: aiMove.to });
            setStackAnim('push');
            setTimeout(() => setStackAnim(null), 300);
            playSound(captured ? 400 : 300);
            
            if (!hasLegalMoves(newBoard, 'w')) {
              if (isInCheck(newBoard, 'w')) {
                setGameOver('Checkmate! Black wins!');
                playSound(600);
              } else {
                setGameOver('Stalemate! Draw!');
              }
            } else if (isInCheck(newBoard, 'w')) {
              playSound(500);
            }
          }
        }
      }, 2000); // 2 seconds - realistic thinking time
      
      return () => clearTimeout(timer);
    }
  }, [turn, gameOver, board, moveStack]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-4 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-400 to-pink-400"
          >
            Stack-Based Chess
          </motion.h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Board */}
          <div className="lg:col-span-2">
            <div className="relative bg-slate-800/50 p-4 rounded-2xl backdrop-blur-xl border-none outline-none shadow-none">
              <div className="grid grid-cols-8 gap-0 max-w-2xl mx-auto border-none outline-none shadow-none">
                {board.map((row, r) => row.map((piece, c) => {
                  const isLight = (r + c) % 2 === 0;
                  const pos = { row: r, col: c };
                  const isSelected = posEqual(selected, pos);
                  const isLegal = legalMoves.some(m => posEqual(m, pos));
                  const isLast = lastMove && (posEqual(lastMove.from, pos) || posEqual(lastMove.to, pos));

                  return (
                    <motion.button
                      key={`${r}-${c}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSquareClick(r, c)}
                      className={`
                        aspect-square flex items-center justify-center text-4xl lg:text-5xl border-none outline-none
                        ${isLight ? 'bg-slate-700/40' : 'bg-slate-800/60'}
                        ${isSelected ? 'ring-4 ring-cyan-400 ring-inset' : ''}
                        ${isLast ? 'bg-yellow-500/30' : ''}
                        ${isLegal && selected ? 'ring-2 ring-blue-400 ring-inset' : ''}
                        hover:brightness-125 transition-all
                      `}
                    >
                      {piece && (
                        <span className={piece.color === 'w' ? 'text-white' : 'text-yellow-200'}>
                          {getPieceSymbol(piece)}
                        </span>
                      )}
                    </motion.button>
                  );
                }))}
              </div>

              {/* Game Over */}
              {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
                  <div className="bg-linear-to-br from-purple-900 to-pink-900 p-8 rounded-xl text-center border-2 border-cyan-400">
                    <h2 className="text-3xl font-bold mb-4">{gameOver}</h2>
                    <button onClick={reset} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 rounded-lg font-bold">
                      New Game
                    </button>
                  </div>
                </div>
              )}

              {/* Promotion */}
              {showPromo && selected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
                  <div className="bg-slate-800 p-8 rounded-xl border-2 border-cyan-400">
                    <h3 className="text-2xl font-bold mb-6 text-center">Promote Pawn</h3>
                    <div className="flex gap-4">
                      {(['q', 'r', 'b', 'n'] as PieceType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => {
                            makeMove(selected, showPromo, t);
                            setShowPromo(null);
                          }}
                          className="w-20 h-20 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-5xl"
                        >
                          {getPieceSymbol({ type: t, color: turn })}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={undoMove}
                disabled={moveStack.length === 0}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold"
              >
                Undo (Pop)
              </button>
              <button onClick={reset} className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold">
                Reset
              </button>
            </div>

            <div className="mt-6 text-center">
              <div className="inline-block px-8 py-4 bg-cyan-500/20 rounded-xl border border-cyan-400/30">
                <p className="text-sm text-gray-400">Current Turn</p>
                <p className="text-3xl font-bold">{turn === 'w' ? 'White (You)' : 'Black (AI)'}</p>
                {isInCheck(board, turn) && !gameOver && (
                  <p className="text-red-400 font-bold mt-2">CHECK!</p>
                )}
              </div>
            </div>
          </div>

          {/* Stack */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 p-6 rounded-2xl backdrop-blur-xl border border-purple-500/20 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-cyan-400">Move Stack</h2>
                <div className="px-4 py-2 bg-cyan-500/20 rounded-lg border border-cyan-400/30">
                  <span className="text-cyan-400 font-mono font-bold">{moveStack.length}</span>
                </div>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {moveStack.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-gray-500 mb-2">(empty)</p>
                    <p>Stack is empty</p>
                  </div>
                ) : (
                  [...moveStack].reverse().map((move, idx) => {
                    const actualIdx = moveStack.length - 1 - idx;
                    const isTop = idx === 0;
                    
                    return (
                      <motion.div
                        key={actualIdx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`
                          p-4 rounded-lg border
                          ${isTop ? 'bg-cyan-500/30 border-cyan-400 ring-2 ring-cyan-400/50' : 'bg-slate-700/30 border-slate-600/30'}
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-mono text-gray-400">#{actualIdx + 1}</span>
                          {isTop && <span className="text-xs font-bold text-cyan-400 bg-cyan-400/20 px-2 py-1 rounded">TOP</span>}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{getPieceSymbol(move.piece)}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-mono font-bold text-purple-300">
                                {String.fromCharCode(97 + move.from.col)}{8 - move.from.row}
                              </span>
                              <span className="text-gray-500">→</span>
                              <span className="font-mono font-bold text-cyan-300">
                                {String.fromCharCode(97 + move.to.col)}{8 - move.to.row}
                              </span>
                            </div>
                            {move.captured && (
                              <div className="mt-1 text-xs text-red-400 flex items-center gap-1">
                                <span>Captured:</span>
                                <span className="text-lg">{getPieceSymbol(move.captured)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-sm font-bold text-gray-400 mb-3">Stack Structure</h3>
                <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-xs border border-cyan-500/20">
                  <div className="text-cyan-400 mb-2">Stack&lt;Move&gt;</div>
                  <div className="pl-4 space-y-1">
                    <div className="text-purple-400">• push() → Add to top</div>
                    <div className="text-pink-400">• pop() → Remove from top</div>
                    <div className="text-gray-500">• size: {moveStack.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Made by Ansh, Shubham, Aniket</p>
        </div>
      </div>
    </div>
  );
}