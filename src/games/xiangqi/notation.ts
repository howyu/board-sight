import { XiangqiPiece } from './types';

type Point = { row: number; col: number };

const redFiles = ['九', '八', '七', '六', '五', '四', '三', '二', '一'];

const fileLabel = (piece: XiangqiPiece, col: number) =>
  piece.color === 'red' ? redFiles[col] : String(col + 1);

const stepLabel = (piece: XiangqiPiece, steps: number) =>
  piece.color === 'red' ? ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'][steps] ?? String(steps) : String(steps);

export const formatXiangqiMove = (piece: XiangqiPiece, from: Point, to: Point): string => {
  const pieceName = {
    general: piece.color === 'red' ? '帅' : '将',
    advisor: piece.color === 'red' ? '仕' : '士',
    elephant: piece.color === 'red' ? '相' : '象',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: piece.color === 'red' ? '兵' : '卒',
  }[piece.type];

  const source = fileLabel(piece, from.col);
  if (from.row === to.row) return `${pieceName}${source}平${fileLabel(piece, to.col)}`;

  const forward = piece.color === 'red' ? to.row < from.row : to.row > from.row;
  const action = forward ? '进' : '退';
  const diagonalPiece = piece.type === 'horse' || piece.type === 'advisor' || piece.type === 'elephant';

  if (diagonalPiece) return `${pieceName}${source}${action}${fileLabel(piece, to.col)}`;
  return `${pieceName}${source}${action}${stepLabel(piece, Math.abs(to.row - from.row))}`;
};
