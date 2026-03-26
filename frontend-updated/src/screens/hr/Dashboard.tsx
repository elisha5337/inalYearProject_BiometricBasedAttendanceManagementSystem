import { 
  Users, 
  UserCheck, 
  UserMinus, 
  Clock, 
  ClipboardList, 
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  MoreVertical
} from 'lucide-react';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const attendanceStats = [
  { name: '08:00', count: 45 },
  { name: '08:15', count: 120 },
  { name: '08:30', count: 85 },
  { name: '08:45', count: 30 },
  { name: '09:00', count: 15 },
];

export default function HRDashboard({ user }: { user: User }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">HR Overview</h1>
          <p className="text-slate-500 mt-1">Real-time workforce metrics and pending actions</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-500">System Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-bold text-slate-900 uppercase">All Devices Online</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/hr/employees" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400">Total</span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Total Employees</p>
            <h3 className="text-2xl font-bold text-slate-900">1,248</h3>
          </div>
        </Link>

        <Link to="/hr/attendance" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <UserCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              92%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Present Today</p>
            <h3 className="text-2xl font-bold text-slate-900">1,152</h3>
          </div>
        </Link>

        <Link to="/hr/attendance" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-red-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +12
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Late Arrivals</p>
            <h3 className="text-2xl font-bold text-slate-900">42</h3>
          </div>
        </Link>

        <Link to="/hr/leave" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <ClipboardList className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-purple-600">Pending</span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Leave Requests</p>
            <h3 className="text-2xl font-bold text-slate-900">18</h3>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Check-in Distribution */}
        <div className="lg:col-span-2 professional-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Check-in Distribution</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-xs text-slate-500">On Time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                <span className="text-xs text-slate-500">Late</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notifications & Alerts */}
        <div className="professional-card flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Alerts & Notifications</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Device Offline</p>
                <p className="text-xs text-slate-500 mt-0.5">Terminal HU-IOT-TERM-004 is unreachable.</p>
                <span className="text-[10px] text-slate-400 mt-2 block">2 minutes ago</span>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">New Leave Request</p>
                <p className="text-xs text-slate-500 mt-0.5">Biruk Bedilu submitted an Annual Leave request.</p>
                <span className="text-[10px] text-slate-400 mt-2 block">15 minutes ago</span>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Shift Update</p>
                <p className="text-xs text-slate-500 mt-0.5">Night shift assignments for next week are pending.</p>
                <span className="text-[10px] text-slate-400 mt-2 block">1 hour ago</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <Link to="/admin/notifications" className="w-full py-2 text-sm font-bold text-blue-600 hover:bg-white rounded-lg transition-colors flex items-center justify-center">
              View All Notifications
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Check-ins */}
      <div className="professional-card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Recent Check-ins</h3>
          <Link to="/hr/attendance" className="text-sm font-bold text-blue-600 hover:underline">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { name: 'Elsaye Arba', dept: 'Computer Science', time: '08:42 AM', method: 'Fingerprint', status: 'on-time' },
                { name: 'Destaye Andegna', dept: 'Informatics', time: '08:45 AM', method: 'Face ID', status: 'on-time' },
                { name: 'Biruk Bedilu', dept: 'Engineering', time: '08:55 AM', method: 'Fingerprint', status: 'late' },
                { name: 'Kaleb Wondimu', dept: 'Computer Science', time: '08:30 AM', method: 'Manual ID', status: 'on-time' },
                { name: 'Adan Mohamed', dept: 'Informatics', time: '09:15 AM', method: 'Face ID', status: 'late' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                        {row.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.dept}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{row.time}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{row.method}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      row.status === 'on-time' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
