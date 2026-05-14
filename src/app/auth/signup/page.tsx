'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Eye, EyeOff, Zap } from 'lucide-react';

const ALLOWED_DOMAINS = new Set(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com']);

function validateEmail(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  if (!ALLOWED_DOMAINS.has(domain)) {
    return 'Only Gmail, Outlook, Hotmail, Yahoo, or iCloud addresses are accepted.';
  }
  return null;
}

type Step = 'form' | 'confirm';

export default function SignupPage() {
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Please fill in all fields.');
    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (!termsChecked) return setError('You must agree to the Terms of Use and Privacy Policy.');

    setLoading(true);
    let data, error;
    // Retry up to 2x on gateway errors
    for (let attempt = 1; attempt <= 2; attempt++) {
      ({ data, error } = await supabase.auth.signUp({ email, password }));
      if (!error) break;
      const isTimeout = error.status === 504 || error.status === 502 || error.message?.includes('timeout');
      if (isTimeout && attempt < 2) await new Promise(r => setTimeout(r, 2000));
      else break;
    }
    setLoading(false);
    if (error) return setError(error!.message);
    setStep('confirm');
  };

  const handleResend = async () => {
    setResendLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResendLoading(false);
    setResendMsg(error ? error.message : '✅ Email resent! Check your inbox.');
  };

  if (step === 'confirm') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a10] p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
          <p className="text-sm text-white/40 mb-6">
            We sent a confirmation link to <span className="text-[#00f0ff]">{email}</span>. Click it to activate your account, then come back and sign in.
          </p>
          {resendMsg && <p className="text-sm text-[#00e5a0] mb-4">{resendMsg}</p>}
          <button onClick={handleResend} disabled={resendLoading} className="text-sm text-[#00f0ff]/60 hover:text-[#00f0ff] transition-colors underline underline-offset-2">
            {resendLoading ? 'Sending…' : 'Resend confirmation email'}
          </button>
          <div className="mt-6">
            <Link href="/auth/login" className="text-sm text-white/30 hover:text-white/60 transition-colors">← Back to login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a10] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#00f0ff]" />
            </div>
            <span className="font-[family-name:var(--font-bebas)] text-2xl tracking-widest text-white">ZEROday</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-sm text-white/40 mt-1">Start your journey to the top</p>
        </div>

        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 font-[family-name:var(--font-mono)] tracking-widest uppercase mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full bg-[#18181f] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00f0ff]/40 focus:ring-1 focus:ring-[#00f0ff]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 font-[family-name:var(--font-mono)] tracking-widest uppercase mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-[#18181f] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00f0ff]/40 focus:ring-1 focus:ring-[#00f0ff]/20 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={termsChecked}
                onChange={e => setTermsChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#00f0ff] rounded"
              />
              <span className="text-xs text-white/40 leading-relaxed">
                I agree to the{' '}
                <Link href="/terms-of-use" target="_blank" className="text-[#00f0ff]/70 hover:text-[#00f0ff]">Terms of Use</Link>
                {' '}and{' '}
                <Link href="/privacy-policy" target="_blank" className="text-[#00f0ff]/70 hover:text-[#00f0ff]">Privacy Policy</Link>
              </span>
            </label>

            {error && (
              <p className="text-xs text-[#ff4d6a] bg-[#ff4d6a]/10 border border-[#ff4d6a]/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#00f0ff] text-black font-bold text-sm tracking-wide hover:bg-[#00f0ff]/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-white/30 mt-5">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#00f0ff]/70 hover:text-[#00f0ff] transition-colors font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
