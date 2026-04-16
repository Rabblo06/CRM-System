'use client';

import React, {
  useState, useRef, useEffect, useCallback,
  KeyboardEvent, ClipboardEvent, Suspense,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Check, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createBrowserClient } from '@supabase/ssr';
import { setDemoUserEmail } from '@/lib/demoUser';
import { useToast } from '@/components/ui/toast';

/* ─────────────────────────────────────────────────────
   Demo / real detection
───────────────────────────────────────────────────── */
const IS_DEMO =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder_anon_key';

/* ─────────────────────────────────────────────────────
   Shared UI atoms
───────────────────────────────────────────────────── */
function HsInput({
  className = '', onFocus, onBlur, error, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={`w-full h-10 px-3 text-sm border rounded-[3px] outline-none transition-all
        placeholder:text-[#b0c1d4] text-[#2d3e50] bg-white ${className}`}
      style={{ borderColor: error ? '#e8674a' : '#cbd6e2' }}
      onFocus={e => {
        e.currentTarget.style.borderColor = error ? '#e8674a' : '#00a38d';
        e.currentTarget.style.boxShadow = `0 0 0 1px ${error ? '#e8674a' : '#00a38d'}`;
        onFocus?.(e);
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = error ? '#e8674a' : '#cbd6e2';
        e.currentTarget.style.boxShadow = 'none';
        onBlur?.(e);
      }}
      {...props}
    />
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-xs text-[#e8674a]">{msg}</p>;
}

function Divider() {
  return (
    <div className="relative flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-[#dfe3eb]" />
      <span className="text-xs font-semibold uppercase tracking-wide text-[#7c98b6]">OR</span>
      <div className="flex-1 h-px bg-[#dfe3eb]" />
    </div>
  );
}

function Spinner() {
  return <Loader2 className="w-4 h-4 animate-spin text-white" />;
}

/* ─────────────────────────────────────────────────────
   Social / OAuth buttons
───────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg viewBox="0 0 21 21" width="18" height="18">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

function SocialButton({
  icon, children, provider, label,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  provider: 'google' | 'azure' | null;
  label?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (IS_DEMO || !provider) { router.push('/dashboard'); return; }
    setLoading(true);
    try {
      const browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data, error } = await browserClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Provider error.';
      toast.error(
        msg.toLowerCase().includes('not enabled')
          ? `${label ?? provider} login is not enabled. Enable it in your Supabase dashboard under Authentication → Providers.`
          : msg,
      );
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-2.5 bg-white border border-[#cbd6e2]
        rounded-[3px] text-sm font-semibold text-[#2d3e50] hover:bg-[#f6f9fc] transition-colors
        disabled:opacity-60"
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
      <span className="flex-1 text-center">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7c98b6]" /> Redirecting…
          </span>
        ) : children}
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────
   Brand panel (left column on lg)
───────────────────────────────────────────────────── */
const FEATURES = [
  'Contact & Company Management',
  'Visual Drag-and-Drop Pipeline',
  'Meetings & Calendar Scheduling',
  'Email Templates & Automation',
  'Activity Feed & Task Tracking',
];

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full px-12 py-10"
      style={{ backgroundColor: '#2D3E50' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[3px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#FF7A59' }}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">CRM Pro</span>
      </div>

      <div>
        <h2 className="text-3xl font-extrabold text-white leading-tight mb-4">
          Grow your revenue<br />
          <span style={{ color: '#FF7A59' }}>faster than ever.</span>
        </h2>
        <p className="text-sm leading-relaxed mb-8" style={{ color: '#7C98B6' }}>
          Everything your sales team needs — contacts, pipeline, meetings, and analytics — in one
          clean workspace.
        </p>
        <ul className="space-y-3">
          {FEATURES.map(f => (
            <li key={f} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,122,89,0.2)' }}>
                <Check className="w-2.5 h-2.5" style={{ color: '#FF7A59' }} />
              </div>
              <span className="text-sm" style={{ color: '#CBD6E2' }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[3px] p-4"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-sm italic leading-relaxed mb-3" style={{ color: '#CBD6E2' }}>
          &ldquo;CRM Pro cut our deal-tracking time in half. The pipeline view alone is worth it.&rdquo;
        </p>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: '#FF7A59' }}>JS</div>
          <div>
            <p className="text-xs font-semibold text-white">James S.</p>
            <p className="text-xs" style={{ color: '#7C98B6' }}>VP of Sales, Acme Corp</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Helper: check if email exists via API
───────────────────────────────────────────────────── */
async function checkEmailExists(email: string): Promise<{ exists: boolean | null; emailConfirmed?: boolean }> {
  try {
    const res = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  } catch {
    return { exists: null };
  }
}

/* ═══════════════════════════════════════════════════
   VIEW: SIGN IN
═══════════════════════════════════════════════════ */
function SignInView({ onSwitch, onForgot, callbackError }: {
  onSwitch: () => void;
  onForgot: () => void;
  callbackError?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Show callback error (from OAuth redirect) as toast on mount
  useEffect(() => {
    if (callbackError) {
      toast.error(callbackError, { title: 'Authentication error' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_DEMO) {
      if (email) setDemoUserEmail(email);
      router.push('/dashboard');
      return;
    }

    if (!email.trim()) { toast.error('Please enter your email address.'); return; }
    if (!password)      { toast.error('Please enter your password.');       return; }

    setLoading(true);
    const toastId = toast.loading('Signing in…');

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });

      if (authErr) {
        toast.dismiss(toastId);

        const msg = authErr.message.toLowerCase();

        // Email not verified
        if (msg.includes('email not confirmed')) {
          toast.error(
            'Please verify your email before logging in. Check your inbox for the verification link.',
            { title: 'Email not verified' },
          );
          setLoading(false);
          return;
        }

        // Invalid credentials — check if account exists to give precise error
        if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
          const check = await checkEmailExists(email);

          if (check.exists === false) {
            toast.error(
              "We couldn't find an account with that email. Try signing up instead.",
              { title: 'Account not found' },
            );
          } else if (check.exists === true && check.emailConfirmed === false) {
            toast.error(
              'Your email is not verified. Please check your inbox for the verification link.',
              { title: 'Email not verified' },
            );
          } else {
            // exists === true (wrong password) OR exists === null (no service key — generic)
            toast.error('Incorrect password. Please try again or reset your password below.', {
              title: 'Wrong password',
            });
          }
          setLoading(false);
          return;
        }

        toast.error(authErr.message || 'Sign in failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Success
      if (data.user) {
        // Store session start for 1-hour expiry enforcement
        if (rememberMe) {
          localStorage.setItem('crm_remember_me', 'true');
          localStorage.removeItem('crm_session_start');
        } else {
          localStorage.removeItem('crm_remember_me');
          localStorage.setItem('crm_session_start', Date.now().toString());
        }
        toast.dismiss(toastId);
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
    } catch {
      toast.dismiss(toastId);
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#2d3e50]">Sign in to your account</h1>
        <p className="text-sm text-[#7c98b6] mt-1">
          No account?{' '}
          <button type="button" onClick={onSwitch}
            className="text-[#00a38d] font-medium hover:underline">
            Create one free →
          </button>
        </p>
      </div>

      {IS_DEMO && (
        <div className="mb-5 rounded-[3px] px-3 py-2.5 text-xs bg-[#fffbf0] border border-[#f5c26b]"
          style={{ color: '#8b6914' }}>
          <strong>Demo mode</strong> — Supabase not configured.{' '}
          <button type="button" onClick={() => router.push('/dashboard')}
            className="underline font-semibold">Skip to dashboard →</button>
        </div>
      )}

      <div className="space-y-2.5">
        <SocialButton icon={<GoogleIcon />} provider="google" label="Google">
          Continue with Google
        </SocialButton>
        <SocialButton icon={<MicrosoftIcon />} provider="azure" label="Microsoft">
          Sign in with Microsoft
        </SocialButton>
      </div>

      <Divider />

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#425b76] mb-1.5">
            Email address
          </label>
          <HsInput
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            required={!IS_DEMO}
            autoComplete="email"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#425b76]">
              Password
            </label>
            <button
              type="button"
              onClick={onForgot}
              className="text-xs text-[#00a38d] hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <HsInput
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pr-10"
              required={!IS_DEMO}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7c98b6] hover:text-[#425b76]"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            className="relative w-4 h-4 rounded-[3px] border-2 flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              borderColor: rememberMe ? '#00a38d' : '#cbd6e2',
              backgroundColor: rememberMe ? '#00a38d' : 'white',
            }}
            onClick={() => setRememberMe(!rememberMe)}
          >
            {rememberMe && <Check className="w-2.5 h-2.5 text-white" />}
            <input
              type="checkbox"
              className="sr-only"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
            />
          </div>
          <span className="text-xs text-[#425b76]">Remember me for 30 days</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-white text-sm font-bold rounded-[3px] transition-colors
            disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#ff7a59' }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#ff8f73'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ff7a59'; }}
        >
          {loading ? <><Spinner /> Signing in…</> : 'Sign in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setDemoUserEmail('demo@crmpro.app'); router.push('/dashboard'); }}
        className="w-full mt-3 py-2.5 bg-white border border-[#cbd6e2] text-[#2d3e50] text-sm
          font-semibold rounded-[3px] hover:bg-[#f6f9fc] transition-colors"
      >
        Continue with Demo (no login required)
      </button>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   VIEW: CREATE ACCOUNT
═══════════════════════════════════════════════════ */
function CreateAccountView({ onSwitch, onEmailSent }: {
  onSwitch: () => void;
  onEmailSent: (email: string, type: 'verify') => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const router = useRouter();

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim())       e.name = 'Full name is required.';
    if (!email.trim())      e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (!password)          e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (IS_DEMO) {
      setDemoUserEmail(email);
      onEmailSent(email, 'verify');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating your account…');

    try {
      const { data, error: signupErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      toast.dismiss(toastId);

      if (signupErr) {
        const msg = signupErr.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          toast.error('An account with that email already exists. Please sign in instead.', {
            title: 'Account already exists',
          });
        } else {
          toast.error(signupErr.message || 'Could not create account. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Supabase returns identities: [] when email is already registered but unconfirmed
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        toast.error('An account with that email already exists. Please sign in instead.', {
          title: 'Account already exists',
        });
        setLoading(false);
        return;
      }

      toast.success('Account created! Check your email to verify your address.');
      onEmailSent(email.trim().toLowerCase(), 'verify');
    } catch {
      toast.dismiss(toastId);
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#2d3e50]">Create your free account</h1>
        <p className="text-sm text-[#7c98b6] mt-1">100% free. No credit card needed.</p>
      </div>

      {IS_DEMO && (
        <div className="mb-5 rounded-[3px] px-3 py-2.5 text-xs bg-[#fffbf0] border border-[#f5c26b]"
          style={{ color: '#8b6914' }}>
          <strong>Demo mode</strong> — fill in any details to continue.
        </div>
      )}

      <div className="space-y-2.5">
        <SocialButton icon={<GoogleIcon />} provider="google" label="Google">
          Continue with Google
        </SocialButton>
        <SocialButton icon={<MicrosoftIcon />} provider="azure" label="Microsoft">
          Sign up with Microsoft
        </SocialButton>
      </div>

      <Divider />

      <form onSubmit={handleSignup} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#425b76] mb-1.5">
            Full name <span className="text-[#ff7a59]">*</span>
          </label>
          <HsInput
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            autoComplete="name"
            error={!!errors.name}
          />
          {errors.name && <FieldError msg={errors.name} />}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#425b76] mb-1.5">
            Email address <span className="text-[#ff7a59]">*</span>
          </label>
          <HsInput
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoComplete="email"
            error={!!errors.email}
          />
          {errors.email && <FieldError msg={errors.email} />}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#425b76] mb-1.5">
            Password <span className="text-[#ff7a59]">*</span>
          </label>
          <div className="relative">
            <HsInput
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="pr-10"
              autoComplete="new-password"
              error={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7c98b6] hover:text-[#425b76]"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <FieldError msg={errors.password} />}
          {/* Strength hint */}
          {password && !errors.password && (
            <div className="mt-1.5 flex gap-1">
              {[8, 12, 16].map(threshold => (
                <div
                  key={threshold}
                  className="flex-1 h-1 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      password.length >= threshold ? '#00a38d'
                        : password.length >= 8 ? '#f5c26b'
                          : '#dfe3eb',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-[#7c98b6] leading-relaxed">
          By creating an account you agree to our{' '}
          <a href="#" className="text-[#00a38d] hover:underline">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="text-[#00a38d] hover:underline">Privacy Policy</a>.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-white text-sm font-bold rounded-[3px] transition-colors
            disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#ff7a59' }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#ff8f73'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ff7a59'; }}
        >
          {loading ? <><Spinner /> Creating account…</> : 'Create free account'}
        </button>
      </form>

      <p className="text-sm text-[#2d3e50] text-center mt-6">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch}
          className="text-[#00a38d] font-medium hover:underline">Sign in</button>
      </p>
      <button
        type="button"
        onClick={() => { setDemoUserEmail('demo@crmpro.app'); router.push('/dashboard'); }}
        className="w-full mt-3 py-2.5 bg-white border border-[#cbd6e2] text-[#2d3e50] text-sm
          font-semibold rounded-[3px] hover:bg-[#f6f9fc] transition-colors"
      >
        Continue with Demo (no login required)
      </button>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   VIEW: FORGOT PASSWORD
═══════════════════════════════════════════════════ */
function ForgotPasswordView({ onBack, onEmailSent }: {
  onBack: () => void;
  onEmailSent: (email: string, type: 'reset') => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email address.'); return; }

    if (IS_DEMO) { onEmailSent(email, 'reset'); return; }

    setLoading(true);
    const toastId = toast.loading('Sending reset link…');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      toast.dismiss(toastId);

      if (error) {
        toast.error(error.message || 'Could not send reset email. Please try again.');
        setLoading(false);
        return;
      }

      onEmailSent(email.trim().toLowerCase(), 'reset');
    } catch {
      toast.dismiss(toastId);
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-[#7c98b6] hover:text-[#425b76]
          transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
      </button>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#2d3e50]">Reset your password</h1>
        <p className="text-sm text-[#7c98b6] mt-1">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#425b76] mb-1.5">
            Email address
          </label>
          <HsInput
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-white text-sm font-bold rounded-[3px] transition-colors
            disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#ff7a59' }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = '#ff8f73'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ff7a59'; }}
        >
          {loading ? <><Spinner /> Sending reset link…</> : 'Send reset link'}
        </button>
      </form>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   VIEW: EMAIL SENT (verification OR password reset)
═══════════════════════════════════════════════════ */
function EmailSentView({ email, type, onBack }: {
  email: string;
  type: 'verify' | 'reset';
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);

  const RESEND_COOLDOWN = 30; // seconds
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!resentAt) return;
    const interval = setInterval(() => {
      const secs = Math.max(0, RESEND_COOLDOWN - Math.floor((Date.now() - resentAt) / 1000));
      setCooldown(secs);
      if (secs === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [resentAt]);

  const handleResend = async () => {
    if (IS_DEMO || resending || cooldown > 0) return;
    setResending(true);
    try {
      if (type === 'reset') {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });
      } else {
        await supabase.auth.resend({ type: 'signup', email });
      }
      toast.success('Email resent! Check your inbox.');
      setResentAt(Date.now());
      setCooldown(RESEND_COOLDOWN);
    } catch {
      toast.error('Could not resend email. Please try again shortly.');
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center w-14 h-14 rounded-full mb-5"
        style={{ backgroundColor: '#fff3f0' }}>
        <Mail className="w-7 h-7" style={{ color: '#ff7a59' }} />
      </div>

      <h1 className="text-2xl font-bold text-[#2d3e50] mb-1">
        {type === 'reset' ? 'Check your email' : 'Verify your email'}
      </h1>
      <p className="text-sm text-[#7c98b6] mb-1">
        {type === 'reset'
          ? "We sent a password reset link to"
          : "We sent a verification link to"}
      </p>
      <p className="text-sm font-semibold text-[#2d3e50] mb-6">{email}</p>

      <div className="rounded-[3px] bg-[#f6f9fc] border border-[#dfe3eb] p-4 text-xs text-[#516f90] leading-relaxed mb-6">
        {type === 'reset' ? (
          <>Click the link in the email to set a new password. The link expires in <strong>1 hour</strong>.</>
        ) : (
          <>Click the link in the email to activate your account. Once verified, you can sign in.</>
        )}
      </div>

      <div className="space-y-3 text-center">
        <p className="text-sm text-[#7c98b6]">
          Didn&apos;t receive it?{' '}
          {cooldown > 0 ? (
            <span className="text-[#7c98b6]">Resend in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-[#00a38d] font-medium hover:underline disabled:opacity-60"
            >
              {resending ? 'Sending…' : 'Resend email'}
            </button>
          )}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#7c98b6] hover:text-[#425b76] transition-colors flex items-center gap-1.5 mx-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </button>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────
   Reason banner (session expired / inactivity)
───────────────────────────────────────────────────── */
function useReasonBanner() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'inactivity') {
      toast.warning('You were logged out due to 15 minutes of inactivity.', {
        title: 'Session expired',
      });
    } else if (reason === 'expired') {
      toast.info('Your session has expired. Please sign in again.', {
        title: 'Session expired',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ─────────────────────────────────────────────────────
   Inner — reads search params (must be inside Suspense)
───────────────────────────────────────────────────── */
type View = 'signin' | 'create' | 'forgot' | 'emailsent';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get('auth_error') || '';

  const [view, setView] = useState<View>('signin');
  const [emailSentAddr, setEmailSentAddr] = useState('');
  const [emailSentType, setEmailSentType] = useState<'verify' | 'reset'>('verify');

  useReasonBanner();

  // Redirect if already authenticated
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) router.replace('/dashboard');
      })
      .catch(() => {});
  }, [router]);

  const handleEmailSent = useCallback((email: string, type: 'verify' | 'reset') => {
    setEmailSentAddr(email);
    setEmailSentType(type);
    setView('emailsent');
  }, []);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F6F9FC' }}>
      {/* Left: branding */}
      <div className="hidden lg:flex lg:w-[46%] flex-shrink-0">
        <BrandPanel />
      </div>

      {/* Right: form card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-[#f6f9fc]">
        {/* Mobile logo */}
        <button onClick={() => router.push('/')}
          className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 rounded-[3px] flex items-center justify-center"
            style={{ backgroundColor: '#ff7a59' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-[#2d3e50] text-base">CRM Pro</span>
        </button>

        <div className="w-full max-w-[480px] bg-white border border-[#dfe3eb] shadow-sm rounded-[3px] p-10">
          {view === 'signin' && (
            <SignInView
              onSwitch={() => setView('create')}
              onForgot={() => setView('forgot')}
              callbackError={callbackError}
            />
          )}
          {view === 'create' && (
            <CreateAccountView
              onSwitch={() => setView('signin')}
              onEmailSent={handleEmailSent}
            />
          )}
          {view === 'forgot' && (
            <ForgotPasswordView
              onBack={() => setView('signin')}
              onEmailSent={handleEmailSent}
            />
          )}
          {view === 'emailsent' && (
            <EmailSentView
              email={emailSentAddr}
              type={emailSentType}
              onBack={() => setView('signin')}
            />
          )}
        </div>

        <p className="mt-5 text-xs text-[#7c98b6] text-center">
          {IS_DEMO
            ? 'Demo mode — add Supabase credentials in .env.local for real auth.'
            : 'Your data is encrypted and stored securely.'}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Root — wrap in Suspense for useSearchParams
───────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#ff7a59', borderTopColor: 'transparent' }} />
      </div>
    }>
      <LoginInner />
    </Suspense>
  );
}
