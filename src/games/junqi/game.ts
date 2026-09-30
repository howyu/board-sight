import { JunqiObservation, applyJunqiObservation } from './belief';
import {
  JunqiObservationMap,
  JunqiOriginMap,
  buildCoupledBeliefs,
} from './beliefState';
import { canReachOnlyAsEngineer } from './sight';
import { getLegalJunqiDestinations, resolveJunqiCombat } from './rules';
import {
  JunqiBelief,
  JunqiColor,
  JunqiMoveRecord,
  JunqiPiece,
  JunqiPosition,
} from './types';

export interface JunqiGameState {
  board: (JunqiPiece | null)[][];
  turn: JunqiColor;
  history: JunqiMoveRecord[];
  observations: JunqiObservationMap;
  origins: JunqiOriginMap;
  winner: JunqiColor | null;
}

export interface JunqiMoveResult {
  ok: boolean;
  state: JunqiGameState;
  message: string;
}

const samePosition = (a: JunqiPosition, b: JunqiPosition) =>
  a.row === b.row && a.col === b.col;

const appendObservation = (
  observations: JunqiObservationMap,
  pieceId: string,
  observation: JunqiObservation
) => ({
  ...observations,
  [pieceId]: [...(observations[pieceId] ?? []), observation],
});

const revealFlag = (
  board: (JunqiPiece | null)[][],
  color: JunqiColor
) => {
  board.forEach((row) => {
    row.forEach((piece, col) => {
      if (piece?.color === color && piece.type === 'flag' && !piece.revealed) {
        row[col] = { ...piece, revealed: true };
      }
    });
  });
};

const buildOrigins = (
  board: (JunqiPiece | null)[][]
): JunqiOriginMap => {
  const origins: JunqiOriginMap = {};
  board.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (piece) origins[piece.id] = { row: rowIndex, col: colIndex };
    });
  });
  return origins;
};

export const createJunqiGameState = (
  board: (JunqiPiece | null)[][]
): JunqiGameState => ({
  board,
  turn: 'red',
  history: [],
  observations: {},
  origins: buildOrigins(board),
  winner: null,
});

export const getBeliefsForState = (
  state: JunqiGameState
): Record<string, JunqiBelief> =>
  buildCoupledBeliefs(state.board, state.observations, state.origins);

export const applyJunqiMove = (
  state: JunqiGameState,
  from: JunqiPosition,
  to: JunqiPosition
): JunqiMoveResult => {
  if (state.winner) return { ok: false, state, message: '对局已经结束。' };

  const piece = state.board[from.row]?.[from.col];
  if (!piece) return { ok: false, state, message: '起点没有棋子。' };
  if (piece.color !== state.turn) return { ok: false, state, message: '还没有轮到这一方。' };

  const legal = getLegalJunqiDestinations(state.board, from.row, from.col);
  if (!legal.some((p) => samePosition(p, to))) {
    return { ok: false, state, message: '该走法不符合当前军旗规则。' };
  }

  const board = state.board.map((row) => [...row]);
  const defender = board[to.row][to.col];
  let observations = { ...state.observations };
  let winner = state.winner;
  let outcome: JunqiMoveRecord['outcome'] = 'move';
  let message = '移动完成。';
  let lostMarshalColor: JunqiColor | null = null;

  if (piece.color === 'blue' && !piece.revealed) {
    observations = appendObservation(observations, piece.id, { kind: 'moved' });
    if (canReachOnlyAsEngineer(state.board, from, to)) {
      observations = appendObservation(observations, piece.id, { kind: 'railTurn' });
    }
  }

  board[from.row][from.col] = null;

  if (!defender) {
    board[to.row][to.col] = piece;
  } else {
    const combat = resolveJunqiCombat(piece.type, defender.type);
    outcome = combat;

    const hiddenBlue = piece.color === 'blue'
      ? piece
      : defender.color === 'blue'
        ? defender
        : null;
    const knownRed = piece.color === 'red'
      ? piece
      : defender.color === 'red'
        ? defender
        : null;

    if (hiddenBlue && knownRed && !hiddenBlue.revealed) {
      let observation: JunqiObservation | null = null;

      if (combat === 'both') {
        observation = { kind: 'drawCombat', opponent: knownRed.type };
      } else if (piece.color === 'blue') {
        observation = combat === 'attacker'
          ? { kind: 'wonCombat', defeated: knownRed.type }
          : combat === 'defender'
            ? { kind: 'lostCombat', defeatedBy: knownRed.type }
            : null;
      } else {
        observation = combat === 'attacker' || combat === 'flag'
          ? { kind: 'lostCombat', defeatedBy: knownRed.type }
          : combat === 'defender'
            ? { kind: 'wonCombat', defeated: knownRed.type }
            : null;
      }

      if (observation) {
        observations = appendObservation(observations, hiddenBlue.id, observation);
      }
    }

    if (combat === 'attacker') {
      if (defender.type === 'marshal') lostMarshalColor = defender.color;
      board[to.row][to.col] = piece;
      message = piece.color === 'red' ? '我方进攻成功。' : '蓝方进攻成功。';
    } else if (combat === 'defender') {
      if (piece.type === 'marshal') lostMarshalColor = piece.color;
      board[to.row][to.col] = defender;
      message = piece.color === 'red' ? '我方进攻失败。' : '蓝方进攻失败。';
    } else if (combat === 'both') {
      if (piece.type === 'marshal') lostMarshalColor = piece.color;
      if (defender.type === 'marshal') lostMarshalColor = defender.color;
      board[to.row][to.col] = null;
      message = '双方同归于尽。';
    } else {
      board[to.row][to.col] = piece;
      winner = piece.color;
      message = `${piece.color === 'red' ? '红方' : '蓝方'}夺取军旗，对局结束。`;
    }
  }

  if (lostMarshalColor) {
    revealFlag(board, lostMarshalColor);
    message += ` ${lostMarshalColor === 'red' ? '红方' : '蓝方'}司令阵亡，军旗位置公开。`;
  }

  const nextTurn: JunqiColor = state.turn === 'red' ? 'blue' : 'red';
  const record: JunqiMoveRecord = {
    ply: state.history.length + 1,
    color: piece.color,
    pieceId: piece.id,
    from,
    to,
    attackerType: piece.type,
    defenderId: defender?.id,
    defenderType: defender?.type,
    outcome,
  };

  return {
    ok: true,
    message,
    state: {
      board,
      turn: nextTurn,
      history: [...state.history, record],
      observations,
      origins: state.origins,
      winner,
    },
  };
};

export const previewBeliefAfterObservation = (
  belief: JunqiBelief,
  observation: JunqiObservation
) => applyJunqiObservation(belief, observation);
