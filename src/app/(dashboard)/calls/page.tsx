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
  connected: { label: 'Connected', color: '#00BDA5', bg: '#E5F8F6' },
  voicemail:  { label: 'Voicemail', color: '#F5C26B', bg: '#FEF9EE' },
  no_answer:  { label: 'No Answer', color: '#7C98B6', bg: '#F0F3F7' },
  busy:       { label: 'Busy',      color: '#FF7A59', bg: '#FFF3F0' },
};

function DirectionIcon({ direction, outcome }: { direction?: CallDirection; outcome?: CallOutcome }) {
  if (!outcome || outcome === 'no_answer' || outcome === 'busy') {
    return <PhoneMissed className="w-4 h-4" style={{ color: '#FF7A59' }} />;
  }
  if (direction === 'inbound') return <PhoneIncoming className="w-4 h-4" style={{ color: '#00BDA5' }} />;
  return <PhoneOutgoing className="w-4 h-4" style={{ color: '#0091AE' }} />;
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
    <div className="p-6 space-y-5" style={{ backgroundColor: '#F6F9FC', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#2D3E50' }}>Calls</h1>
          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>
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
            style={{ backgroundColor: '#0091AE', borderColor: '#0091AE' }}
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
          { label: 'Total Calls',  value: String(calls.length),             icon: Phone,         color: '#0091AE', bg: '#E5F5F8' },
          { label: 'Connected',    value: String(totalConnected),            icon: PhoneIncoming, color: '#00BDA5', bg: '#E5F8F6' },
          { label: 'Avg Duration', value: formatCallDuration(avgDuration),   icon: Clock,         color: '#F5C26B', bg: '#FEF9EE' },
          { label: 'Voicemails',   value: String(calls.filter(c => c.meta.outcome === 'voicemail').length), icon: Mic, color: '#FF7A59', bg: '#FFF3F0' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-[#DFE3EB] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: '#2D3E50' }}>{value}</p>
              <p className="text-xs" style={{ color: '#7C98B6' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#99ACC2' }} />
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
                backgroundColor: dirFilter === d ? '#2D3E50' : '#ffffff',
                color: dirFilter === d ? '#ffffff' : '#516F90',
                border: '1px solid #DFE3EB',
              }}
            >
              {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Call log table */}
      <div className="bg-white border border-[#DFE3EB] rounded-xl overflow-hidden">
        {calls.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#F0F3F7' }}>
              <Phone className="w-7 h-7" style={{ color: '#CBD6E2' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#2D3E50' }}>No calls logged yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: '#7C98B6' }}>Log your first call to start tracking</p>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              style={{ backgroundColor: '#0091AE', borderColor: '#0091AE' }}
              onClick={() => setShowLogCall(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Log a Call
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #DFE3EB', backgroundColor: '#F6F9FC' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Direction</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Outcome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Notes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>When</th>
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
                      className="transition-colors hover:bg-[#F6F9FC] cursor-pointer"
                      style={{ borderTop: i > 0 ? '1px solid #DFE3EB' : undefined }}
                      onClick={() => setExpandedId(isExpanded ? null : call.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0F3F7' }}>
                          <DirectionIcon direction={call.meta.direction} outcome={call.meta.outcome as CallOutcome} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>{call.title.replace(/^Call with\s*/i, '') || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: '#425B76' }}>{call.meta.phone || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: oCfg.bg, color: oCfg.color }}>
                          {oCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" style={{ color: '#99ACC2' }} />
                          <span className="text-xs" style={{ color: '#516F90' }}>{formatCallDuration(call.meta.duration_seconds || 0)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs truncate" style={{ color: '#7C98B6' }}>{call.meta.notes || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: '#7C98B6' }}>
                          {call.meta.called_at
                            ? new Date(call.meta.called_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                            : new Date(call.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1 rounded hover:bg-[#F0F3F7]">
                          <ChevronDown className="w-4 h-4 transition-transform" style={{ color: '#99ACC2', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && call.meta.notes && (
                      <tr key={`${call.id}-expanded`} style={{ borderTop: '1px solid #F0F3F7', backgroundColor: '#FAFBFC' }}>
                        <td colSpan={8} className="px-14 py-3">
                          <p className="text-xs" style={{ color: '#516F90' }}>{call.meta.notes}</p>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && calls.length > 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10">
                    <p className="text-sm" style={{ color: '#7C98B6' }}>No calls match your search</p>
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
          <div className="bg-white rounded-2xl shadow-2xl w-72 p-6" style={{ border: '1px solid #DFE3EB' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-center mb-4" style={{ color: '#2D3E50' }}>Dialer</h3>
            <div className="bg-[#F6F9FC] rounded-xl px-4 py-3 mb-4 text-center min-h-[52px] flex items-center justify-center">
              <span className="text-lg font-mono font-medium tracking-widest" style={{ color: dialNumber ? '#2D3E50' : '#B0C1D4' }}>
                {dialNumber || 'Enter number'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {dialPadDigits.map((d) => (
                <button
                  key={d}
                  onClick={() => setDialNumber((n) => n + d)}
                  className="h-12 rounded-xl text-sm font-semibold transition-colors hover:bg-[#F0F3F7]"
                  style={{ color: '#2D3E50', border: '1px solid #DFE3EB' }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDialNumber((n) => n.slice(0, -1))}
                className="flex-1 py-2.5 text-sm rounded-xl transition-colors hover:bg-[#F0F3F7]"
                style={{ color: '#7C98B6', border: '1px solid #DFE3EB' }}
              >
                ⌫
              </button>
              <a
                href={dialNumber ? `tel:${dialNumber}` : '#'}
                className="w-14 h-11 rounded-full flex items-center justify-center transition-colors hover:opacity-90"
                style={{ backgroundColor: '#00BDA5' }}
                onClick={() => dialNumber && setShowDialer(false)}
              >
                <Phone className="w-5 h-5 text-white" />
              </a>
              <button
                onClick={() => { setShowDialer(false); setDialNumber(''); }}
                className="flex-1 py-2.5 text-xs rounded-xl transition-colors hover:bg-[#FFF3F0]"
                style={{ color: '#FF7A59', border: '1px solid #DFE3EB' }}
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
