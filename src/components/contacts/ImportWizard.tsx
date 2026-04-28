'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, ChevronRight, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────── */
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
}

type Step = 1 | 2 | 3 | 4;

const CONTACT_FIELDS = [
  { value: '__skip__', label: "Don't import" },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'job_title', label: 'Job Title / Title' },
  { value: 'department', label: 'Department' },
  { value: 'company', label: 'Company Name' },
  { value: 'lead_status', label: 'Lead Status' },
  { value: 'lifecycle_stage', label: 'Lifecycle Stage' },
  { value: 'source', label: 'Lead Source' },
  { value: 'city', label: 'City' },
  { value: 'country', label: 'Country' },
  { value: 'notes', label: 'Notes' },
];

const AUTO_MAP: Record<string, string> = {
  'first name': 'first_name', firstname: 'first_name', 'first_name': 'first_name',
  'last name': 'last_name', lastname: 'last_name', 'last_name': 'last_name',
  email: 'email', 'email address': 'email',
  phone: 'phone', 'phone number': 'phone', mobile: 'phone',
  'job title': 'job_title', title: 'job_title', position: 'job_title',
  department: 'department',
  company: 'company', 'company name': 'company', account: 'company',
  'lead status': 'lead_status',
  'lifecycle stage': 'lifecycle_stage',
  source: 'source', 'lead source': 'source',
  city: 'city', country: 'country', notes: 'notes',
};

const STEP_LABELS = ['Upload', 'Map columns', 'Handle matches', 'Import'];

const GROUP_COLORS = ['#00A38D', '#0091AE', '#8B5CF6', '#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#F97316'];

/* ── Step indicator ─────────────────────────────────────────── */
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
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  backgroundColor: done ? '#00BDA5' : active ? '#0091AE' : '#DFE3EB',
                  color: done || active ? '#fff' : '#99ACC2',
                }}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : step}
              </div>
              <span className="text-xs font-medium" style={{ color: active ? '#2D3E50' : '#99ACC2' }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className="w-8 h-px mx-3" style={{ backgroundColor: done ? '#00BDA5' : '#DFE3EB' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function ImportWizard({ onClose, onImportComplete, createContact }: ImportWizardProps) {
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

  /* ── Parse file ── */
  const parseFile = useCallback((f: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!json.length) { setError('File appears to be empty.'); return; }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRows(json);
        const autoMap: Record<string, string> = {};
        hdrs.forEach(h => {
          const mapped = AUTO_MAP[h.toLowerCase().trim()];
          autoMap[h] = mapped || '__skip__';
        });
        setMapping(autoMap);
        setFile(f);
        setStep(2);
      } catch {
        setError('Could not parse file. Please use CSV, XLSX, or XLS format.');
      }
    };
    reader.readAsBinaryString(f);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  }, [parseFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  /* ── Do import ── */
  const doImport = async () => {
    if (!file) return;
    setImporting(true);
    let success = 0;
    let failed = 0;
    const importedIds: string[] = [];

    for (const row of rows) {
      const contact: Record<string, string> = {};
      for (const [header, field] of Object.entries(mapping)) {
        if (field === '__skip__' || !field) continue;
        contact[field] = row[header] || '';
      }
      // Need at least first_name or last_name
      if (!contact.first_name && !contact.last_name) {
        // Try to split a "name" field or skip
        failed++;
        continue;
      }
      if (!contact.first_name) { contact.first_name = ''; }
      if (!contact.last_name) { contact.last_name = ''; }

      try {
        const res = await createContact(contact);
        if (res?.data?.id) {
          importedIds.push(res.data.id);
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setResult({ success, failed });
    setImporting(false);
    setStep(4);

    if (success > 0) {
      const groupId = crypto.randomUUID();
      const groupName = file.name;
      const color = GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
      onImportComplete({ groupId, groupName: groupName, contactIds: importedIds, count: success });
      // Store color hint in localStorage so the contacts page can use it
      try {
        const stored = JSON.parse(localStorage.getItem('crm_import_groups') || '[]');
        stored.push({ id: groupId, name: groupName, color, contactIds: importedIds });
        localStorage.setItem('crm_import_groups', JSON.stringify(stored));
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-lg shadow-2xl flex flex-col" style={{ width: 860, maxHeight: '90vh', border: '1px solid #CBD6E2' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DFE3EB] flex-shrink-0">
          <span className="text-base font-bold text-[#2D3E50]">Import to Contacts</span>
          <div className="flex-1 flex justify-center">
            <StepBar current={step} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F0F3F7] text-[#99ACC2]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div
                className="w-full max-w-lg border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-16 px-8 cursor-pointer transition-colors"
                style={{
                  borderColor: isDragging ? '#0091AE' : '#CBD6E2',
                  backgroundColor: isDragging ? '#F0FAFF' : '#FAFBFC',
                }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-10 h-10 mb-4" style={{ color: '#CBD6E2' }} />
                <button
                  className="px-5 py-2 rounded text-sm font-bold text-white mb-3"
                  style={{ backgroundColor: '#0091AE' }}
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                >
                  Browse
                </button>
                <p className="text-sm font-semibold text-[#2D3E50]">or drag and drop a CSV file</p>
                <p className="text-xs text-[#7C98B6] mt-1">(.csv, .xlsx, and .xls file types are supported)</p>
                {error && (
                  <p className="mt-3 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                  </p>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
            </div>
          )}

          {/* ── Step 2: Map columns ── */}
          {step === 2 && (
            <div className="px-6 py-5">
              <p className="text-base font-bold text-[#2D3E50] text-center mb-1">Here is a preview of columns that will be imported</p>
              <p className="text-xs text-[#7C98B6] text-center mb-5">Review them and map or exclude relevant ones before we finish the import</p>
              <div className="overflow-auto rounded border border-[#DFE3EB]" style={{ maxHeight: 380 }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F6F9FC] border-b border-[#DFE3EB]">
                      <th className="px-3 py-2 text-left w-8 text-[#99ACC2]">#</th>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left min-w-[140px]">
                          <div className="flex flex-col gap-1">
                            <select
                              value={mapping[h] || '__skip__'}
                              onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                              className="w-full text-xs border border-[#DFE3EB] rounded px-1.5 py-1 bg-white text-[#2D3E50] outline-none"
                              onFocus={e => { e.currentTarget.style.borderColor = '#0091AE'; }}
                              onBlur={e => { e.currentTarget.style.borderColor = '#DFE3EB'; }}
                            >
                              {CONTACT_FIELDS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                            <span className="text-[10px] text-[#99ACC2] font-normal truncate">{h}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}>
                        <td className="px-3 py-2 text-[#99ACC2]">{i + 1}</td>
                        {headers.map(h => (
                          <td key={h} className="px-3 py-2 text-[#2D3E50] truncate max-w-[160px]">
                            {row[h] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-[#7C98B6] text-right">{rows.length} total rows</p>
            </div>
          )}

          {/* ── Step 3: Handle matches ── */}
          {step === 3 && (
            <div className="flex flex-col items-center py-12 px-8">
              <p className="text-xl font-bold text-[#2D3E50] mb-2">Choose how to handle matches</p>
              <p className="text-sm text-[#7C98B6] mb-2">When we find <strong>matching items</strong>, what should we do?</p>
              <p className="text-xs text-[#99ACC2] mb-8">A "match" means a row in your file has the same email as an existing contact.</p>
              <div className="w-full max-w-lg space-y-3">
                {[
                  { value: 'add_all', label: 'Add all rows as new items', sub: '– even if a match exists' },
                  { value: 'skip', label: 'Skip matches', sub: '– don\'t add them as new items' },
                  { value: 'update', label: 'Update matches', sub: '– update matching items with imported data' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 px-4 py-3 rounded border cursor-pointer transition-colors"
                    style={{
                      borderColor: matchMode === opt.value ? '#0091AE' : '#DFE3EB',
                      backgroundColor: matchMode === opt.value ? '#F0FAFF' : '#fff',
                    }}
                  >
                    <input
                      type="radio"
                      name="matchMode"
                      value={opt.value}
                      checked={matchMode === opt.value}
                      onChange={() => setMatchMode(opt.value as typeof matchMode)}
                      className="accent-[#0091AE]"
                    />
                    <span className="text-sm text-[#2D3E50]">
                      <strong>{opt.label}</strong> {opt.sub}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 4 && (
            <div className="flex flex-col items-center py-16 px-8">
              {importing ? (
                <>
                  <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: '#0091AE' }} />
                  <p className="text-sm text-[#516F90]">Importing contacts…</p>
                </>
              ) : result && (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#E5F8F6' }}>
                    <Check className="w-7 h-7" style={{ color: '#00BDA5' }} />
                  </div>
                  <p className="text-lg font-bold text-[#2D3E50] mb-2">Import complete</p>
                  <p className="text-sm text-[#516F90] mb-1">
                    <span className="font-semibold text-[#00BDA5]">{result.success}</span> contacts imported successfully
                  </p>
                  {result.failed > 0 && (
                    <p className="text-sm text-[#FF7A59]">
                      <span className="font-semibold">{result.failed}</span> rows skipped (missing name)
                    </p>
                  )}
                  <p className="text-xs text-[#7C98B6] mt-3">A new group was created for imported contacts.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#DFE3EB] flex-shrink-0">
          <button
            onClick={() => step > 1 && step < 4 ? setStep(s => (s - 1) as Step) : onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#425B76] border border-[#DFE3EB] rounded-[3px] hover:bg-[#F6F9FC] transition-colors"
          >
            {step === 4 ? 'Close' : step === 1 ? 'Cancel' : <><ArrowLeft className="w-3.5 h-3.5" /> Back</>}
          </button>

          {step < 4 && (
            <button
              onClick={() => {
                if (step === 3) doImport();
                else if (step < 3) setStep(s => (s + 1) as Step);
              }}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white rounded-[3px] disabled:opacity-40 transition-colors"
              style={{ backgroundColor: '#0091AE' }}
              onMouseEnter={e => { if (step !== 1) (e.currentTarget as HTMLElement).style.backgroundColor = '#007A99'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#0091AE'; }}
            >
              {step === 3 ? 'Start import' : <>Continue <ChevronRight className="w-3.5 h-3.5" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
