'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Edit,
  Trash2,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getInitials, getLeadStatusColor } from '@/lib/utils';
import { LIFECYCLE_STAGES } from '@/lib/constants';
import type { Contact } from '@/types';

const VIEW_TABS = [
  { id: 'all', label: 'All contacts' },
  { id: 'my', label: 'My contacts' },
  { id: 'newsletter', label: 'Newsletter subscribers' },
  { id: 'unsubscribed', label: 'Unsubscribed' },
  { id: 'customers', label: 'All customers' },
];

type SortKey = 'name' | 'company' | 'lead_status' | 'lifecycle_stage' | 'created_at';
type SortDir = 'asc' | 'desc';

interface ContactListProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
}

export function ContactList({ contacts, onEdit, onDelete }: ContactListProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLifecycle, setFilterLifecycle] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = contacts
    .filter((c) => {
      const matchesSearch =
        !searchQuery ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.job_title?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'my') ||
        (activeTab === 'customers' && c.lifecycle_stage === 'customer') ||
        (activeTab === 'newsletter') ||
        (activeTab === 'unsubscribed');

      const matchesStatus = !filterStatus || c.lead_status === filterStatus;
      const matchesLifecycle = !filterLifecycle || c.lifecycle_stage === filterLifecycle;
      const matchesCountry = !filterCountry || c.country?.toLowerCase().includes(filterCountry.toLowerCase());

      return matchesSearch && matchesTab && matchesStatus && matchesLifecycle && matchesCountry;
    })
    .sort((a, b) => {
      let aVal = '';
      let bVal = '';
      if (sortKey === 'name') {
        aVal = `${a.first_name} ${a.last_name}`;
        bVal = `${b.first_name} ${b.last_name}`;
      } else if (sortKey === 'company') {
        aVal = a.company?.name || '';
        bVal = b.company?.name || '';
      } else if (sortKey === 'lead_status') {
        aVal = a.lead_status;
        bVal = b.lead_status;
      } else if (sortKey === 'lifecycle_stage') {
        aVal = a.lifecycle_stage;
        bVal = b.lifecycle_stage;
      } else {
        aVal = a.created_at;
        bVal = b.created_at;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((c) => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearFilters = () => {
    setFilterStatus('');
    setFilterLifecycle('');
    setFilterCountry('');
  };

  const hasFilters = filterStatus || filterLifecycle || filterCountry;

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5 text-[#FF7A59]" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-[#FF7A59]" />
      )
    ) : (
      <ArrowUpDown className="w-3.5 h-3.5 text-[#99ACC2] opacity-0 group-hover:opacity-100" />
    );

  return (
    <div className="flex gap-0">
      {/* Main Table Area */}
      <div className="flex-1 min-w-0">
        {/* View Tabs */}
        <div className="flex items-center gap-0 border-b border-[#DFE3EB] mb-0 overflow-x-auto">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#FF7A59] text-[#2D3E50]'
                  : 'border-transparent text-[#516F90] hover:text-[#2D3E50] hover:border-[#DFE3EB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 px-3 py-2">
            <button className="text-xs text-[#FF7A59] hover:text-[#425B76] font-medium px-2">
              + Add view
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 py-3 px-0.5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C98B6]" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-1.5 h-8 text-xs ${showFilters ? 'bg-[#FFF3F0] border-[#FF7A59] text-[#FF7A59]' : ''}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {hasFilters && (
              <span className="bg-[#FF7A59] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {[filterStatus, filterLifecycle, filterCountry].filter(Boolean).length}
              </span>
            )}
          </Button>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[#DFE3EB]">
              <span className="text-xs text-[#516F90]">{selectedIds.size} selected</span>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Mail className="w-3 h-3" /> Email
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10">
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[#7C98B6] hover:text-[#2D3E50]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-[#7C98B6]">{filtered.length} contacts</span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-[#DFE3EB] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#DFE3EB] bg-[#F0F3F7]">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                    className="rounded border-[#CBD6E2] bg-[#F0F3F7] text-[#FF7A59] focus:ring-[#FF7A59] focus:ring-offset-0"
                  />
                </th>
                <th
                  className="text-left px-3 py-3 text-[#516F90] font-medium text-xs cursor-pointer group"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name <SortIcon col="name" />
                  </div>
                </th>
                <th
                  className="text-left px-3 py-3 text-[#516F90] font-medium text-xs cursor-pointer group hidden md:table-cell"
                  onClick={() => toggleSort('company')}
                >
                  <div className="flex items-center gap-1">
                    Company <SortIcon col="company" />
                  </div>
                </th>
                <th className="text-left px-3 py-3 text-[#516F90] font-medium text-xs hidden lg:table-cell">
                  Contact info
                </th>
                <th
                  className="text-left px-3 py-3 text-[#516F90] font-medium text-xs cursor-pointer group"
                  onClick={() => toggleSort('lead_status')}
                >
                  <div className="flex items-center gap-1">
                    Lead status <SortIcon col="lead_status" />
                  </div>
                </th>
                <th
                  className="text-left px-3 py-3 text-[#516F90] font-medium text-xs cursor-pointer group hidden xl:table-cell"
                  onClick={() => toggleSort('lifecycle_stage')}
                >
                  <div className="flex items-center gap-1">
                    Lifecycle stage <SortIcon col="lifecycle_stage" />
                  </div>
                </th>
                <th className="text-left px-3 py-3 text-[#516F90] font-medium text-xs hidden xl:table-cell">
                  Location
                </th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE3EB]">
              {paginated.map((contact) => (
                <tr
                  key={contact.id}
                  className={`hover:bg-[#F0F3F7] transition-colors group ${
                    selectedIds.has(contact.id) ? 'bg-[#FFF3F0]' : ''
                  }`}
                >
                  <td className="px-3 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => toggleOne(contact.id)}
                      className="rounded border-[#CBD6E2] bg-[#F0F3F7] text-[#FF7A59] focus:ring-[#FF7A59] focus:ring-offset-0"
                    />
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-[#FFF3F0] text-[#FF7A59]">
                          {getInitials(`${contact.first_name} ${contact.last_name}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="font-medium text-[#2D3E50] hover:text-[#FF7A59] transition-colors text-sm"
                        >
                          {contact.first_name} {contact.last_name}
                        </Link>
                        {contact.job_title && (
                          <p className="text-xs text-[#7C98B6] truncate max-w-[180px]">{contact.job_title}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 hidden md:table-cell">
                    {contact.company ? (
                      <Link
                        href={`/companies/${contact.company_id}`}
                        className="flex items-center gap-1.5 text-[#516F90] hover:text-[#FF7A59] text-sm"
                      >
                        <Building2 className="w-3.5 h-3.5 text-[#7C98B6] flex-shrink-0" />
                        <span className="truncate max-w-[160px]">{contact.company.name}</span>
                      </Link>
                    ) : (
                      <span className="text-[#99ACC2] text-sm">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 hidden lg:table-cell">
                    <div className="space-y-0.5">
                      {contact.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-[#7C98B6] flex-shrink-0" />
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-xs text-[#516F90] hover:text-[#FF7A59] truncate max-w-[180px]"
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#7C98B6] flex-shrink-0" />
                          <span className="text-xs text-[#516F90]">{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLeadStatusColor(contact.lead_status)}`}
                    >
                      {contact.lead_status.charAt(0).toUpperCase() + contact.lead_status.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 hidden xl:table-cell">
                    <span className="text-xs text-[#516F90]">
                      {LIFECYCLE_STAGES.find((s) => s.value === contact.lifecycle_stage)?.label || contact.lifecycle_stage}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 hidden xl:table-cell">
                    <span className="text-xs text-[#7C98B6]">
                      {[contact.city, contact.country].filter(Boolean).join(', ') || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/contacts/${contact.id}`}>View details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(contact)}>
                          <Edit className="w-3.5 h-3.5 mr-2" /> Edit properties
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(contact.id)}
                          className="text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paginated.length === 0 && (
            <div className="text-center py-16 text-[#7C98B6]">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No contacts found</p>
              {(searchQuery || hasFilters) && (
                <button
                  onClick={() => { setSearchQuery(''); clearFilters(); }}
                  className="text-xs text-[#FF7A59] mt-2 hover:text-[#425B76]"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs text-[#7C98B6]">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span>
              {filtered.length === 0
                ? '0 of 0'
                : `${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)} of ${filtered.length}`}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronDown className="w-3.5 h-3.5 rotate-90" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="w-72 ml-4 flex-shrink-0 bg-white border border-[#DFE3EB] rounded-lg p-4 h-fit sticky top-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#2D3E50]">Filters</h3>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-[#FF7A59] hover:text-[#425B76]">
                  Clear all
                </button>
              )}
              <button onClick={() => setShowFilters(false)} className="text-[#516F90] hover:text-[#2D3E50]">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#516F90] mb-1.5 block">Lead status</label>
              <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#516F90] mb-1.5 block">Lifecycle stage</label>
              <Select value={filterLifecycle || 'all'} onValueChange={(v) => setFilterLifecycle(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Any stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any stage</SelectItem>
                  {LIFECYCLE_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#516F90] mb-1.5 block">Country</label>
              <Input
                placeholder="Filter by country..."
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {hasFilters && (
            <div className="mt-4 pt-4 border-t border-[#DFE3EB] space-y-1.5">
              <p className="text-xs text-[#7C98B6] mb-2">Active filters:</p>
              {filterStatus && (
                <div className="flex items-center gap-1.5 bg-[#FFF3F0] border border-[#FF7A59]/30 rounded px-2 py-1">
                  <span className="text-xs text-[#FF7A59]">Status: {filterStatus}</span>
                  <button onClick={() => setFilterStatus('')} className="ml-auto text-[#FF7A59]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {filterLifecycle && (
                <div className="flex items-center gap-1.5 bg-[#FFF3F0] border border-[#FF7A59]/30 rounded px-2 py-1">
                  <span className="text-xs text-[#FF7A59]">Stage: {filterLifecycle}</span>
                  <button onClick={() => setFilterLifecycle('')} className="ml-auto text-[#FF7A59]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {filterCountry && (
                <div className="flex items-center gap-1.5 bg-[#FFF3F0] border border-[#FF7A59]/30 rounded px-2 py-1">
                  <span className="text-xs text-[#FF7A59]">Country: {filterCountry}</span>
                  <button onClick={() => setFilterCountry('')} className="ml-auto text-[#FF7A59]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

