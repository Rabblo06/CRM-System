'use client';

import { useState } from 'react';
import { Plus, Ticket, Search, Filter, ChevronDown, AlertCircle, Clock, CheckCircle2, XCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'open' | 'in_progress' | 'resolved' | 'closed';

interface TicketItem {
  id: string;
  subject: string;
  contact: string;
  company: string;
  status: Status;
  priority: Priority;
  created_at: string;
  updated_at: string;
  description: string;
}

const MOCK_TICKETS: TicketItem[] = [
  { id: 'TKT-001', subject: 'Cannot access dashboard after login', contact: 'Alice Johnson', company: 'TechCorp', status: 'open', priority: 'high', created_at: '2026-03-17', updated_at: '2026-03-18', description: 'User reports being redirected back to login after entering credentials.' },
  { id: 'TKT-002', subject: 'Billing discrepancy on March invoice', contact: 'Bob Smith', company: 'Global Finance', status: 'in_progress', priority: 'urgent', created_at: '2026-03-16', updated_at: '2026-03-18', description: 'Invoice shows double charge for the Enterprise plan add-on.' },
  { id: 'TKT-003', subject: 'Request for HIPAA compliance documentation', contact: 'Carol Williams', company: 'HealthFirst', status: 'open', priority: 'medium', created_at: '2026-03-15', updated_at: '2026-03-16', description: 'Customer requires BAA and security documentation before proceeding.' },
  { id: 'TKT-004', subject: 'CSV import failing for large files', contact: 'David Brown', company: 'EduLearn', status: 'resolved', priority: 'medium', created_at: '2026-03-10', updated_at: '2026-03-14', description: 'Files over 5MB fail silently without error message.' },
  { id: 'TKT-005', subject: 'Feature request: bulk email unsubscribe', contact: 'Eve Davis', company: 'RetailMax', status: 'closed', priority: 'low', created_at: '2026-03-08', updated_at: '2026-03-12', description: 'Request to add bulk unsubscribe management in email settings.' },
  { id: 'TKT-006', subject: 'API rate limit exceeded errors', contact: 'Frank Miller', company: 'DevStudio', status: 'in_progress', priority: 'high', created_at: '2026-03-17', updated_at: '2026-03-18', description: 'Integration hitting 429 errors during peak usage hours.' },
];

const statusConfig: Record<Status, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  open: { label: 'Open', color: '#0091AE', bg: '#E5F5F8', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: '#F5C26B', bg: '#FEF9EE', icon: Clock },
  resolved: { label: 'Resolved', color: '#00BDA5', bg: '#E5F8F6', icon: CheckCircle2 },
  closed: { label: 'Closed', color: '#7C98B6', bg: '#F0F3F7', icon: XCircle },
};

const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: '#7C98B6', bg: '#F0F3F7' },
  medium: { label: 'Medium', color: '#F5C26B', bg: '#FEF9EE' },
  high: { label: 'High', color: '#FF7A59', bg: '#FFF3F0' },
  urgent: { label: 'Urgent', color: '#ffffff', bg: '#FF5A5F' },
};

export default function TicketsPage() {
  const [tickets] = useState<TicketItem[]>(MOCK_TICKETS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  const filtered = tickets.filter(t => {
    const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.contact.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  return (
    <div className="p-6 space-y-5" style={{ backgroundColor: '#F6F9FC', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#2D3E50' }}>Support Tickets</h1>
          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>Track and resolve customer issues</p>
        </div>
        <Button className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          New Ticket
        </Button>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {(Object.keys(statusConfig) as Status[]).map((status) => {
          const cfg = statusConfig[status];
          const Icon = cfg.icon;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className="bg-white border rounded-xl p-4 text-left transition-all hover:shadow-sm"
              style={{ borderColor: statusFilter === status ? cfg.color : '#DFE3EB', borderWidth: statusFilter === status ? 2 : 1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                </div>
                <span className="text-xl font-bold" style={{ color: '#2D3E50' }}>{counts[status]}</span>
              </div>
              <p className="text-xs font-medium" style={{ color: '#516F90' }}>{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#99ACC2' }} />
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: statusFilter === s ? '#2D3E50' : '#ffffff',
                color: statusFilter === s ? '#ffffff' : '#516F90',
                border: '1px solid #DFE3EB',
              }}
            >
              {s === 'all' ? 'All' : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <div className="bg-white border border-[#DFE3EB] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #DFE3EB', backgroundColor: '#F6F9FC' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Subject</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Priority</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#7C98B6' }}>Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((ticket, i) => {
              const sCfg = statusConfig[ticket.status];
              const pCfg = priorityConfig[ticket.priority];
              const StatusIcon = sCfg.icon;
              return (
                <tr
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="cursor-pointer transition-colors hover:bg-[#F6F9FC]"
                  style={{ borderTop: i > 0 ? '1px solid #DFE3EB' : undefined }}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-medium" style={{ color: '#516F90' }}>{ticket.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>{ticket.subject}</p>
                    <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: '#7C98B6' }}>{ticket.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>{ticket.contact}</p>
                    <p className="text-xs" style={{ color: '#7C98B6' }}>{ticket.company}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: pCfg.bg, color: pCfg.color }}
                    >
                      {pCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: sCfg.bg, color: sCfg.color }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {sCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: '#7C98B6' }}>{ticket.updated_at}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1 rounded hover:bg-[#F0F3F7]" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="w-4 h-4" style={{ color: '#99ACC2' }} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Ticket className="w-8 h-8 mx-auto mb-2" style={{ color: '#DFE3EB' }} />
                  <p className="text-sm" style={{ color: '#7C98B6' }}>No tickets found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Ticket detail panel */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedTicket(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" style={{ border: '1px solid #DFE3EB' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-mono text-[#7C98B6] mb-1">{selectedTicket.id}</p>
                <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>{selectedTicket.subject}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-1.5 rounded hover:bg-[#F0F3F7]">
                <XCircle className="w-4 h-4" style={{ color: '#7C98B6' }} />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statusConfig[selectedTicket.status].bg, color: statusConfig[selectedTicket.status].color }}>
                {statusConfig[selectedTicket.status].label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: priorityConfig[selectedTicket.priority].bg, color: priorityConfig[selectedTicket.priority].color }}>
                {priorityConfig[selectedTicket.priority].label} Priority
              </span>
            </div>
            <p className="text-sm mb-4" style={{ color: '#516F90' }}>{selectedTicket.description}</p>
            <div className="border-t pt-4 space-y-2" style={{ borderColor: '#DFE3EB' }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#7C98B6' }}>Contact</span>
                <span style={{ color: '#2D3E50' }}>{selectedTicket.contact} · {selectedTicket.company}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#7C98B6' }}>Created</span>
                <span style={{ color: '#2D3E50' }}>{selectedTicket.created_at}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#7C98B6' }}>Last updated</span>
                <span style={{ color: '#2D3E50' }}>{selectedTicket.updated_at}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button className="flex-1 text-xs" size="sm">Assign to me</Button>
              <Button variant="outline" className="text-xs" size="sm" onClick={() => setSelectedTicket(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
