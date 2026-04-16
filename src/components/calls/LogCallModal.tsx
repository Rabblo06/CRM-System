'use client';

import { useState } from 'react';
import { X, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export type CallDirection = 'inbound' | 'outbound';
export type CallOutcome = 'connected' | 'voicemail' | 'no_answer' | 'busy';

export interface CallData {
  direction: CallDirection;
  outcome: CallOutcome;
  duration_seconds: number;
  phone: string;
  notes: string;
  called_at: string;
}

interface LogCallModalProps {
  contactName?: string;
  contactPhone?: string;
  onSave: (data: CallData) => void;
  onClose: () => void;
}

const OUTCOMES: { value: CallOutcome; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'connected',  label: 'Connected',  color: '#00BDA5', icon: <Phone className="w-3.5 h-3.5" /> },
  { value: 'voicemail',  label: 'Voicemail',  color: '#F5C26B', icon: <PhoneMissed className="w-3.5 h-3.5" /> },
  { value: 'no_answer',  label: 'No Answer',  color: '#7C98B6', icon: <PhoneMissed className="w-3.5 h-3.5" /> },
  { value: 'busy',       label: 'Busy',       color: '#FF7A59', icon: <PhoneMissed className="w-3.5 h-3.5" /> },
];

export function parseCallDescription(description?: string): Partial<CallData> & { notes?: string } {
  if (!description) return {};
  try {
    return JSON.parse(description);
  } catch {
    return { notes: description };
  }
}

export function formatCallDuration(seconds: number): string {
  if (!seconds || seconds === 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function LogCallModal({ contactName, contactPhone, onSave, onClose }: LogCallModalProps) {
  const [direction, setDirection] = useState<CallDirection>('outbound');
  const [outcome, setOutcome] = useState<CallOutcome>('connected');
  const [durationMin, setDurationMin] = useState('');
  const [durationSec, setDurationSec] = useState('');
  const [phone, setPhone] = useState(contactPhone || '');
  const [notes, setNotes] = useState('');
  const [calledAt, setCalledAt] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  });

  const handleSave = () => {
    const min = parseInt(durationMin || '0', 10);
    const sec = parseInt(durationSec || '0', 10);
    onSave({
      direction,
      outcome,
      duration_seconds: min * 60 + sec,
      phone,
      notes,
      called_at: calledAt,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-[95vw] overflow-hidden"
        style={{ border: '1px solid #DFE3EB' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DFE3EB]" style={{ backgroundColor: '#F6F9FC' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5F5F8' }}>
              <Phone className="w-4 h-4" style={{ color: '#0091AE' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>Log a Call</h3>
              {contactName && <p className="text-xs" style={{ color: '#7C98B6' }}>with {contactName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#E8EDF5] text-[#516F90]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Direction */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#516F90' }}>Direction</p>
            <div className="flex gap-2">
              {([
                { value: 'outbound' as CallDirection, label: 'Outbound', icon: <PhoneOutgoing className="w-3.5 h-3.5" /> },
                { value: 'inbound' as CallDirection,  label: 'Inbound',  icon: <PhoneIncoming className="w-3.5 h-3.5" /> },
              ] as const).map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDirection(d.value)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: direction === d.value ? '#EAF6FB' : '#F6F9FC',
                    borderColor: direction === d.value ? '#0091AE' : '#DFE3EB',
                    color: direction === d.value ? '#0091AE' : '#516F90',
                  }}
                >
                  {d.icon}
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#516F90' }}>Outcome</p>
            <div className="grid grid-cols-4 gap-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setOutcome(o.value)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: outcome === o.value ? `${o.color}18` : '#F6F9FC',
                    borderColor: outcome === o.value ? o.color : '#DFE3EB',
                    color: outcome === o.value ? o.color : '#516F90',
                  }}
                >
                  {o.icon}
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: '#516F90' }}>Duration</p>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    className="h-8 text-xs pr-7 bg-[#F6F9FC] border-[#DFE3EB]"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#99ACC2' }}>m</span>
                </div>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    value={durationSec}
                    onChange={(e) => setDurationSec(e.target.value)}
                    className="h-8 text-xs pr-6 bg-[#F6F9FC] border-[#DFE3EB]"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#99ACC2' }}>s</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: '#516F90' }}>Phone number</p>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="h-8 text-xs bg-[#F6F9FC] border-[#DFE3EB]"
              />
            </div>
          </div>

          {/* Date/Time */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: '#516F90' }}>Date & Time</p>
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#99ACC2' }} />
              <Input
                type="datetime-local"
                value={calledAt}
                onChange={(e) => setCalledAt(e.target.value)}
                className="h-8 text-xs pl-8 bg-[#F6F9FC] border-[#DFE3EB]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: '#516F90' }}>Call notes</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed? Any follow-up actions?"
              rows={3}
              className="text-sm resize-none bg-[#F6F9FC] border-[#DFE3EB]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#DFE3EB] flex justify-end gap-2" style={{ backgroundColor: '#F6F9FC' }}>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8">Cancel</Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="text-xs h-8 gap-1.5"
            style={{ backgroundColor: '#0091AE', borderColor: '#0091AE' }}
          >
            <Phone className="w-3 h-3" />
            Save Call
          </Button>
        </div>
      </div>
    </div>
  );
}
