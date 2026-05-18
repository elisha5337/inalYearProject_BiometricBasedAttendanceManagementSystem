import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scan, CheckCircle2, XCircle, Loader2, X, KeyRound, Camera, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ApiError } from '../../lib/api';
import { markAttendance } from '../../lib/attendance';
import { fetchGlobalConfig } from '../../lib/admin';
import { useTheme } from '../../context/ThemeContext';

const playBeep = (type: 'success' | 'error') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Ignore audio errors silently
  }
};

export default function BiometricTerminal() {
  const [time, setTime] = useState(new Date());
  const [mode, setMode] = useState<'fingerprint' | 'face'>('face');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [showManual, setShowManual] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [manualEntryEnabled, setManualEntryEnabled] = useState(false);
  const { isDarkMode } = useTheme();
  
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
      playBeep('error');
      setStatus('error');
      setFeedback('FINGERPRINT OFFLINE. PLEASE USE FACE SCAN.');
      setTimeout(() => setStatus('idle'), 2500);
      return;
    }
    try {
      await ensureCamera();
      await new Promise(r => setTimeout(r, 1200)); 
      const image = captureFrame();
      const result = await markAttendance({ image });
      playBeep('success');
      setStatus('success');
      setFeedback(result.message);
      stopCamera();
      setTimeout(() => {
        navigate('/verification', { state: { success: true, result } });
      }, 1200);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Biometric Error';
      playBeep('error');
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
      playBeep('success');
      setStatus('success');
      setFeedback(result.message);
      setShowManual(false);
      setTimeout(() => {
        navigate('/verification', { state: { success: true, result } });
      }, 1200);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Manual login failed.';
      playBeep('error');
      setFeedback(message);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsManualLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col font-sans relative bg-surface-bg text-surface-text transition-colors duration-500 overflow-hidden pt-20">
      {/* Texture Layer */}
      <div className="fixed inset-0 z-0 opacity-[0.05] dark:opacity-[0.02] pointer-events-none" 
            style={{ backgroundImage: `radial-gradient(#4f46e5 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      {isDarkMode && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none"></div>
      )}
      
      {/* Home Button */}
      <button 
        onClick={() => navigate('/login')}
        title="Return to Login"
        className="absolute top-6 right-6 md:top-8 md:right-8 z-50 px-6 py-3.5 rounded-2xl bg-surface-card/80 backdrop-blur-md border border-surface-border text-surface-muted hover:text-indigo-600 hover:border-indigo-500/30 shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-3 group cursor-pointer"
      >
        <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] mt-0.5">Home</span>
      </button>

      {/* Main Terminal Body */}
      <main className="flex-1 flex flex-col items-center justify-between py-4 px-4 relative z-10 w-full overflow-hidden">
        
        {/* Header Column */}
        <div className="text-center space-y-2 mt-2 shrink-0">

          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 dark:text-indigo-400 mb-1">Mark Attendance.</h3>

        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full relative">
          {!showManual ? (
            <div className="relative group p-4 transition-all duration-700 h-full max-h-[50vh] md:max-h-[58vh] aspect-square flex items-center justify-center">
              {/* Scanner Frame Decor */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-indigo-600 rounded-tl-3xl z-20" />
              <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-indigo-600 rounded-tr-3xl z-20" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-indigo-600 rounded-bl-3xl z-20" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-indigo-600 rounded-br-3xl z-20" />

              <div className="w-full h-full rounded-[3.5rem] border-2 border-surface-border bg-surface-card overflow-hidden relative shadow-2xl transition-all duration-700">
                <AnimatePresence mode="wait">
                  {status === 'idle' && (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-10 text-center p-12">
                      <div className="p-10 rounded-full border-2 border-surface-border bg-surface-accent transition-colors shadow-inner">
                        <Scan className="w-16 h-16 md:w-24 md:h-24 text-indigo-600" />
                      </div>
                      <button 
                           onClick={handleScan} 
                           className="px-12 py-5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all transform active:scale-95 shadow-lg shadow-indigo-900/30 hover:bg-indigo-700"
                      >
                        START SCAN
                      </button>
                    </motion.div>
                  )}

                  {status === 'scanning' && (
                    <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-10" autoPlay playsInline muted />
                      <div className="absolute inset-0 bg-indigo-900/10 mix-blend-overlay z-15" />
                      <div className="absolute inset-0 border-[20px] border-surface-bg/60 z-20 pointer-events-none transition-colors" />
                      <motion.div 
                        className="absolute inset-x-0 h-1.5 bg-indigo-400 shadow-[0_0_40px_#818cf8] z-30 opacity-80"
                        animate={{ top: ['10%', '90%', '10%'] }} 
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
                      />
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4 w-full px-6">
                        <div className="px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black tracking-[0.3em] animate-pulse shadow-lg uppercase">Scanning...</div>
                        <button onClick={() => { stopCamera(); setStatus('idle'); }} className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-md px-6 py-2 rounded-full hover:bg-rose-600 transition-colors uppercase tracking-widest border border-white/10">Cancel</button>
                      </div>
                    </motion.div>
                  )}

                  {status === 'success' && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-emerald-500 z-50 flex flex-col items-center justify-center gap-6 text-white p-10 text-center">
                      <CheckCircle2 className="w-24 h-24" />
                      <div>
                          <p className="font-black text-3xl tracking-tighter uppercase mb-2">Success</p>
                          <p className="font-bold text-[11px] uppercase tracking-widest opacity-90">Session Logged</p>
                      </div>
                    </motion.div>
                  )}

                  {status === 'error' && (
                    <motion.div key="error" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-rose-600 z-50 flex flex-col items-center justify-center gap-6 text-white p-10 text-center">
                      <XCircle className="w-24 h-24" />
                      <div>
                          <p className="font-black text-3xl tracking-tighter uppercase mb-2">Failed</p>
                          <p className="font-bold text-[11px] uppercase tracking-widest opacity-90 text-rose-100">{feedback || "Mismatch"}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md border-2 border-surface-border rounded-[3.5rem] p-10 backdrop-blur-3xl shadow-2xl relative bg-surface-card text-surface-text mx-4">
              <button onClick={() => setShowManual(false)} className="absolute top-8 right-8 p-3 text-surface-muted hover:text-rose-500 transition-colors"><X className="w-7 h-7" /></button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-600/10 rounded-[28px] flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 text-indigo-600"><KeyRound className="w-8 h-8" /></div>
                <h3 className="text-2xl font-black uppercase text-surface-text">Manual Login</h3>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="space-y-2 text-left">
                  <label className="text-[11px] font-black uppercase tracking-widest text-surface-muted ml-5">User ID</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border-2 border-surface-border bg-surface-bg/50 rounded-2xl px-5 py-4.5 text-base outline-none focus:border-indigo-500 transition-all font-bold text-surface-text" placeholder="ID Number" />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[11px] font-black uppercase tracking-widest text-surface-muted ml-5">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-2 border-surface-border bg-surface-bg/50 rounded-2xl px-5 py-4.5 text-base outline-none focus:border-indigo-500 transition-all font-bold text-surface-text" placeholder="••••••••" />
                </div>
                <button disabled={isManualLoading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] transition-all shadow-2xl shadow-indigo-900/50 flex items-center justify-center gap-5 hover:bg-indigo-700">
                  {isManualLoading ? <Loader2 className="w-8 h-8 animate-spin text-white" /> : "LOG IN"}
                </button>
              </form>
            </motion.div>
          )}
        </div>

        {/* Feedback / Log Area */}
        <div className="h-10 flex items-center justify-center mb-1 shrink-0">
          <AnimatePresence>
            {feedback && status !== 'success' && status !== 'error' && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn(
                "py-2 px-8 rounded-full border text-[10px] font-black uppercase tracking-[0.3em] text-center shadow-lg backdrop-blur-md",
                status === 'error' ? "border-rose-500/20 bg-rose-500/10 text-rose-500" : "border-indigo-500/20 bg-indigo-500/10 text-indigo-600"
              )}>
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Terminal Footer */}
      <footer className="w-full px-8 py-4 border-t border-surface-border bg-surface-card/40 backdrop-blur-3xl z-30 flex flex-col sm:flex-row justify-between items-center gap-6 transition-colors shrink-0">
        <div className="flex gap-4">
          <button disabled={status === 'scanning'} onClick={() => setMode('face')} className={cn("px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all", mode === 'face' ? "bg-indigo-600 text-white shadow-lg" : "bg-surface-accent text-surface-muted hover:text-surface-text")}>FACE SCAN</button>
          <button disabled={status === 'scanning'} onClick={() => setMode('fingerprint')} className={cn("px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all", mode === 'fingerprint' ? "bg-indigo-600 text-white shadow-lg" : "bg-surface-accent text-surface-muted hover:text-surface-text")}>FINGERPRINT</button>
        </div>

        <div className="flex items-center gap-10 text-[10px] font-black tracking-[0.4em] text-surface-muted">
          <p className="text-2xl font-mono text-surface-text leading-none">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</p>
          <div className="flex items-center gap-4 uppercase">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_#10b981]" /> 
            ACTIVE
          </div>
        </div>

        {manualEntryEnabled && !showManual && (
          <button onClick={() => setShowManual(true)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 text-[10px] font-black uppercase tracking-widest transition-all underline underline-offset-8 decoration-2">
            Manual Login
          </button>
        )}
      </footer>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}