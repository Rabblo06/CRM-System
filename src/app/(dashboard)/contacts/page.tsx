'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, SlidersHorizontal, Columns, ChevronDown, ChevronLeft, ChevronRight,
  Plus, Upload, X, Check, Trash2, UserCheck, ClipboardList, Pencil,
} from 'lucide-react';
import { ContactForm } from '@/components/contacts/ContactForm';
import { useContacts } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import { GmailConnectBanner } from '@/components/emails/GmailConnectBanner';
import type { Contact } from '@/types';

/* ── Helpers ─────────────────────────────────────────────── */
const AVATAR_COLORS = ['#ff7a59','#f2547d','#00a38d','#3b82f6','#8b5cf6','#f59e0b','#10b981','#6366f1'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(c: Contact) { return `${c.first_name[0] || ''}${c.last_name[0] || ''}`.toUpperCase(); }
function fullName(c: Contact) { return `${c.first_name} ${c.last_name}`.trim(); }

const PERSONAL_DOMAINS = new Set(['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','me.com','live.com','msn.com']);
function getContactDomain(c: Contact): string | null {
  // Prefer company domain, fall back to email domain
  const companyDomain = (c as { company?: { domain?: string } }).company?.domain;
  if (companyDomain) return companyDomain;
  const emailDomain = c.email?.split('@')[1];
  if (emailDomain && !PERSONAL_DOMAINS.has(emailDomain)) return emailDomain;
  return null;
}
function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}
function fmtDate(d?: string | null) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' GMT';
}

/* ── Column definitions ───────────────────────────────────── */
interface ColDef { id: string; label: string; width: number; always?: boolean }
const ALL_COLS: ColDef[] = [
  { id: 'email',      label: 'Email',                    width: 220, always: true },
  { id: 'phone',      label: 'Phone Number',             width: 160 },
  { id: 'job_title',  label: 'Job Title',                width: 180 },
  { id: 'owner',      label: 'Contact owner',            width: 160 },
  { id: 'priority',   label: 'Support Priority',         width: 150 },
  { id: 'lang',       label: 'Preferred language',       width: 170 },
  { id: 'product',    label: 'Product Purchased',        width: 180 },
  { id: 'company',    label: 'Company Name',             width: 180 },
  { id: 'created_at', label: 'Create Date (GMT)',        width: 220 },
  { id: 'updated_at', label: 'Last Activity Date (GMT)', width: 220 },
  { id: 'contacted',  label: 'Last Contacted (GMT)',     width: 220 },
];
const DEFAULT_VISIBLE = ['email', 'phone', 'job_title', 'owner', 'priority', 'lang', 'product', 'company', 'created_at', 'updated_at', 'contacted'];

/* ── Filter options ───────────────────────────────────────── */
const FILTER_PROPS = [
  { id: 'lead_status',     label: 'Lead Status',     options: ['new','contacted','qualified','unqualified','converted'] },
  { id: 'lifecycle_stage', label: 'Lifecycle Stage', options: ['lead','marketing_qualified','sales_qualified','opportunity','customer','evangelist'] },
  { id: 'country',         label: 'Country',         options: [] },
  { id: 'job_title',       label: 'Job Title',       options: [] },
];

interface ActiveFilter { prop: string; op: string; value: string }

/* ── Filter Panel ─────────────────────────────────────────── */
function FilterPanel({
  filters, onAdd, onRemove, onClose,
}: {
  filters: ActiveFilter[];
  onAdd: (f: ActiveFilter) => void;
  onRemove: (i: number) => void;
  onClose: () => void;
}) {
  const [prop, setProp] = useState(FILTER_PROPS[0].id);
  const [value, setValue] = useState('');
  const selected = FILTER_PROPS.find(p => p.id === prop);

  return (
    <div className="fixed right-0 top-0 h-full z-50 flex">
      <div className="fixed inset-0 -z-10" onClick={onClose} />
      <div className="bg-white border-l border-[#dfe3eb] shadow-2xl flex flex-col" style={{ width: 360 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dfe3eb]">
          <span className="text-sm font-bold text-[#2d3e50]">Advanced filters</span>
          <button onClick={onClose} className="p-1 text-[#99acc2] hover:text-[#425b76]"><X size={16} /></button>
        </div>

        {/* Active filters */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filters.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-semibold text-[#7c98b6] uppercase tracking-wide mb-2">Active filters</p>
              {filters.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[#f6f9fc] rounded-[3px] border border-[#dfe3eb]">
                  <span className="flex-1 text-xs text-[#2d3e50]">
                    <span className="font-semibold">{FILTER_PROPS.find(p => p.id === f.prop)?.label}</span>
                    {' '}{f.op}{' '}
                    <span className="font-semibold">{f.value}</span>
                  </span>
                  <button onClick={() => onRemove(i)} className="text-[#99acc2] hover:text-red-400"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Add filter */}
          <p className="text-xs font-semibold text-[#7c98b6] uppercase tracking-wide mb-3">Add filter</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#425b76] mb-1">Property</label>
              <select
                value={prop}
                onChange={e => { setProp(e.target.value); setValue(''); }}
                className="h-9 w-full px-3 text-sm border border-[#cbd6e2] rounded-[3px] outline-none text-[#2d3e50] bg-white"
              >
                {FILTER_PROPS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#425b76] mb-1">Value</label>
              {selected && selected.options.length > 0 ? (
                <select
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  className="h-9 w-full px-3 text-sm border border-[#cbd6e2] rounded-[3px] outline-none text-[#2d3e50] bg-white"
                >
                  <option value="">Select…</option>
                  {selected.options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
              ) : (
                <input
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="Enter value…"
                  className="h-9 w-full px-3 text-sm border border-[#cbd6e2] rounded-[3px] outline-none text-[#2d3e50]"
                />
              )}
            </div>
            <button
              type="button"
              disabled={!value.trim()}
              onClick={() => { if (value.trim()) { onAdd({ prop, op: 'is', value }); setValue(''); } }}
              className="w-full py-2 text-sm font-bold rounded-[3px] text-white disabled:opacity-40"
              style={{ backgroundColor: '#ff7a59' }}
            >
              Apply filter
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#dfe3eb]">
          <button onClick={onClose} className="w-full py-2 text-sm font-semibold text-[#425b76] border border-[#dfe3eb] rounded-[3px] hover:bg-[#f6f9fc]">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Columns Panel ───────────────────────────────────── */
function EditColumnsPanel({ visible, onChange, onClose }: {
  visible: string[]; onChange: (v: string[]) => void; onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-10 z-40 bg-white border border-[#dfe3eb] rounded-[3px] shadow-xl py-2" style={{ width: 240 }}>
      <div className="px-4 py-2 border-b border-[#dfe3eb] flex items-center justify-between">
        <span className="text-xs font-bold text-[#2d3e50]">Edit columns</span>
        <button onClick={onClose} className="text-[#99acc2] hover:text-[#425b76]"><X size={14} /></button>
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {ALL_COLS.map(col => {
          const isOn = visible.includes(col.id);
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => {
                if (col.always) return;
                onChange(isOn ? visible.filter(v => v !== col.id) : [...visible, col.id]);
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[#2d3e50] hover:bg-[#f6f9fc]"
            >
              <div className={`w-4 h-4 rounded-[3px] border flex items-center justify-center ${isOn ? 'border-[#ff7a59] bg-[#ff7a59]' : 'border-[#cbd6e2]'}`}>
                {isOn && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              {col.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════
   PAGE
════════════════════════════ */
const PAGE_SIZES = [25, 50, 100];

export default function ContactsPage() {
  const router = useRouter();
  const { contacts, loading, createContact, updateContact, deleteContact } = useContacts();

  // View tabs
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => { if (user) setCurrentUserId(user.id); })
      .catch(() => {});
  }, []);

  // Search & filter
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Columns
  const [visibleCols, setVisibleCols] = useState<string[]>(DEFAULT_VISIBLE);
  const [colPanelOpen, setColPanelOpen] = useState(false);
  const colBtnRef = useRef<HTMLDivElement>(null);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Sort
  const [sortCol, setSortCol] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Inline cell editing
  const [editingCell, setEditingCell] = useState<{ id: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const cellInputRef = useRef<HTMLInputElement>(null);
  const EDITABLE_COLS = new Set(['email', 'phone', 'job_title', 'owner', 'priority', 'lang', 'product', 'company']);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colBtnRef.current && !colBtnRef.current.contains(e.target as Node)) setColPanelOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus input when cell editing starts
  useEffect(() => {
    if (editingCell) cellInputRef.current?.focus();
  }, [editingCell]);

  const startEdit = useCallback((contact: Contact, col: string) => {
    if (!EDITABLE_COLS.has(col)) return;
    const raw: Record<string, string | undefined> = {
      email: contact.email,
      phone: contact.phone,
      job_title: contact.job_title,
      company: contact.company?.name,
      owner: undefined,
      priority: undefined,
      lang: undefined,
      product: undefined,
    };
    setEditValue(raw[col] || '');
    setEditingCell({ id: contact.id, col });
  }, []);

  const commitEdit = useCallback(async (contact: Contact, col: string) => {
    const fieldMap: Record<string, keyof Contact> = {
      email: 'email',
      phone: 'phone',
      job_title: 'job_title',
    };
    const field = fieldMap[col];
    if (field) {
      await updateContact(contact.id, { [field]: editValue.trim() || undefined } as Partial<Contact>);
    }
    setEditingCell(null);
  }, [editValue, updateContact]);

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  /* Filtered + sorted contacts */
  const filtered = useMemo(() => {
    let result = [...contacts];

    // Tab filter
    if (activeTab === 'mine' && currentUserId) {
      result = result.filter(c => c.created_by === currentUserId);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        fullName(c).toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.company?.name || '').toLowerCase().includes(q)
      );
    }

    // Active filters
    filters.forEach(f => {
      result = result.filter(c => {
        const val = (c as Record<string, unknown>)[f.prop];
        return typeof val === 'string' && val === f.value;
      });
    });

    // Sort
    result.sort((a, b) => {
      let av: string = '', bv: string = '';
      if (sortCol === 'name') { av = fullName(a); bv = fullName(b); }
      else if (sortCol === 'email') { av = a.email || ''; bv = b.email || ''; }
      else if (sortCol === 'company') { av = a.company?.name || ''; bv = b.company?.name || ''; }
      else if (sortCol === 'created_at') { av = a.created_at; bv = b.created_at; }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return result;
  }, [contacts, search, filters, sortCol, sortDir, activeTab, currentUserId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allOnPageSelected = paginated.length > 0 && paginated.every(c => selected.has(c.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allOnPageSelected) {
      const next = new Set(selected);
      paginated.forEach(c => next.delete(c.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paginated.forEach(c => next.add(c.id));
      setSelected(next);
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleDeleteSelected = async () => {
    for (const id of selected) await deleteContact(id);
    setSelected(new Set());
  };

  const handleFormSubmit = async (data: Partial<Contact>) => {
    if (editingContact) {
      await updateContact(editingContact.id, data);
    } else {
      const result = await createContact(data);
      if (result.error) {
        alert(result.error);
        return;
      }
    }
  };

  const visibleColDefs = ALL_COLS.filter(c => visibleCols.includes(c.id));

  /* Cell renderer */
  const cellValue = (c: Contact, colId: string): string => {
    switch (colId) {
      case 'email':     return c.email || '--';
      case 'phone':     return c.phone || '--';
      case 'job_title': return c.job_title || '--';
      case 'owner':     return 'No owner';
      case 'priority':  return '--';
      case 'lang':      return '--';
      case 'product':   return '--';
      case 'company':    return c.company?.name || '--';
      case 'created_at': return fmtDate(c.created_at);
      case 'updated_at': return fmtDate(c.updated_at);
      case 'contacted':  return fmtDate(c.last_contacted_at);
      default:           return '--';
    }
  };

  const isContactedCol = (id: string) => id === 'contacted' || id === 'created_at' || id === 'updated_at';

  /* ══ RENDER ══ */
  return (
    <div className="flex flex-col h-full bg-white">

      <GmailConnectBanner />

      {/* ── Page header ── */}
      <div className="px-6 pt-5 pb-0 border-b border-[#dfe3eb] bg-white flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#2d3e50]">Contacts</h1>
          <div className="flex items-center gap-2">
            <a
              href="/import"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#425b76] border border-[#dfe3eb] rounded-[3px] hover:bg-[#f6f9fc] transition-colors"
            >
              <Upload size={13} /> Import
            </a>
            <button
              type="button"
              onClick={() => { setEditingContact(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold text-white rounded-[3px] transition-colors"
              style={{ backgroundColor: '#ff7a59' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#e8694a'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ff7a59'; }}
            >
              <Plus size={14} /> Create contact
            </button>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-0">
          {[{ id: 'all', label: 'All contacts' }, { id: 'mine', label: 'My contacts' }].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as 'all' | 'mine')}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-all"
              style={{
                borderColor: activeTab === tab.id ? '#ff7a59' : 'transparent',
                color: activeTab === tab.id ? '#ff7a59' : '#516f90',
              }}
            >
              {tab.label}
            </button>
          ))}
          <button type="button" className="px-3 py-2.5 text-sm text-[#7c98b6] hover:text-[#425b76] flex items-center gap-1">
            <Plus size={13} /> Add view
          </button>
        </div>
      </div>

      {/* ── Secondary toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#dfe3eb] bg-[#f5f8fa] flex-shrink-0">
        {/* Search */}
        <div className="relative flex-shrink-0" style={{ width: 260 }}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#99acc2]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search contacts…"
            className="h-8 w-full pl-8 pr-3 text-sm border border-[#dfe3eb] rounded-[3px] outline-none text-[#2d3e50] bg-white placeholder:text-[#b0c1d4]"
            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#dfe3eb'; }}
          />
        </div>

        {/* Advanced filters */}
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="flex items-center gap-1.5 h-8 px-3 text-sm font-semibold text-[#425b76] border border-[#dfe3eb] rounded-[3px] bg-white hover:bg-[#f0f3f7] transition-colors"
        >
          <SlidersHorizontal size={13} />
          Advanced filters
          {filters.length > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold" style={{ backgroundColor: '#ff7a59' }}>
              {filters.length}
            </span>
          )}
        </button>

        {/* Edit columns */}
        <div className="relative" ref={colBtnRef}>
          <button
            type="button"
            onClick={() => setColPanelOpen(v => !v)}
            className="flex items-center gap-1.5 h-8 px-3 text-sm font-semibold text-[#425b76] border border-[#dfe3eb] rounded-[3px] bg-white hover:bg-[#f0f3f7] transition-colors"
          >
            <Columns size={13} /> Edit columns
          </button>
          {colPanelOpen && (
            <EditColumnsPanel
              visible={visibleCols}
              onChange={v => setVisibleCols(v)}
              onClose={() => setColPanelOpen(false)}
            />
          )}
        </div>

        <div className="flex-1" />

        {/* Count */}
        <span className="text-xs text-[#7c98b6] flex-shrink-0">
          {filtered.length.toLocaleString()} contact{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Bulk action bar ── */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#dfe3eb] bg-[#fff3f0] flex-shrink-0">
          <span className="text-sm font-semibold text-[#ff7a59]">{selected.size} selected</span>
          <div className="w-px h-4 bg-[#ffd0c4]" />
          <button type="button" onClick={() => { /* edit selected */ }} className="flex items-center gap-1.5 text-sm text-[#425b76] hover:text-[#2d3e50] font-medium">
            <Pencil size={13} /> Edit
          </button>
          <button type="button" onClick={() => { /* assign owner */ }} className="flex items-center gap-1.5 text-sm text-[#425b76] hover:text-[#2d3e50] font-medium">
            <UserCheck size={13} /> Assign
          </button>
          <button type="button" onClick={() => { /* create tasks */ }} className="flex items-center gap-1.5 text-sm text-[#425b76] hover:text-[#2d3e50] font-medium">
            <ClipboardList size={13} /> Create tasks
          </button>
          <button type="button" onClick={handleDeleteSelected} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 font-medium">
            <Trash2 size={13} /> Delete
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-[#99acc2] hover:text-[#425b76]">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-[#ff7a59] border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="mb-5 opacity-40">
              <rect x="10" y="10" width="100" height="60" rx="4" fill="#dfe3eb" />
              <rect x="20" y="22" width="60" height="8" rx="2" fill="#fff" />
              <rect x="20" y="35" width="80" height="6" rx="2" fill="#fff" opacity="0.6" />
              <rect x="20" y="46" width="70" height="6" rx="2" fill="#fff" opacity="0.4" />
              <rect x="20" y="57" width="75" height="6" rx="2" fill="#fff" opacity="0.3" />
            </svg>
            <h3 className="text-base font-bold text-[#2d3e50] mb-1">
              {search || filters.length > 0 ? 'No contacts match your filters' : 'No contacts yet'}
            </h3>
            <p className="text-sm text-[#7c98b6] mb-5 text-center max-w-xs">
              {search || filters.length > 0
                ? 'Try adjusting your search or clearing filters.'
                : 'Import your existing contacts or create your first one.'}
            </p>
            {!(search || filters.length > 0) && (
              <div className="flex gap-2">
                <a href="/import" className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white rounded-[3px]" style={{ backgroundColor: '#ff7a59' }}>
                  <Upload size={13} /> Import contacts
                </a>
                <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#425b76] border border-[#dfe3eb] rounded-[3px] hover:bg-[#f6f9fc]">
                  <Plus size={13} /> Create contact
                </button>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f8fa', borderBottom: '1px solid #dfe3eb' }}>
                {/* Checkbox */}
                <th className="sticky left-0 z-20 w-10 px-3 py-2.5 text-left" style={{ backgroundColor: '#f5f8fa', borderRight: '1px solid #dfe3eb' }}>
                  <button type="button" onClick={toggleAll} className="w-4 h-4 border rounded-[3px] flex items-center justify-center transition-all" style={{ borderColor: allOnPageSelected ? '#ff7a59' : '#cbd6e2', backgroundColor: allOnPageSelected ? '#ff7a59' : '#fff' }}>
                    {allOnPageSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                    {!allOnPageSelected && selected.size > 0 && paginated.some(c => selected.has(c.id)) && (
                      <div className="w-2 h-0.5 bg-[#ff7a59] rounded" />
                    )}
                  </button>
                </th>
                {/* Name — sticky */}
                <th
                  className="sticky left-10 z-20 px-4 py-2.5 text-left text-xs font-semibold text-[#425b76] cursor-pointer select-none whitespace-nowrap"
                  style={{ backgroundColor: '#f5f8fa', borderRight: '1px solid #dfe3eb', minWidth: 200 }}
                  onClick={() => handleSort('name')}
                >
                  Name {sortCol === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                {/* Dynamic columns */}
                {visibleColDefs.map(col => (
                  <th
                    key={col.id}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-[#425b76] cursor-pointer select-none whitespace-nowrap"
                    style={{ minWidth: col.width, borderRight: '1px solid #dfe3eb' }}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.label} {sortCol === col.id ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((contact, idx) => {
                const isSelected = selected.has(contact.id);
                return (
                  <tr
                    key={contact.id}
                    className="group transition-colors"
                    style={{
                      borderBottom: '1px solid #dfe3eb',
                      backgroundColor: isSelected ? '#fff3f0' : undefined,
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f8fa'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                  >
                    {/* Checkbox */}
                    <td className="sticky left-0 z-10 w-10 px-3 py-2.5" style={{ backgroundColor: isSelected ? '#fff3f0' : '#fff', borderRight: '1px solid #dfe3eb' }}>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); toggleOne(contact.id); }}
                        className="w-4 h-4 border rounded-[3px] flex items-center justify-center transition-all"
                        style={{ borderColor: isSelected ? '#ff7a59' : '#cbd6e2', backgroundColor: isSelected ? '#ff7a59' : '#fff' }}
                      >
                        {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                      </button>
                    </td>

                    {/* Name — sticky */}
                    <td
                      className="sticky left-10 z-10 px-4 py-2.5 whitespace-nowrap"
                      style={{ backgroundColor: isSelected ? '#fff3f0' : '#fff', borderRight: '1px solid #dfe3eb', minWidth: 200 }}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Avatar */}
                        {(() => {
                          const domain = getContactDomain(contact);
                          return domain ? (
                            <img
                              src={faviconUrl(domain)}
                              alt={domain}
                              className="w-7 h-7 rounded-full flex-shrink-0 object-cover bg-gray-100"
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.style.display = 'none';
                                el.nextElementSibling?.removeAttribute('style');
                              }}
                            />
                          ) : null;
                        })()}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: avatarColor(fullName(contact)), display: getContactDomain(contact) ? 'none' : 'flex' }}
                        >
                          {initials(contact)}
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push(`/contacts/${contact.id}`)}
                          className="text-sm font-medium truncate max-w-[160px] text-left hover:underline"
                          style={{ color: '#00a38d' }}
                        >
                          {fullName(contact)}
                        </button>
                      </div>
                    </td>

                    {/* Dynamic columns */}
                    {visibleColDefs.map(col => {
                      const val = cellValue(contact, col.id);
                      const isTeal = isContactedCol(col.id) && val !== '--';
                      const isEditable = EDITABLE_COLS.has(col.id);
                      const isActive = editingCell?.id === contact.id && editingCell?.col === col.id;
                      return (
                        <td
                          key={col.id}
                          className="whitespace-nowrap text-sm relative"
                          style={{
                            borderRight: '1px solid #dfe3eb',
                            minWidth: col.width,
                            padding: isActive ? 0 : undefined,
                            outline: isActive ? '2px solid #3b82f6' : undefined,
                            outlineOffset: isActive ? '-2px' : undefined,
                          }}
                          onClick={() => { if (isEditable && !isActive) startEdit(contact, col.id); }}
                        >
                          {isActive ? (
                            <input
                              ref={cellInputRef}
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(contact, col.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitEdit(contact, col.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="w-full h-full px-4 py-2.5 text-sm outline-none bg-white"
                              style={{ color: '#2d3e50', minWidth: col.width }}
                            />
                          ) : (
                            <span
                              className={`block px-4 py-2.5 ${isEditable ? 'cursor-text hover:bg-[#f0f7ff]' : ''}`}
                              style={{ color: isTeal ? '#00a38d' : val === '--' ? '#99acc2' : '#2d3e50' }}
                            >
                              {val}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-center gap-3 px-6 py-3 border-t border-[#dfe3eb] bg-white flex-shrink-0">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="flex items-center gap-1 px-2 py-1 text-sm text-[#425b76] disabled:opacity-30 hover:text-[#2d3e50]"
          >
            <ChevronLeft size={14} /> Prev
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 7) {
                if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className="w-7 h-7 text-sm rounded flex items-center justify-center font-medium transition-all"
                  style={{
                    backgroundColor: page === p ? '#2d3e50' : 'transparent',
                    color: page === p ? '#fff' : '#425b76',
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="flex items-center gap-1 px-2 py-1 text-sm text-[#425b76] disabled:opacity-30 hover:text-[#2d3e50]"
          >
            Next <ChevronRight size={14} />
          </button>

          {/* Page size */}
          <div className="relative ml-2">
            <button
              type="button"
              onClick={() => setPageSizeOpen(v => !v)}
              className="flex items-center gap-1 px-2 py-1 text-sm text-[#425b76] border border-[#dfe3eb] rounded-[3px] hover:bg-[#f6f9fc]"
            >
              {pageSize} per page <ChevronDown size={12} />
            </button>
            {pageSizeOpen && (
              <div className="absolute bottom-9 right-0 bg-white border border-[#dfe3eb] rounded-[3px] shadow-lg py-1 z-20">
                {PAGE_SIZES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setPageSize(s); setPage(1); setPageSizeOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-1.5 text-sm text-[#2d3e50] hover:bg-[#f6f9fc]"
                  >
                    {pageSize === s && <Check size={12} className="text-[#ff7a59]" />}
                    {pageSize !== s && <span className="w-3" />}
                    {s} per page
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-xs text-[#7c98b6] ml-1">
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length.toLocaleString()}
          </span>
        </div>
      )}

      {/* ── Filter panel ── */}
      {filterOpen && (
        <FilterPanel
          filters={filters}
          onAdd={f => { setFilters(prev => [...prev, f]); setPage(1); }}
          onRemove={i => setFilters(prev => prev.filter((_, idx) => idx !== i))}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {/* ── Contact form ── */}
      <ContactForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingContact(null); }}
        onSubmit={handleFormSubmit}
        initialData={editingContact || undefined}
      />
    </div>
  );
}
