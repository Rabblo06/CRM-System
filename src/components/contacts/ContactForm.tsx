'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LEAD_STATUSES, LIFECYCLE_STAGES } from '@/lib/constants';
import type { Contact } from '@/types';

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  department: z.string().optional(),
  lead_status: z.string(),
  lifecycle_stage: z.string(),
  source: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Contact>) => Promise<void>;
  initialData?: Partial<Contact>;
}

export function ContactForm({ open, onClose, onSubmit, initialData }: ContactFormProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      job_title: initialData?.job_title || '',
      department: initialData?.department || '',
      lead_status: initialData?.lead_status || 'new',
      lifecycle_stage: initialData?.lifecycle_stage || 'lead',
      source: initialData?.source || '',
      city: initialData?.city || '',
      country: initialData?.country || '',
      notes: initialData?.notes || '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        job_title: initialData?.job_title || '',
        department: initialData?.department || '',
        lead_status: initialData?.lead_status || 'new',
        lifecycle_stage: initialData?.lifecycle_stage || 'lead',
        source: initialData?.source || '',
        city: initialData?.city || '',
        country: initialData?.country || '',
        notes: initialData?.notes || '',
      });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: ContactFormData) => {
    setLoading(true);
    try {
      await onSubmit(data as Partial<Contact>);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!initialData?.id;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] bg-white border-l border-[#EBEBEB] z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
          <h2 className="text-base font-semibold text-[#333333]">
            {isEditing ? 'Edit contact' : 'Create contact'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#666666] hover:text-[#333333] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {/* Required info section */}
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-3">
                Contact information
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="first_name" className="text-xs text-[#666666]">
                      First name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      {...register('first_name')}
                      placeholder="First name"
                      className="h-9 text-sm"
                    />
                    {errors.first_name && (
                      <p className="text-xs text-red-400">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="last_name" className="text-xs text-[#666666]">
                      Last name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      {...register('last_name')}
                      placeholder="Last name"
                      className="h-9 text-sm"
                    />
                    {errors.last_name && (
                      <p className="text-xs text-red-400">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs text-[#666666]">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="email@example.com"
                    className="h-9 text-sm"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs text-[#666666]">Phone number</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="+1 (555) 000-0000"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="job_title" className="text-xs text-[#666666]">Job title</Label>
                  <Input
                    id="job_title"
                    {...register('job_title')}
                    placeholder="e.g. Sales Manager"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="department" className="text-xs text-[#666666]">Department</Label>
                  <Input
                    id="department"
                    {...register('department')}
                    placeholder="e.g. Sales"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Status section */}
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-3">
                CRM status
              </p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[#666666]">Lifecycle stage</Label>
                  <Select
                    value={watch('lifecycle_stage')}
                    onValueChange={(v) => setValue('lifecycle_stage', v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIFECYCLE_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-[#666666]">Lead status</Label>
                  <Select
                    value={watch('lead_status')}
                    onValueChange={(v) => setValue('lead_status', v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Additional info */}
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-3">
                Additional details
              </p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="source" className="text-xs text-[#666666]">Lead source</Label>
                  <Input
                    id="source"
                    {...register('source')}
                    placeholder="e.g. LinkedIn, Website"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="city" className="text-xs text-[#666666]">City</Label>
                    <Input
                      id="city"
                      {...register('city')}
                      placeholder="San Francisco"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="country" className="text-xs text-[#666666]">Country</Label>
                    <Input
                      id="country"
                      {...register('country')}
                      placeholder="USA"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="notes" className="text-xs text-[#666666]">Notes</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Add any notes about this contact..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EBEBEB] flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={loading}
            onClick={handleSubmit(handleFormSubmit)}
          >
            {loading ? 'Saving...' : isEditing ? 'Save changes' : 'Create contact'}
          </Button>
        </div>
      </div>
    </>
  );
}
