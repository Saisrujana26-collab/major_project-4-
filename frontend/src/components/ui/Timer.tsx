import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Clock } from 'lucide-react';

interface TimerProps {
  seconds: number;
  onExpire?: () => void;
  className?: string;
}

export default function Timer({ seconds, onExpire, className }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const interval = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(interval);
  }, [remaining, onExpire]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const isUrgent = remaining < 300; // last 5 min
  const isCritical = remaining < 60;

  return (
    <div className={clsx(
      'flex items-center gap-2 font-mono font-bold text-xl px-4 py-2 rounded-xl border transition-all',
      isCritical ? 'text-red-400 border-red-500/50 bg-red-500/10 animate-pulse' :
      isUrgent ? 'text-amber-400 border-amber-500/50 bg-amber-500/10' :
      'text-indigo-300 border-indigo-500/30 bg-indigo-500/10',
      className
    )}>
      <Clock size={18} className={isCritical ? 'animate-spin' : ''} />
      {h > 0 && <span>{String(h).padStart(2, '0')}:</span>}
      <span>{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
    </div>
  );
}
