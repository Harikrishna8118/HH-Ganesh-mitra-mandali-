import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Download,
  Share2,
  Check,
  ShieldCheck,
  MapPin,
  Calendar,
  Sparkles,
  Printer,
  Copy,
} from 'lucide-react';
import type { MemberProfile } from '../types.ts';

interface MemberQRModalProps {
  member: MemberProfile | null;
  onClose: () => void;
}

export const MemberQRModal: React.FC<MemberQRModalProps> = ({ member, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const passCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!member) return;

    let isMounted = true;
    setIsGenerating(true);

    const verificationPayload = JSON.stringify({
      org: 'Shri Ganesh Mitra Mandali, H. Hosahalli',
      memberId: member.id,
      userId: member.userId,
      name: member.fullName,
      role: member.role,
      joined: member.joinedAt,
      village: member.villageAddress || 'H. Hosahalli',
      code: `GMM-${member.id.slice(0, 8).toUpperCase()}`,
      verified: true,
      timestamp: new Date().toISOString(),
    });

    QRCode.toDataURL(verificationPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#7c2d12', // Warm deep amber-red
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [member]);

  if (!member) return null;

  const memberPassId = `GMM-${member.id.slice(0, 8).toUpperCase()}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(memberPassId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `GMM-EventPass-${member.fullName.replace(/\s+/g, '_')}-${memberPassId}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${member.fullName} - Ganesh Mitra Mandali Event Pass`,
          text: `Official Event Identity Verification Pass for ${member.fullName} (ID: ${memberPassId}) - Shri Ganesh Mitra Mandali, H. Hosahalli`,
        });
      } catch {
        // User dismissed
      }
    } else {
      handleCopyCode();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const initials = member.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={passCardRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-200 relative animate-in zoom-in-95 duration-200 print:shadow-none print:border-none"
      >
        {/* Pass Top Banner */}
        <div className="bg-gradient-to-r from-red-700 via-amber-600 to-red-800 p-4 text-white relative">
          <button
            onClick={onClose}
            aria-label="Close pass"
            className="absolute top-3.5 right-3.5 p-1 rounded-full bg-black/25 text-white/90 hover:text-white hover:bg-black/40 transition print:hidden"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-white/20 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
              Official Community Event Pass
            </span>
          </div>

          <h3 className="text-sm font-extrabold tracking-tight leading-snug">
            Shri Ganesh Mitra Mandali
          </h3>
          <p className="text-[11px] text-amber-100/90 font-medium">H. Hosahalli Village</p>
        </div>

        {/* Member Details & Pass Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3.5">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.fullName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-400 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-100 to-amber-100 text-red-800 font-extrabold text-base flex items-center justify-center ring-2 ring-amber-400 shadow-xs">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-base font-extrabold text-slate-900 truncate">
                  {member.fullName}
                </h4>
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {member.role === 'admin' ? 'Committee Member' : 'Verified Member'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {memberPassId}
                </span>
              </div>

              {member.villageAddress && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{member.villageAddress}</span>
                </p>
              )}
            </div>
          </div>

          {/* QR Code Card */}
          <div className="p-4 bg-gradient-to-b from-amber-50/70 to-orange-50/40 border border-amber-200/80 rounded-2xl flex flex-col items-center justify-center relative">
            <div className="bg-white p-3 rounded-xl shadow-xs border border-amber-200/60 ring-4 ring-amber-100/50">
              {isGenerating ? (
                <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <QrCode className="w-8 h-8 animate-pulse text-amber-600" />
                  <span className="text-xs">Generating QR...</span>
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code verification pass for ${member.fullName}`}
                  className="w-44 h-44 object-contain rounded-lg"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-red-500">
                  QR Error
                </div>
              )}
            </div>

            <div className="mt-3 text-center space-y-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900">
                <QrCode className="w-3.5 h-3.5 text-amber-700" />
                Scan for Event Entry Verification
              </span>
              <p className="text-[10px] text-slate-500">
                Authorized for Ganesh Utsav, Sports Meets & Mandali Assemblies
              </p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div>
              <span className="block text-slate-400 text-[9px] uppercase font-semibold">
                Member Since
              </span>
              <span className="font-medium text-slate-700 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                {new Date(member.joinedAt).toLocaleDateString([], {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 text-[9px] uppercase font-semibold">Status</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Member
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1 print:hidden">
            <button
              onClick={handleDownloadQR}
              disabled={!qrDataUrl}
              className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Save Pass</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="py-2 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy ID</span>
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-between text-[10px] text-slate-400">
          <span>H. Hosahalli Ganesh Mitra Mandali</span>
          <button
            onClick={handlePrint}
            className="hover:text-slate-600 flex items-center gap-1 font-medium print:hidden"
          >
            <Printer className="w-3 h-3" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
};
