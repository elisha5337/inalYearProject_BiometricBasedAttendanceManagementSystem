import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Scan, ShieldCheck, CheckCircle2, XCircle, Loader2, X, LogIn, KeyRound, Clock, Camera, MonitorSmartphone, Sun, Moon } from 'lucide-react';
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);

  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    const pollInterval = setInterval(loadConfig, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => stopCamera();
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
    if (streamRef.current) return streamRef.current;
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
    if (!video || !canvas || video.readyState < 2) throw new Error('Camera feed is not ready.');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Capture failure.');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleScan = async () => {
    setFeedback('');
    setStatus('scanning');
    if (mode === 'fingerprint') {
      setStatus('error');
      setFeedback('FINGERPRINT HARDWARE OFFLINE. USE FACIAL ID.');
      setTimeout(() => setStatus('idle'), 2500);
      return;
    }
    try {
      await ensureCamera();
      await new Promise(r => setTimeout(r, 1200)); 
      const image = captureFrame();
      const result = await markAttendance({ image });
      setStatus('success');
      setFeedback(result.message);
      stopCamera();
      setTimeout(() => {
        navigate('/verification', { state: { success: true, result } });
      }, 1200);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'BIOMETRIC ERROR';
      setStatus('error');
      setFeedback(message.toUpperCase());
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
        navigate('/verification', { state: { success: true, result } });
      }, 1200);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Manual entry failed.';
      setFeedback(message);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsManualLoading(false);
    }
  };

  return (
    <div className={cn(
      "h-screen w-screen flex flex-col overflow-hidden font-sans relative transition-colors duration-500",
      isDarkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    )}>
      {isDarkMode && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none"></div>
      )}
      
      {/* 1. Compact Header */}
      <header className={cn(
        "px-6 py-4 flex items-center justify-between border-b backdrop-blur-md z-30 transition-all shrink-0",
        isDarkMode ? "bg-slate-900/40 border-white/5" : "bg-white/80 border-slate-200 shadow-sm"
      )}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg border border-blue-400/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none uppercase">HU-IOT SECURITY</h1>
            <div className="flex items-center gap-2 mt-1 text-[9px] font-black uppercase tracking-widest">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>HU-001 // ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              "p-2 rounded-lg border transition-all active:scale-95 flex items-center justify-center",
              isDarkMode ? "bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-blue-600 hover:bg-slate-200 shadow-sm"
            )}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className={cn("text-right hidden sm:block border-r pr-4 transition-colors", isDarkMode ? "border-white/10" : "border-slate-200")}>
            <div className={cn("text-xl font-mono font-black tracking-tighter", isDarkMode ? "text-blue-100" : "text-blue-900")}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </div>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all active:scale-95 flex items-center gap-2",
              isDarkMode ? "bg-white/5 border border-white/10" : "bg-slate-900 text-white shadow-md"
            )}
          >
            <LogIn className="w-3 h-3" />
            STAFF PORTAL
          </button>
        </div>
      </header>

      {/* 2. Compact Workspace */}
      <main className="flex-1 min-h-0 p-4 md:p-8 relative z-10 flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center h-full max-h-[600px]">
          
          <div className="space-y-6 text-center lg:text-left flex flex-col justify-center shrink-0">
            <div className="space-y-2">
              <h2 className={cn("text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-none", isDarkMode ? "text-white" : "text-slate-900")}>
                Biometric <br className="hidden lg:block" />Verification
              </h2>
              <p className="text-blue-600 font-black text-xs uppercase tracking-[0.3em]">Hawassa University IoT</p>
            </div>

            <div className="grid gap-3 max-w-md mx-auto lg:mx-0">
              <div className={cn(
                "p-4 rounded-xl border flex items-center gap-4 transition-colors",
                isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"
              )}>
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4 text-blue-600" />
                </div>
                <p className={cn("text-[10px] font-bold uppercase leading-tight text-left", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                  Center face in the <span className={isDarkMode ? "text-white" : "text-blue-900"}>scanning zone</span>
                </p>
              </div>
              <div className={cn(
                "p-4 rounded-xl border flex items-center gap-4 transition-colors",
                isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"
              )}>
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                  <MonitorSmartphone className="w-4 h-4 text-blue-600" />
                </div>
                <p className={cn("text-[10px] font-bold uppercase leading-tight text-left", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                  Wait for <span className={isDarkMode ? "text-white" : "text-blue-900"}>confirmation</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center min-h-0 w-full">
            {!showManual ? (
              <div className="relative group p-4 scale-90 md:scale-100 transition-transform">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-blue-600 rounded-tl-2xl z-20"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-blue-600 rounded-tr-2xl z-20"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-blue-600 rounded-bl-2xl z-20"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-blue-600 rounded-br-2xl z-20"></div>

                <div className={cn(
                  "w-64 h-64 md:w-80 md:h-80 lg:w-[22rem] lg:h-[22rem] rounded-[2rem] border-2 overflow-hidden relative shadow-2xl transition-all duration-500",
                  isDarkMode ? "bg-slate-900 border-white/10" : "bg-slate-200 border-white"
                )}>
                  <AnimatePresence mode="wait">
                    {status === 'idle' && (
                      <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                        <div className={cn("p-6 rounded-full border transition-colors", isDarkMode ? "bg-blue-600/10 border-blue-500/20" : "bg-white border-slate-200 shadow-inner")}>
                          <Scan className="w-16 h-16 text-blue-600" />
                        </div>
                        <button onClick={handleScan} className={cn(
                          "px-8 py-4 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all transform active:scale-95 shadow-lg",
                          isDarkMode ? "bg-blue-600 text-white hover:bg-white hover:text-blue-600" : "bg-slate-900 text-white hover:bg-blue-600 shadow-slate-400/20"
                        )}>
                          INITIATE IDENTITY SCAN
                        </button>
                      </motion.div>
                    )}

                    {status === 'scanning' && (
                      <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-10" autoPlay playsInline muted />
                        <div className={cn("absolute inset-0 border-[15px] z-20 pointer-events-none transition-colors", isDarkMode ? "border-slate-950/40" : "border-white/40")}></div>
                        <motion.div 
                          className="absolute inset-x-0 h-0.5 bg-blue-400 shadow-[0_0_15px_#60a5fa] z-30"
                          animate={{ top: ['10%', '90%', '10%'] }} 
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }} 
                        />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
                          <div className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[8px] font-black tracking-[0.3em] animate-pulse shadow-lg uppercase">Analyzing...</div>
                          <button onClick={() => { stopCamera(); setStatus('idle'); }} className="text-[8px] font-bold text-white bg-black/60 px-3 py-1 rounded-full hover:bg-rose-600 transition-colors uppercase tracking-widest">Cancel</button>
                        </div>
                      </motion.div>
                    )}

                    {status === 'success' && (
                      <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-emerald-500 z-50 flex flex-col items-center justify-center gap-3">
                        <CheckCircle2 className="w-16 h-16 text-white" />
                        <p className="text-white font-black text-sm tracking-[0.3em] uppercase italic text-center">Identity Confirmed</p>
                      </motion.div>
                    )}

                    {status === 'error' && (
                      <motion.div key="error" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-rose-600 z-50 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                        <XCircle className="w-16 h-16" />
                        <p className="font-black text-sm tracking-[0.3em] uppercase italic">Access Denied</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={cn(
                "w-full max-w-sm border rounded-[2rem] p-6 backdrop-blur-xl shadow-2xl relative",
                isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
              )}>
                <button onClick={() => setShowManual(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-blue-500/20 text-blue-600"><KeyRound className="w-6 h-6" /></div>
                  <h3 className="text-lg font-black uppercase italic tracking-tight">Manual Bypass</h3>
                </div>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Username</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={cn(
                      "w-full border rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500 transition-all font-bold",
                      isDarkMode ? "bg-white/5 border-white/10 text-white focus:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-900"
                    )} placeholder="Employee ID" />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={cn(
                      "w-full border rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500 transition-all font-bold",
                      isDarkMode ? "bg-white/5 border-white/10 text-white focus:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-900"
                    )} placeholder="••••••••" />
                  </div>
                  <button disabled={isManualLoading} className={cn(
                    "w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-3",
                    isDarkMode ? "bg-white text-slate-950 hover:bg-blue-600 hover:text-white" : "bg-slate-900 text-white hover:bg-blue-700"
                  )}>
                    {isManualLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : "EXECUTE VERIFICATION"}
                  </button>
                </form>
              </motion.div>
            )}
          </div>
        </div>

        <div className="mt-4 w-full max-w-lg shrink-0 h-12 flex items-center justify-center">
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn(
                "py-2.5 px-6 rounded-xl border text-[9px] font-black uppercase tracking-[0.1em] text-center shadow-lg backdrop-blur-md leading-relaxed",
                status === 'error' ? "border-rose-500/20 bg-rose-500/10 text-rose-500" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
              )}>
                SYSTEM STATUS: {feedback}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 3. Compact Footer */}
      <footer className={cn(
        "px-8 py-4 border-t z-30 flex flex-wrap justify-between items-center gap-4 transition-colors shrink-0",
        isDarkMode ? "bg-slate-950 border-white/5" : "bg-white border-slate-200"
      )}>
        <div className="flex gap-3">
          <button disabled={status === 'scanning'} onClick={() => setMode('face')} className={cn("px-4 py-2 rounded-lg text-[8px] font-black tracking-widest transition-all", mode === 'face' ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : isDarkMode ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-400 shadow-inner")}>FACIAL ID</button>
          <button disabled={status === 'scanning'} onClick={() => setMode('fingerprint')} className={cn("px-4 py-2 rounded-lg text-[8px] font-black tracking-widest transition-all", mode === 'fingerprint' ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : isDarkMode ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-400 shadow-inner")}>FINGERPRINT</button>
        </div>

        <div className="flex items-center gap-6 text-[8px] font-black tracking-[0.2em] text-slate-500">
          <div className="flex items-center gap-2 uppercase">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div> 
            HU-IOT CORE TERMINAL
          </div>
        </div>

        {manualEntryEnabled && !showManual && (
          <button onClick={() => setShowManual(true)} className="text-blue-600 hover:text-blue-800 text-[8px] font-black uppercase tracking-widest transition-all underline underline-offset-4">
            MANUAL OVERRIDE
          </button>
        )}
      </footer>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
