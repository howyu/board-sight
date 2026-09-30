import { useMemo } from 'react';
import { PieceState, PieceType } from '../types';
import { calculateControlMap } from '../core/controlMap';
import { chessControlAdapter } from '../games/chess/controlAdapter';

export interface DominationCount {
  white: number;
  black: number;
  whitePieces: { type: PieceType; value: number }[];
  blackPieces: { type: PieceType; value: number }[];
}

export const useDomination = (pieces: (PieceState | null)[][]) => {
  const domination = useMemo<DominationCount[][]>(() => {
    const controlMap = calculateControlMap(pieces, chessControlAdapter);
    return controlMap.map((row) =>
      row.map((cell) => ({
        white: cell.counts.white,
        black: cell.counts.black,
        whitePieces: cell.pieces.white,
        blackPieces: cell.pieces.black,
      }))
    );
  }, [pieces]);

  const getDominationStyle = (count: DominationCount) => {
    if (count.white === 0 && count.black === 0) return '';
    if (count.white > count.black) return 'shadow-[inset_0_0_0_3px_rgba(34,211,238,0.50)]';
    if (count.black > count.white) return 'shadow-[inset_0_0_0_3px_rgba(251,113,133,0.50)]';
    return 'shadow-[inset_0_0_0_3px_rgba(167,139,250,0.62)]';
  };

  const getDominationText = (count: DominationCount) => {
    if (count.white === 0 && count.black === 0) return '';
    if (count.white === 0) return `B${count.black}`;
    if (count.black === 0) return `W${count.white}`;
    return `W${count.white}:B${count.black}`;
  };

  return { domination, getDominationStyle, getDominationText };
};
