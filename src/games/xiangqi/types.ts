export type XiangqiColor = 'red' | 'black';
export type XiangqiPieceType =
  | 'general'
  | 'advisor'
  | 'elephant'
  | 'horse'
  | 'chariot'
  | 'cannon'
  | 'soldier';

export interface XiangqiPiece {
  type: XiangqiPieceType;
  color: XiangqiColor;
}
