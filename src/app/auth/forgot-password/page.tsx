'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Mail, Zap, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) return setError('Please enter your email.');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (resetError) setError(resetError.message);
      else setSuccess(true);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a10] p-4 font-[family-name:var(--font-grotesk)]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#00f0ff]" />
            </div>
            <span className="font-[family-name:var(--font-bebas)] text-2xl tracking-widest text-white">ZEROday</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-sm text-white/40 mt-1">We'll send a recovery link to your email</p>
        </div>

        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 shadow-2xl">
          {success ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#00e5a0]/10 border border-[#00e5a0]/20 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-[#00e5a0]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">Check your email</h2>
                <p className="text-sm text-white/40 leading-relaxed">
                  We've sent a password reset link to <span className="text-[#00f0ff] font-medium">{email}</span>.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="block w-full py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.06] transition-all"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-xs text-white/40 font-[family-name:var(--font-mono)] tracking-widest uppercase mb-1.5">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full bg-[#18181f] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00f0ff]/40 focus:ring-1 focus:ring-[#00f0ff]/20 transition-all"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-[#ff4d6a] bg-[#ff4d6a]/10 border border-[#ff4d6a]/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#00f0ff] text-black font-bold text-sm tracking-wide hover:bg-[#00f0ff]/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Sending link…' : 'Send Reset Link'}
              </button>

              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
