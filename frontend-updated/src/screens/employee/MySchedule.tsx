import { useEffect, useState } from 'react';
import { Clock, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { User } from '../../types';

interface Assignment {
  id: string;
  shift: string;
  time: string;
  from_date: string;
  to_date: string | null;
}

export default function MySchedule({ user }: { user: User }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await apiRequest<{ success: boolean; assignments: Assignment[] }>('/api/scheduling/my-assignments/');
        if (active) setAssignments(res.assignments || []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load schedule.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const activeAssignment = assignments.find(a => {
    const from = a.from_date;
    const to = a.to_date;
    return from <= today && (!to || to >= today);
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
        <p className="text-slate-500 mt-1">Your assigned work shifts and schedule</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Today's shift highlight */}
      <div className={`professional-card p-6 ${activeAssignment ? 'border-l-4' : ''}`}
        style={activeAssignment ? { borderLeftColor: '#0073CE' } : {}}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center icon-brand">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Shift</p>
            <h3 className="text-lg font-bold text-slate-900">
              {loading ? 'Loading...' : activeAssignment ? activeAssignment.shift : 'No shift assigned today'}
            </h3>
          </div>
        </div>
        {activeAssignment && (
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-slate-600">{activeAssignment.time}</span>
          </div>
        )}
      </div>

      {/* All assignments */}
      <div className="professional-card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: '#0073CE' }} />
            All Shift Assignments
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No shift assignments found.</p>
            <p className="text-xs text-slate-400 mt-1">Contact HR to get assigned to a shift.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.map(a => {
              const isActive = a.from_date <= today && (!a.to_date || a.to_date >= today);
              return (
                <div key={a.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className="font-bold text-slate-900">{a.shift}</p>
                      <p className="text-sm text-slate-500">{a.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500">
                      {a.from_date} — {a.to_date || 'Ongoing'}
                    </p>
                    {isActive && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
