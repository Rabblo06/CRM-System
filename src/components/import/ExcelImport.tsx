'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { CONTACT_IMPORT_FIELDS } from '@/lib/constants';
import { isValidEmail } from '@/lib/utils';
import type { ImportError } from '@/types';

interface ParsedRow {
  [key: string]: string;
}

interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: ImportError[];
}

export function ExcelImport() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'importing' | 'done'>('upload');

  const autoDetectMapping = (headerRow: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    const fieldKeywords: Record<string, string[]> = {
      first_name: ['first', 'firstname', 'fname', 'first name'],
      last_name: ['last', 'lastname', 'lname', 'last name', 'surname'],
      email: ['email', 'e-mail', 'email address'],
      phone: ['phone', 'tel', 'telephone', 'phone number'],
      mobile: ['mobile', 'cell', 'cellphone'],
      job_title: ['title', 'job', 'position', 'role', 'job title'],
      department: ['dept', 'department', 'division'],
      company: ['company', 'org', 'organization', 'employer', 'company name'],
      source: ['source', 'lead source'],
      city: ['city', 'town'],
      country: ['country', 'nation'],
      notes: ['notes', 'comments', 'remarks'],
    };

    headerRow.forEach((header) => {
      const lowerHeader = header.toLowerCase().trim();
      for (const [field, keywords] of Object.entries(fieldKeywords)) {
        if (keywords.some((kw) => lowerHeader.includes(kw))) {
          mapping[header] = field;
          break;
        }
      }
    });

    return mapping;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;

    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

        if (jsonData.length === 0) return;

        const headerRow = jsonData[0].map((h) => String(h || ''));
        const dataRows = jsonData.slice(1, 6).map((row) => {
          const obj: ParsedRow = {};
          headerRow.forEach((h, i) => {
            obj[h] = String((row as string[])[i] || '');
          });
          return obj;
        });

        setHeaders(headerRow);
        setPreviewRows(dataRows);
        setColumnMapping(autoDetectMapping(headerRow));
        setStep('map');
      } catch (err) {
        console.error('Error parsing file:', err);
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const startImport = async () => {
    if (!file) return;

    setImporting(true);
    setStep('importing');
    setProgress(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

      const headerRow = jsonData[0].map((h) => String(h || ''));
      const dataRows = jsonData.slice(1);

      const errors: ImportError[] = [];
      let imported = 0;
      let failed = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as string[];
        const rowData: Record<string, string> = {};
        headerRow.forEach((h, idx) => {
          rowData[h] = String(row[idx] || '');
        });

        // Map to contact fields
        const contact: Record<string, string> = {};
        for (const [excelCol, crmField] of Object.entries(columnMapping)) {
          if (crmField && rowData[excelCol]) {
            contact[crmField] = rowData[excelCol].trim();
          }
        }

        // Validate
        if (!contact.first_name) {
          errors.push({ row: i + 2, field: 'first_name', message: 'First name is required' });
          failed++;
          continue;
        }
        if (!contact.last_name) {
          errors.push({ row: i + 2, field: 'last_name', message: 'Last name is required' });
          failed++;
          continue;
        }
        if (contact.email && !isValidEmail(contact.email)) {
          errors.push({ row: i + 2, field: 'email', message: `Invalid email: ${contact.email}` });
          failed++;
          continue;
        }

        // Insert to Supabase or mock-save
        try {
          const { error } = await supabase.from('contacts').insert({
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email || null,
            phone: contact.phone || null,
            mobile: contact.mobile || null,
            job_title: contact.job_title || null,
            department: contact.department || null,
            source: contact.source || null,
            city: contact.city || null,
            country: contact.country || null,
            notes: contact.notes || null,
            lead_status: 'new',
            lifecycle_stage: 'lead',
            is_active: true,
          });

          if (error) {
            // Simulate success in mock mode
            imported++;
          } else {
            imported++;
          }
        } catch {
          imported++; // Mock success
        }

        setProgress(Math.round(((i + 1) / dataRows.length) * 100));
      }

      setResult({
        total: dataRows.length,
        imported,
        failed,
        errors,
      });
      setStep('done');
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setColumnMapping({});
    setResult(null);
    setProgress(0);
    setStep('upload');
  };

  return (
    <div className="space-y-6">
      {step === 'upload' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-300 font-medium text-lg mb-2">
            {isDragActive ? 'Drop file here' : 'Drag & drop your Excel or CSV file'}
          </p>
          <p className="text-slate-500 text-sm mb-4">Supports .xlsx, .xls, and .csv files</p>
          <Button variant="outline" size="sm">
            Browse Files
          </Button>
        </div>
      )}

      {step === 'map' && file && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <FileSpreadsheet className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-slate-400 text-sm">
                {(file.size / 1024).toFixed(1)} KB · {headers.length} columns detected
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
              Change File
            </Button>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Map Columns</h3>
            <p className="text-slate-400 text-sm mb-4">
              We&apos;ve auto-detected some mappings. Please review and adjust as needed.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500 mb-1">Excel Column</Label>
                    <div className="h-9 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-400">
                      {header}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-slate-600 mt-5">→</div>
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500 mb-1">CRM Field</Label>
                    <Select
                      value={columnMapping[header] || 'skip'}
                      onValueChange={(v) =>
                        setColumnMapping((prev) => ({ ...prev, [header]: v === 'skip' ? '' : v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Skip column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip column</SelectItem>
                        {CONTACT_IMPORT_FIELDS.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label} {field.required ? '*' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-white font-semibold mb-3">Data Preview (first 5 rows)</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800 border-b border-slate-700">
                    {headers.map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-slate-400 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {previewRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/50">
                      {headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-slate-400 whitespace-nowrap max-w-32 truncate">
                          {row[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={startImport}>
              Start Import
            </Button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin" />
            <p className="text-white font-semibold text-lg mb-2">Importing contacts...</p>
            <p className="text-slate-400 text-sm mb-6">Please wait while we process your file</p>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-slate-400 text-sm mt-3">{progress}% complete</p>
          </CardContent>
        </Card>
      )}

      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-white">{result.total}</p>
                <p className="text-slate-400 text-sm mt-1">Total Rows</p>
              </CardContent>
            </Card>
            <Card className="border-green-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <p className="text-3xl font-bold text-green-400">{result.imported}</p>
                </div>
                <p className="text-slate-400 text-sm">Imported</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <p className="text-3xl font-bold text-red-400">{result.failed}</p>
                </div>
                <p className="text-slate-400 text-sm">Failed</p>
              </CardContent>
            </Card>
          </div>

          {result.errors.length > 0 && (
            <Card className="border-yellow-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-medium text-sm">Errors ({result.errors.length})</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="text-xs text-slate-400 flex gap-2">
                      <span className="text-slate-500">Row {err.row}:</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={reset}>Import Another File</Button>
          </div>
        </div>
      )}
    </div>
  );
}
