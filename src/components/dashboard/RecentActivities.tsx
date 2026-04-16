import { Phone, Mail, Calendar, FileText, CheckSquare, TrendingUp, Users } from 'lucide-react';
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
  deal_created: 'text-[#FF7A59] bg-[#FFF3F0]',
  deal_updated: 'text-[#FF7A59] bg-[#FFF3F0]',
  contact_created: 'text-teal-400 bg-teal-400/10',
};

interface RecentActivitiesProps {
  activities: Activity[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <Card className="bg-white border-[#DFE3EB]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-[#2D3E50]">Recent Activities</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#DFE3EB]">
          {activities.slice(0, 8).map((activity) => {
            const Icon = activityIcons[activity.type] || FileText;
            const colorClass = activityColors[activity.type] || 'text-[#516F90] bg-[#F0F3F7]';
            return (
              <div key={activity.id} className="flex items-start gap-3 px-6 py-3.5 hover:bg-[#F0F3F7] transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2D3E50] font-medium truncate">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-[#7C98B6] mt-0.5 truncate">{activity.description}</p>
                  )}
                  {activity.contact && (
                    <p className="text-xs text-[#FF7A59] mt-0.5">
                      {activity.contact.first_name} {activity.contact.last_name}
                    </p>
                  )}
                </div>
                <div className="text-xs text-[#7C98B6] flex-shrink-0 pt-0.5">
                  {formatRelativeTime(activity.completed_at || activity.created_at)}
                </div>
              </div>
            );
          })}
          {activities.length === 0 && (
            <div className="px-6 py-8 text-center text-[#7C98B6] text-sm">No recent activities</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
