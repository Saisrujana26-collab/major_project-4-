import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ViolationLog {
  id: string;
  studentName: string;
  rollNo: string;
  systemNo: number;
  violationType: string;
  timestamp: string;
  newScore?: number;
}

const VIOLATION_ICONS: Record<string, string> = {
  TAB_SWITCH: '🔀',
  WINDOW_BLUR: '👁️',
  COPY_ATTEMPT: '📋',
  CUT_ATTEMPT: '✂️',
  PASTE_ATTEMPT: '📌',
  RIGHT_CLICK: '🖱️',
  DEVTOOLS_OPEN: '🔧',
  SCREENSHOT_ATTEMPT: '📸',
  MULTI_TAB: '🪟',
  FULLSCREEN_EXIT: '⛶',
  VIEW_SOURCE: '👁️',
  KEYBOARD_SHORTCUT: '⌨️',
  TEXT_SELECTION: '✍️',
};

export default function ViolationFeed({ violations }: { violations: ViolationLog[] }) {
  if (violations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white/20 p-6 gap-3">
        <Shield className="w-10 h-10 opacity-30" />
        <p className="text-sm">No violations detected</p>
        <p className="text-xs text-center">All students are following exam rules</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <AnimatePresence initial={false}>
        {violations.map((v) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, x: 20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="violation-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">
                    {VIOLATION_ICONS[v.violationType] || '⚠️'}
                  </span>
                  <div>
                    <p className="font-semibold text-white text-xs">
                      Sys {v.systemNo} — {v.studentName}
                    </p>
                    <p className="text-red-300/80 text-xs mt-0.5">
                      {v.violationType.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                <AlertTriangle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
              </div>
              <p className="text-white/30 text-xs mt-1.5">
                {formatDistanceToNow(new Date(v.timestamp), { addSuffix: true })}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
