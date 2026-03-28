import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, User, Building2, Briefcase } from 'lucide-react';
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
    }, 8000); // Increased to 8s to allow reading profile info
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
      >
        <div className={success ? "bg-emerald-500 p-10 text-center" : "bg-rose-500 p-10 text-center"}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
            className="flex justify-center"
          >
            {success ? (
              <CheckCircle2 className="w-20 h-20 text-white" />
            ) : (
              <XCircle className="w-20 h-20 text-white" />
            )}
          </motion.div>
          <h2 className="text-3xl font-black text-white mt-6 uppercase tracking-tight">
            {success
              ? `${result?.type === 'CHECK_OUT' ? 'Check-out' : 'Check-in'} Successful`
              : "Verification Failed"}
          </h2>
          <p className="text-white/80 font-bold text-xs uppercase tracking-[0.2em] mt-2">
            {success ? "Attendance Recorded Securely" : "Security Protocol Denied"}
          </p>
        </div>

        <div className="p-8 md:p-12 space-y-8">
          {success ? (
            <>
              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 relative">
                <div className="shrink-0 w-24 h-24 rounded-2xl overflow-hidden bg-blue-100 border-2 border-white shadow-md">
                  {result?.profile?.profile_photo ? (
                    <img 
                      src={result.profile.profile_photo} 
                      alt={result.profile.full_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-blue-600">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">{result?.profile?.full_name}</h3>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 pt-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      {result?.profile?.department}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                      {result?.profile?.position}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Marked At</p>
                  <p className="text-xl font-mono font-black text-blue-900 mt-1">
                    {result ? new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                  </p>
                </div>
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Entry Status</p>
                  <p className="text-xl font-black text-emerald-900 mt-1 uppercase tracking-tighter">{result?.status || 'On Time'}</p>
                </div>
              </div>

              <div className="p-5 bg-slate-900 rounded-2xl shadow-lg shadow-slate-200">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Verification Method</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-white font-bold tracking-tight">{result?.verification_status || 'BIOMETRIC_MATCH'}</span>
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                    SECURE
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center space-y-8 py-4">
              <div className="space-y-3">
                <p className="text-slate-900 text-xl font-black tracking-tight leading-tight">
                  {error || "Authentication could not be completed at this time."}
                </p>
                <p className="text-slate-500 text-sm font-medium leading-relaxed px-4">
                  Please ensure you are within the frame and looking directly at the camera.
                </p>
              </div>
              
              <div className="grid gap-3 max-w-sm mx-auto">
                <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-2xl text-left border border-rose-100">
                  <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0 font-black text-xs">01</div>
                  <p className="text-xs font-bold text-rose-900 uppercase tracking-tight">Ensure stable lighting conditions</p>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl text-left border border-slate-100">
                  <div className="w-8 h-8 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center shrink-0 font-black text-xs">02</div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">Center your face in the guide</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
              <Clock className="w-3.5 h-3.5" />
              Resetting Terminal in 8s
            </div>
            <button 
              onClick={() => navigate('/terminal')}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
            >
              Back to Scanner
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
