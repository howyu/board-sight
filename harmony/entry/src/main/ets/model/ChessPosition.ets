import { ChessPiece } from './ChessTypes'

function piece(type: ChessPiece['type'], color: ChessPiece['color']): ChessPiece {
  return { type, color }
}

export function createInitialBoard(): (ChessPiece | null)[][] {
  return [
    [
      piece('rook', 'black'), piece('knight', 'black'), piece('bishop', 'black'), piece('queen', 'black'),
      piece('king', 'black'), piece('bishop', 'black'), piece('knight', 'black'), piece('rook', 'black')
    ],
    Array.from({ length: 8 }, () => piece('pawn', 'black')),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => piece('pawn', 'white')),
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
