import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Lock,
  Fingerprint,
  Save,
  RotateCcw,
  CheckCircle2,
  Info,
  Plus,
  X,
  Settings,
  Trash2,
  Pencil,
  ShieldAlert,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { ApiError } from "../../lib/api";
import {
  createPolicy,
  deletePolicy,
  fetchGlobalConfig,
  fetchPolicies,
  updateGlobalConfig,
  updatePolicy,
  type GlobalConfigRecord,
  type LeavePolicyRecord,
} from "../../lib/admin";

interface CustomPolicy {
  id: string;
  name: string;
  category: "attendance" | "security" | "access";
  value: string;
  description: string;
}

type PolicyState = {
  gracePeriod: number;
  lateThreshold: number;
  mfaEnabled: boolean;
  livenessDetection: boolean;
  sensitivity: number;
  sessionTimeout: string;
  passwordExpiry: string;
  manualEntryEnabled: boolean;
};

const defaultPolicyState: PolicyState = {
  gracePeriod: 15,
  lateThreshold: 60,
  mfaEnabled: false,
  livenessDetection: true,
  sensitivity: 75,
  sessionTimeout: "1 Hour",
  passwordExpiry: "90 Days",
  manualEntryEnabled: false,
};

function extractNumber(value: string, fallback: number) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

function categoryFromBackend(value: string): CustomPolicy["category"] {
  if (value === "ATTENDANCE") {
    return "attendance";
  }
  if (value === "BIOMETRIC" || value === "NOTIFICATION") {
    return "security";
  }
  return "access";
}

function categoryToBackend(value: CustomPolicy["category"]) {
  if (value === "attendance") {
    return "ATTENDANCE";
  }
  if (value === "security") {
    return "BIOMETRIC";
  }
  return "HR_ADMIN";
}

function timeoutFromMinutes(minutes: number) {
  if (minutes <= 60) return "1 Hour";
  if (minutes <= 120) return "2 Hours";
  if (minutes <= 240) return "4 Hours";
  if (minutes <= 480) return "8 Hours";
  if (minutes <= 720) return "12 Hours";
  return "24 Hours";
}

function minutesFromTimeout(label: string) {
  if (label.startsWith("1")) return 60;
  if (label.startsWith("2")) return 120;
  if (label.startsWith("4")) return 240;
  if (label.startsWith("8")) return 480;
  if (label.startsWith("12")) return 720;
  return 1440;
}

function findPolicy(
  policies: LeavePolicyRecord[],
  matcher: (policy: LeavePolicyRecord) => boolean,
) {
  return policies.find(matcher) || null;
}

export default function SetPolicies() {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PolicyState>(defaultPolicyState);
  const [policyRecords, setPolicyRecords] = useState<LeavePolicyRecord[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfigRecord | null>(
    null,
  );
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  const [newPolicy, setNewPolicy] = useState<{
    name: string;
    category: CustomPolicy["category"];
    value: string;
    description: string;
  }>({
    name: "",
    category: "attendance",
    value: "",
    description: "",
  });

  async function loadPolicies() {
    try {
      setLoading(true);
      setError(null);

      const [loadedPolicies, loadedConfig] = await Promise.all([
        fetchPolicies(),
        fetchGlobalConfig(),
      ]);
      setPolicyRecords(loadedPolicies);
      setGlobalConfig(loadedConfig);

      const gracePolicy = findPolicy(loadedPolicies, (policy) =>
        policy.name.toLowerCase().includes("grace"),
      );
      const latePolicy = findPolicy(loadedPolicies, (policy) =>
        policy.name.toLowerCase().includes("late threshold"),
      );
      const sensitivityPolicy = findPolicy(loadedPolicies, (policy) =>
        policy.name.toLowerCase().includes("sensitivity"),
      );
      const passwordExpiryPolicy = findPolicy(loadedPolicies, (policy) =>
        policy.name.toLowerCase().includes("password expiry"),
      );
      const mfaPolicy = findPolicy(loadedPolicies, (policy) =>
        policy.name.toLowerCase().includes("multi-factor"),
      );
      const livenessPolicy = findPolicy(loadedPolicies, (policy) =>
        policy.name.toLowerCase().includes("liveness"),
      );

      setPolicies({
        gracePeriod: extractNumber(gracePolicy?.value || "15", 15),
        lateThreshold: extractNumber(latePolicy?.value || "60", 60),
        mfaEnabled:
          (mfaPolicy?.value || "").toLowerCase() === "enabled" ||
          Boolean(loadedConfig.strictMode),
        livenessDetection:
          (livenessPolicy?.value || "").toLowerCase() !== "disabled" &&
          Boolean(loadedConfig.biometricLockActive),
        sensitivity: extractNumber(sensitivityPolicy?.value || "75", 75),
        sessionTimeout: timeoutFromMinutes(loadedConfig.sessionTimeoutMinutes),
        passwordExpiry: passwordExpiryPolicy?.value || "90 Days",
        manualEntryEnabled: Boolean(loadedConfig.manualEntryEnabled),
      });
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : "Unable to load policy configuration.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  const customPolicies = useMemo(() => {
    return policyRecords
      .filter((policy) => {
        const normalizedName = policy.name.toLowerCase();
        return ![
          "grace period",
          "late threshold",
          "verification sensitivity",
          "password expiry",
          "multi-factor authentication",
          "liveness detection",
        ].some((reserved) => normalizedName.includes(reserved));
      })
      .map((policy) => ({
        id: policy.id,
        name: policy.name,
        category: categoryFromBackend(policy.category),
        value: policy.value,
        description: policy.description,
      }));
  }, [policyRecords]);

  async function upsertNamedPolicy(
    name: string,
    category: string,
    value: string,
    description: string,
    urgency = "MEDIUM",
  ) {
    const existing = findPolicy(
      policyRecords,
      (policy) => policy.name === name,
    );

    if (existing) {
      await updatePolicy(existing.id, {
        ...existing,
        category,
        value,
        description,
        urgency,
      });
      return;
    }

    await createPolicy({
      name,
      category,
      value,
      description,
      urgency,
      isActive: true,
      rules: {},
    });
  }

  function closePolicyModal() {
    setShowAddModal(false);
    setEditingPolicyId(null);
    setNewPolicy({
      name: "",
      category: "attendance",
      value: "",
      description: "",
    });
  }

  async function persistPolicyConfiguration(nextPolicies: PolicyState) {
    if (!globalConfig) {
      return;
    }

    await Promise.all([
      updateGlobalConfig({
        ...globalConfig,
        sessionTimeoutMinutes: minutesFromTimeout(nextPolicies.sessionTimeout),
        strictMode: nextPolicies.mfaEnabled,
        biometricLockActive: nextPolicies.livenessDetection,
        manualEntryEnabled: nextPolicies.manualEntryEnabled,
        // Keep real-time biometric verification enabled from this admin policy surface.
        realTimeValidation: true,
      }),
      upsertNamedPolicy(
        "Grace Period",
        "ATTENDANCE",
        `${nextPolicies.gracePeriod} Minutes`,
        "Time allowed after shift start before marking as late.",
      ),
      upsertNamedPolicy(
        "Late Threshold",
        "ATTENDANCE",
        `${nextPolicies.lateThreshold} Minutes`,
        "Time after which late arrival becomes a half-day absence.",
      ),
      upsertNamedPolicy(
        "Verification Sensitivity",
        "BIOMETRIC",
        `${nextPolicies.sensitivity}%`,
        "Biometric verification matching sensitivity.",
      ),
      upsertNamedPolicy(
        "Password Expiry",
        "HR_ADMIN",
        nextPolicies.passwordExpiry,
        "System-wide password expiry period.",
      ),
      upsertNamedPolicy(
        "Multi-factor Authentication",
        "BIOMETRIC",
        nextPolicies.mfaEnabled ? "Enabled" : "Disabled",
        "Require stricter biometric verification when enabled.",
      ),
      upsertNamedPolicy(
        "Liveness Detection",
        "BIOMETRIC",
        nextPolicies.livenessDetection ? "Enabled" : "Disabled",
        "Enable anti-spoofing liveness checks.",
      ),
    ]);
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      await persistPolicyConfiguration(policies);
      await loadPolicies();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (saveError) {
      setError(
        saveError instanceof ApiError
          ? saveError.message
          : "Unable to save policy changes.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset all policies to system defaults?",
      )
    ) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setPolicies(defaultPolicyState);
      await persistPolicyConfiguration(defaultPolicyState);
      await loadPolicies();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (resetError) {
      setError(
        resetError instanceof ApiError
          ? resetError.message
          : "Unable to reset policies.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPolicy = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setError(null);
      if (editingPolicyId) {
        await updatePolicy(editingPolicyId, {
          name: newPolicy.name,
          category: categoryToBackend(newPolicy.category),
          value: newPolicy.value,
          description: newPolicy.description,
          urgency: "MEDIUM",
          isActive: true,
          rules: {},
        });
      } else {
        await createPolicy({
          name: newPolicy.name,
          category: categoryToBackend(newPolicy.category),
          value: newPolicy.value,
          description: newPolicy.description,
          urgency: "MEDIUM",
          isActive: true,
          rules: {},
        });
      }
      closePolicyModal();
      await loadPolicies();
    } catch (createError) {
      setError(
        createError instanceof ApiError
          ? createError.message
          : `Unable to ${editingPolicyId ? "update" : "register"} policy.`,
      );
    }
  };

  const handleDeleteCustomPolicy = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this custom policy?")) {
      try {
        setError(null);
        await deletePolicy(id);
        await loadPolicies();
      } catch (deleteError) {
        setError(
          deleteError instanceof ApiError
            ? deleteError.message
            : "Unable to delete policy.",
        );
      }
    }
  };

  const handleEditCustomPolicy = (policy: CustomPolicy) => {
    setEditingPolicyId(policy.id);
    setNewPolicy({
      name: policy.name,
      category: policy.category,
      value: policy.value,
      description: policy.description,
    });
    setShowAddModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Policies</h1>
          <p className="text-slate-500">
            Configure global attendance rules and security protocols
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="secondary-button gap-2"
          >
            <Plus className="w-4 h-4" />
            Register New Policy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="primary-button gap-2 min-w-[160px]"
          >
            {isSaving ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-bold">
              Policies updated successfully!
            </span>
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8">
        <div className="professional-card overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Attendance Rules</h3>
              <p className="text-xs text-slate-500">
                Define grace periods and late arrival thresholds
              </p>
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Standard Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  value={policies.gracePeriod}
                  onChange={(e) =>
                    setPolicies((current) => ({
                      ...current,
                      gracePeriod: parseInt(e.target.value || "0", 10),
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">
                  Time allowed after shift start before marking as late.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Late Threshold (Minutes)
                </label>
                <input
                  type="number"
                  value={policies.lateThreshold}
                  onChange={(e) =>
                    setPolicies((current) => ({
                      ...current,
                      lateThreshold: parseInt(e.target.value || "0", 10),
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">
                  Time after which late arrival becomes a half-day absence.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Changes to attendance rules will be applied to all future
                check-ins. Existing records will not be recalculated.
              </p>
            </div>
          </div>
        </div>

        <div className="professional-card overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Biometric Security</h3>
              <p className="text-xs text-slate-500">
                Configure verification sensitivity and methods
              </p>
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div className="space-y-4">
              <div
                onClick={() =>
                  setPolicies((current) => ({
                    ...current,
                    mfaEnabled: !current.mfaEnabled,
                  }))
                }
                className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Multi-factor Authentication
                  </p>
                  <p className="text-xs text-slate-500">
                    Require both face and fingerprint for high-security areas.
                  </p>
                </div>
                <div
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors duration-200",
                    policies.mfaEnabled ? "bg-blue-600" : "bg-slate-200",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200",
                      policies.mfaEnabled ? "right-1" : "left-1",
                    )}
                  ></div>
                </div>
              </div>
              <div
                onClick={() =>
                  setPolicies((current) => ({
                    ...current,
                    livenessDetection: !current.livenessDetection,
                  }))
                }
                className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Liveness Detection
                  </p>
                  <p className="text-xs text-slate-500">
                    Prevent spoofing using high-resolution 3D depth sensing.
                  </p>
                </div>
                <div
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors duration-200",
                    policies.livenessDetection ? "bg-blue-600" : "bg-slate-200",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200",
                      policies.livenessDetection ? "right-1" : "left-1",
                    )}
                  ></div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">
                Verification Sensitivity ({policies.sensitivity}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={policies.sensitivity}
                onChange={(e) =>
                  setPolicies((current) => ({
                    ...current,
                    sensitivity: parseInt(e.target.value || "0", 10),
                  }))
                }
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Balanced</span>
                <span>High Security</span>
              </div>
            </div>
          </div>
        </div>

        <div className="professional-card overflow-hidden border-2 border-transparent hover:border-blue-100 transition-all">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Access Control</h3>
              <p className="text-xs text-slate-500">
                Manage system-wide access and session policies
              </p>
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div
              onClick={() =>
                setPolicies((current) => ({
                  ...current,
                  manualEntryEnabled: !current.manualEntryEnabled,
                }))
              }
              className="flex items-center justify-between p-6 bg-amber-50/50 border border-amber-100 rounded-3xl hover:bg-amber-50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Manual Attendance Fallback
                  </p>
                  <p className="text-xs text-slate-500">
                    Allow credential-based entry on terminals when biometric fails.
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "w-12 h-6 rounded-full relative transition-colors duration-200",
                  policies.manualEntryEnabled ? "bg-amber-500" : "bg-slate-200",
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200",
                    policies.manualEntryEnabled ? "right-1" : "left-1",
                  )}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Session Timeout
                </label>
                <select
                  value={policies.sessionTimeout}
                  onChange={(e) =>
                    setPolicies((current) => ({
                      ...current,
                      sessionTimeout: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>1 Hour</option>
                  <option>4 Hours</option>
                  <option>8 Hours</option>
                  <option>12 Hours</option>
                  <option>24 Hours</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Password Expiry
                </label>
                <select
                  value={policies.passwordExpiry}
                  onChange={(e) =>
                    setPolicies((current) => ({
                      ...current,
                      passwordExpiry: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>30 Days</option>
                  <option>60 Days</option>
                  <option>90 Days</option>
                  <option>Never</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {customPolicies.length > 0 && (
          <div className="professional-card overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Custom Policies</h3>
                <p className="text-xs text-slate-500">
                  Additional organization-specific rules
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {customPolicies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        policy.category === "attendance"
                          ? "bg-blue-500"
                          : policy.category === "security"
                            ? "bg-purple-500"
                            : "bg-amber-500",
                      )}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {policy.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {policy.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                      {policy.value}
                    </span>
                    <button
                      onClick={() => handleEditCustomPolicy(policy)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      aria-label={`Edit ${policy.name}`}
                      title={`Edit ${policy.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomPolicy(policy.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      aria-label={`Delete ${policy.name}`}
                      title={`Delete ${policy.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
          <button
            onClick={handleReset}
            className="secondary-button gap-2 w-full sm:w-auto justify-center"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="primary-button gap-2 min-w-[160px] w-full sm:w-auto justify-center"
          >
            {isSaving ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closePolicyModal}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                  {editingPolicyId ? (
                    <Pencil className="w-5 h-5" />
                  ) : (
                    <Plus className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingUserId ? "Update Policy" : "Register New Policy"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUserId
                      ? "Adjust an existing custom system rule"
                      : "Define a custom system rule"}
                  </p>
                </div>
              </div>
              <button
                onClick={closePolicyModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleAddPolicy}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Policy Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Remote Work Allowance"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={newPolicy.name}
                  onChange={(e) =>
                    setNewPolicy((current) => ({
                      ...current,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Category
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={newPolicy.category}
                  onChange={(e) =>
                    setNewPolicy((current) => ({
                      ...current,
                      category: e.target.value as CustomPolicy["category"],
                    }))
                  }
                >
                  <option value="attendance">Attendance &amp; Time</option>
                  <option value="security">Biometric &amp; Security</option>
                  <option value="access">Access &amp; Infrastructure</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Policy Value
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 2 Days/Week or Enabled"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={newPolicy.value}
                  onChange={(e) =>
                    setNewPolicy((current) => ({
                      ...current,
                      value: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain the purpose of this policy..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  value={newPolicy.description}
                  onChange={(e) =>
                    setNewPolicy((current) => ({
                      ...current,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={closePolicyModal}
                  className="secondary-button flex-1 py-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button flex-1 py-3 shadow-lg shadow-blue-200"
                >
                  {editingPolicyId ? "Update Policy" : "Register Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
