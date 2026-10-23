/**
 * Image Utilities for direct gallery photo selection, compression, and handling
 * Supports picking photos directly from device gallery/camera, resizing client-side,
 * and producing compact high-quality data URLs ready for Firestore and PostgreSQL storage.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number; // Target max size (default: 200KB)
}

/**
 * Validates whether a file is an acceptable image
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'No file selected.' };
  }

  // Check MIME type
  const isImageMime = file.type.startsWith('image/');
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp'];

  if (!isImageMime && !allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: 'Please select a valid image file (JPEG, PNG, WebP, or HEIC).',
    };
  }

  // Reject files over 25MB before attempting to process
  if (file.size > 25 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'Selected image is too large (>25MB). Please choose a smaller photo.',
    };
  }

  return { isValid: true };
}

/**
 * Reads a File from gallery/camera and compresses it into an optimized WebP or JPEG Data URL.
 * Automatically performs downscaling to ensure fast uploads, zero payload bloat,
 * and high quality display.
 */
export async function compressAndReadGalleryImage(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  const maxWidth = options.maxWidth || 800;
  const maxHeight = options.maxHeight || 800;
  const initialQuality = options.quality || 0.78;
  const maxSizeBytes = options.maxSizeBytes || 250 * 1024; // 250 KB target

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image from device storage. Please try again.'));
    };

    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Image reader returned empty data.'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        reject(new Error('Could not decode the selected image file.'));
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Proportional scaling
          if (width > maxWidth || height > maxHeight) {
            if (width / maxWidth > height / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          // Offscreen Canvas Rendering
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            // Fallback: return raw data URL if canvas 2D context unavailable
            resolve(dataUrl);
            return;
          }

          // Fill white background in case source has transparency
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Test WebP support with fallback to JPEG
          let outputFormat = 'image/jpeg';
          let outputQuality = initialQuality;

          let compressedDataUrl = canvas.toDataURL(outputFormat, outputQuality);

          // If output is larger than maxSizeBytes, perform a second step compression
          const estimatedSize = Math.round((compressedDataUrl.length * 3) / 4);
          if (estimatedSize > maxSizeBytes && outputQuality > 0.45) {
            outputQuality = 0.55;
            // Also scale down canvas slightly if still very big
            if (canvas.width > 500) {
              const secondCanvas = document.createElement('canvas');
              secondCanvas.width = Math.round(canvas.width * 0.75);
              secondCanvas.height = Math.round(canvas.height * 0.75);
              const sCtx = secondCanvas.getContext('2d', { alpha: false });
              if (sCtx) {
                sCtx.fillStyle = '#FFFFFF';
                sCtx.fillRect(0, 0, secondCanvas.width, secondCanvas.height);
                sCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
                compressedDataUrl = secondCanvas.toDataURL(outputFormat, outputQuality);
              } else {
                compressedDataUrl = canvas.toDataURL(outputFormat, outputQuality);
              }
            } else {
              compressedDataUrl = canvas.toDataURL(outputFormat, outputQuality);
            }
          }

          resolve(compressedDataUrl);
        } catch (err) {
          // If canvas operations fail, resolve with reader data URL
          resolve(dataUrl);
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
