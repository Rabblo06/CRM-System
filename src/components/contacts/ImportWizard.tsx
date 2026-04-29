'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, ChevronRight, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export interface ImportResult {
  groupId: string;
  groupName: string;
  contactIds: string[];
  count: number;
}

interface ImportWizardProps {
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
  createContact: (data: Record<string, string>) => Promise<{ data?: { id: string } | null; error?: unknown }>;
  updateContact?: (id: string, data: Record<string, string>) => Promise<unknown>;
  existingContacts?: { id: string; email?: string }[];
}

type Step = 1 | 2 | 3 | 4;

/* ── Field definitions shown in the mapping dropdown ── */
const CONTACT_FIELDS = [
  { value: '__skip__',         label: "Don't import" },
  { value: 'full_name',        label: 'Contact / Full Name (will split)' },
  { value: 'first_name',       label: 'First Name' },
  { value: 'last_name',        label: 'Last Name' },
  { value: 'email',            label: 'Email' },
  { value: 'phone',            label: 'Phone / Mobile' },
  { value: 'job_title',        label: 'Title / Position / Role' },
  { value: 'department',       label: 'Department' },
  { value: 'company',          label: 'Company / Account' },
  { value: 'address',          label: 'Address' },
  { value: 'city',             label: 'City' },
  { value: 'country',          label: 'Country' },
  { value: 'lead_status',      label: 'Lead Status / Status' },
  { value: 'lifecycle_stage',  label: 'Lifecycle Stage' },
  { value: 'source',           label: 'Lead Source' },
  { value: 'notes',            label: 'Notes / Comments / Next step' },
  { value: 'linkedin_url',     label: 'LinkedIn URL' },
];

/* ── Normalize a header string for lookup ── */
function normalizeKey(s: string): string {
  return s.toLowerCase()
    .replace(/[\s_\-\.\/\(\)#]/g, '')  // strip separators
    .replace(/numbers?$/g, 'no')        // "number" → "no"
    .replace(/emails?$/g, 'email')      // handle trailing s
    .trim();
}

/* ── Comprehensive header → field mapping (keys are normalized) ── */
const AUTO_MAP_NORM: Record<string, string> = {
  // Contact / Full name
  contact: 'full_name',
  contactname: 'full_name',
  name: 'full_name',
  fullname: 'full_name',
  leadname: 'full_name',
  clientname: 'full_name',

  // First name
  firstname: 'first_name',
  fname: 'first_name',
  givenname: 'first_name',

  // Last name
  lastname: 'last_name',
  lname: 'last_name',
  surname: 'last_name',
  familyname: 'last_name',

  // Email
  email: 'email',
  emailaddress: 'email',
  primaryemail: 'email',
  workemail: 'email',
  emailnote: 'email',
  emailid: 'email',

  // Phone
  phone: 'phone',
  phoneno: 'phone',
  phonenumber: 'phone',
  telephone: 'phone',
  telno: 'phone',
  telnumber: 'phone',
  mobile: 'phone',
  mobileno: 'phone',
  mobilenumber: 'phone',
  cellphone: 'phone',
  cell: 'phone',
  workphone: 'phone',
  contactno: 'phone',
  contactnumber: 'phone',

  // Company / Account
  company: 'company',
  companyname: 'company',
  nameofcompany: 'company',
  account: 'company',
  accounts: 'company',
  organization: 'company',
  organisation: 'company',
  employer: 'company',
  firm: 'company',

  // Job title / Position
  title: 'job_title',
  jobtitle: 'job_title',
  position: 'job_title',
  role: 'job_title',
  jobposition: 'job_title',
  designation: 'job_title',
  occupation: 'job_title',

  // Department
  department: 'department',
  dept: 'department',
  division: 'department',

  // Address
  address: 'address',
  streetaddress: 'address',
  street: 'address',
  addr: 'address',
  location: 'address',

  // City
  city: 'city',
  town: 'city',

  // Country
  country: 'country',
  nation: 'country',

  // Notes / comments / next step
  notes: 'notes',
  note: 'notes',
  comments: 'notes',
  comment: 'notes',
  description: 'notes',
  nextstep: 'notes',
  nextaction: 'notes',
  nameofmanager: 'notes',
  manager: 'notes',
  managername: 'notes',

  // Source
  source: 'source',
  leadsource: 'source',
  referral: 'source',
  channel: 'source',

  // Status
  leadstatus: 'lead_status',
  status: 'lead_status',

  // Lifecycle
  lifecyclestage: 'lifecycle_stage',
  stage: 'lifecycle_stage',

  // LinkedIn
  linkedin: 'linkedin_url',
  linkedinurl: 'linkedin_url',
  linkedinprofile: 'linkedin_url',

  // Marketing fields → notes (closest available)
  marketingsubscription: 'notes',
  enrolledsequences: 'notes',
  enrolledsequence: 'notes',
  activitiestimeline: '__skip__',  // timeline is computed
  priority: '__skip__',            // stored in localStorage
  type: 'notes',
  deals: '__skip__',
  dealsvalue: '__skip__',
  deal: '__skip__',
};

const STEP_LABELS = ['Upload', 'Map columns', 'Handle matches', 'Import'];
const GROUP_COLORS = ['#00A38D', '#0091AE', '#8B5CF6', '#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#F97316'];

function StepBar({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEP_LABELS.map((label, i) => {
        const step = (i + 1) as Step;
        const done = current > step;
        const active = current === step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: done ? '#00BDA5' : active ? '#0091AE' : '#DFE3EB', color: done || active ? '#fff' : '#99ACC2' }}>
                {done ? <Check className="w-3.5 h-3.5" /> : step}
              </div>
              <span className="text-xs font-medium" style={{ color: active ? '#2D3E50' : '#99ACC2' }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className="w-8 h-px mx-3" style={{ backgroundColor: done ? '#00BDA5' : '#DFE3EB' }} />}
          </div>
        );
      })}
    </div>
  );
}

export default function ImportWizard({
  onClose, onImportComplete, createContact, updateContact, existingContacts = [],
}: ImportWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [matchMode, setMatchMode] = useState<'add_all' | 'skip' | 'update'>('add_all');
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; failed: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const parseFile = useCallback((f: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        if (!json.length) { setError('File appears to be empty.'); return; }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRows(json);
        // Auto-map using normalized keys
        const autoMap: Record<string, string> = {};
        hdrs.forEach(h => {
          const key = normalizeKey(h);
          autoMap[h] = AUTO_MAP_NORM[key] ?? '__skip__';
        });
        setMapping(autoMap);
        setFile(f);
        setStep(2);
      } catch { setError('Could not parse file. Please use CSV, XLSX, or XLS format.'); }
    };
    reader.readAsBinaryString(f);
  }, []);

  const doImport = async () => {
    if (!file) return;
    setImporting(true);
    setProgress(0);
    setStep(4);

    let success = 0, failed = 0, skipped = 0;
    const importedIds: string[] = [];
    const emailIndex = new Map(existingContacts.map(c => [c.email?.toLowerCase(), c.id]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const contact: Record<string, string> = {};

      for (const [header, field] of Object.entries(mapping)) {
        if (field === '__skip__' || !field) continue;
        contact[field] = String(row[header] || '').trim();
      }

      // Handle full_name → split into first/last
      if (contact.full_name) {
        const parts = contact.full_name.trim().split(/\s+/);
        if (parts.length >= 2) {
          contact.first_name = parts.slice(0, -1).join(' ');
          contact.last_name = parts[parts.length - 1];
        } else {
          contact.first_name = contact.full_name;
          contact.last_name = '';
        }
        delete contact.full_name;
      }

      // Split first_name if it looks like a full name and last_name is missing
      if (!contact.last_name && contact.first_name && contact.first_name.includes(' ')) {
        const parts = contact.first_name.split(/\s+/);
        contact.first_name = parts.slice(0, -1).join(' ');
        contact.last_name = parts[parts.length - 1];
      }

      if (!contact.first_name && !contact.last_name) { failed++; continue; }
      if (!contact.first_name) contact.first_name = '';
      if (!contact.last_name) contact.last_name = '';

      // Duplicate detection by email
      const emailKey = contact.email?.toLowerCase();
      const existingId = emailKey ? emailIndex.get(emailKey) : undefined;

      if (existingId) {
        if (matchMode === 'skip') { skipped++; continue; }
        if (matchMode === 'update' && updateContact) {
          try { await updateContact(existingId, contact); importedIds.push(existingId); success++; }
          catch { failed++; }
          if (mountedRef.current) setProgress(Math.round(((i + 1) / rows.length) * 100));
          continue;
        }
      }

      try {
        const res = await createContact(contact);
        if (res?.data?.id) {
          importedIds.push(res.data.id);
          if (emailKey) emailIndex.set(emailKey, res.data.id);
          success++;
        } else { failed++; }
      } catch { failed++; }

      if (mountedRef.current) setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    if (!mountedRef.current) return;
    setResult({ success, failed, skipped });
    setImporting(false);

    if (success > 0) {
      const groupId = crypto.randomUUID();
      onImportComplete({ groupId, groupName: file.name, contactIds: importedIds, count: success });
      try {
        const stored = JSON.parse(localStorage.getItem('crm_import_groups') || '[]');
        stored.push({ id: groupId, name: file.name, contactIds: importedIds });
        localStorage.setItem('crm_import_groups', JSON.stringify(stored));
      } catch { /* ignore */ }
    }
    setTimeout(() => { if (mountedRef.current) onClose(); }, 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-lg shadow-2xl flex flex-col" style={{ width: 860, maxHeight: '90vh', border: '1px solid #CBD6E2' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DFE3EB] flex-shrink-0">
          <span className="text-base font-bold text-[#2D3E50]">Import to Contacts</span>
          <div className="flex-1 flex justify-center"><StepBar current={step} /></div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F0F3F7] text-[#99ACC2]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="w-full max-w-lg border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-16 px-8 cursor-pointer transition-colors"
                style={{ borderColor: isDragging ? '#0091AE' : '#CBD6E2', backgroundColor: isDragging ? '#F0FAFF' : '#FAFBFC' }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
                onClick={() => fileRef.current?.click()}>
                <Upload className="w-10 h-10 mb-4" style={{ color: '#CBD6E2' }} />
                <button className="px-5 py-2 rounded text-sm font-bold text-white mb-3" style={{ backgroundColor: '#0091AE' }}
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>Browse</button>
                <p className="text-sm font-semibold text-[#2D3E50]">or drag and drop a CSV file</p>
                <p className="text-xs text-[#7C98B6] mt-1">(.csv, .xlsx, and .xls file types are supported)</p>
                {error && <p className="mt-3 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
            </div>
          )}

          {step === 2 && (
            <div className="px-6 py-5">
              <p className="text-base font-bold text-[#2D3E50] text-center mb-1">Map your columns</p>
              <p className="text-xs text-[#7C98B6] text-center mb-5">
                Columns are auto-mapped. Review and change any before importing.
              </p>
              <div className="overflow-auto rounded border border-[#DFE3EB]" style={{ maxHeight: 380 }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F6F9FC] border-b border-[#DFE3EB]">
                      <th className="px-3 py-2 text-left w-8 text-[#99ACC2]">#</th>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left min-w-[160px]">
                          <div className="flex flex-col gap-1">
                            <select value={mapping[h] || '__skip__'} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                              className="w-full text-xs border rounded px-1.5 py-1 bg-white text-[#2D3E50] outline-none"
                              style={{ borderColor: mapping[h] && mapping[h] !== '__skip__' ? '#0091AE' : '#DFE3EB' }}>
                              {CONTACT_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                            <span className="text-[10px] text-[#99ACC2] truncate">{h}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}>
                        <td className="px-3 py-2 text-[#99ACC2]">{i + 1}</td>
                        {headers.map(h => <td key={h} className="px-3 py-2 text-[#2D3E50] truncate max-w-[180px]">{row[h] || ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[#7C98B6]">
                  {Object.values(mapping).filter(v => v && v !== '__skip__').length} of {headers.length} columns mapped
                </p>
                <p className="text-xs text-[#7C98B6]">{rows.length} total rows</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center py-12 px-8">
              <p className="text-xl font-bold text-[#2D3E50] mb-2">Choose how to handle matches</p>
              <p className="text-sm text-[#7C98B6] mb-8">A "match" means a row has the same email as an existing contact.</p>
              <div className="w-full max-w-lg space-y-3">
                {[
                  { value: 'add_all', label: 'Add all rows as new items', sub: '– even if a match exists' },
                  { value: 'skip',   label: 'Skip matches',              sub: '– don\'t add them as new items' },
                  { value: 'update', label: 'Update matches',            sub: '– update matching items with imported data' },
                ].map(opt => (
                  <label key={opt.value}
                    className="flex items-center gap-3 px-4 py-3 rounded border cursor-pointer transition-colors"
                    style={{ borderColor: matchMode === opt.value ? '#0091AE' : '#DFE3EB', backgroundColor: matchMode === opt.value ? '#F0FAFF' : '#fff' }}>
                    <input type="radio" name="matchMode" value={opt.value} checked={matchMode === opt.value}
                      onChange={() => setMatchMode(opt.value as typeof matchMode)} className="accent-[#0091AE]" />
                    <span className="text-sm text-[#2D3E50]"><strong>{opt.label}</strong> {opt.sub}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center py-16 px-8">
              {importing ? (
                <>
                  <Loader2 className="w-12 h-12 animate-spin mb-5" style={{ color: '#0091AE' }} />
                  <p className="text-base font-bold text-[#2D3E50] mb-2">Importing contacts…</p>
                  <p className="text-sm text-[#7C98B6] mb-4">{progress}% complete</p>
                  <div className="w-64 h-2 bg-[#DFE3EB] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: '#0091AE' }} />
                  </div>
                  <p className="text-xs text-[#99ACC2] mt-3">Please don't close this window</p>
                </>
              ) : result && (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#E5F8F6' }}>
                    <Check className="w-7 h-7" style={{ color: '#00BDA5' }} />
                  </div>
                  <p className="text-lg font-bold text-[#2D3E50] mb-3">Import complete!</p>
                  <div className="flex flex-col gap-1 items-center">
                    <p className="text-sm text-[#516F90]"><span className="font-bold text-[#00BDA5]">{result.success}</span> contacts imported</p>
                    {result.skipped > 0 && <p className="text-sm text-[#7C98B6]"><span className="font-semibold">{result.skipped}</span> skipped (duplicates)</p>}
                    {result.failed > 0 && <p className="text-sm text-[#FF7A59]"><span className="font-semibold">{result.failed}</span> failed (missing name)</p>}
                  </div>
                  <p className="text-xs text-[#7C98B6] mt-4">A new group was created. Closing in 5 s…</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#DFE3EB] flex-shrink-0">
          <button onClick={() => step > 1 && step < 4 ? setStep(s => (s - 1) as Step) : onClose}
            disabled={importing}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#425B76] border border-[#DFE3EB] rounded-[3px] hover:bg-[#F6F9FC] disabled:opacity-40">
            {step === 4 ? 'Close' : step === 1 ? 'Cancel' : <><ArrowLeft className="w-3.5 h-3.5" /> Back</>}
          </button>
          {step < 4 && (
            <button onClick={() => { if (step === 3) doImport(); else if (step < 3) setStep(s => (s + 1) as Step); }}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white rounded-[3px] disabled:opacity-40"
              style={{ backgroundColor: '#0091AE' }}>
              {step === 3 ? 'Start import' : <>Continue <ChevronRight className="w-3.5 h-3.5" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
