'use client';

import Link from 'next/link';
import { ArrowLeft, Lock, ShieldAlert, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-[#e8eaf6] font-sans antialiased selection:bg-[#7c6fff]/30 selection:text-white relative overflow-hidden pb-12">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[80%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,111,255,0.07)_0%,transparent_60%)]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[60%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,212,255,0.05)_0%,transparent_60%)]" />
      </div>

      {/* TOP NAV */}
      <nav className="sticky top-0 z-50 bg-[#050508]/92 backdrop-blur-md border-b border-[#7c6fff]/10 px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl tracking-wider bg-gradient-to-r from-[#7c6fff] to-[#00d4ff] bg-clip-text text-transparent select-none font-bold">
          SolvingMind
        </Link>
        <Link href="/auth/signup" className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#8b90a8] hover:text-[#00d4ff] border border-[#7c6fff]/10 hover:border-[#00d4ff]/30 rounded-lg px-4 py-2 bg-[#00d4ff]/0 hover:bg-[#00d4ff]/5 transition-all">
          <ArrowLeft size={14} strokeWidth={2.5} />
          Back to Signup
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative z-10 px-6 pt-16 pb-8 text-center max-w-4xl mx-auto">
        <div className="inline-block text-[10px] font-bold font-mono tracking-widest uppercase text-[#00d4ff] bg-[#00d4ff]/8 border border-[#00d4ff]/20 rounded-full px-4 py-1.5 mb-6">
          Legal Document
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-wide bg-gradient-to-r from-[#7c6fff] to-[#00d4ff] bg-clip-text text-transparent leading-none mb-4 uppercase">
          Privacy Policy
        </h1>
        <div className="flex items-center justify-center gap-4 flex-wrap text-[11px] font-mono text-[#3a3d52] tracking-wider">
          <span>PLATFORM: <strong className="text-[#8b90a8] font-medium">SolvingMind</strong></span>
          <div className="w-1 h-1 rounded-full bg-[#3a3d52]" />
          <span>EFFECTIVE: <strong className="text-[#8b90a8] font-medium">12-May-2026</strong></span>
          <div className="w-1 h-1 rounded-full bg-[#3a3d52]" />
          <span>UPDATED: <strong className="text-[#8b90a8] font-medium">12-May-2026</strong></span>
        </div>
      </section>

      {/* CONTENT */}
      <div className="relative z-10 max-w-[820px] mx-auto px-6">
        
        {/* TABLE OF CONTENTS */}
        <div className="bg-[#0c0d16] border border-[#7c6fff]/10 rounded-2xl p-6 mb-10 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-gradient-to-b before:from-[#7c6fff] before:to-[#00d4ff]">
          <div className="text-[10px] font-bold font-mono tracking-widest text-[#7c6fff] uppercase mb-4">// Table of Contents</div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {[
              { num: '01', title: 'Information We Collect', id: 's1' },
              { num: '02', title: 'How We Use Information', id: 's2' },
              { num: '03', title: 'AI-Based Features', id: 's3' },
              { num: '04', title: 'Cookies & Local Storage', id: 's4' },
              { num: '05', title: 'Data Sharing & Third Parties', id: 's5' },
              { num: '06', title: 'Data Security', id: 's6' },
              { num: '07', title: 'Data Retention', id: 's7' },
              { num: '08', title: 'Children & Minors', id: 's8' },
              { num: '09', title: 'User Rights', id: 's9' },
              { num: '10', title: 'Third-Party Links', id: 's10' },
              { num: '11', title: 'Changes to Policy', id: 's11' },
              { num: '12', title: 'Contact Us', id: 's12' },
            ].map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="inline-flex items-center gap-2.5 text-xs text-[#8b90a8] hover:text-[#00d4ff] py-1 transition-colors">
                  <span className="font-mono text-[10px] text-[#3a3d52]">{item.num}</span>
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Intro */}
        <div className="mb-10 text-sm leading-relaxed text-[#8b90a8]">
          <p>
            Welcome to <strong>SolvingMind</strong> (&quot;Platform&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). This Privacy Policy explains how SolvingMind collects, uses, stores, and protects user information when you access our website, web application, mobile application, and related educational services. By using SolvingMind, you agree to the practices described in this Privacy Policy.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          
          {/* Section 1 */}
          <div id="s1" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Information We Collect</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              We collect limited information necessary to provide and improve our educational services.
            </p>

            <div className="mt-4">
              <h3 className="text-[10px] font-bold font-mono tracking-widest text-[#00d4ff] uppercase mb-2">A. Account Information</h3>
              <p className="text-xs text-[#8b90a8] leading-relaxed">When you create an account, we may collect:</p>
              <ul className="list-none space-y-1.5 py-3 pl-1">
                {['Full name', 'Email address', 'Profile photo (if provided)', 'Authentication details through third-party login providers'].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-[#8b90a8]">
                    <span className="text-[#7c6fff] text-xs font-bold shrink-0">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <h3 className="text-[10px] font-bold font-mono tracking-widest text-[#00d4ff] uppercase mb-2">B. Educational & Usage Information</h3>
              <p className="text-xs text-[#8b90a8] leading-relaxed">While using the platform, we may collect:</p>
              <ul className="list-none space-y-1.5 py-3 pl-1">
                {['Questions solved, mock test performance, accuracy statistics', 'Study progress and time spent on practice sessions', 'Subject and chapter preferences', 'Streaks, rankings, and leaderboard data'].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-[#8b90a8]">
                    <span className="text-[#7c6fff] text-xs font-bold shrink-0">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <h3 className="text-[10px] font-bold font-mono tracking-widest text-[#00d4ff] uppercase mb-2">C. Payment Information</h3>
              <p className="text-xs text-[#8b90a8] leading-relaxed">Payments are processed securely through third-party gateways such as Razorpay.</p>
              <div className="flex items-start gap-3 bg-[#00e5a0]/5 border border-[#00e5a0]/15 rounded-xl p-4 my-4">
                <Lock className="text-[#00e5a0] w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs text-[#00e5a0]/85 leading-relaxed m-0">
                  We do <strong>not</strong> store card numbers, CVV, banking passwords, or sensitive payment credentials. We may store: transaction ID, subscription status, payment timestamp, and purchased plan information.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-[10px] font-bold font-mono tracking-widest text-[#00d4ff] uppercase mb-2">D. Device & Technical Information</h3>
              <p className="text-xs text-[#8b90a8] leading-relaxed">
                We may collect limited technical information: browser type, device type, operating system, app version, and crash/error logs. SolvingMind does not intentionally collect or store users&apos; IP addresses for tracking purposes.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div id="s2" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                2
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">How We Use Information</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              We use collected information for the following purposes:
            </p>
            <ul className="list-none space-y-1.5 py-2 pl-1">
              {[
                'Account authentication and session management',
                'Providing and personalizing educational services',
                'Tracking study progress and generating performance analytics',
                'Improving platform functionality and user experience',
                'Customer support and fraud prevention',
                'Payment verification and subscription management'
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#8b90a8]">
                  <span className="text-[#7c6fff] text-xs font-bold shrink-0">›</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#8b90a8] leading-relaxed mt-4">
              We may also use aggregated and anonymized data for analytics and product improvement.
            </p>
          </div>

          {/* Section 3 */}
          <div id="s3" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                3
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">AI-Based Features</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              SolvingMind may use AI-powered systems to provide learning assistance, question explanations, study insights, personalized recommendations, and performance analysis.
            </p>
            <div className="flex items-start gap-3 bg-[#ff3b5c]/5 border border-[#ff3b5c]/15 rounded-xl p-4 my-4">
              <ShieldAlert className="text-[#ff3b5c] w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs text-[#ff8296]/90 leading-relaxed m-0">
                AI-generated responses are intended for educational assistance only and may occasionally contain inaccuracies. Users are advised to independently verify important academic information.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div id="s4" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                4
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Cookies & Local Storage</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-3">
              SolvingMind may use cookies or browser storage technologies to maintain login sessions, remember preferences, improve performance, and enhance user experience.
            </p>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              Users may disable cookies through browser settings; however, some platform features may not function properly without them.
            </p>
          </div>

          {/* Section 5 */}
          <div id="s5" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                5
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Data Sharing & Third-Party Services</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              We do not sell users&apos; personal information to third parties. We share limited information with trusted service providers necessary for platform operation:
            </p>
            <div className="flex flex-wrap gap-2.5 my-4">
              {['Supabase', 'Cloudinary', 'Razorpay', 'Firebase', 'Gemini API'].map((provider, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#8b90a8] bg-[#7c6fff]/7 border border-[#7c6fff]/15 rounded-md px-3 py-1 tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7c6fff]" />
                  {provider}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              These providers process data according to their own privacy policies and applicable laws.
            </p>
          </div>

          {/* Section 6 */}
          <div id="s6" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                6
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Data Security</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              We implement reasonable technical and organizational security measures intended to protect user information from unauthorized access, misuse, or disclosure.
            </p>
            <div className="flex items-start gap-3 bg-[#ff3b5c]/5 border border-[#ff3b5c]/15 rounded-xl p-4 my-4">
              <ShieldAlert className="text-[#ff3b5c] w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs text-[#ff8296]/90 leading-relaxed m-0">
                No internet-based service can guarantee absolute security. Users acknowledge and accept this inherent risk while using the platform.
              </p>
            </div>
          </div>

          {/* Section 7 */}
          <div id="s7" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                7
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Data Retention</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-3">
              We may retain user information as long as the account remains active, as required for legal/compliance purposes, or as necessary for legitimate business operations.
            </p>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              Users may request account deletion by contacting us. Certain transactional or compliance-related records may be retained where legally required.
            </p>
          </div>

          {/* Section 8 */}
          <div id="s8" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                8
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Children & Minors</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              SolvingMind is intended for students and learners. Users below the age required under applicable laws should use the platform under parental or guardian supervision where necessary.
            </p>
          </div>

          {/* Section 9 */}
          <div id="s9" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                9
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">User Rights</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              Subject to applicable law, users may:
            </p>
            <ul className="list-none space-y-1.5 py-1 pl-1">
              {[
                'Access their account information',
                'Request correction of inaccurate data',
                'Request deletion of their account',
                'Unsubscribe from non-essential communications'
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#8b90a8]">
                  <span className="text-[#7c6fff] text-xs font-bold shrink-0">›</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#8b90a8] leading-relaxed mt-4">
              Requests may be submitted through official support channels.
            </p>
          </div>

          {/* Section 10 */}
          <div id="s10" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                10
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Third-Party Links</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              The platform may contain links to external websites or services. We are not responsible for the privacy practices or content of third-party websites. Users should review third-party privacy policies independently.
            </p>
          </div>

          {/* Section 11 */}
          <div id="s11" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                11
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Changes to Policy</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              We may update this Privacy Policy from time to time. Updated versions will be posted on this page with a revised &quot;Last Updated&quot; date. Continued use of the platform after updates constitutes acceptance of the revised policy.
            </p>
          </div>

          {/* Section 12 */}
          <div id="s12" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#7c6fff] bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                12
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Contact Us</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              For privacy-related questions, concerns, or requests, please contact us:
            </p>
          </div>
        </div>

        {/* Contact Card */}
        <div className="bg-gradient-to-br from-[#7c6fff]/7 to-[#00d4ff]/4 border border-[#7c6fff]/18 rounded-2xl p-8 text-center mt-12">
          <h3 className="font-display text-2xl font-bold tracking-wide bg-gradient-to-r from-[#7c6fff] to-[#00d4ff] bg-clip-text text-transparent mb-2 uppercase">
            Get In Touch
          </h3>
          <p className="text-xs text-[#8b90a8] mb-4">
            Our support team is here to help with any privacy-related inquiries.
          </p>
          <a href="mailto:support@solvingmind.in" className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-[#00d4ff] border border-[#00d4ff]/25 hover:border-[#00d4ff]/40 rounded-lg px-6 py-2.5 bg-transparent hover:bg-[#00d4ff]/8 transition-all font-mono">
            <Mail size={14} />
            support@solvingmind.in
          </a>
          <p className="mt-4 text-xs font-mono">
            <a href="https://solvingmind.in" className="text-[#7c6fff] hover:text-[#00d4ff] transition-colors">solvingmind.in</a>
          </p>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#7c6fff]/10 max-w-[820px] mx-auto mt-16 pt-6 text-center px-6">
        <p className="text-[10px] text-[#3a3d52] font-mono">
          © 2026 SolvingMind · <Link href="/privacy-policy" className="text-[#7c6fff] hover:underline">Privacy Policy</Link> · <Link href="/terms-of-use" className="text-[#7c6fff] hover:underline">Terms of Use</Link>
        </p>
      </footer>
    </div>
  );
}
