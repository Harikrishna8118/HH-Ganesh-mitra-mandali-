import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Film,
  Image as ImageIcon,
  Sliders,
} from 'lucide-react';

export interface MediaItem {
  id?: string;
  url: string;
  type: 'image' | 'video';
  fileName?: string;
  senderName?: string;
  createdAt?: string;
  caption?: string;
}

export interface MediaViewerProps {
  media?: MediaItem | null;
  currentMedia?: MediaItem | null;
  allMedia?: MediaItem[];
  onClose: () => void;
  onSelectMedia?: (media: MediaItem) => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  media,
  currentMedia: propCurrentMedia,
  allMedia = [],
  onClose,
  onSelectMedia,
}) => {
  // Support either media or currentMedia prop
  const activeMedia = media || propCurrentMedia;

  // Zoom & Pan state
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Video state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);

  // Fullscreen state
  const [isDomFullscreen, setIsDomFullscreen] = useState<boolean>(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<number>(0);

  // Index in gallery
  const currentIndex = activeMedia ? allMedia.findIndex((m) => m.url === activeMedia.url) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allMedia.length - 1;

  // Reset transform when active media changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsPlaying(true);
    setCurrentTime(0);
    setShowSpeedMenu(false);
  }, [activeMedia?.url]);

  // Handle Fullscreen toggle
  const toggleDomFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsDomFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsDomFullscreen(false);
        }
      }
    } catch {
      // Fullscreen may be restricted inside nested iframe environments
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsDomFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Zoom helpers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 0.5);
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Double tap/click to zoom
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2.5);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.25, 4));
    } else {
      setScale((prev) => {
        const next = Math.max(prev - 0.25, 0.5);
        if (next <= 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Drag / Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        handleDoubleTap(e);
      }
      lastTapRef.current = now;

      if (scale > 1) {
        setIsDragging(true);
        touchStartRef.current = {
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        };
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / touchDistanceRef.current;
      setScale((prev) => {
        const next = Math.min(Math.max(prev * (ratio > 1 ? 1.03 : 0.97), 0.5), 4);
        if (next <= 1) setPosition({ x: 0, y: 0 });
        return next;
      });
      touchDistanceRef.current = newDist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistanceRef.current = null;
  };

  // Previous & Next navigation
  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectMedia) {
      onSelectMedia(allMedia[currentIndex - 1]);
    }
  }, [hasPrev, onSelectMedia, allMedia, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectMedia) {
      onSelectMedia(allMedia[currentIndex + 1]);
    }
  }, [hasNext, onSelectMedia, allMedia, currentIndex]);

  // Video controls
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) {
      videoRef.current.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedSelect = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      } else if (e.key === ' ' && activeMedia?.type === 'video') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrev, handleNext, activeMedia?.type, isPlaying, isMuted]);

  // Safe file download
  const handleDownload = async () => {
    if (!activeMedia) return;
    try {
      const response = await fetch(activeMedia.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download =
        activeMedia.fileName ||
        `ganesh-mandali-${activeMedia.type}-${Date.now()}.${activeMedia.type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(activeMedia.url, '_blank');
    }
  };

  if (!activeMedia) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white select-none backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
    >
      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-3 sm:px-6 py-3 bg-gradient-to-b from-black/80 via-black/50 to-transparent">
        {/* Info */}
        <div className="flex items-center gap-2.5 truncate max-w-[50%] sm:max-w-[65%]">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            {activeMedia.type === 'image' ? (
              <ImageIcon className="w-4 h-4" />
            ) : (
              <Film className="w-4 h-4" />
            )}
          </div>
          <div className="truncate text-left">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-2">
              <span>{activeMedia.senderName || 'Mandali Media'}</span>
              {allMedia.length > 1 && currentIndex >= 0 && (
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-amber-300">
                  {currentIndex + 1} / {allMedia.length}
                </span>
              )}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              {activeMedia.caption ||
                activeMedia.fileName ||
                (activeMedia.createdAt
                  ? new Date(activeMedia.createdAt).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Ganesh Mitra Mandali')}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/15">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/15 disabled:opacity-30 transition active:scale-95"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            <span
              onClick={handleResetZoom}
              className="px-1.5 text-[11px] sm:text-xs font-mono font-medium text-amber-300 cursor-pointer hover:underline"
              title="Click to reset zoom (0)"
            >
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/15 disabled:opacity-30 transition active:scale-95"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>

          {/* Reset Zoom Button */}
          {scale !== 1 && (
            <button
              onClick={handleResetZoom}
              className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition text-xs flex items-center gap-1"
              title="Reset 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">1x</span>
            </button>
          )}

          {/* Rotate (for images) */}
          {activeMedia.type === 'image' && (
            <button
              onClick={handleRotate}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/10"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          )}

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/10"
            title="Download Media"
          >
            <Download className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Fullscreen request */}
          <button
            onClick={toggleDomFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/10 hidden sm:inline-flex"
            title={isDomFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isDomFullscreen ? (
              <Minimize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            ) : (
              <Maximize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            )}
          </button>

          {/* Close Lightbox */}
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition active:scale-95 shadow-md ml-1"
            title="Close Viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main
        className="relative flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-2 sm:p-6"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleTap}
      >
        {/* Navigation Previous Arrow */}
        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-2 sm:left-6 z-30 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 shadow-xl backdrop-blur-sm transition-transform active:scale-90 hover:scale-105"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}

        {/* Navigation Next Arrow */}
        {hasNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 sm:right-6 z-30 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 shadow-xl backdrop-blur-sm transition-transform active:scale-90 hover:scale-105"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}

        {/* Media Canvas: Image or Video */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {activeMedia.type === 'image' ? (
            <img
              src={activeMedia.url}
              alt={activeMedia.caption || 'Mandali Photo'}
              referrerPolicy="no-referrer"
              draggable={false}
              className="max-w-[92vw] max-h-[78vh] sm:max-h-[82vh] object-contain rounded-lg shadow-2xl pointer-events-auto"
            />
          ) : (
            <div className="relative max-w-[92vw] max-h-[75vh] flex items-center justify-center">
              <video
                ref={videoRef}
                src={activeMedia.url}
                autoPlay
                playsInline
                loop
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                    videoRef.current.volume = volume;
                    videoRef.current.muted = isMuted;
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={togglePlayPause}
                className="max-w-[92vw] max-h-[75vh] sm:max-h-[80vh] rounded-lg shadow-2xl bg-black cursor-pointer"
              />

              {/* Large play pause overlay indicator when paused */}
              {!isPlaying && (
                <button
                  onClick={togglePlayPause}
                  className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 text-white flex items-center justify-center border-2 border-white/40 shadow-2xl backdrop-blur-xs transition hover:scale-110 active:scale-95"
                >
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white text-white translate-x-0.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Bar: Video Player Timeline & Controls / Image Zoom Preset Bar */}
      <footer className="relative z-20 px-3 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
        {activeMedia.type === 'video' ? (
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Timeline Progress Bar */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono text-slate-300">
              <span className="min-w-10 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-hidden"
              />
              <span className="min-w-10">{formatTime(duration)}</span>
            </div>

            {/* Playback Controls Row */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play/Pause */}
                <button
                  onClick={togglePlayPause}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white" />
                  ) : (
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white" />
                  )}
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1">
                  <button
                    onClick={toggleMute}
                    className="p-1 hover:text-amber-400 transition"
                    title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-14 sm:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Speed & Zoom indicators */}
              <div className="flex items-center gap-2">
                {/* Playback speed selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-1 transition"
                    title="Playback Speed"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>{playbackSpeed}x</span>
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-9 right-0 bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-2xl flex flex-col gap-0.5 min-w-20 z-40">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => handleSpeedSelect(spd)}
                          className={`px-3 py-1 text-xs rounded-lg text-left transition ${
                            playbackSpeed === spd
                              ? 'bg-red-600 text-white font-bold'
                              : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="hidden sm:inline-block text-[11px] text-slate-400 px-2 py-0.5 rounded-full bg-white/5">
                  Double-tap to zoom
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Image Zoom Preset & Action Row */
          <div className="max-w-md mx-auto flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[1, 1.5, 2, 3].map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setScale(preset);
                    if (preset === 1) setPosition({ x: 0, y: 0 });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    scale === preset
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {preset * 100}%
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-3">
              <span>Scroll or pinch to zoom</span>
              <span>•</span>
              <span>Drag to pan</span>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};
