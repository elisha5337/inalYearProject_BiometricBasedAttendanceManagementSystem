import { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText as FilePdf,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { API_BASE, apiRequest } from '../../lib/api';

function buildUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function downloadFromUrl(url: string, fallbackFilename: string) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallbackFilename;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

const REPORT_ENDPOINTS: Record<string, string> = {
  '1': '/api/reporting/attendance-export/',
  '2': '/api/reporting/overtime-export/',
  '3': '/api/reporting/leave-export/',
  '4': '/api/reporting/tardiness-export/',
};

// Map for real PDF generation (Backend implemented)
const PDF_ENDPOINTS: Record<string, string> = {
  '1': '/api/reporting/attendance-pdf/',
};

const REPORT_FILENAMES: Record<string, string> = {
  '1': 'attendance-report',
  '2': 'overtime-report',
  '3': 'leave-summary',
  '4': 'tardiness-report',
};

const reportTypes = [
  { id: '1', title: 'Monthly Attendance', desc: 'Complete log of all employee check-ins and check-outs for the period.', icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { id: '2', title: 'Overtime Report', desc: 'Analysis of employees working beyond their scheduled shift duration.', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  { id: '3', title: 'Leave Summary', desc: 'Overview of approved, pending, and rejected leave requests.', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
  { id: '4', title: 'Tardiness Analysis', desc: 'Detailed report on late arrivals vs scheduled shift start times.', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-100' },
];

export default function GenerateReports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'Current Month' | 'Last Month' | 'Last 3 Months' | 'Custom Range'>('Current Month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [outputFormat, setOutputFormat] = useState<'PDF' | 'Excel' | 'CSV'>('CSV');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [exportCount, setExportCount] = useState(0);

  useEffect(() => {
    apiRequest<{ success: boolean; departments: { id: string; name: string }[] }>('/accounts/api/departments/')
      .then((res) => setDepartments(res.departments.map((d) => d.name)))
      .catch(() => {});
    setExportCount(Number(localStorage.getItem('bbeams_report_count') || '0'));
  }, []);

  const resolveDateWindow = () => {
    const now = new Date();
    if (dateRange === 'Custom Range') {
      if (!customStart || !customEnd) return null;
      return { start: customStart, end: customEnd };
    }
    if (dateRange === 'Current Month') {
      return {
        start: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    }
    if (dateRange === 'Last Month') {
      return {
        start: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    }
    return {
      start: toISODate(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
      end: toISODate(now),
    };
  };

  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);
    if (!selectedReport) return;

    const window = resolveDateWindow();
    if (!window) {
      setError('Please choose a valid date range.');
      return;
    }

    setIsExporting(true);
    try {
      const baseName = REPORT_FILENAMES[selectedReport];

      if (outputFormat === 'PDF' && PDF_ENDPOINTS[selectedReport]) {
        // Use Actual Backend PDF Generation
        const pdfUrl = buildUrl(
          `${PDF_ENDPOINTS[selectedReport]}?start_date=${encodeURIComponent(window.start)}&end_date=${encodeURIComponent(window.end)}`
        );
        await downloadFromUrl(pdfUrl, `${baseName}_${window.start}.pdf`);
      } else if (outputFormat === 'Excel') {
        const endpoint = REPORT_ENDPOINTS[selectedReport];
        const url = buildUrl(
          `${endpoint}?start_date=${encodeURIComponent(window.start)}&end_date=${encodeURIComponent(window.end)}&format=csv&department=${encodeURIComponent(department)}`
        );
        const resp = await fetch(url, { credentials: 'include' });
        if (!resp.ok) throw new Error(await resp.text() || `Status ${resp.status}`);
        const csvText = await resp.text();
        const lines = csvText.trim().split('\n').map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '')));
        const headerRow = `<tr>${lines[0].map((h) => `<th><b>${h}</b></th>`).join('')}</tr>`;
        const dataRows = lines.slice(1).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
        const xml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
          <head><meta charset="UTF-8"><style>th{background:#2563eb;color:white;}</style></head>
          <body><table border="1">${headerRow}${dataRows}</table></body></html>`;
        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = `${baseName}_${window.start}.xls`;
        a.click();
      } else {
        // CSV or Default PDF fallback
        const endpoint = REPORT_ENDPOINTS[selectedReport];
        const url = buildUrl(
          `${endpoint}?start_date=${encodeURIComponent(window.start)}&end_date=${encodeURIComponent(window.end)}&format=csv&department=${encodeURIComponent(department)}`
        );
        await downloadFromUrl(url, `${baseName}_${window.start}.csv`);
      }

      const newCount = exportCount + 1;
      setExportCount(newCount);
      localStorage.setItem('bbeams_report_count', String(newCount));
      setSuccess(`Report generated and downloaded successfully.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedReportTitle = reportTypes.find((r) => r.id === selectedReport)?.title;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Institutional Reports</h1>
        <p className="text-slate-500 font-medium italic">Create and export analytical datasets for HR oversight</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-900">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={cn(
                  'professional-card p-8 text-left transition-all group relative overflow-hidden border-2',
                  selectedReport === report.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent hover:border-indigo-200'
                )}
              >
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all shadow-sm', report.bg, report.color, selectedReport === report.id && 'scale-110 shadow-indigo-200')}>
                  <report.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight leading-none">{report.title}</h3>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed font-bold uppercase tracking-wider opacity-70">{report.desc}</p>
                {selectedReport === report.id && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="professional-card p-8 space-y-8 border-2 border-slate-100">
            <div>
              <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Configurator</h3>
              {selectedReportTitle && (
                <p className="text-[10px] text-indigo-600 font-black mt-1 uppercase tracking-[0.2em]">{selectedReportTitle}</p>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Date Window</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                >
                  <option>Current Month</option>
                  <option>Last Month</option>
                  <option>Last 3 Months</option>
                  <option>Custom Range</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Output Media</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['CSV', 'Excel', 'PDF'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setOutputFormat(fmt)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 py-4 border-2 rounded-2xl transition-all',
                        outputFormat === fmt ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-400'
                      )}
                    >
                      {fmt === 'PDF' && <FilePdf className="w-5 h-5" />}
                      {fmt === 'Excel' && <FileSpreadsheet className="w-5 h-5" />}
                      {fmt === 'CSV' && <BarChart3 className="w-5 h-5" />}
                      <span className="text-[9px] font-black tracking-widest">{fmt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!selectedReport || isExporting}
              onClick={handleGenerate}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-indigo-200 transition-all flex items-center justify-center gap-3"
            >
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {isExporting ? 'EXECUTING...' : `GENERATE ${outputFormat}`}
            </button>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 animate-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
