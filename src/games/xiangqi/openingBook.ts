import { getLegalMovesForPiece } from './legalRules';
import { formatXiangqiMove } from './notation';
import { XiangqiColor, XiangqiPiece } from './types';

type Point = { row: number; col: number };

export interface OpeningBookSuggestion {
  notation: string;
  from: Point;
  to: Point;
  label: string;
}

interface BookMove {
  from: Point;
  to: Point;
  label: string;
}

const book: Record<string, BookMove[]> = {
  '': [
    { from: { row: 7, col: 7 }, to: { row: 7, col: 4 }, label: '中炮' },
    { from: { row: 9, col: 7 }, to: { row: 7, col: 6 }, label: '起马' },
    { from: { row: 6, col: 2 }, to: { row: 5, col: 2 }, label: '仙人指路' },
  ],
  '炮二平五': [
    { from: { row: 0, col: 7 }, to: { row: 2, col: 6 }, label: '屏风马' },
    { from: { row: 0, col: 1 }, to: { row: 2, col: 2 }, label: '左马开发' },
    { from: { row: 3, col: 6 }, to: { row: 4, col: 6 }, label: '挺卒' },
  ],
  '炮二平五|马8进7': [
    { from: { row: 9, col: 7 }, to: { row: 7, col: 6 }, label: '正马' },
    { from: { row: 9, col: 1 }, to: { row: 7, col: 2 }, label: '左马开发' },
    { from: { row: 6, col: 2 }, to: { row: 5, col: 2 }, label: '挺兵' },
  ],
  '炮二平五|马8进7|马二进三': [
    { from: { row: 0, col: 1 }, to: { row: 2, col: 2 }, label: '双马正起' },
    { from: { row: 0, col: 8 }, to: { row: 0, col: 7 }, label: '出车' },
    { from: { row: 3, col: 6 }, to: { row: 4, col: 6 }, label: '挺卒' },
  ],
  '炮二平五|马8进7|马二进三|马2进3': [
    { from: { row: 9, col: 1 }, to: { row: 7, col: 2 }, label: '双马正起' },
    { from: { row: 9, col: 8 }, to: { row: 9, col: 7 }, label: '出车' },
    { from: { row: 6, col: 2 }, to: { row: 5, col: 2 }, label: '挺兵' },
  ],
  '马二进三': [
    { from: { row: 0, col: 7 }, to: { row: 2, col: 6 }, label: '对称起马' },
    { from: { row: 3, col: 4 }, to: { row: 4, col: 4 }, label: '挺中卒' },
    { from: { row: 0, col: 1 }, to: { row: 2, col: 2 }, label: '双马布局' },
  ],
};

export const getOpeningBookSuggestions = (
  board: (XiangqiPiece | null)[][],
  turn: XiangqiColor,
  moveNotations: string[],
): OpeningBookSuggestion[] => {
  if (moveNotations.length > 5) return [];
  const key = moveNotations.join('|');
  const candidates = book[key] ?? [];

  return candidates.flatMap((candidate) => {
    const piece = board[candidate.from.row]?.[candidate.from.col];
    if (!piece || piece.color !== turn) return [];
    const legal = getLegalMovesForPiece(board, candidate.from.row, candidate.from.col)
      .some((move) => move.row === candidate.to.row && move.col === candidate.to.col);
    if (!legal) return [];
    return [{
      notation: formatXiangqiMove(piece, candidate.from, candidate.to),
      ...candidate,
    }];
  }).slice(0, 3);
};
