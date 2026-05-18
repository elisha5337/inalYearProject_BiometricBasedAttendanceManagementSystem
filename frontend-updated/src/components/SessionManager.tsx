import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { fetchGlobalConfig } from '../lib/admin';
import { cn } from '../lib/utils';

interface SessionManagerProps {
  onLogout: () => void;
  userRole: string;
}

export default function SessionManager({ onLogout, userRole }: SessionManagerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalTimeout, setTotalTimeout] = useState<number>(60); // minutes
  const [isWarning, setIsWarning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (totalTimeout > 0) {
      setTimeLeft(totalTimeout * 60);
      setIsWarning(false);
    }
  }, [totalTimeout]);

  // Load configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await fetchGlobalConfig();
        const minutes = config.sessionTimeoutMinutes || 60;
        setTotalTimeout(minutes);
        setTimeLeft(minutes * 60);
      } catch (error) {
        console.error('Failed to load session configuration', error);
        setTotalTimeout(60);
        setTimeLeft(3600);
      }
    }
    loadConfig();
  }, []);

  // Listen for activity
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      // Throttle activity resets to once every 2 seconds
      if (!activityTimeoutRef.current) {
        resetTimer();
        activityTimeoutRef.current = setTimeout(() => {
          activityTimeoutRef.current = null;
        }, 2000);
      }
    };

    activityEvents.forEach(event => window.addEventListener(event, handleActivity));
    
    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    };
  }, [resetTimer]);

  // Countdown logic
  useEffect(() => {
    if (timeLeft === null) return;

    if (timeLeft <= 0) {
      onLogout();
      return;
    }

    // Warn in the last 2 minutes or 20% of time
    const warningThreshold = Math.min(120, totalTimeout * 60 * 0.2);
    if (timeLeft <= warningThreshold && !isWarning) {
      setIsWarning(true);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, onLogout, isWarning, totalTimeout]);

  if (timeLeft === null || timeLeft > 300) return null; // Only show if < 5 mins left or if warning active

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <AnimatePresence>
      {timeLeft > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn(
            "fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-1 rounded-3xl border shadow-2xl backdrop-blur-xl transition-all duration-500",
            isWarning 
              ? "bg-rose-50/90 border-rose-200 text-rose-700 shadow-rose-200/50" 
              : "bg-slate-900/90 border-slate-700 text-white shadow-slate-900/40"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-2xl flex items-center justify-center shrink-0",
            isWarning ? "bg-rose-600 text-white animate-pulse" : "bg-indigo-600 text-white"
          )}>
            {isWarning ? <AlertTriangle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          </div>

          <div className="flex flex-col">
            <p className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em]",
              isWarning ? "text-rose-500" : "text-slate-400"
            )}>
              {isWarning ? "Security Warning" : "Session Identity"}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tabular-nums tracking-tighter">
                {timeString}
              </span>
              <span className="text-[10px] font-bold opacity-60 uppercase">remaining</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 ml-2">
             <button 
                onClick={resetTimer}
                className={cn(
                  "p-2 rounded-xl border transition-all hover:scale-105 active:scale-95",
                  isWarning 
                    ? "bg-rose-600 border-rose-500 text-white hover:bg-rose-700" 
                    : "bg-white/10 border-white/10 text-white hover:bg-white/20"
                )}
                title="Stay Signed In"
             >
               <RefreshCw className="w-4 h-4" />
             </button>
             <button 
                onClick={onLogout}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all hover:scale-105 active:scale-95"
                title="Sign Out Now"
             >
               <LogOut className="w-4 h-4" />
             </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
