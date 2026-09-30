import { FC, useEffect, useMemo, useState } from 'react';
import { calculateControlMap } from '../core/controlMap';
import { xiangqiControlAdapter } from '../games/xiangqi/controlAdapter';
import { createInitialXiangqiBoard } from '../games/xiangqi/initialBoard';
import { applyXiangqiMove, getCheckThreats, getIllegalMoveReason, getLegalMovesForPiece, hasAnyLegalMove, isGeneralInCheck } from '../games/xiangqi/legalRules';
import { formatXiangqiMove } from '../games/xiangqi/notation';
import { XiangqiColor, XiangqiPiece, XiangqiPieceType } from '../games/xiangqi/types';
import { getOpeningBookSuggestions } from '../games/xiangqi/openingBook';
import { analyzeWithPikafish, warmupPikafish } from '../engine/pikafishClient';

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
  <svg viewBox='0 0 18 18' className='h-3 w-3' aria-hidden='true'>
    <path d='M3 2.5 13.5 13M5.2 2.4 3 2.5l.1 2.2M12.8 12.3l2.5 2.5M15 13.2l-1.8 1.8M15 2.5 4.5 13M12.8 2.4l2.2.1-.1 2.2M5.2 12.3l-2.5 2.5M3 13.2 4.8 15' fill='none' stroke='currentColor' strokeWidth='1.55' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
);

const DefenseIcon: FC<{ compact?: boolean }> = ({ compact = false }) => (
  <svg viewBox='0 0 16 16' className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} aria-hidden='true'>
    <path d='M8 1.8 13 3.6v3.7c0 3.1-1.9 5.4-5 6.9-3.1-1.5-5-3.8-5-6.9V3.6L8 1.8Z' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinejoin='round' />
  </svg>
);

interface MoveSuggestion {
  notation: string;
  score: number;
  tags: string[];
  replyNotation?: string;
  depth?: number;
  pv?: string[];
  source: 'book' | 'pikafish';
  from: { row: number; col: number };
  to: { row: number; col: number };
}

const CountMarks: FC<{ count: number; kind: 'attack' | 'defense' }> = ({ count, kind }) => {
  if (count <= 0) return null;
  const Icon = kind === 'attack' ? AttackIcon : DefenseIcon;
  const tone = kind === 'attack' ? 'text-[#a5231c]' : 'text-[#45513d]';
  if (count <= 3) {
    return (
      <span className={`flex flex-col items-center -space-y-1.5 ${tone}`} aria-label={`${kind === 'attack' ? '被攻击' : '被保护'} ${count} 次`}>
        {Array.from({ length: count }).map((_, index) => <Icon key={index} compact />)}
      </span>
    );
  }
  return (
    <span className={`flex flex-col items-center gap-0 ${tone}`} aria-label={`${kind === 'attack' ? '被攻击' : '被保护'} ${count} 次`}>
      <Icon /><span className='text-[8px] font-bold leading-none'>{count}</span>
    </span>
  );
};

interface XiangqiMoveRecord {
  notation: string;
  color: XiangqiColor;
  boardAfter: (XiangqiPiece | null)[][];
  nextTurn: XiangqiColor;
  from: { row: number; col: number };
  to: { row: number; col: number };
}

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
  const [suggestions, setSuggestions] = useState<MoveSuggestion[]>([]);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisPreview, setAnalysisPreview] = useState<number | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [engineWarm, setEngineWarm] = useState(false);
  const [engineWarmError, setEngineWarmError] = useState(false);
  const [moveRecords, setMoveRecords] = useState<XiangqiMoveRecord[]>([]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{
    board: (XiangqiPiece | null)[][];
    turn: XiangqiColor;
    lastMove: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
  }>>([]);
  const displayBoard = reviewIndex === null ? board : moveRecords[reviewIndex]?.boardAfter ?? board;
  const displayTurn = reviewIndex === null ? turn : moveRecords[reviewIndex]?.nextTurn ?? turn;
  const displayLastMove = reviewIndex === null
    ? lastMove
    : moveRecords[reviewIndex]
      ? { from: moveRecords[reviewIndex].from, to: moveRecords[reviewIndex].to }
      : lastMove;
  const control = useMemo(() => calculateControlMap(displayBoard, xiangqiControlAdapter), [displayBoard]);
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

  const inCheck = !editMode && (reviewIndex !== null || !winner) && isGeneralInCheck(displayBoard, displayTurn);
  const checkThreats = useMemo(() => inCheck ? getCheckThreats(displayBoard, displayTurn) : [], [displayBoard, displayTurn, inCheck]);
  const checkingAttackers = useMemo(() => new Set(checkThreats.map((threat) => `${threat.attacker.row}-${threat.attacker.col}`)), [checkThreats]);
  const checkingTargets = useMemo(() => new Set(checkThreats.map((threat) => `${threat.target.row}-${threat.target.col}`)), [checkThreats]);
  const checkingPath = useMemo(() => new Set(checkThreats.flatMap((threat) => threat.path.map((point) => `${point.row}-${point.col}`))), [checkThreats]);

  useEffect(() => {
    let active = true;
    warmupPikafish()
      .then(() => {
        if (active) setEngineWarm(true);
      })
      .catch(() => {
        if (active) setEngineWarmError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePointClick = (row: number, col: number) => {
    setInspected({ row, col });
    if (reviewIndex !== null) return;
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
      setLastMove(null);
      setHistory([]);
      setMoveRecords([]);
      setReviewIndex(null);
      setWinner(null);
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
        const notation = formatXiangqiMove(movingPiece, from, to);
        setHistory((items) => [...items, {
          board: board.map((boardRow) => [...boardRow]),
          turn,
          lastMove,
        }]);
        setMoveRecords((items) => [...items, {
          notation,
          color: movingPiece.color,
          boardAfter: next.map((boardRow) => [...boardRow]),
          nextTurn: opponent,
          from,
          to,
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

  const analyzeCurrentPosition = async () => {
    if (winner || editMode || reviewIndex !== null) return;
    setAnalysisBusy(true);
    setAnalysisPreview(null);
    setAnalysisError(null);
    setSuggestions([]);

    const bookSuggestions = getOpeningBookSuggestions(
      board,
      turn,
      moveRecords.map((move) => move.notation),
    );
    if (bookSuggestions.length > 0) {
      setSuggestions(bookSuggestions.map((suggestion) => ({
        notation: suggestion.notation,
        score: 0,
        tags: ['开局库', suggestion.label],
        source: 'book' as const,
        from: suggestion.from,
        to: suggestion.to,
      })));
      setAnalysisBusy(false);
      return;
    }

    try {
      const engineSuggestions = await analyzeWithPikafish(board, turn, { movetime: 2400, multiPv: 3 });
      const mapped: MoveSuggestion[] = engineSuggestions.map((suggestion) => {
        const piece = board[suggestion.from.row]?.[suggestion.from.col];
        if (!piece) {
          return {
            notation: suggestion.move,
            score: suggestion.scoreCp ?? 0,
            tags: ['Pikafish'],
            source: 'pikafish' as const,
            depth: suggestion.depth,
            pv: suggestion.pv,
            from: suggestion.from,
            to: suggestion.to,
          };
        }

        const firstMoveBoard = applyXiangqiMove(board, suggestion.from, suggestion.to);
        let replyNotation: string | undefined;
        const reply = suggestion.pv[1];
        if (reply && /^[a-i][0-9][a-i][0-9]$/.test(reply)) {
          const file = (sq: string) => sq.charCodeAt(0) - 97;
          const row = (sq: string) => 9 - Number(sq[1]);
          const replyFrom = { row: row(reply.slice(0, 2)), col: file(reply.slice(0, 2)) };
          const replyTo = { row: row(reply.slice(2, 4)), col: file(reply.slice(2, 4)) };
          const replyPiece = firstMoveBoard[replyFrom.row]?.[replyFrom.col];
          if (replyPiece) replyNotation = formatXiangqiMove(replyPiece, replyFrom, replyTo);
        }

        const tags: string[] = ['Pikafish'];
        if (board[suggestion.to.row][suggestion.to.col]) tags.push('吃子');

        return {
          notation: formatXiangqiMove(piece, suggestion.from, suggestion.to),
          score: suggestion.mate
            ? (suggestion.mate > 0 ? 1_000_000 - suggestion.mate : -1_000_000 - suggestion.mate)
            : suggestion.scoreCp ?? 0,
          tags: tags.slice(0, 2),
          source: 'pikafish' as const,
          replyNotation,
          depth: suggestion.depth,
          pv: suggestion.pv,
          from: suggestion.from,
          to: suggestion.to,
        };
      });

      setSuggestions(mapped);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Pikafish 分析失败。');
    } finally {
      setAnalysisBusy(false);
    }
  };
  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setBoard(previous.board.map((boardRow) => [...boardRow]));
    setTurn(previous.turn);
    setLastMove(previous.lastMove);
    setHistory((items) => items.slice(0, -1));
    setMoveRecords((items) => items.slice(0, -1));
    setReviewIndex(null);
    setSelected(null);
    setInspected(null);
    setMoveMessage(null);
    setWinner(null);
    setSuggestions([]);
    setAnalysisPreview(null);
    setAnalysisError(null);
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
    setMoveRecords([]);
    setReviewIndex(null);
    setSuggestions([]);
    setAnalysisPreview(null);
    setAnalysisError(null);
  };

  const inspectedControl = inspected ? control[inspected.row][inspected.col] : null;
  const dangerPieces = useMemo(() => {
    const items: Array<{
      row: number;
      col: number;
      piece: XiangqiPiece;
      attack: number;
      defense: number;
      severity: 'high' | 'medium';
    }> = [];
    displayBoard.forEach((row, rowIndex) => row.forEach((piece, colIndex) => {
      if (!piece || piece.type === 'general') return;
      const cell = control[rowIndex][colIndex];
      const attack = piece.color === 'red' ? cell.counts.black : cell.counts.red;
      const defense = piece.color === 'red' ? cell.counts.red : cell.counts.black;
      if (attack <= 0) return;
      if (defense === 0 || attack > defense) {
        items.push({
          row: rowIndex,
          col: colIndex,
          piece,
          attack,
          defense,
          severity: defense === 0 ? 'high' : 'medium',
        });
      }
    }));
    return items
      .sort((a, b) => Number(b.severity === 'high') - Number(a.severity === 'high') || (b.attack - b.defense) - (a.attack - a.defense))
      .slice(0, 6);
  }, [displayBoard, control]);
  const describe = (pieces: { type: XiangqiPieceType }[]) => {
    const counts = pieces.reduce<Record<string, number>>((acc, piece) => {
      const name = labels[piece.type].red === labels[piece.type].black ? labels[piece.type].red : labels[piece.type].red + '/' + labels[piece.type].black;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => `${name}×${count}`).join('、') || '无';
  };

  const pointSize = 64;
  const boardPadding = 38;
  const boardWidth = pointSize * 8;
  const boardHeight = pointSize * 9;

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-3'>
        <h2 className='font-serif text-xl font-semibold tracking-[0.12em] text-amber-100'>中国象棋 · 棋势</h2>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${turn === 'red' ? 'border-red-700/70 text-red-300' : 'border-stone-500 text-stone-200'}`}>{turn === 'red' ? '红方行棋' : '黑方行棋'}</span>
        {inCheck && <span className='rounded-full border border-orange-500/80 bg-orange-950/50 px-2 py-0.5 text-xs font-semibold text-orange-300'>将军 · 必须应将</span>}
        {winner && reviewIndex === null && <span className='rounded-full border border-amber-400/80 bg-amber-950/60 px-2 py-0.5 text-xs font-semibold text-amber-200'>{winner === 'red' ? '红方' : '黑方'}胜</span>}
        {reviewIndex !== null && <span className='rounded-full border border-sky-600/70 bg-sky-950/40 px-2 py-0.5 text-xs text-sky-200'>回看第 {reviewIndex + 1} 手</span>}
      </div>

      <div className='flex flex-col items-start gap-4 min-[900px]:flex-row'>
        <div className='w-full overflow-auto pb-3 min-[900px]:w-auto'>
        <div className='mx-auto w-fit rounded-[18px] border border-[#5f3b20] bg-[#9a6338] p-2 shadow-[0_22px_55px_rgba(0,0,0,0.38)]'>
          <div
            className='relative overflow-hidden rounded-[11px] border-[3px] border-[#704523] bg-[#d9ad70] shadow-[inset_0_0_28px_rgba(92,55,25,0.22)]'
            style={{ width: boardWidth + boardPadding * 2, height: boardHeight + boardPadding * 2 }}
          >
            <div className='pointer-events-none absolute inset-0 opacity-[0.13]' style={{ backgroundImage: 'repeating-linear-gradient(7deg, transparent 0, transparent 13px, rgba(90,54,25,.25) 14px, transparent 15px)' }} />

            <svg className='pointer-events-none absolute overflow-visible' style={{ left: boardPadding, top: boardPadding }} width={boardWidth} height={boardHeight} viewBox={`0 0 ${boardWidth} ${boardHeight}`}>
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
              <g fill='#6f4526' fontFamily='serif' fontSize='12' fontWeight='700'>
                {['1','2','3','4','5','6','7','8','9'].map((label, col) => (
                  <text key={`black-file-${label}`} x={col * pointSize} y='-13' textAnchor='middle'>{label}</text>
                ))}
                {['九','八','七','六','五','四','三','二','一'].map((label, col) => (
                  <text key={`red-file-${label}`} x={col * pointSize} y={boardHeight + 22} textAnchor='middle'>{label}</text>
                ))}
              </g>
            </svg>

            {displayBoard.map((row, rowIndex) => row.map((piece, colIndex) => {
              const cell = control[rowIndex][colIndex];
              const key = `${rowIndex}-${colIndex}`;
              const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
              const selectedControl = selectedSquares.has(key);
              const red = cell.counts.red;
              const black = cell.counts.black;
              const contested = red > 0 && black > 0;
              const legalMove = legalMoves.has(key);
              const captureTarget = reviewIndex === null && legalMove && Boolean(piece) && piece?.color !== board[selected?.row ?? rowIndex]?.[selected?.col ?? colIndex]?.color;
              const wasLastFrom = displayLastMove?.from.row === rowIndex && displayLastMove?.from.col === colIndex;
              const wasLastTo = displayLastMove?.to.row === rowIndex && displayLastMove?.to.col === colIndex;
              const isCheckingAttacker = checkingAttackers.has(key);
              const isCheckedGeneral = checkingTargets.has(key);
              const isCheckPath = checkingPath.has(key);
              const previewMove = analysisPreview === null ? null : suggestions[analysisPreview];
              const isAnalysisFrom = previewMove?.from.row === rowIndex && previewMove?.from.col === colIndex;
              const isAnalysisTo = previewMove?.to.row === rowIndex && previewMove?.to.col === colIndex;
              const attackCount = piece ? (piece.color === 'red' ? black : red) : 0;
              const defenseCount = piece ? (piece.color === 'red' ? red : black) : 0;
              return (
                <button
                  key={key}
                  onClick={() => handlePointClick(rowIndex, colIndex)}
                  className='absolute z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none'
                  style={{ left: boardPadding + colIndex * pointSize, top: boardPadding + rowIndex * pointSize }}
                  title={piece ? `${piece.color === 'red' ? '红' : '黑'}方${labels[piece.type][piece.color]}` : undefined}
                >
                  {(wasLastFrom || wasLastTo) && <span className={`pointer-events-none absolute h-10 w-10 rounded-full border-2 ${wasLastTo ? 'border-amber-700/80' : 'border-amber-700/45 border-dashed'}`} />}
                  {isAnalysisFrom && <span className='pointer-events-none absolute h-[54px] w-[54px] rounded-full border-2 border-sky-700/70 border-dashed' />}
                  {isAnalysisTo && <span className='pointer-events-none absolute h-[30px] w-[30px] rounded-full border-2 border-sky-600/90 bg-sky-200/15' />}
                  {isCheckPath && <span className='pointer-events-none absolute h-7 w-7 rounded-full bg-orange-500/18 ring-1 ring-orange-700/40' />}
                  {isCheckingAttacker && <span className='pointer-events-none absolute h-[58px] w-[58px] rounded-full border-[3px] border-orange-600/90 shadow-[0_0_10px_rgba(234,88,12,.45)]' />}
                  {isCheckedGeneral && <span className='pointer-events-none absolute h-[60px] w-[60px] rounded-full border-[3px] border-red-700/95 shadow-[0_0_12px_rgba(185,28,28,.55)]' />}
                  {showControl && (red > 0 || black > 0) && !piece && (
                    <span className={`absolute h-3.5 w-3.5 rounded-full border-2 ${contested ? 'border-violet-700 bg-violet-200/75' : red > 0 ? 'border-[#a42b24] bg-red-100/75' : 'border-stone-800 bg-stone-200/80'}`}>
                      {(red + black) > 1 && <span className='absolute -right-2 -top-2 rounded-full bg-[#f2d9ad] px-1 text-[8px] font-bold leading-3 text-stone-800 shadow'>{red + black}</span>}
                    </span>
                  )}
                  {reviewIndex === null && legalMove && !piece && <span className='absolute z-20 h-3 w-3 rounded-full bg-emerald-700 shadow-[0_0_0_3px_rgba(240,211,155,.8)]' />}
                  {captureTarget && <span className='absolute z-20 h-[46px] w-[46px] rounded-full border-[3px] border-red-700/90 shadow-[0_0_9px_rgba(153,27,27,.45)]' />}
                  {selectedControl && !legalMove && !piece && <span className='absolute h-5 w-5 rounded-full border-2 border-amber-500 bg-amber-200/25 shadow-[0_0_9px_rgba(245,158,11,.65)]' />}
                  {piece && (
                    <>
                      {selectedControl && <span className='absolute h-[46px] w-[46px] rounded-full border-[3px] border-amber-400/90 shadow-[0_0_12px_rgba(245,158,11,.55)]' />}
                      <span className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-[2px] bg-[#f0d39b] font-serif text-[20px] font-bold shadow-[0_3px_5px_rgba(65,36,17,.42),inset_0_0_0_2px_rgba(255,246,218,.5)] ${piece.color === 'red' ? 'border-[#9d2d24] text-[#a5231c]' : 'border-[#342a22] text-[#27221e]'} ${isSelected ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#d9ad70]' : ''}`}>
                        {showControl && attackCount > 0 && (
                          <span className='pointer-events-none absolute left-1 top-1/2 z-20 -translate-y-1/2' title={`被对方攻击 ${attackCount} 次`}>
                            <CountMarks count={attackCount} kind='attack' />
                          </span>
                        )}
                        <span className='relative z-10'>{labels[piece.type][piece.color]}</span>
                        {showControl && defenseCount > 0 && (
                          <span className='pointer-events-none absolute right-1 top-1/2 z-20 -translate-y-1/2' title={`被己方保护 ${defenseCount} 次`}>
                            <CountMarks count={defenseCount} kind='defense' />
                          </span>
                        )}
                      </span>
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

          <div className='rounded-xl border border-sky-900/70 bg-sky-950/20 p-3 text-xs text-stone-300'>
            <div className='mb-2 flex items-center justify-between gap-2'>
              <div>
                <div className='font-medium text-stone-100'>下一步建议</div>
                <div className='mt-0.5 text-[10px] text-stone-500'>
                  {moveRecords.length <= 5 ? '开局库优先' : 'Pikafish · MultiPV 3'}
                  {' · '}
                  {engineWarm ? '引擎已预热' : engineWarmError ? '引擎预热失败' : '后台预热中'}
                </div>
              </div>
              <button
                onClick={analyzeCurrentPosition}
                disabled={analysisBusy || winner !== null || editMode || reviewIndex !== null}
                className='shrink-0 rounded-md border border-sky-800/80 bg-sky-950/50 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-900/60 disabled:cursor-not-allowed disabled:opacity-40'
              >
                {analysisBusy ? '计算中…' : '分析当前局面'}
              </button>
            </div>
            {analysisError && <div className='mb-2 rounded border border-red-900/70 bg-red-950/30 px-2 py-1.5 text-red-300'>{analysisError}</div>}
            {suggestions.length === 0 ? (
              <div className='text-stone-500'>前 3–5 个半回合优先从常见开局库秒回；同时页面打开后已在后台预热 Pikafish。离开开局库后直接复用已加载的引擎。</div>
            ) : (
              <div className='space-y-1'>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.notation}-${index}`}
                    onClick={() => setAnalysisPreview(analysisPreview === index ? null : index)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition ${analysisPreview === index ? 'bg-sky-900/60' : 'bg-stone-800/65 hover:bg-stone-700'}`}
                  >
                    <span>
                      <span className='mr-1 text-stone-500'>#{index + 1}</span>
                      <span className='font-medium text-stone-100'>{suggestion.notation}</span>
                      {suggestion.tags.length > 0 && <span className='ml-2 text-[10px] text-sky-300'>{suggestion.tags.join(' · ')}</span>}
                      {suggestion.replyNotation && <span className='mt-0.5 block pl-5 text-[10px] text-stone-500'>Pikafish 主变化：对手 {suggestion.replyNotation}</span>}
                      {suggestion.depth && <span className='mt-0.5 block pl-5 text-[9px] text-stone-600'>搜索深度 D{suggestion.depth}</span>}
                    </span>
                    <span className='text-[10px] tabular-nums text-stone-500'>
                      {suggestion.source === 'book' ? '开局' : suggestion.score >= 999000 ? '胜势' : `${suggestion.score >= 0 ? '+' : ''}${(suggestion.score / 100).toFixed(1)}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className='rounded-xl border border-stone-700/70 bg-stone-900/55 p-3 text-xs text-stone-300'>
            <div className='mb-2 flex items-center justify-between'>
              <span className='font-medium text-stone-100'>棋谱 · {moveRecords.length} 手</span>
              {reviewIndex !== null && (
                <button onClick={() => { setReviewIndex(null); setInspected(null); }} className='text-sky-300 hover:text-sky-200'>回到当前</button>
              )}
            </div>
            {moveRecords.length === 0 ? (
              <div className='text-stone-500'>开始行棋后自动记录。</div>
            ) : (
              <div className='grid max-h-32 grid-cols-2 gap-1 overflow-auto'>
                {moveRecords.map((move, index) => (
                  <button
                    key={index}
                    onClick={() => { setReviewIndex(index); setSelected(null); setInspected(null); setMoveMessage(null); }}
                    className={`rounded px-2 py-1 text-left transition ${reviewIndex === index ? 'bg-sky-900/60 text-sky-100' : 'bg-stone-800/70 hover:bg-stone-700'}`}
                    title={`第 ${index + 1} 手`}
                  >
                    <span className='mr-1 text-stone-500'>{index + 1}.</span>
                    <span className={move.color === 'red' ? 'text-red-300' : 'text-stone-100'}>{move.notation}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className='rounded-xl border border-stone-700/70 bg-stone-900/55 p-3 text-xs text-stone-300'>
            <div className='mb-2 flex items-center justify-between'>
              <span className='font-medium text-stone-100'>局面风险</span>
              <span className='text-stone-500'>{dangerPieces.length ? `${dangerPieces.length} 个需注意` : '暂无明显风险'}</span>
            </div>
            {dangerPieces.length > 0 && (
              <div className='space-y-1'>
                {dangerPieces.map((item) => (
                  <button
                    key={`${item.row}-${item.col}`}
                    onClick={() => setInspected({ row: item.row, col: item.col })}
                    className='flex w-full items-center justify-between rounded bg-stone-800/65 px-2 py-1 text-left hover:bg-stone-700'
                  >
                    <span>
                      <span className={item.piece.color === 'red' ? 'text-red-300' : 'text-stone-100'}>
                        {item.piece.color === 'red' ? '红' : '黑'}{labels[item.piece.type][item.piece.color]}
                      </span>
                      <span className='ml-1 text-stone-500'>({item.col + 1},{10 - item.row})</span>
                    </span>
                    <span className={item.severity === 'high' ? 'text-red-300' : 'text-orange-300'}>
                      攻 {item.attack} / 守 {item.defense}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className='rounded-xl border border-stone-700/70 bg-stone-900/55 p-3 text-xs leading-5 text-stone-400'>
            <div className='mb-1 font-medium text-stone-200'>读盘提示</div>
            <div className='flex items-center gap-2'><span className='inline-flex items-center gap-1 text-[#d4775f]'><AttackIcon /><AttackIcon /></span><span>棋子内左侧：被对方攻击次数（1–3 次纵向重复双剑）</span></div>
            <div className='flex items-center gap-2'><span className='inline-flex items-center gap-1 text-[#879270]'><DefenseIcon /><DefenseIcon /></span><span>棋子内右侧：被己方保护次数（1–3 次纵向重复盾牌）</span></div>
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
