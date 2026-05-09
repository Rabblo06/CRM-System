'use client';

import { Users, Building2, TrendingUp, DollarSign, Target, Zap, LayoutDashboard } from 'lucide-react';
import { TwentyPageLayout } from '@/components/layout/TwentyPageLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { PipelineSummary } from '@/components/dashboard/PipelineSummary';
import { RecentActivities } from '@/components/dashboard/RecentActivities';
import { useDashboard } from '@/hooks/useData';
import { useDeals, useActivities } from '@/hooks/useData';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function DashboardPage() {
  const { metrics, revenueData, loading: metricsLoading } = useDashboard();
  const { deals } = useDeals();
  const { activities } = useActivities();

  return (
    <TwentyPageLayout
      icon={<LayoutDashboard size={15} style={{ color: '#555555' }} />}
      title="Dashboards"
    >
    <div className="p-6 space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Contacts"
          value={formatNumber(metrics.totalContacts)}
          change={8}
          icon={Users}
          iconColor="text-blue-400"
          iconBg="bg-blue-400/10"
        />
        <MetricCard
          title="Companies"
          value={formatNumber(metrics.totalCompanies)}
          change={5}
          icon={Building2}
          iconColor="text-purple-400"
          iconBg="bg-purple-400/10"
        />
        <MetricCard
          title="Active Deals"
          value={formatNumber(metrics.activeDeals)}
          change={12}
          icon={TrendingUp}
          iconColor="text-green-400"
          iconBg="bg-green-400/10"
        />
        <MetricCard
          title="Pipeline Value"
          value={formatCurrency(metrics.pipelineRevenue)}
          change={metrics.monthlyGrowth}
          icon={DollarSign}
          iconColor="text-yellow-400"
          iconBg="bg-yellow-400/10"
        />
        <MetricCard
          title="Win Rate"
          value={`${metrics.winRate}%`}
          change={3}
          icon={Target}
          iconColor="text-[#4762D5]"
          iconBg="bg-[#EEF0FB]"
        />
        <MetricCard
          title="Monthly Growth"
          value={`+${metrics.monthlyGrowth}%`}
          change={metrics.monthlyGrowth}
          icon={Zap}
          iconColor="text-orange-400"
          iconBg="bg-orange-400/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <RevenueChart data={revenueData} />
        </div>
        <div className="lg:col-span-2">
          <PipelineSummary deals={deals} />
        </div>
      </div>

      {/* Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivities activities={activities} />

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
            <h3 className="text-base font-semibold text-[#333333] mb-4">Pipeline Health</h3>
            <div className="space-y-3">
              {[
                { label: 'Early Stage (0-30%)', value: deals.filter(d => (d.probability || 0) <= 30).length, color: '#60A5FA' },
                { label: 'Mid Stage (31-60%)', value: deals.filter(d => (d.probability || 0) > 30 && (d.probability || 0) <= 60).length, color: '#A78BFA' },
                { label: 'Late Stage (61-99%)', value: deals.filter(d => (d.probability || 0) > 60 && (d.probability || 0) < 100).length, color: '#34D399' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-[#666666] flex-1">{item.label}</span>
                  <span className="text-sm font-semibold text-[#333333]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#EBEBEB] rounded-xl p-5">
            <h3 className="text-base font-semibold text-[#333333] mb-4">Top Deals by Value</h3>
            <div className="space-y-3">
              {deals
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 4)
                .map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#333333] font-medium truncate">{deal.title}</p>
                      <p className="text-xs text-[#999999]">{deal.company?.name || 'No company'}</p>
                    </div>
                    <span className="text-sm font-bold text-green-400 ml-3 flex-shrink-0">
                      {formatCurrency(deal.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </TwentyPageLayout>
  );
}
