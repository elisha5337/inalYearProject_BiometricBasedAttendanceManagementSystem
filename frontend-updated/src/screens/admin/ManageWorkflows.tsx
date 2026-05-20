import { useEffect, useState } from 'react';
import { Clock, Users, GitBranch, RefreshCw, ChevronRight, CheckCircle2, AlertCircle, Calendar, ArrowRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ApiError, apiRequest } from '../../lib/api';

interface ShiftWorkflow {
  id: string;
  name: string;
  description: string;
  department: string;
  trigger: string;
  condition: string;
  action: string;
  work_days: string;
  start_time: string;
  end_time: string;
  grace_period: number;
  assigned_employees: number;
  status: 'active';
}

export default function ManageWorkflows() {
  const [workflows, setWorkflows] = useState<ShiftWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShiftWorkflow | null>(null);

  async function load(refresh = false) {
    try {
      refresh ? setIsRefreshing(true) : setLoading(true);
      setError(null);
      const res = await apiRequest<{ success: boolean; workflows: ShiftWorkflow[] }>(
        '/api/scheduling/shift-workflows/'
      );
      setWorkflows(res.workflows ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unable to load workflows.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Workflows</h1>
          <p className="text-slate-500 mt-1">
            Each shift defines a live attendance rule — the system automatically evaluates every check-in against these rules in real time.
          </p>
        </div>
        <button onClick={() => load(true)} className="secondary-button p-2.5" title="Refresh">
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-red-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* How it works banner */}
      <div className="professional-card p-5 bg-indigo-50 border-indigo-100">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-indigo-900 mb-1">How Attendance Workflows Work</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-700">
              <span className="bg-indigo-100 px-2 py-1 rounded-lg font-semibold">1. Employee checks in via biometric terminal</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="bg-indigo-100 px-2 py-1 rounded-lg font-semibold">2. System finds their assigned shift</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="bg-indigo-100 px-2 py-1 rounded-lg font-semibold">3. Check-in time compared against shift start + grace period</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="bg-indigo-100 px-2 py-1 rounded-lg font-semibold">4. Record marked ON_TIME or LATE automatically</span>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="professional-card p-6 space-y-4 animate-pulse">
              <div className="h-5 w-40 bg-slate-100 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-16 bg-slate-50 rounded-2xl" />
            </div>
          ))
        ) : workflows.length === 0 ? (
          <div className="professional-card p-8 text-center col-span-2">
            <GitBranch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">No shifts configured yet</p>
            <p className="text-xs text-slate-400 mt-1">Go to Manage Shifts to create shifts — they will appear here as attendance workflows.</p>
          </div>
        ) : workflows.map((wf) => (
          <div
            key={wf.id}
            className="professional-card hover:border-indigo-200 transition-all cursor-pointer"
            onClick={() => setSelected(wf)}
          >
            <div className="p-6">
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{wf.name}</h3>
                    <p className="text-xs text-slate-500">{wf.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Active
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <p className="text-sm text-slate-500 mb-5 line-clamp-2">{wf.description}</p>

              {/* Rule summary */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 shrink-0">Trigger</span>
                  <span className="text-xs font-semibold text-slate-700">{wf.trigger}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest w-16 shrink-0">Rule</span>
                  <span className="text-xs font-semibold text-amber-800">
                    ON_TIME if within {wf.grace_period} min of {wf.start_time} · LATE if after
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest w-16 shrink-0">Action</span>
                  <span className="text-xs font-semibold text-indigo-800">Mark attendance record + update employee status</span>
                </div>
              </div>

              {/* Footer stats */}
              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  {wf.start_time} – {wf.end_time}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {wf.work_days}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
                  <Users className="w-3.5 h-3.5" />
                  {wf.assigned_employees} assigned
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selected.name}</h3>
                <p className="text-xs text-slate-500">{selected.department} · Attendance Workflow</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Shift timing */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start</p>
                  <p className="text-lg font-black text-slate-900">{selected.start_time}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End</p>
                  <p className="text-lg font-black text-slate-900">{selected.end_time}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Grace</p>
                  <p className="text-lg font-black text-amber-700">{selected.grace_period}m</p>
                </div>
              </div>

              {/* Full rule logic */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rule Logic</p>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 shrink-0 mt-0.5">1</div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs font-bold text-slate-700">Trigger</p>
                    <p className="text-xs text-slate-500 mt-0.5">{selected.trigger} via biometric terminal</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-black text-amber-600 shrink-0 mt-0.5">2</div>
                  <div className="flex-1 p-3 bg-amber-50 rounded-xl">
                    <p className="text-xs font-bold text-amber-800">Condition</p>
                    <p className="text-xs text-amber-700 mt-0.5">{selected.condition}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-black text-emerald-600 shrink-0 mt-0.5">3</div>
                  <div className="flex-1 p-3 bg-emerald-50 rounded-xl">
                    <p className="text-xs font-bold text-emerald-800">Action</p>
                    <p className="text-xs text-emerald-700 mt-0.5">{selected.action}</p>
                  </div>
                </div>
              </div>

              {/* Outcome table */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Possible Outcomes</p>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 font-bold text-slate-500 rounded-l-xl">Check-in Time</th>
                      <th className="px-3 py-2 font-bold text-slate-500">Result</th>
                      <th className="px-3 py-2 font-bold text-slate-500 rounded-r-xl">Recorded As</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-3 py-2 text-slate-600">Before or at {selected.start_time} + {selected.grace_period}m</td>
                      <td className="px-3 py-2"><span className="text-emerald-600 font-bold">✓ On Time</span></td>
                      <td className="px-3 py-2 font-mono text-emerald-700">ON_TIME</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-600">After {selected.start_time} + {selected.grace_period}m</td>
                      <td className="px-3 py-2"><span className="text-amber-600 font-bold">⚠ Late</span></td>
                      <td className="px-3 py-2 font-mono text-amber-700">LATE</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-600">Checkout before {selected.end_time} - 5m</td>
                      <td className="px-3 py-2"><span className="text-rose-600 font-bold">↩ Early Exit</span></td>
                      <td className="px-3 py-2 font-mono text-rose-700">EARLY_EXIT</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-600">No check-in recorded</td>
                      <td className="px-3 py-2"><span className="text-slate-500 font-bold">✗ Absent</span></td>
                      <td className="px-3 py-2 font-mono text-slate-500">ABSENT</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl">
                <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                <p className="text-xs text-indigo-700">
                  This rule runs automatically on every biometric check-in. {selected.assigned_employees} employee(s) are currently assigned to this shift.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
