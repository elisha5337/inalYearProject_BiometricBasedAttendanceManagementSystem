import { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Download,
  Calendar,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  FileText as FilePdf,
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

/** Open a styled print-preview in new tab from a CSV blob */
function openPdfPreview(csvText: string, title: string, start: string, end: string) {
  const lines = csvText.trim().split('\n').map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '')));
  const headers = lines[0] || [];
  const rows = lines.slice(1);
  const headerHtml = headers.map((h) => `<th>${h}</th>`).join('');
  const rowsHtml = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  const html = `<!DOCTYPE html><html><head><title>${title}</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;color:#1e293b}
h1{color:#2563eb;margin-bottom:4px}p{color:#64748b;margin-bottom:16px;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#2563eb;color:#fff;padding:8px 10px;text-align:left}
td{padding:7px 10px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}
@media print{button{display:none}}
</style></head><body>
<h1>${title}</h1>
<p>Period: ${start} to ${end}</p>
<button onclick="window.print()" style="margin-bottom:16px;padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer">Print / Save PDF</button>
<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
</body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

const REPORT_ENDPOINTS: Record<string, string> = {
  '1': '/api/reporting/attendance-export/',
  '2': '/api/reporting/overtime-export/',
  '3': '/api/reporting/leave-export/',
  '4': '/api/reporting/tardiness-export/',
};

const REPORT_FILENAMES: Record<string, string> = {
  '1': 'attendance-report',
  '2': 'overtime-report',
  '3': 'leave-summary',
  '4': 'tardiness-report',
};

const reportTypes = [
  { id: '1', title: 'Monthly Attendance', desc: 'Complete log of all employee check-ins and check-outs for the period.', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
  { id: '2', title: 'Overtime Report', desc: 'Analysis of employees working beyond their scheduled 8-hour shift.', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  { id: '3', title: 'Leave Summary', desc: 'Overview of approved, pending, and rejected leave requests.', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
  { id: '4', title: 'Tardiness Analysis', desc: 'Detailed report on late arrivals vs scheduled shift start times.', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
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
    // Fetch count of reports generated
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
    // Last 3 Months
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
      const endpoint = REPORT_ENDPOINTS[selectedReport];
      const baseName = REPORT_FILENAMES[selectedReport];
      const url = buildUrl(
        `${endpoint}?start_date=${encodeURIComponent(window.start)}&end_date=${encodeURIComponent(window.end)}&format=csv&department=${encodeURIComponent(department)}`
      );

      if (outputFormat === 'PDF') {
        // Fetch as text, then open print preview
        const resp = await fetch(url, { credentials: 'include' });
        if (!resp.ok) throw new Error(await resp.text() || `Status ${resp.status}`);
        const csvText = await resp.text();
        const reportTitle = reportTypes.find((r) => r.id === selectedReport)?.title || 'Report';
        openPdfPreview(csvText, `HU-IOT ${reportTitle}`, window.start, window.end);
      } else if (outputFormat === 'Excel') {
        // Fetch CSV, convert to xls XML
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
        a.download = `${baseName}_${window.start}_to_${window.end}.xls`;
        a.click();
        URL.revokeObjectURL(objUrl);
      } else {
        // Plain CSV download
        await downloadFromUrl(url, `${baseName}_${window.start}_to_${window.end}.csv`);
      }

      // Update count
      const newCount = exportCount + 1;
      setExportCount(newCount);
      localStorage.setItem('bbeams_report_count', String(newCount));
      setSuccess(`${outputFormat === 'PDF' ? 'Print preview opened' : 'File downloaded'} successfully.`);
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
        <h1 className="text-2xl font-bold text-slate-900">Generate Reports</h1>
        <p className="text-slate-500">Create and export detailed analytical reports for HR management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Report Types */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={cn(
                  'professional-card p-6 text-left transition-all group',
                  selectedReport === report.id ? 'ring-2 ring-blue-600 border-transparent shadow-lg' : 'hover:border-blue-200'
                )}
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors', report.bg, report.color)}>
                  <report.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{report.title}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{report.desc}</p>
                {selectedReport === report.id ? (
                  <div className="mt-6 flex items-center text-xs font-bold text-blue-600 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Selected
                  </div>
                ) : (
                  <div className="mt-6 flex items-center text-xs font-bold text-blue-600 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                    Select Report <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-6">
          <div className="professional-card p-8 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Report Configuration</h3>
              {selectedReportTitle && (
                <p className="text-sm text-blue-600 font-medium mt-1">{selectedReportTitle}</p>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Current Month</option>
                  <option>Last Month</option>
                  <option>Last 3 Months</option>
                  <option>Custom Range</option>
                </select>
              </div>

              {dateRange === 'Custom Range' && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Start</span>
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">End</span>
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>All Departments</option>
                  {departments.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Output Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CSV', 'Excel', 'PDF'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setOutputFormat(fmt)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2.5 border rounded-xl transition-colors text-sm font-bold',
                        outputFormat === fmt ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-50 border-slate-200'
                      )}
                    >
                      {fmt === 'PDF' && <FilePdf className="w-3.5 h-3.5 text-red-400" />}
                      {fmt === 'Excel' && <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />}
                      {fmt === 'CSV' && <BarChart3 className="w-3.5 h-3.5 text-blue-400" />}
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!selectedReport || isExporting}
              onClick={handleGenerate}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {isExporting ? 'EXPORTING...' : outputFormat === 'PDF' ? 'OPEN PRINT PREVIEW' : `DOWNLOAD ${outputFormat}`}
            </button>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {success}
              </div>
            )}
          </div>

          <div className="professional-card p-6 bg-slate-900 text-white">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Quick Stats
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Reports Generated (session)</span>
                <span className="text-sm font-bold">{exportCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Available Report Types</span>
                <span className="text-sm font-bold">{reportTypes.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Departments Loaded</span>
                <span className="text-sm font-bold">{departments.length > 0 ? departments.length : '...'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
