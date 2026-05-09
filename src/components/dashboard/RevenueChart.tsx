'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { RevenueDataPoint } from '@/types';

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#EBEBEB] rounded-lg p-3 shadow-xl">
        <p className="text-[#666666] text-xs mb-1">{label}</p>
        <p className="text-[#333333] font-bold">{formatCurrency(payload[0]?.value || 0)}</p>
        {payload[1] && (
          <p className="text-[#4762D5] text-xs">{payload[1].value} deals</p>
        )}
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="bg-white border-[#EBEBEB]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-[#333333]">Revenue Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4762D5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4762D5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#999999', fontSize: 12 }}
                axisLine={{ stroke: '#EBEBEB' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#999999', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#4762D5"
                strokeWidth={2.5}
                fill="url(#colorRevenue)"
                dot={{ fill: '#4762D5', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#555555' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
