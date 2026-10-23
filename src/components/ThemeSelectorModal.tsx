import React from 'react';
import {
  Palette,
  X,
  Check,
  Sparkles,
  Sun,
  Moon,
  Droplets,
  Flame,
  Leaf,
  Layers,
  Monitor,
} from 'lucide-react';
import { useTheme, type ThemeMode } from '../context/ThemeContext.tsx';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme, resolvedTheme, setTheme, availableThemes } = useTheme();

  if (!isOpen) return null;

  const getThemeIcon = (id: ThemeMode) => {
    switch (id) {
      case 'light':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'dark':
        return <Moon className="w-4 h-4 text-amber-400" />;
      case 'glass':
        return <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />;
      case 'saffron':
        return <Flame className="w-4 h-4 text-amber-600" />;
      case 'midnight':
        return <Moon className="w-4 h-4 text-amber-300" />;
      case 'emerald':
        return <Leaf className="w-4 h-4 text-emerald-600" />;
      case 'vermilion':
        return <Droplets className="w-4 h-4 text-rose-500" />;
      default:
        return <Palette className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[var(--border-default)] flex flex-col my-8">
        
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-default)] bg-[var(--bg-surface-muted)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 text-white flex items-center justify-center shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">
                Mandali Visual Themes
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Choose your devotional style & appearance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme List */}
        <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {availableThemes.map((t) => {
            const isSelected = resolvedTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTheme(t.id);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between gap-3 cursor-pointer group ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/10'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-accent)] hover:bg-[var(--bg-surface-muted)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Swatch Circle */}
                  <div
                    className="w-10 h-10 rounded-xl border border-white/30 shadow-xs shrink-0 flex items-center justify-center"
                    style={{ background: t.swatchBg }}
                  >
                    {getThemeIcon(t.id)}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {t.name}
                      </span>
                      {t.isGlass && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30">
                          Frosted Glass
                        </span>
                      )}
                      {t.id === 'saffron' && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-400/30">
                          Devotional
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                      {t.tagline}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 group-hover:border-slate-400 shrink-0" />
                )}
              </button>
            );
          })}

          {/* System Auto Setting */}
          <button
            type="button"
            onClick={() => {
              setTheme('system');
              onClose();
            }}
            className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
              theme === 'system'
                ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/10'
                : 'border-[var(--border-subtle)] hover:bg-[var(--bg-surface-muted)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Device System Auto
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">
                  Synchronize appearance automatically with phone OS settings
                </span>
              </div>
            </div>
            {theme === 'system' && (
              <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[var(--bg-surface-muted)] border-t border-[var(--border-subtle)] text-center text-[10px] text-[var(--text-muted)]">
          Preference saved locally on this device. Retains sacred festival color contrast.
        </div>
      </div>
    </div>
  );
};
