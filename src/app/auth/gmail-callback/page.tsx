'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function GmailCallbackInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const name = searchParams.get('name');
  const error = searchParams.get('error');
  const [status, setStatus] = useState<'connecting' | 'done' | 'error'>('connecting');

  useEffect(() => {
    const bc = new BroadcastChannel('gmail_auth');

    if (error) {
      bc.postMessage({ type: 'gmail_auth_error', error });
    } else if (email) {
      bc.postMessage({ type: 'gmail_auth_success', email, name });
    } else {
      bc.postMessage({ type: 'gmail_auth_error', error: 'No email returned' });
    }

    bc.close();
    setStatus('done');
    setTimeout(() => window.close(), 800);
  }, [email, name, error]);

  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center">
        {/* Gmail M icon */}
        <svg className="w-16 h-16 mx-auto mb-4" viewBox="0 0 48 48">
          <path d="M4.5 39h7V23.25L2 17.5V37a2 2 0 002 2h.5z" fill="#4285F4"/>
          <path d="M36.5 39H44a2 2 0 002-2V17.5l-9.5 5.75z" fill="#34A853"/>
          <path d="M36.5 9L24 18.5 11.5 9 2 15.5l9.5 5.75v14.75h15V21.25L36.5 15.5z" fill="#EA4335"/>
          <path d="M11.5 9H36.5L24 18.5 11.5 9z" fill="#FBBC04"/>
        </svg>

        {status === 'error' ? (
          <p className="text-sm text-red-500">Connection failed. Please close this window and try again.</p>
        ) : (
          <p className="text-sm text-gray-500">
            {error ? 'Connection failed…' : 'Connected! Closing window…'}
          </p>
        )}
      </div>
    </div>
  );
}

export default function GmailCallbackPage() {
  return (
    <Suspense>
      <GmailCallbackInner />
    </Suspense>
  );
}
