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

const formatText = (text: string) => {
  if (!text) return '';
  let clean = text;

  // Global fixes for common legacy KaTeX syntax errors (matching 1 or more backslashes)
  clean = clean.replace(/\\+text(?=\{)/g, '\\text');

  // Split by math delimiters to safely replace text formatting outside math
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  const parts = clean.split(mathRegex);

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Outside math
      let p = parts[i];
      p = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      p = p.replace(/\\+textbf\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<strong>$1</strong>');
      p = p.replace(/\\+textit\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<em>$1</em>');
      // Replace literal \\ with <br/>
      p = p.replace(/\\\\/g, '<br/>');
      // Replace Markdown image syntax: ![alt](url)
      p = p.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="q-inline-img" />');
      // Normal newlines
      p = p.replace(/\n/g, '<br/>');
      parts[i] = p;
    }
  }

  return parts.join('');
};

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
    opt1ImageFile: null as File | null, opt1ImageUrl: '',
    opt2ImageFile: null as File | null, opt2ImageUrl: '',
    opt3ImageFile: null as File | null, opt3ImageUrl: '',
    opt4ImageFile: null as File | null, opt4ImageUrl: '',
    answer: '',
    explanation: '',
    expImageFile: null as File | null,
    expImageUrl: '',
    exam_type: 'jee-main',
    booklet_id: '',
  });

  const [imgTab, setImgTab] = useState<'file' | 'url'>('file');
  const [expTab, setExpTab] = useState<'file' | 'url'>('file');

  const [opt1Tab, setOpt1Tab] = useState<'file' | 'url'>('file');
  const [opt2Tab, setOpt2Tab] = useState<'file' | 'url'>('file');
  const [opt3Tab, setOpt3Tab] = useState<'file' | 'url'>('file');
  const [opt4Tab, setOpt4Tab] = useState<'file' | 'url'>('file');

  // Local preview image from file picker
  const [qImagePreview, setQImagePreview] = useState('');
  const [expImagePreview, setExpImagePreview] = useState('');
  const [opt1ImagePreview, setOpt1ImagePreview] = useState('');
  const [opt2ImagePreview, setOpt2ImagePreview] = useState('');
  const [opt3ImagePreview, setOpt3ImagePreview] = useState('');
  const [opt4ImagePreview, setOpt4ImagePreview] = useState('');

  // Inline reaction/diagram uploader states and refs
  const qTextareaRef = useRef<HTMLTextAreaElement>(null);
  const expTextareaRef = useRef<HTMLTextAreaElement>(null);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);
  const expInlineFileInputRef = useRef<HTMLInputElement>(null);
  const [inlineUploading, setInlineUploading] = useState(false);
  const [expInlineUploading, setExpInlineUploading] = useState(false);

  const handleInlineUpload = async (file: File, isExplanation = false) => {
    const isExp = isExplanation;
    const setUploading = isExp ? setExpInlineUploading : setInlineUploading;
    const textarea = isExp ? expTextareaRef.current : qTextareaRef.current;
    const fileInput = isExp ? expInlineFileInputRef.current : inlineFileInputRef.current;
    const fieldKey = isExp ? 'explanation' : 'text';

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      if (!url) throw new Error('Cloudinary did not return a URL');

      if (textarea) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const currentVal = (formData as any)[fieldKey] || '';
        const insertText = `\n![image](${url})\n`;
        const newVal = currentVal.substring(0, start) + insertText + currentVal.substring(end);
        
        setFormData(prev => ({ ...prev, [fieldKey]: newVal }));
        
        // Reset file input
        if (fileInput) fileInput.value = '';
        
        toast('Image uploaded and inserted successfully!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      toast('Inline upload failed: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const [bookletsList, setBookletsList] = useState<any[]>([]);
  const [mocksList, setMocksList] = useState<any[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  useEffect(() => {
    async function fetchTargets() {
      setLoadingTargets(true);
      try {
        const { data, error } = await supabase.from('booklets').select('id, title, tags');
        if (error) throw error;
        
        const booklets = (data || []).filter(b => {
          const tags = b.tags || [];
          return tags.includes('booklet') || (!tags.includes('mock-test') && !tags.includes('mock'));
        });
        
        const mocks = (data || []).filter(b => {
          const tags = b.tags || [];
          return tags.includes('mock-test') || tags.includes('mock');
        });

        setBookletsList(booklets);
        setMocksList(mocks);
      } catch (err: any) {
        console.error('Error fetching booklet/mock targets:', err);
      } finally {
        setLoadingTargets(false);
      }
    }
    fetchTargets();
  }, []);

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      if (name === 'qImageFile') setQImagePreview(URL.createObjectURL(files[0]));
      if (name === 'expImageFile') setExpImagePreview(URL.createObjectURL(files[0]));
      if (name === 'opt1ImageFile') setOpt1ImagePreview(URL.createObjectURL(files[0]));
      if (name === 'opt2ImageFile') setOpt2ImagePreview(URL.createObjectURL(files[0]));
      if (name === 'opt3ImageFile') setOpt3ImagePreview(URL.createObjectURL(files[0]));
      if (name === 'opt4ImageFile') setOpt4ImagePreview(URL.createObjectURL(files[0]));
    } else {
      if (name === 'type') {
        setFormData(prev => ({ ...prev, [name]: value, answer: '' }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
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
      if (formData.type === 'mcq' || formData.type === 'multi-select') {
        let finalOpt1ImgUrl = formData.opt1ImageUrl;
        if (opt1Tab === 'file' && formData.opt1ImageFile) finalOpt1ImgUrl = await uploadToCloudinary(formData.opt1ImageFile);

        let finalOpt2ImgUrl = formData.opt2ImageUrl;
        if (opt2Tab === 'file' && formData.opt2ImageFile) finalOpt2ImgUrl = await uploadToCloudinary(formData.opt2ImageFile);

        let finalOpt3ImgUrl = formData.opt3ImageUrl;
        if (opt3Tab === 'file' && formData.opt3ImageFile) finalOpt3ImgUrl = await uploadToCloudinary(formData.opt3ImageFile);

        let finalOpt4ImgUrl = formData.opt4ImageUrl;
        if (opt4Tab === 'file' && formData.opt4ImageFile) finalOpt4ImgUrl = await uploadToCloudinary(formData.opt4ImageFile);

        optionsArray = [
          { text: formData.opt1, image: finalOpt1ImgUrl || null },
          { text: formData.opt2, image: finalOpt2ImgUrl || null },
          { text: formData.opt3, image: finalOpt3ImgUrl || null },
          { text: formData.opt4, image: finalOpt4ImgUrl || null },
        ].filter(o => o.text || o.image);
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
        exam_type: formData.exam_type,
        booklet_id: (formData.exam_type === 'booklet' || formData.exam_type === 'mock-test') && formData.booklet_id ? formData.booklet_id : null,
      };

      const { error } = await supabase.from('questions').insert([payload]);
      if (error) throw error;

      toast('Question uploaded successfully!', 'success');
      setFormData(prev => ({
        ...prev,
        text: '', qImageFile: null, qImageUrl: '',
        opt1: '', opt2: '', opt3: '', opt4: '',
        opt1ImageFile: null, opt1ImageUrl: '', opt2ImageFile: null, opt2ImageUrl: '',
        opt3ImageFile: null, opt3ImageUrl: '', opt4ImageFile: null, opt4ImageUrl: '',
        answer: '', explanation: '', expImageFile: null, expImageUrl: '',
        booklet_id: '',
      }));
      setQImagePreview('');
      setExpImagePreview('');
      setOpt1ImagePreview(''); setOpt2ImagePreview(''); setOpt3ImagePreview(''); setOpt4ImagePreview('');
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
  const liveOptions = [
    { text: formData.opt1, image: opt1ImagePreview || formData.opt1ImageUrl },
    { text: formData.opt2, image: opt2ImagePreview || formData.opt2ImageUrl },
    { text: formData.opt3, image: opt3ImagePreview || formData.opt3ImageUrl },
    { text: formData.opt4, image: opt4ImagePreview || formData.opt4ImageUrl },
  ];
  const correctIdx = formData.type === 'mcq' ? parseInt(formData.answer) - 1 : -1;
  const correctIdxs = formData.type === 'multi-select'
    ? (formData.answer ? formData.answer.split(',').filter(Boolean).map(s => parseInt(s.trim())) : [])
    : [];
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
              Exam Type <span className="text-[var(--accent)]">*</span>
            </label>
            <select name="exam_type" value={formData.exam_type} onChange={handleChange} required
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm">
              <option value="jee-main">JEE Main</option>
              <option value="jee-advanced">JEE Advanced</option>
              <option value="neet">NEET UG</option>
              <option value="bitsat">BITSAT</option>
              <option value="mht-cet">MHT CET</option>
              <option value="iat">IAT</option>
              <option value="viteee">VITEEE</option>
              <option value="wbjee">WBJEE</option>
              <option value="booklet">Booklets</option>
              <option value="mock-test">Mock Tests</option>
            </select>
          </div>

          {formData.exam_type === 'booklet' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">
                Which Booklet? <span className="text-[var(--accent)]">*</span>
              </label>
              {loadingTargets ? (
                <div className="text-xs text-[var(--text2)] flex items-center gap-1.5 p-2"><Loader2 size={12} className="animate-spin" /> Fetching booklets...</div>
              ) : (
                <select name="booklet_id" value={formData.booklet_id} onChange={handleChange} required
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm">
                  <option value="">Select Booklet</option>
                  {bookletsList.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {formData.exam_type === 'mock-test' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">
                Which Mock Test? <span className="text-[var(--accent)]">*</span>
              </label>
              {loadingTargets ? (
                <div className="text-xs text-[var(--text2)] flex items-center gap-1.5 p-2"><Loader2 size={12} className="animate-spin" /> Fetching mock tests...</div>
              ) : (
                <select name="booklet_id" value={formData.booklet_id} onChange={handleChange} required
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm">
                  <option value="">Select Mock Test</option>
                  {mocksList.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

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
              <option value="multi-select">Multiple Correct (Multi-Select MCQ)</option>
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
            <textarea ref={qTextareaRef} name="text" value={formData.text} onChange={handleChange} rows={4}
              placeholder="Type question here. Supports LaTeX: $E=mc^2$ or $$\frac{a}{b}$$"
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] font-mono outline-none focus:border-[var(--accent)] text-sm resize-y"
              required />
            {/* Inline reaction uploader widget */}
            <div className="mt-2.5 p-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg2)] flex items-center justify-between gap-3 shadow-inner">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
                  🧪 Inline Reaction / Diagram
                </span>
                <span className="text-[9px] text-[var(--text2)] mt-0.5 truncate">
                  Upload &amp; insert at current cursor position
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={inlineFileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleInlineUpload(file, false);
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={inlineUploading}
                  onClick={() => inlineFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text)] transition-all flex items-center gap-1"
                >
                  {inlineUploading ? (
                    <>
                      <Loader2 size={10} className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    'Upload & Insert'
                  )}
                </button>
              </div>
            </div>
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

          {(formData.type === 'mcq' || formData.type === 'multi-select') && (
            <div>
              <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-2">
                Options (MCQ) — LaTeX supported
              </label>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { k: 'opt1', tab: opt1Tab, setTab: setOpt1Tab, imgKey: 'opt1ImageFile', urlKey: 'opt1ImageUrl' },
                  { k: 'opt2', tab: opt2Tab, setTab: setOpt2Tab, imgKey: 'opt2ImageFile', urlKey: 'opt2ImageUrl' },
                  { k: 'opt3', tab: opt3Tab, setTab: setOpt3Tab, imgKey: 'opt3ImageFile', urlKey: 'opt3ImageUrl' },
                  { k: 'opt4', tab: opt4Tab, setTab: setOpt4Tab, imgKey: 'opt4ImageFile', urlKey: 'opt4ImageUrl' },
                ].map(({ k, tab, setTab, imgKey, urlKey }, i) => (
                  <div key={k} className="p-3 bg-[var(--bg3)] border border-[var(--border)] rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center rounded bg-[var(--bg)] border border-[var(--border)]">{String.fromCharCode(65 + i)}</span>
                        Option {String.fromCharCode(65 + i)}
                      </span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setTab('file')}
                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${tab === 'file' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg)] text-[var(--text2)]'}`}>FILE</button>
                        <button type="button" onClick={() => setTab('url')}
                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${tab === 'url' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg)] text-[var(--text2)]'}`}>URL</button>
                      </div>
                    </div>
                    <input type="text" name={k} value={(formData as any)[k]} onChange={handleChange}
                      placeholder={`Option ${i + 1} text (LaTeX OK, blank = image-only)`}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--accent)] font-mono" />
                    {tab === 'file'
                      ? <input type="file" name={imgKey} onChange={handleChange} accept="image/*" className="text-xs w-full" />
                      : <input type="url" name={urlKey} value={(formData as any)[urlKey]} onChange={handleChange} placeholder="Image URL (https://...)"
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--accent)]" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">
              Correct Answer <span className="text-[var(--accent)]">*</span>
            </label>
            {formData.type === 'multi-select' ? (
              <div className="flex flex-col gap-2 p-3 bg-[var(--bg3)] border border-[var(--border)] rounded-lg">
                <div className="flex gap-4">
                  {[0, 1, 2, 3].map((idx) => {
                    const label = String.fromCharCode(65 + idx);
                    const isChecked = formData.answer.split(',').filter(Boolean).map(x => parseInt(x)).includes(idx);
                    return (
                      <label key={idx} className="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let current = formData.answer ? formData.answer.split(',').filter(Boolean).map(x => parseInt(x)) : [];
                            if (e.target.checked) {
                              if (!current.includes(idx)) current.push(idx);
                            } else {
                              current = current.filter(x => x !== idx);
                            }
                            current.sort((a, b) => a - b);
                            setFormData(prev => ({ ...prev, answer: current.join(',') }));
                          }}
                          className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] bg-[var(--bg)]"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                <input type="hidden" name="answer" value={formData.answer} required />
                <p className="text-[10px] text-[var(--text2)]">Selected correct options (0-indexed): <span className="font-mono font-bold text-[var(--accent)]">{formData.answer || 'None'}</span></p>
              </div>
            ) : (
              <>
                <input type="text" name="answer" value={formData.answer} onChange={handleChange}
                  placeholder={formData.type === 'mcq' ? 'Option number: 1, 2, 3 or 4' : 'Numerical value e.g. 42'}
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]"
                  required />
                {formData.type === 'mcq' && (
                  <p className="text-[10px] text-[var(--text2)] mt-1">Enter 1 for Option A, 2 for Option B, etc.</p>
                )}
              </>
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
              <textarea ref={expTextareaRef} name="explanation" value={formData.explanation} onChange={handleChange} rows={6}
                placeholder="Solution text. Supports LaTeX: $\vec{F}=m\vec{a}$"
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] font-mono outline-none focus:border-[var(--accent)] text-sm resize-y" />
              {/* Inline explanation image uploader widget */}
              <div className="mt-2.5 p-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg2)] flex items-center justify-between gap-3 shadow-inner">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-[var(--green)] uppercase tracking-wider">
                    ⚡ Inline Solution Diagram
                  </span>
                  <span className="text-[9px] text-[var(--text2)] mt-0.5 truncate">
                    Upload &amp; insert at current cursor position
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={expInlineFileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleInlineUpload(file, true);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={expInlineUploading}
                    onClick={() => expInlineFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--green)] text-[var(--text)] transition-all flex items-center gap-1"
                  >
                    {expInlineUploading ? (
                      <>
                        <Loader2 size={10} className="animate-spin" /> Uploading...
                      </>
                    ) : (
                      'Upload & Insert'
                    )}
                  </button>
                </div>
              </div>
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
                {formData.type === 'integer' ? 'Numerical' : formData.type === 'multi-select' ? 'Multi-Select MCQ' : 'MCQ'}
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
            {(formData.type === 'mcq' || formData.type === 'multi-select') && liveOptions.some(o => o.text || o.image) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {liveOptions.map((opt, i) => {
                  const isCorrect = formData.type === 'mcq' ? i === correctIdx : correctIdxs.includes(i);
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
                        {opt.text ? <MathText text={opt.text} className="text-sm text-[var(--text)]" /> : null}
                        {opt.image ? <img src={opt.image} alt={`Option ${String.fromCharCode(65 + i)}`} className="mt-2 rounded-xl border border-[var(--border)] max-h-24 w-auto bg-[var(--bg)]" /> : null}
                        {(!opt.text && !opt.image) && <span className="text-xs text-[var(--text2)] italic">Option {i + 1} empty</span>}
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
