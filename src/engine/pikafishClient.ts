import { XiangqiColor, XiangqiPiece, XiangqiPieceType } from '../games/xiangqi/types';

type Point = { row: number; col: number };

export interface PikafishSuggestion {
  move: string;
  scoreCp?: number;
  mate?: number;
  depth?: number;
  pv: string[];
  multipv: number;
  from: Point;
  to: Point;
}

const ENGINE_COMMIT = '00ac398c8867c22d638630f8752e7a5ad8f98aca';
const ENGINE_BASE = `https://raw.githubusercontent.com/billzi2016/Chinese-Chess-AI-Pro/${ENGINE_COMMIT}`;
const ENGINE_JS = `${ENGINE_BASE}/js/worker/pikafish-engine.js`;
const ENGINE_WASM = `${ENGINE_BASE}/js/worker/pikafish-engine.wasm`;
const ENGINE_NNUE = `${ENGINE_BASE}/nnue/pikafish-9e20a9a44415.nnue`;

const pieceChar: Record<XiangqiPieceType, string> = {
  general: 'k',
  advisor: 'a',
  elephant: 'b',
  horse: 'n',
  chariot: 'r',
  cannon: 'c',
  soldier: 'p',
};

export const boardToPikafishFen = (
  board: (XiangqiPiece | null)[][],
  turn: XiangqiColor,
): string => {
  const ranks = board.map((row) => {
    let empty = 0;
    let rank = '';
    row.forEach((piece) => {
      if (!piece) {
        empty += 1;
        return;
      }
      if (empty) {
        rank += String(empty);
        empty = 0;
      }
      const base = pieceChar[piece.type];
      rank += piece.color === 'red' ? base.toUpperCase() : base;
    });
    if (empty) rank += String(empty);
    return rank;
  });
  return `${ranks.join('/')} ${turn === 'red' ? 'w' : 'b'} - - 0 1`;
};

const squareToPoint = (square: string): Point => {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return { row: 9 - rank, col: file };
};

export const uciMoveToPoints = (move: string): { from: Point; to: Point } | null => {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return null;
  return {
    from: squareToPoint(move.slice(0, 2)),
    to: squareToPoint(move.slice(2, 4)),
  };
};

const patchEngineSource = (source: string): string => {
  const locateNeedle = 'return prefix+pathName';
  const nnueNeedle = 'var nnueUrl="nnue/pikafish-9e20a9a44415.nnue"';
  const searchNeedle = 'send("position fen "+data.fen);send("go movetime "+(data.movetime||5e3))';
  const infoNeedle = 'else if(key==="time")result.time=Number.parseInt(value,10);else if(key==="score"&&value==="cp")';
  const infoTailNeedle = 'return Object.keys(result).length?result:null';

  if (![locateNeedle, nnueNeedle, searchNeedle, infoNeedle, infoTailNeedle].every((needle) => source.includes(needle))) {
    throw new Error('Pikafish bundle format changed; integration patch no longer matches pinned engine.');
  }

  return source
    .replace(
      locateNeedle,
      `if(pathName==="pikafish-engine.wasm")return "${ENGINE_WASM}";return prefix+pathName`,
    )
    .replace(nnueNeedle, `var nnueUrl="${ENGINE_NNUE}"`)
    .replace(
      searchNeedle,
      'send("setoption name MultiPV value "+(data.multiPv||3));send("position fen "+data.fen);send("go movetime "+(data.movetime||5e3))',
    )
    .replace(
      infoNeedle,
      'else if(key==="time")result.time=Number.parseInt(value,10);else if(key==="multipv")result.multipv=Number.parseInt(value,10);else if(key==="score"&&value==="cp")',
    )
    .replace(
      infoTailNeedle,
      'var pvIndex=tokens.indexOf("pv");if(pvIndex>=0)result.pv=tokens.slice(pvIndex+1);return Object.keys(result).length?result:null',
    );
};

export const analyzeWithPikafish = async (
  board: (XiangqiPiece | null)[][],
  turn: XiangqiColor,
  options: { movetime?: number; multiPv?: number } = {},
): Promise<PikafishSuggestion[]> => {
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
    throw new Error('当前浏览器不支持 Pikafish 所需的 Web Worker / WebAssembly。');
  }

  const sourceResponse = await fetch(ENGINE_JS);
  if (!sourceResponse.ok) throw new Error(`Pikafish 引擎脚本下载失败：HTTP ${sourceResponse.status}`);
  const patchedSource = patchEngineSource(await sourceResponse.text());
  const blobUrl = URL.createObjectURL(new Blob([patchedSource], { type: 'text/javascript' }));
  const worker = new Worker(blobUrl);
  const fen = boardToPikafishFen(board, turn);
  const multiPv = Math.max(1, Math.min(5, options.multiPv ?? 3));
  const movetime = Math.max(500, options.movetime ?? 3500);

  return await new Promise<PikafishSuggestion[]>((resolve, reject) => {
    const latest = new Map<number, { scoreCp?: number; mate?: number; depth?: number; pv: string[] }>();
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Pikafish 分析超时，请重试。'));
    }, movetime + 20000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
    };

    worker.onerror = (event) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(event.message || 'Pikafish Worker 启动失败。'));
    };

    worker.onmessage = (event) => {
      const data = event.data ?? {};
      if (data.type === 'READY') {
        worker.postMessage({ type: 'SEARCH', fen, movetime, multiPv });
        return;
      }

      if (data.type === 'INFO' && data.info) {
        const info = data.info as {
          multipv?: number;
          score?: number;
          mate?: number;
          depth?: number;
          pv?: string[];
        };
        const key = info.multipv ?? 1;
        if (Array.isArray(info.pv) && info.pv.length) {
          latest.set(key, {
            scoreCp: typeof info.score === 'number' ? info.score : undefined,
            mate: typeof info.mate === 'number' ? info.mate : undefined,
            depth: info.depth,
            pv: info.pv,
          });
        }
        return;
      }

      if (data.type === 'ERROR') {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(data.message || 'Pikafish 引擎错误。'));
        return;
      }

      if (data.type === 'BEST_MOVE') {
        if (settled) return;
        settled = true;
        const rows = Array.from(latest.entries())
          .sort(([a], [b]) => a - b)
          .map(([multipv, info]) => {
            const move = info.pv[0] || (multipv === 1 ? data.move : '');
            const points = uciMoveToPoints(move);
            if (!move || !points) return null;
            return {
              move,
              scoreCp: info.scoreCp,
              mate: info.mate,
              depth: info.depth,
              pv: info.pv,
              multipv,
              ...points,
            } satisfies PikafishSuggestion;
          })
          .filter((row): row is PikafishSuggestion => Boolean(row))
          .slice(0, multiPv);

        if (!rows.length && typeof data.move === 'string') {
          const points = uciMoveToPoints(data.move);
          if (points) {
            rows.push({
              move: data.move,
              scoreCp: typeof data.info?.score === 'number' ? data.info.score : undefined,
              mate: typeof data.info?.mate === 'number' ? data.info.mate : undefined,
              depth: data.info?.depth,
              pv: [data.move],
              multipv: 1,
              ...points,
            });
          }
        }

        cleanup();
        rows.length ? resolve(rows) : reject(new Error('Pikafish 没有返回可解析的候选着。'));
      }
    };

    worker.postMessage({ type: 'INIT' });
  });
};
