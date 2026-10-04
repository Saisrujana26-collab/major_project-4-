import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Init SQLite DB first
import './db/database';

import authRoutes from './routes/auth';
import examRoutes from './routes/exam';
import questionRoutes from './routes/questions';
import studentRoutes from './routes/students';
import uploadRoutes from './routes/upload';
import certificateRoutes from './routes/certificate';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
});

// ─── Middleware ───────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/certificate', certificateRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: 'sqlite', timestamp: new Date().toISOString() });
});

// ─── Socket.IO ───────────────────────────────────────────────────────────
setupSocketHandlers(io);

// ─── Start ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 SecureAssess running on http://localhost:${PORT}`);
  console.log(`💾 Database: SQLite (./data/secureassess.db)`);
  console.log(`📡 WebSocket: ready`);
  console.log(`🔑 Teacher password: ${process.env.TEACHER_PASSWORD || 'admin123'}\n`);
});
