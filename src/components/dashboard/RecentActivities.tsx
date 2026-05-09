import Link from 'next/link';
import { Phone, Mail, Calendar, FileText, CheckSquare, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/utils';
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
  call: 'text-green-400 bg-green-400/10',
  email: 'text-blue-400 bg-blue-400/10',
  meeting: 'text-purple-400 bg-purple-400/10',
  note: 'text-yellow-400 bg-yellow-400/10',
  task: 'text-orange-400 bg-orange-400/10',
  deal_created: 'text-[#4762D5] bg-[#EEF0FB]',
  deal_updated: 'text-[#4762D5] bg-[#EEF0FB]',
  contact_created: 'text-teal-400 bg-teal-400/10',
};

interface RecentActivitiesProps {
  activities: Activity[];
}

const PREVIEW_COUNT = 5;

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const preview = activities.slice(0, PREVIEW_COUNT);
  const hasMore = activities.length > PREVIEW_COUNT;

  return (
    <Card className="bg-white border-[#EBEBEB]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base text-[#333333]">Recent Activities</CardTitle>
        {hasMore && (
          <Link
            href="/activities"
            className="text-xs font-medium flex items-center gap-1 transition-colors"
            style={{ color: '#4762D5' }}
          >
            Show all <ArrowRight size={12} />
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#EBEBEB]">
          {preview.map((activity) => {
            const Icon = activityIcons[activity.type] || FileText;
            const colorClass = activityColors[activity.type] || 'text-[#666666] bg-[#F1F1F1]';
            return (
              <div key={activity.id} className="flex items-start gap-3 px-6 py-3.5 hover:bg-[#F1F1F1] transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#333333] font-medium truncate">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-[#999999] mt-0.5 truncate">{activity.description}</p>
                  )}
                  {activity.contact && (
                    <p className="text-xs text-[#4762D5] mt-0.5">
                      {activity.contact.first_name} {activity.contact.last_name}
                    </p>
                  )}
                </div>
                <div className="text-xs text-[#999999] flex-shrink-0 pt-0.5">
                  {formatRelativeTime(activity.completed_at || activity.created_at)}
                </div>
              </div>
            );
          })}
          {activities.length === 0 && (
            <div className="px-6 py-8 text-center text-[#999999] text-sm">No recent activities</div>
          )}
        </div>

        {/* Show More footer */}
        {hasMore && (
          <div className="px-6 py-3 border-t" style={{ borderColor: '#EBEBEB' }}>
            <Link
              href="/activities"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors hover:bg-[#FAFAFA]"
              style={{ color: '#666666' }}
            >
              Show all {activities.length} activities
              <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
