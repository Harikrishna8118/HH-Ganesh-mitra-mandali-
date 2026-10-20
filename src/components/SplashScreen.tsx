import React, { useEffect, useState } from 'react';
import { GaneshLogo } from './GaneshLogo.tsx';

interface SplashScreenProps {
  onDismiss: () => void;
  logoUrl?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss, logoUrl }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Subtle, fast 1.8-second duration per prompt guidelines
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onDismiss, 400);
    }, 1800);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleTap = () => {
    setFading(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      onClick={handleTap}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#FFFDF9] via-[#FFF8EE] to-[#FEF3C7] text-slate-900 cursor-pointer select-none transition-opacity duration-400 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center text-center px-6 max-w-sm">
        {/* Divine Ganesha Emblem */}
        <div className="relative mb-6 transform transition-transform animate-in zoom-in-95 duration-500">
          <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl scale-125 animate-pulse" />
          <GaneshLogo size="xl" customUrl={logoUrl} className="ring-4 ring-amber-400/50 shadow-xl" />
        </div>

        {/* Mandali & Village Typography */}
        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-widest text-amber-800/80 font-bold">
            श्री गणेशाय नमः
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-red-700">
            GANESH MITRA MANDALI
          </h1>
          <p className="text-sm font-semibold tracking-wide text-amber-900/90 uppercase">
            H. HOSAHALLI
          </p>
        </div>

        {/* Subtle Cultural Tagline */}
        <p className="mt-6 text-xs text-slate-500 font-medium">
          Ganesh Chaturthi Community & Village Portal
        </p>

        {/* Tap to enter hint */}
        <span className="mt-8 text-[11px] text-slate-400">
          Tap anywhere to continue
        </span>
      </div>
    </div>
  );
};
