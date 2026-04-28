'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, Plus, MoreHorizontal, Search, X,
  Trash2, Edit2, FolderPlus, Download, Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ContactForm } from '@/components/contacts/ContactForm';
import ImportWizard from '@/components/contacts/ImportWizard';
import { useContacts } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import type { Contact } from '@/types';
import type { ImportResult } from '@/components/contacts/ImportWizard';

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
  { id: 'active',   name: 'Active Contacts',   color: '#00A38D', order: 0 },
  { id: 'inactive', name: 'Inactive Contacts',  color: '#7C98B6', order: 1 },
];

const GROUP_COLORS = [
  '#00A38D','#0091AE','#8B5CF6','#F59E0B','#EF4444',
  '#3B82F6','#10B981','#F97316','#EC4899','#6366F1',
];

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  high:   { label: 'High',   bg: '#FFF3F0', text: '#FF7A59' },
  medium: { label: 'Medium', bg: '#EFF6FF', text: '#3B82F6' },
  low:    { label: 'Low',    bg: '#ECFDF5', text: '#10B981' },
};

const THREE_DOT_ITEMS = [
  { id: 'collapse_this',   label: 'Collapse this group' },
  { id: 'collapse_all',    label: 'Collapse all groups' },
  { id: 'select_all',      label: 'Select all Contacts in group' },
  null,
  { id: 'add_group',       label: 'Add group' },
  { id: 'duplicate',       label: 'Duplicate this group' },
  { id: 'move',            label: 'Move group' },
  { id: 'rename',          label: 'Rename group' },
  { id: 'color',           label: 'Change group color' },
  null,
  { id: 'export',          label: 'Export to Excel' },
  { id: 'apps',            label: 'Apps' },
  null,
  { id: 'delete',          label: 'Delete group', danger: true },
  { id: 'archive',         label: 'Archive group', danger: false },
];

const AVATAR_COLORS = ['#ff7a59','#f2547d','#00a38d','#3b82f6','#8b5cf6','#f59e0b','#10b981','#6366f1'];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(c: Contact) { return `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase(); }
function fullName(c: Contact) { return `${c.first_name} ${c.last_name}`.trim(); }

function getPhoneFlag(phone: string): string {
  if (!phone) return '';
  const p = phone.replace(/\s/g, '');
  if (p.startsWith('+1')) return '🇺🇸';
  if (p.startsWith('+44')) return '🇬🇧';
  if (p.startsWith('+33')) return '🇫🇷';
  if (p.startsWith('+49')) return '🇩🇪';
  if (p.startsWith('+61')) return '🇦🇺';
  if (p.startsWith('+81')) return '🇯🇵';
  if (p.startsWith('+91')) return '🇮🇳';
  if (p.startsWith('+55')) return '🇧🇷';
  if (p.startsWith('+86')) return '🇨🇳';
  if (p.startsWith('+52')) return '🇲🇽';
  return '📞';
}

function storageKey(suffix: string, email: string) {
  return `crm_cg_${suffix}_${email}`;
}

/* ── ActivityTimeline ──────────────────────────────────────── */
function ActivityTimeline({ contact }: { contact: Contact }) {
  const bars = useMemo(() => {
    const last = contact.last_contacted_at;
    if (!last) return [false, false, false, false, false];
    const days = (Date.now() - new Date(last).getTime()) / 86400000;
    const count = days < 7 ? 5 : days < 30 ? 4 : days < 60 ? 3 : days < 90 ? 2 : 1;
    return Array.from({ length: 5 }, (_, i) => i < count);
  }, [contact.last_contacted_at]);

  const colors = ['#FF7A59', '#0091AE', '#00BDA5', '#8B5CF6', '#F59E0B'];
  return (
    <div className="flex items-end gap-0.5">
      {bars.map((active, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: 14,
            borderRadius: 2,
            backgroundColor: active ? colors[i % colors.length] : '#DFE3EB',
          }}
        />
      ))}
    </div>
  );
}

/* ── PriorityBadge ─────────────────────────────────────────── */
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
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors"
        style={cfg
          ? { backgroundColor: cfg.bg, color: cfg.text }
          : { backgroundColor: '#F6F9FC', color: '#99ACC2' }
        }
      >
        {cfg ? cfg.label : '—'}
      </button>
      {open && onChange && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#DFE3EB] rounded-[3px] shadow-xl py-1 min-w-[120px]">
          <button onClick={() => { onChange(''); setOpen(false); }} className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#F6F9FC] text-[#99ACC2]">None</button>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => { onChange(k as Priority); setOpen(false); }}
              className="w-full px-3 py-1.5 text-xs text-left hover:bg-[#F6F9FC] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: v.text }} />
              <span style={{ color: v.text, fontWeight: 600 }}>{v.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Pill badge ─────────────────────────────────────────────── */
function Pill({ label, color = '#0091AE' }: { label: string; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
      style={{ borderColor: `${color}40`, color, backgroundColor: `${color}10` }}>
      {label}
    </span>
  );
}

/* ── Three-dot dropdown ─────────────────────────────────────── */
function ThreeDotMenu({
  groupId, isFixed, onAction,
}: {
  groupId: string; isFixed: boolean;
  onAction: (action: string, groupId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className="p-1 rounded hover:bg-black/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreHorizontal className="w-4 h-4 text-white" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#DFE3EB] rounded-[3px] shadow-2xl py-1 min-w-[220px]">
          {THREE_DOT_ITEMS.map((item, i) => {
            if (!item) return <div key={i} className="my-1 border-t border-[#DFE3EB]" />;
            const disabled = isFixed && ['rename','color','delete','archive','duplicate','move'].includes(item.id);
            return (
              <button
                key={item.id}
                disabled={disabled}
                onClick={() => { setOpen(false); onAction(item.id, groupId); }}
                className="w-full px-4 py-2 text-xs text-left hover:bg-[#F6F9FC] transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: item.danger ? '#EF4444' : '#2D3E50' }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Color picker modal ─────────────────────────────────────── */
function ColorPickerModal({ groupName, current, onSelect, onClose }: {
  groupName: string; current: string;
  onSelect: (color: string) => void; onClose: () => void;
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
                className="w-10 h-10 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: c === current ? '#2D3E50' : 'transparent' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Rename modal ───────────────────────────────────────────── */
function RenameModal({ groupName, onSave, onClose }: {
  groupName: string; onSave: (name: string) => void; onClose: () => void;
}) {
  const [val, setVal] = useState(groupName);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-[3px] shadow-2xl w-96" style={{ border: '1px solid #DFE3EB' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#DFE3EB]">
          <span className="text-sm font-bold text-[#2D3E50]">Rename group</span>
          <button onClick={onClose}><X className="w-4 h-4 text-[#99ACC2]" /></button>
        </div>
        <div className="px-5 py-4">
          <input
            autoFocus value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { onSave(val); onClose(); } if (e.key === 'Escape') onClose(); }}
            className="w-full h-9 px-3 text-sm border border-[#CBD6E2] rounded-[3px] outline-none text-[#2D3E50]"
            onFocus={e => { e.currentTarget.style.borderColor = '#0091AE'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#CBD6E2'; }}
          />
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#DFE3EB]">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-[#425B76] border border-[#DFE3EB] rounded-[3px] hover:bg-[#F6F9FC]">Cancel</button>
          <button onClick={() => { onSave(val); onClose(); }}
            className="px-4 py-1.5 text-sm font-bold text-white rounded-[3px]"
            style={{ backgroundColor: '#0091AE' }}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete confirm modal ───────────────────────────────────── */
function DeleteGroupModal({ groupName, onConfirm, onClose }: {
  groupName: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-[3px] shadow-2xl w-96" style={{ border: '1px solid #DFE3EB' }}>
        <div className="px-5 py-4 border-b border-[#DFE3EB]">
          <p className="text-sm font-bold text-[#2D3E50]">Delete group</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-[#516F90]">
            Are you sure you want to delete <strong>"{groupName}"</strong>? Contacts in this group will move to Active Contacts.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#DFE3EB]">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-[#425B76] border border-[#DFE3EB] rounded-[3px] hover:bg-[#F6F9FC]">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-1.5 text-sm font-bold text-white rounded-[3px] bg-red-500 hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── Contact Row ────────────────────────────────────────────── */
function ContactRow({
  contact, selected, onSelect, priority, onPriorityChange,
  onEdit, onDelete,
}: {
  contact: Contact;
  selected: boolean;
  onSelect: (id: string) => void;
  priority: Priority;
  onPriorityChange: (id: string, p: Priority) => void;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
}) {
  const name = fullName(contact);
  const company = (contact as { company?: { name?: string } }).company?.name;

  return (
    <tr className="border-b border-[#F0F3F7] hover:bg-[#F8FAFC] transition-colors group/row">
      {/* Checkbox */}
      <td className="w-10 px-3 py-2.5 sticky left-0 bg-inherit">
        <input type="checkbox" checked={selected} onChange={() => onSelect(contact.id)}
          className="w-3.5 h-3.5 rounded border-[#CBD6E2] accent-[#0091AE]" />
      </td>

      {/* Contact name */}
      <td className="px-3 py-2.5 min-w-[180px] sticky left-10 bg-inherit">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: avatarColor(name || 'A') }}>
            {initials(contact)}
          </div>
          <button onClick={() => onEdit(contact)}
            className="text-xs font-semibold hover:underline text-left truncate max-w-[140px]"
            style={{ color: '#0091AE' }}>
            {name || '—'}
          </button>
          <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onEdit(contact)} className="p-0.5 rounded hover:bg-[#E8F4FD]" title="Edit">
              <Edit2 className="w-3 h-3 text-[#7C98B6]" />
            </button>
            <button onClick={() => onDelete(contact.id)} className="p-0.5 rounded hover:bg-red-50" title="Delete">
              <Trash2 className="w-3 h-3 text-[#99ACC2] hover:text-red-400" />
            </button>
          </div>
        </div>
      </td>

      {/* Email */}
      <td className="px-3 py-2.5 min-w-[200px]">
        {contact.email ? (
          <a href={`mailto:${contact.email}`} className="text-xs hover:underline truncate block max-w-[180px]" style={{ color: '#0091AE' }}>
            {contact.email}
          </a>
        ) : <span className="text-xs text-[#B0C1D4]">—</span>}
      </td>

      {/* Activities timeline */}
      <td className="px-3 py-2.5 w-[100px]">
        <ActivityTimeline contact={contact} />
      </td>

      {/* Accounts */}
      <td className="px-3 py-2.5 min-w-[130px]">
        {company ? <Pill label={company} color="#0091AE" /> : <span className="text-xs text-[#B0C1D4]">—</span>}
      </td>

      {/* Deals */}
      <td className="px-3 py-2.5 w-[80px]">
        <span className="text-xs text-[#B0C1D4]">—</span>
      </td>

      {/* Deals value */}
      <td className="px-3 py-2.5 w-[100px]">
        <span className="text-xs text-[#B0C1D4]">—</span>
      </td>

      {/* Phone */}
      <td className="px-3 py-2.5 min-w-[150px]">
        {contact.phone ? (
          <span className="flex items-center gap-1.5 text-xs text-[#2D3E50]">
            <span>{getPhoneFlag(contact.phone)}</span>
            <span className="truncate">{contact.phone}</span>
          </span>
        ) : <span className="text-xs text-[#B0C1D4]">—</span>}
      </td>

      {/* Title */}
      <td className="px-3 py-2.5 min-w-[120px]">
        {contact.job_title ? <Pill label={contact.job_title} color="#8B5CF6" /> : <span className="text-xs text-[#B0C1D4]">—</span>}
      </td>

      {/* Priority */}
      <td className="px-3 py-2.5 w-[100px]">
        <PriorityBadge priority={priority} onChange={(p) => onPriorityChange(contact.id, p)} />
      </td>
    </tr>
  );
}

/* ── Group Section ──────────────────────────────────────────── */
function GroupSection({
  group, contacts, collapsed, onToggleCollapse,
  selectedIds, onSelect, onSelectAll,
  priorities, onPriorityChange,
  onEdit, onDelete,
  onGroupAction,
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
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
  onGroupAction: (action: string, groupId: string) => void;
}) {
  const isFixed = group.id === 'active' || group.id === 'inactive';

  return (
    <div className="mb-2">
      {/* Group header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 group select-none"
        style={{ backgroundColor: `${group.color}18` }}
      >
        {/* Color bar */}
        <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />

        {/* Collapse arrow */}
        <button onClick={() => onToggleCollapse(group.id)} className="flex-shrink-0">
          {collapsed
            ? <ChevronRight className="w-4 h-4" style={{ color: group.color }} />
            : <ChevronDown className="w-4 h-4" style={{ color: group.color }} />}
        </button>

        {/* Group name + count */}
        <span className="text-xs font-bold" style={{ color: group.color }}>{group.name}</span>
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: group.color }}>
          {contacts.length}
        </span>

        <div className="flex-1" />

        {/* Three-dot menu */}
        <ThreeDotMenu groupId={group.id} isFixed={isFixed} onAction={onGroupAction} />
      </div>

      {/* Table */}
      {!collapsed && (
        <table className="w-full text-xs">
          {/* Column headers */}
          <thead>
            <tr className="border-b border-[#DFE3EB] bg-white">
              <th className="w-10 px-3 py-2 sticky left-0 bg-white z-10">
                <input type="checkbox"
                  checked={contacts.length > 0 && contacts.every(c => selectedIds.has(c.id))}
                  onChange={() => onSelectAll(group.id, contacts.map(c => c.id))}
                  className="w-3.5 h-3.5 rounded border-[#CBD6E2] accent-[#0091AE]"
                />
              </th>
              {['Contact','Email','Activities timeline','Accounts','Deals','Deals value','Phone','Title','Priority'].map(col => (
                <th key={col} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[#516F90] whitespace-nowrap" style={{ fontSize: 10 }}>
                  {col}
                </th>
              ))}
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
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {/* Add contact row */}
            <tr>
              <td />
              <td className="px-3 py-2.5" colSpan={9}>
                <button className="flex items-center gap-1.5 text-xs font-medium hover:text-[#0091AE] transition-colors" style={{ color: '#7C98B6' }}>
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
  const { contacts, loading, createContact, updateContact, deleteContact } = useContacts();
  const [userEmail, setUserEmail] = useState('');

  // Groups state
  const [customGroups, setCustomGroups] = useState<Group[]>([]);
  const [groupMap, setGroupMap] = useState<Record<string, string>>({}); // contactId -> customGroupId
  const [priorities, setPriorities] = useState<Record<string, Priority>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // UI state
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showNewDropdown, setShowNewDropdown] = useState(false);

  // Modals for group actions
  const [colorPickerGroup, setColorPickerGroup] = useState<string | null>(null);
  const [renameGroup, setRenameGroup] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const newBtnRef = useRef<HTMLDivElement>(null);

  /* ── Load user & persisted state ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const email = user.email || '';
      setUserEmail(email);

      try {
        const g = JSON.parse(localStorage.getItem(storageKey('groups', email)) || '[]');
        setCustomGroups(g);
        const gm = JSON.parse(localStorage.getItem(storageKey('map', email)) || '{}');
        setGroupMap(gm);
        const p = JSON.parse(localStorage.getItem(storageKey('priorities', email)) || '{}');
        setPriorities(p);
        const col = JSON.parse(localStorage.getItem(storageKey('collapsed', email)) || '[]');
        setCollapsedGroups(new Set(col));
      } catch { /* ignore */ }
    }).catch(() => {});
  }, []);

  /* ── Persist helpers ── */
  const saveGroups = useCallback((g: Group[], email: string) => {
    localStorage.setItem(storageKey('groups', email), JSON.stringify(g));
  }, []);
  const saveGroupMap = useCallback((m: Record<string, string>, email: string) => {
    localStorage.setItem(storageKey('map', email), JSON.stringify(m));
  }, []);
  const savePriorities = useCallback((p: Record<string, Priority>, email: string) => {
    localStorage.setItem(storageKey('priorities', email), JSON.stringify(p));
  }, []);
  const saveCollapsed = useCallback((s: Set<string>, email: string) => {
    localStorage.setItem(storageKey('collapsed', email), JSON.stringify([...s]));
  }, []);

  /* ── All groups (fixed + custom, excluding archived) ── */
  const allGroups = useMemo(() => [
    ...FIXED_GROUPS,
    ...customGroups.filter(g => !g.archived).sort((a, b) => a.order - b.order),
  ], [customGroups]);

  /* ── Contacts per group (with search) ── */
  const getGroupContacts = useCallback((groupId: string): Contact[] => {
    let base: Contact[];
    if (groupId === 'active') {
      base = contacts.filter(c => !groupMap[c.id] && c.is_active !== false);
    } else if (groupId === 'inactive') {
      base = contacts.filter(c => !groupMap[c.id] && c.is_active === false);
    } else {
      base = contacts.filter(c => groupMap[c.id] === groupId);
    }
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(c =>
      fullName(c).toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      ((c as { company?: { name?: string } }).company?.name || '').toLowerCase().includes(q)
    );
  }, [contacts, groupMap, search]);

  /* ── Selection ── */
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (groupId: string, contactIds: string[]) => {
    const groupContacts = getGroupContacts(groupId);
    const allSelected = groupContacts.every(c => selectedIds.has(c.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) groupContacts.forEach(c => next.delete(c.id));
      else contactIds.forEach(id => next.add(id));
      return next;
    });
  };

  /* ── Priority change ── */
  const handlePriorityChange = (contactId: string, p: Priority) => {
    const next = { ...priorities, [contactId]: p };
    setPriorities(next);
    if (userEmail) savePriorities(next, userEmail);
  };

  /* ── Collapse ── */
  const toggleCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      if (userEmail) saveCollapsed(next, userEmail);
      return next;
    });
  };

  /* ── Group actions ── */
  const handleGroupAction = useCallback((action: string, groupId: string) => {
    const group = allGroups.find(g => g.id === groupId);
    if (!group) return;

    switch (action) {
      case 'collapse_this':
        toggleCollapse(groupId);
        break;

      case 'collapse_all':
        setCollapsedGroups(prev => {
          const next = new Set([...allGroups.map(g => g.id)]);
          if (userEmail) saveCollapsed(next, userEmail);
          return next;
        });
        break;

      case 'select_all': {
        const ids = getGroupContacts(groupId).map(c => c.id);
        setSelectedIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; });
        break;
      }

      case 'add_group': {
        const newGroup: Group = {
          id: crypto.randomUUID(),
          name: 'New Group',
          color: GROUP_COLORS[customGroups.length % GROUP_COLORS.length],
          order: customGroups.length,
        };
        const next = [...customGroups, newGroup];
        setCustomGroups(next);
        if (userEmail) saveGroups(next, userEmail);
        break;
      }

      case 'duplicate': {
        const src = customGroups.find(g => g.id === groupId);
        if (!src) break;
        const dupeId = crypto.randomUUID();
        const dupe: Group = { ...src, id: dupeId, name: `${src.name} (copy)`, order: src.order + 0.5 };
        // Duplicate contact assignments
        const nextMap = { ...groupMap };
        Object.entries(groupMap).forEach(([cid, gid]) => {
          if (gid === groupId) nextMap[cid] = dupeId;
        });
        const nextGroups = [...customGroups, dupe].sort((a, b) => a.order - b.order);
        setCustomGroups(nextGroups);
        setGroupMap(nextMap);
        if (userEmail) { saveGroups(nextGroups, userEmail); saveGroupMap(nextMap, userEmail); }
        break;
      }

      case 'rename':
        setRenameGroup(groupId);
        break;

      case 'color':
        setColorPickerGroup(groupId);
        break;

      case 'export': {
        const groupContacts = getGroupContacts(groupId);
        const data = groupContacts.map(c => ({
          'First Name': c.first_name,
          'Last Name': c.last_name,
          Email: c.email || '',
          Phone: c.phone || '',
          'Job Title': c.job_title || '',
          Company: (c as { company?: { name?: string } }).company?.name || '',
          Priority: priorities[c.id] || '',
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), group.name.slice(0, 31));
        XLSX.writeFile(wb, `${group.name}.xlsx`);
        break;
      }

      case 'apps':
        alert('Apps & integrations — coming soon!');
        break;

      case 'delete':
        setDeleteGroupId(groupId);
        break;

      case 'archive': {
        const next = customGroups.map(g => g.id === groupId ? { ...g, archived: true } : g);
        setCustomGroups(next);
        if (userEmail) saveGroups(next, userEmail);
        break;
      }

      case 'move': {
        const idx = customGroups.findIndex(g => g.id === groupId);
        if (idx <= 0) return;
        const next = [...customGroups];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        next.forEach((g, i) => { g.order = i; });
        setCustomGroups([...next]);
        if (userEmail) saveGroups(next, userEmail);
        break;
      }
    }
  }, [allGroups, customGroups, groupMap, priorities, userEmail, getGroupContacts, saveGroups, saveGroupMap, saveCollapsed, toggleCollapse]);

  /* ── Import complete ── */
  const handleImportComplete = useCallback((result: ImportResult) => {
    const newGroup: Group = {
      id: result.groupId,
      name: result.groupName,
      color: GROUP_COLORS[customGroups.length % GROUP_COLORS.length],
      order: customGroups.length,
    };
    const nextGroups = [...customGroups, newGroup];
    const nextMap = { ...groupMap };
    result.contactIds.forEach(id => { nextMap[id] = result.groupId; });
    setCustomGroups(nextGroups);
    setGroupMap(nextMap);
    if (userEmail) { saveGroups(nextGroups, userEmail); saveGroupMap(nextMap, userEmail); }
    setShowImport(false);
  }, [customGroups, groupMap, userEmail, saveGroups, saveGroupMap]);

  /* ── Delete group ── */
  const handleDeleteGroup = (groupId: string) => {
    const next = customGroups.filter(g => g.id !== groupId);
    const nextMap = { ...groupMap };
    Object.keys(nextMap).forEach(cid => { if (nextMap[cid] === groupId) delete nextMap[cid]; });
    setCustomGroups(next);
    setGroupMap(nextMap);
    if (userEmail) { saveGroups(next, userEmail); saveGroupMap(nextMap, userEmail); }
  };

  /* ── Add new group ── */
  const handleAddGroup = () => {
    handleGroupAction('add_group', 'active');
    setShowNewDropdown(false);
  };

  /* ── Create contact ── */
  const handleCreateContact = useCallback(async (data: Record<string, string>) => {
    return await createContact(data as Parameters<typeof createContact>[0]);
  }, [createContact]);

  /* ── Close new dropdown on outside click ── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (newBtnRef.current && !newBtnRef.current.contains(e.target as Node)) setShowNewDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── Delete contact ── */
  const handleDeleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    await deleteContact(id);
    const nextMap = { ...groupMap };
    delete nextMap[id];
    setGroupMap(nextMap);
    if (userEmail) saveGroupMap(nextMap, userEmail);
  };

  const totalContacts = contacts.length;

  /* ── Rename group commit ── */
  const commitRename = (groupId: string, name: string) => {
    const next = customGroups.map(g => g.id === groupId ? { ...g, name } : g);
    setCustomGroups(next);
    if (userEmail) saveGroups(next, userEmail);
  };

  /* ── Color change commit ── */
  const commitColor = (groupId: string, color: string) => {
    const next = customGroups.map(g => g.id === groupId ? { ...g, color } : g);
    setCustomGroups(next);
    if (userEmail) saveGroups(next, userEmail);
  };

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#DFE3EB] flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* New contact dropdown */}
          <div ref={newBtnRef} className="relative">
            <div className="flex items-center border border-[#FF7A59] rounded-[3px] overflow-hidden">
              <button
                onClick={() => { setEditContact(null); setShowForm(true); }}
                className="px-4 py-1.5 text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: '#FF7A59' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FF8F73')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF7A59')}
              >
                New contact
              </button>
              <button
                onClick={() => setShowNewDropdown(v => !v)}
                className="px-2 py-1.5 text-white border-l border-white/30 transition-colors"
                style={{ backgroundColor: '#FF7A59' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FF8F73')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF7A59')}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {showNewDropdown && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#DFE3EB] rounded-[3px] shadow-xl py-1 min-w-[200px]">
                <button
                  onClick={() => { setEditContact(null); setShowForm(true); setShowNewDropdown(false); }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F6F9FC] flex items-center gap-2.5 text-[#2D3E50]"
                >
                  <Users className="w-4 h-4 text-[#7C98B6]" /> New contact
                </button>
                <button
                  onClick={handleAddGroup}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F6F9FC] flex items-center gap-2.5 text-[#2D3E50]"
                >
                  <FolderPlus className="w-4 h-4 text-[#7C98B6]" /> New group of contacts
                </button>
                <button
                  onClick={() => { setShowImport(true); setShowNewDropdown(false); }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F6F9FC] flex items-center gap-2.5 text-[#2D3E50]"
                >
                  <Download className="w-4 h-4 text-[#7C98B6]" /> Import contacts
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#99ACC2]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
              className="h-8 pl-8 pr-3 text-sm border border-[#DFE3EB] rounded-[3px] outline-none text-[#2D3E50] placeholder:text-[#B0C1D4] w-56"
              onFocus={e => { e.currentTarget.style.borderColor = '#99ACC2'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#DFE3EB'; }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-[#99ACC2]" />
              </button>
            )}
          </div>

          <span className="text-xs text-[#7C98B6]">{totalContacts} contacts</span>
        </div>

        {/* Selected actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#516F90]">{selectedIds.size} selected</span>
            <button
              onClick={async () => {
                if (!confirm(`Delete ${selectedIds.size} contacts?`)) return;
                for (const id of selectedIds) await deleteContact(id);
                setSelectedIds(new Set());
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-500 rounded-[3px] hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded hover:bg-[#F0F3F7] text-[#99ACC2]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Groups ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-[#7C98B6]">Loading contacts…</div>
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
              onEdit={(c) => { setEditContact(c); setShowForm(true); }}
              onDelete={handleDeleteContact}
              onGroupAction={handleGroupAction}
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
            if (editContact) {
              await updateContact(editContact.id, data);
            } else {
              await createContact(data);
            }
            setShowForm(false);
            setEditContact(null);
          }}
        />
      )}

      {showImport && (
        <ImportWizard
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
          createContact={handleCreateContact}
        />
      )}

      {colorPickerGroup && (() => {
        const g = customGroups.find(g => g.id === colorPickerGroup);
        if (!g) return null;
        return (
          <ColorPickerModal
            groupName={g.name}
            current={g.color}
            onSelect={(color) => commitColor(colorPickerGroup, color)}
            onClose={() => setColorPickerGroup(null)}
          />
        );
      })()}

      {renameGroup && (() => {
        const g = customGroups.find(g => g.id === renameGroup);
        if (!g) return null;
        return (
          <RenameModal
            groupName={g.name}
            onSave={(name) => commitRename(renameGroup, name)}
            onClose={() => setRenameGroup(null)}
          />
        );
      })()}

      {deleteGroupId && (() => {
        const g = customGroups.find(g => g.id === deleteGroupId);
        if (!g) return null;
        return (
          <DeleteGroupModal
            groupName={g.name}
            onConfirm={() => handleDeleteGroup(deleteGroupId)}
            onClose={() => setDeleteGroupId(null)}
          />
        );
      })()}
    </div>
  );
}
