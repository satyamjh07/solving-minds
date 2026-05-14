'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';

export default function BookletsTab() {
  const [loading, setLoading] = useState(false);
  const { toast } = useDialog();
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    target_year: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        title: formData.title,
        subject: formData.subject,
        description: formData.description || null,
        target_year: formData.target_year ? parseInt(formData.target_year) : null
      };

      const { error } = await supabase.from('booklets').insert([payload]);

      if (error) throw error;
      
      toast('Booklet created successfully!', 'success');
      setFormData({ title: '', subject: '', description: '', target_year: '' });
    } catch (err: any) {
      console.error(err);
      toast('Failed to create booklet: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h3 className="text-xl font-bold font-[family-name:var(--font-bebas)] tracking-wider mb-6">Create New Booklet</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Title <span className="text-[var(--accent)]">*</span></label>
          <input 
            type="text" 
            name="title" 
            value={formData.title} 
            onChange={handleChange} 
            className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] outline-none focus:border-[var(--accent)]" 
            required 
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Subject <span className="text-[var(--accent)]">*</span></label>
          <select 
            name="subject" 
            value={formData.subject} 
            onChange={handleChange} 
            className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            required
          >
            <option value="">Select subject</option>
            <option value="physics">Physics</option>
            <option value="chemistry">Chemistry</option>
            <option value="mathematics">Mathematics</option>
            <option value="mock-test">Mock Test</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Target Year</label>
          <input 
            type="number" 
            name="target_year" 
            value={formData.target_year} 
            onChange={handleChange} 
            placeholder="e.g. 2025"
            className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] outline-none focus:border-[var(--accent)]" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text2)] uppercase tracking-widest mb-1">Description</label>
          <textarea 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            rows={4}
            className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-[var(--text)] outline-none focus:border-[var(--accent)]" 
          ></textarea>
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="bg-[var(--accent)] text-black font-bold py-3 px-8 rounded-lg hover:brightness-110 flex items-center justify-center min-w-[180px]"
        >
          {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : 'CREATE BOOKLET'}
        </button>
      </form>
    </div>
  );
}
