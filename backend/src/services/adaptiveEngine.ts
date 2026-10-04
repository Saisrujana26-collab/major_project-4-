import db from '../db/database';

type DifficultyLevel = 'easy' | 'medium' | 'hard';

const FALLBACK: Record<DifficultyLevel, DifficultyLevel[]> = {
  easy:   ['easy', 'medium', 'hard'],
  medium: ['medium', 'easy', 'hard'],
  hard:   ['hard', 'medium', 'easy'],
};

export function getNextQuestion(
  examId: string,
  currentLevel: DifficultyLevel,
  answeredIds: string[]
): any | null {
  for (const level of FALLBACK[currentLevel]) {
    let q: any;
    if (answeredIds.length === 0) {
      q = db.prepare('SELECT * FROM questions WHERE examId = ? AND difficulty = ? ORDER BY RANDOM() LIMIT 1')
        .get(examId, level);
    } else {
      const placeholders = answeredIds.map(() => '?').join(',');
      q = db.prepare(`SELECT * FROM questions WHERE examId = ? AND difficulty = ? AND id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`)
        .get(examId, level, ...answeredIds);
    }
    if (q) return { ...q, options: JSON.parse(q.options) };
  }
  return null;
}

export function calculateScoreBreakdown(answeredQuestions: Array<{
  difficulty: DifficultyLevel; isCorrect: boolean; pointsEarned: number;
}>) {
  const b = { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };
  for (const q of answeredQuestions) {
    b[q.difficulty].total++;
    if (q.isCorrect) b[q.difficulty].correct++;
  }
  return b;
}
