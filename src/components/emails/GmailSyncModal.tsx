'use client';

import { useState, useEffect } from 'react';
import { X, Link2, Shield, Zap, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface GmailSyncModalProps {
  onConnected: (email: string, name: string, opts: { importContacts: boolean; enableInbox: boolean }) => void;
  onClose: () => void;
}

type Step = 'info' | 'connecting' | 'error';

const FEATURES = [
  {
    icon: <Link2 className="w-4 h-4 text-[#333333]" />,
    title: "You'll sign in to Google to confirm what's shared",
    desc: 'Give CRM access to your Gmail data — including emails and contacts — so you can view and send emails from CRM.',
  },
  {
    icon: <Shield className="w-4 h-4 text-[#333333]" />,
    title: 'Your data is secure',
    desc: 'Gmail data powers the CRM products you use. Tokens are stored server-side and never exposed to the browser.',
  },
  {
    icon: <Zap className="w-4 h-4 text-[#333333]" />,
    title: 'Automatically enrich contacts & companies',
    desc: 'Email senders are imported as CRM contacts. Company domains are extracted and added to your companies list.',
  },
];

function GmailM({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path d="M4.5 39h7V23.25L2 17.5V37a2 2 0 002 2h.5z" fill="#4285F4"/>
      <path d="M36.5 39H44a2 2 0 002-2V17.5l-9.5 5.75z" fill="#34A853"/>
      <path d="M36.5 9L24 18.5 11.5 9 2 15.5l9.5 5.75v14.75h15V21.25L36.5 15.5z" fill="#EA4335"/>
      <path d="M11.5 9H36.5L24 18.5 11.5 9z" fill="#FBBC04"/>
    </svg>
  );
}

function CRMIcon() {
  return (
    <div className="w-12 h-12 rounded-xl border border-[#EBEBEB] flex items-center justify-center bg-white">
      <svg width="28" height="28" viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="30" r="30" fill="#4762D5"/>
        <path d="M35 18v9.2a5.5 5.5 0 103 0V18h-3zm1.5 19a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="white"/>
        <path d="M26 36a2 2 0 01-2 2H18v-4h6a2 2 0 012 2zm-8-9h10v4H18v-4z" fill="white"/>
      </svg>
    </div>
  );
}

export function GmailSyncModal({ onConnected, onClose }: GmailSyncModalProps) {
  const [step, setStep] = useState<Step>('info');
  const [dotIndex, setDotIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [popupRef, setPopupRef] = useState<Window | null>(null);
  const [importContacts, setImportContacts] = useState(true);
  const [enableInbox, setEnableInbox] = useState(true);

  // Animate connecting dots
  useEffect(() => {
    if (step !== 'connecting') return;
    const t = setInterval(() => setDotIndex(i => (i + 1) % 3), 400);
    return () => clearInterval(t);
  }, [step]);

  // Listen for OAuth result via BroadcastChannel (immune to COOP restrictions)
  useEffect(() => {
    if (step !== 'connecting') return;
    const bc = new BroadcastChannel('gmail_auth');
    bc.onmessage = (event) => {
      bc.close();
      try { popupRef?.close(); } catch {}
      if (event.data?.type === 'gmail_auth_success') {
        onConnected(event.data.email, event.data.name || '', { importContacts, enableInbox });
        onClose();
      } else if (event.data?.type === 'gmail_auth_error') {
        setErrorMsg(event.data.error || 'Authentication failed');
        setStep('error');
      }
    };
    return () => bc.close();
  }, [step, popupRef, onConnected, onClose]);

  // Detect if popup was closed manually
  useEffect(() => {
    if (!popupRef || step !== 'connecting') return;
    const t = setInterval(() => {
      try {
        if (popupRef.closed) {
          clearInterval(t);
          setStep('info');
        }
      } catch {
        // COOP may block .closed access; ignore
      }
    }, 500);
    return () => clearInterval(t);
  }, [popupRef, step]);

  const handleGoToGoogle = async () => {
    setStep('connecting');
    setErrorMsg('');

    try {
      // Get current Supabase user ID
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        setErrorMsg('You must be logged in to connect Gmail.');
        setStep('error');
        return;
      }

      // Open OAuth popup
      const width = 520, height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        `/api/gmail/auth?user_id=${user.id}`,
        'gmail_oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popup) {
        setErrorMsg('Popup was blocked. Please allow popups for this site and try again.');
        setStep('error');
        return;
      }

      setPopupRef(popup);
    } catch {
      setErrorMsg('Failed to start authentication. Please try again.');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={step === 'info' || step === 'error' ? onClose : undefined} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* ── INFO STEP ── */}
        {step === 'info' && (
          <div className="p-6">
            <button onClick={onClose} className="absolute top-4 right-4 text-[#B3B3B3] hover:text-[#555555]">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-[#333333] mb-5">Sync your Gmail account</h2>

            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl border border-[#EBEBEB] flex items-center justify-center bg-white">
                <GmailM size={28} />
              </div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#999999]">
                <path d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <CRMIcon />
            </div>

            <div className="divide-y divide-[#EBEBEB]">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-3 py-4">
                  <div className="flex-shrink-0 mt-0.5">{f.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-[#333333] mb-0.5">{f.title}</p>
                    <p className="text-xs text-[#999999] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Options */}
            <div className="mt-4 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importContacts}
                  onChange={e => setImportContacts(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#4762D5] flex-shrink-0"
                />
                <div>
                  <p className="text-xs font-semibold text-[#333333]">Import contacts from Google</p>
                  <p className="text-xs text-[#999999]">Sync Google Contacts into CRM. No duplicates.</p>
                </div>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableInbox}
                  onChange={e => setEnableInbox(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#4762D5] flex-shrink-0"
                />
                <div>
                  <p className="text-xs font-semibold text-[#333333]">Enable inbox sync</p>
                  <p className="text-xs text-[#999999]">Access your Gmail inbox inside CRM.</p>
                </div>
              </label>
            </div>

            <button
              onClick={handleGoToGoogle}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#333333' }}
            >
              Go to Google
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </button>

            <p className="text-xs text-center text-[#B3B3B3] mt-3">
              A Google sign-in popup will open.
            </p>
          </div>
        )}

        {/* ── CONNECTING STEP ── */}
        {step === 'connecting' && (
          <div className="py-14 px-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl border-2 border-[#EBEBEB] flex items-center justify-center bg-white shadow-sm mb-6">
              <GmailM size={36} />
            </div>
            <div className="flex gap-1.5 mb-4">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full transition-colors duration-200"
                  style={{ backgroundColor: i === dotIndex ? '#333333' : '#EBEBEB' }}
                />
              ))}
            </div>
            <p className="text-sm font-bold text-[#333333] mb-1">Connecting your account</p>
            <p className="text-xs text-[#999999]">Complete the sign-in in the popup window…</p>
          </div>
        )}

        {/* ── ERROR STEP ── */}
        {step === 'error' && (
          <div className="p-6">
            <button onClick={onClose} className="absolute top-4 right-4 text-[#B3B3B3] hover:text-[#555555]">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-[#333333] mb-2">Connection failed</h3>
              <p className="text-xs text-[#999999] mb-5">{errorMsg}</p>
              <button
                onClick={() => setStep('info')}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: '#333333' }}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
