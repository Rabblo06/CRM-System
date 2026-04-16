'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutes

const IS_DEMO =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder_anon_key';

/**
 * Watches for user activity. After INACTIVITY_MS of no interaction,
 * signs the user out and redirects to /login.
 *
 * Also enforces a 1-hour hard session limit (bypassed if "Remember Me" was set).
 *
 * Safe to call in any dashboard page/layout — no-ops in demo mode.
 */
export function useInactivityLogout(
  onLogout?: (reason: 'inactivity' | 'expired') => void,
) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const doLogout = useCallback(async (reason: 'inactivity' | 'expired') => {
    await supabase.auth.signOut();
    localStorage.removeItem('crm_session_start');
    onLogoutRef.current?.(reason);
    router.push(`/login?reason=${reason}`);
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doLogout('inactivity'), INACTIVITY_MS);
  }, [doLogout]);

  useEffect(() => {
    if (IS_DEMO) return;

    // ── 1-hour hard session expiry ────────────────────────────
    const remember = typeof window !== 'undefined'
      && localStorage.getItem('crm_remember_me') === 'true';

    if (!remember) {
      const raw = localStorage.getItem('crm_session_start');
      if (raw) {
        const elapsed = Date.now() - parseInt(raw, 10);
        if (elapsed > 60 * 60 * 1000) {
          doLogout('expired');
          return;
        }
      }
    }

    // ── Inactivity detection ──────────────────────────────────
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start initial timer

    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer, doLogout]);
}
