import React, { useState } from 'react';
import {
  X,
  LogIn,
  AlertCircle,
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  User as UserIcon,
  Info,
} from 'lucide-react';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  getAdditionalUserInfo,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { soundEngine } from '../utils/audio';

export interface AuthCompletionPayload {
  user: User;
  isNewUser: boolean;
  firstName?: string;
  lastName?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthCompleted?: (payload: AuthCompletionPayload) => void;
}

export function AuthModal({ isOpen, onClose, onAuthCompleted }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [showFeatureInfo, setShowFeatureInfo] = useState(false);

  if (!isOpen) return null;

  const formatFirebaseAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    const message = (err as { message?: string })?.message || '';
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Switch to Sign In to continue.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please check your credentials and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment before trying again.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in window was closed before completing. Please try again.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Allow pop-ups for this site and retry.';
      case 'auth/operation-not-allowed':
      case 'auth/admin-restricted-operation':
        return 'Email/Password sign-in is not enabled in Firebase Console. Use Google Sign-In below or enable Email/Password in Firebase Authentication.';
      default:
        return message || 'Unable to authenticate. Please try again.';
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playFeatureClick();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMsg('Please enter your name and surname.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        if (fullName) {
          await updateProfile(cred.user, { displayName: fullName }).catch(() => {});
        }
        sendEmailVerification(cred.user).catch(() => {});
        soundEngine.playSuccessChime();
        onAuthCompleted?.({
          user: cred.user,
          isNewUser: true,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        onClose();
      } else {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        soundEngine.playSuccessChime();
        onAuthCompleted?.({
          user: cred.user,
          isNewUser: false,
        });
        onClose();
      }
    } catch (err: unknown) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    soundEngine.playFeatureClick();
    setErrorMsg(null);
    setInfoMsg(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Enter your email above first to receive a password reset link.');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setInfoMsg(`Password reset email sent to ${trimmedEmail}.`);
    } catch (err: unknown) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    soundEngine.playFeatureClick();
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isNewUser = Boolean(getAdditionalUserInfo(result)?.isNewUser);
      soundEngine.playSuccessChime();
      onAuthCompleted?.({
        user: result.user,
        isNewUser,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={() => {
        soundEngine.playFeatureClick();
        onClose();
      }}
    >
      <div
        className="relative bg-white border border-slate-200 rounded-3xl w-full max-w-md max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden text-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center shrink-0">
              {mode === 'signup' ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 id="auth-modal-title" className="text-base font-bold tracking-tight text-slate-950 truncate">
                {mode === 'signup' ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {mode === 'signup'
                  ? 'Sign up with email or Google'
                  : 'Sign in with email or Google'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setShowFeatureInfo((prev) => !prev);
              }}
              aria-label="Sign In feature information"
              title="About Sign In"
              className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                showFeatureInfo ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                onClose();
              }}
              aria-label="Close sign in dialog"
              className="min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto bg-white">
          {showFeatureInfo && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1 animate-in fade-in duration-150">
              <div className="font-black flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>About Sign In & Accounts</span>
              </div>
              <p className="leading-relaxed text-blue-900 font-medium">
                Sign in with your email/password or Google account to post gigs, sell items, manage referrals, configure tenant settings, and track your ratings and subscriptions.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setMode('signin');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`min-h-[44px] py-2 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                mode === 'signin'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setMode('signup');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`min-h-[44px] py-2 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                mode === 'signup'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs font-medium text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs font-medium text-emerald-900">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer focus-visible:outline-none focus-visible:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-11 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full min-h-[44px] pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[46px] py-2.5 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              {mode === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span>
                {isLoading
                  ? mode === 'signup'
                    ? 'Creating Account...'
                    : 'Signing In...'
                  : mode === 'signup'
                  ? 'Create Account'
                  : 'Sign In'}
              </span>
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleAuth}
            className="w-full min-h-[46px] py-2.5 px-5 bg-slate-950 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.39 0 3.4 2.65 1.44 6.53l3.68 2.86C5.98 6.84 8.75 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.7 2.87c2.16-1.99 3.72-4.92 3.72-8.69z"
              />
              <path
                fill="#FBBC05"
                d="M5.12 14.61A7.01 7.01 0 0 1 4.75 12c0-.91.16-1.79.37-2.61L1.44 6.53A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.44 5.47l3.68-2.86z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.7-2.87c-1.08.72-2.45 1.16-4.23 1.16-3.25 0-6.02-1.84-6.88-4.43l-3.68 2.86C3.4 21.35 7.39 24 12 24z"
              />
            </svg>
            <span>
              {isLoading
                ? 'Connecting...'
                : mode === 'signup'
                ? 'Sign Up with Google'
                : 'Sign In with Google'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
