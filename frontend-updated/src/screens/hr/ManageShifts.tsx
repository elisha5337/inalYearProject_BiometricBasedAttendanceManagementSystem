import { useState } from 'react';
import { 
  Clock, 
  Plus, 
  Calendar, 
  Users, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  AlertCircle,
  X,
  Clock as ClockIcon,
  ArrowLeft,
  Download,
  FileText,
  Table as TableIcon,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

const shifts = [
  { _id: '1', shiftName: 'Morning Shift', startTime: '08:00 AM', endTime: '04:00 PM', gracePeriod: '15 mins', employeesCount: 450, description: 'Standard morning operational shift.' },
  { _id: '2', shiftName: 'Afternoon Shift', startTime: '04:00 PM', endTime: '12:00 AM', gracePeriod: '15 mins', employeesCount: 320, description: 'Evening operational shift.' },
  { _id: '3', shiftName: 'Night Shift', startTime: '12:00 AM', endTime: '08:00 AM', gracePeriod: '30 mins', employeesCount: 180, description: 'Overnight maintenance and security shift.' },
  { _id: '4', shiftName: 'Weekend Shift', startTime: '09:00 AM', endTime: '05:00 PM', gracePeriod: '15 mins', employeesCount: 120, description: 'Weekend support shift.' },
];

export default function ManageShifts() {
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
            <h1 className="text-2xl font-bold text-slate-900">Shift Management</h1>
            <p className="text-slate-500">Define work schedules and assign employee shifts</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            className="secondary-button p-2.5"
            title="Refresh Shifts"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </button>
          <button 
            onClick={() => setShowExportModal(true)}
            className="secondary-button p-2.5"
            title="Export Shift Data"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="primary-button gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create New Shift</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {shifts.map((shift) => (
          <div key={shift._id} className="professional-card group hover:border-blue-300 transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Clock className="w-6 h-6" />
                </div>
                <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{shift.shiftName}</h3>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Time Range</span>
                  <span className="font-bold text-slate-900">{shift.startTime} - {shift.endTime}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Grace Period</span>
                  <span className="font-bold text-amber-600">{shift.gracePeriod}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Assigned</span>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-900">{shift.employeesCount}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex gap-2">
                <button className="flex-1 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
                  Edit
                </button>
                <button className="flex-1 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors">
                  Assign
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="professional-card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Shift Assignments</h3>
          <div className="flex gap-2">
            <button className="secondary-button py-1.5 text-xs">Calendar View</button>
            <button className="primary-button py-1.5 text-xs">List View</button>
          </div>
        </div>
        <div className="p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">No recent assignments</h4>
            <p className="text-sm text-slate-500 mt-1">Start assigning employees to shifts to see them here.</p>
          </div>
          <button className="text-blue-600 font-bold text-sm hover:underline">Assign Employees Now</button>
        </div>
      </div>

      {/* Create Shift Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Create New Shift</h2>
                <p className="text-sm text-slate-500">Define a new work schedule for employees</p>
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
                <label className="text-sm font-bold text-slate-700">Shift Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Morning Shift, Night Shift..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Start Time</label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="time" 
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">End Time</label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="time" 
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Grace Period (Mins)</label>
                  <input 
                    type="number" 
                    placeholder="15"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Work Days</label>
                  <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option>Mon - Fri</option>
                    <option>Mon - Sat</option>
                    <option>Sat - Sun</option>
                    <option>All Week</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Description (Optional)</label>
                <textarea 
                  rows={2}
                  placeholder="Additional details about this shift..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>
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
                Create Shift
              </button>
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
                <h2 className="text-xl font-bold text-slate-900">Export Shift Data</h2>
                <p className="text-sm text-slate-500">Select your preferred format</p>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6">
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

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all order-2 sm:order-1"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert(`Exporting shift data as ${exportFormat.toUpperCase()}`);
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
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
