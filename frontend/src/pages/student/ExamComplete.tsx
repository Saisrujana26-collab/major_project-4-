import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { Trophy, Download, Home, ShieldCheck, AlertTriangle, TrendingUp } from 'lucide-react';
import api from '../../lib/api';
import DifficultyBadge from '../../components/ui/DifficultyBadge';

interface SessionData {
  score: number;
  currentLevel: 'easy' | 'medium' | 'hard';
  violationCount: number;
  answeredQuestions: Array<{ isCorrect: boolean; difficulty: string; pointsEarned: number }>;
  status: string;
  startTime: string;
  endTime: string;
  examId: { title: string; violationThreshold: number };
}

export default function ExamComplete() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    api.get(`/exam/session/${sessionId}`).then((res) => {
      setSession(res.data);
      const isClean = res.data.violationCount < (res.data.examId?.violationThreshold || 3);
      if (isClean) {
        setTimeout(() => setShowConfetti(true), 500);
        setTimeout(() => setShowConfetti(false), 8000);
      }
    });
  }, [sessionId]);

  const handleDownloadCertificate = async () => {
    if (!sessionId) return;
    setDownloading(true);
    try {
      const res = await api.get(`/certificate/${sessionId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${sessionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = (err as { response?: { status?: number } })?.response?.status === 403
        ? 'Certificate not issued: violation threshold exceeded'
        : 'Certificate download failed';
      alert(msg);
    } finally {
      setDownloading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const totalQ = session.answeredQuestions.length;
  const correctQ = session.answeredQuestions.filter((q) => q.isCorrect).length;
  const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
  const maxPossible = session.answeredQuestions.reduce((s, q) => s + (q.difficulty === 'easy' ? 10 : q.difficulty === 'medium' ? 20 : 30), 0);
  const isEligible = session.violationCount < (session.examId?.violationThreshold || 3);
  const timeTaken = session.startTime && session.endTime
    ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)
    : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={400} gravity={0.2} />}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isEligible ? 'bg-indigo-600/20 border-2 border-indigo-500/50' : 'bg-red-600/20 border-2 border-red-500/50'
            }`}
          >
            {isEligible ? (
              <Trophy className="w-12 h-12 text-indigo-400" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-red-400" />
            )}
          </motion.div>

          <h1 className="text-3xl font-bold text-white">
            {isEligible ? 'Exam Complete!' : 'Under Review'}
          </h1>
          <p className="text-white/50 mt-2 text-sm">
            {session.examId?.title}
          </p>
        </div>

        {/* Stats */}
        <div className="card mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-4xl font-bold text-indigo-400">{session.score}</p>
              <p className="text-white/40 text-xs mt-1">Total Score</p>
              <p className="text-white/20 text-xs">of {maxPossible} possible</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-4xl font-bold text-purple-400">{accuracy}%</p>
              <p className="text-white/40 text-xs mt-1">Accuracy</p>
              <p className="text-white/20 text-xs">{correctQ}/{totalQ} correct</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <DifficultyBadge level={session.currentLevel} />
              <p className="text-white/40 text-xs mt-2">Level Reached</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${session.violationCount === 0 ? 'text-emerald-400' : session.violationCount <= 2 ? 'text-amber-400' : 'text-red-400'}`}>
                {session.violationCount}
              </p>
              <p className="text-white/40 text-xs mt-1">Violations</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{timeTaken}m</p>
              <p className="text-white/40 text-xs mt-1">Time Taken</p>
            </div>
          </div>
        </div>

        {/* Certificate Section */}
        {isEligible ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card mb-4 border-indigo-500/30 bg-indigo-500/5"
          >
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="text-indigo-400" size={20} />
              <div>
                <p className="font-semibold text-white">Certificate Available</p>
                <p className="text-white/40 text-xs">You completed the exam within integrity limits</p>
              </div>
            </div>
            <button
              onClick={handleDownloadCertificate}
              disabled={downloading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {downloading ? 'Generating...' : 'Download Certificate'}
            </button>
          </motion.div>
        ) : (
          <div className="card mb-4 border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-red-300">Certificate Not Issued</p>
                <p className="text-white/40 text-xs">Violation threshold exceeded. Your exam is under review.</p>
              </div>
            </div>
          </div>
        )}

        <button onClick={() => navigate('/student')} className="btn-secondary w-full flex items-center justify-center gap-2">
          <Home size={16} /> Return to Portal
        </button>
      </motion.div>
    </div>
  );
}
