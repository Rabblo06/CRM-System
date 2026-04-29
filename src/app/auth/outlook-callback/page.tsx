'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function OutlookCallbackInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const email = searchParams.get('email') || '';
    const name = searchParams.get('name') || '';
    const error = searchParams.get('error');

    const channel = new BroadcastChannel('outlook_auth');
    if (error) {
      channel.postMessage({ type: 'error', error });
    } else {
      channel.postMessage({ type: 'success', email, name });
    }
    channel.close();
    window.close();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F6F9FC' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#0078D4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm" style={{ color: '#516F90' }}>Completing Outlook connection…</p>
      </div>
    </div>
  );
}

export default function OutlookCallbackPage() {
  return (
    <Suspense>
      <OutlookCallbackInner />
    </Suspense>
  );
}
