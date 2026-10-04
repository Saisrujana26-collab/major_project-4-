import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ShieldCheck, Monitor, Users, AlertTriangle, Play, Pause, Square,
  LogOut, Plus, Projector, Upload, ChevronRight, Wifi, WifiOff
} from 'lucide-react';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import StudentCard from '../../components/teacher/StudentCard';
import ViolationFeed from '../../components/teacher/ViolationFeed';
import ExamControls from '../../components/teacher/ExamControls';
import CreateExamModal from '../../components/teacher/CreateExamModal';
import UploadPDFModal from '../../components/teacher/UploadPDFModal';
import { SOCKET_EVENTS } from '../../../../shared/types';

interface StudentState {
  socketId: string;
  userId: string;
  sessionId: string;
  systemNo: number;
  name: string;
  rollNo: string;
  currentLevel: 'easy' | 'medium' | 'hard';
  score: number;
  questionsAnswered: number;
  violationCount: number;
  status: string;
  connected: boolean;
}

interface ViolationLog {
  id: string;
  studentName: string;
  rollNo: string;
  systemNo: number;
  violationType: string;
  timestamp: string;
  newScore?: number;
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Map<string, StudentState>>(new Map());
  const [violations, setViolations] = useState<ViolationLog[]>([]);
  const [activeExam, setActiveExam] = useState<{ _id: string; id: string; title: string; status: string; duration: number } | null>(null);
  const [exams, setExams] = useState<typeof activeExam[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showUploadPDF, setShowUploadPDF] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Load exams
  const loadExams = useCallback(async () => {
    try {
      const res = await api.get('/exam');
      setExams(res.data);
      const active = res.data.find((e: any) => e?.status === 'active');
      if (active) {
        setActiveExam(active);
        setSelectedExamId(active._id || active.id);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  // Socket setup
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.emit(SOCKET_EVENTS.TEACHER_JOIN, {});

    socket.on('teacher:current_students', (list: StudentState[]) => {
      const map = new Map<string, StudentState>();
      list.forEach((s) => map.set(s.userId, { ...s, connected: true }));
      setStudents(map);
    });

    socket.on(SOCKET_EVENTS.STUDENT_JOINED, (data: StudentState) => {
      setStudents((prev) => {
        const next = new Map(prev);
        next.set(data.userId, { ...data, connected: true });
        return next;
      });
      toast(`🎓 ${data.name} joined (System ${data.systemNo})`, { icon: '✅' });
    });

    socket.on(SOCKET_EVENTS.STUDENT_DISCONNECTED, (data: { userId: string; name: string }) => {
      setStudents((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId);
        if (existing) next.set(data.userId, { ...existing, connected: false });
        return next;
      });
    });

    socket.on(SOCKET_EVENTS.VIOLATION_ALERT, (data: ViolationLog & { newViolationCount: number; newScore: number; status: string; studentId?: string }) => {
      const logEntry: ViolationLog = {
        id: `${Date.now()}-${Math.random()}`,
        studentName: data.studentName,
        rollNo: data.rollNo,
        systemNo: data.systemNo,
        violationType: data.violationType,
        timestamp: data.timestamp,
        newScore: data.newScore,
      };
      setViolations((prev) => [logEntry, ...prev].slice(0, 100));

      // Update student card
      if (data.studentId) {
        setStudents((prev) => {
          const next = new Map(prev);
          const s = next.get(data.studentId!);
          if (s) next.set(data.studentId!, { ...s, violationCount: data.newViolationCount, score: data.newScore, status: data.status });
          return next;
        });
      }

      const violationLabel = data.violationType.replace(/_/g, ' ');
      toast.error(`⚠️ System ${data.systemNo} (${data.studentName}): ${violationLabel}`, { duration: 5000 });
    });

    socket.on(SOCKET_EVENTS.STUDENT_PROGRESS, (data: StudentState & { studentId: string }) => {
      setStudents((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.studentId);
        if (existing) next.set(data.studentId, { ...existing, ...data, connected: true });
        return next;
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('teacher:current_students');
      socket.off(SOCKET_EVENTS.STUDENT_JOINED);
      socket.off(SOCKET_EVENTS.STUDENT_DISCONNECTED);
      socket.off(SOCKET_EVENTS.VIOLATION_ALERT);
      socket.off(SOCKET_EVENTS.STUDENT_PROGRESS);
    };
  }, []);

  const handleExamControl = (action: string) => {
    if (!activeExam) { toast.error('No active exam selected'); return; }
    const socket = getSocket();
    const examId = (activeExam as any)._id || (activeExam as any).id;
    socket.emit(SOCKET_EVENTS.EXAM_CONTROL, { action, examId });
    if (action === 'start') toast.success('Exam started for all students');
    else if (action === 'pause') toast('Exam paused', { icon: '⏸️' });
    else if (action === 'resume') toast.success('Exam resumed');
    else if (action === 'stop') { toast('Exam stopped', { icon: '⏹️' }); loadExams(); }
  };

  const handleForceSubmit = (studentId: string) => {
    if (!activeExam) return;
    const socket = getSocket();
    const examId = (activeExam as any)._id || (activeExam as any).id;
    socket.emit(SOCKET_EVENTS.EXAM_CONTROL, { action: 'force_submit', examId, targetStudentId: studentId });
    toast('Force submitted student exam', { icon: '📤' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const studentList = Array.from(students.values()).sort((a, b) => a.systemNo - b.systemNo);
  const totalViolations = violations.length;
  const connectedCount = studentList.filter((s) => s.connected).length;

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-navy-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">SecureAssess</h1>
            <span className="text-white/30 text-sm">/ Teacher Dashboard</span>
          </div>
          {/* Socket status */}
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border ${
            socketConnected ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'
          }`}>
            {socketConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {socketConnected ? 'Live' : 'Disconnected'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/projector')} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Projector size={15} /> Projector Mode
          </button>
          <button onClick={() => setShowCreateExam(true)} className="btn-primary flex items-center gap-2 text-sm py-2">
            <Plus size={15} /> New Exam
          </button>
          <button onClick={handleLogout} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Connected', value: connectedCount, icon: Users, color: 'indigo' },
              { label: 'Total Students', value: studentList.length, icon: GraduationCap2, color: 'purple' },
              { label: 'Violations', value: totalViolations, icon: AlertTriangle, color: 'red' },
              { label: 'Active Exam', value: activeExam?.title || 'None', icon: Monitor, color: 'emerald', isText: true },
            ].map((stat) => (
              <div key={stat.label} className="card flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}-500/15`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                </div>
                <div>
                  <p className="text-white/50 text-xs">{stat.label}</p>
                  <p className={`font-bold ${stat.isText ? 'text-sm text-white truncate max-w-[120px]' : 'text-2xl text-white'}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Exam Selector + Controls */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Monitor size={16} className="text-indigo-400" /> Exam Control Panel
              </h2>
              <button
                onClick={() => { if (selectedExamId) setShowUploadPDF(true); else toast.error('Select an exam first'); }}
                className="btn-secondary text-sm py-1.5 flex items-center gap-2"
              >
                <Upload size={14} /> Upload PDF
              </button>
            </div>

            <div className="flex items-center gap-4">
              <select
                className="input flex-1"
                onChange={(e) => {
                  const val = e.target.value;
                  const exam = exams.find((ex) => ex?.id === val || ex?._id === val) || null;
                  setSelectedExamId(val || null);
                  setActiveExam(exam);
                }}
                value={selectedExamId || ''}
              >
                <option value="">Select an exam...</option>
                {exams.map((exam) => exam && (
                  <option key={exam._id || exam.id} value={exam._id || exam.id}>
                    {exam.title} ({exam.status})
                  </option>
                ))}
              </select>

              <ExamControls
                examStatus={activeExam?.status || 'none'}
                onControl={handleExamControl}
              />

              {activeExam && (
                <button
                  onClick={() => navigate(`/teacher/exam/${(activeExam as any)._id || (activeExam as any).id}`)}
                  className="btn-secondary text-sm py-2.5 flex items-center gap-1"
                >
                  View <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Student Grid */}
          <div>
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={16} className="text-indigo-400" />
              Student Monitors
              <span className="text-white/40 text-sm font-normal">({connectedCount}/{studentList.length} connected)</span>
            </h2>
            {studentList.length === 0 ? (
              <div className="card text-center py-16 text-white/30">
                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Waiting for students to connect...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                  {studentList.map((student) => (
                    <motion.div
                      key={student.userId}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      layout
                    >
                      <StudentCard
                        student={student}
                        onForceSubmit={() => handleForceSubmit(student.userId)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>

        {/* Violation Sidebar */}
        <aside className="w-80 border-l border-navy-800/50 flex flex-col">
          <div className="p-4 border-b border-navy-800/50 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <AlertTriangle size={14} className="text-red-400" />
              Live Violations
            </h3>
            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
              {totalViolations}
            </span>
          </div>
          <ViolationFeed violations={violations} />
        </aside>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateExam && (
          <CreateExamModal
            onClose={() => setShowCreateExam(false)}
            onCreated={() => { setShowCreateExam(false); loadExams(); }}
          />
        )}
        {showUploadPDF && selectedExamId && (
          <UploadPDFModal
            examId={selectedExamId}
            onClose={() => setShowUploadPDF(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline icon alias (to avoid import issue)
const GraduationCap2 = Users;
