import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'

// Execute the actual platform model sources; this does not replace ArkTS/ArkUI compilation.
const temporary = mkdtempSync(join(tmpdir(), 'boardsight-parity-'))
try {
  writeFileSync(join(temporary, 'package.json'), '{"type":"commonjs"}')
  const sources = [
    'harmony/entry/src/main/ets/model/ChessTypes.ets',
    'harmony/entry/src/main/ets/model/ChessPosition.ets',
    'harmony/entry/src/main/ets/model/ChessControl.ets',
    'src/core/controlMap.ts', 'src/games/chess/controlAdapter.ts', 'src/constants.ts',
  ]
  for (const source of sources) {
    const target = join(temporary, source.replace(/\.(ets|ts)$/, '.js'))
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, ts.transpileModule(readFileSync(source, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText)
  }
  const require = createRequire(join(temporary, 'runner.cjs'))
  const native = require('./harmony/entry/src/main/ets/model/ChessControl.js')
  const { createInitialBoard } = require('./harmony/entry/src/main/ets/model/ChessPosition.js')
  const web = require('./src/core/controlMap.js')
  const { chessControlAdapter } = require('./src/games/chess/controlAdapter.js')
  const fixtures = JSON.parse(readFileSync('shared/chess/control-fixtures.json', 'utf8'))
  for (const fixture of fixtures.positions) {
    const board = fixture.board.map(row => row.map(value => {
      if (value === null) return null
      const [color, type] = value.split('-')
      return { color, type }
    }))
    if (fixture.id === 'initial-position') assert.deepEqual(createInitialBoard(), board)
    const actual = native.calculateControlMap(board)
    const reference = web.calculateControlMap(board, chessControlAdapter)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        assert.equal(`${actual[row][col].white}:${actual[row][col].black}`,
          fixture.expectedControlCounts[row][col], `${fixture.id}: ${row},${col}`)
        assert.deepEqual(actual[row][col], reference[row][col].counts)
        const piece = board[row][col]
        if (piece) assert.deepEqual(native.controlledSquares(board, row, col, piece),
          chessControlAdapter.getControlledSquares(board, row, col, piece))
      }
    }
    for (const selected of fixture.selectedPieceFixtures) {
      const col = selected.square.charCodeAt(0) - 97
      const row = 8 - Number(selected.square[1])
      const piece = board[row][col]
      assert.equal(`${piece.color}-${piece.type}`, selected.piece)
      const squares = native.controlledSquares(board, row, col, piece)
        .map(p => `${String.fromCharCode(97 + p.col)}${8 - p.row}`).sort()
      assert.deepEqual(squares, [...selected.expectedControlledSquares].sort())
    }
    console.log(`PASS ${fixture.id}: 64 control counts, all pieces, selected-square fixtures`)
  }
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
