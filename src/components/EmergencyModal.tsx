import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, PhoneCall, Camera, CheckCircle } from 'lucide-react';
import { reportEmergency } from '../services/mandaliService.ts';
import { broadcastUrgentPushNotification } from '../services/fcmService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { openDialer } from '../utils/phoneUtils.ts';
import type { EmergencyReport } from '../types.ts';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMERGENCY_CATEGORIES: Array<EmergencyReport['category']> = [
  'Medical',
  'Fire',
  'Electrical',
  'Security',
  'Accident',
  'Other',
];

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [category, setCategory] = useState<EmergencyReport['category']>('Medical');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState(currentUser?.fullName || '');
  const [reporterPhone, setReporterPhone] = useState(currentUser?.mobileNumber || '');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleNextToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide an emergency description.');
      return;
    }
    if (!reporterName.trim() || !reporterPhone.trim()) {
      setError('Please provide your name and contact phone number.');
      return;
    }
    setError('');
    setStep('confirm');
  };

  const handleSendEmergency = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await reportEmergency({
        reportedBy: currentUser?.uid || 'guest_emergency',
        reporterName: reporterName.trim(),
        reporterPhone: reporterPhone.trim(),
        category,
        description: description.trim(),
        photoUrl: photoUrl.trim() || undefined,
      });

      // Broadcast Urgent Push Notification to all village devices
      try {
        await broadcastUrgentPushNotification({
          title: `🚨 EMERGENCY ALERT: ${category.toUpperCase()}`,
          body: `${description.trim().slice(0, 160)} (Reported by: ${reporterName.trim()})`,
          priority: 'urgent',
          topic: 'emergencies',
          link: 'home',
          senderName: reporterName.trim(),
        });
      } catch {
        // Non-blocking notification
      }

      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
        setStep('form');
        setDescription('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to broadcast emergency alert. Please contact committee directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border-2 border-red-500 overflow-hidden">
        
        {/* Header */}
        <div className="bg-red-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <div>
              <h2 className="text-base font-bold leading-tight">Mandali Emergency Alert</h2>
              <p className="text-[11px] text-red-100">H. Hosahalli Community Safety Protocol</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-red-100 hover:text-white hover:bg-red-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {step === 'form' && (
            <form onSubmit={handleNextToConfirm} className="space-y-4">
              {/* Notice */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-900 leading-relaxed">
                  <strong>Notice:</strong> This sends an immediate broadcast to all mandali coordinators and committee members. For critical life-threatening situations, also call official government emergency services directly.
                </div>
              </div>

              {/* Official Helplines with Direct Dialpad Redirection */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Direct Dial:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => openDialer('112', e)}
                    className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-red-100 hover:bg-red-200 active:scale-95 text-red-800 border border-red-300 flex items-center gap-1 transition cursor-pointer"
                    title="Dial National Emergency Police (112)"
                  >
                    <span>Police: 112</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => openDialer('108', e)}
                    className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-emerald-800 border border-emerald-300 flex items-center gap-1 transition cursor-pointer"
                    title="Dial Ambulance Helpline (108)"
                  >
                    <span>Ambulance: 108</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => openDialer('101', e)}
                    className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-orange-100 hover:bg-orange-200 active:scale-95 text-orange-800 border border-orange-300 flex items-center gap-1 transition cursor-pointer"
                    title="Dial Fire Emergency (101)"
                  >
                    <span>Fire: 101</span>
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Emergency Category <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EMERGENCY_CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                        category === cat
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  What is the emergency? (Location / Hazard) <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe location in H. Hosahalli, nature of emergency, people involved..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Your Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Phone Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    placeholder="10-digit Mobile"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
              >
                Proceed to Confirm Alert
              </button>
            </form>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-center">
                <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-900">Are you sure you want to broadcast this emergency?</h3>
                <p className="mt-1 text-xs text-slate-600">
                  This will immediately trigger a high-priority incident on all mandali member screens.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 border border-slate-200">
                <p><strong>Category:</strong> {category}</p>
                <p><strong>Details:</strong> {description}</p>
                <p><strong>Reporter:</strong> {reporterName} ({reporterPhone})</p>
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Back / Edit
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSendEmergency}
                  className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Broadcasting...' : 'YES, BROADCAST NOW'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
              <h3 className="text-base font-bold text-slate-900">Emergency Alert Broadcasted</h3>
              <p className="text-xs text-slate-600">
                Mandali coordinators have been alerted immediately.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
