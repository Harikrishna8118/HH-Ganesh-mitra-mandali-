import type {
  AppSettings,
  MemberProfile,
  Announcement,
  EmergencyReport,
  Poll,
} from '../types.ts';
import { logger } from '../utils/logger.ts';

export interface CriticalOfflineCache {
  settings: AppSettings | null;
  members: MemberProfile[];
  announcements: Announcement[];
  emergencies: EmergencyReport[];
  polls: Poll[];
  lastSyncedAt: string;
}

const CACHE_KEY = 'gmm_critical_offline_cache_v1';
const cacheLogger = logger.forComponent('OfflineCache');

// Throttle log warnings to avoid repetitive console noise
let hasWarnedSaveFailure = false;
let hasWarnedLoadFailure = false;

/**
 * Save critical mandali data into browser localStorage for immediate offline availability
 */
export function saveCriticalDataToCache(updates: Partial<CriticalOfflineCache>): void {
  try {
    const existing = loadCriticalDataFromCache() || {
      settings: null,
      members: [],
      announcements: [],
      emergencies: [],
      polls: [],
      lastSyncedAt: new Date().toISOString(),
    };

    const updatedCache: CriticalOfflineCache = {
      ...existing,
      ...updates,
      lastSyncedAt: new Date().toISOString(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(updatedCache));
    hasWarnedSaveFailure = false; // reset flag on successful save
  } catch {
    if (!hasWarnedSaveFailure) {
      hasWarnedSaveFailure = true;
      cacheLogger.warn('Local storage quota reached or restricted; continuing in memory mode.');
    }
  }
}

/**
 * Load cached critical data during network outages or cold starts
 */
export function loadCriticalDataFromCache(): CriticalOfflineCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CriticalOfflineCache;
    return {
      settings: parsed.settings || null,
      members: Array.isArray(parsed.members) ? parsed.members : [],
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
      emergencies: Array.isArray(parsed.emergencies) ? parsed.emergencies : [],
      polls: Array.isArray(parsed.polls) ? parsed.polls : [],
      lastSyncedAt: parsed.lastSyncedAt || new Date().toISOString(),
    };
  } catch {
    if (!hasWarnedLoadFailure) {
      hasWarnedLoadFailure = true;
      cacheLogger.warn('Could not read local cache, starting clean session.');
    }
    return null;
  }
}

/**
 * Get summary stats of what critical data is currently cached locally
 */
export function getOfflineCacheSummary() {
  const cached = loadCriticalDataFromCache();
  if (!cached) {
    return {
      isCached: false,
      hasSettings: false,
      membersCount: 0,
      announcementsCount: 0,
      emergenciesCount: 0,
      pollsCount: 0,
      lastSyncedAt: null,
    };
  }

  return {
    isCached: true,
    hasSettings: !!cached.settings,
    mandaliName: cached.settings?.mandaliName || 'Ganesh Mitra Mandali',
    contactPhone: cached.settings?.contactPhone || '+91 98450 12345',
    membersCount: Array.isArray(cached.members) ? cached.members.length : 0,
    announcementsCount: Array.isArray(cached.announcements) ? cached.announcements.length : 0,
    emergenciesCount: Array.isArray(cached.emergencies) ? cached.emergencies.length : 0,
    pollsCount: Array.isArray(cached.polls) ? cached.polls.length : 0,
    lastSyncedAt: cached.lastSyncedAt,
  };
}

/**
 * Clear local offline cache if needed
 */
export function clearOfflineCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Silently continue
  }
}
