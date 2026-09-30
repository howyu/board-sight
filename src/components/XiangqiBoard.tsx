import { FC, useMemo, useState } from 'react';
import { calculateControlMap } from '../core/controlMap';
import { xiangqiControlAdapter } from '../games/xiangqi/controlAdapter';
import { createInitialXiangqiBoard } from '../games/xiangqi/initialBoard';
import { XiangqiPiece, XiangqiPieceType } from '../games/xiangqi/types';

const labels: Record<XiangqiPieceType, { red: string; black: string }> = {
  general: { red: '帅', black: '将' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse: { red: '马', black: '马' },
  chariot: { red: '车', black: '车' },
  cannon: { red: '炮', black: '炮' },
  soldier: { red: '兵', black: '卒' },
};

export const XiangqiBoard: FC = () => {
  const [board] = useState<(XiangqiPiece | null)[][]>(() => createInitialXiangqiBoard());
  const [showControl, setShowControl] = useState(true);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const control = useMemo(() => calculateControlMap(board, xiangqiControlAdapter), [board]);
  const selectedSquares = useMemo(() => {
    if (!selected) return new Set<string>();
    const piece = board[selected.row][selected.col];
    if (!piece) return new Set<string>();
    return new Set(
      xiangqiControlAdapter
        .getControlledSquares(board, selected.row, selected.col, piece)
        .map((p) => `${p.row}-${p.col}`)
    );
  }, [board, selected]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h2 className='text-gray-100 font-semibold'>中国象棋 · 势力图</h2>
          <p className='text-xs text-gray-400'>点击棋子查看单子控制范围；数字表示双方控制该点的棋子数。</p>
        </div>
        <button
          onClick={() => setShowControl((v) => !v)}
          className='px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-100'
        >
          {showControl ? '隐藏全局势力' : '显示全局势力'}
        </button>
      </div>

      <div className='overflow-auto pb-2'>
        <div className='relative min-w-[396px] w-fit mx-auto bg-amber-100 border-4 border-amber-900 p-3'>
          <div className='absolute left-3 right-3 top-1/2 -translate-y-1/2 h-[44px] bg-amber-50 border-y border-amber-800 flex items-center justify-around text-amber-900 text-sm tracking-[0.35em] pointer-events-none'>
            <span>楚 河</span><span>汉 界</span>
          </div>
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className='flex'>
              {row.map((piece, colIndex) => {
                const cell = control[rowIndex][colIndex];
                const key = `${rowIndex}-${colIndex}`;
                const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
                const selectedControl = selectedSquares.has(key);
                const red = cell.counts.red;
                const black = cell.counts.black;
                const controlClass = !showControl
                  ? ''
                  : red > black
                    ? 'bg-red-400/25'
                    : black > red
                      ? 'bg-slate-600/25'
                      : red > 0
                        ? 'bg-purple-500/25'
                        : '';

                return (
                  <button
                    key={key}
                    onClick={() => setSelected(piece ? { row: rowIndex, col: colIndex } : null)}
                    className={`relative w-11 h-11 border border-amber-800/50 flex items-center justify-center ${controlClass} ${selectedControl ? 'ring-2 ring-inset ring-yellow-500' : ''} ${isSelected ? 'ring-2 ring-inset ring-cyan-500' : ''}`}
                    title={piece ? `${piece.color === 'red' ? '红' : '黑'}方${labels[piece.type][piece.color]}` : undefined}
                  >
                    {piece && (
                      <span className={`z-10 w-9 h-9 rounded-full bg-amber-50 border-2 flex items-center justify-center font-serif font-bold text-lg shadow-sm ${piece.color === 'red' ? 'text-red-700 border-red-700' : 'text-gray-900 border-gray-900'}`}>
                        {labels[piece.type][piece.color]}
                      </span>
                    )}
                    {showControl && (red > 0 || black > 0) && (
                      <span className='absolute bottom-0 right-0 text-[8px] leading-none bg-amber-50/80 px-0.5 text-gray-800'>
                        {red > 0 ? `R${red}` : ''}{red > 0 && black > 0 ? '/' : ''}{black > 0 ? `B${black}` : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className='text-xs text-gray-400 text-center'>红色：红方控制 · 灰黑：黑方控制 · 紫色：双方控制 · 黄色边框：当前棋子的控制点</div>
    </div>
  );
};
