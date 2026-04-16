'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  Linkedin,
  Edit,
  Calendar,
  Clock,
  StickyNote,
  PhoneCall,
  CheckSquare,
  Video,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Plus,
  ExternalLink,
  User,
  Tag,
  Briefcase,
  Send,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useContacts, useEmailTemplates } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import { useEmailSync } from '@/hooks/useEmailSync';
import { getInitials, getLeadStatusColor, formatDate, formatRelativeTime } from '@/lib/utils';
import { LIFECYCLE_STAGES } from '@/lib/constants';
import { mockDeals } from '@/lib/mockData';
import { useActivities } from '@/hooks/useActivities';
import { ContactForm } from '@/components/contacts/ContactForm';
import { EmailActivityCard } from '@/components/emails/EmailActivityCard';
import { ConnectEmailModal } from '@/components/emails/ConnectEmailModal';
import LogCallModal from '@/components/calls/LogCallModal';
import MakeCallModal from '@/components/calls/MakeCallModal';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import type { Contact, EmailTemplate } from '@/types';

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <PhoneCall className="w-3.5 h-3.5 text-green-400" />,
  email: <Mail className="w-3.5 h-3.5 text-blue-400" />,
  meeting: <Video className="w-3.5 h-3.5 text-purple-400" />,
  note: <StickyNote className="w-3.5 h-3.5 text-yellow-400" />,
  task: <CheckSquare className="w-3.5 h-3.5 text-orange-400" />,
  deal_created: <Briefcase className="w-3.5 h-3.5 text-[#FF7A59]" />,
  deal_updated: <Briefcase className="w-3.5 h-3.5 text-[#FF7A59]" />,
  contact_created: <User className="w-3.5 h-3.5 text-teal-400" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: 'bg-green-500/10 border-green-500/20',
  email: 'bg-blue-500/10 border-blue-500/20',
  meeting: 'bg-purple-500/10 border-purple-500/20',
  note: 'bg-yellow-500/10 border-yellow-500/20',
  task: 'bg-orange-500/10 border-orange-500/20',
  deal_created: 'bg-indigo-500/10 border-indigo-500/20',
  deal_updated: 'bg-indigo-500/10 border-indigo-500/20',
  contact_created: 'bg-teal-500/10 border-teal-500/20',
};

type ActivityTab = 'note' | 'email' | 'call' | 'task' | 'meet';

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { updateContact } = useContacts();
  const { isConnected: gmailConnected, gmailEmail, getEmailsForContact, deleteEmail } = useEmailSync();
  const { templates: emailTemplates } = useEmailTemplates();

  // Fetch the contact directly by ID — reliable regardless of list state
  const [contact, setContact] = useState<Contact | null | undefined>(undefined);

  useEffect(() => {
    setContact(undefined); // reset on id change

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) {
      // Non-UUID id — contact is stored only in localStorage
      try {
        const keys = Object.keys(localStorage).filter(k => k.includes('crm_contacts_local'));
        for (const key of keys) {
          const list: Contact[] = JSON.parse(localStorage.getItem(key) || '[]');
          const found = list.find(c => c.id === id);
          if (found) { setContact(found); return; }
        }
      } catch {}
      setContact(null);
      return;
    }

    supabase
      .from('contacts')
      .select('*, company:companies(*)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[contact-detail] join query error:', error.code, error.message, error.details);
          // Fallback: fetch without join if join fails (e.g. RLS on companies)
          supabase
            .from('contacts')
            .select('*')
            .eq('id', id)
            .maybeSingle()
            .then(({ data: d2, error: e2 }) => {
              if (e2) console.error('[contact-detail] fallback error:', e2.code, e2.message, e2.details);
              setContact(d2 ?? null);
            });
        } else {
          setContact(data ?? null);
        }
      });
  }, [id]);

  const loading = contact === undefined;

  const { activities: contactActivities, addActivity } = useActivities(id);
  const [activityFilter, setActivityFilter] = useState<'all' | 'note' | 'email' | 'call' | 'task' | 'meeting'>('all');

  const [activeTab, setActiveTab] = useState<ActivityTab>('note');
  const [noteText, setNoteText] = useState('');
  const noteEditorRef = useRef<HTMLDivElement>(null);
  const emailEditorRef = useRef<HTMLDivElement>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [emailCc, setEmailCc] = useState('');
  const [emailBcc, setEmailBcc] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [authScopeError, setAuthScopeError] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showConnectEmailModal, setShowConnectEmailModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showMakeCallModal, setShowMakeCallModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [noteTodo, setNoteTodo] = useState(false);

  // Call / Task / Meeting form state
  const [callNotes, setCallNotes] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [meetTitle, setMeetTitle] = useState('');
  const [meetDate, setMeetDate] = useState('');
  const [meetLocation, setMeetLocation] = useState('');

  const applyFormat = useCallback((cmd: string) => {
    noteEditorRef.current?.focus();
    document.execCommand(cmd, false);
  }, []);

  const applyTemplate = useCallback((template: EmailTemplate) => {
    const vars: Record<string, string> = {
      first_name: contact?.first_name || '',
      last_name: contact?.last_name || '',
      company_name: contact?.company?.name || '',
      sender_name: gmailEmail || '',
    };
    const fill = (text: string) =>
      text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
    setEmailSubject(fill(template.subject));
    if (emailEditorRef.current) {
      emailEditorRef.current.innerHTML = fill(template.body).replace(/\n/g, '<br>');
    }
    setShowTemplatePicker(false);
  }, [contact, gmailEmail]);

  // Drag state for floating modals
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const [activeButton, setActiveButton] = useState<string>('note');
  const [mainTab, setMainTab] = useState<'about' | 'activities' | 'revenue'>('about');

  const openNote = useCallback(() => { setShowEmailModal(false); setShowNoteModal(true); setModalPos(null); setActiveButton('note'); }, []);
  const openEmail = useCallback(() => {
    if (!gmailConnected) { setShowConnectEmailModal(true); setActiveButton('email'); return; }
    setShowNoteModal(false); setShowEmailModal(true); setModalPos(null); setActiveButton('email');
  }, [gmailConnected]);
  const closeModals = useCallback(() => { setShowNoteModal(false); setShowEmailModal(false); setModalPos(null); }, []);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    const el = (e.currentTarget as HTMLElement).closest('[data-modal]') as HTMLElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setModalPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['contact_info', 'about'])
  );

  const contactDeals = mockDeals.filter((d) => d.company_id === contact?.company_id);

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setExpandedSections(next);
  };

  const handleUpdate = async (data: Partial<Contact>) => {
    await updateContact(id, data);
    // Refresh contact from Supabase after update
    const { data: updated, error } = await supabase
      .from('contacts')
      .select('*, company:companies(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      const { data: d2 } = await supabase.from('contacts').select('*').eq('id', id).maybeSingle();
      if (d2) setContact(d2);
    } else if (updated) {
      setContact(updated);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <p className="text-[#516F90]">Contact not found</p>
          <Link href="/contacts">
            <Button variant="outline" className="mt-4">Back to Contacts</Button>
          </Link>
        </div>
      </div>
    );
  }

  const lifecycleStage = LIFECYCLE_STAGES.find((s) => s.value === contact.lifecycle_stage);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#DFE3EB]">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-[#516F90] hover:text-[#2D3E50] text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Contacts
        </Link>
        <span className="text-[#99ACC2]">/</span>
        <span className="text-sm text-[#2D3E50] font-medium">
          {contact.first_name} {contact.last_name}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR - Contact info */}
        <div className="w-80 flex-shrink-0 border-r border-[#DFE3EB] overflow-y-auto">
          {/* Avatar & name */}
          <div className="p-5 border-b border-[#DFE3EB]">
            <div className="flex items-start gap-3">
              <Avatar className="w-14 h-14 flex-shrink-0">
                <AvatarFallback className="text-lg bg-[#FFF3F0] text-[#FF7A59]">
                  {getInitials(`${contact.first_name} ${contact.last_name}`)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-[#2D3E50] leading-tight">
                  {contact.first_name} {contact.last_name}
                </h1>
                {contact.job_title && (
                  <p className="text-sm text-[#516F90] mt-0.5">{contact.job_title}</p>
                )}
                {contact.company && (
                  <Link
                    href={`/companies/${contact.company_id}`}
                    className="text-xs text-[#FF7A59] hover:text-[#425B76] flex items-center gap-1 mt-1"
                  >
                    <Building2 className="w-3 h-3" />
                    {contact.company.name}
                  </Link>
                )}
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLeadStatusColor(contact.lead_status)}`}>
                {contact.lead_status.charAt(0).toUpperCase() + contact.lead_status.slice(1)}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0F3F7] text-[#516F90]">
                {lifecycleStage?.label || contact.lifecycle_stage}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 gap-1.5 text-xs h-7"
              onClick={() => setShowEditForm(true)}
            >
              <Edit className="w-3 h-3" />
              Edit properties
            </Button>
          </div>

          {/* Action buttons */}
          <div className="px-4 py-3 border-b border-[#DFE3EB]">
            <div className="grid grid-cols-5 gap-1">
              {[
                { icon: <StickyNote className="w-4 h-4" />, label: 'Note', tab: 'note' as ActivityTab },
                { icon: <Mail className="w-4 h-4" />, label: 'Email', tab: 'email' as ActivityTab },
                { icon: <PhoneCall className="w-4 h-4" />, label: 'Call', tab: 'call' as ActivityTab },
                { icon: <CheckSquare className="w-4 h-4" />, label: 'Task', tab: 'task' as ActivityTab },
                { icon: <Video className="w-4 h-4" />, label: 'Meet', tab: 'meet' as ActivityTab },
              ].map(({ icon, label, tab }) => (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === 'note') { openNote(); return; }
                    if (tab === 'email') { openEmail(); return; }
                    if (tab === 'call') { setShowMakeCallModal(true); return; }
                    if (tab === 'task') { setShowTaskModal(true); return; }
                    setActiveTab(tab);
                    setActiveButton(tab);
                  }}
                  className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs transition-colors ${
                    activeButton === tab
                      ? 'bg-[#FFF3F0] text-[#FF7A59]'
                      : 'text-[#516F90] hover:bg-[#F0F3F7] hover:text-[#2D3E50]'
                  }`}
                >
                  {icon}
                  <span className="text-[10px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact Information accordion */}
          <div className="border-b border-[#DFE3EB]">
            <button
              onClick={() => toggleSection('contact_info')}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-[#2D3E50] hover:bg-[#F0F3F7]"
            >
              <span>Contact information</span>
              {expandedSections.has('contact_info') ? (
                <ChevronDown className="w-4 h-4 text-[#516F90]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#516F90]" />
              )}
            </button>
            {expandedSections.has('contact_info') && (
              <div className="px-4 pb-4 space-y-3">
                {contact.email && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Email</p>
                    <a href={`mailto:${contact.email}`} className="text-sm text-[#2D3E50] hover:text-[#FF7A59] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#7C98B6] flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Phone</p>
                    <p className="text-sm text-[#2D3E50] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#7C98B6] flex-shrink-0" />
                      {contact.phone}
                    </p>
                  </div>
                )}
                {contact.job_title && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Job title</p>
                    <p className="text-sm text-[#2D3E50]">{contact.job_title}</p>
                  </div>
                )}
                {contact.department && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Department</p>
                    <p className="text-sm text-[#2D3E50]">{contact.department}</p>
                  </div>
                )}
                {(contact.city || contact.country) && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Location</p>
                    <p className="text-sm text-[#2D3E50] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#7C98B6] flex-shrink-0" />
                      {[contact.city, contact.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {contact.source && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Original source</p>
                    <p className="text-sm text-[#2D3E50]">{contact.source}</p>
                  </div>
                )}
                {contact.linkedin_url && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">LinkedIn</p>
                    <a
                      href={contact.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#FF7A59] hover:text-[#425B76] flex items-center gap-1"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      View profile
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="border-b border-[#DFE3EB]">
            <button
              onClick={() => toggleSection('timeline')}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-[#2D3E50] hover:bg-[#F0F3F7]"
            >
              <span>Timeline</span>
              {expandedSections.has('timeline') ? (
                <ChevronDown className="w-4 h-4 text-[#516F90]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#516F90]" />
              )}
            </button>
            {expandedSections.has('timeline') && (
              <div className="px-4 pb-4 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-3.5 h-3.5 text-[#7C98B6]" />
                  <div>
                    <p className="text-xs text-[#7C98B6]">Created</p>
                    <p className="text-xs text-[#516F90]">{formatDate(contact.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-[#7C98B6]" />
                  <div>
                    <p className="text-xs text-[#7C98B6]">Last updated</p>
                    <p className="text-xs text-[#516F90]">{formatRelativeTime(contact.updated_at)}</p>
                  </div>
                </div>
                {contact.last_contacted_at && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-3.5 h-3.5 text-[#7C98B6]" />
                    <div>
                      <p className="text-xs text-[#7C98B6]">Last contacted</p>
                      <p className="text-xs text-[#516F90]">{formatDate(contact.last_contacted_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CENTER */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main tabs */}
          <div className="flex border-b border-[#DFE3EB] bg-white px-2 flex-shrink-0">
            {(['about', 'activities', 'revenue'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  mainTab === tab
                    ? 'border-[#2D3E50] text-[#2D3E50]'
                    : 'border-transparent text-[#516F90] hover:text-[#2D3E50]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
          <div className="p-5">

          {/* ── ABOUT TAB ── */}
          {mainTab === 'about' && (
            <div className="space-y-4">
              {/* Contact profile card */}
              <div className="bg-white border border-[#DFE3EB] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#2D3E50] mb-4">Contact profile</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">First name</p>
                    <p className="text-sm text-[#2D3E50]">{contact.first_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Last name</p>
                    <p className="text-sm text-[#2D3E50]">{contact.last_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Email</p>
                    <p className="text-sm text-[#2D3E50]">{contact.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Phone number</p>
                    <p className="text-sm text-[#2D3E50]">{contact.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Job title</p>
                    <p className="text-sm text-[#2D3E50]">{contact.job_title || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Department</p>
                    <p className="text-sm text-[#2D3E50]">{contact.department || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Company</p>
                    <p className="text-sm text-[#2D3E50]">{contact.company?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Location</p>
                    <p className="text-sm text-[#2D3E50]">{[contact.city, contact.country].filter(Boolean).join(', ') || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Lead status</p>
                    <p className="text-sm text-[#2D3E50] capitalize">{contact.lead_status || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Lifecycle stage</p>
                    <p className="text-sm text-[#2D3E50] capitalize">{contact.lifecycle_stage || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Original source</p>
                    <p className="text-sm text-[#2D3E50]">{contact.source || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Create date</p>
                    <p className="text-sm text-[#2D3E50]">{formatDate(contact.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Communication subscriptions */}
              <div className="bg-white border border-[#DFE3EB] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#2D3E50] mb-3">Communication subscriptions</h2>
                <p className="text-xs text-[#516F90]">Use subscription types to manage the communication preferences for this contact.</p>
                <button className="mt-2 text-xs text-[#FF7A59] hover:underline">View subscriptions</button>
              </div>
            </div>
          )}

          {/* ── ACTIVITIES TAB ── */}
          {mainTab === 'activities' && (
          <div>
            {/* Activity input area */}
            <div className="bg-white border border-[#DFE3EB] rounded-xl mb-6">
              {/* Tabs */}
              <div className="flex border-b border-[#DFE3EB]">
                {[
                  { id: 'note', label: 'Note', icon: <StickyNote className="w-3.5 h-3.5" /> },
                  { id: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
                  { id: 'call', label: 'Log call', icon: <PhoneCall className="w-3.5 h-3.5" /> },
                  { id: 'task', label: 'Task', icon: <CheckSquare className="w-3.5 h-3.5" /> },
                  { id: 'meet', label: 'Meeting', icon: <Video className="w-3.5 h-3.5" /> },
                ].map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === 'note') { openNote(); return; }
                      if (id === 'email') { openEmail(); return; }
                      setActiveTab(id as ActivityTab);
                      setActiveButton(id);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                      activeButton === id
                        ? 'border-[#FF7A59] text-[#2D3E50]'
                        : 'border-transparent text-[#516F90] hover:text-[#2D3E50]'
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>

              {/* Note tab — opens floating modal */}
              {activeTab === 'note' && (
                <div className="p-4">
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="w-full text-left text-sm text-[#99ACC2] px-3 py-3 bg-[#F6F9FC] border border-[#DFE3EB] rounded-lg hover:border-[#CBD6E2] transition-colors"
                  >
                    Start typing to leave a note...
                  </button>
                </div>
              )}

              {/* Email tab — opens floating modal */}
              {activeTab === 'email' && (
                <div className="p-4">
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="w-full text-left text-sm text-[#99ACC2] px-3 py-3 bg-[#F6F9FC] border border-[#DFE3EB] rounded-lg hover:border-[#CBD6E2] transition-colors"
                  >
                    Compose an email to {contact.first_name}...
                  </button>
                </div>
              )}

              {/* Call tab */}
              {activeTab === 'call' && (
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      style={{ backgroundColor: '#0091AE', borderColor: '#0091AE' }}
                      onClick={() => setShowMakeCallModal(true)}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Make a phone call
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => setShowCallModal(true)}
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Log Call
                    </Button>
                  </div>
                  <p className="text-xs" style={{ color: '#99ACC2' }}>
                    Call {contact.first_name} directly, or log a past call manually.
                  </p>
                </div>
              )}

              {/* Task tab */}
              {activeTab === 'task' && (
                <div className="p-4 space-y-2">
                  <Input
                    placeholder="Task title..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="h-8 text-sm bg-[#F6F9FC] border-[#DFE3EB]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      className="h-8 text-sm bg-[#F6F9FC] border-[#DFE3EB]"
                    />
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                      className="h-8 text-sm bg-[#F0F3F7] border border-[#DFE3EB] rounded-md px-2 text-[#516F90]"
                    >
                      <option value="low">Low priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="high">High priority</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="text-xs h-7"
                      disabled={!taskTitle.trim()}
                      onClick={() => {
                        addActivity({
                          type: 'task',
                          title: taskTitle,
                          contact_id: id,
                          due_date: taskDate || undefined,
                          priority: taskPriority,
                        });
                        setTaskTitle('');
                        setTaskDate('');
                        setTaskPriority('medium');
                        setMainTab('activities');
                      }}
                    >Create task</Button>
                  </div>
                </div>
              )}

              {/* Meet tab */}
              {activeTab === 'meet' && (
                <div className="p-4 space-y-2">
                  <Input
                    placeholder="Meeting title..."
                    value={meetTitle}
                    onChange={(e) => setMeetTitle(e.target.value)}
                    className="h-8 text-sm bg-[#F6F9FC] border-[#DFE3EB]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="datetime-local"
                      value={meetDate}
                      onChange={(e) => setMeetDate(e.target.value)}
                      className="h-8 text-sm bg-[#F6F9FC] border-[#DFE3EB]"
                    />
                    <Input
                      placeholder="Location or video link"
                      value={meetLocation}
                      onChange={(e) => setMeetLocation(e.target.value)}
                      className="h-8 text-sm bg-[#F6F9FC] border-[#DFE3EB]"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="text-xs h-7"
                      disabled={!meetTitle.trim()}
                      onClick={() => {
                        addActivity({
                          type: 'meeting',
                          title: meetTitle,
                          contact_id: id,
                          due_date: meetDate || undefined,
                          location: meetLocation || undefined,
                        });
                        setMeetTitle('');
                        setMeetDate('');
                        setMeetLocation('');
                        setMainTab('activities');
                      }}
                    >Schedule meeting</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#2D3E50]">Activity</h3>
                <div className="flex items-center gap-1">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'note', label: 'Notes' },
                    { value: 'email', label: 'Emails' },
                    { value: 'call', label: 'Calls' },
                    { value: 'task', label: 'Tasks' },
                    { value: 'meeting', label: 'Meetings' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setActivityFilter(value as typeof activityFilter)}
                      className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                        activityFilter === value
                          ? 'bg-[#2D3E50] text-white'
                          : 'text-[#516F90] hover:bg-[#F0F3F7]'
                      }`}
                    >{label}</button>
                  ))}
                </div>
              </div>

              {/* Gmail synced emails */}
              {gmailConnected && (activityFilter === 'all' || activityFilter === 'email') && (() => {
                const emails = getEmailsForContact(id);
                return emails.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {emails.map(email => (
                      <EmailActivityCard key={email.id} email={email} onDelete={deleteEmail} />
                    ))}
                  </div>
                ) : null;
              })()}

              {(() => {
                const filtered = activityFilter === 'all'
                  ? contactActivities
                  : contactActivities.filter(a => a.type === activityFilter);
                const gmailEmails = gmailConnected ? getEmailsForContact(id) : [];
                const hasGmail = (activityFilter === 'all' || activityFilter === 'email') && gmailEmails.length > 0;
                if (filtered.length === 0 && !hasGmail) return (
                <div className="text-center py-10 text-[#7C98B6]">
                  <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No {activityFilter === 'all' ? '' : activityFilter + ' '}activity yet</p>
                </div>
                );
                return filtered.length > 0 ? (
                <div className="space-y-3">
                  {filtered.map((activity) => {
                    // Parse call metadata if it's a call activity
                    let callMeta: { outcome?: string; direction?: string; duration_seconds?: number; phone?: string; notes?: string } | null = null;
                    if (activity.type === 'call' && activity.description) {
                      try { callMeta = JSON.parse(activity.description); } catch { /* plain text */ }
                    }
                    const outcomeColors: Record<string, { color: string; bg: string }> = {
                      connected: { color: '#00BDA5', bg: '#E5F8F6' },
                      voicemail: { color: '#F5C26B', bg: '#FEF9EE' },
                      no_answer: { color: '#7C98B6', bg: '#F0F3F7' },
                      busy:      { color: '#FF7A59', bg: '#FFF3F0' },
                    };
                    return (
                    <div
                      key={activity.id}
                      className={`flex gap-3 p-3.5 rounded-lg border ${ACTIVITY_COLORS[activity.type] || 'bg-white border-[#DFE3EB]'}`}
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#F0F3F7] flex items-center justify-center">
                        {ACTIVITY_ICONS[activity.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#2D3E50]">{activity.title}</p>
                          <span className="text-xs text-[#7C98B6] flex-shrink-0">
                            {activity.created_at ? formatRelativeTime(activity.created_at) : ''}
                          </span>
                        </div>
                        {callMeta ? (
                          <div className="mt-1.5 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {callMeta.outcome && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: outcomeColors[callMeta.outcome]?.bg || '#F0F3F7', color: outcomeColors[callMeta.outcome]?.color || '#516F90' }}>
                                  {callMeta.outcome.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              )}
                              {callMeta.direction && (
                                <span className="text-[10px] text-[#7C98B6] capitalize">{callMeta.direction}</span>
                              )}
                              {callMeta.duration_seconds && callMeta.duration_seconds > 0 && (
                                <span className="text-[10px] text-[#7C98B6]">
                                  · {Math.floor(callMeta.duration_seconds / 60)}m {callMeta.duration_seconds % 60}s
                                </span>
                              )}
                              {callMeta.phone && (
                                <span className="text-[10px] text-[#99ACC2]">{callMeta.phone}</span>
                              )}
                            </div>
                            {callMeta.notes && (
                              <p className="text-xs text-[#516F90]">{callMeta.notes}</p>
                            )}
                          </div>
                        ) : activity.description ? (
                          <p
                            className="text-xs text-[#516F90] mt-1 [&_b]:font-bold [&_i]:italic [&_u]:underline"
                            dangerouslySetInnerHTML={{ __html: activity.description }}
                          />
                        ) : null}
                      </div>
                    </div>
                    );
                  })}
                </div>
                ) : null;
              })()}
            </div>
          </div>
          )} {/* end activities tab */}

          {/* ── REVENUE TAB ── */}
          {mainTab === 'revenue' && (
            <div className="space-y-4">
              <div className="bg-white border border-[#DFE3EB] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#2D3E50] mb-4">Revenue opportunities</h2>
                {contactDeals.length === 0 ? (
                  <div className="text-center py-8 text-[#7C98B6]">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No deals associated with this contact yet.</p>
                    <button className="mt-2 text-xs text-[#FF7A59] hover:underline">+ Create deal</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contactDeals.map((deal) => (
                      <div key={deal.id} className="p-3.5 rounded-lg border border-[#DFE3EB] bg-[#F6F9FC]">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#2D3E50]">{deal.title}</p>
                          <span className="text-sm font-semibold text-green-500">${deal.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-[#516F90] capitalize">{deal.stage.replace(/_/g, ' ')}</span>
                          <span className="text-[#DFE3EB]">·</span>
                          <span className="text-xs text-[#516F90]">{deal.probability}% probability</span>
                        </div>
                        <div className="mt-2 bg-[#DFE3EB] rounded-full h-1.5">
                          <div className="bg-[#FF7A59] h-1.5 rounded-full" style={{ width: `${deal.probability}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          </div>
          </div> {/* end flex-1 overflow */}
        </div> {/* end CENTER flex col */}

        {/* RIGHT SIDEBAR - Associated records */}
        <div className="w-72 flex-shrink-0 border-l border-[#DFE3EB] overflow-y-auto">
          <div className="p-4 space-y-1">
            {/* About */}
            <div className="border-b border-[#DFE3EB] pb-1">
              <button
                onClick={() => toggleSection('about')}
                className="flex items-center justify-between w-full py-2.5 text-sm font-medium text-[#2D3E50] hover:text-[#FF7A59]"
              >
                <span>About this contact</span>
                {expandedSections.has('about') ? (
                  <ChevronDown className="w-4 h-4 text-[#516F90]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#516F90]" />
                )}
              </button>
              {expandedSections.has('about') && (
                <div className="pb-3 text-xs text-[#516F90] space-y-1.5">
                  <p>Lead source: <span className="text-[#2D3E50]">{contact.source || '—'}</span></p>
                  <p>Owner: <span className="text-[#2D3E50]">Sales Admin</span></p>
                  <p>Created: <span className="text-[#2D3E50]">{formatDate(contact.created_at)}</span></p>
                </div>
              )}
            </div>

            {/* Companies */}
            <div className="border-b border-[#DFE3EB] pb-1">
              <div className="flex items-center justify-between py-2.5">
                <button
                  onClick={() => toggleSection('companies')}
                  className="flex items-center gap-2 text-sm font-medium text-[#2D3E50] hover:text-[#FF7A59]"
                >
                  {expandedSections.has('companies') ? (
                    <ChevronDown className="w-4 h-4 text-[#516F90]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#516F90]" />
                  )}
                  Companies
                  <span className="text-xs text-[#7C98B6]">({contact.company ? 1 : 0})</span>
                </button>
                <button className="text-[#FF7A59] hover:text-[#425B76]">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {expandedSections.has('companies') && contact.company && (
                <div className="pb-3">
                  <Link
                    href={`/companies/${contact.company_id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F0F3F7] transition-colors group"
                  >
                    <div className="w-8 h-8 bg-[#FFF3F0] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-[#FF7A59]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#2D3E50] group-hover:text-[#FF7A59] font-medium truncate">
                        {contact.company.name}
                      </p>
                      <p className="text-xs text-[#7C98B6]">{contact.company.industry || 'Company'}</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Deals */}
            <div className="border-b border-[#DFE3EB] pb-1">
              <div className="flex items-center justify-between py-2.5">
                <button
                  onClick={() => toggleSection('deals')}
                  className="flex items-center gap-2 text-sm font-medium text-[#2D3E50] hover:text-[#FF7A59]"
                >
                  {expandedSections.has('deals') ? (
                    <ChevronDown className="w-4 h-4 text-[#516F90]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#516F90]" />
                  )}
                  Deals
                  <span className="text-xs text-[#7C98B6]">({contactDeals.length})</span>
                </button>
                <button className="text-[#FF7A59] hover:text-[#425B76]">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {expandedSections.has('deals') && contactDeals.length > 0 && (
                <div className="pb-3 space-y-1.5">
                  {contactDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-2.5 rounded-lg bg-white border border-[#DFE3EB]"
                    >
                      <p className="text-xs font-medium text-[#2D3E50]">{deal.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-green-400">
                          ${deal.amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-[#7C98B6] capitalize">{deal.stage.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity summary */}
            <div>
              <button
                onClick={() => toggleSection('recent')}
                className="flex items-center justify-between w-full py-2.5 text-sm font-medium text-[#2D3E50] hover:text-[#FF7A59]"
              >
                <span>Recent activities</span>
                {expandedSections.has('recent') ? (
                  <ChevronDown className="w-4 h-4 text-[#516F90]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#516F90]" />
                )}
              </button>
              {expandedSections.has('recent') && (
                <div className="pb-3">
                  {contactActivities.length === 0 ? (
                    <p className="text-xs text-[#7C98B6]">No recent activities</p>
                  ) : (
                    <div className="space-y-2">
                      {contactActivities.slice(0, 3).map((act) => (
                        <div key={act.id} className="flex items-start gap-2">
                          <div className="mt-0.5 flex-shrink-0">
                            {ACTIVITY_ICONS[act.type]}
                          </div>
                          <div>
                            <p className="text-xs text-[#516F90] line-clamp-1">{act.title}</p>
                            <p className="text-xs text-[#99ACC2]">
                              {act.created_at ? formatRelativeTime(act.created_at) : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connect email modal */}
      {showConnectEmailModal && (
        <ConnectEmailModal
          onClose={() => setShowConnectEmailModal(false)}
          onConnected={() => { setShowConnectEmailModal(false); setShowEmailModal(true); setModalPos(null); }}
        />
      )}

      {/* Create task modal */}
      {showTaskModal && contact && (
        <CreateTaskModal
          contactName={`${contact.first_name} ${contact.last_name}`}
          contactId={id}
          onClose={() => setShowTaskModal(false)}
          onSave={async (task) => {
            addActivity({
              type: 'task',
              title: task.title,
              description: task.notes || '',
              contact_id: id,
              due_date: task.dueDate || undefined,
              priority: task.priority,
            });

            // Sync to Google Calendar if reminder is set
            if (task.reminder !== 'none' && task.dueDate) {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const startDateTime = `${task.dueDate}T${task.dueTime || '09:00'}:00`;
                  const endDate = new Date(`${task.dueDate}T${task.dueTime || '09:00'}:00`);
                  endDate.setMinutes(endDate.getMinutes() + 30);
                  const endDateTime = endDate.toISOString().slice(0, 19);

                  const reminderMinutes: Record<string, number> = {
                    at_due: 0, '15min': 15, '1hour': 60, '1day': 1440,
                  };
                  const minutes = reminderMinutes[task.reminder] ?? 15;

                  await fetch('/api/calendar/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      user_id: user.id,
                      title: `Task: ${task.title}`,
                      startDateTime,
                      endDateTime,
                      description: task.notes || '',
                      reminderMinutes: minutes,
                    }),
                  });
                }
              } catch { /* silently ignore if calendar not connected */ }
            }

            setShowTaskModal(false);
            setMainTab('activities');
          }}
        />
      )}

      {/* Make a phone call modal */}
      {showMakeCallModal && contact && (
        <MakeCallModal
          contactName={`${contact.first_name} ${contact.last_name}`}
          contactPhone={contact.phone || ''}
          onClose={() => setShowMakeCallModal(false)}
          onSave={(data) => {
            addActivity({
              type: 'call',
              title: `Call with ${contact.first_name} ${contact.last_name}`,
              description: JSON.stringify({
                direction: 'outbound',
                outcome: data.outcome,
                duration_seconds: data.duration_seconds,
                phone: data.phone,
                notes: data.notes,
                called_at: new Date().toISOString(),
              }),
              contact_id: id,
            });
            if (data.createFollowUp) {
              addActivity({
                type: 'task',
                title: `Follow up with ${contact.first_name} ${contact.last_name}`,
                contact_id: id,
              });
            }
            setShowMakeCallModal(false);
            setMainTab('activities');
          }}
        />
      )}

      {/* Log call modal */}
      {showCallModal && (
        <LogCallModal
          contactName={`${contact.first_name} ${contact.last_name}`}
          contactPhone={contact.phone || ''}
          onClose={() => setShowCallModal(false)}
          onSave={(data) => {
            addActivity({
              type: 'call',
              title: `Call with ${contact.first_name} ${contact.last_name}`,
              description: JSON.stringify(data),
              contact_id: id,
            });
            setShowCallModal(false);
            setActiveTab('note');
            setActiveButton('note');
            setMainTab('activities');
          }}
        />
      )}

      {/* Edit form panel */}
      <ContactForm
        open={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleUpdate}
        initialData={contact}
      />

      {/* ── Note floating modal ───────────────────────────── */}
      {showNoteModal && (
        <div
          data-modal="note"
          className="fixed z-50 w-[600px] max-w-[95vw] bg-white rounded-xl shadow-2xl border border-[#DFE3EB] flex flex-col select-none"
          style={modalPos ? { left: modalPos.x, top: modalPos.y } : { bottom: 24, left: '50%', transform: 'translateX(-50%)' }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing text-[#99ACC2] hover:text-[#516F90]"
          >
            <MoreHorizontal className="w-5 h-5" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="font-semibold text-sm text-[#2D3E50]">Note</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded hover:bg-[#F0F3F7] text-[#516F90]" title="Expand">
                <ExternalLink className="w-4 h-4" />
              </button>
              <button onClick={() => { closeModals(); setNoteText(''); setNoteTodo(false); }} className="p-1 rounded hover:bg-[#F0F3F7] text-[#516F90]">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* For tag */}
          <div className="px-4 pb-2 flex items-center gap-1.5 text-xs text-[#516F90]">
            <span>For</span>
            <span className="bg-[#F0F3F7] text-[#2D3E50] px-2 py-0.5 rounded-full font-medium">
              {contact.first_name} {contact.last_name}
            </span>
          </div>
          {/* Content editable note area */}
          <div className="px-4">
            <div
              ref={noteEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setNoteText((e.target as HTMLDivElement).innerText)}
              data-placeholder="Start typing to leave a note..."
              className="w-full min-h-[120px] text-sm text-[#2D3E50] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#99ACC2] empty:before:pointer-events-none"
            />
          </div>
          {/* Toolbar */}
          <div className="px-4 py-2 border-t border-[#DFE3EB] flex items-center gap-1 text-[#516F90]">
            {[
              { label: 'B', cmd: 'bold', style: 'font-bold' },
              { label: 'I', cmd: 'italic', style: 'italic' },
              { label: 'U', cmd: 'underline', style: 'underline' },
            ].map(({ label, cmd, style }) => (
              <button
                key={label}
                onMouseDown={(e) => { e.preventDefault(); applyFormat(cmd); }}
                className={`w-6 h-6 text-xs rounded hover:bg-[#F0F3F7] ${style}`}
              >{label}</button>
            ))}
            <div className="w-px h-4 bg-[#DFE3EB] mx-1" />
            <button className="p-1 rounded hover:bg-[#F0F3F7]"><Mail className="w-3.5 h-3.5" /></button>
            <button className="p-1 rounded hover:bg-[#F0F3F7]"><Tag className="w-3.5 h-3.5" /></button>
            <button className="p-1 rounded hover:bg-[#F0F3F7]"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          {/* Associated */}
          <div className="px-4 py-2 border-t border-[#DFE3EB]">
            <button className="text-xs text-[#516F90] flex items-center gap-1 hover:text-[#2D3E50]">
              Associated with 1 record
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          {/* Todo checkbox */}
          <div className="px-4 py-2 border-t border-[#DFE3EB] flex items-center gap-2">
            <input type="checkbox" id="note-todo" checked={noteTodo} onChange={(e) => setNoteTodo(e.target.checked)} className="rounded border-[#CBD6E2]" />
            <label htmlFor="note-todo" className="text-xs text-[#516F90] cursor-pointer">
              Create a <span className="font-medium text-[#2D3E50]">To-Do</span> task to follow up in 3 business days
            </label>
          </div>
          {/* Footer */}
          <div className="px-4 py-3 border-t border-[#DFE3EB] flex justify-end">
            <Button
              size="sm"
              disabled={!noteText.trim()}
              onClick={() => {
                const html = noteEditorRef.current?.innerHTML || '';
                const text = noteEditorRef.current?.innerText?.trim() || noteText.trim();
                if (!text) return;
                addActivity({
                  type: 'note',
                  title: text.slice(0, 80),
                  description: html || text,
                  contact_id: id,
                });
                closeModals();
                setNoteText('');
                setNoteTodo(false);
                if (noteEditorRef.current) noteEditorRef.current.innerHTML = '';
                setMainTab('activities');
              }}
              className="text-xs h-8 px-4"
            >
              Create note
            </Button>
          </div>
        </div>
      )}

      {/* ── Email floating modal ──────────────────────────── */}
      {showEmailModal && (
        <div
          data-modal="email"
          className="fixed z-50 w-[600px] max-w-[95vw] bg-white rounded-xl shadow-2xl border border-[#DFE3EB] flex flex-col select-none overflow-hidden"
          style={modalPos ? { left: modalPos.x, top: modalPos.y } : { bottom: 24, left: '50%', transform: 'translateX(-50%)' }}
        >
          {/* Header — drag handle */}
          <div
            onMouseDown={onDragStart}
            className="flex items-center justify-between px-4 py-2.5 bg-[#F6F9FC] border-b border-[#DFE3EB] cursor-grab active:cursor-grabbing"
          >
            <span className="font-semibold text-sm text-[#2D3E50]">New Email Message</span>
            <div className="flex items-center gap-1.5">
              {/* Connected Gmail pill */}
              <div className="flex items-center gap-1.5 border border-[#DFE3EB] rounded-full px-2 py-1 bg-white">
                <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
                  <path d="M4.5 39h7V23.25L2 17.5V37a2 2 0 002 2h.5z" fill="#4285F4"/>
                  <path d="M36.5 39H44a2 2 0 002-2V17.5l-9.5 5.75z" fill="#34A853"/>
                  <path d="M36.5 9L24 18.5 11.5 9 2 15.5l9.5 5.75v14.75h15V21.25L36.5 15.5z" fill="#EA4335"/>
                  <path d="M11.5 9H36.5L24 18.5 11.5 9z" fill="#FBBC04"/>
                </svg>
                <span className="text-xs text-[#516F90] max-w-[140px] truncate">{gmailEmail || 'Gmail'}</span>
                <ChevronDown className="w-3 h-3 text-[#516F90]" />
              </div>
              <button className="p-1 rounded hover:bg-[#E8EDF5] text-[#516F90]"><ExternalLink className="w-3.5 h-3.5" /></button>
              <button
                onClick={() => { closeModals(); setEmailSubject(''); setEmailCc(''); setEmailBcc(''); setShowCc(false); setShowBcc(false); setShowTemplatePicker(false); setAuthScopeError(false); setEmailError(''); if (emailEditorRef.current) emailEditorRef.current.innerHTML = ''; }}
                className="p-1 rounded hover:bg-[#E8EDF5] text-[#516F90]"
              ><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* To field */}
          <div className="flex items-center px-4 py-2 border-b border-[#DFE3EB] gap-2">
            <span className="text-xs text-[#516F90] w-8 flex-shrink-0">To</span>
            <div className="flex-1 flex items-center flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 bg-[#F0F3F7] text-[#2D3E50] px-2 py-0.5 rounded text-xs font-medium">
                {contact.email || 'No email'}
                <button className="text-[#99ACC2] hover:text-[#516F90]"><X className="w-2.5 h-2.5" /></button>
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#7C98B6] flex-shrink-0">
              <button
                onClick={() => setShowCc(v => !v)}
                className={`hover:text-[#516F90] font-medium ${showCc ? 'text-[#2D3E50]' : ''}`}
              >Cc</button>
              <button
                onClick={() => setShowBcc(v => !v)}
                className={`hover:text-[#516F90] font-medium ${showBcc ? 'text-[#2D3E50]' : ''}`}
              >Bcc</button>
            </div>
          </div>

          {/* Cc field */}
          {showCc && (
            <div className="flex items-center px-4 py-2 border-b border-[#DFE3EB] gap-2">
              <span className="text-xs text-[#516F90] w-8 flex-shrink-0">Cc</span>
              <input
                autoFocus
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
                placeholder="Add Cc recipients..."
                className="flex-1 text-sm text-[#2D3E50] placeholder-[#99ACC2] outline-none bg-transparent"
              />
              <button onClick={() => { setShowCc(false); setEmailCc(''); }} className="text-[#99ACC2] hover:text-[#516F90] flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bcc field */}
          {showBcc && (
            <div className="flex items-center px-4 py-2 border-b border-[#DFE3EB] gap-2">
              <span className="text-xs text-[#516F90] w-8 flex-shrink-0">Bcc</span>
              <input
                autoFocus={!showCc}
                value={emailBcc}
                onChange={(e) => setEmailBcc(e.target.value)}
                placeholder="Add Bcc recipients..."
                className="flex-1 text-sm text-[#2D3E50] placeholder-[#99ACC2] outline-none bg-transparent"
              />
              <button onClick={() => { setShowBcc(false); setEmailBcc(''); }} className="text-[#99ACC2] hover:text-[#516F90] flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Subject field */}
          <div className="flex items-center px-4 py-2 border-b border-[#DFE3EB] gap-2">
            <span className="text-xs text-[#516F90] w-8 flex-shrink-0">Subject</span>
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder=""
              className="flex-1 text-sm text-[#2D3E50] placeholder-[#99ACC2] outline-none bg-transparent"
            />
            <button className="text-[10px] text-[#7C98B6] border border-[#DFE3EB] rounded px-1.5 py-0.5 hover:bg-[#F0F3F7] flex-shrink-0">{'{}'}</button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 min-h-[180px]">
            <div
              ref={emailEditorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Write your email..."
              className="w-full min-h-[160px] text-sm text-[#2D3E50] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#99ACC2] [&_b]:font-bold [&_i]:italic [&_u]:underline"
            />
          </div>

          {/* Toolbar + footer */}
          <div className="px-4 py-2.5 border-t border-[#DFE3EB] flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5">
              {(['bold', 'italic', 'underline'] as const).map((cmd) => (
                <button
                  key={cmd}
                  onMouseDown={(e) => { e.preventDefault(); emailEditorRef.current?.focus(); document.execCommand(cmd, false); }}
                  className="p-1.5 rounded hover:bg-[#F0F3F7] text-[#516F90] text-xs w-7 h-7 flex items-center justify-center"
                >
                  {cmd === 'bold' ? <b>B</b> : cmd === 'italic' ? <i>I</i> : <u>U</u>}
                </button>
              ))}
            </div>
            {emailError && (
              <div className="flex items-center gap-1.5 flex-1 min-w-0 mx-2">
                <span className="text-xs text-red-500 truncate">{emailError}</span>
                {authScopeError && (
                  <button
                    onClick={() => { closeModals(); setShowConnectEmailModal(true); setAuthScopeError(false); setEmailError(''); }}
                    className="text-xs text-[#FF7A59] hover:underline font-medium whitespace-nowrap flex-shrink-0"
                  >
                    Reconnect Gmail →
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Template picker */}
              <div className="relative">
                <button
                  onClick={() => setShowTemplatePicker(v => !v)}
                  className="text-xs text-[#516F90] hover:text-[#2D3E50] whitespace-nowrap"
                >
                  Use template
                </button>
                {showTemplatePicker && (
                  <div className="absolute bottom-full right-0 mb-2 w-68 bg-white border border-[#DFE3EB] rounded-lg shadow-xl z-50 overflow-hidden" style={{ width: 260 }}>
                    <div className="px-3 py-2 border-b border-[#DFE3EB] flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#2D3E50]">Email Templates</p>
                      <button onClick={() => setShowTemplatePicker(false)} className="text-[#99ACC2] hover:text-[#516F90]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {emailTemplates.length === 0 ? (
                        <div className="px-3 py-4 text-center">
                          <p className="text-xs text-[#7C98B6]">No templates yet.</p>
                          <Link href="/emails" className="text-xs text-[#FF7A59] hover:underline">Create one in Email Templates</Link>
                        </div>
                      ) : (
                        emailTemplates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => applyTemplate(t)}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#F6F9FC] transition-colors border-b border-[#F0F3F7] last:border-0"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-[#2D3E50] truncate">{t.name}</p>
                              {t.category && (
                                <span className="text-[10px] text-[#7C98B6] bg-[#F0F3F7] px-1.5 py-0.5 rounded flex-shrink-0">{t.category}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#99ACC2] mt-0.5 truncate">{t.subject}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                disabled={!emailSubject.trim() || emailSending}
                onClick={async () => {
                  const html = emailEditorRef.current?.innerHTML || '';
                  const toEmail = contact?.email || '';
                  if (!toEmail) { setEmailError('Contact has no email address'); setAuthScopeError(false); return; }
                  setEmailSending(true);
                  setEmailError('');
                  setAuthScopeError(false);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const res = await fetch('/api/gmail/send', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: user?.id,
                        to: toEmail,
                        cc: emailCc || undefined,
                        bcc: emailBcc || undefined,
                        subject: emailSubject,
                        html,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      const errMsg = data.error || 'Failed to send';
                      const isAuthErr = /insufficient|scope|authentication/i.test(errMsg);
                      setAuthScopeError(isAuthErr);
                      setEmailError(errMsg);
                      setEmailSending(false);
                      return;
                    }
                    addActivity({ type: 'email', title: emailSubject, description: html, contact_id: id });
                    closeModals();
                    setEmailSubject(''); setEmailCc(''); setEmailBcc(''); setShowCc(false); setShowBcc(false);
                    setShowTemplatePicker(false); setAuthScopeError(false);
                    if (emailEditorRef.current) emailEditorRef.current.innerHTML = '';
                    setMainTab('activities');
                  } catch {
                    setEmailError('Failed to send email');
                    setAuthScopeError(false);
                  } finally {
                    setEmailSending(false);
                  }
                }}
                className="text-xs h-8 px-4 gap-1.5 bg-[#0091AE] hover:bg-[#007A8C] text-white border-0"
              >
                <Send className="w-3 h-3" /> {emailSending ? 'Sending…' : 'Send email'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
