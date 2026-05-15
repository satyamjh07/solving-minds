'use client';

import React, { useState, useEffect, useRef, memo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Loader2, Eye } from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';

// ── KaTeX helpers (module-level, never recreated) ──────────────────────────
const renderMath = (el: HTMLElement | null) => {
  if (!el || !(window as any).renderMathInElement) return;
  (window as any).renderMathInElement(el, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
  });
};

const formatText = (t: string) =>
  (t || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

// ── Rendered text block (memo so KaTeX doesn't re-run unnecessarily) ───────
const MathText = memo(function MathText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) renderMath(ref.current); }, [text]);
  return (
    <div ref={ref} className={className}
      dangerouslySetInnerHTML={{ __html: formatText(text) }} />
  );
});

// ── Main component ──────────────────────────────────────────────────────────
export default function QuestionsTab() {
  const [loading, setLoading] = useState(false);
  const { toast } = useDialog();

  const [formData, setFormData] = useState({
    subject: '',
    chapter: '',
    topic: '',
    difficulty: '',
    type: 'mcq',
    year: '',
    shift: '',
    text: '',
    qImageFile: null as File | null,
    qImageUrl: '',
    opt1: '', opt2: '', opt3: '', opt4: '',
    answer: '',
    explanation: '',
    expImageFile: null as File | null,
    expImageUrl: '',
  });

  const [imgTab, setImgTab] = useState<'file' | 'url'>('file');
  const [expTab, setExpTab] = useState<'file' | 'url'>('file');

  // Local preview image from file picker
  const [qImagePreview, setQImagePreview] = useState('');
  const [expImagePreview, setExpImagePreview] = useState('');

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      if (name === 'qImageFile') setQImagePreview(URL.createObjectURL(files[0]));
      if (name === 'expImageFile') setExpImagePreview(URL.createObjectURL(files[0]));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.text || !formData.answer) {
      toast('Please fill out required fields (Subject, Question Text, Answer)', 'warning');
      return;
    }
    setLoading(true);
    try {
      let finalQImgUrl = formData.qImageUrl;
      if (imgTab === 'file' && formData.qImageFile) finalQImgUrl = await uploadToCloudinary(formData.qImageFile);

      let finalExpImgUrl = formData.expImageUrl;
      if (expTab === 'file' && formData.expImageFile) finalExpImgUrl = await uploadToCloudinary(formData.expImageFile);

      let optionsArray = null;
      if (formData.type === 'mcq') {
        const opts = [formData.opt1, formData.opt2, formData.opt3, formData.opt4].filter(Boolean);
        optionsArray = opts.map(t => ({ text: t }));
      }

      const payload = {
        question_text: formData.text,
        question_image_url: finalQImgUrl || null,
        correct_answer: formData.answer,
        explanation: formData.explanation || null,
        explanation_image_url: finalExpImgUrl || null,
        subject: formData.subject,
        chapter: formData.chapter || null,
        topic: formData.topic || null,
        difficulty: formData.difficulty || null,
        type: formData.type,
        year: formData.year ? parseInt(formData.year) : null,
        shift: formData.shift || null,
        options: optionsArray,
        exam_type: 'pyq',
      };

      const { error } = await supabase.from('questions').insert([payload]);
      if (error) throw error;

      toast('Question uploaded successfully!', 'success');
      setFormData(prev => ({
        ...prev,
        text: '', qImageFile: null, qImageUrl: '',
        opt1: '', opt2: '', opt3: '', opt4: '',
        answer: '', explanation: '', expImageFile: null, expImageUrl: '',
      }));
      setQImagePreview('');
      setExpImagePreview('');
    } catch (err: any) {
      console.error(err);
      toast('Failed to upload question: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Determine preview image for question
  const qImgSrc = qImagePreview || formData.qImageUrl;
  const expImgSrc = expImagePreview || formData.expImageUrl;
  const options = [formData.opt1, formData.opt2, formData.opt3, formData.opt4];
  const correctIdx = formData.type === 'mcq' ? parseInt(formData.answer) - 1 : -1;
  const hasContent = !!(formData.text || formData.opt1 || formData.explanation);

  return (
    <div className="space-y-8">
      <form className="grid grid-cols-1 lg:grid-cols-3 gap-6" onSubmit={handleSubmit}>

        {/* LEFT — Classification */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="font-bold text-[var(--text)] mb-2 uppercase tracking-widest text-sm border-b border-[var(--border)] pb-2">
            1. Classification
          </h3>

          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">
              Subject <span className="text-[var(--accent)]">*</span>
            </label>
            <select name="subject" value={formData.subject} onChange={handleChange} required
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm">
              <option value="">Select subject</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="mathematics">Mathematics</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Chapter</label>
            <input type="text" name="chapter" value={formData.chapter} onChange={handleChange}
              placeholder="e.g. Kinematics"
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Topic</label>
            <input type="text" name="topic" value={formData.topic} onChange={handleChange}
              placeholder="e.g. Projectile Motion"
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Question Type</label>
            <select name="type" value={formData.type} onChange={handleChange}
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm">
              <option value="mcq">Multiple Choice (MCQ)</option>
              <option value="integer">Numerical / Integer</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Difficulty</label>
              <select name="difficulty" value={formData.difficulty} onChange={handleChange}
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm">
                <option value="">Any</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Year</label>
              <input type="number" name="year" value={formData.year} onChange={handleChange}
                placeholder="e.g. 2024"
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Shift</label>
            <input type="text" name="shift" value={formData.shift} onChange={handleChange}
              placeholder="e.g. 27 Jan Shift 1"
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm" />
          </div>
        </div>

        {/* MIDDLE — Problem Statement */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="font-bold text-[var(--text)] mb-2 uppercase tracking-widest text-sm border-b border-[var(--border)] pb-2">
            2. Problem Statement
          </h3>

          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">
              Question Text <span className="text-[var(--accent)]">*</span>
            </label>
            <textarea name="text" value={formData.text} onChange={handleChange} rows={4}
              placeholder="Type question here. Supports LaTeX: $E=mc^2$ or $$\frac{a}{b}$$"
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] font-mono outline-none focus:border-[var(--accent)] text-sm resize-y"
              required />
          </div>

          <div>
            <label className="flex justify-between items-center text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">
              Diagram / Image
              <div className="flex gap-1">
                <button type="button" onClick={() => setImgTab('file')}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${imgTab === 'file' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg3)] text-[var(--text2)]'}`}>FILE</button>
                <button type="button" onClick={() => setImgTab('url')}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${imgTab === 'url' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg3)] text-[var(--text2)]'}`}>URL</button>
              </div>
            </label>
            {imgTab === 'file'
              ? <input type="file" name="qImageFile" onChange={handleChange} accept="image/*" className="text-sm w-full" />
              : <input type="url" name="qImageUrl" value={formData.qImageUrl} onChange={handleChange} placeholder="https://..."
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]" />}
          </div>

          {formData.type === 'mcq' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-2">
                Options (MCQ) — LaTeX supported
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(['opt1','opt2','opt3','opt4'] as const).map((k, i) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded bg-[var(--bg3)] border border-[var(--border)] text-[10px] font-bold text-[var(--text2)] flex-shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <input type="text" name={k} value={formData[k]} onChange={handleChange}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--accent)] font-mono" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">
              Correct Answer <span className="text-[var(--accent)]">*</span>
            </label>
            <input type="text" name="answer" value={formData.answer} onChange={handleChange}
              placeholder={formData.type === 'mcq' ? 'Option number: 1, 2, 3 or 4' : 'Numerical value e.g. 42'}
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]"
              required />
            {formData.type === 'mcq' && (
              <p className="text-[10px] text-[var(--text2)] mt-1">Enter 1 for Option A, 2 for Option B, etc.</p>
            )}
          </div>
        </div>

        {/* RIGHT — Explanation */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-[var(--text)] mb-2 uppercase tracking-widest text-sm border-b border-[var(--border)] pb-2">
              3. Explanation
            </h3>

            <div>
              <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Solution Text</label>
              <textarea name="explanation" value={formData.explanation} onChange={handleChange} rows={6}
                placeholder="Solution text. Supports LaTeX: $\vec{F}=m\vec{a}$"
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] font-mono outline-none focus:border-[var(--accent)] text-sm resize-y" />
            </div>

            <div>
              <label className="flex justify-between items-center text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">
                Explanation Image
                <div className="flex gap-1">
                  <button type="button" onClick={() => setExpTab('file')}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${expTab === 'file' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg3)] text-[var(--text2)]'}`}>FILE</button>
                  <button type="button" onClick={() => setExpTab('url')}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${expTab === 'url' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg3)] text-[var(--text2)]'}`}>URL</button>
                </div>
              </label>
              {expTab === 'file'
                ? <input type="file" name="expImageFile" onChange={handleChange} accept="image/*" className="text-sm w-full" />
                : <input type="url" name="expImageUrl" value={formData.expImageUrl} onChange={handleChange} placeholder="https://..."
                    className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]" />}
            </div>
          </div>

          <div className="mt-8">
            <button type="submit" disabled={loading}
              className="w-full bg-[var(--accent)] text-black font-bold py-4 px-8 rounded-xl hover:brightness-110 flex items-center justify-center transition-all disabled:opacity-50">
              {loading ? <Loader2 size={20} className="animate-spin mr-2" /> : 'UPLOAD QUESTION'}
            </button>
          </div>
        </div>
      </form>

      {/* ── LIVE PREVIEW ───────────────────────────────────────────────────── */}
      <div className="border border-[var(--border)] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-3 bg-[var(--bg3)] border-b border-[var(--border)]">
          <Eye size={14} className="text-[var(--accent)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Live Preview</span>
          <span className="ml-auto text-[9px] text-[var(--text2)] font-mono">Auto-updates as you type · KaTeX rendered</span>
        </div>

        {!hasContent ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6 bg-[var(--card)]">
            <div className="text-4xl mb-4 opacity-20">👁</div>
            <p className="text-[var(--text2)] text-xs font-mono uppercase tracking-widest">
              Start typing in the form above to see the rendered preview here
            </p>
          </div>
        ) : (
          <div className="bg-[var(--card)] p-6 lg:p-8">

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              {formData.chapter && (
                <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 4, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                  {formData.chapter}
                </span>
              )}
              {formData.difficulty && (
                <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 4,
                  background: formData.difficulty === 'hard' ? 'rgba(231,76,60,0.05)' : formData.difficulty === 'medium' ? 'rgba(243,156,18,0.05)' : 'rgba(39,174,96,0.05)',
                  border: `1px solid ${formData.difficulty === 'hard' ? 'var(--red)' : formData.difficulty === 'medium' ? 'var(--orange)' : 'var(--green)'}`,
                  color: formData.difficulty === 'hard' ? 'var(--red)' : formData.difficulty === 'medium' ? 'var(--orange)' : 'var(--green)' }}>
                  {formData.difficulty}
                </span>
              )}
              <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 4, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                {formData.type === 'integer' ? 'Numerical' : 'MCQ'}
              </span>
              {formData.year && (
                <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 4, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                  {formData.year}{formData.shift ? ` · ${formData.shift}` : ''}
                </span>
              )}
              <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 4, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: 'var(--accent)' }}>
                PREVIEW
              </span>
            </div>

            {/* Question text */}
            {formData.text && (
              <MathText
                text={formData.text}
                className="text-[var(--text)] text-[0.95rem] leading-relaxed font-medium mb-5"
              />
            )}

            {/* Question image */}
            {qImgSrc && (
              <img src={qImgSrc} alt="Question" className="max-h-64 w-auto rounded-xl border border-[var(--border)] mb-5 bg-[var(--bg)]" />
            )}

            {/* Options (MCQ) */}
            {formData.type === 'mcq' && options.some(Boolean) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {options.map((opt, i) => {
                  const isCorrect = i === correctIdx;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border transition-all"
                      style={{
                        background: isCorrect ? 'rgba(39,174,96,0.05)' : 'var(--bg3)',
                        borderColor: isCorrect ? 'var(--green)' : 'var(--border)',
                      }}>
                      <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[11px] font-bold border"
                        style={{
                          background: isCorrect ? 'var(--green)' : 'var(--bg)',
                          borderColor: isCorrect ? 'var(--green)' : 'var(--border)',
                          color: isCorrect ? 'white' : 'var(--text2)',
                        }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <div className="flex-1 min-w-0">
                        {opt
                          ? <MathText text={opt} className="text-sm text-[var(--text)]" />
                          : <span className="text-xs text-[var(--text2)] italic">Option {i + 1} empty</span>}
                        {isCorrect && (
                          <div className="text-[9px] font-bold text-[var(--green)] uppercase tracking-widest mt-1">✓ Correct Answer</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Numerical answer */}
            {formData.type === 'integer' && formData.answer && (
              <div className="flex items-center gap-3 mb-6 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg3)] w-fit">
                <span className="text-xs font-bold text-[var(--text2)] uppercase tracking-widest">Answer:</span>
                <span className="font-mono text-lg font-bold text-[var(--green)]">{formData.answer}</span>
              </div>
            )}

            {/* Explanation */}
            {formData.explanation && (
              <div className="border border-[rgba(39,174,96,0.15)] rounded-xl p-5 bg-[rgba(39,174,96,0.03)]">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--green)' }}>
                    ⚡ Solution
                  </span>
                </div>
                <MathText text={formData.explanation} className="text-sm text-[var(--text)] leading-relaxed" />
                {expImgSrc && (
                  <img src={expImgSrc} alt="Explanation" className="mt-4 max-h-64 w-auto rounded-xl border border-[var(--border)]" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
