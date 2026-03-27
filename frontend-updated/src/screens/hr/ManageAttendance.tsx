import { useEffect, useMemo, useState } from 'react';
<<<<<<< HEAD
import { useSearchParams } from 'react-router-dom';
=======
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e

import { ApiError } from '../../lib/api';
import { fetchAttendanceRecords, type HrAttendanceRecord } from '../../lib/hrAttendance';

function formatDisplayDate(value: string) {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDisplayTime(value: string | null) {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes('late')) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  }

  if (normalized.includes('absent')) {
    return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
  }

  return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
}

function getVerificationClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes('pending')) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  }

  if (normalized.includes('reject') || normalized.includes('fail')) {
    return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
  }

  return 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200';
}

function matchesStatusFilter(recordStatus: string, statusFilter: string) {
  if (statusFilter === 'all') {
    return true;
  }

  const normalizedStatus = recordStatus.toLowerCase();

  if (statusFilter === 'late') {
    return normalizedStatus.includes('late');
  }

  if (statusFilter === 'absent') {
    return normalizedStatus.includes('absent');
  }

  return normalizedStatus.includes(statusFilter);
}

function downloadCsv(rows: HrAttendanceRecord[]) {
  const headers = [
    'Employee Name',
    'Employee Code',
    'Department',
    'Date',
    'Check In',
    'Check Out',
    'Hours Worked',
    'Status',
    'Verification',
    'Location',
    'Assignment',
  ];

  const csvRows = rows.map((row) =>
    [
      row.employeeName,
      row.employeeCode,
      row.department,
      row.date,
      row.checkInTime ?? '',
      row.checkOutTime ?? '',
      row.hoursWorked,
      row.status,
      row.verificationStatus,
      row.location,
      row.assignment,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(','),
  );

  const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `attendance-records-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function ManageAttendance() {
<<<<<<< HEAD
  const [searchParams] = useSearchParams();
=======
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e
  const [records, setRecords] = useState<HrAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
<<<<<<< HEAD
  const routeSearchTerm = searchParams.get('search') ?? '';
=======
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e

  useEffect(() => {
    let cancelled = false;

    async function loadAttendanceRecords() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchAttendanceRecords();

        if (!cancelled) {
          setRecords(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load attendance records right now.';

          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAttendanceRecords();

    return () => {
      cancelled = true;
    };
  }, []);

<<<<<<< HEAD
  useEffect(() => {
    setSearchTerm(routeSearchTerm);
  }, [routeSearchTerm]);

=======
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e
  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      if (!matchesStatusFilter(record.status, statusFilter)) {
        return false;
      }

      if (dateFilter && record.date !== dateFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        record.employeeName,
        record.employeeCode,
        record.department,
        record.location,
        record.assignment,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [dateFilter, records, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: records.length,
      present: records.filter((record) => record.status.toLowerCase() === 'present').length,
      late: records.filter((record) => record.status.toLowerCase().includes('late')).length,
      pendingVerification: records.filter((record) =>
        record.verificationStatus.toLowerCase().includes('pending'),
      ).length,
    };
  }, [records]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              HR Operations
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Attendance Management
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Monitor attendance, verification outcomes, and shift coverage using live data from
              the backend attendance module.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Records
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                Present
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{stats.present}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
                Late
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">{stats.late}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700">
                Verification Pending
              </p>
              <p className="mt-2 text-2xl font-semibold text-sky-900">
                {stats.pendingVerification}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Search employees</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by employee, department, location..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="all">All statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Date</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => downloadCsv(filteredRecords)}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">Attendance Records</h2>
          <p className="mt-1 text-sm text-slate-600">
            The table below is synced from backend attendance records rather than design-time mock
            entries.
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">Loading attendance records...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            No attendance records matched the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Check In
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Check Out
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Hours
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Verification
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="align-top">
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-medium text-slate-900">{record.employeeName}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {record.employeeCode} • {record.department}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {record.assignment} • {record.location}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      {formatDisplayDate(record.date)}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      {formatDisplayTime(record.checkInTime)}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      {formatDisplayTime(record.checkOutTime)}
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-900">
                      {record.hoursWorked.toFixed(2)}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                          record.status,
                        )}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getVerificationClasses(
                          record.verificationStatus,
                        )}`}
                      >
                        {record.verificationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
