import {
  getRailLinesThrough,
  isHeadquarters,
  isRailway,
  positionKey,
  railNeighbors,
  roadNeighbors,
} from './terrain';
import {
  JunqiBelief,
  JunqiBeliefEntry,
  JunqiPiece,
  JunqiPieceType,
  JunqiPosition,
} from './types';

export const JUNQI_INVENTORY: Record<JunqiPieceType, number> = {
  marshal: 1,
  general: 1,
  majorGeneral: 2,
  brigadier: 2,
  colonel: 2,
  major: 2,
  captain: 3,
  lieutenant: 3,
  engineer: 3,
  mine: 3,
  bomb: 2,
  flag: 1,
};

export const JUNQI_COMBAT_VALUE: Record<JunqiPieceType, number> = {
  marshal: 10,
  general: 9,
  majorGeneral: 8,
  brigadier: 7,
  colonel: 6,
  major: 5,
  captain: 4,
  lieutenant: 3,
  engineer: 2,
  mine: 8,
  bomb: 8,
  flag: 0,
};

const movable = (piece: JunqiPiece) =>
  piece.type !== 'mine' && piece.type !== 'flag';

const railStraightMoves = (
  board: (JunqiPiece | null)[][],
  row: number,
  col: number
): JunqiPosition[] => {
  if (!isRailway(row, col)) return [];
  const out = new Map<string, JunqiPosition>();
  const originKey = positionKey(row, col);

  getRailLinesThrough(row, col).forEach((railLine) => {
    const start = railLine.indexOf(originKey);
    for (const step of [-1, 1]) {
      for (let i = start + step; i >= 0 && i < railLine.length; i += step) {
        const [r, c] = railLine[i].split('-').map(Number);
        out.set(railLine[i], { row: r, col: c });
        if (board[r][c]) break;
      }
    }
  });

  return [...out.values()];
};

const railEngineerMoves = (
  board: (JunqiPiece | null)[][],
  row: number,
  col: number
): JunqiPosition[] => {
  if (!isRailway(row, col)) return [];
  const start = { row, col };
  const queue: JunqiPosition[] = [start];
  const visited = new Set([positionKey(row, col)]);
  const out = new Map<string, JunqiPosition>();

  while (queue.length) {
    const current = queue.shift()!;
    for (const next of railNeighbors(current)) {
      const key = positionKey(next.row, next.col);
      if (visited.has(key)) continue;
      visited.add(key);
      out.set(key, next);
      if (!board[next.row][next.col]) queue.push(next);
    }
  }

  return [...out.values()];
};

export const getJunqiControlledSquares = (
  board: (JunqiPiece | null)[][],
  row: number,
  col: number,
  piece: JunqiPiece
): JunqiPosition[] => {
  if (!movable(piece) || isHeadquarters(row, col)) return [];

  const road = roadNeighbors({ row, col });
  const rail = piece.type === 'engineer'
    ? railEngineerMoves(board, row, col)
    : railStraightMoves(board, row, col);

  const unique = new Map<string, JunqiPosition>();
  [...road, ...rail].forEach((p) => unique.set(positionKey(p.row, p.col), p));
  return [...unique.values()];
};

export const canReachOnlyAsEngineer = (
  board: (JunqiPiece | null)[][],
  from: JunqiPosition,
  to: JunqiPosition
) => {
  const dummy: JunqiPiece = { id: 'probe', color: 'red', type: 'captain', revealed: true };
  const engineer: JunqiPiece = { ...dummy, type: 'engineer' };
  const generic = new Set(
    getJunqiControlledSquares(board, from.row, from.col, dummy)
      .map((p) => positionKey(p.row, p.col))
  );
  const engineers = new Set(
    getJunqiControlledSquares(board, from.row, from.col, engineer)
      .map((p) => positionKey(p.row, p.col))
  );
  const target = positionKey(to.row, to.col);
  return engineers.has(target) && !generic.has(target);
};

const allowedPriorTypes = (row: number, col: number): JunqiPieceType[] => {
  let types = Object.keys(JUNQI_INVENTORY) as JunqiPieceType[];

  if (!(row === 0 && (col === 1 || col === 3))) {
    types = types.filter((type) => type !== 'flag');
  }

  if (row > 1) types = types.filter((type) => type !== 'mine');
  if (row === 5) types = types.filter((type) => type !== 'bomb');

  return types;
};

export const buildPriorBelief = (
  piece: JunqiPiece,
  row: number,
  col: number
): JunqiBelief => {
  if (piece.revealed) {
    return {
      pieceId: piece.id,
      source: 'history',
      entries: [{ type: piece.type, probability: 1 }],
    };
  }

  const allowed = allowedPriorTypes(row, col);
  const total = allowed.reduce((sum, type) => sum + JUNQI_INVENTORY[type], 0);
  const entries: JunqiBeliefEntry[] = allowed
    .map((type) => ({ type, probability: JUNQI_INVENTORY[type] / total }))
    .sort((a, b) => b.probability - a.probability);

  return { pieceId: piece.id, source: 'prior', entries };
};

export const expectedThreatFromBelief = (belief: JunqiBelief): number =>
  belief.entries.reduce(
    (sum, entry) => sum + entry.probability * JUNQI_COMBAT_VALUE[entry.type],
    0
  );

export const calculateJunqiRiskMap = (
  board: (JunqiPiece | null)[][],
  beliefs: Record<string, JunqiBelief>,
  perspective: 'red' | 'blue' = 'red'
): number[][] => {
  const risk = Array.from({ length: board.length }, () =>
    Array.from({ length: board[0]?.length ?? 0 }, () => 0)
  );

  board.forEach((boardRow, row) => {
    boardRow.forEach((piece, col) => {
      if (!piece || piece.color === perspective) return;
      const belief = beliefs[piece.id] ?? buildPriorBelief(piece, row, col);
      belief.entries.forEach((entry) => {
        const hypothetical: JunqiPiece = { ...piece, type: entry.type, revealed: true };
        const weight = entry.probability * JUNQI_COMBAT_VALUE[entry.type];
        getJunqiControlledSquares(board, row, col, hypothetical).forEach((p) => {
          risk[p.row][p.col] += weight;
        });
      });
    });
  });

  return risk;
};
