import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Database,
  Users,
  Megaphone,
  ShieldAlert,
  Vote,
  Phone,
  Clock,
  HardDrive,
  Info,
} from 'lucide-react';
import { getOfflineCacheSummary } from '../services/offlineCacheService.ts';

interface NetworkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  offlineSince: Date | null;
  onCheckConnection: () => Promise<boolean>;
}

export const NetworkStatusModal: React.FC<NetworkStatusModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  offlineSince,
  onCheckConnection,
}) => {
  const [checking, setChecking] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const cache = getOfflineCacheSummary();

  if (!isOpen) return null;

  const handleTest = async () => {
    setChecking(true);
    setTestResult(null);
    try {
      const online = await onCheckConnection();
      if (online) {
        setTestResult('Success: Internet connectivity verified and connected to cloud!');
      } else {
        setTestResult('Offline: No internet connectivity detected. Using local cache.');
      }
    } catch {
      setTestResult('Check completed: operating in offline mode.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className={`p-5 text-white flex items-center justify-between ${
          isOnline
            ? 'bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900'
            : 'bg-gradient-to-r from-amber-700 via-red-800 to-amber-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-emerald-200" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-200 animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {isOnline ? 'Network Connected (Online)' : 'Device Offline (Cached Mode)'}
              </h2>
              <p className="text-xs text-white/80">
                {isOnline
                  ? 'Cloud sync is active for Ganesh Mitra Mandali'
                  : 'Operating seamlessly with locally cached village data'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Status Alert Box */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isOnline
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}>
            <div className="p-1.5 rounded-lg shrink-0 mt-0.5">
              {isOnline ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wide">
                {isOnline ? 'Real-Time Sync Active' : 'Offline Resilience Engaged'}
              </h3>
              <p className="text-xs leading-relaxed">
                {isOnline
                  ? 'Your changes are being saved to Firestore in real-time. Critical community data is also continuously cached locally for outage protection.'
                  : `Your device lost connection${offlineSince ? ` at ${offlineSince.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}. All critical directories, emergency contacts, announcements, and polls remain accessible from local device cache.`}
              </p>
            </div>
          </div>

          {/* Test connection feedback */}
          {testResult && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{testResult}</span>
            </div>
          )}

          {/* Local Cache Breakdown */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <span>Locally Cached Critical Data</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {cache.lastSyncedAt
                  ? `Last sync: ${new Date(cache.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Not yet synced'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Emergency Contacts */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Emergency Helpline</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-700 truncate">
                  {cache.contactPhone}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Available offline</span>
                </div>
              </div>

              {/* Members Directory */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Users className="w-3.5 h-3.5" />
                  <span>Member Directory</span>
                </div>
                <div className="text-sm font-black text-slate-900 tabular-nums">
                  {cache.membersCount} Profiles
                </div>
                <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Names & phones cached</span>
                </div>
              </div>

              {/* Announcements & Pooja Schedules */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Official Notices</span>
                </div>
                <div className="text-sm font-black text-slate-900 tabular-nums">
                  {cache.announcementsCount} Notices
                </div>
                <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Timings & schedules cached</span>
                </div>
              </div>

              {/* Decision Polls */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700">
                  <Vote className="w-3.5 h-3.5" />
                  <span>Decision Polls</span>
                </div>
                <div className="text-sm font-black text-slate-900 tabular-nums">
                  {cache.pollsCount} Polls
                </div>
                <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Active ballots cached</span>
                </div>
              </div>
            </div>
          </div>

          {/* Village Outage Explanation Note */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">
              Why Offline Caching Matters for H. Hosahalli:
            </span>
            <p className="leading-relaxed text-[11px]">
              During monsoon storms, power cuts, or patchy rural cellular coverage in Karnataka, devotees and mandali volunteers need access to emergency phone numbers, pooja times, and committee rosters without interruption.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={checking}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-amber-600' : 'text-slate-600'}`} />
            <span>{checking ? 'Checking Connection...' : 'Check Connection'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
