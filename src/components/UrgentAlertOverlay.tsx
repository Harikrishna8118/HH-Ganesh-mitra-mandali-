import React, { useEffect, useState } from 'react';
import {
  BellRing,
  ShieldAlert,
  AlertTriangle,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
  PhoneCall,
  Share2,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  HandHeart,
  ShieldCheck,
} from 'lucide-react';
import { playAlertChime } from '../services/fcmService.ts';

export interface UrgentAlertData {
  id: string;
  title: string;
  body: string;
  priority?: 'urgent' | 'high' | 'normal';
  topic?: string;
  senderName?: string;
  senderPhone?: string;
  sentAt?: string;
  link?: string;
  category?: string;
  isEmergency?: boolean;
  photoUrl?: string;
}

interface UrgentAlertOverlayProps {
  alert: UrgentAlertData | null;
  onDismiss: () => void;
  onNavigate: (view: string) => void;
  onCallPhone?: (phone: string) => void;
}

export const UrgentAlertOverlay: React.FC<UrgentAlertOverlayProps> = ({
  alert,
  onDismiss,
  onNavigate,
  onCallPhone,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [volunteerStatus, setVolunteerStatus] = useState<'helping' | 'safe' | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('gmm_alert_chime_muted') === 'true';
  });

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('gmm_alert_chime_muted', next ? 'true' : 'false');
  };

  // Auto-play sound chime when an urgent alert overlay opens (unless muted)
  useEffect(() => {
    if (alert) {
      setHasAcknowledged(false);
      setCopiedShare(false);
      setVolunteerStatus(null);
      if (!isMuted) {
        playAlertChime();
      }
    }
  }, [alert?.id]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && alert) {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const isCritical = alert.priority === 'urgent' || alert.isEmergency;
  const timeFormatted = alert.sentAt
    ? new Date(alert.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  const handleShareWhatsApp = () => {
    const message = `🚨 *URGENT MANDALI ALERT - H. HOSAHALLI*\n\n*${alert.title}*\n${alert.body}\n\nBroadcast by: ${alert.senderName || 'Mandali Admin'}\nTime: ${timeFormatted}\n\nCheck official Ganesh Mitra Mandali app for instant updates.`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  const handleActionClick = () => {
    if (alert.link) {
      onNavigate(alert.link);
    } else {
      onNavigate('announcements');
    }
    onDismiss();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="urgent-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Background radial beacon glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div
          className={`w-[600px] h-[600px] rounded-full blur-3xl opacity-30 animate-pulse ${
            isCritical ? 'bg-red-600' : 'bg-amber-500'
          }`}
        />
      </div>

      {/* Main Alert Modal Container */}
      <div className="relative w-full max-w-lg bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-3xl border-2 border-red-500/80 shadow-2xl shadow-red-950/50 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Pulsing Emergency Top Strip */}
        <div
          className={`px-4 py-2 text-white flex items-center justify-between text-xs font-black uppercase tracking-wider ${
            isCritical
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 animate-pulse'
              : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span>
              {alert.isEmergency ? '🚨 CRITICAL EMERGENCY ALERT' : '⚡ HIGH-PRIORITY BROADCAST'}
            </span>
          </div>

          <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded font-mono font-bold tracking-normal">
            FCM PUSH
          </span>
        </div>

        {/* Header with Devotional Emblem & Title */}
        <div className="p-5 pb-3 bg-gradient-to-b from-red-500/10 dark:from-red-950/40 to-transparent border-b border-[var(--border-default)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                  isCritical
                    ? 'bg-red-600 text-white ring-4 ring-red-400/40'
                    : 'bg-amber-500 text-white ring-4 ring-amber-400/40'
                }`}
              >
                {alert.isEmergency ? (
                  <ShieldAlert className="w-6 h-6 animate-bounce" />
                ) : (
                  <BellRing className="w-6 h-6 animate-pulse" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400">
                    ಶ್ರೀ ಗಣೇಶ ಮಿತ್ರ ಮಂಡಳಿ • H. Hosahalli
                  </span>
                  {alert.category && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                      {alert.category}
                    </span>
                  )}
                </div>

                <h2
                  id="urgent-alert-title"
                  className="text-lg sm:text-xl font-black text-red-950 dark:text-red-100 leading-snug mt-0.5"
                >
                  {alert.title}
                </h2>
              </div>
            </div>

            {/* Quick Dismiss Button */}
            <button
              type="button"
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0"
              title="Close alert"
              aria-label="Close urgent alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Metadata chips */}
          <div className="flex items-center gap-3 pt-3 text-[11px] text-[var(--text-muted)] flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-red-500" />
              <span>{timeFormatted}</span>
            </span>

            {alert.senderName && (
              <span className="flex items-center gap-1">
                <span>By:</span>
                <strong className="text-slate-900 dark:text-slate-100">{alert.senderName}</strong>
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => playAlertChime()}
                className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-bold"
                title="Play alert sound again"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                  isMuted
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                }`}
                title={isMuted ? 'Alert chime is muted. Click to enable sound.' : 'Alert chime is enabled. Click to mute.'}
              >
                {isMuted ? <VolumeX className="w-3 h-3 text-slate-500" /> : <Volume2 className="w-3 h-3 text-amber-600" />}
                <span>{isMuted ? 'Muted' : 'Sound On'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body with High-Contrast Layout */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[46vh]">
          {/* Main Broadcast Message */}
          <div className="p-4 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 text-sm leading-relaxed text-[var(--text-primary)] font-medium">
            <p className="whitespace-pre-wrap">{alert.body}</p>
          </div>

          {/* Volunteer & Safety Check-in Section */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/20 dark:to-amber-950/20 border border-red-200 dark:border-red-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-red-900 dark:text-red-200 uppercase tracking-wide flex items-center gap-1.5">
                <HandHeart className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                Community Safety & Volunteer Check-in
              </span>
              {volunteerStatus && (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Recorded
                </span>
              )}
            </div>

            {volunteerStatus === 'helping' ? (
              <div className="p-2.5 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Thank you! Your availability to assist and volunteer has been recorded. Please proceed carefully to the mandali desk if requested.</span>
              </div>
            ) : volunteerStatus === 'safe' ? (
              <div className="p-2.5 rounded-xl bg-blue-100/80 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 font-semibold flex items-center gap-2 animate-in fade-in">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Status recorded: You and your family are safe. Please keep in contact with neighbours and watch for announcements.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setVolunteerStatus('helping')}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <HandHeart className="w-3.5 h-3.5" />
                  <span>I Can Help / Volunteer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVolunteerStatus('safe')}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>I Am Safe</span>
                </button>
              </div>
            )}
          </div>

          {/* Optional Attached Photo */}
          {alert.photoUrl && (
            <div className="rounded-2xl overflow-hidden border border-[var(--border-default)] shadow-xs">
              <img
                src={alert.photoUrl}
                alt="Emergency / Alert photo"
                referrerPolicy="no-referrer"
                className="w-full max-h-56 object-cover"
              />
            </div>
          )}

          {/* Emergency Contact Card (If phone number provided or emergency category) */}
          {(alert.senderPhone || alert.isEmergency) && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 block">
                  Mandali Emergency Helpline / Reporter
                </span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 truncate block">
                  {alert.senderPhone || 'H. Hosahalli Mandali Desk'}
                </span>
              </div>

              {alert.senderPhone ? (
                <a
                  href={`tel:${alert.senderPhone}`}
                  onClick={() => onCallPhone?.(alert.senderPhone!)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call Now</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('home');
                    onDismiss();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>View Contacts</span>
                </button>
              )}
            </div>
          )}

          {/* Community Advisory Notice */}
          <div className="p-3 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-default)] text-[11px] text-[var(--text-muted)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              This alert was pushed to all registered mandali members via Firebase Cloud Messaging. Please assist elders and fellow villagers.
            </span>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-[var(--bg-surface-muted)] border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Share to WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--bg-surface)] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              title="Share alert on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{copiedShare ? 'Shared!' : 'Share WhatsApp'}</span>
            </button>

            {/* Acknowledge Button */}
            <button
              type="button"
              onClick={() => {
                setHasAcknowledged(true);
                setTimeout(onDismiss, 200);
              }}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--bg-surface)] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{hasAcknowledged ? 'Acknowledged' : 'Dismiss'}</span>
            </button>
          </div>

          {/* Primary View Action */}
          <button
            type="button"
            onClick={handleActionClick}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md shadow-red-600/30 cursor-pointer"
          >
            <span>View Full Details</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
