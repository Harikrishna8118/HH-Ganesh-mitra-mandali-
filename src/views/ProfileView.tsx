import React, { useState } from 'react';
import {
  User,
  Shield,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  LogOut,
  CheckCircle,
  RefreshCw,
  Key,
  QrCode,
  UserMinus,
  UserPlus,
  AlertTriangle,
  Heart,
  Check,
  Save,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Palette,
  Laptop,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { updateProfile } from '../services/mandaliService.ts';
import { MemberQRModal } from '../components/MemberQRModal.tsx';
import { ExitMandaliModal } from '../components/ExitMandaliModal.tsx';
import type { MemberProfile } from '../types.ts';

interface ProfileViewProps {
  onOpenAuth: () => void;
  onOpenJoin: () => void;
}

const DEVOTIONAL_AVATARS = [
  { label: 'Ganesh Gold', url: 'https://images.unsplash.com/photo-1567591974584-f1832d9e605d?auto=format&fit=crop&w=200&q=80' },
  { label: 'Murti Blessing', url: 'https://images.unsplash.com/photo-1599818817757-d35272a08342?auto=format&fit=crop&w=200&q=80' },
  { label: 'Temple Light', url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=200&q=80' },
  { label: 'Festive Diya', url: 'https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=200&q=80' },
];

const AVAILABLE_AREAS = [
  'Pooja & Rituals',
  'Prasada Distribution',
  'Stage & Decoration',
  'Sound & Lighting',
  'Cultural Programs',
  'Finance & Accounts',
  'Crowd & Queue Management',
  'Youth Volunteer',
];

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenAuth, onOpenJoin }) => {
  const {
    currentUser,
    isLoggedIn,
    isMember,
    logout,
    updateUserSession,
    rejoinMandaliSession,
    switchRoleForTesting,
  } = useAuth();

  const { theme, isDark, setTheme, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [villageAddress, setVillageAddress] = useState(currentUser?.villageAddress || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [isPhonePublic, setIsPhonePublic] = useState(currentUser?.isPhonePublic || false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(currentUser?.areasOfInterest || []);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);
  const [rejoinSuccess, setRejoinSuccess] = useState(false);

  const memberProfile: MemberProfile | null = currentUser
    ? {
        id: currentUser.uid,
        userId: currentUser.uid,
        fullName: currentUser.fullName,
        mobileNumber: currentUser.mobileNumber,
        avatarUrl: currentUser.avatarUrl,
        bio: currentUser.bio,
        villageAddress: currentUser.villageAddress,
        areasOfInterest: currentUser.areasOfInterest,
        isPhonePublic: currentUser.isPhonePublic,
        role: currentUser.role,
        joinedAt: currentUser.joinedAt || currentUser.createdAt || new Date().toISOString(),
      }
    : null;

  if (!isLoggedIn) {
    return (
      <div className="py-16 text-center space-y-4 max-w-sm mx-auto animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-900/50">
          <User className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Member Profile</h2>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Sign in with your mobile number to view and manage your Ganesh Mitra Mandali membership profile and application settings.
        </p>
        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={onOpenAuth}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
          >
            Sign In with Mobile
          </button>
          <button
            onClick={onOpenJoin}
            className="w-full py-2.5 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] font-bold text-xs hover:bg-[var(--bg-surface-muted)] transition"
          >
            Apply to Join Mandali
          </button>
        </div>
      </div>
    );
  }

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        villageAddress: villageAddress.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        isPhonePublic,
        areasOfInterest: selectedAreas,
      };

      await updateUserSession(payload);

      // Update in public profiles if user is an approved member
      if (currentUser.isApproved) {
        await updateProfile(currentUser.uid, payload);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update profile. Please try again.');
      setTimeout(() => setProfileError(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejoin = async () => {
    setIsRejoining(true);
    setProfileError(null);
    try {
      await rejoinMandaliSession();
      setRejoinSuccess(true);
      setTimeout(() => setRejoinSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to rejoin mandali. Please check connection.');
      setTimeout(() => setProfileError(null), 4000);
    } finally {
      setIsRejoining(false);
    }
  };

  const hasExited = !currentUser?.isApproved && (currentUser?.role === 'public' || !!currentUser?.exitedAt);

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12 animate-in fade-in duration-300">
      {profileError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <span>{profileError}</span>
          <button
            onClick={() => setProfileError(null)}
            className="text-red-500 hover:text-red-700 font-bold px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Profile Card */}
      <div className="p-6 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-card)] shadow-2xs space-y-4 transition-colors duration-250">
        <div className="flex items-center gap-4">
          <div className="relative">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover ring-4 ring-amber-400/60 dark:ring-amber-500/50"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-amber-600 text-white font-black text-xl flex items-center justify-center shadow-xs ring-4 ring-amber-400/60 dark:ring-amber-500/50">
                {currentUser?.fullName?.[0]?.toUpperCase() || 'M'}
              </div>
            )}
            {currentUser?.role === 'admin' && (
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 text-white shadow-xs" title="Administrator">
                <Shield className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">
              {currentUser?.fullName}
            </h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              +91 {currentUser?.mobileNumber}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  currentUser?.role === 'admin'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : isMember
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {currentUser?.role === 'admin'
                  ? 'Administrator'
                  : isMember
                  ? 'Verified Member'
                  : hasExited
                  ? 'Devotee (Exited Mandali)'
                  : 'Public Devotee'}
              </span>

              {/* Event QR Pass Button */}
              {isMember && (
                <button
                  type="button"
                  onClick={() => setShowQRModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-xs transition shadow-2xs cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>View Event QR Pass</span>
                </button>
              )}

              {/* Exit Mandali Button in Header */}
              {isMember && (
                <button
                  type="button"
                  onClick={() => setShowExitModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 text-xs font-bold transition shadow-2xs cursor-pointer"
                  title="Exit from Ganesh Mitra Mandali as your wish"
                >
                  <UserMinus className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>Exit Mandali</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EXITED MANDALI / DEVOTEE STATUS BANNER */}
      {hasExited && (
        <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-300/80 dark:border-amber-700/60 rounded-3xl space-y-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-2xl bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-200">
                You are currently a Devotee / Visitor
              </h3>
              <p className="text-xs text-amber-900/85 dark:text-amber-300/85 leading-relaxed">
                {currentUser?.exitedAt ? (
                  <>
                    You voluntarily exited from Ganesh Mitra Mandali on{' '}
                    <strong>
                      {new Date(currentUser.exitedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>
                    . You can edit your profile details below, or rejoin the mandali anytime as your wish!
                  </>
                ) : (
                  <>
                    You are browsing as a devotee visitor. You can edit your details or activate active mandali membership as your wish!
                  </>
                )}
              </p>
            </div>
          </div>

          {rejoinSuccess && (
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Welcome back! You have rejoined Ganesh Mitra Mandali.</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRejoin}
              disabled={isRejoining}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              {isRejoining ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Reactivating Membership...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Rejoin Mandali as Active Member</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SYSTEM-WIDE THEME & DARK MODE SETTINGS CARD */}
      <div className="p-6 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-card)] shadow-2xs space-y-5 transition-colors duration-250">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-300/60 dark:border-amber-700/50">
              {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-600" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Theme & Appearance Settings
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                System-wide dark mode with CSS variables & preserved festival accents
              </p>
            </div>
          </div>

          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
            {isDark ? 'Dark Mode Active' : 'Light Mode Active'}
          </span>
        </div>

        {/* 3-Way Segmented Theme Switcher */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[var(--text-secondary)]">
            Select Visual Mode
          </label>
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-amber-600' : ''}`} />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-amber-400' : ''}`} />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                theme === 'system'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-300 dark:ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Auto</span>
            </button>
          </div>
        </div>

        {/* Interactive Quick Toggle Slider Row */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-default)] transition-colors">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[var(--text-primary)] block">
              Dark Mode Quick Toggle
            </span>
            <span className="text-[11px] text-[var(--text-muted)] block">
              {isDark
                ? 'Deep midnight slate canvas with golden devotional illumination'
                : 'Warm cream devotional canvas with crisp cards'}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleTheme}
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isDark ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-250 ease-in-out flex items-center justify-center text-xs ${
                isDark ? 'translate-x-6 text-amber-600' : 'translate-x-0 text-slate-500'
              }`}
            >
              {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </span>
          </button>
        </div>

        {/* Accent Colors Preservation Guarantee Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Preserved Festival Accent Colors</span>
            </span>
            <span className="text-[10px] text-amber-800 dark:text-amber-400 font-mono">
              CSS Tokens
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Theme variables smoothly transition surface and text contrast while retaining all authentic Indian cultural colors across navigation, badges, and festival highlights:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="w-4 h-4 rounded-full bg-[#EF4444] shrink-0 shadow-xs" />
              <div className="text-[10px] leading-tight">
                <strong className="block text-slate-900 dark:text-slate-100">Crimson Red</strong>
                <span className="text-slate-500 dark:text-slate-400">Primary CTA</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="w-4 h-4 rounded-full bg-[#F59E0B] shrink-0 shadow-xs" />
              <div className="text-[10px] leading-tight">
                <strong className="block text-slate-900 dark:text-slate-100">Saffron Amber</strong>
                <span className="text-slate-500 dark:text-slate-400">Festivals & Glow</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="w-4 h-4 rounded-full bg-[#EAB308] shrink-0 shadow-xs" />
              <div className="text-[10px] leading-tight">
                <strong className="block text-slate-900 dark:text-slate-100">Temple Gold</strong>
                <span className="text-slate-500 dark:text-slate-400">QR Event Passes</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="w-4 h-4 rounded-full bg-[#10B981] shrink-0 shadow-xs" />
              <div className="text-[10px] leading-tight">
                <strong className="block text-slate-900 dark:text-slate-100">Tulasi Emerald</strong>
                <span className="text-slate-500 dark:text-slate-400">Verified Member</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Edit Form: User can edit from mandali as their wish */}
      <div className="p-6 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-card)] shadow-2xs space-y-5 transition-colors duration-250">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Edit Mandali Profile & Service Info
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Update your personal details, areas of service, and residence as your wish
            </p>
          </div>
          <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            Editable Anytime
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Gowda"
              className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
              Mobile Number (Fixed Verified Identity)
            </label>
            <input
              type="text"
              disabled
              value={`+91 ${currentUser?.mobileNumber}`}
              className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-slate-100 dark:bg-slate-800/80 font-mono text-slate-500 dark:text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
              Village Area / Residence (H. Hosahalli)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={villageAddress}
                onChange={(e) => setVillageAddress(e.target.value)}
                placeholder="e.g. Near Temple Square, H. Hosahalli"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
              About Me / Devotional Service Note
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share how you participate in Mandali festivals or village service..."
              className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Areas of Interest / Volunteer Preferences */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
              Areas of Mandali Service (Select your preferences)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_AREAS.map((area) => {
                const isSelected = selectedAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleArea(area)}
                    className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    <span>{area}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
              Profile Photo URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-2"
            />

            {/* Quick Presets */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[10px] font-bold text-[var(--text-muted)] shrink-0">
                Devotional Avatars:
              </span>
              {DEVOTIONAL_AVATARS.map((av) => (
                <button
                  key={av.label}
                  type="button"
                  onClick={() => setAvatarUrl(av.url)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition shrink-0 ${
                    avatarUrl === av.url
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-bold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <img
                    src={av.url}
                    alt={av.label}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span>{av.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact privacy toggle */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-[var(--border-default)] rounded-2xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPhonePublic}
                onChange={(e) => setIsPhonePublic(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 dark:border-slate-600"
              />
              <div className="text-xs text-[var(--text-secondary)] leading-snug">
                <span className="font-semibold block text-[var(--text-primary)]">Public Mobile Visibility</span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Allow other mandali members to see your phone number in the directory for festival duties.
                </span>
              </div>
            </label>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="w-4 h-4" />
              <span>Mandali profile changes saved successfully!</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-xs transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Mandali Profile'}</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-slate-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold transition flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </form>
      </div>

      {/* MANDALI MEMBERSHIP MANAGEMENT & EXIT ZONE */}
      <div className="p-5 bg-[var(--bg-surface)] rounded-3xl border border-red-200/80 dark:border-red-900/50 shadow-2xs space-y-3 transition-colors duration-250">
        <div className="flex items-center gap-2">
          <UserMinus className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Mandali Membership Freedom
          </h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          In Ganesh Mitra Mandali, membership is voluntary. You can exit from the mandali anytime as your wish, and re-join whenever you would like to participate again in village festivals.
        </p>

        <div className="pt-1 flex flex-wrap gap-2">
          {isMember ? (
            <button
              type="button"
              onClick={() => setShowExitModal(true)}
              className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-extrabold text-xs transition active:scale-95 flex items-center gap-2 shadow-2xs"
            >
              <UserMinus className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Exit from Mandali</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRejoin}
              disabled={isRejoining}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition active:scale-95 flex items-center gap-2 shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Rejoin Mandali as Active Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Developer Persona Testing Switcher */}
      <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-900/40 rounded-2xl space-y-2 transition-colors duration-250">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-amber-200">
          <RefreshCw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          <span>Quick Persona Switcher (Development & Evaluation)</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          Switch roles instantly to inspect application permissions as Public Visitor, Approved Member, or Committee Administrator:
        </p>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={() => switchRoleForTesting('public')}
            className={`py-1.5 text-xs font-semibold rounded-lg border text-center transition ${
              currentUser?.role === 'public'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Public User
          </button>
          <button
            type="button"
            onClick={() => switchRoleForTesting('member')}
            className={`py-1.5 text-xs font-semibold rounded-lg border text-center transition ${
              currentUser?.role === 'member'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Member
          </button>
          <button
            type="button"
            onClick={() => switchRoleForTesting('admin')}
            className={`py-1.5 text-xs font-semibold rounded-lg border text-center transition ${
              currentUser?.role === 'admin'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Admin
          </button>
        </div>
      </div>

      {/* MEMBER QR IDENTITY PASS MODAL */}
      {showQRModal && memberProfile && (
        <MemberQRModal
          member={memberProfile}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* EXIT MANDALI MODAL */}
      <ExitMandaliModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
      />
    </div>
  );
};
