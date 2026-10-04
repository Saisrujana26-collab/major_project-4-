import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from '../db/database';
import { SOCKET_EVENTS } from '../../../shared/types';
import { getNextQuestion } from '../services/adaptiveEngine';

interface AuthPayload {
  id: string; role: 'teacher' | 'student';
  name: string; rollNo: string; systemNo: number;
}

const connectedStudents = new Map<string, {
  userId: string; sessionId: string; systemNo: number; name: string; rollNo: string;
}>();

export function setupSocketHandlers(io: Server): void {
  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) { next(new Error('Auth required')); return; }
    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'secureassess_secret') as AuthPayload;
      (socket as any).user = decoded;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    const user: AuthPayload = (socket as any).user;

    // ── TEACHER ──────────────────────────────────────────────────────────
    if (user.role === 'teacher') {
      socket.join('teachers');
      console.log(`👨‍🏫 Teacher connected`);

      // Send current student list
      const current = Array.from(connectedStudents.entries()).map(([sid, d]) => ({ socketId: sid, ...d }));
      socket.emit('teacher:current_students', current);

      socket.on(SOCKET_EVENTS.EXAM_CONTROL, (data: any) => {
        const { action, examId, targetStudentId } = data;

        if (action === 'start') {
          db.prepare("UPDATE exams SET status='active' WHERE id=?").run(examId);
          io.to('students').emit(SOCKET_EVENTS.EXAM_START, { examId });
          console.log(`▶️  Exam ${examId} started`);
        } else if (action === 'pause') {
          io.to('students').emit(SOCKET_EVENTS.EXAM_PAUSE, {});
        } else if (action === 'resume') {
          io.to('students').emit(SOCKET_EVENTS.EXAM_RESUME, {});
        } else if (action === 'stop') {
          db.prepare("UPDATE exams SET status='completed' WHERE id=?").run(examId);
          io.to('students').emit(SOCKET_EVENTS.EXAM_FORCE_SUBMIT, { reason: 'stopped' });
        } else if (action === 'force_submit' && targetStudentId) {
          for (const [sid, d] of connectedStudents.entries()) {
            if (d.userId === targetStudentId) {
              io.to(sid).emit(SOCKET_EVENTS.EXAM_FORCE_SUBMIT, { reason: 'force' });
              db.prepare("UPDATE exam_sessions SET status='submitted',endTime=? WHERE id=?")
                .run(new Date().toISOString(), d.sessionId);
            }
          }
        }
        io.to('teachers').emit('teacher:control_ack', { action, success: true });
      });

      socket.on('disconnect', () => console.log(`👨‍🏫 Teacher disconnected`));
    }

    // ── STUDENT ──────────────────────────────────────────────────────────
    if (user.role === 'student') {
      socket.join('students');

      socket.on(SOCKET_EVENTS.STUDENT_JOIN, (data: { sessionId: string }) => {
        const session = db.prepare('SELECT * FROM exam_sessions WHERE id=?').get(data.sessionId) as any;
        if (!session) return;

        db.prepare('UPDATE exam_sessions SET socketId=?,status=? WHERE id=?')
          .run(socket.id, 'active', session.id);

        connectedStudents.set(socket.id, {
          userId: user.id, sessionId: session.id,
          systemNo: user.systemNo, name: user.name, rollNo: user.rollNo,
        });

        console.log(`🎓 ${user.name} (Sys ${user.systemNo}) joined`);

        // Notify teachers
        io.to('teachers').emit(SOCKET_EVENTS.STUDENT_JOINED, {
          socketId: socket.id, userId: user.id, sessionId: session.id,
          systemNo: user.systemNo, name: user.name, rollNo: user.rollNo,
          currentLevel: session.currentLevel, score: session.score,
          violationCount: session.violationCount, status: session.status,
        });

        // Send first question
        const answered = JSON.parse(session.answeredQuestions || '[]');
        const answeredIds = answered.map((a: any) => a.questionId);
        const q = getNextQuestion(session.examId, session.currentLevel, answeredIds);
        if (q) socket.emit(SOCKET_EVENTS.NEXT_QUESTION, { question: q });
        else socket.emit(SOCKET_EVENTS.EXAM_FORCE_SUBMIT, { reason: 'complete' });
      });

      socket.on(SOCKET_EVENTS.VIOLATION, (violation: any) => {
        const sdata = connectedStudents.get(socket.id);
        if (!sdata) return;

        const session = db.prepare('SELECT * FROM exam_sessions WHERE id=?').get(sdata.sessionId) as any;
        const exam = session ? db.prepare('SELECT * FROM exams WHERE id=?').get(session.examId) as any : null;
        if (!session || !exam) return;

        const violations = JSON.parse(session.violations || '[]');
        violations.push({ ...violation, timestamp: new Date().toISOString() });
        const newCount = session.violationCount + 1;
        const newScore = Math.max(0, session.score - (exam.pointDeductionPerViolation || 5));
        const newStatus = newCount >= exam.violationThreshold ? 'under_review' : session.status;

        db.prepare('UPDATE exam_sessions SET violations=?,violationCount=?,score=?,status=? WHERE id=?')
          .run(JSON.stringify(violations), newCount, newScore, newStatus, session.id);

        // Alert teachers
        io.to('teachers').emit(SOCKET_EVENTS.VIOLATION_ALERT, {
          ...violation, sessionId: sdata.sessionId,
          newViolationCount: newCount, newScore, status: newStatus,
          studentId: user.id,
        });

        if (newStatus === 'under_review') {
          socket.emit('exam:warning', {
            message: `⚠️ You have ${newCount} violations. Your exam is under review.`,
          });
        }

        // Broadcast progress
        broadcastProgress(io, sdata, { ...session, violationCount: newCount, score: newScore, status: newStatus });
      });

      socket.on(SOCKET_EVENTS.ANSWER_SUBMIT, (data: any) => {
        const sdata = connectedStudents.get(socket.id);
        if (!sdata) return;

        const session = db.prepare('SELECT * FROM exam_sessions WHERE id=?').get(sdata.sessionId) as any;
        if (!session || session.status !== 'active') return;

        const question = db.prepare('SELECT * FROM questions WHERE id=?').get(data.questionId) as any;
        if (!question) return;

        const isCorrect = question.correctOption === Number(data.selectedOption);
        const pointsEarned = isCorrect ? question.points : 0;

        const answered = JSON.parse(session.answeredQuestions || '[]');
        answered.push({ questionId: data.questionId, selectedOption: Number(data.selectedOption), isCorrect, timeTaken: data.timeTaken || 0, difficulty: question.difficulty, pointsEarned });

        let newLevel = session.currentLevel;
        if (isCorrect) {
          if (newLevel === 'easy') newLevel = 'medium';
          else if (newLevel === 'medium') newLevel = 'hard';
        } else {
          if (newLevel === 'hard') newLevel = 'medium';
          else if (newLevel === 'medium') newLevel = 'easy';
        }

        const newScore = session.score + pointsEarned;
        db.prepare('UPDATE exam_sessions SET answeredQuestions=?,currentLevel=?,score=? WHERE id=?')
          .run(JSON.stringify(answered), newLevel, newScore, session.id);

        // Send result
        socket.emit('exam:answer_result', {
          isCorrect, pointsEarned, correctOption: question.correctOption,
          explanation: question.explanation, newLevel, newScore,
        });

        // Next question after 1.5s
        const answeredIds = answered.map((a: any) => a.questionId);
        const nextQ = getNextQuestion(session.examId, newLevel, answeredIds);
        if (nextQ) {
          setTimeout(() => socket.emit(SOCKET_EVENTS.NEXT_QUESTION, { question: nextQ }), 1500);
        } else {
          db.prepare("UPDATE exam_sessions SET status='submitted',endTime=? WHERE id=?")
            .run(new Date().toISOString(), session.id);
          setTimeout(() => socket.emit(SOCKET_EVENTS.EXAM_FORCE_SUBMIT, { reason: 'complete' }), 1500);
        }

        broadcastProgress(io, sdata, { ...session, currentLevel: newLevel, score: newScore, answeredQuestions: JSON.stringify(answered) });
      });

      socket.on(SOCKET_EVENTS.HEARTBEAT, () => {
        const sdata = connectedStudents.get(socket.id);
        if (!sdata) return;
        const session = db.prepare('SELECT * FROM exam_sessions WHERE id=?').get(sdata.sessionId) as any;
        if (!session || session.status !== 'active') return;

        const newTime = Math.max(0, session.timeRemaining - 1);
        db.prepare('UPDATE exam_sessions SET timeRemaining=? WHERE id=?').run(newTime, session.id);
        socket.emit(SOCKET_EVENTS.TIME_UPDATE, { timeRemaining: newTime });

        if (newTime <= 0) {
          db.prepare("UPDATE exam_sessions SET status='submitted',endTime=? WHERE id=?")
            .run(new Date().toISOString(), session.id);
          socket.emit(SOCKET_EVENTS.EXAM_FORCE_SUBMIT, { reason: 'timeout' });
        }
      });

      socket.on(SOCKET_EVENTS.EXAM_COMPLETE, () => {
        const sdata = connectedStudents.get(socket.id);
        if (!sdata) return;
        db.prepare("UPDATE exam_sessions SET status='submitted',endTime=? WHERE id=?")
          .run(new Date().toISOString(), sdata.sessionId);
        io.to('teachers').emit('teacher:exam_complete', { studentId: user.id, sessionId: sdata.sessionId });
      });

      socket.on('disconnect', () => {
        const sdata = connectedStudents.get(socket.id);
        if (sdata) {
          connectedStudents.delete(socket.id);
          io.to('teachers').emit(SOCKET_EVENTS.STUDENT_DISCONNECTED, {
            socketId: socket.id, userId: sdata.userId, name: sdata.name,
          });
        }
        console.log(`🎓 ${user.name} disconnected`);
      });
    }
  });
}

function broadcastProgress(io: Server, sdata: any, session: any) {
  const answered = JSON.parse(session.answeredQuestions || '[]');
  io.to('teachers').emit(SOCKET_EVENTS.STUDENT_PROGRESS, {
    studentId: sdata.userId, studentName: sdata.name, rollNo: sdata.rollNo,
    systemNo: sdata.systemNo, currentLevel: session.currentLevel,
    score: session.score, questionsAnswered: answered.length,
    violationCount: session.violationCount, examStatus: session.status,
    sessionId: sdata.sessionId,
  });
}
