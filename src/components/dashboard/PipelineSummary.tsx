'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PIPELINE_STAGES } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { Deal } from '@/types';

interface PipelineSummaryProps {
  deals: Deal[];
}

export function PipelineSummary({ deals }: PipelineSummaryProps) {
  const stageData = PIPELINE_STAGES.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage.id);
    const totalValue = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    return {
      ...stage,
      count: stageDeals.length,
      totalValue,
    };
  }).filter(s => s.count > 0);

  return (
    <Card className="bg-white border-[#DFE3EB]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-[#2D3E50]">Pipeline Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#DFE3EB]">
                <th className="text-left px-6 py-3 text-[#516F90] font-medium text-xs uppercase tracking-wide">Stage</th>
                <th className="text-center px-4 py-3 text-[#516F90] font-medium text-xs uppercase tracking-wide">Deals</th>
                <th className="text-right px-6 py-3 text-[#516F90] font-medium text-xs uppercase tracking-wide">Value</th>
                <th className="text-center px-4 py-3 text-[#516F90] font-medium text-xs uppercase tracking-wide">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE3EB]">
              {stageData.map((stage) => (
                <tr key={stage.id} className="hover:bg-[#F0F3F7] transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-[#2D3E50] font-medium">{stage.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-[#F0F3F7] text-[#516F90] px-2 py-0.5 rounded-full text-xs font-medium">
                      {stage.count}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-[#2D3E50] font-medium">
                    {formatCurrency(stage.totalValue)}
                  </td>
                  <td className="px-4 py-3 text-center text-[#516F90] text-xs">{stage.probability}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stageData.length === 0 && (
            <div className="px-6 py-8 text-center text-[#7C98B6]">No active deals in pipeline</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
