'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Loader2 } from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';

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
    opt1: '',
    opt2: '',
    opt3: '',
    opt4: '',
    answer: '',
    explanation: '',
    expImageFile: null as File | null,
    expImageUrl: ''
  });

  const [imgTab, setImgTab] = useState<'file'|'url'>('file');
  const [expTab, setExpTab] = useState<'file'|'url'>('file');

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
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
      if (imgTab === 'file' && formData.qImageFile) {
        finalQImgUrl = await uploadToCloudinary(formData.qImageFile);
      }

      let finalExpImgUrl = formData.expImageUrl;
      if (expTab === 'file' && formData.expImageFile) {
        finalExpImgUrl = await uploadToCloudinary(formData.expImageFile);
      }

      // Format options if MCQ
      let optionsArray = null;
      if (formData.type === 'mcq') {
        optionsArray = [formData.opt1, formData.opt2, formData.opt3, formData.opt4].filter(Boolean);
      }

      const payload = {
        question_text: formData.text,
        image_url: finalQImgUrl || null,
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
        options: optionsArray
      };

      const { error } = await supabase.from('questions').insert([payload]);

      if (error) throw error;
      
      toast('Question uploaded successfully!', 'success');
      // Reset some fields
      setFormData(prev => ({
        ...prev,
        text: '',
        qImageFile: null,
        qImageUrl: '',
        opt1: '', opt2: '', opt3: '', opt4: '',
        answer: '',
        explanation: '',
        expImageFile: null,
        expImageUrl: ''
      }));
    } catch (err: any) {
      console.error(err);
      toast('Failed to upload question: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="grid grid-cols-1 lg:grid-cols-3 gap-6" onSubmit={handleSubmit}>
      {/* LEFT PANEL - Classification */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="font-bold text-[var(--text)] mb-2 uppercase tracking-widest text-sm border-b border-[var(--border)] pb-2">1. Classification</h3>

        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Subject <span className="text-[var(--accent)]">*</span></label>
          <select name="subject" value={formData.subject} onChange={handleChange} required className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm">
            <option value="">Select subject</option>
            <option value="physics">Physics</option>
            <option value="chemistry">Chemistry</option>
            <option value="mathematics">Mathematics</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Chapter</label>
          <input type="text" name="chapter" value={formData.chapter} onChange={handleChange} placeholder="e.g. Kinematics" className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Topic</label>
          <input type="text" name="topic" value={formData.topic} onChange={handleChange} placeholder="e.g. Projectile Motion" className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Question Type</label>
          <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm">
            <option value="mcq">Multiple Choice (MCQ)</option>
            <option value="integer">Numerical / Integer</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Difficulty</label>
            <select name="difficulty" value={formData.difficulty} onChange={handleChange} className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm">
              <option value="">Any</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Year</label>
            <input type="number" name="year" value={formData.year} onChange={handleChange} placeholder="e.g. 2024" className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Shift</label>
          <input type="text" name="shift" value={formData.shift} onChange={handleChange} placeholder="e.g. 27 Jan Shift 1" className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm" />
        </div>
      </div>

      {/* MIDDLE PANEL - Content */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="font-bold text-[var(--text)] mb-2 uppercase tracking-widest text-sm border-b border-[var(--border)] pb-2">2. Problem Statement</h3>

        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Question Text <span className="text-[var(--accent)]">*</span></label>
          <textarea 
            name="text" 
            value={formData.text} 
            onChange={handleChange} 
            rows={4} 
            placeholder="Type question here (supports LaTeX $$...$$)"
            className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] font-[family-name:var(--font-grotesk)] outline-none focus:border-[var(--accent)] text-sm"
            required
          ></textarea>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1 flex justify-between items-center">
            Diagram / Image
            <div className="flex gap-2">
              <button type="button" className={`px-2 py-0.5 rounded text-[10px] ${imgTab === 'file' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg3)] text-[var(--text2)]'}`} onClick={() => setImgTab('file')}>FILE</button>
              <button type="button" className={`px-2 py-0.5 rounded text-[10px] ${imgTab === 'url' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg3)] text-[var(--text2)]'}`} onClick={() => setImgTab('url')}>URL</button>
            </div>
          </label>
          {imgTab === 'file' ? (
            <input type="file" name="qImageFile" onChange={handleChange} accept="image/*" className="text-sm w-full" />
          ) : (
            <input type="url" name="qImageUrl" value={formData.qImageUrl} onChange={handleChange} placeholder="https://..." className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          )}
        </div>

        {formData.type === 'mcq' && (
          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Options (MCQ)</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" name="opt1" value={formData.opt1} onChange={handleChange} placeholder="Option 1" className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]" />
              <input type="text" name="opt2" value={formData.opt2} onChange={handleChange} placeholder="Option 2" className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]" />
              <input type="text" name="opt3" value={formData.opt3} onChange={handleChange} placeholder="Option 3" className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]" />
              <input type="text" name="opt4" value={formData.opt4} onChange={handleChange} placeholder="Option 4" className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Correct Answer <span className="text-[var(--accent)]">*</span></label>
          <input 
            type="text" 
            name="answer" 
            value={formData.answer} 
            onChange={handleChange} 
            placeholder={formData.type === 'mcq' ? "e.g. 2 (for Option 2)" : "e.g. 42"} 
            className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]"
            required
          />
        </div>
      </div>

      {/* RIGHT PANEL - Explanation */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col justify-between">
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-[var(--text)] mb-2 uppercase tracking-widest text-sm border-b border-[var(--border)] pb-2">3. Explanation</h3>

          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Solution Text</label>
            <textarea 
              name="explanation" 
              value={formData.explanation} 
              onChange={handleChange} 
              rows={6} 
              placeholder="Solution text..."
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] outline-none focus:border-[var(--accent)] text-sm"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1 flex justify-between items-center">
              Explanation Image
              <div className="flex gap-2">
                <button type="button" className={`px-2 py-0.5 rounded text-[10px] ${expTab === 'file' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg3)] text-[var(--text2)]'}`} onClick={() => setExpTab('file')}>FILE</button>
                <button type="button" className={`px-2 py-0.5 rounded text-[10px] ${expTab === 'url' ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg3)] text-[var(--text2)]'}`} onClick={() => setExpTab('url')}>URL</button>
              </div>
            </label>
            {expTab === 'file' ? (
              <input type="file" name="expImageFile" onChange={handleChange} accept="image/*" className="text-sm w-full" />
            ) : (
              <input type="url" name="expImageUrl" value={formData.expImageUrl} onChange={handleChange} placeholder="https://..." className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)]" />
            )}
          </div>
        </div>

        <div className="mt-8">
          <button type="submit" disabled={loading} className="w-full bg-[var(--accent)] text-black font-bold py-4 px-8 rounded-xl hover:brightness-110 flex items-center justify-center transition-all">
            {loading ? <Loader2 size={20} className="animate-spin mr-2" /> : 'UPLOAD QUESTION'}
          </button>
        </div>
      </div>
    </form>
  );
}
