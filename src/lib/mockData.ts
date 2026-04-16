import { Contact, Company, Deal, Activity, Task, EmailTemplate, DashboardMetrics, RevenueDataPoint } from '@/types';

export const mockCompanies: Company[] = [
  {
    id: 'comp-1',
    name: 'TechCorp Solutions',
    domain: 'techcorp.com',
    industry: 'Technology',
    size: '201-500',
    website: 'https://techcorp.com',
    phone: '+1 (555) 100-2000',
    city: 'San Francisco',
    country: 'USA',
    description: 'Enterprise software solutions company',
    annual_revenue: 5000000,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'comp-2',
    name: 'Global Finance Ltd',
    domain: 'globalfinance.com',
    industry: 'Finance',
    size: '501-1000',
    website: 'https://globalfinance.com',
    phone: '+1 (555) 200-3000',
    city: 'New York',
    country: 'USA',
    description: 'International financial services',
    annual_revenue: 25000000,
    created_at: '2024-02-10T00:00:00Z',
    updated_at: '2024-11-15T00:00:00Z',
  },
  {
    id: 'comp-3',
    name: 'HealthFirst Medical',
    domain: 'healthfirst.com',
    industry: 'Healthcare',
    size: '1000+',
    website: 'https://healthfirst.com',
    phone: '+1 (555) 300-4000',
    city: 'Boston',
    country: 'USA',
    description: 'Healthcare technology and services',
    annual_revenue: 50000000,
    created_at: '2024-03-05T00:00:00Z',
    updated_at: '2024-12-10T00:00:00Z',
  },
  {
    id: 'comp-4',
    name: 'EduLearn Platform',
    domain: 'edulearn.io',
    industry: 'Education',
    size: '51-200',
    website: 'https://edulearn.io',
    phone: '+1 (555) 400-5000',
    city: 'Austin',
    country: 'USA',
    description: 'Online education platform',
    annual_revenue: 2000000,
    created_at: '2024-04-20T00:00:00Z',
    updated_at: '2024-12-05T00:00:00Z',
  },
  {
    id: 'comp-5',
    name: 'RetailMax Chain',
    domain: 'retailmax.com',
    industry: 'Retail',
    size: '1000+',
    website: 'https://retailmax.com',
    city: 'Chicago',
    country: 'USA',
    description: 'National retail chain',
    annual_revenue: 100000000,
    created_at: '2024-05-12T00:00:00Z',
    updated_at: '2024-11-30T00:00:00Z',
  },
];

export const mockContacts: Contact[] = [
  {
    id: 'cont-1',
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice.johnson@techcorp.com',
    phone: '+1 (555) 001-1001',
    job_title: 'CEO',
    department: 'Executive',
    company_id: 'comp-1',
    company: mockCompanies[0],
    lead_status: 'qualified',
    lifecycle_stage: 'opportunity',
    source: 'LinkedIn',
    city: 'San Francisco',
    country: 'USA',
    is_active: true,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'cont-2',
    first_name: 'Bob',
    last_name: 'Smith',
    email: 'bob.smith@globalfinance.com',
    phone: '+1 (555) 002-2002',
    job_title: 'CFO',
    department: 'Finance',
    company_id: 'comp-2',
    company: mockCompanies[1],
    lead_status: 'contacted',
    lifecycle_stage: 'sales_qualified',
    source: 'Referral',
    city: 'New York',
    country: 'USA',
    is_active: true,
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-11-20T00:00:00Z',
  },
  {
    id: 'cont-3',
    first_name: 'Carol',
    last_name: 'Williams',
    email: 'carol.williams@healthfirst.com',
    phone: '+1 (555) 003-3003',
    job_title: 'CTO',
    department: 'Technology',
    company_id: 'comp-3',
    company: mockCompanies[2],
    lead_status: 'qualified',
    lifecycle_stage: 'customer',
    source: 'Conference',
    city: 'Boston',
    country: 'USA',
    is_active: true,
    created_at: '2024-03-10T00:00:00Z',
    updated_at: '2024-12-05T00:00:00Z',
  },
  {
    id: 'cont-4',
    first_name: 'David',
    last_name: 'Brown',
    email: 'david.brown@edulearn.io',
    phone: '+1 (555) 004-4004',
    job_title: 'VP Sales',
    department: 'Sales',
    company_id: 'comp-4',
    company: mockCompanies[3],
    lead_status: 'new',
    lifecycle_stage: 'lead',
    source: 'Website',
    city: 'Austin',
    country: 'USA',
    is_active: true,
    created_at: '2024-04-25T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'cont-5',
    first_name: 'Emma',
    last_name: 'Davis',
    email: 'emma.davis@retailmax.com',
    phone: '+1 (555) 005-5005',
    job_title: 'Director of Procurement',
    department: 'Operations',
    company_id: 'comp-5',
    company: mockCompanies[4],
    lead_status: 'converted',
    lifecycle_stage: 'customer',
    source: 'Trade Show',
    city: 'Chicago',
    country: 'USA',
    is_active: true,
    created_at: '2024-05-15T00:00:00Z',
    updated_at: '2024-11-28T00:00:00Z',
  },
  {
    id: 'cont-6',
    first_name: 'Frank',
    last_name: 'Wilson',
    email: 'frank.wilson@techcorp.com',
    phone: '+1 (555) 006-6006',
    job_title: 'Product Manager',
    department: 'Product',
    company_id: 'comp-1',
    company: mockCompanies[0],
    lead_status: 'contacted',
    lifecycle_stage: 'marketing_qualified',
    source: 'Email Campaign',
    city: 'San Francisco',
    country: 'USA',
    is_active: true,
    created_at: '2024-06-10T00:00:00Z',
    updated_at: '2024-12-03T00:00:00Z',
  },
  {
    id: 'cont-7',
    first_name: 'Grace',
    last_name: 'Taylor',
    email: 'grace.taylor@globalfinance.com',
    phone: '+1 (555) 007-7007',
    job_title: 'Investment Director',
    department: 'Investments',
    company_id: 'comp-2',
    company: mockCompanies[1],
    lead_status: 'qualified',
    lifecycle_stage: 'opportunity',
    source: 'LinkedIn',
    city: 'New York',
    country: 'USA',
    is_active: true,
    created_at: '2024-07-05T00:00:00Z',
    updated_at: '2024-12-07T00:00:00Z',
  },
  {
    id: 'cont-8',
    first_name: 'Henry',
    last_name: 'Anderson',
    email: 'henry.anderson@startup.io',
    phone: '+1 (555) 008-8008',
    job_title: 'Founder',
    department: 'Executive',
    lead_status: 'new',
    lifecycle_stage: 'lead',
    source: 'Cold Outreach',
    city: 'Seattle',
    country: 'USA',
    is_active: true,
    created_at: '2024-08-20T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
];

export const mockDeals: Deal[] = [
  {
    id: 'deal-1',
    title: 'TechCorp Enterprise License',
    amount: 125000,
    currency: 'USD',
    stage: 'agreement',
    priority: 'high',
    probability: 75,
    close_date: '2025-02-28',
    company_id: 'comp-1',
    company: mockCompanies[0],
    description: 'Annual enterprise software license for 500 users',
    created_at: '2024-11-01T00:00:00Z',
    updated_at: '2024-12-10T00:00:00Z',
  },
  {
    id: 'deal-2',
    title: 'Global Finance Data Platform',
    amount: 350000,
    currency: 'USD',
    stage: 'meeting',
    priority: 'urgent',
    probability: 40,
    close_date: '2025-03-31',
    company_id: 'comp-2',
    company: mockCompanies[1],
    description: 'Custom data analytics platform implementation',
    created_at: '2024-10-15T00:00:00Z',
    updated_at: '2024-12-08T00:00:00Z',
  },
  {
    id: 'deal-3',
    title: 'HealthFirst IT Infrastructure',
    amount: 500000,
    currency: 'USD',
    stage: 'terms_conditions',
    priority: 'high',
    probability: 60,
    close_date: '2025-01-31',
    company_id: 'comp-3',
    company: mockCompanies[2],
    description: 'Complete IT infrastructure overhaul',
    created_at: '2024-09-20T00:00:00Z',
    updated_at: '2024-12-09T00:00:00Z',
  },
  {
    id: 'deal-4',
    title: 'EduLearn CRM Integration',
    amount: 45000,
    currency: 'USD',
    stage: 'need_analysis',
    priority: 'medium',
    probability: 20,
    close_date: '2025-04-30',
    company_id: 'comp-4',
    company: mockCompanies[3],
    description: 'CRM system integration with LMS',
    created_at: '2024-11-10T00:00:00Z',
    updated_at: '2024-12-07T00:00:00Z',
  },
  {
    id: 'deal-5',
    title: 'RetailMax POS System',
    amount: 220000,
    currency: 'USD',
    stage: 'start_date',
    priority: 'high',
    probability: 85,
    close_date: '2025-01-15',
    company_id: 'comp-5',
    company: mockCompanies[4],
    description: 'Enterprise POS system for 50 locations',
    created_at: '2024-10-01T00:00:00Z',
    updated_at: '2024-12-11T00:00:00Z',
  },
  {
    id: 'deal-6',
    title: 'TechCorp Mobile App Development',
    amount: 85000,
    currency: 'USD',
    stage: 'intro_call',
    priority: 'medium',
    probability: 5,
    close_date: '2025-06-30',
    company_id: 'comp-1',
    company: mockCompanies[0],
    description: 'Mobile app development project',
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-06T00:00:00Z',
  },
  {
    id: 'deal-7',
    title: 'Global Finance Compliance Tool',
    amount: 180000,
    currency: 'USD',
    stage: 'first_email',
    priority: 'high',
    probability: 10,
    close_date: '2025-05-31',
    company_id: 'comp-2',
    company: mockCompanies[1],
    description: 'Regulatory compliance management tool',
    created_at: '2024-12-05T00:00:00Z',
    updated_at: '2024-12-10T00:00:00Z',
  },
  {
    id: 'deal-8',
    title: 'HealthFirst Telemedicine Platform',
    amount: 750000,
    currency: 'USD',
    stage: 'after_sales',
    priority: 'urgent',
    probability: 90,
    close_date: '2025-01-10',
    company_id: 'comp-3',
    company: mockCompanies[2],
    description: 'Full telemedicine platform deployment',
    created_at: '2024-08-15T00:00:00Z',
    updated_at: '2024-12-11T00:00:00Z',
  },
  {
    id: 'deal-9',
    title: 'RetailMax Analytics Dashboard',
    amount: 95000,
    currency: 'USD',
    stage: 'retention_management',
    priority: 'medium',
    probability: 95,
    close_date: '2024-12-31',
    company_id: 'comp-5',
    company: mockCompanies[4],
    description: 'Real-time analytics and reporting dashboard',
    created_at: '2024-07-20T00:00:00Z',
    updated_at: '2024-12-09T00:00:00Z',
  },
  {
    id: 'deal-10',
    title: 'EduLearn Content Management',
    amount: 60000,
    currency: 'USD',
    stage: 'appointment_setting',
    priority: 'low',
    probability: 30,
    close_date: '2025-05-01',
    company_id: 'comp-4',
    company: mockCompanies[3],
    description: 'Content management system for courses',
    created_at: '2024-11-25T00:00:00Z',
    updated_at: '2024-12-08T00:00:00Z',
  },
];

export const mockActivities: Activity[] = [
  {
    id: 'act-1',
    type: 'call',
    title: 'Discovery call with Alice Johnson',
    description: 'Discussed enterprise license requirements and timeline',
    contact_id: 'cont-1',
    contact: mockContacts[0],
    deal_id: 'deal-1',
    is_completed: true,
    completed_at: '2024-12-10T14:00:00Z',
    created_at: '2024-12-10T13:00:00Z',
    updated_at: '2024-12-10T14:00:00Z',
  },
  {
    id: 'act-2',
    type: 'email',
    title: 'Sent proposal to Bob Smith',
    description: 'Sent detailed proposal for data platform project',
    contact_id: 'cont-2',
    contact: mockContacts[1],
    deal_id: 'deal-2',
    is_completed: true,
    completed_at: '2024-12-09T10:30:00Z',
    created_at: '2024-12-09T10:00:00Z',
    updated_at: '2024-12-09T10:30:00Z',
  },
  {
    id: 'act-3',
    type: 'meeting',
    title: 'Product demo with Carol Williams',
    description: 'Full product demonstration for IT infrastructure project',
    contact_id: 'cont-3',
    contact: mockContacts[2],
    deal_id: 'deal-3',
    is_completed: true,
    completed_at: '2024-12-08T16:00:00Z',
    created_at: '2024-12-08T15:00:00Z',
    updated_at: '2024-12-08T16:00:00Z',
  },
  {
    id: 'act-4',
    type: 'note',
    title: 'Notes from David Brown conversation',
    description: 'David is interested but needs internal approval. Follow up in 2 weeks.',
    contact_id: 'cont-4',
    is_completed: true,
    completed_at: '2024-12-07T11:00:00Z',
    created_at: '2024-12-07T11:00:00Z',
    updated_at: '2024-12-07T11:00:00Z',
  },
  {
    id: 'act-5',
    type: 'call',
    title: 'Follow-up call with Emma Davis',
    description: 'Discussed POS system implementation timeline and pricing',
    contact_id: 'cont-5',
    contact: mockContacts[4],
    deal_id: 'deal-5',
    is_completed: true,
    completed_at: '2024-12-11T09:00:00Z',
    created_at: '2024-12-11T09:00:00Z',
    updated_at: '2024-12-11T09:00:00Z',
  },
  {
    id: 'act-6',
    type: 'deal_created',
    title: 'New deal created: TechCorp Mobile App',
    contact_id: 'cont-6',
    deal_id: 'deal-6',
    is_completed: true,
    completed_at: '2024-12-01T08:00:00Z',
    created_at: '2024-12-01T08:00:00Z',
    updated_at: '2024-12-01T08:00:00Z',
  },
  {
    id: 'act-7',
    type: 'email',
    title: 'Initial outreach to Grace Taylor',
    description: 'Sent introduction email about compliance tools',
    contact_id: 'cont-7',
    contact: mockContacts[6],
    deal_id: 'deal-7',
    is_completed: true,
    completed_at: '2024-12-05T14:00:00Z',
    created_at: '2024-12-05T13:30:00Z',
    updated_at: '2024-12-05T14:00:00Z',
  },
];

export const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Send contract to TechCorp',
    description: 'Prepare and send the enterprise license contract to Alice Johnson',
    due_date: '2024-12-15T17:00:00Z',
    priority: 'high',
    status: 'todo',
    contact_id: 'cont-1',
    deal_id: 'deal-1',
    created_at: '2024-12-10T00:00:00Z',
    updated_at: '2024-12-10T00:00:00Z',
  },
  {
    id: 'task-2',
    title: 'Schedule product demo for Global Finance',
    description: 'Arrange a live demo for the data platform project',
    due_date: '2024-12-18T12:00:00Z',
    priority: 'urgent',
    status: 'in_progress',
    contact_id: 'cont-2',
    deal_id: 'deal-2',
    created_at: '2024-12-09T00:00:00Z',
    updated_at: '2024-12-11T00:00:00Z',
  },
  {
    id: 'task-3',
    title: 'Follow up on HealthFirst proposal',
    description: 'Check if Carol has reviewed the infrastructure proposal',
    due_date: '2024-12-14T10:00:00Z',
    priority: 'high',
    status: 'todo',
    contact_id: 'cont-3',
    deal_id: 'deal-3',
    created_at: '2024-12-08T00:00:00Z',
    updated_at: '2024-12-08T00:00:00Z',
  },
  {
    id: 'task-4',
    title: 'Prepare Q1 2025 outreach list',
    description: 'Compile list of prospects for Q1 outreach campaign',
    due_date: '2024-12-20T17:00:00Z',
    priority: 'medium',
    status: 'todo',
    created_at: '2024-12-05T00:00:00Z',
    updated_at: '2024-12-05T00:00:00Z',
  },
  {
    id: 'task-5',
    title: 'Update CRM with meeting notes',
    description: 'Document all notes from this weeks client meetings',
    due_date: '2024-12-13T17:00:00Z',
    priority: 'medium',
    status: 'completed',
    created_at: '2024-12-11T00:00:00Z',
    updated_at: '2024-12-11T00:00:00Z',
  },
];

export const mockEmailTemplates: EmailTemplate[] = [
  {
    id: 'templ-1',
    name: 'Initial Outreach',
    subject: 'Quick question about {{company_name}}',
    body: `Hi {{first_name}},

I came across {{company_name}} and was impressed by your work in {{industry}}.

I'd love to connect and share how we've been helping similar companies achieve [specific benefit].

Would you be open to a quick 15-minute call this week?

Best regards,
{{sender_name}}`,
    category: 'Outreach',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'templ-2',
    name: 'Follow-up After Meeting',
    subject: 'Great meeting you, {{first_name}}!',
    body: `Hi {{first_name}},

It was a pleasure speaking with you today about {{topic}}.

As discussed, I'm sending over the following:
- [Summary of key points discussed]
- [Next steps agreed upon]
- [Proposal/Documentation as needed]

I'll follow up on {{follow_up_date}} to see if you have any questions.

Looking forward to moving forward together!

Best,
{{sender_name}}`,
    category: 'Follow-up',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'templ-3',
    name: 'Proposal Sent',
    subject: 'Your custom proposal from [Company Name]',
    body: `Dear {{first_name}},

Thank you for the opportunity to present our solution to {{company_name}}.

Please find attached our detailed proposal which includes:
- Solution overview tailored to your needs
- Implementation timeline
- Investment details
- ROI projections

I'd love to schedule a call to walk you through the proposal and answer any questions.

Please let me know your availability for a 30-minute review session.

Warm regards,
{{sender_name}}`,
    category: 'Sales',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'templ-4',
    name: 'Check-in / Nurture',
    subject: 'Checking in - {{first_name}}',
    body: `Hi {{first_name}},

I hope things are going well at {{company_name}}!

I wanted to reach out with a quick update on how the industry is evolving and share a resource that might be valuable for you:

[Insert relevant article/case study/insight]

Also, our team has recently launched [new feature/service] that directly addresses [pain point] - something you mentioned was a priority.

Would love to catch up when you have 10 minutes. Any time this week work for you?

Best,
{{sender_name}}`,
    category: 'Nurture',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'templ-5',
    name: 'Demo Request',
    subject: 'Ready to see it in action, {{first_name}}?',
    body: `Hi {{first_name}},

I'd love to show you exactly how we can help {{company_name}} achieve [specific outcome].

In our 20-minute demo, I'll walk you through:
- [Key feature 1] — how it solves [pain point]
- [Key feature 2] — a real example from a similar company
- How quickly you can get up and running

No pressure, no sales pitch — just a focused look at whether this is a fit.

Here's my calendar link: [insert link]

Or reply with a time that works for you.

Talk soon,
{{sender_name}}`,
    category: 'Outreach',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'templ-6',
    name: 'Re-engagement / Win-back',
    subject: "{{first_name}}, it's been a while",
    body: `Hi {{first_name}},

I noticed we haven't connected in a while, and I wanted to reach out.

A lot has changed since we last spoke — we've shipped several updates that address [specific challenge] and a number of companies like {{company_name}} have seen [specific result].

I don't want to assume anything has changed on your end, but if you're still evaluating solutions for [problem area], I'd love to reconnect and show you what's new.

Would a quick 15-minute call this week work?

Best,
{{sender_name}}`,
    category: 'Follow-up',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'templ-7',
    name: 'Thank You Note',
    subject: 'Thank you, {{first_name}}!',
    body: `Hi {{first_name}},

Thank you for taking the time to [meet with us / try our product / share your feedback] today.

It was great learning more about {{company_name}} and understanding [specific challenge or goal they mentioned].

As a next step, I'll [send over the proposal / schedule a follow-up / loop in my team] by [date].

In the meantime, feel free to reach out if you have any questions.

Warm regards,
{{sender_name}}`,
    category: 'Follow-up',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'templ-8',
    name: 'Pricing / Quote Request',
    subject: 'Your custom quote from [Company Name]',
    body: `Hi {{first_name}},

Thank you for your interest! Based on what you've shared about {{company_name}}, here's a tailored pricing overview:

Plan: [Plan Name]
- [Feature 1]
- [Feature 2]
- [Feature 3]

Investment: [Price] / [billing period]
Setup: [Onboarding timeline]

This pricing is valid through [expiry date]. I'm happy to walk through any line item in detail.

Should we schedule a quick call to finalize the details?

Best,
{{sender_name}}`,
    category: 'Sales',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const mockDashboardMetrics: DashboardMetrics = {
  totalContacts: 8,
  totalCompanies: 5,
  activeDeals: 10,
  pipelineRevenue: 2410000,
  winRate: 68,
  monthlyGrowth: 12,
};

export const mockRevenueData: RevenueDataPoint[] = [
  { month: 'Jul', revenue: 320000, deals: 8 },
  { month: 'Aug', revenue: 410000, deals: 12 },
  { month: 'Sep', revenue: 380000, deals: 10 },
  { month: 'Oct', revenue: 520000, deals: 15 },
  { month: 'Nov', revenue: 490000, deals: 13 },
  { month: 'Dec', revenue: 630000, deals: 18 },
];
