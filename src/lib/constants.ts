export const PIPELINE_STAGES = [
  { id: 'intro_call', name: 'Intro Call', probability: 5, color: '#94A3B8', order: 1 },
  { id: 'first_email', name: 'First Email', probability: 10, color: '#60A5FA', order: 2 },
  { id: 'need_analysis', name: 'Need Analysis Call', probability: 20, color: '#818CF8', order: 3 },
  { id: 'appointment_setting', name: 'Appointment Setting', probability: 30, color: '#A78BFA', order: 4 },
  { id: 'meeting', name: 'Meeting', probability: 40, color: '#C084FC', order: 5 },
  { id: 'followup_email', name: 'Follow-up Email', probability: 50, color: '#E879F9', order: 6 },
  { id: 'terms_conditions', name: 'Terms & Conditions', probability: 60, color: '#FB923C', order: 7 },
  { id: 'agreement', name: 'Agreement', probability: 75, color: '#FBBF24', order: 8 },
  { id: 'start_date', name: 'Start Date', probability: 85, color: '#34D399', order: 9 },
  { id: 'after_sales', name: 'After-Sales', probability: 90, color: '#10B981', order: 10 },
  { id: 'retention_management', name: 'Retention Management', probability: 95, color: '#059669', order: 11 },
  { id: 'referral_management', name: 'Referral Management', probability: 98, color: '#6366F1', order: 12 },
] as const;

export const LEAD_STATUSES = [
  { value: 'new', label: 'New', color: '#60A5FA' },
  { value: 'contacted', label: 'Contacted', color: '#A78BFA' },
  { value: 'qualified', label: 'Qualified', color: '#34D399' },
  { value: 'unqualified', label: 'Unqualified', color: '#F87171' },
  { value: 'converted', label: 'Converted', color: '#6366F1' },
] as const;

export const LIFECYCLE_STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'marketing_qualified', label: 'Marketing Qualified' },
  { value: 'sales_qualified', label: 'Sales Qualified' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'customer', label: 'Customer' },
  { value: 'evangelist', label: 'Evangelist' },
] as const;

export const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call', icon: 'Phone' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'meeting', label: 'Meeting', icon: 'Calendar' },
  { value: 'note', label: 'Note', icon: 'FileText' },
  { value: 'task', label: 'Task', icon: 'CheckSquare' },
] as const;

export const DEAL_PRIORITIES = [
  { value: 'low', label: 'Low', color: '#94A3B8' },
  { value: 'medium', label: 'Medium', color: '#FBBF24' },
  { value: 'high', label: 'High', color: '#FB923C' },
  { value: 'urgent', label: 'Urgent', color: '#F87171' },
] as const;

export const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
] as const;

export const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Retail',
  'Manufacturing',
  'Real Estate',
  'Consulting',
  'Marketing',
  'Legal',
  'Other',
] as const;

export const CONTACT_IMPORT_FIELDS = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'mobile', label: 'Mobile', required: false },
  { key: 'job_title', label: 'Job Title', required: false },
  { key: 'department', label: 'Department', required: false },
  { key: 'company', label: 'Company Name', required: false },
  { key: 'source', label: 'Source', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'country', label: 'Country', required: false },
  { key: 'notes', label: 'Notes', required: false },
] as const;
