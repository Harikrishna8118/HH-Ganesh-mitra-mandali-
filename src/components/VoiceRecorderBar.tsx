import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Trash2,
  Send,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

interface VoiceRecorderBarProps {
  onSendVoiceNote: (audioBlob: Blob, durationSeconds: number) => Promise<void> | void;
  onCancel: () => void;
  isUploading?: boolean;
}

export const VoiceRecorderBar: React.FC<VoiceRecorderBarProps> = ({
  onSendVoiceNote,
  onCancel,
  isUploading = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 40, 20, 30, 60, 45, 25]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Start recording using MediaRecorder API
  const startRecording = useCallback(async () => {
    setPermissionError(null);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Detect supported mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // Set up real-time audio visualization with Web Audio API
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevels = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              // Pick 8 representative bars
              const sample: number[] = [];
              const step = Math.max(1, Math.floor(dataArray.length / 8));
              for (let i = 0; i < 8; i++) {
                const val = dataArray[i * step] || 0;
                sample.push(Math.max(15, Math.min(100, Math.round((val / 255) * 100))));
              }
              setAudioLevels(sample);
              animFrameRef.current = requestAnimationFrame(updateLevels);
            }
          };
          updateLevels();
        }
      } catch {
        // Fallback gracefully without live frequency bars
      }

      recorder.start(250); // Slice data every 250ms for reliable chunks
      setIsRecording(true);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setPermissionError('Microphone permission was denied. Please allow microphone access to record voice messages.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setPermissionError('No microphone found. Please connect a microphone and try again.');
      } else {
        setPermissionError('Unable to access microphone. Please check browser permissions.');
      }
    }
  }, [audioUrl]);

  // Clean up audio context and tracks
  const cleanupRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Stop recording and create preview
  const stopRecording = useCallback(() => {
    cleanupRecording();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, [cleanupRecording]);

  // Cancel recording and dismiss
  const handleCancel = useCallback(() => {
    cleanupRecording();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsRecording(false);
    onCancel();
  }, [cleanupRecording, audioUrl, onCancel]);

  // Send the recorded voice message
  const handleSend = async () => {
    if (!audioBlob) return;
    await onSendVoiceNote(audioBlob, recordingSeconds);
  };

  // Preview playback listeners
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setPreviewCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPreviewPlaying(false);
      setPreviewCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePreviewPlay = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
    } else {
      audio.play().catch((err) => {
        if (err instanceof Error && (err.name === 'AbortError' || err.name === 'NotAllowedError')) return;
        setIsPreviewPlaying(false);
      });
      setIsPreviewPlaying(true);
    }
  };

  // Auto-start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      cleanupRecording();
    };
  }, []);

  return (
    <div className="bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border-t border-red-200 p-2.5 sm:p-3 animate-in slide-in-from-bottom-2">
      {/* Audio Element for Preview */}
      {audioUrl && <audio ref={previewAudioRef} src={audioUrl} />}

      {permissionError ? (
        <div className="flex items-center justify-between gap-3 text-red-800 text-xs sm:text-sm py-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{permissionError}</span>
          </div>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-medium text-xs transition"
          >
            Dismiss
          </button>
        </div>
      ) : isRecording ? (
        /* Active Recording State */
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Recording indicator & timer */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 animate-ping absolute" />
              <span className="w-3 h-3 rounded-full bg-red-600 relative" />
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-red-700 tracking-wide flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 animate-pulse text-red-600" />
                Recording Voice Note...
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                {formatTime(recordingSeconds)}
              </span>
            </div>
          </div>

          {/* Animated Waveform Level Equalizer */}
          <div className="flex items-center gap-1 h-8 px-2 bg-white/70 rounded-xl border border-red-200/60 shadow-2xs">
            {audioLevels.map((lvl, i) => (
              <div
                key={i}
                style={{ height: `${lvl}%` }}
                className="w-1.5 rounded-full bg-red-500 transition-all duration-100"
              />
            ))}
          </div>

          {/* Actions: Cancel & Stop */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-100/70 rounded-xl transition"
              title="Cancel recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition"
              title="Stop and preview voice message"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : (
        /* Preview Recorded Audio Before Sending */
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5">
            {/* Play / Pause Preview */}
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-xs transition active:scale-95 shrink-0"
              title={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPreviewPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white translate-x-0.5" />
              )}
            </button>

            {/* Info & Duration */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Voice Note Ready ({formatTime(recordingSeconds)})
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {formatTime(previewCurrentTime)} / {formatTime(recordingSeconds)}
              </span>
            </div>
          </div>

          {/* Re-record, Discard, Send */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={startRecording}
              disabled={isUploading}
              className="p-2 text-slate-600 hover:text-amber-700 hover:bg-amber-100/80 rounded-xl transition"
              title="Record again"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isUploading}
              className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition"
              title="Discard voice message"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isUploading}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Voice Note</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
