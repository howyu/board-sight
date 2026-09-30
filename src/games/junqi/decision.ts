import { getBeliefsForState } from './game';
import { getLegalJunqiDestinations, resolveJunqiCombat } from './rules';
import { JUNQI_COMBAT_VALUE, calculateJunqiRiskMap } from './sight';
import {
  JunqiBelief,
  JunqiMoveRecord,
  JunqiPiece,
  JunqiPosition,
} from './types';
import { JunqiGameState } from './game';

export interface JunqiCandidateMove {
  from: JunqiPosition;
  to: JunqiPosition;
  piece: JunqiPiece;
  target: JunqiPiece | null;
  score: number;
  captureValue: number;
  riskPenalty: number;
  mobilityValue: number;
  informationValue: number;
  explanation: string;
}

const entropy = (belief?: JunqiBelief) => {
  if (!belief) return 0;
  return -belief.entries.reduce(
    (sum, entry) =>
      entry.probability > 0
        ? sum + entry.probability * Math.log2(entry.probability)
        : sum,
    0
  );
};

const expectedCaptureValue = (
  attacker: JunqiPiece,
  target: JunqiPiece,
  belief: JunqiBelief | undefined
) => {
  if (target.revealed || !belief) {
    const outcome = resolveJunqiCombat(attacker.type, target.type);
    const targetValue = JUNQI_COMBAT_VALUE[target.type];
    const ownValue = JUNQI_COMBAT_VALUE[attacker.type];
    if (outcome === 'attacker' || outcome === 'flag') return targetValue + 2;
    if (outcome === 'both') return targetValue - ownValue * 0.7;
    return -ownValue;
  }

  return belief.entries.reduce((sum, entry) => {
    const outcome = resolveJunqiCombat(attacker.type, entry.type);
    const targetValue = JUNQI_COMBAT_VALUE[entry.type];
    const ownValue = JUNQI_COMBAT_VALUE[attacker.type];
    const value = outcome === 'attacker' || outcome === 'flag'
      ? targetValue + 2
      : outcome === 'both'
        ? targetValue - ownValue * 0.7
        : -ownValue;
    return sum + entry.probability * value;
  }, 0);
};

export const generateJunqiCandidates = (
  state: JunqiGameState,
  color: 'red' | 'blue' = state.turn
): JunqiCandidateMove[] => {
  const beliefs = getBeliefsForState(state);
  const risk = calculateJunqiRiskMap(state.board, beliefs, color);

  const candidates: JunqiCandidateMove[] = [];

  state.board.forEach((row, r) => {
    row.forEach((piece, c) => {
      if (!piece || piece.color !== color) return;
      const destinations = getLegalJunqiDestinations(state.board, r, c);

      destinations.forEach((to) => {
        const target = state.board[to.row][to.col];
        const targetBelief = target ? beliefs[target.id] : undefined;
        const captureValue = target
          ? expectedCaptureValue(piece, target, targetBelief)
          : 0;
        const riskPenalty = risk[to.row][to.col] * 0.55;
        const mobilityValue = destinations.length * 0.08;
        const informationValue = target && !target.revealed
          ? entropy(targetBelief) * 0.65
          : 0;

        // Small positional pressure: red advances upward, blue downward.
        const advance = color === 'red'
          ? (r - to.row) * 0.18
          : (to.row - r) * 0.18;

        const score =
          captureValue -
          riskPenalty +
          mobilityValue +
          informationValue +
          advance;

        const reasons: string[] = [];
        if (captureValue > 1) reasons.push('有正期望吃子');
        if (informationValue > 0.8) reasons.push('能显著获取暗子信息');
        if (riskPenalty > 2.5) reasons.push('落点受敌方高风险覆盖');
        if (advance > 0.2) reasons.push('向敌方纵深推进');
        if (!reasons.length) reasons.push('主要改善机动与位置');

        candidates.push({
          from: { row: r, col: c },
          to,
          piece,
          target,
          score,
          captureValue,
          riskPenalty,
          mobilityValue,
          informationValue,
          explanation: reasons.join('；'),
        });
      });
    });
  });

  return candidates.sort((a, b) => b.score - a.score);
};

export const chooseBlueMove = (state: JunqiGameState): JunqiCandidateMove | null => {
  if (state.turn !== 'blue' || state.winner) return null;

  // Blue knows its own identities. Red is fully visible in the current learning mode.
  // Reuse the same transparent scorer so behavior stays inspectable.
  return generateJunqiCandidates(state, 'blue')[0] ?? null;
};

export const formatMoveRecord = (
  record: JunqiMoveRecord,
  labels: Record<string, string>
) => {
  const side = record.color === 'red' ? '红' : '蓝';
  const piece = record.color === 'red'
    ? labels[record.attackerType ?? ''] ?? '棋子'
    : '暗子';
  return `${record.ply}. ${side}方${piece} ${record.from.row + 1},${record.from.col + 1} → ${record.to.row + 1},${record.to.col + 1}`;
};
