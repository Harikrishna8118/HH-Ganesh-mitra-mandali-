import { useState, useEffect, useCallback } from 'react';
import { getOfflineCacheSummary } from '../services/offlineCacheService.ts';

export interface NetworkStatus {
  isOnline: boolean;
  offlineSince: Date | null;
  lastCheckedAt: Date;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
  cacheSummary: ReturnType<typeof getOfflineCacheSummary>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [cacheSummary, setCacheSummary] = useState(() => getOfflineCacheSummary());

  const refreshCacheSummary = useCallback(() => {
    setCacheSummary(getOfflineCacheSummary());
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    setLastCheckedAt(new Date());

    try {
      // Ping with cache busting and a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`/favicon.svg?_ping=${Date.now()}`, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      const online = res.ok || res.type === 'opaque' || res.status < 500;
      setIsOnline(online);
      if (online) {
        setOfflineSince(null);
      } else {
        setOfflineSince((prev) => prev || new Date());
      }
      refreshCacheSummary();
      setIsChecking(false);
      return online;
    } catch {
      // Offline fallback
      const online = typeof navigator !== 'undefined' ? navigator.onLine : false;
      setIsOnline(online);
      if (!online) {
        setOfflineSince((prev) => prev || new Date());
      } else {
        setOfflineSince(null);
      }
      refreshCacheSummary();
      setIsChecking(false);
      return online;
    }
  }, [refreshCacheSummary]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineSince(null);
      setLastCheckedAt(new Date());
      refreshCacheSummary();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineSince(new Date());
      setLastCheckedAt(new Date());
      refreshCacheSummary();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    refreshCacheSummary();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshCacheSummary]);

  return {
    isOnline,
    offlineSince,
    lastCheckedAt,
    isChecking,
    checkConnection,
    cacheSummary,
  };
}
