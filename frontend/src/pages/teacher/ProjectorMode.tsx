import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Monitor, Users, Wifi } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { SOCKET_EVENTS } from '../../../../shared/types';
import { formatDistanceToNow } from 'date-fns';

interface ViolationAlert {
  id: string;
  studentName: string;
  systemNo: number;
  violationType: string;
  timestamp: string;
}

interface StudentStat {
  userId: string;
  systemNo: number;
  name: string;
  currentLevel: 'easy' | 'medium' | 'hard';
  score: number;
  violationCount: number;
  status: string;
}

const VIOLATION_LABELS: Record<string, string> = {
  TAB_SWITCH: 'Tab Switch', WINDOW_BLUR: 'Window Blur', COPY_ATTEMPT: 'Copy Attempt',
  CUT_ATTEMPT: 'Cut Attempt', PASTE_ATTEMPT: 'Paste Attempt', RIGHT_CLICK: 'Right Click',
  DEVTOOLS_OPEN: 'DevTools Opened', SCREENSHOT_ATTEMPT: 'Screenshot Attempt',
  MULTI_TAB: 'Multiple Tabs', FULLSCREEN_EXIT: 'Fullscreen Exit',
  VIEW_SOURCE: 'View Source', KEYBOARD_SHORTCUT: 'Keyboard Shortcut', TEXT_SELECTION: 'Text Selection',
};

export default function ProjectorMode() {
  const [violations, setViolations] = useState<ViolationAlert[]>([]);
  const [students, setStudents] = useState<Map<string, StudentStat>>(new Map());
  const [connected, setConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.emit(SOCKET_EVENTS.TEACHER_JOIN, {});

    socket.on('teacher:current_students', (list: StudentStat[]) => {
      const map = new Map<string, StudentStat>();
      list.forEach((s) => map.set(s.userId, s));
      setStudents(map);
    });

    socket.on(SOCKET_EVENTS.VIOLATION_ALERT, (data: ViolationAlert & { studentId: string }) => {
      const entry: ViolationAlert = { id: `${Date.now()}`, ...data };
      setViolations((prev) => [entry, ...prev].slice(0, 10));
      // Auto-remove after 8s
      setTimeout(() => setViolations((prev) => prev.filter((v) => v.id !== entry.id)), 8000);
    });

    socket.on(SOCKET_EVENTS.STUDENT_PROGRESS, (data: StudentStat & { studentId: string }) => {
      setStudents((prev) => {
        const next = new Map(prev);
        next.set(data.studentId, data);
        return next;
      });
    });

    socket.on(SOCKET_EVENTS.STUDENT_JOINED, (data: StudentStat & { userId: string }) => {
      setStudents((prev) => { const next = new Map(prev); next.set(data.userId, data); return next; });
    });

    return () => {
      socket.off('connect'); socket.off('disconnect');
      socket.off('teacher:current_students');
      socket.off(SOCKET_EVENTS.VIOLATION_ALERT);
      socket.off(SOCKET_EVENTS.STUDENT_PROGRESS);
      socket.off(SOCKET_EVENTS.STUDENT_JOINED);
    };
  }, []);

  const studentList = Array.from(students.values()).sort((a, b) => a.systemNo - b.systemNo);

  return (
    <div className="min-h-screen bg-[#04020e] text-white flex flex-col p-8 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <ShieldCheck className="w-10 h-10 text-indigo-400" />
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">SecureAssess</h1>
            <p className="text-white/40 text-lg">Live Examination Monitor</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold text-white">
            {currentTime.toLocaleTimeString()}
          </p>
          <p className="text-white/40">{currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <div className={`flex items-center gap-2 justify-end mt-1 text-sm ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
            <Wifi size={14} />
            {connected ? 'Live' : 'Disconnected'}
          </div>
        </div>
      </div>

      <div className="flex gap-8 flex-1">
        {/* Student Grid */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-5">
            <Users size={20} className="text-indigo-400" />
            <h2 className="text-2xl font-semibold">Student Status</h2>
            <span className="text-white/30 text-lg">({studentList.length} students)</span>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {studentList.map((student) => {
              const borderColor =
                student.violationCount === 0 ? 'border-emerald-500/40' :
                student.violationCount <= 2 ? 'border-amber-500/40' : 'border-red-500/60';
              const levelColor =
                student.currentLevel === 'hard' ? 'text-red-400' :
                student.currentLevel === 'medium' ? 'text-amber-400' : 'text-emerald-400';

              return (
                <div key={student.userId} className={`border-2 rounded-2xl p-5 bg-white/3 ${borderColor}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Monitor size={18} className="text-indigo-400" />
                      <span className="text-xl font-bold">Sys {student.systemNo}</span>
                    </div>
                    {student.violationCount > 0 && (
                      <div className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={12} className="text-red-400" />
                        <span className="text-red-400 font-bold text-sm">{student.violationCount}</span>
                      </div>
                    )}
                  </div>
                  <p className="font-semibold text-lg text-white truncate">{student.name}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-sm font-bold uppercase ${levelColor}`}>{student.currentLevel}</span>
                    <span className="text-white/60 text-sm">Score: <span className="text-white font-bold">{student.score}</span></span>
                  </div>
                </div>
              );
            })}

            {studentList.length === 0 && (
              <div className="col-span-4 text-center py-16 text-white/20">
                <Monitor className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-2xl">Waiting for students to connect...</p>
              </div>
            )}
          </div>
        </div>

        {/* Violation Feed */}
        <div className="w-96">
          <div className="flex items-center gap-3 mb-5">
            <AlertTriangle size={20} className="text-red-400" />
            <h2 className="text-2xl font-semibold text-red-300">Violations</h2>
          </div>

          {violations.length === 0 ? (
            <div className="text-center py-12 text-white/20">
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-xl">All Clear</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {violations.map((v) => (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, x: 40, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 40, scale: 0.9 }}
                    className="bg-red-500/15 border-2 border-red-500/50 rounded-2xl p-5"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle size={22} className="text-red-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-white text-lg">System {v.systemNo}</p>
                        <p className="text-white/60 text-sm">{v.studentName}</p>
                      </div>
                    </div>
                    <p className="text-red-300 font-semibold text-lg">
                      {VIOLATION_LABELS[v.violationType] || v.violationType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-white/30 text-sm mt-1">
                      {formatDistanceToNow(new Date(v.timestamp), { addSuffix: true })}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-white/20 text-sm">
        <p>SecureAssess — Anti-Cheat Adaptive Examination Platform</p>
        <p>All actions are monitored and logged</p>
      </div>
    </div>
  );
}
