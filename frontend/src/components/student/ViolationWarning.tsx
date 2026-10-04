import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface Props {
  type: string;
  count: number;
}

export default function ViolationWarning({ type, count }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -60 }}
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="bg-red-900/90 border-2 border-red-500/60 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-2xl shadow-red-900/50 backdrop-blur-sm">
        <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
        <div>
          <p className="font-bold text-white text-base">⚠️ Violation Detected</p>
          <p className="text-red-300 text-sm capitalize">{type}</p>
          <p className="text-red-400/70 text-xs mt-0.5">Total: {count} violation{count !== 1 ? 's' : ''} · Points deducted</p>
        </div>
      </div>
    </motion.div>
  );
}
