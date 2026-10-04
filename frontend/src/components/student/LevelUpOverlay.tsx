import { motion } from 'framer-motion';
import ReactConfetti from 'react-confetti';

interface Props {
  from: 'easy' | 'medium' | 'hard';
  to: 'easy' | 'medium' | 'hard';
}

const LEVEL_CONFIG = {
  easy: { label: 'Easy', color: 'text-emerald-400', emoji: '🟢' },
  medium: { label: 'Medium', color: 'text-amber-400', emoji: '🟡' },
  hard: { label: 'Hard', color: 'text-red-400', emoji: '🔴' },
};

export default function LevelUpOverlay({ from, to }: Props) {
  const isLevelUp = (to === 'medium' && from === 'easy') || (to === 'hard' && from === 'medium');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center pointer-events-none"
    >
      {isLevelUp && <ReactConfetti recycle={false} numberOfPieces={200} gravity={0.3} />}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="text-center"
      >
        <div className="text-8xl mb-4">{isLevelUp ? '⬆️' : '⬇️'}</div>
        <h2 className="text-4xl font-bold text-white mb-2">
          {isLevelUp ? 'Level Up!' : 'Dropping Down'}
        </h2>
        <div className="flex items-center justify-center gap-4 text-2xl mt-4">
          <span className={LEVEL_CONFIG[from].color}>{LEVEL_CONFIG[from].emoji} {LEVEL_CONFIG[from].label}</span>
          <span className="text-white/40">→</span>
          <span className={LEVEL_CONFIG[to].color}>{LEVEL_CONFIG[to].emoji} {LEVEL_CONFIG[to].label}</span>
        </div>
        {isLevelUp && (
          <p className="text-white/60 mt-3">Keep going! More points ahead.</p>
        )}
      </motion.div>
    </motion.div>
  );
}
