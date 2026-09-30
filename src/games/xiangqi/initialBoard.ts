import { XiangqiPiece } from './types';

export const createInitialXiangqiBoard = (): (XiangqiPiece | null)[][] => {
  const board: (XiangqiPiece | null)[][] = Array.from({ length: 10 }, () =>
    Array(9).fill(null)
  );

  const backRank = ['chariot','horse','elephant','advisor','general','advisor','elephant','horse','chariot'] as const;
  board[0] = backRank.map((type): XiangqiPiece => ({ type, color: 'black' }));
  board[2][1] = { type: 'cannon', color: 'black' };
  board[2][7] = { type: 'cannon', color: 'black' };
  [0, 2, 4, 6, 8].forEach((col) => (board[3][col] = { type: 'soldier', color: 'black' }));

  board[9] = backRank.map((type): XiangqiPiece => ({ type, color: 'red' }));
  board[7][1] = { type: 'cannon', color: 'red' };
  board[7][7] = { type: 'cannon', color: 'red' };
  [0, 2, 4, 6, 8].forEach((col) => (board[6][col] = { type: 'soldier', color: 'red' }));

  return board;
};
