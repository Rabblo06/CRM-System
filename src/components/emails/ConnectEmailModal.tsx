'use client';

import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { GmailSyncModal } from './GmailSyncModal';
import { useEmailSync } from '@/hooks/useEmailSync';

function EnvelopeIllustration() {
  return (
    <svg width="96" height="80" viewBox="0 0 96 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="20" width="68" height="48" rx="4" fill="#E8EDF5" />
      <rect x="8" y="20" width="68" height="48" rx="4" stroke="#C8D3E5" strokeWidth="1.5" />
      <path d="M8 24l34 24 34-24" stroke="#A0B0C8" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="58" y="8" width="24" height="24" rx="12" fill="#00BDA5" />
      <rect x="64" y="16" width="4" height="8" rx="2" fill="white" />
      <rect x="64" y="26" width="4" height="4" rx="2" fill="white" />
      <rect x="42" y="4" width="14" height="14" rx="7" fill="#FFB900" />
      <rect x="76" y="32" width="10" height="10" rx="5" fill="#4285F4" />
    </svg>
  );
}

function GmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path d="M4.5 39h7V23.25L2 17.5V37a2 2 0 002 2h.5z" fill="#4285F4" />
      <path d="M36.5 39H44a2 2 0 002-2V17.5l-9.5 5.75z" fill="#34A853" />
      <path d="M36.5 9L24 18.5 11.5 9 2 15.5l9.5 5.75v14.75h15V21.25L36.5 15.5z" fill="#EA4335" />
      <path d="M11.5 9H36.5L24 18.5 11.5 9z" fill="#FBBC04" />
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <rect width="28" height="28" x="4" y="10" rx="2" fill="#0078D4" />
      <rect width="22" height="22" x="22" y="14" rx="2" fill="#50B0F0" />
      <text x="10" y="29" fill="white" fontSize="14" fontWeight="bold">O</text>
    </svg>
  );
}

interface ConnectEmailModalProps {
  onClose: () => void;
  onConnected?: (email: string, provider: 'gmail' | 'outlook') => void;
}

export function ConnectEmailModal({ onClose, onConnected }: ConnectEmailModalProps) {
  const { connectGmail } = useEmailSync();
  const [showGmailSync, setShowGmailSync] = useState(false);
  const [outlookLoading, setOutlookLoading] = useState(false);

  const handleGmailConnected = (email: string) => {
    connectGmail(email);
    setShowGmailSync(false);
    onConnected?.(email, 'gmail');
    onClose();
  };

  const handleOutlookConnect = () => {
    setOutlookLoading(true);
    const popup = window.open(
      '/api/outlook/auth',
      'outlook_oauth',
      'width=520,height=640,left=200,top=100',
    );

    const channel = new BroadcastChannel('outlook_auth');
    channel.onmessage = (e) => {
      channel.close();
      popup?.close();
      setOutlookLoading(false);

      if (e.data?.type === 'success') {
        const email = e.data.email || '';
        try {
          const existing = JSON.parse(localStorage.getItem('crm_outlook_prefs') || '{}');
          localStorage.setItem('crm_outlook_prefs', JSON.stringify({
            ...existing,
            connected: true,
            email,
          }));
        } catch {}
        onConnected?.(email, 'outlook');
        onClose();
      } else {
        // OAuth failed or was cancelled — just stop loading
      }
    };

    // If popup is closed without completing OAuth
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        channel.close();
        setOutlookLoading(false);
      }
    }, 500);
  };

  if (showGmailSync) {
    return (
      <GmailSyncModal
        onConnected={(email) => handleGmailConnected(email)}
        onClose={() => setShowGmailSync(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-[95vw] p-8 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#99ACC2] hover:text-[#2D3E50] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Illustration */}
        <div className="flex justify-center mb-6">
          <EnvelopeIllustration />
        </div>

        {/* Title */}
        <h2 className="text-center text-lg font-bold text-[#2D3E50] mb-4 leading-snug">
          Connect your email account to send emails<br />and track every interaction
        </h2>

        {/* Benefits */}
        <ul className="space-y-2.5 mb-7">
          {[
            'One place to send, receive, and track every email',
            'Send mass emails to up to 2,000 recipients a day',
            'Share email templates with teammates',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-[#516F90]">
              <span className="w-4 h-4 rounded-full bg-[#E5F8F6] flex items-center justify-center flex-shrink-0">
                <Check className="w-2.5 h-2.5 text-[#00BDA5]" />
              </span>
              {item}
            </li>
          ))}
        </ul>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowGmailSync(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[#DFE3EB] rounded-lg text-sm font-medium text-[#2D3E50] hover:bg-[#F6F9FC] transition-colors"
          >
            <GmailIcon />
            Gmail
          </button>
          <button
            onClick={handleOutlookConnect}
            disabled={outlookLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[#DFE3EB] rounded-lg text-sm font-medium text-[#2D3E50] hover:bg-[#F6F9FC] transition-colors disabled:opacity-60"
          >
            {outlookLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <OutlookIcon />
            }
            {outlookLoading ? 'Connecting…' : 'Outlook'}
          </button>
        </div>
      </div>
    </div>
  );
}
