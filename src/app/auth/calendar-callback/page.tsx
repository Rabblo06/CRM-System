'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CalendarCallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'connecting' | 'done' | 'error'>('connecting');

  useEffect(() => {
    const email = params.get('email');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setTimeout(() => router.replace('/settings?tab=calendar'), 2500);
      return;
    }

    if (email) {
      localStorage.setItem('calendar_just_connected', '1');
      setStatus('done');
    }

    const returnPath = localStorage.getItem('calendar_oauth_return') || '/settings?tab=calendar';
    localStorage.removeItem('calendar_oauth_return');
    setTimeout(() => router.replace(returnPath), 800);
  }, [params, router]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', gap: 12 }}>
      {status === 'error' ? (
        <>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#EEF0FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#4762D5', fontSize: 22 }}>✕</span>
          </div>
          <p style={{ color: '#4762D5', fontWeight: 600, fontSize: 14 }}>Connection failed</p>
          <p style={{ color: '#999999', fontSize: 12 }}>Redirecting back to settings…</p>
        </>
      ) : status === 'done' ? (
        <>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#E5F8F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#4CAF8E', fontSize: 22 }}>✓</span>
          </div>
          <p style={{ color: '#4CAF8E', fontWeight: 600, fontSize: 14 }}>Calendar connected!</p>
          <p style={{ color: '#999999', fontSize: 12 }}>Taking you back to settings…</p>
        </>
      ) : (
        <p style={{ color: '#666666', fontSize: 14 }}>Connecting calendar…</p>
      )}
    </div>
  );
}

export default function CalendarCallbackPage() {
  return (
    <Suspense>
      <CalendarCallbackInner />
    </Suspense>
  );
}
