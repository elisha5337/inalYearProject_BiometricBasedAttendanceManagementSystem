import { useEffect, useMemo, useState } from 'react';
import { Users, UserCheck, Clock, ClipboardList, AlertTriangle, ArrowUpRight, TrendingUp } from 'lucide-react';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import type { HrAttendanceRecord } from '../../lib/hrAttendance';
import { fetchAttendanceRecordsForRange } from '../../lib/hrAttendance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiRequest } from '../../lib/api';
import { fetchDevices, fetchNotifications, formatRelativeTime, type DeviceRecord } from '../../lib/admin';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useLanguage } from '../../lib/translations';

function toISODate(d: Date) { return d.toISOString().slice(0, 10); }
function formatTimeForDisplay(v: string) { const p = new Date(v); return isNaN(p.getTime()) ? v : p.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function formatHHMM(m: number) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
function computeLateDelta(t: number, y: number) { const d = t - y; return d === 0 ? '+0' : d > 0 ? `+${d}` : `${d}`; }

export default function HRDashboard({ user }: { user: User }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<{ totalEmployees: number; presentToday: number; pendingLeaves: number; activeShifts: number } | null>(null);
  const [chartData, setChartData] = useState<{ name: string; onTime: number; late: number }[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<{ id: number; employeeName: string; department: string; time: string; method: string; status: 'on-time' | 'late' }[]>([]);
  const [alerts, setAlerts] = useState<{ title: string; message: string; type: string; time: string | null }[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [lateDeltaText, setLateDeltaText] = useState('+0');
  const todayKey = useMemo(() => toISODate(new Date()), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true); setError(null);
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const [statsRes, todayRows, yesterdayRows, devicesRes, notificationsRes] = await Promise.all([
          apiRequest<{ success: boolean; stats: { totalEmployees: number; presentToday: number; pendingLeaves: number; activeShifts: number } }>('/api/attendance/dashboard-stats/'),
          fetchAttendanceRecordsForRange(todayKey, todayKey),
          fetchAttendanceRecordsForRange(toISODate(yesterday), toISODate(yesterday)),
          fetchDevices().catch(() => [] as DeviceRecord[]),
          fetchNotifications().catch(() => []),
        ]);
        if (cancelled) return;

        const stats = statsRes?.stats ?? null;
        setDashboardStats(stats);
        setDevices(devicesRes);

        const todayLate = (todayRows ?? []).filter(r => String(r.status).toLowerCase().includes('late')).length;
        const yestLate  = (yesterdayRows ?? []).filter(r => String(r.status).toLowerCase().includes('late')).length;
        setLateDeltaText(computeLateDelta(todayLate, yestLate));

        // Chart buckets
        const buckets = new Map<number, { start: number; onTime: number; late: number }>();
        (todayRows ?? []).forEach((row: HrAttendanceRecord) => {
          if (!row.checkInTime) return;
          const p = new Date(row.checkInTime);
          if (isNaN(p.getTime())) return;
          const mins = p.getHours() * 60 + p.getMinutes();
          const bs = Math.floor(mins / 15) * 15;
          const b = buckets.get(bs) ?? { start: bs, onTime: 0, late: 0 };
          String(row.status).toLowerCase().includes('late') ? b.late++ : b.onTime++;
          buckets.set(bs, b);
        });
        const sorted = Array.from(buckets.values()).sort((a, b) => a.start - b.start);
        const capped = sorted.length > 12 ? sorted.slice(0, 11) : sorted;
        if (sorted.length > 12) {
          const rest = sorted.slice(11);
          capped.push({ start: -1, onTime: rest.reduce((s, b) => s + b.onTime, 0), late: rest.reduce((s, b) => s + b.late, 0) });
        }
        setChartData(capped.map(b => ({ name: b.start === -1 ? 'Other' : formatHHMM(b.start), onTime: b.onTime, late: b.late })));

        // Recent check-ins
        setRecentCheckIns(
          (todayRows ?? []).filter(r => Boolean(r.checkInTime)).sort((a, b) => new Date(b.checkInTime!).getTime() - new Date(a.checkInTime!).getTime()).slice(0, 5)
            .map((r, i) => {
              const late = String(r.status).toLowerCase().includes('late');
              return { id: i, employeeName: r.employeeName, department: r.department, time: r.checkInTime ? formatTimeForDisplay(r.checkInTime) : '--:--', method: r.method ?? (late ? 'Face ID' : 'Biometric'), status: late ? 'late' : 'on-time' };
            })
        );

        // Alerts
        const offline = (devicesRes ?? []).filter(d => d.status !== 'online')[0];
        const notifs = (notificationsRes ?? []).sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()).slice(0, 5)
          .map(n => ({ title: n.title, message: n.message, type: n.type, time: formatRelativeTime(n.timestamp ?? null) }));
        const items: typeof notifs = [];
        if (offline) items.push({ title: 'Device Offline', message: `${offline.name} is currently ${offline.status}.`, type: offline.status === 'maintenance' ? 'warning' : 'error', time: formatRelativeTime(offline.lastSync ?? null) });
        for (const n of notifs) { if (items.length >= 3) break; items.push(n); }
        while (items.length < 3) items.push({ title: 'No new alerts', message: 'Your system looks healthy right now.', type: 'success', time: null });
        setAlerts(items.slice(0, 3));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load HR dashboard data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [todayKey]);

  const offlineCount  = devices.filter(d => d.status !== 'online').length;
  const lateToday     = chartData.reduce((s, b) => s + b.late, 0);
  const presentPct    = dashboardStats && dashboardStats.totalEmployees > 0 ? Math.round((dashboardStats.presentToday / dashboardStats.totalEmployees) * 100) : 0;

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
          <h1 className="text-page-title">{t('HR Overview')}</h1>
          <p className="text-page-sub">{t('Real-time workforce metrics and pending actions')}</p>
        </div>
        <div className="text-right">
          <p className="text-body">{t('System Status')}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={cn('w-2 h-2 rounded-full', offlineCount === 0 ? 'bg-emerald-500' : 'bg-rose-500')} />
            <span className="text-sm font-bold text-surface-text uppercase">
              {offlineCount === 0 ? t('All Devices Online') : `${offlineCount} Devices Offline`}
            </span>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</div>}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/hr/employees" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center icon-brand transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-surface-muted">Total</span>
          </div>
          <div className="mt-4">
            <p className="text-body">{t('Total Employees')}</p>
            <h3 className="text-value">{dashboardStats?.totalEmployees.toLocaleString() ?? 0}</h3>
          </div>
        </Link>

        <Link to="/hr/attendance" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center icon-green transition-colors">
              <UserCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />{presentPct}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-body">{t('Present Today')}</p>
            <h3 className="text-value">{dashboardStats?.presentToday.toLocaleString() ?? 0}</h3>
          </div>
        </Link>

        <Link to="/hr/attendance" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center icon-amber transition-colors">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />{lateDeltaText}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-body">{t('Late Arrivals')}</p>
            <h3 className="text-value">{lateToday.toLocaleString()}</h3>
          </div>
        </Link>

        <Link to="/hr/leave" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center icon-purple transition-colors">
              <ClipboardList className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-purple-400">Pending</span>
          </div>
          <div className="mt-4">
            <p className="text-body">Leave Requests</p>
            <h3 className="text-value">{dashboardStats?.pendingLeaves.toLocaleString() ?? 0}</h3>
          </div>
        </Link>
      </div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 professional-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-card-title">Check-in Distribution</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0073CE' }} />
                <span className="text-xs text-surface-muted">On Time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-400 rounded-full" />
                <span className="text-xs text-surface-muted">Late</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartTickColor, fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTickColor, fontSize: 12 }} />
                <Tooltip cursor={{ fill: cursorFill }} contentStyle={tooltipStyle} />
                <Bar dataKey="onTime" fill="#0073CE" stackId="s" radius={[4, 4, 0, 0]} barSize={50} />
                <Bar dataKey="late"   fill="#f59e0b" stackId="s" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="professional-card flex flex-col">
          <div className="p-6 border-b border-surface-divider">
            <h3 className="text-card-title">Alerts & Notifications</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {alerts.map((a, i) => {
              const iconBg = a.type === 'error' ? 'bg-rose-500/15 text-rose-400'
                : a.type === 'warning' ? 'bg-amber-500/15 text-amber-400'
                : a.type === 'success' ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-blue-500/15 text-blue-400';
              const Icon = a.type === 'error' || a.type === 'warning' ? AlertTriangle : ClipboardList;
              return (
                <div key={i} className="flex gap-4">
                  <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0', iconBg)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-surface-text">{a.title}</p>
                    <p className="text-xs text-surface-muted mt-0.5">{a.message}</p>
                    {a.time && <span className="text-[10px] text-surface-muted mt-1 block">{a.time}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-4 border-t border-surface-divider bg-surface-thead">
            <Link to="/admin/notifications" className="w-full py-2 text-sm font-bold flex items-center justify-center rounded-2xl hover:bg-surface-hover transition-colors" style={{ color: '#0073CE' }}>
              View All Notifications
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Check-ins Table */}
      <div className="professional-card">
        <div className="p-6 border-b border-surface-divider flex items-center justify-between">
          <h3 className="text-card-title">Recent Check-ins</h3>
          <Link to="/hr/attendance" className="text-link">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left theme-table">
            <thead>
              <tr className="border-b border-surface-border" style={{ backgroundColor: 'var(--surface-thead)' }}>
                <th>Employee</th>
                <th>Department</th>
                <th>Time</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentCheckIns.map(row => (
                <tr key={row.id} className="border-b border-surface-divider hover:bg-surface-hover transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold icon-brand shrink-0">
                        {row.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-surface-text">{row.employeeName}</span>
                    </div>
                  </td>
                  <td className="text-surface-muted">{row.department}</td>
                  <td className="font-mono text-surface-muted">{row.time}</td>
                  <td className="text-surface-muted">{row.method}</td>
                  <td>
                    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      row.status === 'on-time' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
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
