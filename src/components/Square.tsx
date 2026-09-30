import { FC, ReactNode } from 'react';
import { PieceType } from '../types';
import { getPieceLetter } from '../utils/pgn';

interface SquareProps {
  isBlack: boolean;
  children?: ReactNode;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isValidMove?: boolean;
  isOccupied?: boolean;
  onClick?: () => void;
  dominationCount?: {
    white: number;
    black: number;
    whitePieces: { type: PieceType; value: number }[];
    blackPieces: { type: PieceType; value: number }[];
  };
}

export const Square: FC<SquareProps> = ({ isBlack, children, onDrop, onDragOver, isValidMove, isOccupied, onClick, dominationCount }) => {
  const getDominationTooltip = () => {
    if (!dominationCount || (dominationCount.white === 0 && dominationCount.black === 0)) return null;
    const totalWhiteValue = dominationCount.whitePieces.reduce((sum, p) => sum + p.value, 0);
    const totalBlackValue = dominationCount.blackPieces.reduce((sum, p) => sum + p.value, 0);
    const groupPieces = (pieces: { type: PieceType; value: number }[]) => {
      const grouped = pieces.reduce((acc, piece) => {
        acc[piece.type] = (acc[piece.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return Object.entries(grouped).map(([type, count]) => `${count}${getPieceLetter(type as PieceType) || 'P'}`).join(' ');
    };
    return (
      <div className='pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs text-white opacity-0 shadow-2xl backdrop-blur transition-opacity group-hover:opacity-100'>
        {dominationCount.whitePieces.length > 0 && <div><span className='text-cyan-300'>White</span> ({totalWhiteValue}): {groupPieces(dominationCount.whitePieces)}</div>}
        {dominationCount.blackPieces.length > 0 && <div><span className='text-rose-300'>Black</span> ({totalBlackValue}): {groupPieces(dominationCount.blackPieces)}</div>}
      </div>
    );
  };

  const getPressureIndicator = () => {
    if (!dominationCount) return null;
    const { white, black } = dominationCount;
    if (!white && !black) return null;
    return (
      <>
        {white > 0 && <div className='pointer-events-none absolute left-1 top-1 h-1.5 min-w-1.5 rounded-full bg-cyan-300/90 px-0.5 text-[7px] font-bold leading-[6px] text-slate-950'>{white}</div>}
        {black > 0 && <div className='pointer-events-none absolute bottom-1 right-1 h-1.5 min-w-1.5 rounded-full bg-rose-300/90 px-0.5 text-[7px] font-bold leading-[6px] text-slate-950'>{black}</div>}
      </>
    );
  };

  return (
    <div
      className={`group relative flex h-10 w-10 items-center justify-center sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 ${isBlack ? 'bg-[#6f7f8f]' : 'bg-[#d8dee3]'}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={onClick}
    >
      {children}
      {getDominationTooltip()}
      {getPressureIndicator()}
      {isValidMove && !isOccupied && <div className='pointer-events-none absolute h-3 w-3 rounded-full bg-emerald-400/80 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' />}
      {isValidMove && isOccupied && <div className='pointer-events-none absolute inset-[7%] rounded-full border-[3px] border-amber-300/90 shadow-[0_0_14px_rgba(252,211,77,0.45)]' />}
    </div>
  );
};
