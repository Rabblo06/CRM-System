'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Building2,
  Globe,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  Upload,
  Phone,
  UserCircle,
  ListPlus,
  ArrowRight,
  Link2,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanies } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { INDUSTRIES, COMPANY_SIZES } from '@/lib/constants';
import type { Company } from '@/types';

const VIEW_TABS = [
  { id: 'all', label: 'All companies' },
  { id: 'my', label: 'My companies' },
  { id: 'customers', label: 'Customers' },
];

type SortKey = 'name' | 'industry' | 'size' | 'city' | 'annual_revenue' | 'created_at' | 'phone';

function formatDate(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
  return `${date} ${time} GMT`;
}
type SortDir = 'asc' | 'desc';

function CompanyForm({
  open,
  onClose,
  onSubmit,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Company>) => Promise<void>;
  initialData?: Partial<Company>;
}) {
  const [form, setForm] = useState({
    name: initialData?.name || '',
    industry: initialData?.industry || '',
    size: initialData?.size || '',
    website: initialData?.website || '',
    phone: initialData?.phone || '',
    city: initialData?.city || '',
    country: initialData?.country || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit company' : 'Create company'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-[#516F90]">Company name <span className="text-red-400">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Acme Inc."
              required
              className="h-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#516F90]">Industry</Label>
              <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#516F90]">Company size</Label>
              <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#516F90]">Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#516F90]">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#516F90]">City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="San Francisco"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#516F90]">Country</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="USA"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Saving...' : initialData?.id ? 'Save changes' : 'Create company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CompaniesPage() {
  const { companies, loading, createCompany, updateCompany, deleteCompany } = useCompanies();
  const [activeTab, setActiveTab] = useState('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => { if (user) setCurrentUserId(user.id); })
      .catch(() => {});
  }, []);

  const filtered = companies
    .filter((c) => {
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'my' && currentUserId && c.created_by === currentUserId);

      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesIndustry = !filterIndustry || c.industry === filterIndustry;
      const matchesSize = !filterSize || c.size === filterSize;

      return matchesTab && matchesSearch && matchesIndustry && matchesSize;
    })
    .sort((a, b) => {
      if (sortKey === 'annual_revenue') {
        return sortDir === 'asc'
          ? (a.annual_revenue || 0) - (b.annual_revenue || 0)
          : (b.annual_revenue || 0) - (a.annual_revenue || 0);
      }
      const aVal = (a[sortKey as keyof Company] as string) || '';
      const bVal = (b[sortKey as keyof Company] as string) || '';
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleAll = () => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((c) => c.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const hasFilters = filterIndustry || filterSize;

  // Inline cell editing
  const [editingCell, setEditingCell] = useState<{ id: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const cellInputRef = useRef<HTMLInputElement>(null);
  // Owner names stored locally per company (must be before callbacks that use it)
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const EDITABLE_COLS = new Set(['phone', 'city', 'country', 'industry', 'owner']);

  useEffect(() => {
    if (editingCell) cellInputRef.current?.focus();
  }, [editingCell]);

  const startCellEdit = useCallback((company: Company, col: string) => {
    if (!EDITABLE_COLS.has(col)) return;
    const raw: Record<string, string | undefined> = {
      phone: company.phone,
      city: company.city,
      country: company.country,
      industry: company.industry,
      owner: ownerNames[company.id] || 'Account Owner',
    };
    setEditValue(raw[col] || '');
    setEditingCell({ id: company.id, col });
  }, [ownerNames]);

  const commitCellEdit = useCallback(async (company: Company, col: string) => {
    if (col === 'owner') {
      setOwnerNames(prev => ({ ...prev, [company.id]: editValue.trim() || 'Account Owner' }));
    } else {
      const fieldMap: Record<string, keyof Company> = {
        phone: 'phone', city: 'city', country: 'country', industry: 'industry',
      };
      const field = fieldMap[col];
      if (field) await updateCompany(company.id, { [field]: editValue.trim() || undefined } as Partial<Company>);
    }
    setEditingCell(null);
  }, [editValue, updateCompany]);

  const cancelCellEdit = useCallback(() => setEditingCell(null), []);

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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#2D3E50]">Companies</h1>
          <p className="text-sm text-[#516F90] mt-0.5">{companies.length} total companies</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                Actions <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export companies</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-400 focus:text-red-400">Delete selected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="/import"><Upload className="w-3.5 h-3.5" /> Import</a>
          </Button>

          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create company
          </Button>
        </div>
      </div>

      <div className="flex gap-0">
        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-[#DFE3EB] overflow-x-auto">
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
          </div>

          {/* Bulk action bar - shown when rows selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center border-b border-[#DFE3EB] bg-white px-3 py-2 text-xs overflow-x-auto">
              <span className="font-semibold text-[#2D3E50] mr-3 whitespace-nowrap">
                {selectedIds.size} {selectedIds.size === 1 ? 'company' : 'companies'} selected
              </span>
              <div className="w-px h-4 bg-[#DFE3EB] mr-3 flex-shrink-0" />
              {([
                { icon: ArrowRight, label: 'Assign' },
                { icon: Edit, label: 'Edit' },
                { icon: Link2, label: 'Review Associations' },
                { icon: CheckSquare, label: 'Create tasks' },
                { icon: ListPlus, label: 'Add to static segment' },
              ] as const).map(({ icon: Icon, label }) => (
                <button key={label} className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-[#F0F3F7] text-[#516F90] hover:text-[#2D3E50] transition-colors whitespace-nowrap mr-0.5">
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
              <button
                onClick={() => { selectedIds.forEach((id) => deleteCompany(id)); setSelectedIds(new Set()); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-[#FFF3F0] text-[#516F90] hover:text-red-500 transition-colors whitespace-nowrap mr-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />Delete
              </button>
              <div className="flex-1" />
              <button onClick={() => setSelectedIds(new Set())} className="p-1 rounded hover:bg-[#F0F3F7] text-[#7C98B6]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className={`flex items-center gap-2 py-3 ${selectedIds.size > 0 ? 'hidden' : ''}`}>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C98B6]" />
              <Input
                placeholder="Search companies..."
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
                <span className="bg-[#FF7A59] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {[filterIndustry, filterSize].filter(Boolean).length}
                </span>
              )}
            </Button>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[#DFE3EB]">
                <span className="text-xs text-[#516F90]">{selectedIds.size} selected</span>
                <button onClick={() => setSelectedIds(new Set())} className="text-[#7C98B6] hover:text-[#2D3E50]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="ml-auto text-xs text-[#7C98B6]">{filtered.length} companies</div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <div className="rounded-lg border border-[#DFE3EB] overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#DFE3EB] bg-[#F0F3F7]">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === paginated.length && paginated.length > 0}
                        onChange={toggleAll}
                        className="rounded border-[#CBD6E2] bg-[#F0F3F7] text-[#FF7A59]"
                      />
                    </th>
                    <th className="text-left px-3 py-3 text-[#516F90] font-medium text-xs cursor-pointer group whitespace-nowrap" onClick={() => toggleSort('name')}>
                      <div className="flex items-center gap-1">Company name <SortIcon col="name" /></div>
                    </th>
                    <th className="text-left px-3 py-3 text-[#516F90] font-medium text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1"><UserCircle className="w-3.5 h-3.5" /> Company owner</div>
                    </th>
                    <th className="text-left px-3 py-3 text-[#516F90] font-medium text-xs cursor-pointer group whitespace-nowrap" onClick={() => toggleSort('created_at')}>
                      <div className="flex items-center gap-1">Create Date (GMT) <SortIcon col="created_at" /></div>
                    </th>
                    <th className="text-left px-3 py-3 text-[#516F90] font-medium text-xs cursor-pointer group whitespace-nowrap" onClick={() => toggleSort('phone')}>
                      <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number <SortIcon col="phone" /></div>
                    </th>
                    <th className="text-left px-3 py-3 text-[#516F90] font-medium text-xs cursor-pointer group whitespace-nowrap" onClick={() => toggleSort('updated_at' as SortKey)}>
                      <div className="flex items-center gap-1">Last Activity Date (GMT) <SortIcon col={'updated_at' as SortKey} /></div>
                    </th>
                    <th className="text-left px-3 py-3 text-[#516F90] font-medium text-xs cursor-pointer group whitespace-nowrap hidden md:table-cell" onClick={() => toggleSort('city')}>
                      <div className="flex items-center gap-1">City <SortIcon col="city" /></div>
                    </th>
                    <th className="text-left px-3 py-3 text-[#516F90] font-medium text-xs whitespace-nowrap hidden md:table-cell">
                      Country/Region
                    </th>
                    <th className="text-left px-3 py-3 text-[#516F90] font-medium text-xs cursor-pointer group whitespace-nowrap hidden lg:table-cell" onClick={() => toggleSort('industry')}>
                      <div className="flex items-center gap-1">Industry <SortIcon col="industry" /></div>
                    </th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFE3EB]">
                  {paginated.map((company) => (
                    <tr
                      key={company.id}
                      className={`hover:bg-[#F0F3F7] transition-colors group ${
                        selectedIds.has(company.id) ? 'bg-[#FFF3F0]' : ''
                      }`}
                    >
                      <td className="px-3 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(company.id)}
                          onChange={() => toggleOne(company.id)}
                          className="rounded border-[#CBD6E2] bg-[#F0F3F7] text-[#FF7A59]"
                        />
                      </td>
                      {/* Company name */}
                      <td className="px-3 py-3.5 min-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          {company.domain ? (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=64`}
                              alt={company.name}
                              className="w-8 h-8 rounded-lg object-contain bg-gray-50 flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.removeProperty('display');
                              }}
                            />
                          ) : null}
                          <div
                            className="w-8 h-8 bg-[#FFF3F0] rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ display: company.domain ? 'none' : 'flex' }}
                          >
                            <Building2 className="w-4 h-4 text-[#FF7A59]" />
                          </div>
                          <div>
                            <Link
                              href={`/companies/${company.id}`}
                              className="font-medium text-[#2D3E50] hover:text-[#FF7A59] transition-colors text-sm"
                            >
                              {company.name}
                            </Link>
                            {company.domain && (
                              <p className="text-xs text-[#7C98B6]">{company.domain}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Company owner */}
                      {(() => {
                        const isActive = editingCell?.id === company.id && editingCell?.col === 'owner';
                        const ownerName = ownerNames[company.id] || 'Account Owner';
                        return (
                          <td
                            className="min-w-[150px] relative"
                            style={{ padding: isActive ? 0 : undefined, outline: isActive ? '2px solid #3b82f6' : undefined, outlineOffset: isActive ? '-2px' : undefined }}
                            onClick={() => { if (!isActive) startCellEdit(company, 'owner'); }}
                          >
                            {isActive ? (
                              <input ref={cellInputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
                                onBlur={() => commitCellEdit(company, 'owner')}
                                onKeyDown={e => { if (e.key === 'Enter') commitCellEdit(company, 'owner'); if (e.key === 'Escape') cancelCellEdit(); }}
                                className="w-full px-3 py-3.5 text-xs outline-none bg-white" />
                            ) : (
                              <span className="flex items-center gap-1.5 px-3 py-3.5 cursor-text hover:bg-[#f0f7ff]">
                                <div className="w-5 h-5 rounded-full bg-[#FF7A59] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {ownerName[0]?.toUpperCase() || 'A'}
                                </div>
                                <span className="text-xs text-[#516F90]">{ownerName}</span>
                              </span>
                            )}
                          </td>
                        );
                      })()}
                      {/* Create date */}
                      <td className="px-3 py-3.5 min-w-[130px]">
                        <span className="text-xs text-[#516F90]">{formatDate(company.created_at)}</span>
                      </td>
                      {/* Phone */}
                      {(() => {
                        const isActive = editingCell?.id === company.id && editingCell?.col === 'phone';
                        return (
                          <td
                            className="min-w-[150px] relative"
                            style={{ padding: isActive ? 0 : undefined, outline: isActive ? '2px solid #3b82f6' : undefined, outlineOffset: isActive ? '-2px' : undefined }}
                            onClick={() => { if (!isActive) startCellEdit(company, 'phone'); }}
                          >
                            {isActive ? (
                              <input ref={cellInputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
                                onBlur={() => commitCellEdit(company, 'phone')}
                                onKeyDown={e => { if (e.key === 'Enter') commitCellEdit(company, 'phone'); if (e.key === 'Escape') cancelCellEdit(); }}
                                className="w-full px-3 py-3.5 text-xs outline-none bg-white" />
                            ) : (
                              <span className="block px-3 py-3.5 cursor-text hover:bg-[#f0f7ff]">
                                {company.phone ? (
                                  <span className="text-xs text-[#0091AE] flex items-center gap-1"><Phone className="w-3 h-3" />{company.phone}</span>
                                ) : <span className="text-xs text-[#99ACC2]">-</span>}
                              </span>
                            )}
                          </td>
                        );
                      })()}
                      {/* Last Activity Date */}
                      <td className="px-3 py-3.5 min-w-[160px]">
                        <span className="text-xs text-[#516F90]">{formatDate(company.updated_at)}</span>
                      </td>
                      {/* City */}
                      {(() => {
                        const isActive = editingCell?.id === company.id && editingCell?.col === 'city';
                        return (
                          <td
                            className="hidden md:table-cell min-w-[110px] relative"
                            style={{ padding: isActive ? 0 : undefined, outline: isActive ? '2px solid #3b82f6' : undefined, outlineOffset: isActive ? '-2px' : undefined }}
                            onClick={() => { if (!isActive) startCellEdit(company, 'city'); }}
                          >
                            {isActive ? (
                              <input ref={cellInputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
                                onBlur={() => commitCellEdit(company, 'city')}
                                onKeyDown={e => { if (e.key === 'Enter') commitCellEdit(company, 'city'); if (e.key === 'Escape') cancelCellEdit(); }}
                                className="w-full px-3 py-3.5 text-xs outline-none bg-white" />
                            ) : (
                              <span className="block px-3 py-3.5 text-xs text-[#516F90] cursor-text hover:bg-[#f0f7ff]">{company.city || '-'}</span>
                            )}
                          </td>
                        );
                      })()}
                      {/* Country/Region */}
                      {(() => {
                        const isActive = editingCell?.id === company.id && editingCell?.col === 'country';
                        return (
                          <td
                            className="hidden md:table-cell min-w-[130px] relative"
                            style={{ padding: isActive ? 0 : undefined, outline: isActive ? '2px solid #3b82f6' : undefined, outlineOffset: isActive ? '-2px' : undefined }}
                            onClick={() => { if (!isActive) startCellEdit(company, 'country'); }}
                          >
                            {isActive ? (
                              <input ref={cellInputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
                                onBlur={() => commitCellEdit(company, 'country')}
                                onKeyDown={e => { if (e.key === 'Enter') commitCellEdit(company, 'country'); if (e.key === 'Escape') cancelCellEdit(); }}
                                className="w-full px-3 py-3.5 text-xs outline-none bg-white" />
                            ) : (
                              <span className="block px-3 py-3.5 text-xs text-[#516F90] cursor-text hover:bg-[#f0f7ff]">{company.country || '-'}</span>
                            )}
                          </td>
                        );
                      })()}
                      {/* Industry */}
                      {(() => {
                        const isActive = editingCell?.id === company.id && editingCell?.col === 'industry';
                        return (
                          <td
                            className="hidden lg:table-cell min-w-[130px] relative"
                            style={{ padding: isActive ? 0 : undefined, outline: isActive ? '2px solid #3b82f6' : undefined, outlineOffset: isActive ? '-2px' : undefined }}
                            onClick={() => { if (!isActive) startCellEdit(company, 'industry'); }}
                          >
                            {isActive ? (
                              <input ref={cellInputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
                                onBlur={() => commitCellEdit(company, 'industry')}
                                onKeyDown={e => { if (e.key === 'Enter') commitCellEdit(company, 'industry'); if (e.key === 'Escape') cancelCellEdit(); }}
                                className="w-full px-3 py-3.5 text-xs outline-none bg-white" />
                            ) : (
                              <span className="block px-3 py-3.5 cursor-text hover:bg-[#f0f7ff]">
                                {company.industry
                                  ? <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF0F5] text-[#425B76]">{company.industry}</span>
                                  : <span className="text-xs text-[#99ACC2]">-</span>}
                              </span>
                            )}
                          </td>
                        );
                      })()}
                      <td className="px-3 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/companies/${company.id}`}>View details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingCompany(company); setShowForm(true); }}>
                              <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deleteCompany(company.id)} className="text-red-400 focus:text-red-400">
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {paginated.length === 0 && (
                <div className="text-center py-16 text-[#7C98B6]">
                  <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No companies found</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-xs text-[#7C98B6]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span>
                {filtered.length === 0
                  ? '0 of 0'
                  : `${(page - 1) * perPage + 1}-${Math.min(page * perPage, filtered.length)} of ${filtered.length}`}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="w-64 ml-4 flex-shrink-0 bg-white border border-[#DFE3EB] rounded-lg p-4 h-fit sticky top-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#2D3E50]">Filters</h3>
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <button onClick={() => { setFilterIndustry(''); setFilterSize(''); }} className="text-xs text-[#FF7A59]">
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
                <label className="text-xs font-medium text-[#516F90] mb-1.5 block">Industry</label>
                <Select value={filterIndustry || 'all'} onValueChange={(v) => setFilterIndustry(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any industry</SelectItem>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#516F90] mb-1.5 block">Company size</label>
                <Select value={filterSize || 'all'} onValueChange={(v) => setFilterSize(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any size</SelectItem>
                    {COMPANY_SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      <CompanyForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingCompany(null); }}
        onSubmit={async (data) => {
          if (editingCompany) await updateCompany(editingCompany.id, data);
          else await createCompany(data);
        }}
        initialData={editingCompany || undefined}
      />
    </div>
  );
}
