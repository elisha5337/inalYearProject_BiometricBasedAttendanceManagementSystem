import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  KeyRound,
  Mail,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
// import logo from "../../assets/logo.jpg";
const logo = ""; // Bypass missing asset build error on Render
import { ApiError } from "../../lib/api";
import { registerUser } from "../../lib/auth";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const hasUpperCase = /[A-Z]/.test(form.password);
    const hasLowerCase = /[a-z]/.test(form.password);
    const hasNumber = /[0-9]/.test(form.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(form.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      setError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerUser({
        username: form.username.trim(),
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        password: form.password,
      });
      setSuccess(res.message || "Account created. You can now log in.");
      setForm({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        password: "",
        confirm_password: "",
      });
      setTimeout(() => {
        navigate("/login", {
          state: {
            registrationSuccess:
              res.message ||
              "Account created successfully. You can now log in.",
          },
        });
      }, 1500);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Shared input wrapper style matching login page ──
  const inputWrap = "flex" as const;
  const inputStyle: React.CSSProperties = {
    backgroundColor: "#EBF2FA",
    borderRadius: 0,
  };
  const iconWrap = "flex items-center justify-center w-10 bg-white border-r";
  const borderStyle: React.CSSProperties = { border: "1px solid #D1D5DB" };
  const iconColor = "w-4 h-4 text-gray-400";

  return (
    <div
      style={{ backgroundColor: "#D9E2EC" }}
      className="min-h-screen w-full flex flex-col items-center justify-center gap-3 p-4"
    >
      {/* ── Header Banner ── */}
      <div
        className="w-full max-w-lg flex items-center gap-4 px-4 py-3"
        style={{
          backgroundColor: "#0073CE",
          border: "1px solid #D1D5DB",
          borderRadius: 0,
        }}
      >
        <div
          className="w-12 h-12 rounded-full shrink-0 overflow-hidden bg-white"
          style={{ border: "2px solid rgba(255,255,255,0.5)" }}
        >
          <img
            src={logo}
            alt="Hawassa University Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-white text-sm font-semibold leading-snug">
          Hawassa University IOT-BBEAMS
        </p>
      </div>

      {/* ── Card ── */}
      <div
        className="w-full max-w-lg bg-white"
        style={{ border: "1px solid #D1D5DB", borderRadius: 0 }}
      >
        {/* Tab-style header matching login */}
        <div style={{ borderBottom: "1px solid #D1D5DB" }}>
          <div
            className="py-3 text-center text-xs font-bold"
            style={{
              borderTop: "3px solid #0073CE",
              backgroundColor: "#FFFFFF",
              color: "#222222",
            }}
          >
            Employee Registration
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">
          <p className="text-sm text-gray-600">
            Create your employee account to access the attendance system.
          </p>

          {error && (
            <div
              className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm"
              style={{ border: "1px solid #FCA5A5" }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div
              className="flex items-center gap-2 p-3 bg-green-50 text-green-700 text-sm"
              style={{ border: "1px solid #86EFAC" }}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First + Last name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  First Name
                </label>
                <div className={inputWrap} style={borderStyle}>
                  <span className={iconWrap} style={{ borderColor: "#D1D5DB" }}>
                    <UserIcon className={iconColor} />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={form.first_name}
                    onChange={set("first_name")}
                    className="flex-1 px-3 py-2 text-sm outline-none disabled:opacity-60"
                    style={inputStyle}
                    placeholder="First name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  Last Name
                </label>
                <div className={inputWrap} style={borderStyle}>
                  <span className={iconWrap} style={{ borderColor: "#D1D5DB" }}>
                    <UserIcon className={iconColor} />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={form.last_name}
                    onChange={set("last_name")}
                    className="flex-1 px-3 py-2 text-sm outline-none disabled:opacity-60"
                    style={inputStyle}
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">
                Username
              </label>
              <div className={inputWrap} style={borderStyle}>
                <span className={iconWrap} style={{ borderColor: "#D1D5DB" }}>
                  <UserIcon className={iconColor} />
                </span>
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={form.username}
                  onChange={set("username")}
                  className="flex-1 px-3 py-2 text-sm outline-none disabled:opacity-60"
                  style={inputStyle}
                  placeholder="Choose a username"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">
                Email Address
              </label>
              <div className={inputWrap} style={borderStyle}>
                <span className={iconWrap} style={{ borderColor: "#D1D5DB" }}>
                  <Mail className={iconColor} />
                </span>
                <input
                  type="email"
                  required
                  disabled={isLoading}
                  value={form.email}
                  onChange={set("email")}
                  className="flex-1 px-3 py-2 text-sm outline-none disabled:opacity-60"
                  style={inputStyle}
                  placeholder="your@hawassa.edu.et"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">
                Password
              </label>
              <div className={inputWrap} style={borderStyle}>
                <span className={iconWrap} style={{ borderColor: "#D1D5DB" }}>
                  <KeyRound className={iconColor} />
                </span>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  value={form.password}
                  onChange={set("password")}
                  className="flex-1 px-3 py-2 text-sm outline-none disabled:opacity-60"
                  style={inputStyle}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">
                Confirm Password
              </label>
              <div className={inputWrap} style={borderStyle}>
                <span className={iconWrap} style={{ borderColor: "#D1D5DB" }}>
                  <KeyRound className={iconColor} />
                </span>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  value={form.confirm_password}
                  onChange={set("confirm_password")}
                  className="flex-1 px-3 py-2 text-sm outline-none disabled:opacity-60"
                  style={inputStyle}
                  placeholder="Retype password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: "#338EC3", borderRadius: 0 }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating
                  Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Link back to login */}
          <div style={{ borderTop: "1px solid #D1D5DB" }} className="pt-4">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-sm text-left hover:underline"
              style={{ color: "#2A70A6" }}
            >
              Already have an account? Log in
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer Banner ── */}
      <div
        className="w-full max-w-lg bg-white px-4 py-3 text-center text-xs text-gray-600"
        style={{
          border: "1px solid #D1D5DB",
          borderTopWidth: "4px",
          borderTopColor: "#338EC3",
          borderRadius: 0,
        }}
      >
        Copyright &copy; 2026 Hawassa University. All rights reserved.
      </div>
    </div>
  );
}
