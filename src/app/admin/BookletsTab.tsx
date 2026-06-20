'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Trash2, BookOpen, Calendar, Tag, Layers, Eye, X, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Hash, Zap, Award, FileText } from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';

// ── KaTeX helpers ──────────────────────────────────────────────────────────
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
  clean = clean.replace(/\\+text(?=\{)/g, '\\text');
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  const parts = clean.split(mathRegex);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      let p = parts[i];
      p = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      p = p.replace(/\\+textbf\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<strong>$1</strong>');
      p = p.replace(/\\+textit\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<em>$1</em>');
      p = p.replace(/\\\\/g, '<br/>');
      p = p.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="q-inline-img" />');
      p = p.replace(/\n/g, '<br/>');
      parts[i] = p;
    }
  }
  return parts.join('');
};

const MathText = memo(function MathText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) renderMath(ref.current); }, [text]);
  return (
    <div ref={ref} className={className}
      dangerouslySetInnerHTML={{ __html: formatText(text) }} />
  );
});

// ── Types ──────────────────────────────────────────────────────────────────
interface Question {
  id: string;
  subject: string;
  chapter: string;
  topic: string | null;
  difficulty: string | null;
  type: string;
  question_text: string;
  question_image_url: string | null;
  options: { text: string; image?: string }[] | null;
  correct_answer: string;
  explanation: string | null;
  explanation_image_url: string | null;
  marks: number | null;
  tags: string[] | null;
  question_domain: string[] | null;
}

interface SubjectGroup {
  name: string;
  chapters: ChapterGroup[];
  totalQuestions: number;
}

interface ChapterGroup {
  name: string;
  questions: Question[];
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function BookletsTab() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [booklets, setBooklets] = useState<any[]>([]);
  const { confirm, toast } = useDialog();

  // Preview modal state
  const [previewBooklet, setPreviewBooklet] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<SubjectGroup[]>([]);
  const [previewTotalQuestions, setPreviewTotalQuestions] = useState(0);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    target_year: '',
    icon: '',
    custom_tags: ''
  });

  const fetchBooklets = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('booklets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter booklets (those that either contain 'booklet' tag OR do not contain 'mock-test'/'mock' tags)
      const filtered = (data || []).filter(b => {
        const tags = b.tags || [];
        return tags.includes('booklet') || (!tags.includes('mock-test') && !tags.includes('mock'));
      });
      setBooklets(filtered);
    } catch (err: any) {
      console.error(err);
      toast('Failed to load booklets: ' + err.message, 'error');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchBooklets();
  }, []);

  // ── Preview: fetch questions & group by subject → chapter ───────────────
  const openPreview = useCallback(async (booklet: any) => {
    setPreviewBooklet(booklet);
    setPreviewLoading(true);
    setPreviewData([]);
    setPreviewTotalQuestions(0);
    setExpandedSubjects(new Set());
    setExpandedChapters(new Set());
    setExpandedExplanations(new Set());

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('booklet_id', booklet.id)
        .order('subject', { ascending: true })
        .order('chapter', { ascending: true });

      if (error) throw error;

      const questions: Question[] = data || [];
      setPreviewTotalQuestions(questions.length);

      // Group by subject → chapter
      const subjectMap = new Map<string, Map<string, Question[]>>();
      for (const q of questions) {
        const subj = q.subject || 'Unknown Subject';
        const chap = q.chapter || 'Uncategorized';
        if (!subjectMap.has(subj)) subjectMap.set(subj, new Map());
        const chapMap = subjectMap.get(subj)!;
        if (!chapMap.has(chap)) chapMap.set(chap, []);
        chapMap.get(chap)!.push(q);
      }

      const grouped: SubjectGroup[] = [];
      for (const [subjName, chapMap] of subjectMap) {
        const chapters: ChapterGroup[] = [];
        let totalQ = 0;
        for (const [chapName, qs] of chapMap) {
          chapters.push({ name: chapName, questions: qs });
          totalQ += qs.length;
        }
        grouped.push({ name: subjName, chapters, totalQuestions: totalQ });
      }

      setPreviewData(grouped);

      // Auto-expand first subject if only one
      if (grouped.length === 1) {
        setExpandedSubjects(new Set([grouped[0].name]));
        if (grouped[0].chapters.length === 1) {
          setExpandedChapters(new Set([`${grouped[0].name}::${grouped[0].chapters[0].name}`]));
        }
      }
    } catch (err: any) {
      console.error(err);
      toast('Failed to load booklet questions: ' + err.message, 'error');
    } finally {
      setPreviewLoading(false);
    }
  }, [toast]);

  const closePreview = () => {
    setPreviewBooklet(null);
    setPreviewData([]);
    setPreviewTotalQuestions(0);
  };

  const toggleSubject = (name: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleChapter = (key: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleExplanation = (qId: string) => {
    setExpandedExplanations(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId); else next.add(qId);
      return next;
    });
  };

  const expandAll = () => {
    const allSubjects = new Set(previewData.map(s => s.name));
    const allChapters = new Set<string>();
    previewData.forEach(s => s.chapters.forEach(c => allChapters.add(`${s.name}::${c.name}`)));
    setExpandedSubjects(allSubjects);
    setExpandedChapters(allChapters);
  };

  const collapseAll = () => {
    setExpandedSubjects(new Set());
    setExpandedChapters(new Set());
    setExpandedExplanations(new Set());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Build structure-compatible tags array
      const tagsArray = ['booklet'];
      if (formData.subject) tagsArray.push(formData.subject.toLowerCase());
      if (formData.target_year) tagsArray.push(formData.target_year);

      if (formData.custom_tags) {
        formData.custom_tags.split(',').forEach(t => {
          const tag = t.trim().toLowerCase();
          if (tag && !tagsArray.includes(tag)) {
            tagsArray.push(tag);
          }
        });
      }

      const payload = {
        id: `booklet-${formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substr(2, 5)}`,
        title: formData.title,
        description: formData.description || null,
        icon: formData.icon || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMDtrP23DRn6wR58x_-4bfSdoTj80T3oRqig&s',
        tags: tagsArray,
        is_live: true
      };

      const { error } = await supabase.from('booklets').insert([payload]);

      if (error) throw error;
      
      toast('Booklet created successfully!', 'success');
      setFormData({ title: '', subject: '', description: '', target_year: '', icon: '', custom_tags: '' });
      fetchBooklets();
    } catch (err: any) {
      console.error(err);
      toast('Failed to create booklet: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Booklet',
      message: 'Are you sure you want to permanently delete this booklet? This action cannot be undone and will impact all associated questions.',
      danger: true,
      confirmLabel: 'Delete'
    });
    if (!ok) return;

    try {
      const { error } = await supabase.from('booklets').delete().eq('id', id);
      if (error) throw error;
      
      toast('Booklet deleted successfully!', 'success');
      fetchBooklets();
    } catch (err: any) {
      console.error(err);
      toast('Failed to delete booklet: ' + err.message, 'error');
    }
  };

  // Helper to extract subject and target year from booklet tags
  const getSubjectAndYear = (tags: string[]) => {
    const subjects = ['physics', 'chemistry', 'mathematics'];
    const subject = tags.find(t => subjects.includes(t.toLowerCase())) || 'Unknown Subject';
    const year = tags.find(t => /^\d{4}$/.test(t)) || 'N/A';
    const extraTags = tags.filter(t => t !== 'booklet' && t !== subject && t !== year);
    return { subject, year, extraTags };
  };

  // ── Difficulty badge colors ──────────────────────────────────────────────
  const difficultyStyle = (d: string | null) => {
    switch (d) {
      case 'easy': return 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/25';
      case 'medium': return 'bg-[var(--orange)]/15 text-[var(--orange)] border-[var(--orange)]/25';
      case 'hard': return 'bg-[var(--red)]/15 text-[var(--red)] border-[var(--red)]/25';
      default: return 'bg-[var(--bg3)] text-[var(--text2)] border-[var(--border)]';
    }
  };

  const optionLabel = (index: number) => String.fromCharCode(65 + index); // A, B, C, D...

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT — Create Form */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 h-fit shadow-lg">
          <h3 className="text-xl font-bold font-[family-name:var(--font-bebas)] tracking-wider mb-6 pb-2 border-b border-[var(--border)]">
            📚 Create New Booklet
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1">
                Title <span className="text-[var(--accent)]">*</span>
              </label>
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleChange} 
                placeholder="e.g. Physics Revision Module"
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors" 
                required 
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1">
                Subject <span className="text-[var(--accent)]">*</span>
              </label>
              <select 
                name="subject" 
                value={formData.subject} 
                onChange={handleChange} 
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
                required
              >
                <option value="">Select subject</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="mathematics">Mathematics</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Target Year</label>
              <input 
                type="number" 
                name="target_year" 
                value={formData.target_year} 
                onChange={handleChange} 
                placeholder="e.g. 2026"
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Icon Image URL</label>
              <input 
                type="url" 
                name="icon" 
                value={formData.icon} 
                onChange={handleChange} 
                placeholder="e.g. https://domain.com/icon.png (Optional)"
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Custom Tags (Comma Separated)</label>
              <input 
                type="text" 
                name="custom_tags" 
                value={formData.custom_tags} 
                onChange={handleChange} 
                placeholder="e.g. mechanics, mains, practice"
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                rows={4}
                placeholder="Provide a comprehensive summary of this booklet..."
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors resize-none" 
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[var(--accent)] hover:brightness-110 text-black font-bold py-3.5 px-8 rounded-xl transition-all flex items-center justify-center tracking-widest text-xs"
            >
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : 'CREATE BOOKLET'}
            </button>
          </form>
        </div>

        {/* RIGHT — List of Booklets */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
            <h3 className="text-xl font-bold font-[family-name:var(--font-bebas)] tracking-wider">
              📚 Existing Booklets
            </h3>
            <span className="text-xs font-mono text-[var(--text2)] uppercase tracking-wider">
              Total Modules: {booklets.length}
            </span>
          </div>

          {fetching ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
              <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)] mb-3" />
              <p className="text-sm text-[var(--text2)] uppercase tracking-widest font-mono text-xs">Calibrating data feeds...</p>
            </div>
          ) : booklets.length === 0 ? (
            <div className="text-center py-20 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
              <p className="text-sm text-[var(--text2)]">No booklets found in database. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {booklets.map(b => {
                const { subject, year, extraTags } = getSubjectAndYear(b.tags || []);
                return (
                  <div key={b.id} className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-2xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden shadow-md">
                    
                    <div>
                      {/* Header */}
                      <div className="flex gap-4 items-start mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--bg3)] overflow-hidden flex items-center justify-center border border-[var(--border)] flex-shrink-0">
                          {b.icon ? (
                            <img src={b.icon} alt={b.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMDtrP23DRn6wR58x_-4bfSdoTj80T3oRqig&s' }} />
                          ) : (
                            <BookOpen size={20} className="text-[var(--accent)]" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-base text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate pr-4">
                              {b.title}
                            </h4>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => openPreview(b)}
                                className="text-[var(--text2)] hover:text-[var(--accent)] p-1.5 rounded-lg hover:bg-[var(--accent)]/10 transition-all opacity-0 group-hover:opacity-100"
                                title="Preview Booklet"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(b.id)}
                                className="text-[var(--text2)] hover:text-[#ff4d6a] p-1.5 rounded-lg hover:bg-[#ff4d6a]/10 transition-all opacity-0 group-hover:opacity-100"
                                title="Delete Booklet"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] font-mono text-[var(--text2)] truncate">{b.id}</p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[var(--text2)] leading-relaxed line-clamp-3 mb-4">
                        {b.description || 'No description provided for this booklet.'}
                      </p>
                    </div>

                    {/* Badges/Footer */}
                    <div className="pt-3 border-t border-[var(--border)] flex flex-wrap gap-1.5 items-center">
                      <span className="bg-[var(--bg3)] text-[var(--accent)] border border-[var(--accent)]/20 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Layers size={10} />
                        {subject}
                      </span>
                      <span className="bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)] px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Calendar size={10} />
                        {year}
                      </span>
                      {extraTags.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-[var(--bg3)]/50 text-[var(--text2)] px-1.5 py-0.5 rounded text-[9px] flex items-center gap-0.5">
                          <Tag size={8} />
                          {tag}
                        </span>
                      ))}
                      {/* View button — always visible on mobile */}
                      <button
                        onClick={() => openPreview(b)}
                        className="ml-auto bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[var(--accent)]/20 transition-all lg:opacity-0 lg:group-hover:opacity-100"
                      >
                        <Eye size={11} />
                        Preview
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PREVIEW MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      {previewBooklet && (
        <div 
          className="fixed inset-0 z-[9999] flex items-start justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closePreview(); }}
        >
          <div 
            className="relative w-full max-w-5xl mx-4 my-6 max-h-[calc(100vh-48px)] overflow-y-auto rounded-3xl border border-[var(--border)] shadow-2xl"
            style={{ 
              background: 'var(--card)',
              animation: 'previewSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 border-b border-[var(--border)] p-6 pb-5 flex flex-col gap-4 rounded-t-3xl" style={{ background: 'var(--card)', backdropFilter: 'blur(16px)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg3)] overflow-hidden flex items-center justify-center border border-[var(--border)] flex-shrink-0">
                    {previewBooklet.icon ? (
                      <img src={previewBooklet.icon} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen size={24} className="text-[var(--accent)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold font-[family-name:var(--font-bebas)] tracking-wider text-[var(--text)] truncate">
                      {previewBooklet.title}
                    </h2>
                    <p className="text-xs font-mono text-[var(--text2)] truncate">{previewBooklet.id}</p>
                  </div>
                </div>
                <button
                  onClick={closePreview}
                  className="p-2 rounded-xl bg-[var(--bg3)] hover:bg-[var(--red)]/15 text-[var(--text2)] hover:text-[var(--red)] transition-all flex-shrink-0 border border-[var(--border)]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Stats Bar */}
              {!previewLoading && (
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-1.5 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 px-3 py-1.5 rounded-xl text-xs font-bold">
                    <FileText size={13} />
                    {previewTotalQuestions} Questions
                  </div>
                  <div className="flex items-center gap-1.5 bg-[var(--purple)]/10 text-[var(--purple)] border border-[var(--purple)]/20 px-3 py-1.5 rounded-xl text-xs font-bold">
                    <Layers size={13} />
                    {previewData.length} {previewData.length === 1 ? 'Subject' : 'Subjects'}
                  </div>
                  <div className="flex items-center gap-1.5 bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20 px-3 py-1.5 rounded-xl text-xs font-bold">
                    <BookOpen size={13} />
                    {previewData.reduce((sum, s) => sum + s.chapters.length, 0)} Chapters
                  </div>
                  <div className="flex items-center gap-1.5 bg-[var(--orange)]/10 text-[var(--orange)] border border-[var(--orange)]/20 px-3 py-1.5 rounded-xl text-xs font-bold">
                    <Award size={13} />
                    {previewData.reduce((sum, s) => sum + s.chapters.reduce((cs, c) => cs + c.questions.reduce((qs, q) => qs + (q.marks || 0), 0), 0), 0)} Total Marks
                  </div>

                  <div className="ml-auto flex gap-2">
                    <button onClick={expandAll} className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] hover:bg-[var(--accent)]/10 px-3 py-1.5 rounded-lg transition-colors border border-[var(--accent)]/20">
                      Expand All
                    </button>
                    <button onClick={collapseAll} className="text-[10px] font-bold uppercase tracking-widest text-[var(--text2)] hover:bg-[var(--bg3)] px-3 py-1.5 rounded-lg transition-colors border border-[var(--border)]">
                      Collapse All
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)] mb-4" />
                  <p className="text-sm text-[var(--text2)] font-mono uppercase tracking-widest">Loading questions...</p>
                </div>
              ) : previewTotalQuestions === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-full bg-[var(--bg3)] flex items-center justify-center mb-4 border border-[var(--border)]">
                    <AlertCircle size={32} className="text-[var(--text2)]" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text)] mb-2">No Questions Found</h3>
                  <p className="text-sm text-[var(--text2)] max-w-md">
                    This booklet doesn&apos;t have any questions assigned yet. Go to the <strong>Questions</strong> tab to add questions with <code className="bg-[var(--bg3)] px-1.5 py-0.5 rounded text-[var(--accent)] text-xs">exam_type: booklet</code> and this booklet&apos;s ID.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {previewData.map(subjectGroup => {
                    const isSubjExpanded = expandedSubjects.has(subjectGroup.name);
                    return (
                      <div key={subjectGroup.name} className="border border-[var(--border)] rounded-2xl overflow-hidden">
                        {/* Subject Header */}
                        <button
                          onClick={() => toggleSubject(subjectGroup.name)}
                          className="w-full flex items-center gap-3 px-5 py-4 bg-[var(--bg2)] hover:bg-[var(--bg3)] transition-colors text-left"
                        >
                          {isSubjExpanded ? <ChevronDown size={18} className="text-[var(--accent)] flex-shrink-0" /> : <ChevronRight size={18} className="text-[var(--text2)] flex-shrink-0" />}
                          <Layers size={18} className="text-[var(--accent)] flex-shrink-0" />
                          <span className="font-bold text-sm uppercase tracking-wider text-[var(--text)] flex-1">
                            {subjectGroup.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[var(--text2)] bg-[var(--bg3)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
                            {subjectGroup.chapters.length} ch · {subjectGroup.totalQuestions} Q
                          </span>
                        </button>

                        {/* Chapters */}
                        {isSubjExpanded && (
                          <div className="border-t border-[var(--border)]">
                            {subjectGroup.chapters.map(chapter => {
                              const chapKey = `${subjectGroup.name}::${chapter.name}`;
                              const isChapExpanded = expandedChapters.has(chapKey);
                              return (
                                <div key={chapKey} className="border-b border-[var(--border)] last:border-b-0">
                                  {/* Chapter Header */}
                                  <button
                                    onClick={() => toggleChapter(chapKey)}
                                    className="w-full flex items-center gap-3 px-6 py-3 hover:bg-[var(--bg2)]/50 transition-colors text-left"
                                  >
                                    {isChapExpanded ? <ChevronDown size={15} className="text-[var(--accent)] flex-shrink-0" /> : <ChevronRight size={15} className="text-[var(--text2)] flex-shrink-0" />}
                                    <BookOpen size={15} className="text-[var(--purple)] flex-shrink-0" />
                                    <span className="font-semibold text-sm text-[var(--text)] flex-1">
                                      {chapter.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-[var(--text2)] bg-[var(--bg3)] px-2 py-0.5 rounded border border-[var(--border)]">
                                      {chapter.questions.length} Q
                                    </span>
                                  </button>

                                  {/* Questions */}
                                  {isChapExpanded && (
                                    <div className="px-6 pb-4 space-y-3">
                                      {chapter.questions.map((q, qIndex) => (
                                        <QuestionCard
                                          key={q.id}
                                          question={q}
                                          index={qIndex}
                                          isExplanationExpanded={expandedExplanations.has(q.id)}
                                          onToggleExplanation={() => toggleExplanation(q.id)}
                                          difficultyStyle={difficultyStyle}
                                          optionLabel={optionLabel}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes previewSlideIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Question Card (extracted for readability & memo optimization)
// ═══════════════════════════════════════════════════════════════════════════
const QuestionCard = memo(function QuestionCard({
  question: q,
  index,
  isExplanationExpanded,
  onToggleExplanation,
  difficultyStyle,
  optionLabel,
}: {
  question: Question;
  index: number;
  isExplanationExpanded: boolean;
  onToggleExplanation: () => void;
  difficultyStyle: (d: string | null) => string;
  optionLabel: (i: number) => string;
}) {
  return (
    <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent)]/20 transition-all">
      {/* Question Header Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono">
          Q{index + 1}
        </span>
        {q.difficulty && (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${difficultyStyle(q.difficulty)}`}>
            {q.difficulty}
          </span>
        )}
        <span className="bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)] px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
          {q.type}
        </span>
        {q.topic && (
          <span className="bg-[var(--purple)]/10 text-[var(--purple)] border border-[var(--purple)]/20 px-2 py-0.5 rounded-md text-[10px] font-bold truncate max-w-[200px]">
            {q.topic}
          </span>
        )}
        {q.marks && (
          <span className="ml-auto bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
            <Award size={10} />
            {q.marks} marks
          </span>
        )}
      </div>

      {/* Question Text */}
      <MathText text={q.question_text} className="text-sm text-[var(--text)] leading-relaxed mb-3" />

      {/* Question Image */}
      {q.question_image_url && (
        <div className="mb-3">
          <img 
            src={q.question_image_url} 
            alt="Question diagram" 
            className="max-w-full max-h-64 object-contain rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-2"
          />
        </div>
      )}

      {/* MCQ Options */}
      {q.options && q.options.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {q.options.map((opt, oi) => {
            const isCorrect = String(q.correct_answer) === String(oi);
            return (
              <div
                key={oi}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                  isCorrect 
                    ? 'bg-[var(--green)]/10 border-[var(--green)]/30' 
                    : 'bg-[var(--card)] border-[var(--border)]'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                  isCorrect 
                    ? 'bg-[var(--green)] text-white' 
                    : 'bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)]'
                }`}>
                  {isCorrect ? <CheckCircle2 size={13} /> : optionLabel(oi)}
                </span>
                <div className="flex-1 min-w-0">
                  <MathText text={opt.text} className={`text-sm ${isCorrect ? 'font-semibold text-[var(--green)]' : 'text-[var(--text)]'}`} />
                  {opt.image && (
                    <img src={opt.image} alt={`Option ${optionLabel(oi)}`} className="mt-1.5 max-h-32 object-contain rounded-lg border border-[var(--border)]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Integer/Non-MCQ Answer */}
      {(!q.options || q.options.length === 0) && q.correct_answer && (
        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/30">
          <CheckCircle2 size={15} className="text-[var(--green)] flex-shrink-0" />
          <span className="text-sm font-semibold text-[var(--green)]">Answer: </span>
          <MathText text={q.correct_answer} className="text-sm text-[var(--green)] font-semibold" />
        </div>
      )}

      {/* Explanation Toggle */}
      {q.explanation && (
        <div className="mt-2">
          <button
            onClick={onToggleExplanation}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] hover:bg-[var(--accent)]/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isExplanationExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {isExplanationExpanded ? 'Hide' : 'Show'} Explanation
          </button>
          {isExplanationExpanded && (
            <div className="mt-2 p-4 rounded-xl bg-[var(--card)] border border-[var(--accent)]/15" style={{ borderLeft: '3px solid var(--accent)' }}>
              <MathText text={q.explanation} className="text-sm text-[var(--text2)] leading-relaxed" />
              {q.explanation_image_url && (
                <img 
                  src={q.explanation_image_url} 
                  alt="Explanation diagram" 
                  className="mt-3 max-w-full max-h-64 object-contain rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-2"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
