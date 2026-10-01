import { JunqiCandidateMove } from './decision';
import { JunqiGameState, getBeliefsForState } from './game';

export interface JevDecisionResult {
  model: string;
  choice: string;
  confidence: number | null;
  probabilities: Record<string, number>;
}

export const candidateJevId = (candidate: JunqiCandidateMove, index: number) =>
  `m${index}_${candidate.from.row}_${candidate.from.col}_${candidate.to.row}_${candidate.to.col}`;

export const scoreJunqiCandidatesWithJev = async (
  game: JunqiGameState,
  candidates: JunqiCandidateMove[]
): Promise<JevDecisionResult> => {
  const beliefs = getBeliefsForState(game);
  const limited = candidates.slice(0, 16);

  const observableBoard = game.board.flatMap((row, r) =>
    row.flatMap((piece, c) => {
      if (!piece) return [];
      const hidden = piece.color === 'blue' && !piece.revealed;
      return [{
        r,
        c,
        side: piece.color,
        piece: hidden ? 'unknown' : piece.type,
        belief: hidden
          ? (beliefs[piece.id]?.entries.slice(0, 5) ?? [])
              .map((entry) => ({ type: entry.type, p: Number(entry.probability.toFixed(4)) }))
          : null,
      }];
    })
  );

  const response = await fetch('/api/junqi/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state: {
        game: 'Chinese Junqi',
        perspective: game.turn,
        moveNumber: game.history.length + 1,
        board: observableBoard,
        recentHistory: game.history.slice(-8).map((record) => ({
          side: record.color,
          from: record.from,
          to: record.to,
          outcome: record.outcome ?? 'move',
        })),
      },
      candidates: limited.map((candidate, index) => ({
        id: candidateJevId(candidate, index),
        description:
          `from ${candidate.from.row + 1},${candidate.from.col + 1} to ${candidate.to.row + 1},${candidate.to.col + 1}; ` +
          `local=${candidate.score.toFixed(2)}, capture=${candidate.captureValue.toFixed(2)}, ` +
          `risk=${candidate.riskPenalty.toFixed(2)}, mobility=${candidate.mobilityValue.toFixed(2)}, ` +
          `info=${candidate.informationValue.toFixed(2)}; ${candidate.explanation}`,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? `jev_http_${response.status}`);
  }

  return response.json();
};
