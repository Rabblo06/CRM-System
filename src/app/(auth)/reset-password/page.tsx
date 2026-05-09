'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Check, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';

/* ─────────────────────────────────────────────────────
   Shared UI atoms (self-contained, no shared imports)
───────────────────────────────────────────────────── */
function HsInput({
  className = '', error, onFocus, onBlur, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={`w-full h-10 px-3 text-sm border rounded-[3px] outline-none transition-all
        placeholder:text-[#D6D6D6] text-[#333333] bg-white ${className}`}
      style={{ borderColor: error ? '#3A52C0' : '#EBEBEB' }}
      onFocus={e => {
        e.currentTarget.style.borderColor = error ? '#3A52C0' : '#4762D5';
        e.currentTarget.style.boxShadow = `0 0 0 1px ${error ? '#3A52C0' : '#4762D5'}`;
        onFocus?.(e);
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = error ? '#3A52C0' : '#EBEBEB';
        e.currentTarget.style.boxShadow = 'none';
        onBlur?.(e);
      }}
      {...props}
    />
  );
}

/* ─────────────────────────────────────────────────────
   Password strength indicator
───────────────────────────────────────────────────── */
function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const len = password.length;
  const segments = [
    { min: 1,  color: '#3A52C0', label: 'Weak' },
    { min: 8,  color: '#E8882A', label: 'Fair' },
    { min: 12, color: '#4762D5', label: 'Strong' },
  ];
  const active = segments.filter(s => len >= s.min).length;
  const { color, label } = segments[active - 1] ?? segments[0];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {segments.map((s, i) => (
          <div key={s.min} className="flex-1 h-1 rounded-full transition-colors"
            style={{ backgroundColor: i < active ? color : '#EBEBEB' }} />
        ))}
      </div>
      <p className="text-xs" style={{ color }}>{label} password</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Requirements checklist
───────────────────────────────────────────────────── */
const REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number or symbol', test: (p: string) => /[\d!@#$%^&*(),.?":{}|<>]/.test(p) },
];

function Requirements({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1">
      {REQUIREMENTS.map(r => (
        <li key={r.label} className="flex items-center gap-2 text-xs">
          <div
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ backgroundColor: r.test(password) ? '#4762D5' : '#EBEBEB' }}
          >
            {r.test(password) && <Check className="w-2 h-2 text-white" />}
          </div>
          <span style={{ color: r.test(password) ? '#4762D5' : '#999999' }}>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────
   Main inner component (reads search params)
───────────────────────────────────────────────────── */
function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  // Check that a valid recovery session exists
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSessionReady(!!session);
        if (!session) {
          toast.error(
            'This password reset link has expired or is invalid. Please request a new one.',
            { title: 'Invalid link' },
          );
        }
      })
      .catch(() => { setSessionReady(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    const e: typeof errors = {};
    if (!password)           e.password = 'New password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!confirm)            e.confirm = 'Please confirm your new password.';
    else if (password !== confirm) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const toastId = toast.loading('Updating your password…');

    try {
      const { error } = await supabase.auth.updateUser({ password });

      toast.dismiss(toastId);

      if (error) {
        toast.error(error.message || 'Could not update password. Please try again.');
        setLoading(false);
        return;
      }

      // Clear session start so they get a fresh 1-hour window
      localStorage.setItem('crm_session_start', Date.now().toString());

      toast.success('Password updated successfully! Redirecting…');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch {
      toast.dismiss(toastId);
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Loading state while checking session
  if (sessionReady === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#4762D5]" />
      </div>
    );
  }

  // Invalid session — show fallback
  if (sessionReady === false) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: '#fff0ee' }}>
          <ShieldCheck className="w-6 h-6" style={{ color: '#3A52C0' }} />
        </div>
        <h2 className="text-lg font-bold text-[#333333] mb-2">Link expired</h2>
        <p className="text-sm text-[#999999] mb-6">
          This password reset link has expired or already been used.<br />
          Please request a new one.
        </p>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="px-6 py-2.5 text-sm font-bold text-white rounded-[3px] transition-colors"
          style={{ backgroundColor: '#4762D5' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3A52C0')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4762D5')}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center w-12 h-12 rounded-full mb-5"
        style={{ backgroundColor: '#f0fbf9' }}>
        <ShieldCheck className="w-6 h-6" style={{ color: '#4762D5' }} />
      </div>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#333333]">Set a new password</h1>
        <p className="text-sm text-[#999999] mt-1">
          Your new password must be at least 8 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New password */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#555555] mb-1.5">
            New password
          </label>
          <div className="relative">
            <HsInput
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="pr-10"
              autoComplete="new-password"
              autoFocus
              error={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#555555]"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password
            ? <p className="mt-1 text-xs text-[#3A52C0]">{errors.password}</p>
            : <Requirements password={password} />
          }
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#555555] mb-1.5">
            Confirm new password
          </label>
          <div className="relative">
            <HsInput
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              className="pr-10"
              autoComplete="new-password"
              error={!!errors.confirm}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#555555]"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirm && <p className="mt-1 text-xs text-[#3A52C0]">{errors.confirm}</p>}
          {!errors.confirm && confirm && password === confirm && (
            <p className="mt-1 text-xs flex items-center gap-1.5" style={{ color: '#4762D5' }}>
              <Check className="w-3 h-3" /> Passwords match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-white text-sm font-bold rounded-[3px] transition-colors
            disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#4762D5' }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#3A52C0'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#4762D5'; }}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating password…</>
            : 'Update password'}
        </button>
      </form>
    </>
  );
}

/* ─────────────────────────────────────────────────────
   Page shell
───────────────────────────────────────────────────── */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#4762D5' }} />
      </div>
    }>
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 py-10">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-[3px] flex items-center justify-center"
            style={{ backgroundColor: '#4762D5' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-[#333333] text-base">CRM Pro</span>
        </a>

        <div className="w-full max-w-[440px] bg-white border border-[#EBEBEB] shadow-sm rounded-[3px] p-10">
          <ResetPasswordInner />
        </div>

        <p className="mt-5 text-xs text-[#999999]">
          Your data is encrypted and stored securely.
        </p>
      </div>
    </Suspense>
  );
}
