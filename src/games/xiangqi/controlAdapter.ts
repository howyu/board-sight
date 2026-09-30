import { ControlMapAdapter } from '../../core/controlMap';
import { XiangqiColor, XiangqiPiece, XiangqiPieceType } from './types';

const valid = (row: number, col: number) => row >= 0 && row < 10 && col >= 0 && col < 9;
const palace = (row: number, col: number, color: XiangqiColor) =>
  col >= 3 && col <= 5 && (color === 'red' ? row >= 7 && row <= 9 : row >= 0 && row <= 2);

const rayUntilBlocker = (board: (XiangqiPiece | null)[][], row: number, col: number) => {
  const out: { row: number; col: number }[] = [];
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
    let r=row+dr,c=col+dc;
    while(valid(r,c)) { out.push({row:r,col:c}); if(board[r][c]) break; r+=dr;c+=dc; }
  });
  return out;
};

const cannonControl = (board: (XiangqiPiece | null)[][], row: number, col: number) => {
  const out: { row: number; col: number }[] = [];
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
    let r=row+dr,c=col+dc,screen=false;
    while(valid(r,c)) {
      if(!screen) {
        if(board[r][c]) screen=true;
        else out.push({row:r,col:c});
      } else if(board[r][c]) {
        out.push({row:r,col:c});
        break;
      }
      r+=dr;c+=dc;
    }
  });
  return out;
};

export const xiangqiControlAdapter: ControlMapAdapter<XiangqiPiece, XiangqiColor, XiangqiPieceType> = {
  rows: 10,
  cols: 9,
  colors: ['red','black'] as const,
  getColor: (p) => p.color,
  getType: (p) => p.type,
  getValue: () => 1,
  getControlledSquares: (board,row,col,piece) => {
    switch(piece.type) {
      case 'chariot': return rayUntilBlocker(board,row,col);
      case 'cannon': return cannonControl(board,row,col);
      case 'horse': {
        const candidates = [
          {dr:-2,dc:-1,lr:-1,lc:0},{dr:-2,dc:1,lr:-1,lc:0},
          {dr:2,dc:-1,lr:1,lc:0},{dr:2,dc:1,lr:1,lc:0},
          {dr:-1,dc:-2,lr:0,lc:-1},{dr:1,dc:-2,lr:0,lc:-1},
          {dr:-1,dc:2,lr:0,lc:1},{dr:1,dc:2,lr:0,lc:1},
        ];
        return candidates.filter(m => !board[row+m.lr]?.[col+m.lc])
          .map(m=>({row:row+m.dr,col:col+m.dc})).filter(q=>valid(q.row,q.col));
      }
      case 'elephant': {
        const moves=[[-2,-2],[-2,2],[2,-2],[2,2]];
        return moves.map(([dr,dc])=>({row:row+dr,col:col+dc,eyeRow:row+dr/2,eyeCol:col+dc/2}))
          .filter(q=>valid(q.row,q.col) && !board[q.eyeRow][q.eyeCol] &&
            (piece.color==='red' ? q.row>=5 : q.row<=4))
          .map(({row,col})=>({row,col}));
      }
      case 'advisor':
        return [[-1,-1],[-1,1],[1,-1],[1,1]].map(([dr,dc])=>({row:row+dr,col:col+dc}))
          .filter(q=>palace(q.row,q.col,piece.color));
      case 'general': {
        const out=[[ -1,0],[1,0],[0,-1],[0,1]].map(([dr,dc])=>({row:row+dr,col:col+dc}))
          .filter(q=>palace(q.row,q.col,piece.color));
        const dr=piece.color==='red'?-1:1; let r=row+dr;
        while(valid(r,col)) {
          const target=board[r][col];
          if(target) { if(target.type==='general' && target.color!==piece.color) out.push({row:r,col}); break; }
          r+=dr;
        }
        return out;
      }
      case 'soldier': {
        const forward=piece.color==='red'?-1:1;
        const crossed=piece.color==='red'?row<=4:row>=5;
        const moves=[{row:row+forward,col}];
        if(crossed) moves.push({row,col:col-1},{row,col:col+1});
        return moves.filter(q=>valid(q.row,q.col));
      }
    }
  }
};
