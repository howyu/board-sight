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

// MVP topology follows the common 12×5 two-player board: outer vertical
// railways plus the major horizontal railway corridors. The graph is kept
// isolated here so it can be replaced by a competition-grade topology later.
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

export const roadNeighbors = ({ row, col }: JunqiPosition): JunqiPosition[] => {
  const candidates: JunqiPosition[] = [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ];

  // Camps connect diagonally to their surrounding stations.
  const diagonals = [
    { row: row - 1, col: col - 1 },
    { row: row - 1, col: col + 1 },
    { row: row + 1, col: col - 1 },
    { row: row + 1, col: col + 1 },
  ].filter((p) => insideJunqiBoard(p.row, p.col) && (isCamp(row, col) || isCamp(p.row, p.col)));

  return [...candidates.filter((p) => insideJunqiBoard(p.row, p.col)), ...diagonals];
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
