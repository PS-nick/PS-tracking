import React from 'react';
import { ShieldCheck, User, Cloud, Building2, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserAuthButtonProps {
  onOpenAuthModal: () => void;
  onPromptTechnicianLogin?: () => void;
}

export const UserAuthButton: React.FC<UserAuthButtonProps> = ({ 
  onOpenAuthModal,
  onPromptTechnicianLogin 
}) => {
  const { profile, isLoading, isAssignedPerson, isCustomer } = useAuth();

  if (isLoading) {
    return (
      <div className="h-8 w-20 rounded-lg bg-neutral-900 border border-neutral-800 animate-pulse" />
    );
  }

  if (profile) {
    const isTech = isAssignedPerson;
    return (
      <button
        type="button"
        onClick={onOpenAuthModal}
        className="px-2.5 py-1 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all flex items-center gap-2 cursor-pointer group shadow-xs"
        title={`Signed in as ${profile.displayName} (${profile.email || 'Authorized'})`}
      >
        <div className="relative">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName || 'User'}
              className="h-6 w-6 rounded-full object-cover border border-neutral-700 group-hover:border-amber-400 transition-colors"
            />
          ) : (
            <div className={`h-6 w-6 rounded-full border flex items-center justify-center font-bold text-[10px] ${
              isTech 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                : 'bg-sky-500/20 border-sky-500/40 text-sky-300'
            }`}>
              {isTech ? 'T' : 'C'}
            </div>
          )}
          <span 
            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-neutral-950 ${
              isTech ? 'bg-emerald-400' : 'bg-sky-400'
            }`} 
            title={isTech ? 'Technician Authorized' : 'Customer Portal Active'} 
          />
        </div>

        <div className="text-left hidden lg:block">
          <div className="text-xs font-bold text-neutral-100 group-hover:text-amber-300 transition-colors leading-none truncate max-w-[130px]">
            {profile.displayName}
          </div>
          <div className="text-[9px] font-mono flex items-center gap-1 mt-0.5">
            {isTech ? (
              <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                <Wrench className="h-2.5 w-2.5" />
                <span>Service Tech</span>
              </span>
            ) : (
              <span className="text-sky-400 font-semibold flex items-center gap-0.5">
                <Building2 className="h-2.5 w-2.5" />
                <span>Customer</span>
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onPromptTechnicianLogin || onOpenAuthModal}
      className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs group"
      title="Prompt Service Technician Login"
    >
      <Wrench className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
      <span>Technician Login</span>
    </button>
  );
};
