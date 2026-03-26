import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  User, 
  Building2, 
  Mail, 
  Phone,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Plus,
  X,
  ArrowLeft,
  FileText,
  Table as TableIcon,
  FileSpreadsheet,
  RefreshCw,
  Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

const employees = [
  { _id: '1', firstName: 'Elsaye', lastName: 'Arba', departmentId: 'Computer Science', email: 'elsaye@hu.edu.et', status: 'Active', position: 'Software Engineer', employmentType: 'Full-time', hireDate: '2023-01-15' },
  { _id: '2', firstName: 'Destaye', lastName: 'Andegna', departmentId: 'Informatics', email: 'destaye@hu.edu.et', status: 'Active', position: 'System Analyst', employmentType: 'Full-time', hireDate: '2023-02-20' },
  { _id: '3', firstName: 'Biruk', lastName: 'Bedilu', departmentId: 'Engineering', email: 'biruk@hu.edu.et', status: 'Active', position: 'Hardware Specialist', employmentType: 'Full-time', hireDate: '2023-03-10' },
  { _id: '4', firstName: 'Kaleb', lastName: 'Wondimu', departmentId: 'Computer Science', email: 'kaleb@hu.edu.et', status: 'Suspended', position: 'Junior Developer', employmentType: 'Part-time', hireDate: '2023-04-05' },
  { _id: '5', firstName: 'Adan', lastName: 'Mohamed', departmentId: 'Informatics', email: 'adan@hu.edu.et', status: 'Active', position: 'Network Admin', employmentType: 'Contract', hireDate: '2023-05-12' },
  { _id: '6', firstName: 'Sarah', lastName: 'Tekle', departmentId: 'Admin', email: 'sarah@hu.edu.et', status: 'Active', position: 'HR Officer', employmentType: 'Full-time', hireDate: '2022-11-20' },
];

export default function ManageEmployees() {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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
            <h1 className="text-2xl font-bold text-slate-900">Employee Directory</h1>
            <p className="text-slate-500">View and browse all registered HU-IOT employees</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            className="secondary-button p-2.5"
            title="Refresh Directory"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </button>
          <button 
            onClick={() => setShowExportModal(true)}
            className="secondary-button gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export List</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="professional-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name, email or department..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "secondary-button gap-2 transition-all",
                showFilters && "bg-blue-50 border-blue-200 text-blue-600"
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
          
          <div className="flex gap-2">
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Total: 1,248</span>
          </div>
        </div>

        {showFilters && (
          <div className="professional-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-200">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Departments</option>
                <option>Computer Science</option>
                <option>Informatics</option>
                <option>Engineering</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Status</option>
                <option>Active</option>
                <option>Suspended</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Employment Type</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Types</option>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp) => (
          <div key={emp._id} className="professional-card group hover:shadow-md transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 text-xl font-bold">
                  {emp.firstName.charAt(0)}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                    emp.status === 'Active' ? "bg-green-100 text-green-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {emp.status}
                  </span>
                  <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{emp.firstName} {emp.lastName}</h3>
              <p className="text-sm text-slate-500 font-medium mb-4">{emp.position}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-xs">{emp.departmentId}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-xs truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs">{emp.employmentType} • Hired {emp.hireDate}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <button className="w-full py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" />
                  View Full Profile
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-slate-500">Showing 6 of 1,248 employees</p>
        <div className="flex gap-2">
          <button className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50" disabled>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-2 border border-slate-200 rounded-lg hover:bg-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Export List Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Export Employee List</h2>
                <p className="text-sm text-slate-500">Choose your preferred file format</p>
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
                  alert(`Exporting employee list as ${exportFormat.toUpperCase()}`);
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
                Download File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
