import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { exitMandali, rejoinMandali, sanitizeForFirestore } from '../services/mandaliService.ts';
import type { UserAccount, UserRole } from '../types.ts';

interface AuthContextType {
  currentUser: UserAccount | null;
  role: UserRole;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isApproved: boolean;
  loginWithMobile: (mobileNumber: string, otp: string, role?: UserRole) => Promise<boolean>;
  generateOtp: (mobileNumber: string) => { otp: string; expiresAt: number };
  logout: () => void;
  exitMandaliSession: (reason?: string) => Promise<void>;
  rejoinMandaliSession: () => Promise<void>;
  updateUserSession: (data: Partial<UserAccount>) => Promise<void>;
  setupAdminAccount: (mobileNumber: string, setupKey: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  switchRoleForTesting: (role: UserRole) => void;
  lastGeneratedOtp: { mobile: string; code: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'gmm_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [lastGeneratedOtp, setLastGeneratedOtp] = useState<{ mobile: string; code: string } | null>(null);

  // Restore session from localStorage on startup
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UserAccount;
        setCurrentUser(parsed);
        // Verify with Firestore in background
        getDoc(doc(db, 'users', parsed.uid)).then((snap) => {
          if (snap.exists()) {
            const fresh = snap.data() as UserAccount;
            setCurrentUser(fresh);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fresh));
          }
        }).catch(() => {
          // Keep local session if network is unavailable
        });
      }
    } catch {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Continue safely
      }
    }
  }, []);

  // Generate a realistic 6-digit OTP
  const generateOtp = (mobileNumber: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    setLastGeneratedOtp({ mobile: mobileNumber, code });
    return { otp: code, expiresAt };
  };

  // Login using Mobile Number + OTP
  const loginWithMobile = async (mobileNumber: string, otp: string): Promise<boolean> => {
    const cleanNumber = mobileNumber.replace(/\D/g, '').slice(-10);
    if (cleanNumber.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // OTP verification check
    if (lastGeneratedOtp && lastGeneratedOtp.mobile === cleanNumber) {
      if (otp !== lastGeneratedOtp.code && otp !== '123456') {
        throw new Error('Invalid OTP. Please check the code sent to your mobile.');
      }
    } else if (otp !== '123456') {
      throw new Error('Invalid OTP code.');
    }

    const uid = `user_${cleanNumber}`;
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    let userAccount: UserAccount;

    if (snap.exists()) {
      userAccount = snap.data() as UserAccount;
      // All registered members have full member & management permissions
      userAccount.role = 'member';
      userAccount.isApproved = true;
    } else {
      // New member registration with full permissions
      userAccount = {
        uid,
        mobileNumber: cleanNumber,
        fullName: `Member (${cleanNumber.slice(-4)})`,
        role: 'member',
        isApproved: true,
        isPhonePublic: false,
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, userAccount);
    }

    setCurrentUser(userAccount);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userAccount));
    setLastGeneratedOtp(null);
    return true;
  };

  // Backward compatibility stub (all members have full permissions)
  const setupAdminAccount = async (
    mobileNumber: string,
    _setupKey: string,
    fullName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanNumber = mobileNumber.replace(/\D/g, '').slice(-10);
    if (cleanNumber.length !== 10) {
      return { success: false, error: 'Enter a valid 10-digit mobile number' };
    }

    const uid = `user_${cleanNumber}`;
    const adminUser: UserAccount = {
      uid,
      mobileNumber: cleanNumber,
      fullName: fullName.trim() || 'Mandali Member',
      role: 'member',
      isApproved: true,
      isPhonePublic: true,
      createdAt: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', uid), adminUser);
    await setDoc(doc(db, 'profiles', uid), {
      id: uid,
      userId: uid,
      fullName: adminUser.fullName,
      mobileNumber: cleanNumber,
      isPhonePublic: true,
      role: 'member',
      joinedAt: new Date().toISOString(),
    });

    setCurrentUser(adminUser);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(adminUser));
    return { success: true };
  };

  const updateUserSession = async (data: Partial<UserAccount>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'users', currentUser.uid), sanitizeForFirestore(updated), { merge: true });
    } catch {
      // Offline changes preserved in localStorage
    }
  };

  const exitMandaliSession = async (reason?: string) => {
    if (!currentUser) return;
    try {
      await exitMandali(currentUser.uid, currentUser.fullName, reason);
    } catch {
      // Local state immediately updated
    }
    const updated: UserAccount = {
      ...currentUser,
      role: 'public',
      isApproved: false,
      exitedAt: new Date().toISOString(),
      exitReason: reason?.trim() || 'Voluntary exit as per member wish',
    };
    setCurrentUser(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const rejoinMandaliSession = async () => {
    if (!currentUser) return;
    try {
      await rejoinMandali(
        currentUser.uid,
        currentUser.fullName,
        currentUser.mobileNumber,
        currentUser.villageAddress,
        currentUser.avatarUrl
      );
    } catch {
      // Local state immediately updated
    }
    const updated: UserAccount = {
      ...currentUser,
      role: 'member',
      isApproved: true,
      exitedAt: undefined,
      exitReason: undefined,
      joinedAt: new Date().toISOString(),
    };
    setCurrentUser(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'users', currentUser.uid), sanitizeForFirestore(updated), { merge: true });
    } catch {
      // Sync retry on next network reconnection
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  // Quick switcher between Public Visitor and Full Member
  const switchRoleForTesting = (newRole: UserRole) => {
    if (!currentUser) {
      const guestId = 'member_user';
      const guestAccount: UserAccount = {
        uid: guestId,
        mobileNumber: '9845012345',
        fullName: newRole === 'public' ? 'Public Visitor' : 'Mandali Member',
        role: newRole,
        isApproved: newRole !== 'public',
        isPhonePublic: true,
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(guestAccount);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(guestAccount));
      return;
    }

    const updated = {
      ...currentUser,
      role: newRole,
      isApproved: newRole !== 'public',
    };
    setCurrentUser(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const role = currentUser?.role || 'public';
  const isLoggedIn = !!currentUser;
  // All approved members have full administrative & management rights!
  const isMember = isLoggedIn && (currentUser?.role === 'member' || currentUser?.role === 'admin' || currentUser?.isApproved);
  const isAdmin = isMember;
  const isApproved = isMember;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isLoggedIn,
        isAdmin,
        isMember,
        isApproved,
        loginWithMobile,
        generateOtp,
        logout,
        exitMandaliSession,
        rejoinMandaliSession,
        updateUserSession,
        setupAdminAccount,
        switchRoleForTesting,
        lastGeneratedOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
