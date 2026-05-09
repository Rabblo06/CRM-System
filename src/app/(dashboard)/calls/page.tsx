'use client';

import { useState, useMemo } from 'react';
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  PhoneCall, Plus, Search, Clock, Mic,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useActivities } from '@/hooks/useActivities';
import LogCallModal, {
  parseCallDescription,
  formatCallDuration,
  type CallDirection,
  type CallOutcome,
} from '@/components/calls/LogCallModal';

const outcomeConfig: Record<CallOutcome, { label: string; color: string; bg: string }> = {
  connected: { label: 'Connected', color: '#4CAF8E', bg: '#E5F8F6' },
  voicemail:  { label: 'Voicemail', color: '#E8882A', bg: '#FEF9EE' },
  no_answer:  { label: 'No Answer', color: '#999999', bg: '#F1F1F1' },
  busy:       { label: 'Busy',      color: '#4762D5', bg: '#EEF0FB' },
};

function DirectionIcon({ direction, outcome }: { direction?: CallDirection; outcome?: CallOutcome }) {
  if (!outcome || outcome === 'no_answer' || outcome === 'busy') {
    return <PhoneMissed className="w-4 h-4" style={{ color: '#4762D5' }} />;
  }
  if (direction === 'inbound') return <PhoneIncoming className="w-4 h-4" style={{ color: '#4CAF8E' }} />;
  return <PhoneOutgoing className="w-4 h-4" style={{ color: '#4762D5' }} />;
}

const dialPadDigits = ['1','2','3','4','5','6','7','8','9','*','0','#'];

export default function CallsPage() {
  const { activities, addActivity } = useActivities();
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState<'all' | CallDirection>('all');
  const [showLogCall, setShowLogCall] = useState(false);
  const [showDialer, setShowDialer] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter to only call-type activities
  const calls = useMemo(() =>
    activities
      .filter((a) => a.type === 'call')
      .map((a) => {
        const meta = parseCallDescription(a.description);
        return { ...a, meta };
      }),
    [activities]
  );

  const filtered = calls.filter((c) => {
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.meta.phone || '').includes(search);
    const matchDir = dirFilter === 'all' || c.meta.direction === dirFilter;
    return matchSearch && matchDir;
  });

  const totalConnected = calls.filter((c) => c.meta.outcome === 'connected').length;
  const totalDuration = calls
    .filter((c) => c.meta.outcome === 'connected')
    .reduce((sum, c) => sum + (c.meta.duration_seconds || 0), 0);
  const avgDuration = totalConnected > 0 ? Math.round(totalDuration / totalConnected) : 0;

  return (
    <div className="p-6 space-y-5" style={{ backgroundColor: '#FAFAFA', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#333333' }}>Calls</h1>
          <p className="text-xs mt-0.5" style={{ color: '#999999' }}>
            {calls.length} call{calls.length !== 1 ? 's' : ''} logged
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5 text-xs h-8" onClick={() => setShowDialer(true)}>
            <PhoneCall className="w-3.5 h-3.5" />
            Dialer
          </Button>
          <Button
            className="gap-1.5 text-xs h-8"
            style={{ backgroundColor: '#4762D5', borderColor: '#4762D5' }}
            onClick={() => setShowLogCall(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Log Call
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Calls',  value: String(calls.length),             icon: Phone,         color: '#4762D5', bg: '#E5F5F8' },
          { label: 'Connected',    value: String(totalConnected),            icon: PhoneIncoming, color: '#4CAF8E', bg: '#E5F8F6' },
          { label: 'Avg Duration', value: formatCallDuration(avgDuration),   icon: Clock,         color: '#E8882A', bg: '#FEF9EE' },
          { label: 'Voicemails',   value: String(calls.filter(c => c.meta.outcome === 'voicemail').length), icon: Mic, color: '#4762D5', bg: '#EEF0FB' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-[#EBEBEB] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: '#333333' }}>{value}</p>
              <p className="text-xs" style={{ color: '#999999' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#B3B3B3' }} />
          <Input
            placeholder="Search calls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'inbound', 'outbound'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirFilter(d)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: dirFilter === d ? '#333333' : '#ffffff',
                color: dirFilter === d ? '#ffffff' : '#666666',
                border: '1px solid #EBEBEB',
              }}
            >
              {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Call log table */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
        {calls.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#F1F1F1' }}>
              <Phone className="w-7 h-7" style={{ color: '#EBEBEB' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#333333' }}>No calls logged yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: '#999999' }}>Log your first call to start tracking</p>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              style={{ backgroundColor: '#4762D5', borderColor: '#4762D5' }}
              onClick={() => setShowLogCall(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Log a Call
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #EBEBEB', backgroundColor: '#FAFAFA' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Direction</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Outcome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Notes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>When</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((call, i) => {
                const oCfg = outcomeConfig[call.meta.outcome as CallOutcome] || outcomeConfig.connected;
                const isExpanded = expandedId === call.id;
                return (
                  <>
                    <tr
                      key={call.id}
                      className="transition-colors hover:bg-[#FAFAFA] cursor-pointer"
                      style={{ borderTop: i > 0 ? '1px solid #EBEBEB' : undefined }}
                      onClick={() => setExpandedId(isExpanded ? null : call.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F1F1F1' }}>
                          <DirectionIcon direction={call.meta.direction} outcome={call.meta.outcome as CallOutcome} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium" style={{ color: '#333333' }}>{call.title.replace(/^Call with\s*/i, '') || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: '#555555' }}>{call.meta.phone || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: oCfg.bg, color: oCfg.color }}>
                          {oCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" style={{ color: '#B3B3B3' }} />
                          <span className="text-xs" style={{ color: '#666666' }}>{formatCallDuration(call.meta.duration_seconds || 0)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs truncate" style={{ color: '#999999' }}>{call.meta.notes || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: '#999999' }}>
                          {call.meta.called_at
                            ? new Date(call.meta.called_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                            : new Date(call.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1 rounded hover:bg-[#F1F1F1]">
                          <ChevronDown className="w-4 h-4 transition-transform" style={{ color: '#B3B3B3', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && call.meta.notes && (
                      <tr key={`${call.id}-expanded`} style={{ borderTop: '1px solid #F1F1F1', backgroundColor: '#FAFBFC' }}>
                        <td colSpan={8} className="px-14 py-3">
                          <p className="text-xs" style={{ color: '#666666' }}>{call.meta.notes}</p>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && calls.length > 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10">
                    <p className="text-sm" style={{ color: '#999999' }}>No calls match your search</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialer modal */}
      {showDialer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDialer(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-72 p-6" style={{ border: '1px solid #EBEBEB' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-center mb-4" style={{ color: '#333333' }}>Dialer</h3>
            <div className="bg-[#FAFAFA] rounded-xl px-4 py-3 mb-4 text-center min-h-[52px] flex items-center justify-center">
              <span className="text-lg font-mono font-medium tracking-widest" style={{ color: dialNumber ? '#333333' : '#D6D6D6' }}>
                {dialNumber || 'Enter number'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {dialPadDigits.map((d) => (
                <button
                  key={d}
                  onClick={() => setDialNumber((n) => n + d)}
                  className="h-12 rounded-xl text-sm font-semibold transition-colors hover:bg-[#F1F1F1]"
                  style={{ color: '#333333', border: '1px solid #EBEBEB' }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDialNumber((n) => n.slice(0, -1))}
                className="flex-1 py-2.5 text-sm rounded-xl transition-colors hover:bg-[#F1F1F1]"
                style={{ color: '#999999', border: '1px solid #EBEBEB' }}
              >
                ⌫
              </button>
              <a
                href={dialNumber ? `tel:${dialNumber}` : '#'}
                className="w-14 h-11 rounded-full flex items-center justify-center transition-colors hover:opacity-90"
                style={{ backgroundColor: '#4CAF8E' }}
                onClick={() => dialNumber && setShowDialer(false)}
              >
                <Phone className="w-5 h-5 text-white" />
              </a>
              <button
                onClick={() => { setShowDialer(false); setDialNumber(''); }}
                className="flex-1 py-2.5 text-xs rounded-xl transition-colors hover:bg-[#EEF0FB]"
                style={{ color: '#4762D5', border: '1px solid #EBEBEB' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Call modal */}
      {showLogCall && (
        <LogCallModal
          onClose={() => setShowLogCall(false)}
          onSave={(data) => {
            addActivity({
              type: 'call',
              title: 'Call logged',
              description: JSON.stringify(data),
            });
            setShowLogCall(false);
          }}
        />
      )}
    </div>
  );
}
