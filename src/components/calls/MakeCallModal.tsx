'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Phone, PhoneOff, X, Mic, MicOff, Hash, Volume2, Wifi,
  Circle, Star, ChevronRight, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Phase = 'picker' | 'calling' | 'post-call';

export interface MakeCallResult {
  outcome: string;
  callType: string;
  notes: string;
  duration_seconds: number;
  phone: string;
  rating: number;
  direction: 'outbound';
  createFollowUp: boolean;
}

interface Props {
  contactName: string;
  contactPhone?: string;
  onClose: () => void;
  onSave: (data: MakeCallResult) => void;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function MakeCallModal({ contactName, contactPhone, onClose, onSave }: Props) {
  const [phase, setPhase] = useState<Phase>('picker');
  const [selectedPhone, setSelectedPhone] = useState(contactPhone || '');
  const [callFrom, setCallFrom] = useState('');
  const [savedPhones, setSavedPhones] = useState<{ number: string; label: string }[]>([]);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('no_answer');
  const [callType, setCallType] = useState('');
  const [rating, setRating] = useState(0);
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const stored: { number: string; label: string }[] = JSON.parse(
        localStorage.getItem('crm_calling_phones') || '[]'
      );
      setSavedPhones(stored);
      if (stored.length > 0) setCallFrom(stored[0].number);
    } catch {}
  }, []);

  useEffect(() => {
    if (phase === 'calling') {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const handleDial = (phone: string) => {
    setSelectedPhone(phone);
    // Trigger the tel: link without navigating away from the app
    const a = document.createElement('a');
    a.href = `tel:${phone.replace(/\s+/g, '')}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setPhase('calling');
  };

  const handleHangUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setOutcome(duration >= 5 ? 'connected' : 'no_answer');
    setPhase('post-call');
  };

  const handleSave = () => {
    onSave({
      outcome,
      callType,
      notes,
      duration_seconds: duration,
      phone: selectedPhone,
      rating,
      direction: 'outbound',
      createFollowUp,
    });
  };

  /* ─── Phase 1: Picker ─── */
  if (phase === 'picker') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden" style={{ border: '1px solid #DFE3EB' }}>
          {/* Contact name header */}
          <div className="px-4 py-3 border-b" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
            <p className="text-sm font-semibold" style={{ color: '#2D3E50' }}>{contactName}</p>
          </div>

          {/* Phone numbers */}
          <div className="py-1.5">
            {contactPhone ? (
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[#F6F9FC] transition-colors text-left"
                onClick={() => handleDial(contactPhone)}
              >
                <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#0091AE' }} />
                <span style={{ color: '#2D3E50' }}>Call {contactPhone}</span>
              </button>
            ) : (
              <p className="px-4 py-3 text-xs" style={{ color: '#99ACC2' }}>No phone number on this contact</p>
            )}
          </div>

          {/* Call from */}
          <div className="px-4 py-2.5 border-t" style={{ borderColor: '#DFE3EB' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs flex-shrink-0" style={{ color: '#7C98B6' }}>Call from:</span>
              {savedPhones.length > 0 ? (
                <select
                  value={callFrom}
                  onChange={(e) => setCallFrom(e.target.value)}
                  className="flex-1 text-xs bg-transparent border-none outline-none cursor-pointer text-right truncate"
                  style={{ color: '#2D3E50' }}
                >
                  {savedPhones.map((p) => (
                    <option key={p.number} value={p.number}>{p.number}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs" style={{ color: '#99ACC2' }}>No number (Settings → Calling)</span>
              )}
            </div>
          </div>

          {/* Device */}
          <div
            className="px-4 py-2.5 border-t flex items-center justify-between cursor-pointer hover:bg-[#F6F9FC] transition-colors"
            style={{ borderColor: '#DFE3EB' }}
          >
            <span className="text-xs" style={{ color: '#2D3E50' }}>Device: Browser</span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: '#99ACC2' }} />
          </div>

          {/* Cancel */}
          <div className="px-4 py-3 border-t" style={{ borderColor: '#DFE3EB' }}>
            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Phase 2: In-call ─── */
  if (phase === 'calling') {
    return (
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[520px] max-w-[95vw]">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ border: '1px solid #DFE3EB' }}>

          {/* Active call bar */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: '#2D3E50' }}>
            <button onClick={() => {}} className="p-1 rounded hover:bg-white/10">
              <ChevronRight className="w-4 h-4 text-white rotate-90" />
            </button>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{contactName}</p>
              <p className="text-[10px] text-white/60 truncate">{selectedPhone}</p>
            </div>
            <span className="text-sm font-mono text-white tabular-nums">{formatDuration(duration)}</span>
            <button
              onClick={handleHangUp}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 flex-shrink-0"
              style={{ backgroundColor: '#E8384F' }}
              title="Hang up"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Recording notice */}
          <div className="flex items-start justify-between gap-2 px-4 py-2.5 text-xs border-b" style={{ borderColor: '#DFE3EB', backgroundColor: '#FFFBF0', color: '#8B6914' }}>
            <span>Your call is set to record automatically. Please inform the other party this call is being recorded.</span>
            <button className="flex-shrink-0 hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Call controls */}
          <div className="flex items-center gap-1 px-4 py-3 border-b" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
            {[
              { icon: <Circle className="w-4 h-4" />, label: 'Record' },
              { icon: muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />, label: muted ? 'Unmute' : 'Mute', onClick: () => setMuted(!muted) },
              { icon: <Hash className="w-4 h-4" />, label: 'Keypad' },
              { icon: <Volume2 className="w-4 h-4" />, label: 'Audio' },
              { icon: <Wifi className="w-4 h-4" />, label: 'Network' },
            ].map(({ icon, label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-[10px] font-medium hover:bg-[#E8EDF5] transition-colors"
                style={{ color: '#516F90' }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="px-4 pt-3 pb-4">
            <p className="text-xs font-medium mb-1.5" style={{ color: '#516F90' }}>Notes</p>
            <Textarea
              placeholder="Take notes on this call..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="text-xs resize-none bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none"
              style={{ color: '#2D3E50' }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ─── Phase 3: Post-call ─── */
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[520px] max-w-[95vw]">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ border: '1px solid #DFE3EB' }}>

        {/* Header — outcome + call type */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E5F8F6' }}>
            <Check className="w-3 h-3" style={{ color: '#00BDA5' }} />
          </div>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer"
            style={{ color: '#2D3E50' }}
          >
            <option value="no_answer">No answer</option>
            <option value="connected">Connected</option>
            <option value="voicemail">Left voicemail</option>
            <option value="busy">Busy</option>
            <option value="wrong_number">Wrong number</option>
            <option value="left_message">Left message</option>
          </select>
          <span className="text-[#DFE3EB]">·</span>
          <select
            value={callType}
            onChange={(e) => setCallType(e.target.value)}
            className="text-xs bg-transparent border-none outline-none cursor-pointer"
            style={{ color: '#7C98B6' }}
          >
            <option value="">Select call type</option>
            <option value="prospecting">Prospecting</option>
            <option value="follow_up">Follow-up</option>
            <option value="demo">Demo</option>
            <option value="support">Support</option>
            <option value="other">Other</option>
          </select>
          <div className="flex-1" />
          <button onClick={onClose} className="p-1 rounded hover:bg-[#E8EDF5]">
            <X className="w-4 h-4" style={{ color: '#99ACC2' }} />
          </button>
        </div>

        {/* Notes */}
        <div className="px-4 py-3 border-b" style={{ borderColor: '#DFE3EB' }}>
          <p className="text-xs font-medium mb-1.5" style={{ color: '#516F90' }}>Notes</p>
          <Textarea
            placeholder="Take notes on this call..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="text-xs resize-none"
          />
          <p className="text-xs mt-1.5" style={{ color: '#0091AE' }}>Associated with 1 record</p>
        </div>

        {/* Rating + Save */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs" style={{ color: '#516F90' }}>Rate call quality</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star
                    className="w-4 h-4 transition-colors"
                    style={{ color: s <= rating ? '#F5C26B' : '#DFE3EB', fill: s <= rating ? '#F5C26B' : 'none' }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="text-xs h-8"
              style={{ backgroundColor: '#FF7A59', borderColor: '#FF7A59' }}
              onClick={handleSave}
            >
              Save call
            </Button>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#516F90' }}>
              <input
                type="checkbox"
                checked={createFollowUp}
                onChange={(e) => setCreateFollowUp(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#FF7A59]"
              />
              Create a follow up task
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
