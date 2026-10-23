import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Camera,
  Trash2,
  UploadCloud,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import { compressAndReadGalleryImage, validateImageFile } from '../utils/imageUtils.ts';

interface ImageGalleryPickerProps {
  value: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  helperText?: string;
  shape?: 'circle' | 'square' | 'banner';
  maxWidth?: number;
  maxHeight?: number;
  presets?: Array<{ label: string; url: string }>;
  placeholderIcon?: React.ReactNode;
  className?: string;
}

export const ImageGalleryPicker: React.FC<ImageGalleryPickerProps> = ({
  value,
  onChange,
  label = 'Photo',
  helperText = 'Select an image directly from your gallery or take a new photo',
  shape = 'circle',
  maxWidth = 800,
  maxHeight = 800,
  presets = [],
  placeholderIcon,
  className = '',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUrlOption, setShowUrlOption] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelected = async (file: File | undefined | null) => {
    if (!file) return;

    setErrorMessage(null);
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Please select a valid image file.');
      return;
    }

    setIsProcessing(true);
    try {
      const compressedDataUrl = await compressAndReadGalleryImage(file, {
        maxWidth,
        maxHeight,
        quality: 0.78,
      });
      onChange(compressedDataUrl);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process selected image from gallery.');
    } finally {
      setIsProcessing(false);
      // Reset inputs so same file can be re-selected if desired
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setErrorMessage(null);
  };

  const handleApplyUrl = () => {
    if (customUrlInput.trim()) {
      onChange(customUrlInput.trim());
      setCustomUrlInput('');
      setShowUrlOption(false);
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Label and Helper Text */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)]">
            {label}
          </label>
          {helperText && (
            <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
              {helperText}
            </p>
          )}
        </div>
        {value && (
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Photo Selected
          </span>
        )}
      </div>

      {/* Hidden File Inputs: Gallery Picker and Direct Camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />

      {/* Main Picker Card & Preview */}
      <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-default)] transition-colors">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          
          {/* Image Thumbnail / Avatar Box */}
          <div className="relative shrink-0 group">
            {shape === 'circle' && (
              <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-amber-400 shadow-md flex items-center justify-center">
                {value ? (
                  <img
                    src={value}
                    alt="Selected"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  placeholderIcon || <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>
            )}

            {shape === 'square' && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-amber-400 shadow-md flex items-center justify-center">
                {value ? (
                  <img
                    src={value}
                    alt="Selected"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  placeholderIcon || <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>
            )}

            {shape === 'banner' && (
              <div className="w-full sm:w-36 h-20 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs flex items-center justify-center">
                {value ? (
                  <img
                    src={value}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  placeholderIcon || <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>
            )}

            {/* Spinner Overlay while processing */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs rounded-full flex flex-col items-center justify-center text-white text-[10px] font-bold p-1">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400 mb-1" />
                <span>Reading...</span>
              </div>
            )}
          </div>

          {/* Action Buttons: Choose from Gallery & Take Photo */}
          <div className="flex-1 w-full space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Button 1: Direct Gallery Selection */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ImageIcon className="w-4 h-4 text-amber-200 shrink-0" />
                <span>{value ? 'Change from Gallery' : 'Choose from Gallery'}</span>
              </button>

              {/* Button 2: Camera Capture */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => cameraInputRef.current?.click()}
                className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                title="Take photo using camera"
              >
                <Camera className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="hidden sm:inline">Camera</span>
              </button>

              {/* Button 3: Clear / Remove */}
              {value && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleRemove}
                  className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 font-medium text-xs transition cursor-pointer"
                  title="Remove selected photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              Directly loads and compresses photo on your device. No external link required.
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-2.5 p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Devotional Presets (if provided) */}
        {presets && presets.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
            <span className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Or choose a traditional devotional avatar:</span>
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange(preset.url)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-medium transition shrink-0 cursor-pointer ${
                    value === preset.url
                      ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-500 text-amber-900 dark:text-amber-200 font-bold ring-1 ring-amber-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Collapsible: Use link only if user specifically wants to paste a URL */}
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setShowUrlOption(!showUrlOption)}
            className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <LinkIcon className="w-3 h-3" />
            <span>Advanced: paste custom web link instead</span>
            {showUrlOption ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showUrlOption && (
            <div className="mt-2 flex gap-2 animate-in fade-in">
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
              >
                Apply URL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
