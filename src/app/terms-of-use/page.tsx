'use client';

import Link from 'next/link';
import { ArrowLeft, Ban, AlertCircle, HelpCircle, Mail, Lock } from 'lucide-react';

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-[#050508] text-[#e8eaf6] font-sans antialiased selection:bg-[#ff6b35]/30 selection:text-white relative overflow-hidden pb-12">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-5%] right-[20%] w-[70%] h-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,212,255,0.06)_0%,transparent_60%)]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,111,255,0.05)_0%,transparent_60%)]" />
      </div>

      {/* TOP NAV */}
      <nav className="sticky top-0 z-50 bg-[#050508]/92 backdrop-blur-md border-b border-[#7c6fff]/10 px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl tracking-wider bg-gradient-to-r from-[#7c6fff] to-[#00d4ff] bg-clip-text text-transparent select-none font-bold">
          SolvingMind
        </Link>
        <Link href="/auth/signup" className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#8b90a8] hover:text-[#ff6b35] border border-[#7c6fff]/10 hover:border-[#ff6b35]/30 rounded-lg px-4 py-2 bg-[#ff6b35]/0 hover:bg-[#ff6b35]/5 transition-all">
          <ArrowLeft size={14} strokeWidth={2.5} />
          Back to Signup
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative z-10 px-6 pt-16 pb-8 text-center max-w-4xl mx-auto">
        <div className="inline-block text-[10px] font-bold font-mono tracking-widest uppercase text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/22 rounded-full px-4 py-1.5 mb-6">
          Legal Document
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-wide bg-gradient-to-r from-[#ff6b35] via-[#ffd166] to-[#00d4ff] bg-clip-text text-transparent leading-none mb-4 uppercase">
          Terms of Use
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
        <div className="bg-[#0c0d16] border border-[#7c6fff]/10 rounded-2xl p-6 mb-10 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-gradient-to-b before:from-[#ff6b35] before:to-[#ffd166]">
          <div className="text-[10px] font-bold font-mono tracking-widest text-[#ff6b35] uppercase mb-4">// Table of Contents</div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {[
              { num: '01', title: 'Eligibility', id: 's1' },
              { num: '02', title: 'Nature of Services', id: 's2' },
              { num: '03', title: 'User Accounts', id: 's3' },
              { num: '04', title: 'Acceptable Use', id: 's4' },
              { num: '05', title: 'Content & AI Features', id: 's5' },
              { num: '06', title: 'Payments & Subscriptions', id: 's6' },
              { num: '07', title: 'Refund Policy Reference', id: 's7' },
              { num: '08', title: 'Intellectual Property', id: 's8' },
              { num: '09', title: 'Community Features', id: 's9' },
              { num: '10', title: 'Platform Availability', id: 's10' },
              { num: '11', title: 'Limitation of Liability', id: 's11' },
              { num: '12', title: 'Privacy', id: 's12' },
              { num: '13', title: 'Termination & Suspension', id: 's13' },
              { num: '14', title: 'Governing Law & Jurisdiction', id: 's14' },
              { num: '15', title: 'Changes to Terms', id: 's15' },
              { num: '16', title: 'Contact Information', id: 's16' },
            ].map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="inline-flex items-center gap-2.5 text-xs text-[#8b90a8] hover:text-[#ff6b35] py-1 transition-colors">
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
            Welcome to <strong>SolvingMind</strong> (&quot;Platform&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). These Terms of Use (&quot;Terms&quot;) govern your access to and use of the SolvingMind website, applications, educational services, features, and related content. By accessing or using SolvingMind, you agree to comply with these Terms. If you do not agree, please discontinue use of the platform.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          
          {/* Section 1 */}
          <div id="s1" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Eligibility</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              By using SolvingMind, you represent that:
            </p>
            <ul className="list-none space-y-1.5 py-1 pl-1">
              {[
                'You are legally capable of entering into a binding agreement under applicable laws; or',
                'You are using the platform under appropriate parental or guardian supervision where required'
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#8b90a8]">
                  <span className="text-[#ff6b35] text-xs font-bold shrink-0">›</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#8b90a8] leading-relaxed mt-4">
              Users are responsible for ensuring that their use of the platform complies with applicable laws and regulations.
            </p>
          </div>

          {/* Section 2 */}
          <div id="s2" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                2
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Nature of Services</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              SolvingMind provides educational and learning-related services including, but not limited to:
            </p>
            <ul className="list-none space-y-1.5 py-1 pl-1">
              {[
                'Previous year questions (PYQs) and mock tests',
                'Practice modules and study resources',
                'AI-assisted learning tools',
                'Performance analytics, rankings, and related educational features'
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#8b90a8]">
                  <span className="text-[#ff6b35] text-xs font-bold shrink-0">›</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#8b90a8] leading-relaxed mt-4">
              All content and services are provided for educational and informational purposes only.
            </p>
          </div>

          {/* Section 3 */}
          <div id="s3" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                3
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">User Accounts</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-3">
              To access certain features, users may be required to create an account. Users agree to provide accurate information, maintain account confidentiality, and remain responsible for all activity conducted through their account.
            </p>
            <div className="flex items-start gap-3 bg-[#ff3b5c]/5 border border-[#ff3b5c]/15 rounded-xl p-4 my-4">
              <Ban className="text-[#ff3b5c] w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs text-[#ff8296]/90 leading-relaxed m-0">
                Users must not share accounts, impersonate others, create fraudulent accounts, or attempt unauthorized access to the platform. We reserve the right to suspend or terminate accounts that violate these Terms.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div id="s4" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                4
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Acceptable Use</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              Users agree not to:
            </p>
            <ul className="list-none space-y-1.5 py-1 pl-1">
              {[
                'Misuse or exploit the platform, or interfere with platform security or operations',
                'Scrape, copy, or redistribute paid content without authorization',
                'Use automated bots or scripts without permission',
                'Manipulate rankings, leaderboards, or upload malicious content',
                'Engage in abusive, unlawful, or harmful conduct',
                'Attempt to reverse engineer platform systems'
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#8b90a8]">
                  <span className="text-[#ff6b35] text-xs font-bold shrink-0">›</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#8b90a8] leading-relaxed mt-4">
              Any misuse may result in account suspension, termination, or legal action where appropriate.
            </p>
          </div>

          {/* Section 5 */}
          <div id="s5" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                5
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Content & AI Features</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-3">
              SolvingMind may provide AI-generated explanations, recommendations, study insights, and performance analytics. While we aim to provide high-quality educational assistance:
            </p>
            <div className="flex items-start gap-3 bg-[#ff6b35]/5 border border-[#ff6b35]/18 rounded-xl p-4 my-4">
              <HelpCircle className="text-[#ff6b35] w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs text-[#ffa778]/90 leading-relaxed m-0">
                We do not guarantee examination success, rank improvement, admission outcomes, or complete accuracy of AI-generated responses. Users are encouraged to independently verify important academic information.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div id="s6" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                6
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Payments, Subscriptions & Premium Services</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-3">
              Certain features may require payment or subscription. By purchasing premium services, users agree that pricing may change, subscriptions may have limited validity periods, and access may depend on successful payment confirmation.
            </p>
            <div className="flex items-start gap-3 bg-[#7c6fff]/5 border border-[#7c6fff]/15 rounded-xl p-4 my-4">
              <Lock className="text-[#7c6fff] w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs text-[#e8eaf6] leading-relaxed m-0">
                Payments are securely processed through third-party gateways such as Razorpay. We do not store sensitive payment credentials such as card numbers or CVV.
              </p>
            </div>
          </div>

          {/* Section 7 */}
          <div id="s7" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                7
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Refund Policy Reference</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-3">
              Due to the nature of digital educational services, purchases made on SolvingMind are generally non-refundable once access to premium content or services has been granted.
            </p>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              Exceptions may be considered in cases of duplicate transactions, technical billing errors, or unauthorized payments verified by us. Detailed refund terms may be provided separately in our Refund Policy.
            </p>
          </div>

          {/* Section 8 */}
          <div id="s8" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                8
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Intellectual Property</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-3">
              All platform materials including branding, logos, UI designs, educational content, graphics, analytics systems, software, and platform features are owned by or licensed to SolvingMind unless otherwise stated.
            </p>
            <div className="flex items-start gap-3 bg-[#ff3b5c]/5 border border-[#ff3b5c]/18 rounded-xl p-4 my-4">
              <AlertCircle className="text-[#ff3b5c] w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs text-[#ff8296]/90 leading-relaxed m-0">
                Users may not reproduce, distribute, modify, or commercially exploit platform content without prior written permission.
              </p>
            </div>
          </div>

          {/* Section 9 */}
          <div id="s9" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                9
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Community Features</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              Where community or discussion features are available, users agree:
            </p>
            <ul className="list-none space-y-1.5 py-1 pl-1">
              {[
                'Not to post unlawful, abusive, defamatory, hateful, or misleading content',
                'Not to harass or impersonate others',
                'Not to share spam or unauthorized advertisements'
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#8b90a8]">
                  <span className="text-[#ff6b35] text-xs font-bold shrink-0">›</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#8b90a8] leading-relaxed mt-4">
              We reserve the right to moderate, remove, or restrict content and accounts that violate community standards.
            </p>
          </div>

          {/* Section 10 */}
          <div id="s10" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                10
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Platform Availability</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              We strive to maintain uninterrupted access to the platform; however, we do not guarantee continuous availability, error-free operation, or uninterrupted services. Features may be modified, suspended, or discontinued at any time without prior notice.
            </p>
          </div>

          {/* Section 11 */}
          <div id="s11" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                11
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Limitation of Liability</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed mb-4">
              To the maximum extent permitted under applicable law, SolvingMind shall not be liable for:
            </p>
            <ul className="list-none space-y-1.5 py-1 pl-1">
              {[
                'Indirect or consequential losses',
                'Examination outcomes or academic performance',
                'Service interruptions or data loss',
                'Inaccuracies in educational or AI-generated content'
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#8b90a8]">
                  <span className="text-[#ff6b35] text-xs font-bold shrink-0">›</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#8b90a8] leading-relaxed mt-4">
              Use of the platform is at the user&apos;s own discretion and risk.
            </p>
          </div>

          {/* Section 12 */}
          <div id="s12" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                12
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Privacy</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              Use of SolvingMind is also governed by our <Link href="/privacy-policy" className="text-[#00d4ff] hover:underline font-semibold">Privacy Policy</Link>, which explains how user information is collected and processed. By using the platform, users acknowledge and agree to the Privacy Policy.
            </p>
          </div>

          {/* Section 13 */}
          <div id="s13" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                13
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Termination & Suspension</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              We reserve the right to suspend, restrict, or terminate access to users who violate these Terms, misuse the platform, engage in fraudulent activity, or create security risks. Such actions may be taken without prior notice where reasonably necessary.
            </p>
          </div>

          {/* Section 14 */}
          <div id="s14" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                14
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Governing Law & Jurisdiction</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              These Terms shall be governed by and interpreted in accordance with the laws of India. Any disputes arising in connection with these Terms or platform usage shall be subject to the jurisdiction of competent courts located in Delhi, India.
            </p>
          </div>

          {/* Section 15 */}
          <div id="s15" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                15
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Changes to Terms</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              We may update these Terms from time to time. Updated versions will be published on this page with a revised &quot;Last Updated&quot; date. Continued use of the platform after updates constitutes acceptance of the revised Terms.
            </p>
          </div>

          {/* Section 16 */}
          <div id="s16" className="scroll-mt-20">
            <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-[#7c6fff]/10">
              <span className="font-display text-sm font-bold tracking-wide text-[#ff6b35] bg-[#ff6b35]/8 border border-[#ff6b35]/20 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
                16
              </span>
              <h2 className="text-base font-bold text-[#e8eaf6] tracking-tight">Contact Information</h2>
            </div>
            <p className="text-xs text-[#8b90a8] leading-relaxed">
              For questions or concerns regarding these Terms, users may contact:
            </p>
          </div>
        </div>

        {/* Contact Card */}
        <div className="bg-gradient-to-br from-[#ff6b35]/7 to-[#ffd166]/4 border border-[#ff6b35]/18 rounded-2xl p-8 text-center mt-12">
          <h3 className="font-display text-2xl font-bold tracking-wide bg-gradient-to-r from-[#ff6b35] to-[#ffd166] bg-clip-text text-transparent mb-2 uppercase">
            Contact Support
          </h3>
          <p className="text-xs text-[#8b90a8] mb-4">
            Have a question about these Terms? We&apos;re here to help.
          </p>
          <a href="mailto:support@solvingmind.in" className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-[#ff6b35] border border-[#ff6b35]/30 hover:border-[#ff6b35]/50 rounded-lg px-6 py-2.5 bg-transparent hover:bg-[#ff6b35]/8 transition-all font-mono">
            <Mail size={14} />
            support@solvingmind.in
          </a>
          <p className="mt-4 text-xs font-mono">
            <a href="https://solvingmind.in" className="text-[#ff6b35] hover:text-[#ffd166] transition-colors">solvingmind.in</a>
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
