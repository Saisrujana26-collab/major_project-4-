import { Router, Response } from 'express';
import db from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateCertificate } from '../services/certificateGenerator';

const router = Router();

router.get('/:sessionId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const session = db.prepare('SELECT * FROM exam_sessions WHERE id = ?').get(req.params.sessionId) as any;
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (!['submitted', 'under_review'].includes(session.status)) {
    res.status(400).json({ error: 'Exam not completed' }); return;
  }

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(session.examId) as any;
  const student = db.prepare('SELECT * FROM users WHERE id = ?').get(session.studentId) as any;
  if (!exam || !student) { res.status(404).json({ error: 'Data not found' }); return; }

  if (session.violationCount >= exam.violationThreshold) {
    res.status(403).json({ error: 'Certificate not issued: violations exceeded threshold', disqualified: true }); return;
  }

  const answered: any[] = JSON.parse(session.answeredQuestions || '[]');
  const maxScore = answered.reduce((s: number, q: any) => s + (q.difficulty === 'easy' ? 10 : q.difficulty === 'medium' ? 20 : 30), 0) || 100;
  const correct = answered.filter((q: any) => q.isCorrect).length;
  const accuracy = answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0;

  let certCode = session.certificateCode;
  if (!certCode) {
    certCode = `SA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    db.prepare('UPDATE exam_sessions SET certificateCode = ? WHERE id = ?').run(certCode, session.id);
  }

  try {
    const pdfBytes = await generateCertificate({
      studentName: student.name,
      rollNo: student.rollNo,
      examTitle: exam.title,
      score: session.score,
      maxScore,
      accuracy,
      levelReached: session.currentLevel,
      violationCount: session.violationCount,
      completedAt: session.endTime || new Date().toISOString(),
      verificationCode: certCode,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${student.rollNo}.pdf"`,
    });
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('Certificate error:', err);
    res.status(500).json({ error: 'Certificate generation failed' });
  }
});

export default router;
