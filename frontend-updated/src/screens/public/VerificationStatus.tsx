import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, User, Building2, Briefcase, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import type { AttendanceMarkResponse } from '../../lib/attendance';
import { cn } from '../../lib/utils';

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

  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/terminal');
    }, 8000);
    const tick = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearTimeout(timer); clearInterval(tick); };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-4 md:p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-surface-card rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10"
      >
        <div className={success ? "bg-[#0073CE] p-8 md:p-12 text-center relative overflow-hidden" : "bg-rose-500 p-8 md:p-12 text-center relative overflow-hidden"}>
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-surface-card blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-surface-card blur-3xl"></div>
          </div>
          
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
            className="flex justify-center relative z-10"
          >
            {success ? (
              <div className="bg-surface-card/20 p-4 rounded-full backdrop-blur-md">
                <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 text-white" />
              </div>
            ) : (
              <div className="bg-surface-card/20 p-4 rounded-full backdrop-blur-md">
                <XCircle className="w-16 h-16 md:w-20 md:h-20 text-white" />
              </div>
            )}
          </motion.div>
          
          <h2 className="text-3xl md:text-4xl font-black text-white mt-6 uppercase tracking-tighter italic relative z-10">
            {success
              ? (result?.type === 'CHECK_OUT' ? 'Check-out Successful' : 'Check-in Successful')
              : "Access Denied"}
          </h2>
          <p className="text-white/90 font-black text-[10px] uppercase tracking-[0.3em] mt-3 bg-black/10 inline-block px-4 py-1.5 rounded-full backdrop-blur-sm relative z-10">
            {success ? "Attendance Protocol Verified" : "Identity Mismatch Detected"}
          </p>
        </div>

        <div className="p-8 md:p-12 space-y-8">
          {success ? (
            <>
              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-surface-bg rounded-[2rem] border border-slate-100 relative group transition-all hover:bg-slate-100/50">
                <div className="shrink-0 w-28 h-28 rounded-2xl overflow-hidden bg-blue-50 border-4 border-white shadow-xl rotate-[-2deg] group-hover:rotate-0 transition-transform duration-500">
                  {result?.profile?.profile_photo ? (
                    <img 
                      src={result.profile.profile_photo} 
                      alt={result.profile.full_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#0073CE] bg-gradient-to-br from-blue-50 to-blue-100">
                      <User className="w-14 h-14" />
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <p className="text-[9px] font-black text-[#0073CE] uppercase tracking-[0.25em] mb-1">Identified Personnel</p>
                  <h3 className="text-3xl font-black text-surface-text leading-none truncate mb-3 tracking-tighter">{result?.profile?.full_name}</h3>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-wider border border-slate-200 shadow-sm">
                      <User className="w-3 h-3 text-[#0073CE]" />
                      ID: {result?.username}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-wider border border-slate-200 shadow-sm">
                      <Building2 className="w-3 h-3 text-[#0073CE]" />
                      {result?.profile?.department}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-wider border border-slate-200 shadow-sm">
                      <Briefcase className="w-3 h-3 text-[#0073CE]" />
                      {result?.profile?.position}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 bg-surface-bg rounded-[1.5rem] border border-slate-200/60 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Clock className="w-12 h-12 text-surface-text" />
                  </div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest relative z-10">Time Registry</p>
                  <p className="text-2xl font-mono font-black text-surface-text mt-2 relative z-10 tracking-tighter">
                    {result ? new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--:--:--'}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 flex items-center gap-1 relative z-10 uppercase tracking-tighter">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="p-6 bg-surface-bg rounded-[1.5rem] border border-slate-200/60 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest relative z-10">Compliance Status</p>
                  <p className={cn(
                    "text-2xl font-black mt-2 relative z-10 uppercase tracking-tighter italic",
                    result?.status?.toLowerCase().includes('late') ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {result?.status || 'On Time'}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter relative z-10">Standard Protocol</p>
                </div>
              </div>

              <div className="p-6 bg-slate-900 rounded-[2rem] shadow-xl relative overflow-hidden space-y-4">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#0073CE]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.25em] relative z-10">Verification Protocol Details</p>
                
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div>
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Authentication Method</p>
                    <p className="text-white text-sm font-black uppercase mt-1.5 tracking-wider font-mono">
                      {result?.method || 'face'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Verification Status</p>
                    <p className={cn(
                      "text-sm font-black uppercase mt-1.5 tracking-wider font-mono",
                      result?.verification_status === 'VERIFIED' ? "text-emerald-400" : "text-amber-400"
                    )}>
                      {result?.verification_status || 'VERIFIED'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 flex items-center justify-between relative z-10 text-[9px]">
                  <span className="text-slate-400 font-black uppercase tracking-widest">
                    Registry Event: <span className="text-white font-black">{result?.type?.replace('_', ' ')}</span>
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse pointer-events-none"></div>
                    Secure Log
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center space-y-8 py-4">
              <div className="space-y-4">
                <h3 className="text-surface-text text-2xl font-black tracking-tight leading-tight uppercase italic">
                  {error || "Verification Denied"}
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed px-6 max-w-sm mx-auto">
                  The biometric scanner could not confirm your identity. Please reset and try again.
                </p>
              </div>
              
              <div className="grid gap-3 max-w-xs mx-auto">
                <div className="flex items-center gap-4 p-4 bg-surface-bg rounded-2xl text-left border border-slate-100 transition-transform hover:scale-[1.02]">
                  <div className="w-8 h-8 bg-[#0073CE] text-white rounded-2xl flex items-center justify-center shrink-0 font-black text-xs shadow-lg shadow-blue-200">01</div>
                  <p className="text-[10px] font-black text-surface-text uppercase tracking-tight">Check Lighting</p>
                </div>
                <div className="flex items-center gap-4 p-4 bg-surface-bg rounded-2xl text-left border border-slate-100 transition-transform hover:scale-[1.02]">
                  <div className="w-8 h-8 bg-[#0073CE] text-white rounded-2xl flex items-center justify-center shrink-0 font-black text-xs shadow-lg shadow-blue-200">02</div>
                  <p className="text-[10px] font-black text-surface-text uppercase tracking-tight">Stay within Guide</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 flex flex-col items-center gap-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">
              <Clock className="w-3 h-3 animate-spin-slow" />
              Auto Reset: {countdown}s
            </div>
            <button 
              onClick={() => navigate('/terminal')}
              className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_-12px_rgba(15,23,42,0.3)] active:scale-95 transition-all hover:bg-[#0073CE] hover:shadow-blue-200"
            >
              Return to Core Terminal
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
