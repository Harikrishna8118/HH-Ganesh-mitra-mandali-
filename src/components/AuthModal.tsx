import React, { useState } from 'react';
import { X, Smartphone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithMobile, generateOtp, lastGeneratedOtp } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = mobileNumber.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    generateOtp(clean);
    setOtpSent(true);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await loginWithMobile(mobileNumber, otp.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Top */}
        <div className="bg-gradient-to-r from-red-700 to-amber-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-300" />
            <span className="font-bold text-sm tracking-wide">
              Mandali Member Sign In
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-red-100 hover:text-white hover:bg-red-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  All registered village members have full community management and coordination permissions.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  10-Digit Mobile Number
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
                    className="w-full text-xs p-2.5 pl-11 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 font-mono tracking-wider"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <span>Send Verification Code</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Code sent to <strong>+91 {mobileNumber}</strong></span>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-red-600 font-semibold hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Dev simulated OTP helper */}
              {lastGeneratedOtp && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-amber-900">
                    Verification OTP: <strong className="font-mono text-sm text-red-700 ml-1">{lastGeneratedOtp.code}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtp(lastGeneratedOtp.code)}
                    className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-semibold text-[11px]"
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center text-lg font-mono tracking-widest p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'VERIFY & ENTER MANDALI'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
