import { isCamp, JUNQI_COLS, JUNQI_ROWS } from './terrain';
import { JunqiPiece, JunqiPieceType } from './types';

const ownTypes: JunqiPieceType[] = [
  'captain', 'colonel', 'majorGeneral', 'brigadier', 'lieutenant',
  'engineer', 'bomb', 'major', 'engineer', 'captain',
  'lieutenant', 'colonel', 'marshal', 'majorGeneral', 'brigadier',
  'mine', 'major', 'bomb', 'general', 'mine',
  'mine', 'flag', 'engineer', 'captain', 'lieutenant',
];

export const createInitialJunqiBoard = (): (JunqiPiece | null)[][] => {
  const board = Array.from({ length: JUNQI_ROWS }, () =>
    Array.from({ length: JUNQI_COLS }, () => null as JunqiPiece | null)
  );

  let enemyIndex = 0;
  for (let row = 0; row <= 5; row += 1) {
    for (let col = 0; col < JUNQI_COLS; col += 1) {
      if (isCamp(row, col)) continue;
      board[row][col] = {
        id: `blue-${enemyIndex++}`,
        color: 'blue',
        type: null,
        revealed: false,
      };
    }
  }

  let ownIndex = 0;
  for (let row = 6; row < JUNQI_ROWS; row += 1) {
    for (let col = 0; col < JUNQI_COLS; col += 1) {
      if (isCamp(row, col)) continue;
      board[row][col] = {
        id: `red-${ownIndex}`,
        color: 'red',
        type: ownTypes[ownIndex],
        revealed: true,
      };
      ownIndex += 1;
    }
  }

  return board;
};
