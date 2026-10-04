import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/database';
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth';
import { getNextQuestion } from '../services/adaptiveEngine';

const router = Router();

function withId(row: any): any {
  if (!row) return row;
  if (Array.isArray(row)) return row.map(withId);
  return { ...row, _id: row.id };
}

// GET /api/questions/:examId
router.get('/:examId', authenticate, requireTeacher, (req: AuthRequest, res: Response): void => {
  const questions = db.prepare('SELECT * FROM questions WHERE examId = ? ORDER BY difficulty, createdAt')
    .all(req.params.examId) as any[];
  res.json(questions.map(q => withId({ ...q, options: JSON.parse(q.options) })));
});

// POST /api/questions
router.post('/', authenticate, requireTeacher, (req: AuthRequest, res: Response): void => {
  const { text, options, correctOption, difficulty, topic, examId, explanation } = req.body;
  if (!text || !options || !examId) { res.status(400).json({ error: 'Missing required fields' }); return; }
  const pointsMap: Record<string, number> = { easy: 10, medium: 20, hard: 30 };
  const id = uuid();
  db.prepare(`INSERT INTO questions (id,text,options,correctOption,difficulty,topic,examId,points,explanation)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, text, JSON.stringify(options), Number(correctOption), difficulty, topic || 'General', examId,
      pointsMap[difficulty] || 10, explanation || '');
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as any;
  res.status(201).json(withId({ ...q, options: JSON.parse(q.options) }));
});

// DELETE /api/questions/:id
router.delete('/:id', authenticate, requireTeacher, (req: AuthRequest, res: Response): void => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/questions/next/:sessionId
router.get('/next/:sessionId', authenticate, (req: AuthRequest, res: Response): void => {
  const session = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(req.params.sessionId) as any;
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  const answered = JSON.parse(session.answeredQuestions || '[]');
  const answeredIds = answered.map((a: any) => a.questionId);
  const question = getNextQuestion(session.examId, session.currentLevel, answeredIds);
  res.json({ question: question ? withId(question) : null, examComplete: !question });
});

export default router;
