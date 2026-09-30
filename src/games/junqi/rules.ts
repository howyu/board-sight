import { isCamp, isHeadquarters } from './terrain';
import { getJunqiControlledSquares } from './sight';
import { JunqiPiece, JunqiPieceType, JunqiPosition } from './types';

const rank: Partial<Record<JunqiPieceType, number>> = {
  marshal: 9,
  general: 8,
  majorGeneral: 7,
  brigadier: 6,
  colonel: 5,
  major: 4,
  captain: 3,
  lieutenant: 2,
  engineer: 1,
};

export type CombatOutcome = 'attacker' | 'defender' | 'both' | 'flag';

export const canPieceMove = (piece: JunqiPiece, row: number, col: number) =>
  piece.type !== 'mine' &&
  piece.type !== 'flag' &&
  !isHeadquarters(row, col);

export const isProtectedCamp = (
  board: (JunqiPiece | null)[][],
  row: number,
  col: number
) => isCamp(row, col) && board[row][col] !== null;

export const getLegalJunqiDestinations = (
  board: (JunqiPiece | null)[][],
  row: number,
  col: number
): JunqiPosition[] => {
  const piece = board[row]?.[col];
  if (!piece || !canPieceMove(piece, row, col)) return [];

  return getJunqiControlledSquares(board, row, col, piece).filter((dest) => {
    const occupant = board[dest.row][dest.col];

    // A camp occupied by either side is a safe island and cannot be attacked.
    if (occupant && isCamp(dest.row, dest.col)) return false;

    // A piece cannot move onto another friendly piece.
    if (occupant?.color === piece.color) return false;

    return true;
  });
};

export const resolveJunqiCombat = (
  attacker: JunqiPieceType,
  defender: JunqiPieceType
): CombatOutcome => {
  if (defender === 'flag') return 'flag';

  if (attacker === 'bomb' || defender === 'bomb') return 'both';

  if (defender === 'mine') {
    return attacker === 'engineer' ? 'attacker' : 'defender';
  }

  // Flag and mine are immobile and should not normally be attackers, but keep
  // the resolver total so malformed imported positions do not crash analysis.
  if (attacker === 'flag' || attacker === 'mine') return 'defender';

  const a = rank[attacker] ?? -1;
  const d = rank[defender] ?? -1;

  if (a > d) return 'attacker';
  if (a < d) return 'defender';
  return 'both';
};
