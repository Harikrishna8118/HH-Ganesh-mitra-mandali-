import React, { useState } from 'react';
import {
  X,
  Scan,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  UserCheck,
  Calendar,
  MapPin,
} from 'lucide-react';
import type { MemberProfile } from '../types.ts';

interface EventQRVerifierModalProps {
  members: MemberProfile[];
  onClose: () => void;
  onSelectMemberPass: (member: MemberProfile) => void;
}

export const EventQRVerifierModal: React.FC<EventQRVerifierModalProps> = ({
  members,
  onClose,
  onSelectMemberPass,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [scannedResult, setScannedResult] = useState<{
    status: 'idle' | 'valid' | 'invalid';
    member?: MemberProfile;
    details?: string;
  }>({ status: 'idle' });

  const handleVerify = (textToVerify: string) => {
    const query = textToVerify.trim();
    if (!query) return;

    // Check if it's JSON from QR
    let targetMemberId = '';
    let targetUserId = '';
    let targetPassCode = '';

    try {
      if (query.startsWith('{') && query.endsWith('}')) {
        const parsed = JSON.parse(query);
        targetMemberId = parsed.memberId || '';
        targetUserId = parsed.userId || '';
        targetPassCode = parsed.code || '';
      }
    } catch {
      // not JSON, continue with raw query
    }

    const cleanQuery = query.toLowerCase().replace(/^gmm-/, '');

    const found = members.find((m) => {
      if (targetMemberId && m.id === targetMemberId) return true;
      if (targetUserId && m.userId === targetUserId) return true;
      if (targetPassCode && `gmm-${m.id.slice(0, 8).toUpperCase()}` === targetPassCode.toUpperCase()) return true;

      // Check member ID, short ID, or mobile
      if (m.id.toLowerCase() === query.toLowerCase()) return true;
      if (m.id.toLowerCase().startsWith(cleanQuery)) return true;
      if (m.mobileNumber && m.mobileNumber.includes(query)) return true;
      if (m.fullName.toLowerCase() === query.toLowerCase()) return true;

      return false;
    });

    if (found) {
      setScannedResult({
        status: 'valid',
        member: found,
        details: 'Official verified member of Shri Ganesh Mitra Mandali, H. Hosahalli',
      });
    } else {
      setScannedResult({
        status: 'invalid',
        details: 'No active member matches this QR code or ID in the community registry.',
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-amber-950 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Scan className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold">Event Gate Pass Verifier</h3>
              <p className="text-[11px] text-slate-300">
                Verify member identity QR codes for in-person community events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Paste Scanned QR Code Data or Enter Member ID / Phone:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify(inputCode)}
                  placeholder="e.g. GMM-A1B2C3D4 or scan data..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleVerify(inputCode)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition active:scale-95 shrink-0"
              >
                Verify
              </button>
            </div>
          </div>

          {/* Quick Select from Member List */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">
              Quick test sample from approved members:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {members.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    const code = `GMM-${m.id.slice(0, 8).toUpperCase()}`;
                    setInputCode(code);
                    handleVerify(code);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[11px] font-medium shrink-0 transition"
                >
                  {m.fullName.split(' ')[0]} ({`GMM-${m.id.slice(0, 4)}`})
                </button>
              ))}
            </div>
          </div>

          {/* Result Card */}
          {scannedResult.status === 'valid' && scannedResult.member && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>VERIFIED IDENTITY PASS — VALID ENTRY</span>
              </div>

              <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                {scannedResult.member.avatarUrl ? (
                  <img
                    src={scannedResult.member.avatarUrl}
                    alt={scannedResult.member.fullName}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-400"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                    {scannedResult.member.fullName[0]}
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {scannedResult.member.fullName}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {scannedResult.member.role === 'admin' ? 'Committee' : 'Member'}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-500">
                    ID: GMM-{scannedResult.member.id.slice(0, 8).toUpperCase()}
                  </p>

                  {scannedResult.member.villageAddress && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {scannedResult.member.villageAddress}
                    </p>
                  )}

                  <p className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                    <Calendar className="w-3 h-3" />
                    Member since{' '}
                    {new Date(scannedResult.member.joinedAt).toLocaleDateString([], {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectMemberPass(scannedResult.member!)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  View Full Event Pass
                </button>
              </div>
            </div>
          )}

          {scannedResult.status === 'invalid' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-800 animate-in zoom-in-95">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Verification Failed: Unrecognized Pass</strong>
                <p className="text-red-700 text-[11px] mt-0.5">{scannedResult.details}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            H. Hosahalli Ganesh Mitra Mandali Verification
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-200 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
