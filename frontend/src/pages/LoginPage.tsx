import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, GraduationCap, Lock, Hash, Monitor, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

type Mode = 'select' | 'teacher' | 'student';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('select');
  const [loading, setLoading] = useState(false);
  const [teacherPass, setTeacherPass] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [systemNo, setSystemNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const { loginTeacher, loginStudent } = useAuth();
  const navigate = useNavigate();

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherPass.trim()) { toast.error('Enter the admin password'); return; }
    setLoading(true);
    try {
      await loginTeacher(teacherPass);
      toast.success('Welcome, Teacher!');
      navigate('/teacher');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status;
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (!status) {
        toast.error('Cannot reach server. Make sure the backend is running on port 4000.');
      } else if (status === 401) {
        toast.error('Wrong password. Default is: admin123');
      } else {
        toast.error(msg || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNo.trim()) { toast.error('Enter your Roll Number'); return; }
    if (!systemNo.trim()) { toast.error('Enter your System Number'); return; }
    setLoading(true);
    try {
      await loginStudent(rollNo.trim().toUpperCase(), Number(systemNo), undefined, studentName.trim() || undefined);
      toast.success('Logged in! Waiting for exam...');
      navigate('/student');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (!status) {
        toast.error('Cannot reach server. Make sure the backend is running on port 4000.');
      } else {
        toast.error('Login failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <ShieldCheck className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold text-gradient">SecureAssess</h1>
          <p className="text-white/50 mt-2 text-sm">Anti-Cheat Adaptive Assessment Portal</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-2 gap-4"
            >
              <button
                onClick={() => setMode('teacher')}
                className="card hover:border-indigo-500/50 hover:bg-navy-800/60 transition-all duration-300 flex flex-col items-center gap-3 py-8 group"
              >
                <div className="w-14 h-14 rounded-xl bg-indigo-600/20 flex items-center justify-center group-hover:bg-indigo-600/30 transition-colors">
                  <ShieldCheck className="w-7 h-7 text-indigo-400" />
                </div>
                <span className="font-semibold text-white">Teacher</span>
                <span className="text-xs text-white/40">Admin / Proctor</span>
              </button>

              <button
                onClick={() => setMode('student')}
                className="card hover:border-purple-500/50 hover:bg-navy-800/60 transition-all duration-300 flex flex-col items-center gap-3 py-8 group"
              >
                <div className="w-14 h-14 rounded-xl bg-purple-600/20 flex items-center justify-center group-hover:bg-purple-600/30 transition-colors">
                  <GraduationCap className="w-7 h-7 text-purple-400" />
                </div>
                <span className="font-semibold text-white">Student</span>
                <span className="text-xs text-white/40">Take Exam</span>
              </button>
            </motion.div>
          )}

          {mode === 'teacher' && (
            <motion.div
              key="teacher"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Teacher Login</h2>
                  <p className="text-white/40 text-xs">Admin access</p>
                </div>
              </div>

              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="password"
                    value={teacherPass}
                    onChange={(e) => setTeacherPass(e.target.value)}
                    placeholder="Admin password"
                    className="input pl-10"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-white/30 text-xs">Default password: <span className="text-indigo-400 font-mono">admin123</span></p>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <button onClick={() => setMode('select')} className="mt-4 text-white/40 hover:text-white/60 text-sm w-full text-center transition-colors">
                ← Back
              </button>
            </motion.div>
          )}

          {mode === 'student' && (
            <motion.div
              key="student"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Student Login</h2>
                  <p className="text-white/40 text-xs">Use your Roll No & System No</p>
                </div>
              </div>

              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="Roll Number (e.g. 21CS001)"
                    className="input pl-10 uppercase"
                    required
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="number"
                    value={systemNo}
                    onChange={(e) => setSystemNo(e.target.value)}
                    placeholder="System Number (e.g. 12)"
                    className="input pl-10"
                    min={1}
                    required
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Your Name (optional)"
                    className="input pl-10"
                  />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Connecting...' : 'Enter Exam Portal'}
                </button>
              </form>

              <button onClick={() => setMode('select')} className="mt-4 text-white/40 hover:text-white/60 text-sm w-full text-center transition-colors">
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-white/20 text-xs mt-8">
          SecureAssess v1.0 · All activity is monitored
        </p>
      </div>
    </div>
  );
}
