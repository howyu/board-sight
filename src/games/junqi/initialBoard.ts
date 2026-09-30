import { isCamp, JUNQI_COLS, JUNQI_ROWS } from './terrain';
import { JunqiPiece, JunqiPieceType } from './types';

const redTypes: JunqiPieceType[] = [
  'captain', 'colonel', 'majorGeneral', 'brigadier', 'lieutenant',
  'engineer', 'bomb', 'major', 'engineer', 'captain',
  'lieutenant', 'colonel', 'marshal', 'majorGeneral', 'brigadier',
  'major', 'bomb', 'mine', 'general', 'mine',
  'mine', 'flag', 'engineer', 'captain', 'lieutenant',
];

// A deterministic legal-style hidden setup keeps demos reproducible.
// Identity stays concealed through revealed=false; the rules engine still knows it.
const blueTypes: JunqiPieceType[] = [
  'mine', 'flag', 'general', 'marshal', 'mine',
  'mine', 'bomb', 'majorGeneral',
  'engineer', 'colonel', 'captain', 'lieutenant',
  'bomb', 'brigadier', 'major',
  'engineer', 'colonel', 'captain', 'lieutenant', 'majorGeneral',
  'brigadier', 'major', 'engineer', 'captain', 'lieutenant',
];

export const createInitialJunqiBoard = (): (JunqiPiece | null)[][] => {
  const board = Array.from({ length: JUNQI_ROWS }, () =>
    Array.from({ length: JUNQI_COLS }, () => null as JunqiPiece | null)
  );

  let blueIndex = 0;
  for (let row = 0; row <= 5; row += 1) {
    for (let col = 0; col < JUNQI_COLS; col += 1) {
      if (isCamp(row, col)) continue;
      board[row][col] = {
        id: `blue-${blueIndex}`,
        color: 'blue',
        type: blueTypes[blueIndex],
        revealed: false,
      };
      blueIndex += 1;
    }
  }

  let redIndex = 0;
  for (let row = 6; row < JUNQI_ROWS; row += 1) {
    for (let col = 0; col < JUNQI_COLS; col += 1) {
      if (isCamp(row, col)) continue;
      board[row][col] = {
        id: `red-${redIndex}`,
        color: 'red',
        type: redTypes[redIndex],
        revealed: true,
      };
      redIndex += 1;
    }
  }

  return board;
};
