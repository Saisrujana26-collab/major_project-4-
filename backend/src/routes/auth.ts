import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secureassess_secret';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
  maxAge: 8 * 60 * 60 * 1000,
};

// POST /api/auth/teacher/login
router.post('/teacher/login', async (req: Request, res: Response): Promise<void> => {
  const { password } = req.body;
  const teacherPassword = process.env.TEACHER_PASSWORD || 'admin123';

  if (!password) { res.status(400).json({ error: 'Password required' }); return; }
  if (password !== teacherPassword) { res.status(401).json({ error: 'Invalid password' }); return; }

  // Get or create teacher record
  let teacher = db.prepare('SELECT * FROM users WHERE role = ?').get('teacher') as any;
  if (!teacher) {
    const hash = await bcrypt.hash(teacherPassword, 10);
    const id = uuid();
    db.prepare('INSERT INTO users (id, name, rollNo, systemNo, role, passwordHash) VALUES (?,?,?,?,?,?)')
      .run(id, 'Teacher', 'TEACHER001', 0, 'teacher', hash);
    teacher = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  }

  const token = jwt.sign(
    { id: teacher.id, role: 'teacher', name: teacher.name, rollNo: teacher.rollNo, systemNo: 0 },
    JWT_SECRET, { expiresIn: '8h' }
  );

  res.cookie('token', token, COOKIE_OPTS);
  res.json({ success: true, role: 'teacher', name: teacher.name, token });
});

// POST /api/auth/student/login
router.post('/student/login', async (req: Request, res: Response): Promise<void> => {
  const { rollNo, systemNo, password, name } = req.body;
  if (!rollNo || !systemNo) { res.status(400).json({ error: 'Roll number and system number required' }); return; }

  const upperRoll = rollNo.trim().toUpperCase();
  let student = db.prepare('SELECT * FROM users WHERE rollNo = ? AND role = ?').get(upperRoll, 'student') as any;

  if (!student) {
    const displayName = name?.trim() || upperRoll;
    const hash = await bcrypt.hash(password || upperRoll, 10);
    const id = uuid();
    db.prepare('INSERT INTO users (id, name, rollNo, systemNo, role, passwordHash) VALUES (?,?,?,?,?,?)')
      .run(id, displayName, upperRoll, Number(systemNo), 'student', hash);
    student = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  } else {
    if (password) {
      const valid = await bcrypt.compare(password, student.passwordHash);
      if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }
    }
    db.prepare('UPDATE users SET systemNo = ?, name = COALESCE(NULLIF(?,\'\'), name) WHERE id = ?')
      .run(Number(systemNo), name?.trim() || '', student.id);
    student = db.prepare('SELECT * FROM users WHERE id = ?').get(student.id) as any;
  }

  const token = jwt.sign(
    { id: student.id, role: 'student', name: student.name, rollNo: student.rollNo, systemNo: student.systemNo },
    JWT_SECRET, { expiresIn: '8h' }
  );

  res.cookie('token', token, COOKIE_OPTS);
  res.json({ success: true, role: 'student', name: student.name, rollNo: student.rollNo, systemNo: student.systemNo, token });
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

export default router;
