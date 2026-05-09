'use client';

import { useState } from 'react';
import { Send, Bell, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFollowUp } from '@/hooks/useFollowUp';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-fill recipient */
  toEmail?: string;
  /** Link auto-created follow-up task to this contact */
  contactId?: string;
  contactName?: string;
  onSent?: () => void;
}

export function SendEmailModal({ open, onClose, toEmail = '', contactId, contactName, onSent }: Props) {
  const { sendEmailWithFollowUp, sending } = useFollowUp();

  const [form, setForm] = useState({
    to: toEmail,
    subject: '',
    body: '',
    cc: '',
  });
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDays, setFollowUpDays] = useState('3');
  const [result, setResult] = useState<'sent' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCc, setShowCc] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const { success, error } = await sendEmailWithFollowUp({
      to: form.to,
      subject: form.subject,
      html: form.body.replace(/\n/g, '<br>'),
      cc: form.cc || undefined,
      contactId: contactId ?? null,
      followUpEnabled,
      followUpDays: parseInt(followUpDays, 10),
    });

    if (success) {
      setResult('sent');
      setTimeout(() => {
        setResult(null);
        setForm({ to: toEmail, subject: '', body: '', cc: '' });
        setFollowUpEnabled(false);
        setFollowUpDays('3');
        onSent?.();
        onClose();
      }, 1200);
    } else {
      setResult('error');
      setErrorMsg(error || 'Failed to send');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#4762D5]" />
            Send Email{contactName ? ` to ${contactName}` : ''}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>To *</Label>
              <button
                type="button"
                onClick={() => setShowCc(v => !v)}
                className="text-xs text-[#999999] hover:text-[#666666] flex items-center gap-1"
              >
                Cc <ChevronDown className={`w-3 h-3 transition-transform ${showCc ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <Input
              value={form.to}
              onChange={e => setForm({ ...form, to: e.target.value })}
              placeholder="recipient@example.com"
              type="email"
              required
            />
          </div>

          {showCc && (
            <div className="space-y-1.5">
              <Label>Cc</Label>
              <Input
                value={form.cc}
                onChange={e => setForm({ ...form, cc: e.target.value })}
                placeholder="cc@example.com"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Subject *</Label>
            <Input
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              placeholder="Email subject"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Message *</Label>
            <Textarea
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              placeholder="Write your message..."
              rows={6}
              required
            />
          </div>

          {/* ── Follow-up reminder section ─────────────────────── */}
          <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: followUpEnabled ? '#4762D5' : '#EBEBEB', backgroundColor: followUpEnabled ? '#FFF8F6' : '#FAFAFA' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className={`w-3.5 h-3.5 ${followUpEnabled ? 'text-[#4762D5]' : 'text-[#B3B3B3]'}`} />
                <span className="text-xs font-semibold" style={{ color: followUpEnabled ? '#4762D5' : '#666666' }}>
                  Smart Follow-up Reminder
                </span>
              </div>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => setFollowUpEnabled(v => !v)}
                className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
                style={{ backgroundColor: followUpEnabled ? '#4762D5' : '#EBEBEB' }}
              >
                <div
                  className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm"
                  style={{ transform: followUpEnabled ? 'translateX(18px)' : 'translateX(2px)' }}
                />
              </button>
            </div>

            {followUpEnabled && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-[#666666] whitespace-nowrap">If no reply in</span>
                <Select value={followUpDays} onValueChange={setFollowUpDays}>
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 7, 14].map(d => (
                      <SelectItem key={d} value={String(d)}>
                        {d} day{d !== 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-[#666666]">→ create follow-up task</span>
              </div>
            )}

            {!followUpEnabled && (
              <p className="text-[11px] text-[#B3B3B3]">
                Auto-create a task if the recipient doesn&apos;t reply
              </p>
            )}
          </div>

          {result === 'error' && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <X className="w-3.5 h-3.5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
            <Button type="submit" disabled={sending || result === 'sent'} className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Sending...' : result === 'sent' ? 'Sent!' : 'Send Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
