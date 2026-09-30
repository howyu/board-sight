export type JunqiColor = 'red' | 'blue';

export type JunqiPieceType =
  | 'marshal'
  | 'general'
  | 'majorGeneral'
  | 'brigadier'
  | 'colonel'
  | 'major'
  | 'captain'
  | 'lieutenant'
  | 'engineer'
  | 'mine'
  | 'bomb'
  | 'flag';

export interface JunqiPiece {
  id: string;
  color: JunqiColor;
  type: JunqiPieceType | null;
  revealed: boolean;
}

export interface JunqiPosition {
  row: number;
  col: number;
}

export interface JunqiBeliefEntry {
  type: JunqiPieceType;
  probability: number;
}

export interface JunqiBelief {
  pieceId: string;
  entries: JunqiBeliefEntry[];
  source: 'prior' | 'history';
}
