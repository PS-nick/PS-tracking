import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  signInDemoTechnician, 
  logout, 
  onAuthStateChanged, 
  type FirebaseUser, 
  doc, 
  setDoc 
} from '../lib/firebase';
import { 
  getCustomerInfoByEmail, 
  verifyCustomerCredentials, 
  DEFAULT_CUSTOMER_PASSCODE, 
  PRESET_TECHNICIANS 
} from '../utils/customerAllocation';

export type UserRole = 'lead_engineer' | 'technician' | 'qa_inspector' | 'admin' | 'customer';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  lastLoginAt: string;
  customerEmail?: string | null;
  customerName?: string | null;
  assignedTechnicianName?: string | null;
  isGuest?: boolean;
}

export type PortalMode = 'technician' | 'customer';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  portalMode: PortalMode;
  isAssignedPerson: boolean;
  isTechnician: boolean;
  isCustomer: boolean;
  customerEmail: string | null;
  signInWithGoogle: () => Promise<void>;
  signInDemo: () => Promise<void>;
  signInAsTechnician: (techOrEmail: string | { 
    name?: string; 
    email: string; 
    role?: 'lead_engineer' | 'technician' | 'qa_inspector' | 'admin';
    photoURL?: string;
  }) => void;
  signInAsCustomer: (email: string, passcode?: string, customerName?: string) => { success: boolean; error?: string };
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  setPortalMode: (mode: PortalMode) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_CUSTOM_PROFILE_KEY = 'depot_auth_profile';
const LOCAL_STORAGE_PORTAL_MODE_KEY = 'depot_portal_mode';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CUSTOM_PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [portalMode, setPortalModeState] = useState<PortalMode>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PORTAL_MODE_KEY);
      if (saved === 'customer' || saved === 'technician') return saved;
      return 'technician';
    } catch {
      return 'technician';
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync portal mode to localStorage
  const setPortalMode = (mode: PortalMode) => {
    setPortalModeState(mode);
    try {
      localStorage.setItem(LOCAL_STORAGE_PORTAL_MODE_KEY, mode);
    } catch (e) {
      console.warn('Could not persist portal mode:', e);
    }
  };

  // Sync custom profile to localStorage
  const persistProfile = (newProfile: UserProfile | null) => {
    setProfile(newProfile);
    try {
      if (newProfile) {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_PROFILE_KEY, JSON.stringify(newProfile));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_CUSTOM_PROFILE_KEY);
      }
    } catch (e) {
      console.warn('Could not persist profile:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // If we don't already have an active profile or it's not a customer session
        const now = new Date().toISOString();
        const userProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || 'technician@bicester-depot.com',
          displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Nicola Malgarotti (Lead Tech)' : 'Depot Engineer'),
          photoURL: currentUser.photoURL || null,
          role: currentUser.isAnonymous ? 'technician' : 'lead_engineer',
          lastLoginAt: now,
          assignedTechnicianName: currentUser.displayName || 'Nicola Malgarotti',
        };
        persistProfile(userProfile);

        // Sync user profile to Firestore
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            email: userProfile.email,
            displayName: userProfile.displayName,
            role: userProfile.role,
            updatedAt: now,
          }, { merge: true });
        } catch (err) {
          console.warn('User profile sync to Firestore notice:', err);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      setPortalMode('technician');
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in encountered an issue.';
      setError(msg);
      throw err;
    }
  };

  const handleSignInDemo = async () => {
    setError(null);
    try {
      await signInDemoTechnician();
      const now = new Date().toISOString();
      const techProfile: UserProfile = {
        uid: 'demo-tech-nicola',
        email: 'n.malgarotti@particle-science.com',
        displayName: 'Nicola Malgarotti',
        photoURL: null,
        role: 'lead_engineer',
        lastLoginAt: now,
        assignedTechnicianName: 'Nicola Malgarotti',
      };
      persistProfile(techProfile);
      setPortalMode('technician');
    } catch (err: any) {
      const msg = err?.message || 'Anonymous technician login failed.';
      setError(msg);
      throw err;
    }
  };

  const handleSignInAsTechnician = (techOrEmail: string | { 
    name?: string; 
    email: string; 
    role?: 'lead_engineer' | 'technician' | 'qa_inspector' | 'admin';
    photoURL?: string;
  }) => {
    setError(null);
    const now = new Date().toISOString();
    
    let email = '';
    let displayName = '';
    let role: UserRole = 'technician';
    let photoURL: string | null = null;

    if (typeof techOrEmail === 'string') {
      email = techOrEmail.trim().toLowerCase();
      // Derive readable display name from email (e.g. nicola.malgarotti@particle-science.com -> Nicola Malgarotti)
      const username = email.split('@')[0] || 'Technician';
      displayName = username
        .split(/[._-]/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      if (email.includes('lead') || email.includes('malgarotti')) {
        role = 'lead_engineer';
      } else if (email.includes('qa') || email.includes('inspect')) {
        role = 'qa_inspector';
      } else if (email.includes('admin')) {
        role = 'admin';
      }
    } else {
      email = techOrEmail.email.trim().toLowerCase();
      displayName = techOrEmail.name || email.split('@')[0];
      role = techOrEmail.role || 'technician';
      photoURL = techOrEmail.photoURL || null;
    }

    const techProfile: UserProfile = {
      uid: `tech-${email.replace(/[@.]/g, '-')}`,
      email,
      displayName,
      photoURL,
      role,
      lastLoginAt: now,
      assignedTechnicianName: displayName,
    };
    persistProfile(techProfile);
    setPortalMode('technician');
  };

  const handleSignInAsCustomer = (email: string, passcode?: string, customerName?: string): { success: boolean; error?: string } => {
    setError(null);
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      const err = 'Please enter your corporate email address.';
      setError(err);
      return { success: false, error: err };
    }

    // Verify passcode if provided, or check default requirement
    const verification = verifyCustomerCredentials(cleanEmail, passcode || '');
    if (!verification.valid) {
      setError(verification.error || 'Authentication failed');
      return { success: false, error: verification.error || 'Invalid passcode' };
    }

    const derived = getCustomerInfoByEmail(cleanEmail);
    const resolvedName = customerName || verification.entry?.customerName || derived.customerName;
    const isGuest = cleanEmail === 'demo.guest@particlescience.com';

    const now = new Date().toISOString();
    const customerProfile: UserProfile = {
      uid: `customer-${cleanEmail.replace(/[@.]/g, '-')}`,
      email: cleanEmail,
      displayName: derived.contactPerson || verification.entry?.contactPerson || resolvedName,
      photoURL: null,
      role: 'customer',
      customerEmail: cleanEmail,
      customerName: resolvedName,
      lastLoginAt: now,
      isGuest,
    };

    persistProfile(customerProfile);
    setPortalMode('customer');
    return { success: true };
  };

  const handleSignInAsGuest = () => {
    handleSignInAsCustomer('demo.guest@particlescience.com', DEFAULT_CUSTOMER_PASSCODE, 'Guest Evaluation Partner');
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      if (user) {
        await logout();
      }
    } catch (err: any) {
      console.warn('Sign-out error:', err);
    } finally {
      persistProfile(null);
    }
  };

  // Calculated flags
  const isAssignedPerson = useMemo(() => {
    if (!profile) return false;
    if (profile.role === 'customer') return false;
    return ['lead_engineer', 'technician', 'qa_inspector', 'admin'].includes(profile.role);
  }, [profile]);

  const isTechnician = useMemo(() => {
    return isAssignedPerson;
  }, [isAssignedPerson]);

  const isCustomer = useMemo(() => {
    return profile?.role === 'customer';
  }, [profile]);

  const customerEmail = useMemo(() => {
    if (profile?.role === 'customer') {
      return profile.customerEmail || profile.email;
    }
    return null;
  }, [profile]);

  const value = useMemo(() => ({
    user,
    profile,
    isLoading,
    error,
    portalMode,
    isAssignedPerson,
    isTechnician,
    isCustomer,
    customerEmail,
    signInWithGoogle: handleSignInWithGoogle,
    signInDemo: handleSignInDemo,
    signInAsTechnician: handleSignInAsTechnician,
    signInAsCustomer: handleSignInAsCustomer,
    signInAsGuest: handleSignInAsGuest,
    signOut: handleSignOut,
    setPortalMode,
    clearError: () => setError(null),
  }), [
    user, 
    profile, 
    isLoading, 
    error, 
    portalMode, 
    isAssignedPerson, 
    isTechnician, 
    isCustomer, 
    customerEmail
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
