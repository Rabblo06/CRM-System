'use client';

import { Trash2, ExternalLink } from 'lucide-react';
import type { SyncedEmail } from '@/hooks/useEmailSync';

function GmailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="white" stroke="#DFE3EB" strokeWidth="1.5"/>
      <path d="M2 6l10 7L22 6" stroke="none"/>
      <path d="M2 7l10 6.5L22 7" fill="none"/>
      {/* Gmail M */}
      <path d="M4 8l8 5 8-5" stroke="#EA4335" strokeWidth="1.5" fill="none"/>
      <path d="M4 8v9h2.5V11l5.5 3.5 5.5-3.5v6H20V8l-8 5-8-5z" fill="#EA4335"/>
      <path d="M4 8l8 5 8-5v9H4V8z" fill="none"/>
    </svg>
  );
}

function GmailBadge() {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFF3F0' }}>
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path d="M4.5 39h7V23.25L2 17.5V37a2 2 0 002 2h.5z" fill="#4285F4"/>
        <path d="M36.5 39h7.5a2 2 0 002-2V17.5l-9.5 5.75z" fill="#34A853"/>
        <path d="M36.5 11l-12.5 9.5L11.5 11 2 17.5l9.5 5.75v14.75h15V23.25L36.5 17.5z" fill="#EA4335"/>
        <path d="M2 17.5l9.5 5.75V11L2 17.5z" fill="#C5221F"/>
        <path d="M36.5 11v6.5l9.5-5.75L36.5 11z" fill="#1B6ECB"/>
        <path d="M46 17.5l-9.5 5.75v14.75h-2V25.3L46 17.5z" fill="#34A853"/>
        <path d="M24 20.5L11.5 11H36.5L24 20.5z" fill="#FBBC04"/>
      </svg>
    </div>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 1) return `${Math.round(diffH * 60)}m ago`;
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface EmailActivityCardProps {
  email: SyncedEmail;
  onDelete: (id: string) => void;
}

export function EmailActivityCard({ email, onDelete }: EmailActivityCardProps) {
  const isSent = email.from_email === 'admin@company.com';

  return (
    <div className="bg-white border border-[#DFE3EB] rounded-lg p-4 hover:border-[#CBD6E2] transition-colors group">
      <div className="flex items-start gap-3">
        <GmailBadge />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-[#2D3E50] truncate">{email.subject}</span>
              {!email.is_opened && !isSent && (
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#FF7A59]" title="Unread" />
              )}
            </div>
            <span className="text-xs text-[#99ACC2] flex-shrink-0">{fmtTime(email.received_at)}</span>
          </div>

          {/* From/to */}
          <p className="text-xs text-[#7C98B6] mb-2">
            {isSent
              ? <><span className="font-medium">You</span> → {email.to_email}</>
              : <><span className="font-medium">{email.from_email}</span> → You</>
            }
          </p>

          {/* Body preview */}
          <p className="text-xs text-[#516F90] line-clamp-2 mb-3">{email.body_preview}</p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const url = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(email.subject)}`;
                window.open(url, '_blank');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-semibold border transition-colors hover:opacity-80"
              style={{ color: '#00a38d', borderColor: '#00a38d' }}
            >
              <ExternalLink className="w-3 h-3" />
              Open email
            </button>
            <button
              onClick={() => onDelete(email.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-[3px] text-[#99ACC2] hover:text-red-400 hover:bg-red-50 transition-all"
              title="Remove from CRM"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
