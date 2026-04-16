'use client';

import { Bell, X } from 'lucide-react';
import { useReminderPoller } from '@/hooks/useReminderPoller';
import { useFollowUp } from '@/hooks/useFollowUp';

/**
 * Mounted once in the dashboard layout.
 * Polls for due reminders + follow-up tasks globally — works on every page.
 */
export function ReminderToast() {
  const { latestReminder, dismissLatest: dismissReminder, notifications } = useReminderPoller();
  const { latest: latestFollowUp, dismissLatest: dismissFollowUp } = useFollowUp();

  return (
    <>
      {/* Task reminder toast */}
      {latestReminder && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-start gap-3 bg-white border border-[#FF7A59] rounded-xl shadow-xl p-4 max-w-sm animate-in slide-in-from-bottom-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFF3F0' }}>
            <Bell className="w-4 h-4 text-[#FF7A59]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#2D3E50]">Task Reminder</p>
            <p className="text-xs text-[#516F90] mt-0.5 truncate">{latestReminder.title}</p>
            {notifications.length > 1 && (
              <p className="text-[11px] text-[#7C98B6] mt-0.5">
                +{notifications.length - 1} more reminder{notifications.length > 2 ? 's' : ''}
              </p>
            )}
          </div>
          <button onClick={dismissReminder} className="text-[#99ACC2] hover:text-[#516F90] flex-shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Follow-up auto-task toast — offset above reminder toast if both show */}
      {latestFollowUp && (
        <div
          className="fixed right-6 z-[9999] flex items-start gap-3 bg-white border border-[#0091AE] rounded-xl shadow-xl p-4 max-w-sm animate-in slide-in-from-bottom-4"
          style={{ bottom: latestReminder ? '5.5rem' : '1.5rem' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E8F7FA' }}>
            <Bell className="w-4 h-4" style={{ color: '#0091AE' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#2D3E50]">Follow-up Task Created</p>
            <p className="text-xs text-[#516F90] mt-0.5 truncate">No reply to: &quot;{latestFollowUp.subject}&quot;</p>
            <p className="text-[11px] text-[#7C98B6] mt-0.5">Check your Tasks page</p>
          </div>
          <button onClick={dismissFollowUp} className="text-[#99ACC2] hover:text-[#516F90] flex-shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
