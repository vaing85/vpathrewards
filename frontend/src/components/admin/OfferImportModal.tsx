import { useState, useRef, useCallback } from 'react';
import apiClient from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'processing' | 'results';

interface PreviewRow {
  row: number;
  merchant_name: string;
  title: string;
  cashback_rate: string;
  affiliate_link: string;
  description?: string;
  terms?: string;
  status: 'ready' | 'duplicate' | 'error';
  errors: string[];
}

interface ResultRow {
  row: number;
  status: 'imported' | 'skipped' | 'error';
  title: string;
  merchant_name: string;
  reason?: string;
}

interface Summary { imported: number; skipped: number; errors: number; }

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload',     label: 'Upload'  },
  { key: 'preview',    label: 'Preview' },
  { key: 'processing', label: 'Import'  },
  { key: 'results',    label: 'Done'    },
];

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              i < idx  ? 'bg-green-500 text-white' :
              i === idx ? 'bg-blue-600 text-white' :
                          'bg-gray-200 text-gray-400'
            }`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 ${i === idx ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${i < idx ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  ready:    'bg-green-100 text-green-700',
  duplicate:'bg-yellow-100 text-yellow-700',
  error:    'bg-red-100 text-red-700',
  imported: 'bg-green-100 text-green-700',
  skipped:  'bg-yellow-100 text-yellow-700',
};
const STATUS_LABEL = {
  ready: 'Ready', duplicate: 'Skip (dup)', error: 'Error',
  imported: 'Imported', skipped: 'Skipped',
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { onClose: () => void; onDone: () => void; }

export default function OfferImportModal({ onClose, onDone }: Props) {
  const [step, setStep]         = useState<Step>('upload');
  const [csvText, setCsvText]   = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview]   = useState<PreviewRow[]>([]);
  const [results, setResults]   = useState<ResultRow[]>([]);
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Upload step ──────────────────────────────────────────────────────────────

  const readFile = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      setError('Please upload a .csv file.'); return;
    }
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setCsvText((e.target?.result as string) ?? '');
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }, [readFile]);

  const handlePreview = async () => {
    if (!csvText) { setError('Upload a CSV file first.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await apiClient.post('/admin/offers/preview', { csv: csvText });
      setPreview(data.preview);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse CSV.');
    } finally { setLoading(false); }
  };

  // ── Preview step ─────────────────────────────────────────────────────────────

  const readyRows = preview.filter((r) => r.status === 'ready');

  const handleImport = async () => {
    if (readyRows.length === 0) { setError('No valid rows to import.'); return; }
    setStep('processing');
    setProgress(0);

    // Simulate progress ticks while waiting
    const tick = setInterval(() => setProgress((p) => Math.min(p + 8, 90)), 200);

    try {
      const { data } = await apiClient.post('/admin/offers/import', { rows: readyRows });
      clearInterval(tick);
      setProgress(100);
      setResults(data.results);
      setSummary(data.summary);
      setTimeout(() => setStep('results'), 400);
    } catch (err: any) {
      clearInterval(tick);
      setError(err.response?.data?.error || 'Import failed.');
      setStep('preview');
    }
  };

  // ── Results step ─────────────────────────────────────────────────────────────

  const handleDone = () => { onDone(); onClose(); };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-900">Import Offers</h2>
          {step !== 'processing' && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-6 pb-6 flex flex-col flex-1 overflow-hidden">
          <StepBar current={step} />

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
              <span className="mt-0.5">⚠</span> {error}
            </div>
          )}

          {/* ── UPLOAD ── */}
          {step === 'upload' && (
            <div className="flex-1 flex flex-col gap-5">
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all min-h-[180px]"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) readFile(e.target.files[0]); }}
                />
                {fileName ? (
                  <>
                    <span className="text-4xl mb-2">📄</span>
                    <p className="font-semibold text-gray-800">{fileName}</p>
                    <p className="text-sm text-gray-400 mt-1">Click to replace</p>
                  </>
                ) : (
                  <>
                    <span className="text-4xl mb-2">⬆️</span>
                    <p className="font-semibold text-gray-600">Drop your CSV here</p>
                    <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                  </>
                )}
              </div>

              <details className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                <summary className="cursor-pointer font-medium text-gray-600">CSV format</summary>
                <p className="mt-2 font-mono">merchant_name, title, cashback_rate, affiliate_link, description, terms</p>
                <p className="mt-1">• First row must be the header</p>
                <p>• <code>merchant_name</code> must match an existing merchant exactly</p>
                <p>• <code>cashback_rate</code> is a number (e.g. 4.5)</p>
              </details>

              <button
                onClick={handlePreview}
                disabled={!csvText || loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition"
              >
                {loading ? 'Parsing…' : 'Preview →'}
              </button>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Summary chips */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'Ready to import', count: preview.filter(r => r.status === 'ready').length,     color: 'bg-green-100 text-green-700' },
                  { label: 'Will skip (duplicate)', count: preview.filter(r => r.status === 'duplicate').length, color: 'bg-yellow-100 text-yellow-700' },
                  { label: 'Errors',           count: preview.filter(r => r.status === 'error').length,    color: 'bg-red-100 text-red-700' },
                ].map((c) => (
                  <span key={c.label} className={`px-3 py-1 rounded-full text-sm font-medium ${c.color}`}>
                    {c.count} {c.label}
                  </span>
                ))}
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((row) => (
                      <tr key={row.row} className={row.status === 'error' ? 'bg-red-50' : row.status === 'duplicate' ? 'bg-yellow-50' : ''}>
                        <td className="px-4 py-2.5 text-gray-400">{row.row}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-700">{row.merchant_name || <span className="text-red-400 italic">missing</span>}</td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate">{row.title || <span className="text-red-400 italic">missing</span>}</td>
                        <td className="px-4 py-2.5 text-gray-600">{row.cashback_rate ? `${row.cashback_rate}%` : <span className="text-red-400 italic">—</span>}</td>
                        <td className="px-4 py-2.5">
                          <div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[row.status]}`}>
                              {STATUS_LABEL[row.status]}
                            </span>
                            {row.errors.length > 0 && (
                              <p className="text-xs text-red-500 mt-0.5">{row.errors.join(', ')}</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('upload')} className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                  ← Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={readyRows.length === 0}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition"
                >
                  Import {readyRows.length} offer{readyRows.length !== 1 ? 's' : ''} →
                </button>
              </div>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {step === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div className="w-full max-w-sm">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Importing offers…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {step === 'results' && summary && (
            <div className="flex-1 flex flex-col gap-5 overflow-hidden">
              {/* Big summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                  <p className="text-3xl font-bold text-green-600">{summary.imported}</p>
                  <p className="text-sm text-green-700 mt-1 font-medium">Imported</p>
                </div>
                <div className="bg-yellow-50 rounded-2xl p-4 text-center border border-yellow-100">
                  <p className="text-3xl font-bold text-yellow-600">{summary.skipped}</p>
                  <p className="text-sm text-yellow-700 mt-1 font-medium">Skipped</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4 text-center border border-red-100">
                  <p className="text-3xl font-bold text-red-500">{summary.errors}</p>
                  <p className="text-sm text-red-600 mt-1 font-medium">Errors</p>
                </div>
              </div>

              {/* Scrollable detail list */}
              {results.length > 0 && (
                <div className="flex-1 overflow-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {results.map((r) => (
                        <tr key={r.row}>
                          <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate">{r.title}</td>
                          <td className="px-4 py-2.5 text-gray-500">{r.merchant_name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                              {STATUS_LABEL[r.status]}
                            </span>
                            {r.reason && <span className="text-xs text-gray-400 ml-2">{r.reason}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={handleDone}
                className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
