import React, { useState } from 'react';
import {
  UserMinus,
  AlertTriangle,
  HeartHandshake,
  Check,
  X,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ExitMandaliModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const COMMON_REASONS = [
  'Relocating outside H. Hosahalli',
  'Personal commitments & time constraints',
  'Stepping down for new youth leaders',
  'Prefer being general devotee visitor',
];

export const ExitMandaliModal: React.FC<ExitMandaliModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, exitMandaliSession } = useAuth();
  const [reason, setReason] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedChecked, setConfirmedChecked] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSelectPreset = (preset: string) => {
    setSelectedPreset(preset);
    setReason(preset);
  };

  const handleConfirmExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedChecked) {
      setErrorMessage('Please check the confirmation box to proceed.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await exitMandaliSession(reason.trim() || selectedPreset || 'Voluntary exit as per member wish');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to process mandali exit. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] dark:bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[var(--border-default)] dark:border-slate-800 flex flex-col my-8 text-[var(--text-primary)]">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-red-700 via-amber-700 to-amber-800 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-amber-100 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-amber-200 shrink-0 ring-2 ring-white/20">
              <UserMinus className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-200 bg-black/25 px-2 py-0.5 rounded-full">
                  Voluntary Departure
                </span>
              </div>
              <h3 className="text-lg font-black text-white tracking-tight mt-0.5">
                Exit Ganesh Mitra Mandali
              </h3>
              <p className="text-xs text-amber-100/90">
                You can exit or step down from the mandali anytime as your wish
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleConfirmExit} className="p-5 sm:p-6 space-y-4">
          
          {/* Active Member Summary */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-extrabold text-sm flex items-center justify-center shrink-0">
              {currentUser.fullName?.[0]?.toUpperCase() || 'M'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentUser.fullName}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                +91 {currentUser.mobileNumber} · Current Status: Active Member
              </p>
            </div>
          </div>

          {/* Explanation of what happens */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>What happens when you exit Mandali:</span>
            </label>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pl-6 list-disc leading-relaxed">
              <li>
                <strong>Public Directory:</strong> Your profile will be removed from the active committee & members directory.
              </li>
              <li>
                <strong>Event Pass:</strong> Your official member QR check-in pass will be deactivated.
              </li>
              <li>
                <strong>Devotee Visitor Mode:</strong> You will remain logged in as a Devotee/Public Visitor, allowing you to view public festival schedules, announcements, and village emergency alerts.
              </li>
              <li>
                <strong>Rejoining:</strong> You have full freedom to re-apply or rejoin Ganesh Mitra Mandali whenever you wish in the future!
              </li>
            </ul>
          </div>

          {/* Preset Reasons */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Reason or Note for Mandali (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition text-left ${
                    selectedPreset === preset
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSelectedPreset(null);
              }}
              placeholder="Leave a message for the committee or reason for stepping down..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--bg-input)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500 focus:border-red-500 mt-2"
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="p-3 bg-red-50/70 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/40 rounded-2xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedChecked}
                onChange={(e) => setConfirmedChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 dark:border-slate-600 focus:ring-red-500"
              />
              <div className="text-xs text-red-950 dark:text-red-200 leading-snug">
                <span className="font-bold block">
                  I wish to voluntary exit from Ganesh Mitra Mandali
                </span>
                <span className="text-[11px] text-red-700 dark:text-red-300">
                  I understand I will step down from active member roles, but can rejoin anytime as my wish.
                </span>
              </div>
            </label>
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel / Stay in Mandali
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !confirmedChecked}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Exit...</span>
                </>
              ) : (
                <>
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Confirm Exit from Mandali</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
