import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const dir = mkdtempSync(join(tmpdir(), 'junqi-test-'));
try {
  execFileSync('node_modules/.bin/tsc', ['src/games/junqi/initialBoard.ts', 'src/games/junqi/rules.ts', '--outDir', dir, '--module', 'commonjs', '--target', 'es2020', '--skipLibCheck']);
  const require = createRequire(import.meta.url);
  const terrain = require(join(dir, 'terrain.js'));
  const { createInitialJunqiBoard } = require(join(dir, 'initialBoard.js'));
  const { getLegalJunqiDestinations } = require(join(dir, 'rules.js'));
  assert.deepEqual([...terrain.campKeys], ['2-1','2-3','3-2','4-1','4-3','7-1','7-3','8-2','9-1','9-3']);
  for (const key of terrain.campKeys) assert(!terrain.railwayKeys.has(key));
  const board = createInitialJunqiBoard();
  for (const color of ['red', 'blue']) assert.equal(board.flat().filter(p => p?.color === color).length, 25);
  board.forEach((row, r) => row.forEach((p, c) => {
    if (terrain.isCamp(r, c)) assert.equal(p, null);
    if (p?.type === 'flag') assert(terrain.isHeadquarters(r, c));
    if (p?.type === 'mine') assert(p.color === 'blue' ? r <= 1 : r >= 10);
    if (p?.type === 'bomb') assert(p.color === 'blue' ? r !== 5 : r !== 6);
  }));
  assert.deepEqual(terrain.roadNeighbors({row:5,col:1}).filter(p => p.row === 6), []);
  assert(terrain.roadNeighbors({row:5,col:2}).some(p => p.row === 6 && p.col === 2));
  const empty = Array.from({length:12}, () => Array(5).fill(null));
  const piece = {id:'test',color:'red',type:'captain',revealed:true};
  empty[1][0] = piece;
  const moves = () => getLegalJunqiDestinations(empty,1,0);
  assert(moves().some(p => p.row === 10 && p.col === 0));
  assert(!moves().some(p => p.row === 10 && p.col === 4));
  piece.type = 'engineer';
  assert(moves().some(p => p.row === 10 && p.col === 4));
  empty[2][0] = {id:'block',color:'red',type:'captain',revealed:true};
  piece.type = 'captain';
  assert(!moves().some(p => p.row === 3 && p.col === 0));
  console.log('Junqi terrain, setup, bridges and railway movement checks passed');
} finally { rmSync(dir, {recursive:true,force:true}); }
