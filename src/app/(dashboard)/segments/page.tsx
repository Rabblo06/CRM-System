'use client';

import { useState } from 'react';
import { Plus, Filter, Users, Zap, Edit2, Trash2, Play, MoreHorizontal, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SegmentType = 'static' | 'dynamic';

interface Segment {
  id: string;
  name: string;
  description: string;
  type: SegmentType;
  count: number;
  filters: string[];
  created_at: string;
  updated_at: string;
  color: string;
}

const MOCK_SEGMENTS: Segment[] = [
  {
    id: 'seg-1', name: 'Hot Leads', description: 'Contacts with high engagement in the last 30 days',
    type: 'dynamic', count: 47, filters: ['Lead status = Hot', 'Last activity < 30 days', 'Email opened ≥ 3'],
    created_at: '2026-02-01', updated_at: '2026-03-18', color: '#FF7A59',
  },
  {
    id: 'seg-2', name: 'Enterprise Prospects', description: 'Companies with 500+ employees evaluating enterprise plans',
    type: 'dynamic', count: 23, filters: ['Company size ≥ 500', 'Lifecycle = Opportunity', 'Deal stage = Proposal'],
    created_at: '2026-02-10', updated_at: '2026-03-17', color: '#0091AE',
  },
  {
    id: 'seg-3', name: 'Q1 Webinar Attendees', description: 'Contacts who attended the March product webinar',
    type: 'static', count: 134, filters: ['Event = Q1 Webinar 2026', 'Attended = true'],
    created_at: '2026-03-05', updated_at: '2026-03-05', color: '#00BDA5',
  },
  {
    id: 'seg-4', name: 'At-Risk Customers', description: 'Active customers with no activity in 60+ days',
    type: 'dynamic', count: 12, filters: ['Lifecycle = Customer', 'Last activity > 60 days', 'NPS < 7'],
    created_at: '2026-01-15', updated_at: '2026-03-18', color: '#F5C26B',
  },
  {
    id: 'seg-5', name: 'SaaS / Tech Vertical', description: 'All contacts from tech and SaaS companies',
    type: 'dynamic', count: 89, filters: ['Industry = Technology', 'Industry = SaaS'],
    created_at: '2026-01-20', updated_at: '2026-03-10', color: '#425B76',
  },
  {
    id: 'seg-6', name: 'Trial Conversion Targets', description: 'Trial users approaching the end of their 14-day window',
    type: 'dynamic', count: 18, filters: ['Lifecycle = Trial', 'Trial days remaining < 5'],
    created_at: '2026-03-01', updated_at: '2026-03-18', color: '#FF5A5F',
  },
];

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>(MOCK_SEGMENTS);
  const [typeFilter, setTypeFilter] = useState<'all' | SegmentType>('all');

  const filtered = typeFilter === 'all' ? segments : segments.filter(s => s.type === typeFilter);

  const totalContacts = segments.reduce((sum, s) => sum + s.count, 0);
  const dynamicCount = segments.filter(s => s.type === 'dynamic').length;
  const staticCount = segments.filter(s => s.type === 'static').length;

  return (
    <div className="p-6 space-y-5" style={{ backgroundColor: '#F6F9FC', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#2D3E50' }}>Segments (Lists)</h1>
          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>Group contacts with smart filters or static lists</p>
        </div>
        <Button className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          New Segment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Segments', value: String(segments.length), icon: Filter, color: '#0091AE', bg: '#E5F5F8' },
          { label: 'Dynamic Segments', value: String(dynamicCount), icon: Zap, color: '#FF7A59', bg: '#FFF3F0' },
          { label: 'Total Contacts', value: totalContacts.toLocaleString(), icon: Users, color: '#00BDA5', bg: '#E5F8F6' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-[#DFE3EB] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stat.bg }}>
                <Icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: '#2D3E50' }}>{stat.value}</p>
                <p className="text-xs" style={{ color: '#7C98B6' }}>{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        {(['all', 'dynamic', 'static'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: typeFilter === t ? '#2D3E50' : '#ffffff',
              color: typeFilter === t ? '#ffffff' : '#516F90',
              border: '1px solid #DFE3EB',
            }}
          >
            {t === 'dynamic' && <Zap className="w-3 h-3" />}
            {t === 'static' && <Filter className="w-3 h-3" />}
            {t === 'all' ? 'All Segments' : t === 'dynamic' ? `Dynamic (${dynamicCount})` : `Static (${staticCount})`}
          </button>
        ))}
      </div>

      {/* Segment cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((segment) => (
          <div key={segment.id} className="bg-white border border-[#DFE3EB] rounded-xl p-5 hover:shadow-sm transition-shadow group">
            {/* Card header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${segment.color}18` }}>
                  {segment.type === 'dynamic'
                    ? <Zap className="w-4 h-4" style={{ color: segment.color }} />
                    : <Filter className="w-4 h-4" style={{ color: segment.color }} />
                  }
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>{segment.name}</h3>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: segment.type === 'dynamic' ? '#FFF3F0' : '#F0F3F7',
                      color: segment.type === 'dynamic' ? '#FF7A59' : '#7C98B6',
                    }}
                  >
                    {segment.type === 'dynamic' ? 'Dynamic' : 'Static'}
                  </span>
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#F0F3F7] transition-all">
                <MoreHorizontal className="w-4 h-4" style={{ color: '#99ACC2' }} />
              </button>
            </div>

            <p className="text-xs mb-3" style={{ color: '#7C98B6' }}>{segment.description}</p>

            {/* Filters */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {segment.filters.map((f, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: '#F6F9FC', color: '#425B76', border: '1px solid #DFE3EB' }}>
                  {f}
                </span>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#DFE3EB' }}>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" style={{ color: '#7C98B6' }} />
                <span className="text-xs font-semibold" style={{ color: '#2D3E50' }}>{segment.count.toLocaleString()}</span>
                <span className="text-xs" style={{ color: '#7C98B6' }}>contacts</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded hover:bg-[#F0F3F7] transition-colors" title="Edit">
                  <Edit2 className="w-3 h-3" style={{ color: '#7C98B6' }} />
                </button>
                {segment.type === 'dynamic' && (
                  <button className="p-1.5 rounded hover:bg-[#F0F3F7] transition-colors" title="Refresh">
                    <RefreshCw className="w-3 h-3" style={{ color: '#7C98B6' }} />
                  </button>
                )}
                <button className="p-1.5 rounded hover:bg-[#FFF3F0] transition-colors" title="Send campaign">
                  <Play className="w-3 h-3" style={{ color: '#FF7A59' }} />
                </button>
                <button
                  onClick={() => setSegments(prev => prev.filter(s => s.id !== segment.id))}
                  className="p-1.5 rounded hover:bg-[#FFF3F0] transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" style={{ color: '#FF7A59' }} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* New segment CTA card */}
        <button
          className="border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-colors hover:border-[#FF7A59] hover:bg-[#FFF3F0] group"
          style={{ borderColor: '#DFE3EB', minHeight: 200 }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: '#F0F3F7' }}>
            <Plus className="w-5 h-5" style={{ color: '#7C98B6' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: '#425B76' }}>Create a Segment</p>
            <p className="text-xs mt-1" style={{ color: '#99ACC2' }}>Group contacts by filters or manually</p>
          </div>
        </button>
      </div>
    </div>
  );
}
