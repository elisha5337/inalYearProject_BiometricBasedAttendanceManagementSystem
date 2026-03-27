import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, User, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { AttendanceMarkResponse } from '../../lib/attendance';

export default function VerificationStatus() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    success,
    result,
    error,
  }: {
    success?: boolean;
    result?: AttendanceMarkResponse;
    error?: string;
  } = location.state || { success: false };

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/terminal');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100"
      >
        <div className={success ? "bg-green-500 p-12" : "bg-red-500 p-12"}>
          <div className="flex justify-center">
            {success ? (
              <CheckCircle2 className="w-24 h-24 text-white" />
            ) : (
              <XCircle className="w-24 h-24 text-white" />
            )}
          </div>
          <h2 className="text-center text-3xl font-bold text-white mt-6">
            {success
              ? `${result?.type === 'CHECK_OUT' ? 'Check-out' : 'Check-in'} Successful`
              : "Verification Failed"}
          </h2>
        </div>

        <div className="p-10 space-y-8">
          {success ? (
            <>
              <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <User className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{result?.username || 'Employee'}</h3>
                  <p className="text-slate-500 flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4" />
                    Biometric Attendance Terminal
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Timestamp</p>
                  <p className="text-lg font-mono font-bold text-blue-900 mt-1">
                    {result ? new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{result?.status || 'Recorded'}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Verification</p>
                <p className="text-sm font-bold text-slate-900 mt-2">{result?.verification_status || 'VERIFIED'}</p>
                <p className="text-sm text-slate-500 mt-2">{result?.message}</p>
              </div>
            </>
          ) : (
            <div className="text-center space-y-6">
              <p className="text-slate-600 text-lg">
                {error || "We couldn't verify your identity. Please try again."}
              </p>
              <div className="grid gap-3 text-left">
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
                  <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold">1</div>
                  Ensure your finger is clean and dry.
                </div>
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
                  <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold">2</div>
                  Make sure your face is well-lit and clearly visible.
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Clock className="w-4 h-4" />
              Redirecting in 5 seconds...
            </div>
            <button 
              onClick={() => navigate('/terminal')}
              className="text-blue-600 font-bold hover:underline"
            >
              Return to Terminal Now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
