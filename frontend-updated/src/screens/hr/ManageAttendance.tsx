import { useLanguage } from '../../lib/translations';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Loader2, Download, Search, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';

import { ApiError, apiRequest } from '../../lib/api';
import { fetchAttendanceRecords, type HrAttendanceRecord } from '../../lib/hrAttendance';
import SkeletonLoader from '../../components/SkeletonLoader';
import { cn } from '../../lib/utils';

function formatDisplayDate(value: string) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDisplayTime(value: string | null) {
  if (!value) return '--';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStatusClasses(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('late')) return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  if (normalized.includes('absent')) return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
  return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
}

function getVerificationClasses(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'rejected') return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
  if (normalized.includes('pending') || normalized.includes('unverified')) return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  if (normalized.includes('reject') || normalized.includes('fail')) return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
  return 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200';
}

function downloadCsv(rows: HrAttendanceRecord[]) {
  const headers = ['Employee Name', 'Employee Code', 'Department', 'Date', 'Check In', 'Check Out', 'Hours Worked', 'Status', 'Verification', 'Location', 'Assignment'];
  const csvRows = rows.map((row) => [row.employeeName, row.employeeCode, row.department, row.date, row.checkInTime ?? '', row.checkOutTime ?? '', row.hoursWorked, row.status, row.verificationStatus, row.location, row.assignment].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `attendance-records-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function ManageAttendance() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<HrAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAttendanceRecords();
      setRecords(data);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAttendanceRecords(); }, []);

  const handleVerifyAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await apiRequest(`/api/attendance/verify-manual/${id}/`, {
        method: 'POST',
        body: { status: action === 'approve' ? 'VERIFIED' : 'UNVERIFIED' },
      });
      setRecords(prev => prev.map(r =>
        r.id === id
          ? { ...r, verificationStatus: action === 'approve' ? 'Verified (Bypass)' : 'Rejected' }
          : r
      ));
    } catch (err) {
      setError(action === 'approve' ? 'Failed to verify record.' : 'Failed to reject record.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return records.filter((record) => {
      if (statusFilter !== 'all' && !record.status.toLowerCase().includes(statusFilter)) return false;
      if (dateFilter && record.date !== dateFilter) return false;
      if (!normalizedSearch) return true;
      return [record.employeeName, record.employeeCode, record.department, record.location, record.assignment].join(' ').toLowerCase().includes(normalizedSearch);
    });
  }, [dateFilter, records, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: records.length,
    present: records.filter((r) => r.status.toLowerCase().includes('present')).length,
    late: records.filter((r) => r.status.toLowerCase().includes('late')).length,
    pending: records.filter((r) => r.verificationStatus.toLowerCase().includes('pending') || r.verificationStatus.toLowerCase().includes('unverified')).length,
  }), [records]);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">{t('HR Operations')}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t('Attendance Management')}</h1>
            <p className="max-w-2xl text-sm text-slate-600">{t('Review real-time biometric logs and audit manual verification requests.')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t('Total')}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Present</p><p className="mt-2 text-2xl font-semibold text-emerald-900">{stats.present}</p></div>
            <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">Late</p><p className="mt-2 text-2xl font-semibold text-amber-900">{stats.late}</p></div>
            <div className="rounded-2xl bg-sky-50 p-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700">Pending</p><p className="mt-2 text-2xl font-semibold text-sky-900">{stats.pending}</p></div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Search Employees</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search name, code, dept..." className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm outline-none transition focus:border-slate-400" />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400">
              <option value="all">All statuses</option><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Date</span>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400" />
          </label>
          <div className="flex items-end gap-2">
            <button onClick={loadAttendanceRecords} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200"><RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} /></button>
            <button type="button" onClick={() => downloadCsv(filteredRecords)} className="bg-slate-900 text-white rounded-2xl px-6 py-3 text-sm font-bold flex items-center gap-2 hover:bg-slate-800"><Download className="w-4 h-4" /> EXPORT</button>
          </div>
        </div>
      </section>

      {error && <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-100 flex items-center gap-3"><AlertCircle className="w-5 h-5" /> {error}</div>}

      {/* Main Table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? <SkeletonLoader type="table" rows={6} /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-4 text-left">Employee / Assignment</th>
                  <th className="px-6 py-4 text-left">Log Date</th>
                  <th className="px-6 py-4 text-left">Times</th>
                  <th className="px-6 py-4 text-left">Hours</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Verification</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRecords.map((record) => {
                  // Show action buttons for any record that hasn't been reviewed by HR yet.
                  // 'Unverified (Bypass)' from backend = pending review.
                  // Hide buttons only after HR acts: approved → 'Verified (Bypass)', rejected → 'Flagged'
                  const needsReview = record.verificationStatus.toLowerCase().includes('unverified') ||
                    record.verificationStatus.toLowerCase().includes('pending');
                  const isReviewed = record.verificationStatus === 'Verified (Bypass)' ||
                    record.verificationStatus === 'Rejected';
                  const showActions = needsReview && !isReviewed;
                  return (
                    <tr key={record.id} className="align-top hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-bold text-slate-900">{record.employeeName}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-black">{record.employeeCode} · {record.department}</p>
                          <p className="text-[10px] text-indigo-600 font-bold mt-0.5">{record.assignment} // {record.location}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-slate-700">{formatDisplayDate(record.date)}</td>
                      <td className="px-6 py-5 text-xs text-slate-600">
                        <span className="opacity-50">In:</span> {formatDisplayTime(record.checkInTime)} <br />
                        <span className="opacity-50">Out:</span> {formatDisplayTime(record.checkOutTime)}
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-slate-900">{record.hoursWorked.toFixed(2)}</td>
                      <td className="px-6 py-5"><span className={cn("inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase", getStatusClasses(record.status))}>{record.status}</span></td>
                      <td className="px-6 py-5">
                        <span className={cn("inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase flex items-center gap-1.5", getVerificationClasses(record.verificationStatus))}>
                          {needsReview && <ShieldAlert className="w-3 h-3" />} {record.verificationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {showActions ? (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleVerifyAction(record.id, 'approve')}
                              disabled={!!actionLoading}
                              title="Approve — mark as verified"
                              className="p-1.5 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 shadow-sm transition-all"
                            >
                              {actionLoading === record.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleVerifyAction(record.id, 'reject')}
                              disabled={!!actionLoading}
                              title="Reject — flag as unverified bypass"
                              className="p-1.5 bg-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Audited</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
