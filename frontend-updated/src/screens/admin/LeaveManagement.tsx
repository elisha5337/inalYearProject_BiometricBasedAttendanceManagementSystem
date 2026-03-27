import {
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Eye,
  UserCircle,
  X,
  FileText,
  Mail,
  User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { ApiError } from '../../lib/api';
import { fetchAdminLeaveRequests, processLeaveRequest, type AdminLeaveRequestRecord } from '../../lib/admin';

export default function LeaveManagement() {
  const [requests, setRequests] = useState<AdminLeaveRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Rejected' | 'Pending' | 'Cancelled'>('All');
  const [selectedRequest, setSelectedRequest] = useState<AdminLeaveRequestRecord | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminLeaveRequests();
      setRequests(data);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load leave requests right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleProcessRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessing(true);
      await processLeaveRequest(id, status);
      await loadRequests();
      setSelectedRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const name = request.employeeName || '';
      const id = request.username || '';
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((request) => request.status === 'Pending').length,
      approved: requests.filter((request) => request.status === 'Approved').length,
      rejected: requests.filter((request) => request.status === 'Rejected').length,
    }),
    [requests],
  );

  const handleExport = () => {
    const csvRows = filteredRequests.map((request) =>
      [
        request.employeeName,
        request.username,
        request.type,
        request.startDate,
        request.endDate,
        request.status,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Employee Name,Username,Leave Type,Start Date,End Date,Status', ...csvRows].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `leave_overview_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management Oversight</h1>
          <p className="text-slate-500 mt-1">Review and manage employee leave requests</p>
        </div>
        <button onClick={handleExport} className="secondary-button gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Requests', value: stats.total, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat, index) => (
          <div key={index} className="professional-card p-6">
            <div className="flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.bg, stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="professional-card">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or username..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              className="bg-slate-50 border-none rounded-xl text-sm py-2 px-4 focus:ring-2 focus:ring-blue-500/20"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leave Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Loading leave requests...
                  </td>
                </tr>
              ) : filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                        {(request.employeeName || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{request.employeeName || 'Unknown Employee'}</p>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-tighter">{request.username || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-700">{request.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-900 font-medium">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        Applied on {new Date(request.appliedOn).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        request.status === 'Approved'
                          ? 'bg-green-100 text-green-700'
                          : request.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : request.status === 'Cancelled'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-700',
                      )}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedRequest(request)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View Details">
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                  <UserCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedRequest.employeeName}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-mono uppercase"><User className="w-3 h-3" /> {selectedRequest.username}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedRequest.email}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leave Type</p>
                    <p className="text-base font-bold text-slate-900">{selectedRequest.type}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Date</p>
                      <p className="text-sm font-semibold text-slate-900">{new Date(selectedRequest.startDate).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End Date</p>
                      <p className="text-sm font-semibold text-slate-900">{new Date(selectedRequest.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                    <span
                      className={cn(
                        'inline-flex px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        selectedRequest.status === 'Approved'
                          ? 'bg-green-100 text-green-700'
                          : selectedRequest.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : selectedRequest.status === 'Cancelled'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-700',
                      )}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submission Date</p>
                    <p className="text-sm font-semibold text-slate-900">{new Date(selectedRequest.appliedOn).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason</p>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 text-sm text-slate-700 leading-relaxed shadow-inner">
                  {selectedRequest.reason}
                </div>
              </div>

              {selectedRequest.attachment && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supporting Document</p>
                  <a
                    href={selectedRequest.attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors w-fit"
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-sm font-bold">View Attachment</span>
                  </a>
                </div>
              )}
            </div>

            {selectedRequest.status === 'Pending' && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  disabled={processing}
                  onClick={() => handleProcessRequest(selectedRequest.id, 'REJECTED')}
                  className="px-6 py-2.5 rounded-xl border-2 border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  Reject Request
                </button>
                <button
                  disabled={processing}
                  onClick={() => handleProcessRequest(selectedRequest.id, 'APPROVED')}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  Approve Leave
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
