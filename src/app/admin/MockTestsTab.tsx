'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Trash2, Award, Calendar, Tag, Layers, Check, FileText, Zap, Eye, AlertCircle } from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';

interface MockTest {
  id: string;
  title: string;
  exam_type: string;
  duration: number;
  total_questions: number;
  total_marks: number;
  status: 'draft' | 'live';
  is_pyp: boolean;
  year?: number;
  shift?: string;
  subjects: string[];
  created_at: string;
}

export default function MockTestsTab() {
  const { confirm, toast } = useDialog();
  
  // Sub-tabs: 'mocks' (Custom Mock Tests) or 'pyps' (Previous Year Papers)
  const [subTab, setSubTab] = useState<'mocks' | 'pyps'>('mocks');
  
  // Loading and data states
  const [fetchingMocks, setFetchingMocks] = useState(true);
  const [fetchingPyps, setFetchingPyps] = useState(true);
  const [mocks, setMocks] = useState<MockTest[]>([]);
  const [pyps, setPyps] = useState<MockTest[]>([]);
  
  // Dynamic PYQ fetching states
  const [years, setYears] = useState<number[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [loadingShifts, setLoadingShifts] = useState(false);
  
  // Preview and creation states for PYP
  const [previewData, setPreviewData] = useState<{
    examType: string;
    totalQuestions: number;
    totalMarks: number;
    subjects: string[];
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pypStatus, setPypStatus] = useState<'draft' | 'live'>('draft');
  const [pypDuration, setPypDuration] = useState<number>(180);
  const [isSubmittingPyp, setIsSubmittingPyp] = useState(false);

  // Forms state for Custom Mock Tests
  const [mockFormData, setMockFormData] = useState({
    title: '',
    exam_type: 'jee-main',
    duration: 180,
    total_questions: 90,
    total_marks: 300,
    status: 'live' as 'draft' | 'live',
    subjectsSelected: {
      physics: true,
      chemistry: true,
      mathematics: true
    }
  });
  const [isSubmittingMock, setIsSubmittingMock] = useState(false);

  // Fetch years from questions table on mount
  const fetchYears = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('year')
        .order('year', { ascending: false });

      if (error) throw error;

      // Filter unique years
      const uniqueYears = Array.from(
        new Set(data?.map(q => q.year).filter(Boolean) as number[])
      ).sort((a, b) => b - a);

      setYears(uniqueYears);
    } catch (err: any) {
      console.error('Error fetching years:', err.message);
      toast('Failed to load years from database: ' + err.message, 'error');
    }
  };

  // Fetch shifts for selected year
  const fetchShifts = async (year: number) => {
    setLoadingShifts(true);
    setSelectedShift('');
    setPreviewData(null);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('shift')
        .eq('year', year);

      if (error) throw error;

      const uniqueShifts = Array.from(
        new Set(data?.map(q => q.shift).filter(Boolean) as string[])
      ).sort();

      setShifts(uniqueShifts);
    } catch (err: any) {
      console.error('Error fetching shifts:', err.message);
      toast('Failed to load shifts: ' + err.message, 'error');
    } finally {
      setLoadingShifts(false);
    }
  };

  // Fetch mock tests from database
  const fetchMocks = async () => {
    setFetchingMocks(true);
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('is_pyp', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMocks(data || []);
    } catch (err: any) {
      console.error(err);
      toast('Failed to fetch mock tests: ' + err.message, 'error');
    } finally {
      setFetchingMocks(false);
    }
  };

  // Fetch PYP papers from database
  const fetchPyps = async () => {
    setFetchingPyps(true);
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('is_pyp', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPyps(data || []);
    } catch (err: any) {
      console.error(err);
      toast('Failed to fetch PYPs: ' + err.message, 'error');
    } finally {
      setFetchingPyps(false);
    }
  };

  useEffect(() => {
    fetchYears();
    fetchMocks();
    fetchPyps();
  }, []);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedYear(val);
    if (val) {
      fetchShifts(parseInt(val));
    } else {
      setShifts([]);
      setSelectedShift('');
      setPreviewData(null);
    }
  };

  // Generate preview of PYP questions
  const generatePypPreview = async () => {
    if (!selectedYear || !selectedShift) {
      toast('Please select both a Year and a Shift.', 'warning');
      return;
    }
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('exam_type, subject, marks')
        .eq('year', parseInt(selectedYear))
        .eq('shift', selectedShift);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast('No questions found matching this Year and Shift.', 'warning');
        return;
      }

      // Calculate aggregates
      const examType = data[0]?.exam_type || 'jee-main';
      const totalQuestions = data.length;
      // Default to 4 marks if marks column is empty/null (fallback)
      const totalMarks = data.reduce((sum, q) => sum + (q.marks || 4), 0);
      const subjects = Array.from(new Set(data.map(q => q.subject).filter(Boolean) as string[]));

      setPreviewData({
        examType,
        totalQuestions,
        totalMarks,
        subjects
      });
      toast('Preview generated successfully!', 'success');
    } catch (err: any) {
      console.error('Preview error:', err.message);
      toast('Failed to generate preview: ' + err.message, 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Submit PYP to mock_tests table
  const handlePypSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewData || !selectedYear || !selectedShift) return;

    setIsSubmittingPyp(true);
    try {
      const formattedExam = formatExamType(previewData.examType);
      const paperTitle = `${formattedExam} ${selectedYear} ${selectedShift}`;
      const uniqueId = `pyp-${previewData.examType}-${selectedYear}-${selectedShift.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      const payload = {
        id: uniqueId,
        title: paperTitle,
        exam_type: previewData.examType,
        duration: pypDuration,
        total_questions: previewData.totalQuestions,
        total_marks: previewData.totalMarks,
        status: pypStatus,
        is_pyp: true,
        year: parseInt(selectedYear),
        shift: selectedShift,
        subjects: previewData.subjects
      };

      const { error } = await supabase.from('mock_tests').insert([payload]);

      if (error) throw error;

      toast(`Previous Year Paper published as ${pypStatus.toUpperCase()}!`, 'success');
      
      // Reset PYP creator inputs
      setSelectedYear('');
      setSelectedShift('');
      setShifts([]);
      setPreviewData(null);
      setPypStatus('draft');
      setPypDuration(180);
      
      fetchPyps();
    } catch (err: any) {
      console.error(err);
      toast('Failed to create Previous Year Paper: ' + err.message, 'error');
    } finally {
      setIsSubmittingPyp(false);
    }
  };

  // Handle Mock Test form inputs
  const handleMockChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMockFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'total_questions' || name === 'total_marks' ? parseInt(value) || 0 : value
    }));
  };

  const handleMockSubjectToggle = (subj: 'physics' | 'chemistry' | 'mathematics') => {
    setMockFormData(prev => ({
      ...prev,
      subjectsSelected: {
        ...prev.subjectsSelected,
        [subj]: !prev.subjectsSelected[subj]
      }
    }));
  };

  // Submit Mock Test
  const handleMockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjects = Object.entries(mockFormData.subjectsSelected)
      .filter(([_, checked]) => checked)
      .map(([name]) => name);

    if (subjects.length === 0) {
      toast('Please select at least one subject scope.', 'warning');
      return;
    }

    setIsSubmittingMock(true);
    try {
      const uniqueId = `mock-${mockFormData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substr(2, 5)}`;
      
      const payload = {
        id: uniqueId,
        title: mockFormData.title,
        exam_type: mockFormData.exam_type,
        duration: mockFormData.duration,
        total_questions: mockFormData.total_questions,
        total_marks: mockFormData.total_marks,
        status: mockFormData.status,
        is_pyp: false,
        year: null,
        shift: null,
        subjects: subjects
      };

      const { error } = await supabase.from('mock_tests').insert([payload]);

      if (error) throw error;

      toast(`Mock Test created successfully as ${mockFormData.status.toUpperCase()}!`, 'success');
      
      setMockFormData({
        title: '',
        exam_type: 'jee-main',
        duration: 180,
        total_questions: 90,
        total_marks: 300,
        status: 'live',
        subjectsSelected: {
          physics: true,
          chemistry: true,
          mathematics: true
        }
      });

      fetchMocks();
    } catch (err: any) {
      console.error(err);
      toast('Failed to create mock test: ' + err.message, 'error');
    } finally {
      setIsSubmittingMock(false);
    }
  };

  // Approve a Draft paper (make it live)
  const handleApprove = async (id: string, type: 'mock' | 'pyp') => {
    const ok = await confirm({
      title: 'Approve & Publish',
      message: 'Are you sure you want to approve this draft? It will instantly become visible to users in the Test Center.',
      confirmLabel: 'Publish Live'
    });
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('mock_tests')
        .update({ status: 'live' })
        .eq('id', id);

      if (error) throw error;

      toast('Paper published live successfully!', 'success');
      if (type === 'mock') fetchMocks();
      else fetchPyps();
    } catch (err: any) {
      console.error(err);
      toast('Failed to approve paper: ' + err.message, 'error');
    }
  };

  // Delete mock test or PYP
  const handleDelete = async (id: string, type: 'mock' | 'pyp') => {
    const ok = await confirm({
      title: 'Delete Simulated Paper',
      message: `Are you sure you want to delete this ${type === 'mock' ? 'mock test' : 'previous year paper'}? This action is permanent and cannot be undone.`,
      danger: true,
      confirmLabel: 'Delete'
    });
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('mock_tests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast('Paper deleted successfully!', 'success');
      if (type === 'mock') fetchMocks();
      else fetchPyps();
    } catch (err: any) {
      console.error(err);
      toast('Failed to delete paper: ' + err.message, 'error');
    }
  };

  const formatExamType = (type: string) => {
    if (type === 'jee-main') return 'JEE Main';
    if (type === 'jee-advanced') return 'JEE Advanced';
    if (type === 'neet') return 'NEET UG';
    if (type === 'bitsat') return 'BITSAT';
    if (type === 'mht-cet') return 'MHT CET';
    return type.toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Tab controls */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        <button
          onClick={() => setSubTab('mocks')}
          className={`px-5 py-2 font-bold text-xs uppercase tracking-widest transition-colors font-mono ${
            subTab === 'mocks' 
              ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' 
              : 'text-[var(--text2)] hover:text-[var(--text)]'
          }`}
        >
          ⏱️ Mock Tests ({mocks.length})
        </button>
        <button
          onClick={() => setSubTab('pyps')}
          className={`px-5 py-2 font-bold text-xs uppercase tracking-widest transition-colors font-mono ${
            subTab === 'pyps' 
              ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' 
              : 'text-[var(--text2)] hover:text-[var(--text)]'
          }`}
        >
          📚 Previous Year Papers ({pyps.length})
        </button>
      </div>

      {subTab === 'mocks' ? (
        /* ================== MOCK TESTS TAB ================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Mock Form */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 h-fit shadow-lg">
            <h3 className="text-xl font-bold font-[family-name:var(--font-bebas)] tracking-wider mb-6 pb-2 border-b border-[var(--border)]">
              ⏱️ Create Mock Test
            </h3>
            
            <form onSubmit={handleMockSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1 font-mono">
                  Test Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={mockFormData.title}
                  onChange={handleMockChange}
                  placeholder="e.g. JEE Main Full Test 05"
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1 font-mono">
                    Exam Type
                  </label>
                  <select
                    name="exam_type"
                    value={mockFormData.exam_type}
                    onChange={handleMockChange}
                    className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
                  >
                    <option value="jee-main">JEE Main</option>
                    <option value="jee-advanced">JEE Advanced</option>
                    <option value="neet">NEET UG</option>
                    <option value="bitsat">BITSAT</option>
                    <option value="mht-cet">MHT CET</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1 font-mono">
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={mockFormData.duration}
                    onChange={handleMockChange}
                    className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1 font-mono">
                    Total Questions
                  </label>
                  <input
                    type="number"
                    name="total_questions"
                    value={mockFormData.total_questions}
                    onChange={handleMockChange}
                    className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1 font-mono">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    name="total_marks"
                    value={mockFormData.total_marks}
                    onChange={handleMockChange}
                    className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* Subject scope checkboxes */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-2 font-mono">
                  Syllabus Subject Scope
                </label>
                <div className="space-y-2 p-3 bg-[var(--bg3)] rounded-xl border border-[var(--border)]">
                  {(['physics', 'chemistry', 'mathematics'] as const).map(sub => (
                    <label key={sub} className="flex items-center gap-3 text-xs text-[var(--text)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={mockFormData.subjectsSelected[sub]}
                        onChange={() => handleMockSubjectToggle(sub)}
                        className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] bg-[var(--bg)] w-4 h-4"
                      />
                      <span className="capitalize font-medium">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1 font-mono">
                  Initial Status
                </label>
                <select
                  name="status"
                  value={mockFormData.status}
                  onChange={handleMockChange}
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors font-mono"
                >
                  <option value="live">Publish Instantly (Live)</option>
                  <option value="draft">Save as Draft</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmittingMock}
                className="w-full bg-[var(--accent)] hover:brightness-110 text-black font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center tracking-widest text-xs font-mono"
              >
                {isSubmittingMock ? <Loader2 size={16} className="animate-spin mr-2" /> : 'CREATE MOCK TEST'}
              </button>
            </form>
          </div>

          {/* Mocks List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <h3 className="text-xl font-bold font-[family-name:var(--font-bebas)] tracking-wider">
                ⏱️ Mock Test Registry
              </h3>
            </div>

            {fetchingMocks ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-2" />
                <p className="text-[10px] uppercase tracking-widest font-mono text-[var(--text2)]">Syncing registry...</p>
              </div>
            ) : mocks.length === 0 ? (
              <div className="text-center py-16 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
                <p className="text-sm text-[var(--text2)] font-mono">No mock tests registered in the system database.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mocks.map(mock => (
                  <div key={mock.id} className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-2xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden shadow-md">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-[var(--bg3)] text-[var(--accent)] px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider font-mono">
                          {formatExamType(mock.exam_type)}
                        </span>
                        
                        {mock.status === 'draft' ? (
                          <div className="flex gap-1.5 items-center">
                            <span className="bg-[var(--orange)]/15 text-[var(--orange)] border border-[var(--orange)]/25 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                              DRAFT
                            </span>
                            <button
                              onClick={() => handleApprove(mock.id, 'mock')}
                              className="bg-[var(--accent)]/10 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-black border border-[var(--accent)]/30 hover:border-transparent px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider font-mono transition-colors"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span className="bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/20 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                            LIVE
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-base text-[var(--text)] mb-3 pr-6 truncate" title={mock.title}>
                        {mock.title}
                      </h4>
                      
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-[var(--border)]/40 mb-4 text-center text-xs text-[var(--text2)]">
                        <div>
                          <span className="block font-bold text-[var(--text)]">{mock.total_questions}</span>
                          <span className="text-[8px] text-[var(--text3)] uppercase">Questions</span>
                        </div>
                        <div>
                          <span className="block font-bold text-[var(--text)]">{mock.total_marks}</span>
                          <span className="text-[8px] text-[var(--text3)] uppercase">Marks</span>
                        </div>
                        <div>
                          <span className="block font-bold text-[var(--text)]">{mock.duration}m</span>
                          <span className="text-[8px] text-[var(--text3)] uppercase">Duration</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {mock.subjects.map(s => (
                          <span key={s} className="bg-[var(--bg3)] text-[var(--text2)] px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border)]/60 flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[var(--text3)] truncate max-w-[150px]">{mock.id}</span>
                      <button
                        onClick={() => handleDelete(mock.id, 'mock')}
                        className="text-[var(--text3)] hover:text-[var(--red)] p-1.5 rounded-lg hover:bg-[var(--red)]/10 transition-colors"
                        title="Delete Mock Test"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================== PREVIOUS YEAR PAPERS TAB ================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create PYP Form */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 h-fit shadow-lg space-y-6">
            <div>
              <h3 className="text-xl font-bold font-[family-name:var(--font-bebas)] tracking-wider mb-2 pb-2 border-b border-[var(--border)]">
                📚 Fetch Previous Year Paper
              </h3>
              <p className="text-[10.5px] text-[var(--text2)] leading-relaxed">
                Generate paper records dynamically from the questions dataset. The system automatically inspects valid years and shifts and aggregates stats.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1 font-mono">
                  Step 1: Select Year
                </label>
                <select
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors font-mono"
                >
                  <option value="">-- Choose Existing Year --</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1 font-mono">
                  Step 2: Select Shift
                </label>
                <select
                  value={selectedShift}
                  onChange={(e) => {
                    setSelectedShift(e.target.value);
                    setPreviewData(null);
                  }}
                  disabled={!selectedYear || loadingShifts}
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors font-mono disabled:opacity-50"
                >
                  {loadingShifts ? (
                    <option value="">Fetching shifts...</option>
                  ) : shifts.length === 0 ? (
                    <option value="">-- Select Year First --</option>
                  ) : (
                    <>
                      <option value="">-- Select Shift --</option>
                      {shifts.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <button
                type="button"
                onClick={generatePypPreview}
                disabled={!selectedYear || !selectedShift || loadingPreview}
                className="w-full bg-[var(--bg2)] hover:bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] font-bold py-3 rounded-xl transition-all flex items-center justify-center text-xs uppercase tracking-widest font-mono"
              >
                {loadingPreview ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Querying Questions...
                  </>
                ) : (
                  <>
                    <Eye size={14} className="mr-2" />
                    Generate Preview
                  </>
                )}
              </button>
            </div>

            {/* PREVIEW CONTAINER */}
            {previewData && (
              <div className="p-5 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
                  <Check size={12} /> Paper Preview Generated
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--text2)] font-mono">Title preview:</span>
                    <span className="font-bold text-[var(--text)] text-right">
                      {formatExamType(previewData.examType)} {selectedYear} {selectedShift}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text2)] font-mono">Total Questions:</span>
                    <span className="font-bold text-[var(--text)]">{previewData.totalQuestions} Questions</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text2)] font-mono">Total Marks:</span>
                    <span className="font-bold text-[var(--text)]">{previewData.totalMarks} Marks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text2)] font-mono">Exam Type:</span>
                    <span className="font-bold text-[var(--accent)] uppercase">{previewData.examType}</span>
                  </div>
                  <div className="flex flex-col pt-2 border-t border-[var(--border)]">
                    <span className="text-[var(--text3)] uppercase text-[9px] font-mono mb-1">Subjects included:</span>
                    <div className="flex flex-wrap gap-1">
                      {previewData.subjects.map(s => (
                        <span key={s} className="bg-[var(--bg3)] text-[var(--text2)] px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePypSubmit} className="space-y-4 pt-3 border-t border-[var(--border)]">
                  <div>
                    <label className="block text-[9px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1 font-mono">
                      Estimated Duration (Mins)
                    </label>
                    <input
                      type="number"
                      value={pypDuration}
                      onChange={(e) => setPypDuration(parseInt(e.target.value) || 0)}
                      className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text)] outline-none font-mono"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-[var(--text2)] uppercase tracking-widest mb-1 font-mono">
                      Paper Status
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPypStatus('draft')}
                        className={`py-2 px-3 rounded-lg border text-[10px] font-bold font-mono transition-all ${
                          pypStatus === 'draft'
                            ? 'bg-[var(--orange)]/15 border-[var(--orange)] text-[var(--orange)]'
                            : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text2)]'
                        }`}
                      >
                        Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setPypStatus('live')}
                        className={`py-2 px-3 rounded-lg border text-[10px] font-bold font-mono transition-all ${
                          pypStatus === 'live'
                            ? 'bg-[var(--green)]/15 border-[var(--green)] text-[var(--green)]'
                            : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text2)]'
                        }`}
                      >
                        Live
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPyp}
                    className="w-full bg-[var(--accent)] hover:brightness-110 text-black font-extrabold py-3 rounded-xl transition-all flex items-center justify-center text-xs uppercase tracking-widest font-mono"
                  >
                    {isSubmittingPyp ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : pypStatus === 'live' ? (
                      'Publish Live Now'
                    ) : (
                      'Save As Draft'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* PYPs List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
              <h3 className="text-xl font-bold font-[family-name:var(--font-bebas)] tracking-wider">
                📚 Previous Year Paper Registry
              </h3>
            </div>

            {fetchingPyps ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-2" />
                <p className="text-[10px] uppercase tracking-widest font-mono text-[var(--text2)]">Syncing registry...</p>
              </div>
            ) : pyps.length === 0 ? (
              <div className="text-center py-16 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
                <p className="text-sm text-[var(--text2)] font-mono">No previous year papers registered in the system database.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pyps.map(pyp => (
                  <div key={pyp.id} className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-2xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden shadow-md">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="bg-[var(--bg3)] text-[var(--accent)] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono">
                            {formatExamType(pyp.exam_type)}
                          </span>
                          {pyp.year && (
                            <span className="bg-[var(--bg3)] text-[var(--text2)] px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">
                              {pyp.year}
                            </span>
                          )}
                        </div>

                        {pyp.status === 'draft' ? (
                          <div className="flex gap-1.5 items-center">
                            <span className="bg-[var(--orange)]/15 text-[var(--orange)] border border-[var(--orange)]/25 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                              DRAFT
                            </span>
                            <button
                              onClick={() => handleApprove(pyp.id, 'pyp')}
                              className="bg-[var(--accent)]/10 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-black border border-[var(--accent)]/30 hover:border-transparent px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider font-mono transition-colors"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span className="bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/20 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                            LIVE
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-base text-[var(--text)] mb-3 pr-6 truncate" title={pyp.title}>
                        {pyp.title}
                      </h4>

                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-[var(--border)]/40 mb-4 text-center text-xs text-[var(--text2)]">
                        <div>
                          <span className="block font-bold text-[var(--text)]">{pyp.total_questions}</span>
                          <span className="text-[8px] text-[var(--text3)] uppercase">Questions</span>
                        </div>
                        <div>
                          <span className="block font-bold text-[var(--text)]">{pyp.total_marks}</span>
                          <span className="text-[8px] text-[var(--text3)] uppercase">Marks</span>
                        </div>
                        <div>
                          <span className="block font-bold text-[var(--text)]">{pyp.duration}m</span>
                          <span className="text-[8px] text-[var(--text3)] uppercase">Duration</span>
                        </div>
                      </div>

                      {pyp.shift && (
                        <div className="text-[10px] text-[var(--text2)] mb-2">
                          <strong className="font-mono uppercase text-[9px] text-[var(--text3)]">Shift:</strong> {pyp.shift}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mb-2">
                        {pyp.subjects.map(s => (
                          <span key={s} className="bg-[var(--bg3)] text-[var(--text2)] px-1.5 py-0.5 rounded text-[9.5px] uppercase tracking-wide">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border)]/60 flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[var(--text3)] truncate max-w-[150px]">{pyp.id}</span>
                      <button
                        onClick={() => handleDelete(pyp.id, 'pyp')}
                        className="text-[var(--text3)] hover:text-[var(--red)] p-1.5 rounded-lg hover:bg-[var(--red)]/10 transition-colors"
                        title="Delete PYP"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
