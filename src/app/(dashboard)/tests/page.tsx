'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { 
  Award, 
  Clock, 
  BookOpen, 
  Plus, 
  Zap, 
  Search, 
  Loader2, 
  ArrowRight,
  ClipboardList,
  AlertTriangle,
  X,
  BookMarked,
  FileText
} from 'lucide-react';

interface MockTest {
  id: string;
  title: string;
  exam_type: string;
  duration: number;
  total_questions: number;
  total_marks: number;
  status: string;
  is_pyp: boolean;
  year?: number;
  shift?: string;
  subjects: string[];
  created_at: string;
}

export default function TestsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'mocks' | 'pyps'>('mocks');
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<MockTest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [selectedTestForAttempt, setSelectedTestForAttempt] = useState<MockTest | null>(null);
  const [isStartingAttempt, setIsStartingAttempt] = useState(false);

  const [activeAttempts, setActiveAttempts] = useState<Map<string, string>>(new Map());
  const [completedAttempts, setCompletedAttempts] = useState<Map<string, string>>(new Map());

  // Fetch tests
  const fetchTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: attempts } = await supabase
          .from('mock_test_live_attempts')
          .select('id, test_id, completed')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        
        const activeMap = new Map<string, string>();
        const completedMap = new Map<string, string>();
        
        (attempts || []).forEach(a => {
          if (a.completed) {
            if (!completedMap.has(a.test_id)) {
              completedMap.set(a.test_id, a.id);
            }
          } else {
            if (!activeMap.has(a.test_id)) {
              activeMap.set(a.test_id, a.id);
            }
          }
        });
        
        setActiveAttempts(activeMap);
        setCompletedAttempts(completedMap);
      }
    } catch (err: any) {
      console.error('Error fetching tests:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  // Filtered lists
  const filteredMocks = tests.filter(t => 
    !t.is_pyp && 
    (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     t.exam_type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPyps = tests.filter(t => 
    t.is_pyp && 
    (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     t.exam_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
     t.year?.toString().includes(searchQuery) ||
     t.shift?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Format Exam badge
  const formatExamType = (type: string) => {
    if (type === 'jee-main') return 'JEE Main';
    if (type === 'jee-advanced') return 'JEE Advanced';
    if (type === 'neet') return 'NEET UG';
    if (type === 'bitsat') return 'BITSAT';
    if (type === 'mht-cet') return 'MHT CET';
    return type.toUpperCase();
  };

  return (
    <div className="an-content max-w-6xl mx-auto py-8 px-4 sm:px-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2.5 text-[var(--accent)] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 font-mono">
            <ClipboardList size={14} /> Active Testing Modules
          </div>
          <h1 className="text-4xl font-black font-[family-name:var(--font-bebas)] tracking-wider text-[var(--text)] mb-2">
            🏆 TEST CENTER
          </h1>
          <p className="text-xs text-[var(--text2)] max-w-2xl leading-relaxed">
            Verify your skills with authentic exam simulators. Attempt official past papers or participate in curated mock testing sessions designed to boost your percentile.
          </p>
        </div>
        
        <button
          onClick={() => setShowComingSoonModal(true)}
          className="w-full md:w-auto bg-[var(--bg2)] hover:bg-[var(--bg3)] border border-[var(--border)] hover:border-[var(--accent)]/50 text-[var(--text)] font-bold py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-mono group"
        >
          <Plus size={16} className="text-[var(--accent)] group-hover:rotate-90 transition-transform" />
          Create New Mock Test
        </button>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-8">
        {/* Navigation Tabs */}
        <div className="flex p-1 bg-[var(--bg2)] border border-[var(--border)] rounded-2xl md:w-fit">
          <button
            onClick={() => setActiveTab('mocks')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all font-mono ${
              activeTab === 'mocks'
                ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text2)] hover:text-[var(--text)]'
            }`}
          >
            <Clock size={14} />
            Mock Tests
            <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded font-bold ${activeTab === 'mocks' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--bg3)] text-[var(--text2)]'}`}>
              {filteredMocks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pyps')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all font-mono ${
              activeTab === 'pyps'
                ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text2)] hover:text-[var(--text)]'
            }`}
          >
            <BookOpen size={14} />
            Previous Year Papers
            <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded font-bold ${activeTab === 'pyps' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--bg3)] text-[var(--text2)]'}`}>
              {filteredPyps.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text3)]" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'mocks' ? 'Search mock tests...' : 'Search by year, shift, or exam...'}
            className="w-full bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/40 focus:border-[var(--accent)] rounded-2xl pl-11 pr-4 py-3 text-sm text-[var(--text)] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Main Lists */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)] mb-3" />
          <p className="text-xs uppercase tracking-widest text-[var(--text2)] font-mono">Loading active simulators...</p>
        </div>
      ) : activeTab === 'mocks' ? (
        // Mock Tests List
        filteredMocks.length === 0 ? (
          <div className="text-center py-20 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
            <Award className="w-12 h-12 text-[var(--text3)] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[var(--text2)] font-mono">No mock tests match your filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMocks.map((mock) => (
              <div 
                key={mock.id}
                className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-3xl p-6 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-lg relative overflow-hidden group"
              >
                {/* Accent glow on hover */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent)]/5 blur-2xl group-hover:bg-[var(--accent)]/10 rounded-full transition-all" />
                
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-[var(--bg3)] text-[var(--accent)] border border-[var(--accent)]/15 px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider font-mono">
                      {formatExamType(mock.exam_type)}
                    </span>
                    <span className="bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/15 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider font-mono">
                      LIVE
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors mb-3 leading-snug">
                    {mock.title}
                  </h3>
                  
                  {/* Stats list */}
                  <div className="space-y-2.5 mb-6 pt-3 border-t border-[var(--border)]/60 text-xs text-[var(--text2)]">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-[var(--text3)]" />
                      <span><strong>{mock.total_questions}</strong> Questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-[var(--text3)]" />
                      <span><strong>{mock.total_marks}</strong> Max Marks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[var(--text3)]" />
                      <span><strong>{mock.duration}</strong> Minutes</span>
                    </div>
                  </div>
                </div>

                {activeAttempts.has(mock.id) ? (
                  <button
                    onClick={() => setSelectedTestForAttempt(mock)}
                    className="w-full py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest font-mono border bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500 hover:text-black hover:border-transparent font-extrabold"
                  >
                    Resume Test
                    <ArrowRight size={14} />
                  </button>
                ) : completedAttempts.has(mock.id) ? (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => router.push(`/analysis/${completedAttempts.get(mock.id)}`)}
                      className="flex-1 py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider font-mono border border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)] hover:text-black hover:border-transparent"
                    >
                      Analysis
                    </button>
                    <button
                      onClick={() => setSelectedTestForAttempt(mock)}
                      className="flex-1 py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider font-mono border border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] hover:bg-[var(--accent)] hover:text-black hover:border-transparent hover:font-bold"
                    >
                      Reattempt
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedTestForAttempt(mock)}
                    className="w-full py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest font-mono border bg-[var(--bg2)] hover:bg-[var(--accent)] text-[var(--text2)] hover:text-black hover:font-bold border border-[var(--border)] hover:border-transparent"
                  >
                    Attempt Now
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        // Previous Year Papers List
        filteredPyps.length === 0 ? (
          <div className="text-center py-20 bg-[var(--card)] border border-[var(--border)] rounded-3xl">
            <BookMarked className="w-12 h-12 text-[var(--text3)] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[var(--text2)] font-mono">No previous year papers match your filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPyps.map((pyp) => (
              <div 
                key={pyp.id}
                className="bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-3xl p-6 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-lg relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent)]/5 blur-2xl group-hover:bg-[var(--accent)]/10 rounded-full transition-all" />
                
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className="bg-[var(--bg3)] text-[var(--accent)] border border-[var(--accent)]/15 px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider font-mono">
                      {formatExamType(pyp.exam_type)}
                    </span>
                    {pyp.year && (
                      <span className="bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)] px-2 py-0.5 rounded-lg text-[9px] font-bold font-mono">
                        {pyp.year}
                      </span>
                    )}
                    {pyp.shift && (
                      <span className="bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)] px-2 py-0.5 rounded-lg text-[9px] font-bold font-mono truncate max-w-[120px]" title={pyp.shift}>
                        {pyp.shift}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors mb-3 leading-snug">
                    {pyp.title}
                  </h3>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--border)]/60 mb-4 text-center">
                    <div>
                      <div className="text-base font-bold text-[var(--text)]">{pyp.total_questions}</div>
                      <div className="text-[9px] text-[var(--text3)] uppercase tracking-wider font-mono">Questions</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-[var(--text)]">{pyp.total_marks}</div>
                      <div className="text-[9px] text-[var(--text3)] uppercase tracking-wider font-mono">Marks</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-[var(--text)]">{pyp.duration}</div>
                      <div className="text-[9px] text-[var(--text3)] uppercase tracking-wider font-mono">Minutes</div>
                    </div>
                  </div>

                  {/* Subjects Included */}
                  {pyp.subjects && pyp.subjects.length > 0 && (
                    <div className="mb-6">
                      <div className="text-[9px] font-bold text-[var(--text3)] uppercase tracking-widest mb-1.5 font-mono">Subjects Included:</div>
                      <div className="flex flex-wrap gap-1">
                        {pyp.subjects.map(sub => (
                          <span key={sub} className="bg-[var(--bg2)] text-[var(--text2)] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {activeAttempts.has(pyp.id) ? (
                  <button
                    onClick={() => setSelectedTestForAttempt(pyp)}
                    className="w-full py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest font-mono border bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500 hover:text-black hover:border-transparent font-extrabold"
                  >
                    Resume Test
                    <ArrowRight size={14} />
                  </button>
                ) : completedAttempts.has(pyp.id) ? (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => router.push(`/analysis/${completedAttempts.get(pyp.id)}`)}
                      className="flex-1 py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider font-mono border border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)] hover:text-black hover:border-transparent"
                    >
                      Analysis
                    </button>
                    <button
                      onClick={() => setSelectedTestForAttempt(pyp)}
                      className="flex-1 py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider font-mono border border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] hover:bg-[var(--accent)] hover:text-black hover:border-transparent hover:font-bold"
                    >
                      Reattempt
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedTestForAttempt(pyp)}
                    className="w-full py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest font-mono border bg-[var(--bg2)] hover:bg-[var(--accent)] text-[var(--text2)] hover:text-black hover:font-bold border border-[var(--border)] hover:border-transparent"
                  >
                    Attempt Now
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* CREATE MOCK TEST COMING SOON MODAL */}
      {showComingSoonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowComingSoonModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] hover:text-[var(--text)] transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mx-auto mb-4">
                <Plus size={24} />
              </div>
              <h3 className="text-2xl font-bold font-[family-name:var(--font-bebas)] tracking-wider mb-2">
                CREATE CUSTOM TEST
              </h3>
              <span className="inline-block bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest font-mono mb-4">
                Coming Soon
              </span>
              <p className="text-xs text-[var(--text2)] leading-relaxed mb-6">
                Custom mock test generation capabilities (AI-guided paper creation, specific syllabus focus, and personalized difficulty scaling) are scheduled for Phase 2 integration.
              </p>
              <button
                onClick={() => setShowComingSoonModal(false)}
                className="w-full bg-[var(--accent)] hover:brightness-110 text-black font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest font-mono"
              >
                Acknowledge Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATTEMPT NOW CONFIRMATION MODAL */}
      {selectedTestForAttempt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setSelectedTestForAttempt(null);
                setIsStartingAttempt(false);
              }}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)] hover:text-[var(--text)] transition-colors"
            >
              <X size={16} />
            </button>

            <div>
              <div className="flex items-center gap-2 text-[var(--accent)] text-[9px] font-bold uppercase tracking-[0.15em] mb-2 font-mono">
                <Zap size={12} /> Simulation Initialization
              </div>
              
              <h3 className="text-xl font-bold text-[var(--text)] mb-4 leading-tight">
                {selectedTestForAttempt.title}
              </h3>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                <span className="bg-[var(--bg3)] text-[var(--accent)] px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider font-mono">
                  {formatExamType(selectedTestForAttempt.exam_type)}
                </span>
                {selectedTestForAttempt.is_pyp ? (
                  <span className="bg-[var(--bg3)] text-[var(--text2)] px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider font-mono">
                    Previous Year Paper
                  </span>
                ) : (
                  <span className="bg-[var(--bg3)] text-[var(--text2)] px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider font-mono">
                    Mock Test Series
                  </span>
                )}
                {selectedTestForAttempt.year && (
                  <span className="bg-[var(--bg3)] text-[var(--text2)] px-2 py-0.5 rounded-lg text-[9px] font-bold font-mono">
                    Year {selectedTestForAttempt.year}
                  </span>
                )}
              </div>

              {/* Details table */}
              <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-2xl p-4 space-y-3 mb-6 text-xs text-[var(--text)]">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text2)] font-mono">Questions:</span>
                  <span className="font-bold">{selectedTestForAttempt.total_questions} MCQs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text2)] font-mono">Max Marks:</span>
                  <span className="font-bold">{selectedTestForAttempt.total_marks} Marks</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text2)] font-mono">Allocated Time:</span>
                  <span className="font-bold">{selectedTestForAttempt.duration} Minutes ({Math.floor(selectedTestForAttempt.duration / 60)} hrs)</span>
                </div>
                {selectedTestForAttempt.subjects && selectedTestForAttempt.subjects.length > 0 && (
                  <div className="flex justify-between items-start pt-2 border-t border-[var(--border)]">
                    <span className="text-[var(--text2)] font-mono">Syllabus Scope:</span>
                    <span className="font-bold text-right max-w-[200px] truncate" title={selectedTestForAttempt.subjects.join(', ')}>
                      {selectedTestForAttempt.subjects.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="border-t border-[var(--border)] pt-4 mb-6">
                <h4 className="text-[10px] font-bold text-[var(--text3)] uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-[var(--orange)]" /> Exam Rules &amp; Protocols
                </h4>
                <ul className="text-[10.5px] text-[var(--text2)] space-y-1.5 pl-4 list-disc leading-relaxed">
                  <li>Ensure a stable network connection before starting.</li>
                  <li>Simulated marking schemes will apply (+4 for correct, -1 for incorrect answers).</li>
                  <li>Once started, the test timer cannot be paused.</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedTestForAttempt(null)}
                  className="flex-1 bg-[var(--bg2)] hover:bg-[var(--bg3)] text-[var(--text)] font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedTestForAttempt) {
                      window.open(`/exam/${selectedTestForAttempt.id}/instructions`, '_blank', 'noopener,noreferrer');
                      setSelectedTestForAttempt(null);
                    }
                  }}
                  className="flex-1 bg-[var(--accent)] hover:brightness-110 text-black font-extrabold py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest font-mono flex items-center justify-center gap-1"
                >
                  {activeAttempts.has(selectedTestForAttempt.id) ? 'Resume Simulation' : 'Start Simulation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
