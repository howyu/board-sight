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

type InfoRow = {
  scoreCp?: number;
  mate?: number;
  depth?: number;
  pv: string[];
};

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

class PikafishEngine {
  private worker: Worker | null = null;
  private blobUrl: string | null = null;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((reason?: unknown) => void) | null = null;
  private latest = new Map<number, InfoRow>();
  private pending: {
    resolve: (rows: PikafishSuggestion[]) => void;
    reject: (reason?: unknown) => void;
    multiPv: number;
    timeoutId: number;
  } | null = null;
  private cache = new Map<string, PikafishSuggestion[]>();

  warmup(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
      return Promise.reject(new Error('当前浏览器不支持 Pikafish 所需的 Web Worker / WebAssembly。'));
    }

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    void this.start();
    return this.readyPromise;
  }

  private async start() {
    try {
      const sourceResponse = await fetch(ENGINE_JS);
      if (!sourceResponse.ok) throw new Error(`Pikafish 引擎脚本下载失败：HTTP ${sourceResponse.status}`);
      const patchedSource = patchEngineSource(await sourceResponse.text());
      this.blobUrl = URL.createObjectURL(new Blob([patchedSource], { type: 'text/javascript' }));
      this.worker = new Worker(this.blobUrl);

      this.worker.onerror = (event) => {
        const error = new Error(event.message || 'Pikafish Worker 启动失败。');
        this.readyReject?.(error);
        this.failPending(error);
        this.reset();
      };

      this.worker.onmessage = (event) => this.handleMessage(event.data ?? {});
      this.worker.postMessage({ type: 'INIT' });
    } catch (error) {
      this.readyReject?.(error);
      this.reset();
    }
  }

  private handleMessage(data: {
    type?: string;
    threads?: number;
    move?: string;
    message?: string;
    info?: { multipv?: number; score?: number; mate?: number; depth?: number; pv?: string[] };
  }) {
    if (data.type === 'READY') {
      this.readyResolve?.();
      this.readyResolve = null;
      this.readyReject = null;
      return;
    }

    if (data.type === 'INFO' && data.info) {
      const key = data.info.multipv ?? 1;
      if (Array.isArray(data.info.pv) && data.info.pv.length) {
        this.latest.set(key, {
          scoreCp: typeof data.info.score === 'number' ? data.info.score : undefined,
          mate: typeof data.info.mate === 'number' ? data.info.mate : undefined,
          depth: data.info.depth,
          pv: data.info.pv,
        });
      }
      return;
    }

    if (data.type === 'ERROR') {
      const error = new Error(data.message || 'Pikafish 引擎错误。');
      this.failPending(error);
      return;
    }

    if (data.type === 'BEST_MOVE' && this.pending) {
      const rows: PikafishSuggestion[] = [];
      for (const [multipv, info] of Array.from(this.latest.entries()).sort(([a], [b]) => a - b)) {
        const move = info.pv[0] || (multipv === 1 ? data.move ?? '' : '');
        const points = uciMoveToPoints(move);
        if (!move || !points) continue;
        rows.push({
          move,
          scoreCp: info.scoreCp,
          mate: info.mate,
          depth: info.depth,
          pv: info.pv,
          multipv,
          ...points,
        });
        if (rows.length >= this.pending.multiPv) break;
      }

      if (!rows.length && data.move) {
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

      const pending = this.pending;
      this.pending = null;
      window.clearTimeout(pending.timeoutId);
      rows.length ? pending.resolve(rows) : pending.reject(new Error('Pikafish 没有返回可解析的候选着。'));
    }
  }

  private failPending(error: Error) {
    if (!this.pending) return;
    window.clearTimeout(this.pending.timeoutId);
    this.pending.reject(error);
    this.pending = null;
  }

  async analyze(
    board: (XiangqiPiece | null)[][],
    turn: XiangqiColor,
    options: { movetime?: number; multiPv?: number } = {},
  ): Promise<PikafishSuggestion[]> {
    await this.warmup();
    if (!this.worker) throw new Error('Pikafish 尚未就绪。');
    if (this.pending) throw new Error('Pikafish 正在分析上一局面，请稍候。');

    const fen = boardToPikafishFen(board, turn);
    const multiPv = Math.max(1, Math.min(5, options.multiPv ?? 3));
    const movetime = Math.max(350, options.movetime ?? 2400);
    const cacheKey = `${fen}|mpv=${multiPv}|t=${movetime}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached.map((row) => ({ ...row, pv: [...row.pv] }));

    this.latest.clear();

    const rows = await new Promise<PikafishSuggestion[]>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.worker?.postMessage({ type: 'STOP' });
        this.failPending(new Error('Pikafish 分析超时，请重试。'));
      }, movetime + 10000);

      this.pending = {
        resolve,
        reject,
        multiPv,
        timeoutId,
      };

      this.worker?.postMessage({ type: 'SEARCH', fen, movetime, multiPv });
    });

    this.cache.set(cacheKey, rows);
    if (this.cache.size > 24) this.cache.delete(this.cache.keys().next().value as string);
    return rows.map((row) => ({ ...row, pv: [...row.pv] }));
  }

  reset() {
    this.worker?.terminate();
    this.worker = null;
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.blobUrl = null;
    this.readyPromise = null;
    this.readyResolve = null;
    this.readyReject = null;
    this.latest.clear();
  }
}

const pikafishEngine = new PikafishEngine();

export const warmupPikafish = () => pikafishEngine.warmup();

export const analyzeWithPikafish = (
  board: (XiangqiPiece | null)[][],
  turn: XiangqiColor,
  options: { movetime?: number; multiPv?: number } = {},
) => pikafishEngine.analyze(board, turn, options);
