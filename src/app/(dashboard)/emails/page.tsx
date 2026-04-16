'use client';

import { useState } from 'react';
import { Plus, Mail, Edit, Trash2, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEmailTemplates } from '@/hooks/useData';
import type { EmailTemplate } from '@/types';

function TemplateForm({
  open,
  onClose,
  onSubmit,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<EmailTemplate>) => Promise<void>;
  initialData?: Partial<EmailTemplate>;
}) {
  const [form, setForm] = useState({
    name: initialData?.name || '',
    subject: initialData?.subject || '',
    body: initialData?.body || '',
    category: initialData?.category || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Template' : 'Create Email Template'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Template Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Initial Outreach"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Outreach, Follow-up, etc."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject Line *</Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Use {{first_name}}, {{company_name}} as variables"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email Body *</Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write your email template here..."
              rows={12}
              required
            />
            <p className="text-xs" style={{ color: '#7C98B6' }}>
              Available variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{company_name}}'}, {'{{sender_name}}'}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData?.id ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EmailsPage() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useEmailTemplates();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 space-y-4" style={{ backgroundColor: '#F6F9FC', minHeight: '100%' }}>
      <PageHeader title="Email Templates" description={`${templates.length} templates`}>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          New Template
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-t-transparent" style={{ borderColor: '#FF7A59', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-[#DFE3EB] rounded-xl p-5 hover:border-[#CBD6E2] transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFF3F0' }}>
                    <Mail className="w-4 h-4" style={{ color: '#FF7A59' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>{template.name}</h3>
                    {template.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F0F3F7', color: '#516F90' }}>
                        {template.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1.5 rounded hover:bg-[#F0F3F7] transition-colors"
                    onClick={() => handleCopy(template.body, template.id)}
                    style={{ color: '#516F90' }}
                  >
                    {copied === template.id ? (
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#00BDA5' }} />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    className="p-1.5 rounded hover:bg-[#F0F3F7] transition-colors"
                    onClick={() => { setEditingTemplate(template); setShowForm(true); }}
                    style={{ color: '#516F90' }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1.5 rounded hover:bg-[#FFF0EE] transition-colors"
                    onClick={() => deleteTemplate(template.id)}
                    style={{ color: '#99ACC2' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <p className="text-xs mb-0.5" style={{ color: '#7C98B6' }}>Subject</p>
                <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>{template.subject}</p>
              </div>

              <div>
                <p className="text-xs mb-0.5" style={{ color: '#7C98B6' }}>Preview</p>
                <p className="text-xs line-clamp-3 whitespace-pre-line" style={{ color: '#516F90' }}>
                  {template.body.substring(0, 150)}...
                </p>
              </div>

              <button
                onClick={() => setPreviewTemplate(template)}
                className="mt-3 text-xs font-medium hover:underline transition-colors"
                style={{ color: '#FF7A59' }}
              >
                View full template →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewTemplate.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg p-4" style={{ backgroundColor: '#F6F9FC', border: '1px solid #DFE3EB' }}>
                <p className="text-xs mb-1" style={{ color: '#7C98B6' }}>Subject</p>
                <p className="text-xs font-medium" style={{ color: '#2D3E50' }}>{previewTemplate.subject}</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: '#F6F9FC', border: '1px solid #DFE3EB' }}>
                <p className="text-xs mb-2" style={{ color: '#7C98B6' }}>Body</p>
                <pre className="text-xs whitespace-pre-wrap font-sans" style={{ color: '#2D3E50' }}>
                  {previewTemplate.body}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <TemplateForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingTemplate(null); }}
        onSubmit={async (data) => {
          if (editingTemplate) { await updateTemplate(editingTemplate.id, data); }
          else { await createTemplate(data); }
        }}
        initialData={editingTemplate || undefined}
      />
    </div>
  );
}
