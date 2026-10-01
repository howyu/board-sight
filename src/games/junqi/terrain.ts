import { JunqiPosition } from './types';

export const JUNQI_ROWS = 12;
export const JUNQI_COLS = 5;

export const positionKey = (row: number, col: number) => `${row}-${col}`;

export const campKeys = new Set([
  '2-1', '2-3', '3-2', '4-1', '4-3',
  '7-1', '7-3', '8-2', '9-1', '9-3',
]);

export const headquartersKeys = new Set([
  '0-1', '0-3', '11-1', '11-3',
]);

const line = (positions: JunqiPosition[]) =>
  positions.map((p) => positionKey(p.row, p.col));

export const railwayLines: string[][] = [
  line(Array.from({ length: 10 }, (_, i) => ({ row: i + 1, col: 0 }))),
  line(Array.from({ length: 10 }, (_, i) => ({ row: i + 1, col: 4 }))),
  line(Array.from({ length: 5 }, (_, col) => ({ row: 1, col }))),
  line(Array.from({ length: 5 }, (_, col) => ({ row: 5, col }))),
  line(Array.from({ length: 5 }, (_, col) => ({ row: 6, col }))),
  line(Array.from({ length: 5 }, (_, col) => ({ row: 10, col }))),
];

export const railwayKeys = new Set(railwayLines.flat());

export const isCamp = (row: number, col: number) => campKeys.has(positionKey(row, col));
export const isHeadquarters = (row: number, col: number) => headquartersKeys.has(positionKey(row, col));
export const isRailway = (row: number, col: number) => railwayKeys.has(positionKey(row, col));

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

  const orthogonal = candidates.filter(
    (p) => !crossesCenterBoundary(origin, p) || [0, 2, 4].includes(col)
  );

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
  [...orthogonal, ...diagonals].forEach((p) => unique.set(positionKey(p.row, p.col), p));
  return [...unique.values()];
};

export const getRailLinesThrough = (row: number, col: number): string[][] => {
  const key = positionKey(row, col);
  return railwayLines.filter((railLine) => railLine.includes(key));
};

export const railNeighbors = ({ row, col }: JunqiPosition): JunqiPosition[] => {
  const key = positionKey(row, col);
  const neighbors = new Map<string, JunqiPosition>();

  railwayLines.forEach((railLine) => {
    const index = railLine.indexOf(key);
    if (index < 0) return;
    [index - 1, index + 1].forEach((neighborIndex) => {
      if (neighborIndex < 0 || neighborIndex >= railLine.length) return;
      const [r, c] = railLine[neighborIndex].split('-').map(Number);
      neighbors.set(railLine[neighborIndex], { row: r, col: c });
    });
  });

  return [...neighbors.values()];
};

// Render the same undirected graph used by movement; no decorative fake links.
export const roadEdges: [JunqiPosition, JunqiPosition][] = [];
for (let row = 0; row < JUNQI_ROWS; row += 1) {
  for (let col = 0; col < JUNQI_COLS; col += 1) {
    const from = { row, col };
    for (const to of roadNeighbors(from)) {
      if (row * JUNQI_COLS + col < to.row * JUNQI_COLS + to.col) roadEdges.push([from, to]);
    }
  }
}
