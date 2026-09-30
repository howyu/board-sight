import { xiangqiControlAdapter } from './controlAdapter';
import { XiangqiColor, XiangqiPiece } from './types';

export type XiangqiBoardState = (XiangqiPiece | null)[][];

export interface XiangqiPoint {
  row: number;
  col: number;
}

export const applyXiangqiMove = (
  board: XiangqiBoardState,
  from: XiangqiPoint,
  to: XiangqiPoint,
): XiangqiBoardState => {
  const next = board.map((row) => [...row]);
  next[to.row][to.col] = next[from.row][from.col];
  next[from.row][from.col] = null;
  return next;
};

export const findGeneral = (board: XiangqiBoardState, color: XiangqiColor): XiangqiPoint | null => {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const piece = board[row][col];
      if (piece?.type === 'general' && piece.color === color) return { row, col };
    }
  }
  return null;
};

export const isGeneralInCheck = (board: XiangqiBoardState, color: XiangqiColor): boolean => {
  const general = findGeneral(board, color);
  if (!general) return true;

  const enemy: XiangqiColor = color === 'red' ? 'black' : 'red';
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.color !== enemy) continue;
      const controlled = xiangqiControlAdapter.getControlledSquares(board, row, col, piece);
      if (controlled.some((point) => point.row === general.row && point.col === general.col)) return true;
    }
  }
  return false;
};

export const getLegalMovesForPiece = (
  board: XiangqiBoardState,
  row: number,
  col: number,
): XiangqiPoint[] => {
  const piece = board[row]?.[col];
  if (!piece) return [];

  return xiangqiControlAdapter
    .getControlledSquares(board, row, col, piece)
    .filter((point) => board[point.row][point.col]?.color !== piece.color)
    .filter((point) => {
      const next = applyXiangqiMove(board, { row, col }, point);
      return !isGeneralInCheck(next, piece.color);
    });
};

export const hasAnyLegalMove = (board: XiangqiBoardState, color: XiangqiColor): boolean => {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      if (board[row][col]?.color === color && getLegalMovesForPiece(board, row, col).length > 0) return true;
    }
  }
  return false;
};
