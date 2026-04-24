import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { confirmPasswordReset } from '../../lib/auth';
import { ApiError } from '../../lib/api';

export default function ResetPassword() {
  const params = useParams();
  const uid = params.uid;
  const token = params.token;
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log("ResetPassword Registry Handshake:", { uid, token });
  }, [uid, token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must meet 8-character minimum.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!uid || !token) {
      setError('Invalid link parameters.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanToken = token.replace(/\/$/, '');
      await confirmPasswordReset(uid, cleanToken, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] p-8 md:p-10 relative overflow-hidden border border-slate-100"
      >
        <AnimatePresence mode="wait">
          {!uid || !token ? (
            <motion.div 
              key="invalid"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center space-y-6"
            >
               <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                 <AlertCircle className="w-8 h-8" />
               </div>
               <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Protocol Refused</h2>
               <p className="text-slate-500 text-xs font-medium leading-relaxed"> Handshake parameters are corrupted. Please request a new link.</p>
               <button onClick={() => navigate('/login')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px]">Return to Login</button>
            </motion.div>
          ) : success ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-4"
            >
              <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Access Restored</h3>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Identity updated. Redirecting in 3s...</p>
              </div>
              <div className="w-32 mx-auto bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 3 }} className="h-full bg-emerald-500" />
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-sm">
                  <KeyRound className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">New Credentials</h2>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Configure security override</p>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border-l-4 border-rose-600 rounded-2xl flex items-center gap-3 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">{error}</span>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">New Access Key</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-200"
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Confirm Signature</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-200"
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'REWRITE CREDENTIALS'}
                </button>
              </form>

              <div className="pt-6 border-t border-slate-50 text-center">
                <button onClick={() => navigate('/login')} className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] hover:text-indigo-600 transition-all flex items-center justify-center gap-2 mx-auto italic">
                   <ArrowLeft className="w-3 h-3" /> Back to Portal
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
