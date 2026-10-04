import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, User, Wifi, WifiOff, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import { SOCKET_EVENTS } from '../../../../shared/types';
import toast from 'react-hot-toast';

export default function StudentWaiting() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d.length < 3 ? d + '.' : '')), 600);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on(SOCKET_EVENTS.EXAM_START, async (data: { examId: string }) => {
      toast.success('Exam is starting!');
      setExamStarted(true);
      try {
        const res = await api.post(`/exam/${data.examId}/session/start`);
        const sid = res.data._id || res.data.id;
        setSessionId(sid);
        socket.emit(SOCKET_EVENTS.STUDENT_JOIN, { sessionId: sid });
        setTimeout(() => navigate(`/student/exam/${sid}`), 1500);
      } catch {
        toast.error('Failed to start session');
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off(SOCKET_EVENTS.EXAM_START);
    };
  }, [navigate]);

  useEffect(() => {
    api.get('/exam/active/current').then(async (res) => {
      if (res.data) {
        try {
          const sessionRes = await api.post(`/exam/${res.data._id || res.data.id}/session/start`);
          const sid = sessionRes.data._id || sessionRes.data.id;
          setSessionId(sid);
          const socket = getSocket();
          socket.emit(SOCKET_EVENTS.STUDENT_JOIN, { sessionId: sid });
          navigate(`/student/exam/${sid}`);
        } catch { /* session may already exist */ }
      }
    }).catch(() => {});
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card max-w-md w-full text-center relative"
      >
        {/* Connection status */}
        <div className={`absolute top-4 right-4 flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {connected ? 'Connected' : 'Offline'}
        </div>

        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-indigo-400" />
        </div>

        <h1 className="text-2xl font-bold mb-2">SecureAssess</h1>
        <p className="text-white/50 text-sm mb-8">Exam Portal</p>

        {/* Student Info */}
        <div className="bg-white/5 rounded-xl p-4 mb-8 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{user?.name}</p>
              <p className="text-white/40 text-xs">Roll: {user?.rollNo} · System {user?.systemNo}</p>
            </div>
          </div>
        </div>

        {/* Waiting state */}
        {!examStarted ? (
          <div>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-16 h-16 mx-auto mb-4"
            >
              <Clock className="w-full h-full text-indigo-400 opacity-60" />
            </motion.div>
            <h2 className="text-xl font-semibold mb-2">Waiting for Exam{dots}</h2>
            <p className="text-white/40 text-sm">Your teacher will start the exam shortly.</p>
            <p className="text-white/30 text-xs mt-2">Stay on this tab. Switching will be detected.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-emerald-400 mb-2">Exam Starting!</h2>
            <p className="text-white/50 text-sm">Redirecting to exam...</p>
          </motion.div>
        )}

        <button onClick={handleLogout} className="mt-8 text-white/30 hover:text-white/50 text-xs flex items-center gap-1.5 mx-auto transition-colors">
          <LogOut size={12} /> Logout
        </button>
      </motion.div>
    </div>
  );
}
