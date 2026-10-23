import React, { useState } from 'react';
import { X, UserPlus, CheckCircle, ShieldCheck, Phone, MapPin, Upload } from 'lucide-react';
import { submitJoinRequest } from '../services/mandaliService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ImageGalleryPicker } from './ImageGalleryPicker.tsx';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const JoinModal: React.FC<JoinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [mobileNumber, setMobileNumber] = useState(currentUser?.mobileNumber || '');
  const [villageAddress, setVillageAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isPhonePublic, setIsPhonePublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = mobileNumber.replace(/\D/g, '').slice(-10);
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const userId = currentUser?.uid || `user_${cleanPhone}`;
      await submitJoinRequest({
        userId,
        fullName: fullName.trim(),
        mobileNumber: cleanPhone,
        villageAddress: villageAddress.trim() || 'H. Hosahalli',
        photoUrl: photoUrl.trim() || undefined,
        isPhonePublic,
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-amber-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-200" />
            <div>
              <h2 className="text-base font-bold leading-tight">Join Ganesh Mitra Mandali</h2>
              <p className="text-[11px] text-amber-100">H. Hosahalli Community Membership</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-amber-100 hover:text-white hover:bg-red-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5">
          {submitted ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
              <h3 className="text-base font-bold text-slate-900">Your request has been submitted</h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                Your application has been received by the Mandali administrators. Once approved, your name will appear in the verified member directory.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 shadow-sm"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  enterKeyHint="next"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-900 placeholder:text-slate-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="98XXXXXXXX"
                    enterKeyHint="next"
                    className="w-full text-xs p-2.5 pl-11 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono bg-white text-slate-900 placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Village Area / Address (Optional)
                </label>
                <input
                  type="text"
                  value={villageAddress}
                  onChange={(e) => setVillageAddress(e.target.value)}
                  placeholder="e.g. Near Old Temple, Main Road, H. Hosahalli"
                  enterKeyHint="next"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-900 placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* Profile Photo from Gallery or Camera */}
              <ImageGalleryPicker
                value={photoUrl}
                onChange={setPhotoUrl}
                label="Profile Photo (Optional)"
                helperText="Upload your photo directly from your device gallery or camera"
                shape="circle"
              />

              {/* Public Directory Consent Checkbox */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPhonePublic}
                    onChange={(e) => setIsPhonePublic(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <span className="text-[11px] text-slate-700 leading-tight">
                    Allow my phone number to be visible to other members in the directory (unchecked means phone number remains private).
                  </span>
                </label>
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting Application...' : 'SUBMIT MEMBERSHIP REQUEST'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
