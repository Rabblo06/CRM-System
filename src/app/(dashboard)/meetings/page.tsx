'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, ChevronDown, X, SlidersHorizontal, ArrowUpDown,
  Download, Columns, Settings, MoreHorizontal, Plus, Trash2, Loader2,
  CalendarDays, List, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { supabase } from '@/lib/supabase';
import type { Activity } from '@/hooks/useActivities';

/* ─── Helpers ────────────────────────────────────────────── */
interface MeetingDetails {
  outcome?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  attendees?: string[];
  location?: string;
  notes?: string;
}

function parseMeeting(activity: Activity): MeetingDetails {
  try { return JSON.parse(activity.description || '{}'); } catch { return {}; }
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '--';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' GMT';
  } catch { return '--'; }
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '--';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' GMT';
  } catch { return '--'; }
}

const OUTCOME_COLORS: Record<string, string> = {
  completed:   '#4CAF8E',
  cancelled:   '#4762D5',
  no_show:     '#E8882A',
  rescheduled: '#4762D5',
};
const OUTCOME_LABELS: Record<string, string> = {
  completed:   'Completed',
  cancelled:   'Cancelled',
  no_show:     'No show',
  rescheduled: 'Rescheduled',
};

/* ─── Log Meeting Drawer ──────────────────────────────────── */
function LogMeetingDrawer({
  open, onClose, onSave, currentUserName,
}: {
  open: boolean; onClose: () => void; currentUserName: string;
  onSave: (data: {
    title: string; outcome: string; startTime: string;
    duration: number; notes: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [outcome, setOutcome] = useState('');
  const [startTime, setStartTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(''); setOutcome(''); setNotes(''); setSaving(false);
      setStartTime(new Date().toISOString().slice(0, 16));
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [open]);

  const handleSave = async () => {
    if (!title.trim()) { titleRef.current?.focus(); return; }
    setSaving(true);
    await onSave({ title, outcome, startTime, duration: parseInt(duration), notes });
    setSaving(false);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 bg-white shadow-2xl flex flex-col" style={{ width: 440, borderLeft: '1px solid #EBEBEB' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
          <h2 className="text-base font-bold text-[#333333]">Log a meeting</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F1F1F1] text-[#B3B3B3]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wide mb-1.5">
              Meeting title <span className="text-[#4762D5]">*</span>
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter meeting title"
              className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] placeholder:text-[#D6D6D6]"
              onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; e.currentTarget.style.boxShadow = '0 0 0 1px #4762D5'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Start time + Outcome */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wide mb-1.5">Start time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white"
                onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wide mb-1.5">Duration</label>
              <select
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white"
                onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
              >
                {[15, 30, 45, 60, 90, 120].map(v => (
                  <option key={v} value={v}>{v < 60 ? `${v} min` : `${v / 60}h`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Outcome */}
          <div>
            <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wide mb-1.5">Meeting outcome</label>
            <select
              value={outcome}
              onChange={e => setOutcome(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white"
              onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
            >
              <option value="">Select outcome</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No show</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>

          {/* Assigned to */}
          <div>
            <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wide mb-1.5">Activity assigned to</label>
            <input
              value={currentUserName}
              readOnly
              className="w-full h-9 px-3 text-sm border border-[#EBEBEB] rounded-[3px] text-[#333333] bg-[#FAFAFA] cursor-default"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wide mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add meeting notes..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] placeholder:text-[#D6D6D6] resize-none"
              onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; e.currentTarget.style.boxShadow = '0 0 0 1px #4762D5'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EBEBEB] flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-5 py-2 text-sm font-bold text-white rounded-[3px] disabled:opacity-40 transition-colors"
            style={{ backgroundColor: '#4762D5' }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.backgroundColor = '#3A52C0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#4762D5'; }}
          >
            {saving ? <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span> : 'Log meeting'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#666666] hover:text-[#333333] transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Column sort header ──────────────────────────────────── */
function SortHeader({
  label, col, sortCol, sortDir,
  onSort,
}: {
  label: string; col: string;
  sortCol: string; sortDir: 'asc' | 'desc';
  onSort: (col: string) => void;
}) {
  const active = sortCol === col;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className="flex items-center gap-1 group font-semibold uppercase tracking-wide hover:text-[#333333] transition-colors"
      style={{ color: active ? '#333333' : '#666666', fontSize: 11 }}
    >
      {label}
      <ChevronDown
        className="w-3 h-3 transition-transform"
        style={{
          transform: active && sortDir === 'asc' ? 'rotate(180deg)' : 'rotate(0)',
          color: active ? '#4762D5' : '#B3B3B3',
        }}
      />
    </button>
  );
}

/* ─── Calendar helpers ───────────────────────────────────── */
const SLOT_H = 48;       // px per 30-min slot
const FIRST_HOUR = 6;
const LAST_HOUR = 23;

function buildSlots(): string[] {
  const slots: string[] = [];
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < LAST_HOUR) slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
}
const TIME_SLOTS = buildSlots();

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }
function getMonday(d: Date) { const day = d.getDay(); return addDays(d, day === 0 ? -6 : 1 - day); }
function fmtLabel(slot: string) {
  const [h, m] = slot.split(':').map(Number);
  if (m !== 0) return '';
  const p = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12} ${p}`;
}
function fmtDayName(d: Date) { return d.toLocaleDateString('en-US', { weekday: 'short' }); }
function fmtShort(d: Date) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

/* ─── CalendarView ─────────────────────────────────────── */
function CalendarView({ meetings }: { meetings: Activity[] }) {
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState(() => getMonday(today));
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      const idx = TIME_SLOTS.indexOf('08:00');
      bodyRef.current.scrollTop = idx * SLOT_H;
    }
  }, []);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekLabel = useMemo(() => `${fmtShort(weekStart)} – ${fmtShort(addDays(weekStart, 6))}`, [weekStart]);

  // Group meetings by day
  const byDay = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    for (const m of meetings) {
      const details = parseMeeting(m);
      const iso = details.start_time || m.due_date;
      if (!iso) continue;
      const day = iso.split('T')[0];
      (map[day] ??= []).push(m);
    }
    return map;
  }, [meetings]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Cal nav */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#EBEBEB] bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(getMonday(today))}
            className="px-3 py-1 text-xs border border-[#EBEBEB] rounded-[3px] font-semibold text-[#555555] hover:bg-[#FAFAFA] transition-colors"
          >
            Today
          </button>
          <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-1 rounded hover:bg-[#F1F1F1] text-[#666666]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-1 rounded hover:bg-[#F1F1F1] text-[#666666]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="text-sm font-semibold text-[#333333]">{weekLabel}</span>
        <div />
      </div>

      {/* Day header */}
      <div className="flex border-b border-[#EBEBEB] flex-shrink-0 bg-white">
        <div style={{ width: 56, flexShrink: 0 }} />
        {weekDays.map(day => {
          const isToday = toDateStr(day) === toDateStr(today);
          return (
            <div key={day.toISOString()} className="flex-1 text-center py-2" style={{ borderLeft: '1px solid #EBEBEB' }}>
              <span className="text-xs font-medium text-[#999999]">{fmtDayName(day)}</span>
              <div className="flex justify-center mt-0.5">
                <span
                  className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                  style={isToday ? { backgroundColor: '#4762D5', color: '#fff' } : { color: '#333333' }}
                >
                  {day.getDate()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto" ref={bodyRef}>
        <div className="flex" style={{ minHeight: TIME_SLOTS.length * SLOT_H }}>
          {/* Gutter */}
          <div style={{ width: 56, flexShrink: 0 }}>
            {TIME_SLOTS.map(slot => (
              <div key={slot} style={{ height: SLOT_H, position: 'relative' }}>
                {fmtLabel(slot) && (
                  <span className="absolute right-2 text-[10px] text-[#B3B3B3]" style={{ top: -7, whiteSpace: 'nowrap' }}>
                    {fmtLabel(slot)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(day => {
            const dayStr = toDateStr(day);
            const dayMeetings = byDay[dayStr] || [];

            return (
              <div key={day.toISOString()} className="flex-1 relative" style={{ borderLeft: '1px solid #EBEBEB' }}>
                {/* Grid lines */}
                {TIME_SLOTS.map((slot, i) => (
                  <div
                    key={slot}
                    style={{
                      height: SLOT_H,
                      borderTop: slot.endsWith(':00') ? '1px solid #EBEBEB' : '1px solid #F1F1F1',
                    }}
                  />
                ))}

                {/* Meeting blocks */}
                {dayMeetings.map(m => {
                  const details = parseMeeting(m);
                  const startISO = details.start_time || m.due_date;
                  if (!startISO) return null;

                  const startDate = new Date(startISO);
                  const startH = startDate.getHours();
                  const startM = startDate.getMinutes();
                  const startSlotMinutes = (startH - FIRST_HOUR) * 60 + startM;
                  const topPx = (startSlotMinutes / 30) * SLOT_H;

                  const durationMin = details.duration_minutes || 30;
                  const heightPx = Math.max(SLOT_H, (durationMin / 30) * SLOT_H);

                  const color = details.outcome
                    ? (OUTCOME_COLORS[details.outcome] || '#4762D5')
                    : '#4762D5';

                  return (
                    <div
                      key={m.id}
                      title={`${m.title}\n${fmtDateTime(startISO)}`}
                      style={{
                        position: 'absolute',
                        top: topPx,
                        left: 2,
                        right: 2,
                        height: heightPx,
                        backgroundColor: `${color}22`,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 3,
                        padding: '2px 5px',
                        overflow: 'hidden',
                        zIndex: 2,
                        cursor: 'default',
                      }}
                    >
                      <p className="text-[10px] font-semibold truncate leading-tight" style={{ color }}>
                        {m.title}
                      </p>
                      <p className="text-[9px] truncate" style={{ color: '#666666' }}>
                        {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {durationMin ? ` · ${durationMin}min` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
const PAGE_SIZES = [10, 25, 50, 100];

export default function MeetingsPage() {
  const { activities, addActivity } = useActivities();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showDrawer, setShowDrawer] = useState(false);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const pageSizeRef = useRef<HTMLDivElement>(null);

  // Column quick-filter dropdowns
  const [filterOutcome, setFilterOutcome] = useState('');
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const outcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Me');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target as Node)) setPageSizeOpen(false);
      if (outcomeRef.current && !outcomeRef.current.contains(e.target as Node)) setOutcomeOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Only meeting-type activities
  const meetings = useMemo(() => activities.filter(a => a.type === 'meeting'), [activities]);

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    let result = [...meetings];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q)
      );
    }

    if (filterOutcome) {
      result = result.filter(a => {
        const d = parseMeeting(a);
        return d.outcome === filterOutcome;
      });
    }

    result.sort((a, b) => {
      let av = '', bv = '';
      if (sortCol === 'title') { av = a.title; bv = b.title; }
      else if (sortCol === 'start_time') {
        av = parseMeeting(a).start_time || a.due_date || a.created_at;
        bv = parseMeeting(b).start_time || b.due_date || b.created_at;
      }
      else { av = a.created_at; bv = b.created_at; }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return result;
  }, [meetings, search, sortCol, sortDir, filterOutcome]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ── Selection ── */
  const allOnPageSelected = paginated.length > 0 && paginated.every(a => selectedIds.has(a.id));
  const toggleAll = () => {
    if (allOnPageSelected) {
      const next = new Set(selectedIds); paginated.forEach(a => next.delete(a.id)); setSelectedIds(next);
    } else {
      const next = new Set(selectedIds); paginated.forEach(a => next.add(a.id)); setSelectedIds(next);
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  /* ── Save meeting ── */
  const handleSaveMeeting = async (data: {
    title: string; outcome: string; startTime: string; duration: number; notes: string;
  }) => {
    const startISO = new Date(data.startTime).toISOString();
    const endISO = new Date(new Date(data.startTime).getTime() + data.duration * 60000).toISOString();

    const details = {
      outcome: data.outcome || undefined,
      start_time: startISO,
      end_time: endISO,
      duration_minutes: data.duration,
      notes: data.notes || undefined,
    };

    await addActivity({
      type: 'meeting',
      title: data.title,
      description: JSON.stringify(details),
      due_date: startISO,
    });

    setShowDrawer(false);
  };

  const OUTCOME_OPTS = [
    { value: '', label: 'All outcomes' },
    { value: 'completed',   label: 'Completed' },
    { value: 'cancelled',   label: 'Cancelled' },
    { value: 'no_show',     label: 'No show' },
    { value: 'rescheduled', label: 'Rescheduled' },
  ];

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Top nav bar ── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#EBEBEB]" style={{ backgroundColor: '#fff' }}>
        <div className="flex items-center gap-1">
          {/* "Meetings" tab chip */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-[#EBEBEB] rounded-[3px] text-[#333333] hover:bg-[#FAFAFA] transition-colors">
            Meetings <ChevronDown className="w-3.5 h-3.5 text-[#B3B3B3]" />
          </button>

          {/* "All records N ⋮" view tab */}
          <div className="flex items-center gap-1 ml-1">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-[#333333] border-b-2 border-[#333333] transition-colors">
              All records
              <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#333333' }}>
                {meetings.length}
              </span>
            </button>
            <button className="p-1.5 rounded hover:bg-[#F1F1F1] text-[#B3B3B3]">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Add view */}
          <button className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-[#666666] hover:text-[#333333] hover:bg-[#F1F1F1] rounded-[3px] transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-[#EBEBEB] rounded-[3px] overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors"
              style={{ backgroundColor: viewMode === 'list' ? '#333333' : '#fff', color: viewMode === 'list' ? '#fff' : '#555555' }}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              title="Calendar view"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors"
              style={{ backgroundColor: viewMode === 'calendar' ? '#333333' : '#fff', color: viewMode === 'calendar' ? '#fff' : '#555555', borderLeft: '1px solid #EBEBEB' }}
            >
              <CalendarDays className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white rounded-[3px] transition-colors"
            style={{ backgroundColor: '#4762D5' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3A52C0')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4762D5')}
          >
            Log meeting
          </button>
        </div>
      </div>

      {/* ── Calendar view ── */}
      {viewMode === 'calendar' && <CalendarView meetings={meetings} />}

      {/* ── List-only content ── */}
      {viewMode === 'list' && <>

      {/* ── Toolbar: search + view controls ── */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[#EBEBEB] bg-white">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B3B3B3]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search"
            className="w-full h-8 pl-9 pr-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] placeholder:text-[#D6D6D6]"
            onFocus={e => { e.currentTarget.style.borderColor = '#B3B3B3'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
          />
        </div>

        <div className="w-px h-5 bg-[#EBEBEB]" />

        {/* View controls */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#EBEBEB] rounded-[3px] text-[#555555] hover:bg-[#FAFAFA] transition-colors">
          Table view <ChevronDown className="w-3 h-3" />
        </button>
        <button className="p-1.5 rounded border border-[#EBEBEB] text-[#B3B3B3] hover:text-[#555555] hover:bg-[#FAFAFA] transition-colors">
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#EBEBEB] rounded-[3px] text-[#555555] hover:bg-[#FAFAFA] transition-colors">
          <Columns className="w-3.5 h-3.5" /> Edit columns
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#EBEBEB] rounded-[3px] text-[#555555] hover:bg-[#FAFAFA] transition-colors">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#EBEBEB] rounded-[3px] text-[#555555] hover:bg-[#FAFAFA] transition-colors">
          <ArrowUpDown className="w-3.5 h-3.5" /> Sort
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#EBEBEB] rounded-[3px] text-[#555555] hover:bg-[#FAFAFA] transition-colors">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
        <button className="p-1.5 rounded border border-[#EBEBEB] text-[#B3B3B3] hover:text-[#555555] hover:bg-[#FAFAFA] transition-colors">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
        <button className="px-3 py-1.5 text-xs font-semibold border border-[#EBEBEB] rounded-[3px] text-[#555555] hover:bg-[#FAFAFA] opacity-40 cursor-not-allowed transition-colors">
          Save
        </button>
      </div>

      {/* ── Quick column filters ── */}
      <div className="flex items-center gap-0 px-5 py-2 border-b border-[#EBEBEB] bg-white">
        {/* Meeting name sort */}
        <button
          onClick={() => handleSort('title')}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-[3px] hover:bg-[#FAFAFA] transition-colors"
          style={{ color: sortCol === 'title' ? '#4762D5' : '#333333' }}
        >
          Meeting name <ChevronDown className="w-3 h-3" style={{ transform: sortCol === 'title' && sortDir === 'asc' ? 'rotate(180deg)' : '' }} />
        </button>

        {/* Create date sort */}
        <button
          onClick={() => handleSort('created_at')}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-[3px] hover:bg-[#FAFAFA] transition-colors"
          style={{ color: sortCol === 'created_at' ? '#4762D5' : '#333333' }}
        >
          Create date <ChevronDown className="w-3 h-3" style={{ transform: sortCol === 'created_at' && sortDir === 'asc' ? 'rotate(180deg)' : '' }} />
        </button>

        {/* Meeting start time sort */}
        <button
          onClick={() => handleSort('start_time')}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-[3px] hover:bg-[#FAFAFA] transition-colors"
          style={{ color: sortCol === 'start_time' ? '#4762D5' : '#333333' }}
        >
          Meeting start time <ChevronDown className="w-3 h-3" style={{ transform: sortCol === 'start_time' && sortDir === 'asc' ? 'rotate(180deg)' : '' }} />
        </button>

        {/* Outcome filter */}
        <div ref={outcomeRef} className="relative ml-1">
          <button
            onClick={() => setOutcomeOpen(v => !v)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-[3px] hover:bg-[#FAFAFA] transition-colors"
            style={{ color: filterOutcome ? '#4762D5' : '#333333' }}
          >
            Outcome{filterOutcome ? ` · ${OUTCOME_LABELS[filterOutcome] || filterOutcome}` : ''} <ChevronDown className="w-3 h-3" />
          </button>
          {outcomeOpen && (
            <div className="absolute top-full left-0 mt-1 z-40 bg-white border border-[#EBEBEB] rounded-[3px] shadow-xl py-1 min-w-[160px]">
              {OUTCOME_OPTS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { setFilterOutcome(o.value); setOutcomeOpen(false); setPage(1); }}
                  className="w-full px-4 py-2 text-xs text-left hover:bg-[#FAFAFA] transition-colors"
                  style={{ color: filterOutcome === o.value ? '#4762D5' : '#333333', fontWeight: filterOutcome === o.value ? 600 : 400 }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Advanced filters */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4762D5] hover:text-[#007A99] transition-colors">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Advanced filters
        </button>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-[#EBEBEB]">
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-[#EBEBEB] accent-[#4762D5]"
                />
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader label="Meeting name" col="title" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader label="Meeting start time" col="start_time" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="font-semibold uppercase tracking-wide" style={{ color: '#666666', fontSize: 11 }}>
                  Meeting end time
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader label="Create date" col="created_at" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="font-semibold uppercase tracking-wide" style={{ color: '#666666', fontSize: 11 }}>
                  Activity assigned to
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="font-semibold uppercase tracking-wide" style={{ color: '#666666', fontSize: 11 }}>
                  Record source
                </span>
              </th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-20">
                  <div>
                    <div className="w-12 h-12 rounded-full bg-[#FAFAFA] flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-[#EBEBEB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[#333333] mb-1">No meetings found</p>
                    <p className="text-xs text-[#999999] mb-4">
                      {search || filterOutcome ? 'Try adjusting your filters' : 'Log your first meeting to get started'}
                    </p>
                    {!search && !filterOutcome && (
                      <button
                        onClick={() => setShowDrawer(true)}
                        className="px-4 py-2 text-sm font-bold text-white rounded-[3px] transition-colors"
                        style={{ backgroundColor: '#4762D5' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3A52C0')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4762D5')}
                      >
                        Log a meeting
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : paginated.map(activity => {
              const details = parseMeeting(activity);
              const startTime = details.start_time || activity.due_date;
              const endTime = details.end_time || (startTime && details.duration_minutes
                ? new Date(new Date(startTime).getTime() + details.duration_minutes * 60000).toISOString()
                : null);

              return (
                <tr
                  key={activity.id}
                  className="border-b border-[#F1F1F1] hover:bg-[#F8FAFC] transition-colors group"
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(activity.id)}
                      onChange={() => toggleOne(activity.id)}
                      className="w-3.5 h-3.5 rounded border-[#EBEBEB] accent-[#4762D5]"
                    />
                  </td>

                  {/* Meeting name */}
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs font-semibold hover:underline text-left"
                        style={{ color: '#4762D5' }}
                      >
                        {activity.title || '--'}
                      </button>
                      {details.outcome && (
                        <span
                          className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: `${OUTCOME_COLORS[details.outcome] || '#EBEBEB'}20`,
                            color: OUTCOME_COLORS[details.outcome] || '#666666',
                          }}
                        >
                          {OUTCOME_LABELS[details.outcome] || details.outcome}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Start time */}
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#333333' }}>
                    {fmtDateTime(startTime)}
                  </td>

                  {/* End time */}
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#333333' }}>
                    {fmtDateTime(endTime)}
                  </td>

                  {/* Create date */}
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#333333' }}>
                    {fmtDate(activity.created_at)}
                  </td>

                  {/* Assigned to */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: '#4762D5' }}>
                        {currentUserName?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs text-[#333333] truncate max-w-[140px]">{currentUserName || '--'}</span>
                    </div>
                  </td>

                  {/* Record source */}
                  <td className="px-4 py-3 text-xs" style={{ color: '#666666' }}>
                    CRM UI
                  </td>

                  {/* Row actions */}
                  <td className="px-3 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded hover:bg-red-50 text-[#B3B3B3] hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#EBEBEB] bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[#EBEBEB] rounded-[3px] disabled:opacity-40 hover:bg-[#FAFAFA] text-[#555555] transition-colors"
          >
            ← Prev
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className="w-7 h-7 text-xs font-bold rounded-[3px] transition-colors"
              style={{
                backgroundColor: page === p ? '#333333' : 'transparent',
                color: page === p ? '#fff' : '#555555',
              }}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[#EBEBEB] rounded-[3px] disabled:opacity-40 hover:bg-[#FAFAFA] text-[#555555] transition-colors"
          >
            Next →
          </button>
        </div>

        {/* Page size */}
        <div ref={pageSizeRef} className="relative">
          <button
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
                  onClick={() => { setPageSize(s); setPage(1); setPageSizeOpen(false); }}
                  className="w-full px-4 py-2 text-xs text-left hover:bg-[#FAFAFA] transition-colors"
                  style={{ color: pageSize === s ? '#4762D5' : '#333333', fontWeight: pageSize === s ? 600 : 400 }}
                >
                  {s} per page
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      </>}

      {/* Log Meeting Drawer */}
      <LogMeetingDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        onSave={handleSaveMeeting}
        currentUserName={currentUserName}
      />
    </div>
  );
}
