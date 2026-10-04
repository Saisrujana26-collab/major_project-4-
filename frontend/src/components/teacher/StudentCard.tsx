import { motion } from 'framer-motion';
import { Monitor, AlertTriangle, CheckCircle, XCircle, Send } from 'lucide-react';
import DifficultyBadge from '../ui/DifficultyBadge';
import { clsx } from 'clsx';

interface StudentState {
  userId: string;
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

interface Props {
  student: StudentState;
  onForceSubmit: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'border-emerald-500/40 bg-emerald-500/5',
  under_review: 'border-amber-500/40 bg-amber-500/5',
  disqualified: 'border-red-500/40 bg-red-500/5',
  submitted: 'border-indigo-500/40 bg-indigo-500/5',
  pending: 'border-white/10',
};

export default function StudentCard({ student, onForceSubmit }: Props) {
  const violationColor =
    student.violationCount === 0 ? 'text-emerald-400' :
    student.violationCount <= 2 ? 'text-amber-400' : 'text-red-400';

  const violationBg =
    student.violationCount === 0 ? 'bg-emerald-500/10 border-emerald-500/30' :
    student.violationCount <= 2 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30';

  const statusBorder = STATUS_COLORS[student.status] || 'border-white/10';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={clsx(
        'rounded-2xl border p-4 transition-all duration-300 relative overflow-hidden',
        statusBorder,
        !student.connected && 'opacity-50'
      )}
    >
      {/* Status dot */}
      <div className={clsx(
        'absolute top-3 right-3 w-2.5 h-2.5 rounded-full',
        student.connected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-gray-600'
      )} />

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
          <Monitor size={18} className="text-indigo-400" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm truncate">{student.name}</p>
          <p className="text-white/40 text-xs">{student.rollNo} · Sys {student.systemNo}</p>
        </div>
      </div>

      {/* Level badge */}
      <div className="mb-3">
        <DifficultyBadge level={student.currentLevel} />
      </div>

      {/* Score + Questions */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <p className="text-white font-bold text-lg">{student.score}</p>
          <p className="text-white/40 text-xs">Score</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <p className="text-white font-bold text-lg">{student.questionsAnswered}</p>
          <p className="text-white/40 text-xs">Answered</p>
        </div>
      </div>

      {/* Violation badge */}
      <div className={clsx('flex items-center justify-between rounded-lg border px-3 py-2 mb-3', violationBg)}>
        <div className="flex items-center gap-1.5">
          {student.violationCount === 0 ? (
            <CheckCircle size={13} className="text-emerald-400" />
          ) : (
            <AlertTriangle size={13} className={violationColor} />
          )}
          <span className={clsx('text-xs font-semibold', violationColor)}>
            {student.violationCount} violation{student.violationCount !== 1 ? 's' : ''}
          </span>
        </div>
        {student.status === 'under_review' && (
          <span className="text-amber-400 text-xs font-bold">REVIEW</span>
        )}
      </div>

      {/* Status + Force Submit */}
      <div className="flex items-center justify-between">
        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium capitalize', {
          'text-emerald-400 bg-emerald-500/10': student.status === 'active',
          'text-amber-400 bg-amber-500/10': student.status === 'under_review',
          'text-red-400 bg-red-500/10': student.status === 'disqualified',
          'text-indigo-400 bg-indigo-500/10': student.status === 'submitted',
          'text-white/40 bg-white/5': student.status === 'pending',
        })}>
          {student.status}
        </span>
        {student.status === 'active' && (
          <button
            onClick={(e) => { e.stopPropagation(); onForceSubmit(); }}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-red-400 transition-colors"
            title="Force Submit"
          >
            <Send size={12} /> Submit
          </button>
        )}
      </div>
    </motion.div>
  );
}
