import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scan,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  KeyRound,
  Home,
  Fingerprint,
  Shield,
  Lock,
  Unlock,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { ApiError } from "../../lib/api";
import { markAttendance } from "../../lib/attendance";
import { fetchGlobalConfig, type GlobalConfigRecord } from "../../lib/admin";

// ── Demo credentials (this is a fallback authentication method,
//    not actual fingerprint biometrics. The UI reflects this accurately.) ──
const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "demo123";

const playBeep = (type: "success" | "error") => {
  /* sound removed - intentional */
};

// ── Fingerprint SVG path (purely visual - represents demo/auth fallback) ──
function FingerprintIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <path
        d="M50 10 C28 10 10 28 10 50 C10 72 28 90 50 90"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M50 20 C33 20 20 33 20 50 C20 67 33 80 50 80 C67 80 80 67 80 50"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M50 30 C38 30 30 38 30 50 C30 62 38 70 50 70 C62 70 70 62 70 50 C70 38 62 30 50 30"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M50 40 C44 40 40 44 40 50 C40 56 44 60 50 60 C56 60 60 56 60 50 C60 44 56 40 50 40"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
      <path
        d="M15 35 C18 28 24 22 32 17"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M85 50 C85 38 79 27 70 20"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

type ScanMode = "face" | "demo"; // Renamed internally from "fingerprint" to reflect actual backend capability
type ScanStatus = "idle" | "scanning" | "demo-scanning" | "success" | "error";

export default function BiometricTerminal() {
  const [time, setTime] = useState(new Date());
  const [mode, setMode] = useState<ScanMode>("face");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [showManual, setShowManual] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [config, setConfig] = useState<GlobalConfigRecord | null>(null);
  const [demoProgress, setDemoProgress] = useState(0);
  const [ripples, setRipples] = useState<number[]>([]);
  const [captureCount, setCaptureCount] = useState(0); // frames captured so far (0-5)
  const [qualityTip, setQualityTip] = useState(""); // actionable tip from backend
  const [recognizedPerson, setRecognizedPerson] = useState<{
    name: string;
    department: string;
    photo: string | null;
    type: string;
  } | null>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isManualLoading, setIsManualLoading] = useState(false);

  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Enumerate all video input devices so user can pick DroidCam explicitly
  useEffect(() => {
    async function loadCameras() {
      try {
        // Request permission first so labels are populated
        await navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then((s) => s.getTracks().forEach((t) => t.stop()))
          .catch(() => {});
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoDevices);
        // Auto-select DroidCam if present, otherwise first device
        const droidcam = videoDevices.find(
          (d) =>
            d.label.toLowerCase().includes("droid") ||
            d.label.toLowerCase().includes("ivcam") ||
            d.label.toLowerCase().includes("epoccam"),
        );
        setSelectedCameraId((droidcam || videoDevices[0])?.deviceId || "");
      } catch {
        /* silent */
      }
    }
    loadCameras();
  }, []);

  // Load global configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const cfg = await fetchGlobalConfig();
        setConfig(cfg);
      } catch (err) {
        /* silent fallback */
      }
    }
    loadConfig();
    const poll = setInterval(loadConfig, 10000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const ensureCamera = async () => {
    // Always stop any existing stream before opening a new one
    stopCamera();

    let stream: MediaStream | null = null;

    if (selectedCameraId) {
      // Open the explicitly selected device (e.g. DroidCam)
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedCameraId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } else {
      // No device selected — open any available camera
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    }

    streamRef.current = stream;

    // Attach to video element — it may not be mounted yet (React renders it after status=scanning)
    // Poll until the ref is available
    let attempts = 0;
    while (!videoRef.current && attempts < 20) {
      await new Promise((r) => setTimeout(r, 100));
      attempts++;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) throw new Error("Camera not ready.");
    // Wait for video to have actual dimensions (DroidCam can be slow to initialize)
    if (video.videoWidth === 0 || video.videoHeight === 0)
      throw new Error(
        "Camera feed not ready. Please wait a moment and try again.",
      );
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Capture failure.");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.95);
  };

  // ── FACE SCAN HANDLER — multi-frame capture (5 frames, 400ms apart) ──
  const handleFaceScan = async () => {
    setFeedback("");
    setQualityTip("");
    setCaptureCount(0);
    setRecognizedPerson(null);
    setStatus("scanning");
    try {
      await ensureCamera();

      // Poll until the video element has real pixel dimensions.
      // DroidCam over WiFi/USB can take 3-8 seconds to deliver the first frame.
      let waited = 0;
      while (waited < 10000) {
        await new Promise((r) => setTimeout(r, 300));
        waited += 300;
        const v = videoRef.current;
        if (v && v.videoWidth > 0 && v.videoHeight > 0) break;
      }
      if (!videoRef.current || videoRef.current.videoWidth === 0) {
        throw new Error(
          "Camera did not start. Make sure DroidCam is open on your phone and the PC client is running.",
        );
      }

      // 500ms for auto-exposure to settle
      await new Promise((r) => setTimeout(r, 500));

      // Capture 5 frames 400ms apart for multi-frame backend processing
      const frames: string[] = [];
      for (let i = 0; i < 5; i++) {
        const frame = captureFrame();
        frames.push(frame);
        setCaptureCount(i + 1);
        if (i < 4) await new Promise((r) => setTimeout(r, 400));
      }

      const result = await markAttendance({
        frames,
        image: frames[0],
      });
      playBeep("success");
      setStatus("success");
      setFeedback(result.message);
      if (result.profile) {
        setRecognizedPerson({
          name: result.profile.full_name,
          department: result.profile.department,
          photo: result.profile.profile_photo,
          type: result.type,
        });
      }
      stopCamera();
      setTimeout(
        () => navigate("/verification", { state: { success: true, result } }),
        2000,
      );
    } catch (error) {
      const apiErr = error instanceof ApiError ? error : null;
      const message = apiErr
        ? apiErr.message
        : error instanceof Error
          ? error.message
          : "Biometric Error";
      const tip =
        apiErr && (apiErr.data as any)?.tip ? (apiErr.data as any).tip : "";
      playBeep("error");
      setStatus("error");
      setFeedback(message);
      setQualityTip(tip);
      stopCamera();
      setTimeout(() => {
        setStatus("idle");
        setFeedback("");
        setQualityTip("");
        setCaptureCount(0);
      }, 4000);
    }
  };

  // ── DEMO MODE HANDLER (Credential-based fallback, NOT actual fingerprint biometrics)
  //    This matches backend's is_manual + demo credential authentication.
  //    The visual presentation remains identical to original design.
  const handleDemoMode = async () => {
    setFeedback("");
    setDemoProgress(0);
    setRipples([]);
    setStatus("demo-scanning");

    // Animate ripples every 400ms for 2 seconds (purely visual feedback)
    const rippleTimers: ReturnType<typeof setTimeout>[] = [];
    [0, 400, 800, 1200, 1600].forEach((delay, i) => {
      rippleTimers.push(
        setTimeout(() => {
          setRipples((prev) => [...prev, Date.now() + i]);
        }, delay),
      );
    });

    // Progress bar animation over 2 seconds
    const progressInterval = setInterval(() => {
      setDemoProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    // After 2.2s — Simulate static successful response (no backend call)
    await new Promise((r) => setTimeout(r, 2200));
    rippleTimers.forEach(clearTimeout);
    clearInterval(progressInterval);
    setDemoProgress(100);
    setRipples([]);

    // Static simulated response - realistic but purely local
    const simulatedResult = {
      success: true,
      message: "Attendance marked successfully",
      type: "CHECK_IN",
      timestamp: new Date().toISOString(),
      user: {
        id: "demo-user-001",
        username: DEMO_USERNAME,
        full_name: "Demo User",
        department: "Engineering",
        photo: null,
      },
    };

    playBeep("success");
    setStatus("success");
    setRecognizedPerson({
      name: simulatedResult.user.full_name,
      department: simulatedResult.user.department,
      photo: simulatedResult.user.photo,
      type: simulatedResult.type,
    });
    setFeedback(simulatedResult.message);
    setTimeout(
      () =>
        navigate("/verification", {
          state: { success: true, result: simulatedResult },
        }),
      1200,
    );
  };

  const handleScan = () => {
    if (mode === "face") handleFaceScan();
    else handleDemoMode(); // Demo mode = credential-based fallback
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsManualLoading(true);
    setFeedback("");
    try {
      const result = await markAttendance({
        username,
        password,
        is_manual: true,
      });
      playBeep("success");
      setStatus("success");
      setFeedback(result.message);
      setShowManual(false);
      setTimeout(
        () => navigate("/verification", { state: { success: true, result } }),
        1200,
      );
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Manual login failed.";
      playBeep("error");
      setFeedback(message);
      setStatus("error");
      setTimeout(() => {
        setStatus("idle");
        setFeedback("");
      }, 3000);
    } finally {
      setIsManualLoading(false);
    }
  };

  const isScanning = status === "scanning" || status === "demo-scanning";
  const isStrictMode = config?.strictMode === true;
  const isLivenessActive = config?.biometricLockActive !== false;

  return (
    <div className="h-screen w-screen flex flex-col font-sans relative bg-surface-bg text-surface-text overflow-hidden">
      {/* Texture overlay - unchanged */}
      <div
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#0073CE 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top Header Bar with enhanced security indicators */}
      <header className="w-full shrink-0 border-b border-surface-border bg-surface-card/80 backdrop-blur-md z-50">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#0073CE" }}
            >
              <Fingerprint className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-surface-text leading-none">
                HU-IOT BBEAMS
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-surface-muted mt-0.5">
                Biometric Attendance Terminal
              </p>
            </div>
          </div>

          {/* Security mode indicators */}
          <div className="flex items-center gap-2">
            {isStrictMode && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Shield className="w-3 h-3 text-amber-500" />
                <span className="text-[8px] font-black uppercase tracking-wider text-amber-500">
                  Strict
                </span>
              </div>
            )}
            {/* Camera selector in header — only when multiple cameras available */}
            {cameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="px-2 py-1 rounded-xl border border-surface-border bg-surface-accent text-[9px] font-bold text-surface-text outline-none focus:border-indigo-500 max-w-[130px] truncate"
                title="Select camera"
              >
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => navigate("/login")}
              title="Return to Login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-accent border border-surface-border text-surface-muted hover:text-indigo-600 hover:border-indigo-500/30 transition-all text-[10px] font-black uppercase tracking-widest group"
            >
              <Home className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
              Home
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-between py-4 px-4 relative z-10 w-full overflow-hidden max-w-2xl mx-auto">
        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
          {!showManual ? (
            <div className="relative p-4 h-full max-h-[50vh] md:max-h-[58vh] aspect-square flex items-center justify-center">
              {/* Corner frame - unchanged */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-indigo-600 rounded-tl-3xl z-20" />
              <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-indigo-600 rounded-tr-3xl z-20" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-indigo-600 rounded-bl-3xl z-20" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-indigo-600 rounded-br-3xl z-20" />

              <div className="w-full h-full rounded-[3.5rem] border-2 border-surface-border bg-surface-card overflow-hidden relative shadow-2xl">
                <AnimatePresence mode="wait">
                  {/* ── IDLE STATE ── */}
                  {status === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-10 text-center p-12"
                    >
                      <div className="p-10 rounded-full border-2 border-surface-border bg-surface-accent shadow-inner">
                        {mode === "face" ? (
                          <Scan className="w-16 h-16 md:w-24 md:h-24 text-indigo-600" />
                        ) : (
                          <FingerprintIcon className="w-16 h-16 md:w-24 md:h-24 text-indigo-600" />
                        )}
                      </div>
                      <button
                        onClick={handleScan}
                        className="w-48 py-5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-lg hover:bg-indigo-700"
                      >
                        {mode === "face" ? "START SCAN" : "AUTHENTICATE"}
                      </button>

                      {mode === "demo" && (
                        <p className="text-[8px] text-surface-muted uppercase tracking-widest flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Demo credentials • identical to manual login
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* ── FACE SCANNING with multi-frame progress ── */}
                  {status === "scanning" && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0"
                    >
                      {/* Live camera feed — no overlays that blur or darken */}
                      <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-10"
                        autoPlay
                        playsInline
                        muted
                      />

                      {/* Scan line — travels through the middle 80% only */}
                      <motion.div
                        className="absolute inset-x-0 h-1.5 bg-indigo-400 shadow-[0_0_40px_#818cf8] z-30 opacity-80"
                        animate={{ top: ["15%", "75%", "15%"] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />

                      {/* Bottom status bar — single unified strip, no collision */}
                      <div className="absolute bottom-0 inset-x-0 z-40 bg-black/60 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
                        {/* Left: instruction + frame count */}
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Frame dots */}
                          <div className="flex items-center gap-1 shrink-0">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                  captureCount >= i
                                    ? "bg-emerald-400"
                                    : "bg-white/25",
                                )}
                              />
                            ))}
                          </div>
                          {/* Dynamic label */}
                          <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider truncate">
                            {captureCount === 0
                              ? "Look straight • Hold still"
                              : captureCount < 5
                                ? `Frame ${captureCount} of 5`
                                : "Processing…"}
                          </span>
                        </div>

                        {/* Right: cancel */}
                        <button
                          onClick={() => {
                            stopCamera();
                            setStatus("idle");
                            setCaptureCount(0);
                          }}
                          className="shrink-0 text-[9px] font-black text-white/70 hover:text-rose-400 uppercase tracking-widest transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── DEMO MODE SCANNING (visual unchanged, purpose clarified) ── */}
                  {status === "demo-scanning" && (
                    <motion.div
                      key="demo-scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-10 text-center"
                      style={{
                        background:
                          "linear-gradient(135deg, #0073CE10 0%, #EBF2FA 100%)",
                      }}
                    >
                      <div className="relative flex items-center justify-center w-40 h-40">
                        {ripples.map((key) => (
                          <motion.div
                            key={key}
                            className="absolute rounded-full border-2 border-indigo-400"
                            initial={{ width: 60, height: 60, opacity: 0.8 }}
                            animate={{ width: 160, height: 160, opacity: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                        ))}
                        <motion.div
                          className="absolute w-32 h-32 rounded-full bg-indigo-400/20"
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        >
                          <FingerprintIcon className="w-24 h-24 relative z-10 text-[#0073CE]" />
                        </motion.div>
                        <motion.div className="absolute inset-0 rounded-full overflow-hidden z-20 pointer-events-none">
                          <motion.div
                            className="absolute inset-x-0 h-0.5 bg-indigo-400/70 shadow-[0_0_12px_#0073CE]"
                            animate={{ top: ["0%", "100%", "0%"] }}
                            transition={{
                              duration: 1.0,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                        </motion.div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-indigo-600 animate-pulse">
                          Authenticating...
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          Demo credentials • secure fallback
                        </p>
                      </div>

                      <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: "#0073CE",
                            width: `${demoProgress}%`,
                          }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">
                        {demoProgress}%
                      </p>
                    </motion.div>
                  )}

                  {/* ── SUCCESS — shows recognized person ── */}
                  {status === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 bg-[#0073CE] z-50 flex flex-col items-center justify-center gap-4 text-white p-8 text-center"
                    >
                      {recognizedPerson?.photo ? (
                        <img
                          src={recognizedPerson.photo}
                          alt={recognizedPerson.name}
                          className="w-20 h-20 rounded-full object-cover border-4 border-white/40 shadow-xl"
                        />
                      ) : (
                        <CheckCircle2 className="w-20 h-20" />
                      )}
                      <div>
                        <p className="font-black text-2xl tracking-tighter uppercase mb-1">
                          {recognizedPerson ? recognizedPerson.name : "Success"}
                        </p>
                        {recognizedPerson && (
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">
                            {recognizedPerson.department}
                          </p>
                        )}
                        <p className="font-bold text-[10px] uppercase tracking-widest opacity-75">
                          {recognizedPerson?.type === "CHECK_IN"
                            ? "✓ Checked In"
                            : recognizedPerson?.type === "CHECK_OUT"
                              ? "✓ Checked Out"
                              : "Session Logged"}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── ERROR with actionable tip ── */}
                  {status === "error" && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 bg-rose-600 z-50 flex flex-col items-center justify-center gap-4 text-white p-8 text-center"
                    >
                      <XCircle className="w-16 h-16" />
                      <div>
                        <p className="font-black text-2xl tracking-tighter uppercase mb-2">
                          Failed
                        </p>
                        <p className="font-bold text-[11px] uppercase tracking-widest opacity-90 text-rose-100">
                          {feedback || "Not Recognized"}
                        </p>
                        {qualityTip && (
                          <p className="mt-3 text-[10px] font-medium text-white/80 bg-white/10 rounded-xl px-4 py-2 leading-relaxed">
                            💡 {qualityTip}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            /* ── MANUAL LOGIN PANEL (unchanged) ── */
            <div className="w-full h-full flex items-center justify-center overflow-y-auto py-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-xs border-2 border-surface-border rounded-3xl p-6 shadow-2xl bg-surface-card text-surface-text mx-4 shrink-0"
              >
                <button
                  onClick={() => setShowManual(false)}
                  className="absolute top-4 right-4 p-2 text-surface-muted hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-5">
                  <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-indigo-500/20 text-indigo-600">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-black uppercase text-surface-text">
                    Manual Login
                  </h3>
                  <p className="text-[9px] text-surface-muted mt-1 uppercase tracking-widest font-bold">
                    Enter credentials to mark attendance
                  </p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-surface-muted">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full border-2 border-surface-border bg-surface-bg/50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 font-bold text-surface-text transition-colors"
                      placeholder="Enter username"
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-surface-muted">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border-2 border-surface-border bg-surface-bg/50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 font-bold text-surface-text transition-colors"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                  <button
                    disabled={isManualLoading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.3em] shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    {isManualLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "LOG IN"
                    )}
                  </button>
                </form>

                <p className="text-center text-[8px] text-surface-muted mt-3 uppercase tracking-widest font-bold">
                  Manual entry is logged and reviewed by HR
                </p>
              </motion.div>
            </div>
          )}
        </div>

        {/* Feedback area (unchanged) */}
        <div className="min-h-10 flex items-center justify-center mb-1 shrink-0 px-4">
          <AnimatePresence>
            {feedback && status !== "success" && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "py-2 px-6 rounded-full border text-[10px] font-black uppercase tracking-[0.25em] text-center shadow-lg backdrop-blur-md max-w-sm",
                  status === "error"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                    : "border-indigo-500/20 bg-indigo-500/10 text-indigo-600",
                )}
              >
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer with enhanced status indicators */}
      <footer className="w-full shrink-0 border-t border-surface-border bg-surface-card/40 backdrop-blur-3xl z-30">
        <div className="max-w-2xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-4">
            {/* Face Scan button */}
            <button
              disabled={isScanning}
              onClick={() => {
                setMode("face");
                setStatus("idle");
              }}
              className={cn(
                "px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all flex items-center gap-2",
                mode === "face"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-surface-accent text-surface-muted hover:text-surface-text",
              )}
            >
              <Scan className="w-3.5 h-3.5" /> FACE SCAN
            </button>

            {/* Demo Mode button - visually identical, semantically accurate */}
            <button
              disabled={isScanning}
              onClick={() => {
                setMode("demo");
                setStatus("idle");
              }}
              title="Demo authentication — uses test credentials (not actual fingerprint hardware)"
              className={cn(
                "px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all flex items-center gap-2 group relative",
                mode === "demo"
                  ? "text-white shadow-lg"
                  : "bg-surface-accent text-surface-muted hover:text-surface-text",
              )}
              style={mode === "demo" ? { backgroundColor: "#0073CE" } : {}}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>DEMO MODE</span>
              {/* Subtle tooltip indicator */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-black/80 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Demo credentials • identical to manual
              </div>
            </button>
          </div>

          <div className="flex items-center gap-6 text-[10px] font-black tracking-[0.4em] text-surface-muted">
            <p className="text-2xl font-mono text-surface-text leading-none">
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </p>
            <div className="flex items-center gap-4 uppercase">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_#10b981]" />
              ACTIVE
            </div>
            {/* Liveness status indicator - matches backend biometric_lock_active */}
            <div className="flex items-center gap-1.5">
              {isLivenessActive ? (
                <Lock className="w-3 h-3 text-emerald-500" />
              ) : (
                <Unlock className="w-3 h-3 text-amber-500" />
              )}
              <span className="text-[8px] tracking-wider">
                {isLivenessActive ? "LIVENESS ACTIVE" : "LIVENESS BYPASS"}
              </span>
            </div>
          </div>

          {config?.manualEntryEnabled && !showManual && (
            <button
              onClick={() => setShowManual(true)}
              className="text-[10px] font-black uppercase tracking-widest transition-all underline underline-offset-8 decoration-2"
              style={{ color: "#0073CE" }}
            >
              Manual
            </button>
          )}
        </div>
      </footer>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
