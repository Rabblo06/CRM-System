'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CalendarCallbackInner() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const email = params.get('email');
    const error = params.get('error');

    if (!error && email) {
      // Store success flag so the settings page can re-check connection
      localStorage.setItem('calendar_just_connected', '1');
    }

    // Redirect back to where the user came from (default: settings/calendar)
    const returnPath = localStorage.getItem('calendar_oauth_return') || '/settings';
    localStorage.removeItem('calendar_oauth_return');
    router.replace(returnPath);
  }, [params, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ color: '#516f90', fontFamily: 'sans-serif' }}>Connecting calendar...</p>
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
