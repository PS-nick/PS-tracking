import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  LogIn, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Key, 
  Wrench, 
  Briefcase,
  ChevronRight,
  ExternalLink,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PRESET_TECHNICIANS, TechnicianPreset } from '../utils/customerAllocation';

interface ServiceTechnicianLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToCustomerPortal?: () => void;
  reason?: string | null;
}

export const ServiceTechnicianLoginModal: React.FC<ServiceTechnicianLoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToCustomerPortal,
  reason,
}) => {
  const { 
    profile, 
    isAssignedPerson, 
    signInAsTechnician, 
    signInWithGoogle, 
    signInDemo,
    signOut,
    error,
    clearError
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'google'>('presets');
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customRole, setCustomRole] = useState<'lead_engineer' | 'technician' | 'qa_inspector' | 'admin'>('technician');
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccessNotice, setLoginSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (tech: TechnicianPreset) => {
    setIsSubmitting(true);
    clearError();
    try {
      signInAsTechnician({
        name: tech.name,
        email: tech.email,
        role: tech.role,
      });
      setLoginSuccessNotice(`Authenticated as ${tech.name} (${tech.roleLabel})`);
      setTimeout(() => {
        setLoginSuccessNotice(null);
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (e) {
      setIsSubmitting(false);
    }
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEmail.trim()) return;

    setIsSubmitting(true);
    clearError();
    try {
      signInAsTechnician({
        name: customName.trim(),
        email: customEmail.trim(),
        role: customRole,
      });
      setLoginSuccessNotice(`Authorized as ${customName} (${customRole})`);
      setTimeout(() => {
        setLoginSuccessNotice(null);
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (e) {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    clearError();
    try {
      await signInWithGoogle();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsSubmitting(true);
    clearError();
    try {
      await signInDemo();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOutTechnician = async () => {
    setIsSubmitting(true);
    try {
      await signOut();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-4 flex items-center justify-center animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-100">
                  Service Technician Login
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Depot Staff Only
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Bicester Motion Technical Depot · Particle Science Workshop Authentication
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Reason / Context Alert if triggered by restricted access */}
        {reason && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Authorization Required</p>
              <p className="text-neutral-300 mt-0.5 text-[11px] leading-relaxed">
                {reason}
              </p>
            </div>
          </div>
        )}

        {/* Currently Logged-in State (if any) */}
        {profile && isAssignedPerson ? (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-sm">
                  {profile.displayName?.charAt(0) || 'T'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-200">{profile.displayName}</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-full font-semibold border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">{profile.email} · Role: {profile.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOutTechnician}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-red-950/40 text-neutral-300 hover:text-red-400 text-xs rounded-lg border border-neutral-700 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
            <p className="text-[11px] text-emerald-400/90 leading-tight">
              ✓ Full access granted to Service Analytics, Cloud Daily Quota, Unit Overhaul Pipeline, and Conformance Sign-off.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'presets'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Depot Roster (1-Click)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'custom'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Staff Credentials
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('google')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'google'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Google / Firebase
              </button>
            </div>

            {/* Success toast */}
            {loginSuccessNotice && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{loginSuccessNotice}</span>
              </div>
            )}

            {/* Error notice */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Tab 1: Workshop Technician Presets */}
            {activeTab === 'presets' && (
              <div className="space-y-2">
                <p className="text-xs text-neutral-400">
                  Select your technician profile from the registered Bicester workshop roster:
                </p>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                  {PRESET_TECHNICIANS.map((tech) => (
                    <button
                      key={tech.email}
                      type="button"
                      onClick={() => handleSelectPreset(tech)}
                      disabled={isSubmitting}
                      className="w-full text-left p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/50 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg border flex items-center justify-center font-bold text-xs ${tech.badgeColor}`}>
                          {tech.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-200 group-hover:text-amber-300 transition-colors">
                              {tech.name}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              ({tech.roleLabel})
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 line-clamp-1">
                            {tech.specialty}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Custom Staff Login */}
            {activeTab === 'custom' && (
              <form onSubmit={handleCustomLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Technician Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Nicola Malgarotti"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Staff Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="e.g. n.malgarotti@particle-science.com"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Assigned Role
                    </label>
                    <select
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="lead_engineer">Lead Overhaul Engineer</option>
                      <option value="technician">Service Technician</option>
                      <option value="qa_inspector">QA Inspector</option>
                      <option value="admin">Depot Manager / Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Workshop PIN (Optional)
                    </label>
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="••••"
                      maxLength={6}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 mt-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Authorize &amp; Sign In as Service Technician</span>
                </button>
              </form>
            )}

            {/* Tab 3: Google Workspace / Firebase */}
            {activeTab === 'google' && (
              <div className="space-y-3 py-2">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Sign in with your verified company Google Workspace account or anonymous technician credentials.
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-bold text-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <LogIn className="h-4 w-4 text-amber-400" />
                    <span>Sign In with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>Instant Anonymous Technician Pass</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer with switch to Customer Portal */}
        <div className="border-t border-neutral-800 pt-3 flex items-center justify-between text-xs">
          <div className="text-neutral-500 text-[11px]">
            Are you a customer or racing constructor?
          </div>
          {onSwitchToCustomerPortal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToCustomerPortal();
              }}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Go to Customer Portal</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
