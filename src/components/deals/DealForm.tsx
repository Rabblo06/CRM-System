'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PIPELINE_STAGES, DEAL_PRIORITIES } from '@/lib/constants';
import type { Deal } from '@/types';

interface CustomStage {
  id: string;
  name: string;
  probability: number;
}

interface DealFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Deal>) => Promise<void>;
  initialData?: Partial<Deal>;
  defaultStage?: string;
  stages?: CustomStage[];
}

export function DealForm({ open, onClose, onSubmit, initialData, defaultStage, stages: customStages }: DealFormProps) {
  const stageList = customStages && customStages.length > 0 ? customStages : PIPELINE_STAGES;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.title || '');
  const [amount, setAmount] = useState(String(initialData?.amount || 0));
  const [stage, setStage] = useState(initialData?.stage || defaultStage || stageList[0].id);
  const [priority, setPriority] = useState<string>(initialData?.priority || 'medium');
  const [closeDate, setCloseDate] = useState(initialData?.close_date || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (isNaN(Number(amount)) || Number(amount) < 0) newErrors.amount = 'Valid amount is required';
    if (!stage) newErrors.stage = 'Stage is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const stageData = stageList.find((s) => s.id === stage);
      await onSubmit({
        title,
        amount: Number(amount),
        stage,
        priority: priority as Deal['priority'],
        close_date: closeDate || undefined,
        description: description || undefined,
        probability: stageData?.probability || 0,
        currency: 'USD',
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Deal' : 'Create New Deal'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Deal Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Enterprise License Q1"
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Deal Value (USD) *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
              />
              {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="close_date">Expected Close Date</Label>
              <Input
                id="close_date"
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Pipeline Stage *</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stageList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this deal..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData?.id ? 'Update Deal' : 'Create Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
