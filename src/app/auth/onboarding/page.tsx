'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useDialog } from '@/components/DialogProvider';
import { 
  Camera, 
  Loader2, 
  User, 
  GraduationCap, 
  Calendar, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Zap,
  Check
} from 'lucide-react';

const DEFAULT_AVATARS = [
  { id: 'scholar', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=scholar&backgroundColor=0f172a' },
  { id: 'quantum', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=quantum&backgroundColor=1e1b4b' },
  { id: 'astro', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=astro&backgroundColor=022c22' },
  { id: 'nebula', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=nebula&backgroundColor=311042' }
];

export default function OnboardingPage() {
  const { profile, loading: profileLoading, refetch } = useProfile();
  const router = useRouter();
  const { toast } = useDialog();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATARS[0].url);
  
  const [userClass, setUserClass] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [bio, setBio] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already onboarded
  useEffect(() => {
    if (!profileLoading && profile) {
      const hasOnboarded =
        profile.class &&
        profile.class.toLowerCase() !== 'none' &&
        profile.class !== '' &&
        profile.target_year &&
        profile.target_year.toLowerCase() !== 'none' &&
        profile.target_year !== '' &&
        profile.name &&
        profile.name.trim() !== '';

      if (hasOnboarded) {
        router.push('/dashboard');
      } else {
        // Pre-fill name and avatar if available from oauth/signup
        if (profile.name && !name) {
          setName(profile.name);
        }
        if (profile.avatar_url && avatarUrl === DEFAULT_AVATARS[0].url) {
          setAvatarUrl(profile.avatar_url);
        }
      }
    }
  }, [profile, profileLoading, router]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setAvatarUrl(url);
      toast('Custom profile photo loaded!', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNextStep = () => {
    if (!name.trim()) {
      return toast('Please enter your full name.', 'warning');
    }
    setStep(2);
  };

  const handleFinish = async () => {
    if (!userClass) {
      return toast('Please select your academic class.', 'warning');
    }
    if (!targetYear) {
      return toast('Please select your target exam year.', 'warning');
    }
    if (!profile) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          name: name.trim(),
          email: profile.email || '',
          avatar_url: avatarUrl,
          class: userClass,
          target_year: targetYear,
          bio: bio.trim() || 'A fresh mind ready to solve.'
        });

      if (error) throw error;

      toast('Calibration complete! Welcome aboard.', 'success');
      await refetch();
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to complete onboarding profile', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-1">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#00f0ff] mx-auto mb-4" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Synchronizing Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-1 p-4 relative overflow-hidden">
      {/* Optimized background gradients to run at smooth 60+ FPS without layout paint lag */}
      <div 
        className="fixed top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#7c3aed]/05 blur-[120px] pointer-events-none" 
        style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }} 
      />
      <div 
        className="fixed bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#00f0ff]/03 blur-[120px] pointer-events-none" 
        style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }} 
      />
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.004)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.004)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 bg-white/[0.02] border border-white/[0.07] px-4 py-1.5 rounded-full">
            <Zap className="w-4 h-4 text-[#00f0ff] animate-pulse" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#00f0ff]">
              Atoms Protocol Initializer
            </span>
          </div>
          <h1 className="text-4xl font-[family-name:var(--font-bebas)] tracking-wider text-foreground">
            CALIBRATE YOUR IDENTITY
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
            Configure your study credentials to unlock the cognitive solving suite.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8 px-4 max-w-md mx-auto">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all ${
              step === 1 
                ? 'bg-[#00f0ff]/10 border-[#00f0ff] text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.25)]' 
                : 'bg-green/10 border-green text-green'
            }`}>
              {step > 1 ? <Check size={14} /> : '01'}
            </div>
            <span className={`text-[8px] font-bold uppercase tracking-widest ${step === 1 ? 'text-[#00f0ff]' : 'text-green/70'}`}>Identity</span>
          </div>
          
          <div className={`flex-1 h-[2px] mx-4 transition-all duration-300 ${step > 1 ? 'bg-green' : 'bg-white/10'}`} />

          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition-all ${
              step === 2 
                ? 'bg-[#7c3aed]/10 border-[#7c3aed] text-[#7c3aed] shadow-[0_0_15px_rgba(124,58,237,0.25)]' 
                : 'bg-white/5 border-white/10 text-white/40'
            }`}>
              02
            </div>
            <span className={`text-[8px] font-bold uppercase tracking-widest ${step === 2 ? 'text-[#7c3aed]' : 'text-white/20'}`}>Academics</span>
          </div>
        </div>

        {/* Onboarding Card */}
        <div className="bg-bg-2/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground mb-1">Choose your avatar</h3>
                <p className="text-xs text-muted-foreground">Select a pre-calibrated node or upload a custom image transmission.</p>
              </div>

              {/* Avatar Selection Area */}
              <div className="flex flex-col items-center gap-6">
                
                {/* Main Avatar Preview */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-bg-3 flex items-center justify-center relative shadow-lg shadow-black/40">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={36} className="text-muted-foreground/30" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-full">
                        <Loader2 className="animate-spin text-[#00f0ff] w-6 h-6" />
                      </div>
                    )}
                  </div>
                  
                  {/* File Upload Trigger Button */}
                  <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-black flex items-center justify-center cursor-pointer transition-all shadow-md active:scale-95">
                    <Camera size={14} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleAvatarFileChange} 
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {/* Pre-calibrated Quick Options */}
                <div className="flex justify-center gap-4">
                  {DEFAULT_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => setAvatarUrl(av.url)}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                        avatarUrl === av.url 
                          ? 'border-[#00f0ff] scale-105 shadow-[0_0_10px_rgba(0,240,255,0.4)]' 
                          : 'border-border opacity-55 hover:opacity-100'
                      }`}
                    >
                      <img src={av.url} alt={av.id} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name Input */}
              <div className="space-y-2">
                <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                  Full Name / Operator Alias
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground/30">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-bg-3 border border-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-[#00f0ff]/40 focus:ring-1 focus:ring-[#00f0ff]/20 transition-all"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleNextStep}
                className="w-full py-4 rounded-xl bg-[#00f0ff] hover:bg-[#00f0ff]/90 active:scale-[0.98] text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/10"
              >
                Proceed to Academics <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* STEP 2: ACADEMIC FOCUS */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground mb-1">Academic Credentials</h3>
                <p className="text-xs text-muted-foreground">Select your active education credentials for optimal dashboard calibration.</p>
              </div>

              <div className="space-y-4">
                {/* Academic Class */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                    Academic Class
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground/30">
                      <GraduationCap size={16} />
                    </div>
                    <select
                      value={userClass}
                      onChange={(e) => setUserClass(e.target.value)}
                      className="w-full bg-bg-3 border border-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/40 transition-all appearance-none"
                    >
                      <option value="" disabled className="bg-bg-2 text-foreground">Select your class</option>
                      <option value="11th" className="bg-bg-2 text-foreground">Class 11 (High School Junior)</option>
                      <option value="12th" className="bg-bg-2 text-foreground">Class 12 (High School Senior)</option>
                      <option value="dropper" className="bg-bg-2 text-foreground">Dropper / Repeater</option>
                    </select>
                  </div>
                </div>

                {/* Target Exam Year */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                    Target Exam Year
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground/30">
                      <Calendar size={16} />
                    </div>
                    <select
                      value={targetYear}
                      onChange={(e) => setTargetYear(e.target.value)}
                      className="w-full bg-bg-3 border border-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/40 transition-all appearance-none"
                    >
                      <option value="" disabled className="bg-bg-2 text-foreground">Select Target Year</option>
                      <option value="2025" className="bg-bg-2 text-foreground">2025</option>
                      <option value="2026" className="bg-bg-2 text-foreground">2026</option>
                      <option value="2027" className="bg-bg-2 text-foreground">2027</option>
                    </select>
                  </div>
                </div>

                {/* Profile Bio */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                    Personal Bio / Study Goal (Optional)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="E.g. Aspiring IITian, calibrating mathematical matrices."
                    rows={3}
                    className="w-full bg-bg-3 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-[#7c3aed]/40 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-4 rounded-xl border border-border hover:bg-bg-3 active:scale-[0.98] text-foreground font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                
                <button
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Synchronizing...
                    </>
                  ) : (
                    <>
                      Initialize Command Center <Sparkles size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
