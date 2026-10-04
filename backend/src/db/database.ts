import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'secureassess.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ─── Schema ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rollNo TEXT NOT NULL UNIQUE,
    systemNo INTEGER DEFAULT 0,
    role TEXT NOT NULL CHECK(role IN ('teacher','student')),
    passwordHash TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    duration INTEGER DEFAULT 3600,
    createdBy TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','completed')),
    violationThreshold INTEGER DEFAULT 3,
    pointDeductionPerViolation INTEGER DEFAULT 5,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    options TEXT NOT NULL,
    correctOption INTEGER NOT NULL,
    difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
    topic TEXT DEFAULT 'General',
    examId TEXT NOT NULL,
    points INTEGER DEFAULT 10,
    explanation TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (examId) REFERENCES exams(id)
  );

  CREATE TABLE IF NOT EXISTS exam_sessions (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    examId TEXT NOT NULL,
    currentLevel TEXT DEFAULT 'easy',
    score INTEGER DEFAULT 0,
    answeredQuestions TEXT DEFAULT '[]',
    violations TEXT DEFAULT '[]',
    violationCount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    startTime TEXT,
    endTime TEXT,
    timeRemaining INTEGER DEFAULT 3600,
    socketId TEXT,
    certificateCode TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (studentId) REFERENCES users(id),
    FOREIGN KEY (examId) REFERENCES exams(id)
  );
`);

export default db;
