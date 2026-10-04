import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateExamModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration: 3600,
    violationThreshold: 3,
    pointDeductionPerViolation: 5,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/exam', form);
      toast.success('Exam created!');
      onCreated();
    } catch {
      toast.error('Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center">
              <BookOpen size={16} className="text-indigo-400" />
            </div>
            <h2 className="font-bold text-lg">Create New Exam</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Exam Title *</label>
            <input
              className="input"
              placeholder="e.g. Computer Networks Mid-Term"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Description</label>
            <textarea
              className="input resize-none h-20"
              placeholder="Optional description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Duration (minutes)</label>
              <input
                type="number"
                className="input"
                value={form.duration / 60}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) * 60 })}
                min={10} max={180}
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Violation Threshold</label>
              <input
                type="number"
                className="input"
                value={form.violationThreshold}
                onChange={(e) => setForm({ ...form, violationThreshold: Number(e.target.value) })}
                min={1} max={10}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Points deducted per violation</label>
            <input
              type="number"
              className="input"
              value={form.pointDeductionPerViolation}
              onChange={(e) => setForm({ ...form, pointDeductionPerViolation: Number(e.target.value) })}
              min={0} max={50}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
