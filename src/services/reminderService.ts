import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { createNotification } from './mandaliService.ts';
import type { Poll, Announcement, NotificationItem } from '../types.ts';

// In-memory set of already processed reminders during this session
const localProcessedKeys = new Set<string>();

export interface Upcoming24hItem {
  id: string;
  type: 'poll' | 'event';
  title: string;
  deadlineOrDate: string;
  location?: string;
  hoursRemaining: number;
  minutesRemaining: number;
  isUrgent: boolean;
  reminderSent: boolean;
}

/**
 * Fetch already dispatched reminder keys from Firestore (shared among all members)
 */
export async function getDispatchedReminderKeys(): Promise<Record<string, string>> {
  try {
    const registryDoc = doc(db, 'app_settings', 'reminder_registry');
    const snap = await getDoc(registryDoc);
    if (snap.exists()) {
      return (snap.data() as { keys?: Record<string, string> }).keys || {};
    }
  } catch {
    // Fallback safely to in-memory dispatch tracker
  }
  return {};
}

/**
 * Record that a reminder has been sent for a specific item
 */
export async function markReminderAsDispatched(key: string): Promise<void> {
  localProcessedKeys.add(key);
  try {
    const registryDoc = doc(db, 'app_settings', 'reminder_registry');
    await setDoc(
      registryDoc,
      {
        keys: {
          [key]: new Date().toISOString(),
        },
        lastCheckedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // In-memory set provides local deduplication if remote sync fails
  }
}

/**
 * Scan polls and scheduled announcements/events and find those occurring within 24 hours
 */
export function getUpcoming24hItems(
  polls: Poll[],
  announcements: Announcement[],
  dispatchedKeys: Record<string, string> = {}
): Upcoming24hItem[] {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const items: Upcoming24hItem[] = [];

  // 1. Check Polls
  for (const poll of polls) {
    if (poll.status !== 'active' || !poll.deadline) continue;
    const deadlineTime = new Date(poll.deadline).getTime();
    if (isNaN(deadlineTime)) continue;
    const diffMs = deadlineTime - now;

    // Within 24 hours and not yet passed
    if (diffMs > 0 && diffMs <= ONE_DAY_MS) {
      const key = `poll_24h_${poll.id}`;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const isSent = !!dispatchedKeys[key] || localProcessedKeys.has(key);

      items.push({
        id: poll.id,
        type: 'poll',
        title: poll.question,
        deadlineOrDate: poll.deadline,
        hoursRemaining: hours,
        minutesRemaining: minutes,
        isUrgent: hours < 6,
        reminderSent: isSent,
      });
    }
  }

  // 2. Check Announcements with Scheduled Event Dates
  for (const ann of announcements) {
    if (!ann.eventDate) continue;
    const eventTime = new Date(ann.eventDate).getTime();
    if (isNaN(eventTime)) continue;
    const diffMs = eventTime - now;

    // Within 24 hours and not yet passed
    if (diffMs > 0 && diffMs <= ONE_DAY_MS) {
      const key = `event_24h_${ann.id}`;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const isSent = !!dispatchedKeys[key] || localProcessedKeys.has(key);

      items.push({
        id: ann.id,
        type: 'event',
        title: ann.title,
        deadlineOrDate: ann.eventDate,
        location: ann.eventLocation || 'Ganesh Mandapa, H. Hosahalli',
        hoursRemaining: hours,
        minutesRemaining: minutes,
        isUrgent: hours < 6,
        reminderSent: isSent,
      });
    }
  }

  // Sort by earliest deadline first
  return items.sort((a, b) => new Date(a.deadlineOrDate).getTime() - new Date(b.deadlineOrDate).getTime());
}

/**
 * Automated Reminders Engine:
 * Scans upcoming deadlines (within 24h), checks if already sent,
 * and automatically publishes 24-hour reminder notifications to all members.
 */
export async function checkAndSendAutomatedReminders(
  polls: Poll[],
  announcements: Announcement[],
  options?: { force?: boolean }
): Promise<{ sentCount: number; details: string[] }> {
  const dispatchedKeys = await getDispatchedReminderKeys();
  const upcoming = getUpcoming24hItems(polls, announcements, dispatchedKeys);
  const details: string[] = [];
  let sentCount = 0;

  for (const item of upcoming) {
    const key = `${item.type}_24h_${item.id}`;
    if (!options?.force && (dispatchedKeys[key] || localProcessedKeys.has(key))) {
      continue;
    }

    const formattedTime = new Date(item.deadlineOrDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const formattedDate = new Date(item.deadlineOrDate).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const hoursText =
      item.hoursRemaining > 0
        ? `${item.hoursRemaining} hour${item.hoursRemaining > 1 ? 's' : ''}`
        : `${item.minutesRemaining} minutes`;

    if (item.type === 'poll') {
      const title = `⏰ 24h Reminder: Poll Deadline Ending Soon`;
      const message = `Decision Poll: "${item.title}" will close in ${hoursText} (${formattedDate} at ${formattedTime}). Cast your vote now to decide for H. Hosahalli!`;

      await createNotification({
        userId: 'all',
        title,
        message,
        type: 'reminder',
        link: 'discussions',
        reminderKey: key,
        targetId: item.id,
        targetType: 'poll',
        deadline: item.deadlineOrDate,
      });

      triggerBrowserNotification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: key,
      });

      await markReminderAsDispatched(key);
      sentCount++;
      details.push(`Poll reminder sent: "${item.title}" (closes in ${hoursText})`);
    } else {
      const locationText = item.location ? ` at ${item.location}` : '';
      const title = `🔔 24h Event Reminder: "${item.title}" Starts Soon`;
      const message = `Community Event: "${item.title}" is scheduled for ${formattedDate} at ${formattedTime}${locationText} (in ~${hoursText}). All members and devotees are requested to attend!`;

      await createNotification({
        userId: 'all',
        title,
        message,
        type: 'reminder',
        link: 'announcements',
        reminderKey: key,
        targetId: item.id,
        targetType: 'event',
        deadline: item.deadlineOrDate,
      });

      triggerBrowserNotification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: key,
      });

      await markReminderAsDispatched(key);
      sentCount++;
      details.push(`Event reminder sent: "${item.title}" (scheduled in ${hoursText})`);
    }
  }

  return { sentCount, details };
}

/**
 * Manually trigger or test sending a 24-hour reminder for a specific event or poll
 */
export async function sendManualReminder(
  item: {
    id: string;
    type: 'poll' | 'event';
    title: string;
    deadlineOrDate: string;
    location?: string;
  }
): Promise<void> {
  const formattedTime = new Date(item.deadlineOrDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = new Date(item.deadlineOrDate).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const key = `${item.type}_24h_${item.id}`;

  if (item.type === 'poll') {
    const title = `⏰ 24h Reminder: Poll Deadline Ending Soon`;
    const message = `Urgent Reminder: Voting on "${item.title}" will close soon (${formattedDate} at ${formattedTime}). Submit your vote now!`;

    await createNotification({
      userId: 'all',
      title,
      message,
      type: 'reminder',
      link: 'discussions',
      reminderKey: key,
      targetId: item.id,
      targetType: 'poll',
      deadline: item.deadlineOrDate,
    });

    triggerBrowserNotification(title, { body: message, tag: key });
  } else {
    const locationText = item.location ? ` at ${item.location}` : '';
    const title = `🔔 24h Event Reminder: "${item.title}" Tomorrow`;
    const message = `Reminder: Mandali Event "${item.title}" takes place on ${formattedDate} at ${formattedTime}${locationText}. See you there!`;

    await createNotification({
      userId: 'all',
      title,
      message,
      type: 'reminder',
      link: 'announcements',
      reminderKey: key,
      targetId: item.id,
      targetType: 'event',
      deadline: item.deadlineOrDate,
    });

    triggerBrowserNotification(title, { body: message, tag: key });
  }

  await markReminderAsDispatched(key);
}

/**
 * Web Notification API: Request permission for native desktop / mobile alerts
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      // Permission prompt blocked or denied
    }
  }
  return 'denied';
}

/**
 * Web Notification API: Show native system notification if permitted
 */
export function triggerBrowserNotification(title: string, options?: NotificationOptions): void {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, options);
    } catch {
      // System notification skipped if not available
    }
  }
}
