import { JunqiPosition } from './types';

export const JUNQI_ROWS = 12;
export const JUNQI_COLS = 5;

const key = (row: number, col: number) => `${row}-${col}`;

export const campKeys = new Set([
  '1-1', '1-3', '2-2', '3-1', '3-3',
  '8-1', '8-3', '9-2', '10-1', '10-3',
]);

export const headquartersKeys = new Set([
  '0-1', '0-3', '11-1', '11-3',
]);

// Standard two-player Junqi rail layout:
// - left/right vertical rails from rows 2..11 in human numbering
// - horizontal rails on rows 2, 6, 7 and 11
export const railwayKeys = new Set<string>();

for (let col = 0; col < JUNQI_COLS; col += 1) {
  [1, 5, 6, 10].forEach((row) => railwayKeys.add(key(row, col)));
}
for (let row = 1; row <= 10; row += 1) {
  railwayKeys.add(key(row, 0));
  railwayKeys.add(key(row, 4));
}

export const isCamp = (row: number, col: number) => campKeys.has(key(row, col));
export const isHeadquarters = (row: number, col: number) => headquartersKeys.has(key(row, col));
export const isRailway = (row: number, col: number) => railwayKeys.has(key(row, col));

export const insideJunqiBoard = (row: number, col: number) =>
  row >= 0 && row < JUNQI_ROWS && col >= 0 && col < JUNQI_COLS;

const crossesCenterBoundary = (a: JunqiPosition, b: JunqiPosition) =>
  (a.row === 5 && b.row === 6) || (a.row === 6 && b.row === 5);

export const roadNeighbors = ({ row, col }: JunqiPosition): JunqiPosition[] => {
  const origin = { row, col };
  const candidates: JunqiPosition[] = [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ].filter((p) => insideJunqiBoard(p.row, p.col));

  // Across the mountain boundary there are only three bridges:
  // left, center and right (columns 0, 2, 4).
  const orthogonal = candidates.filter(
    (p) => !crossesCenterBoundary(origin, p) || [0, 2, 4].includes(col)
  );

  // Camps are connected diagonally to their surrounding stations.
  const diagonals = [
    { row: row - 1, col: col - 1 },
    { row: row - 1, col: col + 1 },
    { row: row + 1, col: col - 1 },
    { row: row + 1, col: col + 1 },
  ].filter(
    (p) =>
      insideJunqiBoard(p.row, p.col) &&
      (isCamp(row, col) || isCamp(p.row, p.col))
  );

  const unique = new Map<string, JunqiPosition>();
  [...orthogonal, ...diagonals].forEach((p) => unique.set(key(p.row, p.col), p));
  return [...unique.values()];
};

export const railwayDirections = (row: number, col: number): JunqiPosition[] => {
  if (!isRailway(row, col)) return [];
  const dirs: JunqiPosition[] = [];
  if ([1, 5, 6, 10].includes(row)) {
    dirs.push({ row: 0, col: -1 }, { row: 0, col: 1 });
  }
  if (col === 0 || col === 4) {
    dirs.push({ row: -1, col: 0 }, { row: 1, col: 0 });
  }
  return dirs;
};
