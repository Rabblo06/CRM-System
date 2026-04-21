'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { GmailSyncModal } from './GmailSyncModal';
import { useEmailSync } from '@/hooks/useEmailSync';
import { createBrowserClient } from '@supabase/ssr';

function GmailColorIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path d="M4.5 39h7V23.25L2 17.5V37a2 2 0 002 2h.5z" fill="#4285F4"/>
      <path d="M36.5 39H44a2 2 0 002-2V17.5l-9.5 5.75z" fill="#34A853"/>
      <path d="M36.5 9L24 18.5 11.5 9 2 15.5l9.5 5.75v14.75h15V21.25L36.5 15.5z" fill="#EA4335"/>
      <path d="M11.5 9H36.5L24 18.5 11.5 9z" fill="#FBBC04"/>
    </svg>
  );
}

type SyncState =
  | { phase: 'idle' }
  | { phase: 'syncing'; synced: number; total: number; gmailEmail: string }
  | { phase: 'complete'; synced: number; gmailEmail: string }
  | { phase: 'error'; message: string };

export function GmailConnectBanner() {
  const { isConnected, connectGmail } = useEmailSync();
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sync, setSync] = useState<SyncState>({ phase: 'idle' });

  if (isConnected || dismissed) return null;

  const startRealSync = async (email: string) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    setSync({ phase: 'syncing', synced: 0, total: 500, gmailEmail: email });

    // Import Google Contacts in background
    const contactsEs = new EventSource(`/api/gmail/contacts?user_id=${user.id}`);
    contactsEs.onmessage = () => {};
    contactsEs.onerror = () => contactsEs.close();

    const es = new EventSource(`/api/gmail/sync?user_id=${user.id}`);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'total') {
          setSync(prev => prev.phase === 'syncing'
            ? { ...prev, total: msg.total }
            : prev);

        } else if (msg.type === 'progress') {
          setSync(prev => prev.phase === 'syncing'
            ? { ...prev, synced: msg.synced, total: msg.total }
            : prev);

        } else if (msg.type === 'complete') {
          es.close();
          connectGmail(email);
          setSync({ phase: 'complete', synced: msg.synced, gmailEmail: email });
          // Reload page after 2s so contacts/companies appear
          setTimeout(() => window.location.reload(), 2000);

        } else if (msg.type === 'error') {
          es.close();
          setSync({ phase: 'error', message: msg.message });
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      connectGmail(email);
      setSync({ phase: 'complete', synced: 0, gmailEmail: email });
      setTimeout(() => window.location.reload(), 2000);
    };
  };

  // ── Sync progress banner ──
  if (sync.phase === 'syncing') {
    const pct = sync.total > 0 ? Math.min(100, Math.round((sync.synced / sync.total) * 100)) : 5;
    return (
      <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-white border border-[#DFE3EB] rounded-lg shadow-sm">
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#2D3E50]">Syncing your emails ({pct}%)</p>
          <p className="text-xs text-[#7C98B6] mt-0.5">
            {sync.synced} of {sync.total} emails synced. We&apos;ll ignore spam and promotional emails.
          </p>
          <div className="mt-2 h-1 bg-[#F0F3F7] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: '#00a38d' }}
            />
          </div>
        </div>
        <button onClick={() => setSync({ phase: 'idle' })} className="text-[#99ACC2] hover:text-[#425B76]">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── Complete banner ──
  if (sync.phase === 'complete') {
    return (
      <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-[#E5F8F6] border border-[#00BDA5] rounded-lg">
        <div className="w-6 h-6 rounded-full bg-[#00BDA5] flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-sm font-semibold text-[#00BDA5] flex-1">
          Gmail synced! {sync.synced} emails imported from {sync.gmailEmail}
        </p>
        <button onClick={() => setSync({ phase: 'idle' })} className="text-[#00BDA5] opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── Error banner ──
  if (sync.phase === 'error') {
    return (
      <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-[#FFF3F0] border border-[#FF7A59] rounded-lg">
        <p className="text-sm text-[#FF7A59] flex-1">{sync.message}</p>
        <button onClick={() => setSync({ phase: 'idle' })} className="text-[#FF7A59] opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── Default connect banner ──
  return (
    <>
      <div className="mx-6 mt-4 flex items-center justify-between gap-4 px-4 py-3 bg-white border border-[#DFE3EB] rounded-lg shadow-sm">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#2D3E50]">
            Connect your email to sync all your contacts and conversations in one place
          </p>
          <p className="text-xs mt-0.5 text-[#7C98B6]">
            CRM uses this connection to organize communication history and enrich profiles with accurate job titles, locations, and more.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-[#DFE3EB] rounded-[3px] bg-white hover:bg-[#F6F9FC] text-[#2D3E50] transition-colors"
          >
            <GmailColorIcon size={14} />
            Connect Gmail
          </button>
          <button onClick={() => setDismissed(true)} className="text-[#99ACC2] hover:text-[#425B76]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showModal && (
        <GmailSyncModal
          onConnected={(email) => {
            setShowModal(false);
            startRealSync(email);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
