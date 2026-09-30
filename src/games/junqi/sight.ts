import {
  insideJunqiBoard,
  isHeadquarters,
  isRailway,
  railwayDirections,
  roadNeighbors,
} from './terrain';
import {
  JunqiBelief,
  JunqiBeliefEntry,
  JunqiPiece,
  JunqiPieceType,
  JunqiPosition,
} from './types';

const inventory: Record<JunqiPieceType, number> = {
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

const combatValue: Record<JunqiPieceType, number> = {
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

const posKey = (p: JunqiPosition) => `${p.row}-${p.col}`;

const railStraightMoves = (
  board: (JunqiPiece | null)[][],
  row: number,
  col: number
): JunqiPosition[] => {
  if (!isRailway(row, col)) return [];
  const out: JunqiPosition[] = [];
  for (const dir of railwayDirections(row, col)) {
    let r = row + dir.row;
    let c = col + dir.col;
    while (insideJunqiBoard(r, c) && isRailway(r, c)) {
      out.push({ row: r, col: c });
      if (board[r][c]) break;
      r += dir.row;
      c += dir.col;
    }
  }
  return out;
};

const railEngineerMoves = (
  board: (JunqiPiece | null)[][],
  row: number,
  col: number
): JunqiPosition[] => {
  if (!isRailway(row, col)) return [];
  const start = { row, col };
  const queue: JunqiPosition[] = [start];
  const visited = new Set([posKey(start)]);
  const out: JunqiPosition[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    const candidates = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 },
    ];

    for (const next of candidates) {
      if (!insideJunqiBoard(next.row, next.col) || !isRailway(next.row, next.col)) continue;
      const k = posKey(next);
      if (visited.has(k)) continue;
      visited.add(k);
      out.push(next);
      if (!board[next.row][next.col]) queue.push(next);
    }
  }
  return out;
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
  [...road, ...rail].forEach((p) => unique.set(posKey(p), p));
  return [...unique.values()];
};

const allowedPriorTypes = (row: number, col: number): JunqiPieceType[] => {
  let types = Object.keys(inventory) as JunqiPieceType[];

  // At initial setup, flag must be in one of the two rear headquarters.
  if (row === 0 && (col === 1 || col === 3)) return types;
  types = types.filter((type) => type !== 'flag');

  // Enemy rear two rows can contain mines; other rows cannot.
  if (row > 1) types = types.filter((type) => type !== 'mine');

  // Bombs cannot be placed on the enemy front row.
  if (row === 5) types = types.filter((type) => type !== 'bomb');

  return types;
};

export const buildPriorBelief = (
  piece: JunqiPiece,
  row: number,
  col: number
): JunqiBelief => {
  if (piece.type) {
    return {
      pieceId: piece.id,
      source: 'history',
      entries: [{ type: piece.type, probability: 1 }],
    };
  }

  const allowed = allowedPriorTypes(row, col);
  const total = allowed.reduce((sum, type) => sum + inventory[type], 0);
  const entries: JunqiBeliefEntry[] = allowed
    .map((type) => ({ type, probability: inventory[type] / total }))
    .sort((a, b) => b.probability - a.probability);

  return { pieceId: piece.id, source: 'prior', entries };
};

export const expectedThreat = (
  piece: JunqiPiece,
  row: number,
  col: number
): number => {
  const belief = buildPriorBelief(piece, row, col);
  return belief.entries.reduce(
    (sum, entry) => sum + entry.probability * combatValue[entry.type],
    0
  );
};

export const calculateJunqiRiskMap = (
  board: (JunqiPiece | null)[][],
  perspective: 'red' | 'blue' = 'red'
): number[][] => {
  const risk = Array.from({ length: board.length }, () =>
    Array.from({ length: board[0]?.length ?? 0 }, () => 0)
  );

  board.forEach((boardRow, row) => {
    boardRow.forEach((piece, col) => {
      if (!piece || piece.color === perspective) return;
      const weight = expectedThreat(piece, row, col);
      getJunqiControlledSquares(board, row, col, piece).forEach((p) => {
        risk[p.row][p.col] += weight;
      });
    });
  });

  return risk;
};
