import { FC, useMemo, useState } from 'react';
import { createInitialJunqiBoard } from '../games/junqi/initialBoard';
import {
  buildPriorBelief,
  calculateJunqiRiskMap,
  getJunqiControlledSquares,
} from '../games/junqi/sight';
import {
  isCamp,
  isHeadquarters,
  isRailway,
  JUNQI_COLS,
  JUNQI_ROWS,
} from '../games/junqi/terrain';
import { JunqiPieceType } from '../games/junqi/types';

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

export const JunqiBoard: FC = () => {
  const [board] = useState(() => createInitialJunqiBoard());
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [showRisk, setShowRisk] = useState(true);

  const risk = useMemo(() => calculateJunqiRiskMap(board, 'red'), [board]);
  const maxRisk = useMemo(
    () => Math.max(1, ...risk.flat()),
    [risk]
  );

  const selectedPiece = selected ? board[selected.row][selected.col] : null;
  const selectedSight = useMemo(() => {
    if (!selected || !selectedPiece) return new Set<string>();
    return new Set(
      getJunqiControlledSquares(board, selected.row, selected.col, selectedPiece)
        .map((p) => `${p.row}-${p.col}`)
    );
  }, [board, selected, selectedPiece]);

  const belief = selected && selectedPiece
    ? buildPriorBelief(selectedPiece, selected.row, selected.col)
    : null;

  const hottest = useMemo(() => {
    let best = { row: 0, col: 0, value: 0 };
    risk.forEach((row, r) => row.forEach((value, c) => {
      if (value > best.value) best = { row: r, col: c, value };
    }));
    return best;
  }, [risk]);

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-xl font-semibold tracking-[0.08em] text-amber-100'>中国军旗 · 概率棋势</h2>
          <p className='mt-1 max-w-2xl text-sm leading-6 text-stone-400'>
            第一版先展示“已知控制 + 暗子风险 + 身份概率”。蓝方暗子目前使用合法布阵先验，后续会根据吃子、移动轨迹与历史行动做贝叶斯更新。
          </p>
        </div>
        <button
          onClick={() => setShowRisk((v) => !v)}
          className='rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-200 transition hover:bg-stone-700'
        >
          {showRisk ? '隐藏风险场' : '显示风险场'}
        </button>
      </div>

      <div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]'>
        <div className='overflow-auto'>
          <div className='mx-auto w-fit rounded-2xl border border-stone-700 bg-stone-950/70 p-3 shadow-2xl'>
            <div
              className='grid gap-1.5 rounded-xl bg-[#6b5132] p-2'
              style={{ gridTemplateColumns: `repeat(${JUNQI_COLS}, 58px)` }}
            >
              {Array.from({ length: JUNQI_ROWS }).map((_, row) =>
                Array.from({ length: JUNQI_COLS }).map((__, col) => {
                  const piece = board[row][col];
                  const key = `${row}-${col}`;
                  const selectedNow = selected?.row === row && selected?.col === col;
                  const inSight = selectedSight.has(key);
                  const camp = isCamp(row, col);
                  const hq = isHeadquarters(row, col);
                  const rail = isRailway(row, col);
                  const intensity = Math.min(0.82, risk[row][col] / maxRisk * 0.82);

                  return (
                    <button
                      key={key}
                      onClick={() => setSelected({ row, col })}
                      className={`relative flex h-[58px] w-[58px] items-center justify-center rounded-lg border text-sm transition
                        ${camp ? 'rotate-45 border-amber-500/70 bg-amber-950/45' : 'border-stone-600 bg-[#cbb58b]'}
                        ${hq ? 'ring-2 ring-red-950/50' : ''}
                        ${selectedNow ? 'outline outline-3 outline-amber-300' : ''}
                      `}
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
                      {inSight && (
                        <span className='pointer-events-none absolute inset-1 rounded-md border-2 border-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.8)]' />
                      )}
                      {camp && (
                        <span className='pointer-events-none absolute z-10 -rotate-45 text-[10px] font-semibold text-amber-100/80'>营</span>
                      )}
                      {hq && !piece && (
                        <span className='relative z-10 text-[10px] font-bold text-red-950'>大本营</span>
                      )}
                      {piece && (
                        <span
                          className={`relative z-20 flex h-10 w-10 items-center justify-center rounded-md border px-1 text-xs font-bold shadow
                            ${camp ? '-rotate-45' : ''}
                            ${piece.color === 'red'
                              ? 'border-red-900 bg-red-100 text-red-900'
                              : 'border-slate-800 bg-slate-700 text-white'}
                          `}
                        >
                          {piece.type ? labels[piece.type] : '？'}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <p className='mt-3 text-center text-xs leading-5 text-stone-500'>
            红色覆盖越深 = 当前规则先验下的敌方威胁越高 · 青色外框 = 当前棋子的直接势力范围 · “营” = 行营
          </p>
        </div>

        <aside className='flex flex-col gap-3'>
          <section className='rounded-xl border border-stone-700 bg-stone-900/70 p-4'>
            <h3 className='font-semibold text-stone-100'>暗子身份推断</h3>
            {!selectedPiece && <p className='mt-2 text-sm text-stone-400'>点一个棋子查看身份/先验概率。</p>}
            {selectedPiece && belief && (
              <>
                <p className='mt-2 text-sm text-stone-400'>
                  {selectedPiece.color === 'blue' ? '蓝方' : '红方'}棋子 · {selectedPiece.revealed ? '身份已知' : '身份未知'}
                </p>
                <div className='mt-3 space-y-2'>
                  {belief.entries.slice(0, 6).map((entry) => (
                    <div key={entry.type} className='grid grid-cols-[58px_1fr_42px] items-center gap-2 text-xs'>
                      <span className='text-stone-300'>{labels[entry.type]}</span>
                      <span className='h-2 overflow-hidden rounded bg-stone-700'>
                        <span className='block h-full bg-amber-400' style={{ width: pct(entry.probability) }} />
                      </span>
                      <span className='text-right tabular-nums text-stone-400'>{pct(entry.probability)}</span>
                    </div>
                  ))}
                </div>
                {!selectedPiece.revealed && (
                  <p className='mt-3 text-[11px] leading-5 text-stone-500'>
                    当前是布阵规则先验，不代表 AI 已经“猜中”。后续将用移动、碰子结果和剩余棋子数量持续更新。
                  </p>
                )}
              </>
            )}
          </section>

          <section className='rounded-xl border border-indigo-500/30 bg-indigo-950/25 p-4'>
            <h3 className='font-semibold text-indigo-100'>AI 局面解读 · MVP</h3>
            <p className='mt-2 text-sm leading-6 text-indigo-100/75'>
              当前最高风险集中在第 {hottest.row + 1} 行第 {hottest.col + 1} 列附近。第一阶段先由规则与概率引擎生成解释；Jev 接入后只负责在合法候选动作之间做概率排序，不负责判定规则。
            </p>
          </section>

          <section className='rounded-xl border border-stone-700 bg-stone-900/50 p-4 text-xs leading-5 text-stone-400'>
            <span className='font-semibold text-stone-200'>下一层：</span>
            行动历史 → 身份 posterior → 风险场更新 → 候选走法 → Jev 概率 → 可解释的“为什么”。
          </section>
        </aside>
      </div>
    </div>
  );
};
