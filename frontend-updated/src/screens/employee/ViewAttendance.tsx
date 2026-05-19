import { useLanguage } from '../../lib/translations';
﻿import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Download,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { buildDailyAttendanceRows, fetchMyAttendanceHistory } from '../../lib/attendance';

export default function ViewAttendance({ user }: { user: User }) {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState('This Month');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rows, setRows] = useState<
    {
      date: string;
      rawDate: string;
      checkIn: string;
      checkOut: string;
      total: string;
      status: 'on-time' | 'late' | 'early-leave';
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      try {
        const response = await fetchMyAttendanceHistory();
        if (active) {
          setRows(buildDailyAttendanceRows(response.records));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load attendance history.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAttendance();

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const now = new Date();

    return rows.filter((row) => {
      const rowDate = new Date(row.rawDate);
      const matchesSearch = row.date.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || row.status === statusFilter.toLowerCase().replace(' ', '-');

      let matchesRange = true;
      if (dateRange === 'This Week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        matchesRange = rowDate >= startOfWeek;
      } else if (dateRange === 'This Month') {
        matchesRange = rowDate.getMonth() === now.getMonth() && rowDate.getFullYear() === now.getFullYear();
      } else if (dateRange === 'Last Month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        matchesRange = rowDate.getMonth() === lastMonth.getMonth() && rowDate.getFullYear() === lastMonth.getFullYear();
      }

      return matchesSearch && matchesStatus && matchesRange;
    });
  }, [dateRange, rows, searchQuery, statusFilter]);

  const handleExport = () => {
    const csvRows = [
      ['Date', 'Check In', 'Check Out', 'Total Hours', 'Status'],
      ...filteredRows.map((row) => [row.date, row.checkIn, row.checkOut, row.total, row.status]),
    ];

    const blob = new Blob([csvRows.map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${user.username}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500 font-medium">Loading attendance history...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('Attendance History')}</h1>
          <p className="text-slate-500">{t('Detailed log of your check-in and check-out records')}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1">
            <button className="px-4 py-1.5 text-sm font-medium bg-indigo-50 text-indigo-600 rounded-md">Table</button>
            <button className="px-4 py-1.5 text-sm font-medium text-slate-500 rounded-md cursor-default">Chart</button>
          </div>
          <button onClick={handleExport} className="secondary-button gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-red-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="professional-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-slate-600 outline-none"
            >
              <option>This Week</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>All Time</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Status:</span>
          <div className="flex gap-1">
            {['All', 'On Time', 'Late', 'Early Leave'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold transition-colors',
                  statusFilter === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="professional-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check In</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.rawDate} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{row.checkIn}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{row.checkOut}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{row.total}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        row.status === 'on-time'
                          ? 'bg-emerald-100 text-emerald-700'
                          : row.status === 'late'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-indigo-100 text-indigo-700'
                      )}
                    >
                      {row.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No attendance records matched the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{filteredRows.length}</span> attendance days
          </p>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-slate-200 rounded-2xl hover:bg-white disabled:opacity-50" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-2xl text-sm font-bold">
              1
            </button>
            <button className="p-2 border border-slate-200 rounded-2xl hover:bg-white disabled:opacity-50" disabled>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
