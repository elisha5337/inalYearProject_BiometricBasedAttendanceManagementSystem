import { useState } from 'react';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  Clock, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  FileText as FilePdf
} from 'lucide-react';
import { cn } from '../../lib/utils';

const reportTypes = [
  { id: '1', title: 'Monthly Attendance', desc: 'Complete log of all employee check-ins and check-outs for the month.', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
  { id: '2', title: 'Overtime Report', desc: 'Analysis of employees working beyond their scheduled shift hours.', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  { id: '3', title: 'Leave Summary', desc: 'Overview of approved, pending, and rejected leave requests.', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
  { id: '4', title: 'Tardiness Analysis', desc: 'Detailed report on late arrivals and early departures by department.', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
];

export default function GenerateReports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Generate Reports</h1>
        <p className="text-slate-500">Create and export detailed analytical reports for HR management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Report Types */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map((report) => (
              <button 
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={cn(
                  "professional-card p-6 text-left transition-all group",
                  selectedReport === report.id ? "ring-2 ring-blue-600 border-transparent shadow-lg" : "hover:border-blue-200"
                )}
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors", report.bg, report.color)}>
                  <report.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{report.title}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{report.desc}</p>
                <div className="mt-6 flex items-center text-xs font-bold text-blue-600 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  Select Report
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-6">
          <div className="professional-card p-8 space-y-8">
            <h3 className="text-lg font-bold text-slate-900">Report Configuration</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Date Range</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Current Month</option>
                  <option>Last Month</option>
                  <option>Last 3 Months</option>
                  <option>Custom Range</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Department</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  <option>All Departments</option>
                  <option>Computer Science</option>
                  <option>Informatics</option>
                  <option>Engineering</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Output Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <FilePdf className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-slate-700">PDF</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-slate-700">Excel</span>
                  </button>
                </div>
              </div>
            </div>

            <button 
              disabled={!selectedReport}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              GENERATE REPORT
            </button>
          </div>

          <div className="professional-card p-6 bg-slate-900 text-white">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Quick Stats
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Reports Generated</span>
                <span className="text-sm font-bold">142</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Last Generated</span>
                <span className="text-sm font-bold">Today, 10:15 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
