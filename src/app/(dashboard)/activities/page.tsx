'use client';

import { useState } from 'react';
import { Phone, Mail, Calendar, FileText, CheckSquare, TrendingUp, Users, Filter, StickyNote } from 'lucide-react';
import { TwentyPageLayout } from '@/components/layout/TwentyPageLayout';
import { useActivities } from '@/hooks/useData';
import { formatRelativeTime, formatDateTime } from '@/lib/utils';
import type { Activity } from '@/types';

const activityIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckSquare,
  deal_created: TrendingUp,
  deal_updated: TrendingUp,
  contact_created: Users,
};

const activityColors: Record<string, string> = {
  call: 'text-green-400 bg-green-400/10 border-green-400/20',
  email: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  meeting: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  note: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  task: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  deal_created: 'text-[#4762D5] bg-[#EEF0FB] border-[#4762D5]/20',
  deal_updated: 'text-[#4762D5] bg-[#EEF0FB] border-[#4762D5]/20',
  contact_created: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
};

const activityTypeLabels: Record<string, string> = {
  call: 'Phone Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  task: 'Task',
  deal_created: 'Deal Created',
  deal_updated: 'Deal Updated',
  contact_created: 'Contact Created',
};

export default function ActivitiesPage() {
  const { activities, loading } = useActivities();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const typeOptions = [
    { value: 'all', label: 'All' },
    { value: 'call', label: 'Calls' },
    { value: 'email', label: 'Emails' },
    { value: 'meeting', label: 'Meetings' },
    { value: 'note', label: 'Notes' },
    { value: 'task', label: 'Tasks' },
  ];

  const filtered = activities.filter(
    (a) => typeFilter === 'all' || a.type === typeFilter
  );

  return (
    <TwentyPageLayout
      icon={<StickyNote size={15} style={{ color: '#0891B2' }} />}
      title="Notes"
      viewCount={activities.length}
    >
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[#999999]" />
        <div className="flex gap-1.5">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === opt.value
                  ? 'bg-[#4762D5] text-[#333333]'
                  : 'bg-[#F1F1F1] text-[#666666] hover:bg-[#F1F1F1] hover:text-[#333333]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((activity) => {
            const Icon = activityIcons[activity.type] || FileText;
            const colorClass = activityColors[activity.type] || 'text-[#666666] bg-[#F1F1F1] border-[#EBEBEB]';

            return (
              <div
                key={activity.id}
                className="bg-white border border-[#EBEBEB] rounded-xl p-4 flex items-start gap-4 hover:border-[#EBEBEB] transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${colorClass}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#333333] text-sm">{activity.title}</p>
                      {activity.description && (
                        <p className="text-sm text-[#666666] mt-0.5">{activity.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
                          {activityTypeLabels[activity.type] || activity.type}
                        </span>
                        {activity.contact && (
                          <span className="text-xs text-[#999999]">
                            {activity.contact.first_name} {activity.contact.last_name}
                          </span>
                        )}
                        {activity.deal && (
                          <span className="text-xs text-[#999999]">{activity.deal.title}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-[#999999]">
                        {formatRelativeTime(activity.completed_at || activity.created_at)}
                      </p>
                      {activity.is_completed && (
                        <span className="text-xs text-green-400">Completed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#999999]">No activities found</div>
          )}
        </div>
      )}
    </div>
    </TwentyPageLayout>
  );
}
