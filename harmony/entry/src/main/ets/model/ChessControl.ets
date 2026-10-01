import { ChessPiece, ControlCell, Position } from './ChessTypes'

const BOARD_SIZE: number = 8

function isValid(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

function ray(
  board: (ChessPiece | null)[][],
  row: number,
  col: number,
  directions: number[][]
): Position[] {
  const result: Position[] = []
  directions.forEach((direction: number[]) => {
    const dRow: number = direction[0]
    const dCol: number = direction[1]
    let r: number = row + dRow
    let c: number = col + dCol
    while (isValid(r, c)) {
      result.push({ row: r, col: c })
      if (board[r][c] !== null) {
        break
      }
      r += dRow
      c += dCol
    }
  })
  return result
}

export function controlledSquares(
  board: (ChessPiece | null)[][],
  row: number,
  col: number,
  piece: ChessPiece
): Position[] {
  if (piece.type === 'pawn') {
    const direction: number = piece.color === 'white' ? -1 : 1
    const pawnSquares: Position[] = [
      { row: row + direction, col: col - 1 },
      { row: row + direction, col: col + 1 }
    ]
    return pawnSquares.filter((position: Position) => isValid(position.row, position.col))
  }

  if (piece.type === 'rook') {
    return ray(board, row, col, [[-1, 0], [1, 0], [0, -1], [0, 1]])
  }

  if (piece.type === 'bishop') {
    return ray(board, row, col, [[-1, -1], [-1, 1], [1, -1], [1, 1]])
  }

  if (piece.type === 'queen') {
    return ray(board, row, col, [
      [-1, -1], [-1, 0], [-1, 1], [0, -1],
      [0, 1], [1, -1], [1, 0], [1, 1]
    ])
  }

  if (piece.type === 'knight') {
    return [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ]
      .map((offset: number[]): Position => ({ row: row + offset[0], col: col + offset[1] }))
      .filter((position: Position) => isValid(position.row, position.col))
  }

  const kingSquares: Position[] = []
  for (let dRow: number = -1; dRow <= 1; dRow++) {
    for (let dCol: number = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) {
        continue
      }
      const position: Position = { row: row + dRow, col: col + dCol }
      if (isValid(position.row, position.col)) {
        kingSquares.push(position)
      }
    }
  }
  return kingSquares
}

export function calculateControlMap(board: (ChessPiece | null)[][]): ControlCell[][] {
  const map: ControlCell[][] = []
  for (let row: number = 0; row < BOARD_SIZE; row++) {
    const cells: ControlCell[] = []
    for (let col: number = 0; col < BOARD_SIZE; col++) {
      const cell: ControlCell = { white: 0, black: 0 }
      cells.push(cell)
    }
    map.push(cells)
  }

  board.forEach((boardRow: (ChessPiece | null)[], row: number) => {
    boardRow.forEach((piece: ChessPiece | null, col: number) => {
      if (piece === null) {
        return
      }
      controlledSquares(board, row, col, piece).forEach((position: Position) => {
        if (piece.color === 'white') {
          map[position.row][position.col].white += 1
        } else {
          map[position.row][position.col].black += 1
        }
      })
    })
  })

  return map
}
