import { useMemo } from 'react';
import { PieceColor, PieceState, PieceType } from '../types';
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
    if (count.white > count.black) return 'bg-blue-500/30';
    if (count.black > count.white) return 'bg-red-500/30';
    return 'bg-purple-500/30';
  };

  const getDominationText = (count: DominationCount) => {
    if (count.white === 0 && count.black === 0) return '';
    if (count.white === 0) return `B${count.black}`;
    if (count.black === 0) return `W${count.white}`;
    return `W${count.white}:B${count.black}`;
  };

  return { domination, getDominationStyle, getDominationText };
};
