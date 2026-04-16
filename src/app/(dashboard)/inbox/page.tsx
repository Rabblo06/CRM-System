'use client';

import { useState, useEffect, useCallback } from 'react';
import { Inbox, Search, Star, StarOff, Archive, Trash2, Reply, Forward, MoreHorizontal, Paperclip, Circle, Loader2, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { GmailSyncModal } from '@/components/emails/GmailSyncModal';
import { useEmailSync } from '@/hooks/useEmailSync';
import { isAnonymousUser } from '@/lib/demoUser';

interface Message {
  id: string;
  from: string;
  from_email: string;
  subject: string;
  preview: string;
  body: string;
  received_at: string;
  received_at_raw: string;
  is_read: boolean;
  is_starred: boolean;
  has_attachment: boolean;
  contact_id?: string | null;
  company_id?: string | null;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch {
    return iso;
  }
}

const AVATAR_COLORS = ['#FF7A59', '#0091AE', '#00BDA5', '#F5C26B', '#425B76', '#516F90', '#6366f1', '#10b981'];

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

function ConnectGmailPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#F6F9FC' }}>
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-2xl border border-[#DFE3EB] flex items-center justify-center bg-white shadow-sm mx-auto mb-5">
          <GmailColorIcon size={36} />
        </div>
        <h2 className="text-base font-bold text-[#2D3E50] mb-2">Connect your Gmail inbox</h2>
        <p className="text-sm text-[#7C98B6] mb-6 leading-relaxed">
          Sync your emails to view conversations here, automatically match senders to contacts, and track your deals.
        </p>
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-[3px] transition-colors"
          style={{ backgroundColor: '#2D3E50' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1a2b3c')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2D3E50')}
        >
          <GmailColorIcon size={16} />
          Connect Gmail
        </button>
        <p className="text-xs text-[#99ACC2] mt-4">
          Emails are stored securely. Spam and promotional messages are excluded.
        </p>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { isConnected, gmailEmail, connectGmail } = useEmailSync();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [search, setSearch] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0 });

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      if (isAnonymousUser()) {
        // Demo mode — keep empty, show connect prompt
        setMessages([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('synced_emails')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        const mapped: Message[] = data.map((row) => ({
          id: row.gmail_message_id,
          from: row.from_name || row.from_email?.split('@')[0] || 'Unknown',
          from_email: row.from_email || '',
          subject: row.subject || '(no subject)',
          preview: row.body_preview || '',
          body: row.body_preview || '',
          received_at: formatRelativeTime(row.received_at),
          received_at_raw: row.received_at,
          is_read: row.is_read ?? true,
          is_starred: false,
          has_attachment: false,
          contact_id: row.contact_id,
          company_id: row.company_id,
        }));
        setMessages(mapped);
      }
    } catch { /* keep empty */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const filtered = messages.filter(m =>
    !search ||
    m.from.toLowerCase().includes(search.toLowerCase()) ||
    m.subject.toLowerCase().includes(search.toLowerCase()) ||
    m.from_email.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = messages.filter(m => !m.is_read).length;

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_starred: !m.is_starred } : m));
  };

  const markRead = async (msg: Message) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    setSelected(msg);
    if (!msg.is_read) {
      try {
        await supabase.from('synced_emails').update({ is_read: true }).eq('gmail_message_id', msg.id);
      } catch { /* ignore */ }
    }
  };

  const archiveMessage = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) setSelected(null);
    try {
      await supabase.from('synced_emails').delete().eq('gmail_message_id', id);
    } catch { /* ignore */ }
  };

  const startSync = async (email: string) => {
    setShowSyncModal(false);
    connectGmail(email);
    setSyncing(true);
    setSyncProgress({ synced: 0, total: 500 });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) { setSyncing(false); return; }

      const es = new EventSource(`/api/gmail/sync?user_id=${user.id}`);
      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'total') setSyncProgress(p => ({ ...p, total: msg.total }));
          if (msg.type === 'progress') setSyncProgress({ synced: msg.synced, total: msg.total });
          if (msg.type === 'complete') {
            es.close();
            setSyncing(false);
            loadEmails();
          }
          if (msg.type === 'error') {
            es.close();
            setSyncing(false);
          }
        } catch {}
      };
      es.onerror = () => { es.close(); setSyncing(false); };
    } catch {
      setSyncing(false);
    }
  };

  const noGmailConnected = !isConnected && !loading && messages.length === 0 && !isAnonymousUser();

  return (
    <div className="flex h-full" style={{ backgroundColor: '#F6F9FC' }}>
      {/* Left panel: message list */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r" style={{ borderColor: '#DFE3EB', backgroundColor: '#ffffff' }}>
        {/* Header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>Inbox</h1>
              {unreadCount > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FF7A59', color: '#fff' }}>
                  {unreadCount}
                </span>
              )}
            </div>
            {isConnected && gmailEmail && (
              <span className="text-xs truncate max-w-[140px]" style={{ color: '#99ACC2' }}>{gmailEmail}</span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#99ACC2' }} />
            <Input
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>
          {syncing && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#00BDA5' }} />
                <span className="text-xs" style={{ color: '#7C98B6' }}>
                  Syncing {syncProgress.synced}/{syncProgress.total || '…'}
                </span>
              </div>
              <div className="h-1 bg-[#F0F3F7] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: syncProgress.total > 0
                      ? `${Math.min(100, Math.round(syncProgress.synced / syncProgress.total * 100))}%`
                      : '5%',
                    backgroundColor: '#00BDA5',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#DFE3EB' }} />
            </div>
          ) : filtered.length === 0 && !noGmailConnected ? (
            <div className="text-center py-16 px-4">
              <Inbox className="w-8 h-8 mx-auto mb-2" style={{ color: '#DFE3EB' }} />
              <p className="text-sm" style={{ color: '#7C98B6' }}>
                {search ? 'No messages match your search' : 'No emails yet'}
              </p>
              {!isConnected && !search && (
                <button
                  onClick={() => setShowSyncModal(true)}
                  className="mt-3 text-xs font-semibold underline"
                  style={{ color: '#FF7A59' }}
                >
                  Connect Gmail
                </button>
              )}
            </div>
          ) : (
            filtered.map((msg) => {
              const colorIdx = msg.from.charCodeAt(0) % AVATAR_COLORS.length;
              const isSelected = selected?.id === msg.id;
              return (
                <div
                  key={msg.id}
                  onClick={() => markRead(msg)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer border-b transition-colors group"
                  style={{
                    borderColor: '#F0F3F7',
                    backgroundColor: isSelected ? '#FFF3F0' : !msg.is_read ? '#FAFBFF' : undefined,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#F6F9FC'; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = !msg.is_read ? '#FAFBFF' : ''; }}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: AVATAR_COLORS[colorIdx] }}
                  >
                    {getInitials(msg.from)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold truncate" style={{ color: msg.is_read ? '#516F90' : '#2D3E50' }}>
                        {msg.from}
                      </span>
                      <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#99ACC2' }}>{msg.received_at}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-0.5">
                      {!msg.is_read && <Circle className="w-1.5 h-1.5 fill-current flex-shrink-0" style={{ color: '#FF7A59' }} />}
                      <p className="text-xs font-medium truncate" style={{ color: msg.is_read ? '#7C98B6' : '#2D3E50' }}>
                        {msg.subject}
                      </p>
                    </div>
                    <p className="text-xs truncate" style={{ color: '#99ACC2' }}>{msg.preview}</p>
                    {msg.contact_id && (
                      <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#E5F8F6', color: '#00BDA5' }}>
                        Contact matched
                      </span>
                    )}
                  </div>

                  {/* Actions on hover */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 ml-1">
                    <button onClick={(e) => toggleStar(msg.id, e)} className="p-1 rounded hover:bg-[#F0F3F7]">
                      {msg.is_starred
                        ? <Star className="w-3 h-3 fill-current" style={{ color: '#F5C26B' }} />
                        : <StarOff className="w-3 h-3" style={{ color: '#B0C1D4' }} />
                      }
                    </button>
                    <button onClick={(e) => archiveMessage(msg.id, e)} className="p-1 rounded hover:bg-[#F0F3F7]">
                      <Archive className="w-3 h-3" style={{ color: '#B0C1D4' }} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel */}
      {noGmailConnected ? (
        <ConnectGmailPrompt onConnect={() => setShowSyncModal(true)} />
      ) : selected ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Message header */}
          <div className="px-6 py-4 border-b bg-white" style={{ borderColor: '#DFE3EB' }}>
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>{selected.subject}</h2>
              <div className="flex items-center gap-1">
                <button onClick={(e) => toggleStar(selected.id, e)} className="p-1.5 rounded hover:bg-[#F0F3F7]">
                  {selected.is_starred
                    ? <Star className="w-4 h-4 fill-current" style={{ color: '#F5C26B' }} />
                    : <StarOff className="w-4 h-4" style={{ color: '#99ACC2' }} />
                  }
                </button>
                <button onClick={() => archiveMessage(selected.id)} className="p-1.5 rounded hover:bg-[#F0F3F7]">
                  <Archive className="w-4 h-4" style={{ color: '#99ACC2' }} />
                </button>
                <button className="p-1.5 rounded hover:bg-[#F0F3F7]">
                  <Trash2 className="w-4 h-4" style={{ color: '#99ACC2' }} />
                </button>
                <button className="p-1.5 rounded hover:bg-[#F0F3F7]">
                  <MoreHorizontal className="w-4 h-4" style={{ color: '#99ACC2' }} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs" style={{ color: '#7C98B6' }}>
                From: <span style={{ color: '#425B76' }}>{selected.from}</span>{' '}
                &lt;{selected.from_email}&gt;
              </p>
              {selected.has_attachment && <Paperclip className="w-3 h-3" style={{ color: '#7C98B6' }} />}
              {selected.contact_id && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#E5F8F6', color: '#00BDA5' }}>
                  Contact in CRM
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#F6F9FC' }}>
            <div className="bg-white rounded-xl p-6 border border-[#DFE3EB] max-w-2xl">
              <p className="text-xs text-[#99ACC2] mb-4">{selected.received_at_raw ? new Date(selected.received_at_raw).toLocaleString() : selected.received_at}</p>
              <p className="text-sm leading-relaxed" style={{ color: '#2D3E50' }}>{selected.body}</p>
              {selected.body === selected.preview && (
                <p className="text-xs mt-4 text-[#99ACC2] italic">This is a preview. Full email body is not stored.</p>
              )}
            </div>
          </div>

          {/* Reply area */}
          <div className="border-t bg-white p-4" style={{ borderColor: '#DFE3EB' }}>
            <textarea
              className="w-full rounded-lg border px-4 py-3 text-sm resize-none placeholder:text-[#99ACC2]"
              style={{ borderColor: '#DFE3EB', color: '#2D3E50', height: 80 }}
              placeholder={`Reply to ${selected.from}...`}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#FF7A59'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,122,89,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#DFE3EB'; e.currentTarget.style.boxShadow = ''; }}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Button size="sm" className="gap-1.5 text-xs">
                  <Reply className="w-3.5 h-3.5" /> Reply
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Forward className="w-3.5 h-3.5" /> Forward
                </Button>
              </div>
              <span className="text-xs" style={{ color: '#99ACC2' }}>{selected.received_at}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#F6F9FC' }}>
          <div className="text-center">
            <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: '#DFE3EB' }} />
            <p className="text-sm font-medium" style={{ color: '#7C98B6' }}>Select a message to read</p>
            <p className="text-xs mt-1" style={{ color: '#99ACC2' }}>
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
      )}

      {/* Gmail Sync Modal */}
      {showSyncModal && (
        <GmailSyncModal
          onConnected={(email, _name) => startSync(email)}
          onClose={() => setShowSyncModal(false)}
        />
      )}
    </div>
  );
}
