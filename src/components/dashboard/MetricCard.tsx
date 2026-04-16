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
  iconColor = 'text-[#FF7A59]',
  iconBg = 'bg-[#FFF3F0]',
}: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className="hover:border-[#CBD6E2] transition-colors bg-white border-[#DFE3EB]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-[#516F90] font-medium">{title}</p>
            <p className="text-2xl font-bold text-[#2D3E50] mt-1">{value}</p>
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
                    isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-[#516F90]'
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
