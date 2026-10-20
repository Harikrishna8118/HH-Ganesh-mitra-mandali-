import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Smile,
  Reply,
  Trash2,
  X,
  CheckCheck,
  MessageSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  Paperclip,
  Maximize2,
  Play,
  Film,
  Camera,
  Loader2,
  AlertCircle,
  FileCheck2,
  Mic,
  Vote,
} from 'lucide-react';
import { sendChatMessage, deleteChatMessage, sharePollResultsToChat } from '../services/mandaliService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import {
  validateFile,
  validateMediaFile,
  uploadFile,
  uploadChatMedia,
  uploadAudioBlob,
  uploadChatAudio,
  getFileUrl,
  formatFileSize,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
} from '../services/storageService.ts';
import {
  MediaViewer,
  type MediaItem,
} from '../components/MediaViewer.tsx';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import { AudioMessagePlayer } from '../components/AudioMessagePlayer.tsx';
import { VoiceRecorderBar } from '../components/VoiceRecorderBar.tsx';
import { PollResultCard } from '../components/PollResultCard.tsx';
import { SharePollModal } from '../components/SharePollModal.tsx';
import type { ChatMessage, Poll } from '../types.ts';

interface ChatViewProps {
  messages: ChatMessage[];
  polls?: Poll[];
  onOpenAuth: () => void;
  onNavigate?: (view: string) => void;
}

const COMMON_EMOJIS = ['🙏', '🚩', '🪔', '🌺', '🕉️', '🐘', '🎉', '👍', '❤️', '👏', '💐', '🔔'];

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  polls = [],
  onOpenAuth,
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Share Poll Results Modal State
  const [showSharePollModal, setShowSharePollModal] = useState(false);

  const handleSharePoll = async (poll: Poll, customComment?: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    await sharePollResultsToChat(
      poll,
      currentUser.uid,
      currentUser.fullName,
      currentUser.role,
      customComment
    );
  };

  // File Upload & Attachment State
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string>('');
  const [mediaFileSizeFormatted, setMediaFileSizeFormatted] = useState<string>('');
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Direct URL Input State
  const [showMediaUrlInput, setShowMediaUrlInput] = useState(false);
  const [directUrlValue, setDirectUrlValue] = useState('');

  // Fullscreen MediaViewer State
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // Extract all media attachments from chat history for MediaViewer gallery navigation
  const allChatMedia: MediaItem[] = useMemo(() => {
    return messages
      .filter((m) => !m.isDeleted && !!m.mediaUrl && (m.mediaType === 'image' || m.mediaType === 'video'))
      .map((m) => ({
        id: m.id,
        url: m.mediaUrl!,
        type: (m.mediaType === 'video' ? 'video' : 'image') as 'image' | 'video',
        fileName: m.fileName,
        senderName: m.senderName,
        createdAt: m.createdAt,
        caption: m.text,
      }));
  }, [messages]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Clean up object URLs on unmount or reset
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  /**
   * Handles local file selection with strict validation for JPEG, PNG, MP4 and size limits
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous error
    setUploadError(null);

    // Validate file using the Firebase Storage validation utility
    const validation = validateMediaFile(file);
    if (!validation.isValid || !validation.mediaType) {
      setUploadError(
        validation.error ||
          'Please select a valid image (JPEG, PNG) or video (MP4) within permitted size limits.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!currentUser) {
      onOpenAuth();
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Set immediate preview via object URL for instant UI feedback
    const localPreview = URL.createObjectURL(file);
    setMediaPreviewUrl(localPreview);
    setMediaType(validation.mediaType);
    setMediaFileName(file.name);
    setMediaFileSizeFormatted(formatFileSize(file.size));
    setIsUploadingMedia(true);
    setUploadProgress(10);

    try {
      // Securely upload to Firebase Storage with live progress updates
      const result = await uploadChatMedia(file, currentUser.uid, (progress) => {
        setUploadProgress(progress);
      });

      setMediaUrl(result.downloadUrl);
      setMediaType(result.mediaType);
      setMediaFileName(result.fileName);
      setIsUploadingMedia(false);
      setUploadProgress(100);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Media upload failed. Please try again.');
      cancelMediaAttachment();
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Applies direct web image/video URL if user chooses manual link entry
   */
  const handleApplyDirectUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUrlValue.trim()) return;

    const val = directUrlValue.trim();
    const lower = val.toLowerCase();
    const isVid = lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov');

    setMediaUrl(val);
    setMediaPreviewUrl(val);
    setMediaType(isVid ? 'video' : 'image');
    setMediaFileName(val.split('/').pop()?.split('?')[0] || (isVid ? 'Video attachment' : 'Photo attachment'));
    setMediaFileSizeFormatted('Web Link');
    setShowMediaUrlInput(false);
    setDirectUrlValue('');
    setUploadError(null);
  };

  /**
   * Cancels the active media attachment
   */
  const cancelMediaAttachment = () => {
    if (mediaPreviewUrl && mediaPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaUrl('');
    setMediaPreviewUrl('');
    setMediaType(null);
    setMediaFileName('');
    setMediaFileSizeFormatted('');
    setIsUploadingMedia(false);
    setUploadProgress(0);
  };

  /**
   * Sends the chat message with text, media URL, reply context, and member credentials
   */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingMedia) return;
    if (!inputText.trim() && !mediaUrl) return;

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsSending(true);
    try {
      const newMsg: Omit<ChatMessage, 'id' | 'createdAt'> = {
        senderId: currentUser.uid,
        senderName: currentUser.fullName,
        senderRole: currentUser.role,
        text: inputText.trim(),
      };
      if (mediaUrl) newMsg.mediaUrl = mediaUrl;
      if (mediaType) newMsg.mediaType = mediaType;
      if (mediaFileName) newMsg.fileName = mediaFileName;
      if (replyingTo) {
        newMsg.replyToId = replyingTo.id;
        if (replyingTo.text) newMsg.replyToText = replyingTo.text;
        if (replyingTo.senderName) newMsg.replyToSender = replyingTo.senderName;
      }

      await sendChatMessage(newMsg);

      // Clear all message & attachment state
      setInputText('');
      cancelMediaAttachment();
      setReplyingTo(null);
      setShowEmojiPicker(false);
      setShowMediaUrlInput(false);
      setUploadError(null);
    } catch {
      setUploadError('Failed to send message. Please check connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Records and sends a voice note using MediaRecorder and Firebase Storage
   */
  const handleSendVoiceNote = async (audioBlob: Blob, durationSeconds: number) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsUploadingMedia(true);
    setUploadProgress(15);
    try {
      const uploadRes = await uploadAudioBlob(
        audioBlob,
        currentUser.uid,
        durationSeconds,
        (progress) => setUploadProgress(progress)
      );

      const voiceMsg: Omit<ChatMessage, 'id' | 'createdAt'> = {
        senderId: currentUser.uid,
        senderName: currentUser.fullName,
        senderRole: currentUser.role,
        text: '',
        mediaUrl: uploadRes.downloadUrl,
        mediaType: 'audio',
        audioDuration: durationSeconds,
        fileName: uploadRes.fileName,
      };
      if (replyingTo) {
        voiceMsg.replyToId = replyingTo.id;
        const repText = replyingTo.text || (replyingTo.mediaType === 'audio' ? '🎤 Voice message' : undefined);
        if (repText) voiceMsg.replyToText = repText;
        if (replyingTo.senderName) voiceMsg.replyToSender = replyingTo.senderName;
      }

      await sendChatMessage(voiceMsg);

      setIsRecordingVoice(false);
      setReplyingTo(null);
      setUploadError(null);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to send voice note. Please try again.'
      );
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = (msg: ChatMessage) => {
    setMessageToDelete(msg);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await deleteChatMessage(
        messageToDelete.id,
        currentUser?.uid,
        currentUser?.fullName
      );
    } catch {
      setUploadError('Failed to delete message. Please check connection.');
    } finally {
      setMessageToDelete(null);
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] max-h-[840px] bg-slate-50/70 rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
      {/* Hidden File Input for Image & Video Attachment */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
        className="hidden"
      />

      {/* Chat Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm ring-1 ring-red-200 shadow-2xs">
            🕉️
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              GMM Village Group Chat
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Live Feed (Photos & Videos Enabled)
              </span>
              <span>·</span>
              <span>H. Hosahalli Mandali</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {messages.length} messages
          </div>
        </div>
      </div>

      {/* Validation Error Toast / Banner */}
      {uploadError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between text-xs text-red-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="p-1 hover:bg-red-100 rounded text-red-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 chat-scroll bg-gradient-to-b from-[#FAF8F5] to-[#F5F2EC]">
        {messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No messages yet."
            description="The mandali conversation is initially empty. Send a message, photo, or festival video to communicate with fellow village members!"
            className="my-auto bg-transparent border-0"
          />
        ) : (
          messages.map((msg) => {
            const isMe = currentUser?.uid === msg.senderId;

            // System announcements in chat
            if (msg.isAnnouncement || msg.senderId === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="px-3.5 py-1.5 rounded-full bg-amber-100/90 text-amber-950 text-xs font-medium border border-amber-300/80 shadow-2xs text-center max-w-sm">
                    {msg.text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`relative max-w-[88%] sm:max-w-md rounded-2xl p-3 shadow-xs transition-all ${
                    isMe
                      ? 'bg-red-700 text-white rounded-tr-none'
                      : 'bg-white text-slate-900 rounded-tl-none border border-slate-200/90'
                  } ${msg.isDeleted ? 'italic text-opacity-70' : ''}`}
                >
                  {/* Reply Context if present */}
                  {msg.replyToText && (
                    <div
                      className={`mb-2 p-2 rounded-lg text-[11px] border-l-2 ${
                        isMe
                          ? 'bg-red-800/60 border-amber-300 text-red-100'
                          : 'bg-slate-100 border-red-500 text-slate-600'
                      }`}
                    >
                      <strong className="block text-[10px] text-amber-300 uppercase tracking-wider">
                        Replying to {msg.replyToSender}
                      </strong>
                      <span className="truncate block">{msg.replyToText}</span>
                    </div>
                  )}

                  {/* Sender Name */}
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs font-bold text-red-700">
                        {msg.senderName}
                      </span>
                      <span className="text-[9px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                        Member
                      </span>
                    </div>
                  )}

                  {/* Render Image Attachment as Clickable Thumbnail with Expand Icon Overlay */}
                  {msg.mediaUrl && msg.mediaType === 'image' && !msg.isDeleted && (
                    <div
                      onClick={() =>
                        setSelectedMedia({
                          id: msg.id,
                          url: msg.mediaUrl!,
                          type: 'image',
                          fileName: msg.fileName,
                          senderName: msg.senderName,
                          createdAt: msg.createdAt,
                          caption: msg.text,
                        })
                      }
                      className="relative mb-2 rounded-xl overflow-hidden group/thumb cursor-pointer bg-black/10 hover:ring-2 hover:ring-amber-400/90 transition shadow-xs max-w-sm"
                      title="Tap thumbnail to open in MediaViewer"
                    >
                      <img
                        src={msg.mediaUrl}
                        alt={msg.fileName || 'Photo attachment'}
                        referrerPolicy="no-referrer"
                        className="max-h-60 sm:max-h-72 w-full object-cover rounded-xl transition duration-300 group-hover/thumb:scale-[1.02]"
                      />
                      {/* Overlay Icon: Expand Icon */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <div className="p-3 rounded-full bg-black/70 text-white shadow-xl backdrop-blur-xs flex items-center gap-1.5 transform group-hover/thumb:scale-105 transition-transform">
                          <Maximize2 className="w-5 h-5 text-white" />
                          <span className="text-xs font-semibold pr-1">Expand</span>
                        </div>
                      </div>
                      {/* Corner Expand Icon indicator */}
                      <div className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white backdrop-blur-xs shadow-xs group-hover/thumb:opacity-0 transition-opacity">
                        <Maximize2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Render Video Attachment as Clickable Thumbnail with Play Button Overlay */}
                  {msg.mediaUrl && msg.mediaType === 'video' && !msg.isDeleted && (
                    <div
                      onClick={() =>
                        setSelectedMedia({
                          id: msg.id,
                          url: msg.mediaUrl!,
                          type: 'video',
                          fileName: msg.fileName,
                          senderName: msg.senderName,
                          createdAt: msg.createdAt,
                          caption: msg.text,
                        })
                      }
                      className="relative mb-2 rounded-xl overflow-hidden group/video cursor-pointer bg-black/40 hover:ring-2 hover:ring-red-500/90 transition shadow-xs max-w-sm"
                      title="Tap thumbnail to play in MediaViewer"
                    >
                      <video
                        src={msg.mediaUrl}
                        preload="metadata"
                        playsInline
                        muted
                        className="max-h-60 sm:max-h-72 w-full object-cover rounded-xl bg-black"
                      />
                      {/* Overlay Icon: Play Button */}
                      <div className="absolute inset-0 bg-black/35 group-hover/video:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-xl border-2 border-white/50 group-hover/video:scale-110 group-hover/video:bg-red-600 transition-all">
                          <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white text-white translate-x-0.5" />
                        </div>
                      </div>
                      {/* Video Tag & Expand Badge */}
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-xs pointer-events-none">
                        <Film className="w-3 h-3 text-red-400" />
                        <span>Video</span>
                      </div>
                      <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white backdrop-blur-xs shadow-xs opacity-0 group-hover/video:opacity-100 transition-opacity pointer-events-none">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}

                  {/* Render Voice / Audio Message with Interactive Waveform Player */}
                  {msg.mediaUrl && msg.mediaType === 'audio' && !msg.isDeleted && (
                    <div className="mb-2 w-full min-w-[200px] sm:min-w-[260px] max-w-sm">
                      <AudioMessagePlayer
                        audioUrl={msg.mediaUrl}
                        duration={msg.audioDuration}
                        fileName={msg.fileName}
                        isSender={isMe}
                      />
                    </div>
                  )}

                  {/* Render Rich Mandali Poll Result Card */}
                  {msg.pollResult && !msg.isDeleted && (
                    <div className="mb-2">
                      <PollResultCard
                        pollResult={msg.pollResult}
                        isCurrentUserSender={isMe}
                        onOpenPoll={() => onNavigate && onNavigate('discussions')}
                      />
                    </div>
                  )}

                  {/* Message Caption / Text */}
                  {msg.text && (
                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {msg.text}
                    </p>
                  )}

                  {/* Timestamp & Status */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] tabular-nums ${
                      isMe ? 'text-red-200' : 'text-slate-400'
                    }`}
                  >
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isMe && <CheckCheck className="w-3.5 h-3.5 text-amber-300" />}
                  </div>

                  {/* Message Actions */}
                  {!msg.isDeleted && (
                    <div
                      className={`absolute top-1 ${
                        isMe ? '-left-16' : '-right-16'
                      } hidden group-hover:flex items-center gap-1 bg-white/95 rounded-lg border border-slate-200 shadow-sm p-1 z-10`}
                    >
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-slate-100"
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(msg)}
                        className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-slate-100"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Bar */}
      {showEmojiPicker && (
        <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {COMMON_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => addEmoji(e)}
              className="text-lg hover:scale-125 transition-transform p-1"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Media URL Input Box (Alternative manual link method) */}
      {showMediaUrlInput && (
        <form
          onSubmit={handleApplyDirectUrl}
          className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center gap-2 animate-in fade-in"
        >
          <input
            type="url"
            value={directUrlValue}
            onChange={(e) => setDirectUrlValue(e.target.value)}
            placeholder="Paste direct Image URL or Video URL..."
            className="flex-1 text-xs p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 bg-white"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-2xs"
          >
            Attach
          </button>
          <button
            type="button"
            onClick={() => setShowMediaUrlInput(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Selected Media Staging & Upload Progress Banner */}
      {(mediaPreviewUrl || isUploadingMedia) && (
        <div className="bg-amber-50/95 px-4 py-2.5 border-t border-amber-200 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            {mediaType === 'image' ? (
              <div
                onClick={() =>
                  setSelectedMedia({
                    url: mediaPreviewUrl,
                    type: 'image',
                    fileName: mediaFileName,
                    senderName: currentUser?.fullName || 'Me',
                    caption: inputText,
                  })
                }
                className="relative w-12 h-12 rounded-lg overflow-hidden border border-amber-300 bg-black/10 shrink-0 cursor-pointer hover:opacity-85 transition group/stage"
                title="Tap to preview in MediaViewer"
              >
                <img
                  src={mediaPreviewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover/stage:opacity-100 transition">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </div>
            ) : (
              <div
                onClick={() =>
                  setSelectedMedia({
                    url: mediaPreviewUrl,
                    type: 'video',
                    fileName: mediaFileName,
                    senderName: currentUser?.fullName || 'Me',
                    caption: inputText,
                  })
                }
                className="w-12 h-12 rounded-lg bg-black flex items-center justify-center text-white shrink-0 shadow-2xs cursor-pointer hover:bg-slate-800 transition"
                title="Tap to preview video in MediaViewer"
              >
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
                  <Play className="w-3 h-3 fill-white text-white translate-x-0.2" />
                </div>
              </div>
            )}

            <div className="text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                {mediaType === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5 text-red-600" />
                ) : (
                  <Film className="w-3.5 h-3.5 text-red-600" />
                )}
                <span>{mediaType === 'image' ? 'Photo Attached' : 'Video Attached'}</span>
                {isUploadingMedia && (
                  <span className="text-[11px] text-amber-700 font-normal flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                    Uploading {uploadProgress}%...
                  </span>
                )}
                {!isUploadingMedia && (
                  <span className="text-[10px] text-emerald-700 font-medium bg-emerald-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <FileCheck2 className="w-3 h-3" /> Ready
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {isUploadingMedia ? (
                <div className="w-44 sm:w-56 bg-amber-200/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-red-600 h-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              ) : (
                <p className="text-[11px] text-slate-600 truncate max-w-xs sm:max-w-md">
                  {mediaFileName} {mediaFileSizeFormatted && `(${mediaFileSizeFormatted})`}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={cancelMediaAttachment}
            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-100 rounded-lg transition"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reply Context Banner */}
      {replyingTo && (
        <div className="bg-amber-50 px-4 py-2 border-t border-amber-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <Reply className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="truncate text-slate-700">
              Replying to <strong>{replyingTo.senderName}</strong>:{' '}
              {replyingTo.text
                ? `"${replyingTo.text}"`
                : replyingTo.mediaType === 'audio'
                ? '🎤 Voice message'
                : replyingTo.mediaType === 'image'
                ? '📷 Photo'
                : '🎥 Video'}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Input Box & Actions */}
      {/* Message Input Box & Actions */}
      {currentUser ? (
        isRecordingVoice ? (
          <VoiceRecorderBar
            onSendVoiceNote={handleSendVoiceNote}
            onCancel={() => setIsRecordingVoice(false)}
            isUploading={isUploadingMedia}
          />
        ) : (
          <form
            onSubmit={handleSend}
            className="p-2.5 sm:p-3 bg-white border-t border-slate-200 flex items-center gap-1.5 sm:gap-2"
          >
            {/* File Attachment Trigger: JPEG, PNG, MP4 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingMedia}
              className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition active:scale-95 disabled:opacity-40"
              title={`Attach Photo (JPEG, PNG up to ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB) or Video (MP4 up to ${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB)`}
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Voice Message Recording Button */}
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              disabled={isUploadingMedia || isSending}
              className="p-2 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 transition active:scale-95 disabled:opacity-40"
              title="Record voice note (MediaRecorder)"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Web URL Attachment Trigger */}
            <button
              type="button"
              onClick={() => setShowMediaUrlInput(!showMediaUrlInput)}
              disabled={isUploadingMedia}
              className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition active:scale-95 disabled:opacity-40"
              title="Attach direct Web Media URL"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Share Mandali Decision Poll Result */}
            {polls && polls.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSharePollModal(true)}
                disabled={isUploadingMedia || isSending}
                className="p-2 rounded-xl text-amber-700 hover:text-amber-800 hover:bg-amber-50 transition active:scale-95 disabled:opacity-40"
                title="Share Poll Decision Results to Chat"
              >
                <Vote className="w-5 h-5" />
              </button>
            )}

            {/* Emoji Toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition hidden sm:inline-flex"
              title="Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                mediaPreviewUrl
                  ? 'Add a caption for this photo/video (optional)...'
                  : 'Type a message or tap 🎤 to record voice note...'
              }
              enterKeyHint="send"
              autoComplete="off"
              className="flex-1 text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-900 placeholder:text-slate-400 font-medium"
            />

            <button
              type="submit"
              disabled={
                isSending ||
                isUploadingMedia ||
                (!inputText.trim() && !mediaUrl)
              }
              className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 transition active:scale-95 shadow-xs flex items-center justify-center shrink-0 min-w-10"
              title="Send"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        )
      ) : (
        <div className="p-3.5 bg-amber-50/80 border-t border-amber-200 flex items-center justify-between text-xs">
          <span className="text-amber-900 font-medium">
            Sign in with your mobile number to send messages, photos, videos, and voice notes.
          </span>
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
          >
            Sign In
          </button>
        </div>
      )}

      {/* Fullscreen MediaViewer Component for Photos & Videos with Zoom and Playback */}
      {selectedMedia && (
        <MediaViewer
          media={selectedMedia}
          allMedia={allChatMedia}
          onClose={() => setSelectedMedia(null)}
          onSelectMedia={(media) => setSelectedMedia(media)}
        />
      )}

      {/* Share Poll Result Modal */}
      {polls && polls.length > 0 && (
        <SharePollModal
          polls={polls}
          isOpen={showSharePollModal}
          onClose={() => setShowSharePollModal(false)}
          onShare={handleSharePoll}
        />
      )}

      {/* Delete Chat Message ConfirmModal */}
      <ConfirmModal
        isOpen={!!messageToDelete}
        title="Delete Message"
        message="Are you sure you want to delete this message for everyone in the mandali chat?"
        confirmLabel="Delete Message"
        cancelLabel="Keep Message"
        isDestructive={true}
        onConfirm={confirmDeleteMessage}
        onCancel={() => setMessageToDelete(null)}
      />
    </div>
  );
};
