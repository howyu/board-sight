export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king'
export type PieceColor = 'white' | 'black'

export interface Position {
  row: number
  col: number
}

export interface ChessPiece {
  type: PieceType
  color: PieceColor
}

export interface ControlCell {
  white: number
  black: number
}
