import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  Building2,
  Mail,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  ArrowLeft,
  FileText,
  Table as TableIcon,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  Fingerprint,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import SkeletonLoader from '../../components/SkeletonLoader';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  username: string;
  role: string;
  department: string;
  status: string;
  position: string;
  employment_type: string;
  hire_date: string;
  enrolled: boolean;
  profile_photo: string | null;
}

const PAGE_SIZE = 12;

// --- Export helpers ---
function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(employees: Employee[]) {
  const headers = ['Full Name', 'Username', 'Email', 'Role', 'Department', 'Position', 'Employment Type', 'Hire Date', 'Status', 'Biometric'];
  const rows = employees.map((e) => [
    e.full_name, e.username, e.email, e.role,
    e.department, e.position || '', e.employment_type?.replace('_', '-') || '',
    e.hire_date || '', e.status, e.enrolled ? 'Enrolled' : 'Not Enrolled',
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadBlob(csv, 'employees.csv', 'text/csv;charset=utf-8;');
}

function exportExcel(employees: Employee[]) {
  const headers = ['Full Name', 'Username', 'Email', 'Role', 'Department', 'Position', 'Employment Type', 'Hire Date', 'Status', 'Biometric'];
  const toRow = (cells: string[]) =>
    `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
  const headerRow = `<tr>${headers.map((h) => `<th><b>${h}</b></th>`).join('')}</tr>`;
  const dataRows = employees
    .map((e) =>
      toRow([
        e.full_name, e.username, e.email, e.role,
        e.department, e.position || '', e.employment_type?.replace('_', '-') || '',
        e.hire_date || '', e.status, e.enrolled ? 'Enrolled' : 'Not Enrolled',
      ])
    )
    .join('');
  const xml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><style>th{background:#2563eb;color:white;}</style></head>
<body><table border="1">${headerRow}${dataRows}</table></body></html>`;
  downloadBlob(xml, 'employees.xls', 'application/vnd.ms-excel');
}

function exportPDF(employees: Employee[]) {
  const rows = employees
    .map(
      (e) =>
        `<tr>
          <td>${e.full_name}</td><td>${e.email}</td><td>${e.role}</td>
          <td>${e.department}</td><td>${e.position || 'â€”'}</td>
          <td>${e.employment_type?.replace('_', '-') || 'â€”'}</td>
          <td>${e.hire_date || 'â€”'}</td>
          <td style="color:${e.status === 'ACTIVE' ? 'green' : 'red'}">${e.status}</td>
        </tr>`
    )
    .join('');
  const html = `<!DOCTYPE html><html><head><title>Employee Directory</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;color:#1e293b}
h1{color:#2563eb;margin-bottom:4px}p{color:#64748b;margin-bottom:16px;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#2563eb;color:#fff;padding:8px 10px;text-align:left}
td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
tr:nth-child(even){background:#f8fafc}
@media print{button{display:none}}
</style></head><body>
<h1>HU-IOT Employee Directory</h1>
<p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total: ${employees.length} employees</p>
<button onclick="window.print()" style="margin-bottom:16px;padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer">Print / Save PDF</button>
<table><thead><tr>
<th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Position</th><th>Type</th><th>Hire Date</th><th>Status</th>
</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

export default function ManageEmployees() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        apiRequest<{ success: boolean; users: Employee[] }>('/accounts/api/users/'),
        apiRequest<{ success: boolean; departments: { id: string; name: string }[] }>('/accounts/api/departments/'),
      ]);
      setAllEmployees(usersRes.users);
      setDepartments(deptsRes.departments);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // Filtering
  const filtered = allEmployees.filter((emp) => {
    const matchesQuery =
      !query ||
      emp.full_name.toLowerCase().includes(query.toLowerCase()) ||
      emp.email.toLowerCase().includes(query.toLowerCase()) ||
      emp.department.toLowerCase().includes(query.toLowerCase()) ||
      emp.position.toLowerCase().includes(query.toLowerCase());
    const matchesDept = !filterDept || emp.department === filterDept;
    const matchesStatus = !filterStatus || emp.status?.toLowerCase() === filterStatus.toLowerCase();
    const matchesType = !filterType || emp.employment_type?.toLowerCase() === filterType.toLowerCase();
    return matchesQuery && matchesDept && matchesStatus && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'ACTIVE') return 'bg-emerald-100 text-emerald-700';
    if (s === 'SUSPENDED') return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/hr" className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 transition-all" title="Back to Dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Employee Directory</h1>
            <p className="text-slate-500">View and browse all registered HU-IOT employees</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleRefresh} className="secondary-button p-2.5" title="Refresh Directory">
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
          <button onClick={() => setShowExportModal(true)} className="secondary-button gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export List</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="professional-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, position or department..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn('secondary-button gap-2 transition-all', showFilters && 'bg-indigo-50 border-indigo-200 text-indigo-600')}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
          <div className="flex gap-2">
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {loading ? '...' : `Total: ${filtered.length}`}
            </span>
          </div>
        </div>

        {showFilters && (
          <div className="professional-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-200">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
              <select
                value={filterDept}
                onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Employment Type</label>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonLoader key={i} type="card" />
          ))}
        </div>
      ) : paged.length === 0 ? (
        <div className="professional-card p-16 text-center text-slate-500">
          No employees found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paged.map((emp) => (
            <div key={emp.id} className="professional-card group hover:shadow-md transition-all">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 text-xl font-bold overflow-hidden">
                    {emp.profile_photo ? (
                      <img src={emp.profile_photo} alt={emp.full_name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      (emp.first_name || emp.username).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider', statusBadge(emp.status))}>
                      {emp.status || 'Unknown'}
                    </span>
                    {emp.enrolled && (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-semibold">
                        <Fingerprint className="w-3 h-3" /> Enrolled
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{emp.full_name}</h3>
                <p className="text-sm text-slate-500 font-medium mb-4">{emp.position || emp.role}</p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs truncate">{emp.department}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs truncate">{emp.email}</span>
                  </div>
                  {(emp.employment_type || emp.hire_date) && (
                    <div className="flex items-center gap-3 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs">
                        {emp.employment_type?.replace('_', '-')}
                        {emp.hire_date ? ` â€¢ Hired ${emp.hire_date}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedEmployee(emp)}
                    className="w-full py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Full Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}â€“{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} employees
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="p-2 border border-slate-200 rounded-2xl hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm text-slate-600">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="p-2 border border-slate-200 rounded-2xl hover:bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Employee Profile</h2>
              <button onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-slate-100 rounded-2xl">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 text-2xl font-bold overflow-hidden shrink-0">
                  {selectedEmployee.profile_photo ? (
                    <img src={selectedEmployee.profile_photo} alt={selectedEmployee.full_name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    (selectedEmployee.first_name || selectedEmployee.username).charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedEmployee.full_name}</h3>
                  <p className="text-slate-500 text-sm">{selectedEmployee.position || selectedEmployee.role}</p>
                  <span className={cn('mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider', statusBadge(selectedEmployee.status))}>
                    {selectedEmployee.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Department', value: selectedEmployee.department },
                  { label: 'Employment Type', value: selectedEmployee.employment_type?.replace('_', '-') || 'N/A' },
                  { label: 'Email', value: selectedEmployee.email },
                  { label: 'Username', value: selectedEmployee.username },
                  { label: 'Hire Date', value: selectedEmployee.hire_date || 'N/A' },
                  { label: 'Biometric', value: selectedEmployee.enrolled ? 'Enrolled' : 'Not Enrolled' },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs font-semibold text-slate-500 uppercase">{item.label}</p>
                    <p className="text-sm font-medium text-slate-800 truncate">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Export Employee List</h2>
                <p className="text-sm text-slate-500">
                  {filtered.length} {filtered.length === 1 ? 'employee' : 'employees'} will be exported
                  {(query || filterDept || filterStatus || filterType) ? ' (filtered)' : ' (all)'}
                </p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-100 rounded-2xl">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'pdf', label: 'PDF', icon: FileText, color: 'text-rose-600', bg: 'bg-red-50' },
                  { id: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-green-50' },
                  { id: 'csv', label: 'CSV', icon: TableIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setExportFormat(format.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                      exportFormat === format.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'
                    )}
                  >
                    <div className={cn('p-2 rounded-2xl', format.bg, format.color)}>
                      <format.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{format.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
              <button onClick={() => setShowExportModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-2xl transition-all order-2 sm:order-1">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (exportFormat === 'csv') exportCSV(filtered);
                  else if (exportFormat === 'excel') exportExcel(filtered);
                  else if (exportFormat === 'pdf') exportPDF(filtered);
                  setShowExportModal(false);
                  setExportFormat('');
                }}
                disabled={!exportFormat || isExporting}
                className={cn(
                  'flex-1 py-3 text-sm font-bold text-white rounded-2xl shadow-lg transition-all active:scale-95 order-1 sm:order-2',
                  exportFormat ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' : 'bg-slate-300 cursor-not-allowed shadow-none'
                )}
              >
                {exportFormat === 'pdf' ? 'Open Print Preview' : 'Download File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
