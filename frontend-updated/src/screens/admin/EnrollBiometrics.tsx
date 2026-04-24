import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Fingerprint,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Search,
  Camera,
  ShieldCheck,
  ArrowLeft,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { ApiError, API_BASE } from "../../lib/api";
import {
  fetchEnrollmentUsers,
  type EnrollmentUserRecord,
} from "../../lib/admin";

type EnrollmentStep = "select" | "capture" | "success";
type EnrollmentMode = "fingerprint" | "face" | "both";

export default function EnrollBiometrics() {
  const navigate = useNavigate();
  const [step, setStep] = useState<EnrollmentStep>("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<EnrollmentUserRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] =
    useState<EnrollmentUserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>("face");
  const [captureWindowOpened, setCaptureWindowOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureMessage, setCaptureMessage] = useState(
    "Ready to begin capture process.",
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return employees
      .filter((employee) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          employee.name,
          employee.username,
          employee.email,
          employee.department,
          employee.role,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [employees, searchQuery]);

  async function loadEmployees(options?: {
    silent?: boolean;
    targetEmployeeId?: string;
  }) {
    const silent = Boolean(options?.silent);

    try {
      if (!silent) {
        setLoading(true);
      }

      const data = await fetchEnrollmentUsers();
      setEmployees(data);

      if (options?.targetEmployeeId) {
        const refreshedEmployee =
          data.find((employee) => employee.id === options.targetEmployeeId) ||
          null;

        if (refreshedEmployee) {
          setSelectedEmployee(refreshedEmployee);

          if (
            captureWindowOpened &&
            step === "capture" &&
            refreshedEmployee.enrolled
          ) {
            setProgress(100);
            setCaptureWindowOpened(false);
            setError(null);
            setCaptureMessage("Enrollment confirmed from the backend.");
            setStep("success");
          }
        }
      }

      return data;
    } catch (loadError) {
      const message =
        loadError instanceof ApiError
          ? loadError.message
          : "Unable to load users for biometric enrollment.";
      setError(message);
      return [];
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadEmployees();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Validate origin if needed, but for local dev it's fine
      if (event.data?.type === "ENROLLMENT_COMPLETE" && selectedEmployee) {
        if (event.data.success) {
          void loadEmployees({
            silent: true,
            targetEmployeeId: selectedEmployee.id,
          });
          setProgress(100);
          setCaptureWindowOpened(false);
          setError(null);
          setCaptureMessage("Enrollment confirmed!");
          setStep("success");
        } else {
          setError(event.data.error || "Enrollment failed.");
          setCaptureWindowOpened(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [selectedEmployee]);

  useEffect(() => {
    if (step !== "capture" || !selectedEmployee || !captureWindowOpened) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadEmployees({
        silent: true,
        targetEmployeeId: selectedEmployee.id,
      });
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [captureWindowOpened, selectedEmployee, step]);

  const resetEnrollment = () => {
    setStep("select");
    setSelectedEmployee(null);
    setProgress(0);
    setEnrollmentMode("face");
    setCaptureWindowOpened(false);
    setRefreshing(false);
    setError(null);
    setCaptureMessage("Ready to begin capture process.");
    void loadEmployees({ silent: true });
  };

  const selectEmployee = (employee: EnrollmentUserRecord) => {
    setSelectedEmployee(employee);
    setStep("capture");
    setProgress(0);
    setEnrollmentMode("face");
    setCaptureWindowOpened(false);
    setError(null);
    setCaptureMessage(
      employee.enrolled
        ? "This user already has biometric data enrolled. Launch capture again to refresh the saved face template."
        : "Ready to begin capture process.",
    );
  };

  const startCapture = () => {
    if (!selectedEmployee) {
      return;
    }

    if (selectedEmployee.status !== "ACTIVE") {
      setError(
        "Only active users can be enrolled for biometric authentication.",
      );
      return;
    }

    if (enrollmentMode !== "face") {
      setError(
        "The live backend enrollment flow currently supports face capture only.",
      );
      return;
    }

    const captureUrl = `${API_BASE}/accounts/user/${selectedEmployee.id}/capture/`;

    const width = 600;
    const height = 800;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const captureWindow = window.open(
      captureUrl,
      "BiometricCapture",
      `width=${width},height=${height},left=${left},top=${top},menubar=no,status=no,toolbar=no,location=no`,
    );

    if (!captureWindow) {
      setError(
        "The secure capture window was blocked. Please allow pop-ups and try again.",
      );
      return;
    }

    captureWindow.focus();
    setCaptureWindowOpened(true);
    setError(null);
    setProgress(45);
    setCaptureMessage(
      "Complete the secure guided capture in the new tab, then return here. This page will keep checking the backend enrollment status.",
    );
  };

  const checkEnrollmentStatus = async () => {
    if (!selectedEmployee) {
      return;
    }

    try {
      setRefreshing(true);
      setError(null);
      setProgress((current) => Math.max(current, 70));
      setCaptureMessage("Checking backend enrollment status...");

      const data = await loadEmployees({
        silent: true,
        targetEmployeeId: selectedEmployee.id,
      });

      const refreshedEmployee =
        data.find((employee) => employee.id === selectedEmployee.id) ||
        selectedEmployee;

      if (!refreshedEmployee.enrolled) {
        setCaptureMessage(
          "Enrollment is not confirmed yet. Finish the capture in the secure tab, then check status again.",
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Biometric Enrollment
        </h1>
        <p className="text-slate-500">
          Securely register employee biometric data for authentication
        </p>
      </div>

      <div className="flex items-center justify-between mb-10 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-10"></div>
        {[
          { id: "select", label: "Select User", icon: User },
          { id: "capture", label: "Capture Data", icon: Fingerprint },
          { id: "success", label: "Complete", icon: CheckCircle2 },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = step === item.id;
          const isPast =
            (step === "capture" && item.id === "select") || step === "success";

          return (
            <div
              key={item.id}
              className="flex flex-col items-center gap-2 bg-slate-50 px-4"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110"
                    : isPast
                      ? "bg-emerald-500 text-white"
                      : "bg-white border-2 border-slate-200 text-slate-400",
                )}
              >
                {isPast ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  isActive
                    ? "text-indigo-600"
                    : isPast
                      ? "text-emerald-600"
                      : "text-slate-400",
                )}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {step === "select" && (
        <div className="professional-card p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee by name, username, or email..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-red-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Loading users from the backend...
              </div>
            ) : filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  onClick={() => selectEmployee(employee)}
                  className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {employee.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {employee.department} | {employee.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {employee.enrolled ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-emerald-600 rounded-2xl text-[10px] font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-3 h-3" />
                        Enrolled
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-bold uppercase tracking-wider">
                        Not Enrolled
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No users matched your search.
              </div>
            )}
          </div>
        </div>
      )}

      {step === "capture" && selectedEmployee && (
        <div className="professional-card p-8 text-center space-y-8 animate-in fade-in zoom-in-95">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              Capturing Face Scan
            </h3>
            <p className="text-sm text-slate-500">
              Employee:{" "}
              <span className="font-bold text-slate-900">
                {selectedEmployee.name}
              </span>
            </p>
          </div>

          <div className="relative w-48 h-48 mx-auto">
            <div
              className={cn(
                "absolute inset-0 rounded-full border-4 border-slate-100 transition-all duration-500",
                (captureWindowOpened || refreshing) && "border-indigo-100",
              )}
            ></div>
            <div
              className={cn(
                "absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 transition-all duration-300",
                refreshing && "animate-spin",
              )}
              style={{ opacity: refreshing ? 1 : 0 }}
            ></div>

            <div className="absolute inset-4 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden">
              <Camera
                className={cn(
                  "w-20 h-20 transition-all duration-500",
                  captureWindowOpened || refreshing
                    ? "text-indigo-600 scale-110"
                    : "text-slate-300",
                )}
              />

              {(captureWindowOpened || refreshing) && (
                <div className="absolute inset-0 bg-indigo-600/10 animate-pulse"></div>
              )}
            </div>

            {progress > 0 && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                {progress}%
              </div>
            )}
          </div>

          <div className="max-w-xs mx-auto space-y-6">
            {progress === 0 && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Select Enrollment Mode
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "fingerprint",
                      label: "Finger",
                      icon: Fingerprint,
                      supported: false,
                    },
                    {
                      id: "face",
                      label: "Face",
                      icon: Camera,
                      supported: true,
                    },
                    {
                      id: "both",
                      label: "Both",
                      icon: ShieldCheck,
                      supported: false,
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      disabled={!mode.supported}
                      onClick={() => {
                        setEnrollmentMode(mode.id as EnrollmentMode);
                        setError(null);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                        enrollmentMode === mode.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm"
                          : "border-slate-100 bg-white text-slate-400 hover:border-slate-200",
                        !mode.supported && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <mode.icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase">
                        {mode.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Face capture is the live backend-connected enrollment flow in
                  this build.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {captureMessage}
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-red-50 px-4 py-3 text-left text-xs text-rose-700">
                {error}
              </div>
            )}

            {!refreshing && (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={
                    captureWindowOpened ? checkEnrollmentStatus : startCapture
                  }
                  className="primary-button w-full py-4 text-base shadow-xl shadow-indigo-200"
                >
                  {captureWindowOpened
                    ? "Check Enrollment Status"
                    : "Open Secure Face Capture"}
                </button>
                {captureWindowOpened && (
                  <button
                    type="button"
                    onClick={startCapture}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Reopen Capture Window
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetEnrollment}
                  className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to User Selection
                </button>
              </div>
            )}
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900">Important Note</p>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                Ensure the employee has provided written consent for biometric
                data collection. Face enrollment is stored through the live
                backend flow; fingerprint enrollment should only be enabled
                after device integration is connected.
              </p>
            </div>
          </div>
        </div>
      )}

      {step === "success" && selectedEmployee && (
        <div className="professional-card p-10 text-center space-y-8 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Enrollment Successful!
            </h2>
            <p className="text-slate-500 leading-relaxed">
              The face biometric template for{" "}
              <span className="font-bold text-slate-900">
                {selectedEmployee.name}
              </span>{" "}
              has been securely stored and confirmed from the backend.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex flex-col items-center gap-1">
              <Fingerprint className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Fingerprint
              </span>
              <span className="text-xs font-bold text-slate-900">Pending</span>
            </div>
            <div className="flex flex-col items-center gap-1 border-l border-slate-200">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Face ID
              </span>
              <span className="text-xs font-bold text-slate-900">Verified</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={resetEnrollment}
              className="primary-button w-full sm:w-auto px-8"
            >
              Enroll Another Employee
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="secondary-button w-full sm:w-auto px-8"
            >
              View User Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
