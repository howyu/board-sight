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
  /** True identity used by the local rules engine. UI/analysis must respect revealed. */
  type: JunqiPieceType;
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
  source: 'prior' | 'history' | 'coupled';
}

export interface JunqiMoveRecord {
  ply: number;
  color: JunqiColor;
  pieceId: string;
  from: JunqiPosition;
  to: JunqiPosition;
  attackerType?: JunqiPieceType;
  defenderId?: string;
  defenderType?: JunqiPieceType;
  outcome?: 'move' | 'attacker' | 'defender' | 'both' | 'flag';
}
