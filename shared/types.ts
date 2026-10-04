// ─── Shared Types for SecureAssess ───────────────────────────────────────────

export type UserRole = 'teacher' | 'student';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ViolationType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'COPY_ATTEMPT'
  | 'CUT_ATTEMPT'
  | 'PASTE_ATTEMPT'
  | 'RIGHT_CLICK'
  | 'TEXT_SELECTION'
  | 'DEVTOOLS_OPEN'
  | 'SCREENSHOT_ATTEMPT'
  | 'MULTI_TAB'
  | 'FULLSCREEN_EXIT'
  | 'VIEW_SOURCE'
  | 'KEYBOARD_SHORTCUT';

export type ExamStatus = 'pending' | 'active' | 'paused' | 'submitted' | 'under_review' | 'disqualified';

// ─── Socket Events ────────────────────────────────────────────────────────────
export interface ViolationEvent {
  studentId: string;
  studentName: string;
  rollNo: string;
  systemNo: number;
  violationType: ViolationType;
  timestamp: string;
  details?: string;
  sessionId: string;
}

export interface StudentProgressEvent {
  studentId: string;
  studentName: string;
  rollNo: string;
  systemNo: number;
  currentLevel: DifficultyLevel;
  score: number;
  questionsAnswered: number;
  totalQuestions: number;
  violationCount: number;
  examStatus: ExamStatus;
  sessionId: string;
}

export interface ExamControlEvent {
  action: 'start' | 'pause' | 'resume' | 'stop' | 'force_submit';
  targetStudentId?: string; // if undefined, applies to all
  examId: string;
  timeExtension?: number; // seconds to add/remove
}

export interface AnswerSubmitEvent {
  sessionId: string;
  questionId: string;
  selectedOption: number;
  timeTaken: number; // seconds
}

// ─── API Types ────────────────────────────────────────────────────────────────
export interface Question {
  _id: string;
  text: string;
  options: string[];
  correctOption: number;
  difficulty: DifficultyLevel;
  topic: string;
  examId: string;
  points: number;
}

export interface Student {
  _id: string;
  name: string;
  rollNo: string;
  systemNo: number;
  passwordHash: string;
  createdAt: string;
}

export interface ExamSession {
  _id: string;
  studentId: string;
  examId: string;
  currentLevel: DifficultyLevel;
  score: number;
  questionsAnswered: Question[];
  violations: ViolationEvent[];
  violationCount: number;
  status: ExamStatus;
  startTime: string;
  endTime?: string;
  timeRemaining: number;
}

export interface Exam {
  _id: string;
  title: string;
  description: string;
  duration: number; // seconds
  createdBy: string;
  questions: string[]; // question IDs
  status: 'draft' | 'active' | 'completed';
  violationThreshold: number;
  pointDeductionPerViolation: number;
  createdAt: string;
}

export interface CertificateData {
  studentName: string;
  rollNo: string;
  examTitle: string;
  score: number;
  maxScore: number;
  accuracy: number;
  levelReached: DifficultyLevel;
  violationCount: number;
  completedAt: string;
  verificationCode: string;
}

// ─── Socket Event Names ───────────────────────────────────────────────────────
export const SOCKET_EVENTS = {
  // Student → Server
  STUDENT_JOIN: 'student:join',
  VIOLATION: 'student:violation',
  ANSWER_SUBMIT: 'student:answer',
  EXAM_COMPLETE: 'student:complete',
  HEARTBEAT: 'student:heartbeat',

  // Server → Teacher
  VIOLATION_ALERT: 'teacher:violation',
  STUDENT_PROGRESS: 'teacher:progress',
  STUDENT_JOINED: 'teacher:student_joined',
  STUDENT_DISCONNECTED: 'teacher:student_disconnected',

  // Teacher → Server
  TEACHER_JOIN: 'teacher:join',
  EXAM_CONTROL: 'teacher:control',

  // Server → Student
  NEXT_QUESTION: 'exam:question',
  EXAM_START: 'exam:start',
  EXAM_PAUSE: 'exam:pause',
  EXAM_RESUME: 'exam:resume',
  EXAM_FORCE_SUBMIT: 'exam:force_submit',
  TIME_UPDATE: 'exam:time',
} as const;
