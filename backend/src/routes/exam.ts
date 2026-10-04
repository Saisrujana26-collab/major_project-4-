import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/database';
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth';
import { getNextQuestion } from '../services/adaptiveEngine';

const router = Router();

// Helper: add _id alias to any row or array of rows
function withId(row: any): any {
  if (!row) return row;
  if (Array.isArray(row)) return row.map(withId);
  return { ...row, _id: row.id };
}

// GET /api/exam
router.get('/', authenticate, requireTeacher, (_req: AuthRequest, res: Response): void => {
  const exams = db.prepare('SELECT * FROM exams ORDER BY createdAt DESC').all();
  res.json(withId(exams));
});

// POST /api/exam
router.post('/', authenticate, requireTeacher, (req: AuthRequest, res: Response): void => {
  const { title, description, duration, violationThreshold, pointDeductionPerViolation } = req.body;
  if (!title) { res.status(400).json({ error: 'Title required' }); return; }
  const id = uuid();
  db.prepare(`INSERT INTO exams (id,title,description,duration,createdBy,violationThreshold,pointDeductionPerViolation)
    VALUES (?,?,?,?,?,?,?)`)
    .run(id, title, description || '', duration || 3600, req.user!.id,
      violationThreshold || 3, pointDeductionPerViolation || 5);
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  res.status(201).json(withId(exam));
});

// GET /api/exam/active/current
router.get('/active/current', authenticate, (_req: AuthRequest, res: Response): void => {
  const exam = db.prepare("SELECT * FROM exams WHERE status = 'active' LIMIT 1").get() as any;
  res.json(exam ? withId(exam) : null);
});

// GET /api/exam/:id
router.get('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id) as any;
  if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }
  const questions = db.prepare('SELECT * FROM questions WHERE examId = ?').all(req.params.id) as any[];
  const parsedQuestions = questions.map(q => withId({ ...q, options: JSON.parse(q.options) }));
  res.json({ ...withId(exam), questions: parsedQuestions });
});

// PATCH /api/exam/:id/status
router.patch('/:id/status', authenticate, requireTeacher, (req: AuthRequest, res: Response): void => {
  const { status } = req.body;
  db.prepare('UPDATE exams SET status = ? WHERE id = ?').run(status, req.params.id);
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(withId(exam));
});

// POST /api/exam/:id/session/start
router.post('/:id/session/start', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id) as any;
  if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }
  if (exam.status !== 'active') { res.status(400).json({ error: 'Exam is not active' }); return; }

  let session = db.prepare('SELECT * FROM exam_sessions WHERE studentId = ? AND examId = ?')
    .get(req.user!.id, req.params.id) as any;

  if (!session) {
    const id = uuid();
    db.prepare(`INSERT INTO exam_sessions (id,studentId,examId,timeRemaining,status,startTime)
      VALUES (?,?,?,?,?,?)`)
      .run(id, req.user!.id, req.params.id, exam.duration, 'active', new Date().toISOString());
    session = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(id);
  } else if (['submitted', 'disqualified'].includes(session.status)) {
    res.status(400).json({ error: 'Session already ended' });
    return;
  } else {
    db.prepare("UPDATE exam_sessions SET status = 'active' WHERE id = ?").run(session.id);
    session = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(session.id);
  }
  res.json(withId(session));
});

// POST /api/exam/session/:sessionId/answer
router.post('/session/:sessionId/answer', authenticate, (req: AuthRequest, res: Response): void => {
  const { questionId, selectedOption, timeTaken } = req.body;
  const session = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(req.params.sessionId) as any;
  if (!session || session.status !== 'active') { res.status(400).json({ error: 'Session not active' }); return; }

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId) as any;
  if (!question) { res.status(404).json({ error: 'Question not found' }); return; }

  const isCorrect = question.correctOption === Number(selectedOption);
  const pointsEarned = isCorrect ? question.points : 0;

  const answered = JSON.parse(session.answeredQuestions || '[]');
  answered.push({ questionId, selectedOption: Number(selectedOption), isCorrect, timeTaken: timeTaken || 0, difficulty: question.difficulty, pointsEarned });

  let newLevel = session.currentLevel;
  let newScore = session.score + pointsEarned;
  if (isCorrect) {
    if (newLevel === 'easy') newLevel = 'medium';
    else if (newLevel === 'medium') newLevel = 'hard';
  } else {
    if (newLevel === 'hard') newLevel = 'medium';
    else if (newLevel === 'medium') newLevel = 'easy';
  }

  db.prepare('UPDATE exam_sessions SET answeredQuestions=?,currentLevel=?,score=? WHERE id=?')
    .run(JSON.stringify(answered), newLevel, newScore, session.id);

  const answeredIds = answered.map((a: any) => a.questionId);
  const nextQ = getNextQuestion(session.examId, newLevel, answeredIds);

  if (!nextQ) {
    db.prepare("UPDATE exam_sessions SET status='submitted',endTime=? WHERE id=?")
      .run(new Date().toISOString(), session.id);
  }

  res.json({ isCorrect, pointsEarned, newLevel, newScore, nextQuestion: nextQ ? withId(nextQ) : null, examComplete: !nextQ });
});

// GET /api/exam/session/:sessionId
router.get('/session/:sessionId', authenticate, (req: AuthRequest, res: Response): void => {
  const session = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(req.params.sessionId) as any;
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(session.examId) as any;
  session.answeredQuestions = JSON.parse(session.answeredQuestions || '[]');
  session.violations = JSON.parse(session.violations || '[]');
  res.json({ ...withId(session), examId: exam ? withId(exam) : null });
});

// GET /api/exam/:examId/sessions
router.get('/:examId/sessions', authenticate, requireTeacher, (req: AuthRequest, res: Response): void => {
  const sessions = db.prepare(`
    SELECT s.*, u.name as studentName, u.rollNo, u.systemNo 
    FROM exam_sessions s JOIN users u ON s.studentId = u.id 
    WHERE s.examId = ? ORDER BY s.createdAt DESC
  `).all(req.params.examId);
  res.json(withId(sessions));
});

export default router;
