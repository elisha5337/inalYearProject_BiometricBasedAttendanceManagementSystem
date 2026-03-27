import { useEffect, useState } from 'react';
import { Send, Calendar, AlertCircle, Info, CheckCircle2, Paperclip, X } from 'lucide-react';
import { User } from '../../types';
import { fetchMyLeaveRequests, submitLeaveRequest } from '../../lib/leave';

export default function SubmitLeave({ user }: { user: User }) {
  const [formData, setFormData] = useState({
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [leaveBalance, setLeaveBalance] = useState({ annual_left: 0, sick_left: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadLeaveBalance() {
      try {
        const response = await fetchMyLeaveRequests();
        if (active) {
          setLeaveBalance({
            annual_left: response.summary.annual_left,
            sick_left: response.summary.sick_left,
          });
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load leave balance.');
        }
      }
    }

    loadLeaveBalance();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await submitLeaveRequest({
        leaveType: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        attachment: attachment,
      });

      setSuccessMessage((response as any).message || 'Leave request submitted successfully.');
      setFormData({
        type: 'Annual Leave',
        startDate: '',
        endDate: '',
        reason: '',
      });
      setAttachment(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Submit Leave Request</h1>
        <p className="text-slate-500">Request time off by providing the details below</p>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="professional-card p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Leave Type</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option>Annual Leave</option>
                  <option>Sick Leave</option>
                  <option>Maternity Leave</option>
                  <option>Paternity Leave</option>
                  <option>Compassionate Leave</option>
                  <option>Unpaid Leave</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Attachment (Medical Proof/Proof)</label>
                <div className="relative">
                   <input
                    type="file"
                    id="attachment"
                    className="hidden"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  />
                  <label 
                    htmlFor="attachment"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 border-dashed rounded-lg flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors text-sm text-slate-600 font-medium"
                  >
                    <Paperclip className="w-4 h-4 text-blue-500" />
                    {attachment ? (
                      <span className="text-blue-600 font-bold truncate max-w-[180px]">{attachment.name}</span>
                    ) : (
                      "Click to upload proof"
                    )}
                  </label>
                  {attachment && (
                    <button 
                      type="button" 
                      onClick={() => setAttachment(null)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-red-50 text-red-400 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Reason for Leave</label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Please provide a brief explanation..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              ></textarea>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData({ type: 'Annual Leave', startDate: '', endDate: '', reason: '' });
                  setAttachment(null);
                }}
                className="secondary-button"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="primary-button gap-2">
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="professional-card p-6 bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Leave Balance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-blue-100 text-sm">Annual Leave</span>
                <span className="font-bold text-xl">{leaveBalance.annual_left} Days</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-500"
                  style={{ width: `${Math.max(5, Math.min(100, (leaveBalance.annual_left / 20) * 100))}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100 text-sm">Sick Leave</span>
                <span className="font-bold text-xl">{leaveBalance.sick_left} Days</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-500"
                  style={{ width: `${Math.max(5, Math.min(100, (leaveBalance.sick_left / 12) * 100))}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="professional-card p-6 border-amber-100 bg-amber-50">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="space-y-2">
                <h4 className="font-bold text-amber-900 text-sm">Important Note</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Leave requests should be submitted at least 48 hours in advance for annual leave.
                  Sick leave can be submitted retroactively with a medical certificate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
