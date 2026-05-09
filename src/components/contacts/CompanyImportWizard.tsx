'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, ChevronRight, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export interface CompanyImportResult {
  groupId: string;
  groupName: string;
  companyIds: string[];
  count: number;
}

interface Props {
  onClose: () => void;
  onImportComplete: (result: CompanyImportResult) => void;
  createCompany: (data: Record<string, string>) => Promise<{ data?: { id: string } | null; error?: unknown }>;
  updateCompany?: (id: string, data: Record<string, string>) => Promise<unknown>;
  existingCompanies?: { id: string; name?: string; domain?: string }[];
}

type Step = 1 | 2 | 3 | 4;

const COMPANY_FIELDS = [
  { value: '__skip__',  label: "Don't import" },
  { value: 'name',      label: 'Company Name' },
  { value: 'email',     label: 'Email' },
  { value: 'domain',    label: 'Domain / Website' },
  { value: 'phone',        label: 'Phone number' },
  { value: 'mobile',       label: 'Mobile no' },
  { value: 'industry',     label: 'Industry / Sector' },
  { value: 'size',         label: 'Company Size / Employees' },
  { value: 'city',         label: 'City' },
  { value: 'country',      label: 'Country' },
  { value: 'address',      label: 'Address' },
  { value: 'website',      label: 'Website URL' },
  { value: 'description',  label: 'Description / Notes' },
  { value: 'manager_name', label: 'Name of manager' },
  { value: 'email_note',   label: 'Emailnote' },
  { value: 'next_step',    label: 'Next step' },
];

function normalizeKey(s: string): string {
  return s.toLowerCase()
    .replace(/[\s_\-\.\/\(\)#]/g, '')
    .replace(/numbers?$/g, 'no')
    .trim();
}

const AUTO_MAP_NORM: Record<string, string> = {
  // Company name
  company: 'name',
  companyname: 'name',
  nameofcompany: 'name',
  name: 'name',
  account: 'name',
  accounts: 'name',
  organization: 'name',
  organisation: 'name',
  firm: 'name',
  business: 'name',
  businessname: 'name',

  // Email
  email: 'email',
  companyemail: 'email',
  contactemail: 'email',
  emailaddress: 'email',
  mail: 'email',

  // Domain
  domain: 'domain',
  emaildomain: 'domain',
  companydomain: 'domain',
  website: 'website',
  websiteurl: 'website',
  url: 'website',
  web: 'website',
  siteurl: 'website',

  // Phone
  phone: 'phone',
  phoneno: 'phone',
  phonenumber: 'phone',
  telephone: 'phone',
  telno: 'phone',
  contactno: 'phone',
  contactnumber: 'phone',

  // Mobile
  mobile: 'mobile',
  mobileno: 'mobile',
  mobilenumber: 'mobile',

  // Industry
  industry: 'industry',
  sector: 'industry',
  businesstype: 'industry',
  vertical: 'industry',

  // Size
  size: 'size',
  companysize: 'size',
  employees: 'size',
  headcount: 'size',
  teamsize: 'size',
  noofemployees: 'size',

  // Location
  city: 'city',
  town: 'city',
  country: 'country',
  nation: 'country',
  address: 'address',
  streetaddress: 'address',
  location: 'address',

  // Notes / description
  notes: 'description',
  note: 'description',
  comments: 'description',
  comment: 'description',
  description: 'description',

  // Manager name
  nameofmanager: 'manager_name',
  manager: 'manager_name',
  managername: 'manager_name',

  // Email note
  emailnote: 'email_note',

  // Next step
  nextstep: 'next_step',
  nextaction: 'next_step',

  // Skip-worthy fields
  owner: '__skip__',
  deals: '__skip__',
  dealsvalue: '__skip__',
  status: '__skip__',
  priority: '__skip__',
  type: '__skip__',
};

const STEP_LABELS = ['Upload', 'Map columns', 'Handle matches', 'Import'];

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
                style={{ backgroundColor: done ? '#4CAF8E' : active ? '#4762D5' : '#EBEBEB', color: done || active ? '#fff' : '#B3B3B3' }}>
                {done ? <Check className="w-3.5 h-3.5" /> : step}
              </div>
              <span className="text-xs font-medium" style={{ color: active ? '#333333' : '#B3B3B3' }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className="w-8 h-px mx-3" style={{ backgroundColor: done ? '#4CAF8E' : '#EBEBEB' }} />}
          </div>
        );
      })}
    </div>
  );
}

export default function CompanyImportWizard({ onClose, onImportComplete, createCompany, updateCompany, existingCompanies = [] }: Props) {
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
    const ids: string[] = [];
    const nameIndex = new Map(existingCompanies.map(c => [c.name?.toLowerCase(), c.id]));
    const domainIndex = new Map(existingCompanies.filter(c => c.domain).map(c => [c.domain?.toLowerCase(), c.id]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const company: Record<string, string> = {};
      for (const [h, field] of Object.entries(mapping)) {
        if (field === '__skip__' || !field) continue;
        company[field] = String(row[h] || '').trim();
      }
      if (!company.name) { failed++; continue; }

      const nameKey = company.name.toLowerCase();
      const domainKey = company.domain?.toLowerCase();
      const existingId = nameIndex.get(nameKey) ?? (domainKey ? domainIndex.get(domainKey) : undefined);

      if (existingId) {
        if (matchMode === 'skip') { skipped++; continue; }
        if (matchMode === 'update' && updateCompany) {
          try { await updateCompany(existingId, company); ids.push(existingId); success++; }
          catch { failed++; }
          if (mountedRef.current) setProgress(Math.round(((i + 1) / rows.length) * 100));
          continue;
        }
      }

      try {
        const res = await createCompany(company);
        if (res?.data?.id) { ids.push(res.data.id); nameIndex.set(nameKey, res.data.id); success++; }
        else { failed++; }
      } catch { failed++; }

      if (mountedRef.current) setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    if (!mountedRef.current) return;
    setResult({ success, failed, skipped });
    setImporting(false);

    if (success > 0) {
      const groupId = crypto.randomUUID();
      onImportComplete({ groupId, groupName: file.name, companyIds: ids, count: success });
    }
    setTimeout(() => { if (mountedRef.current) onClose(); }, 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-lg shadow-2xl flex flex-col" style={{ width: 860, maxHeight: '90vh', border: '1px solid #EBEBEB' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB] flex-shrink-0">
          <span className="text-base font-bold text-[#333333]">Import to Companies</span>
          <div className="flex-1 flex justify-center"><StepBar current={step} /></div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F1F1F1] text-[#B3B3B3]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="w-full max-w-lg border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-16 px-8 cursor-pointer transition-colors"
                style={{ borderColor: isDragging ? '#4762D5' : '#EBEBEB', backgroundColor: isDragging ? '#F0FAFF' : '#FAFBFC' }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
                onClick={() => fileRef.current?.click()}>
                <Upload className="w-10 h-10 mb-4" style={{ color: '#EBEBEB' }} />
                <button className="px-5 py-2 rounded text-sm font-bold text-white mb-3" style={{ backgroundColor: '#4762D5' }}
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>Browse</button>
                <p className="text-sm font-semibold text-[#333333]">or drag and drop a CSV file</p>
                <p className="text-xs text-[#999999] mt-1">(.csv, .xlsx, and .xls file types are supported)</p>
                {error && <p className="mt-3 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
            </div>
          )}

          {step === 2 && (
            <div className="px-6 py-5">
              <p className="text-base font-bold text-[#333333] text-center mb-1">Map your columns</p>
              <p className="text-xs text-[#999999] text-center mb-5">Columns are auto-mapped. Review and change any before importing.</p>
              <div className="overflow-auto rounded border border-[#EBEBEB]" style={{ maxHeight: 380 }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB]">
                      <th className="px-3 py-2 text-left w-8 text-[#B3B3B3]">#</th>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left min-w-[160px]">
                          <div className="flex flex-col gap-1">
                            <select value={mapping[h] || '__skip__'} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                              className="w-full text-xs border rounded px-1.5 py-1 bg-white text-[#333333] outline-none"
                              style={{ borderColor: mapping[h] && mapping[h] !== '__skip__' ? '#4762D5' : '#EBEBEB' }}>
                              {COMPANY_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                            <span className="text-[10px] text-[#B3B3B3] truncate">{h}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}>
                        <td className="px-3 py-2 text-[#B3B3B3]">{i + 1}</td>
                        {headers.map(h => <td key={h} className="px-3 py-2 text-[#333333] truncate max-w-[180px]">{row[h] || ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[#999999]">{Object.values(mapping).filter(v => v && v !== '__skip__').length} of {headers.length} columns mapped</p>
                <p className="text-xs text-[#999999]">{rows.length} total rows</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center py-12 px-8">
              <p className="text-xl font-bold text-[#333333] mb-2">Choose how to handle matches</p>
              <p className="text-sm text-[#999999] mb-8">A "match" means a row has the same company name as an existing record.</p>
              <div className="w-full max-w-lg space-y-3">
                {[
                  { value: 'add_all', label: 'Add all rows as new items', sub: '– even if a match exists' },
                  { value: 'skip',   label: 'Skip matches',              sub: '– don\'t add them as new items' },
                  { value: 'update', label: 'Update matches',            sub: '– update matching items with imported data' },
                ].map(opt => (
                  <label key={opt.value}
                    className="flex items-center gap-3 px-4 py-3 rounded border cursor-pointer"
                    style={{ borderColor: matchMode === opt.value ? '#4762D5' : '#EBEBEB', backgroundColor: matchMode === opt.value ? '#F0FAFF' : '#fff' }}>
                    <input type="radio" name="matchMode" value={opt.value} checked={matchMode === opt.value}
                      onChange={() => setMatchMode(opt.value as typeof matchMode)} className="accent-[#4762D5]" />
                    <span className="text-sm text-[#333333]"><strong>{opt.label}</strong> {opt.sub}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center py-16 px-8">
              {importing ? (
                <>
                  <Loader2 className="w-12 h-12 animate-spin mb-5" style={{ color: '#4762D5' }} />
                  <p className="text-base font-bold text-[#333333] mb-2">Importing companies…</p>
                  <p className="text-sm text-[#999999] mb-4">{progress}% complete</p>
                  <div className="w-64 h-2 bg-[#EBEBEB] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: '#4762D5' }} />
                  </div>
                </>
              ) : result && (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#E5F8F6' }}>
                    <Check className="w-7 h-7" style={{ color: '#4CAF8E' }} />
                  </div>
                  <p className="text-lg font-bold text-[#333333] mb-3">Import complete!</p>
                  <div className="flex flex-col gap-1 items-center">
                    <p className="text-sm text-[#666666]"><span className="font-bold text-[#4CAF8E]">{result.success}</span> companies imported</p>
                    {result.skipped > 0 && <p className="text-sm text-[#999999]"><span className="font-semibold">{result.skipped}</span> skipped (duplicates)</p>}
                    {result.failed > 0 && <p className="text-sm text-[#4762D5]"><span className="font-semibold">{result.failed}</span> failed (missing name)</p>}
                  </div>
                  <p className="text-xs text-[#999999] mt-4">A new group was created. Closing in 5 s…</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#EBEBEB] flex-shrink-0">
          <button onClick={() => step > 1 && step < 4 ? setStep(s => (s - 1) as Step) : onClose}
            disabled={importing}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#555555] border border-[#EBEBEB] rounded-[3px] hover:bg-[#FAFAFA] disabled:opacity-40">
            {step === 4 ? 'Close' : step === 1 ? 'Cancel' : <><ArrowLeft className="w-3.5 h-3.5" /> Back</>}
          </button>
          {step < 4 && (
            <button onClick={() => { if (step === 3) doImport(); else if (step < 3) setStep(s => (s + 1) as Step); }}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white rounded-[3px] disabled:opacity-40"
              style={{ backgroundColor: '#4762D5' }}>
              {step === 3 ? 'Start import' : <>Continue <ChevronRight className="w-3.5 h-3.5" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
