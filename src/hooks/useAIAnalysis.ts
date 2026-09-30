import { useState, useCallback } from 'react';
import { PieceType, PieceColor } from '../types';
import { PIECE_VALUES } from '../constants';

type PieceState = { type: PieceType; color: PieceColor } | null;

interface DominationCount {
  white: number;
  black: number;
  whitePieces: { type: PieceType; value: number }[];
  blackPieces: { type: PieceType; value: number }[];
}

interface AIAnalysis {
  summary: string;
  materialAdvantage: string;
  controlAnalysis: string;
  keySquares: string[];
  suggestion: string;
  score: number; // -10 to 10, positive = white advantage
}

/**
 * 基于启发式规则的局面分析引擎
 * 后续可替换为真正的 LLM API 调用
 */
const analyzePosition = (
  pieces: (PieceState)[][],
  domination: DominationCount[][],
  currentTurn: PieceColor,
  isInCheck: PieceColor | null,
  isGameOver: boolean,
  moveCount: number
): AIAnalysis => {
  // 1. 子力评估
  let whiteMaterial = 0;
  let blackMaterial = 0;
  const pieceCount: Record<string, Record<string, number>> = { white: {}, black: {} };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = pieces[r][c];
      if (piece) {
        const value = PIECE_VALUES[piece.type as keyof typeof PIECE_VALUES] || 0;
        if (piece.color === 'white') {
          whiteMaterial += value;
        } else {
          blackMaterial += value;
        }
        pieceCount[piece.color][piece.type] = (pieceCount[piece.color][piece.type] || 0) + 1;
      }
    }
  }

  const materialDiff = whiteMaterial - blackMaterial;

  // 2. 势力评估
  let whiteControlTotal = 0;
  let blackControlTotal = 0;
  const keySquares: string[] = [];
  const centerSquares = [[3, 3], [3, 4], [4, 3], [4, 4]]; // d4, d5, e4, e5
  const files = 'abcdefgh';
  const ranks = '87654321';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const d = domination[r][c];
      whiteControlTotal += d.white;
      blackControlTotal += d.black;

      // 识别关键格
      const isCenter = centerSquares.some(([cr, cc]) => cr === r && cc === c);
      if (isCenter && d.white > d.black && d.white >= 2) {
        keySquares.push(`白方强力控制中心格 ${files[c]}${ranks[r]}`);
      } else if (isCenter && d.black > d.white && d.black >= 2) {
        keySquares.push(`黑方强力控制中心格 ${files[c]}${ranks[r]}`);
      }
    }
  }

  const controlDiff = whiteControlTotal - blackControlTotal;

  // 3. 综合评分
  const materialScore = Math.tanh(materialDiff / 3) * 5; // -5 to 5
  const controlScore = Math.tanh(controlDiff / 20) * 3; // -3 to 3
  let score = materialScore + controlScore;

  // 将军影响
  if (isInCheck === 'black') score += 2;
  if (isInCheck === 'white') score -= 2;

  // 将死
  if (isGameOver && isInCheck) {
    score = isInCheck === 'black' ? 10 : -10;
  }

  score = Math.max(-10, Math.min(10, Math.round(score * 10) / 10));

  // 4. 生成自然语言点评
  const absScore = Math.abs(score);

  let summary = '';
  if (isGameOver && isInCheck) {
    summary = isInCheck === 'black' ? '白方将杀！黑方王已被困死。' : '黑方将杀！白方王已被困死。';
  } else if (isGameOver && !isInCheck) {
    summary = '逼和！双方无合法走法，对局以和棋结束。';
  } else if (absScore < 1) {
    summary = '局面势均力敌，双方旗鼓相当。';
  } else if (score > 0) {
    if (score > 5) summary = '白方优势明显，局面控制力很强。';
    else if (score > 2) summary = '白方略占优势，局面稍好。';
    else summary = '白方有微弱优势。';
  } else {
    if (score < -5) summary = '黑方优势明显，局面控制力很强。';
    else if (score < -2) summary = '黑方略占优势，局面稍好。';
    else summary = '黑方有微弱优势。';
  }

  // 子力分析
  let materialAdvantage = '';
  if (materialDiff > 0) {
    materialAdvantage = `白方子力领先 +${materialDiff} 分`;
    if (materialDiff >= 5) materialAdvantage += '，相当于多一个车';
    else if (materialDiff >= 3) materialAdvantage += '，相当于多一个轻子';
  } else if (materialDiff < 0) {
    materialAdvantage = `黑方子力领先 +${Math.abs(materialDiff)} 分`;
    if (Math.abs(materialDiff) >= 5) materialAdvantage += '，相当于多一个车';
    else if (Math.abs(materialDiff) >= 3) materialAdvantage += '，相当于多一个轻子';
  } else {
    materialAdvantage = '双方子力均衡';
  }

  // 势力分析
  let controlAnalysis = '';
  if (controlDiff > 10) {
    controlAnalysis = '白方显著控制更多格子，空间优势大';
  } else if (controlDiff > 3) {
    controlAnalysis = '白方在势力范围上略占上风';
  } else if (controlDiff < -10) {
    controlAnalysis = '黑方显著控制更多格子，空间优势大';
  } else if (controlDiff < -3) {
    controlAnalysis = '黑方在势力范围上略占上风';
  } else {
    controlAnalysis = '双方势力范围大体持平';
  }

  // 阶段判断与建议
  const totalPieces = pieceCount.white.pawn + pieceCount.black.pawn +
    (pieceCount.white.knight || 0) + (pieceCount.black.knight || 0) +
    (pieceCount.white.bishop || 0) + (pieceCount.black.bishop || 0) +
    (pieceCount.white.rook || 0) + (pieceCount.black.rook || 0) +
    (pieceCount.white.queen || 0) + (pieceCount.black.queen || 0);

  let suggestion = '';
  if (moveCount <= 10) {
    suggestion = '处于开局阶段，建议继续出子、控制中心、确保王的安全（尽快王车易位）。';
  } else if (totalPieces <= 10) {
    suggestion = '进入残局阶段，王的活跃度至关重要，应将王向中心靠拢参与战斗。';
  } else if (isInCheck === currentTurn) {
    suggestion = `⚠️ ${currentTurn === 'white' ? '白方' : '黑方'}被将军！必须立即应将：逃跑、垫将或吃掉攻击棋子。`;
  } else {
    const side = currentTurn === 'white' ? '白方' : '黑方';
    const oppControl = currentTurn === 'white' ? blackControlTotal : whiteControlTotal;
    if (oppControl > 30) {
      suggestion = `${side}走棋。对方控制力很强，建议优先加强防守，寻找反击机会。`;
    } else if (keySquares.length > 0) {
      suggestion = `${side}走棋。${keySquares[0]}，可考虑争夺或巩固这些关键格。`;
    } else {
      suggestion = `${side}走棋。考虑改善棋子位置、创造威胁或破坏对方阵型。`;
    }
  }

  return {
    summary,
    materialAdvantage,
    controlAnalysis,
    keySquares: keySquares.slice(0, 3),
    suggestion,
    score,
  };
};

export const useAIAnalysis = () => {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback((
    pieces: (PieceState)[][],
    domination: DominationCount[][],
    currentTurn: PieceColor,
    isInCheck: PieceColor | null,
    isGameOver: boolean,
    moves: { from: { row: number; col: number }; to: { row: number; col: number }; piece: { type: PieceType; color: PieceColor }; capturedPiece?: { type: PieceType; color: PieceColor } }[],
  ) => {
    setIsLoading(true);
    setError(null);

    // 模拟短暂的"思考"延迟，增强 AI 感知
    setTimeout(() => {
      try {
        const result = analyzePosition(
          pieces,
          domination,
          currentTurn,
          isInCheck,
          isGameOver,
          moves.length
        );
        setAnalysis(result);
      } catch {
        setError('分析失败，请重试');
      }
      setIsLoading(false);
    }, 600);
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isLoading,
    error,
    analyze,
    clearAnalysis,
  };
};
