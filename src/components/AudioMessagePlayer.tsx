import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

// Global audio coordinator to pause previous audio when another starts playing
let activeAudioElement: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();

function notifyAudioStarted(current: HTMLAudioElement) {
  if (activeAudioElement && activeAudioElement !== current) {
    activeAudioElement.pause();
    listeners.forEach((fn) => fn());
  }
  activeAudioElement = current;
}

interface AudioMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  fileName?: string;
  isSender?: boolean;
}

// Fixed waveform bar heights that look natural for speech
const WAVEFORM_BARS = [
  30, 45, 70, 85, 40, 25, 60, 95, 80, 50, 75, 100, 65, 40, 85, 90, 45, 60, 80, 70,
  35, 55, 90, 75, 40, 60, 85, 50, 30, 70, 40, 20
];

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({
  audioUrl,
  duration: initialDuration = 0,
  isSender = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [hasError, setHasError] = useState(false);

  // Sync with global player listener
  useEffect(() => {
    const handleOtherPlay = () => {
      if (audioRef.current && audioRef.current !== activeAudioElement) {
        setIsPlaying(false);
      }
    };
    listeners.add(handleOtherPlay);
    return () => {
      listeners.delete(handleOtherPlay);
    };
  }, []);

  // Initialize or update audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onError = () => {
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setHasError(false);
      setIsLoading(true);
      notifyAudioStarted(audio);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        if (err instanceof Error && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
          setIsPlaying(false);
          return;
        }
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isPlaying]);

  const handleSeek = (index: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const effectiveDuration = duration || 1;
    const progressRatio = index / WAVEFORM_BARS.length;
    const targetTime = progressRatio * effectiveDuration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const cycleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBarIndex = Math.floor(progress * WAVEFORM_BARS.length);

  return (
    <div
      className={`flex items-center gap-2.5 sm:gap-3 py-1.5 px-2 rounded-2xl select-none transition-all ${
        isSender
          ? 'bg-red-700/80 text-white'
          : 'bg-amber-100/90 text-amber-950 border border-amber-200/80'
      }`}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play / Pause / Loading Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={hasError}
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm transition active:scale-95 ${
          isSender
            ? 'bg-white text-red-700 hover:bg-amber-50'
            : 'bg-red-600 text-white hover:bg-red-700'
        } ${hasError ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isPlaying ? 'Pause' : 'Play voice message'}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current translate-x-0.5" />
        )}
      </button>

      {/* Waveform & Scrubber */}
      <div className="flex-1 min-w-[140px] sm:min-w-[180px] space-y-1">
        <div
          className="flex items-center gap-0.5 sm:gap-1 h-7 cursor-pointer group"
          title="Click to seek"
        >
          {WAVEFORM_BARS.map((heightPercent, idx) => {
            const isPlayed = idx <= activeBarIndex;
            return (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(idx);
                }}
                className="flex-1 flex items-center justify-center h-full py-0.5"
              >
                <div
                  style={{ height: `${Math.max(15, heightPercent)}%` }}
                  className={`w-full rounded-full transition-all duration-75 ${
                    isPlayed
                      ? isSender
                        ? 'bg-amber-300'
                        : 'bg-red-600'
                      : isSender
                      ? 'bg-red-400/60 group-hover:bg-red-300/80'
                      : 'bg-amber-300/80 group-hover:bg-amber-400'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Timestamp & Speed controls */}
        <div className="flex items-center justify-between text-[11px] font-mono leading-none">
          <span className={isSender ? 'text-red-100' : 'text-amber-800'}>
            {isPlaying || currentTime > 0
              ? formatTime(currentTime)
              : formatTime(duration)}
          </span>

          <div className="flex items-center gap-1.5">
            {duration > 0 && (isPlaying || currentTime > 0) && (
              <span className={`text-[10px] ${isSender ? 'text-red-200' : 'text-slate-500'}`}>
                / {formatTime(duration)}
              </span>
            )}

            {/* Playback Speed Pill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cycleSpeed();
              }}
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition active:scale-95 ${
                isSender
                  ? 'bg-red-800/80 text-amber-200 hover:bg-red-900'
                  : 'bg-white/80 text-red-700 hover:bg-white shadow-2xs'
              }`}
              title="Change playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>

      {hasError && (
        <span className="text-[10px] text-red-200 font-sans" title="Audio failed to load">
          ⚠️
        </span>
      )}
    </div>
  );
};
