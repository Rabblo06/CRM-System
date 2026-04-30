export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  description?: string;
  logo_url?: string;
  annual_revenue?: number;
  email?: string;
  mobile?: string;
  manager_name?: string;
  email_note?: string;
  next_step?: string;
  status?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  _count?: {
    contacts?: number;
    deals?: number;
  };
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  company_id?: string;
  company?: Company;
  lead_status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  lifecycle_stage: 'lead' | 'marketing_qualified' | 'sales_qualified' | 'opportunity' | 'customer' | 'evangelist';
  source?: string;
  linkedin_url?: string;
  twitter_url?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  manager_name?: string;
  email_note?: string;
  next_step?: string;
  avatar_url?: string;
  is_active: boolean;
  last_contacted_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  probability: number;
  color: string;
}

export interface Deal {
  id: string;
  title: string;
  amount: number;
  currency: string;
  stage: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  probability: number;
  close_date?: string;
  company_id?: string;
  company?: Company;
  owner_id?: string;
  owner?: User;
  description?: string;
  is_won?: boolean;
  closed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  contacts?: Contact[];
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'deal_created' | 'deal_updated' | 'contact_created';
  title: string;
  description?: string;
  contact_id?: string;
  contact?: Contact;
  company_id?: string;
  company?: Company;
  deal_id?: string;
  deal?: Deal;
  user_id?: string;
  user?: User;
  scheduled_at?: string;
  completed_at?: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  task_type?: string;
  contact_id?: string;
  contact?: Contact & { company?: Company };
  company_id?: string;
  company?: Company;
  deal_id?: string;
  deal?: Deal;
  assigned_to?: string;
  assignee?: User;
  created_by?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Reminder fields
  reminder_minutes?: number | null;
  reminder_time?: string | null;
  reminder_sent?: boolean;
  calendar_event_id?: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  meeting_url?: string;
  contact_id?: string;
  contact?: Contact;
  deal_id?: string;
  deal?: Deal;
  organizer_id?: string;
  organizer?: User;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ImportHistory {
  id: string;
  file_name: string;
  file_size?: number;
  type: 'contacts' | 'companies' | 'deals';
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  errors: ImportError[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_by?: string;
  created_at: string;
  completed_at?: string;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalContacts: number;
  totalCompanies: number;
  activeDeals: number;
  pipelineRevenue: number;
  winRate: number;
  monthlyGrowth: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  deals: number;
}
