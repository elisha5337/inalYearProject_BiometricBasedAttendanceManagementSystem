import { useLanguage } from '../lib/translations';
import { FormEvent, useState } from 'react';
import { HelpCircle, Send, User, ShieldCheck, MessageCircle } from 'lucide-react';
import { submitComplaint } from '../lib/admin';

export default function HelpCenter() {
  const { t } = useLanguage();
  const [recipient, setRecipient] = useState<'HR' | 'ADMIN'>('HR');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!subject.trim() || !message.trim()) {
      setErrorMessage('Subject and complaint details are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await submitComplaint({ recipient, subject: subject.trim(), message: message.trim() });
      if (response.success) {
        setSuccessMessage('Complaint submitted successfully.');
        setSubject('');
        setMessage('');
      } else {
        setErrorMessage(response.message || 'Unable to submit complaint.');
      }
    } catch (error) {
      console.error('Complaint submission failed:', error);
      setErrorMessage('Unable to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center">
        <div className="inline-flex items-center justify-center gap-3 rounded-full bg-indigo-100 px-4 py-2 text-indigo-700 text-xs font-semibold uppercase tracking-[0.35em]">
          <HelpCircle className="w-4 h-4" />
          {t('Complaint Center')}
        </div>
        <h1 className="mt-6 text-4xl font-bold text-slate-900">{t('Submit a Complaint')}</h1>
        <p className="max-w-2xl mx-auto mt-4 text-lg text-slate-500">
          {t('File a complaint and send it directly to HR or Admin. Please describe your concern in detail so we can take action.')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-600">{t('Recipient')}</span>
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value as 'HR' | 'ADMIN')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="HR">HR</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-1">
            <span className="text-sm font-semibold text-slate-600">{t('Subject')}</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('Enter a short subject for your complaint')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">{t('Complaint Details')}</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            placeholder={t('Describe your complaint, including any relevant dates, names, or events.')}
            className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
          />
        </label>

        {errorMessage && (
          <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            <p className="font-semibold text-slate-700">{t('Need help submitting?')}</p>
            <p>{t('Select the primary recipient and provide details so we can resolve it quickly.')}</p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-3xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? t('Submitting...') : t('Submit Complaint')}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            title: t('HR Support'),
            description: t('Choose HR for personnel, leave, or workplace concerns.'),
            icon: User,
            color: 'bg-indigo-50 text-indigo-700',
          },
          {
            title: t('Admin Support'),
            description: t('Choose Admin for policy, system, or escalated issues.'),
            icon: ShieldCheck,
            color: 'bg-slate-50 text-slate-900',
          },
          {
            title: t('Private and Secure'),
            description: t('Your complaint is recorded securely and reviewed by the appropriate team.'),
            icon: MessageCircle,
            color: 'bg-emerald-50 text-emerald-700',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="professional-card p-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
