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


export interface XiangqiCheckThreat {
  attacker: XiangqiPoint;
  target: XiangqiPoint;
  path: XiangqiPoint[];
}

export const areGeneralsFacing = (board: XiangqiBoardState): boolean => {
  const red = findGeneral(board, 'red');
  const black = findGeneral(board, 'black');
  if (!red || !black || red.col !== black.col) return false;
  const start = Math.min(red.row, black.row) + 1;
  const end = Math.max(red.row, black.row);
  for (let row = start; row < end; row += 1) {
    if (board[row][red.col]) return false;
  }
  return true;
};

export const getIllegalMoveReason = (
  board: XiangqiBoardState,
  from: XiangqiPoint,
  to: XiangqiPoint,
): string | null => {
  const piece = board[from.row]?.[from.col];
  if (!piece) return null;
  const pseudo = xiangqiControlAdapter
    .getControlledSquares(board, from.row, from.col, piece)
    .some((point) => point.row === to.row && point.col === to.col);
  if (!pseudo || board[to.row][to.col]?.color === piece.color) return null;

  const next = applyXiangqiMove(board, from, to);
  if (!isGeneralInCheck(next, piece.color)) return null;
  if (areGeneralsFacing(next)) return '该着会造成将帅照面';
  if (isGeneralInCheck(board, piece.color)) return '该着无法解除当前将军';
  return '该着会使己方将/帅暴露在攻击下';
};

export const getCheckThreats = (
  board: XiangqiBoardState,
  color: XiangqiColor,
): XiangqiCheckThreat[] => {
  const general = findGeneral(board, color);
  if (!general) return [];
  const enemy: XiangqiColor = color === 'red' ? 'black' : 'red';
  const threats: XiangqiCheckThreat[] = [];

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.color !== enemy) continue;
      const controls = xiangqiControlAdapter.getControlledSquares(board, row, col, piece);
      if (!controls.some((point) => point.row === general.row && point.col === general.col)) continue;

      const path: XiangqiPoint[] = [];
      if (row === general.row || col === general.col) {
        const dr = Math.sign(general.row - row);
        const dc = Math.sign(general.col - col);
        let r = row + dr;
        let c = col + dc;
        while (r !== general.row || c !== general.col) {
          path.push({ row: r, col: c });
          r += dr;
          c += dc;
        }
      } else if (piece.type === 'horse') {
        const dr = general.row - row;
        const dc = general.col - col;
        path.push(Math.abs(dr) === 2
          ? { row: row + Math.sign(dr), col }
          : { row, col: col + Math.sign(dc) });
      }
      threats.push({ attacker: { row, col }, target: general, path });
    }
  }

  return threats;
};
