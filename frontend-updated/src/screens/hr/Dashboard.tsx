import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserCheck,
  UserMinus,
  Clock,
  ClipboardList,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  MoreVertical,
} from 'lucide-react';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import type { HrAttendanceRecord } from '../../lib/hrAttendance';
import { fetchAttendanceRecordsForRange } from '../../lib/hrAttendance';
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

import { apiRequest } from '../../lib/api';
import { fetchDevices, fetchNotifications, formatRelativeTime, type DeviceRecord } from '../../lib/admin';

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatTimeForDisplay(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatHHMMFromMinutes(startMinutes: number) {
  const hh = String(Math.floor(startMinutes / 60)).padStart(2, '0');
  const mm = String(startMinutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function computeLateDelta(todayLate: number, yesterdayLate: number) {
  const diff = todayLate - yesterdayLate;
  if (diff === 0) return '+0';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

export default function HRDashboard({ user }: { user: User }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboardStats, setDashboardStats] = useState<{
    totalEmployees: number;
    presentToday: number;
    pendingLeaves: number;
    activeShifts: number;
  } | null>(null);

  const [chartData, setChartData] = useState<Array<{ name: string; onTime: number; late: number }>>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<
    Array<{ id: number; employeeName: string; department: string; time: string; method: string; status: 'on-time' | 'late' }>
  >([]);
  const [alerts, setAlerts] = useState<
    Array<{ title: string; message: string; type: 'info' | 'warning' | 'success' | 'error'; time: string | null }>
  >([]);

  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [lateDeltaText, setLateDeltaText] = useState<string>('+0');

  const todayKey = useMemo(() => toISODate(new Date()), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = toISODate(yesterday);

        const [statsRes, todayRows, yesterdayRows, devicesRes, notificationsRes] = await Promise.all([
          apiRequest<{ success: boolean; stats: { totalEmployees: number; presentToday: number; pendingLeaves: number; activeShifts: number } }>(
            '/api/attendance/dashboard-stats/',
          ),
          fetchAttendanceRecordsForRange(todayKey, todayKey),
          fetchAttendanceRecordsForRange(yesterdayKey, yesterdayKey),
          fetchDevices().catch(() => [] as DeviceRecord[]),
          fetchNotifications().catch(() => []),
        ]);

        if (cancelled) return;

        const stats = statsRes?.stats ?? null;
        setDashboardStats(stats);
        setDevices(devicesRes);

        const todayLate = (todayRows ?? []).filter((r) => String(r.status).toLowerCase().includes('late')).length;
        const yesterdayLate = (yesterdayRows ?? []).filter((r) => String(r.status).toLowerCase().includes('late')).length;
        setLateDeltaText(computeLateDelta(todayLate, yesterdayLate));

        const percentPresent =
          stats && stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0;
        // present percent is derived inside render using dashboardStats; delta derived here.

        // Chart buckets for check-in distribution (15-minute buckets)
        const bucketSizeMinutes = 15;
        const buckets = new Map<number, { start: number; onTime: number; late: number }>();

        (todayRows ?? []).forEach((row: HrAttendanceRecord) => {
          if (!row.checkInTime) return;

          const parsed = new Date(row.checkInTime);
          if (Number.isNaN(parsed.getTime())) return;

          const minutes = parsed.getHours() * 60 + parsed.getMinutes();
          const bucketStart = Math.floor(minutes / bucketSizeMinutes) * bucketSizeMinutes;
          const bucket = buckets.get(bucketStart) ?? { start: bucketStart, onTime: 0, late: 0 };

          const statusLower = String(row.status).toLowerCase();
          const isLate = statusLower.includes('late');

          if (isLate) {
            bucket.late += 1;
          } else {
            bucket.onTime += 1;
          }

          buckets.set(bucketStart, bucket);
        });

        const sortedBuckets = Array.from(buckets.values()).sort((a, b) => a.start - b.start);
        const cappedBuckets = sortedBuckets.length > 12 ? [...sortedBuckets.slice(0, 11)] : sortedBuckets;
        if (sortedBuckets.length > 12) {
          const other = sortedBuckets.slice(11);
          const otherOnTime = other.reduce((sum, b) => sum + b.onTime, 0);
          const otherLate = other.reduce((sum, b) => sum + b.late, 0);
          cappedBuckets.push({ start: -1, onTime: otherOnTime, late: otherLate });
        }

        setChartData(
          cappedBuckets.map((b) => ({
            name: b.start === -1 ? 'Other' : formatHHMMFromMinutes(b.start),
            onTime: b.onTime,
            late: b.late,
          })),
        );

        // Recent check-ins: top 5 by check-in time for today
        const recent = (todayRows ?? [])
          .filter((r) => Boolean(r.checkInTime))
          .slice()
          .sort((a, b) => {
            const at = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
            const bt = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
            return bt - at;
          })
          .slice(0, 5)
          .map((r, idx) => {
            const statusLower = String(r.status).toLowerCase();
            const badgeStatus: 'on-time' | 'late' = statusLower.includes('late') ? 'late' : 'on-time';
            return {
              id: idx,
              employeeName: r.employeeName,
              department: r.department,
              time: r.checkInTime ? formatTimeForDisplay(r.checkInTime) : '--:--',
              method: r.method ?? (badgeStatus === 'late' ? 'Face ID' : 'Biometric'),
              status: badgeStatus,
            };
          });

        setRecentCheckIns(recent);

        // Alerts: include offline device summary + newest notifications (no mock text)
        const offlineDevices = (devicesRes ?? []).filter((d) => d.status !== 'online');
        const offlineDevice = offlineDevices[0];

        const mappedNotifications = (notificationsRes ?? [])
          .slice()
          .sort((a, b) => {
            const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return bt - at;
          })
          .slice(0, 5)
          .map((n) => ({
            title: n.title,
            message: n.message,
            type: n.type,
            time: formatRelativeTime(n.timestamp ?? null),
          }));

        const items: typeof mappedNotifications = [];

        if (offlineDevice) {
          items.push({
            title: 'Device Offline',
            message: `${offlineDevice.name} is currently ${offlineDevice.status}.`,
            type: offlineDevice.status === 'maintenance' ? 'warning' : 'error',
            time: formatRelativeTime(offlineDevice.lastSync ?? null),
          });
        }

        for (const n of mappedNotifications) {
          if (items.length >= 3) break;
          items.push(n);
        }

        while (items.length < 3) {
          items.push({
            title: 'No new alerts',
            message: 'Your system looks healthy right now.',
            type: 'success',
            time: null,
          });
        }

        setAlerts(items.slice(0, 3));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Unable to load HR dashboard data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [todayKey]);

  const offlineCount = devices.filter((d) => d.status !== 'online').length;
  const lateToday = (chartData ?? []).reduce((sum, b) => sum + b.late, 0);

  const presentPercent =
    dashboardStats && dashboardStats.totalEmployees > 0 ? Math.round((dashboardStats.presentToday / dashboardStats.totalEmployees) * 100) : 0;

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
            <div className={`w-2 h-2 rounded-full ${offlineCount === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            <span className="text-sm font-bold text-slate-900 uppercase">
              {offlineCount === 0 ? 'All Devices Online' : `${offlineCount} Devices Offline`}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/hr/employees" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400">Total</span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Total Employees</p>
            <h3 className="text-2xl font-bold text-slate-900">{dashboardStats?.totalEmployees.toLocaleString() ?? 0}</h3>
          </div>
        </Link>

        <Link to="/hr/attendance" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UserCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {presentPercent}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Present Today</p>
            <h3 className="text-2xl font-bold text-slate-900">{dashboardStats?.presentToday.toLocaleString() ?? 0}</h3>
          </div>
        </Link>

        <Link to="/hr/attendance" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {lateDeltaText}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Late Arrivals</p>
            <h3 className="text-2xl font-bold text-slate-900">{lateToday.toLocaleString()}</h3>
          </div>
        </Link>

        <Link to="/hr/leave" className="professional-card p-6 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <ClipboardList className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-purple-600">Pending</span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Leave Requests</p>
            <h3 className="text-2xl font-bold text-slate-900">{dashboardStats?.pendingLeaves.toLocaleString() ?? 0}</h3>
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
                <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
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
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="onTime" fill="#2563eb" stackId="status" radius={[4, 4, 0, 0]} barSize={50} />
                <Bar dataKey="late" fill="#f59e0b" stackId="status" radius={[4, 4, 0, 0]} barSize={50} />
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
            {alerts.map((a, idx) => {
              const severity = a.type;
              const iconBg =
                severity === 'error'
                  ? 'bg-rose-100 text-rose-600'
                  : severity === 'warning'
                    ? 'bg-amber-100 text-amber-600'
                    : severity === 'success'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-indigo-100 text-indigo-600';

              const icon =
                severity === 'error' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : severity === 'warning' ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <ClipboardList className="w-5 h-5" />
                );

              return (
                <div key={idx} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.message}</p>
                    <span className="text-[10px] text-slate-400 mt-2 block">{a.time ?? ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <Link to="/admin/notifications" className="w-full py-2 text-sm font-bold text-indigo-600 hover:bg-white rounded-2xl transition-colors flex items-center justify-center">
              View All Notifications
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Check-ins */}
      <div className="professional-card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Recent Check-ins</h3>
          <Link to="/hr/attendance" className="text-sm font-bold text-indigo-600 hover:underline">View All</Link>
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
              {recentCheckIns.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {row.employeeName.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{row.employeeName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.department}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{row.time}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{row.method}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      row.status === 'on-time' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
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
