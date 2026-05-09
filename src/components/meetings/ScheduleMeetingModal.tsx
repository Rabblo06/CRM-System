'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronRight, ChevronDown,
  Plus, MapPin, User, Bell, FileText,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
export interface MeetingSaveData {
  title: string;
  startDate: string;   // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  location: string;
  description: string;
  internalNote: string;
  reminders: string[];
}

export interface ScheduleMeetingModalProps {
  contextName?: string;           // e.g. "Alice Johnson" or "Acme Corp"
  contextType?: 'contact' | 'company';
  onClose: () => void;
  onSave: (meeting: MeetingSaveData) => void;
}

/* ─── Helpers ─────────────────────────────────────────────── */
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDayName(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

// Generate time labels for the calendar grid
const SLOT_MINUTES = 30;
const FIRST_HOUR = 6;   // 6 AM
const LAST_HOUR = 23;   // 11 PM

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < LAST_HOUR) slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();

function fmtSlotLabel(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}:00 ${period}` : '';  // only show on the hour
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
}

const LOCATION_OPTIONS = [
  'Video call',
  'Phone call',
  'In person',
  'Google Meet',
  'Zoom',
  'Microsoft Teams',
  'Other',
];

const REMINDER_OPTIONS = [
  '5 minutes before',
  '10 minutes before',
  '15 minutes before',
  '30 minutes before',
  '1 hour before',
  '1 day before',
];

/* ════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════ */
export default function ScheduleMeetingModal({
  contextName,
  contextType,
  onClose,
  onSave,
}: ScheduleMeetingModalProps) {
  const today = useMemo(() => new Date(), []);

  /* ── Form state ── */
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(toDateStr(today));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [location, setLocation] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [showNoteArea, setShowNoteArea] = useState(false);
  const [reminders, setReminders] = useState<string[]>([]);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  /* ── Calendar state ── */
  const [weekStart, setWeekStart] = useState(() => getMonday(today));
  const [hideWeekends, setHideWeekends] = useState(true);
  const calendarBodyRef = useRef<HTMLDivElement>(null);

  // Scroll calendar to working hours on mount
  useEffect(() => {
    if (calendarBodyRef.current) {
      // Scroll to 8 AM
      const slotIdx = TIME_SLOTS.indexOf('08:00');
      const SLOT_H = 24;
      calendarBodyRef.current.scrollTop = slotIdx * SLOT_H;
    }
  }, []);

  /* ── Week days ── */
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < (hideWeekends ? 5 : 7); i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart, hideWeekends]);

  const prevWeek = () => setWeekStart(d => addDays(d, -7));
  const nextWeek = () => setWeekStart(d => addDays(d, 7));
  const goToday  = () => setWeekStart(getMonday(today));

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, hideWeekends ? 4 : 6);
    return `${fmtShortDate(weekStart)} – ${fmtShortDate(end)}`;
  }, [weekStart, hideWeekends]);

  /* ── Calendar click ── */
  const handleSlotClick = useCallback((day: Date, slot: string) => {
    setStartDate(toDateStr(day));
    setStartTime(slot);
    setEndTime(addMinutes(slot, 30));
  }, []);

  /* ── Selected slot highlighting ── */
  const isSelected = useCallback((day: Date, slot: string): boolean => {
    return toDateStr(day) === startDate && slot >= startTime && slot < endTime;
  }, [startDate, startTime, endTime]);

  const isToday = (d: Date) => toDateStr(d) === toDateStr(today);

  /* ── Save ── */
  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title, startDate, startTime, endTime, location, description, internalNote, reminders });
  };

  /* ── Reminders ── */
  const addReminder = (r: string) => {
    if (!reminders.includes(r)) setReminders(prev => [...prev, r]);
    setShowReminderPicker(false);
  };
  const removeReminder = (r: string) => setReminders(prev => prev.filter(x => x !== r));

  const userEmail = typeof window !== 'undefined'
    ? (localStorage.getItem('crm_demo_user_email') || 'you@example.com')
    : 'you@example.com';
  const userName = userEmail.split('@')[0];

  /* ── Constants ── */
  const SLOT_H = 24; // px per slot

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl overflow-hidden flex flex-row"
        style={{ width: 900, maxWidth: '96vw', maxHeight: '90vh', border: '1px solid #EBEBEB' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ══ LEFT PANEL — form ══════════════════════════════ */}
        <div
          className="flex flex-col overflow-y-auto flex-shrink-0"
          style={{ width: 360, borderRight: '1px solid #EBEBEB' }}
        >
          {/* Header */}
          <div
            className="flex items-center px-5 py-3 flex-shrink-0"
            style={{ backgroundColor: '#333333' }}
          >
            <span className="text-sm font-semibold text-white flex-1">Schedule</span>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* User type */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="schedule-type" defaultChecked className="accent-[#4762D5]" />
                <span className="text-xs font-medium" style={{ color: '#333333' }}>User</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="schedule-type" className="accent-[#4762D5]" />
                <span className="text-xs font-medium" style={{ color: '#333333' }}>Meeting rotation</span>
              </label>
            </div>

            {/* Owner */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded border text-xs cursor-default"
              style={{ borderColor: '#EBEBEB', color: '#666666', backgroundColor: '#FAFAFA' }}
            >
              <span className="truncate flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 flex-shrink-0" />
                {userName} &lt;{userEmail}&gt;
              </span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#B3B3B3' }} />
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#666666' }}>Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Meeting title..."
                autoFocus
                className="w-full border rounded px-3 py-1.5 text-sm outline-none transition-colors"
                style={{ borderColor: '#EBEBEB', color: '#333333' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <label className="block text-xs font-semibold mb-1" style={{ color: '#666666' }}>Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-xs outline-none"
                  style={{ borderColor: '#EBEBEB', color: '#333333' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#666666' }}>Start time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => { setStartTime(e.target.value); setEndTime(addMinutes(e.target.value, 30)); }}
                  className="w-full border rounded px-2 py-1.5 text-xs outline-none"
                  style={{ borderColor: '#EBEBEB', color: '#333333' }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: '#666666' }}>End time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-xs outline-none"
                  style={{ borderColor: '#EBEBEB', color: '#333333' }}
                />
              </div>
            </div>

            {/* Attendees */}
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: '#666666' }}>Attendees</p>
              <div className="flex flex-wrap gap-1.5">
                {contextName ? (
                  <button
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:border-[#4762D5]"
                    style={{ borderColor: '#EBEBEB', color: '#4762D5', backgroundColor: '#FAFAFA' }}
                  >
                    {contextName}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    className="text-xs font-medium"
                    style={{ color: '#4762D5' }}
                  >
                    + Add attendee
                  </button>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="relative">
              <p className="text-xs font-semibold mb-1" style={{ color: '#666666' }}>Location</p>
              <button
                onClick={() => setShowLocationPicker(v => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: '#4762D5' }}
              >
                <MapPin className="w-3.5 h-3.5" />
                {location || 'Select location'}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showLocationPicker && (
                <div
                  className="absolute top-full left-0 mt-1 z-20 bg-white border rounded-lg shadow-lg py-1 min-w-[180px]"
                  style={{ borderColor: '#EBEBEB' }}
                >
                  {LOCATION_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setLocation(opt); setShowLocationPicker(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#FAFAFA] transition-colors"
                      style={{ color: '#333333' }}
                    >
                      {opt}
                    </button>
                  ))}
                  <div className="border-t mx-2 my-1" style={{ borderColor: '#EBEBEB' }} />
                  <button
                    onClick={() => { setLocation(''); setShowLocationPicker(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#FAFAFA]"
                    style={{ color: '#B3B3B3' }}
                  >
                    No location
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t" style={{ borderColor: '#EBEBEB' }} />

            {/* Reminder emails */}
            <div className="relative">
              <p className="text-xs font-semibold mb-1.5" style={{ color: '#666666' }}>Scheduled reminder emails</p>
              {reminders.map(r => (
                <div key={r} className="flex items-center justify-between text-xs py-1" style={{ color: '#333333' }}>
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-3 h-3 text-[#999999]" />{r}
                  </span>
                  <button onClick={() => removeReminder(r)} className="text-[#B3B3B3] hover:text-[#666666]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setShowReminderPicker(v => !v)}
                className="flex items-center gap-1 text-xs font-medium mt-1"
                style={{ color: '#4762D5' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add reminder
              </button>
              {showReminderPicker && (
                <div
                  className="absolute top-full left-0 mt-1 z-20 bg-white border rounded-lg shadow-lg py-1 min-w-[200px]"
                  style={{ borderColor: '#EBEBEB' }}
                >
                  {REMINDER_OPTIONS.filter(r => !reminders.includes(r)).map(r => (
                    <button
                      key={r}
                      onClick={() => addReminder(r)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#FAFAFA] transition-colors"
                      style={{ color: '#333333' }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t" style={{ borderColor: '#EBEBEB' }} />

            {/* Attendee description */}
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: '#666666' }}>Attendee description</p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Send a description to your attendees..."
                rows={2}
                className="w-full border rounded px-3 py-2 text-xs resize-none outline-none transition-colors"
                style={{ borderColor: '#EBEBEB', color: '#333333' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
              />
            </div>

            {/* Associated with */}
            {contextName && (
              <button className="text-xs hover:underline" style={{ color: '#4762D5' }}>
                Associated with 1 record ▾
              </button>
            )}

            {/* Internal note */}
            {!showNoteArea ? (
              <button
                onClick={() => setShowNoteArea(true)}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: '#4762D5' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add internal note
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold" style={{ color: '#666666' }}>
                    <FileText className="inline w-3 h-3 mr-1" />Internal note
                  </p>
                  <button onClick={() => { setShowNoteArea(false); setInternalNote(''); }}
                    className="text-[#B3B3B3] hover:text-[#666666]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <textarea
                  value={internalNote}
                  onChange={e => setInternalNote(e.target.value)}
                  placeholder="Add an internal note (not sent to attendees)..."
                  rows={2}
                  className="w-full border rounded px-3 py-2 text-xs resize-none outline-none transition-colors"
                  style={{ borderColor: '#EBEBEB', color: '#333333' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#4762D5'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 flex items-center gap-3 border-t flex-shrink-0"
            style={{ borderColor: '#EBEBEB', backgroundColor: '#FAFAFA' }}
          >
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex-1 py-2 rounded text-sm font-semibold transition-colors"
              style={{
                backgroundColor: title.trim() ? '#333333' : '#EBEBEB',
                color: title.trim() ? '#ffffff' : '#B3B3B3',
                cursor: title.trim() ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={e => { if (title.trim()) (e.currentTarget as HTMLElement).style.backgroundColor = '#1a2b3c'; }}
              onMouseLeave={e => { if (title.trim()) (e.currentTarget as HTMLElement).style.backgroundColor = '#333333'; }}
            >
              Schedule meeting
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm font-semibold border transition-colors hover:bg-[#F1F1F1]"
              style={{ borderColor: '#EBEBEB', color: '#4762D5' }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ══ RIGHT PANEL — calendar ════════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Calendar header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: '#EBEBEB' }}
          >
            {/* Today + nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="px-3 py-1 text-xs border rounded font-medium hover:bg-[#F1F1F1] transition-colors"
                style={{ borderColor: '#EBEBEB', color: '#666666' }}
              >
                Today
              </button>
              <button
                onClick={prevWeek}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F1F1F1] transition-colors"
                style={{ color: '#666666' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextWeek}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F1F1F1] transition-colors"
                style={{ color: '#666666' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Week label */}
            <span className="text-sm font-semibold" style={{ color: '#333333' }}>{weekLabel}</span>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideWeekends}
                  onChange={e => setHideWeekends(e.target.checked)}
                  className="accent-[#4762D5]"
                />
                <span className="text-xs" style={{ color: '#666666' }}>Hide weekends</span>
              </label>
              <span className="text-xs font-medium" style={{ color: '#4762D5' }}>
                UTC {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </span>
            </div>
          </div>

          {/* Day header row */}
          <div
            className="flex border-b flex-shrink-0"
            style={{ borderColor: '#EBEBEB' }}
          >
            {/* Gutter */}
            <div className="flex-shrink-0" style={{ width: 56 }} />
            {weekDays.map(day => {
              const todayDay = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className="flex-1 text-center py-2"
                  style={{ borderLeft: '1px solid #EBEBEB' }}
                >
                  <span className="text-xs font-medium" style={{ color: '#999999' }}>
                    {fmtDayName(day)}
                  </span>
                  <div className="flex justify-center mt-0.5">
                    <span
                      className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                      style={todayDay
                        ? { backgroundColor: '#4762D5', color: '#fff' }
                        : { color: '#333333' }
                      }
                    >
                      {day.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="flex-1 overflow-y-auto" ref={calendarBodyRef}>
            <div className="flex" style={{ position: 'relative' }}>
              {/* Time gutter */}
              <div className="flex-shrink-0" style={{ width: 56 }}>
                {TIME_SLOTS.map((slot, i) => {
                  const label = fmtSlotLabel(slot);
                  return (
                    <div
                      key={slot}
                      style={{ height: SLOT_H, position: 'relative' }}
                    >
                      {label && (
                        <span
                          className="absolute right-2 text-[10px]"
                          style={{ color: '#B3B3B3', top: -7, whiteSpace: 'nowrap' }}
                        >
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              {weekDays.map(day => {
                const dayStr = toDateStr(day);
                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1"
                    style={{ borderLeft: '1px solid #EBEBEB', position: 'relative' }}
                  >
                    {TIME_SLOTS.map((slot, i) => {
                      const selected = isSelected(day, slot);
                      const isHour = slot.endsWith(':00');
                      return (
                        <div
                          key={slot}
                          onClick={() => handleSlotClick(day, slot)}
                          style={{
                            height: SLOT_H,
                            backgroundColor: selected ? 'rgba(0,145,174,0.18)' : 'transparent',
                            borderTop: isHour ? '1px solid #EBEBEB' : '1px solid #F1F1F1',
                            cursor: 'pointer',
                            transition: 'background-color 0.1s',
                          }}
                          onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,145,174,0.07)'; }}
                          onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                        />
                      );
                    })}

                    {/* Selected meeting block overlay */}
                    {dayStr === startDate && (() => {
                      const startIdx = TIME_SLOTS.indexOf(startTime);
                      const endIdx   = TIME_SLOTS.indexOf(endTime);
                      if (startIdx < 0) return null;
                      const top = startIdx * SLOT_H;
                      const height = Math.max(SLOT_H, (endIdx - startIdx) * SLOT_H);
                      return (
                        <div
                          style={{
                            position: 'absolute',
                            top,
                            left: 2,
                            right: 2,
                            height,
                            backgroundColor: 'rgba(0,145,174,0.85)',
                            borderRadius: 4,
                            pointerEvents: 'none',
                            zIndex: 2,
                            padding: '2px 4px',
                          }}
                        >
                          <p className="text-white text-[10px] font-semibold truncate leading-tight">
                            {title || 'Meeting'}
                          </p>
                          <p className="text-white/80 text-[9px]">{startTime} – {endTime}</p>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
