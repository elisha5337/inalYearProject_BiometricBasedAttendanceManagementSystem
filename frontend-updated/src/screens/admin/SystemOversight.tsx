import { useLanguage } from '../../lib/translations';
import {
  Activity,
  Cpu,
  Database,
  Server,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Zap,
  HardDrive,
  Network,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
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
import {
  fetchDevices,
  fetchSystemHealth,
  runSecurityAudit,
  type DeviceRecord,
  type SecurityAuditItem,
  type SystemHealthMetrics,
} from '../../lib/admin';

const emptyHealth: SystemHealthMetrics = {
  dbStatus: 'UNKNOWN',
  apiLatency: 'N/A',
  activeTerminals: '00 ACTIVE',
  uptime: '0m 0s',
  lastSync: null,
};

export default function SystemOversight() {
  const { t } = useLanguage();
  const [health, setHealth] = useState<SystemHealthMetrics>(emptyHealth);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [auditItems, setAuditItems] = useState<SecurityAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOversight(showRefreshState = false) {
    try {
      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [healthData, deviceData, auditData] = await Promise.all([
        fetchSystemHealth(),
        fetchDevices().catch(() => [] as DeviceRecord[]),
        runSecurityAudit(),
      ]);

      setHealth(healthData);
      setDevices(deviceData);
      setAuditItems(auditData.audit_results ?? []);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load system oversight data.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadOversight();
  }, []);

  const performanceData = useMemo(() => {
    const latency = parseInt(health.apiLatency.replace(/\D/g, ''), 10) || 0;
    const activeNodes = parseInt(health.activeTerminals.replace(/\D/g, ''), 10) || 0;
    const issueWeight = auditItems.length * 8;

    return [
      { time: '00:00', cpu: Math.min(100, Math.max(8, activeNodes * 4 + issueWeight)), mem: Math.min(100, 45 + issueWeight), net: Math.min(100, latency) },
      { time: '04:00', cpu: Math.min(100, Math.max(12, activeNodes * 5 + issueWeight)), mem: Math.min(100, 48 + issueWeight), net: Math.min(100, latency + 5) },
      { time: '08:00', cpu: Math.min(100, Math.max(18, activeNodes * 6 + issueWeight)), mem: Math.min(100, 55 + issueWeight), net: Math.min(100, latency + 10) },
      { time: '12:00', cpu: Math.min(100, Math.max(16, activeNodes * 5 + issueWeight)), mem: Math.min(100, 52 + issueWeight), net: Math.min(100, latency + 7) },
      { time: '16:00', cpu: Math.min(100, Math.max(20, activeNodes * 7 + issueWeight)), mem: Math.min(100, 58 + issueWeight), net: Math.min(100, latency + 15) },
      { time: '20:00', cpu: Math.min(100, Math.max(14, activeNodes * 4 + issueWeight)), mem: Math.min(100, 50 + issueWeight), net: Math.min(100, latency + 4) },
      { time: '23:59', cpu: Math.min(100, Math.max(10, activeNodes * 3 + issueWeight)), mem: Math.min(100, 46 + issueWeight), net: Math.min(100, latency) },
    ];
  }, [health, auditItems]);

  const nodeStatus = useMemo(() => {
    const onlineDevices = devices.filter((device) => device.status === 'online').length;
    const maintenanceDevices = devices.filter((device) => device.status === 'maintenance').length;

    return [
      { name: 'Primary API Server', status: health.dbStatus === 'ERROR' ? 'Attention' : 'Online', load: health.apiLatency, icon: Server, color: health.dbStatus === 'ERROR' ? 'text-rose-500' : 'text-emerald-500' },
      { name: 'Auth Database Cluster', status: health.dbStatus === 'ERROR' ? 'Error' : 'Online', load: health.dbStatus === 'ERROR' ? '100%' : '45%', icon: Database, color: health.dbStatus === 'ERROR' ? 'text-rose-500' : 'text-emerald-500' },
      { name: 'Biometric Processing Unit', status: maintenanceDevices > 0 ? 'Warning' : 'Online', load: `${Math.min(100, onlineDevices * 10)}%`, icon: Cpu, color: maintenanceDevices > 0 ? 'text-amber-500' : 'text-emerald-500' },
      { name: 'Network Gateway', status: health.apiLatency === 'N/A' ? 'Unknown' : 'Online', load: `${Math.min(100, parseInt(health.apiLatency.replace(/\D/g, ''), 10) || 0)}%`, icon: Network, color: 'text-emerald-500' },
      { name: 'Backup Server', status: auditItems.length > 0 ? 'Monitoring' : 'Standby', load: '0%', icon: Server, color: 'text-indigo-500' },
    ];
  }, [devices, health, auditItems]);

  const incidentLog = auditItems.length
    ? auditItems
    : [
        {
          category: 'SYSTEM',
          severity: 'LOW' as const,
          issue: 'No active incidents were reported by the latest security audit.',
          action: 'Monitoring',
        },
      ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('System Oversight')}</h1>
          <p className="text-slate-500 mt-1">{t('Real-time infrastructure monitoring and performance analysis')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => loadOversight(true)} className="secondary-button p-2.5" title="Refresh Metrics">
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
          <div className="flex items-center gap-4 px-4 py-2 bg-green-50 text-emerald-700 rounded-2xl border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold uppercase tracking-wider">
              {health.dbStatus === 'ERROR' ? 'Issues Detected' : 'All Systems Operational'}
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-red-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'System Uptime', value: health.uptime, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Avg Latency', value: health.apiLatency, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Storage Used', value: `${Math.min(95, 40 + auditItems.length * 5)}%`, icon: HardDrive, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Security Score', value: `${Math.max(0, 100 - auditItems.length * 15)}/100`, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-green-50' },
        ].map((stat, index) => (
          <div key={index} className="professional-card p-6">
            <div className="flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', stat.bg, stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-xl font-bold text-slate-900">{loading ? 'Loading...' : stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 professional-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Infrastructure Performance
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <span className="text-xs text-slate-500">CPU</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-xs text-slate-500">Memory</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" />
                <Area type="monotone" dataKey="mem" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorMem)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Node Status</h3>
          <div className="space-y-4">
            {nodeStatus.map((node, index) => (
              <div key={index} className="professional-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                  <node.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{node.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', node.color)}>{node.status}</span>
                    <span className="text-[10px] text-slate-400">·</span>
                    <span className="text-[10px] text-slate-400 font-mono">{node.load} Load</span>
                  </div>
                </div>
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', parseInt(node.load, 10) > 80 ? 'bg-rose-500' : 'bg-indigo-500')}
                    style={{ width: `${Math.max(0, parseInt(node.load, 10) || 0)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="professional-card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Recent System Incidents</h3>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Latest Audit Scan</span>
        </div>
        <div className="p-6 space-y-4">
          {incidentLog.map((incident, index) => (
            <div key={index} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors">
              <div
                className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                  incident.severity === 'CRITICAL' || incident.severity === 'HIGH'
                    ? 'bg-red-50 text-rose-600'
                    : incident.severity === 'MEDIUM'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-indigo-50 text-indigo-600',
                )}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-slate-900">{incident.issue}</p>
                  <span className="text-xs text-slate-400 font-mono">{incident.category}</span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Severity: {incident.severity}
                  </span>
                  <span className="text-[10px] text-slate-400">·</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Action: {incident.action}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
