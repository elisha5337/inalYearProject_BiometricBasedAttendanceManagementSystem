import { useLanguage } from '../../lib/translations';
import { useEffect, useMemo, useState } from "react";
import {
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
  category: "attendance" | "security" | "access" | "leave";
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
  annualLeaveQuota: number;
  sickLeaveQuota: number;
  customSessionTimeout: number;
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
  annualLeaveQuota: 20,
  sickLeaveQuota: 12,
  customSessionTimeout: 60,
};

function extractNumber(value: string, fallback: number) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

function categoryFromBackend(value: string): CustomPolicy["category"] {
  if (value === "ATTENDANCE") return "attendance";
  if (value === "BIOMETRIC" || value === "NOTIFICATION") return "security";
  if (value === "LEAVE") return "leave";
  return "access";
}

function categoryToBackend(value: CustomPolicy["category"]) {
  if (value === "attendance") return "ATTENDANCE";
  if (value === "security") return "BIOMETRIC";
  if (value === "leave") return "LEAVE";
  return "HR_ADMIN";
}

function timeoutFromMinutes(minutes: number) {
  if (minutes === 60) return "1 Hour";
  if (minutes === 120) return "2 Hours";
  if (minutes === 240) return "4 Hours";
  if (minutes === 480) return "8 Hours";
  if (minutes === 720) return "12 Hours";
  if (minutes === 1440) return "24 Hours";
  return "Custom";
}

function minutesFromTimeout(label: string, customValue: number) {
  if (label === "1 Hour") return 60;
  if (label === "2 Hours") return 120;
  if (label === "4 Hours") return 240;
  if (label === "8 Hours") return 480;
  if (label === "12 Hours") return 720;
  if (label === "24 Hours") return 1440;
  return customValue;
}

function findPolicy(policies: LeavePolicyRecord[], matcher: (policy: LeavePolicyRecord) => boolean) {
  return policies.find(matcher) || null;
}

export default function SetPolicies() {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PolicyState>(defaultPolicyState);
  const [policyRecords, setPolicyRecords] = useState<LeavePolicyRecord[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfigRecord | null>(null);
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
      const [loadedPolicies, loadedConfig] = await Promise.all([fetchPolicies(), fetchGlobalConfig()]);
      setPolicyRecords(loadedPolicies);
      setGlobalConfig(loadedConfig);

      const gracePolicy = findPolicy(loadedPolicies, p => p.name.toLowerCase().includes("grace"));
      const latePolicy = findPolicy(loadedPolicies, p => p.name.toLowerCase().includes("late threshold"));
      const sensitivityPolicy = findPolicy(loadedPolicies, p => p.name.toLowerCase().includes("sensitivity"));
      const passwordExpiryPolicy = findPolicy(loadedPolicies, p => p.name.toLowerCase().includes("password expiry"));
      const mfaPolicy = findPolicy(loadedPolicies, p => p.name.toLowerCase().includes("multi-factor"));
      const livenessPolicy = findPolicy(loadedPolicies, p => p.name.toLowerCase().includes("liveness"));
      const annualPolicy = findPolicy(loadedPolicies, p => p.name.toLowerCase() === "annual leave");
      const sickPolicy = findPolicy(loadedPolicies, p => p.name.toLowerCase().includes("sick leave"));

      setPolicies({
        gracePeriod: extractNumber(gracePolicy?.value || "15", 15),
        lateThreshold: extractNumber(latePolicy?.value || "60", 60),
        mfaEnabled: (mfaPolicy?.value || "").toLowerCase() === "enabled" || Boolean(loadedConfig.strictMode),
        livenessDetection: (livenessPolicy?.value || "").toLowerCase() !== "disabled" && Boolean(loadedConfig.biometricLockActive),
        sensitivity: extractNumber(sensitivityPolicy?.value || "75", 75),
        sessionTimeout: timeoutFromMinutes(loadedConfig.sessionTimeoutMinutes),
        passwordExpiry: passwordExpiryPolicy?.value || "90 Days",
        manualEntryEnabled: Boolean(loadedConfig.manualEntryEnabled),
        annualLeaveQuota: extractNumber(annualPolicy?.value || "20", 20),
        sickLeaveQuota: extractNumber(sickPolicy?.value || "12", 12),
        customSessionTimeout: loadedConfig.sessionTimeoutMinutes,
      });
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Unable to load policy configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPolicies(); }, []);

  const customPolicies = useMemo(() => {
    return policyRecords
      .filter((policy) => {
        const normalizedName = policy.name.toLowerCase();
        return ![
          "grace period", "late threshold", "verification sensitivity", "password expiry",
          "multi-factor authentication", "liveness detection", "annual leave", "sick leave"
        ].some((reserved) => normalizedName === reserved || normalizedName.includes(reserved));
      })
      .map((policy) => ({
        id: policy.id,
        name: policy.name,
        category: categoryFromBackend(policy.category),
        value: policy.value,
        description: policy.description,
      }));
  }, [policyRecords]);

  async function upsertNamedPolicy(name: string, category: string, value: string, description: string, urgency = "MEDIUM") {
    const existing = findPolicy(policyRecords, p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await updatePolicy(existing.id, { ...existing, category, value, description, urgency });
      return;
    }
    await createPolicy({ name, category, value, description, urgency, isActive: true, rules: {} });
  }

  function closePolicyModal() {
    setShowAddModal(false);
    setEditingPolicyId(null);
    setNewPolicy({ name: "", category: "attendance", value: "", description: "" });
  }

  async function persistPolicyConfiguration(nextPolicies: PolicyState) {
    if (!globalConfig) return;
    await Promise.all([
      updateGlobalConfig({
        ...globalConfig,
        sessionTimeoutMinutes: minutesFromTimeout(nextPolicies.sessionTimeout, nextPolicies.customSessionTimeout),
        strictMode: nextPolicies.mfaEnabled,
        biometricLockActive: nextPolicies.livenessDetection,
        manualEntryEnabled: nextPolicies.manualEntryEnabled,
        realTimeValidation: true,
      }),
      upsertNamedPolicy("Grace Period", "ATTENDANCE", `${nextPolicies.gracePeriod} Minutes`, "Time allowed after shift start."),
      upsertNamedPolicy("Late Threshold", "ATTENDANCE", `${nextPolicies.lateThreshold} Minutes`, "Time after which late arrival becomes absence."),
      upsertNamedPolicy("Verification Sensitivity", "BIOMETRIC", `${nextPolicies.sensitivity}%`, "Biometric matching sensitivity."),
      upsertNamedPolicy("Password Expiry", "HR_ADMIN", nextPolicies.passwordExpiry, "System-wide password expiry period."),
      upsertNamedPolicy("Multi-factor Authentication", "BIOMETRIC", nextPolicies.mfaEnabled ? "Enabled" : "Disabled", "Strict verification mode."),
      upsertNamedPolicy("Liveness Detection", "BIOMETRIC", nextPolicies.livenessDetection ? "Enabled" : "Disabled", "Anti-spoofing checks."),
      upsertNamedPolicy("Annual Leave", "LEAVE", `${nextPolicies.annualLeaveQuota} Days`, "Standard yearly leave entitlement."),
      upsertNamedPolicy("Sick Leave", "LEAVE", `${nextPolicies.sickLeaveQuota} Days`, "Standard yearly medical leave quota."),
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
      setError(saveError instanceof ApiError ? saveError.message : "Unable to save policy changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all policies to system defaults?")) return;
    try {
      setIsSaving(true);
      setPolicies(defaultPolicyState);
      await persistPolicyConfiguration(defaultPolicyState);
      await loadPolicies();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (resetError) {
      setError("Unable to reset policies.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPolicy = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      const payload = {
        name: newPolicy.name,
        category: categoryToBackend(newPolicy.category),
        value: newPolicy.value,
        description: newPolicy.description,
        urgency: "MEDIUM",
        isActive: true,
        rules: {},
      };
      if (editingPolicyId) {
        await updatePolicy(editingPolicyId, payload);
      } else {
        await createPolicy(payload);
      }
      closePolicyModal();
      await loadPolicies();
    } catch (createError) {
      setError(createError instanceof ApiError ? createError.message : "Error saving policy.");
    }
  };

  const handleDeleteCustomPolicy = async (id: string) => {
    if (!window.confirm("Delete this policy?")) return;
    try {
      await deletePolicy(id);
      await loadPolicies();
    } catch (e) {
      setError("Delete failed.");
    }
  };

  const handleEditCustomPolicy = (policy: CustomPolicy) => {
    setEditingPolicyId(policy.id);
    setNewPolicy({ name: policy.name, category: policy.category, value: policy.value, description: policy.description });
    setShowAddModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{t('System Policies')}</h1>
          <p className="text-slate-500 font-medium italic">{t('Institutional rules and biometric protocols')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 border border-slate-200 shadow-sm">
            <Plus className="w-4 h-4" /> New Policy
          </button>
          <button onClick={handleSave} disabled={isSaving || loading} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50">
            {isSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-black uppercase tracking-tight">System policies synchronized successfully!</span>
        </div>
      )}

      {error && <div className="rounded-2xl border border-rose-100 bg-red-50 px-5 py-4 text-sm font-bold text-rose-700 uppercase tracking-tight">{error}</div>}

      <div className="grid grid-cols-1 gap-8">

        {/* SECURITY SECTION */}
        <div className="professional-card overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 uppercase">Biometric Security</h3>
              <p className="text-xs text-slate-500">{t('Configure verification protocols')}</p>
            </div>
          </div>
          <div className="p-8 space-y-8">
            <div className="grid gap-4">
              <div onClick={() => setPolicies(c => ({...c, mfaEnabled: !c.mfaEnabled}))} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer">
                <div>
                  <p className="text-sm font-bold text-slate-900">Multi-factor Authentication</p>
                  <p className="text-xs text-slate-500 font-medium">{t('Require higher security verification.')}</p>
                </div>
                <div className={cn("w-12 h-6 rounded-full relative transition-colors", policies.mfaEnabled ? "bg-indigo-600" : "bg-slate-200")}>
                  <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all", policies.mfaEnabled ? "right-1" : "left-1")}></div>
                </div>
              </div>
              <div onClick={() => setPolicies(c => ({...c, livenessDetection: !c.livenessDetection}))} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer">
                <div>
                  <p className="text-sm font-bold text-slate-900">Liveness Detection</p>
                  <p className="text-xs text-slate-500 font-medium">{t('Prevent biometric spoofing attempts.')}</p>
                </div>
                <div className={cn("w-12 h-6 rounded-full relative transition-colors", policies.livenessDetection ? "bg-indigo-600" : "bg-slate-200")}>
                  <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all", policies.livenessDetection ? "right-1" : "left-1")}></div>
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-4">
              <label className="text-sm font-bold text-slate-700">Verification Sensitivity ({policies.sensitivity}%)</label>
              <input type="range" min="0" max="100" value={policies.sensitivity} onChange={(e) => setPolicies(c => ({...c, sensitivity: parseInt(e.target.value || "0")}))} className="w-full h-2 bg-slate-200 rounded-2xl appearance-none cursor-pointer accent-indigo-600" />
            </div>
          </div>
        </div>

        {/* ACCESS CONTROL SECTION (RESTORED) */}
        <div className="professional-card overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 uppercase">Access & Authentication</h3>
              <p className="text-xs text-slate-500">{t('Manage system sessions and password rules')}</p>
            </div>
          </div>
          <div className="p-8 space-y-8">
            <div onClick={() => setPolicies(c => ({...c, manualEntryEnabled: !c.manualEntryEnabled}))} className="flex items-center justify-between p-5 bg-amber-50 border border-amber-100 rounded-2xl cursor-pointer">
              <div className="flex items-center gap-4">
                <ShieldAlert className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900 uppercase">Manual Entry Fallback</p>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-tighter">{t('Allow manual credential login if biometrics fail.')}</p>
                </div>
              </div>
              <div className={cn("w-12 h-6 rounded-full relative transition-colors", policies.manualEntryEnabled ? "bg-amber-500" : "bg-slate-200")}>
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all", policies.manualEntryEnabled ? "right-1" : "left-1")}></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase">Session Timeout</label>
                <select value={policies.sessionTimeout} onChange={(e) => setPolicies(c => ({...c, sessionTimeout: e.target.value}))} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold">
                  <option>1 Hour</option><option>2 Hours</option><option>4 Hours</option><option>8 Hours</option><option>12 Hours</option><option>24 Hours</option><option>Custom</option>
                </select>
              </div>
              {policies.sessionTimeout === "Custom" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <label className="text-sm font-bold text-slate-700 uppercase">Custom Timeout (Minutes)</label>
                  <input 
                    type="number" 
                    value={policies.customSessionTimeout} 
                    onChange={(e) => setPolicies(c => ({...c, customSessionTimeout: parseInt(e.target.value || "0")}))} 
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all" 
                    placeholder="Enter minutes..."
                  />
                  <p className="text-[10px] text-slate-400 italic px-2">Total session duration in minutes.</p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* CUSTOM POLICIES LIST (RESTORED) */}
        {customPolicies.length > 0 && (
          <div className="professional-card overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Custom Organization Rules</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{t('Manage additional unique protocols')}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {customPolicies.map((policy) => (
                <div key={policy.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all group">
                  <div className="flex items-center gap-5">
                    <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", policy.category === "attendance" ? "bg-indigo-500" : policy.category === "security" ? "bg-purple-500" : policy.category === "leave" ? "bg-emerald-500" : "bg-amber-500")} />
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{policy.name}</h4>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{policy.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-2xl border border-indigo-100 uppercase">{policy.value}</span>
                    <button onClick={() => handleEditCustomPolicy(policy)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"><Pencil className="w-4.5 h-4.5" /></button>
                    <button onClick={() => handleDeleteCustomPolicy(policy.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closePolicyModal} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  {editingPolicyId ? <Pencil className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingPolicyId ? "Modify Rule" : "Register Rule"}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t('Define new system-wide parameters')}</p>
                </div>
              </div>
              <button onClick={closePolicyModal} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleAddPolicy} className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Rule Designation</label>
                <input type="text" required placeholder="e.g., Compassionate Leave" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={newPolicy.name} onChange={(e) => setNewPolicy(c => ({ ...c, name: e.target.value }))} />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Operational Category</label>
                <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={newPolicy.category} onChange={(e) => setNewPolicy(c => ({ ...c, category: e.target.value as any }))}>
                  <option value="attendance">Attendance & Time</option>
                  <option value="leave">Leave & Quotas</option>
                  <option value="security">Security & Biometrics</option>
                  <option value="access">Administrative Access</option>
                </select>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Assigned Value</label>
                <input type="text" required placeholder="e.g., 20 Days" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={newPolicy.value} onChange={(e) => setNewPolicy(c => ({ ...c, value: e.target.value }))} />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Logic Description</label>
                <textarea required rows={3} placeholder="Explain how this policy impacts system logic..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm resize-none" value={newPolicy.description} onChange={(e) => setNewPolicy(c => ({ ...c, description: e.target.value }))} />
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={closePolicyModal} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Abort</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all">Confirm Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
