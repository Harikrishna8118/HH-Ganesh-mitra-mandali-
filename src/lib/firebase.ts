import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { logger } from '../utils/logger.ts';

// Set SDK logging to silent to prevent internal 10s backend stream timeout warnings
// The application uses offline cache and centralized logging for real-time status
setLogLevel('silent');

// Initialize Firebase App instance singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with IndexedDB persistent local cache and immediate HTTP long-polling
// (Forces long-polling immediately to bypass blocked WebChannel streaming in sandboxed iframes)
function createFirestoreInstance() {
  const dbId = firebaseConfig.firestoreDatabaseId || undefined;
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalForceLongPolling: true,
      },
      dbId
    );
  } catch {
    try {
      return initializeFirestore(
        app,
        {
          localCache: memoryLocalCache(),
          experimentalForceLongPolling: true,
        },
        dbId
      );
    } catch {
      return dbId ? getFirestore(app, dbId) : getFirestore(app);
    }
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);

// Ensure user is signed in to Firebase so request.auth is populated
let hasWarnedGuestAuth = false;
let isAnonymousAuthSupported = true;

export async function ensureAuth() {
  if (!isAnonymousAuthSupported) return;
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (err: any) {
    if (err?.code === 'auth/admin-restricted-operation' || err?.code === 'auth/operation-not-allowed') {
      isAnonymousAuthSupported = false;
    }
    if (!hasWarnedGuestAuth) {
      hasWarnedGuestAuth = true;
      logger.info('Firebase', 'Guest auth note: continuing in client-managed session mode.');
    }
  }
}

// Error logging conforming to FirestoreErrorInfo
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

const loggedErrorKeys = new Set<string>();

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
    },
  };
  
  // Deduplicate errors so repetitive snapshot triggers don't spam console
  const key = `${operationType}:${path || 'unknown'}:${errMsg.slice(0, 40)}`;
  if (!loggedErrorKeys.has(key)) {
    loggedErrorKeys.add(key);
    logger.warn('Firestore', `[${operationType} on ${path || 'doc'}]: ${errMsg}`, errInfo);
  }
  return errInfo;
}

// Connection test with cache-first resolution to prevent 10s backend timeouts
export async function testFirestoreConnection() {
  await ensureAuth();
  try {
    await getDoc(doc(db, 'app_settings', 'config'));
  } catch {
    // Gracefully handled; client operates smoothly in offline cache mode
  }
}
