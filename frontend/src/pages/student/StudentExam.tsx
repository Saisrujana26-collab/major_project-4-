import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../hooks/useAuth';
import { SOCKET_EVENTS } from '../../../../shared/types';
import Timer from '../../components/ui/Timer';
import DifficultyBadge from '../../components/ui/DifficultyBadge';
import LevelUpOverlay from '../../components/student/LevelUpOverlay';
import ViolationWarning from '../../components/student/ViolationWarning';

interface Question {
  _id?: string;
  id?: string;
  text: string;
  options: string[];
  correctOption: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  points: number;
}

interface AnswerResult {
  isCorrect: boolean;
  pointsEarned: number;
  correctOption: number;
  explanation?: string;
  newLevel: 'easy' | 'medium' | 'hard';
  newScore: number;
}

export default function StudentExam() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [currentLevel, setCurrentLevel] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [paused, setIsPaused] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [prevLevel, setPrevLevel] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [violationWarning, setViolationWarning] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);

  const questionStartTime = useRef(Date.now());
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Anti-Cheat Setup ─────────────────────────────────────────────────────
  const sendViolation = useCallback((violationType: string, details?: string) => {
    if (!user) return;
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.VIOLATION, {
      studentId: user.id,
      studentName: user.name,
      rollNo: user.rollNo,
      systemNo: user.systemNo,
      violationType,
      timestamp: new Date().toISOString(),
      details,
      sessionId,
    });
    setViolationCount((c) => c + 1);
    setViolationWarning(violationType.replace(/_/g, ' '));
    setTimeout(() => setViolationWarning(null), 4000);
  }, [user, sessionId]);

  useEffect(() => {
    // ─── Fullscreen enforcement ──────────────────────────────────────────────
    const requestFS = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    requestFS();

    const handleFSChange = () => {
      if (!document.fullscreenElement) {
        sendViolation('FULLSCREEN_EXIT');
        setTimeout(requestFS, 500);
      }
    };

    // ─── Tab/Window visibility ──────────────────────────────────────────────
    const handleVisibility = () => {
      if (document.hidden) sendViolation('TAB_SWITCH');
    };
    const handleBlur = () => sendViolation('WINDOW_BLUR');

    // ─── Copy/Cut/Paste/Context ──────────────────────────────────────────────
    const blockAndLog = (type: string) => (e: Event) => { e.preventDefault(); sendViolation(type); };
    const onCopy = blockAndLog('COPY_ATTEMPT');
    const onCut = blockAndLog('CUT_ATTEMPT');
    const onPaste = blockAndLog('PASTE_ATTEMPT');
    const onContext = blockAndLog('RIGHT_CLICK');
    const onSelect = (e: Event) => { e.preventDefault(); };

    // ─── Keyboard shortcuts ──────────────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') { e.preventDefault(); sendViolation('DEVTOOLS_OPEN'); return; }
      // PrintScreen
      if (e.key === 'PrintScreen') { e.preventDefault(); sendViolation('SCREENSHOT_ATTEMPT'); return; }
      // Ctrl+C/X/U/S/A
      if (e.ctrlKey || e.metaKey) {
        if (['c', 'x', 'u', 's', 'a', 'p'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          sendViolation('KEYBOARD_SHORTCUT', `Ctrl+${e.key.toUpperCase()}`);
          return;
        }
        // Ctrl+Shift+I/J/C (devtools)
        if (e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          sendViolation('DEVTOOLS_OPEN', `Ctrl+Shift+${e.key.toUpperCase()}`);
          return;
        }
      }
    };

    // ─── DevTools detection (window size method) ────────────────────────────
    let devToolsCheck: ReturnType<typeof setInterval>;
    const THRESHOLD = 160;
    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > THRESHOLD || heightDiff > THRESHOLD) {
        sendViolation('DEVTOOLS_OPEN', 'Window size delta detected');
      }
    };
    devToolsCheck = setInterval(checkDevTools, 3000);

    // ─── Multi-tab detection ────────────────────────────────────────────────
    const channelKey = `sa_exam_${sessionId}`;
    localStorage.setItem(channelKey, Date.now().toString());
    const handleStorage = (e: StorageEvent) => {
      if (e.key === channelKey) sendViolation('MULTI_TAB');
    };

    // Register all listeners
    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('selectstart', onSelect);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(devToolsCheck);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('selectstart', onSelect);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('storage', handleStorage);
      localStorage.removeItem(channelKey);
    };
  }, [sendViolation, sessionId]);

  // ─── Socket connection ────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.STUDENT_JOIN, { sessionId });

    socket.on(SOCKET_EVENTS.NEXT_QUESTION, (data: { question: Question }) => {
      setQuestion(data.question);
      setSelected(null);
      setAnswered(false);
      setResult(null);
      questionStartTime.current = Date.now();
      setQuestionCount((c) => c + 1);
    });

    socket.on('exam:answer_result', (data: AnswerResult) => {
      setResult(data);
      setAnswered(true);
      if (data.newLevel !== currentLevel) {
        if (data.newLevel > currentLevel || (currentLevel === 'easy' && data.newLevel === 'medium') || (currentLevel === 'medium' && data.newLevel === 'hard')) {
          setPrevLevel(currentLevel);
          setShowLevelUp(true);
          setTimeout(() => setShowLevelUp(false), 3000);
        }
        setCurrentLevel(data.newLevel);
      }
      setScore(data.newScore);
    });

    socket.on(SOCKET_EVENTS.EXAM_PAUSE, () => {
      setIsPaused(true);
      toast('Exam paused by teacher', { icon: '⏸️' });
    });

    socket.on(SOCKET_EVENTS.EXAM_RESUME, () => {
      setIsPaused(false);
      toast.success('Exam resumed');
    });

    socket.on(SOCKET_EVENTS.EXAM_FORCE_SUBMIT, (data: { reason?: string }) => {
      toast(data?.reason === 'timeout' ? 'Time is up!' : 'Exam submitted', { icon: '📤' });
      navigate(`/student/complete/${sessionId}`);
    });

    socket.on('exam:warning', (data: { message: string }) => {
      toast.error(data.message, { duration: 6000 });
    });

    socket.on(SOCKET_EVENTS.TIME_UPDATE, (data: { timeRemaining: number }) => {
      setTimeRemaining(data.timeRemaining);
    });

    // Heartbeat every second
    heartbeatInterval.current = setInterval(() => {
      socket.emit(SOCKET_EVENTS.HEARTBEAT);
    }, 1000);

    return () => {
      socket.off(SOCKET_EVENTS.NEXT_QUESTION);
      socket.off('exam:answer_result');
      socket.off(SOCKET_EVENTS.EXAM_PAUSE);
      socket.off(SOCKET_EVENTS.EXAM_RESUME);
      socket.off(SOCKET_EVENTS.EXAM_FORCE_SUBMIT);
      socket.off('exam:warning');
      socket.off(SOCKET_EVENTS.TIME_UPDATE);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    };
  }, [sessionId, currentLevel, navigate]);

  const handleSubmitAnswer = () => {
    if (selected === null || answered) return;
    const socket = getSocket();
    const timeTaken = Math.floor((Date.now() - questionStartTime.current) / 1000);
    socket.emit(SOCKET_EVENTS.ANSWER_SUBMIT, {
      sessionId,
      questionId: (question as any)._id || (question as any).id,
      selectedOption: selected,
      timeTaken,
    });
  };

  const levelColors: Record<string, string> = {
    easy: 'from-emerald-900/30 to-emerald-800/10',
    medium: 'from-amber-900/30 to-amber-800/10',
    hard: 'from-red-900/30 to-red-800/10',
  };

  return (
    <div className={`min-h-screen flex flex-col no-select bg-gradient-to-br ${levelColors[currentLevel]} transition-all duration-700`}>
      {/* Overlays */}
      <AnimatePresence>
        {showLevelUp && <LevelUpOverlay from={prevLevel} to={currentLevel} />}
        {violationWarning && <ViolationWarning type={violationWarning} count={violationCount} />}
        {paused && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">⏸️</div>
              <h2 className="text-3xl font-bold text-white">Exam Paused</h2>
              <p className="text-white/50 mt-2">Waiting for teacher to resume...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between backdrop-blur-sm bg-navy-950/40">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-indigo-400" />
          <span className="font-bold text-white">SecureAssess</span>
          <span className="text-white/30 text-sm">·</span>
          <DifficultyBadge level={currentLevel} />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-white/60 text-sm">
            Q{questionCount} · <span className="text-white font-semibold">{score} pts</span>
          </div>
          {violationCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 rounded-full px-3 py-1 text-xs text-red-400">
              <AlertTriangle size={11} />
              {violationCount} violation{violationCount !== 1 ? 's' : ''}
            </div>
          )}
          <Timer seconds={timeRemaining} onExpire={() => navigate(`/student/complete/${sessionId}`)} />
        </div>
      </header>

      {/* Question Area */}
      <main className="flex-1 flex items-center justify-center p-8">
        {question ? (
          <motion.div
            key={question._id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full max-w-2xl"
          >
            {/* Topic */}
            <p className="text-white/30 text-sm mb-2 text-center">{question.topic}</p>

            {/* Question */}
            <div className="card mb-6 text-center">
              <p className="text-xl font-medium text-white leading-relaxed">{question.text}</p>
              <p className="text-white/30 text-xs mt-3">{question.points} points</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              {question.options.map((opt, i) => {
                let optStyle = 'border-white/10 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10';
                if (selected === i && !answered) optStyle = 'border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/20';
                if (answered) {
                  if (i === result?.correctOption) optStyle = 'border-emerald-500/70 bg-emerald-500/15 text-emerald-300';
                  else if (i === selected && i !== result?.correctOption) optStyle = 'border-red-500/60 bg-red-500/15 text-red-300';
                  else optStyle = 'border-white/5 opacity-50';
                }

                return (
                  <motion.button
                    key={i}
                    whileHover={!answered ? { scale: 1.01 } : {}}
                    whileTap={!answered ? { scale: 0.99 } : {}}
                    onClick={() => !answered && setSelected(i)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${optStyle}`}
                    disabled={answered}
                  >
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {['A', 'B', 'C', 'D'][i]}
                    </span>
                    <span className="text-white">{opt}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {answered && result?.explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-4 text-sm text-indigo-200"
                >
                  <span className="font-semibold">Explanation: </span>{result.explanation}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit / Next */}
            {!answered ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selected === null}
                className="btn-primary w-full text-lg py-4"
              >
                Submit Answer
              </button>
            ) : (
              <div className={`text-center py-3 rounded-xl font-semibold ${result?.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {result?.isCorrect ? `✓ Correct! +${result.pointsEarned} points` : '✗ Incorrect. Next question loading...'}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="text-center text-white/30">
            <div className="w-16 h-16 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <p>Loading question...</p>
          </div>
        )}
      </main>

      {/* Level progress bar */}
      <div className="h-1 bg-white/5 flex">
        <motion.div
          className={`h-full transition-colors ${currentLevel === 'easy' ? 'bg-emerald-500' : currentLevel === 'medium' ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${currentLevel === 'easy' ? 33 : currentLevel === 'medium' ? 66 : 100}%` }}
          layout
        />
      </div>
    </div>
  );
}
