import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  examStatus: string;
  onControl: (action: string) => void;
}

export default function ExamControls({ examStatus, onControl }: Props) {
  return (
    <div className="flex items-center gap-2">
      {examStatus === 'draft' || examStatus === 'none' ? (
        <button
          onClick={() => onControl('start')}
          disabled={examStatus === 'none'}
          className="flex items-center gap-2 bg-emerald-600/80 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
        >
          <Play size={14} /> Start Exam
        </button>
      ) : examStatus === 'active' ? (
        <>
          <button
            onClick={() => onControl('pause')}
            className="flex items-center gap-2 bg-amber-600/80 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <Pause size={14} /> Pause
          </button>
          <button
            onClick={() => { if (confirm('Stop exam for ALL students?')) onControl('stop'); }}
            className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <Square size={14} /> Stop
          </button>
        </>
      ) : examStatus === 'paused' ? (
        <button
          onClick={() => onControl('resume')}
          className="flex items-center gap-2 bg-emerald-600/80 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          <RotateCcw size={14} /> Resume
        </button>
      ) : null}
    </div>
  );
}
