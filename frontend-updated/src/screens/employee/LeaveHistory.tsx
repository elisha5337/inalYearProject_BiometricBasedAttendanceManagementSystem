import { useEffect, useMemo, useState } from 'react';

import { ApiError } from '../../lib/api';
import { fetchMyLeaveRequests, type LeaveRequestRecord } from '../../lib/leave';

function formatDisplayDate(value: string | null) {
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

function formatDateRange(request: LeaveRequestRecord) {
  if (request.startDate === request.endDate) {
    return formatDisplayDate(request.startDate);
  }

  return `${formatDisplayDate(request.startDate)} - ${formatDisplayDate(request.endDate)}`;
}

function getStatusClasses(status: LeaveRequestRecord['status']) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
    case 'rejected':
      return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
    case 'cancelled':
      return 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200';
    default:
      return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  }
}

export default function LeaveHistory() {
  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveRequestRecord['status']>('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;

    async function loadLeaveHistory() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchMyLeaveRequests();

        if (!cancelled) {
          setRequests(data.requests);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load leave history right now.';

          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLeaveHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const leaveTypeOptions = useMemo(() => {
    return Array.from(new Set(requests.map((request) => request.leaveTypeLabel))).sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      if (statusFilter !== 'all' && request.status !== statusFilter) {
        return false;
      }

      if (leaveTypeFilter !== 'all' && request.leaveTypeLabel !== leaveTypeFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        request.leaveTypeLabel,
        request.reason,
        request.status,
        request.reviewedBy ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [leaveTypeFilter, requests, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      approved: requests.filter((request) => request.status === 'approved').length,
      pending: requests.filter((request) => request.status === 'pending').length,
      rejected: requests.filter((request) => request.status === 'rejected').length,
    };
  }, [requests]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              Leave Management
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Leave History</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Review all submitted leave requests with their latest approval status, decision notes,
              and date ranges pulled directly from the backend.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Total</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                Approved
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{stats.approved}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
                Pending
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">{stats.pending}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-700">
                Rejected
              </p>
              <p className="mt-2 text-2xl font-semibold text-rose-900">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_220px_220px]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Search requests</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by leave type, reason, status..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | LeaveRequestRecord['status'])
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Leave type</span>
            <select
              value={leaveTypeFilter}
              onChange={(event) => setLeaveTypeFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="all">All types</option>
              {leaveTypeOptions.map((leaveType) => (
                <option key={leaveType} value={leaveType}>
                  {leaveType}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">Request Timeline</h2>
          <p className="mt-1 text-sm text-slate-600">
            Each request below is synchronized from the backend leave module.
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">Loading leave requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            No leave requests matched the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Leave Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Dates
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Days
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Submitted
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Notes
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="align-top">
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-medium text-slate-900">{request.leaveTypeLabel}</p>
                        <p className="mt-1 text-sm text-slate-500">{request.reason || 'No reason provided'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">{formatDateRange(request)}</td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-900">{request.totalDays}</td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      {formatDisplayDate(request.appliedAt ?? request.startDate)}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                          request.status,
                        )}`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      {request.status === 'rejected'
                        ? request.rejectionReason || 'Rejected without additional comments.'
                        : request.reviewedBy
                          ? `Reviewed by ${request.reviewedBy}`
                          : 'Awaiting HR review'}
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
