import { useEffect, useMemo, useState } from 'react';
import { Clock, Calendar, AlertCircle, FileText, TrendingUp, ArrowUpRight } from 'lucide-react';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  buildDailyAttendanceRows, buildRecentAttendanceActivity, buildWeeklyActivity,
  fetchDashboardStats, fetchMyAttendanceHistory, type EmployeeDashboardStats,
} from '../../lib/attendance';
import { fetchMyLeaveRequests, type LeaveSummary } from '../../lib/leave';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useLanguage } from '../../lib/translations';

export default function EmployeeDashboard({ user }: { user: User }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<EmployeeDashboardStats | null>(null);
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ name: string; hours: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ id: string; date: string; time: string; type: string; status: string }[]>([]);
  const [todayHours, setTodayHours] = useState('00h 00m');
  const [currentlyCheckedIn, setCurrentlyCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const [statsRes, historyRes, leaveRes] = await Promise.all([
          fetchDashboardStats(), fetchMyAttendanceHistory(), fetchMyLeaveRequests(),
        ]);
        if (!active) return;
        const dailyRows = buildDailyAttendanceRows(historyRes.records);
        const todayKey = new Date().toISOString().slice(0, 10);
        const todayRow = dailyRows.find(r => r.rawDate === todayKey);
        setStats(statsRes.stats);
        setLeaveSummary(leaveRes.summary);
        setWeeklyData(buildWeeklyActivity(historyRes.records));
        setRecentActivity(buildRecentAttendanceActivity(historyRes.records));
        setTodayHours(todayRow?.total || '00h 00m');
        setCurrentlyCheckedIn(Boolean(todayRow && todayRow.checkIn !== '--:--' && todayRow.checkOut === '--:--'));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load dashboard data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  const firstName = useMemo(() => user.name?.split(' ')[0] || user.firstName || user.username, [user]);

  const chartGridColor = '#f1f5f9';
  const chartTickColor = '#94a3b8';
  const tooltipStyle   = { borderRadius: '12px', border: 'none', backgroundColor: '#fff', color: '#0F172A', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' };
  const cursorFill     = '#f8fafc';

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-surface-accent rounded animate-pulse" />
            <div className="h-4 w-96 bg-surface-accent rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SkeletonLoader type="card" className="lg:col-span-2 h-[380px]" />
          <SkeletonLoader type="card" className="h-[380px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title">{t('Welcome back,')} {firstName}!</h1>
          <p className="text-page-sub">
            {t('Attendance summary for')} {new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}.
          </p>
        </div>
        <div className={cn(
          'px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 self-start',
          currentlyCheckedIn ? 'bg-emerald-500/15 text-emerald-500' : 'bg-surface-accent text-surface-muted'
        )}>
          <div className={cn('w-2 h-2 rounded-full', currentlyCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-surface-muted')} />
          {currentlyCheckedIn ? t('Currently Checked In') : t('Awaiting Check-in')}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center icon-brand">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live
            </span>
          </div>
          <div className="mt-4">
            <p className="text-body">{t("Today's Hours")}</p>
            <h3 className="text-value">{todayHours}</h3>
          </div>
        </div>

        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center icon-green">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-surface-muted">{stats?.month_name || 'This Month'}</span>
          </div>
          <div className="mt-4">
            <p className="text-body">{t('Days Present')}</p>
            <h3 className="text-value">{stats?.present_days ?? 0} Days</h3>
          </div>
        </div>

        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center icon-amber">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />{stats?.late_count ?? 0}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-body">{t('Late Arrivals')}</p>
            <h3 className="text-value">{stats?.late_count ?? 0}</h3>
          </div>
        </div>

        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center icon-purple">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-surface-muted">Available</span>
          </div>
          <div className="mt-4">
            <p className="text-body">{t('Leave Balance')}</p>
            <h3 className="text-value">{leaveSummary?.annual_left ?? 0} Days</h3>
          </div>
        </div>
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 professional-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-card-title">{t('Weekly Activity')}</h3>
            <select className="text-sm bg-surface-bg border border-surface-border rounded-2xl px-3 py-1 outline-none font-medium text-surface-muted">
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartTickColor, fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTickColor, fontSize: 12 }} />
                <Tooltip cursor={{ fill: cursorFill }} contentStyle={tooltipStyle} />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} barSize={40}>
                  {weeklyData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.hours < 7 ? '#94a3b8' : '#0073CE'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="professional-card p-8">
          <h3 className="text-card-title mb-6">{t('Recent Activity')}</h3>
          <div className="space-y-5">
            {recentActivity.length > 0 ? recentActivity.map(item => (
              <div key={item.id} className="flex items-start gap-4">
                <div className={cn('w-2 h-2 rounded-full mt-2 shrink-0', item.type === 'Check-in' ? 'bg-brand' : 'bg-surface-muted')}
                  style={item.type === 'Check-in' ? { backgroundColor: '#0073CE' } : undefined} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-surface-text">{item.type}</p>
                    <span className="text-xs text-surface-muted">{item.date}</span>
                  </div>
                  <p className="text-xs text-surface-muted mt-0.5">{item.time}</p>
                </div>
                <div className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                  item.status === 'on-time' ? 'bg-emerald-500/15 text-emerald-500'
                    : item.status === 'late' ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-blue-500/15 text-blue-400'
                )}>
                  {item.status}
                </div>
              </div>
            )) : (
              <p className="text-body">No attendance activity recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
