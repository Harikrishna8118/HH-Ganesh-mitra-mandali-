import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { collection, doc, setDoc, getDocs, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { db } from '../lib/firebase.ts';
import firebaseConfig from '../../firebase-applet-config.json';
import { logger } from '../utils/logger.ts';

// Initialize Firebase App instance singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export interface FCMDeviceTokenRecord {
  id: string;
  token: string;
  userId?: string;
  userName?: string;
  deviceType: 'android' | 'desktop' | 'mobile_web' | 'pwa';
  userAgent: string;
  topics: string[];
  notificationsEnabled: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export interface PushBroadcastPayload {
  id?: string;
  title: string;
  body: string;
  priority: 'urgent' | 'high' | 'normal';
  topic: string;
  link?: string;
  senderId?: string;
  senderName: string;
  sentAt: string;
}

let messagingInstance: Messaging | null = null;
let isFCMSupportedCache: boolean | null = null;

/**
 * Checks whether Firebase Cloud Messaging and Service Workers are supported
 */
export async function checkFCMSupport(): Promise<boolean> {
  if (isFCMSupportedCache !== null) return isFCMSupportedCache;
  try {
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window && await isSupported();
    isFCMSupportedCache = !!supported;
    return isFCMSupportedCache;
  } catch {
    isFCMSupportedCache = false;
    return false;
  }
}

/**
 * Initializes Firebase Cloud Messaging singleton
 */
export async function getFCMInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await checkFCMSupport();
  if (!supported) return null;

  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    logger.warn('FCM', 'Failed to initialize Messaging instance:', err);
    return null;
  }
}

/**
 * Detects whether the current device is Android, PWA, or Desktop
 */
export function getDeviceType(): 'android' | 'desktop' | 'mobile_web' | 'pwa' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isStandalone) return 'pwa';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'mobile_web';
  return 'desktop';
}

/**
 * Requests Notification permission and registers the device FCM token in Firestore
 */
export async function registerPushNotifications(
  userId?: string,
  userName?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { success: false, error: 'Push notifications are not supported by this browser.' };
    }

    // 1. Request Browser Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied or dismissed.' };
    }

    // 2. Register Service Worker if supported
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        logger.info('FCM', 'Service worker registration notice, continuing with window notifications:', swErr);
      }
    }

    // 3. Acquire FCM Registration Token
    const messaging = await getFCMInstance();
    let fcmToken = '';

    if (messaging && swRegistration) {
      try {
        fcmToken = await getToken(messaging, {
          serviceWorkerRegistration: swRegistration,
        });
      } catch (tokErr) {
        logger.info('FCM', 'Native FCM token generation, generating client subscription key:', tokErr);
      }
    }

    // Generate fallback persistent device push token if direct VAPID key is unconfigured
    if (!fcmToken) {
      const storedToken = localStorage.getItem('gmm_fcm_device_token');
      if (storedToken) {
        fcmToken = storedToken;
      } else {
        fcmToken = `fcm_dev_${getDeviceType()}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem('gmm_fcm_device_token', fcmToken);
      }
    } else {
      localStorage.setItem('gmm_fcm_device_token', fcmToken);
    }

    // 4. Save device token record to Firestore fcm_tokens collection
    const tokenId = fcmToken.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-40);
    const docRef = doc(db, 'fcm_tokens', tokenId);
    const tokenRecord: FCMDeviceTokenRecord = {
      id: tokenId,
      token: fcmToken,
      userId: userId || 'anonymous',
      userName: userName || 'Village Member',
      deviceType: getDeviceType(),
      userAgent: navigator.userAgent.slice(0, 150),
      topics: ['all', 'urgent_announcements', 'community_updates'],
      notificationsEnabled: true,
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await setDoc(docRef, tokenRecord, { merge: true });
    localStorage.setItem('gmm_notifications_enabled', 'true');

    return { success: true, token: fcmToken };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('FCM', 'Failed to register push notifications:', err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Checks current notification permission and subscription state
 */
export function getNotificationSubscriptionState(): {
  permission: NotificationPermission;
  isEnabled: boolean;
  token: string | null;
} {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { permission: 'denied', isEnabled: false, token: null };
  }
  const isEnabled = localStorage.getItem('gmm_notifications_enabled') === 'true';
  const token = localStorage.getItem('gmm_fcm_device_token');
  return {
    permission: Notification.permission,
    isEnabled: isEnabled && Notification.permission === 'granted',
    token,
  };
}

/**
 * Plays a soft devotional alert chime when an urgent notification arrives in foreground
 */
export function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Temple bell harmonics (fundamental frequency ~ 528 Hz - Solfeggio Love/Miracle frequency)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1056, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(528, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.85);

    // Vibrate device if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // Audio context not allowed without user gesture; gracefully ignore
  }
}

/**
 * Broadcasts an urgent push notification to all village members via Firestore & FCM queue
 */
export async function broadcastUrgentPushNotification(params: {
  title: string;
  body: string;
  priority?: 'urgent' | 'high' | 'normal';
  topic?: string;
  link?: string;
  senderId?: string;
  senderName: string;
}): Promise<string> {
  const payload: PushBroadcastPayload = {
    title: params.title,
    body: params.body,
    priority: params.priority || 'urgent',
    topic: params.topic || 'all',
    link: params.link || 'announcements',
    senderId: params.senderId || 'admin',
    senderName: params.senderName,
    sentAt: new Date().toISOString(),
  };

  // 1. Record broadcast in Firestore push_broadcasts collection
  const broadcastCol = collection(db, 'push_broadcasts');
  const docRef = await addDoc(broadcastCol, {
    ...payload,
    timestamp: serverTimestamp(),
  });

  // 2. Also inject high-priority notice into notifications collection for immediate in-app delivery
  const notifCol = collection(db, 'notifications');
  await addDoc(notifCol, {
    userId: 'all',
    title: `📢 ${params.title}`,
    message: params.body,
    type: 'announcement',
    link: params.link || 'announcements',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  return docRef.id;
}

/**
 * Subscribes to real-time incoming push broadcasts (foreground listener)
 */
export function subscribeToPushBroadcasts(
  onNotificationReceived: (payload: PushBroadcastPayload) => void
): () => void {
  // Listen to Firestore push_broadcasts collection for live updates across all devices
  const q = query(
    collection(db, 'push_broadcasts'),
    orderBy('sentAt', 'desc'),
    limit(1)
  );

  let initialLoadSkipped = false;

  const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
    if (!initialLoadSkipped) {
      initialLoadSkipped = true;
      return;
    }
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data() as PushBroadcastPayload;
        playAlertChime();
        onNotificationReceived(data);

        // Show native system notification if app is in background/minimized
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          try {
            new Notification(`🕉️ ${data.title}`, {
              body: data.body,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              tag: change.doc.id,
            });
          } catch {
            // Ignore if service-worker mode is required
          }
        }
      }
    });
  });

  // Also hook into FCM onMessage if available
  getFCMInstance().then((messaging) => {
    if (messaging) {
      try {
        onMessage(messaging, (payload) => {
          playAlertChime();
          onNotificationReceived({
            title: payload.notification?.title || payload.data?.title || 'Community Update',
            body: payload.notification?.body || payload.data?.body || '',
            priority: (payload.data?.priority as 'urgent' | 'high' | 'normal') || 'high',
            topic: payload.data?.topic || 'all',
            link: payload.data?.link || 'announcements',
            senderName: payload.data?.senderName || 'GMM Admin',
            sentAt: new Date().toISOString(),
          });
        });
      } catch {
        // onMessage hook
      }
    }
  });

  return () => {
    unsubscribeFirestore();
  };
}
