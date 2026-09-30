import { JunqiBelief, JunqiPieceType } from './types';

export type JunqiObservation =
  | { kind: 'moved' }
  | { kind: 'railTurn' }
  | { kind: 'revealed'; type: JunqiPieceType }
  | { kind: 'wonCombat'; defeated: JunqiPieceType }
  | { kind: 'lostCombat'; defeatedBy: JunqiPieceType }
  | { kind: 'drawCombat'; opponent: JunqiPieceType };

const strength: Partial<Record<JunqiPieceType, number>> = {
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

const normalize = (belief: JunqiBelief): JunqiBelief => {
  const total = belief.entries.reduce((sum, entry) => sum + entry.probability, 0);
  if (total <= 0) return { ...belief, entries: [] };
  return {
    ...belief,
    entries: belief.entries
      .map((entry) => ({ ...entry, probability: entry.probability / total }))
      .sort((a, b) => b.probability - a.probability),
  };
};

const filterBelief = (
  belief: JunqiBelief,
  predicate: (type: JunqiPieceType) => boolean
): JunqiBelief =>
  normalize({
    ...belief,
    source: 'history',
    entries: belief.entries.filter((entry) => predicate(entry.type)),
  });

export const applyJunqiObservation = (
  belief: JunqiBelief,
  observation: JunqiObservation
): JunqiBelief => {
  switch (observation.kind) {
    case 'revealed':
      return {
        pieceId: belief.pieceId,
        source: 'history',
        entries: [{ type: observation.type, probability: 1 }],
      };

    case 'moved':
      return filterBelief(
        belief,
        (type) => type !== 'mine' && type !== 'flag'
      );

    case 'railTurn':
      // Under standard rules only engineers may turn on railways.
      return filterBelief(belief, (type) => type === 'engineer');

    case 'wonCombat': {
      const defeated = observation.defeated;
      if (defeated === 'mine') {
        return filterBelief(belief, (type) => type === 'engineer' || type === 'bomb');
      }
      if (defeated === 'flag') return belief;
      if (defeated === 'bomb') return filterBelief(belief, (type) => type === 'bomb');

      const target = strength[defeated] ?? -1;
      return filterBelief(
        belief,
        (type) =>
          type === 'bomb' ||
          (strength[type] !== undefined && (strength[type] as number) > target)
      );
    }

    case 'lostCombat': {
      const winner = observation.defeatedBy;
      if (winner === 'bomb') return filterBelief(belief, (type) => type === 'bomb');
      if (winner === 'mine') {
        return filterBelief(
          belief,
          (type) => type !== 'engineer' && type !== 'bomb' && type !== 'flag'
        );
      }

      const target = strength[winner] ?? -1;
      return filterBelief(
        belief,
        (type) =>
          type !== 'bomb' &&
          type !== 'mine' &&
          type !== 'flag' &&
          strength[type] !== undefined &&
          (strength[type] as number) < target
      );
    }

    case 'drawCombat': {
      const opponent = observation.opponent;
      if (opponent === 'bomb') return belief;
      if (opponent === 'mine') return filterBelief(belief, (type) => type === 'bomb');
      return filterBelief(
        belief,
        (type) => type === 'bomb' || type === opponent
      );
    }
  }
};

export const applyJunqiHistory = (
  prior: JunqiBelief,
  observations: JunqiObservation[]
): JunqiBelief =>
  observations.reduce(applyJunqiObservation, prior);
