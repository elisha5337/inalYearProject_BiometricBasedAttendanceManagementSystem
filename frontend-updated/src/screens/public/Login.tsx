import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fingerprint,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  User as UserIcon,
  Shield,
  Briefcase,
  ArrowLeft,
  CheckCircle,
  Loader2,
} from 'lucide-react';

import { ApiError } from '../../lib/api';
import { loginUser } from '../../lib/auth';
import type { User } from '../../types';
import { cn } from '../../lib/utils';

interface LoginProps {
  onLogin: (user: User) => void;
}

type UserRole = 'admin' | 'hr' | 'employee';

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<'idle' | 'loading' | 'success'>(
    'idle',
  );

  const navigate = useNavigate();

  useEffect(() => {
    const savedUsername =
      localStorage.getItem('remembered_username') ||
      localStorage.getItem('rememberedUsername') ||
      localStorage.getItem('remembered_email') ||
      localStorage.getItem('rememberedEmail');

    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const normalizedUsername = username.trim();

      if (!normalizedUsername || !password.trim()) {
        setError('Please enter both username and password.');
        return;
      }

      if (rememberMe) {
        localStorage.setItem('remembered_username', normalizedUsername);
      } else {
        localStorage.removeItem('remembered_username');
      }

      localStorage.removeItem('rememberedUsername');
      localStorage.removeItem('remembered_email');
      localStorage.removeItem('rememberedEmail');

      const authenticatedUser = await loginUser({
        identifier: normalizedUsername,
        password: password.trim(),
        role,
      });

      onLogin(authenticatedUser);
      navigate(`/${authenticatedUser.role ?? role}/dashboard`, { replace: true });
    } catch (loginError) {
      const message =
        loginError instanceof ApiError
          ? loginError.message
          : `Invalid credentials for ${role.toUpperCase()} role.`;

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setForgotPasswordStatus('loading');

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setForgotPasswordStatus('success');
  };

  const roles: { id: UserRole; label: string; icon: typeof UserIcon }[] = [
    { id: 'employee', label: 'Employee', icon: UserIcon },
    { id: 'hr', label: 'HR Officer', icon: Briefcase },
    { id: 'admin', label: 'Administrator', icon: Shield },
  ];

  const demoCredentials: Array<{
    role: UserRole;
    label: string;
    username: string;
    password: string;
  }> = [
    {
      role: 'admin',
      label: 'Admin',
      username: 'elsa',
      password: 'Admin@123',
    },
    {
      role: 'hr',
      label: 'HR',
      username: 'hr_demo',
      password: 'Hr@12345',
    },
    {
      role: 'employee',
      label: 'Employee',
      username: 'employee_demo',
      password: 'Employee@123',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6 relative overflow-hidden">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordStatus('idle');
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {forgotPasswordStatus !== 'success' ? (
              <>
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Forgot Password?</h3>
                  <p className="text-slate-500">No worries, we'll send you reset instructions.</p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Enter your university email"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={forgotPasswordStatus === 'loading'}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {forgotPasswordStatus === 'loading' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'SEND RESET LINK'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center space-y-6 py-4">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Check Your Email</h3>
                  <p className="text-slate-500">
                    We've sent a password reset link to <br />
                    <span className="font-bold text-slate-900">{forgotPasswordEmail}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl"
                >
                  BACK TO LOGIN
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="hidden md:flex md:w-1/2 p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1920"
            alt="Technology Background"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-blue-600/80 backdrop-blur-[2px]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
              <Fingerprint className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">BBE AMS-HU IOT</h1>
          </div>

          <div className="space-y-6 max-w-md">
            <h2 className="text-5xl font-bold leading-tight">Secure Attendance Management</h2>
            <p className="text-blue-50 text-lg leading-relaxed font-medium">
              Login to access your dashboard, view reports, and manage your profile. Our biometric
              systems ensure accuracy and security for all HU-IOT employees.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm text-blue-100">
          <span>(c) 2026 Hawassa University</span>
          <span className="w-1 h-1 bg-blue-300 rounded-full"></span>
          <button className="hover:underline">Privacy Policy</button>
          <span className="w-1 h-1 bg-blue-300 rounded-full"></span>
          <button className="hover:underline">Support</button>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
            <p className="text-slate-500 mt-2">Select your role and enter your credentials</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {roles.map((selectedRole) => (
              <button
                key={selectedRole.id}
                type="button"
                disabled={isLoading}
                onClick={() => setRole(selectedRole.id)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                  role === selectedRole.id
                    ? 'bg-blue-50 border-blue-600 text-blue-600'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200',
                  isLoading && 'opacity-50 cursor-not-allowed',
                )}
              >
                <selectedRole.icon
                  className={cn(
                    'w-6 h-6',
                    role === selectedRole.id ? 'text-blue-600' : 'text-slate-400',
                  )}
                />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {selectedRole.label.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Sample Credentials</p>
                <p className="text-xs text-slate-500">
                  Use these after running the demo-user seed command.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {demoCredentials.map((credential) => (
                <button
                  key={credential.role}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setRole(credential.role);
                    setUsername(credential.username);
                    setPassword(credential.password);
                    setError('');
                  }}
                  className="w-full rounded-xl border border-white bg-white px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{credential.label}</span>
                    <span className="text-xs font-medium uppercase tracking-wider text-blue-600">
                      Use
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {credential.username} / {credential.password}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50"
                  placeholder="........"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  SIGN IN AS {role.toUpperCase()}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-8 border-t border-slate-100">
            <p className="text-slate-500 text-sm">
              Need to mark attendance?
              <button
                onClick={() => navigate('/terminal')}
                className="ml-1 text-blue-600 font-bold hover:underline"
              >
                Go to Biometric Terminal
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
