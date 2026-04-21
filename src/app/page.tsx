'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Contact Management',
    desc: 'Store, segment, and enrich every contact with a complete activity history.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Visual Sales Pipeline',
    desc: 'Drag-and-drop Kanban boards to move deals forward at a glance.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Meetings & Scheduling',
    desc: 'Book meetings directly from the CRM with calendar sync and time-slot pickers.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Email Templates',
    desc: 'Send personalised emails at scale using merge-tag templates.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: 'Task Management',
    desc: 'Never miss a follow-up — assign tasks, set deadlines, track completion.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Analytics & Reporting',
    desc: 'Revenue charts, pipeline health, and win-rate metrics on one dashboard.',
  },
];

const STATS = [
  { value: '10k+', label: 'Contacts managed' },
  { value: '98%', label: 'Uptime guaranteed' },
  { value: '3×', label: 'Faster deal closing' },
  { value: 'Free', label: 'Forever plan' },
];

export default function SplashPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animations
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex flex-col">
      {/* ── NAV ──────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-[#dfe3eb]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[3px] flex items-center justify-center"
              style={{ backgroundColor: '#ff7a59' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-[#2d3e50] text-base">CRM Pro</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            {['Features', 'Pricing', 'Docs'].map((l) => (
              <a key={l} href="#" className="text-sm text-[#516f90] hover:text-[#2d3e50] font-medium transition-colors">{l}</a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-sm font-semibold text-[#425b76] hover:text-[#2d3e50] transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-sm font-bold text-white rounded-[3px] transition-colors"
              style={{ backgroundColor: '#ff7a59' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ff8f73')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff7a59')}
            >
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
          style={{ backgroundColor: '#fff3f0', borderColor: '#ffd5cc', color: '#ff7a59' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a59] animate-pulse" />
          Now with AI-powered activity summaries
        </div>

        {/* Headline */}
        <h1
          className={`text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#2d3e50] leading-tight max-w-3xl mb-5 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          Grow your revenue<br />
          <span style={{ color: '#ff7a59' }}>faster than ever.</span>
        </h1>

        {/* Sub */}
        <p
          className={`text-base md:text-lg text-[#516f90] max-w-xl mb-8 leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          CRM Pro gives your sales team contacts, pipeline, meetings,
          email templates, and analytics — all in one clean workspace.
        </p>

        {/* CTA row */}
        <div
          className={`flex flex-col sm:flex-row items-center gap-3 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-3.5 text-sm font-bold text-white rounded-[3px] shadow-md transition-all hover:shadow-lg"
            style={{ backgroundColor: '#ff7a59' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ff8f73')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff7a59')}
          >
            Start for free — no card needed
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-3.5 text-sm font-bold text-[#425b76] rounded-[3px] bg-white border border-[#cbd6e2] hover:bg-[#f6f9fc] transition-colors"
          >
            View live demo →
          </button>
        </div>

        {/* Trust line */}
        <p
          className={`mt-4 text-xs text-[#7c98b6] transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          Trusted by 500+ sales teams · GDPR compliant · SOC 2 ready
        </p>
      </section>

      {/* ── STATS BAR ────────────────────────────── */}
      <section className="bg-white border-y border-[#dfe3eb] py-8">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-[#2d3e50]">{s.value}</p>
              <p className="text-xs text-[#7c98b6] mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-[#2d3e50] mb-3">
            Everything your team needs
          </h2>
          <p className="text-sm text-[#516f90] max-w-lg mx-auto">
            No plug-ins, no add-ons. Every feature is included — out of the box.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`bg-white border border-[#dfe3eb] rounded-[3px] p-6 hover:shadow-md hover:border-[#cbd6e2] transition-all duration-300 group`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className="w-9 h-9 rounded-[3px] flex items-center justify-center mb-4 transition-colors group-hover:bg-[#fff3f0]"
                style={{ backgroundColor: '#f6f9fc', color: '#ff7a59' }}
              >
                {f.icon}
              </div>
              <h3 className="text-sm font-bold text-[#2d3e50] mb-1.5">{f.title}</h3>
              <p className="text-xs text-[#516f90] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────── */}
      <section className="py-16 px-6 text-center" style={{ backgroundColor: '#2d3e50' }}>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Ready to close more deals?
        </h2>
        <p className="text-sm mb-7" style={{ color: '#7c98b6' }}>
          Create your free account in 30 seconds. No credit card required.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-10 py-3.5 text-sm font-bold text-white rounded-[3px] transition-all hover:brightness-110"
          style={{ backgroundColor: '#ff7a59' }}
        >
          Get started — it&apos;s free
        </button>
      </section>

      {/* ── FOOTER ───────────────────────────────── */}
      <footer className="bg-white border-t border-[#dfe3eb] py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[3px] flex items-center justify-center" style={{ backgroundColor: '#ff7a59' }}>
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-[#2d3e50]">CRM Pro</span>
          </div>
          <p className="text-xs text-[#7c98b6]">© 2026 CRM Pro. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="text-xs text-[#7c98b6] hover:text-[#425b76] transition-colors">Privacy</a>
            <a href="/terms" className="text-xs text-[#7c98b6] hover:text-[#425b76] transition-colors">Terms</a>
            <a href="#" className="text-xs text-[#7c98b6] hover:text-[#425b76] transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
