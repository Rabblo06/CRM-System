'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DealCard } from './DealCard';
import { formatCurrency } from '@/lib/utils';
import { PIPELINE_STAGES } from '@/lib/constants';
import type { Deal } from '@/types';

interface KanbanColumnProps {
  stageId: string;
  stageName: string;
  stageColor: string;
  deals: Deal[];
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (id: string) => void;
}

function KanbanColumn({
  stageId,
  stageName,
  stageColor,
  deals,
  onAddDeal,
  onEditDeal,
  onDeleteDeal,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  const totalValue = deals.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Column Header */}
      <div
        className="rounded-t-lg px-3 py-2.5 border border-b-0 border-[#DFE3EB] bg-[#F6F9FC]"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: stageColor }}
            />
            <span className="text-xs font-semibold text-[#2D3E50]">{stageName}</span>
          </div>
          <span className="bg-[#F0F3F7] text-[#516F90] text-xs px-1.5 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <p className="text-xs text-[#7C98B6]">{formatCurrency(totalValue)}</p>
      </div>

      {/* Column Body */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-b-lg border p-2 min-h-48 transition-colors ${
          isOver
            ? 'bg-[#FFF3F0] border-[#FF7A59]/50'
            : 'bg-[#F6F9FC] border-[#DFE3EB]'
        }`}
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onEdit={onEditDeal}
                onDelete={onDeleteDeal}
              />
            ))}
          </div>
        </SortableContext>

        <button
          onClick={() => onAddDeal(stageId)}
          className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#99ACC2] hover:text-[#516F90] hover:bg-[#F0F3F7] rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add deal
        </button>
      </div>
    </div>
  );
}

interface CustomStage {
  id: string;
  name: string;
  color: string;
  probability: number;
}

interface KanbanBoardProps {
  deals: Deal[];
  stages?: CustomStage[];
  onUpdateDeal: (id: string, updates: Partial<Deal>) => Promise<void>;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (id: string) => void;
}

export function KanbanBoard({
  deals,
  stages: customStages,
  onUpdateDeal,
  onAddDeal,
  onEditDeal,
  onDeleteDeal,
}: KanbanBoardProps) {
  const resolvedStages = useMemo(
    () => customStages && customStages.length > 0 ? customStages : PIPELINE_STAGES,
    [customStages]
  );
  const [localDeals, setLocalDeals] = useState<Deal[]>(deals);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  // Sync with parent deals when they change
  if (JSON.stringify(deals.map(d => d.id + d.stage)) !== JSON.stringify(localDeals.map(d => d.id + d.stage)) && !activeDeal) {
    setLocalDeals(deals);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const deal = localDeals.find((d) => d.id === event.active.id);
    setActiveDeal(deal || null);
  }, [localDeals]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped over a column (stage)
    const overStage = resolvedStages.find((s) => s.id === overId);
    if (overStage) {
      setLocalDeals((prev) =>
        prev.map((d) =>
          d.id === activeId ? { ...d, stage: overStage.id } : d
        )
      );
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDeal(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Use server-state (deals prop) to get the original stage,
      // NOT localDeals — handleDragOver already mutated localDeals optimistically,
      // so comparing localDeals stage would always be equal and skip the update.
      const originalDeal = deals.find((d) => d.id === activeId);
      if (!originalDeal) return;

      // Dropped over a column/stage droppable
      const overStage = resolvedStages.find((s) => s.id === overId);
      if (overStage) {
        if (originalDeal.stage !== overStage.id) {
          await onUpdateDeal(activeId, {
            stage: overStage.id,
            probability: overStage.probability,
          });
        }
        return;
      }

      // Dropped over another deal card — find its current column in localDeals
      const overDeal = localDeals.find((d) => d.id === overId);
      if (overDeal && originalDeal.stage !== overDeal.stage) {
        const newStage = overDeal.stage;
        const targetStage = resolvedStages.find(s => s.id === newStage);
        await onUpdateDeal(activeId, {
          stage: newStage,
          probability: targetStage?.probability || originalDeal.probability,
        });
      }
    },
    [deals, localDeals, resolvedStages, onUpdateDeal]
  );

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    resolvedStages.forEach((s) => { map[s.id] = []; });
    localDeals.forEach((deal) => {
      if (map[deal.stage] !== undefined) {
        map[deal.stage].push(deal);
      } else {
        // Unrecognized stage (e.g. imported 'lead') → first column
        const firstId = resolvedStages[0]?.id;
        if (firstId) map[firstId].push(deal);
      }
    });
    return map;
  }, [localDeals, resolvedStages]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[600px]">
        {resolvedStages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stageId={stage.id}
            stageName={stage.name}
            stageColor={stage.color}
            deals={dealsByStage[stage.id] || []}
            onAddDeal={onAddDeal}
            onEditDeal={onEditDeal}
            onDeleteDeal={onDeleteDeal}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal && (
          <div className="rotate-2 opacity-90 shadow-2xl">
            <DealCard
              deal={activeDeal}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
