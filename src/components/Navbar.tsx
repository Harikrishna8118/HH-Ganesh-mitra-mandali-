import React, { useState } from 'react';
import { GaneshLogo } from './GaneshLogo.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { NetworkStatusModal } from './NetworkStatusModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  Bell,
  ShieldAlert,
  LogIn,
  UserCheck,
  Shield,
  Wifi,
  WifiOff,
  Sun,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  unreadCount: number;
  onOpenEmergency: () => void;
  onOpenAuth: () => void;
  logoUrl?: string;
  isOnline?: boolean;
  offlineSince?: Date | null;
  onCheckConnection?: () => Promise<boolean>;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  unreadCount,
  onOpenEmergency,
  onOpenAuth,
  logoUrl,
  isOnline = true,
  offlineSince = null,
  onCheckConnection,
}) => {
  const { currentUser, isLoggedIn, isAdmin, isMember } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-default)] shadow-xs transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
          
          {/* Zone 1: Single Brand Lockup */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded-lg p-1"
          >
            <GaneshLogo size="md" customUrl={logoUrl} />
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-red-700 dark:text-red-500 leading-none group-hover:text-red-800 dark:group-hover:text-red-400 transition-colors whitespace-nowrap">
                Ganesh Mitra Mandali
              </span>
              <span className="text-[11px] font-medium text-amber-800/80 dark:text-amber-400/90 leading-tight">
                H. Hosahalli
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links for Tablet/Desktop */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => onNavigate('home')}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                currentView === 'home' ? 'text-red-600 dark:text-red-400 font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('members')}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                currentView === 'members' ? 'text-red-600 dark:text-red-400 font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => onNavigate('chat')}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                currentView === 'chat' ? 'text-red-600 dark:text-red-400 font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => onNavigate('discussions')}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                currentView === 'discussions' ? 'text-red-600 dark:text-red-400 font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Discussions & Polls
            </button>
            <button
              onClick={() => onNavigate('announcements')}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                currentView === 'announcements' ? 'text-red-600 dark:text-red-400 font-semibold' : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Announcements
            </button>
            {isLoggedIn && (
              <button
                onClick={() => onNavigate('admin')}
                className={`whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors ${
                  currentView === 'admin' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Management
              </button>
            )}
          </nav>

          {/* Zone 3: Actions & Quick Triggers */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Network Status Indicator */}
            <button
              type="button"
              onClick={() => setShowNetworkModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition shadow-2xs active:scale-95 ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-950 dark:text-amber-200 border border-amber-400 ring-2 ring-amber-400/40 animate-pulse'
              }`}
              title={
                isOnline
                  ? 'Network: Online · Cloud sync active. Click for offline cache status.'
                  : 'Network: Offline · Operating on local device cache. Click for details.'
              }
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300 shrink-0" />
                  <span>Offline</span>
                </>
              )}
            </button>

            {/* Quick Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition-colors"
              aria-label="Toggle system-wide dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>

            {/* PWA Install */}
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>

            {/* Emergency Alert Quick Button */}
            <button
              onClick={onOpenEmergency}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-lg shadow-xs transition-all whitespace-nowrap"
              title="Report Village / Mandali Emergency"
            >
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">Emergency</span>
            </button>

            {/* Notifications Button */}
            <button
              onClick={() => onNavigate('notifications')}
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full ring-2 ring-white dark:ring-slate-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Account / Login */}
            {isLoggedIn ? (
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-xs flex items-center justify-center">
                  {currentUser?.fullName?.[0]?.toUpperCase() || 'M'}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[100px]">
                  {currentUser?.fullName}
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Network Status & Offline Data Modal */}
      <NetworkStatusModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        isOnline={isOnline}
        offlineSince={offlineSince}
        onCheckConnection={onCheckConnection || (() => Promise.resolve(isOnline))}
      />
    </>
  );
};
