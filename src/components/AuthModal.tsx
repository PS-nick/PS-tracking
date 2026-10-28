import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  User, 
  Cloud, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    user, 
    profile, 
    isLoading, 
    error, 
    signInWithGoogle, 
    signInDemo, 
    signOut, 
    clearError 
  } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authMethod, setAuthMethod] = useState<'google' | 'demo' | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setAuthMethod('google');
    clearError();
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setAuthMethod(null);
    }
  };

  const handleDemoLogin = async () => {
    setIsSubmitting(true);
    setAuthMethod('demo');
    clearError();
    try {
      await signInDemo();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setAuthMethod(null);
    }
  };

  const handleLogout = async () => {
    setIsSubmitting(true);
    clearError();
    try {
      await signOut();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">
                Depot Security &amp; Database Auth
              </h3>
              <p className="text-xs text-neutral-400">
                Firebase Authentication &amp; Cloud Firestore Sync
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Database Status Card */}
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-emerald-400" />
              <span>Cloud Firestore Status:</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE &amp; PERSISTED</span>
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
            Units and 16-stage logs synchronize in real-time with Google Cloud Firestore database across depot benches.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Authentication Notice:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* User Status / Actions */}
        {profile || user ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-3">
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName || 'User'}
                    className="h-11 w-11 rounded-full border border-neutral-700 object-cover"
                  />
                ) : (
                  <div className={`h-11 w-11 rounded-full border flex items-center justify-center font-bold text-sm ${
                    profile?.role === 'customer'
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  }`}>
                    {profile?.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-neutral-100 truncate">
                    {profile?.displayName || 'Active User'}
                  </div>
                  <div className="text-xs text-neutral-400 font-mono truncate">
                    {profile?.email || profile?.customerEmail}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${
                      profile?.role === 'customer'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {profile?.role === 'customer' ? (profile.customerName || 'Customer Team') : (profile?.role?.replace('_', ' ') || 'Technician')}
                    </span>
                    {user?.uid && (
                      <span className="text-[10px] text-neutral-500 font-mono">
                        UID: {user.uid.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 pt-1 border-t border-neutral-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {profile?.role === 'customer' 
                    ? `Strict isolation active: Viewing only ${profile.customerName || 'your team'} units`
                    : 'Authorized for workshop overhaul stages & QA sign-off'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl border border-neutral-700 hover:border-neutral-600 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4 text-neutral-400" />
              <span>Log Out / Switch Account to Login Screen</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-neutral-300 leading-relaxed">
              Sign in with your Google account or bench technician identity to authenticate changes, sign QA certificates, and sync workflow data.
            </p>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold flex items-center justify-center gap-3 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && authMethod === 'google' ? (
                <Loader2 className="h-4 w-4 animate-spin text-neutral-900" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google Account</span>
            </button>

            {/* Quick Demo Technician Button */}
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && authMethod === 'demo' ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              ) : (
                <Key className="h-4 w-4 text-amber-400" />
              )}
              <span>Sign In as Bench Technician (Fast Access)</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
          <span>Project: heroic-sylph-2lxdt</span>
          <span className="flex items-center gap-1">
            <Cloud className="h-3 w-3 text-sky-400" />
            <span>Firestore Enabled</span>
          </span>
        </div>
      </div>
    </div>
  );
};
