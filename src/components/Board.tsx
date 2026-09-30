import { FC, useState } from 'react';
import { Square } from './Square';
import { Piece } from './Piece';
import { MoveHistory } from './MoveHistory';
import { Legend } from './Legend';
import { GameStatus } from './GameStatus';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import { RuleQAPanel } from './RuleQAPanel';
import { useChessBoard } from '../hooks/useChessBoard';
import { useDomination } from '../hooks/useDomination';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useAIAnalysis } from '../hooks/useAIAnalysis';
import { WinningModal } from './WinningModal';
import { PromotionModal } from './PromotionModal';
import { PIECE_VALUES } from '../constants';
import { PieceColor, PieceType } from '../types';
import { generatePGN } from '../utils/pgn';
import { PGNModal } from './PGNModal';
import { PGNImportModal } from './PGNImportModal';

const CapturedPieces: FC<{
  pieces: {
    type: PieceType;
    color: PieceColor;
  }[];
  color: PieceColor;
  isFlipped: boolean;
}> = ({ pieces, color, isFlipped }) => {
  const shouldReverse = (color === 'white') === isFlipped;

  return (
    <div
      className={`flex items-center gap-1 min-h-[40px] ${
        shouldReverse ? 'flex-row-reverse' : ''
      }`}
    >
      <div
        className={`w-4 h-4 ${
          color === 'white' ? 'bg-blue-500/20' : 'bg-red-500/20'
        } rounded-full`}
      />
      <div className='flex flex-wrap gap-1'>
        {pieces.map((piece, index) => (
          <div key={index} className='w-6 h-6'>
            <Piece type={piece.type} color={piece.color} small />
          </div>
        ))}
      </div>
    </div>
  );
};

export const Board: FC = () => {
  const {
    pieces,
    moves,
    currentMoveIndex,
    handleMoveSelect,
    makeMove,
    handleSquareClick,
    getSquareHighlight,
    validMoves,
    isGameOver,
    currentTurn,
    resetGame,
    isInCheck,
    promotionPending,
    isFlipped,
    setIsFlipped,
    importGame,
  } = useChessBoard();

  const [showHints, setShowHints] = useState(true);
  const [showPGNModal, setShowPGNModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showWinningModal, setShowWinningModal] = useState(true);
  const [showRuleQA, setShowRuleQA] = useState(false);
  const { domination, getDominationStyle } = useDomination(pieces);
  const { analysis, isLoading: isAnalyzing, error: analysisError, analyze, clearAnalysis } = useAIAnalysis();

  const { handleDragStart, handleDragOver, handleDrop } = useDragAndDrop(
    makeMove,
    validMoves
  );

  const getCapturedPieces = () => {
    const captured: {
      white: { type: PieceType; color: PieceColor }[];
      black: { type: PieceType; color: PieceColor }[];
    } = {
      white: [],
      black: [],
    };

    moves.slice(0, currentMoveIndex + 1).forEach((move) => {
      if (move.capturedPiece) {
        if (move.capturedPiece.color === 'white') {
          captured.black.push(move.capturedPiece);
        } else {
          captured.white.push(move.capturedPiece);
        }
      }
    });

    const sortPieces = (pieces: { type: PieceType; color: PieceColor }[]) => {
      return pieces.sort(
        (a, b) =>
          PIECE_VALUES[b.type as keyof typeof PIECE_VALUES] -
          PIECE_VALUES[a.type as keyof typeof PIECE_VALUES]
      );
    };

    return {
      white: sortPieces(captured.white),
      black: sortPieces(captured.black),
    };
  };

  const capturedPieces = getCapturedPieces();

  return (
    <>
      {promotionPending && (
        <PromotionModal
          color={currentTurn}
          onSelect={(piece) =>
            makeMove(promotionPending.from, promotionPending.to, piece)
          }
        />
      )}
      <div className='flex flex-col gap-5 lg:flex-row lg:gap-6'>
        <div className='flex flex-col gap-2'>
          <CapturedPieces
            pieces={capturedPieces[isFlipped ? 'white' : 'black']}
            color={isFlipped ? 'white' : 'black'}
            isFlipped={isFlipped}
          />
          <Legend isFlipped={isFlipped}>
            <div className='inline-block overflow-hidden rounded-xl border border-slate-600/70 bg-slate-800 touch-none select-none shadow-[0_18px_55px_rgba(0,0,0,0.38)] ring-1 ring-white/5'>
              {(isFlipped ? [...pieces].reverse() : pieces).map(
                (row, rowIndex) => (
                  <div key={rowIndex} className='flex'>
                    {(isFlipped ? [...row].reverse() : row).map(
                      (piece, colIndex) => {
                        const actualRow = isFlipped ? 7 - rowIndex : rowIndex;
                        const actualCol = isFlipped ? 7 - colIndex : colIndex;

                        return (
                          <Square
                            key={`${rowIndex}-${colIndex}`}
                            isBlack={(rowIndex + colIndex) % 2 === 1}
                            onDrop={() => handleDrop(actualRow, actualCol)}
                            onDragOver={handleDragOver}
                            isValidMove={validMoves.some(
                              (move) =>
                                move.row === actualRow && move.col === actualCol
                            )}
                            isOccupied={Boolean(piece)}
                            onClick={() =>
                              handleSquareClick(actualRow, actualCol)
                            }
                            dominationCount={
                              showHints
                                ? domination[actualRow][actualCol]
                                : undefined
                            }
                          >
                            <div
                              className={`relative w-full h-full flex items-center justify-center cursor-pointer ${
                                showHints
                                  ? getDominationStyle(
                                      domination[actualRow][actualCol]
                                    )
                                  : ''
                              } ${getSquareHighlight(actualRow, actualCol)}`}
                              onClick={() =>
                                handleSquareClick(actualRow, actualCol)
                              }
                            >
                              {piece && (
                                <div
                                  draggable
                                  onDragStart={() =>
                                    handleDragStart(actualRow, actualCol)
                                  }
                                >
                                  <Piece
                                    type={piece.type}
                                    color={piece.color}
                                  />
                                </div>
                              )}
                            </div>
                          </Square>
                        );
                      }
                    )}
                  </div>
                )
              )}
            </div>
          </Legend>
          <CapturedPieces
            pieces={capturedPieces[isFlipped ? 'black' : 'white']}
            color={isFlipped ? 'black' : 'white'}
            isFlipped={isFlipped}
          />
        </div>
        <div className='flex flex-col gap-4 w-full lg:w-auto'>
          <div className='flex flex-wrap gap-2 justify-center lg:justify-start'>
            <button
              onClick={() => setIsFlipped((prev) => !prev)}
              className='p-1 px-2 bg-gray-700 rounded hover:bg-gray-600 text-gray-200 flex items-center gap-2'
            >
              🔄
            </button>
            <button
              onClick={() => setShowHints((prev) => !prev)}
              className='p-1 px-2 bg-gray-700 rounded hover:bg-gray-600 text-gray-200 flex items-center gap-2'
              title='Toggle Hints'
            >
              {showHints ? '💡' : '🔌'}
            </button>
            <button
              onClick={() => setShowPGNModal(true)}
              className='p-1 px-2 bg-gray-700 rounded hover:bg-gray-600 text-gray-200 flex items-center gap-2'
              title='Export PGN'
            >
              📤
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className='p-1 px-2 bg-gray-700 rounded hover:bg-gray-600 text-gray-200 flex items-center gap-2'
              title='Import PGN'
            >
              📥
            </button>
            <button
              onClick={() => setShowRuleQA((prev) => !prev)}
              className={`p-1 px-2 rounded text-gray-200 flex items-center gap-2 transition-colors ${
                showRuleQA ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title='规则问答'
            >
              📖
            </button>
          </div>
          <GameStatus
            pieces={pieces}
            domination={domination}
            isInCheck={isInCheck}
            isGameOver={isGameOver}
            currentTurn={currentTurn}
          />
          <AIAnalysisPanel
            analysis={analysis}
            isLoading={isAnalyzing}
            error={analysisError}
            onAnalyze={() => analyze(pieces, domination, currentTurn, isInCheck, isGameOver, moves.slice(0, currentMoveIndex + 1))}
            onClear={clearAnalysis}
          />
          <RuleQAPanel
            isOpen={showRuleQA}
            onToggle={() => setShowRuleQA((prev) => !prev)}
          />
          <MoveHistory
            moves={moves}
            currentMove={currentMoveIndex}
            onMoveSelect={handleMoveSelect}
          />
        </div>
      </div>
      {isGameOver && showWinningModal && (
        <WinningModal
          winner={currentTurn === 'white' ? 'black' : 'white'}
          onRestart={resetGame}
          onClose={() => setShowWinningModal(false)}
        />
      )}
      {showPGNModal && (
        <PGNModal
          pgn={generatePGN(moves)}
          onClose={() => setShowPGNModal(false)}
          onDownload={() => {
            const pgn = generatePGN(moves);
            const blob = new Blob([pgn], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'game.pgn';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        />
      )}
      {showImportModal && (
        <PGNImportModal
          onClose={() => setShowImportModal(false)}
          onImport={(moves) => {
            importGame(moves);
            setShowImportModal(false);
          }}
        />
      )}
    </>
  );
};
