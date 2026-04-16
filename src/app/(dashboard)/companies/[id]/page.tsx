'use client';

import { use, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Globe,
  Phone,
  MapPin,
  Users,
  DollarSign,
  Mail,
  StickyNote,
  PhoneCall,
  CheckSquare,
  Video,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  ExternalLink,
  Clock,
  Briefcase,
  X,
  MoreHorizontal,
  Tag,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCompanies, useContacts } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import { useEmailSync } from '@/hooks/useEmailSync';
import { getInitials, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import { mockDeals } from '@/lib/mockData';
import { useActivities } from '@/hooks/useActivities';
import { EmailActivityCard } from '@/components/emails/EmailActivityCard';
import { ConnectEmailModal } from '@/components/emails/ConnectEmailModal';

type ActivityTab = 'note' | 'email' | 'call' | 'task' | 'meet';

const ACTIVITY_COLORS: Record<string, string> = {
  call: 'bg-green-500/10 border-green-500/20',
  email: 'bg-blue-500/10 border-blue-500/20',
  meeting: 'bg-purple-500/10 border-purple-500/20',
  note: 'bg-yellow-500/10 border-yellow-500/20',
  task: 'bg-orange-500/10 border-orange-500/20',
  deal_created: 'bg-indigo-500/10 border-indigo-500/20',
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <PhoneCall className="w-3.5 h-3.5 text-green-400" />,
  email: <Mail className="w-3.5 h-3.5 text-blue-400" />,
  meeting: <Video className="w-3.5 h-3.5 text-purple-400" />,
  note: <StickyNote className="w-3.5 h-3.5 text-yellow-400" />,
  task: <CheckSquare className="w-3.5 h-3.5 text-orange-400" />,
  deal_created: <Briefcase className="w-3.5 h-3.5 text-[#FF7A59]" />,
};

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { companies, loading } = useCompanies();
  const { contacts } = useContacts();
  const { isConnected: gmailConnected, gmailEmail, getEmailsForCompany, deleteEmail } = useEmailSync();
  const company = companies.find((c) => c.id === id);

  const { activities: companyActivities, addActivity } = useActivities(undefined, id);
  const [activityFilter, setActivityFilter] = useState<'all' | 'note' | 'email' | 'call' | 'task' | 'meeting'>('all');

  const [activeTab, setActiveTab] = useState<ActivityTab>('note');
  const [activeButton, setActiveButton] = useState<string>('note');
  const [mainTab, setMainTab] = useState<'about' | 'activities' | 'revenue'>('about');
  const [noteText, setNoteText] = useState('');
  const noteEditorRef = useRef<HTMLDivElement>(null);
  const emailEditorRef = useRef<HTMLDivElement>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [emailCc, setEmailCc] = useState('');
  const [emailBcc, setEmailBcc] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [noteTodo, setNoteTodo] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showConnectEmailModal, setShowConnectEmailModal] = useState(false);

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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['company_info', 'contacts', 'deals'])
  );

  // Drag state
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

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
      setModalPos({ x: dragRef.current.origX + ev.clientX - dragRef.current.startX, y: dragRef.current.origY + ev.clientY - dragRef.current.startY });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const companyContacts = contacts.filter((c) => c.company_id === id);
  const companyDeals = mockDeals.filter((d) => d.company_id === id);

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setExpandedSections(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-[#516F90]">Company not found</p>
        <Link href="/companies">
          <Button variant="outline" className="mt-4">Back to Companies</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#DFE3EB]">
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-[#516F90] hover:text-[#2D3E50] text-sm">
          <ArrowLeft className="w-4 h-4" />
          Companies
        </Link>
        <span className="text-[#99ACC2]">/</span>
        <span className="text-sm text-[#2D3E50] font-medium">{company.name}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <div className="w-80 flex-shrink-0 border-r border-[#DFE3EB] overflow-y-auto">
          {/* Company header */}
          <div className="p-5 border-b border-[#DFE3EB]">
            <div className="flex items-center gap-3 mb-3">
              {company.domain ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=64`}
                  alt={company.name}
                  className="w-12 h-12 rounded-xl object-contain bg-gray-50 flex-shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.removeProperty('display'); }}
                />
              ) : null}
              <div
                className="w-12 h-12 bg-[#FFF3F0] rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ display: company.domain ? 'none' : 'flex' }}
              >
                <Building2 className="w-6 h-6 text-[#FF7A59]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-[#2D3E50]">{company.name}</h1>
                {company.industry && <p className="text-sm text-[#516F90]">{company.industry}</p>}
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-7">
              <Edit className="w-3 h-3" /> Edit properties
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

          {/* Company info accordion */}
          <div className="border-b border-[#DFE3EB]">
            <button
              onClick={() => toggleSection('company_info')}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-[#2D3E50] hover:bg-[#F0F3F7]"
            >
              <span>Company information</span>
              {expandedSections.has('company_info') ? <ChevronDown className="w-4 h-4 text-[#516F90]" /> : <ChevronRight className="w-4 h-4 text-[#516F90]" />}
            </button>
            {expandedSections.has('company_info') && (
              <div className="px-4 pb-4 space-y-3">
                {company.website && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Website</p>
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#FF7A59] hover:text-[#425B76] flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      {company.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Phone</p>
                    <p className="text-sm text-[#2D3E50] flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[#7C98B6]" />{company.phone}</p>
                  </div>
                )}
                {company.size && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Company size</p>
                    <p className="text-sm text-[#2D3E50] flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#7C98B6]" />{company.size} employees</p>
                  </div>
                )}
                {(company.city || company.country) && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Location</p>
                    <p className="text-sm text-[#2D3E50] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#7C98B6]" />{[company.city, company.country].filter(Boolean).join(', ')}</p>
                  </div>
                )}
                {company.annual_revenue && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Annual revenue</p>
                    <p className="text-sm text-green-400 font-medium flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />{formatCurrency(company.annual_revenue)}</p>
                  </div>
                )}
                {company.description && (
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">About</p>
                    <p className="text-xs text-[#516F90]">{company.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[#7C98B6] mb-0.5">Created date</p>
                  <p className="text-xs text-[#516F90]">{formatDate(company.created_at)}</p>
                </div>
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
              <div className="bg-white border border-[#DFE3EB] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#2D3E50] mb-4">Company profile</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Company name</p>
                    <p className="text-sm text-[#2D3E50]">{company.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Domain</p>
                    <p className="text-sm text-[#2D3E50]">{company.domain || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Industry</p>
                    <p className="text-sm text-[#2D3E50]">{company.industry || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Company size</p>
                    <p className="text-sm text-[#2D3E50]">{company.size ? `${company.size} employees` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Phone</p>
                    <p className="text-sm text-[#2D3E50]">{company.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Website</p>
                    <p className="text-sm text-[#2D3E50]">{company.website || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">City</p>
                    <p className="text-sm text-[#2D3E50]">{company.city || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Country</p>
                    <p className="text-sm text-[#2D3E50]">{company.country || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Annual revenue</p>
                    <p className="text-sm text-[#2D3E50]">{company.annual_revenue ? `$${company.annual_revenue.toLocaleString()}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7C98B6] mb-0.5">Create date</p>
                    <p className="text-sm text-[#2D3E50]">{formatDate(company.created_at)}</p>
                  </div>
                </div>
                {company.description && (
                  <div className="mt-4 pt-4 border-t border-[#DFE3EB]">
                    <p className="text-xs text-[#7C98B6] mb-1">About</p>
                    <p className="text-sm text-[#516F90]">{company.description}</p>
                  </div>
                )}
              </div>
              <div className="bg-white border border-[#DFE3EB] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#2D3E50] mb-3">Associated contacts ({companyContacts.length})</h2>
                {companyContacts.length === 0 ? (
                  <p className="text-xs text-[#7C98B6]">No contacts associated yet.</p>
                ) : (
                  <div className="space-y-2">
                    {companyContacts.map((c) => (
                      <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F0F3F7] transition-colors">
                        <div className="w-7 h-7 rounded-full bg-[#FFF3F0] flex items-center justify-center text-[#FF7A59] text-xs font-bold flex-shrink-0">
                          {c.first_name[0]}{c.last_name[0]}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#2D3E50]">{c.first_name} {c.last_name}</p>
                          <p className="text-xs text-[#7C98B6]">{c.job_title || c.email || ''}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ACTIVITIES TAB ── */}
          {mainTab === 'activities' && (
          <div>
            {/* Activity input */}
            <div className="bg-white border border-[#DFE3EB] rounded-xl mb-6">
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

              {/* Note — opens modal */}
              {activeTab === 'note' && (
                <div className="p-4">
                  <button
                    onClick={openNote}
                    className="w-full text-left text-sm text-[#99ACC2] px-3 py-3 bg-[#F6F9FC] border border-[#DFE3EB] rounded-lg hover:border-[#CBD6E2] transition-colors"
                  >
                    Start typing to leave a note...
                  </button>
                </div>
              )}

              {/* Email — opens modal */}
              {activeTab === 'email' && (
                <div className="p-4">
                  <button
                    onClick={openEmail}
                    className="w-full text-left text-sm text-[#99ACC2] px-3 py-3 bg-[#F6F9FC] border border-[#DFE3EB] rounded-lg hover:border-[#CBD6E2] transition-colors"
                  >
                    Compose an email about {company.name}...
                  </button>
                </div>
              )}

              {/* Call tab */}
              {activeTab === 'call' && (
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-[#F6F9FC] rounded-lg border border-[#DFE3EB]">
                    <PhoneCall className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-[#2D3E50]">Log a call</p>
                      <p className="text-xs text-[#516F90]">{company.phone || 'No phone number'}</p>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Call notes..."
                    rows={3}
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    className="resize-none text-sm bg-[#F6F9FC] border-[#DFE3EB]"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        addActivity({ type: 'call', title: `Call with ${company.name}`, description: callNotes || undefined, company_id: id });
                        setCallNotes('');
                        setMainTab('activities');
                      }}
                    >Save call</Button>
                  </div>
                </div>
              )}

              {/* Task tab */}
              {activeTab === 'task' && (
                <div className="p-4 space-y-2">
                  <Input placeholder="Task title..." value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="h-8 text-sm bg-[#F6F9FC] border-[#DFE3EB]" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className="h-8 text-sm bg-[#F6F9FC] border-[#DFE3EB]" />
                    <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className="h-8 text-sm bg-[#F0F3F7] border border-[#DFE3EB] rounded-md px-2 text-[#516F90]">
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
                        addActivity({ type: 'task', title: taskTitle, company_id: id, due_date: taskDate || undefined, priority: taskPriority });
                        setTaskTitle(''); setTaskDate(''); setTaskPriority('medium');
                        setMainTab('activities');
                      }}
                    >Create task</Button>
                  </div>
                </div>
              )}

              {/* Meet tab */}
              {activeTab === 'meet' && (
                <div className="p-4 space-y-2">
                  <Input placeholder="Meeting title..." value={meetTitle} onChange={(e) => setMeetTitle(e.target.value)} className="h-8 text-sm bg-[#F6F9FC] border-[#DFE3EB]" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="datetime-local" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} className="h-8 text-sm bg-[#F6F9FC] border-[#DFE3EB]" />
                    <Input placeholder="Location or video link" value={meetLocation} onChange={(e) => setMeetLocation(e.target.value)} className="h-8 text-sm bg-[#F6F9FC] border-[#DFE3EB]" />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="text-xs h-7"
                      disabled={!meetTitle.trim()}
                      onClick={() => {
                        addActivity({ type: 'meeting', title: meetTitle, company_id: id, due_date: meetDate || undefined, location: meetLocation || undefined });
                        setMeetTitle(''); setMeetDate(''); setMeetLocation('');
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

              {gmailConnected && (activityFilter === 'all' || activityFilter === 'email') && (() => {
                const emails = getEmailsForCompany(id);
                return emails.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {emails.map(email => <EmailActivityCard key={email.id} email={email} onDelete={deleteEmail} />)}
                  </div>
                ) : null;
              })()}

              {(() => {
                const filtered = activityFilter === 'all'
                  ? companyActivities
                  : companyActivities.filter(a => a.type === activityFilter);
                const gmailEmails = gmailConnected ? getEmailsForCompany(id) : [];
                const hasGmail = (activityFilter === 'all' || activityFilter === 'email') && gmailEmails.length > 0;
                if (filtered.length === 0 && !hasGmail) return (
                  <div className="text-center py-10 text-[#7C98B6]">
                    <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No {activityFilter === 'all' ? '' : activityFilter + ' '}activity yet</p>
                  </div>
                );
                return filtered.length > 0 ? (
                  <div className="space-y-3">
                    {filtered.map((activity) => (
                      <div key={activity.id} className={`flex gap-3 p-3.5 rounded-lg border ${ACTIVITY_COLORS[activity.type] || 'bg-white border-[#DFE3EB]'}`}>
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#F0F3F7] flex items-center justify-center">
                          {ACTIVITY_ICONS[activity.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-[#2D3E50]">{activity.title}</p>
                            <span className="text-xs text-[#7C98B6] flex-shrink-0">{activity.created_at ? formatRelativeTime(activity.created_at) : ''}</span>
                          </div>
                          {activity.description && (
                            <p
                              className="text-xs text-[#516F90] mt-1 [&_b]:font-bold [&_i]:italic [&_u]:underline"
                              dangerouslySetInnerHTML={{ __html: activity.description }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
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
                {companyDeals.length === 0 ? (
                  <div className="text-center py-8 text-[#7C98B6]">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No deals associated with this company yet.</p>
                    <button className="mt-2 text-xs text-[#FF7A59] hover:underline">+ Create deal</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companyDeals.map((deal) => (
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

        {/* RIGHT SIDEBAR */}
        <div className="w-72 flex-shrink-0 border-l border-[#DFE3EB] overflow-y-auto">
          <div className="p-4 space-y-1">
            {/* Contacts */}
            <div className="border-b border-[#DFE3EB] pb-1">
              <div className="flex items-center justify-between py-2.5">
                <button onClick={() => toggleSection('contacts')} className="flex items-center gap-2 text-sm font-medium text-[#2D3E50] hover:text-[#FF7A59]">
                  {expandedSections.has('contacts') ? <ChevronDown className="w-4 h-4 text-[#516F90]" /> : <ChevronRight className="w-4 h-4 text-[#516F90]" />}
                  Contacts <span className="text-xs text-[#7C98B6]">({companyContacts.length})</span>
                </button>
                <button className="text-[#FF7A59] hover:text-[#425B76]"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              {expandedSections.has('contacts') && (
                <div className="pb-3 space-y-1.5">
                  {companyContacts.length === 0 ? (
                    <p className="text-xs text-[#7C98B6] px-1">No contacts yet</p>
                  ) : companyContacts.map((contact) => (
                    <Link key={contact.id} href={`/contacts/${contact.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F0F3F7] transition-colors group">
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-[#FFF3F0] text-[#FF7A59]">
                          {getInitials(`${contact.first_name} ${contact.last_name}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#2D3E50] group-hover:text-[#FF7A59] truncate">{contact.first_name} {contact.last_name}</p>
                        <p className="text-xs text-[#7C98B6] truncate">{contact.job_title || 'Contact'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Deals */}
            <div className="border-b border-[#DFE3EB] pb-1">
              <div className="flex items-center justify-between py-2.5">
                <button onClick={() => toggleSection('deals')} className="flex items-center gap-2 text-sm font-medium text-[#2D3E50] hover:text-[#FF7A59]">
                  {expandedSections.has('deals') ? <ChevronDown className="w-4 h-4 text-[#516F90]" /> : <ChevronRight className="w-4 h-4 text-[#516F90]" />}
                  Deals <span className="text-xs text-[#7C98B6]">({companyDeals.length})</span>
                </button>
                <button className="text-[#FF7A59] hover:text-[#425B76]"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              {expandedSections.has('deals') && (
                <div className="pb-3 space-y-1.5">
                  {companyDeals.length === 0 ? (
                    <p className="text-xs text-[#7C98B6] px-1">No deals yet</p>
                  ) : companyDeals.map((deal) => (
                    <div key={deal.id} className="p-2.5 rounded-lg bg-white border border-[#DFE3EB]">
                      <p className="text-xs font-medium text-[#2D3E50]">{deal.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-green-400">${deal.amount.toLocaleString()}</span>
                        <span className="text-xs text-[#7C98B6] capitalize">{deal.stage.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex-1 bg-[#DFE3EB] rounded-full h-1">
                          <div className="bg-[#FF7A59] h-1 rounded-full" style={{ width: `${deal.probability}%` }} />
                        </div>
                        <span className="text-xs text-[#7C98B6]">{deal.probability}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* About */}
            <div>
              <button onClick={() => toggleSection('about')} className="flex items-center justify-between w-full py-2.5 text-sm font-medium text-[#2D3E50] hover:text-[#FF7A59]">
                <span>About this company</span>
                {expandedSections.has('about') ? <ChevronDown className="w-4 h-4 text-[#516F90]" /> : <ChevronRight className="w-4 h-4 text-[#516F90]" />}
              </button>
              {expandedSections.has('about') && (
                <div className="pb-3 text-xs text-[#516F90] space-y-1.5">
                  {company.domain && <p>Domain: <span className="text-[#2D3E50]">{company.domain}</span></p>}
                  <p>Created: <span className="text-[#2D3E50]">{formatDate(company.created_at)}</span></p>
                  <p>Owner: <span className="text-[#2D3E50]">Sales Admin</span></p>
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

      {/* ── Note floating modal ───────────────────────────── */}
      {showNoteModal && (
        <div
          data-modal="note"
          className="fixed z-50 w-[600px] max-w-[95vw] bg-white rounded-xl shadow-2xl border border-[#DFE3EB] flex flex-col select-none"
          style={modalPos ? { left: modalPos.x, top: modalPos.y } : { bottom: 24, left: '50%', transform: 'translateX(-50%)' }}
        >
          <div onMouseDown={onDragStart} className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing text-[#99ACC2] hover:text-[#516F90]">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="font-semibold text-sm text-[#2D3E50]">Note</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded hover:bg-[#F0F3F7] text-[#516F90]"><ExternalLink className="w-4 h-4" /></button>
              <button onClick={() => { closeModals(); setNoteText(''); setNoteTodo(false); }} className="p-1 rounded hover:bg-[#F0F3F7] text-[#516F90]">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="px-4 pb-2 flex items-center gap-1.5 text-xs text-[#516F90]">
            <span>For</span>
            <span className="bg-[#F0F3F7] text-[#2D3E50] px-2 py-0.5 rounded-full font-medium">{company.name}</span>
          </div>
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
          <div className="px-4 py-2 border-t border-[#DFE3EB]">
            <button className="text-xs text-[#516F90] flex items-center gap-1 hover:text-[#2D3E50]">
              Associated with 1 record <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <div className="px-4 py-2 border-t border-[#DFE3EB] flex items-center gap-2">
            <input type="checkbox" id="co-note-todo" checked={noteTodo} onChange={(e) => setNoteTodo(e.target.checked)} className="rounded border-[#CBD6E2]" />
            <label htmlFor="co-note-todo" className="text-xs text-[#516F90] cursor-pointer">
              Create a <span className="font-medium text-[#2D3E50]">To-Do</span> task to follow up in 3 business days
            </label>
          </div>
          <div className="px-4 py-3 border-t border-[#DFE3EB] flex justify-end">
            <Button
              size="sm"
              disabled={!noteText.trim()}
              onClick={() => {
                const html = noteEditorRef.current?.innerHTML || '';
                const text = noteEditorRef.current?.innerText?.trim() || noteText.trim();
                if (!text) return;
                addActivity({ type: 'note', title: text.slice(0, 80), description: html || text, company_id: id });
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
                onClick={() => { closeModals(); setEmailSubject(''); setEmailTo(''); setEmailCc(''); setEmailBcc(''); setShowCc(false); setShowBcc(false); setEmailError(''); if (emailEditorRef.current) emailEditorRef.current.innerHTML = ''; }}
                className="p-1 rounded hover:bg-[#E8EDF5] text-[#516F90]"
              ><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* To field */}
          <div className="flex items-center px-4 py-2 border-b border-[#DFE3EB] gap-2">
            <span className="text-xs text-[#516F90] w-8 flex-shrink-0">To</span>
            <div className="flex-1 flex items-center flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 bg-[#F0F3F7] text-[#2D3E50] px-2 py-0.5 rounded text-xs font-medium">
                {company.name}
              </span>
              <input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="recipient@email.com"
                className="flex-1 min-w-[140px] text-sm text-[#2D3E50] placeholder-[#99ACC2] outline-none bg-transparent"
              />
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
            {emailError && <span className="text-xs text-red-500">{emailError}</span>}
            <div className="flex items-center gap-2">
              <button className="text-xs text-[#516F90] hover:text-[#2D3E50]">Use template</button>
              <Button
                size="sm"
                disabled={!emailSubject.trim() || !emailTo.trim() || emailSending}
                onClick={async () => {
                  const html = emailEditorRef.current?.innerHTML || '';
                  setEmailSending(true);
                  setEmailError('');
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    const res = await fetch('/api/gmail/send', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: user?.id,
                        to: emailTo,
                        cc: emailCc || undefined,
                        bcc: emailBcc || undefined,
                        subject: emailSubject,
                        html,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) { setEmailError(data.error || 'Failed to send'); setEmailSending(false); return; }
                    addActivity({ type: 'email', title: emailSubject, description: html, company_id: id });
                    closeModals(); setEmailSubject(''); setEmailTo(''); setEmailCc(''); setEmailBcc(''); setShowCc(false); setShowBcc(false);
                    if (emailEditorRef.current) emailEditorRef.current.innerHTML = '';
                    setMainTab('activities');
                  } catch {
                    setEmailError('Failed to send email');
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
