import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import { generateJunqiCandidates, chooseBlueMove, formatMoveRecord } from '../games/junqi/decision';
import { applyJunqiMove, createJunqiGameState, getBeliefsForState, JunqiGameState } from '../games/junqi/game';
import { createInitialJunqiBoard } from '../games/junqi/initialBoard';
import { candidateJevId, JevDecisionResult, scoreJunqiCandidatesWithJev } from '../games/junqi/jev';
import { getLegalJunqiDestinations } from '../games/junqi/rules';
import { calculateJunqiRiskMap, getJunqiControlledSquares } from '../games/junqi/sight';
import {
  isCamp,
  isHeadquarters,
  isRailway,
  JUNQI_COLS,
  JUNQI_ROWS,
  positionKey,
} from '../games/junqi/terrain';
import { JunqiPieceType, JunqiPosition } from '../games/junqi/types';

const labels: Record<JunqiPieceType, string> = {
  marshal: '司令',
  general: '军长',
  majorGeneral: '师长',
  brigadier: '旅长',
  colonel: '团长',
  major: '营长',
  captain: '连长',
  lieutenant: '排长',
  engineer: '工兵',
  mine: '地雷',
  bomb: '炸弹',
  flag: '军旗',
};

const pct = (value: number) => `${Math.round(value * 100)}%`;
const pos = (p: JunqiPosition) => `${p.row + 1}行${p.col + 1}列`;

export const JunqiBoard: FC = () => {
  const [game, setGame] = useState(() => createJunqiGameState(createInitialJunqiBoard()));
  const [undoStates, setUndoStates] = useState<JunqiGameState[]>([]);
  const [selected, setSelected] = useState<JunqiPosition | null>(null);
  const [showRisk, setShowRisk] = useState(true);
  const [message, setMessage] = useState('红方先行。点选我方棋子，再点绿色目标格走棋。');
  const [jevDecision, setJevDecision] = useState<JevDecisionResult | null>(null);
  const [jevLoading, setJevLoading] = useState(false);
  const [jevError, setJevError] = useState<string | null>(null);

  const beliefs = useMemo(
    () => getBeliefsForState(game),
    [game]
  );

  const risk = useMemo(
    () => calculateJunqiRiskMap(game.board, beliefs, 'red'),
    [game.board, beliefs]
  );

  const maxRisk = useMemo(() => Math.max(1, ...risk.flat()), [risk]);

  const selectedPiece = selected ? game.board[selected.row][selected.col] : null;
  const legalDestinations = useMemo(() => {
    if (!selected || !selectedPiece || selectedPiece.color !== 'red' || game.turn !== 'red') {
      return new Set<string>();
    }
    return new Set(
      getLegalJunqiDestinations(game.board, selected.row, selected.col)
        .map((p) => positionKey(p.row, p.col))
    );
  }, [game.board, game.turn, selected, selectedPiece]);

  const belief = selectedPiece && selectedPiece.color === 'blue' && !selectedPiece.revealed
    ? beliefs[selectedPiece.id]
    : null;

  const selectedInfluence = useMemo(() => {
    const influence = new Map<string, number>();
    if (!selected || !selectedPiece) return influence;

    if (selectedPiece.color === 'blue' && !selectedPiece.revealed) {
      const selectedBelief = beliefs[selectedPiece.id];
      selectedBelief?.entries.forEach((entry) => {
        const hypothetical = { ...selectedPiece, type: entry.type, revealed: true };
        getJunqiControlledSquares(game.board, selected.row, selected.col, hypothetical)
          .forEach((square) => {
            const key = positionKey(square.row, square.col);
            influence.set(key, Math.min(1, (influence.get(key) ?? 0) + entry.probability));
          });
      });
      return influence;
    }

    getJunqiControlledSquares(game.board, selected.row, selected.col, selectedPiece)
      .forEach((square) => influence.set(positionKey(square.row, square.col), 1));
    return influence;
  }, [beliefs, game.board, selected, selectedPiece]);

  const candidates = useMemo(
    () => game.turn === 'red' && !game.winner
      ? generateJunqiCandidates(game, 'red').slice(0, 12)
      : [],
    [game]
  );

  useEffect(() => {
    let cancelled = false;
    setJevDecision(null);
    setJevError(null);

    if (candidates.length < 2 || game.turn !== 'red' || game.winner) {
      setJevLoading(false);
      return () => { cancelled = true; };
    }

    setJevLoading(true);
    scoreJunqiCandidatesWithJev(game, candidates)
      .then((result) => {
        if (!cancelled) setJevDecision(result);
      })
      .catch((error: Error) => {
        if (!cancelled) setJevError(error.message);
      })
      .finally(() => {
        if (!cancelled) setJevLoading(false);
      });

    return () => { cancelled = true; };
  }, [game, candidates]);

  const displayedCandidates = useMemo(() => {
    if (!jevDecision) return candidates.slice(0, 3);
    return [...candidates]
      .sort((a, b) => {
        const aIndex = candidates.indexOf(a);
        const bIndex = candidates.indexOf(b);
        const ap = jevDecision.probabilities[candidateJevId(a, aIndex)] ?? 0;
        const bp = jevDecision.probabilities[candidateJevId(b, bIndex)] ?? 0;
        return bp - ap;
      })
      .slice(0, 3);
  }, [candidates, jevDecision]);

  const hottest = useMemo(() => {
    let best = { row: 0, col: 0, value: 0 };
    risk.forEach((row, r) => row.forEach((value, c) => {
      if (value > best.value) best = { row: r, col: c, value };
    }));
    return best;
  }, [risk]);

  const reset = () => {
    setGame(createJunqiGameState(createInitialJunqiBoard()));
    setUndoStates([]);
    setSelected(null);
    setMessage('红方先行。点选我方棋子，再点绿色目标格走棋。');
  };

  const performRedMove = (from: JunqiPosition, to: JunqiPosition) => {
    const red = applyJunqiMove(game, from, to);
    if (!red.ok) {
      setMessage(red.message);
      return;
    }

    let next = red.state;
    let summary = red.message;

    if (!next.winner && next.turn === 'blue') {
      const blueMove = chooseBlueMove(next);
      if (blueMove) {
        const blue = applyJunqiMove(next, blueMove.from, blueMove.to);
        if (blue.ok) {
          next = blue.state;
          summary = `${summary} 蓝方 AI：${pos(blueMove.from)} → ${pos(blueMove.to)}。${blue.message}`;
        }
      }
    }

    setUndoStates((states) => [...states, game]);
    setGame(next);
    setSelected(null);
    setMessage(summary);
  };

  const handleSquareClick = (row: number, col: number) => {
    const clicked = game.board[row][col];
    const target = { row, col };
    const key = positionKey(row, col);

    if (game.winner) { setMessage('对局已结束，请点击新对局重新开始。'); return; }

    if (selected && legalDestinations.has(key)) {
      performRedMove(selected, target);
      return;
    }

    if (clicked?.color === 'red' && game.turn === 'red' && !game.winner) {
      setSelected(target);
      const targets = getLegalJunqiDestinations(game.board, row, col);
      setMessage(clicked.type === 'mine' || clicked.type === 'flag'
        ? `${labels[clicked.type]}不能移动，请选择其他棋子。`
        : isHeadquarters(row, col)
          ? '进入大本营的棋子不能再移动。'
          : targets.length
            ? `已选${labels[clicked.type]}：点击绿色目标走棋，共 ${targets.length} 个合法目标。`
            : '该棋子暂时没有合法目标，请选择其他棋子。');
      return;
    }

    // Blue pieces can always be inspected without selecting them for movement.
    if (clicked?.color === 'blue') {
      setSelected(target);
      return;
    }

    if (selected) setMessage('这个目标不能走：请点击绿色目标，或选择另一枚红方棋子。');
    else setMessage('请先点击一枚红方可移动棋子。');
    setSelected(null);
  };

  return (
    <div className='flex w-[min(1040px,calc(100vw-48px))] flex-col gap-2'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h2 className='text-lg font-semibold tracking-[0.08em] text-amber-100'>中国军旗 · 概率棋势</h2>
          <p className='mt-1 max-w-2xl text-xs leading-4 text-stone-400'>
            玩法：先点红方棋子，再点绿色目标；蓝方自动应手。地雷和军旗不能移动。
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <button disabled={!undoStates.length} onClick={() => {
            const previous = undoStates[undoStates.length - 1];
            if (!previous) return;
            setGame(previous); setUndoStates((states) => states.slice(0, -1));
            setSelected(null); setMessage('已撤回上一轮红蓝双方走棋，红方重新走棋。');
          }} className='rounded-lg border border-stone-600 px-3 py-1.5 text-xs text-stone-200 disabled:opacity-40'>悔棋</button>
          <button disabled={!!game.winner} onClick={() => {
            setUndoStates((states) => [...states, game]);
            setGame({ ...game, winner: 'blue' }); setSelected(null); setMessage('红方认输，蓝方胜利。');
          }} className='rounded-lg border border-stone-600 px-3 py-1.5 text-xs text-stone-200 disabled:opacity-40'>认输</button>
          <button
            onClick={() => setShowRisk((v) => !v)}
            className='rounded-lg border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs text-stone-200 transition hover:bg-stone-700'
          >
            {showRisk ? '隐藏风险场' : '显示风险场'}
          </button>
          <button
            onClick={reset}
            className='rounded-lg border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs text-stone-200 transition hover:bg-stone-700'
          >
            新对局
          </button>
        </div>
      </div>

      <div className='rounded-xl border border-stone-700 bg-stone-900/70 px-3 py-2 text-xs text-stone-300'>
        <span className='font-semibold text-stone-100'>
          {game.winner ? `${game.winner === 'red' ? '红方' : '蓝方'}胜利` : game.turn === 'red' ? '红方回合' : '蓝方回合'}
        </span>
        <span className='mx-2 text-stone-600'>·</span>
        {message}
      </div>

      <div className='grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]'>
        <div className='min-w-0'>
          <div className='mx-auto w-fit rounded-2xl border border-stone-700 bg-stone-950/70 p-2 shadow-2xl'>
            <div
              className='grid gap-[3px] rounded-lg bg-[#6b5132] p-1.5'
              style={{ gridTemplateColumns: `repeat(${JUNQI_COLS}, calc(var(--junqi-cell) * 1.5))`, '--junqi-cell': 'clamp(24px, calc((100dvh - 270px) / 12), 48px)' } as CSSProperties}
            >
              {Array.from({ length: JUNQI_ROWS }).map((_, row) =>
                Array.from({ length: JUNQI_COLS }).map((__, col) => {
                  const piece = game.board[row][col];
                  const key = positionKey(row, col);
                  const selectedNow = selected?.row === row && selected?.col === col;
                  const legal = legalDestinations.has(key);
                  const influence = selectedInfluence.get(key) ?? 0;
                  const camp = isCamp(row, col);
                  const hq = isHeadquarters(row, col);
                  const rail = isRailway(row, col);
                  const intensity = Math.min(0.82, risk[row][col] / maxRisk * 0.82);
                  const visibleLabel = piece
                    ? piece.color === 'red' || piece.revealed
                      ? labels[piece.type]
                      : '？'
                    : null;

                  return (
                    <button
                      key={key}
                      onClick={() => handleSquareClick(row, col)}
                      className={`relative flex h-[var(--junqi-cell)] w-[calc(var(--junqi-cell)*1.5)] items-center justify-center rounded-lg border text-sm transition
                        ${camp ? 'rounded-[50%] border-amber-500/70 bg-amber-950/45' : 'border-stone-600 bg-[#cbb58b]'}
                        ${hq ? 'ring-2 ring-red-950/50' : ''}
                        ${selectedNow ? 'outline outline-3 outline-amber-300' : ''}
                        ${legal ? 'ring-2 ring-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.7)]' : ''}
                      `}
                      aria-label={`${row + 1}行${col + 1}列 ${visibleLabel ?? (camp ? '行营' : hq ? '大本营' : '空位')}${legal ? ' 可走' : ''}`}
                      title={`(${row + 1}, ${col + 1})`}
                    >
                      {showRisk && risk[row][col] > 0 && (
                        <span
                          className='pointer-events-none absolute inset-0 rounded-lg bg-red-600'
                          style={{ opacity: intensity }}
                        />
                      )}
                      {rail && !camp && (
                        <span className='pointer-events-none absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 bg-stone-700/45' />
                      )}
                      {influence > 0 && (
                        <span
                          className='pointer-events-none absolute inset-1 z-10 rounded-md border-2 border-cyan-300'
                          style={{ opacity: 0.3 + influence * 0.7 }}
                        />
                      )}
                      {legal && !piece && (
                        <span className='pointer-events-none absolute z-10 h-4 w-4 rounded-full bg-emerald-300/85' />
                      )}
                      {camp && (
                        <span className='pointer-events-none absolute z-10 text-[10px] font-semibold text-amber-100/80'>营</span>
                      )}
                      {hq && !piece && (
                        <span className='relative z-10 text-[10px] font-bold text-red-950'>大本营</span>
                      )}
                      {piece && (
                        <span
                          className={`relative z-20 flex h-[74%] w-[82%] items-center justify-center rounded-md border px-0.5 text-[clamp(9px,1.2vh,12px)] font-bold shadow
                            
                            ${piece.color === 'red'
                              ? 'border-red-900 bg-red-100 text-red-900'
                              : 'border-slate-800 bg-slate-700 text-white'}
                          `}
                        >
                          {visibleLabel}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <p className='mt-2 text-center text-[11px] leading-4 text-stone-500'>
            红色：敌方威胁 · 青色：所选棋子势力 · 绿色：合法走法
          </p>
        </div>

        <aside className='flex flex-col gap-2'>
          <section className='rounded-xl border border-stone-700 bg-stone-900/70 p-3'>
            <h3 className='font-semibold text-stone-100'>暗子身份推断</h3>
            {!belief && <p className='mt-2 text-xs text-stone-400'>点一个蓝方暗子查看当前概率分布。</p>}
            {belief && selectedPiece && (
              <>
                <p className='mt-2 text-xs text-stone-400'>
                  蓝方暗子 {selectedPiece.id} · {belief.source === 'coupled' ? '全局联动 posterior' : '局部 posterior'}
                </p>
                <div className='mt-2 space-y-1.5'>
                  {belief.entries.slice(0, 7).map((entry) => (
                    <div key={entry.type} className='grid grid-cols-[58px_1fr_42px] items-center gap-2 text-xs'>
                      <span className='text-stone-300'>{labels[entry.type]}</span>
                      <span className='h-2 overflow-hidden rounded bg-stone-700'>
                        <span className='block h-full bg-amber-400' style={{ width: pct(entry.probability) }} />
                      </span>
                      <span className='text-right tabular-nums text-stone-400'>{pct(entry.probability)}</span>
                    </div>
                  ))}
                </div>
                <p className='mt-2 text-[10px] leading-4 text-stone-500'>
                  移动会排除地雷/军旗；铁路拐弯锁定工兵；碰子胜负继续排除不可能军阶；剩余棋子库存对所有暗子做联动校正。
                </p>
              </>
            )}
          </section>

          <section className='rounded-xl border border-indigo-500/30 bg-indigo-950/25 p-3'>
            <h3 className='font-semibold text-indigo-100'>AI 局面解读</h3>
            <p className='mt-2 text-xs leading-4 text-indigo-100/75'>
              最高风险：{pos(hottest)}。以下为综合局势与暗子概率的候选走法。
            </p>
            <p className='mt-2 text-[11px] text-indigo-200/60'>
              {jevLoading
                ? 'Jev 正在判断…'
                : jevDecision
                  ? `Jev ${jevDecision.model} · 置信度 ${jevDecision.confidence === null ? '—' : pct(jevDecision.confidence)}`
                  : jevError
                    ? `Jev 暂不可用（${jevError}），已回退本地评分。`
                    : '当前使用本地评分。'}
            </p>
            {displayedCandidates[0] && !game.winner && (
              <button onClick={() => performRedMove(displayedCandidates[0].from, displayedCandidates[0].to)}
                className='mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500'>
                执行首选走法
              </button>
            )}
            <div className='mt-2 space-y-1.5'>
              {displayedCandidates.map((candidate, index) => { 
                const originalIndex = candidates.indexOf(candidate);
                const jevId = candidateJevId(candidate, originalIndex);
                const jevProbability = jevDecision?.probabilities[jevId];
                return (
                <button
                  key={`${candidate.from.row}-${candidate.from.col}-${candidate.to.row}-${candidate.to.col}`}
                  onClick={() => {
                    setSelected(candidate.from);
                    setMessage(`候选 ${index + 1}：${labels[candidate.piece.type]} ${pos(candidate.from)} → ${pos(candidate.to)}。理由：${candidate.explanation}`);
                  }}
                  className='w-full rounded-lg border border-indigo-400/20 bg-indigo-950/30 p-2 text-left text-xs text-indigo-100/80 hover:bg-indigo-900/35'
                >
                  <span className='font-semibold text-indigo-100'>#{index + 1} {labels[candidate.piece.type]} {pos(candidate.from)} → {pos(candidate.to)}</span>
                  <span className='mt-1 block'>
                    本地 {candidate.score.toFixed(2)}
                    {typeof jevProbability === 'number' ? ` · Jev ${pct(jevProbability)}` : ''}
                    {' · '}{candidate.explanation}
                  </span>
                </button>
                );
              })}
            </div>
          </section>

          <section className='rounded-xl border border-stone-700 bg-stone-900/50 p-3'>
            <h3 className='text-sm font-semibold text-stone-200'>最近走棋</h3>
            <div className='mt-2 space-y-1 text-[11px] leading-4 text-stone-400'>
              {game.history.length === 0 && <span>暂无。</span>}
              {game.history.slice(-3).reverse().map((record) => (
                <div key={record.ply}>{formatMoveRecord(record, labels)}</div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
