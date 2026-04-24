import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  buildDailyAttendanceRows,
  buildRecentAttendanceActivity,
  buildWeeklyActivity,
  fetchDashboardStats,
  fetchMyAttendanceHistory,
  type EmployeeDashboardStats,
} from '../../lib/attendance';
import { fetchMyLeaveRequests, type LeaveSummary } from '../../lib/leave';

export default function EmployeeDashboard({ user }: { user: User }) {
  const [stats, setStats] = useState<EmployeeDashboardStats | null>(null);
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ name: string; hours: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<
    { id: string; date: string; time: string; type: string; status: string }[]
  >([]);
  const [todayHours, setTodayHours] = useState('00h 00m');
  const [currentlyCheckedIn, setCurrentlyCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [statsResponse, historyResponse, leaveResponse] = await Promise.all([
          fetchDashboardStats(),
          fetchMyAttendanceHistory(),
          fetchMyLeaveRequests(),
        ]);

        if (!active) {
          return;
        }

        const dailyRows = buildDailyAttendanceRows(historyResponse.records);
        const todayKey = new Date().toISOString().slice(0, 10);
        const todayRow = dailyRows.find((row) => row.rawDate === todayKey);

        setStats(statsResponse.stats);
        setLeaveSummary(leaveResponse.summary);
        setWeeklyData(buildWeeklyActivity(historyResponse.records));
        setRecentActivity(buildRecentAttendanceActivity(historyResponse.records));
        setTodayHours(todayRow?.total || '00h 00m');
        setCurrentlyCheckedIn(Boolean(todayRow && todayRow.checkIn !== '--:--' && todayRow.checkOut === '--:--'));
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const firstName = useMemo(
    () => user.name?.split(' ')[0] || user.firstName || user.username,
    [user.firstName, user.name, user.username]
  );

  if (loading) {
    return <div className="py-20 text-center text-slate-500 font-medium">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, {firstName}!</h1>
          <p className="text-slate-500 mt-1">
            Here's your attendance summary for today,{' '}
            {new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}.
          </p>
        </div>
        <div className="flex gap-3">
          <div
            className={cn(
              'px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2',
              currentlyCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            )}
          >
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                currentlyCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              )}
            ></div>
            {currentlyCheckedIn ? 'Currently Checked In' : 'Awaiting Check-in'}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-red-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Live
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Today's Hours</p>
            <h3 className="text-2xl font-bold text-slate-900">{todayHours}</h3>
          </div>
        </div>

        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400">{stats?.month_name || 'This Month'}</span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Days Present</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats?.present_days ?? 0} Days</h3>
          </div>
        </div>

        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {stats?.late_count ?? 0}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Late Arrivals</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats?.late_count ?? 0}</h3>
          </div>
        </div>

        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400">Available</span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Leave Balance</p>
            <h3 className="text-2xl font-bold text-slate-900">{leaveSummary?.annual_left ?? 0} Days</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 professional-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Weekly Activity</h3>
            <select className="text-sm bg-slate-50 border-none rounded-2xl px-3 py-1 outline-none font-medium text-slate-600">
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} barSize={40}>
                  {weeklyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.hours < 7 ? '#94a3b8' : '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="professional-card p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full mt-2 shrink-0',
                      item.type === 'Check-in' ? 'bg-indigo-500' : 'bg-slate-400'
                    )}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-slate-900">{item.type}</p>
                      <span className="text-xs text-slate-400">{item.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{item.time}</p>
                  </div>
                  <div
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                      item.status === 'on-time'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'late'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-indigo-100 text-indigo-700'
                    )}
                  >
                    {item.status}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No attendance activity recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
