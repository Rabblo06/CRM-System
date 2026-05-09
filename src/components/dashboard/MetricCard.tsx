import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-[#4762D5]',
  iconBg = 'bg-[#EEF0FB]',
}: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className="hover:border-[#EBEBEB] transition-colors bg-white border-[#EBEBEB]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-[#666666] font-medium">{title}</p>
            <p className="text-2xl font-bold text-[#333333] mt-1">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                ) : isNegative ? (
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                ) : null}
                <span
                  className={cn(
                    'text-xs font-medium',
                    isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-[#666666]'
                  )}
                >
                  {change > 0 ? '+' : ''}
                  {change}% {changeLabel || 'vs last month'}
                </span>
              </div>
            )}
          </div>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
