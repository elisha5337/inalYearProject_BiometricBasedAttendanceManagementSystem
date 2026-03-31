import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Scan, ShieldCheck, AlertCircle, CheckCircle2, XCircle, Loader2, X, LogIn, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ApiError } from '../../lib/api';
import { markAttendance } from '../../lib/attendance';
import { fetchGlobalConfig } from '../../lib/admin';

export default function BiometricTerminal() {
  const [time, setTime] = useState(new Date());
  const [mode, setMode] = useState<'fingerprint' | 'face'>('face');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [showManual, setShowManual] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [manualEntryEnabled, setManualEntryEnabled] = useState(false);
  
  // Manual Entry State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);

  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Poll for terminal configuration updates from Admin
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await fetchGlobalConfig();
        setManualEntryEnabled(config.manualEntryEnabled);
      } catch (err) {
        console.error("Config fetch error", err);
      }
    }
    
    loadConfig();
    const pollInterval = setInterval(loadConfig, 10000); // Re-check every 10 seconds
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const ensureCamera = async () => {
    if (streamRef.current) {
      return streamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
      audio: false,
    });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    return stream;
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      throw new Error('Camera feed is not ready yet.');
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to initialize capture surface.');
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleCancel = () => {
    stopCamera();
    setStatus('idle');
    setFeedback('Scanning cancelled.');
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleScan = async () => {
    setFeedback('');
    setStatus('scanning');

    if (mode === 'fingerprint') {
      setStatus('error');
      setFeedback('Fingerprint hardware is not connected. Use Face ID.');
      setTimeout(() => setStatus('idle'), 2500);
      return;
    }

    try {
      await ensureCamera();
      await new Promise(r => setTimeout(r, 1000));
      const image = captureFrame();
      const result = await markAttendance({ image });

      setStatus('success');
      setFeedback(result.message);
      stopCamera();

      setTimeout(() => {
        navigate('/verification', {
          state: {
            success: true,
            result,
          },
        });
      }, 1500);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      let message = 'Biometric processing failed.';

      if (apiError) {
        if ((apiError.data as any)?.already_marked) {
          message = 'Already marked recently. Please wait a moment.';
        } else {
          message = apiError.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      
      setStatus('error');
      
      if (manualEntryEnabled) {
        setFeedback(`${message} You may use manual entry below.`);
        setShowManual(true); // Show manual entry immediately on error if enabled
      } else {
        setFeedback(`${message}  `);
      }
      
      stopCamera();
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsManualLoading(true);
    setFeedback('');

    try {
      const result = await markAttendance({ 
        image: '', 
        username: username,
        password: password,
        is_manual: true 
      });

      setStatus('success');
      setFeedback(result.message);
      setShowManual(false);

      setTimeout(() => {
        navigate('/verification', {
          state: {
            success: true,
            result,
          },
        });
      }, 1500);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Invalid credentials. Manual entry failed.';
      setFeedback(message);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsManualLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 grid grid-rows-[auto_1fr_auto] overflow-hidden text-white font-sans relative select-none">
      {/* 1. Header */}
      <header className="px-6 py-4 md:px-10 flex items-center justify-between bg-slate-900/60 backdrop-blur-2xl border-b border-white/5 z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none uppercase">HU-IOT</h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1 opacity-80 text-center">Security Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="text-right hidden lg:block border-r border-white/10 pr-10">
            <div className="text-2xl font-mono font-black tracking-tighter text-blue-50">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.22em] mt-0.5 text-center">
              {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="group flex items-center gap-2.5 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black tracking-widest transition-all active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
            STAFF LOGIN
          </button>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-y-6 p-6 z-10 overflow-hidden">
        
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic">Mark Attendance</h2>
          <p className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-center">
            {showManual ? "Credential Verification Required" : `Present ${mode} for Biometric Verification`}
          </p>
        </div>

        {!showManual ? (
          <div className="relative group shrink-0 py-4 scale-95 md:scale-100">
            <div className={cn(
              "absolute inset-[-15px] rounded-full border-2 border-dashed border-blue-500/10",
              status === 'scanning' && "animate-[spin_8s_linear_infinite] border-blue-500/40"
            )}></div>

            <div className="w-60 h-64 md:w-72 md:h-72 rounded-full border-4 border-white/5 flex items-center justify-center relative overflow-hidden bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <AnimatePresence mode="wait">
                {status === 'idle' && (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6">
                    <div className="relative p-4 rounded-full bg-blue-500/5">
                      {mode === 'fingerprint' ? <Fingerprint className="w-20 h-24 text-blue-500/60" /> : <Scan className="w-20 h-24 text-blue-500/60" />}
                    </div>
                    <button onClick={handleScan} className="px-10 py-4 bg-blue-600 hover:bg-blue-50 text-white rounded-full text-xs font-black tracking-[0.2em] transition-all transform active:scale-90 shadow-[0_10px_30px_-10px_rgba(37,99,235,0.5)]">
                      IDENTIFY ME
                    </button>
                  </motion.div>
                )}

                {status === 'scanning' && (
                  <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center">
                    {mode === 'face' && <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-40 grayscale" autoPlay playsinline muted />}
                    <div className="relative z-10 flex flex-col items-center gap-6">
                      <div className="w-20 h-24 border-2 border-white/20 rounded-2xl relative overflow-hidden">
                         <motion.div className="absolute inset-x-0 bg-blue-400 h-1 shadow-[0_0_15px_#60a5fa] z-20" animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
                         {mode === 'fingerprint' ? <Fingerprint className="w-12 h-12 text-white/40" /> : <Scan className="w-12 h-12 text-white/40" />}
                      </div>
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-blue-400 text-[9px] font-black tracking-[0.4em] animate-pulse">ANALYZING...</p>
                        <button onClick={handleCancel} className="px-5 py-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 rounded-full text-[8px] font-black tracking-widest transition-all active:scale-95">STOP SCAN</button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {status === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center"><ShieldCheck className="w-10 h-10 text-white" /></div>
                    <p className="text-emerald-400 font-black text-sm tracking-[0.3em]">VERIFIED</p>
                  </motion.div>
                )}

                {status === 'error' && (
                  <motion.div key="error" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 p-6 text-center">
                    <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center"><XCircle className="w-10 h-10 text-white" /></div>
                    <p className="text-rose-400 font-black text-sm tracking-[0.3em]">DENIED</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-blue-600 rounded-tl-2xl opacity-50"></div>
            <div className="absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 border-blue-600 rounded-tr-2xl opacity-50"></div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 border-blue-600 rounded-bl-2xl opacity-50"></div>
            <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-blue-600 rounded-br-2xl opacity-50"></div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <button onClick={() => { setShowManual(false); setFeedback(''); }} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-600/30 text-blue-400">
                <KeyRound className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tight text-white">Manual Access</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Provide your account credentials</p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Username</span>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-blue-500 focus:bg-white/10 transition-all font-bold text-white placeholder:text-slate-700" placeholder="Enter username" />
              </div>
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-blue-500 focus:bg-white/10 transition-all font-bold text-white placeholder:text-slate-700" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={isManualLoading} className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-500 hover:text-white transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3">
                {isManualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "EXECUTE ENTRY"}
              </button>
            </form>
          </motion.div>
        )}

        {/* 3. Controls Area */}
        <div className="w-full max-w-sm flex flex-col items-center gap-6 shrink-0">
          {!showManual && (
            <div className="flex gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/5 shrink-0">
              <button disabled={status === 'scanning'} onClick={() => { setMode('fingerprint'); setFeedback(''); }} className={cn("px-6 py-3 rounded-xl text-[9px] font-black tracking-[0.2em] transition-all", mode === 'fingerprint' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}>FINGERPRINT</button>
              <button disabled={status === 'scanning'} onClick={() => { setMode('face'); setFeedback(''); }} className={cn("px-6 py-3 rounded-xl text-[9px] font-black tracking-[0.2em] transition-all", mode === 'face' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}>FACE SCAN</button>
            </div>
          )}

          {feedback && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("w-full py-3.5 px-6 rounded-2xl border text-[10px] font-black uppercase tracking-widest text-center leading-relaxed shadow-lg shadow-black/20", status === 'error' ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300")}>
              {feedback}
            </motion.div>
          )}

          {!showManual && manualEntryEnabled && (
            <button onClick={() => { setShowManual(true); setFeedback(''); }} className="text-slate-600 hover:text-blue-400 text-[9px] font-black uppercase tracking-[0.3em] transition-all underline underline-offset-8 decoration-white/10 hover:decoration-blue-400">
              [ Manual Identity Access ]
            </button>
          )}
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="px-6 py-4 flex justify-center items-center gap-12 text-[8px] font-black tracking-[0.3em] text-slate-700 border-t border-white/5 bg-slate-950/40 shrink-0">
        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div> CORE SECURE ACTIVE</div>
        <div className="hidden sm:block uppercase">Node ID: HU-IOT-001</div>
      </footer>

      {/* Utilities */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
