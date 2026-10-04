import { clsx } from 'clsx';

type Level = 'easy' | 'medium' | 'hard';

const CONFIG: Record<Level, { label: string; className: string; icon: string }> = {
  easy: { label: 'Easy', className: 'badge-easy', icon: '●' },
  medium: { label: 'Medium', className: 'badge-medium', icon: '◆' },
  hard: { label: 'Hard', className: 'badge-hard', icon: '▲' },
};

export default function DifficultyBadge({ level, size = 'sm' }: { level: Level; size?: 'sm' | 'lg' }) {
  const { label, className, icon } = CONFIG[level];
  return (
    <span className={clsx(className, size === 'lg' && 'text-sm px-4 py-1.5')}>
      {icon} {label}
    </span>
  );
}
