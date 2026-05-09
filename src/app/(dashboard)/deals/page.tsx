'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Trash2, Check, ChevronLeft, TrendingUp } from 'lucide-react';
import { useDeals } from '@/hooks/useData';
import { TwentyPageLayout } from '@/components/layout/TwentyPageLayout';
import { userKey } from '@/lib/demoUser';
import { KanbanBoard } from '@/components/deals/KanbanBoard';
import { DealForm } from '@/components/deals/DealForm';
import type { Deal } from '@/types';

/* ── Types ─────────────────────────────────────────────────── */
interface Stage {
  id: string;
  name: string;
  color: string;
  probability: number;
}

type SubStep =
  | 'name_pipeline'   // Step 1
  | 'define_stages'   // Step 2a
  | 'closing_stages'  // Step 2b
  | 'add_deal'        // Step 3a
  | 'choose_stage';   // Step 3b

type View = 'empty' | 'setup_modal' | 'wizard' | 'board';

/* ── Defaults ───────────────────────────────────────────────── */
const DEFAULT_STAGES: Stage[] = [
  { id: 'apt_scheduled', name: 'Appointment Scheduled', color: '#94a3b8', probability: 20 },
  { id: 'qualified', name: 'Qualified To Buy', color: '#60a5fa', probability: 40 },
  { id: 'presentation', name: 'Presentation Scheduled', color: '#818cf8', probability: 60 },
  { id: 'decision', name: 'Decision Maker Bought-In', color: '#a78bfa', probability: 80 },
  { id: 'contract', name: 'Contract Sent', color: '#34d399', probability: 90 },
];

/* ── Wizard Progress Bar ────────────────────────────────────── */
const SUB_STEP_TO_CIRCLE: Record<SubStep, number> = {
  name_pipeline: 1,
  define_stages: 2,
  closing_stages: 2,
  add_deal: 3,
  choose_stage: 3,
};
const CIRCLE_LABELS = ['Name your new pipeline', 'Define your deal stages', 'Create your first deal'];

function WizardProgressBar({ subStep }: { subStep: SubStep }) {
  const active = SUB_STEP_TO_CIRCLE[subStep];
  const stepNum = active;

  return (
    <div className="flex items-center border-b border-[#e5e8ed] px-8 py-3" style={{ backgroundColor: '#fff' }}>
      <span className="text-sm text-[#666666] flex-shrink-0 w-44">Set up your sales process</span>

      {/* Circles + lines centered */}
      <div className="flex-1 flex items-start justify-center gap-0">
        {CIRCLE_LABELS.map((label, i) => {
          const circleNum = i + 1;
          const done = circleNum < active;
          const current = circleNum === active;
          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center" style={{ width: 100 }}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all"
                  style={{
                    borderColor: done || current ? '#4762D5' : '#EBEBEB',
                    backgroundColor: done || current ? '#4762D5' : '#fff',
                    color: done || current ? '#fff' : '#B3B3B3',
                  }}
                >
                  {done
                    ? <Check size={13} strokeWidth={3} />
                    : <span className="text-xs font-bold">{circleNum}</span>}
                </div>
                <span
                  className="text-xs mt-1 text-center leading-tight"
                  style={{ color: current ? '#333333' : done ? '#4762D5' : '#B3B3B3', fontWeight: current ? 600 : 400 }}
                >
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className="h-0.5 mb-4"
                  style={{ width: 60, backgroundColor: circleNum < active ? '#4762D5' : '#EBEBEB', flexShrink: 0 }}
                />
              )}
            </div>
          );
        })}
      </div>

      <span className="text-sm text-[#666666] flex-shrink-0 w-24 text-right">
        Step {stepNum} of 3
      </span>
    </div>
  );
}

/* ── Table Kanban Preview (Steps 1–2) ───────────────────────── */
function TableKanbanPreview({ pipelineName, stages }: { pipelineName: string; stages: Stage[] }) {
  const allCols = [...stages, { id: 'won', name: 'Closed Won', color: '#10b981', probability: 100 }, { id: 'lost', name: 'Closed Lost', color: '#ef4444', probability: 0 }];
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#333333] mb-4" style={{ fontFamily: 'inherit' }}>
        {pipelineName || 'Your pipeline'}
      </h2>
      <div className="border border-[#EBEBEB] rounded-sm overflow-hidden" style={{ minHeight: 260 }}>
        <div className="flex" style={{ borderBottom: '1px solid #EBEBEB' }}>
          {allCols.map((col, i) => (
            <div
              key={col.id}
              className="flex-1 px-2 py-2 text-xs font-semibold text-[#666666] truncate"
              style={{ borderRight: i < allCols.length - 1 ? '1px solid #EBEBEB' : 'none', minWidth: 0 }}
            >
              {col.name}
            </div>
          ))}
        </div>
        <div className="flex" style={{ height: 220 }}>
          {allCols.map((col, i) => (
            <div
              key={col.id}
              className="flex-1"
              style={{ borderRight: i < allCols.length - 1 ? '1px solid #EBEBEB' : 'none', minWidth: 0 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Deal Card Preview (Step 3) ─────────────────────────────── */
function DealCardPreview({ dealName, dealAmount, dealStage, stages }: {
  dealName: string;
  dealAmount: string;
  dealStage: string;
  stages: Stage[];
}) {
  const stageName = stages.find(s => s.id === dealStage)?.name || '';
  const hasName = !!dealName;
  const hasAmount = !!dealAmount;

  const actionIcons = [
    // Note
    <svg key="note" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
    // Email
    <svg key="email" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    // Phone
    <svg key="phone" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>,
    // Tasks
    <svg key="tasks" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
    // Calendar
    <svg key="cal" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    // More
    <svg key="more" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>,
  ];

  return (
    <div className="bg-white border border-[#EBEBEB] rounded-sm shadow-sm" style={{ width: 300 }}>
      {/* Deal name bar */}
      <div className="px-4 pt-5 pb-3 border-b border-[#EBEBEB]">
        {hasName
          ? <h3 className="text-base font-bold text-[#333333]">{dealName}</h3>
          : <div className="h-5 rounded" style={{ backgroundColor: '#EBEBEB', width: '70%' }} />
        }
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#666666]">
            <span className="text-[#999999]">Amount:</span>
            {hasAmount
              ? <span className="font-medium text-[#333333]">${Number(dealAmount).toLocaleString()}</span>
              : <div className="h-3 rounded inline-block" style={{ backgroundColor: '#EBEBEB', width: 80 }} />
            }
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#666666]">
            <span className="text-[#999999]">Stage:</span>
            {stageName
              ? <span className="font-semibold text-[#333333]">{stageName}</span>
              : <div className="h-3 rounded inline-block" style={{ backgroundColor: '#EBEBEB', width: 100 }} />
            }
          </div>
        </div>
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#EBEBEB]">
        {actionIcons.map((icon, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: '#333333' }}
          >
            {icon}
          </div>
        ))}
      </div>

      {/* About this deal */}
      <div className="px-4 py-3">
        <button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-[#333333] mb-3 w-full">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 9l-7 7-7-7" /></svg>
          About this deal
        </button>
        {[
          { label: 'Deal owner', value: 'You' },
          { label: 'Last contacted', value: '---' },
          { label: 'Deal type', value: '' },
          { label: 'Priority', value: '' },
        ].map((row) => (
          <div key={row.label} className="mb-2">
            <div className="text-xs text-[#666666] mb-0.5">{row.label}</div>
            <div
              className="h-7 rounded-sm px-2 flex items-center text-xs"
              style={{ backgroundColor: '#f5f8fa', color: row.value ? '#333333' : '#b0bec5' }}
            >
              {row.value || ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════
   PAGE
════════════════════════════ */
export default function DealsPage() {
  const { deals, loading, createDeal, updateDeal, deleteDeal, deleteAllDeals } = useDeals();
  const [view, setView] = useState<View>('empty');
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const addDropRef = useRef<HTMLDivElement>(null);

  // Wizard
  const [subStep, setSubStep] = useState<SubStep>('name_pipeline');
  const [pipelineName, setPipelineName] = useState('Sales Pipeline');
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [closedWonName, setClosedWonName] = useState('Closed Won');
  const [closedLostName, setClosedLostName] = useState('Closed Lost');
  const [dealName, setDealName] = useState('');
  const [dealAmount, setDealAmount] = useState('');
  const [dealStage, setDealStage] = useState('');

  // Board
  const [showDealForm, setShowDealForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [defaultStage, setDefaultStage] = useState('');

  /* Load pipeline from localStorage */
  useEffect(() => {
    const raw = localStorage.getItem(userKey('crm_pipeline_v2'));
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved.stages) setStages(saved.stages);
        if (saved.pipelineName) setPipelineName(saved.pipelineName);
        setView('board');
      } catch { /* ignore */ }
    }
  }, []);

  /* Auto-switch to board when deals exist (e.g. after import) but pipeline wasn't configured yet */
  useEffect(() => {
    if (loading || deals.length === 0 || view !== 'empty') return;
    if (!localStorage.getItem(userKey('crm_pipeline_v2'))) {
      localStorage.setItem(
        userKey('crm_pipeline_v2'),
        JSON.stringify({ pipelineName: 'Sales Pipeline', stages: DEFAULT_STAGES })
      );
    }
    setView('board');
  }, [loading, deals.length, view]);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addDropRef.current && !addDropRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Helpers */
  const saveAndGoBoard = async () => {
    // Merge closing stages into the full stage list
    const allStages: Stage[] = [
      ...stages,
      { id: 'won', name: closedWonName || 'Closed Won', color: '#10b981', probability: 100 },
      { id: 'lost', name: closedLostName || 'Closed Lost', color: '#ef4444', probability: 0 },
    ];
    setStages(allStages);
    localStorage.setItem(userKey('crm_pipeline_v2'), JSON.stringify({ pipelineName, stages: allStages }));
    if (dealName.trim()) {
      const target = allStages.find(s => s.id === dealStage) || allStages[0];
      await createDeal({
        title: dealName,
        amount: dealAmount ? Number(dealAmount) : 0,
        stage: target?.id || allStages[0]?.id,
        priority: 'medium',
        probability: target?.probability || 20,
        currency: 'USD',
      } as Partial<Deal>);
    }
    setView('board');
  };

  const resetWizard = () => {
    setSubStep('name_pipeline');
    setPipelineName('Sales Pipeline');
    setStages(DEFAULT_STAGES);
    setClosedWonName('Closed Won');
    setClosedLostName('Closed Lost');
    setDealName('');
    setDealAmount('');
    setDealStage('');
  };

  /* ── Add Deals Dropdown ── */
  const AddDealsBtn = () => (
    <div className="relative" ref={addDropRef}>
      <button
        type="button"
        onClick={() => setShowAddDropdown(v => !v)}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-[3px] text-white"
        style={{ backgroundColor: '#333333' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1a2b3c'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#333333'; }}
      >
        Add deals <ChevronDown size={14} />
      </button>
      {showAddDropdown && (
        <div className="absolute right-0 top-10 z-50 bg-white border border-[#EBEBEB] rounded-[3px] shadow-lg py-1 min-w-[150px]">
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-[#333333] hover:bg-[#FAFAFA]"
            onClick={() => {
              setShowAddDropdown(false);
              if (view === 'board') { setDefaultStage(stages[0]?.id || ''); setEditingDeal(null); setShowDealForm(true); }
              else { setView('setup_modal'); }
            }}
          >
            Create new
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-[#333333] hover:bg-[#FAFAFA]"
            onClick={() => { setShowAddDropdown(false); window.location.href = '/import'; }}
          >
            Import
          </button>
        </div>
      )}
    </div>
  );

  /* ══ EMPTY STATE ══ */
  if (view === 'empty') {
    return (
      <TwentyPageLayout
        icon={<TrendingUp size={15} style={{ color: '#DC2626' }} />}
        title="Opportunities"
        actionExtra={<AddDealsBtn />}
        viewLabel="Sales Pipeline"
        viewCount={0}
      >
        <div className="flex-1 flex items-center justify-center bg-[#FAFAFA] h-full">
          <div className="text-center" style={{ maxWidth: 380 }}>
            {/* Simple pipeline illustration */}
            <svg width="180" height="100" viewBox="0 0 180 100" fill="none" className="mx-auto mb-5">
              {[0, 1, 2, 3].map(i => (
                <g key={i}>
                  <rect x={i * 44 + 4} y={8} width={36} height={10} rx={2} fill="#EBEBEB" />
                  <rect x={i * 44 + 4} y={24} width={36} height={50} rx={2} fill={i === 0 ? '#EEF0FB' : '#fff'} stroke="#EBEBEB" />
                  {i === 0 && <>
                    <rect x={i * 44 + 9} y={30} width={22} height={4} rx={1} fill="#4762D5" opacity={0.6} />
                    <rect x={i * 44 + 9} y={38} width={18} height={3} rx={1} fill="#EBEBEB" />
                    <rect x={i * 44 + 9} y={45} width={20} height={3} rx={1} fill="#EBEBEB" />
                  </>}
                </g>
              ))}
            </svg>
            <h2 className="text-lg font-bold text-[#333333] mb-2">
              Create a deal to start building<br />your winning sales process
            </h2>
            <ul className="text-sm text-[#999999] space-y-1.5 mb-6 text-left inline-block">
              {['Track deals through pipeline stages', 'Set amounts and close dates', 'See all deals in a visual board'].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <span className="text-[#4762D5] mt-0.5">•</span>{t}
                </li>
              ))}
            </ul>
            <br />
            <button
              type="button"
              onClick={() => setView('setup_modal')}
              className="px-5 py-2.5 text-sm font-bold rounded-[3px] text-white"
              style={{ backgroundColor: '#4762D5' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#e8694a'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#4762D5'; }}
            >
              Get started
            </button>
          </div>
        </div>
      </TwentyPageLayout>
    );
  }

  /* ══ SETUP MODAL ══ */
  if (view === 'setup_modal') {
    return (
      <TwentyPageLayout
        icon={<TrendingUp size={15} style={{ color: '#DC2626' }} />}
        title="Opportunities"
        actionExtra={<AddDealsBtn />}
        viewLabel="Sales Pipeline"
        viewCount={0}
      >
        <div className="flex-1 flex items-center justify-center h-full bg-[#FAFAFA]">
          <div className="bg-white border border-[#EBEBEB] rounded-lg shadow-xl" style={{ width: 580 }}>
            <div className="px-8 pt-8 pb-2 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#333333] mb-1">Set up your pipeline and create your first deal</h2>
                <p className="text-sm text-[#999999]">We can help you create the stages of your deals pipeline and add a new deal.</p>
              </div>
              <button type="button" onClick={() => setView('empty')} className="p-1 text-[#B3B3B3] hover:text-[#555555] ml-4 flex-shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-4 px-8 pb-8 mt-5">
              {[
                {
                  title: 'Help me get started',
                  desc: "Answer a few questions and we'll set up your pipeline.",
                  svg: (
                    <svg width="64" height="64" viewBox="0 0 80 80" fill="none" className="mb-3">
                      <rect width="80" height="80" rx="8" fill="#EEF0FB" />
                      <rect x="15" y="20" width="50" height="40" rx="3" fill="white" stroke="#EBEBEB" strokeWidth="1.5" />
                      <rect x="20" y="28" width="12" height="24" rx="1" fill="#4762D5" opacity="0.3" />
                      <rect x="35" y="33" width="12" height="19" rx="1" fill="#4762D5" opacity="0.5" />
                      <rect x="50" y="25" width="12" height="27" rx="1" fill="#4762D5" opacity="0.8" />
                      <circle cx="56" cy="22" r="8" fill="#4762D5" />
                      <path d="M53 22l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  title: "I'll set up myself",
                  desc: 'Manually configure your pipeline stages exactly how you want.',
                  svg: (
                    <svg width="64" height="64" viewBox="0 0 80 80" fill="none" className="mb-3">
                      <rect width="80" height="80" rx="8" fill="#F1F1F1" />
                      <rect x="25" y="18" width="30" height="38" rx="2" fill="white" stroke="#EBEBEB" strokeWidth="1.5" />
                      <rect x="30" y="24" width="20" height="3" rx="1" fill="#EBEBEB" />
                      <rect x="30" y="30" width="16" height="3" rx="1" fill="#EBEBEB" />
                      <rect x="30" y="36" width="18" height="3" rx="1" fill="#EBEBEB" />
                      <circle cx="57" cy="55" r="10" fill="#555555" />
                      <path d="M53 55l2 2 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
              ].map(opt => (
                <button
                  key={opt.title}
                  type="button"
                  onClick={() => { resetWizard(); setView('wizard'); }}
                  className="flex-1 border border-[#EBEBEB] rounded-lg p-5 text-left hover:border-[#4762D5] hover:shadow-md transition-all group"
                >
                  {opt.svg}
                  <div className="text-sm font-bold text-[#333333] group-hover:text-[#4762D5] transition-colors">{opt.title}</div>
                  <div className="text-xs text-[#999999] mt-1 leading-relaxed">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </TwentyPageLayout>
    );
  }

  /* ══ WIZARD ══ */
  if (view === 'wizard') {
    const STEP_ORDER: SubStep[] = ['name_pipeline', 'define_stages', 'closing_stages', 'add_deal', 'choose_stage'];
    const handleBack = () => {
      const idx = STEP_ORDER.indexOf(subStep);
      if (idx > 0) setSubStep(STEP_ORDER[idx - 1]);
      else setView('setup_modal');
    };

    return (
      <TwentyPageLayout
        icon={<TrendingUp size={15} style={{ color: '#DC2626' }} />}
        title="Opportunities"
        viewLabel="Set up your pipeline"
      >
      <div className="flex flex-col h-full bg-white">
        <WizardProgressBar subStep={subStep} />

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: form content — inlined directly to avoid nested-component remount bug */}
          <div className="overflow-y-auto" style={{ width: '50%', padding: '48px 64px 32px' }}>

            {/* ── Step 1: Name pipeline ── */}
            {subStep === 'name_pipeline' && (
              <div>
                <h2 className="text-3xl font-bold text-[#333333] mb-4 leading-tight">
                  Set up your sales process<br />in minutes
                </h2>
                <p className="text-sm text-[#666666] mb-2 leading-relaxed">
                  Your pipeline is an essential tool for tracking your deals as they progress through the sales process — all the way from first contact, to final purchase decision.
                </p>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#4762D5' }}>
                  The first step is to give your pipeline a clear and recognizable name.
                </p>
                <label className="block text-sm font-bold text-[#333333] mb-2">Edit the name of your pipeline</label>
                <input
                  value={pipelineName}
                  onChange={e => setPipelineName(e.target.value)}
                  className="h-10 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333]"
                  style={{ width: 340 }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <div className="mt-6">
                  <button
                    type="button"
                    disabled={!pipelineName.trim()}
                    onClick={() => setSubStep('define_stages')}
                    className="px-5 py-2.5 text-sm font-bold rounded-[3px] text-white disabled:opacity-40"
                    style={{ backgroundColor: '#333333' }}
                    onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLElement).style.backgroundColor = '#1a2b3c'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#333333'; }}
                  >
                    Next: Define deal stages
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2a: Define stage names ── */}
            {subStep === 'define_stages' && (
              <div>
                <h2 className="text-3xl font-bold text-[#333333] mb-4 leading-tight">Define your deal stages</h2>
                <p className="text-sm mb-2 leading-relaxed" style={{ color: '#666666' }}>
                  Deal stages are the steps in your pipeline. They mark the real-life milestones in your sales process.
                </p>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#666666' }}>
                  Start with our suggestions, or rename them as you like. You can also add, remove or rename stages later.
                </p>
                <div className="font-bold text-sm text-[#333333] mb-3">Stage name</div>
                <div className="space-y-2" style={{ maxWidth: 380 }}>
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex items-center gap-2 group">
                      <input
                        value={stage.name}
                        onChange={e => {
                          const val = e.target.value;
                          setStages(prev => prev.map(s => s.id === stage.id ? { ...s, name: val } : s));
                        }}
                        className="flex-1 h-10 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333]"
                        onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setStages(prev => prev.filter(s => s.id !== stage.id))}
                          className="p-1.5 text-[#B3B3B3] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStages(prev => [...prev, { id: `s_${Date.now()}`, name: 'New Stage', color: '#94a3b8', probability: 50 }])}
                  className="mt-3 text-sm font-semibold"
                  style={{ color: '#4762D5' }}
                >
                  Add stage
                </button>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setSubStep('closing_stages')}
                    className="px-5 py-2.5 text-sm font-bold rounded-[3px] text-white"
                    style={{ backgroundColor: '#333333' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1a2b3c'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#333333'; }}
                  >
                    Next: Closing stages
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2b: Closing stages ── */}
            {subStep === 'closing_stages' && (
              <div>
                <h2 className="text-3xl font-bold text-[#333333] mb-4 leading-tight">Define your deal stages</h2>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#666666' }}>
                  The final two stages in your pipeline should indicate whether the deal ended in a successful sale, or if the customer decided not to make a purchase. You can give these stages names too.
                </p>
                <div className="flex gap-6 mb-2" style={{ maxWidth: 420 }}>
                  <div className="flex-1 text-sm font-bold text-[#333333]">Closing stage names</div>
                  <div className="text-sm font-bold text-[#333333] flex items-center gap-1">
                    Deal outcome
                    <span className="w-4 h-4 rounded-full border border-[#EBEBEB] text-[#B3B3B3] text-[10px] flex items-center justify-center cursor-help">i</span>
                  </div>
                </div>
                <div className="space-y-3" style={{ maxWidth: 420 }}>
                  <div className="flex items-center gap-4">
                    <input
                      value={closedWonName}
                      onChange={e => setClosedWonName(e.target.value)}
                      className="flex-1 h-10 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333]"
                      onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <div className="h-10 px-3 flex items-center text-sm text-[#B3B3B3] border border-[#EBEBEB] rounded-[3px] bg-[#FAFAFA]" style={{ minWidth: 80 }}>Won</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      value={closedLostName}
                      onChange={e => setClosedLostName(e.target.value)}
                      className="flex-1 h-10 px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333]"
                      onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <div className="h-10 px-3 flex items-center text-sm text-[#B3B3B3] border border-[#EBEBEB] rounded-[3px] bg-[#FAFAFA]" style={{ minWidth: 80 }}>Lost</div>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setSubStep('add_deal')}
                    className="px-5 py-2.5 text-sm font-bold rounded-[3px] text-white"
                    style={{ backgroundColor: '#333333' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1a2b3c'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#333333'; }}
                  >
                    Next: Create a deal
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3a: Add deal ── */}
            {subStep === 'add_deal' && (
              <div>
                <h2 className="text-3xl font-bold text-[#333333] mb-4 leading-tight">Add a deal</h2>
                <p className="text-sm mb-2 leading-relaxed" style={{ color: '#666666' }}>
                  Whenever a potential customer takes an action that could lead to new revenue, you should create a deal. You can then use that deal to track the progress of the sale in your pipeline.
                </p>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#666666' }}>
                  Create a new deal, or add an existing one your business is working on. Don&apos;t worry about getting the details right — you can change it as the deal progresses.
                </p>
                <div className="space-y-4" style={{ maxWidth: 340 }}>
                  <div>
                    <label className="block text-sm font-bold text-[#333333] mb-2">Deal name</label>
                    <input
                      value={dealName}
                      onChange={e => setDealName(e.target.value)}
                      placeholder="e.g. Consulting: Acme Corp (Sample Deal)"
                      className="h-10 w-full px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] placeholder:text-[#D6D6D6]"
                      onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#333333] mb-2">Amount</label>
                    <input
                      type="number"
                      value={dealAmount}
                      onChange={e => setDealAmount(e.target.value)}
                      placeholder="e.g. 2500"
                      className="h-10 w-full px-3 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] placeholder:text-[#D6D6D6]"
                      onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    disabled={!dealName.trim()}
                    onClick={() => { if (!dealStage) setDealStage(stages[0]?.id || ''); setSubStep('choose_stage'); }}
                    className="px-5 py-2.5 text-sm font-bold rounded-[3px] text-white disabled:opacity-40"
                    style={{ backgroundColor: '#333333' }}
                    onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLElement).style.backgroundColor = '#1a2b3c'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#333333'; }}
                  >
                    Next: Choose a deal stage
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3b: Choose stage ── */}
            {subStep === 'choose_stage' && (
              <div>
                <h2 className="text-3xl font-bold text-[#333333] mb-4 leading-tight">Get into the details</h2>
                <p className="text-sm mb-6 leading-relaxed" style={{ color: '#666666' }}>
                  Choose a deal stage to show where the deal is in your process — so you can see its progress in your pipeline at a glance:
                </p>
                <div style={{ maxWidth: 340 }}>
                  <label className="block text-sm font-bold text-[#333333] mb-2">Deal stage</label>
                  <select
                    value={dealStage}
                    onChange={e => setDealStage(e.target.value)}
                    className="h-10 w-full px-3 pr-8 text-sm border border-[#EBEBEB] rounded-[3px] outline-none text-[#333333] bg-white appearance-none"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23425b76' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                  >
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={saveAndGoBoard}
                    className="px-5 py-2.5 text-sm font-bold rounded-[3px] text-white"
                    style={{ backgroundColor: '#333333' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1a2b3c'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#333333'; }}
                  >
                    See your pipeline in action
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Right: live preview */}
          <div className="flex-1 overflow-y-auto bg-[#f5f8fa]" style={{ borderLeft: '1px solid #EBEBEB' }}>
            {(subStep === 'add_deal' || subStep === 'choose_stage') ? (
              <div className="flex items-start justify-center pt-8 px-6">
                <DealCardPreview dealName={dealName} dealAmount={dealAmount} dealStage={dealStage} stages={stages} />
              </div>
            ) : (
              <div className="pt-8 px-6">
                <TableKanbanPreview pipelineName={pipelineName} stages={stages} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-[#EBEBEB] bg-white flex-shrink-0">
          {subStep !== 'name_pipeline' ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-sm font-semibold text-[#555555] hover:text-[#333333] border border-[#EBEBEB] px-3 py-1.5 rounded-[3px]"
            >
              <ChevronLeft size={14} /> Back
            </button>
          ) : <div />}
          <button
            type="button"
            onClick={() => setView('empty')}
            className="text-sm font-semibold underline"
            style={{ color: '#4762D5' }}
          >
            Cancel
          </button>
        </div>
      </div>
      </TwentyPageLayout>
    );
  }

  /* ══ BOARD VIEW ══ */
  return (
    <TwentyPageLayout
      icon={<TrendingUp size={15} style={{ color: '#DC2626' }} />}
      title="Opportunities"
      actionExtra={<AddDealsBtn />}
      viewLabel={pipelineName}
      viewCount={deals.length}
    >
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[#4762D5] border-t-transparent animate-spin" />
          </div>
        ) : (
          <KanbanBoard
            deals={deals}
            stages={stages}
            onUpdateDeal={async (id, updates) => { await updateDeal(id, updates); }}
            onAddDeal={(stageId) => { setDefaultStage(stageId); setEditingDeal(null); setShowDealForm(true); }}
            onEditDeal={(deal) => { setEditingDeal(deal); setShowDealForm(true); }}
            onDeleteDeal={deleteDeal}
          />
        )}
      </div>

      <DealForm
        open={showDealForm}
        onClose={() => { setShowDealForm(false); setEditingDeal(null); }}
        onSubmit={async (data) => { if (editingDeal) await updateDeal(editingDeal.id, data); else await createDeal(data); }}
        initialData={editingDeal || undefined}
        defaultStage={defaultStage}
        stages={stages}
      />
    </TwentyPageLayout>
  );
}
