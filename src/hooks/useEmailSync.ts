'use client';

import { useState, useEffect } from 'react';
import { userKey, isAnonymousUser } from '@/lib/demoUser';

export interface SyncedEmail {
  id: string;
  contact_id?: string;
  company_id?: string;
  subject: string;
  from_email: string;
  to_email: string;
  body_preview: string;
  received_at: string;
  is_opened: boolean;
  gmail_thread_id?: string;
}

interface EmailSyncState {
  connected: boolean;
  gmail_email: string;
  track_opens: boolean;
  log_to_crm: boolean;
  emails: SyncedEmail[];
}

const STORAGE_KEY = 'crm_email_sync_v1';

function defaultState(): EmailSyncState {
  return { connected: false, gmail_email: '', track_opens: true, log_to_crm: true, emails: [] };
}

function loadState(): EmailSyncState {
  try {
    const raw = localStorage.getItem(userKey(STORAGE_KEY));
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
  } catch { return defaultState(); }
}

function saveState(s: EmailSyncState) {
  try { localStorage.setItem(userKey(STORAGE_KEY), JSON.stringify(s)); } catch {}
}

// Seeded mock emails linked to mock contact/company IDs
const SEED_EMAILS: SyncedEmail[] = [
  {
    id: 'email-1', contact_id: 'cont-1', company_id: 'comp-1',
    subject: 'Re: Enterprise License Proposal Q1',
    from_email: 'alice.johnson@techcorp.com', to_email: 'admin@company.com',
    body_preview: 'Thanks for sending over the proposal. We reviewed it with our legal team and have a few questions about the SLA terms in section 4...',
    received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), is_opened: true,
  },
  {
    id: 'email-2', contact_id: 'cont-1', company_id: 'comp-1',
    subject: 'Follow-up: Demo meeting recap',
    from_email: 'admin@company.com', to_email: 'alice.johnson@techcorp.com',
    body_preview: "Hi Alice, great speaking with you today! As promised, I'm attaching the product overview and our case studies from similar enterprise deployments...",
    received_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), is_opened: true,
  },
  {
    id: 'email-3', contact_id: 'cont-2', company_id: 'comp-2',
    subject: 'Q1 Budget Review - CRM Integration',
    from_email: 'bob.smith@globalfinance.com', to_email: 'admin@company.com',
    body_preview: "Our Q1 budget was approved yesterday. I'd like to move forward with the CRM integration project. Can we schedule a call this week to discuss implementation timelines?",
    received_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), is_opened: false,
  },
  {
    id: 'email-4', contact_id: 'cont-3', company_id: 'comp-3',
    subject: 'Technical Requirements for HIPAA Compliance',
    from_email: 'carol.williams@healthfirst.com', to_email: 'admin@company.com',
    body_preview: 'Before we proceed, our compliance team needs answers to a few technical questions. Specifically around data residency, encryption at rest, and audit logging...',
    received_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), is_opened: true,
  },
  {
    id: 'email-5', contact_id: 'cont-2', company_id: 'comp-2',
    subject: 'Introduction: New CRM Platform',
    from_email: 'admin@company.com', to_email: 'bob.smith@globalfinance.com',
    body_preview: "Hi Bob, I hope this email finds you well. I wanted to introduce our CRM platform which has been helping finance teams like yours streamline their sales process...",
    received_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), is_opened: true,
  },
  {
    id: 'email-6', contact_id: 'cont-4', company_id: 'comp-4',
    subject: 'Pricing Inquiry - EduLearn Partnership',
    from_email: 'david.brown@edulearn.io', to_email: 'admin@company.com',
    body_preview: "We're evaluating CRM solutions for our growing sales team (currently 12 reps, expecting to hire 8 more by Q3). Could you send over your pricing tiers?",
    received_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), is_opened: false,
  },
];

export function useEmailSync() {
  const [state, setState] = useState<EmailSyncState>(defaultState);

  useEffect(() => {
    setState(loadState());
    // Refresh from localStorage on window focus (cross-tab sync)
    const onFocus = () => setState(loadState());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const update = (patch: Partial<EmailSyncState>) => {
    setState(prev => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  };

  const connectGmail = (email: string) => {
    // Anonymous demo users get seeded emails; real accounts start empty
    const emails = isAnonymousUser() ? SEED_EMAILS : [];
    update({ connected: true, gmail_email: email, emails });
  };

  const disconnectGmail = () => {
    update({ connected: false, gmail_email: '', emails: [] });
  };

  const deleteEmail = (id: string) => {
    setState(prev => {
      const next = { ...prev, emails: prev.emails.filter(e => e.id !== id) };
      saveState(next);
      return next;
    });
  };

  const getEmailsForContact = (contactId: string) =>
    state.emails.filter(e => e.contact_id === contactId);

  const getEmailsForCompany = (companyId: string) =>
    state.emails.filter(e => e.company_id === companyId);

  return {
    isConnected: state.connected,
    gmailEmail: state.gmail_email,
    trackOpens: state.track_opens,
    logToCRM: state.log_to_crm,
    emails: state.emails,
    connectGmail,
    disconnectGmail,
    deleteEmail,
    getEmailsForContact,
    getEmailsForCompany,
    setTrackOpens: (v: boolean) => update({ track_opens: v }),
    setLogToCRM: (v: boolean) => update({ log_to_crm: v }),
  };
}
