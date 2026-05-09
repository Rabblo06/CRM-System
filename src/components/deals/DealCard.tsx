'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, Calendar, DollarSign, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate, getDaysInStage, getPriorityColor } from '@/lib/utils';
import type { Deal } from '@/types';

interface DealCardProps {
  deal: Deal;
  onEdit: (deal: Deal) => void;
  onDelete: (id: string) => void;
}

export function DealCard({ deal, onEdit, onDelete }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const daysInStage = getDaysInStage(deal.updated_at || deal.created_at);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border border-[#EBEBEB] rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-[#EBEBEB] transition-colors group shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <h4 className="text-sm font-medium text-[#333333] leading-snug flex-1">{deal.title}</h4>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0 -mt-0.5 -mr-1"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(deal)}>
                <Edit className="w-3.5 h-3.5 mr-2" /> Edit Deal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(deal.id)}
                className="text-red-400 focus:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-1.5 mb-2">
        <DollarSign className="w-3.5 h-3.5 text-green-400" />
        <span className="text-sm font-bold text-green-400">{formatCurrency(deal.amount)}</span>
      </div>

      {/* Company */}
      {deal.company && (
        <div className="flex items-center gap-1.5 mb-2">
          <Building2 className="w-3 h-3 text-[#999999]" />
          <span className="text-xs text-[#666666]">{deal.company.name}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#EBEBEB]">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(deal.priority)}`}>
          {deal.priority.charAt(0).toUpperCase() + deal.priority.slice(1)}
        </span>
        {deal.close_date && (
          <div className="flex items-center gap-1 text-xs text-[#999999]">
            <Calendar className="w-3 h-3" />
            {formatDate(deal.close_date)}
          </div>
        )}
        {!deal.close_date && (
          <span className="text-xs text-[#B3B3B3]">{daysInStage}d in stage</span>
        )}
      </div>
    </div>
  );
}
