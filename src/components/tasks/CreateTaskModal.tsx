'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface CreateTaskModalProps {
  contactName?: string;
  contactId?: string;
  onClose: () => void;
  onSave: (task: {
    title: string;
    taskType: string;
    priority: string;
    dueDate: string;
    dueTime: string;
    reminder: string;
    notes: string;
    repeat: boolean;
  }) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'none', label: 'None', color: '#99ACC2' },
  { value: 'low', label: 'Low', color: '#00BDA5' },
  { value: 'medium', label: 'Medium', color: '#F5C26B' },
  { value: 'high', label: 'High', color: '#FF7A59' },
];

const TASK_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'todo', label: 'To-do' },
];

const REMINDERS = [
  { value: 'none', label: 'No reminder' },
  { value: 'at_due', label: 'At task due time' },
  { value: '15min', label: '15 min before' },
  { value: '1hour', label: '1 hour before' },
  { value: '1day', label: '1 day before' },
];

export default function CreateTaskModal({ contactName, contactId: _contactId, onClose, onSave }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [dueTime, setDueTime] = useState('09:00');
  const [reminder, setReminder] = useState('none');
  const [repeat, setRepeat] = useState(false);
  const [taskType, setTaskType] = useState('todo');
  const [priority, setPriority] = useState('none');
  const [notes, setNotes] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);

  // Get user from localStorage
  const userEmail = typeof window !== 'undefined'
    ? (localStorage.getItem('crm_demo_user_email') || 'Me')
    : 'Me';

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: dragStart.current.posX + (e.clientX - dragStart.current.mouseX),
        y: dragStart.current.posY + (e.clientY - dragStart.current.mouseY),
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const execFormat = (cmd: string) => {
    if (notesRef.current) {
      notesRef.current.focus();
      document.execCommand(cmd, false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      taskType,
      priority,
      dueDate,
      dueTime,
      reminder,
      notes: notesRef.current?.innerHTML || notes,
      repeat,
    });
  };

  const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[0];

  return (
    <div
      className="fixed z-50 flex items-end justify-center pointer-events-none"
      style={{ inset: 0 }}
    >
      <div
        ref={modalRef}
        className="pointer-events-auto shadow-2xl rounded-t-lg overflow-hidden flex flex-col"
        style={{
          width: 520,
          maxHeight: isMinimized ? 'auto' : 680,
          transform: `translate(${position.x}px, ${position.y}px)`,
          border: '1px solid #1a2a38',
          marginBottom: 0,
          userSelect: isDragging ? 'none' : undefined,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
          style={{ backgroundColor: '#2D3E50', cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
        >
          {/* Drag handle */}
          <span style={{ color: '#7C98B6', fontSize: 16, lineHeight: 1, cursor: 'inherit' }}>⠿</span>
          <span className="text-sm font-semibold flex-1" style={{ color: '#ffffff' }}>
            Task{contactName ? ` — ${contactName}` : ''}
          </span>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setIsMinimized(m => !m)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white text-xs font-bold"
            title={isMinimized ? 'Restore' : 'Minimize'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm font-bold"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Body — hidden when minimized */}
        {!isMinimized && (
          <div className="flex flex-col flex-1 overflow-y-auto bg-white">
            {/* Title input */}
            <div className="px-5 pt-4 pb-2">
              <input
                type="text"
                placeholder="Enter your task"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full text-base font-semibold outline-none border-b-2 pb-2 placeholder:text-[#99ACC2]"
                style={{ borderColor: title ? '#FF7A59' : '#DFE3EB', color: '#2D3E50' }}
                autoFocus
              />
            </div>

            {/* Date + Time */}
            <div className="px-5 py-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#516F90' }}>Activity date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded border px-3 py-1.5 text-xs outline-none"
                  style={{ borderColor: '#DFE3EB', color: '#2D3E50' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#516F90' }}>Time</label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                  className="w-full rounded border px-3 py-1.5 text-xs outline-none"
                  style={{ borderColor: '#DFE3EB', color: '#2D3E50' }}
                />
              </div>
            </div>

            {/* Reminder */}
            <div className="px-5 pb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#516F90' }}>Send reminder</label>
                <select
                  value={reminder}
                  onChange={e => setReminder(e.target.value)}
                  className="w-full rounded border px-3 py-1.5 text-xs outline-none"
                  style={{ borderColor: '#DFE3EB', color: '#2D3E50', backgroundColor: '#fff' }}
                >
                  {REMINDERS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repeat}
                    onChange={e => setRepeat(e.target.checked)}
                    className="w-3.5 h-3.5 accent-orange-500"
                  />
                  <span className="text-xs font-medium" style={{ color: '#516F90' }}>Set to repeat</span>
                </label>
              </div>
            </div>

            {/* 4-column row */}
            <div className="px-5 pb-3 grid grid-cols-4 gap-2 border-t border-b py-3" style={{ borderColor: '#DFE3EB' }}>
              {/* Task Type */}
              <div>
                <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: '#7C98B6' }}>Task Type</label>
                <select
                  value={taskType}
                  onChange={e => setTaskType(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-xs outline-none"
                  style={{ borderColor: '#DFE3EB', color: '#2D3E50', backgroundColor: '#fff' }}
                >
                  {TASK_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: '#7C98B6' }}>Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-xs outline-none"
                  style={{ borderColor: '#DFE3EB', color: '#2D3E50', backgroundColor: '#fff' }}
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedPriority.color }} />
                  <span className="text-[10px]" style={{ color: selectedPriority.color }}>{selectedPriority.label}</span>
                </div>
              </div>

              {/* Queue */}
              <div>
                <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: '#7C98B6' }}>Queue</label>
                <select
                  className="w-full rounded border px-2 py-1 text-xs outline-none"
                  style={{ borderColor: '#DFE3EB', color: '#2D3E50', backgroundColor: '#fff' }}
                >
                  <option value="none">None</option>
                </select>
              </div>

              {/* Assigned to */}
              <div>
                <label className="block text-[10px] font-semibold mb-1 uppercase tracking-wide" style={{ color: '#7C98B6' }}>Assigned to</label>
                <div
                  className="w-full rounded border px-2 py-1 text-xs truncate"
                  style={{ borderColor: '#DFE3EB', color: '#2D3E50', backgroundColor: '#F6F9FC' }}
                  title={userEmail}
                >
                  {userEmail === 'Me' ? 'Me' : userEmail.split('@')[0]}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="px-5 pt-3 pb-2 flex-1">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#516F90' }}>Notes</label>
              {/* Formatting toolbar */}
              <div className="flex items-center gap-0.5 mb-1.5 border rounded-t px-1 py-1" style={{ borderColor: '#DFE3EB', borderBottom: 'none', backgroundColor: '#F6F9FC' }}>
                {[
                  { cmd: 'bold', label: <strong>B</strong> },
                  { cmd: 'italic', label: <em>I</em> },
                  { cmd: 'underline', label: <u>U</u> },
                ].map(({ cmd, label }) => (
                  <button
                    key={cmd}
                    onMouseDown={e => { e.preventDefault(); execFormat(cmd); }}
                    className="px-2 py-0.5 text-xs rounded hover:bg-[#DFE3EB] transition-colors"
                    style={{ color: '#516F90' }}
                    title={cmd.charAt(0).toUpperCase() + cmd.slice(1)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                ref={notesRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Add notes..."
                onInput={e => setNotes((e.target as HTMLDivElement).innerHTML)}
                className="w-full border rounded-b px-3 py-2 text-xs outline-none focus:border-orange-400 min-h-[80px]"
                style={{
                  borderColor: '#DFE3EB',
                  color: '#2D3E50',
                  lineHeight: 1.6,
                  position: 'relative',
                }}
              />
              <style>{`
                [contenteditable][data-placeholder]:empty:before {
                  content: attr(data-placeholder);
                  color: #99ACC2;
                  pointer-events: none;
                }
              `}</style>
              <div className="flex justify-end mt-1.5">
                <button className="text-xs hover:underline" style={{ color: '#0091AE' }}>
                  Associated with 1 record
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t flex-shrink-0" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="w-full py-2 rounded text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: title.trim() ? '#FF7A59' : '#DFE3EB',
                  color: title.trim() ? '#ffffff' : '#99ACC2',
                  cursor: title.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
