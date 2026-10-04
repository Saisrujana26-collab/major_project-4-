import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import DifficultyBadge from '../../components/ui/DifficultyBadge';

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

const getQId = (q: Question) => q._id || q.id || '';

export default function ExamSetup() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<{ title: string; status: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQ, setNewQ] = useState({
    text: '', options: ['', '', '', ''], correctOption: 0,
    difficulty: 'easy' as 'easy' | 'medium' | 'hard', topic: '',
  });

  useEffect(() => {
    if (!examId) return;
    api.get(`/exam/${examId}`).then((r) => setExam(r.data));
    api.get(`/questions/${examId}`).then((r) => setQuestions(r.data));
  }, [examId]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/questions', { ...newQ, examId });
      setQuestions((prev) => [...prev, res.data]);
      setNewQ({ text: '', options: ['', '', '', ''], correctOption: 0, difficulty: 'easy', topic: '' });
      setShowAddForm(false);
      toast.success('Question added');
    } catch { toast.error('Failed to add question'); }
  };

  const handleDelete = async (qid: string) => {
    await api.delete(`/questions/${qid}`);
    setQuestions((prev) => prev.filter((q) => getQId(q) !== qid));
    toast.success('Question deleted');
  };

  const byDifficulty = (level: 'easy' | 'medium' | 'hard') =>
    questions.filter((q) => q.difficulty === level);

  return (
    <div className="min-h-screen p-6">
      <button onClick={() => navigate('/teacher')} className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{exam?.title || 'Loading...'}</h1>
            <p className="text-white/40 mt-1">{questions.length} questions total</p>
          </div>
          <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Question
          </button>
        </div>

        {(['easy', 'medium', 'hard'] as const).map((level) => (
          <div key={level} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <DifficultyBadge level={level} size="lg" />
              <span className="text-white/40 text-sm">{byDifficulty(level).length} questions</span>
            </div>
            <div className="space-y-3">
              {byDifficulty(level).map((q, i) => (
                <motion.div key={getQId(q) || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm mb-3">
                        <span className="text-white/30 mr-2">{i + 1}.</span>{q.text}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`text-xs px-3 py-2 rounded-lg ${
                            oi === q.correctOption
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-white/5 text-white/50'
                          }`}>
                            {['A', 'B', 'C', 'D'][oi]}. {opt}
                          </div>
                        ))}
                      </div>
                      <p className="text-white/30 text-xs mt-2">Topic: {q.topic} · {q.points} pts</p>
                    </div>
                    <button
                      onClick={() => handleDelete(getQId(q))}
                      className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
              {byDifficulty(level).length === 0 && (
                <div className="card text-center py-6 text-white/20 text-sm">No {level} questions yet</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowAddForm(false)}
        >
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-400" /> Add Question
              </h2>
              <button onClick={() => setShowAddForm(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Question Text *</label>
                <textarea className="input resize-none h-24" value={newQ.text}
                  onChange={(e) => setNewQ({ ...newQ, text: e.target.value })} required />
              </div>

              {newQ.options.map((opt, i) => (
                <div key={i}>
                  <label className="text-xs text-white/50 mb-1 block flex items-center gap-2">
                    Option {['A', 'B', 'C', 'D'][i]}
                    {i === newQ.correctOption && <span className="text-emerald-400 text-xs">✓ Correct</span>}
                  </label>
                  <div className="flex gap-2">
                    <input className="input flex-1" value={opt}
                      onChange={(e) => {
                        const opts = [...newQ.options];
                        opts[i] = e.target.value;
                        setNewQ({ ...newQ, options: opts });
                      }}
                      required />
                    <button
                      type="button"
                      onClick={() => setNewQ({ ...newQ, correctOption: i })}
                      className={`px-3 rounded-lg border text-xs font-semibold transition-all ${
                        i === newQ.correctOption
                          ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-400'
                          : 'border-white/10 text-white/30 hover:border-white/20'
                      }`}
                    >
                      Correct
                    </button>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Difficulty</label>
                  <select className="input" value={newQ.difficulty}
                    onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}>
                    <option value="easy">Easy (10 pts)</option>
                    <option value="medium">Medium (20 pts)</option>
                    <option value="hard">Hard (30 pts)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Topic</label>
                  <input className="input" value={newQ.topic}
                    onChange={(e) => setNewQ({ ...newQ, topic: e.target.value })
                    } placeholder="e.g. Networking" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add Question</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
