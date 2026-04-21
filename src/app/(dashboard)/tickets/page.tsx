'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Search, LayoutList, LayoutGrid, ChevronDown,
  AlertCircle, Clock, CheckCircle2, XCircle, MoreHorizontal,
  X, User, Building2, Calendar, Tag, Ticket, ArrowUpDown,
  Loader2, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useContacts, useCompanies } from '@/hooks/useData';

/* ─── Types ─────────────────────────────────────────────── */
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status   = 'new' | 'waiting_contact' | 'waiting_us' | 'closed';

interface TicketItem {
  id: string;
  subject: string;
  description: string;
  status: Status;
  priority: Priority;
  source: string;
  contact_id: string | null;
  company_id: string | null;
  owner_name: string;
  created_at: string;
  updated_at: string;
  /* joined */
  contact_name?: string;
  company_name?: string;
}

/* ─── Config ─────────────────────────────────────────────── */
const COLS: { id: Status; label: string; color: string; bg: string; icon: React.ElementType }[] = [
  { id: 'new',             label: 'New',                 color: '#0091AE', bg: '#E5F5F8', icon: AlertCircle   },
  { id: 'waiting_contact', label: 'Waiting on contact',  color: '#F5C26B', bg: '#FEF9EE', icon: Clock         },
  { id: 'waiting_us',      label: 'Waiting on us',       color: '#FF7A59', bg: '#FFF3F0', icon: MessageSquare  },
  { id: 'closed',          label: 'Closed',              color: '#7C98B6', bg: '#F0F3F7', icon: CheckCircle2  },
];

const PRIORITY_CFG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: '#7C98B6', bg: '#F0F3F7' },
  medium: { label: 'Medium', color: '#F5C26B', bg: '#FEF9EE' },
  high:   { label: 'High',   color: '#FF7A59', bg: '#FFF3F0' },
  urgent: { label: 'Urgent', color: '#ffffff', bg: '#FF5A5F' },
};

const SOURCES = ['Email', 'Phone', 'Chat', 'Web', 'Social', 'Other'];

const LS_KEY = 'crm_tickets_v2';

/* ─── Helpers ─────────────────────────────────────────────── */
function uid(): string {
  return `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}
function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

const AVATAR_COLORS = ['#FF7A59', '#0091AE', '#00BDA5', '#F5C26B', '#425B76', '#6366f1', '#10b981'];
function avatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

/* ─── Local persistence ─────────────────────────────────── */
function loadLocal(): TicketItem[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveLocal(tickets: TicketItem[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(tickets)); } catch {}
}

/* ════════════════════════════════════════════════════════════
   CREATE TICKET MODAL
════════════════════════════════════════════════════════════ */
interface CreateTicketModalProps {
  onSave: (ticket: Omit<TicketItem, 'id' | 'created_at' | 'updated_at'>) => void;
  onClose: () => void;
  contacts: { id: string; first_name: string; last_name: string; company_id?: string | null }[];
  companies: { id: string; name: string }[];
}

function CreateTicketModal({ onSave, onClose, contacts, companies }: CreateTicketModalProps) {
  const [subject,     setSubject]     = useState('');
  const [description, setDescription] = useState('');
  const [status,      setStatus]      = useState<Status>('new');
  const [priority,    setPriority]    = useState<Priority>('medium');
  const [source,      setSource]      = useState('Email');
  const [contactId,   setContactId]   = useState('');
  const [companyId,   setCompanyId]   = useState('');
  const [ownerName,   setOwnerName]   = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    const selectedContact = contacts.find(c => c.id === contactId);
    const selectedCompany = companies.find(c => c.id === companyId);
    onSave({
      subject: subject.trim(),
      description: description.trim(),
      status,
      priority,
      source,
      contact_id:   contactId   || null,
      company_id:   companyId   || null,
      owner_name:   ownerName.trim() || 'Me',
      contact_name: selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : undefined,
      company_name: selectedCompany?.name || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
        style={{ border: '1px solid #DFE3EB' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#DFE3EB' }}>
          <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>Create Ticket</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F0F3F7]">
            <X className="w-4 h-4" style={{ color: '#7C98B6' }} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#516F90' }}>Ticket Name *</label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Describe the issue..."
              className="text-sm"
              required
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#516F90' }}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Status)}
                className="w-full text-sm border rounded-md px-3 py-2 bg-white"
                style={{ borderColor: '#DFE3EB', color: '#2D3E50' }}
              >
                {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#516F90' }}>Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full text-sm border rounded-md px-3 py-2 bg-white"
                style={{ borderColor: '#DFE3EB', color: '#2D3E50' }}
              >
                {(Object.keys(PRIORITY_CFG) as Priority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Source + Owner */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#516F90' }}>Source</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full text-sm border rounded-md px-3 py-2 bg-white"
                style={{ borderColor: '#DFE3EB', color: '#2D3E50' }}
              >
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#516F90' }}>Ticket Owner</label>
              <Input
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="Your name"
                className="text-sm"
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#516F90' }}>
              <User className="inline w-3 h-3 mr-1" />Associate Contact
            </label>
            <select
              value={contactId}
              onChange={e => setContactId(e.target.value)}
              className="w-full text-sm border rounded-md px-3 py-2 bg-white"
              style={{ borderColor: '#DFE3EB', color: contactId ? '#2D3E50' : '#99ACC2' }}
            >
              <option value="">No contact</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#516F90' }}>
              <Building2 className="inline w-3 h-3 mr-1" />Associate Company
            </label>
            <select
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              className="w-full text-sm border rounded-md px-3 py-2 bg-white"
              style={{ borderColor: '#DFE3EB', color: companyId ? '#2D3E50' : '#99ACC2' }}
            >
              <option value="">No company</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#516F90' }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={3}
              className="w-full text-sm border rounded-md px-3 py-2 resize-none"
              style={{ borderColor: '#DFE3EB', color: '#2D3E50' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#FF7A59'; e.currentTarget.style.outline = 'none'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#DFE3EB'; }}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#DFE3EB' }}>
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs gap-1.5" onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}>
            <Plus className="w-3.5 h-3.5" />
            Create Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TICKET DETAIL PANEL
════════════════════════════════════════════════════════════ */
function TicketDetail({
  ticket,
  onClose,
  onStatusChange,
  onDelete,
}: {
  ticket: TicketItem;
  onClose: () => void;
  onStatusChange: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
}) {
  const col = COLS.find(c => c.id === ticket.status)!;
  const pCfg = PRIORITY_CFG[ticket.priority];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
        style={{ border: '1px solid #DFE3EB' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b" style={{ borderColor: '#DFE3EB' }}>
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs font-mono mb-1" style={{ color: '#99ACC2' }}>
              {ticket.id.startsWith('tkt_') ? `#${ticket.id.slice(-6).toUpperCase()}` : ticket.id}
            </p>
            <h2 className="text-sm font-semibold leading-snug" style={{ color: '#2D3E50' }}>{ticket.subject}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F0F3F7] flex-shrink-0">
            <X className="w-4 h-4" style={{ color: '#7C98B6' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: col.bg, color: col.color }}>
              <col.icon className="w-3 h-3" />{col.label}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: pCfg.bg, color: pCfg.color }}>
              {pCfg.label} Priority
            </span>
          </div>

          {ticket.description && (
            <p className="text-sm" style={{ color: '#516F90' }}>{ticket.description}</p>
          )}

          {/* Meta grid */}
          <div className="space-y-2 text-xs border-t pt-4" style={{ borderColor: '#DFE3EB' }}>
            {ticket.contact_name && (
              <div className="flex justify-between">
                <span style={{ color: '#7C98B6' }}>Contact</span>
                <span style={{ color: '#2D3E50' }} className="font-medium">{ticket.contact_name}</span>
              </div>
            )}
            {ticket.company_name && (
              <div className="flex justify-between">
                <span style={{ color: '#7C98B6' }}>Company</span>
                <span style={{ color: '#2D3E50' }} className="font-medium">{ticket.company_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span style={{ color: '#7C98B6' }}>Owner</span>
              <span style={{ color: '#2D3E50' }} className="font-medium">{ticket.owner_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#7C98B6' }}>Source</span>
              <span style={{ color: '#2D3E50' }}>{ticket.source}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#7C98B6' }}>Created</span>
              <span style={{ color: '#2D3E50' }}>{fmtDate(ticket.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#7C98B6' }}>Updated</span>
              <span style={{ color: '#2D3E50' }}>{fmtDate(ticket.updated_at)}</span>
            </div>
          </div>

          {/* Move to */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: '#516F90' }}>Move to pipeline stage</p>
            <div className="flex flex-wrap gap-1.5">
              {COLS.map(c => (
                <button
                  key={c.id}
                  onClick={() => onStatusChange(ticket.id, c.id)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: ticket.status === c.id ? c.color : c.bg,
                    color: ticket.status === c.id ? '#fff' : c.color,
                    border: `1px solid ${c.color}30`,
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#DFE3EB' }}>
          <button
            onClick={() => { onDelete(ticket.id); onClose(); }}
            className="text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#FFF3F0] transition-colors"
            style={{ color: '#FF7A59' }}
          >
            Delete ticket
          </button>
          <Button size="sm" className="text-xs" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   KANBAN CARD
════════════════════════════════════════════════════════════ */
function KanbanCard({
  ticket,
  onDragStart,
  onClick,
}: {
  ticket: TicketItem;
  onDragStart: (id: string) => void;
  onClick: (ticket: TicketItem) => void;
}) {
  const pCfg = PRIORITY_CFG[ticket.priority];
  const initials = getInitials(ticket.owner_name || 'Me');
  const color = avatarColor(ticket.owner_name || 'Me');

  return (
    <div
      draggable
      onDragStart={() => onDragStart(ticket.id)}
      onClick={() => onClick(ticket)}
      className="bg-white border rounded-xl p-3.5 cursor-pointer hover:shadow-md transition-all group select-none"
      style={{ borderColor: '#DFE3EB' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium leading-snug flex-1" style={{ color: '#2D3E50' }}>{ticket.subject}</p>
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#F0F3F7] flex-shrink-0 transition-opacity"
          onClick={e => { e.stopPropagation(); onClick(ticket); }}
        >
          <MoreHorizontal className="w-3.5 h-3.5" style={{ color: '#99ACC2' }} />
        </button>
      </div>

      {ticket.contact_name && (
        <p className="text-xs mb-2 truncate" style={{ color: '#7C98B6' }}>
          <User className="inline w-3 h-3 mr-1" />{ticket.contact_name}
          {ticket.company_name && ` · ${ticket.company_name}`}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: pCfg.bg, color: pCfg.color }}
        >
          {pCfg.label}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#B0C1D4' }}>
            <Calendar className="inline w-3 h-3 mr-0.5" />
            {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: color, fontSize: 9 }}
            title={ticket.owner_name}
          >
            {initials}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export default function TicketsPage() {
  const { contacts } = useContacts();
  const { companies } = useCompanies();

  const [tickets, setTickets]         = useState<TicketItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState<'board' | 'table'>('board');
  const [search, setSearch]           = useState('');
  const [priorityFilter, setPriority] = useState<Priority | 'all'>('all');
  const [sortBy, setSortBy]           = useState<'created_at' | 'updated_at' | 'priority'>('created_at');
  const [showCreate, setShowCreate]   = useState(false);
  const [selected, setSelected]       = useState<TicketItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  /* drag */
  const dragId = useRef<string | null>(null);

  /* ── Load tickets ─────────────────────────────────── */
  const loadTickets = useCallback(async () => {
    // Load from localStorage first
    const local = loadLocal();
    setTickets(local);
    setLoading(false);

    // Try Supabase
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id, subject, description, status, priority, source,
          owner_name, contact_id, company_id, created_at, updated_at,
          contacts:contact_id (first_name, last_name),
          companies:company_id (name)
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: TicketItem[] = data.map((r: Record<string, unknown>) => ({
          id:           String(r.id),
          subject:      String(r.subject || ''),
          description:  String(r.description || ''),
          status:       (r.status as Status) || 'new',
          priority:     (r.priority as Priority) || 'medium',
          source:       String(r.source || 'Other'),
          owner_name:   String(r.owner_name || ''),
          contact_id:   r.contact_id ? String(r.contact_id) : null,
          company_id:   r.company_id ? String(r.company_id) : null,
          created_at:   String(r.created_at || new Date().toISOString()),
          updated_at:   String(r.updated_at || new Date().toISOString()),
          contact_name: r.contacts ? `${(r.contacts as Record<string,string>).first_name} ${(r.contacts as Record<string,string>).last_name}` : undefined,
          company_name: r.companies ? String((r.companies as Record<string,string>).name) : undefined,
        }));
        setTickets(mapped);
        saveLocal(mapped);
      }
    } catch { /* offline / table missing — use localStorage */ }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  /* ── Create ticket ─────────────────────────────────── */
  const handleCreate = async (data: Omit<TicketItem, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newTicket: TicketItem = { ...data, id: uid(), created_at: now, updated_at: now };

    setTickets(prev => {
      const next = [newTicket, ...prev];
      saveLocal(next);
      return next;
    });
    setShowCreate(false);

    // Persist to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('tickets').insert({
          subject:     newTicket.subject,
          description: newTicket.description,
          status:      newTicket.status,
          priority:    newTicket.priority,
          source:      newTicket.source,
          owner_name:  newTicket.owner_name,
          contact_id:  newTicket.contact_id || null,
          company_id:  newTicket.company_id || null,
          created_by:  user.id,
        });
      }
    } catch { /* offline */ }
  };

  /* ── Update status ─────────────────────────────────── */
  const handleStatusChange = async (id: string, status: Status) => {
    const now = new Date().toISOString();
    setTickets(prev => {
      const next = prev.map(t => t.id === id ? { ...t, status, updated_at: now } : t);
      saveLocal(next);
      return next;
    });
    setSelected(prev => prev?.id === id ? { ...prev, status, updated_at: now } : prev);

    try {
      await supabase.from('tickets').update({ status, updated_at: now }).eq('id', id);
    } catch {}
  };

  /* ── Delete ─────────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    setTickets(prev => {
      const next = prev.filter(t => t.id !== id);
      saveLocal(next);
      return next;
    });
    try { await supabase.from('tickets').delete().eq('id', id); } catch {}
  };

  /* ── Drag & drop ─────────────────────────────────────── */
  const onDragStart = (id: string) => { dragId.current = id; };
  const onDrop = (colId: Status) => {
    if (!dragId.current) return;
    handleStatusChange(dragId.current, colId);
    dragId.current = null;
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  /* ── Filtering + sorting ─────────────────────────────── */
  const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

  const filtered = tickets
    .filter(t => {
      const q = search.toLowerCase();
      const matchSearch = !search
        || t.subject.toLowerCase().includes(q)
        || (t.contact_name || '').toLowerCase().includes(q)
        || (t.company_name || '').toLowerCase().includes(q)
        || t.owner_name.toLowerCase().includes(q);
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchSearch && matchPriority;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return priorityOrder[a.priority] - priorityOrder[b.priority];
      return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime();
    });

  const byCol = (colId: Status) => filtered.filter(t => t.status === colId);

  const counts = COLS.reduce((acc, c) => {
    acc[c.id] = tickets.filter(t => t.status === c.id).length;
    return acc;
  }, {} as Record<Status, number>);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F6F9FC' }}>
      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white" style={{ borderColor: '#DFE3EB' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#2D3E50' }}>Tickets</h1>
          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>
            {tickets.length} total · {tickets.filter(t => t.status !== 'closed').length} open
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: '#DFE3EB' }}>
            <button
              onClick={() => setView('board')}
              className="px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
              style={{ backgroundColor: view === 'board' ? '#2D3E50' : '#fff', color: view === 'board' ? '#fff' : '#516F90' }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />Board
            </button>
            <button
              onClick={() => setView('table')}
              className="px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
              style={{ backgroundColor: view === 'table' ? '#2D3E50' : '#fff', color: view === 'table' ? '#fff' : '#516F90' }}
            >
              <LayoutList className="w-3.5 h-3.5" />Table
            </button>
          </div>

          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" />New Ticket
          </Button>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────── */}
      <div className="flex items-center gap-2 px-6 py-2.5 bg-white border-b" style={{ borderColor: '#DFE3EB' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#99ACC2' }} />
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 text-xs w-52"
          />
        </div>

        {/* Priority filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg font-medium transition-colors hover:bg-[#F6F9FC]"
            style={{ borderColor: '#DFE3EB', color: '#516F90' }}
          >
            <Tag className="w-3.5 h-3.5" />
            {priorityFilter === 'all' ? 'Priority' : PRIORITY_CFG[priorityFilter].label}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showFilters && (
            <div
              className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-lg z-20 py-1 min-w-[130px]"
              style={{ borderColor: '#DFE3EB' }}
            >
              {(['all', 'low', 'medium', 'high', 'urgent'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => { setPriority(p); setShowFilters(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#F6F9FC] transition-colors"
                  style={{ color: p === priorityFilter ? '#FF7A59' : '#516F90', fontWeight: p === priorityFilter ? 600 : 400 }}
                >
                  {p === 'all' ? 'All priorities' : PRIORITY_CFG[p].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort */}
        <button
          onClick={() => setSortBy(s => s === 'created_at' ? 'updated_at' : s === 'updated_at' ? 'priority' : 'created_at')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg font-medium transition-colors hover:bg-[#F6F9FC]"
          style={{ borderColor: '#DFE3EB', color: '#516F90' }}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortBy === 'created_at' ? 'Created' : sortBy === 'updated_at' ? 'Updated' : 'Priority'}
        </button>

        {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" style={{ color: '#99ACC2' }} />}
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      {view === 'board' ? (
        /* ── Kanban Board ── */
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full min-w-max">
            {COLS.map(col => {
              const colTickets = byCol(col.id);
              const Icon = col.icon;
              return (
                <div
                  key={col.id}
                  className="flex flex-col rounded-xl overflow-hidden"
                  style={{ width: 280, minWidth: 280 }}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(col.id)}
                >
                  {/* Column header */}
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ backgroundColor: col.bg, borderBottom: `2px solid ${col.color}30` }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: col.color }} />
                      <span className="text-xs font-semibold" style={{ color: col.color }}>{col.label}</span>
                    </div>
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: col.color, color: '#fff' }}
                    >
                      {counts[col.id]}
                    </span>
                  </div>

                  {/* Drop zone */}
                  <div
                    className="flex-1 p-2 space-y-2 overflow-y-auto"
                    style={{ backgroundColor: '#F0F3F7', minHeight: 200 }}
                  >
                    {colTickets.length === 0 && (
                      <div
                        className="h-16 border-2 border-dashed rounded-xl flex items-center justify-center text-xs"
                        style={{ borderColor: `${col.color}40`, color: `${col.color}80` }}
                      >
                        Drop here
                      </div>
                    )}
                    {colTickets.map(ticket => (
                      <KanbanCard
                        key={ticket.id}
                        ticket={ticket}
                        onDragStart={onDragStart}
                        onClick={setSelected}
                      />
                    ))}
                  </div>

                  {/* Add card shortcut */}
                  <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs transition-colors hover:bg-white/60"
                    style={{ backgroundColor: '#F0F3F7', color: '#7C98B6' }}
                  >
                    <Plus className="w-3.5 h-3.5" />Add ticket
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Table view ── */
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: '#DFE3EB' }}>
            {/* Summary row */}
            <div className="grid grid-cols-4 border-b" style={{ borderColor: '#DFE3EB' }}>
              {COLS.map(col => {
                const Icon = col.icon;
                return (
                  <div key={col.id} className="flex items-center gap-2 px-5 py-3" style={{ borderRight: '1px solid #DFE3EB' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: col.bg }}>
                      <Icon className="w-3 h-3" style={{ color: col.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#516F90' }}>{col.label}</p>
                      <p className="text-lg font-bold" style={{ color: '#2D3E50' }}>{counts[col.id]}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F6F9FC', borderBottom: '1px solid #DFE3EB' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Ticket</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Contact / Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Created</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket, i) => {
                  const col = COLS.find(c => c.id === ticket.status)!;
                  const pCfg = PRIORITY_CFG[ticket.priority];
                  const Icon = col.icon;
                  return (
                    <tr
                      key={ticket.id}
                      className="cursor-pointer transition-colors hover:bg-[#F6F9FC]"
                      style={{ borderTop: i > 0 ? '1px solid #DFE3EB' : undefined }}
                      onClick={() => setSelected(ticket)}
                    >
                      <td className="px-5 py-3">
                        <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>{ticket.subject}</p>
                        {ticket.description && (
                          <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: '#99ACC2' }}>{ticket.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {ticket.contact_name ? (
                          <>
                            <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>{ticket.contact_name}</p>
                            {ticket.company_name && <p className="text-xs" style={{ color: '#7C98B6' }}>{ticket.company_name}</p>}
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: '#B0C1D4' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: pCfg.bg, color: pCfg.color }}>
                          {pCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: col.bg, color: col.color }}>
                          <Icon className="w-3 h-3" />{col.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: avatarColor(ticket.owner_name), fontSize: 9, fontWeight: 700 }}>
                            {getInitials(ticket.owner_name || 'Me')}
                          </div>
                          <span className="text-xs" style={{ color: '#2D3E50' }}>{ticket.owner_name || 'Me'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: '#7C98B6' }}>{fmtDate(ticket.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1 rounded hover:bg-[#F0F3F7]" onClick={e => e.stopPropagation()}>
                          <MoreHorizontal className="w-4 h-4" style={{ color: '#99ACC2' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <Ticket className="w-8 h-8 mx-auto mb-2" style={{ color: '#DFE3EB' }} />
                      <p className="text-sm" style={{ color: '#7C98B6' }}>No tickets found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────── */}
      {showCreate && (
        <CreateTicketModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
          contacts={contacts}
          companies={companies}
        />
      )}

      {selected && (
        <TicketDetail
          ticket={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
