import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { confirmPasswordReset } from '../../lib/auth';
import { ApiError } from '../../lib/api';
import logo from "../../assets/logo.jpg";

export default function ResetPassword() {
  const params = useParams();
  const uid = params.uid;
  const token = params.token;
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log("ResetPassword Registry Handshake:", { uid, token });
  }, [uid, token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must meet 8-character minimum.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!uid || !token) {
      setError('Invalid link parameters.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanToken = token.replace(/\/$/, '');
      await confirmPasswordReset(uid, cleanToken, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{ backgroundColor: "#D9E2EC" }}
      className="min-h-screen w-full flex flex-col items-center justify-center gap-3 p-4 font-sans"
    >
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
          HU-IOT BBEAMS — Online Attendance Managment System
        </p>
      </div>

      {/* ══════════════════════════════════════
          CENTRAL CARD
      ══════════════════════════════════════ */}
      <div
        className="w-full max-w-lg bg-white"
        style={{ border: "1px solid #D1D5DB", borderRadius: 0 }}
      >
        <div className="px-8 py-6 space-y-5">
          {!uid || !token ? (
            <div className="text-center space-y-4">
               <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
               <h3 className="text-lg font-bold text-gray-900">Invalid Link</h3>
               <p className="text-sm text-gray-600">This password reset link is invalid or has expired.</p>
               <button 
                 onClick={() => navigate('/login')} 
                 className="w-full py-2 text-white font-bold text-sm"
                 style={{ backgroundColor: "#338EC3", borderRadius: 0 }}
               >
                 BACK TO LOGIN
               </button>
            </div>
          ) : success ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900">Password Reset Successful</h3>
              <p className="text-sm text-gray-600">Your password has been securely updated. Redirecting to login...</p>
              <div className="w-32 mx-auto bg-gray-200 h-1 mt-4">
                <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 3 }} className="h-full bg-green-500" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Reset Password
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Please enter your new password below.
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

              <form onSubmit={handleReset} className="space-y-4">
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'SAVE PASSWORD'}
                </button>
              </form>

              <div
                style={{ borderTop: "1px solid #D1D5DB" }}
                className="pt-4 flex flex-col gap-2"
              >
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-sm text-left hover:underline flex items-center gap-1"
                  style={{ color: "#2A70A6" }}
                >
                  <ArrowLeft className="w-4 h-4" /> Return to Login
                </button>
              </div>
            </>
          )}
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
