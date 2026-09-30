import { FC, useMemo, useState } from 'react';
import { calculateControlMap } from '../core/controlMap';
import { xiangqiControlAdapter } from '../games/xiangqi/controlAdapter';
import { createInitialXiangqiBoard } from '../games/xiangqi/initialBoard';
import { applyXiangqiMove, getCheckThreats, getIllegalMoveReason, getLegalMovesForPiece, hasAnyLegalMove, isGeneralInCheck } from '../games/xiangqi/legalRules';
import { XiangqiColor, XiangqiPiece, XiangqiPieceType } from '../games/xiangqi/types';

const labels: Record<XiangqiPieceType, { red: string; black: string }> = {
  general: { red: '帅', black: '将' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse: { red: '马', black: '马' },
  chariot: { red: '车', black: '车' },
  cannon: { red: '炮', black: '炮' },
  soldier: { red: '兵', black: '卒' },
};

const AttackIcon: FC = () => (
  <svg viewBox='0 0 16 16' className='h-3 w-3' aria-hidden='true'>
    <path d='M2 4.5 5.5 8 2 11.5M7 4.5 10.5 8 7 11.5M11 8h3' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
);

const DefenseIcon: FC = () => (
  <svg viewBox='0 0 16 16' className='h-3 w-3' aria-hidden='true'>
    <path d='M8 1.8 13 3.6v3.7c0 3.1-1.9 5.4-5 6.9-3.1-1.5-5-3.8-5-6.9V3.6L8 1.8Z' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinejoin='round' />
  </svg>
);

export const XiangqiBoard: FC = () => {
  const [board, setBoard] = useState<(XiangqiPiece | null)[][]>(() => createInitialXiangqiBoard());
  const [editMode, setEditMode] = useState(false);
  const [showControl, setShowControl] = useState(true);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [inspected, setInspected] = useState<{ row: number; col: number } | null>(null);
  const [turn, setTurn] = useState<XiangqiColor>('red');
  const [winner, setWinner] = useState<XiangqiColor | null>(null);
  const [lastMove, setLastMove] = useState<{ from: { row: number; col: number }; to: { row: number; col: number } } | null>(null);
  const [moveMessage, setMoveMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{
    board: (XiangqiPiece | null)[][];
    turn: XiangqiColor;
    lastMove: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
  }>>([]);
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

  const legalMoves = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(
      getLegalMovesForPiece(board, selected.row, selected.col)
        .map((p) => `${p.row}-${p.col}`)
    );
  }, [board, selected]);

  const inCheck = !editMode && !winner && isGeneralInCheck(board, turn);
  const checkThreats = useMemo(() => inCheck ? getCheckThreats(board, turn) : [], [board, turn, inCheck]);
  const checkingAttackers = useMemo(() => new Set(checkThreats.map((threat) => `${threat.attacker.row}-${threat.attacker.col}`)), [checkThreats]);
  const checkingTargets = useMemo(() => new Set(checkThreats.map((threat) => `${threat.target.row}-${threat.target.col}`)), [checkThreats]);
  const checkingPath = useMemo(() => new Set(checkThreats.flatMap((threat) => threat.path.map((point) => `${point.row}-${point.col}`))), [checkThreats]);

  const handlePointClick = (row: number, col: number) => {
    setInspected({ row, col });
    const piece = board[row][col];

    if (winner && !editMode) return;

    if (editMode && selected) {
      if (selected.row === row && selected.col === col) {
        setSelected(null);
        return;
      }
      const next = board.map((boardRow) => [...boardRow]);
      next[row][col] = next[selected.row][selected.col];
      next[selected.row][selected.col] = null;
      setBoard(next);
      setSelected(null);
      return;
    }

    if (selected) {
      const movingPiece = board[selected.row][selected.col];
      const targetKey = `${row}-${col}`;
      if (movingPiece && legalMoves.has(targetKey)) {
        const from = { ...selected };
        const to = { row, col };
        const next = applyXiangqiMove(board, from, to);
        const opponent: XiangqiColor = movingPiece.color === 'red' ? 'black' : 'red';
        setHistory((items) => [...items, {
          board: board.map((boardRow) => [...boardRow]),
          turn,
          lastMove,
        }]);
        setBoard(next);
        setSelected(null);
        setInspected({ row, col });
        setLastMove({ from, to });
        setMoveMessage(null);
        setTurn(opponent);
        if (!hasAnyLegalMove(next, opponent)) setWinner(movingPiece.color);
        return;
      }
      if (movingPiece) {
        const reason = getIllegalMoveReason(board, selected, { row, col });
        if (reason) {
          setMoveMessage(reason);
          return;
        }
      }
    }

    setMoveMessage(null);
    setSelected(piece && piece.color === turn ? { row, col } : null);
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setBoard(previous.board.map((boardRow) => [...boardRow]));
    setTurn(previous.turn);
    setLastMove(previous.lastMove);
    setHistory((items) => items.slice(0, -1));
    setSelected(null);
    setInspected(null);
    setMoveMessage(null);
    setWinner(null);
  };

  const reset = () => {
    setBoard(createInitialXiangqiBoard());
    setSelected(null);
    setInspected(null);
    setTurn('red');
    setWinner(null);
    setLastMove(null);
    setMoveMessage(null);
    setHistory([]);
  };

  const inspectedControl = inspected ? control[inspected.row][inspected.col] : null;
  const describe = (pieces: { type: XiangqiPieceType }[]) => {
    const counts = pieces.reduce<Record<string, number>>((acc, piece) => {
      const name = labels[piece.type].red === labels[piece.type].black ? labels[piece.type].red : labels[piece.type].red + '/' + labels[piece.type].black;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => `${name}×${count}`).join('、') || '无';
  };

  const pointSize = 48;
  const boardPadding = 28;
  const boardWidth = pointSize * 8;
  const boardHeight = pointSize * 9;

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-3'>
        <h2 className='font-serif text-xl font-semibold tracking-[0.12em] text-amber-100'>中国象棋 · 棋势</h2>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${turn === 'red' ? 'border-red-700/70 text-red-300' : 'border-stone-500 text-stone-200'}`}>{turn === 'red' ? '红方行棋' : '黑方行棋'}</span>
        {inCheck && <span className='rounded-full border border-orange-500/80 bg-orange-950/50 px-2 py-0.5 text-xs font-semibold text-orange-300'>将军 · 必须应将</span>}
        {winner && <span className='rounded-full border border-amber-400/80 bg-amber-950/60 px-2 py-0.5 text-xs font-semibold text-amber-200'>{winner === 'red' ? '红方' : '黑方'}胜</span>}
      </div>

      <div className='flex flex-col items-start gap-4 min-[900px]:flex-row'>
        <div className='w-full overflow-auto pb-3 min-[900px]:w-auto'>
        <div className='mx-auto w-fit rounded-[18px] border border-[#5f3b20] bg-[#9a6338] p-2 shadow-[0_22px_55px_rgba(0,0,0,0.38)]'>
          <div
            className='relative overflow-hidden rounded-[11px] border-[3px] border-[#704523] bg-[#d9ad70] shadow-[inset_0_0_28px_rgba(92,55,25,0.22)]'
            style={{ width: boardWidth + boardPadding * 2, height: boardHeight + boardPadding * 2 }}
          >
            <div className='pointer-events-none absolute inset-0 opacity-[0.13]' style={{ backgroundImage: 'repeating-linear-gradient(7deg, transparent 0, transparent 13px, rgba(90,54,25,.25) 14px, transparent 15px)' }} />

            <svg className='pointer-events-none absolute' style={{ left: boardPadding, top: boardPadding }} width={boardWidth} height={boardHeight} viewBox={`0 0 ${boardWidth} ${boardHeight}`}>
              <g stroke='#5d351c' strokeWidth='1.35' fill='none'>
                {Array.from({ length: 10 }).map((_, r) => <line key={`h-${r}`} x1='0' y1={r * pointSize} x2={boardWidth} y2={r * pointSize} />)}
                {Array.from({ length: 9 }).map((_, col) => (
                  col === 0 || col === 8
                    ? <line key={`v-${col}`} x1={col * pointSize} y1='0' x2={col * pointSize} y2={boardHeight} />
                    : <g key={`v-${col}`}><line x1={col * pointSize} y1='0' x2={col * pointSize} y2={4 * pointSize} /><line x1={col * pointSize} y1={5 * pointSize} x2={col * pointSize} y2={boardHeight} /></g>
                ))}
                <line x1={3 * pointSize} y1='0' x2={5 * pointSize} y2={2 * pointSize} />
                <line x1={5 * pointSize} y1='0' x2={3 * pointSize} y2={2 * pointSize} />
                <line x1={3 * pointSize} y1={7 * pointSize} x2={5 * pointSize} y2={9 * pointSize} />
                <line x1={5 * pointSize} y1={7 * pointSize} x2={3 * pointSize} y2={9 * pointSize} />
              </g>
              <g fill='#68401f' fontFamily='serif' fontSize='21' fontWeight='600' letterSpacing='5'>
                <text x={boardWidth * 0.24} y={4.72 * pointSize} textAnchor='middle'>楚河</text>
                <text x={boardWidth * 0.76} y={4.72 * pointSize} textAnchor='middle'>汉界</text>
              </g>
            </svg>

            {board.map((row, rowIndex) => row.map((piece, colIndex) => {
              const cell = control[rowIndex][colIndex];
              const key = `${rowIndex}-${colIndex}`;
              const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
              const selectedControl = selectedSquares.has(key);
              const red = cell.counts.red;
              const black = cell.counts.black;
              const contested = red > 0 && black > 0;
              const legalMove = legalMoves.has(key);
              const captureTarget = legalMove && Boolean(piece) && piece?.color !== board[selected?.row ?? rowIndex]?.[selected?.col ?? colIndex]?.color;
              const wasLastFrom = lastMove?.from.row === rowIndex && lastMove?.from.col === colIndex;
              const wasLastTo = lastMove?.to.row === rowIndex && lastMove?.to.col === colIndex;
              const isCheckingAttacker = checkingAttackers.has(key);
              const isCheckedGeneral = checkingTargets.has(key);
              const isCheckPath = checkingPath.has(key);
              const attackCount = piece ? (piece.color === 'red' ? black : red) : 0;
              const defenseCount = piece ? (piece.color === 'red' ? red : black) : 0;
              return (
                <button
                  key={key}
                  onClick={() => handlePointClick(rowIndex, colIndex)}
                  className='absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none'
                  style={{ left: boardPadding + colIndex * pointSize, top: boardPadding + rowIndex * pointSize }}
                  title={piece ? `${piece.color === 'red' ? '红' : '黑'}方${labels[piece.type][piece.color]}` : undefined}
                >
                  {(wasLastFrom || wasLastTo) && <span className={`pointer-events-none absolute h-10 w-10 rounded-full border-2 ${wasLastTo ? 'border-amber-700/80' : 'border-amber-700/45 border-dashed'}`} />}
                  {isCheckPath && <span className='pointer-events-none absolute h-7 w-7 rounded-full bg-orange-500/18 ring-1 ring-orange-700/40' />}
                  {isCheckingAttacker && <span className='pointer-events-none absolute h-[48px] w-[48px] rounded-full border-[3px] border-orange-600/90 shadow-[0_0_10px_rgba(234,88,12,.45)]' />}
                  {isCheckedGeneral && <span className='pointer-events-none absolute h-[50px] w-[50px] rounded-full border-[3px] border-red-700/95 shadow-[0_0_12px_rgba(185,28,28,.55)]' />}
                  {showControl && (red > 0 || black > 0) && !piece && (
                    <span className={`absolute h-3.5 w-3.5 rounded-full border-2 ${contested ? 'border-violet-700 bg-violet-200/75' : red > 0 ? 'border-[#a42b24] bg-red-100/75' : 'border-stone-800 bg-stone-200/80'}`}>
                      {(red + black) > 1 && <span className='absolute -right-2 -top-2 rounded-full bg-[#f2d9ad] px-1 text-[8px] font-bold leading-3 text-stone-800 shadow'>{red + black}</span>}
                    </span>
                  )}
                  {legalMove && !piece && <span className='absolute z-20 h-3 w-3 rounded-full bg-emerald-700 shadow-[0_0_0_3px_rgba(240,211,155,.8)]' />}
                  {captureTarget && <span className='absolute z-20 h-[46px] w-[46px] rounded-full border-[3px] border-red-700/90 shadow-[0_0_9px_rgba(153,27,27,.45)]' />}
                  {selectedControl && !legalMove && !piece && <span className='absolute h-5 w-5 rounded-full border-2 border-amber-500 bg-amber-200/25 shadow-[0_0_9px_rgba(245,158,11,.65)]' />}
                  {piece && (
                    <>
                      {selectedControl && <span className='absolute h-[46px] w-[46px] rounded-full border-[3px] border-amber-400/90 shadow-[0_0_12px_rgba(245,158,11,.55)]' />}
                      <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-[2px] bg-[#f0d39b] font-serif text-xl font-bold shadow-[0_3px_5px_rgba(65,36,17,.42),inset_0_0_0_2px_rgba(255,246,218,.5)] ${piece.color === 'red' ? 'border-[#9d2d24] text-[#a5231c]' : 'border-[#342a22] text-[#27221e]'} ${isSelected ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#d9ad70]' : ''}`}>
                        {labels[piece.type][piece.color]}
                      </span>
                      {showControl && (
                        <>
                          <span
                            className='absolute -bottom-2 -left-2 z-30 flex h-5 min-w-7 items-center justify-center gap-0.5 rounded-full border border-[#9a5a42] bg-[#f3ddb5] px-1 text-[9px] font-bold text-[#9b2c20] shadow'
                            title={`被对方攻击 ${attackCount} 次`}
                          >
                            <AttackIcon /><span>{attackCount}</span>
                          </span>
                          <span
                            className='absolute -bottom-2 -right-2 z-30 flex h-5 min-w-7 items-center justify-center gap-0.5 rounded-full border border-[#7b6b4e] bg-[#f3ddb5] px-1 text-[9px] font-bold text-[#3f4a34] shadow'
                            title={`被己方保护 ${defenseCount} 次`}
                          >
                            <DefenseIcon /><span>{defenseCount}</span>
                          </span>
                        </>
                      )}
                    </>
                  )}
                </button>
              );
            }))}
          </div>
        </div>
        </div>

        <aside className='flex w-full flex-col gap-3 min-[900px]:w-64 min-[900px]:shrink-0'>
          <div className='grid grid-cols-2 gap-2 min-[900px]:grid-cols-1'>
            <button onClick={() => { setEditMode((v) => !v); setSelected(null); }} className={`rounded-lg border px-3 py-2 text-sm transition ${editMode ? 'border-amber-500/70 bg-amber-800/60 text-amber-100' : 'border-stone-600 bg-stone-800 text-stone-200 hover:bg-stone-700'}`}>
              {editMode ? '结束摆棋' : '摆棋模式'}
            </button>
            <button onClick={undo} disabled={history.length === 0} className='rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-200 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40'>
              悔棋撤销{history.length > 0 ? ` · ${history.length}` : ''}
            </button>
            <button onClick={reset} className='rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-200 transition hover:bg-stone-700'>重置局面</button>
            <button onClick={() => setShowControl((v) => !v)} className='rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-200 transition hover:bg-stone-700'>
              {showControl ? '隐藏势力提示' : '显示势力提示'}
            </button>
          </div>

          <div className='rounded-xl border border-stone-700/70 bg-stone-900/55 p-3 text-xs leading-5 text-stone-400'>
            <div className='mb-1 font-medium text-stone-200'>读盘提示</div>
            <div className='flex items-center gap-2'><span className='inline-flex items-center gap-1 text-[#d4775f]'><AttackIcon />数字</span><span>棋子被对方攻击次数</span></div>
            <div className='flex items-center gap-2'><span className='inline-flex items-center gap-1 text-[#879270]'><DefenseIcon />数字</span><span>棋子被己方保护次数</span></div>
            <div className='mt-1'>绿点：合法移动 · 红圈：合法吃子 · 浅棕：上一手 · 橙色：将军线路</div>
          </div>

          {moveMessage && (
            <div className='rounded-xl border border-orange-700/60 bg-orange-950/35 px-3 py-2 text-xs text-orange-200'>
              此处不能落子：{moveMessage}
            </div>
          )}
          {inspected && inspectedControl && (
            <div className='rounded-xl border border-stone-700/70 bg-stone-900/60 px-3 py-2 text-xs leading-5 text-stone-300'>
              <div className='text-stone-400'>交点 ({inspected.col + 1}, {10 - inspected.row})</div>
              <div className='text-red-400'>红方 {inspectedControl.counts.red}（{describe(inspectedControl.pieces.red)}）</div>
              <div className='text-stone-200'>黑方 {inspectedControl.counts.black}（{describe(inspectedControl.pieces.black)}）</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );};
