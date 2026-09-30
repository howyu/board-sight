export interface BoardPosition {
  row: number;
  col: number;
}

export interface ControlContribution<PieceType extends string> {
  type: PieceType;
  value: number;
}

export interface ControlCount<Color extends string, PieceType extends string> {
  counts: Record<Color, number>;
  pieces: Record<Color, ControlContribution<PieceType>[]>;
}

export interface ControlMapAdapter<Piece, Color extends string, PieceType extends string> {
  rows: number;
  cols: number;
  colors: readonly Color[];
  getColor(piece: Piece): Color;
  getType(piece: Piece): PieceType;
  getValue(type: PieceType): number;
  getControlledSquares(
    board: (Piece | null)[][],
    row: number,
    col: number,
    piece: Piece
  ): BoardPosition[];
}

export const calculateControlMap = <
  Piece,
  Color extends string,
  PieceType extends string
>(
  board: (Piece | null)[][],
  adapter: ControlMapAdapter<Piece, Color, PieceType>
): ControlCount<Color, PieceType>[][] => {
  const makeCell = (): ControlCount<Color, PieceType> => {
    const counts = {} as Record<Color, number>;
    const pieces = {} as Record<Color, ControlContribution<PieceType>[]>;
    adapter.colors.forEach((color) => {
      counts[color] = 0;
      pieces[color] = [];
    });
    return { counts, pieces };
  };

  const map = Array.from({ length: adapter.rows }, () =>
    Array.from({ length: adapter.cols }, makeCell)
  );

  board.forEach((boardRow, row) => {
    boardRow.forEach((piece, col) => {
      if (!piece) return;
      const color = adapter.getColor(piece);
      const type = adapter.getType(piece);
      const value = adapter.getValue(type);
      adapter.getControlledSquares(board, row, col, piece).forEach((position) => {
        if (
          position.row < 0 ||
          position.row >= adapter.rows ||
          position.col < 0 ||
          position.col >= adapter.cols
        ) return;
        map[position.row][position.col].counts[color] += 1;
        map[position.row][position.col].pieces[color].push({ type, value });
      });
    });
  });

  return map;
};
