import React, { useState } from 'react';

interface GaneshLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  customUrl?: string;
}

export const GaneshLogo: React.FC<GaneshLogoProps> = ({
  className = '',
  size = 'md',
  customUrl,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size];

  // If a custom administrator uploaded logo exists and hasn't errored
  if (customUrl && !imageError) {
    return (
      <div className={`relative overflow-hidden rounded-full ring-2 ring-amber-400/50 shadow-sm ${sizeClasses} ${className}`}>
        <img
          src={customUrl}
          alt="Ganesh Mitra Mandali Logo"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Modern minimalist vermilion & amber Lord Ganesha vector emblem
  return (
    <div className={`relative flex items-center justify-center shrink-0 rounded-full bg-gradient-to-br from-amber-50 to-orange-100 ring-2 ring-amber-400/40 shadow-sm ${sizeClasses} ${className}`}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-0.5"
      >
        <defs>
          <linearGradient id="ganeshGMM" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="60%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <radialGradient id="gmmGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#FDE68A" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="60" cy="60" r="54" fill="url(#gmmGlow)" />
        <circle cx="60" cy="60" r="50" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

        {/* Crown / Mukut */}
        <path d="M52 24 L60 14 L68 24 L65 33 L55 33 Z" fill="url(#ganeshGMM)" stroke="#B91C1C" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="60" cy="20" r="2" fill="#FDE68A" />

        {/* Sacred Tilak / Tripundra */}
        <path d="M56 31 Q60 34 64 31" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <circle cx="60" cy="29" r="1.5" fill="#DC2626" />
        <path d="M54 27 Q60 30 66 27" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Ears */}
        <path d="M46 38 C34 38 32 54 44 60 C46 61 48 56 48 50 C48 44 47 40 46 38 Z" fill="url(#ganeshGMM)" opacity="0.95" />
        <path d="M74 38 C86 38 88 54 76 60 C74 61 72 56 72 50 C72 44 73 40 74 38 Z" fill="url(#ganeshGMM)" opacity="0.95" />

        {/* Curved Trunk (Vakratunda) */}
        <path d="M52 38 C52 36 68 36 68 38 C70 48 68 56 66 64 C64 74 65 82 72 84 C76 85 79 82 78 77 C77 74 74 74 73 76 C72 78 70 77 69 73 C68 68 67 60 70 52 C71 48 68 44 60 44 C54 44 52 48 52 54 C52 64 56 76 54 84 C52 92 42 92 40 84 C39 78 44 76 46 80 C47 82 49 82 50 78 C51 72 48 60 49 48 Z" fill="url(#ganeshGMM)" />

        {/* Modak in Hand */}
        <path d="M75 72 C77 68 83 68 85 72 C86 75 84 79 80 80 C76 79 74 75 75 72 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1.2" />
        <circle cx="80" cy="74" r="1.5" fill="#FEF3C7" />
      </svg>
    </div>
  );
};
