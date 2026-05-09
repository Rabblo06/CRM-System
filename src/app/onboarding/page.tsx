'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ── Data ─────────────────────────────────────────────── */
const ROLES = [
  'Owner', 'Executive Team',
  'Manager', 'Employee',
  'Student', 'Intern',
  'Freelancer', 'Other',
];

const INDUSTRIES = [
  'Marketing and Advertising', 'Technology and Services', 'Computer Software',
  'Real Estate', 'Financial Services', 'Health, Wellness and Fitness',
  'Education', 'Consulting', 'Retail',
];

const SIZES = [
  'Just me', '2 to 5', '6 to 10',
  '11 to 25', '26 to 50', '51 to 100',
  '101 to 200', '201 to 500', '501 or more',
];

type Step = 'role' | 'website' | 'industry' | 'size' | 'company' | 'connect';
const STEP_ORDER: Step[] = ['role', 'website', 'industry', 'size', 'company', 'connect'];

/* ── Selection Tile ───────────────────────────────────── */
function Tile({ label, selected, onClick, cols = 2 }: { label: string; selected: boolean; onClick: () => void; cols?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center py-4 px-3 text-sm font-bold rounded-[3px] border transition-all text-center"
      style={{
        borderColor: selected ? '#4762D5' : '#EBEBEB',
        backgroundColor: selected ? '#EEF0FB' : '#fff',
        color: selected ? '#4762D5' : '#333333',
        minHeight: cols === 3 ? 60 : 56,
      }}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = '#c5ced8'; }}
      onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = '#EBEBEB'; }}
    >
      {label}
    </button>
  );
}

/* ── HubSpot-style input ──────────────────────────────── */
function OnboardInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <div>
      <label className="block text-xs font-semibold text-[#555555] mb-1.5">
        {label} {rest.required && <span style={{ color: '#4762D5' }}>*</span>}
      </label>
      <input
        className="h-10 px-3 text-sm border rounded-[3px] outline-none text-[#333333] bg-white placeholder:text-[#D6D6D6]"
        style={{ borderColor: '#EBEBEB', width: 420 }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 1px #3b82f6'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
        {...rest}
      />
    </div>
  );
}

/* ── Google Icon ──────────────────────────────────────── */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

/* ── Left Panel ───────────────────────────────────────── */
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between flex-shrink-0 px-10 py-10 min-h-screen"
      style={{ backgroundColor: '#f0f0f0', width: 460 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-[3px] flex items-center justify-center" style={{ backgroundColor: '#4762D5' }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      {/* Big headline */}
      <h1 className="text-5xl font-light leading-tight text-[#1a1a1a]" style={{ fontFamily: '"Georgia", "Times New Roman", serif', letterSpacing: '-0.5px' }}>
        Tailor your<br />experience
      </h1>

      {/* Footer */}
      <p className="text-xs text-[#999] cursor-pointer hover:underline">Manage Cookies</p>
    </div>
  );
}

/* ── Bottom Nav ───────────────────────────────────────── */
function BottomNav({
  onBack, onNext, showBack = true, nextLabel = 'Next',
  nextDisabled = false, legalNote = false, onSkip,
}: {
  onBack?: () => void; onNext?: () => void; showBack?: boolean;
  nextLabel?: string; nextDisabled?: boolean; legalNote?: boolean; onSkip?: () => void;
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 px-16 pb-10">
      <div className="border-t border-[#EBEBEB] pt-5 flex items-center justify-between">
        {showBack && onBack ? (
          <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-[#555555] hover:text-[#333333] transition-colors font-medium">
            <ChevronLeft size={16} /> Back
          </button>
        ) : <div />}

        <div className="flex items-center gap-6">
          {legalNote && (
            <p className="text-xs text-[#999999] text-right max-w-[280px] leading-relaxed">
              Your data will be hosted in the <strong>European Union</strong>. By creating an account you are agreeing to the{' '}
              <a href="#" className="underline hover:text-[#555555]">CRM Pro Terms of Service</a>.
            </p>
          )}
          {onSkip && (
            <button type="button" onClick={onSkip} className="text-sm text-[#555555] font-semibold hover:text-[#333333]">
              Skip, for now
            </button>
          )}
          {onNext && (
            <button
              type="button" onClick={onNext} disabled={nextDisabled}
              className="px-6 py-2.5 text-sm font-bold rounded-[3px] text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: nextDisabled ? '#999999' : '#333333' }}
              onMouseEnter={(e) => { if (!nextDisabled) (e.currentTarget as HTMLElement).style.backgroundColor = '#1a2b3c'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = nextDisabled ? '#999999' : '#333333'; }}
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════
   PAGE
════════════════════════════ */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) { router.replace('/login'); return; }
        if (user.user_metadata?.onboarding_complete) router.replace('/dashboard');
      })
      .catch(() => {});
  }, [router]);

  const idx = STEP_ORDER.indexOf(step);
  const goNext = () => { if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]); };
  const goBack = () => { if (idx > 0) setStep(STEP_ORDER[idx - 1]); };

  const finish = async () => {
    setSaving(true);
    await supabase.auth.updateUser({
      data: { onboarding_complete: true, role, website, industry, size, company },
    });
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#fff' }}>
      <LeftPanel />

      {/* Right panel */}
      <div className="flex-1 relative min-h-screen bg-white">
        <div className="px-16 pt-20 pb-32">

          {/* ── Role ── */}
          {step === 'role' && (
            <>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-1">Which best describes your role?</h2>
              <p className="text-sm text-[#999999] mb-8">This helps us surface the right tools and tips.</p>
              <div className="grid grid-cols-2 gap-3" style={{ maxWidth: 580 }}>
                {ROLES.map((r) => <Tile key={r} label={r} selected={role === r} onClick={() => setRole(r)} />)}
              </div>
            </>
          )}

          {/* ── Website ── */}
          {step === 'website' && (
            <>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-1">What is your company&apos;s website?</h2>
              <p className="text-sm text-[#999999] mb-8">This was our best guess based on your email address.</p>
              <OnboardInput label="Company website *" placeholder="www.companywebsite.com" value={website} onChange={(e) => setWebsite(e.target.value)} required />
            </>
          )}

          {/* ── Industry ── */}
          {step === 'industry' && (
            <>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-1">What industry are you in?</h2>
              <p className="text-sm text-[#999999] mb-8">We&apos;ll focus your experience based on your choice.</p>
              <div className="grid grid-cols-3 gap-3" style={{ maxWidth: 720 }}>
                {INDUSTRIES.map((ind) => <Tile key={ind} label={ind} selected={industry === ind} onClick={() => setIndustry(ind)} cols={3} />)}
              </div>
              <p className="mt-4 text-sm text-[#999999]">
                Industry not listed?{' '}
                <button type="button" onClick={goNext} className="font-bold underline" style={{ color: '#4762D5' }}>Search all</button>
              </p>
            </>
          )}

          {/* ── Size ── */}
          {step === 'size' && (
            <>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-1">How big is your company?</h2>
              <p className="text-sm text-[#999999] mb-8">We&apos;ll use this to recommend the best plan for your business.</p>
              <div className="grid grid-cols-3 gap-3" style={{ maxWidth: 720 }}>
                {SIZES.map((s) => <Tile key={s} label={s} selected={size === s} onClick={() => setSize(s)} cols={3} />)}
              </div>
            </>
          )}

          {/* ── Company name ── */}
          {step === 'company' && (
            <>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-1">What is your company&apos;s name?</h2>
              <p className="text-sm text-[#999999] mb-8">We&apos;ll use your company name to make things feel more familiar.</p>
              <OnboardInput label="Company name *" placeholder="Acme Corp" value={company} onChange={(e) => setCompany(e.target.value)} required />
            </>
          )}

          {/* ── Connect email ── */}
          {step === 'connect' && (
            <>
              <div style={{ maxWidth: 560 }}>
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-3 leading-snug">
                  Connect your email to sync all your contacts and conversations in one place
                </h2>
                <p className="text-sm mb-8 leading-relaxed" style={{ color: '#4762D5' }}>
                  CRM Pro uses this connection to organise communication history and enrich profiles with accurate job titles, locations, and more.
                </p>
                <button
                  type="button"
                  onClick={finish}
                  disabled={saving}
                  className="flex items-center gap-3 px-5 py-3 border border-[#EBEBEB] rounded-[3px] bg-white hover:bg-[#FAFAFA] transition-colors text-sm font-bold text-[#333333]"
                  style={{ width: 340 }}
                >
                  <GoogleIcon />
                  <span className="flex-1 text-center">{saving ? 'Setting up…' : 'Continue with Google'}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Bottom nav ── */}
        {step === 'role' && (
          <BottomNav showBack={false} onNext={goNext} nextDisabled={!role} />
        )}
        {step === 'website' && (
          <BottomNav onBack={goBack} onNext={goNext} />
        )}
        {step === 'industry' && (
          <BottomNav onBack={goBack} onNext={goNext} nextDisabled={!industry} />
        )}
        {step === 'size' && (
          <BottomNav onBack={goBack} onNext={goNext} nextDisabled={!size} />
        )}
        {step === 'company' && (
          <BottomNav onBack={goBack} onNext={goNext} nextLabel="Create account" nextDisabled={!company || saving} legalNote />
        )}
        {step === 'connect' && (
          <BottomNav onBack={goBack} onSkip={finish} />
        )}
      </div>
    </div>
  );
}
