import { PIECE_VALUES } from '../../constants';
import { PieceColor, PieceState, PieceType, Position } from '../../types';
import { ControlMapAdapter } from '../../core/controlMap';

const isValid = (row: number, col: number) =>
  row >= 0 && row < 8 && col >= 0 && col < 8;

const ray = (
  board: (PieceState | null)[][],
  row: number,
  col: number,
  directions: number[][]
): Position[] => {
  const result: Position[] = [];
  directions.forEach(([dRow, dCol]) => {
    let r = row + dRow;
    let c = col + dCol;
    while (isValid(r, c)) {
      result.push({ row: r, col: c });
      if (board[r][c]) break;
      r += dRow;
      c += dCol;
    }
  });
  return result;
};

export const chessControlAdapter: ControlMapAdapter<
  PieceState,
  PieceColor,
  PieceType
> = {
  rows: 8,
  cols: 8,
  colors: ['white', 'black'] as const,
  getColor: (piece) => piece.color,
  getType: (piece) => piece.type,
  getValue: (type) => PIECE_VALUES[type],
  getControlledSquares: (board, row, col, piece) => {
    switch (piece.type) {
      case 'pawn': {
        const direction = piece.color === 'white' ? -1 : 1;
        return [
          { row: row + direction, col: col - 1 },
          { row: row + direction, col: col + 1 },
        ].filter((p) => isValid(p.row, p.col));
      }
      case 'rook':
        return ray(board, row, col, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
      case 'bishop':
        return ray(board, row, col, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
      case 'queen':
        return ray(board, row, col, [
          [-1, -1], [-1, 0], [-1, 1], [0, -1],
          [0, 1], [1, -1], [1, 0], [1, 1],
        ]);
      case 'knight':
        return [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1],
        ]
          .map(([dRow, dCol]) => ({ row: row + dRow, col: col + dCol }))
          .filter((p) => isValid(p.row, p.col));
      case 'king': {
        const result: Position[] = [];
        for (let dRow = -1; dRow <= 1; dRow++) {
          for (let dCol = -1; dCol <= 1; dCol++) {
            if (dRow === 0 && dCol === 0) continue;
            const p = { row: row + dRow, col: col + dCol };
            if (isValid(p.row, p.col)) result.push(p);
          }
        }
        return result;
      }
    }
  },
};
