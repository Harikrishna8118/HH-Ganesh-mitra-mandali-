import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Upload,
  FolderPlus,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  HardDrive,
  LogIn,
  LogOut,
  ChevronRight,
  Filter,
  Download,
  ShieldCheck,
} from 'lucide-react';
import {
  listDriveFiles,
  uploadFileToDrive,
  createDriveFolder,
  deleteDriveFile,
  signInWithGoogleDrive,
  logoutDrive,
  getDriveAccessToken,
  initDriveAuth,
  type DriveFileItem,
} from '../services/googleDriveService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { logger } from '../utils/logger.ts';

interface DriveViewProps {
  onOpenAuth?: () => void;
  onNavigate?: (view: string) => void;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export const DriveView: React.FC<DriveViewProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getDriveAccessToken());
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // File explorer state
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'folders' | 'documents' | 'images' | 'spreadsheets'>('all');

  // Navigation / Folder path
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Mandali Drive Root' },
  ]);
  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New folder modal state
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Destructive delete confirmation modal (MANDATORY per Workspace Integration Skill)
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Listen to drive auth state changes
  useEffect(() => {
    const unsubscribe = initDriveAuth((user, token) => {
      setIsAuthenticated(!!token);
    });
    return () => unsubscribe();
  }, []);

  // Fetch drive files whenever folder changes or authentication succeeds
  const loadFiles = useCallback(async () => {
    if (!getDriveAccessToken()) {
      setIsAuthenticated(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const items = await listDriveFiles({
        folderId: currentFolderId === 'root' ? undefined : currentFolderId,
        searchQuery: searchQuery.trim() || undefined,
      });
      setFiles(items);
    } catch (err: any) {
      logger.error('DriveView', 'Error fetching files:', err);
      if (err.message && err.message.includes('expired')) {
        setIsAuthenticated(false);
      }
      setLoadError(err.message || 'Failed to fetch files from Google Drive.');
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId, searchQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      loadFiles();
    }
  }, [isAuthenticated, loadFiles]);

  // Handle Google Drive sign-in
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const { accessToken } = await signInWithGoogleDrive();
      if (accessToken) {
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      logger.error('DriveView', 'Sign in failed:', err);
      setAuthError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle sign-out / disconnect
  const handleSignOut = async () => {
    await logoutDrive();
    setIsAuthenticated(false);
    setFiles([]);
    setBreadcrumbs([{ id: 'root', name: 'Mandali Drive Root' }]);
  };

  // Navigate into folder
  const handleOpenFolder = (folder: DriveFileItem) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  // Navigate up using breadcrumbs
  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  // Handle file selection for upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError(null);
      setUploadSuccess(false);
    }
  };

  // Execute upload
  const handleExecuteUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(10);

    try {
      await uploadFileToDrive(
        selectedFile,
        currentFolderId === 'root' ? undefined : currentFolderId,
        (pct) => setUploadProgress(pct)
      );
      setUploadSuccess(true);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(false);
        loadFiles();
      }, 1200);
    } catch (err: any) {
      logger.error('DriveView', 'Upload failed:', err);
      setUploadError(err.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Execute folder creation
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    setFolderError(null);

    try {
      await createDriveFolder(
        newFolderName.trim(),
        currentFolderId === 'root' ? undefined : currentFolderId
      );
      setNewFolderName('');
      setShowFolderModal(false);
      loadFiles();
    } catch (err: any) {
      logger.error('DriveView', 'Create folder failed:', err);
      setFolderError(err.message || 'Failed to create folder.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Execute deletion with mandatory confirmation
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteDriveFile(fileToDelete.id);
      setFileToDelete(null);
      loadFiles();
    } catch (err: any) {
      logger.error('DriveView', 'Delete failed:', err);
      setDeleteError(err.message || 'Failed to delete file from Google Drive.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper for file type icons
  const renderFileIcon = (item: DriveFileItem) => {
    if (item.isFolder) {
      return <Folder className="w-8 h-8 text-amber-500 fill-amber-100 dark:fill-amber-950/60 shrink-0" />;
    }
    if (item.mimeType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-rose-500 shrink-0" />;
    }
    if (item.mimeType.includes('spreadsheet') || item.mimeType.includes('csv') || item.name.endsWith('.xlsx')) {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />;
    }
    if (item.mimeType.includes('pdf') || item.mimeType.includes('document') || item.name.endsWith('.pdf')) {
      return <FileText className="w-8 h-8 text-blue-600 shrink-0" />;
    }
    return <File className="w-8 h-8 text-slate-400 shrink-0" />;
  };

  // Filtered files
  const filteredFiles = files.filter((item) => {
    if (activeFilter === 'folders') return item.isFolder;
    if (activeFilter === 'images') return item.mimeType.startsWith('image/');
    if (activeFilter === 'documents') {
      return (
        item.mimeType.includes('pdf') ||
        item.mimeType.includes('document') ||
        item.mimeType.includes('text') ||
        item.name.endsWith('.pdf') ||
        item.name.endsWith('.docx')
      );
    }
    if (activeFilter === 'spreadsheets') {
      return (
        item.mimeType.includes('spreadsheet') ||
        item.mimeType.includes('csv') ||
        item.name.endsWith('.xlsx')
      );
    }
    return true;
  });

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '--';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '--';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold tracking-wide uppercase">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Google Drive Integration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Mandali Document & Photo Archive
            </h1>
            <p className="text-amber-100 text-sm max-w-2xl">
              Centralized Google Drive repository for Ganesh Mitra Mandali, H. Hosahalli. Browse circulars, pooja receipts, audited accounts, and high-resolution festival celebration photos with user permission.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-xs border border-white/30 text-white text-xs font-semibold transition active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect Drive</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Content: Either Auth Screen or File Explorer */}
      {!isAuthenticated ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
              <HardDrive className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Connect Google Drive
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sign in with your Google Account to view, upload, and organize Mandali circulars, celebration photos, and festival receipts directly from Google Drive.
              </p>
            </div>

            <div className="bg-amber-50/70 dark:bg-slate-800/80 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 text-left space-y-2 border border-amber-200/50 dark:border-slate-700">
              <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-400">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Privacy & Access Control</span>
              </div>
              <p>
                Your Google Drive files are accessed directly in your browser. Access tokens are held securely in-memory and are never stored on external servers or local storage.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            {/* Official "Sign in with Google" button per Workspace Integration Skill */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="group relative inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 font-medium text-sm shadow-sm transition active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-5 h-5 block"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </div>
                <span>
                  {isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Connected Google Drive Explorer */
        <div className="space-y-4">
          {/* Action & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Breadcrumb Path */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 overflow-x-auto py-1">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <button
                      type="button"
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`whitespace-nowrap px-2 py-1 rounded-lg transition ${
                        idx === breadcrumbs.length - 1
                          ? 'font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'
                          : 'hover:text-amber-600 dark:hover:text-amber-400'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
                >
                  <FolderPlus className="w-4 h-4 text-amber-500" />
                  <span>New Folder</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-xs transition active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                </button>

                <button
                  type="button"
                  onClick={loadFiles}
                  disabled={isLoading}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
                  title="Refresh Files"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search files by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    activeFilter === 'all'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All ({files.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('folders')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    activeFilter === 'folders'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Folders
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('documents')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    activeFilter === 'documents'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Docs & Circulars
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('images')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    activeFilter === 'images'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Photos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('spreadsheets')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    activeFilter === 'spreadsheets'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Receipts & Accounts
                </button>
              </div>
            </div>
          </div>

          {/* Files List / Grid */}
          {isLoading && files.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Fetching Google Drive items...
              </p>
            </div>
          ) : loadError ? (
            <div className="p-6 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-800 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
              <p className="text-sm font-medium text-red-800 dark:text-red-300">{loadError}</p>
              <button
                type="button"
                onClick={loadFiles}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Folder className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto stroke-1" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No files found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? `No items match "${searchQuery}". Try a different keyword.`
                  : 'This folder is currently empty. Upload circulars, receipts, or photos to get started.'}
              </p>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition"
              >
                <Upload className="w-4 h-4" />
                <span>Upload First File</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Item Icon or Image Thumbnail */}
                    {file.thumbnailLink ? (
                      <img
                        src={file.thumbnailLink}
                        alt={file.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      renderFileIcon(file)
                    )}

                    <div className="min-w-0 flex-1">
                      {file.isFolder ? (
                        <button
                          type="button"
                          onClick={() => handleOpenFolder(file)}
                          className="text-left font-bold text-sm text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 line-clamp-1 transition"
                        >
                          {file.name}
                        </button>
                      ) : (
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                          {file.name}
                        </h4>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span>{file.isFolder ? 'Folder' : formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{formatDate(file.modifiedTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    {file.isFolder ? (
                      <button
                        type="button"
                        onClick={() => handleOpenFolder(file)}
                        className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Open Folder</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : file.webViewLink ? (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Drive</span>
                      </a>
                    ) : (
                      <span className="text-slate-400">Available in Drive</span>
                    )}

                    {/* Delete button triggering confirmation modal */}
                    <button
                      type="button"
                      onClick={() => setFileToDelete(file)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      title={`Delete "${file.name}"`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Upload to Mandali Drive
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Folder: <span className="text-amber-600">{breadcrumbs[breadcrumbs.length - 1].name}</span>
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50 dark:bg-slate-800/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {selectedFile ? selectedFile.name : 'Click to select a document, receipt, or photo'}
                </p>
                {selectedFile && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>

              {uploadProgress > 0 && isUploading && (
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 text-right">{uploadProgress}%</p>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>File uploaded successfully!</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteUpload}
                disabled={!selectedFile || isUploading}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition active:scale-95"
              >
                {isUploading ? 'Uploading...' : 'Upload Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleCreateFolder}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Create New Folder
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Folder Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2026 Festival Circulars, Pooja Receipts"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              {folderError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{folderError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                disabled={isCreatingFolder}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newFolderName.trim() || isCreatingFolder}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition active:scale-95"
              >
                {isCreatingFolder ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for Destructive Operations (Workspace Integration Skill) */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-red-200 dark:border-red-900 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Confirm Permanent Deletion
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Google Drive Destructive Operation
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-xs text-red-800 dark:text-red-200 space-y-1">
              <p className="font-semibold">
                Are you sure you want to delete this {fileToDelete.isFolder ? 'folder' : 'file'} from Google Drive?
              </p>
              <p className="font-mono text-[11px] bg-red-100/60 dark:bg-red-900/40 p-1.5 rounded truncate">
                {fileToDelete.name}
              </p>
              <p className="text-[11px] text-red-600 dark:text-red-400">
                This action permanently deletes the item from your Google Drive account and cannot be undone.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/60 rounded-xl text-xs text-red-800 dark:text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition active:scale-95 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Item'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
