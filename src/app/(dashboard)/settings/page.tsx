'use client';

import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Loader2, Camera, Save, User, GraduationCap, Calendar, Palette } from 'lucide-react';
import { useDialog } from '@/components/DialogProvider';

export default function SettingsPage() {
  const { profile, loading: profileLoading, refetch } = useProfile();
  const [name, setName] = useState('');
  const [userClass, setUserClass] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [bio, setBio] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useDialog();

  const themes = [
    { id: 'dark', name: 'DARK', preview: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
    { id: 'light', name: 'LIGHT', preview: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' },
    { id: 'neon', name: 'NEON', preview: 'linear-gradient(135deg, #000000 0%, #0d0d0d 100%)' },
    { id: 'minimal', name: 'MINIMAL', preview: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)' },
    { id: 'aurora', name: 'AURORA', preview: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
    { id: 'sunset', name: 'SUNSET', preview: 'linear-gradient(135deg, #1a0f0f 0%, #2a1a1a 100%)' },
  ] as const;

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setUserClass(profile.class || '');
      setTargetYear(profile.target_year || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', profile.id);
      if (error) throw error;
      refetch();
      toast('Profile photo updated!', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to upload photo', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          class: userClass,
          target_year: targetYear,
          bio
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast('Profile updated successfully!', 'success');
      refetch();
    } catch (err) {
      console.error(err);
      toast('Failed to update profile. Make sure "bio" column exists.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile?.email) return;
    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      toast('Password reset link sent to your email!', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  return (
    <div className="an-content max-w-[1600px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Profile */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-bg-2 border border-white/5 rounded-2xl p-6 shadow-xl h-full">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 border-b border-[#ffffff08] pb-4">
              Profile
            </h2>
            
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#ffffff10] bg-[#ffffff05]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-gray-700">👤</div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-300 hover:text-white cursor-pointer transition-colors font-medium">
                    <Camera size={14} /> Change Photo
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </label>
                  <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-wider">JPEG / PNG / WebP · Max 1MB</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:border-purple transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Class</label>
                    <select 
                      value={userClass}
                      onChange={(e) => setUserClass(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:border-purple transition-all outline-none appearance-none"
                    >
                      <option value="" disabled>Select Class</option>
                      <option value="11th">Class 11</option>
                      <option value="12th">Class 12</option>
                      <option value="dropper">Dropper</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Target Year</label>
                    <select 
                      value={targetYear}
                      onChange={(e) => setTargetYear(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:border-purple transition-all outline-none appearance-none"
                    >
                      <option value="" disabled>Year</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Tell us about your journey..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:border-purple transition-all outline-none resize-none"
                  />
                </div>

                <button 
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Theme */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-bg-2 border border-white/5 rounded-2xl p-6 shadow-xl h-full">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 border-b border-[#ffffff08] pb-4">
              Theme
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`group relative flex flex-col items-center justify-center p-1 rounded-2xl border-2 transition-all ${
                    theme === t.id ? 'border-[#7c3aed] bg-[#7c3aed08]' : 'border-transparent bg-[#ffffff03] hover:bg-[#ffffff08]'
                  }`}
                >
                  <div 
                    className="w-full aspect-[4/3] rounded-xl mb-2 flex flex-col overflow-hidden shadow-inner"
                    style={{ background: t.preview }}
                  >
                    <div className="mt-auto bg-black/40 backdrop-blur-sm p-3 text-[9px] font-black tracking-widest text-white text-center">
                      {t.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Account & Security */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-bg-2 border border-white/5 rounded-2xl p-6 shadow-xl h-full">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 border-b border-[#ffffff08] pb-4">
              Account & Security
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Registered Email</label>
                <div className="w-full bg-[#ffffff03] border border-[#ffffff08] rounded-xl px-4 py-3 text-sm text-gray-500 font-mono">
                  {profile?.email}
                </div>
                <p className="text-[9px] text-gray-700 mt-2 italic">* Email changes are restricted for security reasons.</p>
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  className="w-full bg-[#ffffff05] border border-[#ffffff10] hover:bg-[#ffffff08] text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {isResettingPassword ? <Loader2 size={14} className="animate-spin" /> : 'Change Password'}
                </button>

                <div className="grid grid-cols-1 gap-3 pt-4 border-t border-[#ffffff05]">
                  <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#ff4d6a08] group transition-all">
                    <div className="text-[10px] font-bold text-gray-500 group-hover:text-[#ff4d6a] transition-colors uppercase tracking-widest mb-1">Request Account Deletion</div>
                    <div className="text-[9px] text-gray-700">Set as coming soon</div>
                  </button>

                  <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-cyan-500/05 group transition-all">
                    <div className="text-[10px] font-bold text-gray-500 group-hover:text-cyan-400 transition-colors uppercase tracking-widest mb-1">Request Collected Data</div>
                    <div className="text-[9px] text-gray-700">Set as coming soon</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
