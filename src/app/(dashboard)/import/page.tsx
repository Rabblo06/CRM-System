'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Users,
  Building2,
  TrendingUp,
  Check,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContacts, useCompanies, useDeals } from '@/hooks/useData';
import { useCustomFields } from '@/hooks/useCustomFields';
import type { Deal } from '@/types';

type ImportType = 'contacts' | 'companies' | 'deals' | null;
type WizardStep = 'type' | 'upload' | 'map' | 'review' | 'done';

const CONTACT_FIELDS = [
  { value: 'first_name', label: 'First Name', required: true },
  { value: 'last_name', label: 'Last Name', required: true },
  { value: 'email', label: 'Email Address' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'job_title', label: 'Job Title' },
  { value: 'department', label: 'Department' },
  { value: 'company', label: 'Company Name' },
  { value: 'lead_status', label: 'Lead Status' },
  { value: 'lifecycle_stage', label: 'Lifecycle Stage' },
  { value: 'source', label: 'Lead Source' },
  { value: 'city', label: 'City' },
  { value: 'country', label: 'Country' },
  { value: 'notes', label: 'Notes' },
  { value: '__skip__', label: "Don't import this column" },
  { value: '__custom__', label: 'Create new field (use column name)' },
];

const COMPANY_FIELDS = [
  { value: 'name', label: 'Company Name', required: true },
  { value: 'industry', label: 'Industry' },
  { value: 'size', label: 'Company Size' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'city', label: 'City' },
  { value: 'country', label: 'Country' },
  { value: '__skip__', label: "Don't import this column" },
  { value: '__custom__', label: 'Create new field (use column name)' },
];

const DEAL_FIELDS = [
  { value: 'title',        label: 'Deal Name',         required: true },
  { value: 'amount',       label: 'Deals Value' },
  { value: 'stage',        label: 'Stage' },
  { value: 'priority',     label: 'Priority' },
  { value: 'close_date',   label: 'Close Date' },
  { value: 'account_name', label: 'Accounts' },
  { value: 'email',        label: 'Email' },
  { value: 'phone',        label: 'Phone Number' },
  { value: 'mobile',       label: 'Mobile No' },
  { value: 'position',     label: 'Position' },
  { value: 'address',      label: 'Address' },
  { value: 'manager_name', label: 'Name of Manager' },
  { value: 'email_note',   label: 'Emailnote' },
  { value: 'next_step',    label: 'Next Step' },
  { value: 'description',  label: 'Activities Timeline' },
  { value: '__skip__',     label: "Don't import this column" },
  { value: '__custom__',   label: 'Create new field (use column name)' },
];

const CONTACT_AUTO_MAP: Record<string, string> = {
  'first name': 'first_name',   'firstname': 'first_name',
  'last name': 'last_name',     'lastname': 'last_name',
  'email': 'email',             'email address': 'email',
  'phone': 'phone',             'phone number': 'phone',
  'job title': 'job_title',     'title': 'job_title',
  'department': 'department',
  'company': 'company',         'company name': 'company',
  'source': 'source',           'lead source': 'source',
  'city': 'city',
  'country': 'country',
  'notes': 'notes',
};

const COMPANY_AUTO_MAP: Record<string, string> = {
  'name': 'name',               'company name': 'name',
  'company': 'name',            'organization': 'name',
  'industry': 'industry',       'sector': 'industry',
  'size': 'size',               'company size': 'size',   'employees': 'size',
  'website': 'website',         'url': 'website',         'web': 'website',
  'email': 'email',             'email address': 'email',
  'phone': 'phone',             'phone number': 'phone',  'telephone': 'phone',
  'city': 'city',
  'country': 'country',
};

const DEAL_AUTO_MAP: Record<string, string> = {
  'deal name': 'title',   'dealname': 'title',    'name': 'title',
  'deal': 'title',        'opportunity': 'title',
  'amount': 'amount',     'value': 'amount',      'deal value': 'amount',
  'deals value': 'amount','revenue': 'amount',    'price': 'amount',
  'stage': 'stage',       'pipeline stage': 'stage',
  'priority': 'priority',
  'close date': 'close_date', 'closing date': 'close_date',
  'closedate': 'close_date',  'expected close': 'close_date',
  'account': 'account_name',  'accounts': 'account_name',
  'company': 'account_name',  'company name': 'account_name',
  'organization': 'account_name',
  'email': 'email',           'email address': 'email',
  'phone': 'phone',           'phone number': 'phone',   'telephone': 'phone',
  'mobile': 'mobile',         'mobile no': 'mobile',     'mobile number': 'mobile',
  'cell': 'mobile',
  'position': 'position',     'job title': 'position',   'role': 'position',
  'address': 'address',       'street address': 'address',
  'manager': 'manager_name',  'manager name': 'manager_name',
  'name of manager': 'manager_name',
  'email note': 'email_note', 'emailnote': 'email_note',
  'next step': 'next_step',   'nextstep': 'next_step',   'next action': 'next_step',
  'activities': 'description','activities timeline': 'description',
  'notes': 'description',     'description': 'description', 'comments': 'description',
};

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'type', label: 'Select type' },
  { id: 'upload', label: 'Upload file' },
  { id: 'map', label: 'Map columns' },
  { id: 'review', label: 'Review & import' },
];

export default function ImportPage() {
  const { contacts, createContact } = useContacts();
  const { companies, createCompany } = useCompanies();
  const { createDeal } = useDeals();
  const { saveValue } = useCustomFields();

  const [step, setStep] = useState<WizardStep>('type');
  const [importType, setImportType] = useState<ImportType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRows, setFileRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  const availableFields =
    importType === 'companies' ? COMPANY_FIELDS :
    importType === 'deals'     ? DEAL_FIELDS :
    CONTACT_FIELDS;

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (json.length > 0) {
          const headers = Object.keys(json[0]);
          setFileHeaders(headers);
          setFileRows(json);

          // Auto-map columns using the right map for the selected import type
          const activeAutoMap =
            importType === 'deals'     ? DEAL_AUTO_MAP :
            importType === 'companies' ? COMPANY_AUTO_MAP :
            CONTACT_AUTO_MAP;
          const autoMapped: Record<string, string> = {};
          headers.forEach((h) => {
            const normalized = h.toLowerCase().trim();
            if (activeAutoMap[normalized]) {
              autoMapped[h] = activeAutoMap[normalized];
            } else {
              autoMapped[h] = '__skip__';
            }
          });
          setColumnMapping(autoMapped);
        }
      } catch (err) {
        console.error('Failed to parse file', err);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    const PRIORITY_MAP: Record<string, Deal['priority']> = {
      low: 'low', medium: 'medium', high: 'high', urgent: 'urgent',
      normal: 'medium', critical: 'urgent', '1': 'low', '2': 'medium', '3': 'high', '4': 'urgent',
    };

    for (let rowIdx = 0; rowIdx < fileRows.length; rowIdx++) {
      const row = fileRows[rowIdx];
      const rowNum = rowIdx + 1;
      try {
        const mapped: Record<string, string> = {};
        const customCols: Array<{ colName: string; value: string }> = [];

        Object.entries(columnMapping).forEach(([col, field]) => {
          if (!field || field === '__skip__') return;
          if (field === '__custom__') {
            if (row[col]) customCols.push({ colName: col, value: String(row[col]) });
          } else if (row[col]) {
            mapped[field] = String(row[col]);
          }
        });

        if (importType === 'contacts') {
          if (!mapped.first_name && !mapped.last_name) {
            failed++;
            errors.push(`Row ${rowNum}: Missing required fields — map "First Name" and "Last Name" columns.`);
            continue;
          }
          const { data: created, error: createError } = await createContact({
            first_name: mapped.first_name || '(unknown)',
            last_name: mapped.last_name || '(unknown)',
            email: mapped.email || undefined,
            phone: mapped.phone || undefined,
            job_title: mapped.job_title || undefined,
            department: mapped.department || undefined,
            source: mapped.source || undefined,
            city: mapped.city || undefined,
            country: mapped.country || undefined,
            notes: mapped.notes || undefined,
            lead_status: (mapped.lead_status as any) || 'new',
            lifecycle_stage: (mapped.lifecycle_stage as any) || 'lead',
            is_active: true,
          });
          if (createError) {
            failed++;
            errors.push(`Row ${rowNum}: ${createError}`);
            continue;
          }
          if (created?.id && customCols.length > 0) {
            for (const { colName, value } of customCols) {
              await saveValue('contacts', created.id, colName, value).catch(() => {});
            }
          }
          success++;

        } else if (importType === 'companies') {
          if (!mapped.name) {
            failed++;
            errors.push(`Row ${rowNum}: Missing required field — map a column to "Company Name".`);
            continue;
          }
          const { data: created, error: createError } = await createCompany({
            name: mapped.name,
            industry: mapped.industry || undefined,
            size: mapped.size || undefined,
            website: mapped.website || undefined,
            email: mapped.email || undefined,
            phone: mapped.phone || undefined,
            city: mapped.city || undefined,
            country: mapped.country || undefined,
          });
          if (createError) {
            failed++;
            errors.push(`Row ${rowNum}: ${createError}`);
            continue;
          }
          if (created?.id && customCols.length > 0) {
            for (const { colName, value } of customCols) {
              await saveValue('companies', created.id, colName, value).catch(() => {});
            }
          }
          success++;

        } else if (importType === 'deals') {
          // Flexible title: mapped title → account_name → "Imported Deal #N"
          const title = mapped.title || mapped.account_name || `Imported Deal #${rowNum}`;
          const priority: Deal['priority'] =
            PRIORITY_MAP[(mapped.priority || '').toLowerCase().trim()] || 'medium';
          const { data: created, error: createError } = await createDeal({
            title,
            amount: mapped.amount ? parseFloat(mapped.amount.replace(/[^0-9.]/g, '')) || 0 : 0,
            currency: 'USD',
            stage: mapped.stage || 'lead',
            priority,
            probability: 0,
            close_date:   mapped.close_date   || undefined,
            description:  mapped.description  || undefined,
            email:        mapped.email        || undefined,
            phone:        mapped.phone        || undefined,
            mobile:       mapped.mobile       || undefined,
            position:     mapped.position     || undefined,
            address:      mapped.address      || undefined,
            manager_name: mapped.manager_name || undefined,
            email_note:   mapped.email_note   || undefined,
            next_step:    mapped.next_step    || undefined,
            account_name: mapped.account_name || undefined,
          });
          if (createError) {
            failed++;
            errors.push(`Row ${rowNum}: ${createError}`);
            continue;
          }
          if (created?.id && customCols.length > 0) {
            for (const { colName, value } of customCols) {
              await saveValue('deals', created.id, colName, value).catch(() => {});
            }
          }
          success++;
        }
      } catch (err: unknown) {
        failed++;
        const msg = err instanceof Error ? err.message : 'Unexpected error';
        errors.push(`Row ${rowNum}: ${msg}`);
      }
    }

    setImportResults({ success, failed, errors });
    setImporting(false);
    setStep('done');
  };

  const resetWizard = () => {
    setStep('type');
    setImportType(null);
    setFile(null);
    setFileHeaders([]);
    setFileRows([]);
    setColumnMapping({});
    setImportResults(null);
  };

  const downloadTemplate = () => {
    let headers: string[];
    let sample: string[][];

    if (importType === 'companies') {
      headers = ['Company Name', 'Industry', 'Size', 'Website', 'Phone', 'City', 'Country'];
      sample  = [['Acme Corp', 'Technology', '51-200', 'https://acme.com', '+1 555 000 0000', 'San Francisco', 'USA']];
    } else if (importType === 'deals') {
      headers = ['Deal Name', 'Deals Value', 'Stage', 'Priority', 'Close Date', 'Accounts',
                 'Email', 'Phone Number', 'Mobile No', 'Position', 'Address',
                 'Name of Manager', 'Emailnote', 'Next Step', 'Activities Timeline'];
      sample  = [['New Software License', '15000', 'lead', 'medium', '2026-06-30', 'Acme Corp',
                  'john@acme.com', '+1 555 123 4567', '+1 555 987 6543', 'Sales Manager', '123 Main St',
                  'Jane Smith', 'Discussed pricing', 'Follow up next week', 'Initial call completed']];
    } else {
      headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Job Title', 'Department', 'Company', 'City', 'Country'];
      sample  = [['John', 'Doe', 'john.doe@example.com', '+1 555 123 4567', 'Sales Manager', 'Sales', 'Acme Corp', 'New York', 'USA']];
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${importType}_import_template.xlsx`);
  };

  const exportAll = (type: 'contacts' | 'companies') => {
    if (type === 'contacts') {
      const data = contacts.map((c) => ({
        'First Name': c.first_name, 'Last Name': c.last_name,
        'Email': c.email || '', 'Phone': c.phone || '',
        'Job Title': c.job_title || '', 'Company': c.company?.name || '',
        'Lead Status': c.lead_status, 'Lifecycle Stage': c.lifecycle_stage,
        'City': c.city || '', 'Country': c.country || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
      XLSX.writeFile(wb, `contacts_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const data = companies.map((c) => ({
        'Company Name': c.name, 'Industry': c.industry || '',
        'Size': c.size || '', 'Website': c.website || '',
        'Phone': c.phone || '', 'City': c.city || '', 'Country': c.country || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Companies');
      XLSX.writeFile(wb, `companies_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#2D3E50]">Import records</h1>
            <p className="text-sm text-[#516F90] mt-0.5">Import contacts, companies, or deals from a spreadsheet</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportAll('contacts')}>
              <Download className="w-3.5 h-3.5" /> Export contacts
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportAll('companies')}>
              <Download className="w-3.5 h-3.5" /> Export companies
            </Button>
          </div>
        </div>

        {step !== 'done' && (
          <>
            {/* Progress stepper */}
            <div className="flex items-center gap-0 mb-8">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    s.id === step
                      ? 'bg-[#FFF3F0] border border-[#FF7A59]/40'
                      : i < currentStepIndex
                      ? 'text-green-400'
                      : 'text-[#7C98B6]'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i < currentStepIndex
                        ? 'bg-green-500 text-white'
                        : s.id === step
                        ? 'bg-[#FF7A59] text-white'
                        : 'bg-[#F0F3F7] text-[#516F90]'
                    }`}>
                      {i < currentStepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-sm font-medium ${s.id === step ? 'text-[#2D3E50]' : ''}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-[#99ACC2] mx-1" />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Select type */}
            {step === 'type' && (
              <div>
                <h2 className="text-base font-semibold text-[#2D3E50] mb-2">What would you like to import?</h2>
                <p className="text-sm text-[#516F90] mb-6">Choose the type of records you want to import.</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { id: 'contacts', label: 'Contacts', icon: <Users className="w-8 h-8" />, desc: 'People and their contact information', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { id: 'companies', label: 'Companies', icon: <Building2 className="w-8 h-8" />, desc: 'Organizations and businesses', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    { id: 'deals', label: 'Deals', icon: <TrendingUp className="w-8 h-8" />, desc: 'Sales opportunities and pipeline', color: 'text-green-400', bg: 'bg-green-500/10' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setImportType(type.id as ImportType)}
                      className={`p-5 rounded-xl border-2 text-left transition-all ${
                        importType === type.id
                          ? 'border-[#FF7A59] bg-[#FFF3F0]'
                          : 'border-[#DFE3EB] bg-white hover:border-[#CBD6E2]'
                      }`}
                    >
                      <div className={`${type.bg} w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${type.color}`}>
                        {type.icon}
                      </div>
                      <p className="font-semibold text-[#2D3E50] mb-1">{type.label}</p>
                      <p className="text-xs text-[#516F90]">{type.desc}</p>
                      {importType === type.id && (
                        <div className="mt-2 flex items-center gap-1 text-[#FF7A59] text-xs">
                          <Check className="w-3.5 h-3.5" /> Selected
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep('upload')}
                    disabled={!importType}
                    className="gap-1.5"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Upload file */}
            {step === 'upload' && (
              <div>
                <h2 className="text-base font-semibold text-[#2D3E50] mb-2">Upload your file</h2>
                <p className="text-sm text-[#516F90] mb-6">
                  Upload a .xlsx, .xls, or .csv file to import {importType}.
                </p>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-4 ${
                    isDragging
                      ? 'border-[#FF7A59] bg-[#FFF3F0]'
                      : file
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-[#CBD6E2] hover:border-[#99ACC2] bg-[#F6F9FC]'
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6 text-green-400" />
                      </div>
                      <p className="font-medium text-[#2D3E50]">{file.name}</p>
                      <p className="text-sm text-[#516F90]">
                        {fileRows.length} rows · {fileHeaders.length} columns
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); setFileHeaders([]); setFileRows([]); }}
                        className="text-xs text-[#7C98B6] hover:text-[#2D3E50] flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-[#F0F3F7] rounded-xl flex items-center justify-center">
                        <Upload className="w-7 h-7 text-[#516F90]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#2D3E50] mb-1">Drag and drop your file here</p>
                        <p className="text-sm text-[#516F90]">or <span className="text-[#FF7A59]">browse to choose a file</span></p>
                      </div>
                      <p className="text-xs text-[#7C98B6]">Supports .xlsx, .xls, .csv</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
                    <Download className="w-3.5 h-3.5" /> Download template
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep('type')}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button onClick={() => setStep('map')} disabled={!file || fileRows.length === 0} className="gap-1.5">
                      Next <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Map columns */}
            {step === 'map' && (
              <div>
                <h2 className="text-base font-semibold text-[#2D3E50] mb-2">Map your columns</h2>
                <p className="text-sm text-[#516F90] mb-4">
                  Match the columns in your file to the corresponding CRM fields.
                </p>

                <div className="rounded-xl border border-[#DFE3EB] overflow-hidden mb-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F0F3F7] border-b border-[#DFE3EB]">
                        <th className="text-left px-4 py-3 text-[#516F90] font-medium text-xs w-1/3">
                          File column
                        </th>
                        <th className="text-left px-4 py-3 text-[#516F90] font-medium text-xs w-1/3">
                          Sample data
                        </th>
                        <th className="text-left px-4 py-3 text-[#516F90] font-medium text-xs w-1/3">
                          CRM field
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DFE3EB]">
                      {fileHeaders.map((header) => {
                        const sample = fileRows.slice(0, 3).map((r) => r[header]).filter(Boolean).join(', ');
                        const isMapped = columnMapping[header] && columnMapping[header] !== '__skip__';
                        return (
                          <tr key={header} className="hover:bg-[#F0F3F7]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isMapped
                                  ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                  : <div className="w-4 h-4 rounded-full border border-[#CBD6E2] flex-shrink-0" />
                                }
                                <span className="text-[#2D3E50] font-medium">{header}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-[#7C98B6] truncate block max-w-[200px]">
                                {sample || '(empty)'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Select
                                value={columnMapping[header] || '__skip__'}
                                onValueChange={(v) => setColumnMapping({ ...columnMapping, [header]: v })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableFields.map((f) => (
                                    <SelectItem key={f.value} value={f.value}>
                                      {f.label}{f.required ? ' *' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('upload')}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={() => setStep('review')} className="gap-1.5">
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 'review' && (
              <div>
                <h2 className="text-base font-semibold text-[#2D3E50] mb-2">Review your import</h2>
                <p className="text-sm text-[#516F90] mb-6">
                  Review the details below before importing.
                </p>

                <div className="space-y-4 mb-6">
                  <div className="bg-white border border-[#DFE3EB] rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-[#2D3E50] mb-3">Import summary</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-[#F6F9FC] rounded-lg">
                        <p className="text-2xl font-bold text-[#2D3E50]">{fileRows.length}</p>
                        <p className="text-xs text-[#516F90]">Total rows</p>
                      </div>
                      <div className="text-center p-3 bg-[#F6F9FC] rounded-lg">
                        <p className="text-2xl font-bold text-[#FF7A59]">
                          {Object.values(columnMapping).filter((v) => v && v !== '__skip__').length}
                        </p>
                        <p className="text-xs text-[#516F90]">Mapped columns</p>
                      </div>
                      <div className="text-center p-3 bg-[#F6F9FC] rounded-lg">
                        <p className="text-2xl font-bold text-[#516F90]">
                          {Object.values(columnMapping).filter((v) => v === '__skip__').length}
                        </p>
                        <p className="text-xs text-[#516F90]">Skipped columns</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#DFE3EB] rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-[#2D3E50] mb-3">Column mappings</h3>
                    <div className="space-y-2">
                      {Object.entries(columnMapping)
                        .filter(([, v]) => v && v !== '__skip__')
                        .map(([col, field]) => {
                          const fieldInfo = availableFields.find((f) => f.value === field);
                          return (
                            <div key={col} className="flex items-center justify-between text-sm">
                              <span className="text-[#516F90]">{col}</span>
                              <ChevronRight className="w-4 h-4 text-[#99ACC2]" />
                              <span className="text-[#FF7A59]">{fieldInfo?.label || field}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-300">Before you import</p>
                      <p className="text-xs text-[#516F90] mt-1">
                        This will add {fileRows.length} new {importType} to your CRM. Duplicates won't be automatically detected.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('map')}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleImport} disabled={importing} className="gap-1.5">
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Start import
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Done step */}
        {step === 'done' && importResults && (() => {
          const allFailed = importResults.success === 0 && importResults.failed > 0;
          const viewLabel = importType === 'contacts' ? 'View contacts'
            : importType === 'companies' ? 'View companies'
            : 'View deals';
          const viewHref = `/${importType}`;
          return (
            <div className="py-10">
              <div className="text-center mb-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${allFailed ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                  {allFailed
                    ? <AlertCircle className="w-8 h-8 text-red-400" />
                    : <CheckCircle2 className="w-8 h-8 text-green-400" />
                  }
                </div>
                <h2 className="text-xl font-bold text-[#2D3E50] mb-2">
                  {allFailed ? 'Import failed' : 'Import complete'}
                </h2>
                <p className="text-[#516F90]">
                  {allFailed
                    ? 'No records were imported. See the errors below.'
                    : `${importResults.success} ${importType} imported successfully.`}
                </p>
              </div>

              <div className="flex justify-center gap-6 mb-8">
                {importResults.success > 0 && (
                  <div className="text-center p-4 bg-white border border-green-500/20 rounded-xl min-w-[100px]">
                    <p className="text-3xl font-bold text-green-400">{importResults.success}</p>
                    <p className="text-sm text-[#516F90]">Imported</p>
                  </div>
                )}
                {importResults.failed > 0 && (
                  <div className="text-center p-4 bg-white border border-red-500/20 rounded-xl min-w-[100px]">
                    <p className="text-3xl font-bold text-red-400">{importResults.failed}</p>
                    <p className="text-sm text-[#516F90]">Failed</p>
                  </div>
                )}
              </div>

              {importResults.errors.length > 0 && (
                <div className="max-w-xl mx-auto mb-8 bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-600 mb-2">
                    {importResults.errors.length} row{importResults.errors.length > 1 ? 's' : ''} failed:
                  </p>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {importResults.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-500 flex items-start gap-1.5">
                        <X className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={resetWizard}>
                  Import more records
                </Button>
                {!allFailed && (
                  <Button asChild>
                    <a href={viewHref}>{viewLabel}</a>
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
