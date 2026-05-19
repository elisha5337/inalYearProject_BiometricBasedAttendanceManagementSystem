import { useEffect, useState } from 'react';
import { ShieldCheck, Users, Fingerprint, Cpu, History, Settings, Activity, AlertTriangle, Server, Database, ArrowRight, UserCheck, UserX } from 'lucide-react';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../lib/translations';
import SkeletonLoader from '../../components/SkeletonLoader';
import { ApiError } from '../../lib/api';
import { fetchDashboardOverview, formatRelativeTime, type DashboardOverview } from '../../lib/admin';

const emptyOverview: DashboardOverview = {
  stats: { totalEmployees: 0, activeEmployees: 0, suspendedEmployees: 0, faceEnrolled: 0 },
  health: { dbStatus: 'UNKNOWN', apiLatency: 'N/A', activeTerminals: '00 ACTIVE', uptime: '0m 0s', lastSync: null },
  recentAuditLogs: [],
  authLoad: [{ time: 'Now', load: 0 }],
  devicesOnlineText: '0 / 0 Online',
};

export default function AdminDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [overview, setOverview] = useState<DashboardOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        setLoading(true); setError(null);
        const data = await fetchDashboardOverview();
        if (!cancelled) setOverview(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Unable to load system administration metrics right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDashboard();
    return () => { cancelled = true; };
  }, []);

  const chartGridColor  = '#f1f5f9';
  const chartTickColor  = '#94a3b8';
  const tooltipStyle    = { borderRadius: '12px', border: 'none', backgroundColor: '#fff', color: '#0F172A', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' };

  const healthCards = [
    {
      label: t('Main Server'),
      value: overview.health.dbStatus === 'ERROR' ? 'Attention Needed' : 'Operational',
      extra: overview.health.uptime,
      icon: Server,
      accent: overview.health.dbStatus === 'ERROR' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400',
      rightIcon: overview.health.dbStatus === 'ERROR'
        ? <AlertTriangle className="w-5 h-5 text-rose-400" />
        : <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />,
    },
    { label: t('Database'), value: overview.health.dbStatus === 'ERROR' ? 'Disconnected' : 'Connected', extra: overview.health.apiLatency, icon: Database, accent: 'bg-blue-500/20 text-blue-400' },
    { label: t('Biometric Nodes'), value: overview.devicesOnlineText, extra: overview.health.activeTerminals, icon: Cpu, accent: 'bg-amber-500/20 text-amber-400', rightIcon: <AlertTriangle className="w-5 h-5 text-amber-400" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title">{t('System Administration')}</h1>
          <p className="text-page-sub">{t('Global system health, security monitoring and configuration')}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/audit" className="secondary-button gap-2">
            <History className="w-4 h-4" /> {t('System Logs')}
          </Link>
          <Link to="/admin/policies" className="primary-button gap-2">
            <Settings className="w-4 h-4" /> {t('Global Settings')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-400">{error}</div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t('Total Users'),        value: overview.stats.totalEmployees,   icon: Users,       cls: 'icon-brand' },
          { label: t('Active Accounts'),    value: overview.stats.activeEmployees,  icon: UserCheck,   cls: 'icon-green' },
          { label: t('Suspended'),          value: overview.stats.suspendedEmployees, icon: UserX,     cls: 'icon-rose' },
          { label: t('Bio-Enrolled'),       value: overview.stats.faceEnrolled,     icon: Fingerprint, cls: 'icon-purple' },
        ].map(card => (
          <div key={card.label} className="professional-card p-6">
            <div className="flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', card.cls)}>
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-label">{card.label}</p>
                <h3 className="text-value">
                  {loading ? <div className="h-8 w-16 bg-surface-accent rounded animate-pulse mt-1" /> : card.value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {healthCards.map(card => (
          <div key={card.label} className="professional-card p-6">
            <div className="flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', card.accent)}>
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-label">{card.label}</p>
                <h3 className="text-card-title">
                  {loading ? <div className="h-6 w-24 bg-surface-accent rounded animate-pulse mt-1" /> : card.value}
                </h3>
              </div>
              <div className="ml-auto text-xs font-mono text-surface-muted">
                {loading ? <div className="h-4 w-12 bg-surface-accent rounded animate-pulse" /> : card.extra}
              </div>
              {card.rightIcon && <div className="ml-2">{card.rightIcon}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 professional-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-card-title flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: '#0073CE' }} />
              {t('Authentication Load')}
            </h3>
            <span className="text-xs font-bold text-surface-muted uppercase tracking-widest">{t('Real-time Traffic')}</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.authLoad}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0073CE" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0073CE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: chartTickColor, fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTickColor, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="load" stroke="#0073CE" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-card-title">{t('Administrative Tasks')}</h3>
          {[
            { label: t('Manage Users'),      icon: Users,       cls: 'icon-brand',   path: '/admin/users' },
            { label: t('Enroll Biometrics'), icon: Fingerprint, cls: 'icon-purple',  path: '/admin/enroll' },
            { label: t('Configure Devices'), icon: Cpu,         cls: 'icon-amber',   path: '/admin/devices' },
            { label: t('Security Policies'), icon: ShieldCheck, cls: 'icon-green',   path: '/admin/policies' },
          ].map((action, i) => (
            <button key={i} onClick={() => navigate(action.path)}
              className="professional-card w-full p-4 flex items-center gap-4 hover:border-brand transition-all group">
              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', action.cls)}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-surface-text group-hover:text-brand">{action.label}</span>
              <ArrowRight className="w-4 h-4 ml-auto text-surface-muted group-hover:text-brand group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log */}
      <div className="professional-card">
        <div className="p-6 border-b border-surface-divider flex items-center justify-between">
          <h3 className="text-card-title">{t('Recent Audit Events')}</h3>
          <Link to="/admin/audit" className="text-link">{t('View Full Log')}</Link>
        </div>
        <div className="p-6 space-y-2">
          {loading ? (
            <div className="space-y-4">
              <SkeletonLoader type="text" className="py-2" />
              <SkeletonLoader type="text" className="py-2" />
            </div>
          ) : overview.recentAuditLogs.length === 0 ? (
            <p className="text-body">No audit events are available yet.</p>
          ) : (
            overview.recentAuditLogs.slice(0, 3).map(log => (
              <div key={log.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-surface-hover transition-colors">
                <div className="w-10 h-10 bg-surface-accent rounded-2xl flex items-center justify-center text-surface-muted shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-surface-text">{log.action}</p>
                    <span className="text-xs text-surface-muted font-mono">{log.ip}</span>
                  </div>
                  <p className="text-xs text-surface-muted mt-1">{log.details}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#0073CE' }}>{log.user}</span>
                    <span className="text-[10px] text-surface-muted">·</span>
                    <span className="text-[10px] text-surface-muted">{formatRelativeTime(log.time)}</span>
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
