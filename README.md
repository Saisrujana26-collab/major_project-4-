# SecureAssess — Anti-Cheat Adaptive Assignment Portal

A proctored, adaptive-difficulty exam platform for lab environments (1 teacher + 7 students on LAN).

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (or provide a URI)
- (Optional) OpenAI API key for AI question generation

### Setup

1. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your MongoDB URI, secrets, and optional OpenAI key
   ```

3. **Run backend**
   ```bash
   cd backend
   npm run dev
   # Runs on http://localhost:4000
   ```

4. **Run frontend**
   ```bash
   cd frontend
   npm run dev
   # Runs on http://localhost:5173 (accessible on LAN via your IP)
   ```

5. **Access from student machines**
   - Find your teacher laptop's IP: `ipconfig` (Windows)
   - Students visit: `http://192.168.x.x:5173`

## Architecture

```
secureassess/
├── backend/              # Node.js + Express + Socket.IO
│   └── src/
│       ├── models/       # MongoDB schemas
│       ├── routes/       # REST API endpoints
│       ├── socket/       # WebSocket handlers
│       └── services/     # Adaptive engine, PDF parser, cert generator
├── frontend/             # React + TypeScript + Tailwind CSS
│   └── src/
│       ├── pages/
│       │   ├── teacher/  # Dashboard, Projector Mode, Exam Setup
│       │   └── student/  # Waiting Room, Exam Portal, Completion
│       ├── components/   # Reusable UI components
│       ├── hooks/        # useAuth
│       └── lib/          # API client, Socket.IO client
└── shared/               # Shared TypeScript types
```

## Default Credentials

- **Teacher password**: `admin123` (set `TEACHER_PASSWORD` in .env)
- **Students**: Login with Roll No + System No (auto-registered on first login)

## Key Features

- **Real-time violation detection** (Tab switch, copy/paste, DevTools, fullscreen exit, etc.)
- **Adaptive difficulty** (Easy → Medium → Hard based on answers)
- **Live teacher dashboard** with per-student monitoring
- **Projector Mode** — class-wide violation feed
- **PDF upload** → AI question generation (OpenAI) or rule-based fallback
- **Certificate generation** with QR code for verified students

## Violation Types Detected

| Type | Method |
|------|--------|
| Tab switch | `visibilitychange` event |
| Window blur | `blur` event |
| Copy/Cut/Paste | Event blocking + logging |
| Right-click | `contextmenu` blocking |
| DevTools | Window size delta + F12/Ctrl+Shift+I |
| Screenshot | PrintScreen key detection |
| Multiple tabs | `localStorage` event |
| Fullscreen exit | Fullscreen API |
| Keyboard shortcuts | `keydown` filtering |

> **Note**: OS-level screenshots cannot be fully prevented by a browser. The system detects and logs the attempt as a deterrent.

## Scoring

| Difficulty | Points (Correct) | Points Deducted (Violation) |
|------------|------------------|-----------------------------|
| Easy       | 10               | Configurable (default: 5)   |
| Medium     | 20               | Configurable                |
| Hard       | 30               | Configurable                |
