import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Scan, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ApiError } from '../../lib/api';
import { markAttendance } from '../../lib/attendance';

export default function BiometricTerminal() {
  const [time, setTime] = useState(new Date());
  const [mode, setMode] = useState<'fingerprint' | 'face'>('face');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [showManual, setShowManual] = useState(false);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

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
      throw new Error('Camera feed is not ready yet. Please allow camera access and try again.');
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

  const handleScan = async () => {
    setFeedback('');
    setStatus('scanning');

    if (mode === 'fingerprint') {
      setStatus('error');
      setFeedback('Fingerprint hardware is not connected to the current backend yet. Please use Face ID.');
      setTimeout(() => setStatus('idle'), 2500);
      return;
    }

    try {
      await ensureCamera();
      const image = captureFrame();
      const result = await markAttendance({ image });

      setStatus('success');
      setFeedback(result.message);

      setTimeout(() => {
        navigate('/verification', {
          state: {
            success: true,
            result,
          },
        });
      }, 1500);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unable to complete biometric attendance right now.';

      setStatus('error');
      setFeedback(message);
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 md:p-6 text-white font-sans relative overflow-x-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-8 flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 backdrop-blur-md border-b border-white/10 gap-4 sm:gap-0">
        <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Fingerprint className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">HU-IOT TERMINAL</h1>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] md:text-xs font-bold transition-all"
          >
            STAFF LOGIN
          </button>
        </div>
        <div className="text-center sm:text-right hidden sm:block">
          <div className="text-xl md:text-2xl font-mono font-bold">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div className="text-xs md:text-sm text-slate-400">{time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* Main Capture Area */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-8 md:gap-12 mt-20 sm:mt-0">
        <div className="text-center space-y-2 md:space-y-4">
          <h2 className="text-2xl md:text-4xl font-bold">Mark Your Attendance</h2>
          <p className="text-slate-400 text-base md:text-lg">Please present your {mode} for verification</p>
        </div>

        <div className="relative group">
          {/* Framing Guide */}
          <div className="w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-white/20 flex items-center justify-center relative overflow-hidden bg-slate-800/50 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {status === 'idle' && (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-4"
                >
                  {mode === 'fingerprint' ? (
                    <Fingerprint className="w-32 h-32 text-blue-500 animate-pulse" />
                  ) : (
                    <Scan className="w-32 h-32 text-blue-500 animate-pulse" />
                  )}
                  <button 
                    onClick={handleScan}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-bold transition-all transform active:scale-95 shadow-lg shadow-blue-600/20"
                  >
                    START SCAN
                  </button>
                </motion.div>
              )}

              {status === 'scanning' && (
                <motion.div 
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="relative">
                    {mode === 'fingerprint' ? (
                      <Fingerprint className="w-32 h-32 text-blue-400" />
                    ) : (
                      <Scan className="w-32 h-32 text-blue-400" />
                    )}
                    <motion.div 
                      className="absolute inset-0 bg-blue-400/20"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      style={{ height: '2px', width: '100%' }}
                    />
                  </div>
                  <p className="text-blue-400 font-mono animate-pulse">CAPTURING DATA...</p>
                </motion.div>
              )}

              {status === 'success' && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-green-400 font-bold text-xl">VERIFIED</p>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-red-400 font-bold text-xl">FAILED</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Corner Accents */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
          <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
        </div>

        {/* Mode Selector */}
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-800/50 p-2 rounded-2xl border border-white/5 w-full sm:w-auto">
          <button 
            onClick={() => setMode('fingerprint')}
            className={cn(
              "flex items-center justify-center sm:justify-start gap-3 px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold transition-all w-full sm:w-auto",
              mode === 'fingerprint' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white"
            )}
          >
            <Fingerprint className="w-5 h-5 md:w-6 md:h-6" />
            FINGERPRINT
          </button>
          <button 
            onClick={() => setMode('face')}
            className={cn(
              "flex items-center justify-center sm:justify-start gap-3 px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold transition-all w-full sm:w-auto",
              mode === 'face' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white"
            )}
          >
            <Scan className="w-5 h-5 md:w-6 md:h-6" />
            FACE ID
          </button>
        </div>

        {feedback && (
          <div
            className={cn(
              "w-full max-w-xl rounded-2xl border px-4 py-3 text-sm text-center",
              status === 'error'
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-green-500/30 bg-green-500/10 text-green-100"
            )}
          >
            {feedback}
          </div>
        )}

        {/* Fallback */}
        <div className="text-center w-full">
          <button 
            onClick={() => setShowManual(!showManual)}
            className="text-slate-500 hover:text-blue-400 text-sm font-medium underline underline-offset-4 transition-colors"
          >
            Having trouble? Use Employee ID
          </button>
          
          <AnimatePresence>
            {showManual && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-6 space-y-4 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
                  <input 
                    type="text" 
                    placeholder="Employee ID" 
                    className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1"
                  />
                  <input 
                    type="password" 
                    placeholder="Pin" 
                    className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-24"
                  />
                  <button
                    onClick={() => setFeedback('Manual PIN attendance is not connected to a backend endpoint yet. Use Face ID or ask HR to create a manual attendance record.')}
                    className="bg-blue-600 px-6 py-2 rounded-lg font-bold"
                    type="button"
                  >
                    GO
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Status */}
      <div className="absolute bottom-4 md:bottom-8 flex flex-wrap justify-center items-center gap-4 md:gap-6 text-[10px] md:text-xs font-mono text-slate-500 px-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          SYSTEM ONLINE
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          SECURE CONNECTION
        </div>
        <div className="hidden sm:block">HU-IOT-TERM-001</div>
      </div>

      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
