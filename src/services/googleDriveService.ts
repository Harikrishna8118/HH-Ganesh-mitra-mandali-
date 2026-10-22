import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase.ts';
import { logger } from '../utils/logger.ts';

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  isFolder: boolean;
  owners?: { displayName: string; emailAddress: string; photoLink?: string }[];
}

// In-memory cache for OAuth access token (per security requirements, NEVER persist in storage)
let cachedDriveAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Configure Google Auth Provider with Google Drive scopes
 */
export function getDriveAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  for (const scope of GOOGLE_DRIVE_SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({
    prompt: 'consent',
  });
  return provider;
}

/**
 * Initializes Google Drive Auth state listener with in-memory token lifecycle
 */
export function initDriveAuth(
  onAuthChange: (user: User | null, token: string | null) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedDriveAccessToken) {
      onAuthChange(user, cachedDriveAccessToken);
    } else if (!isSigningIn) {
      cachedDriveAccessToken = null;
      onAuthChange(user, null);
    }
  });
}

/**
 * Initiates Google Drive Sign-In popup with required Drive scopes
 */
export async function signInWithGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const provider = getDriveAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Could not acquire Google Drive access token from authentication result.');
    }

    cachedDriveAccessToken = credential.accessToken;
    logger.info('Drive', 'Google Drive access token acquired successfully.');
    return { user: result.user, accessToken: cachedDriveAccessToken };
  } catch (error: any) {
    logger.error('Drive', 'Google Drive authentication error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Returns the active in-memory Google Drive access token
 */
export function getDriveAccessToken(): string | null {
  return cachedDriveAccessToken;
}

/**
 * Sets an access token in-memory (e.g. from session callback)
 */
export function setDriveAccessToken(token: string | null): void {
  cachedDriveAccessToken = token;
}

/**
 * Signs out and clears the in-memory access token
 */
export async function logoutDrive(): Promise<void> {
  cachedDriveAccessToken = null;
}

/**
 * Lists files and folders from Google Drive
 */
export async function listDriveFiles(options?: {
  folderId?: string;
  searchQuery?: string;
  pageSize?: number;
}): Promise<DriveFileItem[]> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in with Google to access Google Drive.');
  }

  const pageSize = options?.pageSize || 30;
  let q = 'trashed = false';

  if (options?.folderId && options.folderId !== 'root') {
    q += ` and '${options.folderId}' in parents`;
  }

  if (options?.searchQuery && options.searchQuery.trim()) {
    const escaped = options.searchQuery.trim().replace(/'/g, "\\'");
    q += ` and name contains '${escaped}'`;
  }

  const fields = 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, owners)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${pageSize}&fields=${encodeURIComponent(fields)}&orderBy=folder,modifiedTime desc`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedDriveAccessToken = null;
      throw new Error('Your Google Drive authorization has expired. Please sign in again.');
    }
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Failed to fetch Drive files: HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawFiles = data.files || [];

  return rawFiles.map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    webContentLink: f.webContentLink,
    iconLink: f.iconLink,
    thumbnailLink: f.thumbnailLink,
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    owners: f.owners,
  }));
}

/**
 * Uploads a file to Google Drive using the multipart upload endpoint
 */
export async function uploadFileToDrive(
  file: File,
  folderId?: string,
  onProgress?: (pct: number) => void
): Promise<DriveFileItem> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in with Google to upload to Google Drive.');
  }

  const metadata: Record<string, any> = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    description: 'Uploaded via Ganesh Mitra Mandali Portal, H. Hosahalli',
  };

  if (folderId && folderId !== 'root') {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileData = await file.arrayBuffer();

  const multipartRequestBody = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n`,
    'Content-Transfer-Encoding: base64\r\n\r\n',
    arrayBufferToBase64(fileData),
    closeDelimiter,
  ]);

  if (onProgress) onProgress(40);

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,iconLink,thumbnailLink,modifiedTime';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (onProgress) onProgress(90);

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Failed to upload file to Drive: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (onProgress) onProgress(100);

  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: data.size,
    webViewLink: data.webViewLink,
    iconLink: data.iconLink,
    thumbnailLink: data.thumbnailLink,
    modifiedTime: data.modifiedTime,
    isFolder: data.mimeType === 'application/vnd.google-apps.folder',
  };
}

/**
 * Creates a new folder in Google Drive
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<DriveFileItem> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in with Google to create a folder.');
  }

  const metadata: Record<string, any> = {
    name: folderName.trim(),
    mimeType: 'application/vnd.google-apps.folder',
    description: 'Mandali folder created via Ganesh Mitra Mandali Portal',
  };

  if (parentFolderId && parentFolderId !== 'root') {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,createdTime,modifiedTime', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Failed to create folder: HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    webViewLink: data.webViewLink,
    modifiedTime: data.modifiedTime,
    isFolder: true,
  };
}

/**
 * Permanently deletes a file from Google Drive
 * (Caller MUST provide an explicit user confirmation dialog before calling this method)
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Authentication required to delete file from Google Drive.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204 && response.status !== 404) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Failed to delete file from Google Drive: HTTP ${response.status}`);
  }
}

/**
 * Helper to encode ArrayBuffer as base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
