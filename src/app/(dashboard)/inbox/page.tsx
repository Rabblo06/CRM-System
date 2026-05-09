'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Inbox, Search, Star, StarOff, Archive, Trash2, Reply, Forward,
  MoreHorizontal, Circle, Loader2, Mail, Send as SendIcon,
  RefreshCw, ChevronDown, ChevronUp, X, CheckCheck, Paperclip, Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { GmailSyncModal } from '@/components/emails/GmailSyncModal';
import { useEmailSync } from '@/hooks/useEmailSync';
import { isAnonymousUser } from '@/lib/demoUser';
import { TwentyPageLayout } from '@/components/layout/TwentyPageLayout';

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
type Folder = 'inbox' | 'sent' | 'starred' | 'all' | 'trash';

interface Message {
  id: string;
  thread_id: string;
  from: string;
  from_email: string;
  to_email: string;
  subject: string;
  preview: string;
  body: string;
  received_at: string;       // formatted for display
  received_at_raw: string;   // ISO string for sorting
  is_read: boolean;
  is_starred: boolean;
  is_trashed: boolean;
  has_attachment: boolean;
  contact_id?: string | null;
  company_id?: string | null;
}

interface Thread {
  id: string;
  subject: string;
  messages: Message[];
  latest: Message;
  unread_count: number;
  is_starred: boolean;
  participants: string[];
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 60_000; // 1 min

const AVATAR_COLORS = [
  '#4762D5', '#4762D5', '#4CAF8E', '#E8882A',
  '#555555', '#666666', '#6366f1', '#10b981', '#f59e0b',
];

const LS_STARRED_KEY  = 'crm_inbox_starred_v1';
const LS_TRASHED_KEY  = 'crm_inbox_trashed_v1';

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function avatarColor(name: string): string {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs  = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)   return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function fmtFull(iso: string): string {
  try { return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
}

/* ── Persist starred / trashed sets ─────────────────────── */
function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return new Set(); }
}
function saveSet(key: string, s: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...s])); } catch {}
}

/* ── Thread grouping ─────────────────────────────────────── */
function buildThreads(messages: Message[]): Thread[] {
  const map = new Map<string, Message[]>();
  for (const m of messages) {
    const tid = m.thread_id || m.id;
    if (!map.has(tid)) map.set(tid, []);
    map.get(tid)!.push(m);
  }

  return [...map.entries()]
    .map(([tid, msgs]) => {
      msgs.sort((a, b) => new Date(b.received_at_raw).getTime() - new Date(a.received_at_raw).getTime());
      const latest = msgs[0];
      const participants = [...new Set(msgs.map(m => m.from).filter(Boolean))];
      return {
        id: tid,
        subject: latest.subject,
        messages: msgs,
        latest,
        unread_count: msgs.filter(m => !m.is_read).length,
        is_starred: msgs.some(m => m.is_starred),
        participants,
      } satisfies Thread;
    })
    .sort((a, b) => new Date(b.latest.received_at_raw).getTime() - new Date(a.latest.received_at_raw).getTime());
}

/* ═══════════════════════════════════════════════════════════
   PROVIDER ICONS
═══════════════════════════════════════════════════════════ */
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

function OutlookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="3" fill="#0078D4"/>
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">O</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONNECT PROMPTS
═══════════════════════════════════════════════════════════ */
function ConnectGmailPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-2xl border border-[#EBEBEB] flex items-center justify-center bg-white shadow-sm mx-auto mb-5">
          <GmailColorIcon size={36} />
        </div>
        <h2 className="text-base font-bold mb-2" style={{ color: '#333333' }}>Connect your Gmail inbox</h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#999999' }}>
          Sync your emails to view conversations, automatically match senders to contacts, and track deals.
        </p>
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-[3px] transition-colors"
          style={{ backgroundColor: '#333333' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1a2b3c')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#333333')}
        >
          <GmailColorIcon size={16} />
          Connect Gmail
        </button>
        <p className="text-xs mt-4" style={{ color: '#B3B3B3' }}>
          Emails are stored securely. Spam and promotions are excluded.
        </p>
      </div>
    </div>
  );
}

function ConnectOutlookPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-2xl border border-[#EBEBEB] flex items-center justify-center bg-white shadow-sm mx-auto mb-5">
          <OutlookIcon size={36} />
        </div>
        <h2 className="text-base font-bold mb-2" style={{ color: '#333333' }}>Connect your Outlook inbox</h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#999999' }}>
          Sync your Outlook / Office 365 emails to view conversations, match senders to contacts, and track deals.
        </p>
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-[3px] transition-colors"
          style={{ backgroundColor: '#0078D4' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#005fa3')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0078D4')}
        >
          <OutlookIcon size={16} />
          Connect Outlook
        </button>
        <p className="text-xs mt-4" style={{ color: '#B3B3B3' }}>
          Go to Settings → Email to connect your Outlook / Office 365 account.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   THREAD ROW
═══════════════════════════════════════════════════════════ */
function ThreadRow({
  thread,
  isSelected,
  onSelect,
  onStar,
  onTrash,
  onArchive,
}: {
  thread: Thread;
  isSelected: boolean;
  onSelect: (t: Thread) => void;
  onStar: (threadId: string, e: React.MouseEvent) => void;
  onTrash: (threadId: string, e: React.MouseEvent) => void;
  onArchive: (threadId: string, e: React.MouseEvent) => void;
}) {
  const hasUnread = thread.unread_count > 0;
  const color = avatarColor(thread.latest.from);
  const count = thread.messages.length;

  return (
    <div
      onClick={() => onSelect(thread)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b group transition-colors"
      style={{
        borderColor: '#F1F1F1',
        backgroundColor: isSelected
          ? '#EEF0FB'
          : hasUnread
            ? '#FAFBFF'
            : 'transparent',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAFA'; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = hasUnread ? '#FAFBFF' : ''; }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {getInitials(thread.latest.from)}
      </div>

      <div className="flex-1 min-w-0">
        {/* Row 1: sender + time */}
        <div className="flex items-center justify-between mb-0.5">
          <span
            className="text-xs truncate"
            style={{ color: hasUnread ? '#333333' : '#666666', fontWeight: hasUnread ? 700 : 400 }}
          >
            {thread.participants.slice(0, 2).join(', ')}
            {count > 1 && (
              <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-[#F1F1F1]" style={{ color: '#999999' }}>
                {count}
              </span>
            )}
          </span>
          <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#B3B3B3', fontWeight: hasUnread ? 600 : 400 }}>
            {thread.latest.received_at}
          </span>
        </div>

        {/* Row 2: subject */}
        <div className="flex items-center gap-1 mb-0.5">
          {hasUnread && <Circle className="w-1.5 h-1.5 fill-current flex-shrink-0" style={{ color: '#4762D5' }} />}
          <p
            className="text-xs truncate"
            style={{ color: hasUnread ? '#333333' : '#999999', fontWeight: hasUnread ? 600 : 400 }}
          >
            {thread.subject}
          </p>
        </div>

        {/* Row 3: preview */}
        <p className="text-xs truncate" style={{ color: '#B3B3B3' }}>
          {thread.latest.preview}
        </p>

        {/* Contact badge */}
        {thread.latest.contact_id && (
          <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#E5F8F6', color: '#4CAF8E' }}>
            CRM contact
          </span>
        )}
      </div>

      {/* Hover actions */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 ml-1">
        <button
          onClick={e => onStar(thread.id, e)}
          className="p-1 rounded hover:bg-[#F1F1F1]"
          title={thread.is_starred ? 'Unstar' : 'Star'}
        >
          {thread.is_starred
            ? <Star className="w-3 h-3 fill-current" style={{ color: '#E8882A' }} />
            : <StarOff className="w-3 h-3" style={{ color: '#D6D6D6' }} />
          }
        </button>
        <button
          onClick={e => onArchive(thread.id, e)}
          className="p-1 rounded hover:bg-[#F1F1F1]"
          title="Archive"
        >
          <Archive className="w-3 h-3" style={{ color: '#D6D6D6' }} />
        </button>
        <button
          onClick={e => onTrash(thread.id, e)}
          className="p-1 rounded hover:bg-[#F1F1F1]"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" style={{ color: '#D6D6D6' }} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   THREAD DETAIL
═══════════════════════════════════════════════════════════ */
function ThreadDetail({
  thread,
  onClose,
  onStar,
  onTrash,
  onArchive,
  gmailEmail,
}: {
  thread: Thread;
  onClose: () => void;
  onStar: (threadId: string, e: React.MouseEvent) => void;
  onTrash: (threadId: string, e: React.MouseEvent) => void;
  onArchive: (threadId: string, e: React.MouseEvent) => void;
  gmailEmail: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Expand the latest (first) message by default
    return new Set([thread.messages[0]?.id]);
  });
  const [replyText, setReplyText] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: '#EBEBEB' }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F1F1F1] flex-shrink-0" title="Back">
            <X className="w-4 h-4" style={{ color: '#666666' }} />
          </button>
          <h2 className="text-sm font-semibold truncate" style={{ color: '#333333' }}>{thread.subject}</h2>
          {thread.messages.length > 1 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#F1F1F1] flex-shrink-0" style={{ color: '#999999' }}>
              {thread.messages.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => onStar(thread.id, e)} className="p-1.5 rounded hover:bg-[#F1F1F1]" title="Star">
            {thread.is_starred
              ? <Star className="w-4 h-4 fill-current" style={{ color: '#E8882A' }} />
              : <StarOff className="w-4 h-4" style={{ color: '#B3B3B3' }} />
            }
          </button>
          <button onClick={e => onArchive(thread.id, e)} className="p-1.5 rounded hover:bg-[#F1F1F1]" title="Archive">
            <Archive className="w-4 h-4" style={{ color: '#B3B3B3' }} />
          </button>
          <button onClick={e => onTrash(thread.id, e)} className="p-1.5 rounded hover:bg-[#F1F1F1]" title="Delete">
            <Trash2 className="w-4 h-4" style={{ color: '#B3B3B3' }} />
          </button>
          <button className="p-1.5 rounded hover:bg-[#F1F1F1]">
            <MoreHorizontal className="w-4 h-4" style={{ color: '#B3B3B3' }} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2" style={{ backgroundColor: '#FAFAFA' }}>
        {thread.messages.map((msg, idx) => {
          const expanded = expandedIds.has(msg.id);
          const isSent = msg.from_email.toLowerCase() === gmailEmail.toLowerCase();
          const color = avatarColor(msg.from);

          return (
            <div
              key={msg.id}
              className="bg-white rounded-xl border overflow-hidden"
              style={{ borderColor: '#EBEBEB' }}
            >
              {/* Message header — always visible */}
              <div
                className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#FAFBFF] transition-colors"
                onClick={() => toggleExpand(msg.id)}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {getInitials(msg.from)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: '#333333' }}>
                      {isSent ? `Me → ${msg.to_email}` : msg.from}
                    </span>
                    <span className="text-xs ml-3 flex-shrink-0" style={{ color: '#B3B3B3' }}>
                      {fmtFull(msg.received_at_raw)}
                    </span>
                  </div>
                  {!expanded && (
                    <p className="text-xs truncate mt-0.5" style={{ color: '#B3B3B3' }}>{msg.preview}</p>
                  )}
                </div>
                <div className="flex-shrink-0 ml-2">
                  {expanded
                    ? <ChevronUp className="w-4 h-4" style={{ color: '#B3B3B3' }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: '#B3B3B3' }} />
                  }
                </div>
              </div>

              {/* Message body */}
              {expanded && (
                <div className="px-5 pb-5">
                  <div className="text-xs mb-3" style={{ color: '#999999' }}>
                    <span>To: </span>
                    <span style={{ color: '#555555' }}>{msg.to_email || '(hidden)'}</span>
                    {msg.contact_id && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#E5F8F6', color: '#4CAF8E' }}>
                        CRM contact
                      </span>
                    )}
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#333333' }}>
                    {msg.body}
                  </div>
                  {msg.has_attachment && (
                    <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: '#999999' }}>
                      <Paperclip className="w-3.5 h-3.5" />Attachments
                    </div>
                  )}
                  {/* Quick reply */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => setReplyOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full font-medium transition-colors hover:bg-[#F1F1F1]"
                      style={{ borderColor: '#EBEBEB', color: '#666666' }}
                    >
                      <Reply className="w-3 h-3" />Reply
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full font-medium transition-colors hover:bg-[#F1F1F1]"
                      style={{ borderColor: '#EBEBEB', color: '#666666' }}
                    >
                      <Forward className="w-3 h-3" />Forward
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Reply composer */}
        {replyOpen && (
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#EBEBEB' }}>
            <div className="px-5 pt-4 pb-2 border-b" style={{ borderColor: '#EBEBEB' }}>
              <p className="text-xs" style={{ color: '#999999' }}>
                Reply to: <span style={{ color: '#555555' }}>{thread.latest.from_email}</span>
              </p>
            </div>
            <div className="p-4">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Reply to ${thread.latest.from}…`}
                rows={4}
                className="w-full text-sm rounded border resize-none outline-none px-3 py-2"
                style={{ borderColor: '#EBEBEB', color: '#333333' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,122,89,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = ''; }}
                autoFocus
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Button size="sm" className="gap-1.5 text-xs" disabled={!replyText.trim()}>
                    <SendIcon className="w-3 h-3" />Send
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setReplyOpen(false)}>
                    Discard
                  </Button>
                </div>
                <CheckCheck className="w-4 h-4" style={{ color: '#EBEBEB' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function InboxPage() {
  const { isConnected, gmailEmail, connectGmail, emails: seedEmails } = useEmailSync();

  // Provider switcher: 'gmail' | 'outlook'
  const [provider, setProvider] = useState<'gmail' | 'outlook'>('gmail');
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookEmail, setOutlookEmail] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('crm_outlook_prefs');
      if (raw) {
        const p = JSON.parse(raw);
        setOutlookConnected(!!p.connected);
        setOutlookEmail(p.email || '');
      }
    } catch {}
  }, []);

  const [inboxEnabled, setInboxEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('crm_gmail_prefs') || '{}');
      setInboxEnabled(prefs.enable_inbox !== false);
    } catch {
      setInboxEnabled(true);
    }
  }, []);

  const [allMessages, setAllMessages]   = useState<Message[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [folder, setFolder]             = useState<Folder>('inbox');
  const [search, setSearch]             = useState('');
  const [selectedThread, setSelected]   = useState<Thread | null>(null);
  const [page, setPage]                 = useState(1);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0 });

  // Client-side starred / trashed persistence
  const [starred, setStarred]   = useState<Set<string>>(() => typeof window !== 'undefined' ? loadSet(LS_STARRED_KEY) : new Set());
  const [trashed, setTrashed]   = useState<Set<string>>(() => typeof window !== 'undefined' ? loadSet(LS_TRASHED_KEY) : new Set());

  /* ── Map raw DB rows / seed to Message ─────────────────── */
  const mapRow = useCallback((row: Record<string, unknown>): Message => {
    const msgId = String(row.gmail_message_id || row.id || '');
    const threadId = String(row.gmail_thread_id || msgId);
    return {
      id: msgId,
      thread_id: threadId,
      from: String(row.from_name || (row.from_email as string)?.split('@')[0] || 'Unknown'),
      from_email: String(row.from_email || ''),
      to_email: String(row.to_email || ''),
      subject: String(row.subject || '(no subject)'),
      preview: String(row.body_preview || ''),
      body: String(row.body_preview || ''),
      received_at: fmtTime(String(row.received_at || '')),
      received_at_raw: String(row.received_at || new Date().toISOString()),
      is_read: Boolean(row.is_read ?? true),
      is_starred: starred.has(threadId),
      is_trashed: trashed.has(threadId),
      has_attachment: false,
      contact_id: row.contact_id ? String(row.contact_id) : null,
      company_id: row.company_id ? String(row.company_id) : null,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);   // starred/trashed applied separately to avoid remapping all on every toggle

  /* ── Load emails ─────────────────────────────────────────── */
  const loadEmails = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      if (isAnonymousUser()) {
        // Demo: use seed emails from useEmailSync
        const mapped: Message[] = seedEmails.map(e => ({
          id: e.id,
          thread_id: e.contact_id || e.id,
          from: e.from_email.split('@')[0].replace('.', ' '),
          from_email: e.from_email,
          to_email: e.to_email || '',
          subject: e.subject,
          preview: e.body_preview,
          body: e.body_preview,
          received_at: fmtTime(e.received_at),
          received_at_raw: e.received_at,
          is_read: e.is_opened,
          is_starred: starred.has(e.contact_id || e.id),
          is_trashed: trashed.has(e.contact_id || e.id),
          has_attachment: false,
          contact_id: e.contact_id || null,
          company_id: e.company_id || null,
        }));
        setAllMessages(mapped);
        return;
      }

      let query = supabase
        .from('synced_emails')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(500);

      // Filter by provider if the column exists; fall back gracefully
      if (provider === 'outlook') {
        query = query.eq('provider', 'outlook');
      } else {
        // Gmail = either explicitly 'gmail' or NULL (rows before column was added)
        query = query.or('provider.eq.gmail,provider.is.null');
      }

      const { data, error } = await query;
      if (error || !data) return;

      const seen = new Set<string>();
      const mapped: Message[] = [];
      for (const row of data) {
        const msgId = row.gmail_message_id;
        if (!msgId || seen.has(msgId)) continue;
        seen.add(msgId);
        mapped.push(mapRow(row as Record<string, unknown>));
      }
      setAllMessages(mapped);

    } catch { /* ignore — keep existing state */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mapRow, seedEmails, starred, trashed, provider]);

  // Reload when provider changes
  useEffect(() => { loadEmails(); }, [loadEmails, provider]);

  // Polling: refresh silently every minute
  useEffect(() => {
    const id = setInterval(() => loadEmails(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadEmails]);

  /* ── Apply starred/trashed to messages ──────────────────── */
  const messages = useMemo(() =>
    allMessages.map(m => ({
      ...m,
      is_starred: starred.has(m.thread_id),
      is_trashed: trashed.has(m.thread_id),
    })),
    [allMessages, starred, trashed]
  );

  /* ── Folder filtering ────────────────────────────────────── */
  const userEmail = provider === 'outlook'
    ? (outlookEmail || 'me@outlook.com')
    : (gmailEmail || 'admin@company.com');

  const folderMessages = useMemo(() => {
    switch (folder) {
      case 'inbox':
        return messages.filter(m => !m.is_trashed && m.from_email.toLowerCase() !== userEmail.toLowerCase());
      case 'sent':
        return messages.filter(m => !m.is_trashed && m.from_email.toLowerCase() === userEmail.toLowerCase());
      case 'starred':
        return messages.filter(m => !m.is_trashed && m.is_starred);
      case 'trash':
        return messages.filter(m => m.is_trashed);
      case 'all':
      default:
        return messages.filter(m => !m.is_trashed);
    }
  }, [messages, folder, userEmail]);

  /* ── Search ──────────────────────────────────────────────── */
  const searched = useMemo(() => {
    if (!search.trim()) return folderMessages;
    const q = search.toLowerCase();
    return folderMessages.filter(m =>
      m.subject.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q) ||
      m.from_email.toLowerCase().includes(q) ||
      m.preview.toLowerCase().includes(q)
    );
  }, [folderMessages, search]);

  /* ── Thread grouping ─────────────────────────────────────── */
  const threads = useMemo(() => buildThreads(searched), [searched]);

  /* ── Pagination ──────────────────────────────────────────── */
  const visibleThreads = useMemo(() => threads.slice(0, page * PAGE_SIZE), [threads, page]);
  const hasMore = visibleThreads.length < threads.length;

  /* ── Selected thread sync (re-find after state update) ──── */
  const liveThread = useMemo(() => {
    if (!selectedThread) return null;
    return threads.find(t => t.id === selectedThread.id) || null;
  }, [threads, selectedThread]);

  /* ── Counts for folder badges ────────────────────────────── */
  const counts = useMemo(() => {
    const unread = (msgs: Message[]) => buildThreads(msgs).filter(t => t.unread_count > 0).length;
    return {
      inbox:   unread(messages.filter(m => !m.is_trashed && m.from_email.toLowerCase() !== userEmail.toLowerCase())),
      sent:    0,
      starred: buildThreads(messages.filter(m => !m.is_trashed && m.is_starred)).length,
      all:     buildThreads(messages.filter(m => !m.is_trashed)).length,
      trash:   buildThreads(messages.filter(m => m.is_trashed)).length,
    };
  }, [messages, userEmail]);

  /* ── Actions ─────────────────────────────────────────────── */
  const selectThread = useCallback(async (t: Thread) => {
    setSelected(t);
    // Mark all messages in thread as read
    const unreadIds = t.messages.filter(m => !m.is_read).map(m => m.id);
    if (unreadIds.length === 0) return;
    setAllMessages(prev =>
      prev.map(m => t.messages.some(tm => tm.id === m.id) ? { ...m, is_read: true } : m)
    );
    if (!isAnonymousUser()) {
      try {
        await supabase.from('synced_emails')
          .update({ is_read: true })
          .in('gmail_message_id', unreadIds);
      } catch {}
    }
  }, []);

  const toggleStar = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred(prev => {
      const next = new Set(prev);
      next.has(threadId) ? next.delete(threadId) : next.add(threadId);
      saveSet(LS_STARRED_KEY, next);
      return next;
    });
  }, []);

  const moveToTrash = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrashed(prev => {
      const next = new Set(prev);
      next.add(threadId);
      saveSet(LS_TRASHED_KEY, next);
      return next;
    });
    if (selectedThread?.id === threadId) setSelected(null);
  }, [selectedThread]);

  const restoreFromTrash = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrashed(prev => {
      const next = new Set(prev);
      next.delete(threadId);
      saveSet(LS_TRASHED_KEY, next);
      return next;
    });
  }, []);

  const archive = useCallback(async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Archive = move to trash in our simplified model
    moveToTrash(threadId, e);
    if (!isAnonymousUser()) {
      try {
        const thread = threads.find(t => t.id === threadId);
        if (thread) {
          await supabase.from('synced_emails')
            .delete()
            .in('gmail_message_id', thread.messages.map(m => m.id));
        }
      } catch {}
    }
  }, [threads, moveToTrash]);

  /* ── Sync flow ───────────────────────────────────────────── */
  const startSync = useCallback(async (email: string) => {
    setShowSyncModal(false);
    connectGmail(email);
    setSyncing(true);
    setSyncProgress({ synced: 0, total: 500 });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) { setSyncing(false); return; }
      const es = new EventSource(`/api/gmail/sync?user_id=${user.id}`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'total')    setSyncProgress(p => ({ ...p, total: msg.total }));
          if (msg.type === 'progress') setSyncProgress({ synced: msg.synced, total: msg.total });
          if (msg.type === 'complete') { es.close(); setSyncing(false); loadEmails(); }
          if (msg.type === 'error')    { es.close(); setSyncing(false); }
        } catch {}
      };
      es.onerror = () => { es.close(); setSyncing(false); };
    } catch { setSyncing(false); }
  }, [connectGmail, loadEmails]);

  const startOutlookSync = useCallback(async () => {
    setSyncing(true);
    setSyncProgress({ synced: 0, total: 500 });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setSyncing(false); return; }
      const es = new EventSource(`/api/outlook/sync?token=${token}`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'total')    setSyncProgress(p => ({ ...p, total: msg.total }));
          if (msg.type === 'progress') setSyncProgress({ synced: msg.synced, total: msg.total });
          if (msg.type === 'complete') { es.close(); setSyncing(false); loadEmails(); }
          if (msg.type === 'error')    { es.close(); setSyncing(false); }
        } catch {}
      };
      es.onerror = () => { es.close(); setSyncing(false); };
    } catch { setSyncing(false); }
  }, [loadEmails]);

  /* ── Folder switch resets page + selection ──────────────── */
  const switchFolder = (f: Folder) => {
    setFolder(f);
    setPage(1);
    setSelected(null);
    setSearch('');
  };

  const noGmailConnected = provider === 'gmail' && !isConnected && !loading && !isAnonymousUser() && allMessages.length === 0;
  const noOutlookConnected = provider === 'outlook' && !outlookConnected && !loading && !isAnonymousUser();
  const inboxDisabled = provider === 'gmail' && isConnected && inboxEnabled === false && !isAnonymousUser();

  /* ── FOLDER NAV ──────────────────────────────────────────── */
  const FOLDERS: { id: Folder; label: string; Icon: React.ElementType }[] = [
    { id: 'inbox',   label: 'Inbox',    Icon: Inbox    },
    { id: 'sent',    label: 'Sent',     Icon: SendIcon },
    { id: 'starred', label: 'Starred',  Icon: Star     },
    { id: 'all',     label: 'All Mail', Icon: Mail     },
    { id: 'trash',   label: 'Trash',    Icon: Trash2   },
  ];

  return (
    <TwentyPageLayout
      icon={<Zap size={15} style={{ color: '#D97706' }} />}
      title="Workflows"
    >
    <div className="flex h-full" style={{ backgroundColor: '#FAFAFA' }}>

      {/* ── LEFT NAV ──────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col border-r pt-4 pb-4"
        style={{ width: 200, borderColor: '#EBEBEB', backgroundColor: '#FFFFFF' }}
      >
        {/* Brand */}
        <div className="px-4 mb-3">
          <span className="text-sm font-bold" style={{ color: '#333333' }}>Inbox</span>
        </div>

        {/* Provider switcher */}
        <div className="px-3 mb-3 flex gap-1">
          <button
            onClick={() => { setProvider('gmail'); setFolder('inbox'); setPage(1); setSelected(null); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: provider === 'gmail' ? '#FAFAFA' : 'transparent',
              color: provider === 'gmail' ? '#333333' : '#B3B3B3',
              border: provider === 'gmail' ? '1px solid #EBEBEB' : '1px solid transparent',
            }}
          >
            <GmailColorIcon size={13} />
            Gmail
          </button>
          <button
            onClick={() => { setProvider('outlook'); setFolder('inbox'); setPage(1); setSelected(null); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: provider === 'outlook' ? '#FAFAFA' : 'transparent',
              color: provider === 'outlook' ? '#333333' : '#B3B3B3',
              border: provider === 'outlook' ? '1px solid #EBEBEB' : '1px solid transparent',
            }}
          >
            <OutlookIcon size={13} />
            Outlook
          </button>
        </div>

        {/* Account badge */}
        <div className="px-4 mb-2">
          {provider === 'gmail' && isConnected && gmailEmail && (
            <p className="text-[10px] truncate" style={{ color: '#B3B3B3' }}>{gmailEmail}</p>
          )}
          {provider === 'outlook' && outlookConnected && outlookEmail && (
            <p className="text-[10px] truncate" style={{ color: '#B3B3B3' }}>{outlookEmail}</p>
          )}
        </div>

        {/* Folder list */}
        <nav className="px-2 space-y-0.5 flex-1">
          {FOLDERS.map(({ id, label, Icon }) => {
            const active = folder === id;
            const badge = id === 'inbox' ? counts.inbox
              : id === 'starred' ? counts.starred
              : id === 'trash' ? counts.trash
              : id === 'all' ? counts.all
              : 0;
            return (
              <button
                key={id}
                onClick={() => switchFolder(id)}
                className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: active ? '#EEF0FB' : 'transparent',
                  color: active ? '#4762D5' : '#666666',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAFA'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {label}
                </div>
                {badge > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: active ? '#4762D5' : '#F1F1F1', color: active ? '#fff' : '#666666' }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Refresh button */}
        <div className="px-4 mt-2">
          <button
            onClick={() => loadEmails(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs transition-colors w-full px-3 py-2 rounded-lg"
            style={{ color: '#B3B3B3' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#666666'; (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAFA'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#B3B3B3'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Connect/Sync buttons */}
        {provider === 'gmail' && !isConnected && !isAnonymousUser() && (
          <div className="px-4 mt-2">
            <button
              onClick={() => setShowSyncModal(true)}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors"
              style={{ backgroundColor: '#EEF0FB', color: '#4762D5' }}
            >
              <GmailColorIcon size={12} />
              Connect Gmail
            </button>
          </div>
        )}
        {provider === 'outlook' && outlookConnected && !isAnonymousUser() && (
          <div className="px-4 mt-2">
            <button
              onClick={startOutlookSync}
              disabled={syncing}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors"
              style={{ backgroundColor: '#EBF5FB', color: '#0078D4' }}
            >
              <OutlookIcon size={12} />
              {syncing ? 'Syncing…' : 'Sync Outlook'}
            </button>
          </div>
        )}
        {provider === 'outlook' && !outlookConnected && !isAnonymousUser() && (
          <div className="px-4 mt-2">
            <a
              href="/settings?tab=email"
              className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors"
              style={{ backgroundColor: '#EBF5FB', color: '#0078D4', display: 'flex' }}
            >
              <OutlookIcon size={12} />
              Connect Outlook
            </a>
          </div>
        )}
      </div>

      {/* ── THREAD LIST ───────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col border-r"
        style={{ width: 320, borderColor: '#EBEBEB', backgroundColor: '#ffffff' }}
      >
        {/* List header */}
        <div className="px-4 pt-4 pb-3 border-b flex-shrink-0" style={{ borderColor: '#EBEBEB' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold capitalize" style={{ color: '#333333' }}>
                {folder === 'all' ? 'All Mail' : folder.charAt(0).toUpperCase() + folder.slice(1)}
              </h2>
              <span className="text-xs" style={{ color: '#B3B3B3' }}>
                {threads.length} thread{threads.length !== 1 ? 's' : ''}
              </span>
            </div>
            {syncing && (
              <div className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#4CAF8E' }} />
                <span className="text-[10px]" style={{ color: '#999999' }}>
                  {syncProgress.synced}/{syncProgress.total || '…'}
                </span>
              </div>
            )}
          </div>

          {/* Sync progress bar */}
          {syncing && (
            <div className="h-0.5 bg-[#F1F1F1] rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: syncProgress.total > 0 ? `${Math.min(100, Math.round(syncProgress.synced / syncProgress.total * 100))}%` : '5%',
                  backgroundColor: '#4CAF8E',
                }}
              />
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#B3B3B3' }} />
            <Input
              placeholder="Search emails…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); setSelected(null); }}
              className="pl-8 text-xs"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[#F1F1F1]">
                <X className="w-3.5 h-3.5" style={{ color: '#B3B3B3' }} />
              </button>
            )}
          </div>
        </div>

        {/* Thread rows */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#EBEBEB' }} />
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Inbox className="w-8 h-8 mx-auto mb-2" style={{ color: '#EBEBEB' }} />
              <p className="text-sm" style={{ color: '#999999' }}>
                {search ? 'No results found' : `No ${folder === 'all' ? '' : folder + ' '}emails`}
              </p>
            </div>
          ) : (
            <>
              {visibleThreads.map(thread => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  isSelected={liveThread?.id === thread.id}
                  onSelect={selectThread}
                  onStar={toggleStar}
                  onTrash={folder === 'trash' ? restoreFromTrash : moveToTrash}
                  onArchive={archive}
                />
              ))}

              {/* Load more */}
              {hasMore && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="w-full py-3 text-xs font-medium transition-colors hover:bg-[#FAFAFA]"
                  style={{ color: '#666666' }}
                >
                  Load {Math.min(PAGE_SIZE, threads.length - visibleThreads.length)} more…
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT: DETAIL PANEL ───────────────────────────── */}
      {inboxDisabled ? (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="text-center max-w-sm px-6">
            <div className="w-16 h-16 rounded-2xl border border-[#EBEBEB] flex items-center justify-center bg-white shadow-sm mx-auto mb-5">
              <Mail className="w-8 h-8" style={{ color: '#999999' }} />
            </div>
            <h2 className="text-base font-bold mb-2" style={{ color: '#333333' }}>Inbox not enabled</h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: '#999999' }}>
              Your Gmail account is connected but the Inbox feature was not enabled. Go to Settings → Email to re-connect and enable it.
            </p>
            <a
              href="/settings?tab=email"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-[3px]"
              style={{ backgroundColor: '#4762D5' }}
            >
              Go to Email Settings
            </a>
          </div>
        </div>
      ) : noGmailConnected ? (
        <ConnectGmailPrompt onConnect={() => setShowSyncModal(true)} />
      ) : noOutlookConnected ? (
        <ConnectOutlookPrompt onConnect={() => { window.location.href = '/settings?tab=email'; }} />
      ) : liveThread ? (
        <ThreadDetail
          thread={liveThread}
          onClose={() => setSelected(null)}
          onStar={toggleStar}
          onTrash={folder === 'trash' ? restoreFromTrash : moveToTrash}
          onArchive={archive}
          gmailEmail={userEmail}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="text-center">
            <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: '#EBEBEB' }} />
            <p className="text-sm font-medium" style={{ color: '#999999' }}>Select a conversation to read</p>
            <p className="text-xs mt-1" style={{ color: '#B3B3B3' }}>
              {counts.inbox > 0
                ? `${counts.inbox} unread thread${counts.inbox !== 1 ? 's' : ''} in Inbox`
                : 'All caught up!'}
            </p>
          </div>
        </div>
      )}

      {/* Gmail Sync Modal */}
      {showSyncModal && (
        <GmailSyncModal
          onConnected={(email) => startSync(email)}
          onClose={() => setShowSyncModal(false)}
        />
      )}
    </div>
    </TwentyPageLayout>
  );
}
