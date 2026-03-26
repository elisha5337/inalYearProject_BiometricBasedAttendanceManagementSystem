import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Download,
  Calendar,
  History,
  Shield,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ApiError } from '../../lib/api';
import { fetchAuditLogs, type AuditLogEntry } from '../../lib/admin';

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchAuditLogs();
        if (!cancelled) {
          setLogs(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load audit logs right now.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSeverity =
        severityFilter === 'All' || log.severity.toLowerCase() === severityFilter.toLowerCase();
      const matchesSearch =
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = !dateFilter || log.time.startsWith(dateFilter);
      return matchesSeverity && matchesSearch && matchesDate;
    });
  }, [logs, severityFilter, searchQuery, dateFilter]);

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Time,User,Action,Details,Severity,IP\n' +
      filteredLogs
        .map(
          (log) =>
            `${log.time},${log.user},${log.action},"${log.details.replace(/"/g, '""')}",${log.severity},${log.ip}`,
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Audit Logs</h1>
          <p className="text-slate-500">Track all administrative actions and system events</p>
        </div>

        <button onClick={handleExport} className="secondary-button gap-2 w-full md:w-auto justify-center">
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="professional-card p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:flex-1">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user, action or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
            {['All', 'High', 'Medium', 'Low'].map((severity) => (
              <button
                key={severity}
                onClick={() => setSeverityFilter(severity)}
                className={cn(
                  'px-4 py-1.5 rounded-md text-xs font-bold transition-all flex-1 sm:flex-none',
                  severityFilter === severity
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {severity}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full lg:w-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-transparent border-none text-sm font-medium text-slate-600 outline-none w-full"
          />
        </div>
      </div>

      <div className="professional-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading audit logs...
                  </td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                    {new Date(log.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {log.user.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-900 truncate">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-blue-600">{log.action}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {log.severity === 'high' && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      {log.severity === 'medium' && <Info className="w-3.5 h-3.5 text-amber-500" />}
                      {log.severity === 'low' && <Shield className="w-3.5 h-3.5 text-green-500" />}
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider',
                          log.severity === 'high'
                            ? 'text-red-600'
                            : log.severity === 'medium'
                              ? 'text-amber-600'
                              : 'text-green-600',
                        )}
                      >
                        {log.severity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-400 font-mono">{log.ip}</td>
                </tr>
              ))}
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">No audit entries found matching your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing {filteredLogs.length} entries</p>
          <div className="flex gap-2">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white" disabled>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
