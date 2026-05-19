import { useLanguage } from '../../lib/translations';
﻿import { useEffect, useState } from 'react';
import {
  GitBranch,
  Play,
  Settings,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Zap,
  RefreshCw,
  Pause,
  X,
  Terminal,
  Save,
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ApiError } from '../../lib/api';
import {
  createWorkflow,
  deleteWorkflow,
  fetchWorkflows,
  updateWorkflow,
  type WorkflowFormPayload,
  type WorkflowRecord,
} from '../../lib/admin';

export default function ManageWorkflows() {
  const { t } = useLanguage();
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigureModal, setShowConfigureModal] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean } | null>(null);

  const [newWorkflow, setNewWorkflow] = useState<WorkflowFormPayload>({
    name: '',
    description: '',
    status: 'active',
    trigger: 'On Attendance Check-in',
    action: 'Send Notification',
    retryPolicy: 'Exponential Backoff (3 retries)',
    timeoutSeconds: 30,
  });

  const [editWorkflow, setEditWorkflow] = useState<WorkflowFormPayload>({
    name: '',
    description: '',
    status: 'active',
    trigger: 'On Attendance Check-in',
    action: 'Send Notification',
    retryPolicy: 'Exponential Backoff (3 retries)',
    timeoutSeconds: 30,
  });

  async function loadWorkflows(showRefreshState = false) {
    try {
      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await fetchWorkflows();
      setWorkflows(data);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load workflows right now.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadWorkflows();
  }, []);

  const selectedWorkflow = workflows.find((workflow) => workflow.id === showConfigureModal);

  useEffect(() => {
    if (selectedWorkflow) {
      setEditWorkflow({
        name: selectedWorkflow.name,
        description: selectedWorkflow.description,
        status: selectedWorkflow.status,
        trigger: selectedWorkflow.trigger,
        action: selectedWorkflow.action,
        retryPolicy: selectedWorkflow.retryPolicy,
        timeoutSeconds: selectedWorkflow.timeoutSeconds,
      });
    }
  }, [selectedWorkflow]);

  const handleCreateWorkflow = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setError(null);
      await createWorkflow(newWorkflow);
      setShowCreateModal(false);
      setNewWorkflow({
        name: '',
        description: '',
        status: 'active',
        trigger: 'On Attendance Check-in',
        action: 'Send Notification',
        retryPolicy: 'Exponential Backoff (3 retries)',
        timeoutSeconds: 30,
      });
      await loadWorkflows();
    } catch (createError) {
      setError(createError instanceof ApiError ? createError.message : 'Unable to create workflow.');
    }
  };

  const toggleStatus = async (workflow: WorkflowRecord) => {
    const nextStatus = workflow.status === 'active' ? 'paused' : 'active';

    try {
      setError(null);
      await updateWorkflow(workflow.id, {
        name: workflow.name,
        description: workflow.description,
        status: nextStatus,
        trigger: workflow.trigger,
        action: workflow.action,
        retryPolicy: workflow.retryPolicy,
        timeoutSeconds: workflow.timeoutSeconds,
      });
      setWorkflows((current) =>
        current.map((item) => (item.id === workflow.id ? { ...item, status: nextStatus } : item)),
      );
    } catch (toggleError) {
      setError(toggleError instanceof ApiError ? toggleError.message : 'Unable to update workflow status.');
    }
  };

  const handleTestRun = (id: string) => {
    setIsTesting(id);
    setTestResult(null);
    setTimeout(() => {
      setIsTesting(null);
      setTestResult({ id, success: true });
      setTimeout(() => setTestResult(null), 3000);
    }, 1500);
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      setError(null);
      await deleteWorkflow(id);
      setWorkflows((current) => current.filter((workflow) => workflow.id !== id));
      setShowConfigureModal(null);
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete workflow.');
    }
  };

  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow) {
      return;
    }

    try {
      setError(null);
      await updateWorkflow(selectedWorkflow.id, editWorkflow);
      setShowConfigureModal(null);
      await loadWorkflows();
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : 'Unable to update workflow.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('Automation Workflows')}</h1>
          <p className="text-slate-500">{t('Manage automated business logic and system triggers')}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => loadWorkflows(true)} className="secondary-button p-2.5" title="Refresh Status">
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
          <button onClick={() => setShowCreateModal(true)} className="primary-button gap-2 flex-1 md:flex-none justify-center">
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-red-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="professional-card p-6 text-sm text-slate-500">Loading workflows...</div>
        ) : workflows.map((workflow) => (
          <div key={workflow.id} className="professional-card group hover:border-indigo-200 transition-all">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center',
                      workflow.status === 'active'
                        ? 'bg-green-50 text-emerald-600'
                        : workflow.status === 'error'
                          ? 'bg-red-50 text-rose-600'
                          : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{workflow.name}</h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          workflow.status === 'active'
                            ? 'bg-emerald-500 animate-pulse'
                            : workflow.status === 'error'
                              ? 'bg-rose-500'
                              : 'bg-slate-400',
                        )}
                      ></span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {workflow.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTestRun(workflow.id)}
                    disabled={isTesting === workflow.id}
                    className="p-2 border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50"
                    title="Test Run"
                  >
                    <Play className={cn('w-4 h-4', isTesting === workflow.id && 'animate-pulse')} />
                  </button>
                  <button
                    onClick={() => toggleStatus(workflow)}
                    className={cn(
                      'p-2 rounded-2xl border transition-colors',
                      workflow.status === 'active'
                        ? 'border-amber-100 text-amber-600 hover:bg-amber-50'
                        : 'border-emerald-100 text-emerald-600 hover:bg-green-50',
                    )}
                    title={workflow.status === 'active' ? 'Pause Workflow' : 'Activate Workflow'}
                  >
                    {workflow.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setShowConfigureModal(workflow.id)}
                    className="p-2 border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    title="Configure"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-6 line-clamp-2 leading-relaxed">
                {workflow.description}
              </p>

              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl relative">
                {testResult?.id === workflow.id && (
                  <div
                    className={cn(
                      'absolute inset-0 rounded-2xl flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200',
                      testResult.success ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white',
                    )}
                  >
                    {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {testResult.success ? 'Test Passed' : 'Test Failed'}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Success Rate</p>
                  <p className="text-sm font-bold text-slate-900">{workflow.successRate}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg. Latency</p>
                  <p className="text-sm font-bold text-slate-900">{workflow.avgTime}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Run</p>
                  <p className="text-sm font-bold text-slate-900">{workflow.lastRun}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="professional-card p-8 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white overflow-hidden relative">
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-300 fill-current" />
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-100">New Feature</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Visual Workflow Builder</h2>
          <p className="text-indigo-100 mb-6 leading-relaxed">
            Create complex automation logic using our drag-and-drop interface. Connect triggers, conditions, and actions without writing a single line of code.
          </p>
          <button className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2">
            Open Builder
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-10 w-32 h-32 bg-indigo-400/20 rounded-full translate-y-1/2 blur-2xl"></div>
        <GitBranch className="absolute -right-10 top-1/2 -translate-y-1/2 w-64 h-64 text-white/5 -rotate-12" />
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Create New Workflow</h3>
                  <p className="text-xs text-slate-500">{t('Define a new automation trigger and action')}</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Workflow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Late Arrival Alert"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow((current) => ({ ...current, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what this workflow does..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow((current) => ({ ...current, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Trigger</label>
                  <select
                    value={newWorkflow.trigger}
                    onChange={(e) => setNewWorkflow((current) => ({ ...current, trigger: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option>On Attendance Check-in</option>
                    <option>On Leave Request</option>
                    <option>On Device Offline</option>
                    <option>Scheduled (Daily)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Action</label>
                  <select
                    value={newWorkflow.action}
                    onChange={(e) => setNewWorkflow((current) => ({ ...current, action: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option>Send Notification</option>
                    <option>Update User Status</option>
                    <option>Generate Report</option>
                    <option>Trigger Webhook</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="secondary-button flex-1 py-3">
                  Cancel
                </button>
                <button type="submit" className="primary-button flex-1 py-3 shadow-lg shadow-indigo-200">
                  Create Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfigureModal && selectedWorkflow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfigureModal(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Configure Workflow</h3>
                  <p className="text-xs text-slate-500">{selectedWorkflow.name}</p>
                </div>
              </div>
              <button onClick={() => setShowConfigureModal(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuration Payload</span>
                  </div>
                  <pre className="text-xs font-mono text-slate-600 bg-slate-100 p-3 rounded-2xl overflow-x-auto">
{JSON.stringify(
  {
    trigger: editWorkflow.trigger,
    action: editWorkflow.action,
    retryPolicy: editWorkflow.retryPolicy,
    timeoutSeconds: editWorkflow.timeoutSeconds,
    status: editWorkflow.status,
  },
  null,
  2,
)}
                  </pre>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Retry Policy</label>
                  <select
                    value={editWorkflow.retryPolicy}
                    onChange={(e) => setEditWorkflow((current) => ({ ...current, retryPolicy: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option>Exponential Backoff (3 retries)</option>
                    <option>Immediate Retry (1 time)</option>
                    <option>No Retry</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Timeout (Seconds)</label>
                  <input
                    type="number"
                    value={editWorkflow.timeoutSeconds}
                    onChange={(e) =>
                      setEditWorkflow((current) => ({
                        ...current,
                        timeoutSeconds: Number(e.target.value || 0),
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-2">
                <button onClick={() => handleDeleteWorkflow(selectedWorkflow.id)} className="p-3 text-rose-600 hover:bg-red-50 rounded-2xl transition-all" title="Delete Workflow">
                  <Trash2 className="w-5 h-5" />
                </button>
                <button onClick={() => setShowConfigureModal(null)} className="secondary-button flex-1 py-3">
                  Cancel
                </button>
                <button onClick={handleSaveWorkflow} className="primary-button flex-1 py-3 shadow-lg shadow-indigo-200">
                  <Save className="w-4 h-4 mr-2" />
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
