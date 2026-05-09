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
    // Give the parent window time to receive the BroadcastChannel message
    // before the popup closes. Closing immediately can drop the message.
    setTimeout(() => {
      channel.close();
      window.close();
    }, 500);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#0078D4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm" style={{ color: '#666666' }}>Completing Outlook connection…</p>
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
