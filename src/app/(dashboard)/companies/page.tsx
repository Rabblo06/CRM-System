'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronDown, ChevronRight, Plus, MoreHorizontal, Search, X,
  Trash2, Edit2, FolderPlus, Download, Building2, MoveRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import CompanyImportWizard from '@/components/contacts/CompanyImportWizard';
import type { CompanyImportResult } from '@/components/contacts/CompanyImportWizard';
import { useCompanies } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import type { Company } from '@/types';

/* ── Types ─────────────────────────────────────────────────── */
interface Group {
  id: string;
  name: string;
  color: string;
  order: number;
  sourceFile?: string;
  archived?: boolean;
}

type Status = 'active' | 'prospect' | 'customer' | 'churned' | '';

/* ── Column definitions ─────────────────────────────────────── */
const ALL_COLUMNS = [
  { id: 'company',      label: 'Name of company' },
  { id: 'domain',       label: 'Domain' },
  { id: 'email',        label: 'Email' },
  { id: 'activities',   label: 'Activities timeline' },
  { id: 'accounts',     label: 'Accounts' },
  { id: 'deals',        label: 'Deals' },
  { id: 'deals_value',  label: 'Deals value' },
  { id: 'phone',        label: 'Phone number' },
  { id: 'mobile',       label: 'Mobile no' },
  { id: 'address',      label: 'Address' },
  { id: 'manager_name', label: 'Name of manager' },
  { id: 'industry',     label: 'Industry' },
  { id: 'owner',        label: 'Owner' },
  { id: 'email_note',   label: 'Emailnote' },
  { id: 'next_step',    label: 'Next step' },
  { id: 'status',       label: 'Status' },
  { id: 'priority',     label: 'Priority' },
] as const;
type ColumnId = (typeof ALL_COLUMNS)[number]['id'];

const DEFAULT_VISIBLE: ColumnId[] = ['company','domain','phone','industry','deals','deals_value','status'];

/* ── Constants ─────────────────────────────────────────────── */
const DEFAULT_GROUP: Group = { id: 'all', name: 'All Companies', color: '#0091AE', order: 0 };

const GROUP_COLORS = [
  '#0091AE','#00A38D','#8B5CF6','#F59E0B','#EF4444',
  '#3B82F6','#10B981','#F97316','#EC4899','#6366F1',
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active:   { label: 'Active',   bg: '#ECFDF5', text: '#10B981' },
  prospect: { label: 'Prospect', bg: '#EFF6FF', text: '#3B82F6' },
  customer: { label: 'Customer', bg: '#F0FDFA', text: '#0091AE' },
  churned:  { label: 'Churned',  bg: '#FFF7ED', text: '#F97316' },
};

const THREE_DOT_ITEMS = [
  { id: 'collapse_this',  label: 'Collapse this group' },
  { id: 'collapse_all',   label: 'Collapse all groups' },
  { id: 'select_all',     label: 'Select all Companies in group' },
  null,
  { id: 'add_group',      label: 'Add group' },
  { id: 'duplicate',      label: 'Duplicate this group' },
  { id: 'move',           label: 'Move group' },
  { id: 'rename',         label: 'Rename group' },
  { id: 'color',          label: 'Change group color' },
  null,
  { id: 'export',         label: 'Export to Excel' },
  { id: 'apps',           label: 'Apps' },
  null,
  { id: 'delete',         label: 'Delete group', danger: true },
  { id: 'archive',        label: 'Archive group' },
];

const AVATAR_COLORS = ['#ff7a59','#0091AE','#00a38d','#3b82f6','#8b5cf6','#f59e0b','#10b981','#6366f1'];
function avatarColor(name: string) { return AVATAR_COLORS[(name.charCodeAt(0) || 65) % AVATAR_COLORS.length]; }
function companyInitials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function storageKey(suffix: string, email: string) { return `crm_co_${suffix}_${email}`; }

function getPhoneFlag(phone: string): string {
  const p = (phone || '').replace(/\s/g, '');
  if (p.startsWith('+1'))  return '🇺🇸';
  if (p.startsWith('+44')) return '🇬🇧';
  if (p.startsWith('+33')) return '🇫🇷';
  if (p.startsWith('+49')) return '🇩🇪';
  if (p.startsWith('+61')) return '🇦🇺';
  if (p.startsWith('+91')) return '🇮🇳';
  return '';
}

/* ── Status badge ───────────────────────────────────────────── */
function StatusBadge({ status, onChange }: { status: Status; onChange?: (s: Status) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const cfg = status ? STATUS_CONFIG[status] : null;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => onChange && setOpen(v => !v)}
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
        style={cfg ? { backgroundColor: cfg.bg, color: cfg.text } : { backgroundColor: '#F6F9FC', color: '#99ACC2' }}>
        {cfg ? cfg.label : '—'}
      </button>
      {open && onChange && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#DFE3EB] rounded-[3px] shadow-xl py-1 min-w-[120px]">
          <button onClick={() => { onChange(''); setOpen(false); }} className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#F6F9FC] text-[#99ACC2]">— None</button>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => { onChange(k as Status); setOpen(false); }}
              className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#F6F9FC] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.text }} />
              <span style={{ color: v.text, fontWeight: 600 }}>{v.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Pill ───────────────────────────────────────────────────── */
function Pill({ label, color = '#0091AE' }: { label: string; color?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
      style={{ borderColor: `${color}40`, color, backgroundColor: `${color}10` }}>
      {label}
    </span>
  );
}

/* ── Priority badge ─────────────────────────────────────────── */
type Priority = 'high' | 'medium' | 'low' | '';
const PRIORITY_CONFIG: Record<string, { label: string; badge: string }> = {
  high:   { label: 'High',   badge: '#FF7A59' },
  medium: { label: 'Medium', badge: '#3B82F6' },
  low:    { label: 'Low',    badge: '#10B981' },
};

function PriorityBadge({ priority, onChange }: { priority: Priority; onChange?: (p: Priority) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const cfg = priority ? PRIORITY_CONFIG[priority] : null;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => onChange && setOpen(v => !v)}
        className="inline-flex items-center px-3 py-1 rounded text-xs font-bold min-w-[64px] justify-center"
        style={cfg ? { backgroundColor: cfg.badge, color: '#fff' } : { backgroundColor: '#F0F3F7', color: '#99ACC2' }}>
        {cfg ? cfg.label : '—'}
      </button>
      {open && onChange && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#DFE3EB] rounded-[3px] shadow-2xl py-1 min-w-[110px]">
          <button onClick={() => { onChange(''); setOpen(false); }}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#F6F9FC] text-[#99ACC2]">— None</button>
          {(['high','medium','low'] as Priority[]).map(k => (
            <button key={k} onClick={() => { onChange(k); setOpen(false); }}
              className="w-full px-2 py-1.5 text-xs hover:bg-[#F6F9FC]">
              <span className="flex-1 font-bold text-center py-0.5 rounded text-white text-xs block"
                style={{ backgroundColor: PRIORITY_CONFIG[k].badge }}>
                {PRIORITY_CONFIG[k].label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Three-dot menu ─────────────────────────────────────────── */
function ThreeDotMenu({ groupId, isFixed, onAction }: {
  groupId: string; isFixed: boolean; onAction: (action: string, groupId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} className="p-1 rounded hover:bg-black/10 opacity-0 group-hover:opacity-100">
        <MoreHorizontal className="w-4 h-4 text-white" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#DFE3EB] rounded-[3px] shadow-2xl py-1 min-w-[230px]">
          {THREE_DOT_ITEMS.map((item, i) => {
            if (!item) return <div key={i} className="my-1 border-t border-[#DFE3EB]" />;
            const disabled = isFixed && ['delete','archive'].includes(item.id);
            return (
              <button key={item.id} disabled={disabled}
                onClick={() => { setOpen(false); onAction(item.id, groupId); }}
                className="w-full px-4 py-2 text-xs text-left hover:bg-[#F6F9FC] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: item.danger ? '#EF4444' : '#2D3E50' }}>
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Move-to-group dropdown ─────────────────────────────────── */
function MoveToGroupDropdown({ companyId, currentGroupId, groups, onMove }: {
  companyId: string; currentGroupId: string; groups: Group[];
  onMove: (companyId: string, targetGroupId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const available = groups.filter(g => g.id !== currentGroupId);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} title="Move to group" className="p-0.5 rounded hover:bg-[#E8F4FD]">
        <MoveRight className="w-3 h-3 text-[#7C98B6]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#DFE3EB] rounded-[3px] shadow-2xl py-1 min-w-[180px]">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-[#99ACC2] uppercase tracking-wide">Move to group</p>
          {available.map(g => (
            <button key={g.id} onClick={() => { onMove(companyId, g.id); setOpen(false); }}
              className="w-full px-3 py-2 text-xs text-left hover:bg-[#F6F9FC] flex items-center gap-2 text-[#2D3E50]">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Color picker modal ─────────────────────────────────────── */
function ColorPickerModal({ groupName, current, onSelect, onClose }: {
  groupName: string; current: string; onSelect: (c: string) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-[3px] shadow-2xl w-80" style={{ border: '1px solid #DFE3EB' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#DFE3EB]">
          <span className="text-sm font-bold text-[#2D3E50]">Change group color</span>
          <button onClick={onClose}><X className="w-4 h-4 text-[#99ACC2]" /></button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-[#7C98B6] mb-3">{groupName}</p>
          <div className="grid grid-cols-5 gap-2">
            {GROUP_COLORS.map(c => (
              <button key={c} onClick={() => { onSelect(c); onClose(); }}
                className="w-10 h-10 rounded-full border-2 hover:scale-110 transition-transform"
                style={{ backgroundColor: c, borderColor: c === current ? '#2D3E50' : 'transparent' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── Delete group confirm modal ─────────────────────────────── */
function DeleteGroupModal({ groupName, onConfirm, onClose }: {
  groupName: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-[3px] shadow-2xl w-[420px]" style={{ border: '1px solid #DFE3EB' }}>
        <div className="px-5 py-4 border-b border-[#DFE3EB]">
          <p className="text-sm font-bold text-[#2D3E50]">Delete group?</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-[#516F90]">
            Are you sure you want to delete <strong className="text-[#2D3E50]">"{groupName}"</strong>?
            All companies inside this group will also be deleted. This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#DFE3EB]">
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm text-[#425B76] border border-[#DFE3EB] rounded-[3px] hover:bg-[#F6F9FC]">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-1.5 text-sm font-bold text-white rounded-[3px] bg-red-500 hover:bg-red-600">
            Delete group
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Toast notification ─────────────────────────────────────── */
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-[3px] shadow-xl text-white text-sm font-semibold"
      style={{ backgroundColor: type === 'success' ? '#00A38D' : '#EF4444' }}>
      {message}
      <button onClick={onClose}><X className="w-4 h-4 opacity-80 hover:opacity-100" /></button>
    </div>
  );
}

/* ── Inline editable text cell ─────────────────────────────── */
function InlineCell({ value, onSave, placeholder = 'Add…' }: {
  value: string; onSave: (v: string) => void; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setVal(value); }, [value]);
  const commit = () => { setEditing(false); if (val !== value) onSave(val.trim()); };
  if (editing) {
    return (
      <input ref={ref} value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false); } }}
        onBlur={commit}
        className="w-full text-xs px-1 py-0.5 border border-[#0091AE] rounded outline-none text-[#2D3E50] bg-white"
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="text-xs text-left w-full truncate max-w-[160px]">
      {val
        ? <span className="text-[#2D3E50]">{val}</span>
        : <span className="opacity-0 group-hover/row:opacity-60 text-[#B0C1D4]">{placeholder}</span>}
    </button>
  );
}

/* ── Inline add row ─────────────────────────────────────────── */
function InlineAddRow({ onSave, onCancel }: {
  onSave: (data: { name: string; domain: string; phone: string; industry: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name,     setName]     = useState('');
  const [domain,   setDomain]   = useState('');
  const [phone,    setPhone]    = useState('');
  const [industry, setIndustry] = useState('');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), domain: domain.trim(), phone: phone.trim(), industry: industry.trim() });
    setSaving(false);
  };

  const inp = "h-7 px-2 text-xs border border-[#CBD6E2] rounded outline-none text-[#2D3E50] w-full";
  const focus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = '#0091AE'; };
  const blur  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = '#CBD6E2'; };

  return (
    <tr className="border-b border-[#F0F3F7] bg-blue-50/20">
      <td className="w-10 px-3 py-2" />
      {/* Company name */}
      <td className="px-2 py-2 min-w-[200px]">
        <input autoFocus placeholder="Company name *" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          className={inp} onFocus={focus} onBlur={blur} />
      </td>
      {/* Domain */}
      <td className="px-2 py-2 min-w-[160px]">
        <input placeholder="Domain" value={domain} onChange={e => setDomain(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          className={inp} onFocus={focus} onBlur={blur} />
      </td>
      {/* Phone */}
      <td className="px-2 py-2 min-w-[140px]">
        <input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          className={inp} onFocus={focus} onBlur={blur} />
      </td>
      {/* Owner */}
      <td className="px-2 py-2 w-[120px]" />
      {/* Industry */}
      <td className="px-2 py-2 min-w-[120px]">
        <input placeholder="Industry" value={industry} onChange={e => setIndustry(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          className={inp} onFocus={focus} onBlur={blur} />
      </td>
      {/* Deals */}
      <td className="px-2 py-2 w-[80px]" />
      {/* Deals value */}
      <td className="px-2 py-2 w-[100px]" />
      {/* Status / Actions */}
      <td className="px-2 py-2 w-[140px]">
        <div className="flex items-center gap-1">
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="px-2.5 py-1 text-xs font-bold text-white rounded-[3px] disabled:opacity-40"
            style={{ backgroundColor: '#0091AE' }}>
            {saving ? '…' : 'Add'}
          </button>
          <button onClick={onCancel}
            className="px-2 py-1 text-xs text-[#7C98B6] border border-[#DFE3EB] rounded-[3px] hover:bg-[#F6F9FC]">✕</button>
        </div>
      </td>
    </tr>
  );
}

/* ── Company Row ────────────────────────────────────────────── */
function CompanyRow({
  company, selected, onSelect, status, onStatusChange, priority, onPriorityChange,
  onEdit, onDelete, onMoveToGroup, allGroups, currentGroupId, visibleColumns, onFieldSave,
}: {
  company: Company; selected: boolean; onSelect: (id: string) => void;
  status: Status; onStatusChange: (id: string, s: Status) => void;
  priority: Priority; onPriorityChange: (id: string, p: Priority) => void;
  onEdit: (c: Company) => void; onDelete: (id: string) => void;
  onMoveToGroup: (id: string, groupId: string) => void;
  allGroups: Group[]; currentGroupId: string;
  visibleColumns: Set<ColumnId>;
  onFieldSave: (id: string, field: string, value: string) => Promise<void>;
}) {
  const vc = visibleColumns;
  const cc = "border-r border-[#F0F3F7]";
  return (
    <tr className="border-b border-[#F0F3F7] hover:bg-[#F8FAFC] transition-colors group/row">
      <td className={`w-10 px-3 py-2.5 ${cc}`}>
        <input type="checkbox" checked={selected} onChange={() => onSelect(company.id)}
          className="w-3.5 h-3.5 rounded border-[#CBD6E2] accent-[#0091AE]" />
      </td>

      {/* Company name — always visible */}
      <td className={`px-3 py-2.5 min-w-[200px] sticky left-10 bg-inherit ${cc}`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: avatarColor(company.name || 'A') }}>
            {companyInitials(company.name || '?')}
          </div>
          <Link href={`/companies/${company.id}`}
            className="text-xs font-semibold hover:underline truncate max-w-[140px]"
            style={{ color: '#0091AE' }}>
            {company.name}
          </Link>
          <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onEdit(company)} title="Edit" className="p-0.5 rounded hover:bg-[#E8F4FD]">
              <Edit2 className="w-3 h-3 text-[#7C98B6]" />
            </button>
            <button onClick={() => onDelete(company.id)} title="Delete" className="p-0.5 rounded hover:bg-red-50">
              <Trash2 className="w-3 h-3 text-[#99ACC2] hover:text-red-400" />
            </button>
            <MoveToGroupDropdown companyId={company.id} currentGroupId={currentGroupId} groups={allGroups} onMove={onMoveToGroup} />
          </div>
        </div>
      </td>

      {vc.has('domain') && (
        <td className={`px-3 py-2.5 min-w-[160px] ${cc}`}>
          {company.domain ? (
            <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer"
              className="text-xs hover:underline" style={{ color: '#0091AE' }}>{company.domain}</a>
          ) : <span className="text-xs text-[#B0C1D4]">—</span>}
        </td>
      )}
      {vc.has('email') && (
        <td className={`px-3 py-2.5 min-w-[180px] ${cc}`}>
          <InlineCell value={(company as { email?: string }).email || ''} onSave={v => onFieldSave(company.id, 'email', v)} placeholder="Add email" />
        </td>
      )}
      {vc.has('activities') && (
        <td className={`px-3 py-2.5 w-[100px] ${cc}`}>
          <div className="flex items-end gap-0.5">
            {[false,false,false,false,false].map((_, i) => (
              <div key={i} style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: '#DFE3EB' }} />
            ))}
          </div>
        </td>
      )}
      {vc.has('accounts') && (
        <td className={`px-3 py-2.5 w-[80px] ${cc}`}><span className="text-xs text-[#B0C1D4]">—</span></td>
      )}
      {vc.has('deals') && (
        <td className={`px-3 py-2.5 w-[80px] ${cc}`}><span className="text-xs text-[#B0C1D4]">—</span></td>
      )}
      {vc.has('deals_value') && (
        <td className={`px-3 py-2.5 w-[100px] ${cc}`}><span className="text-xs text-[#B0C1D4]">—</span></td>
      )}
      {vc.has('phone') && (
        <td className={`px-3 py-2.5 min-w-[140px] ${cc}`}>
          <InlineCell value={company.phone || ''} onSave={v => onFieldSave(company.id, 'phone', v)} placeholder="Add phone" />
        </td>
      )}
      {vc.has('mobile') && (
        <td className={`px-3 py-2.5 min-w-[140px] ${cc}`}>
          <InlineCell value={company.mobile || ''} onSave={v => onFieldSave(company.id, 'mobile', v)} placeholder="Add mobile" />
        </td>
      )}
      {vc.has('address') && (
        <td className={`px-3 py-2.5 min-w-[160px] ${cc}`}>
          <InlineCell value={company.address || ''} onSave={v => onFieldSave(company.id, 'address', v)} placeholder="Add address" />
        </td>
      )}
      {vc.has('manager_name') && (
        <td className={`px-3 py-2.5 min-w-[140px] ${cc}`}>
          <InlineCell value={company.manager_name || ''} onSave={v => onFieldSave(company.id, 'manager_name', v)} placeholder="Add manager" />
        </td>
      )}
      {vc.has('industry') && (
        <td className={`px-3 py-2.5 min-w-[120px] ${cc}`}>
          {company.industry ? <Pill label={company.industry} color="#0091AE" />
            : <InlineCell value="" onSave={v => onFieldSave(company.id, 'industry', v)} placeholder="Add industry" />}
        </td>
      )}
      {vc.has('owner') && (
        <td className={`px-3 py-2.5 min-w-[120px] ${cc}`}><span className="text-xs text-[#B0C1D4]">—</span></td>
      )}
      {vc.has('email_note') && (
        <td className={`px-3 py-2.5 min-w-[160px] ${cc}`}>
          <InlineCell value={company.email_note || ''} onSave={v => onFieldSave(company.id, 'email_note', v)} placeholder="Add email note" />
        </td>
      )}
      {vc.has('next_step') && (
        <td className={`px-3 py-2.5 min-w-[160px] ${cc}`}>
          <InlineCell value={company.next_step || ''} onSave={v => onFieldSave(company.id, 'next_step', v)} placeholder="Add next step" />
        </td>
      )}
      {vc.has('status') && (
        <td className={`px-3 py-2.5 w-[110px] ${cc}`}>
          <StatusBadge status={status} onChange={(s) => onStatusChange(company.id, s)} />
        </td>
      )}
      {vc.has('priority') && (
        <td className={`px-3 py-2.5 w-[110px] ${cc}`}>
          <PriorityBadge priority={priority} onChange={(p) => onPriorityChange(company.id, p)} />
        </td>
      )}
    </tr>
  );
}

/* ── Group Section ──────────────────────────────────────────── */
function GroupSection({
  group, companies, collapsed, onToggleCollapse, selectedIds, onSelect, onSelectAll,
  statuses, onStatusChange, priorities, onPriorityChange, onEdit, onDelete, onGroupAction,
  onMoveToGroup, allGroups, addingToGroup, onStartAdd, onSaveAdd, onCancelAdd,
  triggerRename, onRenameComplete, visibleColumns, onToggleColumn, onFieldSave,
}: {
  group: Group; companies: Company[]; collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  selectedIds: Set<string>; onSelect: (id: string) => void;
  onSelectAll: (gId: string, ids: string[]) => void;
  statuses: Record<string, Status>; onStatusChange: (id: string, s: Status) => void;
  priorities: Record<string, Priority>; onPriorityChange: (id: string, p: Priority) => void;
  onEdit: (c: Company) => void; onDelete: (id: string) => void;
  onGroupAction: (action: string, groupId: string) => void;
  onMoveToGroup: (id: string, groupId: string) => void;
  allGroups: Group[]; addingToGroup: string | null;
  onStartAdd: (groupId: string) => void;
  onSaveAdd: (data: { name: string; domain: string; phone: string; industry: string }, groupId: string) => Promise<void>;
  onCancelAdd: () => void;
  triggerRename?: string | null;
  onRenameComplete: (id: string, name: string) => void;
  visibleColumns: Set<ColumnId>;
  onToggleColumn: (id: ColumnId) => void;
  onFieldSave: (id: string, field: string, value: string) => Promise<void>;
}) {
  const isFixed = group.id === 'all';
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(group.name);
  const [showColPicker, setShowColPicker] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const colPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (triggerRename === group.id) { setEditNameVal(group.name); setIsEditingName(true); }
  }, [triggerRename, group.id, group.name]);

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const commitNameEdit = () => {
    if (editNameVal.trim()) onRenameComplete(group.id, editNameVal.trim());
    setIsEditingName(false);
  };

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-3 py-1.5 group select-none" style={{ backgroundColor: `${group.color}18` }}>
        <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
        <button onClick={() => onToggleCollapse(group.id)} className="flex-shrink-0">
          {collapsed
            ? <ChevronRight className="w-4 h-4" style={{ color: group.color }} />
            : <ChevronDown className="w-4 h-4" style={{ color: group.color }} />}
        </button>
        {isEditingName ? (
          <input
            ref={nameInputRef}
            value={editNameVal}
            onChange={e => setEditNameVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitNameEdit(); if (e.key === 'Escape') setIsEditingName(false); }}
            onBlur={commitNameEdit}
            className="text-xs font-bold px-1 rounded border outline-none"
            style={{ color: group.color, borderColor: group.color, minWidth: 80, background: 'white' }}
          />
        ) : (
          <span
            className="text-xs font-bold cursor-default"
            style={{ color: group.color }}
            onDoubleClick={() => { setEditNameVal(group.name); setIsEditingName(true); }}
          >{group.name}</span>
        )}
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: group.color }}>
          {companies.length}
        </span>
        <div className="flex-1" />
        <ThreeDotMenu groupId={group.id} isFixed={isFixed} onAction={onGroupAction} />
      </div>

      {!collapsed && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#DFE3EB] bg-white">
              <th className="w-10 px-3 py-2">
                <input type="checkbox"
                  checked={companies.length > 0 && companies.every(c => selectedIds.has(c.id))}
                  onChange={() => onSelectAll(group.id, companies.map(c => c.id))}
                  className="w-3.5 h-3.5 rounded border-[#CBD6E2] accent-[#0091AE]" />
              </th>
              {/* Company column — always shown */}
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[#516F90] whitespace-nowrap" style={{ fontSize: 10 }}>
                Name of company
              </th>
              {ALL_COLUMNS.filter(c => c.id !== 'company' && visibleColumns.has(c.id)).map(col => (
                <th key={col.id} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[#516F90] whitespace-nowrap" style={{ fontSize: 10 }}>
                  {col.label}
                </th>
              ))}
              {/* Column picker "+" button */}
              <th className="px-2 py-2 w-8">
                <div ref={colPickerRef} className="relative">
                  <button onClick={() => setShowColPicker(v => !v)}
                    className="w-6 h-6 flex items-center justify-center rounded border border-dashed border-[#CBD6E2] hover:border-[#0091AE] hover:bg-[#E8F4FD] transition-colors"
                    title="Show/hide columns">
                    <Plus className="w-3 h-3 text-[#99ACC2]" />
                  </button>
                  {showColPicker && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#DFE3EB] rounded-[3px] shadow-2xl py-2 min-w-[190px]">
                      <p className="px-3 pb-1.5 text-[10px] font-semibold text-[#516F90] uppercase tracking-wide">Show / hide columns</p>
                      {ALL_COLUMNS.filter(c => c.id !== 'company').map(col => (
                        <label key={col.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#F6F9FC] cursor-pointer">
                          <input type="checkbox" checked={visibleColumns.has(col.id)} onChange={() => onToggleColumn(col.id)}
                            className="w-3.5 h-3.5 rounded border-[#CBD6E2] accent-[#0091AE]" />
                          <span className="text-xs text-[#2D3E50]">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <CompanyRow key={company.id} company={company}
                selected={selectedIds.has(company.id)} onSelect={onSelect}
                status={statuses[company.id] || ''} onStatusChange={onStatusChange}
                priority={priorities[company.id] || ''} onPriorityChange={onPriorityChange}
                onEdit={onEdit} onDelete={onDelete}
                onMoveToGroup={onMoveToGroup} allGroups={allGroups} currentGroupId={group.id}
                visibleColumns={visibleColumns} onFieldSave={onFieldSave}
              />
            ))}

            {/* Inline add row */}
            {addingToGroup === group.id && (
              <InlineAddRow
                onSave={(data) => onSaveAdd(data, group.id)}
                onCancel={onCancelAdd}
              />
            )}

            {/* Add company button */}
            <tr>
              <td />
              <td className="px-3 py-2.5" colSpan={8}>
                <button onClick={() => onStartAdd(group.id)}
                  className="flex items-center gap-1.5 text-xs font-medium hover:text-[#0091AE] transition-colors"
                  style={{ color: '#7C98B6' }}>
                  <Plus className="w-3.5 h-3.5" /> Add company
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function CompaniesPage() {
  const { companies, loading, fetchCompanies, createCompany, updateCompany, deleteCompany, deleteCompaniesByIds } = useCompanies();
  // Initialize synchronously from localStorage so save* callbacks work immediately
  // on first render without waiting for the async getUser() call to resolve.
  const [userEmail, setUserEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('crm_demo_user_email') || '';
  });

  const [customGroups,    setCustomGroups]    = useState<Group[]>([]);
  const [groupMap,        setGroupMap]        = useState<Record<string, string>>({});
  const [statuses,        setStatuses]        = useState<Record<string, Status>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [visibleColumns,  setVisibleColumns]  = useState<Set<ColumnId>>(new Set(DEFAULT_VISIBLE));
  const [priorities,      setPriorities]      = useState<Record<string, Priority>>({});

  const [search,          setSearch]          = useState('');
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());
  const [showImport,      setShowImport]      = useState(false);
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [editCompany,     setEditCompany]     = useState<Company | null>(null);
  const [editForm,        setEditForm]        = useState<{
    name: string; email: string; phone: string; mobile: string; address: string;
    manager_name: string; industry: string; next_step: string; domain: string;
    size: string; website: string; city: string; country: string;
    annual_revenue: string; description: string;
  }>({
    name: '', email: '', phone: '', mobile: '', address: '',
    manager_name: '', industry: '', next_step: '', domain: '',
    size: '', website: '', city: '', country: '',
    annual_revenue: '', description: '',
  });
  const [addingToGroup,   setAddingToGroup]   = useState<string | null>(null);

  const [colorPickerGroup,     setColorPickerGroup]     = useState<string | null>(null);
  const [triggerRenameGroup,   setTriggerRenameGroup]   = useState<string | null>(null);
  const [deleteGroupId,        setDeleteGroupId]        = useState<string | null>(null);
  const [toast,                setToast]                = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [fixedGroupOverrides,  setFixedGroupOverrides]  = useState<Record<string, { name?: string; color?: string }>>({});

  const newBtnRef = useRef<HTMLDivElement>(null);

  /* ── Load persisted state ── */
  // Immediately load from localStorage using the synchronously-initialized userEmail.
  // This runs before the async getUser() resolves, ensuring save* callbacks have a
  // valid email key from the very first render.
  useEffect(() => {
    const loadFromEmail = (email: string) => {
      if (!email) return;
      try {
        setCustomGroups(JSON.parse(localStorage.getItem(storageKey('groups', email)) || '[]'));
        setGroupMap(JSON.parse(localStorage.getItem(storageKey('map', email)) || '{}'));
        setStatuses(JSON.parse(localStorage.getItem(storageKey('statuses', email)) || '{}'));
        const savedFgo = localStorage.getItem(storageKey('fgo', email));
        if (savedFgo) setFixedGroupOverrides(JSON.parse(savedFgo));
        setCollapsedGroups(new Set(JSON.parse(localStorage.getItem(storageKey('collapsed', email)) || '[]')));
        const savedCols = localStorage.getItem(storageKey('columns', email));
        if (savedCols) setVisibleColumns(new Set(JSON.parse(savedCols) as ColumnId[]));
        setPriorities(JSON.parse(localStorage.getItem(storageKey('priorities', email)) || '{}'));
      } catch { /* ignore */ }
    };

    // 1. Load immediately with the email we already have from localStorage
    if (userEmail) loadFromEmail(userEmail);

    // 2. Confirm/update with the server-verified email
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return;
      const email = user.email;
      if (email !== userEmail) {
        setUserEmail(email);
        loadFromEmail(email);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveGroups    = useCallback((g: Group[])                => { if (userEmail) localStorage.setItem(storageKey('groups',    userEmail), JSON.stringify(g)); }, [userEmail]);
  const saveMap       = useCallback((m: Record<string, string>) => { if (userEmail) localStorage.setItem(storageKey('map',       userEmail), JSON.stringify(m)); }, [userEmail]);
  const saveStatuses  = useCallback((s: Record<string, Status>) => { if (userEmail) localStorage.setItem(storageKey('statuses',  userEmail), JSON.stringify(s)); }, [userEmail]);
  const saveCollapsed   = useCallback((s: Set<string>)              => { if (userEmail) localStorage.setItem(storageKey('collapsed',  userEmail), JSON.stringify([...s])); }, [userEmail]);
  const saveColumns     = useCallback((s: Set<ColumnId>)            => { if (userEmail) localStorage.setItem(storageKey('columns',    userEmail), JSON.stringify([...s])); }, [userEmail]);
  const savePriorities  = useCallback((p: Record<string, Priority>) => { if (userEmail) localStorage.setItem(storageKey('priorities', userEmail), JSON.stringify(p)); }, [userEmail]);
  const saveFgo       = useCallback((o: Record<string, { name?: string; color?: string }>) => { if (userEmail) localStorage.setItem(storageKey('fgo', userEmail), JSON.stringify(o)); }, [userEmail]);

  const handleToggleColumn = useCallback((id: ColumnId) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveColumns(next);
      return next;
    });
  }, [saveColumns]);

  const handleFieldSave = useCallback(async (id: string, field: string, value: string) => {
    await updateCompany(id, { [field]: value } as Parameters<typeof updateCompany>[1]);
  }, [updateCompany]);

  const handlePriorityChange = (id: string, p: Priority) => {
    const next = { ...priorities, [id]: p }; setPriorities(next); savePriorities(next);
  };

  const allGroups = useMemo(() => [
    {
      ...DEFAULT_GROUP,
      name:  fixedGroupOverrides['all']?.name  ?? DEFAULT_GROUP.name,
      color: fixedGroupOverrides['all']?.color ?? DEFAULT_GROUP.color,
    },
    ...customGroups.filter(g => !g.archived).sort((a, b) => a.order - b.order),
  ], [customGroups, fixedGroupOverrides]);

  const getGroupCompanies = useCallback((groupId: string): Company[] => {
    let base: Company[];
    if (groupId === 'all') base = companies.filter(c => !groupMap[c.id]);
    else base = companies.filter(c => groupMap[c.id] === groupId);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q) ||
      (c.domain || '').toLowerCase().includes(q)
    );
  }, [companies, groupMap, search]);

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleSelectAll = (groupId: string, ids: string[]) => {
    const gc = getGroupCompanies(groupId);
    const allSel = gc.every(c => selectedIds.has(c.id));
    setSelectedIds(prev => { const n = new Set(prev); allSel ? gc.forEach(c => n.delete(c.id)) : ids.forEach(id => n.add(id)); return n; });
  };

  const handleStatusChange = (id: string, s: Status) => {
    const next = { ...statuses, [id]: s }; setStatuses(next); saveStatuses(next);
  };

  const toggleCollapse = useCallback((groupId: string) => {
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(groupId) ? n.delete(groupId) : n.add(groupId); saveCollapsed(n); return n; });
  }, [saveCollapsed]);

  /* ── Move company between groups ── */
  const handleMoveToGroup = useCallback((companyId: string, targetGroupId: string) => {
    const nextMap = { ...groupMap };
    if (targetGroupId === 'all') delete nextMap[companyId];
    else nextMap[companyId] = targetGroupId;
    setGroupMap(nextMap); saveMap(nextMap);
  }, [groupMap, saveMap]);

  /* ── Inline add company ── */
  const handleSaveAdd = useCallback(async (
    data: { name: string; domain: string; phone: string; industry: string },
    groupId: string,
  ) => {
    const payload: Partial<Company> = {
      name: data.name,
      ...(data.domain && { domain: data.domain }),
      ...(data.phone && { phone: data.phone }),
      ...(data.industry && { industry: data.industry }),
    };
    const res = await createCompany(payload);
    if (res?.data?.id && groupId !== 'all') {
      const nextMap = { ...groupMap, [res.data.id]: groupId };
      setGroupMap(nextMap); saveMap(nextMap);
    }
    setAddingToGroup(null);
  }, [createCompany, groupMap, saveMap]);

  /* ── Group actions ── */
  const handleGroupAction = useCallback((action: string, groupId: string) => {
    const group = allGroups.find(g => g.id === groupId);
    if (!group) return;

    switch (action) {
      case 'collapse_this': toggleCollapse(groupId); break;

      case 'collapse_all':
        setCollapsedGroups(() => { const n = new Set(allGroups.map(g => g.id)); saveCollapsed(n); return n; });
        break;

      case 'select_all': {
        const ids = getGroupCompanies(groupId).map(c => c.id);
        setSelectedIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
        break;
      }

      case 'add_group': {
        const ng: Group = { id: crypto.randomUUID(), name: 'New Group', color: GROUP_COLORS[customGroups.length % GROUP_COLORS.length], order: customGroups.length };
        const next = [...customGroups, ng]; setCustomGroups(next); saveGroups(next);
        break;
      }

      case 'duplicate': {
        const src = allGroups.find(g => g.id === groupId); if (!src) break;
        const dupeId = crypto.randomUUID();
        const dupe: Group = { ...src, id: dupeId, name: `${src.name} (copy)`, order: customGroups.length };
        const nextMap = { ...groupMap };
        getGroupCompanies(groupId).forEach(c => { nextMap[c.id] = dupeId; });
        const nextGroups = [...customGroups, dupe].sort((a, b) => a.order - b.order);
        setCustomGroups(nextGroups); setGroupMap(nextMap); saveGroups(nextGroups); saveMap(nextMap);
        break;
      }

      case 'rename': setTriggerRenameGroup(groupId); break;
      case 'color':  setColorPickerGroup(groupId); break;

      case 'export': {
        const data = getGroupCompanies(groupId).map(c => ({
          Company: c.name, Domain: c.domain || '', Phone: c.phone || '',
          Industry: c.industry || '', City: c.city || '', Country: c.country || '',
          Status: statuses[c.id] || '',
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), group.name.slice(0, 31));
        XLSX.writeFile(wb, `${group.name}.xlsx`);
        break;
      }

      case 'apps': alert('Apps & integrations — coming soon!'); break;

      case 'delete': setDeleteGroupId(groupId); break;

      case 'archive': {
        const next = customGroups.map(g => g.id === groupId ? { ...g, archived: true } : g);
        setCustomGroups(next); saveGroups(next);
        break;
      }

      case 'move': {
        const idx = customGroups.findIndex(g => g.id === groupId); if (idx <= 0) break;
        const next = [...customGroups]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        next.forEach((g, i) => { g.order = i; }); setCustomGroups([...next]); saveGroups(next);
        break;
      }
    }
  }, [allGroups, customGroups, groupMap, statuses, getGroupCompanies, toggleCollapse, saveGroups, saveMap, saveCollapsed]);

  /* ── Delete group (and all companies inside it) ── */
  const handleDeleteGroup = async (groupId: string) => {
    const companyIds = Object.keys(groupMap).filter(cid => groupMap[cid] === groupId);
    try {
      // Delete companies from DB first — throws on Supabase error
      if (companyIds.length > 0) {
        await deleteCompaniesByIds(companyIds);
        // Clean up per-company local state
        const nextPriorities = { ...priorities };
        companyIds.forEach(id => delete nextPriorities[id]);
        setPriorities(nextPriorities);
        savePriorities(nextPriorities);
        setSelectedIds(prev => { const n = new Set(prev); companyIds.forEach(id => n.delete(id)); return n; });
      }
      // Remove group and clean groupMap from localStorage
      const nextGroups = customGroups.filter(g => g.id !== groupId);
      const nextMap = { ...groupMap };
      Object.keys(nextMap).forEach(cid => { if (nextMap[cid] === groupId) delete nextMap[cid]; });
      setCustomGroups(nextGroups); setGroupMap(nextMap); saveGroups(nextGroups); saveMap(nextMap);
      // Re-fetch from DB to confirm deletions landed and refresh group counts
      await fetchCompanies();
      setToast({ message: `Group deleted with ${companyIds.length} compan${companyIds.length !== 1 ? 'ies' : 'y'}`, type: 'success' });
    } catch {
      // DB delete failed — re-fetch to restore true state
      await fetchCompanies();
      setToast({ message: 'Failed to delete group. Please try again.', type: 'error' });
    }
  };

  /* ── Import complete ── */
  const handleImportComplete = useCallback((result: CompanyImportResult) => {
    const existing = customGroups.find(g => g.name === result.groupName && !g.archived);
    if (existing) {
      const nextMap = { ...groupMap }; result.companyIds.forEach(id => { nextMap[id] = existing.id; });
      setGroupMap(nextMap); saveMap(nextMap);
      return;
    }
    const ng: Group = { id: result.groupId, name: result.groupName, color: GROUP_COLORS[customGroups.length % GROUP_COLORS.length], order: customGroups.length };
    const nextGroups = [...customGroups, ng];
    const nextMap = { ...groupMap }; result.companyIds.forEach(id => { nextMap[id] = result.groupId; });
    setCustomGroups(nextGroups); setGroupMap(nextMap); saveGroups(nextGroups); saveMap(nextMap);
  }, [customGroups, groupMap, saveGroups, saveMap]);

  const handleCreateCompany = useCallback(async (data: Record<string, string>) => {
    return await createCompany(data as Parameters<typeof createCompany>[0]);
  }, [createCompany]);

  const handleUpdateCompany = useCallback(async (id: string, data: Record<string, string>) => {
    return await updateCompany(id, data as Parameters<typeof updateCompany>[1]);
  }, [updateCompany]);

  const openEdit = (c: Company) => {
    setEditCompany(c);
    setEditForm({
      name: c.name || '', email: (c as any).email || '', phone: c.phone || '',
      mobile: (c as any).mobile || '', address: c.address || '',
      manager_name: (c as any).manager_name || '', industry: c.industry || '',
      next_step: (c as any).next_step || '', domain: c.domain || '',
      size: c.size || '', website: c.website || '', city: c.city || '',
      country: c.country || '', annual_revenue: c.annual_revenue ? String(c.annual_revenue) : '',
      description: c.description || '',
    });
    setShowEditModal(true);
  };
  const saveEdit = async () => {
    if (!editForm.name.trim()) return;
    const payload = {
      name: editForm.name.trim(),
      email: editForm.email || undefined,
      phone: editForm.phone || undefined,
      mobile: editForm.mobile || undefined,
      address: editForm.address || undefined,
      manager_name: editForm.manager_name || undefined,
      industry: editForm.industry || undefined,
      next_step: editForm.next_step || undefined,
      domain: editForm.domain || undefined,
      size: editForm.size || undefined,
      website: editForm.website || undefined,
      city: editForm.city || undefined,
      country: editForm.country || undefined,
      annual_revenue: editForm.annual_revenue ? Number(editForm.annual_revenue) : undefined,
      description: editForm.description || undefined,
    };
    if (!editCompany) {
      await createCompany(payload as Parameters<typeof createCompany>[0]);
    } else {
      await updateCompany(editCompany.id, payload as Parameters<typeof updateCompany>[1]);
    }
    setShowEditModal(false); setEditCompany(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this company?')) return;
    await deleteCompany(id);
    const nextMap = { ...groupMap }; delete nextMap[id]; setGroupMap(nextMap); saveMap(nextMap);
  };

  useEffect(() => {
    const h = (e: MouseEvent) => { if (newBtnRef.current && !newBtnRef.current.contains(e.target as Node)) setShowNewDropdown(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#DFE3EB] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div ref={newBtnRef} className="relative">
            <div className="flex items-center border border-[#FF7A59] rounded-[3px] overflow-hidden">
              <button onClick={() => { setEditCompany(null); setEditForm({ name:'',email:'',phone:'',mobile:'',address:'',manager_name:'',industry:'',next_step:'',domain:'',size:'',website:'',city:'',country:'',annual_revenue:'',description:'' }); setShowEditModal(true); }}
                className="px-4 py-1.5 text-sm font-bold text-white"
                style={{ backgroundColor: '#FF7A59' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FF8F73')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF7A59')}>
                New company
              </button>
              <button onClick={() => setShowNewDropdown(v => !v)}
                className="px-2 py-1.5 text-white border-l border-white/30"
                style={{ backgroundColor: '#FF7A59' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FF8F73')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF7A59')}>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            {showNewDropdown && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#DFE3EB] rounded-[3px] shadow-xl py-1 min-w-[200px]">
                <button onClick={() => { setEditCompany(null); setEditForm({ name:'',email:'',phone:'',mobile:'',address:'',manager_name:'',industry:'',next_step:'',domain:'',size:'',website:'',city:'',country:'',annual_revenue:'',description:'' }); setShowEditModal(true); setShowNewDropdown(false); }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F6F9FC] flex items-center gap-2.5 text-[#2D3E50]">
                  <Building2 className="w-4 h-4 text-[#7C98B6]" /> New company
                </button>
                <button onClick={() => { handleGroupAction('add_group', 'all'); setShowNewDropdown(false); }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F6F9FC] flex items-center gap-2.5 text-[#2D3E50]">
                  <FolderPlus className="w-4 h-4 text-[#7C98B6]" /> New group of companies
                </button>
                <button onClick={() => { setShowImport(true); setShowNewDropdown(false); }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F6F9FC] flex items-center gap-2.5 text-[#2D3E50]">
                  <Download className="w-4 h-4 text-[#7C98B6]" /> Import companies
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#99ACC2]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
              className="h-8 pl-8 pr-3 text-sm border border-[#DFE3EB] rounded-[3px] outline-none text-[#2D3E50] placeholder:text-[#B0C1D4] w-56"
              onFocus={e => { e.currentTarget.style.borderColor = '#99ACC2'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#DFE3EB'; }} />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-[#99ACC2]" /></button>}
          </div>
          <span className="text-xs text-[#7C98B6]">{companies.length} companies</span>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#516F90]">{selectedIds.size} selected</span>
            <button onClick={async () => { if (!confirm(`Delete ${selectedIds.size} companies?`)) return; for (const id of selectedIds) await deleteCompany(id); setSelectedIds(new Set()); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-500 rounded-[3px] hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded hover:bg-[#F0F3F7] text-[#99ACC2]"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* ── Groups ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-[#7C98B6]">Loading companies…</div>
        ) : allGroups.map(group => (
          <GroupSection key={group.id} group={group}
            companies={getGroupCompanies(group.id)}
            collapsed={collapsedGroups.has(group.id)}
            onToggleCollapse={toggleCollapse}
            selectedIds={selectedIds} onSelect={toggleSelect} onSelectAll={handleSelectAll}
            statuses={statuses} onStatusChange={handleStatusChange}
            priorities={priorities} onPriorityChange={handlePriorityChange}
            onEdit={openEdit} onDelete={handleDelete}
            onGroupAction={handleGroupAction}
            onMoveToGroup={handleMoveToGroup}
            allGroups={allGroups}
            addingToGroup={addingToGroup}
            onStartAdd={setAddingToGroup}
            onSaveAdd={handleSaveAdd}
            onCancelAdd={() => setAddingToGroup(null)}
            triggerRename={triggerRenameGroup}
            visibleColumns={visibleColumns}
            onToggleColumn={handleToggleColumn}
            onFieldSave={handleFieldSave}
            onRenameComplete={(id, name) => {
              if (id === 'all') {
                const next = { ...fixedGroupOverrides, all: { ...fixedGroupOverrides['all'], name } };
                setFixedGroupOverrides(next); saveFgo(next);
              } else {
                const next = customGroups.map(g => g.id === id ? { ...g, name } : g);
                setCustomGroups(next); saveGroups(next);
              }
              setTriggerRenameGroup(null);
            }}
          />
        ))}
      </div>

      {/* ── Modals ── */}
      {showImport && (
        <CompanyImportWizard
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
          createCompany={handleCreateCompany}
          updateCompany={handleUpdateCompany}
          existingCompanies={companies.map(c => ({ id: c.id, name: c.name, domain: c.domain }))}
        />
      )}

      {showEditModal && (() => {
        const ef = editForm;
        const set = (k: keyof typeof editForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
          setEditForm(prev => ({ ...prev, [k]: e.target.value }));
        const fieldCls = "w-full h-9 px-3 text-sm border border-[#CBD6E2] rounded-[3px] outline-none text-[#2D3E50] focus:border-[#FF7A59]";
        const label = (text: string, required = false) => (
          <label className="block text-xs font-semibold text-[#425B76] uppercase tracking-wide mb-1">
            {text}{required && <span className="text-[#FF7A59] ml-0.5">*</span>}
          </label>
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-[3px] shadow-2xl w-[560px] max-w-[95vw] flex flex-col max-h-[90vh]" style={{ border: '1px solid #DFE3EB' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#DFE3EB] flex-shrink-0">
                <h2 className="text-sm font-bold text-[#2D3E50]">{editCompany ? 'Edit company' : 'New company'}</h2>
                <button onClick={() => { setShowEditModal(false); setEditCompany(null); }}>
                  <X className="w-4 h-4 text-[#99ACC2]" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                {/* Company name */}
                <div>
                  {label('Company name', true)}
                  <input autoFocus value={ef.name} onChange={set('name')}
                    onKeyDown={e => { if (e.key === 'Escape') setShowEditModal(false); }}
                    placeholder="Enter company name"
                    className={fieldCls} />
                </div>

                {/* Row: Email + Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {label('Email')}
                    <input type="email" value={ef.email} onChange={set('email')} placeholder="company@example.com" className={fieldCls} />
                  </div>
                  <div>
                    {label('Phone')}
                    <input type="tel" value={ef.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" className={fieldCls} />
                  </div>
                </div>

                {/* Row: Mobile + Manager name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {label('Mobile')}
                    <input type="tel" value={ef.mobile} onChange={set('mobile')} placeholder="+1 (555) 000-0000" className={fieldCls} />
                  </div>
                  <div>
                    {label('Manager name')}
                    <input value={ef.manager_name} onChange={set('manager_name')} placeholder="e.g. Jane Smith" className={fieldCls} />
                  </div>
                </div>

                {/* Row: Industry + Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {label('Industry')}
                    <input value={ef.industry} onChange={set('industry')} placeholder="e.g. Technology" className={fieldCls} />
                  </div>
                  <div>
                    {label('Company size')}
                    <select value={ef.size} onChange={set('size')}
                      className="w-full h-9 px-3 text-sm border border-[#CBD6E2] rounded-[3px] outline-none text-[#2D3E50] focus:border-[#FF7A59] bg-white">
                      <option value="">Select size…</option>
                      {['1-10','11-50','51-200','201-500','501-1000','1001-5000','5000+'].map(s => (
                        <option key={s} value={s}>{s} employees</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row: Domain + Website */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {label('Domain')}
                    <input value={ef.domain} onChange={set('domain')} placeholder="example.com" className={fieldCls} />
                  </div>
                  <div>
                    {label('Website')}
                    <input value={ef.website} onChange={set('website')} placeholder="https://example.com" className={fieldCls} />
                  </div>
                </div>

                {/* Row: City + Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {label('City')}
                    <input value={ef.city} onChange={set('city')} placeholder="New York" className={fieldCls} />
                  </div>
                  <div>
                    {label('Country')}
                    <input value={ef.country} onChange={set('country')} placeholder="United States" className={fieldCls} />
                  </div>
                </div>

                {/* Row: Address + Annual revenue */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {label('Address')}
                    <input value={ef.address} onChange={set('address')} placeholder="123 Main St" className={fieldCls} />
                  </div>
                  <div>
                    {label('Annual revenue ($)')}
                    <input type="number" value={ef.annual_revenue} onChange={set('annual_revenue')} placeholder="0" className={fieldCls} />
                  </div>
                </div>

                {/* Next step */}
                <div>
                  {label('Next step')}
                  <input value={ef.next_step} onChange={set('next_step')} placeholder="e.g. Schedule demo" className={fieldCls} />
                </div>

                {/* Notes */}
                <div>
                  {label('Notes')}
                  <textarea value={ef.description} onChange={set('description')} placeholder="Add any notes…" rows={3}
                    className="w-full px-3 py-2 text-sm border border-[#CBD6E2] rounded-[3px] outline-none text-[#2D3E50] focus:border-[#FF7A59] resize-none" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#DFE3EB] flex-shrink-0">
                <button onClick={() => { setShowEditModal(false); setEditCompany(null); }}
                  className="px-4 py-2 text-sm text-[#425B76] border border-[#DFE3EB] rounded-[3px] hover:bg-[#F6F9FC]">
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={!ef.name.trim()}
                  className="px-5 py-2 text-sm font-bold text-white rounded-[3px] disabled:opacity-40"
                  style={{ backgroundColor: '#FF7A59' }}>
                  {editCompany ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {colorPickerGroup && (() => {
        const g = allGroups.find(g => g.id === colorPickerGroup); if (!g) return null;
        return <ColorPickerModal groupName={g.name} current={g.color}
          onSelect={color => {
            if (colorPickerGroup === 'all') {
              const next = { ...fixedGroupOverrides, all: { ...fixedGroupOverrides['all'], color } };
              setFixedGroupOverrides(next); saveFgo(next);
            } else {
              const next = customGroups.map(g => g.id === colorPickerGroup ? { ...g, color } : g);
              setCustomGroups(next); saveGroups(next);
            }
          }}
          onClose={() => setColorPickerGroup(null)} />;
      })()}

      {deleteGroupId && (() => {
        const g = customGroups.find(g => g.id === deleteGroupId); if (!g) return null;
        return <DeleteGroupModal groupName={g.name}
          onConfirm={() => { handleDeleteGroup(deleteGroupId); }}
          onClose={() => setDeleteGroupId(null)} />;
      })()}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
