import { applyJunqiHistory, JunqiObservation } from './belief';
import { JUNQI_INVENTORY, buildPriorBelief } from './sight';
import { JunqiBelief, JunqiPiece, JunqiPieceType } from './types';

export type JunqiObservationMap = Record<string, JunqiObservation[]>;

const normalizeEntries = (belief: JunqiBelief): JunqiBelief => {
  const total = belief.entries.reduce((sum, entry) => sum + entry.probability, 0);
  if (total <= 0) return belief;
  return {
    ...belief,
    entries: belief.entries
      .map((entry) => ({ ...entry, probability: entry.probability / total }))
      .sort((a, b) => b.probability - a.probability),
  };
};

export const getKnownBlueInventory = (
  board: (JunqiPiece | null)[][]
): Partial<Record<JunqiPieceType, number>> => {
  const known: Partial<Record<JunqiPieceType, number>> = {};
  board.flat().forEach((piece) => {
    if (!piece || piece.color !== 'blue' || !piece.revealed) return;
    known[piece.type] = (known[piece.type] ?? 0) + 1;
  });
  return known;
};

export const buildCoupledBeliefs = (
  board: (JunqiPiece | null)[][],
  observations: JunqiObservationMap = {},
  knownRemoved: Partial<Record<JunqiPieceType, number>> = {}
): Record<string, JunqiBelief> => {
  const hidden = board.flatMap((row, rowIndex) =>
    row.flatMap((piece, colIndex) =>
      piece && piece.color === 'blue' && !piece.revealed
        ? [{ piece, row: rowIndex, col: colIndex }]
        : []
    )
  );

  const known = getKnownBlueInventory(board);
  const remaining = { ...JUNQI_INVENTORY };
  (Object.keys(remaining) as JunqiPieceType[]).forEach((type) => {
    remaining[type] = Math.max(
      0,
      remaining[type] - (known[type] ?? 0) - (knownRemoved[type] ?? 0)
    );
  });

  const beliefs: Record<string, JunqiBelief> = {};
  hidden.forEach(({ piece, row, col }) => {
    beliefs[piece.id] = applyJunqiHistory(
      buildPriorBelief(piece, row, col),
      observations[piece.id] ?? []
    );
  });

  // Lightweight iterative proportional fitting:
  // normalize each piece, then nudge type-marginals toward remaining inventory.
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const expected: Partial<Record<JunqiPieceType, number>> = {};
    Object.values(beliefs).forEach((belief) => {
      belief.entries.forEach((entry) => {
        expected[entry.type] = (expected[entry.type] ?? 0) + entry.probability;
      });
    });

    Object.entries(beliefs).forEach(([pieceId, belief]) => {
      const adjusted: JunqiBelief = {
        ...belief,
        source: 'coupled',
        entries: belief.entries.map((entry) => {
          const current = expected[entry.type] ?? 0;
          const capacity = remaining[entry.type];
          const scale = current > 0 ? capacity / current : 0;
          return { ...entry, probability: entry.probability * scale };
        }),
      };
      beliefs[pieceId] = normalizeEntries(adjusted);
    });
  }

  return beliefs;
};
