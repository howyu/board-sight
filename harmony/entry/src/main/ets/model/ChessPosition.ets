import { ChessPiece, PieceType, PieceColor } from './ChessTypes'

function piece(type: PieceType, color: PieceColor): ChessPiece {
  return { type, color }
}

function pawnRow(color: PieceColor): (ChessPiece | null)[] {
  const row: (ChessPiece | null)[] = []
  for (let col: number = 0; col < 8; col++) {
    row.push(piece('pawn', color))
  }
  return row
}

function emptyRow(): (ChessPiece | null)[] {
  const row: (ChessPiece | null)[] = []
  for (let col: number = 0; col < 8; col++) {
    row.push(null)
  }
  return row
}

export function createInitialBoard(): (ChessPiece | null)[][] {
  return [
    [
      piece('rook', 'black'), piece('knight', 'black'), piece('bishop', 'black'), piece('queen', 'black'),
      piece('king', 'black'), piece('bishop', 'black'), piece('knight', 'black'), piece('rook', 'black')
    ],
    pawnRow('black'),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    pawnRow('white'),
    [
      piece('rook', 'white'), piece('knight', 'white'), piece('bishop', 'white'), piece('queen', 'white'),
      piece('king', 'white'), piece('bishop', 'white'), piece('knight', 'white'), piece('rook', 'white')
    ]
  ]
}

export function pieceGlyph(value: ChessPiece | null): string {
  if (value === null) {
    return ''
  }

  const glyphs: Record<string, string> = {
    'white-king': '♔',
    'white-queen': '♕',
    'white-rook': '♖',
    'white-bishop': '♗',
    'white-knight': '♘',
    'white-pawn': '♙',
    'black-king': '♚',
    'black-queen': '♛',
    'black-rook': '♜',
    'black-bishop': '♝',
    'black-knight': '♞',
    'black-pawn': '♟'
  }

  return glyphs[`${value.color}-${value.type}`]
}
