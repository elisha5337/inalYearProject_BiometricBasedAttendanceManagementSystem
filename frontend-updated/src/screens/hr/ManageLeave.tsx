import { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  User, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Plus, 
  AlertCircle, 
  ArrowLeft, 
  Download, 
  FileText, 
  Table as TableIcon, 
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

const leaveRequests = [
  { _id: '1', userId: 'Biruk Bedilu', departmentId: 'Engineering', type: 'Annual Leave', startDate: '2026-04-10', endDate: '2026-04-15', days: 5, balance: 14, reason: 'Family vacation to Bahir Dar.', status: 'Pending', requested: '2 hours ago' },
  { _id: '2', userId: 'Kaleb Wondimu', departmentId: 'Computer Science', type: 'Sick Leave', startDate: '2026-03-26', endDate: '2026-03-27', days: 2, balance: 8, reason: 'Severe flu and headache.', status: 'Pending', requested: '5 hours ago' },
  { _id: '3', userId: 'Adan Mohamed', departmentId: 'Informatics', type: 'Study Leave', startDate: '2026-05-01', endDate: '2026-05-15', days: 15, balance: 20, reason: 'Final exams for Masters degree.', status: 'Pending', requested: 'Yesterday' },
];

export default function ManageLeave() {
  const [activeTab, setActiveTab] = useState('Pending');
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/hr" 
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Leave Requests</h1>
            <p className="text-slate-500">Review and process employee leave applications</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className="secondary-button p-2.5"
            title="Refresh Requests"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </button>
          <button 
            onClick={() => setShowExportModal(true)}
            className="secondary-button p-2.5"
            title="Export Report"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="primary-button gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Request</span>
          </button>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm overflow-x-auto">
            {['Pending', 'Approved', 'Rejected'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === tab ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab}
                {tab === 'Pending' && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">3</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {leaveRequests.map((request) => (
          <div key={request._id} className="professional-card">
            <div className="p-6 flex flex-col lg:flex-row gap-8">
              {/* Employee Info */}
              <div className="lg:w-64 shrink-0 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg">
                    {request.userId.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{request.userId}</h3>
                    <p className="text-xs text-slate-500">{request.departmentId}</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Leave Balance</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{request.balance} Days Available</p>
                </div>
              </div>

              {/* Request Details */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Leave Type</p>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">{request.type}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Duration</p>
                    <p className="text-sm font-bold text-slate-900">{request.days} Days</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Period</p>
                    <p className="text-sm font-bold text-slate-900">{request.startDate} - {request.endDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Requested</p>
                    <p className="text-sm text-slate-500">{request.requested}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Reason</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed italic">"{request.reason}"</p>
                </div>
              </div>

              {/* Actions */}
              <div className="lg:w-48 shrink-0 flex flex-col justify-center gap-3">
                <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all active:scale-[0.98]">
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button className="w-full py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 pt-4">
        <button className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50" disabled>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-slate-500">Page 1 of 1</span>
        <button className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50" disabled>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">New Leave Request</h2>
                <p className="text-sm text-slate-500">Apply for leave on behalf of an employee</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Employee</label>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option>Select Employee</option>
                  <option>Biruk Bedilu (HU-EMP-003)</option>
                  <option>Kaleb Wondimu (HU-EMP-004)</option>
                  <option>Adan Mohamed (HU-EMP-005)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Leave Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Annual', 'Sick', 'Study'].map((type) => (
                    <button 
                      key={type}
                      className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Reason / Description</label>
                <textarea 
                  rows={3}
                  placeholder="Provide a brief reason for the leave..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Employee has <strong>14 days</strong> of annual leave remaining.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all order-2 sm:order-1"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 order-1 sm:order-2"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Export Report Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Export Leave Report</h2>
                <p className="text-sm text-slate-500">Select format and date range</p>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wider text-center">Select Date Range</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">From</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">To</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wider text-center">Output Format</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
                    { id: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50' },
                    { id: 'csv', label: 'CSV', icon: TableIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
                  ].map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setExportFormat(format.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        exportFormat === format.id 
                          ? "border-blue-600 bg-blue-50 shadow-sm" 
                          : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", format.bg, format.color)}>
                        <format.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{format.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all order-2 sm:order-1"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert(`Exporting leave report as ${exportFormat.toUpperCase()}`);
                  setShowExportModal(false);
                }}
                disabled={!exportFormat}
                className={cn(
                  "flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 order-1 sm:order-2",
                  exportFormat 
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20" 
                    : "bg-slate-300 cursor-not-allowed shadow-none"
                )}
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
