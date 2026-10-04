import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import db from '../db/database';
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth';
import { parsePdfAndGenerateQuestions } from '../services/questionGenerator';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) cb(null, true);
    else cb(new Error('Only PDF files accepted'));
  },
});

// POST /api/upload/pdf/sync
router.post('/pdf/sync', authenticate, requireTeacher, upload.single('pdf'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'No PDF uploaded' }); return; }
  const { examId, questionsPerDifficulty } = req.body;
  if (!examId) { res.status(400).json({ error: 'examId required' }); return; }

  const exam = db.prepare('SELECT id FROM exams WHERE id = ?').get(examId);
  if (!exam) { res.status(404).json({ error: 'Exam not found. Make sure you selected an exam before uploading.' }); return; }

  try {
    const count = Math.max(2, Math.min(15, Number(questionsPerDifficulty) || 5));
    const questions = await parsePdfAndGenerateQuestions(req.file.path, examId, count);

    const insert = db.prepare(`INSERT INTO questions (id,text,options,correctOption,difficulty,topic,examId,points,explanation)
      VALUES (?,?,?,?,?,?,?,?,?)`);

    const insertMany = db.transaction((qs: typeof questions) => {
      for (const q of qs) {
        insert.run(uuid(), q.text, JSON.stringify(q.options), q.correctOption, q.difficulty, q.topic, q.examId, q.points, q.explanation || '');
      }
    });
    insertMany(questions);

    const saved = db.prepare('SELECT * FROM questions WHERE examId = ? ORDER BY createdAt DESC LIMIT ?')
      .all(examId, questions.length) as any[];

    res.json({
      success: true,
      questionsGenerated: questions.length,
      questions: saved.map(q => ({ ...q, _id: q.id, options: JSON.parse(q.options) })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Generation failed';
    console.error('PDF processing error:', msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
