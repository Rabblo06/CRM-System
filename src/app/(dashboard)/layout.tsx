'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ReminderToast } from '@/components/layout/ReminderToast';
import { supabase } from '@/lib/supabase';
import { setDemoUserEmail } from '@/lib/demoUser';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { useToast } from '@/components/ui/toast';

const IS_DEMO =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder_anon_key';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();

  /* ── Session guard: check on every dashboard mount ── */
  useEffect(() => {
    if (IS_DEMO) return;

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!session) {
          router.replace('/login');
          return;
        }
        if (session.user?.email) setDemoUserEmail(session.user.email);
      })
      .catch(() => { /* network error — middleware will handle redirect */ });

    // Listen for auth state changes (token refresh, sign-out from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) setDemoUserEmail(session.user.email);

      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed — reset session start time so the 1-hour window slides forward
        const remember = localStorage.getItem('crm_remember_me') === 'true';
        if (!remember) {
          localStorage.setItem('crm_session_start', Date.now().toString());
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  /* ── Demo: scope localStorage by email ── */
  useEffect(() => {
    if (!IS_DEMO) return;
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (user?.email) setDemoUserEmail(user.email);
      })
      .catch(() => {});
  }, []);

  /* ── Inactivity auto-logout (15 min) ── */
  useInactivityLogout((reason) => {
    if (reason === 'inactivity') {
      toast.warning(
        'You were logged out due to 4 hours of inactivity.',
        { title: 'Session expired' },
      );
    } else {
      toast.info(
        'Your 4-hour session has expired. Please sign in again.',
        { title: 'Session expired' },
      );
    }
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F6F9FC' }}>
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto flex flex-col" style={{ backgroundColor: '#F6F9FC' }}>
        {children}
      </main>
      {/* Global reminder + follow-up toasts */}
      <ReminderToast />
    </div>
  );
}
