import { useEffect, useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  ArrowLeft, 
  Download, 
  FileText, 
  Table as TableIcon, 
  FileSpreadsheet,
  RefreshCw,
  Mail,
  User,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Briefcase,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { apiRequest, API_BASE } from '../../lib/api';
import { formatRelativeTime } from '../../lib/admin';

interface LeaveRequest {
  id: string;
  employee_name: string;
  username: string;
  email: string;
  department: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  balance: number;
  reason: string;
  status: string;
  attachment: string | null;
  requested_at: string | null;
}

export default function ManageLeave() {
  const [activeTab, setActiveTab] = useState('Pending');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string } | null>(null);

  const fetchRequests = async () => {
    setIsRefreshing(true);
    try {
      const response = await apiRequest<{ success: boolean; leave_requests: LeaveRequest[] }>('/api/leave/api/all/');
      if (response.success) {
        setAllRequests(response.leave_requests);
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRefresh = () => {
    fetchRequests();
  };

  const handleAction = async (requestId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await apiRequest<{ success: boolean }>(`/api/leave/api/manage/${requestId}/`, {
        method: 'POST',
        body: { status: action }
      });
      if (response.success) {
        fetchRequests();
      }
    } catch (error) {
      console.error(`Failed to ${action.toLowerCase()} leave request:`, error);
    }
  };

  const filteredRequests = useMemo(() => {
    return allRequests.filter(req => (req.status || '').toLowerCase() === activeTab.toLowerCase());
  }, [allRequests, activeTab]);

  const pendingCount = useMemo(() => {
    return allRequests.filter(req => (req.status || '').toLowerCase() === 'pending').length;
  }, [allRequests]);

  const toggleExpand = (id: string) => {
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  const getFullAttachmentUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const base = API_BASE.replace(/\/$/, '');
    const relativePath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${relativePath}`;
  };

  const handlePreview = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    setPreviewFile({ url, type: extension });
  };

  return (
    <div className="space-y-6">
      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/90 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl h-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                  {['jpg', 'jpeg', 'png', 'gif'].includes(previewFile.type) ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase">Document Preview</h3>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Format: {previewFile.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={previewFile.url} download className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all" title="Download Original">
                  <Download className="w-5 h-5" />
                </a>
                <button onClick={() => setPreviewFile(null)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-red-50 rounded-2xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100/50 overflow-auto p-4 flex items-center justify-center">
              {['jpg', 'jpeg', 'png', 'gif'].includes(previewFile.type) ? (
                <img src={previewFile.url} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
              ) : previewFile.type === 'pdf' ? (
                <iframe src={`${previewFile.url}#toolbar=0`} className="w-full h-full border-none rounded-2xl bg-white shadow-lg" title="PDF Preview" />
              ) : (
                <div className="text-center space-y-4 p-12 bg-white rounded-2xl shadow-xl border border-slate-200">
                  <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Preview not available</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">This file type ({previewFile.type}) cannot be previewed in the browser. Please download it to view.</p>
                  <a href={previewFile.url} download className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                    <Download className="w-4 h-4" /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/hr" 
            className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 transition-all"
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
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm overflow-x-auto">
            {['Pending', 'Approved', 'Rejected'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 md:px-6 py-2 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === tab ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab}
                {tab === 'Pending' && pendingCount > 0 && <span className="ml-2 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
            <p className="text-sm font-bold">Synchronizing Leave Records...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <Clock className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No {activeTab} Requests</h3>
            <p className="text-sm text-slate-500">There are no leave applications in this category.</p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const isExpanded = expandedRequestId === request.id;
            const attachmentUrl = getFullAttachmentUrl(request.attachment);
            
            return (
              <div key={request.id} className={cn(
                "professional-card transition-all duration-300 overflow-hidden",
                isExpanded ? "ring-2 ring-indigo-500 shadow-xl" : "hover:border-slate-300"
              )}>
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
                    {/* Employee Mini Info */}
                    <div className="flex items-center gap-4 min-w-[280px]">
                      <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-lg">
                        {(request.employee_name || 'U').charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-slate-900 truncate">{request.employee_name || 'Unknown'}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                           <Briefcase className="w-3 h-3 text-slate-400" />
                           <span className="truncate">{request.department || 'No Department'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono uppercase truncate mt-0.5">{request.username || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Leave Type</p>
                        <p className="text-sm font-bold text-slate-700 truncate">{request.leave_type}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Duration</p>
                        <p className="text-sm font-bold text-slate-900">{request.days} Days</p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Start Date</p>
                        <p className="text-sm font-bold text-slate-900">{request.start_date}</p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Requested</p>
                        <p className="text-sm text-slate-500">{formatRelativeTime(request.requested_at)}</p>
                      </div>
                    </div>

                    {/* Expand Toggle */}
                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={() => toggleExpand(request.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold transition-all border border-slate-200"
                      >
                        {isExpanded ? (
                          <>Close Details <ChevronUp className="w-4 h-4" /></>
                        ) : (
                          <>See Details <ChevronDown className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <div className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isExpanded ? "grid-rows-[1fr] opacity-100 mt-8" : "grid-rows-[0fr] opacity-0"
                  )}>
                    <div className="overflow-hidden">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-100">
                        {/* Detailed Employee Info */}
                        <div className="space-y-6">
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Identity</h4>
                              <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                  <User className="w-4 h-4 text-indigo-500" />
                                  <span className="font-bold">{request.employee_name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                  <Briefcase className="w-4 h-4 text-indigo-500" />
                                  <span>{request.department}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                  <Mail className="w-4 h-4 text-indigo-500" />
                                  <span className="truncate">{request.email}</span>
                                </div>
                              </div>
                           </div>
                           <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm">
                              <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider mb-2">Leave Quota Status</p>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-indigo-700">{request.balance}</span>
                                <span className="text-xs font-bold text-indigo-500 uppercase">Days Remaining</span>
                              </div>
                           </div>
                        </div>

                        {/* Leave Reason & Attachment */}
                        <div className="lg:col-span-2 space-y-6">
                           <div className="space-y-3">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare className="w-3 h-3" /> 
                                Justification/Reason
                              </h4>
                              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner italic text-slate-600 text-sm whitespace-pre-wrap break-words leading-relaxed max-h-[400px] overflow-y-auto">
                                "{request.reason || 'No reason provided by the employee.'}"
                              </div>
                           </div>

                           {attachmentUrl && (
                             <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                               <div className="flex items-center gap-3 overflow-hidden">
                                 <div className="w-10 h-10 bg-red-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                                   <FileText className="w-5 h-5" />
                                 </div>
                                 <div className="overflow-hidden">
                                   <p className="text-xs font-bold text-slate-900 uppercase">Supporting Document</p>
                                   <p className="text-[10px] text-slate-400 truncate">Evidence for review</p>
                                 </div>
                               </div>
                               <div className="flex items-center gap-2 shrink-0">
                                 <button 
                                   onClick={() => handlePreview(attachmentUrl)}
                                   className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold transition-all"
                                 >
                                   <Eye className="w-3.5 h-3.5" /> Quick Preview
                                 </button>
                                 <a 
                                   href={attachmentUrl} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-2xl transition-all"
                                   title="Open in new tab"
                                 >
                                   <ExternalLink className="w-4 h-4" />
                                 </a>
                               </div>
                             </div>
                           )}

                           {/* Action Footer inside expanded area */}
                           {(request.status || '').toLowerCase() === 'pending' && (
                             <div className="flex items-center justify-end gap-3 pt-4">
                               <button 
                                 onClick={() => handleAction(request.id, 'REJECTED')}
                                 className="px-6 py-2.5 bg-white border-2 border-rose-100 text-rose-600 hover:bg-red-50 rounded-2xl font-bold text-sm transition-all flex items-center gap-2"
                               >
                                 <XCircle className="w-4 h-4" /> Reject
                               </button>
                               <button 
                                 onClick={() => handleAction(request.id, 'APPROVED')}
                                 className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                               >
                                 <CheckCircle2 className="w-4 h-4" /> Approve Leave
                               </button>
                             </div>
                           )}

                           {((request.status || '').toLowerCase() === 'approved' || (request.status || '').toLowerCase() === 'rejected') && (
                             <div className="flex items-center justify-end gap-3 pt-4">
                               <div className={cn(
                                 "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest",
                                 (request.status || '').toLowerCase() === 'approved' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                               )}>
                                 {(request.status || '').toLowerCase() === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                 Already {request.status}
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-center gap-4 pt-4">
        <button className="p-2 border border-slate-200 rounded-2xl hover:bg-white disabled:opacity-50" disabled>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-slate-500">Page 1 of 1</span>
        <button className="p-2 border border-slate-200 rounded-2xl hover:bg-white disabled:opacity-50" disabled>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

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
                className="p-2 hover:bg-slate-100 rounded-2xl transition-colors"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">To</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wider text-center">Output Format</p>
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
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                        exportFormat === format.id 
                          ? "border-indigo-600 bg-indigo-50 shadow-sm" 
                          : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      <div className={cn("p-2 rounded-2xl", format.bg, format.color)}>
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
                className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-2xl transition-all order-2 sm:order-1"
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
                  "flex-1 py-3 text-sm font-bold text-white rounded-2xl shadow-lg transition-all active:scale-95 order-1 sm:order-2",
                  exportFormat 
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20" 
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
