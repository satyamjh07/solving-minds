'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Trash2, Award, Calendar, Tag, Layers } from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';

export default function MockTestsTab() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [mocks, setMocks] = useState<any[]>([]);
  const { confirm, toast } = useDialog();

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    target_year: '',
    icon: '',
    custom_tags: ''
  });

  const fetchMocks = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('booklets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter only mock tests (those that contain 'mock-test' tag or 'mock' tag)
      const filtered = (data || []).filter(b => {
        const tags = b.tags || [];
        return tags.includes('mock-test') || tags.includes('mock');
      });
      setMocks(filtered);
    } catch (err: any) {
      console.error(err);
      toast('Failed to load mock tests: ' + err.message, 'error');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMocks();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Build structure-compatible tags array
      const tagsArray = ['mock-test'];
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
        id: `mock-${formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substr(2, 5)}`,
        title: formData.title,
        description: formData.description || null,
        icon: formData.icon || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNpU4PjP5W5T8L6_i9sZ-1k-iC6S6O0h44fg&s', // Beautiful Mock / Exam Icon placeholder
        tags: tagsArray,
        is_live: true
      };

      const { error } = await supabase.from('booklets').insert([payload]);

      if (error) throw error;
      
      toast('Mock test created successfully!', 'success');
      setFormData({ title: '', subject: '', description: '', target_year: '', icon: '', custom_tags: '' });
      fetchMocks();
    } catch (err: any) {
      console.error(err);
      toast('Failed to create mock test: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Mock Test',
      message: 'Are you sure you want to permanently delete this mock test? This action cannot be undone and will impact all associated questions.',
      danger: true,
      confirmLabel: 'Delete'
    });
    if (!ok) return;

    try {
      const { error } = await supabase.from('booklets').delete().eq('id', id);
      if (error) throw error;
      
      toast('Mock test deleted successfully!', 'success');
      fetchMocks();
    } catch (err: any) {
      console.error(err);
      toast('Failed to delete mock test: ' + err.message, 'error');
    }
  };

  // Helper to extract subject and target year from mock test tags
  const getSubjectAndYear = (tags: string[]) => {
    const subjects = ['physics', 'chemistry', 'mathematics'];
    const subject = tags.find(t => subjects.includes(t.toLowerCase())) || 'Full Syllabus';
    const year = tags.find(t => /^\d{4}$/.test(t)) || 'N/A';
    const extraTags = tags.filter(t => t !== 'mock-test' && t !== 'mock' && t !== subject && t !== year);
    return { subject, year, extraTags };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT — Create Form */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 h-fit shadow-lg">
        <h3 className="text-xl font-bold font-[family-name:var(--font-bebas)] tracking-wider mb-6 pb-2 border-b border-[var(--border)]">
          ⏱️ Create New Mock Test
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
              placeholder="e.g. JEE Main Full Test 01"
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
              <option value="">Select subject scope</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="mathematics">Mathematics</option>
              <option value="full-syllabus">Full Syllabus</option>
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
              placeholder="e.g. mock, national, test-series"
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
              placeholder="Provide a comprehensive summary of this mock test..."
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors resize-none" 
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[var(--accent)] hover:brightness-110 text-black font-bold py-3.5 px-8 rounded-xl transition-all flex items-center justify-center tracking-widest text-xs"
          >
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : 'CREATE MOCK TEST'}
          </button>
        </form>
      </div>

      {/* RIGHT — List of Mock Tests */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
          <h3 className="text-xl font-bold font-[family-name:var(--font-bebas)] tracking-wider">
            ⏱️ Existing Mock Tests
          </h3>
          <span className="text-xs font-mono text-[var(--text2)] uppercase tracking-wider">
            Total Mocks: {mocks.length}
          </span>
        </div>

        {fetching ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)] mb-3" />
            <p className="text-sm text-[var(--text2)] uppercase tracking-widest font-mono text-xs">Calibrating data feeds...</p>
          </div>
        ) : mocks.length === 0 ? (
          <div className="text-center py-20 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
            <p className="text-sm text-[var(--text2)]">No mock tests found in database. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mocks.map(b => {
              const { subject, year, extraTags } = getSubjectAndYear(b.tags || []);
              return (
                <div key={b.id} className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-2xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden shadow-md">
                  
                  <div>
                    {/* Header */}
                    <div className="flex gap-4 items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--bg3)] overflow-hidden flex items-center justify-center border border-[var(--border)] flex-shrink-0">
                        {b.icon ? (
                          <img src={b.icon} alt={b.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNpU4PjP5W5T8L6_i9sZ-1k-iC6S6O0h44fg&s' }} />
                        ) : (
                          <Award size={20} className="text-[var(--accent)]" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-base text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate pr-4">
                            {b.title}
                          </h4>
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="text-[var(--text2)] hover:text-[#ff4d6a] p-1.5 rounded-lg hover:bg-[#ff4d6a]/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                            title="Delete Mock Test"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text2)] truncate">{b.id}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[var(--text2)] leading-relaxed line-clamp-3 mb-4">
                      {b.description || 'No description provided for this mock test.'}
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
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
