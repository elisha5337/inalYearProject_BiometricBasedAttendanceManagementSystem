import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  Fingerprint,
  Cpu,
  History,
  Settings,
  Activity,
  AlertTriangle,
  Server,
  Database,
  ArrowRight,
} from 'lucide-react';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ApiError } from '../../lib/api';
import { fetchDashboardOverview, formatRelativeTime, type DashboardOverview } from '../../lib/admin';

const emptyOverview: DashboardOverview = {
  stats: {
    totalEmployees: 0,
    activeEmployees: 0,
    suspendedEmployees: 0,
    faceEnrolled: 0,
  },
  health: {
    dbStatus: 'UNKNOWN',
    apiLatency: 'N/A',
    activeTerminals: '00 ACTIVE',
    uptime: '0m 0s',
    lastSync: null,
  },
  recentAuditLogs: [],
  authLoad: [{ time: 'Now', load: 0 }],
  devicesOnlineText: '0 / 0 Online',
};

export default function AdminDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<DashboardOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchDashboardOverview();
        if (!cancelled) {
          setOverview(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load system administration metrics right now.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const healthCards = [
    {
      label: 'Main Server',
      value: overview.health.dbStatus === 'ERROR' ? 'Attention Needed' : 'Operational',
      extra: overview.health.uptime,
      icon: Server,
      accent:
        overview.health.dbStatus === 'ERROR'
          ? 'bg-red-500/20 text-red-400'
          : 'bg-green-500/20 text-green-500',
      rightIcon:
        overview.health.dbStatus === 'ERROR' ? (
          <AlertTriangle className="w-5 h-5 text-red-400" />
        ) : (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        ),
    },
    {
      label: 'Database',
      value: overview.health.dbStatus === 'ERROR' ? 'Disconnected' : 'Connected',
      extra: overview.health.apiLatency,
      icon: Database,
      accent: 'bg-blue-500/20 text-blue-500',
    },
    {
      label: 'Biometric Nodes',
      value: overview.devicesOnlineText,
      extra: overview.health.activeTerminals,
      icon: Cpu,
      accent: 'bg-amber-500/20 text-amber-500',
      rightIcon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Administration</h1>
          <p className="text-slate-500 mt-1">
            Global system health, security monitoring and configuration
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/audit" className="secondary-button gap-2">
            <History className="w-4 h-4" />
            System Logs
          </Link>
          <Link to="/admin/policies" className="primary-button gap-2">
            <Settings className="w-4 h-4" />
            Global Settings
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {healthCards.map((card) => (
          <div key={card.label} className="professional-card p-6 bg-slate-900 text-white">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  card.accent,
                )}
              >
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  {card.label}
                </p>
                <h3 className="text-lg font-bold">{loading ? 'Loading...' : card.value}</h3>
              </div>
              <div className="ml-auto text-xs font-mono text-slate-500">
                {loading ? '--' : card.extra}
              </div>
              {card.rightIcon ? <div className="ml-2">{card.rightIcon}</div> : null}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 professional-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Authentication Load
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Real-time Traffic
            </span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.authLoad}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="load"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorLoad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Administrative Tasks</h3>
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: 'Manage Users', icon: Users, color: 'bg-blue-50 text-blue-600', path: '/admin/users' },
              { label: 'Enroll Biometrics', icon: Fingerprint, color: 'bg-purple-50 text-purple-600', path: '/admin/enroll' },
              { label: 'Configure Devices', icon: Cpu, color: 'bg-amber-50 text-amber-600', path: '/admin/devices' },
              { label: 'Security Policies', icon: ShieldCheck, color: 'bg-green-50 text-green-600', path: '/admin/policies' },
            ].map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className="professional-card p-4 flex items-center gap-4 hover:border-blue-200 transition-all group"
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-colors', action.color)}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">
                  {action.label}
                </span>
                <ArrowRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="professional-card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Recent Audit Events</h3>
          <Link to="/admin/audit" className="text-sm font-bold text-blue-600 hover:underline">
            View Full Log
          </Link>
        </div>
        <div className="p-6 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading recent audit events...</p>
          ) : overview.recentAuditLogs.length === 0 ? (
            <p className="text-sm text-slate-500">No audit events are available yet.</p>
          ) : (
            overview.recentAuditLogs.slice(0, 3).map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-slate-900">{log.action}</p>
                    <span className="text-xs text-slate-400 font-mono">{log.ip}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{log.details}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {log.user}
                    </span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className="text-[10px] text-slate-400">{formatRelativeTime(log.time)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
