'use client';

import { useState } from 'react';
import { Plus, MessageSquare, Search, Edit2, Trash2, Copy, Check, Zap, Mail, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TemplateChannel = 'sms' | 'whatsapp' | 'email' | 'call_script';

interface MessageTemplate {
  id: string;
  name: string;
  channel: TemplateChannel;
  subject?: string;
  body: string;
  tags: string[];
  usage_count: number;
  created_at: string;
}

const MOCK_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-1', name: 'Welcome — New Lead',
    channel: 'sms',
    body: "Hi {{first_name}}, thanks for your interest in CRM Pro! I'm {{sender_name}} from the sales team. When's a good time to connect this week? Reply to this message or book directly: {{calendar_link}}",
    tags: ['welcome', 'lead'], usage_count: 34, created_at: '2026-01-15',
  },
  {
    id: 'tpl-2', name: 'Follow-up after Demo',
    channel: 'email',
    subject: 'Great meeting you, {{first_name}}!',
    body: "Hi {{first_name}},\n\nThanks for joining our demo today! As discussed, I'm sharing a few resources that will help you evaluate CRM Pro:\n\n• Product overview deck\n• Case study: {{similar_company}}\n• ROI calculator\n\nI'll follow up in 2 days. In the meantime, feel free to reply with any questions!\n\nBest,\n{{sender_name}}",
    tags: ['follow-up', 'demo'], usage_count: 87, created_at: '2026-01-20',
  },
  {
    id: 'tpl-3', name: 'Meeting Reminder',
    channel: 'sms',
    body: "Hi {{first_name}}! Just a reminder about our call tomorrow at {{meeting_time}}. Looking forward to speaking with you. — {{sender_name}}",
    tags: ['reminder', 'meeting'], usage_count: 52, created_at: '2026-02-01',
  },
  {
    id: 'tpl-4', name: 'Proposal Sent',
    channel: 'email',
    subject: 'Your CRM Pro Proposal — {{company_name}}',
    body: "Hi {{first_name}},\n\nI've just sent over the proposal for {{company_name}}. Here's a quick summary:\n\n• Plan: {{plan_name}}\n• Seats: {{seat_count}}\n• Investment: {{proposal_amount}}/year\n\nThe proposal is valid for 30 days. Let me know if you have questions or want to adjust anything!\n\n{{sender_name}}",
    tags: ['proposal', 'deal'], usage_count: 29, created_at: '2026-02-10',
  },
  {
    id: 'tpl-5', name: 'Cold Outreach — Discovery',
    channel: 'whatsapp',
    body: "Hi {{first_name}} 👋 I noticed {{company_name}} is scaling its sales team. We help teams like yours close 30% more deals with smarter CRM workflows. Mind if I share a quick 2-min overview? No pressure at all!",
    tags: ['cold-outreach', 'discovery'], usage_count: 18, created_at: '2026-02-20',
  },
  {
    id: 'tpl-6', name: 'Discovery Call Script',
    channel: 'call_script',
    body: "Opening:\n\"Hi {{first_name}}, this is {{sender_name}} from CRM Pro. How are you today?\"\n\nQualification:\n• Current CRM?\n• Team size?\n• Biggest pain point?\n• Timeline to decide?\n\nValue prop:\n\"Based on what you shared, I think our [feature] could help you [outcome]. Let me walk you through a quick demo.\"\n\nNext step:\n\"Does [date/time] work for a 30-minute product walkthrough?\"",
    tags: ['script', 'discovery'], usage_count: 41, created_at: '2026-03-01',
  },
];

const channelConfig: Record<TemplateChannel, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  sms: { label: 'SMS', color: '#00BDA5', bg: '#E5F8F6', icon: MessageSquare },
  whatsapp: { label: 'WhatsApp', color: '#25D366', bg: '#E8FBF0', icon: MessageSquare },
  email: { label: 'Email', color: '#0091AE', bg: '#E5F5F8', icon: Mail },
  call_script: { label: 'Call Script', color: '#F5C26B', bg: '#FEF9EE', icon: Phone },
};

const VARIABLE_TAGS = ['{{first_name}}', '{{last_name}}', '{{company_name}}', '{{sender_name}}', '{{meeting_time}}', '{{calendar_link}}', '{{plan_name}}', '{{proposal_amount}}'];

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(MOCK_TEMPLATES);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | TemplateChannel>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', channel: 'sms' as TemplateChannel, subject: '', body: '' });

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase());
    const matchChannel = channelFilter === 'all' || t.channel === channelFilter;
    return matchSearch && matchChannel;
  });

  const copyToClipboard = (id: string, body: string) => {
    navigator.clipboard.writeText(body).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const saveTemplate = () => {
    if (!form.name || !form.body) return;
    const newTpl: MessageTemplate = {
      id: `tpl-${Date.now()}`,
      name: form.name,
      channel: form.channel,
      subject: form.subject || undefined,
      body: form.body,
      tags: [],
      usage_count: 0,
      created_at: new Date().toISOString().split('T')[0],
    };
    setTemplates(prev => [newTpl, ...prev]);
    setShowEditor(false);
    setForm({ name: '', channel: 'sms', subject: '', body: '' });
  };

  return (
    <div className="p-6 space-y-5" style={{ backgroundColor: '#F6F9FC', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#2D3E50' }}>Message Templates</h1>
          <p className="text-xs mt-0.5" style={{ color: '#7C98B6' }}>Reusable templates for SMS, WhatsApp, email, and calls</p>
        </div>
        <Button className="gap-1.5 text-xs" onClick={() => setShowEditor(true)}>
          <Plus className="w-3.5 h-3.5" />
          New Template
        </Button>
      </div>

      {/* Channel filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#99ACC2' }} />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'sms', 'whatsapp', 'email', 'call_script'] as const).map((c) => {
            const cfg = c !== 'all' ? channelConfig[c] : null;
            const Icon = cfg?.icon;
            return (
              <button
                key={c}
                onClick={() => setChannelFilter(c)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  backgroundColor: channelFilter === c ? '#2D3E50' : '#ffffff',
                  color: channelFilter === c ? '#ffffff' : '#516F90',
                  border: '1px solid #DFE3EB',
                }}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {c === 'all' ? 'All Channels' : cfg!.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((tpl) => {
          const cfg = channelConfig[tpl.channel];
          const Icon = cfg.icon;
          const isCopied = copiedId === tpl.id;
          return (
            <div key={tpl.id} className="bg-white border border-[#DFE3EB] rounded-xl p-5 group hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.bg }}>
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>{tpl.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span className="text-xs" style={{ color: '#99ACC2' }}>Used {tpl.usage_count}x</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyToClipboard(tpl.id, tpl.body)}
                    className="p-1.5 rounded hover:bg-[#F0F3F7] transition-colors"
                    title="Copy body"
                  >
                    {isCopied
                      ? <Check className="w-3.5 h-3.5" style={{ color: '#00BDA5' }} />
                      : <Copy className="w-3.5 h-3.5" style={{ color: '#7C98B6' }} />
                    }
                  </button>
                  <button className="p-1.5 rounded hover:bg-[#F0F3F7] transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" style={{ color: '#7C98B6' }} />
                  </button>
                  <button
                    onClick={() => deleteTemplate(tpl.id)}
                    className="p-1.5 rounded hover:bg-[#FFF3F0] transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: '#FF7A59' }} />
                  </button>
                </div>
              </div>

              {tpl.subject && (
                <p className="text-xs font-medium mb-1.5" style={{ color: '#425B76' }}>Subject: {tpl.subject}</p>
              )}

              <div className="rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap line-clamp-4" style={{ backgroundColor: '#F6F9FC', color: '#516F90', fontFamily: 'inherit' }}>
                {tpl.body}
              </div>

              {/* Variable chips */}
              {(() => {
                const vars = tpl.body.match(/\{\{[^}]+\}\}/g);
                if (!vars) return null;
                const unique = [...new Set(vars)];
                return (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {unique.map((v) => (
                      <span key={v} className="text-xs px-1.5 py-0.5 rounded-md font-mono" style={{ backgroundColor: '#FFF3F0', color: '#FF7A59', border: '1px solid #FFD5CC' }}>
                        {v}
                      </span>
                    ))}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: '#F0F3F7' }}>
                <div className="flex flex-wrap gap-1">
                  {tpl.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F0F3F7', color: '#7C98B6' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <span className="text-xs" style={{ color: '#99ACC2' }}>Created {tpl.created_at}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* New template editor modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEditor(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" style={{ border: '1px solid #DFE3EB' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#DFE3EB' }}>
              <h2 className="text-base font-semibold" style={{ color: '#2D3E50' }}>New Message Template</h2>
              <button onClick={() => setShowEditor(false)} className="p-1.5 rounded hover:bg-[#F0F3F7]">
                <X className="w-4 h-4" style={{ color: '#7C98B6' }} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label>Template Name</Label>
                  <Input placeholder="e.g. Follow-up after Demo" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Channel</Label>
                  <select
                    className="w-full rounded border px-3 py-2 text-sm"
                    style={{ borderColor: '#CBD6E2', color: '#2D3E50' }}
                    value={form.channel}
                    onChange={(e) => setForm(f => ({ ...f, channel: e.target.value as TemplateChannel }))}
                  >
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="call_script">Call Script</option>
                  </select>
                </div>
                {form.channel === 'email' && (
                  <div className="space-y-1.5">
                    <Label>Subject Line</Label>
                    <Input placeholder="Email subject..." value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Body</Label>
                  <span className="text-xs" style={{ color: '#99ACC2' }}>Use {'{{variable}}'} for personalization</span>
                </div>
                <textarea
                  className="w-full rounded border px-3 py-2 text-sm resize-none placeholder:text-[#99ACC2]"
                  style={{ borderColor: '#CBD6E2', color: '#2D3E50', minHeight: 140 }}
                  placeholder="Write your template here..."
                  value={form.body}
                  onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#FF7A59'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,122,89,0.15)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD6E2'; e.currentTarget.style.boxShadow = ''; }}
                />
              </div>

              {/* Variable insert shortcuts */}
              <div>
                <p className="text-xs mb-2" style={{ color: '#7C98B6' }}>Insert variable:</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLE_TAGS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setForm(f => ({ ...f, body: f.body + v }))}
                      className="text-xs px-2 py-0.5 rounded-md font-mono transition-colors hover:bg-[#FFF3F0]"
                      style={{ backgroundColor: '#FFF8F6', color: '#FF7A59', border: '1px solid #FFD5CC' }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#DFE3EB', backgroundColor: '#F6F9FC' }}>
              <Button variant="outline" size="sm" onClick={() => setShowEditor(false)}>Cancel</Button>
              <Button size="sm" onClick={saveTemplate} disabled={!form.name || !form.body}>
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
