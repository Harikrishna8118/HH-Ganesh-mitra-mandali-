import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  StorageReference,
} from 'firebase/storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { ensureAuth } from '../lib/firebase.ts';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Storage
export const storage = getStorage(
  app,
  firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined
);

// Allowed MIME types explicitly targeting JPEG, PNG, MP4, and mobile device media
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/bmp',
];

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/3gpp',
  'video/3gp',
  'video/x-matroska',
  'video/avi',
  'video/mpeg',
  'video/m4v',
];

export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',
];

export const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
  'gif',
  'bmp',
  'mp4',
  'webm',
  'mov',
  '3gp',
  'mkv',
  'avi',
  'm4v',
  'ogg',
  'mp3',
  'wav',
  'm4a',
  'aac',
];

// Strict Size Limits
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB for JPEG / PNG
export const MAX_VIDEO_SIZE_BYTES = 30 * 1024 * 1024; // 30MB for MP4
export const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25MB for voice notes & audio

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  mediaType?: 'image' | 'video' | 'audio';
  fileSizeFormatted?: string;
}

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
  storageRef: StorageReference;
  fileName: string;
  mediaType: 'image' | 'video' | 'audio';
  fileSize: number;
  duration?: number;
}

/**
 * Formats byte count into a readable string (e.g. "4.2 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Sanitizes filename to prevent directory traversal and injection attacks
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Validates a file against allowed formats (JPEG, PNG, MP4) and maximum size limits.
 *
 * @param file - File object to validate
 * @returns FileValidationResult with validation flag, media category, and human-readable error if rejected.
 */
export function validateFile(file: File): FileValidationResult {
  if (!file) {
    return { isValid: false, error: 'No file was provided.' };
  }

  const rawExt = file.name ? file.name.split('.').pop()?.toLowerCase() || '' : '';
  const mimeType = (file.type || '').toLowerCase();

  const isImageMime = mimeType.startsWith('image/') || ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);
  const isVideoMime = mimeType.startsWith('video/') || ALLOWED_VIDEO_MIME_TYPES.includes(mimeType);
  const isAudioMime =
    mimeType.startsWith('audio/') ||
    ALLOWED_AUDIO_MIME_TYPES.some((t) => mimeType.startsWith(t.split(';')[0]));

  const isImageExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp'].includes(rawExt);
  const isVideoExt = ['mp4', 'webm', 'mov', '3gp', 'mkv', 'avi', 'm4v'].includes(rawExt);
  const isAudioExt = ['webm', 'ogg', 'mp3', 'wav', 'm4a', 'aac'].includes(rawExt);

  const isImage = isImageMime || isImageExt;
  const isVideo = isVideoMime || isVideoExt;
  const isAudio = isAudioMime || isAudioExt;

  if (!isImage && !isVideo && !isAudio) {
    return {
      isValid: false,
      error: 'Unsupported file format. Please select an image (JPEG, PNG, WEBP), video (MP4), or audio file.',
    };
  }

  // Validate image size (up to 10MB)
  if (isImage) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `Image exceeds maximum allowed size of 10 MB (file is ${formatFileSize(file.size)}).`,
      };
    }
    return {
      isValid: true,
      mediaType: 'image',
      fileSizeFormatted: formatFileSize(file.size),
    };
  }

  // Validate video size (up to 30MB)
  if (isVideo) {
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return {
        isValid: false,
        error: `Video exceeds maximum allowed size of 30 MB (file is ${formatFileSize(file.size)}).`,
      };
    }
    return {
      isValid: true,
      mediaType: 'video',
      fileSizeFormatted: formatFileSize(file.size),
    };
  }

  // Validate audio size (up to 25MB)
  if (isAudio) {
    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      return {
        isValid: false,
        error: `Audio recording exceeds maximum allowed size of 25 MB (file is ${formatFileSize(file.size)}).`,
      };
    }
    return {
      isValid: true,
      mediaType: 'audio',
      fileSizeFormatted: formatFileSize(file.size),
    };
  }

  return {
    isValid: false,
    error: 'File could not be validated.',
  };
}

/**
 * Backward-compatible alias for validateFile
 */
export const validateMediaFile = validateFile;

/**
 * Compresses an image client-side before upload to optimize storage and speed
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 900,
  quality = 0.65
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // If blob is still > 250KB, compress once more to guarantee well below 1MB Firestore limit
              if (blob.size > 250 * 1024 && quality > 0.4) {
                compressImage(blob, Math.min(width, 650), quality - 0.2)
                  .then(resolve)
                  .catch(() => resolve(blob));
              } else {
                resolve(blob);
              }
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a validated file to Firebase Storage.
 *
 * @param file - File object to upload
 * @param destinationFolderOrPath - Storage destination folder (e.g. 'chat_media/userId') or full path
 * @param onProgress - Optional callback receiving progress percentage (0 - 100)
 * @returns UploadResult containing downloadUrl, storagePath, storageRef, fileName, mediaType, and fileSize
 */
export async function uploadFile(
  file: File,
  destinationFolderOrPath = 'uploads',
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Validate file type and size before attempting upload
  const validation = validateFile(file);
  if (!validation.isValid || !validation.mediaType) {
    throw new Error(validation.error || 'Invalid file format or size limit exceeded.');
  }

  // Ensure Firebase Auth session is active
  await ensureAuth();

  const safeName = sanitizeFileName(file.name);
  const ext = safeName.split('.').pop() || (validation.mediaType === 'image' ? 'jpg' : 'mp4');

  // Determine storage destination path
  const storagePath = destinationFolderOrPath.includes('.')
    ? destinationFolderOrPath
    : `${destinationFolderOrPath.replace(/\/$/, '')}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const storageRef = ref(storage, storagePath);

  let payload: Blob | File = file;
  if (validation.mediaType === 'image') {
    try {
      payload = await compressImage(file, 900, 0.65);
    } catch {
      payload = file;
    }
  }

  try {
    const contentType = file.type || (validation.mediaType === 'image' ? 'image/jpeg' : 'video/mp4');

    const uploadTask = uploadBytesResumable(storageRef, payload, {
      contentType,
      customMetadata: {
        originalName: safeName,
        mediaType: validation.mediaType,
        uploadedAt: new Date().toISOString(),
      },
    });

    return await new Promise<UploadResult>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress =
            snapshot.totalBytes > 0
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              : 0;
          if (onProgress) onProgress(progress);
        },
        async (error) => {
          // Graceful fallback to client data URL if bucket is unconfigured or blocked
          try {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (onProgress) onProgress(100);
              resolve({
                downloadUrl: e.target?.result as string,
                storagePath,
                storageRef,
                fileName: safeName,
                mediaType: validation.mediaType!,
                fileSize: payload.size,
              });
            };
            reader.onerror = () => reject(error);
            reader.readAsDataURL(payload);
          } catch {
            reject(error);
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              downloadUrl,
              storagePath,
              storageRef,
              fileName: safeName,
              mediaType: validation.mediaType!,
              fileSize: payload.size,
            });
          } catch {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (onProgress) onProgress(100);
              resolve({
                downloadUrl: e.target?.result as string,
                storagePath,
                storageRef,
                fileName: safeName,
                mediaType: validation.mediaType!,
                fileSize: payload.size,
              });
            };
            reader.onerror = (readErr) => reject(readErr);
            reader.readAsDataURL(payload);
          }
        }
      );
    });
  } catch {
    return new Promise<UploadResult>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (onProgress) onProgress(100);
        resolve({
          downloadUrl: e.target?.result as string,
          storagePath,
          storageRef,
          fileName: safeName,
          mediaType: validation.mediaType!,
          fileSize: payload.size,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(payload);
    });
  }
}

/**
 * Returns a StorageReference for a given path
 */
export function getStorageRef(storagePath: string): StorageReference {
  return ref(storage, storagePath);
}

/**
 * Retrieves the public download URL for a file in Firebase Storage.
 * Supports passing either a storage path string or a StorageReference directly.
 * If a full HTTP/HTTPS URL or data URL is provided, it is returned immediately.
 *
 * @param storagePathOrRef - Storage path string (e.g. 'chat_media/user/file.jpg'), StorageReference, or existing URL
 * @returns Promise resolving to the public download URL string
 */
export async function getFileUrl(storagePathOrRef: string | StorageReference): Promise<string> {
  if (!storagePathOrRef) {
    throw new Error('A storage path or StorageReference must be provided to getFileUrl.');
  }

  // If StorageReference is passed, retrieve URL directly
  if (typeof storagePathOrRef !== 'string') {
    return await getDownloadURL(storagePathOrRef);
  }

  // If already a complete URL (HTTP, HTTPS, blob, or data URL), return directly
  if (
    storagePathOrRef.startsWith('http://') ||
    storagePathOrRef.startsWith('https://') ||
    storagePathOrRef.startsWith('data:') ||
    storagePathOrRef.startsWith('blob:')
  ) {
    return storagePathOrRef;
  }

  try {
    const storageRef = ref(storage, storagePathOrRef);
    return await getDownloadURL(storageRef);
  } catch (error) {
    throw error;
  }
}

/**
 * Helper for chat attachments (photos, videos)
 */
export async function uploadChatMedia(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return uploadFile(file, `chat_media/${userId}`, onProgress);
}

/**
 * Uploads a recorded voice message audio Blob to Firebase Storage.
 * Utilizes the MediaRecorder output and handles storage pathing, content-type detection,
 * custom duration metadata, and resilient base64 fallback.
 *
 * @param audioBlob - Recorded audio Blob from MediaRecorder
 * @param userId - ID of the sender for path organization
 * @param durationSeconds - Length of the audio recording in seconds
 * @param onProgress - Optional callback for upload progress (0-100)
 */
export async function uploadAudioBlob(
  audioBlob: Blob,
  userId: string,
  durationSeconds?: number,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Recorded audio is empty.');
  }

  if (audioBlob.size > MAX_AUDIO_SIZE_BYTES) {
    throw new Error(
      `Audio recording exceeds maximum allowed size of 25 MB (size: ${formatFileSize(audioBlob.size)}).`
    );
  }

  // Ensure Firebase Auth session is active
  await ensureAuth();

  // Determine file extension from Blob mimeType
  const mimeType = audioBlob.type || 'audio/webm';
  let ext = 'webm';
  if (mimeType.includes('mp4')) ext = 'm4a';
  else if (mimeType.includes('ogg')) ext = 'ogg';
  else if (mimeType.includes('wav')) ext = 'wav';
  else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) ext = 'mp3';

  const fileName = `voice_note_${Date.now()}.${ext}`;
  const storagePath = `chat_audio/${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const storageRef = ref(storage, storagePath);

  try {
    const uploadTask = uploadBytesResumable(storageRef, audioBlob, {
      contentType: mimeType,
      customMetadata: {
        originalName: fileName,
        mediaType: 'audio',
        duration: (durationSeconds || 0).toString(),
        uploadedAt: new Date().toISOString(),
      },
    });

    return await new Promise<UploadResult>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress =
            snapshot.totalBytes > 0
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              : 0;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (onProgress) onProgress(100);
            resolve({
              downloadUrl: e.target?.result as string,
              storagePath,
              storageRef,
              fileName,
              mediaType: 'audio',
              fileSize: audioBlob.size,
              duration: durationSeconds,
            });
          };
          reader.onerror = () => reject(error);
          reader.readAsDataURL(audioBlob);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              downloadUrl,
              storagePath,
              storageRef,
              fileName,
              mediaType: 'audio',
              fileSize: audioBlob.size,
              duration: durationSeconds,
            });
          } catch {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                downloadUrl: e.target?.result as string,
                storagePath,
                storageRef,
                fileName,
                mediaType: 'audio',
                fileSize: audioBlob.size,
                duration: durationSeconds,
              });
            };
            reader.onerror = (readErr) => reject(readErr);
            reader.readAsDataURL(audioBlob);
          }
        }
      );
    });
  } catch {
    return new Promise<UploadResult>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (onProgress) onProgress(100);
        resolve({
          downloadUrl: e.target?.result as string,
          storagePath,
          storageRef,
          fileName,
          mediaType: 'audio',
          fileSize: audioBlob.size,
          duration: durationSeconds,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }
}

/**
 * Backward compatible alias for audio upload
 */
export const uploadChatAudio = uploadAudioBlob;

/**
 * Deletes a file from Firebase Storage given its storage path, StorageReference, or URL
 */
export async function deleteFile(storagePathOrRef: string | StorageReference): Promise<void> {
  if (!storagePathOrRef) return;
  if (typeof storagePathOrRef === 'string') {
    if (storagePathOrRef.startsWith('data:') || storagePathOrRef.startsWith('blob:')) {
      return;
    }
  }

  try {
    const storageRef = typeof storagePathOrRef === 'string' ? ref(storage, storagePathOrRef) : storagePathOrRef;
    await deleteObject(storageRef);
  } catch {
    // Ignore deletion failures for temporary or non-existent files
  }
}
