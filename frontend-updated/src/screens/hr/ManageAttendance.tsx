import { useLanguage } from '../../lib/translations';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Loader2, Download, Search, RefreshCw, AlertCircle, ShieldAlert, Clock, Save, RotateCcw, CheckCircle2 } from 'lucide-react';

import { ApiError, apiRequest } from '../../lib/api';
import { fetchAttendanceRecords, type HrAttendanceRecord } from '../../lib/hrAttendance';
import { fetchPolicies, createPolicy, updatePolicy, type LeavePolicyRecord } from '../../lib/admin';
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

function extractNumber(value: string, fallback: number) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

function getStatusClasses(status: string) {
  const n = status.toLowerCase();
  if (n.includes('late')) return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  if (n.includes('absent')) return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
  return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
}

function getVerificationClasses(status: string) {
  const n = status.toLowerCase();
  if (n === 'rejected') return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
  if (n.includes('pending') || n.includes('unverified')) return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  return 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200';
}

function downloadCsv(rows: HrAttendanceRecord[]) {
  const headers = ['Employee Name', 'Employee Code', 'Department', 'Date', 'Check In', 'Check Out', 'Hours Worked', 'Status', 'Verification', 'Location', 'Assignment'];
  const csvRows = rows.map((row) =>
    [row.employeeName, row.employeeCode, row.department, row.date, row.checkInTime ?? '', row.checkOutTime ?? '', row.hoursWorked, row.status, row.verificationStatus, row.location, row.assignment]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
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

  // ── Attendance records ──
  const [records, setRecords] = useState<HrAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // ── Policy state (Attendance Rules only) ──
  const [gracePeriod, setGracePeriod] = useState(15);
  const [lateThreshold, setLateThreshold] = useState(60);
  const [policyRecords, setPolicyRecords] = useState<LeavePolicyRecord[]>([]);
  const [policySaving, setPolicySaving] = useState(false);
  const [policySuccess, setPolicySuccess] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  async function loadPolicies() {
    try {
      const records = await fetchPolicies();
      setPolicyRecords(records);
      const grace = records.find(p => p.name.toLowerCase().includes('grace'));
      const late  = records.find(p => p.name.toLowerCase().includes('late threshold'));
      if (grace) setGracePeriod(extractNumber(grace.value, 15));
      if (late)  setLateThreshold(extractNumber(late.value, 60));
    } catch { /* silent */ }
  }

  async function upsertPolicy(name: string, category: string, value: string, description: string) {
    const existing = policyRecords.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await updatePolicy(existing.id, { ...existing, category, value, description });
    } else {
      await createPolicy({ name, category, value, description, urgency: 'MEDIUM', isActive: true, rules: {} });
    }
  }

  async function handlePolicySave() {
    try {
      setPolicySaving(true);
      setPolicyError(null);
      await Promise.all([
        upsertPolicy('Grace Period',   'ATTENDANCE', `${gracePeriod} Minutes`,  'Time allowed after shift start before marking late.'),
        upsertPolicy('Late Threshold', 'ATTENDANCE', `${lateThreshold} Minutes`, 'Minutes after which a late arrival is flagged.'),
      ]);
      await loadPolicies();
      setPolicySuccess(true);
      setTimeout(() => setPolicySuccess(false), 3000);
    } catch {
      setPolicyError('Failed to save policies. Please try again.');
    } finally {
      setPolicySaving(false);
    }
  }

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

  useEffect(() => {
    loadAttendanceRecords();
    loadPolicies();
  }, []);

  const handleVerifyAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await apiRequest(`/api/attendance/verify-manual/${id}/`, {
        method: 'POST',
        body: { status: action === 'approve' ? 'VERIFIED' : 'UNVERIFIED' },
      });
      setRecords(prev => prev.map(r =>
        r.id === id ? { ...r, verificationStatus: action === 'approve' ? 'Verified (Bypass)' : 'Rejected' } : r
      ));
    } catch {
      setError(action === 'approve' ? 'Failed to verify record.' : 'Failed to reject record.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Apply grace period / late threshold to determine effective status ──
  // Records whose check-in is within grace period are shown as On Time even if backend says Late.
  // Records whose check-in exceeds lateThreshold are flagged as Absent-Late.
  function getEffectiveStatus(record: HrAttendanceRecord): string {
    if (!record.checkInTime || !record.shiftStartTime) return record.status;
    const checkIn = new Date(record.checkInTime).getTime();
    const shiftStart = new Date(record.shiftStartTime).getTime();
    if (isNaN(checkIn) || isNaN(shiftStart)) return record.status;
    const diffMins = (checkIn - shiftStart) / 60000;
    if (diffMins <= gracePeriod) return 'On Time';
    if (diffMins > lateThreshold) return 'Absent-Late';
    return 'Late';
  }

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return records.filter((record) => {
      const effectiveStatus = getEffectiveStatus(record);
      if (statusFilter !== 'all' && !effectiveStatus.toLowerCase().includes(statusFilter)) return false;
      if (dateFilter && record.date !== dateFilter) return false;
      if (!normalizedSearch) return true;
      return [record.employeeName, record.employeeCode, record.department, record.location, record.assignment]
        .join(' ').toLowerCase().includes(normalizedSearch);
    });
  }, [dateFilter, records, searchTerm, statusFilter, gracePeriod, lateThreshold]);

  const stats = useMemo(() => ({
    total: records.length,
    present: records.filter(r => !getEffectiveStatus(r).toLowerCase().includes('late') && !getEffectiveStatus(r).toLowerCase().includes('absent')).length,
    late: records.filter(r => getEffectiveStatus(r).toLowerCase().includes('late')).length,
    pending: records.filter(r => r.verificationStatus.toLowerCase().includes('pending') || r.verificationStatus.toLowerCase().includes('unverified')).length,
  }), [records, gracePeriod, lateThreshold]);

  return (
    <div className="space-y-6">

      {/* Attendance Rules */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-tight">Attendance Rules</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Thresholds for lateness and grace periods</p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Grace Period (Minutes)</label>
            <input
              type="number" min={0} value={gracePeriod}
              onChange={e => setGracePeriod(Math.max(0, parseInt(e.target.value || '0')))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 text-sm"
            />
            <p className="text-[9px] text-slate-400 italic">Check-ins within this window are On Time.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Late Threshold (Minutes)</label>
            <input
              type="number" min={0} value={lateThreshold}
              onChange={e => setLateThreshold(Math.max(0, parseInt(e.target.value || '0')))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 text-sm"
            />
            <p className="text-[9px] text-slate-400 italic">Beyond this, the record is flagged Absent-Late.</p>
          </div>
        </div>
      </div>

      {/* Save Policy Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          {policySuccess && (
            <span className="flex items-center gap-2 text-emerald-600 font-bold">
              <CheckCircle2 className="w-4 h-4" /> Policies saved and applied to attendance table.
            </span>
          )}
          {policyError && <span className="text-rose-500 font-bold">{policyError}</span>}
          {!policySuccess && !policyError && (
            <span className="text-slate-400 text-xs">Changes apply immediately to the attendance status column below.</span>
          )}
        </div>
        <button
          onClick={handlePolicySave}
          disabled={policySaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shrink-0"
        >
          {policySaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {policySaving ? 'Saving...' : 'Save Policy Changes'}
        </button>
      </div>

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
              <option value="all">All statuses</option>
              <option value="on time">On Time</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
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
                  <th className="px-6 py-4 text-left">
                    Status
                    <span className="ml-1 text-indigo-400 normal-case font-normal">(grace: {gracePeriod}m)</span>
                  </th>
                  <th className="px-6 py-4 text-left">Verification</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRecords.map((record) => {
                  const effectiveStatus = getEffectiveStatus(record);
                  const needsReview = record.verificationStatus.toLowerCase().includes('unverified') || record.verificationStatus.toLowerCase().includes('pending');
                  const isReviewed = record.verificationStatus === 'Verified (Bypass)' || record.verificationStatus === 'Rejected';
                  const showActions = needsReview && !isReviewed;
                  return (
                    <tr key={record.id} className="align-top hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-900">{record.employeeName}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black">{record.employeeCode} · {record.department}</p>
                        <p className="text-[10px] text-indigo-600 font-bold mt-0.5">{record.assignment} // {record.location}</p>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-slate-700">{formatDisplayDate(record.date)}</td>
                      <td className="px-6 py-5 text-xs text-slate-600">
                        <span className="opacity-50">In:</span> {formatDisplayTime(record.checkInTime)} <br />
                        <span className="opacity-50">Out:</span> {formatDisplayTime(record.checkOutTime)}
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-slate-900">{record.hoursWorked.toFixed(2)}</td>
                      <td className="px-6 py-5">
                        <span className={cn("inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase", getStatusClasses(effectiveStatus))}>
                          {effectiveStatus}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn("inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase items-center gap-1.5", getVerificationClasses(record.verificationStatus))}>
                          {needsReview && <ShieldAlert className="w-3 h-3" />} {record.verificationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {showActions ? (
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => handleVerifyAction(record.id, 'approve')} disabled={!!actionLoading} title="Approve" className="p-1.5 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 shadow-sm transition-all">
                              {actionLoading === record.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => handleVerifyAction(record.id, 'reject')} disabled={!!actionLoading} title="Reject" className="p-1.5 bg-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all">
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
