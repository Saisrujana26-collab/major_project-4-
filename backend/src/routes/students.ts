import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../db/database';
import { authenticate, requireTeacher, AuthRequest } from '../middleware/auth';

const router = Router();

const withId = (row: any): any => row ? { ...row, _id: row.id } : row;

// GET /api/students
router.get('/', authenticate, requireTeacher, (_req: AuthRequest, res: Response): void => {
  const students = db.prepare("SELECT id,name,rollNo,systemNo,role,createdAt FROM users WHERE role='student' ORDER BY systemNo ASC").all() as any[];
  res.json(students.map(withId));
});

// POST /api/students
router.post('/', authenticate, requireTeacher, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, rollNo, systemNo, password } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE rollNo = ?').get(rollNo);
  if (existing) { res.status(409).json({ error: 'Roll number already exists' }); return; }
  const hash = await bcrypt.hash(password || rollNo, 10);
  const id = uuid();
  db.prepare('INSERT INTO users (id,name,rollNo,systemNo,role,passwordHash) VALUES (?,?,?,?,?,?)')
    .run(id, name, rollNo.toUpperCase(), Number(systemNo) || 0, 'student', hash);
  const student = db.prepare('SELECT id,name,rollNo,systemNo,role,createdAt FROM users WHERE id=?').get(id) as any;
  res.status(201).json(withId(student));
});

// DELETE /api/students/:id
router.delete('/:id', authenticate, requireTeacher, (req: AuthRequest, res: Response): void => {
  db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(req.params.id, 'student');
  res.json({ success: true });
});

// GET /api/students/:id/sessions
router.get('/:id/sessions', authenticate, (req: AuthRequest, res: Response): void => {
  const sessions = db.prepare(`
    SELECT s.*, e.title as examTitle, e.duration as examDuration
    FROM exam_sessions s JOIN exams e ON s.examId = e.id
    WHERE s.studentId = ? ORDER BY s.createdAt DESC
  `).all(req.params.id) as any[];
  res.json(sessions.map(withId));
});

export default router;
