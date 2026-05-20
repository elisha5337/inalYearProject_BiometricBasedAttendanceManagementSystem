import { useLanguage } from '../../lib/translations';
﻿import {
  CheckCircle2,
  AlertTriangle,
  Settings2,
  RefreshCw,
  Plus,
  Search,
  Cloud,
  Database,
  Users,
  X,
  Shield,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { ApiError } from '../../lib/api';
import {
  buildIntegrationActivity,
  createIntegration,
  deleteIntegration,
  fetchIntegrations,
  syncIntegration,
  toggleIntegration,
  updateIntegrationConfig,
  type IntegrationFormPayload,
  type IntegrationRecord,
  type SyncRecord,
} from '../../lib/admin';

function getIntegrationIcon(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('payroll')) {
    return Database;
  }
  if (normalized.includes('erp') || normalized.includes('hr')) {
    return Users;
  }
  if (normalized.includes('security') || normalized.includes('auth')) {
    return Shield;
  }
  return Cloud;
}

export default function ExternalIntegrations() {
  const { t } = useLanguage();
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ id: string; message: string; records: SyncRecord[] } | null>(null);
  const [syncLog, setSyncLog] = useState<{ service: string; event: string; status: string; time: string }[]>([]);
  const defaultEnd = new Date().toISOString().slice(0, 10);
  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [syncRange, setSyncRange] = useState({ start: defaultStart, end: defaultEnd });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigureModal, setShowConfigureModal] = useState<string | null>(null);
  const [newIntegration, setNewIntegration] = useState<IntegrationFormPayload>({
    name: '',
    type: 'HR_SYSTEM',
    description: '',
  });
  const [configState, setConfigState] = useState({
    endpointUrl: '',
    apiKey: '',
  });

  async function loadIntegrations() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchIntegrations();
      setIntegrations(data);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load integrations right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIntegrations();
  }, []);

  const selectedIntegration = integrations.find((integration) => integration.id === showConfigureModal);

  useEffect(() => {
    if (selectedIntegration) {
      setConfigState({
        endpointUrl: selectedIntegration.endpointUrl,
        apiKey: '',
      });
    }
  }, [selectedIntegration]);

  const filteredIntegrations = integrations.filter((integration) =>
    [integration.name, integration.description, integration.type]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const activityLogs = [...syncLog, ...buildIntegrationActivity(integrations)];

  const handleSync = async (id: string) => {
    try {
      setIsSyncing(id);
      setSyncResult(null);
      setError(null);
      const result = await syncIntegration(id, syncRange.start, syncRange.end);
      const synced = integrations.find((i) => i.id === id);
      await loadIntegrations();
      setSyncResult({ id, message: result.message ?? 'Sync completed (simulated).', records: result.records ?? [] });
      if (synced) {
        setSyncLog((prev) => [{
          service: synced.name,
          event: `Data sync — ${result.records?.length ?? 0} record(s) queued`,
          status: 'Synced',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }, ...prev]);
      }
    } catch (syncError) {
      setError(syncError instanceof ApiError ? syncError.message : 'Unable to synchronize integration.');
    } finally {
      setIsSyncing(null);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setError(null);
      await toggleIntegration(id);
      await loadIntegrations();
    } catch (toggleError) {
      setError(toggleError instanceof ApiError ? toggleError.message : 'Unable to toggle integration.');
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    try {
      setError(null);
      await deleteIntegration(id);
      setShowConfigureModal(null);
      await loadIntegrations();
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete integration.');
    }
  };

  const handleAddIntegration = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setError(null);
      await createIntegration(newIntegration);
      setShowAddModal(false);
      setNewIntegration({
        name: '',
        type: 'HR_SYSTEM',
        description: '',
      });
      await loadIntegrations();
    } catch (createError) {
      setError(createError instanceof ApiError ? createError.message : 'Unable to create integration.');
    }
  };

  const handleUpdateConfig = async () => {
    if (!selectedIntegration) {
      return;
    }

    try {
      setError(null);
      await updateIntegrationConfig(selectedIntegration.id, configState);
      setShowConfigureModal(null);
      await loadIntegrations();
    } catch (updateError) {
      setError(updateError instanceof ApiError ? updateError.message : 'Unable to update integration configuration.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('External Integrations')}</h1>
          <p className="text-slate-500 mt-1">{t('Manage connections to HRIS, Payroll, and Cloud services')}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="primary-button gap-2">
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-red-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {syncResult ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="px-5 py-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-200 px-2 py-1 rounded-full shrink-0 mt-0.5">Demo Mode</span>
              <p className="text-sm font-medium text-amber-800">{syncResult.message}</p>
            </div>
            <button
              onClick={() => setSyncResult(null)}
              className="p-1 text-amber-500 hover:text-amber-800 hover:bg-amber-200 rounded-lg transition-all shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {syncResult.records.length > 0 && (
            <div className="border-t border-amber-200 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-amber-100/60">
                    <th className="px-4 py-2 text-[10px] font-bold text-amber-700 uppercase tracking-widest">Employee</th>
                    <th className="px-4 py-2 text-[10px] font-bold text-amber-700 uppercase tracking-widest">Period</th>
                    <th className="px-4 py-2 text-[10px] font-bold text-amber-700 uppercase tracking-widest">Hours</th>
                    <th className="px-4 py-2 text-[10px] font-bold text-amber-700 uppercase tracking-widest">Days</th>
                    <th className="px-4 py-2 text-[10px] font-bold text-amber-700 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {syncResult.records.map((rec) => (
                    <tr key={rec.employee_id}>
                      <td className="px-4 py-2 text-xs font-bold text-slate-800">{rec.username}</td>
                      <td className="px-4 py-2 text-xs text-slate-500 font-mono">{rec.period_start} → {rec.period_end}</td>
                      <td className="px-4 py-2 text-xs font-bold text-indigo-700">{rec.total_hours} hrs</td>
                      <td className="px-4 py-2 text-xs text-slate-600">{rec.days_present} days</td>
                      <td className="px-4 py-2">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">{rec.verification_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <div className="professional-card p-4 flex flex-wrap items-center gap-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sync Period</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">From</label>
          <input
            type="date"
            value={syncRange.start}
            max={syncRange.end}
            onChange={(e) => setSyncRange((r) => ({ ...r, start: e.target.value }))}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">To</label>
          <input
            type="date"
            value={syncRange.end}
            min={syncRange.start}
            onChange={(e) => setSyncRange((r) => ({ ...r, end: e.target.value }))}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-400">Click ↻ on a connected integration to sync this period</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="professional-card p-6 text-sm text-slate-500">Loading integrations...</div>
        ) : filteredIntegrations.map((integration) => {
          const Icon = getIntegrationIcon(integration.type);
          return (
            <div key={integration.id} className="professional-card group hover:border-indigo-200 transition-all">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                      integration.status === 'connected'
                        ? 'bg-green-50 text-emerald-600'
                        : integration.status === 'error'
                          ? 'bg-red-50 text-rose-600'
                          : 'bg-slate-50 text-slate-600',
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.status === 'connected' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    ) : integration.status === 'error' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Error
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-full">
                        Disconnected
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">{integration.name}</h3>
                <p className="text-sm text-slate-500 mb-6 line-clamp-2">{integration.description}</p>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Sync</span>
                    <span className="text-xs font-mono text-slate-600">{integration.lastSync}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={isSyncing === integration.id || integration.status !== 'connected'}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      title={integration.status !== 'connected' ? 'Connect this integration first to sync' : 'Simulated Sync — payload is built from real attendance data'}
                    >
                      <RefreshCw className={cn('w-4 h-4', isSyncing === integration.id && 'animate-spin')} />
                    </button>
                    <button
                      onClick={() => setShowConfigureModal(integration.id)}
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
                      title="Configure"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => setShowAddModal(true)}
          className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group"
        >
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">Connect New Service</p>
            <p className="text-xs text-slate-500 mt-1">{t('Browse available integrations')}</p>
          </div>
        </button>
      </div>

      <div className="professional-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Integration Activity</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityLogs.map((log, index) => (
                <tr key={`${log.service}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">{log.service}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{log.event}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-widest',
                        log.status === 'Success' || log.status === 'Connected'
                          ? 'text-emerald-600'
                          : log.status === 'Error'
                            ? 'text-rose-600'
                            : 'text-slate-500',
                      )}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-slate-400 font-mono">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Add Integration</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddIntegration} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Service Name</label>
                <input
                  required
                  type="text"
                  value={newIntegration.name}
                  onChange={(e) => setNewIntegration((current) => ({ ...current, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Type</label>
                <select
                  value={newIntegration.type}
                  onChange={(e) => setNewIntegration((current) => ({ ...current, type: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="HR_SYSTEM">HR System</option>
                  <option value="PAYROLL">Payroll</option>
                  <option value="COMMUNICATION">Communication</option>
                  <option value="SECURITY">Security</option>
                  <option value="ERP">ERP</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={newIntegration.description}
                  onChange={(e) => setNewIntegration((current) => ({ ...current, description: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="secondary-button flex-1 py-3">
                  Cancel
                </button>
                <button type="submit" className="primary-button flex-1 py-3">
                  Add Integration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfigureModal && selectedIntegration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfigureModal(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Configure Integration</h3>
              <button onClick={() => setShowConfigureModal(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Endpoint URL</label>
                <input
                  type="text"
                  value={configState.endpointUrl}
                  onChange={(e) => setConfigState((current) => ({ ...current, endpointUrl: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">API Key / Secret</label>
                <input
                  type="password"
                  value={configState.apiKey}
                  onChange={(e) => setConfigState((current) => ({ ...current, apiKey: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                <button onClick={() => handleDeleteIntegration(selectedIntegration.id)} className="p-3 text-rose-600 hover:bg-red-50 rounded-2xl transition-all" title="Delete Integration">
                  <Trash2 className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => handleToggle(selectedIntegration.id)} className="secondary-button flex-1 py-3">
                  {selectedIntegration.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
                <button type="button" onClick={handleUpdateConfig} className="primary-button flex-1 py-3">
                  Save Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
