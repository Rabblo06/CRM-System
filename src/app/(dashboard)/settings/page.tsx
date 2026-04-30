'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User, Database, Bell, Shield, Check, Mail, Phone, Calendar, CheckSquare,
  Zap, Plus, X, Send, Trash2, Edit2, UserPlus, ChevronRight, PhoneCall,
  RefreshCw, Loader2,
} from 'lucide-react';
import { useEmailSync } from '@/hooks/useEmailSync';
import { GmailSyncModal } from '@/components/emails/GmailSyncModal';
import { useCalendar } from '@/hooks/useCalendar';
import { useUserSettings } from '@/hooks/useUserSettings';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'calling', label: 'Calling', icon: Phone },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Database },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'users', label: 'Users & Teams', icon: UserPlus },
];

const MOCK_USERS = [
  { id: 1, name: 'Sales Admin', email: 'admin@company.com', role: 'Admin', status: 'active', initials: 'SA' },
  { id: 2, name: 'John Smith', email: 'john@company.com', role: 'Sales Rep', status: 'active', initials: 'JS' },
  { id: 3, name: 'Emma Wilson', email: 'emma@company.com', role: 'Sales Rep', status: 'pending', initials: 'EW' },
];

type Workflow = { id: string; trigger: string; action: string; active: boolean };
const DEFAULT_WORKFLOWS: Workflow[] = [
  { id: 'wf1', trigger: 'New contact created',    action: 'Send welcome email',    active: true  },
  { id: 'wf2', trigger: 'Deal moved to Proposal',  action: 'Create follow-up task', active: true  },
  { id: 'wf3', trigger: 'Deal won',                action: 'Notify team on Slack',  active: false },
  { id: 'wf4', trigger: 'Task overdue by 2 days',  action: 'Email manager',         active: false },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
      style={{ backgroundColor: checked ? '#FF7A59' : '#DFE3EB' }}
    >
      <div
        className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#DFE3EB] rounded-xl p-5">
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>{title}</h3>}
          {description && <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'profile');
  const [saved, setSaved] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Sales Rep');
  const [users, setUsers] = useState(MOCK_USERS);
  const [inviteSent, setInviteSent] = useState(false);
  const { settings, loading: settingsLoading, toast: settingsToast, updateSetting } = useUserSettings();

  // Workflow automation rules — persisted to localStorage
  const [workflows, setWorkflows] = useState<Workflow[]>(DEFAULT_WORKFLOWS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('crm_workflows');
      if (raw) setWorkflows(JSON.parse(raw));
    } catch {}
  }, []);
  const toggleWorkflow = (id: string) => {
    setWorkflows((prev: typeof DEFAULT_WORKFLOWS) => {
      const next = prev.map(w => w.id === id ? { ...w, active: !w.active } : w);
      try { localStorage.setItem('crm_workflows', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [showCalendarProviderModal, setShowCalendarProviderModal] = useState(false);
  const [showCalendarPolicyModal, setShowCalendarPolicyModal] = useState(false);
  const [selectedCalendarProvider, setSelectedCalendarProvider] = useState('');
  const { isConnected: calendarConnected, calendarEmail, loading: calendarLoading, connectCalendar, disconnectCalendar } = useCalendar();

  // Phone number state
  const [phones, setPhones] = useState<{ number: string; label: string }[]>([]);
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState(1);
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneLabel, setPhoneLabel] = useState('Outbound number');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('crm_calling_phones') || '[]');
      setPhones(stored);
    } catch {}
  }, []);

  const savePhones = (updated: { number: string; label: string }[]) => {
    setPhones(updated);
    localStorage.setItem('crm_calling_phones', JSON.stringify(updated));
  };

  const handleAddPhone = () => {
    if (!phoneInput.trim()) return;
    savePhones([...phones, { number: `${countryCode} ${phoneInput.trim()}`, label: phoneLabel }]);
    setShowAddPhone(false);
    setPhoneInput('');
    setPhoneLabel('Outbound number');
    setCountryCode('+1');
  };

  const closePhoneModal = () => {
    setShowAddPhone(false);
    setPhoneInput('');
    setPhoneLabel('Outbound number');
    setCountryCode('+1');
  };
  // Gmail connect flow
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailSyncing, setGmailSyncing] = useState(false);
  type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';
  const [gmailSyncStatus, setGmailSyncStatus] = useState<SyncStatus>('idle');
  const [gmailLastSync, setGmailLastSync] = useState<string | null>(() => {
    try { return localStorage.getItem('crm_gmail_last_sync'); } catch { return null; }
  });
  const [gmailSyncError, setGmailSyncError] = useState('');
  const [outlookSyncStatus, setOutlookSyncStatus] = useState<SyncStatus>('idle');
  const [outlookLastSync, setOutlookLastSync] = useState<string | null>(() => {
    try { return localStorage.getItem('crm_outlook_last_sync'); } catch { return null; }
  });
  const [outlookSyncError, setOutlookSyncError] = useState('');

  // Gmail disconnect flow
  const [showGmailDisconnectModal, setShowGmailDisconnectModal] = useState(false);
  const [showDisconnectPopup, setShowDisconnectPopup] = useState(false);
  const [disconnectCountdown, setDisconnectCountdown] = useState(10);

  // Outlook connect flow
  const [showOutlookConfirmModal, setShowOutlookConfirmModal] = useState(false);
  const [outlookImportContacts, setOutlookImportContacts] = useState(true);
  const [outlookEnableInbox, setOutlookEnableInbox] = useState(true);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookEmail, setOutlookEmail] = useState('');
  const [showOutlookDisconnectModal, setShowOutlookDisconnectModal] = useState(false);
  const [outlookSyncing, setOutlookSyncing] = useState(false);
  const [outlookOAuthError, setOutlookOAuthError] = useState('');

  const { isConnected: gmailConnected, gmailEmail, connectGmail, disconnectGmail } = useEmailSync();

  // Load Outlook status — DB is authoritative, fall back to localStorage
  useEffect(() => {
    (async () => {
      try {
        const { createBrowserClient } = await import('@supabase/ssr');
        const sb = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data } = await sb.from('outlook_tokens').select('email').eq('user_id', user.id).maybeSingle();
          if (data) {
            setOutlookConnected(true);
            setOutlookEmail(data.email || '');
            try {
              const existing = JSON.parse(localStorage.getItem('crm_outlook_prefs') || '{}');
              localStorage.setItem('crm_outlook_prefs', JSON.stringify({ ...existing, connected: true, email: data.email || '' }));
            } catch {}
            return;
          }
        }
      } catch {}
      // Fall back to localStorage
      try {
        const raw = localStorage.getItem('crm_outlook_prefs');
        if (raw) {
          const p = JSON.parse(raw);
          setOutlookConnected(!!p.connected);
          setOutlookEmail(p.email || '');
        }
      } catch {}
    })();
  }, []);

  // Load Gmail status — if localStorage says not connected, check DB
  useEffect(() => {
    if (gmailConnected) return;
    (async () => {
      try {
        const { createBrowserClient } = await import('@supabase/ssr');
        const sb = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data } = await sb.from('google_tokens').select('gmail_email').eq('user_id', user.id).maybeSingle();
          if (data?.gmail_email) {
            connectGmail(data.gmail_email);
          }
        }
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGmailOAuthSuccess = async (email: string, _name: string, opts: { importContacts: boolean; enableInbox: boolean }) => {
    connectGmail(email);
    setShowGmailModal(false);
    if (opts.importContacts) {
      setGmailSyncing(true);
      try { await fetch('/api/google/contacts', { method: 'POST' }); } catch {}
      setGmailSyncing(false);
    }
    if (opts.enableInbox) {
      handleGmailSyncNow();
    }
  };

  const handleGmailSyncNow = () => {
    setGmailSyncStatus('syncing');
    setGmailSyncError('');
    const es = new EventSource('/api/gmail/sync');
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'complete' || msg.type === 'error') {
          es.close();
          if (msg.type === 'complete') {
            const now = new Date().toLocaleString();
            setGmailSyncStatus('done');
            setGmailLastSync(now);
            try { localStorage.setItem('crm_gmail_last_sync', now); } catch {}
          } else {
            setGmailSyncStatus('error');
            setGmailSyncError(msg.message || 'Sync failed');
          }
        }
      } catch {}
    };
    es.onerror = () => {
      es.close();
      setGmailSyncStatus('error');
      setGmailSyncError('Connection error during sync');
    };
  };

  const handleOutlookSyncNow = async () => {
    setOutlookSyncStatus('syncing');
    setOutlookSyncError('');
    try {
      const { createBrowserClient } = await import('@supabase/ssr');
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      if (!token) { setOutlookSyncStatus('error'); setOutlookSyncError('Not authenticated'); return; }
      await new Promise<void>((resolve) => {
        const es = new EventSource(`/api/outlook/sync?token=${token}`);
        es.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'complete' || msg.type === 'error') {
              es.close();
              if (msg.type === 'complete') {
                const now = new Date().toLocaleString();
                setOutlookSyncStatus('done');
                setOutlookLastSync(now);
                try { localStorage.setItem('crm_outlook_last_sync', now); } catch {}
              } else {
                setOutlookSyncStatus('error');
                setOutlookSyncError(msg.message || 'Sync failed');
              }
              resolve();
            }
          } catch {}
        };
        es.onerror = () => {
          es.close();
          setOutlookSyncStatus('error');
          setOutlookSyncError('Connection error during sync');
          resolve();
        };
      });
    } catch (err) {
      setOutlookSyncStatus('error');
      setOutlookSyncError(err instanceof Error ? err.message : 'Sync failed');
    }
  };

  const handleDisconnectGmail = async () => {
    setShowGmailDisconnectModal(false);
    disconnectGmail();
    try { localStorage.removeItem('crm_gmail_prefs'); } catch {}
    const { createBrowserClient } = await import('@supabase/ssr');
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('contacts').delete().eq('created_by', user.id);
      await supabase.from('companies').delete().eq('created_by', user.id);
      await supabase.from('synced_emails').delete().eq('user_id', user.id);
      await supabase.from('google_tokens').delete().eq('user_id', user.id);
    }
    setShowDisconnectPopup(true);
    let count = 10;
    setDisconnectCountdown(count);
    const interval = setInterval(() => {
      count--;
      setDisconnectCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        window.location.reload();
      }
    }, 1000);
  };

  const handleOutlookConnectContinue = () => {
    try {
      localStorage.setItem('crm_outlook_prefs', JSON.stringify({
        import_contacts: outlookImportContacts,
        enable_inbox: outlookEnableInbox,
        connected: false,
      }));
    } catch {}
    setShowOutlookConfirmModal(false);

    const width = 520, height = 640;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open('/api/outlook/auth', 'outlook_oauth', `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`);

    const channel = new BroadcastChannel('outlook_auth');
    let handled = false;

    const onSuccess = async (email: string) => {
      setOutlookConnected(true);
      setOutlookEmail(email);
      try {
        localStorage.setItem('crm_outlook_prefs', JSON.stringify({ connected: true, email, import_contacts: outlookImportContacts, enable_inbox: outlookEnableInbox }));
      } catch {}
      if (outlookImportContacts) {
        setOutlookSyncing(true);
        try {
          const { createBrowserClient } = await import('@supabase/ssr');
          const sb = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { session } } = await sb.auth.getSession();
          const token = session?.access_token;
          if (token) {
            await new Promise<void>((resolve) => {
              const es = new EventSource(`/api/outlook/contacts?token=${token}`);
              es.onmessage = (ev) => {
                try {
                  const msg = JSON.parse(ev.data);
                  if (msg.type === 'complete' || msg.type === 'error') { es.close(); resolve(); }
                } catch {}
              };
              es.onerror = () => { es.close(); resolve(); };
            });
          }
        } catch {}
        setOutlookSyncing(false);
      }
      if (outlookEnableInbox) {
        handleOutlookSyncNow();
      }
    };

    channel.onmessage = async (e) => {
      if (handled) return;
      channel.close();
      popup?.close();
      if (e.data?.type === 'success') {
        handled = true;
        setOutlookOAuthError('');
        await onSuccess(e.data.email || '');
      } else if (e.data?.type === 'error') {
        // Show error but don't mark handled — popup-closed DB check will confirm
        setOutlookOAuthError(
          e.data.error === 'access_denied' ? 'Access was denied. Please try again and approve the permissions.'
          : e.data.error === 'token_exchange_failed' ? 'Could not exchange the auth code. Check your Microsoft app credentials.'
          : e.data.error ? `Connection failed: ${e.data.error}`
          : 'Connection failed. Please try again.'
        );
      }
    };

    // Always check DB when popup closes — ground-truth fallback
    const checkClosed = setInterval(() => {
      try {
        if (popup?.closed) {
          clearInterval(checkClosed);
          channel.close();
          if (!handled) {
            (async () => {
              try {
                const { createBrowserClient } = await import('@supabase/ssr');
                const sb = createBrowserClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                const { data: { user } } = await sb.auth.getUser();
                if (user) {
                  const { data } = await sb.from('outlook_tokens').select('email').eq('user_id', user.id).maybeSingle();
                  if (data) {
                    handled = true;
                    setOutlookOAuthError('');
                    await onSuccess(data.email || '');
                  }
                }
              } catch {}
            })();
          }
        }
      } catch {}
    }, 500);
  };

  const handleDisconnectOutlook = async () => {
    setShowOutlookDisconnectModal(false);
    try {
      const { createBrowserClient } = await import('@supabase/ssr');
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      if (token) {
        await fetch('/api/outlook/disconnect', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    setOutlookConnected(false);
    setOutlookEmail('');
    try { localStorage.removeItem('crm_outlook_prefs'); } catch {}
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    setInviteSent(true);
    setTimeout(() => {
      setUsers(prev => [...prev, {
        id: Date.now(), name: inviteEmail.split('@')[0], email: inviteEmail,
        role: inviteRole, status: 'pending', initials: inviteEmail.slice(0, 2).toUpperCase(),
      }]);
      setInviteSent(false);
      setShowInviteModal(false);
      setInviteEmail('');
    }, 1500);
  };

  return (
    <div className="flex h-full" style={{ backgroundColor: '#F6F9FC' }}>
      {/* Toast notification */}
      {settingsToast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-white text-xs font-medium transition-all"
          style={{ backgroundColor: settingsToast === 'saved' ? '#00BDA5' : '#FF7A59' }}
        >
          {settingsToast === 'saved' ? (
            <><Check className="w-3.5 h-3.5" /> Settings saved successfully</>
          ) : (
            <><X className="w-3.5 h-3.5" /> Failed to save settings</>
          )}
        </div>
      )}

      {/* Left tab sidebar */}
      <div className="w-52 flex-shrink-0 border-r py-6 px-3 space-y-0.5" style={{ borderColor: '#DFE3EB', backgroundColor: '#ffffff' }}>
        <p className="text-xs font-semibold px-3 mb-3" style={{ color: '#7C98B6' }}>SETTINGS</p>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left"
              style={{
                backgroundColor: isActive ? '#FFF3F0' : undefined,
                color: isActive ? '#FF7A59' : '#516F90',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#F6F9FC'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = ''; }}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1">{tab.label}</span>
              {isActive && <ChevronRight className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Right content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {/* Profile */}
        {activeTab === 'profile' && (
          <>
            <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Profile Settings</h2>
            <SectionCard title="Profile Information" description="Your name and contact information">
              <div className="flex items-center gap-4 mb-5">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="text-lg font-bold" style={{ backgroundColor: '#FFF3F0', color: '#FF7A59' }}>SA</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">Change Photo</Button>
                  <p className="text-xs mt-1" style={{ color: '#7C98B6' }}>JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
              <div className="space-y-3 max-w-md">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>First Name</Label><Input defaultValue="Sales" /></div>
                  <div className="space-y-1"><Label>Last Name</Label><Input defaultValue="Admin" /></div>
                </div>
                <div className="space-y-1"><Label>Email</Label><Input defaultValue="admin@company.com" type="email" /></div>
                <div className="space-y-1"><Label>Job Title</Label><Input defaultValue="Sales Manager" /></div>
                <div className="space-y-1"><Label>Phone</Label><Input defaultValue="+1 (555) 000-0000" /></div>
                <div className="space-y-1">
                  <Label>Time Zone</Label>
                  <Select defaultValue="eastern">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eastern">Eastern Time (ET)</SelectItem>
                      <SelectItem value="central">Central Time (CT)</SelectItem>
                      <SelectItem value="mountain">Mountain Time (MT)</SelectItem>
                      <SelectItem value="pacific">Pacific Time (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="gap-1.5">
                  {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : 'Save Changes'}
                </Button>
              </div>
            </SectionCard>
          </>
        )}

        {/* Email */}
        {activeTab === 'email' && (
          <>
            <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Email Settings</h2>
            <SectionCard title="Email Integration" description="Connect your email account to log emails automatically">
              <div className="space-y-4 max-w-md">
                {/* Gmail row */}
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: gmailConnected ? '#00BDA5' : '#DFE3EB' }}>
                  <div className="flex items-center justify-between p-3" style={{ backgroundColor: gmailConnected ? '#F0FBF9' : undefined }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F0F3F7' }}>
                        <svg width="18" height="18" viewBox="0 0 48 48">
                          <path d="M4.5 39h7V23.25L2 17.5V37a2 2 0 002 2h.5z" fill="#4285F4"/>
                          <path d="M36.5 39H44a2 2 0 002-2V17.5l-9.5 5.75z" fill="#34A853"/>
                          <path d="M36.5 9L24 18.5 11.5 9 2 15.5l9.5 5.75v14.75h15V21.25L36.5 15.5z" fill="#EA4335"/>
                          <path d="M11.5 9H36.5L24 18.5 11.5 9z" fill="#FBBC04"/>
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>Gmail</p>
                          {gmailConnected && <Check className="w-3.5 h-3.5" style={{ color: '#00BDA5' }} />}
                          {gmailSyncing && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E5F5F8', color: '#0091AE' }}>Syncing contacts…</span>}
                        </div>
                        <p className="text-xs" style={{ color: gmailConnected ? '#00BDA5' : '#7C98B6' }}>
                          {gmailConnected ? gmailEmail : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {gmailConnected ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={handleGmailSyncNow}
                          disabled={gmailSyncStatus === 'syncing'}
                          className="gap-1 text-xs"
                        >
                          {gmailSyncStatus === 'syncing'
                            ? <><Loader2 className="w-3 h-3 animate-spin" />Syncing…</>
                            : <><RefreshCw className="w-3 h-3" />Sync now</>
                          }
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowGmailDisconnectModal(true)} className="text-red-500 border-red-200 hover:bg-red-50">Disconnect</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setShowGmailModal(true)}>Connect</Button>
                    )}
                  </div>
                  {gmailConnected && (gmailSyncStatus !== 'idle' || gmailLastSync) && (
                    <div className="px-3 py-1.5 border-t text-xs flex items-center gap-2" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
                      {gmailSyncStatus === 'syncing' && <span style={{ color: '#0091AE' }}>Syncing inbox emails…</span>}
                      {gmailSyncStatus === 'done' && <><Check className="w-3 h-3" style={{ color: '#00BDA5' }} /><span style={{ color: '#00BDA5' }}>Synced · Last: {gmailLastSync}</span></>}
                      {gmailSyncStatus === 'error' && <span style={{ color: '#FF7A59' }}>Error: {gmailSyncError}</span>}
                      {gmailSyncStatus === 'idle' && gmailLastSync && <span style={{ color: '#7C98B6' }}>Last synced: {gmailLastSync}</span>}
                    </div>
                  )}
                </div>

                {/* Outlook row */}
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: outlookConnected ? '#00BDA5' : '#DFE3EB' }}>
                  <div className="flex items-center justify-between p-3" style={{ backgroundColor: outlookConnected ? '#F0FBF9' : undefined }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F0F3F7' }}>
                        <Mail className="w-4 h-4" style={{ color: '#0078D4' }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>Outlook / Office 365</p>
                          {outlookConnected && <Check className="w-3.5 h-3.5" style={{ color: '#00BDA5' }} />}
                          {outlookSyncing && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E5F5F8', color: '#0091AE' }}>Syncing contacts…</span>}
                        </div>
                        <p className="text-xs" style={{ color: outlookConnected ? '#00BDA5' : '#7C98B6' }}>
                          {outlookConnected ? outlookEmail : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {outlookConnected ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={handleOutlookSyncNow}
                          disabled={outlookSyncStatus === 'syncing'}
                          className="gap-1 text-xs"
                        >
                          {outlookSyncStatus === 'syncing'
                            ? <><Loader2 className="w-3 h-3 animate-spin" />Syncing…</>
                            : <><RefreshCw className="w-3 h-3" />Sync now</>
                          }
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowOutlookDisconnectModal(true)} className="text-red-500 border-red-200 hover:bg-red-50">Disconnect</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => { setOutlookOAuthError(''); setShowOutlookConfirmModal(true); }}>Connect</Button>
                    )}
                  </div>
                  {outlookOAuthError && !outlookConnected && (
                    <div className="px-3 py-1.5 border-t text-xs flex items-center gap-2" style={{ borderColor: '#FECDD3', backgroundColor: '#FFF1F2' }}>
                      <X className="w-3 h-3 flex-shrink-0" style={{ color: '#FF7A59' }} />
                      <span style={{ color: '#FF7A59' }}>{outlookOAuthError}</span>
                    </div>
                  )}
                  {outlookConnected && (outlookSyncStatus !== 'idle' || outlookLastSync) && (
                    <div className="px-3 py-1.5 border-t text-xs flex items-center gap-2" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
                      {outlookSyncStatus === 'syncing' && <span style={{ color: '#0091AE' }}>Syncing inbox emails…</span>}
                      {outlookSyncStatus === 'done' && <><Check className="w-3 h-3" style={{ color: '#00BDA5' }} /><span style={{ color: '#00BDA5' }}>Synced · Last: {outlookLastSync}</span></>}
                      {outlookSyncStatus === 'error' && <span style={{ color: '#FF7A59' }}>Error: {outlookSyncError}</span>}
                      {outlookSyncStatus === 'idle' && outlookLastSync && <span style={{ color: '#7C98B6' }}>Last synced: {outlookLastSync}</span>}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Tracking toggles — only when Gmail connected */}
            {gmailConnected && (
              <SectionCard title="Email Tracking" description="Control how your Gmail sync behaves in the CRM">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#2D3E50' }}>Track email opens</p>
                      <p className="text-xs" style={{ color: '#7C98B6' }}>Get notified when recipients open your emails</p>
                    </div>
                    <Toggle checked={settings.email_tracking} onChange={v => updateSetting('email_tracking', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#2D3E50' }}>Log to CRM</p>
                      <p className="text-xs" style={{ color: '#7C98B6' }}>Automatically log emails to contact and company records</p>
                    </div>
                    <Toggle checked={settings.log_to_crm} onChange={v => updateSetting('log_to_crm', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#2D3E50' }}>Email opens</p>
                      <p className="text-xs" style={{ color: '#7C98B6' }}>Get notified when emails are opened</p>
                    </div>
                    <Toggle checked={settings.notif_email_open} onChange={v => updateSetting('notif_email_open', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#2D3E50' }}>Link clicks</p>
                      <p className="text-xs" style={{ color: '#7C98B6' }}>Get notified when links are clicked</p>
                    </div>
                    <Toggle checked={settings.notif_email_click} onChange={v => updateSetting('notif_email_click', v)} />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Gmail OAuth popup modal */}
            {showGmailModal && (
              <GmailSyncModal
                onConnected={handleGmailOAuthSuccess}
                onClose={() => setShowGmailModal(false)}
              />
            )}

            {/* Gmail Disconnect confirmation modal */}
            {showGmailDisconnectModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowGmailDisconnectModal(false); }}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ border: '1px solid #DFE3EB' }}>
                  <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: '#DFE3EB' }}>
                    <h3 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>Disconnect Gmail?</h3>
                    <button onClick={() => setShowGmailDisconnectModal(false)} className="text-[#7C98B6] hover:text-[#2D3E50]"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="text-xs" style={{ color: '#516F90' }}>
                      Disconnecting Gmail will:
                    </p>
                    <ul className="space-y-1.5">
                      {[
                        'Remove your Gmail connection from the CRM',
                        'Delete all synced contacts and companies',
                        'Delete all synced emails from the inbox',
                        'Revoke the CRM\'s access to your Google account',
                      ].map(item => (
                        <li key={item} className="flex items-start gap-2 text-xs" style={{ color: '#516F90' }}>
                          <X className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#FF7A59' }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>This action cannot be undone.</p>
                  </div>
                  <div className="px-5 py-3.5 border-t flex items-center justify-end gap-2" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
                    <Button variant="outline" size="sm" onClick={() => setShowGmailDisconnectModal(false)}>Keep connected</Button>
                    <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={handleDisconnectGmail}>
                      Yes, disconnect
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Outlook Connect confirmation modal */}
            {showOutlookConfirmModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowOutlookConfirmModal(false); }}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" style={{ border: '1px solid #DFE3EB' }}>
                  <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: '#0078D4' }}>
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-white" />
                      <h3 className="text-sm font-semibold text-white">Connect Outlook / Office 365</h3>
                    </div>
                    <button onClick={() => setShowOutlookConfirmModal(false)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-xs" style={{ color: '#516F90' }}>
                      Choose what to enable when connecting your Microsoft account:
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={outlookImportContacts}
                          onChange={e => setOutlookImportContacts(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded accent-[#0078D4] flex-shrink-0"
                        />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#2D3E50' }}>Import contacts from Microsoft Contacts</p>
                          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>Sync your Outlook contacts into the CRM as leads.</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={outlookEnableInbox}
                          onChange={e => setOutlookEnableInbox(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded accent-[#0078D4] flex-shrink-0"
                        />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#2D3E50' }}>Enable Inbox feature</p>
                          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>Access your Outlook inbox directly inside the CRM.</p>
                        </div>
                      </label>
                    </div>
                    <div className="p-3 rounded-lg border text-xs" style={{ borderColor: '#DFE3EB', color: '#7C98B6', backgroundColor: '#F6F9FC' }}>
                      We only use your Microsoft data to power these features. We never sell or share your data with third parties.
                    </div>
                  </div>
                  <div className="px-5 py-3.5 border-t flex items-center justify-end gap-2" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
                    <Button variant="outline" size="sm" onClick={() => setShowOutlookConfirmModal(false)}>Cancel</Button>
                    <Button size="sm" style={{ backgroundColor: '#0078D4', color: '#fff' }} onClick={handleOutlookConnectContinue}>
                      Continue to Microsoft
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Outlook Disconnect confirmation modal */}
            {showOutlookDisconnectModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowOutlookDisconnectModal(false); }}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ border: '1px solid #DFE3EB' }}>
                  <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: '#DFE3EB' }}>
                    <h3 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>Disconnect Outlook?</h3>
                    <button onClick={() => setShowOutlookDisconnectModal(false)} className="text-[#7C98B6] hover:text-[#2D3E50]"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="text-xs" style={{ color: '#516F90' }}>
                      Disconnecting Outlook will remove the integration and revoke CRM access to your Microsoft account. This action cannot be undone.
                    </p>
                  </div>
                  <div className="px-5 py-3.5 border-t flex items-center justify-end gap-2" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
                    <Button variant="outline" size="sm" onClick={() => setShowOutlookDisconnectModal(false)}>Keep connected</Button>
                    <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={handleDisconnectOutlook}>
                      Yes, disconnect
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Disconnect success popup */}
            {showDisconnectPopup && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-7 h-7 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[#2D3E50] mb-2">Disconnected Successfully</h3>
                  <p className="text-sm text-[#7C98B6] mb-6">
                    Your Gmail has been disconnected and all synced contacts, companies and emails have been removed.
                    Reloading in <span className="font-bold text-[#2D3E50]">{disconnectCountdown}s</span>…
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-2.5 rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: '#2D3E50' }}
                  >
                    Go Back Now
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Calling */}
        {activeTab === 'calling' && (
          <>
            <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Calling Settings</h2>
            <p className="text-xs -mt-2" style={{ color: '#7C98B6' }}>These preferences only apply to you.</p>

            {/* Phone numbers */}
            <SectionCard title="CRM Calling" description="Connect an outbound phone number to log, track, and make calls in the CRM">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs mb-4"
                onClick={() => { setShowAddPhone(true); setPhoneStep(1); }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add phone number
              </Button>

              {phones.length > 0 && (
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#DFE3EB' }}>
                  <div className="grid grid-cols-[1fr_auto_auto] text-xs font-semibold px-4 py-2.5" style={{ backgroundColor: '#F6F9FC', color: '#7C98B6', borderBottom: '1px solid #DFE3EB' }}>
                    <span>PHONE NUMBER</span>
                    <span className="px-8">NUMBER TYPE</span>
                    <span />
                  </div>
                  {phones.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3" style={{ borderTop: i > 0 ? '1px solid #DFE3EB' : undefined }}>
                      <span className="text-xs font-medium" style={{ color: '#2D3E50' }}>{p.number}</span>
                      <div className="px-8">
                        <span className="text-xs" style={{ color: '#516F90' }}>{p.label}</span>
                        <p className="text-[10px]" style={{ color: '#99ACC2' }}>Outbound calling only</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="text-xs h-7 px-3">Actions</Button>
                        <button
                          className="p-1.5 rounded hover:bg-[#FFF0EE] transition-colors ml-1"
                          onClick={() => savePhones(phones.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="w-3.5 h-3.5" style={{ color: '#FF7A59' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {phones.length === 0 && (
                <div className="border border-dashed rounded-lg p-6 text-center" style={{ borderColor: '#DFE3EB' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2.5" style={{ backgroundColor: '#F0F3F7' }}>
                    <PhoneCall className="w-5 h-5" style={{ color: '#99ACC2' }} />
                  </div>
                  <p className="text-xs font-medium mb-1" style={{ color: '#2D3E50' }}>No phone numbers added</p>
                  <p className="text-xs" style={{ color: '#7C98B6' }}>Add a number to make and log calls directly from the CRM</p>
                </div>
              )}
            </SectionCard>

            {/* Device ringing */}
            <SectionCard title="Device Ringing" description="Set how you want to receive inbound calls">
              <div className="max-w-xs">
                <Select defaultValue="browser">
                  <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Ring in CRM browser</SelectItem>
                    <SelectItem value="phone">Ring on my phone</SelectItem>
                    <SelectItem value="both">Ring both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SectionCard>

            <SectionCard title="Call Logging" description="Automatically log call activity in CRM">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>Auto-log all calls</p>
                  <p className="text-xs" style={{ color: '#7C98B6' }}>Automatically create call activity records</p>
                </div>
                <Toggle checked={settings.auto_log_calls} onChange={v => updateSetting('auto_log_calls', v)} />
              </div>
            </SectionCard>
          </>
        )}

        {/* Calendar */}
        {activeTab === 'calendar' && (
          <>
            <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Calendar</h2>

            {calendarLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-[#0091AE] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !calendarConnected ? (
              /* ---- NOT CONNECTED ---- */
              <SectionCard title="" description="">
                <div className="max-w-lg">
                  <h3 className="text-sm font-semibold mb-1" style={{ color: '#2D3E50' }}>Calendar</h3>
                  <p className="text-xs mb-4" style={{ color: '#516F90' }}>
                    Connect your calendar to send meetings, log meetings automatically, and sync your calendar.
                  </p>
                  <ul className="space-y-2 mb-6">
                    {[
                      'Send meetings directly from the CRM',
                      'Log outgoing meetings automatically',
                      'Sync your calendar so contacts can schedule time with you',
                      'See your CRM tasks in your calendar',
                    ].map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E6FBF8' }}>
                          <Check className="w-2.5 h-2.5" style={{ color: '#00BDA5' }} />
                        </div>
                        <span className="text-xs" style={{ color: '#2D3E50' }}>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => setShowCalendarProviderModal(true)}
                    style={{ backgroundColor: '#00BDA5', color: '#fff' }}
                    className="hover:opacity-90"
                  >
                    Connect your calendar
                  </Button>
                </div>
              </SectionCard>
            ) : (
              /* ---- CONNECTED ---- */
              <>
                <SectionCard title="ACCOUNT" description="">
                  <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: '#00BDA5', backgroundColor: '#F0FBF9' }}>
                    <div className="flex items-center gap-3">
                      {/* Google logo */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fff', border: '1px solid #DFE3EB' }}>
                        <svg width="18" height="18" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>Google Calendar</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00BDA5' }} />
                          <p className="text-xs" style={{ color: '#00BDA5' }}>Connected · {calendarEmail}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={disconnectCalendar}
                      className="text-red-500 border-red-200 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  </div>
                </SectionCard>

                {settingsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-[#0091AE] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : null}
                <SectionCard title="ACCOUNT SETTINGS" description="" >
                  <div className="space-y-5">
                    {/* Calendar Sync */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#2D3E50' }}>Calendar Sync</p>
                          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>
                            Auto-log meetings from your calendar to CRM contacts
                          </p>
                        </div>
                        <Toggle checked={settings.calendar_sync} onChange={v => updateSetting('calendar_sync', v)} />
                      </div>
                    </div>

                    <div className="border-t" style={{ borderColor: '#DFE3EB' }} />

                    {/* Tasks Calendar Sync */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#2D3E50' }}>Tasks Calendar Sync</p>
                          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>
                            Show your CRM tasks as events in Google Calendar
                          </p>
                        </div>
                        <Toggle checked={settings.tasks_calendar_sync} onChange={v => updateSetting('tasks_calendar_sync', v)} />
                      </div>
                    </div>

                    <div className="border-t" style={{ borderColor: '#DFE3EB' }} />

                    {/* Meeting Scheduling Pages */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#2D3E50' }}>Meeting Scheduling Pages</p>
                          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>
                            Let contacts schedule meetings directly from a booking link
                          </p>
                        </div>
                        <Toggle checked={settings.meeting_scheduling} onChange={v => updateSetting('meeting_scheduling', v)} />
                      </div>
                    </div>

                    <div className="border-t" style={{ borderColor: '#DFE3EB' }} />

                    {/* Availability Calendars */}
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#2D3E50' }}>Availability Calendars</p>
                      <p className="text-xs mb-2" style={{ color: '#7C98B6' }}>
                        Calendars used to check your availability for scheduling
                      </p>
                      <Select
                        value={settings.availability_calendar || calendarEmail || ''}
                        onValueChange={v => updateSetting('availability_calendar', v)}
                      >
                        <SelectTrigger className="max-w-xs text-xs h-8">
                          <SelectValue placeholder="Select calendar" />
                        </SelectTrigger>
                        <SelectContent>
                          {calendarEmail && (
                            <SelectItem value={calendarEmail}>{calendarEmail}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-t" style={{ borderColor: '#DFE3EB' }} />

                    {/* Out of office */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#2D3E50' }}>Out of office</p>
                          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>
                            Automatically block scheduling when you mark out of office in Google Calendar
                          </p>
                        </div>
                        <Toggle checked={settings.out_of_office} onChange={v => updateSetting('out_of_office', v)} />
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </>
            )}

            {/* ---- Provider Modal ---- */}
            {showCalendarProviderModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setShowCalendarProviderModal(false); }}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" style={{ border: '1px solid #DFE3EB' }}>
                  <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: '#0091AE' }}>
                    <h3 className="text-sm font-semibold text-white">Connect your calendar</h3>
                    <button onClick={() => setShowCalendarProviderModal(false)} className="text-white/70 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="text-xs" style={{ color: '#516F90' }}>Select your calendar provider to connect:</p>
                    {[
                      {
                        id: 'google',
                        label: 'Google / Gmail',
                        sublabel: 'Connect Google Calendar',
                        logo: (
                          <svg width="20" height="20" viewBox="0 0 48 48">
                            <path d="M4.5 39h7V23.25L2 17.5V37a2 2 0 002 2h.5z" fill="#4285F4"/>
                            <path d="M36.5 39H44a2 2 0 002-2V17.5l-9.5 5.75z" fill="#34A853"/>
                            <path d="M36.5 9L24 18.5 11.5 9 2 15.5l9.5 5.75v14.75h15V21.25L36.5 15.5z" fill="#EA4335"/>
                            <path d="M11.5 9H36.5L24 18.5 11.5 9z" fill="#FBBC04"/>
                          </svg>
                        ),
                        available: true,
                      },
                      {
                        id: 'outlook',
                        label: 'Microsoft Outlook',
                        sublabel: 'Coming soon',
                        logo: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect width="24" height="24" rx="3" fill="#0078D4"/>
                            <text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">O</text>
                          </svg>
                        ),
                        available: false,
                      },
                      {
                        id: 'exchange',
                        label: 'Microsoft Exchange',
                        sublabel: 'Coming soon',
                        logo: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect width="24" height="24" rx="3" fill="#0078D4"/>
                            <text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">E</text>
                          </svg>
                        ),
                        available: false,
                      },
                    ].map((provider) => (
                      <div
                        key={provider.id}
                        onClick={() => provider.available && setSelectedCalendarProvider(provider.id)}
                        className="relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors group"
                        style={{
                          borderColor: selectedCalendarProvider === provider.id ? '#0091AE' : '#DFE3EB',
                          backgroundColor: selectedCalendarProvider === provider.id ? '#F0FBFD' : provider.available ? '#fff' : '#F6F9FC',
                          cursor: provider.available ? 'pointer' : 'default',
                          opacity: provider.available ? 1 : 0.6,
                        }}
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0" style={{ backgroundColor: '#F0F3F7' }}>
                          {provider.logo}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>{provider.label}</p>
                          <p className="text-xs" style={{ color: provider.available ? '#7C98B6' : '#FF7A59' }}>{provider.sublabel}</p>
                        </div>
                        {selectedCalendarProvider === provider.id && (
                          <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#0091AE' }} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3.5 border-t flex items-center justify-end gap-2" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
                    <Button variant="outline" size="sm" onClick={() => setShowCalendarProviderModal(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      disabled={!selectedCalendarProvider}
                      style={{ backgroundColor: selectedCalendarProvider ? '#FF7A59' : undefined }}
                      onClick={() => {
                        if (selectedCalendarProvider === 'google') {
                          setShowCalendarProviderModal(false);
                          setShowCalendarPolicyModal(true);
                        }
                      }}
                    >
                      Connect your calendar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ---- Policy Modal ---- */}
            {showCalendarPolicyModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setShowCalendarPolicyModal(false); }}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" style={{ border: '1px solid #DFE3EB' }}>
                  <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: '#0091AE' }}>
                    <h3 className="text-sm font-semibold text-white">Connect your Google account</h3>
                    <button onClick={() => setShowCalendarPolicyModal(false)} className="text-white/70 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="text-xs" style={{ color: '#2D3E50' }}>
                      By connecting your Google account, you grant this CRM access to the following:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#00BDA5' }} />
                        <span className="text-xs" style={{ color: '#516F90' }}>
                          <strong style={{ color: '#2D3E50' }}>Google Calendar:</strong> You can use the Meetings tool to create or modify existing meetings on your primary Google Calendar.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#00BDA5' }} />
                        <span className="text-xs" style={{ color: '#516F90' }}>Read your profile name and email address for identification.</span>
                      </li>
                    </ul>
                    <div className="p-3 rounded-lg border text-xs" style={{ borderColor: '#DFE3EB', color: '#7C98B6', backgroundColor: '#F6F9FC' }}>
                      We&apos;ll only use your Google data to power features within this CRM. We never sell or share your data with third parties.
                    </div>
                  </div>
                  <div className="px-5 py-3.5 border-t flex items-center justify-end gap-2" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
                    <Button variant="outline" size="sm" onClick={() => setShowCalendarPolicyModal(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      style={{ backgroundColor: '#FF7A59', color: '#fff' }}
                      onClick={() => {
                        setShowCalendarPolicyModal(false);
                        connectCalendar();
                      }}
                    >
                      Accept and connect to Google
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tasks */}
        {activeTab === 'tasks' && (
          <>
            <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Task Settings</h2>
            <SectionCard title="Task Defaults">
              <div className="space-y-3 max-w-sm">
                <div className="space-y-1">
                  <Label>Default task priority</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Default due date</Label>
                  <Select defaultValue="3">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Tomorrow</SelectItem>
                      <SelectItem value="3">3 days from now</SelectItem>
                      <SelectItem value="7">1 week from now</SelectItem>
                      <SelectItem value="14">2 weeks from now</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave}>{saved ? 'Saved!' : 'Save Defaults'}</Button>
              </div>
            </SectionCard>
          </>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <>
            <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Notification Preferences</h2>
            <SectionCard title="Activity Notifications">
              <div className="space-y-4">
                {([
                  { key: 'notif_deal_stage',       label: 'Deal stage changes',   desc: 'When a deal moves to a new stage' },
                  { key: 'notif_new_contact',       label: 'New contact added',    desc: 'When a new contact is created' },
                  { key: 'notif_task_due',          label: 'Task due reminders',   desc: '24 hours before task due date' },
                  { key: 'notif_meeting_reminder',  label: 'Meeting reminders',    desc: '1 hour before scheduled meetings' },
                  { key: 'notif_email_open',        label: 'Email opens',          desc: 'Get notified when emails are opened' },
                  { key: 'notif_email_click',       label: 'Link clicks',          desc: 'Get notified when links are clicked' },
                ] as { key: keyof import('@/hooks/useUserSettings').UserSettings; label: string; desc: string }[]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>{item.label}</p>
                      <p className="text-xs" style={{ color: '#7C98B6' }}>{item.desc}</p>
                    </div>
                    <Toggle
                      checked={settings[item.key] as boolean}
                      onChange={v => updateSetting(item.key, v as never)}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <>
            <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Security Settings</h2>
            <SectionCard title="Change Password">
              <div className="space-y-3 max-w-sm">
                <div className="space-y-1"><Label>Current Password</Label><Input type="password" placeholder="••••••••" /></div>
                <div className="space-y-1"><Label>New Password</Label><Input type="password" placeholder="••••••••" /></div>
                <div className="space-y-1"><Label>Confirm New Password</Label><Input type="password" placeholder="••••••••" /></div>
                <Button onClick={handleSave}>{saved ? 'Password Updated!' : 'Update Password'}</Button>
              </div>
            </SectionCard>
            <SectionCard title="Two-Factor Authentication" description="Add an extra layer of security to your account">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>Enable 2FA</p>
                  <p className="text-xs" style={{ color: '#7C98B6' }}>Use an authenticator app</p>
                </div>
                <Button variant="outline" size="sm">Set Up</Button>
              </div>
            </SectionCard>
          </>
        )}

        {/* Integrations */}
        {activeTab === 'integrations' && (
          <>
            <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Integrations</h2>
            <SectionCard title="Supabase Configuration" description="Connect your Supabase project for real data storage">
              <div className="space-y-3 max-w-md">
                <div className="space-y-1">
                  <Label>Supabase URL</Label>
                  <Input defaultValue={process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'} />
                </div>
                <div className="space-y-1">
                  <Label>Supabase Anon Key</Label>
                  <Input type="password" defaultValue="••••••••••••••••" />
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: '#F5C26B', backgroundColor: '#FFFBF0' }}>
                  <p className="text-xs" style={{ color: '#8B6914' }}>
                    Currently running with placeholder credentials. Replace with real Supabase credentials in your .env.local file.
                  </p>
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {/* Automation */}
        {activeTab === 'automation' && (
          <>
            <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Automation</h2>
            <SectionCard title="Workflow Automation" description="Set up automated actions for common CRM events">
              <div className="space-y-3">
                {workflows.map((rule: { id: string; trigger: string; action: string; active: boolean }) => (
                  <div key={rule.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: '#DFE3EB' }}>
                    <Toggle checked={rule.active} onChange={() => toggleWorkflow(rule.id)} />
                    <div className="flex-1">
                      <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>
                        When: <span style={{ color: '#FF7A59' }}>{rule.trigger}</span>
                      </p>
                      <p className="text-xs" style={{ color: '#7C98B6' }}>Then: {rule.action}</p>
                    </div>
                    <button className="p-1 rounded hover:bg-[#F0F3F7]" style={{ color: '#99ACC2' }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add Workflow
                </Button>
              </div>
            </SectionCard>
          </>
        )}

        {/* Users & Teams */}
        {activeTab === 'users' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Users &amp; Teams</h2>
              <Button size="sm" onClick={() => setShowInviteModal(true)} className="gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Invite User
              </Button>
            </div>
            <SectionCard title="Team Members" description={`${users.length} user${users.length !== 1 ? 's' : ''} in your organization`}>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: '#DFE3EB' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#FFF3F0', color: '#FF7A59' }}>
                      {user.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>{user.name}</p>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: user.status === 'active' ? '#E6FBF8' : '#FFF3F0',
                            color: user.status === 'active' ? '#00BDA5' : '#FF7A59',
                          }}
                        >
                          {user.status === 'active' ? 'Active' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#7C98B6' }}>{user.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#F0F3F7', color: '#516F90' }}>{user.role}</span>
                    <button className="p-1 rounded hover:bg-[#FFF0EE] transition-colors" style={{ color: '#99ACC2' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        )}
      </div>

      {/* Add Phone Number Modal */}
      {showAddPhone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) closePhoneModal(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" style={{ border: '1px solid #DFE3EB' }}>
            <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5F5F8' }}>
                  <Phone className="w-4 h-4" style={{ color: '#0091AE' }} />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>Add phone number</h3>
              </div>
              <button onClick={closePhoneModal} className="p-1 rounded hover:bg-[#E8EDF5]">
                <X className="w-4 h-4" style={{ color: '#516F90' }} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: '#516F90' }}>Phone number</p>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-9 px-2 text-xs rounded-lg border bg-white flex-shrink-0"
                    style={{ borderColor: '#DFE3EB', color: '#2D3E50', width: '90px' }}
                  >
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+81">🇯🇵 +81</option>
                    <option value="+55">🇧🇷 +55</option>
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+65">🇸🇬 +65</option>
                    <option value="+971">🇦🇪 +971</option>
                  </select>
                  <Input
                    type="tel"
                    placeholder="555 000 0000"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="flex-1 h-9 text-xs"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPhone()}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: '#516F90' }}>Label</p>
                <Select value={phoneLabel} onValueChange={setPhoneLabel}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Outbound number">Outbound number</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Work">Work</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#E5F5F8', color: '#0091AE' }}>
                This number will be used for outbound calling from the CRM dialer.
              </div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
              <Button variant="outline" size="sm" onClick={closePhoneModal} className="text-xs h-8">Cancel</Button>
              <Button
                size="sm"
                className="text-xs h-8 gap-1.5"
                style={{ backgroundColor: '#0091AE', borderColor: '#0091AE' }}
                disabled={!phoneInput.trim()}
                onClick={handleAddPhone}
              >
                <Check className="w-3 h-3" /> Save Number
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowInviteModal(false); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4" style={{ border: '1px solid #DFE3EB' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#DFE3EB' }}>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>Invite a Team Member</h3>
                <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>They&apos;ll receive an email invitation</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="p-1.5 rounded hover:bg-[#F0F3F7] transition-colors">
                <X className="w-4 h-4" style={{ color: '#516F90' }} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Sales Rep">Sales Rep</SelectItem>
                    <SelectItem value="Sales Manager">Sales Manager</SelectItem>
                    <SelectItem value="Viewer">Viewer (Read only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#F6F9FC', border: '1px solid #DFE3EB' }}>
                <p className="text-xs" style={{ color: '#516F90' }}>
                  The invitation will be sent to <strong>{inviteEmail || 'their email'}</strong> with role <strong>{inviteRole}</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: '#DFE3EB' }}>
              <Button variant="outline" size="sm" onClick={() => setShowInviteModal(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={!inviteEmail || inviteSent}
                onClick={handleInvite}
                className="gap-1.5"
              >
                {inviteSent ? <><Check className="w-3.5 h-3.5" /> Sent!</> : <><Send className="w-3.5 h-3.5" /> Send Invite</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageInner />
    </Suspense>
  );
}
