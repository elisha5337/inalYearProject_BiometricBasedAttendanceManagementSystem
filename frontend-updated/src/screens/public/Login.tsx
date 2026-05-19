import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  KeyRound,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  ArrowLeft,
  X,
} from "lucide-react";
import logo from "../../assets/logo.jpg";
import { ApiError } from "../../lib/api";
import { loginUser, changePassword, logoutUser, requestPasswordReset } from "../../lib/auth";
import type { User } from "../../types";

interface LoginProps {
  onLogin: (user: User) => void;
}

type UserRole = "admin" | "hr" | "employee";

const TABS: { id: UserRole; label: string }[] = [
  { id: "admin", label: "Admin Login" },
  { id: "employee", label: "Employee Login" },
  { id: "hr", label: "HR Login" },
];

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("admin");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<
    "idle" | "loading" | "success"
  >("idle");
  const [forgotPasswordError, setForgotPasswordError] = useState("");

  const [forcePasswordReset, setForcePasswordReset] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const saved =
      localStorage.getItem("remembered_username") ||
      localStorage.getItem("rememberedUsername") ||
      localStorage.getItem("remembered_email") ||
      localStorage.getItem("rememberedEmail");
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const id = username.trim();
      if (!id || !password.trim()) {
        setError("Please enter both username and password.");
        return;
      }
      if (rememberMe) localStorage.setItem("remembered_username", id);
      else localStorage.removeItem("remembered_username");
      localStorage.removeItem("rememberedUsername");
      localStorage.removeItem("remembered_email");
      localStorage.removeItem("rememberedEmail");

      const user = await loginUser({
        identifier: id,
        password: password.trim(),
        role,
        remember: rememberMe,
      });
      if (user.mustChangePassword || password.trim() === `${id}123`) {
        setResettingUser(user);
        setForcePasswordReset(true);
        return;
      }
      onLogin(user);
      navigate(`/${user.role ?? role}/dashboard`, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Invalid credentials for ${role.toUpperCase()} role.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError("");
    setForgotPasswordStatus("loading");
    try {
      await requestPasswordReset(forgotPasswordEmail);
      setForgotPasswordStatus("success");
    } catch (err) {
      setForgotPasswordError(err instanceof ApiError ? err.message : "Failed to request password reset.");
      setForgotPasswordStatus("idle");
    }
  };

  const handleForcePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await changePassword(newPassword);
      await logoutUser();
      setForcePasswordReset(false);
      setResettingUser(null);
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetError("");
      setResetSuccess("SECURE PASSWORD SET. PLEASE LOG IN AGAIN.");
    } catch (err) {
      setResetError(
        err instanceof ApiError ? err.message : "Failed to save password.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* ── Page background ── */
    <div
      style={{ backgroundColor: "#D9E2EC" }}
      className="min-h-screen w-full flex flex-col items-center justify-center gap-3 p-4"
    >
      {/* ── Force Password Reset Modal ── */}
      {forcePasswordReset && resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white w-full max-w-md p-8 space-y-5"
            style={{ border: "1px solid #D1D5DB", borderRadius: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Security Requirement
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              You must update your default password before accessing the system.
            </p>
            {resetError && (
              <div
                className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm"
                style={{ border: "1px solid #FCA5A5" }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {resetError}
              </div>
            )}
            <form onSubmit={handleForcePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  New Password
                </label>
                <div className="flex" style={{ border: "1px solid #D1D5DB" }}>
                  <span
                    className="flex items-center justify-center w-10 bg-white border-r"
                    style={{ borderColor: "#D1D5DB" }}
                  >
                    <Lock className="w-4 h-4 text-gray-400" />
                  </span>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: "#EBF2FA" }}
                    placeholder="Minimum 8 characters"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  Confirm Password
                </label>
                <div className="flex" style={{ border: "1px solid #D1D5DB" }}>
                  <span
                    className="flex items-center justify-center w-10 bg-white border-r"
                    style={{ borderColor: "#D1D5DB" }}
                  >
                    <Lock className="w-4 h-4 text-gray-400" />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: "#EBF2FA" }}
                    placeholder="Retype new password"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: "#338EC3", borderRadius: 0 }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "SAVE & CONTINUE"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Forgot Password Modal ── */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white w-full max-w-md p-8 space-y-5"
            style={{ border: "1px solid #D1D5DB", borderRadius: 0 }}
          >
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordStatus("idle");
              }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {forgotPasswordStatus !== "success" ? (
              <>
                <h3 className="text-lg font-bold text-gray-900">
                  Forgot Password?
                </h3>
                <p className="text-sm text-gray-600">
                  Enter your university email to receive reset instructions.
                </p>
                {forgotPasswordError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm" style={{ border: "1px solid #FCA5A5" }}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {forgotPasswordError}
                  </div>
                )}
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Email Address
                    </label>
                    <div
                      className="flex"
                      style={{ border: "1px solid #D1D5DB" }}
                    >
                      <span
                        className="flex items-center justify-center w-10 bg-white border-r"
                        style={{ borderColor: "#D1D5DB" }}
                      >
                        <Mail className="w-4 h-4 text-gray-400" />
                      </span>
                      <input
                        type="email"
                        required
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm outline-none"
                        style={{ backgroundColor: "#EBF2FA" }}
                        placeholder="your@hawassa.edu.et"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={forgotPasswordStatus === "loading"}
                    className="w-full py-2 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ backgroundColor: "#338EC3", borderRadius: 0 }}
                  >
                    {forgotPasswordStatus === "loading" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "SEND RESET LINK"
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-bold text-gray-900">
                  Check Your Email
                </h3>
                <p className="text-sm text-gray-600">
                  Reset link sent to{" "}
                  <span className="font-bold">{forgotPasswordEmail}</span>
                </p>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-2 text-white font-bold text-sm"
                  style={{ backgroundColor: "#338EC3", borderRadius: 0 }}
                >
                  BACK TO LOGIN
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          HEADER BANNER
      ══════════════════════════════════════ */}
      <div
        className="w-full max-w-lg flex items-center gap-4 px-4 py-3"
        style={{
          backgroundColor: "#0073CE",
          border: "1px solid #D1D5DB",
          borderRadius: 0,
        }}
      >
        {/* Circular institutional logo */}
        <div
          className="w-12 h-12 rounded-full shrink-0 overflow-hidden bg-white"
          style={{
            border: "2px solid rgba(255,255,255,0.5)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.2)",
          }}
        >
          <img
            src={logo}
            alt="Hawassa University Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-white text-sm font-semibold leading-snug">
          Hawassa University Integrated Systems — Online Portal
        </p>
      </div>

      {/* ══════════════════════════════════════
          CENTRAL LOGIN CARD
      ══════════════════════════════════════ */}
      <div
        className="w-full max-w-lg bg-white"
        style={{ border: "1px solid #D1D5DB", borderRadius: 0 }}
      >
        {/* Tab bar */}
        <div className="flex" style={{ borderBottom: "1px solid #D1D5DB" }}>
          {TABS.map((tab) => {
            const active = role === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setRole(tab.id);
                  setError("");
                }}
                className="flex-1 py-3 text-xs font-semibold transition-colors"
                style={{
                  color: active ? "#222222" : "#555555",
                  fontWeight: active ? 700 : 400,
                  backgroundColor: active ? "#FFFFFF" : "#F3F4F6",
                  borderTop: active
                    ? "3px solid #0073CE"
                    : "3px solid transparent",
                  borderRight: "1px solid #D1D5DB",
                  borderRadius: 0,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Card body */}
        <div className="px-8 py-6 space-y-5">
          <p className="text-sm text-gray-600">
            Use your user name and password to log in.
          </p>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm"
              style={{ border: "1px solid #FCA5A5" }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Reset success */}
          {resetSuccess && (
            <div
              className="flex items-center gap-2 p-3 bg-green-50 text-green-700 text-sm"
              style={{ border: "1px solid #86EFAC" }}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              {resetSuccess}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">
                User Name
              </label>
              <div className="flex relative" style={{ border: "1px solid #D1D5DB" }}>
                <span
                  className="flex items-center justify-center w-10 bg-white border-r"
                  style={{ borderColor: "#D1D5DB" }}
                >
                  <UserIcon className="w-4 h-4 text-gray-400" />
                </span>
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 px-3 py-2 pr-8 text-sm outline-none disabled:opacity-60"
                  style={{ backgroundColor: "#EBF2FA", borderRadius: 0 }}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
                {username && (
                  <button
                    type="button"
                    onClick={() => {
                      setUsername("");
                      setRememberMe(false);
                      localStorage.removeItem("remembered_username");
                      localStorage.removeItem("rememberedUsername");
                      localStorage.removeItem("remembered_email");
                      localStorage.removeItem("rememberedEmail");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    title="Clear remembered username"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">
                Password
              </label>
              <div className="flex" style={{ border: "1px solid #D1D5DB" }}>
                <span
                  className="flex items-center justify-center w-10 bg-white border-r"
                  style={{ borderColor: "#D1D5DB" }}
                >
                  <KeyRound className="w-4 h-4 text-gray-400" />
                </span>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm outline-none disabled:opacity-60"
                  style={{ backgroundColor: "#EBF2FA", borderRadius: 0 }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between py-1">
              <label htmlFor="remember" className="flex items-center gap-3 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-10 h-6 rounded-full transition-all duration-300 ease-in-out bg-slate-200 group-hover:bg-slate-300"
                    style={{
                      backgroundColor: rememberMe ? "#338EC3" : undefined,
                      boxShadow: rememberMe ? "0 0 10px rgba(51, 142, 195, 0.4)" : "none"
                    }}
                  />
                  <div
                    className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ease-in-out shadow-sm"
                    style={{
                      transform: rememberMe ? "translateX(16px)" : "translateX(0)"
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">
                  Remember session
                </span>
              </label>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: "#338EC3", borderRadius: 0 }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Divider + action links */}
          <div
            style={{ borderTop: "1px solid #D1D5DB" }}
            className="pt-4 flex flex-col gap-2"
          >
            <button
              type="button"
              onClick={() => navigate("/terminal")}
              className="text-sm text-left hover:underline"
              style={{ color: "#2A70A6" }}
            >
              Fill Attendance at Terminal
            </button>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-left hover:underline"
              style={{ color: "#2A70A6" }}
            >
              Forget your password?
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          FOOTER BANNER
      ══════════════════════════════════════ */}
      <div
        className="w-full max-w-lg bg-white px-4 py-3 text-center text-xs text-gray-600"
        style={{
          borderTop: "4px solid #338EC3",
          border: "1px solid #D1D5DB",
          borderTopWidth: "4px",
          borderRadius: 0,
        }}
      >
        Copyright &copy; 2026 Hawassa University. All rights reserved.
      </div>
    </div>
  );
}
