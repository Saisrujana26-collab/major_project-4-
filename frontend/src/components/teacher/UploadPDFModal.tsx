import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface Props { examId: string; onClose: () => void; }

export default function UploadPDFModal({ examId, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [questionsPerDifficulty, setQuestionsPerDifficulty] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ questionsGenerated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') setFile(dropped);
    else toast.error('Only PDF files are accepted');
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Select a PDF file first'); return; }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('examId', examId);
    formData.append('questionsPerDifficulty', String(questionsPerDifficulty));

    try {
      const res = await api.post('/upload/pdf/sync', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResult({ questionsGenerated: res.data.questionsGenerated });
      toast.success(`✅ Generated ${res.data.questionsGenerated} questions!`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (err as { message?: string })?.message
        || 'Upload failed';
      setError(msg);
      toast.error(msg);
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
            <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Upload size={16} className="text-purple-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Upload PDF</h2>
              <p className="text-white/40 text-xs">Auto-generates Easy / Medium / Hard questions</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
        </div>

        {result ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Questions Generated!</h3>
            <p className="text-white/60 mb-1">{result.questionsGenerated} questions added</p>
            <div className="grid grid-cols-3 gap-2 mt-4 mb-6">
              {(['Easy', 'Medium', 'Hard'] as const).map((lvl) => (
                <div key={lvl} className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white font-bold">{questionsPerDifficulty}</p>
                  <p className="text-white/40 text-xs">{lvl}</p>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragOver ? 'border-purple-400 bg-purple-500/15' :
                file ? 'border-indigo-500/60 bg-indigo-500/10' :
                'border-white/20 hover:border-white/30 hover:bg-white/5'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-white font-medium text-sm truncate max-w-[220px]">{file.name}</p>
                    <p className="text-white/40 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-red-400/70 hover:text-red-400 text-xs mt-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-white/50 text-sm">Click or drag & drop PDF here</p>
                  <p className="text-white/30 text-xs mt-1">Max 20MB · Textbook chapters, question banks</p>
                </>
              )}
              <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setError(null); }} />
            </div>

            {/* Questions per difficulty */}
            <div>
              <label className="text-xs text-white/50 mb-2 block flex items-center justify-between">
                <span>Questions per difficulty level</span>
                <span className="text-indigo-400 font-mono">{questionsPerDifficulty * 3} total</span>
              </label>
              <input type="range" min={2} max={15} value={questionsPerDifficulty}
                onChange={(e) => setQuestionsPerDifficulty(Number(e.target.value))}
                className="w-full accent-indigo-500" />
              <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
                {[
                  { label: 'Easy', color: 'text-emerald-400', pts: '10 pts' },
                  { label: 'Medium', color: 'text-amber-400', pts: '20 pts' },
                  { label: 'Hard', color: 'text-red-400', pts: '30 pts' },
                ].map(({ label, color, pts }) => (
                  <div key={label} className="bg-white/5 rounded-lg py-2">
                    <p className={`font-bold ${color}`}>{questionsPerDifficulty}</p>
                    <p className="text-white/50">{label}</p>
                    <p className="text-white/30 text-xs">{pts}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Info note */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-300/80">
              💡 Questions are auto-classified by difficulty. Add your OpenAI key in <code className="font-mono">.env</code> for AI-powered generation, or the system uses smart rule-based extraction.
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-xs text-red-300">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
                <p className="text-white/60 text-sm">Parsing PDF and generating questions...</p>
                <p className="text-white/30 text-xs mt-1">This may take up to 30 seconds</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>Cancel</button>
              <button
                onClick={handleUpload}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={loading || !file}
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Generating...</>
                ) : (
                  <><Upload size={15} /> Generate Questions</>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
