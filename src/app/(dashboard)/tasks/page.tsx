'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Search, X, ChevronDown, Bell, Phone, Mail, CalendarDays,
  ClipboardList, Trash2, MoreHorizontal, Loader2, CheckCheck, CheckSquare,
} from 'lucide-react';
import { useTasks, useContacts, useCompanies } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import type { Task, Contact, Company } from '@/types';
import { TwentyPageLayout } from '@/components/layout/TwentyPageLayout';

/* ─── Constants ──────────────────────────────────────────── */
const TASK_TYPES = ['To-do', 'Call', 'Email', 'Meeting'];

const PRIORITY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const REMINDER_OPTIONS = [
  { label: 'No reminder', value: '-1' },
  { label: 'At due time', value: '0' },
  { label: '5 minutes before', value: '5' },
  { label: '15 minutes before', value: '15' },
  { label: '30 minutes before', value: '30' },
  { label: '1 hour before', value: '60' },
  { label: '1 day before', value: '1440' },
];

/* ─── Helpers ────────────────────────────────────────────── */
function relativeTime(iso?: string | null): string {
  if (!iso) return '--';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const days = Math.floor(ms / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  } catch { return '--'; }
}

function fmtDueDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function isToday(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso); const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isPast(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso); d.setHours(23, 59, 59);
  return d < new Date();
}

function isFuture(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
  return d >= tomorrow;
}

function getContactName(task: Task, contacts: Contact[]): string | null {
  if (task.contact) return `${task.contact.first_name} ${task.contact.last_name}`.trim();
  if (task.contact_id) {
    const c = contacts.find(c => c.id === task.contact_id);
    if (c) return `${c.first_name} ${c.last_name}`.trim();
  }
  return null;
}

function getCompanyName(task: Task, companies: Company[]): string | null {
  if (task.company?.name) return task.company.name;
  if (task.company_id) {
    const c = companies.find(c => c.id === task.company_id);
    if (c) return c.name;
  }
  // Fall back to contact's company
  const contactCompany = (task.contact as (Task['contact'] & { company?: { name?: string } }) | undefined)?.company;
  if (contactCompany?.name) return contactCompany.name;
  return null;
}

function getLastContacted(task: Task, contacts: Contact[]): string {
  const lc = task.contact?.last_contacted_at
    ?? contacts.find(c => c.id === task.contact_id)?.last_contacted_at;
  return relativeTime(lc);
}

function getContactId(task: Task): string | null {
  return task.contact_id || task.contact?.id || null;
}

function getCompanyId(task: Task, contacts: Contact[]): string | null {
  if (task.company_id) return task.company_id;
  if ((task.company as Company & { id?: string })?.id) return (task.company as Company & { id?: string }).id!;
  const contact = task.contact || contacts.find(c => c.id === task.contact_id);
  return contact?.company_id || null;
}

function taskTypeIcon(type?: string) {
  switch (type) {
    case 'Call':    return <Phone className="w-3 h-3" />;
    case 'Email':   return <Mail className="w-3 h-3" />;
    case 'Meeting': return <CalendarDays className="w-3 h-3" />;
    default:        return <ClipboardList className="w-3 h-3" />;
  }
}

/* ─── Associate Records Picker ───────────────────────────── */
interface AssocRecord { id: string; name: string; sub: string; type: 'contact' | 'company' }

function AssociatePicker({
  contacts, companies,
  selectedContactId, selectedCompanyId,
  onSelect, onClose,
}: {
  contacts: Contact[]; companies: Company[];
  selectedContactId: string; selectedCompanyId: string;
  onSelect: (contactId: string, companyId: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'contacts' | 'companies'>('contacts');
  const [q, setQ] = useState('');

  const contactRecords: AssocRecord[] = contacts
    .filter(c => !q || `${c.first_name} ${c.last_name} ${c.email || ''}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20)
    .map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, sub: c.email || '', type: 'contact' }));

  const companyRecords: AssocRecord[] = companies
    .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20)
    .map(c => ({ id: c.id, name: c.name, sub: c.domain || c.industry || '', type: 'company' }));

  const list = tab === 'contacts' ? contactRecords : companyRecords;

  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-white border border-[#EBEBEB] rounded-[3px] shadow-xl mt-1" style={{ maxHeight: 320 }}>
      <div className="p-2 border-b border-[#EBEBEB]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B3B3B3]" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333]"
            onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
          />
        </div>
        <div className="flex gap-0 mt-2">
          {(['contacts', 'companies'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="px-3 py-1 text-xs font-medium border-b-2 transition-colors capitalize"
              style={{ borderColor: tab === t ? '#4762D5' : 'transparent', color: tab === t ? '#4762D5' : '#999999' }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
        {list.length === 0 ? (
          <p className="px-4 py-3 text-xs text-[#B3B3B3]">No {tab} found</p>
        ) : list.map(r => {
          const isSel = tab === 'contacts' ? selectedContactId === r.id : selectedCompanyId === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                if (tab === 'contacts') {
                  const contact = contacts.find(c => c.id === r.id);
                  const autoCompany = contact?.company_id || '';
                  onSelect(isSel ? '' : r.id, selectedCompanyId || autoCompany);
                } else {
                  onSelect(selectedContactId, isSel ? '' : r.id);
                }
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAFAFA] text-left transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: isSel ? '#4762D5' : '#666666' }}
              >
                {r.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#333333] truncate">{r.name}</p>
                {r.sub && <p className="text-xs text-[#B3B3B3] truncate">{r.sub}</p>}
              </div>
              {isSel && <div className="ml-auto w-4 h-4 rounded-full bg-[#4762D5] flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Create Task Drawer ──────────────────────────────────── */
interface DrawerForm {
  title: string;
  task_type: string;
  priority: string;
  contact_id: string;
  company_id: string;
  assigned_to_name: string;
  due_date: string;
  due_time: string;
  reminder_minutes: string;
  notes: string;
}

function CreateTaskDrawer({
  open, onClose, onSubmit, contacts, companies, currentUserName, currentUserId,
}: {
  open: boolean; onClose: () => void;
  onSubmit: (data: Partial<Task> & { reminder_minutes: number | null }) => Promise<void>;
  contacts: Contact[]; companies: Company[];
  currentUserName: string; currentUserId: string;
}) {
  const blank: DrawerForm = {
    title: '', task_type: 'To-do', priority: '',
    contact_id: '', company_id: '',
    assigned_to_name: currentUserName,
    due_date: '', due_time: '08:00',
    reminder_minutes: '-1', notes: '',
  };
  const [form, setForm] = useState<DrawerForm>(blank);
  const [saving, setSaving] = useState(false);
  const [addAnother, setAddAnother] = useState(false);
  const [showAssocPicker, setShowAssocPicker] = useState(false);
  const assocRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Reset & focus when drawer opens
  useEffect(() => {
    if (open) {
      setForm({ ...blank, assigned_to_name: currentUserName });
      setSaving(false);
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentUserName]);

  // Close assoc picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assocRef.current && !assocRef.current.contains(e.target as Node)) {
        setShowAssocPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedContact = contacts.find(c => c.id === form.contact_id);
  const selectedCompany = companies.find(c => c.id === form.company_id);
  const assocCount = (form.contact_id ? 1 : 0) + (form.company_id ? 1 : 0);

  const handleSubmit = async (e: React.FormEvent, andAnother = false) => {
    e.preventDefault();
    if (!form.title.trim()) { titleRef.current?.focus(); return; }
    setSaving(true);

    const dueDateISO = form.due_date
      ? new Date(`${form.due_date}T${form.due_time || '00:00'}`).toISOString()
      : undefined;

    const rm = parseInt(form.reminder_minutes, 10);
    const hasReminder = !isNaN(rm) && rm >= 0;

    await onSubmit({
      title: form.title.trim(),
      description: form.notes.trim() || undefined,
      due_date: dueDateISO,
      priority: (form.priority as Task['priority']) || 'medium',
      status: 'todo',
      task_type: form.task_type,
      contact_id: form.contact_id || undefined,
      company_id: form.company_id || undefined,
      assigned_to: currentUserId || undefined,
      reminder_minutes: hasReminder ? rm : null,
    });

    setSaving(false);
    if (andAnother) {
      setForm({ ...blank, assigned_to_name: currentUserName });
      titleRef.current?.focus();
    } else {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 bg-white shadow-2xl flex flex-col"
        style={{ width: 440, borderLeft: '1px solid #EBEBEB' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB] flex-shrink-0">
          <h2 className="text-base font-bold text-[#333333]">Create task</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-[#F1F1F1] text-[#B3B3B3] hover:text-[#555555]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={(e) => handleSubmit(e, addAnother)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">
                Task Title <span style={{ color: '#4762D5' }}>*</span>
              </label>
              <input
                ref={titleRef}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Enter task title"
                className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] placeholder:text-[#D6D6D6]"
                onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; e.currentTarget.style.boxShadow = '0 0 0 1px #4762D5'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Task Type + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">
                  Task Type <span style={{ color: '#4762D5' }}>*</span>
                </label>
                <select
                  value={form.task_type}
                  onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white"
                  onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
                >
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white"
                  onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
                >
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Associate with records */}
            <div ref={assocRef} className="relative">
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">
                Associate with records
              </label>
              <button
                type="button"
                onClick={() => setShowAssocPicker(v => !v)}
                className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] text-left flex items-center justify-between bg-white transition-colors hover:border-[#B3B3B3]"
              >
                <span style={{ color: assocCount > 0 ? '#333333' : '#D6D6D6' }}>
                  {assocCount === 0
                    ? 'Associated with 0 records'
                    : `Associated with ${assocCount} record${assocCount > 1 ? 's' : ''}`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#B3B3B3]" />
              </button>

              {/* Selected chips */}
              {assocCount > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedContact && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#EBF5FB] text-[#4762D5] font-medium">
                      {selectedContact.first_name} {selectedContact.last_name}
                      <button type="button" onClick={() => setForm(f => ({ ...f, contact_id: '' }))} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedCompany && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#F0FBF9] text-[#4762D5] font-medium">
                      {selectedCompany.name}
                      <button type="button" onClick={() => setForm(f => ({ ...f, company_id: '' }))} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {showAssocPicker && (
                <AssociatePicker
                  contacts={contacts}
                  companies={companies}
                  selectedContactId={form.contact_id}
                  selectedCompanyId={form.company_id}
                  onSelect={(cId, coId) => setForm(f => ({ ...f, contact_id: cId, company_id: coId }))}
                  onClose={() => setShowAssocPicker(false)}
                />
              )}
            </div>

            {/* Assigned to */}
            <div>
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Assigned to</label>
              <input
                value={form.assigned_to_name}
                readOnly
                className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] text-[#333333] bg-[#FAFAFA] cursor-default"
              />
            </div>

            {/* Due date + time */}
            <div>
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Due date</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white"
                  onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
                />
                <input
                  type="time"
                  value={form.due_time}
                  onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white"
                  onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
                />
              </div>
            </div>

            {/* Reminder */}
            <div>
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">
                <span className="flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Reminder</span>
              </label>
              <select
                value={form.reminder_minutes}
                onChange={e => setForm(f => ({ ...f, reminder_minutes: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white"
                onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
              >
                {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {form.reminder_minutes !== '-1' && form.due_date && (
                <p className="mt-1 text-xs text-[#999999]">
                  Reminder at: <span className="font-medium text-[#333333]">
                    {new Date(
                      new Date(`${form.due_date}T${form.due_time || '00:00'}`).getTime() -
                      parseInt(form.reminder_minutes) * 60000
                    ).toLocaleString()}
                  </span>
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Add notes..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] placeholder:text-[#D6D6D6] resize-none"
                onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; e.currentTarget.style.boxShadow = '0 0 0 1px #4762D5'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
        </form>

        {/* Footer buttons */}
        <div className="px-6 py-4 border-t border-[#EBEBEB] flex-shrink-0 flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)}
            className="px-4 py-2 text-sm font-bold text-white rounded-[3px] disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#4762D5' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.backgroundColor = '#3A52C0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#4762D5'; }}
          >
            {saving ? <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</span> : 'Create'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={(e) => { setAddAnother(true); handleSubmit(e as unknown as React.FormEvent, true); }}
            className="px-4 py-2 text-sm font-bold text-[#333333] border border-[#EBEBEB] rounded-[3px] disabled:opacity-50 hover:bg-[#FAFAFA] transition-colors"
          >
            Create and add another
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#666666] hover:text-[#333333] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Edit Task Drawer ────────────────────────────────────── */
function EditTaskDrawer({
  task, open, onClose, onSave, onDelete, contacts, companies, currentUserName,
}: {
  task: Task | null; open: boolean; onClose: () => void;
  onSave: (id: string, data: Partial<Task> & { reminder_minutes: number | null }) => Promise<void>;
  onDelete: (id: string) => void;
  contacts: Contact[]; companies: Company[]; currentUserName: string;
}) {
  const blank = {
    title: '', task_type: 'To-do', priority: '', contact_id: '', company_id: '',
    due_date: '', due_time: '08:00', reminder_minutes: '-1', notes: '',
  };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [showAssocPicker, setShowAssocPicker] = useState(false);
  const assocRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && task) {
      const dd = task.due_date ? new Date(task.due_date) : null;
      setForm({
        title: task.title,
        task_type: task.task_type || 'To-do',
        priority: task.priority || '',
        contact_id: task.contact_id || '',
        company_id: task.company_id || '',
        due_date: dd ? dd.toISOString().slice(0, 10) : '',
        due_time: dd ? `${String(dd.getHours()).padStart(2,'0')}:${String(dd.getMinutes()).padStart(2,'0')}` : '08:00',
        reminder_minutes: task.reminder_minutes != null && task.reminder_minutes >= 0 ? String(task.reminder_minutes) : '-1',
        notes: task.description || '',
      });
      setSaving(false);
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [open, task]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (assocRef.current && !assocRef.current.contains(e.target as Node)) setShowAssocPicker(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (!open || !task) return null;

  const selectedContact = contacts.find(c => c.id === form.contact_id);
  const selectedCompany = companies.find(c => c.id === form.company_id);
  const assocCount = (form.contact_id ? 1 : 0) + (form.company_id ? 1 : 0);

  const handleSave = async () => {
    if (!form.title.trim()) { titleRef.current?.focus(); return; }
    setSaving(true);
    const dueDateISO = form.due_date
      ? new Date(`${form.due_date}T${form.due_time || '00:00'}`).toISOString()
      : undefined;
    const rm = parseInt(form.reminder_minutes, 10);
    await onSave(task.id, {
      title: form.title.trim(),
      description: form.notes.trim() || undefined,
      due_date: dueDateISO,
      priority: (form.priority as Task['priority']) || 'medium',
      task_type: form.task_type,
      contact_id: form.contact_id || undefined,
      company_id: form.company_id || undefined,
      reminder_minutes: !isNaN(rm) && rm >= 0 ? rm : null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 bg-white shadow-2xl flex flex-col" style={{ width: 440, borderLeft: '1px solid #EBEBEB' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB] flex-shrink-0">
          <h2 className="text-base font-bold text-[#333333]">Edit task</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { onDelete(task.id); onClose(); }}
              className="p-1.5 rounded hover:bg-red-50 text-[#B3B3B3] hover:text-red-400 transition-colors" title="Delete task">
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-[#F1F1F1] text-[#B3B3B3] hover:text-[#555555]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Task Title <span style={{ color: '#4762D5' }}>*</span></label>
              <input ref={titleRef} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333]"
                onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; e.currentTarget.style.boxShadow = '0 0 0 1px #4762D5'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Task Type</label>
                <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white">
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white">
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div ref={assocRef} className="relative">
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Associate with records</label>
              <button type="button" onClick={() => setShowAssocPicker(v => !v)}
                className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] text-left flex items-center justify-between bg-white hover:border-[#B3B3B3]">
                <span style={{ color: assocCount > 0 ? '#333333' : '#D6D6D6' }}>
                  {assocCount === 0 ? 'Associated with 0 records' : `Associated with ${assocCount} record${assocCount > 1 ? 's' : ''}`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#B3B3B3]" />
              </button>
              {assocCount > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedContact && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#EBF5FB] text-[#4762D5] font-medium">
                      {selectedContact.first_name} {selectedContact.last_name}
                      <button type="button" onClick={() => setForm(f => ({ ...f, contact_id: '' }))}><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {selectedCompany && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#F0FBF9] text-[#4762D5] font-medium">
                      {selectedCompany.name}
                      <button type="button" onClick={() => setForm(f => ({ ...f, company_id: '' }))}><X className="w-3 h-3" /></button>
                    </span>
                  )}
                </div>
              )}
              {showAssocPicker && (
                <AssociatePicker contacts={contacts} companies={companies}
                  selectedContactId={form.contact_id} selectedCompanyId={form.company_id}
                  onSelect={(cId, coId) => setForm(f => ({ ...f, contact_id: cId, company_id: coId }))}
                  onClose={() => setShowAssocPicker(false)} />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Assigned to</label>
              <input value={currentUserName} readOnly className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] text-[#333333] bg-[#FAFAFA] cursor-default" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Due date</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white"
                  onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }} />
                <input type="time" value={form.due_time} onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white"
                  onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">
                <span className="flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Reminder</span>
              </label>
              <select value={form.reminder_minutes} onChange={e => setForm(f => ({ ...f, reminder_minutes: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white">
                {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#555555] mb-1.5 uppercase tracking-wide">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Add notes..." rows={3}
                className="w-full px-3 py-2 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] placeholder:text-[#D6D6D6] resize-none"
                onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; e.currentTarget.style.boxShadow = '0 0 0 1px #4762D5'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }} />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#EBEBEB] flex-shrink-0 flex items-center gap-2">
          <button type="button" disabled={saving} onClick={handleSave}
            className="px-4 py-2 text-sm font-bold text-white rounded-[3px] disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#4762D5' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.backgroundColor = '#3A52C0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#4762D5'; }}>
            {saving ? <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span> : 'Save'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#666666] hover:text-[#333333] transition-colors">Cancel</button>
        </div>
      </div>
    </>
  );
}

/* ─── Status Circle ───────────────────────────────────────── */
function StatusCircle({ status, onClick }: { status: Task['status']; onClick: () => void }) {
  const done = status === 'completed';
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
      style={{
        borderColor: done ? '#4CAF8E' : '#B3B3B3',
        backgroundColor: done ? '#4CAF8E' : 'transparent',
      }}
      title={done ? 'Mark as to-do' : 'Mark as complete'}
    >
      {done && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

/* ─── Dropdown Filter ─────────────────────────────────────── */
function FilterDropdown({
  label, options, value, onChange, count,
}: {
  label: string; options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void; count?: number;
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
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-[3px] transition-colors"
        style={{
          borderColor: value ? '#4762D5' : '#EBEBEB',
          backgroundColor: value ? '#EEF0FB' : '#fff',
          color: value ? '#4762D5' : '#555555',
        }}
      >
        {label}{count !== undefined && count > 0 ? ` (${count})` : ''}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-40 bg-white border border-[#EBEBEB] rounded-[3px] shadow-xl py-1 min-w-[160px]">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full px-4 py-2 text-xs text-left transition-colors hover:bg-[#FAFAFA]"
              style={{ color: value === o.value ? '#4762D5' : '#333333', fontWeight: value === o.value ? 600 : 400 }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
const PAGE_SIZES = [10, 25, 50, 100];

export default function TasksPage() {
  const { tasks, loading, createTask, updateTask, deleteTask, refreshTasks } = useTasks();
  const { contacts } = useContacts();
  const { companies } = useCompanies();

  const [activeTab, setActiveTab] = useState<'all' | 'due_today' | 'overdue' | 'upcoming' | 'completed'>('all');
  const [filterTaskType, setFilterTaskType] = useState('');
  const [filterAssignedToMe, setFilterAssignedToMe] = useState(false);
  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const pageSizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        setCurrentUserName(
          user.user_metadata?.full_name || user.email?.split('@')[0] || 'Me'
        );
      }
    }).catch(() => {});
  }, []);

  // Close page size dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (pageSizeRef.current && !pageSizeRef.current.contains(e.target as Node)) setPageSizeOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── Filtering ──────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let result = [...tasks];

    // Assigned to me filter
    if (filterAssignedToMe && currentUserId) {
      result = result.filter(t => t.created_by === currentUserId || t.assigned_to === currentUserId);
    }

    // Tab filter
    if (activeTab === 'due_today') {
      result = result.filter(t => isToday(t.due_date) && t.status !== 'completed');
    } else if (activeTab === 'overdue') {
      result = result.filter(t => t.due_date && isPast(t.due_date) && !isToday(t.due_date) && t.status !== 'completed');
    } else if (activeTab === 'upcoming') {
      result = result.filter(t => isFuture(t.due_date) && t.status !== 'completed');
    } else if (activeTab === 'completed') {
      result = result.filter(t => t.status === 'completed');
    }
    // 'all' tab shows everything (active + completed)

    // Task type filter
    if (filterTaskType) {
      result = result.filter(t => t.task_type === filterTaskType);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        getContactName(t, contacts)?.toLowerCase().includes(q) ||
        getCompanyName(t, companies)?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tasks, activeTab, filterTaskType, filterAssignedToMe, search, currentUserId, contacts, companies]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ── Counts ─────────────────────────────────────────────── */
  const counts = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.due_date && isPast(t.due_date) && !isToday(t.due_date) && t.status !== 'completed').length,
  }), [tasks]);

  /* ── Selection ──────────────────────────────────────────── */
  const allOnPageSelected = paginated.length > 0 && paginated.every(t => selectedIds.has(t.id));
  const toggleAll = () => {
    if (allOnPageSelected) {
      const next = new Set(selectedIds);
      paginated.forEach(t => next.delete(t.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginated.forEach(t => next.add(t.id));
      setSelectedIds(next);
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  /* ── Task handlers ───────────────────────────────────────── */
  const toggleStatus = useCallback((task: Task) => {
    const isDone = task.status === 'completed';
    updateTask(task.id, {
      status: isDone ? 'todo' : 'completed',
      completed_at: isDone ? undefined : new Date().toISOString(),
    });
  }, [updateTask]);

  const handleDeleteSelected = useCallback(() => {
    selectedIds.forEach(id => deleteTask(id));
    setSelectedIds(new Set());
  }, [selectedIds, deleteTask]);

  const handleMarkSelectedComplete = useCallback(() => {
    selectedIds.forEach(id => {
      const t = tasks.find(t => t.id === id);
      if (t && t.status !== 'completed') {
        updateTask(id, { status: 'completed', completed_at: new Date().toISOString() });
      }
    });
    setSelectedIds(new Set());
  }, [selectedIds, tasks, updateTask]);

  const openEditDrawer = useCallback((task: Task) => {
    setEditingTask(task);
    setShowEditDrawer(true);
  }, []);

  const clearFilters = () => {
    setFilterTaskType('');
    setSearch('');
    setActiveTab('all');
  };

  const hasFilters = filterTaskType || activeTab !== 'all';

  const TABS = [
    { id: 'all', label: 'All' },
    { id: 'due_today', label: 'Due today' },
    { id: 'overdue', label: `Overdue${counts.overdue > 0 ? ` (${counts.overdue})` : ''}` },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: `Completed${counts.completed > 0 ? ` (${counts.completed})` : ''}` },
  ] as const;

  const taskTypeOptions = [
    { value: '', label: 'All types' },
    ...TASK_TYPES.map(t => ({ value: t, label: t })),
  ];

  return (
    <TwentyPageLayout
      icon={<CheckSquare size={15} style={{ color: '#059669' }} />}
      title="Tasks"
      actionLabel="+ Create Task"
      onAction={() => setShowDrawer(true)}
      viewCount={filtered.length}
    >

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-4 gap-3 px-6 pt-4">
        {[
          { key: 'todo',        label: 'To Do',       color: '#666666', bg: '#FAFAFA' },
          { key: 'in_progress', label: 'In Progress',  color: '#E8882A', bg: '#FFFBF0' },
          { key: 'completed',   label: 'Completed',   color: '#4CAF8E', bg: '#F0FBF9' },
          { key: 'total',       label: 'Total',        color: '#4762D5', bg: '#EEF0FB' },
        ].map(item => (
          <div key={item.key} className="bg-white border border-[#EBEBEB] rounded-[3px] px-4 py-3">
            <p className="text-2xl font-bold" style={{ color: item.color }}>
              {counts[item.key as keyof typeof counts]}
            </p>
            <p className="text-xs text-[#999999] mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* ── Main Table Area ── */}
      <div className="flex-1 overflow-hidden flex flex-col mx-6 mt-4 mb-6 bg-white border border-[#EBEBEB] rounded-[3px]">

        {/* Tabs */}
        <div className="flex items-center border-b border-[#EBEBEB] px-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className="px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
              style={{
                borderColor: activeTab === tab.id ? '#4762D5' : 'transparent',
                color: activeTab === tab.id ? '#333333' : '#666666',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#EBEBEB] flex-wrap">
          {/* Assigned to chip */}
          <button
            type="button"
            onClick={() => setFilterAssignedToMe(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-[3px] transition-colors"
            style={{
              borderColor: filterAssignedToMe ? '#4762D5' : '#EBEBEB',
              backgroundColor: filterAssignedToMe ? '#EEF0FB' : '#fff',
              color: filterAssignedToMe ? '#4762D5' : '#555555',
            }}
          >
            Assigned to{filterAssignedToMe ? ' (1)' : ''}
            {filterAssignedToMe && (
              <X className="w-3 h-3" onClick={e => { e.stopPropagation(); setFilterAssignedToMe(false); }} />
            )}
          </button>

          {/* Task type dropdown */}
          <FilterDropdown
            label="Task type"
            options={taskTypeOptions}
            value={filterTaskType}
            onChange={v => { setFilterTaskType(v); setPage(1); }}
          />

          {/* Clear all */}
          {(filterTaskType || activeTab !== 'all') && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-1.5 text-xs font-semibold text-[#999999] hover:text-[#333333] transition-colors"
            >
              Clear all
            </button>
          )}

          <div className="w-px h-5 bg-[#EBEBEB] mx-1" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B3B3B3]" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search task title and note"
              className="pl-8 pr-3 py-1.5 text-xs border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] placeholder:text-[#D6D6D6] w-56"
              onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
            />
          </div>

          <div className="flex-1" />

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#333333] mr-1">{selectedIds.size} selected</span>
              <button
                type="button"
                onClick={handleMarkSelectedComplete}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#4CAF8E] hover:bg-[#F0FBF9] rounded-[3px] border border-[#EBEBEB] transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark as completed
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-[3px] border border-[#EBEBEB] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 text-[#B3B3B3] hover:text-[#555555]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {filtered.length > 0 && selectedIds.size === 0 && (
            <button
              onClick={() => setShowDrawer(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-[3px] transition-colors"
              style={{ backgroundColor: '#333333' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1a2b3c')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#333333')}
            >
              Start {filtered.filter(t => t.status !== 'completed').length} tasks
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#EBEBEB]" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#EBEBEB] bg-[#FAFAFA]">
                  <th className="w-10 px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded border-[#EBEBEB] accent-[#4762D5]"
                    />
                  </th>
                  <th className="w-8 px-2 py-3" />
                  {[
                    'TITLE', 'ASSOCIATED CONTACT', 'ASSOCIATED COMPANY',
                    'LAST CONTACTED', 'TASK TYPE',
                  ].map(col => (
                    <th key={col} className="px-4 py-3 text-left font-semibold tracking-wide uppercase" style={{ color: '#666666', fontSize: 11 }}>
                      {col}
                    </th>
                  ))}
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div>
                        <ClipboardList className="w-10 h-10 mx-auto mb-3 text-[#EBEBEB]" />
                        <p className="text-sm text-[#999999]">No tasks found</p>
                        <p className="text-xs text-[#B3B3B3] mt-1">
                          {(hasFilters || !!search)
                            ? 'Try adjusting your filters'
                            : (activeTab as string) === 'completed'
                              ? 'No completed tasks yet'
                              : 'Create your first task to get started'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(task => {
                  const contactName = getContactName(task, contacts);
                  const companyName = getCompanyName(task, companies);
                  const lastContacted = getLastContacted(task, contacts);
                  const contactId = getContactId(task);
                  const companyId = getCompanyId(task, contacts);
                  const isDone = task.status === 'completed';
                  const isOverdue = task.due_date && isPast(task.due_date) && !isToday(task.due_date) && !isDone;

                  return (
                    <tr
                      key={task.id}
                      className="border-b border-[#F1F1F1] hover:bg-[#FAFAFA] transition-colors group"
                      style={{ opacity: isDone ? 0.65 : 1 }}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(task.id)}
                          onChange={() => toggleOne(task.id)}
                          className="w-3.5 h-3.5 rounded border-[#EBEBEB] accent-[#4762D5]"
                        />
                      </td>

                      {/* Status circle */}
                      <td className="px-2 py-3">
                        <StatusCircle status={task.status} onClick={() => toggleStatus(task)} />
                      </td>

                      {/* Title — if has contact, navigate to contact page with task context; else open edit drawer */}
                      <td className="px-4 py-3 min-w-[200px] max-w-[280px]">
                        {contactId ? (
                          <Link
                            href={`/contacts/${contactId}?taskId=${task.id}`}
                            className="font-semibold text-xs truncate block max-w-full hover:underline"
                            style={{
                              color: isDone ? '#999999' : '#4762D5',
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}
                          >
                            {task.title}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditDrawer(task)}
                            className="font-semibold text-xs truncate block max-w-full text-left hover:underline"
                            style={{
                              color: isDone ? '#999999' : '#4762D5',
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}
                          >
                            {task.title}
                          </button>
                        )}
                        {task.due_date && (
                          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: isOverdue ? '#3A52C0' : '#B3B3B3' }}>
                            {isOverdue && <span className="font-semibold">Overdue · </span>}
                            {fmtDueDate(task.due_date)}
                          </p>
                        )}
                        {task.reminder_minutes != null && task.reminder_minutes >= 0 && (
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-[#4762D5]">
                            <Bell className="w-2.5 h-2.5" />
                            {task.reminder_minutes === 0 ? 'At due time' : task.reminder_minutes < 60 ? `${task.reminder_minutes}m` : task.reminder_minutes < 1440 ? `${task.reminder_minutes / 60}h` : '1d'}
                          </span>
                        )}
                      </td>

                      {/* Associated Contact — click to navigate with task context */}
                      <td className="px-4 py-3">
                        {contactName && contactId ? (
                          <Link
                            href={`/contacts/${contactId}?taskId=${task.id}`}
                            className="font-medium text-xs hover:underline"
                            style={{ color: '#4762D5' }}
                          >
                            {contactName}
                          </Link>
                        ) : contactName ? (
                          <span className="font-medium text-xs" style={{ color: '#4762D5' }}>{contactName}</span>
                        ) : (
                          <span className="text-[#D6D6D6]">--</span>
                        )}
                      </td>

                      {/* Associated Company — click to navigate */}
                      <td className="px-4 py-3">
                        {companyName && companyId ? (
                          <Link
                            href={`/companies/${companyId}`}
                            className="text-xs hover:underline font-medium"
                            style={{ color: '#333333' }}
                          >
                            {companyName}
                          </Link>
                        ) : companyName ? (
                          <span className="text-xs text-[#333333]">{companyName}</span>
                        ) : (
                          <span className="text-[#D6D6D6]">--</span>
                        )}
                      </td>

                      {/* Last Contacted */}
                      <td className="px-4 py-3 text-xs" style={{ color: '#666666' }}>
                        {lastContacted}
                      </td>

                      {/* Task Type */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#666666]">
                          {taskTypeIcon(task.task_type)}
                          {task.task_type || 'To-do'}
                        </span>
                      </td>

                      {/* Row actions */}
                      <td className="px-3 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(task)}
                            className="p-1 rounded hover:bg-[#F1F1F1] text-[#B3B3B3] hover:text-[#555555] transition-colors"
                            title="Edit"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            className="p-1 rounded hover:bg-red-50 text-[#B3B3B3] hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#EBEBEB] bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-[#EBEBEB] rounded-[3px] disabled:opacity-40 hover:bg-[#FAFAFA] text-[#555555] transition-colors"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-xs font-bold text-white rounded-[3px]" style={{ backgroundColor: '#333333' }}>
                {page}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-[#EBEBEB] rounded-[3px] disabled:opacity-40 hover:bg-[#FAFAFA] text-[#555555] transition-colors"
              >
                Next →
              </button>
            </div>

            {/* Page size selector */}
            <div ref={pageSizeRef} className="relative">
              <button
                type="button"
                onClick={() => setPageSizeOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#EBEBEB] rounded-[3px] text-[#555555] hover:bg-[#FAFAFA] transition-colors"
              >
                {pageSize} per page <ChevronDown className="w-3 h-3" />
              </button>
              {pageSizeOpen && (
                <div className="absolute bottom-full right-0 mb-1 bg-white border border-[#EBEBEB] rounded-[3px] shadow-xl py-1 z-40">
                  {PAGE_SIZES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setPageSize(s); setPage(1); setPageSizeOpen(false); }}
                      className="w-full px-4 py-2 text-xs text-left transition-colors hover:bg-[#FAFAFA]"
                      style={{ color: pageSize === s ? '#4762D5' : '#333333', fontWeight: pageSize === s ? 600 : 400 }}
                    >
                      {s} per page
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Task Drawer */}
      <CreateTaskDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        onSubmit={async (data) => { await createTask(data); }}
        contacts={contacts}
        companies={companies}
        currentUserName={currentUserName}
        currentUserId={currentUserId}
      />

      {/* Edit Task Drawer */}
      <EditTaskDrawer
        task={editingTask}
        open={showEditDrawer}
        onClose={() => { setShowEditDrawer(false); setEditingTask(null); }}
        onSave={async (id, data) => { await updateTask(id, data); }}
        onDelete={(id) => { deleteTask(id); }}
        contacts={contacts}
        companies={companies}
        currentUserName={currentUserName}
      />
    </TwentyPageLayout>
  );
}
