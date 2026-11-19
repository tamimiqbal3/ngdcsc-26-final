import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  ShieldCheck
} from 'lucide-react';
import {
  loginMemberAccount,
  loginWithGoogleAccount,
  sendMemberPasswordReset,
  formatAuthError
} from './services/firebase';
import DotLoader from './components/DotLoader';

interface MemberAuthPageProps {
  onBackToHome: () => void;
  onGoToRegister: () => void;
  onLoginSuccess: () => void;
}

export default function MemberAuthPage({
  onBackToHome,
  onGoToRegister,
  onLoginSuccess
}: MemberAuthPageProps) {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSentMsg, setResetSentMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSentMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await loginMemberAccount(email, password);
      onLoginSuccess();
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSentMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setSubmitting(true);
    try {
      await sendMemberPasswordReset(email);
      setResetSentMsg(
        `A password reset link has been sent to ${email.trim()}. Please check your inbox and spam folder.`
      );
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setResetSentMsg(null);
    setSubmitting(true);
    try {
      await loginWithGoogleAccount();
      onLoginSuccess();
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (nextMode: 'login' | 'forgot') => {
    setMode(nextMode);
    setErrorMsg(null);
    setResetSentMsg(null);
  };

  return (
    <div className="w-full max-w-md relative z-10 px-4 sm:px-6 pt-24 sm:pt-28 pb-12 formal-page-enter">
      {/* Top Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 text-xs font-medium border border-slate-200/90 shadow-xs transition-all cursor-pointer group backdrop-blur-md"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Member Portal</span>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="bg-white/90 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3 shadow-xs">
            {mode === 'login' ? (
              <LogIn className="w-6 h-6" />
            ) : (
              <KeyRound className="w-6 h-6" />
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'login' ? 'Member Sign In' : 'Reset Password'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {mode === 'login'
              ? 'Sign in with your registered email and password to view and update your profile.'
              : 'Only registered club members can reset their password. Enter your registered email below.'}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resetSentMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{resetSentMsg}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="member-login-email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="member-login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="member-login-password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="member-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-black active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <DotLoader size="sm" color="white" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to My Dashboard</span>
                </>
              )}
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200" />
              <span className="shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase">or</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="member-reset-email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Registered Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="member-reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <DotLoader size="sm" color="white" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Password Reset Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* Register Footer Link */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2.5">
          <p className="text-xs text-slate-500 font-medium">
            New to NGDC Science Club?
          </p>
          <button
            type="button"
            onClick={onGoToRegister}
            className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Register for Membership (Sign Up)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
