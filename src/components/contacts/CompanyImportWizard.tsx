'use client';

import { useState, useRef, useCallback } from 'react';
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
}

type Step = 1 | 2 | 3 | 4;

const COMPANY_FIELDS = [
  { value: '__skip__', label: "Don't import" },
  { value: 'name',     label: 'Company Name' },
  { value: 'industry', label: 'Industry' },
  { value: 'size',     label: 'Company Size' },
  { value: 'website',  label: 'Website' },
  { value: 'phone',    label: 'Phone' },
  { value: 'city',     label: 'City' },
  { value: 'country',  label: 'Country' },
  { value: 'domain',   label: 'Domain' },
];

const AUTO_MAP: Record<string, string> = {
  'company name': 'name', name: 'name', company: 'name', account: 'name',
  industry: 'industry', size: 'size', 'company size': 'size',
  website: 'website', url: 'website', phone: 'phone', 'phone number': 'phone',
  city: 'city', country: 'country', domain: 'domain',
};

const STEP_LABELS = ['Upload', 'Map columns', 'Handle matches', 'Import'];
const GROUP_COLORS = ['#0091AE','#8B5CF6','#F59E0B','#EF4444','#3B82F6','#10B981','#F97316'];

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

export default function CompanyImportWizard({ onClose, onImportComplete, createCompany }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [matchMode, setMatchMode] = useState<'add_all' | 'skip' | 'update'>('add_all');
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

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
        hdrs.forEach(h => { autoMap[h] = AUTO_MAP[h.toLowerCase().trim()] || '__skip__'; });
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
    let success = 0; let failed = 0;
    const ids: string[] = [];
    for (const row of rows) {
      const company: Record<string, string> = {};
      for (const [h, field] of Object.entries(mapping)) {
        if (field === '__skip__' || !field) continue;
        company[field] = row[h] || '';
      }
      if (!company.name) { failed++; continue; }
      try {
        const res = await createCompany(company);
        if (res?.data?.id) { ids.push(res.data.id); success++; } else failed++;
      } catch { failed++; }
    }
    setResult({ success, failed });
    setImporting(false);
    setStep(4);
    if (success > 0) {
      const groupId = crypto.randomUUID();
      onImportComplete({ groupId, groupName: file.name, companyIds: ids, count: success });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-lg shadow-2xl flex flex-col" style={{ width: 860, maxHeight: '90vh', border: '1px solid #CBD6E2' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DFE3EB] flex-shrink-0">
          <span className="text-base font-bold text-[#2D3E50]">Import to Companies</span>
          <div className="flex-1 flex justify-center"><StepBar current={step} /></div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F0F3F7] text-[#99ACC2]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div
                className="w-full max-w-lg border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-16 px-8 cursor-pointer transition-colors"
                style={{ borderColor: isDragging ? '#0091AE' : '#CBD6E2', backgroundColor: isDragging ? '#F0FAFF' : '#FAFBFC' }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
                onClick={() => fileRef.current?.click()}
              >
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
              <p className="text-base font-bold text-[#2D3E50] text-center mb-1">Preview of columns to import</p>
              <p className="text-xs text-[#7C98B6] text-center mb-5">Map or exclude columns before importing</p>
              <div className="overflow-auto rounded border border-[#DFE3EB]" style={{ maxHeight: 380 }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F6F9FC] border-b border-[#DFE3EB]">
                      <th className="px-3 py-2 text-left w-8 text-[#99ACC2]">#</th>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left min-w-[140px]">
                          <div className="flex flex-col gap-1">
                            <select value={mapping[h] || '__skip__'} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                              className="w-full text-xs border border-[#DFE3EB] rounded px-1.5 py-1 bg-white text-[#2D3E50] outline-none">
                              {COMPANY_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
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
                        {headers.map(h => <td key={h} className="px-3 py-2 text-[#2D3E50] truncate max-w-[160px]">{row[h] || ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-[#7C98B6] text-right">{rows.length} total rows</p>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center py-12 px-8">
              <p className="text-xl font-bold text-[#2D3E50] mb-2">Choose how to handle matches</p>
              <p className="text-sm text-[#7C98B6] mb-8">A "match" means a row has the same company name as an existing record.</p>
              <div className="w-full max-w-lg space-y-3">
                {[
                  { value: 'add_all', label: 'Add all rows as new items', sub: '– even if a match exists' },
                  { value: 'skip',    label: 'Skip matches',              sub: '– don\'t add them as new items' },
                  { value: 'update',  label: 'Update matches',            sub: '– update matching items with imported data' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-3 px-4 py-3 rounded border cursor-pointer"
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
                <><Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: '#0091AE' }} /><p className="text-sm text-[#516F90]">Importing companies…</p></>
              ) : result && (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#E5F8F6' }}>
                    <Check className="w-7 h-7" style={{ color: '#00BDA5' }} />
                  </div>
                  <p className="text-lg font-bold text-[#2D3E50] mb-2">Import complete</p>
                  <p className="text-sm text-[#516F90] mb-1"><span className="font-semibold text-[#00BDA5]">{result.success}</span> companies imported</p>
                  {result.failed > 0 && <p className="text-sm text-[#FF7A59]"><span className="font-semibold">{result.failed}</span> rows skipped</p>}
                  <p className="text-xs text-[#7C98B6] mt-3">A new group was created for imported companies.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#DFE3EB] flex-shrink-0">
          <button onClick={() => step > 1 && step < 4 ? setStep(s => (s - 1) as Step) : onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#425B76] border border-[#DFE3EB] rounded-[3px] hover:bg-[#F6F9FC]">
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
