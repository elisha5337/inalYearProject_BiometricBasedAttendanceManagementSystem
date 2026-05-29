import { useEffect, useState } from 'react';
import { MessageSquare, AlertCircle, Inbox, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchComplaints, type ComplaintRecord } from '../../lib/admin';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useLanguage } from '../../lib/translations';

export default function AdminComplaints() {
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchComplaints({ recipient: 'ADMIN' });
        if (!cancelled) {
          setComplaints((res as { complaints: ComplaintRecord[] }).complaints ?? []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load complaints.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'open') return 'open';
    if (s === 'resolved' || s === 'closed') return 'Resolved';
    if (s === 'in_progress' || s === 'in progress') return 'In Progress';
    return status;
  };

  const statusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-100 text-emerald-700';
    if (s === 'in_progress' || s === 'in progress') return 'bg-amber-100 text-amber-700';
    return 'bg-indigo-100 text-indigo-700';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-text">{t('Admin Complaint Inbox')}</h1>
        <p className="text-sm text-surface-muted mt-1">{t('Complaints routed to the Admin team for review and resolution.')}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="professional-card p-6">
              <SkeletonLoader type="text" className="mb-3" />
              <SkeletonLoader type="text" className="w-2/3" />
            </div>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        /* Empty State */
        <div className="professional-card p-12 text-center">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 115, 206, 0.1)' }}>
            <Inbox className="w-8 h-8" style={{ color: '#0073CE' }} />
          </div>
          <h3 className="text-lg font-bold text-surface-text mb-2">{t('No Complaints')}</h3>
          <p className="text-sm text-surface-muted max-w-md mx-auto">{t('No admin complaints have been submitted yet. Complaints filed by employees will appear here.')}</p>
        </div>
      ) : (
        /* Complaints List */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-surface-muted">{complaints.length} {t('total complaints')}</span>
          </div>
          {complaints.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            return (
              <div
                key={item.id}
                className="professional-card overflow-hidden hover:shadow-md transition-all cursor-pointer"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(0, 115, 206, 0.1)' }}>
                        <MessageSquare className="w-5 h-5" style={{ color: '#0073CE' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-surface-text">{item.subject}</p>
                        <p className="text-sm text-surface-muted mt-0.5">From: {item.user}</p>
                        {item.created_at && (
                          <p className="text-xs text-surface-muted mt-1">
                            {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-surface-muted" />
                        : <ChevronDown className="w-4 h-4 text-surface-muted" />
                      }
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-6 pb-6 pt-0 border-t border-surface-divider">
                    <p className="mt-4 text-sm leading-6 text-surface-muted pl-14">{item.message}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
