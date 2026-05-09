'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronRight, Plus, MoreHorizontal, Search, X,
  Trash2, Edit2, FolderPlus, Download, Users, Mail, MoveRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ContactForm } from '@/components/contacts/ContactForm';
import ImportWizard from '@/components/contacts/ImportWizard';
import { useContacts } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import type { Contact } from '@/types';
import type { ImportResult } from '@/components/contacts/ImportWizard';
import { TwentyPageLayout } from '@/components/layout/TwentyPageLayout';

/* ── Types ─────────────────────────────────────────────────── */
interface Group {
  id: string;
  name: string;
  color: string;
  order: number;
  sourceFile?: string;
  archived?: boolean;
}

type Priority = 'high' | 'medium' | 'low' | '';

/* ── Constants ─────────────────────────────────────────────── */
const FIXED_GROUPS: Group[] = [
  { id: 'active',   name: 'Active Contacts',  color: '#4762D5', order: 0 },
  { id: 'inactive', name: 'Inactive Contacts', color: '#999999', order: 1 },
];

const GROUP_COLORS = [
  '#4762D5','#4762D5','#8B5CF6','#F59E0B','#EF4444',
  '#3B82F6','#10B981','#F97316','#EC4899','#6366F1',
];

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; badge: string }> = {
  high:   { label: 'High',   bg: '#EEF0FB', text: '#4762D5', badge: '#4762D5' },
  medium: { label: 'Medium', bg: '#EFF6FF', text: '#3B82F6', badge: '#3B82F6' },
  low:    { label: 'Low',    bg: '#ECFDF5', text: '#10B981', badge: '#10B981' },
};

const ALL_COLUMNS = [
  { id: 'contact',      label: 'Contact' },
  { id: 'email',        label: 'Email' },
  { id: 'activities',   label: 'Activities timeline' },
  { id: 'accounts',     label: 'Accounts' },
  { id: 'deals',        label: 'Deals' },
  { id: 'deals_value',  label: 'Deals value' },
  { id: 'phone',        label: 'Phone number' },
  { id: 'mobile',       label: 'Mobile no' },
  { id: 'title',        label: 'Position' },
  { id: 'address',      label: 'Address' },
  { id: 'manager_name', label: 'Name of manager' },
  { id: 'email_note',   label: 'Emailnote' },
  { id: 'next_step',    label: 'Next step' },
  { id: 'priority',     label: 'Priority' },
] as const;

type ColumnId = (typeof ALL_COLUMNS)[number]['id'];

const DEFAULT_VISIBLE: ColumnId[] = ['email','accounts','phone','title','priority'];

const THREE_DOT_ITEMS = [
  { id: 'collapse_this', label: 'Collapse this group' },
  { id: 'collapse_all',  label: 'Collapse all groups' },
  { id: 'select_all',    label: 'Select all Contacts in group' },
  null,
  { id: 'add_group',     label: 'Add group' },
  { id: 'duplicate',     label: 'Duplicate this group' },
  { id: 'move',          label: 'Move group' },
  { id: 'rename',        label: 'Rename group' },
  { id: 'color',         label: 'Change group color' },
  null,
  { id: 'export',        label: 'Export to Excel' },
  { id: 'apps',          label: 'Apps' },
  null,
  { id: 'delete',        label: 'Delete group', danger: true },
  { id: 'archive',       label: 'Archive group' },
];

const AVATAR_COLORS = ['#4762D5','#D45353','#4762D5','#3b82f6','#8b5cf6','#f59e0b','#10b981','#6366f1'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(c: Contact) { return `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase(); }
function fullName(c: Contact) { return `${c.first_name || ''} ${c.last_name || ''}`.trim(); }
function storageKey(suffix: string, email: string) { return `crm_cg_${suffix}_${email}`; }

function getPhoneFlag(phone: string): string {
  const p = (phone || '').replace(/\s/g, '');
  if (p.startsWith('+1'))  return '🇺🇸';
  if (p.startsWith('+44')) return '🇬🇧';
  if (p.startsWith('+33')) return '🇫🇷';
  if (p.startsWith('+49')) return '🇩🇪';
  if (p.startsWith('+61')) return '🇦🇺';
  if (p.startsWith('+81')) return '🇯🇵';
  if (p.startsWith('+91')) return '🇮🇳';
  if (p.startsWith('+55')) return '🇧🇷';
  if (p.startsWith('+86')) return '🇨🇳';
  if (p.startsWith('+52')) return '🇲🇽';
  if (p.startsWith('+1613') || p.startsWith('+1416') || p.startsWith('+1514')) return '🇨🇦';
  return '📞';
}

/* ── Activity timeline ─────────────────────────────────────── */
function ActivityTimeline({ contact }: { contact: Contact }) {
  const bars = useMemo(() => {
    const last = contact.last_contacted_at;
    if (!last) return [false, false, false, false, false];
    const days = (Date.now() - new Date(last).getTime()) / 86400000;
    const count = days < 7 ? 5 : days < 30 ? 4 : days < 60 ? 3 : days < 90 ? 2 : 1;
    return Array.from({ length: 5 }, (_, i) => i < count);
  }, [contact.last_contacted_at]);
  const colors = ['#4762D5','#4762D5','#4CAF8E','#8B5CF6','#F59E0B'];
  return (
    <div className="flex items-end gap-0.5">
      {bars.map((active, i) => (
        <div key={i} style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: active ? colors[i] : '#EBEBEB' }} />
      ))}
    </div>
  );
}

/* ── Priority dropdown ─────────────────────────────────────── */
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
      <button
        onClick={() => onChange && setOpen(v => !v)}
        className="inline-flex items-center px-3 py-1 rounded text-xs font-bold min-w-[64px] justify-center transition-colors"
        style={cfg ? { backgroundColor: cfg.badge, color: '#fff' } : { backgroundColor: '#F1F1F1', color: '#B3B3B3' }}>
        {cfg ? cfg.label : '—'}
      </button>
      {open && onChange && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#EBEBEB] rounded-[3px] shadow-2xl py-1 min-w-[130px]">
          <button onClick={() => { onChange(''); setOpen(false); }}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#FAFAFA] text-[#B3B3B3]">— None</button>
          {(['high','medium','low'] as Priority[]).map(k => {
            const v = PRIORITY_CONFIG[k];
            return (
              <button key={k} onClick={() => { onChange(k); setOpen(false); }}
                className="w-full px-2 py-1.5 text-xs text-left hover:bg-[#FAFAFA] flex items-center gap-2">
                <span className="flex-1 font-bold text-center py-0.5 rounded text-white text-xs" style={{ backgroundColor: v.badge }}>
                  {v.label}
                </span>
              </button>
            );
          })}
          <div className="border-t border-[#EBEBEB] mt-1 pt-1">
            <button className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#FAFAFA] flex items-center gap-2 text-[#666666]">
              <Edit2 className="w-3 h-3" /> Edit Labels
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Email cell popover ─────────────────────────────────────── */
function EmailCellPopover({ email, onSave, onClose }: {
  email: string;
  onSave: (email: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(email);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { handleSave(); } };
    const t = setTimeout(() => document.addEventListener('mousedown', h), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h); };
  }, [val]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSave = () => {
    if (val && !validate(val)) { setErr('Invalid email format'); return; }
    onSave(val.trim());
    onClose();
  };

  return (
    <div ref={ref} className="absolute left-0 top-full mt-1 z-50 bg-white rounded-[3px] shadow-2xl p-3 min-w-[240px]"
      style={{ border: '1px solid #EBEBEB' }}>
      <p className="text-[10px] font-semibold text-[#666666] uppercase tracking-wide mb-1.5">Email address</p>
      <input
        ref={inputRef}
        value={val}
        onChange={e => { setVal(e.target.value); setErr(''); }}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
        placeholder="user@example.com"
        className="w-full h-8 px-2.5 text-xs border rounded outline-none text-[#333333] placeholder:text-[#D6D6D6] mb-1"
        style={{ borderColor: err ? '#EF4444' : '#EBEBEB' }}
        onFocus={e => { if (!err) e.currentTarget.style.borderColor = '#4762D5'; }}
        onBlur={e => { if (!err) e.currentTarget.style.borderColor = '#EBEBEB'; }}
      />
      {err && <p className="text-[10px] text-red-500 mb-1">{err}</p>}
      <div className="flex gap-1.5 mt-2">
        <button onClick={handleSave}
          className="flex-1 py-1 text-xs font-bold text-white rounded-[3px]"
          style={{ backgroundColor: '#4762D5' }}>Save</button>
        <button onClick={onClose}
          className="flex-1 py-1 text-xs text-[#555555] border border-[#EBEBEB] rounded-[3px] hover:bg-[#FAFAFA]">Cancel</button>
      </div>
    </div>
  );
}

/* ── Pill badge ─────────────────────────────────────────────── */
function Pill({ label, color = '#4762D5' }: { label: string; color?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
      style={{ borderColor: `${color}40`, color, backgroundColor: `${color}10` }}>
      {label}
    </span>
  );
}

/* ── Three-dot menu ─────────────────────────────────────────── */
function ThreeDotMenu({ groupId, isFixed, onAction }: {
  groupId: string; isFixed: boolean;
  onAction: (action: string, groupId: string) => void;
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
      <button onClick={() => setOpen(v => !v)}
        className="p-1 rounded hover:bg-black/10 transition-colors opacity-0 group-hover:opacity-100">
        <MoreHorizontal className="w-4 h-4 text-white" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#EBEBEB] rounded-[3px] shadow-2xl py-1 min-w-[230px]">
          {THREE_DOT_ITEMS.map((item, i) => {
            if (!item) return <div key={i} className="my-1 border-t border-[#EBEBEB]" />;
            const disabled = isFixed && ['delete','archive'].includes(item.id);
            return (
              <button key={item.id} disabled={disabled}
                onClick={() => { setOpen(false); onAction(item.id, groupId); }}
                className="w-full px-4 py-2 text-xs text-left hover:bg-[#FAFAFA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ color: item.danger ? '#EF4444' : '#333333' }}>
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
function MoveToGroupDropdown({ contactId, currentGroupId, groups, onMove }: {
  contactId: string;
  currentGroupId: string;
  groups: Group[];
  onMove: (contactId: string, targetGroupId: string) => void;
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
      <button onClick={() => setOpen(v => !v)} title="Move to group"
        className="p-0.5 rounded hover:bg-[#E8F4FD]">
        <MoveRight className="w-3 h-3 text-[#999999]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#EBEBEB] rounded-[3px] shadow-2xl py-1 min-w-[180px]">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-[#B3B3B3] uppercase tracking-wide">Move to group</p>
          {available.map(g => (
            <button key={g.id} onClick={() => { onMove(contactId, g.id); setOpen(false); }}
              className="w-full px-3 py-2 text-xs text-left hover:bg-[#FAFAFA] flex items-center gap-2 text-[#333333]">
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
      <div className="bg-white rounded-[3px] shadow-2xl w-80" style={{ border: '1px solid #EBEBEB' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#EBEBEB]">
          <span className="text-sm font-bold text-[#333333]">Change group color</span>
          <button onClick={onClose}><X className="w-4 h-4 text-[#B3B3B3]" /></button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-[#999999] mb-3">{groupName}</p>
          <div className="grid grid-cols-5 gap-2">
            {GROUP_COLORS.map(c => (
              <button key={c} onClick={() => { onSelect(c); onClose(); }}
                className="w-10 h-10 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: c === current ? '#333333' : 'transparent' }} />
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
      <div className="bg-white rounded-[3px] shadow-2xl w-[420px]" style={{ border: '1px solid #EBEBEB' }}>
        <div className="px-5 py-4 border-b border-[#EBEBEB]">
          <p className="text-sm font-bold text-[#333333]">Delete group?</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-[#666666]">
            Are you sure you want to delete <strong className="text-[#333333]">"{groupName}"</strong>?
            All contacts inside this group will also be deleted. This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#EBEBEB]">
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm text-[#555555] border border-[#EBEBEB] rounded-[3px] hover:bg-[#FAFAFA]">
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
      style={{ backgroundColor: type === 'success' ? '#4762D5' : '#EF4444' }}>
      {message}
      <button onClick={onClose}><X className="w-4 h-4 opacity-80 hover:opacity-100" /></button>
    </div>
  );
}

/* ── Inline add row ─────────────────────────────────────────── */
function InlineAddRow({ onSave, onCancel, visibleColumns }: {
  onSave: (data: { first_name: string; last_name: string; email: string; phone: string; job_title: string }) => Promise<void>;
  onCancel: () => void;
  visibleColumns: Set<ColumnId>;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [title,     setTitle]     = useState('');
  const [saving,    setSaving]    = useState(false);

  const canSave = firstName.trim() || lastName.trim();
  const vc = visibleColumns;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), phone: phone.trim(), job_title: title.trim() });
    setSaving(false);
  };

  const inp = "h-7 px-2 text-xs border border-[#EBEBEB] rounded outline-none text-[#333333] w-full";
  const fi = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = '#4762D5'; };
  const bl = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = '#EBEBEB'; };
  const kd = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); };

  return (
    <tr className="border-b border-[#F1F1F1] bg-blue-50/20">
      <td className="w-10 px-3 py-2 border-r border-[#F1F1F1]" />
      {/* Contact name — always */}
      <td className="px-2 py-2 min-w-[180px] border-r border-[#F1F1F1]">
        <div className="flex gap-1">
          <input autoFocus placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)}
            onKeyDown={kd} className={inp} style={{ width: '50%' }} onFocus={fi} onBlur={bl} />
          <input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)}
            onKeyDown={kd} className={inp} style={{ width: '50%' }} onFocus={fi} onBlur={bl} />
        </div>
      </td>
      {vc.has('email') && (
        <td className="px-2 py-2 min-w-[200px] border-r border-[#F1F1F1]">
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={kd} className={inp} onFocus={fi} onBlur={bl} />
        </td>
      )}
      {vc.has('activities') && <td className="px-2 py-2 w-[100px] border-r border-[#F1F1F1]" />}
      {vc.has('accounts')   && <td className="px-2 py-2 min-w-[130px] border-r border-[#F1F1F1]" />}
      {vc.has('deals')      && <td className="px-2 py-2 w-[80px] border-r border-[#F1F1F1]" />}
      {vc.has('deals_value')&& <td className="px-2 py-2 w-[100px] border-r border-[#F1F1F1]" />}
      {vc.has('phone') && (
        <td className="px-2 py-2 min-w-[150px] border-r border-[#F1F1F1]">
          <input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={kd} className={inp} onFocus={fi} onBlur={bl} />
        </td>
      )}
      {vc.has('mobile')       && <td className="px-2 py-2 min-w-[140px] border-r border-[#F1F1F1]" />}
      {vc.has('title') && (
        <td className="px-2 py-2 min-w-[120px] border-r border-[#F1F1F1]">
          <input placeholder="Job title" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={kd} className={inp} onFocus={fi} onBlur={bl} />
        </td>
      )}
      {vc.has('address')      && <td className="px-2 py-2 min-w-[160px] border-r border-[#F1F1F1]" />}
      {vc.has('manager_name') && <td className="px-2 py-2 min-w-[140px] border-r border-[#F1F1F1]" />}
      {vc.has('email_note')   && <td className="px-2 py-2 min-w-[160px] border-r border-[#F1F1F1]" />}
      {vc.has('next_step')    && <td className="px-2 py-2 min-w-[160px] border-r border-[#F1F1F1]" />}
      {vc.has('priority')     && <td className="px-2 py-2 w-[110px] border-r border-[#F1F1F1]" />}
      {/* Actions */}
      <td className="px-2 py-2 w-[120px]">
        <div className="flex items-center gap-1">
          <button onClick={handleSave} disabled={saving || !canSave}
            className="px-2.5 py-1 text-xs font-bold text-white rounded-[3px] disabled:opacity-40"
            style={{ backgroundColor: '#4762D5' }}>
            {saving ? '…' : 'Add'}
          </button>
          <button onClick={onCancel}
            className="px-2 py-1 text-xs text-[#999999] border border-[#EBEBEB] rounded-[3px] hover:bg-[#FAFAFA]">✕</button>
        </div>
      </td>
    </tr>
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
        className="w-full text-xs px-1 py-0.5 border border-[#4762D5] rounded outline-none text-[#333333] bg-white"
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="text-xs text-left w-full truncate max-w-[160px]">
      {val
        ? <span className="text-[#333333]">{val}</span>
        : <span className="opacity-0 group-hover/row:opacity-60 text-[#D6D6D6]">{placeholder}</span>}
    </button>
  );
}

/* ── Contact Row ────────────────────────────────────────────── */
function ContactRow({
  contact, selected, onSelect, priority, onPriorityChange,
  onView, onEdit, onDelete, onEmailSave, onFieldSave, onMoveToGroup, allGroups, currentGroupId, visibleColumns,
}: {
  contact: Contact;
  selected: boolean;
  onSelect: (id: string) => void;
  priority: Priority;
  onPriorityChange: (id: string, p: Priority) => void;
  onView: (id: string) => void;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
  onEmailSave: (id: string, email: string) => Promise<void>;
  onFieldSave: (id: string, field: string, value: string) => Promise<void>;
  onMoveToGroup: (contactId: string, targetGroupId: string) => void;
  allGroups: Group[];
  currentGroupId: string;
  visibleColumns: Set<ColumnId>;
}) {
  const [emailEditing, setEmailEditing] = useState(false);
  const name = fullName(contact);
  const company = (contact as { company?: { name?: string } }).company?.name;

  const vc = visibleColumns;
  const cellCls = "border-r border-[#F1F1F1]";
  return (
    <tr className="border-b border-[#F1F1F1] hover:bg-[#F8FAFC] transition-colors group/row">
      {/* Checkbox */}
      <td className={`w-10 px-3 py-2.5 sticky left-0 bg-inherit ${cellCls}`}>
        <input type="checkbox" checked={selected} onChange={() => onSelect(contact.id)}
          className="w-3.5 h-3.5 rounded border-[#EBEBEB] accent-[#4762D5]" />
      </td>

      {/* Contact name — always visible */}
      <td className={`px-3 py-2.5 min-w-[200px] sticky left-10 bg-inherit ${cellCls}`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: avatarColor(name || 'A') }}>
            {initials(contact)}
          </div>
          <button onClick={() => onView(contact.id)}
            className="text-xs font-semibold hover:underline text-left truncate max-w-[130px]"
            style={{ color: '#4762D5' }}>
            {name || '—'}
          </button>
          <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onEdit(contact)} title="Edit properties" className="p-0.5 rounded hover:bg-[#E8F4FD]">
              <Edit2 className="w-3 h-3 text-[#999999]" />
            </button>
            <button onClick={() => onDelete(contact.id)} title="Delete" className="p-0.5 rounded hover:bg-red-50">
              <Trash2 className="w-3 h-3 text-[#B3B3B3] hover:text-red-400" />
            </button>
            <MoveToGroupDropdown contactId={contact.id} currentGroupId={currentGroupId} groups={allGroups} onMove={onMoveToGroup} />
          </div>
        </div>
      </td>

      {vc.has('email') && (
        <td className={`px-3 py-2.5 min-w-[200px] relative ${cellCls}`}>
          {emailEditing ? (
            <EmailCellPopover email={contact.email || ''} onSave={async (e) => { await onEmailSave(contact.id, e); }} onClose={() => setEmailEditing(false)} />
          ) : (
            <button onClick={() => setEmailEditing(true)} className="flex items-center gap-1 text-xs hover:underline text-left truncate max-w-[180px]"
              style={{ color: contact.email ? '#4762D5' : '#D6D6D6' }}>
              {contact.email || <span className="flex items-center gap-1 opacity-0 group-hover/row:opacity-60"><Mail className="w-3 h-3" /> Add email</span>}
            </button>
          )}
        </td>
      )}
      {vc.has('activities') && (
        <td className={`px-3 py-2.5 w-[100px] ${cellCls}`}><ActivityTimeline contact={contact} /></td>
      )}
      {vc.has('accounts') && (
        <td className={`px-3 py-2.5 min-w-[130px] ${cellCls}`}>
          {company ? <Pill label={company} color="#4762D5" /> : <span className="text-xs text-[#D6D6D6]">—</span>}
        </td>
      )}
      {vc.has('deals') && (
        <td className={`px-3 py-2.5 w-[80px] ${cellCls}`}><span className="text-xs text-[#D6D6D6]">—</span></td>
      )}
      {vc.has('deals_value') && (
        <td className={`px-3 py-2.5 w-[100px] ${cellCls}`}><span className="text-xs text-[#D6D6D6]">—</span></td>
      )}
      {vc.has('phone') && (
        <td className={`px-3 py-2.5 min-w-[150px] ${cellCls}`}>
          {contact.phone ? (
            <span className="flex items-center gap-1.5 text-xs text-[#333333]">
              <span>{getPhoneFlag(contact.phone)}</span>
              <span className="truncate">{contact.phone}</span>
            </span>
          ) : <span className="text-xs text-[#D6D6D6]">—</span>}
        </td>
      )}
      {/* mobile comes before title — matches ALL_COLUMNS order */}
      {vc.has('mobile') && (
        <td className={`px-3 py-2.5 min-w-[140px] ${cellCls}`}>
          <InlineCell value={contact.mobile || ''} onSave={v => onFieldSave(contact.id, 'mobile', v)} placeholder="Add mobile" />
        </td>
      )}
      {vc.has('title') && (
        <td className={`px-3 py-2.5 min-w-[120px] ${cellCls}`}>
          {contact.job_title
            ? <Pill label={contact.job_title} color="#8B5CF6" />
            : <InlineCell value="" onSave={v => onFieldSave(contact.id, 'job_title', v)} placeholder="Add position" />}
        </td>
      )}
      {vc.has('address') && (
        <td className={`px-3 py-2.5 min-w-[160px] ${cellCls}`}>
          <InlineCell value={contact.address || ''} onSave={v => onFieldSave(contact.id, 'address', v)} placeholder="Add address" />
        </td>
      )}
      {vc.has('manager_name') && (
        <td className={`px-3 py-2.5 min-w-[140px] ${cellCls}`}>
          <InlineCell value={contact.manager_name || ''} onSave={v => onFieldSave(contact.id, 'manager_name', v)} placeholder="Add manager" />
        </td>
      )}
      {vc.has('email_note') && (
        <td className={`px-3 py-2.5 min-w-[160px] ${cellCls}`}>
          <InlineCell value={contact.email_note || ''} onSave={v => onFieldSave(contact.id, 'email_note', v)} placeholder="Add email note" />
        </td>
      )}
      {vc.has('next_step') && (
        <td className={`px-3 py-2.5 min-w-[160px] ${cellCls}`}>
          <InlineCell value={contact.next_step || ''} onSave={v => onFieldSave(contact.id, 'next_step', v)} placeholder="Add next step" />
        </td>
      )}
      {vc.has('priority') && (
        <td className={`px-3 py-2.5 w-[110px] ${cellCls}`}>
          <PriorityBadge priority={priority} onChange={(p) => onPriorityChange(contact.id, p)} />
        </td>
      )}
    </tr>
  );
}

/* ── Group Section ──────────────────────────────────────────── */
function GroupSection({
  group, contacts, collapsed, onToggleCollapse,
  selectedIds, onSelect, onSelectAll,
  priorities, onPriorityChange,
  onView, onEdit, onDelete, onGroupAction,
  onEmailSave, onFieldSave, onMoveToGroup, allGroups,
  addingToGroup, onStartAdd, onSaveAdd, onCancelAdd,
  triggerRename, onRenameComplete,
  visibleColumns, onToggleColumn,
}: {
  group: Group;
  contacts: Contact[];
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: (groupId: string, contactIds: string[]) => void;
  priorities: Record<string, Priority>;
  onPriorityChange: (id: string, p: Priority) => void;
  onView: (id: string) => void;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
  onGroupAction: (action: string, groupId: string) => void;
  onEmailSave: (id: string, email: string) => Promise<void>;
  onFieldSave: (id: string, field: string, value: string) => Promise<void>;
  onMoveToGroup: (contactId: string, targetGroupId: string) => void;
  allGroups: Group[];
  addingToGroup: string | null;
  onStartAdd: (groupId: string) => void;
  onSaveAdd: (data: { first_name: string; last_name: string; email: string; phone: string; job_title: string }, groupId: string) => Promise<void>;
  onCancelAdd: () => void;
  triggerRename?: string | null;
  onRenameComplete: (id: string, name: string) => void;
  visibleColumns: Set<ColumnId>;
  onToggleColumn: (id: ColumnId) => void;
}) {
  const isFixed = group.id === 'active' || group.id === 'inactive';
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(group.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (triggerRename === group.id) { setEditNameVal(group.name); setIsEditingName(true); }
  }, [triggerRename, group.id, group.name]);

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

  const commitNameEdit = () => {
    if (editNameVal.trim()) onRenameComplete(group.id, editNameVal.trim());
    setIsEditingName(false);
  };

  return (
    <div className="mb-2">
      {/* Group header */}
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
          {contacts.length}
        </span>
        <div className="flex-1" />
        <ThreeDotMenu groupId={group.id} isFixed={isFixed} onAction={onGroupAction} />
      </div>

      {!collapsed && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#EBEBEB] bg-white">
              <th className="w-10 px-3 py-2 sticky left-0 bg-white z-10 border-r border-[#EBEBEB]">
                <input type="checkbox"
                  checked={contacts.length > 0 && contacts.every(c => selectedIds.has(c.id))}
                  onChange={() => onSelectAll(group.id, contacts.map(c => c.id))}
                  className="w-3.5 h-3.5 rounded border-[#EBEBEB] accent-[#4762D5]" />
              </th>
              {/* Contact column header — always shown */}
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[#666666] whitespace-nowrap border-r border-[#EBEBEB]" style={{ fontSize: 10 }}>Contact</th>
              {ALL_COLUMNS.filter(c => c.id !== 'contact' && visibleColumns.has(c.id)).map(col => (
                <th key={col.id} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[#666666] whitespace-nowrap border-r border-[#EBEBEB]" style={{ fontSize: 10 }}>
                  {col.label}
                </th>
              ))}
              {/* Column picker "+" button */}
              <th className="px-2 py-2 w-8">
                <div ref={colPickerRef} className="relative">
                  <button onClick={() => setShowColPicker(v => !v)}
                    className="w-6 h-6 flex items-center justify-center rounded border border-dashed border-[#EBEBEB] hover:border-[#4762D5] hover:bg-[#E8F4FD] transition-colors"
                    title="Show/hide columns">
                    <Plus className="w-3 h-3 text-[#B3B3B3]" />
                  </button>
                  {showColPicker && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#EBEBEB] rounded-[3px] shadow-2xl py-2 min-w-[190px]">
                      <p className="px-3 pb-1.5 text-[10px] font-semibold text-[#666666] uppercase tracking-wide">Show / hide columns</p>
                      {ALL_COLUMNS.filter(c => c.id !== 'contact').map(col => (
                        <label key={col.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#FAFAFA] cursor-pointer">
                          <input type="checkbox" checked={visibleColumns.has(col.id)} onChange={() => onToggleColumn(col.id)}
                            className="w-3.5 h-3.5 rounded border-[#EBEBEB] accent-[#4762D5]" />
                          <span className="text-xs text-[#333333]">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(contact => (
              <ContactRow
                key={contact.id}
                contact={contact}
                selected={selectedIds.has(contact.id)}
                onSelect={onSelect}
                priority={priorities[contact.id] || ''}
                onPriorityChange={onPriorityChange}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onEmailSave={onEmailSave}
                onFieldSave={onFieldSave}
                onMoveToGroup={onMoveToGroup}
                allGroups={allGroups}
                currentGroupId={group.id}
                visibleColumns={visibleColumns}
              />
            ))}

            {/* Inline add row */}
            {addingToGroup === group.id && (
              <InlineAddRow
                onSave={(data) => onSaveAdd(data, group.id)}
                onCancel={onCancelAdd}
                visibleColumns={visibleColumns}
              />
            )}

            {/* Add contact button */}
            <tr>
              <td />
              <td className="px-3 py-2.5" colSpan={9}>
                <button onClick={() => onStartAdd(group.id)}
                  className="flex items-center gap-1.5 text-xs font-medium hover:text-[#4762D5] transition-colors"
                  style={{ color: '#999999' }}>
                  <Plus className="w-3.5 h-3.5" /> Add contact
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
export default function ContactsPage() {
  const { contacts, loading, fetchContacts, createContact, updateContact, deleteContact, deleteContactsByIds } = useContacts();
  const router = useRouter();
  // Initialize synchronously from localStorage so save* callbacks work immediately
  // on first render without waiting for the async getUser() call to resolve.
  const [userEmail, setUserEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('crm_demo_user_email') || '';
  });
  const [fixedGroupOverrides, setFixedGroupOverrides] = useState<Record<string, { name?: string; color?: string }>>({});

  const [customGroups,    setCustomGroups]    = useState<Group[]>([]);
  const [groupMap,        setGroupMap]        = useState<Record<string, string>>({});
  const [priorities,      setPriorities]      = useState<Record<string, Priority>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const [search,           setSearch]           = useState('');
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [showForm,         setShowForm]         = useState(false);
  const [editContact,      setEditContact]      = useState<Contact | null>(null);
  const [showImport,       setShowImport]       = useState(false);
  const [showNewDropdown,  setShowNewDropdown]  = useState(false);
  const [addingToGroup,    setAddingToGroup]    = useState<string | null>(null);

  const [colorPickerGroup,    setColorPickerGroup]    = useState<string | null>(null);
  const [triggerRenameGroup,  setTriggerRenameGroup]  = useState<string | null>(null);
  const [deleteGroupId,       setDeleteGroupId]       = useState<string | null>(null);
  const [toast,               setToast]               = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [showFilter,       setShowFilter]       = useState(false);
  const [filterPriorities, setFilterPriorities] = useState<Set<string>>(new Set());
  const [filterCompany,    setFilterCompany]    = useState('');
  const [visibleColumns,   setVisibleColumns]   = useState<Set<ColumnId>>(
    new Set(DEFAULT_VISIBLE)
  );

  const newBtnRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

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
        setPriorities(JSON.parse(localStorage.getItem(storageKey('priorities', email)) || '{}'));
        setCollapsedGroups(new Set(JSON.parse(localStorage.getItem(storageKey('collapsed', email)) || '[]')));
        const savedCols = localStorage.getItem(storageKey('columns', email));
        if (savedCols) setVisibleColumns(new Set(JSON.parse(savedCols) as ColumnId[]));
        const savedFgo = localStorage.getItem(storageKey('fgo', email));
        if (savedFgo) setFixedGroupOverrides(JSON.parse(savedFgo));
      } catch { /* ignore */ }
    };

    // 1. Load immediately with the email we already have from localStorage
    if (userEmail) loadFromEmail(userEmail);

    // 2. Confirm/update with the server-verified email (handles first login in a new tab)
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

  /* ── Persist helpers ── */
  const saveGroups    = useCallback((g: Group[])                => { if (userEmail) localStorage.setItem(storageKey('groups',    userEmail), JSON.stringify(g)); }, [userEmail]);
  const saveGroupMap  = useCallback((m: Record<string, string>) => { if (userEmail) localStorage.setItem(storageKey('map',       userEmail), JSON.stringify(m)); }, [userEmail]);
  const savePriorities= useCallback((p: Record<string, Priority>) => { if (userEmail) localStorage.setItem(storageKey('priorities', userEmail), JSON.stringify(p)); }, [userEmail]);
  const saveCollapsed = useCallback((s: Set<string>)            => { if (userEmail) localStorage.setItem(storageKey('collapsed', userEmail), JSON.stringify([...s])); }, [userEmail]);
  const saveColumns   = useCallback((s: Set<ColumnId>)          => { if (userEmail) localStorage.setItem(storageKey('columns',   userEmail), JSON.stringify([...s])); }, [userEmail]);
  const saveFgo       = useCallback((o: Record<string, { name?: string; color?: string }>) => { if (userEmail) localStorage.setItem(storageKey('fgo', userEmail), JSON.stringify(o)); }, [userEmail]);

  const handleToggleColumn = useCallback((id: ColumnId) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveColumns(next);
      return next;
    });
  }, [saveColumns]);

  /* ── All groups ── */
  const allGroups = useMemo(() => [
    ...FIXED_GROUPS.map(g => ({
      ...g,
      name:  fixedGroupOverrides[g.id]?.name  ?? g.name,
      color: fixedGroupOverrides[g.id]?.color ?? g.color,
    })),
    ...customGroups.filter(g => !g.archived).sort((a, b) => a.order - b.order),
  ], [customGroups, fixedGroupOverrides]);

  /* ── Raw (unfiltered) contacts per group — used for duplicate/export actions ── */
  const getRawGroupContacts = useCallback((groupId: string): Contact[] => {
    if (groupId === 'active')   return contacts.filter(c => !groupMap[c.id] && c.is_active !== false);
    if (groupId === 'inactive') return contacts.filter(c => !groupMap[c.id] && c.is_active === false);
    return contacts.filter(c => groupMap[c.id] === groupId);
  }, [contacts, groupMap]);

  /* ── Filtered contacts per group — used for display ── */
  const getGroupContacts = useCallback((groupId: string): Contact[] => {
    let base = getRawGroupContacts(groupId);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(c =>
        fullName(c).toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.job_title || '').toLowerCase().includes(q) ||
        ((c as { company?: { name?: string } }).company?.name || '').toLowerCase().includes(q) ||
        (priorities[c.id] || '').toLowerCase().includes(q)
      );
    }
    if (filterPriorities.size > 0) {
      base = base.filter(c => filterPriorities.has(priorities[c.id] || ''));
    }
    if (filterCompany.trim()) {
      const fc = filterCompany.toLowerCase();
      base = base.filter(c => ((c as { company?: { name?: string } }).company?.name || '').toLowerCase().includes(fc));
    }
    return base;
  }, [getRawGroupContacts, search, priorities, filterPriorities, filterCompany]);

  /* ── Selection ── */
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const handleSelectAll = (groupId: string, contactIds: string[]) => {
    const gc = getGroupContacts(groupId);
    const allSel = gc.every(c => selectedIds.has(c.id));
    setSelectedIds(prev => { const n = new Set(prev); allSel ? gc.forEach(c => n.delete(c.id)) : contactIds.forEach(id => n.add(id)); return n; });
  };

  /* ── Priority ── */
  const handlePriorityChange = (id: string, p: Priority) => {
    const next = { ...priorities, [id]: p };
    setPriorities(next);
    savePriorities(next);
  };

  /* ── Collapse ── */
  const toggleCollapse = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const n = new Set(prev); n.has(groupId) ? n.delete(groupId) : n.add(groupId);
      saveCollapsed(n); return n;
    });
  }, [saveCollapsed]);

  /* ── Email save ── */
  const handleEmailSave = useCallback(async (id: string, email: string) => {
    await updateContact(id, { email } as Parameters<typeof updateContact>[1]);
  }, [updateContact]);

  /* ── Generic field save (inline cell edits) ── */
  const handleFieldSave = useCallback(async (id: string, field: string, value: string) => {
    await updateContact(id, { [field]: value } as Parameters<typeof updateContact>[1]);
  }, [updateContact]);

  /* ── Move contact between groups ── */
  const handleMoveToGroup = useCallback((contactId: string, targetGroupId: string) => {
    const nextMap = { ...groupMap };
    if (targetGroupId === 'active') {
      delete nextMap[contactId];
      updateContact(contactId, { is_active: true } as Parameters<typeof updateContact>[1]);
    } else if (targetGroupId === 'inactive') {
      delete nextMap[contactId];
      updateContact(contactId, { is_active: false } as Parameters<typeof updateContact>[1]);
    } else {
      nextMap[contactId] = targetGroupId;
    }
    setGroupMap(nextMap);
    saveGroupMap(nextMap);
  }, [groupMap, saveGroupMap, updateContact]);

  /* ── Inline add contact ── */
  const handleSaveAdd = useCallback(async (
    data: { first_name: string; last_name: string; email: string; phone: string; job_title: string },
    groupId: string,
  ) => {
    const payload: Partial<Contact> = {
      first_name: data.first_name,
      last_name: data.last_name,
      is_active: groupId !== 'inactive',
      ...(data.email && { email: data.email }),
      ...(data.phone && { phone: data.phone }),
      ...(data.job_title && { job_title: data.job_title }),
    };
    const res = await createContact(payload);
    if (res?.data?.id && groupId !== 'active' && groupId !== 'inactive') {
      const nextMap = { ...groupMap, [res.data.id]: groupId };
      setGroupMap(nextMap);
      saveGroupMap(nextMap);
    }
    setAddingToGroup(null);
  }, [createContact, groupMap, saveGroupMap]);

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
        const ids = getGroupContacts(groupId).map(c => c.id);
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
        getRawGroupContacts(groupId).forEach(c => { nextMap[c.id] = dupeId; });
        const nextGroups = [...customGroups, dupe].sort((a, b) => a.order - b.order);
        setCustomGroups(nextGroups); setGroupMap(nextMap); saveGroups(nextGroups); saveGroupMap(nextMap);
        break;
      }

      case 'rename': setTriggerRenameGroup(groupId); break;
      case 'color':  setColorPickerGroup(groupId); break;

      case 'export': {
        const gc = getRawGroupContacts(groupId);
        const data = gc.map(c => ({
          'First Name': c.first_name, 'Last Name': c.last_name,
          Email: c.email || '', Phone: c.phone || '',
          'Job Title': c.job_title || '',
          Company: (c as { company?: { name?: string } }).company?.name || '',
          Priority: priorities[c.id] || '',
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
        // Fixed groups can't be reordered; move custom groups up among custom list
        if (isFixedId(groupId)) break;
        const idx = customGroups.findIndex(g => g.id === groupId);
        if (idx < 0) break;
        const next = [...customGroups];
        const swapIdx = idx > 0 ? idx - 1 : 1; // move up if possible, else move down
        if (swapIdx >= 0 && swapIdx < next.length) {
          [next[swapIdx], next[idx]] = [next[idx], next[swapIdx]];
          next.forEach((g, i) => { g.order = i; });
          setCustomGroups([...next]); saveGroups(next);
        }
        break;
      }
    }
  }, [allGroups, customGroups, groupMap, priorities, getRawGroupContacts, getGroupContacts, toggleCollapse, saveGroups, saveGroupMap, saveCollapsed]);

  /* ── Import complete ── */
  const handleImportComplete = useCallback((result: ImportResult) => {
    // Check if a group for this file already exists
    const existing = customGroups.find(g => g.name === result.groupName && !g.archived);
    if (existing) {
      const nextMap = { ...groupMap };
      result.contactIds.forEach(id => { nextMap[id] = existing.id; });
      setGroupMap(nextMap); saveGroupMap(nextMap);
    } else {
      const ng: Group = { id: result.groupId, name: result.groupName, color: GROUP_COLORS[customGroups.length % GROUP_COLORS.length], order: customGroups.length };
      const nextGroups = [...customGroups, ng];
      const nextMap = { ...groupMap };
      result.contactIds.forEach(id => { nextMap[id] = result.groupId; });
      setCustomGroups(nextGroups); setGroupMap(nextMap); saveGroups(nextGroups); saveGroupMap(nextMap);
    }
    // Re-fetch from DB so state holds real DB IDs (not optimistic local ones).
    // This ensures the group map IDs match contacts on reload.
    fetchContacts();
  }, [customGroups, groupMap, saveGroups, saveGroupMap, fetchContacts]);

  /* ── Delete group (and all contacts inside it) ── */
  const handleDeleteGroup = async (groupId: string) => {
    const contactIds = Object.keys(groupMap).filter(cid => groupMap[cid] === groupId);
    try {
      // Delete contacts from DB first — throws on Supabase error
      if (contactIds.length > 0) {
        await deleteContactsByIds(contactIds);
        // Clean up per-contact local state
        const nextPriorities = { ...priorities };
        contactIds.forEach(id => delete nextPriorities[id]);
        setPriorities(nextPriorities);
        savePriorities(nextPriorities);
        setSelectedIds(prev => { const n = new Set(prev); contactIds.forEach(id => n.delete(id)); return n; });
      }
      // Remove group and clean groupMap from localStorage
      const nextGroups = customGroups.filter(g => g.id !== groupId);
      const nextMap = { ...groupMap };
      Object.keys(nextMap).forEach(cid => { if (nextMap[cid] === groupId) delete nextMap[cid]; });
      setCustomGroups(nextGroups); setGroupMap(nextMap); saveGroups(nextGroups); saveGroupMap(nextMap);
      // Re-fetch from DB to confirm deletions landed and refresh group counts
      await fetchContacts();
      setToast({ message: `Group deleted with ${contactIds.length} contact${contactIds.length !== 1 ? 's' : ''}`, type: 'success' });
    } catch {
      // DB delete failed — re-fetch to restore true state
      await fetchContacts();
      setToast({ message: 'Failed to delete group. Please try again.', type: 'error' });
    }
  };

  /* ── Delete contact ── */
  const handleDeleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    await deleteContact(id);
    const nextMap = { ...groupMap }; delete nextMap[id];
    setGroupMap(nextMap); saveGroupMap(nextMap);
  };

  /* ── Close new dropdown on outside click ── */
  useEffect(() => {
    const h = (e: MouseEvent) => { if (newBtnRef.current && !newBtnRef.current.contains(e.target as Node)) setShowNewDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleCreateContact = useCallback(async (data: Record<string, string>) => {
    return await createContact(data as Parameters<typeof createContact>[0]);
  }, [createContact]);

  const handleUpdateContact = useCallback(async (id: string, data: Record<string, string>) => {
    return await updateContact(id, data as Parameters<typeof updateContact>[1]);
  }, [updateContact]);

  const isFixedId = (id: string) => id === 'active' || id === 'inactive';

  const commitRename = (groupId: string, name: string) => {
    if (isFixedId(groupId)) {
      const next = { ...fixedGroupOverrides, [groupId]: { ...fixedGroupOverrides[groupId], name } };
      setFixedGroupOverrides(next); saveFgo(next);
    } else {
      const next = customGroups.map(g => g.id === groupId ? { ...g, name } : g);
      setCustomGroups(next); saveGroups(next);
    }
  };
  const commitColor = (groupId: string, color: string) => {
    if (isFixedId(groupId)) {
      const next = { ...fixedGroupOverrides, [groupId]: { ...fixedGroupOverrides[groupId], color } };
      setFixedGroupOverrides(next); saveFgo(next);
    } else {
      const next = customGroups.map(g => g.id === groupId ? { ...g, color } : g);
      setCustomGroups(next); saveGroups(next);
    }
  };

  const handleView = useCallback((id: string) => {
    router.push(`/contacts/${id}`);
  }, [router]);

  return (
    <TwentyPageLayout
      icon={<Users size={15} style={{ color: '#7C3AED' }} />}
      title="People"
      actionLabel="+ New Person"
      onAction={() => { setEditContact(null); setShowForm(true); }}
      actionExtra={
        <div ref={newBtnRef} className="relative">
          <button onClick={() => setShowNewDropdown(v => !v)}
            className="p-1.5 rounded-sm hover:bg-[#F1F1F1] transition-colors"
            style={{ border: '1px solid #EBEBEB' }}>
            <ChevronDown className="w-3 h-3 text-[#999999]" />
          </button>
          {showNewDropdown && (
            <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-[#EBEBEB] rounded-sm shadow-lg py-1 min-w-[200px]">
              <button onClick={() => { setEditContact(null); setShowForm(true); setShowNewDropdown(false); }}
                className="w-full px-4 py-2 text-xs text-left hover:bg-[#F1F1F1] flex items-center gap-2 text-[#333333]">
                <Users className="w-3.5 h-3.5 text-[#999999]" /> New contact
              </button>
              <button onClick={() => { handleGroupAction('add_group', 'active'); setShowNewDropdown(false); }}
                className="w-full px-4 py-2 text-xs text-left hover:bg-[#F1F1F1] flex items-center gap-2 text-[#333333]">
                <FolderPlus className="w-3.5 h-3.5 text-[#999999]" /> New group
              </button>
              <button onClick={() => { setShowImport(true); setShowNewDropdown(false); }}
                className="w-full px-4 py-2 text-xs text-left hover:bg-[#F1F1F1] flex items-center gap-2 text-[#333333]">
                <Download className="w-3.5 h-3.5 text-[#999999]" /> Import contacts
              </button>
            </div>
          )}
        </div>
      }
      toolbar={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#B3B3B3]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people…"
              className="h-7 pl-7 pr-3 text-xs border border-[#EBEBEB] rounded-sm outline-none text-[#333333] placeholder:text-[#D6D6D6] w-44"
              onFocus={e => { e.currentTarget.style.borderColor = '#B3B3B3'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }} />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-[#B3B3B3]" /></button>}
          </div>
          <span className="text-xs text-[#B3B3B3]">{contacts.length}</span>
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-[#666666]">{selectedIds.size} selected</span>
              <button onClick={async () => { if (!confirm(`Delete ${selectedIds.size} contacts?`)) return; for (const id of selectedIds) await deleteContact(id); setSelectedIds(new Set()); }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium border border-red-200 text-red-500 rounded-sm hover:bg-red-50">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="p-1 rounded-sm hover:bg-[#F1F1F1] text-[#B3B3B3]"><X className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      }
      viewCount={contacts.length}
    >
      {/* ── Groups ── */}
      <div className="h-full overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-[#999999]">Loading contacts…</div>
        ) : (
          allGroups.map(group => (
            <GroupSection
              key={group.id}
              group={group}
              contacts={getGroupContacts(group.id)}
              collapsed={collapsedGroups.has(group.id)}
              onToggleCollapse={toggleCollapse}
              selectedIds={selectedIds}
              onSelect={toggleSelect}
              onSelectAll={handleSelectAll}
              priorities={priorities}
              onPriorityChange={handlePriorityChange}
              onView={handleView}
              onEdit={(c) => { setEditContact(c); setShowForm(true); }}
              onDelete={handleDeleteContact}
              onGroupAction={handleGroupAction}
              onEmailSave={handleEmailSave}
              onFieldSave={handleFieldSave}
              onMoveToGroup={handleMoveToGroup}
              allGroups={allGroups}
              addingToGroup={addingToGroup}
              onStartAdd={setAddingToGroup}
              onSaveAdd={handleSaveAdd}
              onCancelAdd={() => setAddingToGroup(null)}
              triggerRename={triggerRenameGroup}
              onRenameComplete={(id, name) => { commitRename(id, name); setTriggerRenameGroup(null); }}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
            />
          ))
        )}
      </div>

      {/* ── Modals ── */}
      {showForm && (
        <ContactForm
          open={showForm}
          initialData={editContact || undefined}
          onClose={() => { setShowForm(false); setEditContact(null); }}
          onSubmit={async (data: Partial<Contact>) => {
            if (editContact) await updateContact(editContact.id, data);
            else await createContact(data);
            setShowForm(false); setEditContact(null);
          }}
        />
      )}

      {showImport && (
        <ImportWizard
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
          createContact={handleCreateContact}
          updateContact={handleUpdateContact}
          existingContacts={contacts.map(c => ({ id: c.id, email: c.email }))}
        />
      )}

      {colorPickerGroup && (() => {
        const g = allGroups.find(g => g.id === colorPickerGroup); if (!g) return null;
        return <ColorPickerModal groupName={g.name} current={g.color}
          onSelect={(color) => commitColor(colorPickerGroup, color)}
          onClose={() => setColorPickerGroup(null)} />;
      })()}


      {deleteGroupId && (() => {
        const g = customGroups.find(g => g.id === deleteGroupId); if (!g) return null;
        return <DeleteGroupModal groupName={g.name}
          onConfirm={() => { handleDeleteGroup(deleteGroupId); }}
          onClose={() => setDeleteGroupId(null)} />;
      })()}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </TwentyPageLayout>
  );
}
