import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Scan, ShieldCheck, AlertCircle, CheckCircle2, XCircle, Loader2, Smartphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ApiError } from '../../lib/api';
import { markAttendance } from '../../lib/attendance';

type BiometricMode = 'fingerprint' | 'face';
type StatusState = 'idle' | 'scanning' | 'success' | 'error';

export default function BiometricTerminal() {
  const [mode, setMode] = useState<BiometricMode>('face');
  const [status, setStatus] = useState<StatusState>('idle');
  const [showManual, setShowManual] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [time, setTime] = useState(new Date());
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);

  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Time update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cleanup camera
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    stopCamera();
    setStatus('idle');
    setFeedback('Scanning cancelled.');
    setTimeout(() => setFeedback(''), 3000);
  }, [stopCamera]);

  const initializeCamera = useCallback(async () => {
    if (streamRef.current) return streamRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 }
    });

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    return stream;
  }, []);

  const captureFrame = useCallback((): string => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      throw new Error('Camera not ready');
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot capture');

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  const handleScan = useCallback(async () => {
    setFeedback('');
    setStatus('scanning');

    if (mode === 'fingerprint') {
      setStatus('error');
      setFeedback('Fingerprint hardware not available. Use Face ID.');
      setTimeout(() => setStatus('idle'), 2500);
      return;
    }

    try {
      await initializeCamera();
      // Brief delay to allow camera to warm up/focus
      await new Promise(resolve => setTimeout(resolve, 1000));
      const image = captureFrame();
      const result = await markAttendance({ image });

      setStatus('success');
      setFeedback(result.message);
      stopCamera();
      setTimeout(() => {
        navigate('/verification', { state: { success: true, result } });
      }, 1500);
    } catch (error) {
      const message = error instanceof ApiError ? error.message :
                      error instanceof Error ? error.message :
                      'Attendance failed. Please try again.';
      setStatus('error');
      setFeedback(message);
      stopCamera();
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [mode, initializeCamera, captureFrame, navigate, stopCamera]);

  const handleManualSubmit = () => {
    setIsManualLoading(true);
    setTimeout(() => {
      setIsManualLoading(false);
      alert('Manual attendance coming soon. Use Face ID.');
    }, 1000);
  };

  const renderCaptureContent = () => {
    const Icon = mode === 'fingerprint' ? Fingerprint : Scan;

    switch (status) {
      case 'idle':
        return (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4">
            <Icon className="w-32 h-32 text-blue-500 animate-pulse" />
            <button onClick={handleScan} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-bold transition-all shadow-lg">
              START SCAN
            </button>
          </motion.div>
        );
      case 'scanning':
        return (
          <motion.div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-full">
             {/* Live Camera Feed shown within the circle during scanning */}
             <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />

            {/* Overlay UI elements on top of the video */}
            <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <Icon className="w-32 h-32 text-white/50" />
                <motion.div className="absolute inset-0 bg-gradient-to-t from-blue-400/40 to-transparent"
                  animate={{ y: ['0%', '100%', '0%'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ height: '50%' }} />
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <p className="text-white text-xs font-bold">CAPTURING...</p>
                </div>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-all shadow-lg"
                >
                  <X className="w-3.5 h-3.5" />
                  CANCEL
                </button>
              </div>
            </div>
          </motion.div>
        );
      case 'success':
        return (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
            <p className="text-green-400 font-bold text-xl">VERIFIED</p>
          </motion.div>
        );
      case 'error':
        return (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
              <XCircle className="w-16 h-16 text-white" />
            </div>
            <p className="text-red-400 font-bold text-xl">FAILED</p>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4 text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Fingerprint className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold">HU-IOT</h1>
        </div>
        <button onClick={() => navigate('/login')} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold">
          STAFF LOGIN
        </button>
        <div className="text-right hidden sm:block">
          <div className="text-lg font-mono font-bold">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-xs text-slate-400">{time.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-lg flex flex-col items-center gap-6 mt-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Mark Attendance</h2>
          <p className="text-slate-400 mt-1">Present your {mode === 'face' ? 'face' : 'fingerprint'}</p>
        </div>

        {/* Capture Circle */}
        <div className="relative">
          <div className="w-72 h-72 rounded-full border-4 border-white/20 flex items-center justify-center bg-slate-800/50 backdrop-blur-sm overflow-hidden">
            <AnimatePresence mode="wait">
              {renderCaptureContent()}
            </AnimatePresence>
          </div>
          {/* Corners */}
          {['-top-2 -left-2 border-t-4 border-l-4', '-top-2 -right-2 border-t-4 border-r-4',
            '-bottom-2 -left-2 border-b-4 border-l-4', '-bottom-2 -right-2 border-b-4 border-r-4'
          ].map((pos, i) => (
            <div key={i} className={`absolute w-6 h-6 border-blue-500 rounded-lg ${pos}`} />
          ))}
        </div>

        {/* Mode Selector */}
        <div className="flex gap-3 bg-slate-800/50 p-1.5 rounded-xl">
          {[
            { id: 'fingerprint' as const, icon: Fingerprint, label: 'FINGERPRINT' },
            { id: 'face' as const, icon: Scan, label: 'FACE ID' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all",
                mode === id ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>

        {/* Feedback Message */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "w-full rounded-xl border px-4 py-2.5 text-sm text-center flex items-center gap-2 justify-center",
                status === 'error' ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-green-500/30 bg-green-500/10 text-green-100"
              )}
            >
              {status === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual Attendance Toggle */}
        <div className="w-full text-center">
          <button onClick={() => setShowManual(!showManual)} className="text-slate-500 hover:text-blue-400 text-sm underline flex items-center gap-2 mx-auto">
            <Smartphone className="w-4 h-4" />
            Having trouble? Use Employee ID
          </button>

          <AnimatePresence>
            {showManual && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="mt-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
                  <input type="text" placeholder="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                    className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1" />
                  <input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)}
                    className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-24" />
                  <button onClick={handleManualSubmit} disabled={isManualLoading || !employeeId || !pin}
                    className="bg-blue-600 px-6 py-2 rounded-lg font-bold disabled:opacity-50">
                    {isManualLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'GO'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-3 flex gap-4 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          ONLINE
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" />
          SECURE
        </div>
      </div>

      {/* Internal helper canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}