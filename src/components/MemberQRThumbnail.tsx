import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Maximize2 } from 'lucide-react';
import type { MemberProfile } from '../types.ts';

interface MemberQRThumbnailProps {
  member: MemberProfile;
  onClick: () => void;
  size?: number;
}

export const MemberQRThumbnail: React.FC<MemberQRThumbnailProps> = ({
  member,
  onClick,
  size = 54,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const verificationPayload = JSON.stringify({
      org: 'Shri Ganesh Mitra Mandali, H. Hosahalli',
      memberId: member.id,
      userId: member.userId,
      name: member.fullName,
      role: member.role,
      code: `GMM-${member.id.slice(0, 8).toUpperCase()}`,
      verified: true,
    });

    QRCode.toDataURL(verificationPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#7c2d12',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch(() => {
        // Fallback gracefully without thumbnail
      });

    return () => {
      isMounted = false;
    };
  }, [member.id, member.userId, member.fullName, member.role]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="View official event verification QR pass"
      className="group/qr relative p-1 bg-white hover:bg-amber-50 rounded-xl border border-amber-200/80 shadow-2xs transition-all hover:scale-105 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-amber-400 shrink-0 flex flex-col items-center justify-center cursor-pointer"
      style={{ width: size + 8, height: size + 8 }}
      aria-label={`View QR code event pass for ${member.fullName}`}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`QR Code for ${member.fullName}`}
          className="rounded-lg object-contain"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="flex items-center justify-center bg-amber-50 rounded-lg text-amber-700"
          style={{ width: size, height: size }}
        >
          <QrCode className="w-5 h-5 animate-pulse" />
        </div>
      )}

      {/* Hover/Tap Overlay */}
      <div className="absolute inset-0 bg-slate-900/60 rounded-xl opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-2xs">
        <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
      </div>

      <span className="sr-only">Expand QR Pass</span>
    </button>
  );
};
