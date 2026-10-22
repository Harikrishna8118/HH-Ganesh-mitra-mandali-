/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { EmergencyBanner } from './components/EmergencyBanner.tsx';
import { EmergencyModal } from './components/EmergencyModal.tsx';
import { UrgentAlertOverlay, type UrgentAlertData } from './components/UrgentAlertOverlay.tsx';
import { JoinModal } from './components/JoinModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { testFirestoreConnection } from './lib/firebase.ts';

// Views
import { HomeView } from './views/HomeView.tsx';
import { MembersView } from './views/MembersView.tsx';
import { ChatView } from './views/ChatView.tsx';
import { DiscussionsView } from './views/DiscussionsView.tsx';
import { AnnouncementsView } from './views/AnnouncementsView.tsx';
import { IssuesView } from './views/IssuesView.tsx';
import { ProfileView } from './views/ProfileView.tsx';
import { NotificationsView } from './views/NotificationsView.tsx';
import { AdminDashboardView } from './views/AdminDashboardView.tsx';

// Services
import {
  subscribeSettings,
  subscribeProfiles,
  subscribeJoinRequests,
  subscribeChatMessages,
  subscribeDiscussions,
  subscribePolls,
  subscribeAnnouncements,
  subscribeIssues,
  subscribeEmergencies,
  subscribeNotifications,
  subscribeAdminActions,
  DEFAULT_APP_SETTINGS,
} from './services/mandaliService.ts';
import { checkAndSendAutomatedReminders } from './services/reminderService.ts';
import { useNetworkStatus } from './hooks/useNetworkStatus.ts';
import {
  saveCriticalDataToCache,
  loadCriticalDataFromCache,
} from './services/offlineCacheService.ts';
import { WifiOff, RefreshCw, BellRing, X } from 'lucide-react';
import {
  subscribeToPushBroadcasts,
  registerPushNotifications,
  type PushBroadcastPayload,
} from './services/fcmService.ts';

import type {
  AppSettings,
  MemberProfile,
  JoinRequest,
  ChatMessage,
  DiscussionTopic,
  Poll,
  Announcement,
  IssueReport,
  EmergencyReport,
  NotificationItem,
  AdminAction,
} from './types.ts';

function MandaliAppContent() {
  const { currentUser, isAdmin } = useAuth();
  const { isOnline, offlineSince, checkConnection } = useNetworkStatus();
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState<boolean>(false);
  const [liveBroadcast, setLiveBroadcast] = useState<PushBroadcastPayload | null>(null);
  const [urgentAlert, setUrgentAlert] = useState<UrgentAlertData | null>(null);
  const [lastUrgentAlert, setLastUrgentAlert] = useState<UrgentAlertData | null>(null);

  const triggerUrgentAlert = (data: UrgentAlertData) => {
    setUrgentAlert(data);
    setLastUrgentAlert(data);
  };

  // App Navigation state
  const [currentView, setCurrentView] = useState<string>('home');
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    // Show splash on first load of session
    return !sessionStorage.getItem('gmm_splash_shown');
  });

  // Modals state
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Live Data State (with instant offline cache fallback)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionTopic[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyReport[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAction[]>([]);

  // Reset offline banner when device goes offline
  useEffect(() => {
    if (!isOnline) {
      setOfflineBannerDismissed(false);
    }
  }, [isOnline]);

  // Immediately hydrate critical state from local cache on boot
  useEffect(() => {
    const cached = loadCriticalDataFromCache();
    if (cached) {
      if (cached.settings) setSettings(cached.settings);
      if (cached.members && cached.members.length > 0) setMembers(cached.members);
      if (cached.announcements && cached.announcements.length > 0) setAnnouncements(cached.announcements);
      if (cached.emergencies && cached.emergencies.length > 0) setEmergencies(cached.emergencies);
      if (cached.polls && cached.polls.length > 0) setPolls(cached.polls);
    }
  }, []);

  // Save fresh incoming data to local offline cache
  useEffect(() => {
    if (settings) saveCriticalDataToCache({ settings });
  }, [settings]);

  useEffect(() => {
    if (members.length > 0) saveCriticalDataToCache({ members });
  }, [members]);

  useEffect(() => {
    if (announcements.length > 0) saveCriticalDataToCache({ announcements });
  }, [announcements]);

  useEffect(() => {
    if (emergencies.length > 0) saveCriticalDataToCache({ emergencies });
  }, [emergencies]);

  useEffect(() => {
    if (polls.length > 0) saveCriticalDataToCache({ polls });
  }, [polls]);

  // Check Firestore connection on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Subscribe to real-time collections
  useEffect(() => {
    const unsubSettings = subscribeSettings(setSettings);
    const unsubProfiles = subscribeProfiles(setMembers);
    const unsubAnnouncements = subscribeAnnouncements(setAnnouncements);
    const unsubChat = subscribeChatMessages(setChatMessages);
    const unsubDiscussions = subscribeDiscussions(setDiscussions);
    const unsubPolls = subscribePolls(setPolls);
    const unsubIssues = subscribeIssues(setIssues);
    const unsubEmergencies = subscribeEmergencies(setEmergencies);

    return () => {
      unsubSettings();
      unsubProfiles();
      unsubAnnouncements();
      unsubChat();
      unsubDiscussions();
      unsubPolls();
      unsubIssues();
      unsubEmergencies();
    };
  }, []);

  // Real-time join requests & audit listeners (available for all members to govern)
  useEffect(() => {
    const unsubRequests = subscribeJoinRequests(setJoinRequests);
    const unsubAudit = subscribeAdminActions(setAuditLogs);
    return () => {
      unsubRequests();
      unsubAudit();
    };
  }, []);

  // Notifications listener
  useEffect(() => {
    if (!currentUser) {
      // Public visitors don't have individual notifications
      setNotifications([]);
      return;
    }
    const userId = currentUser.uid;
    const unsubNotifs = subscribeNotifications(userId, isAdmin, setNotifications);
    return () => unsubNotifs();
  }, [currentUser?.uid, isAdmin]);

  // Automated 24-hour reminder engine for poll deadlines and scheduled community events
  useEffect(() => {
    if (polls.length === 0 && announcements.length === 0) return;

    // Scan immediately on data load/update
    checkAndSendAutomatedReminders(polls, announcements).catch(() => {
      // Safely handled in background
    });

    // Check periodically every 60 seconds
    const reminderInterval = setInterval(() => {
      checkAndSendAutomatedReminders(polls, announcements).catch(() => {
        // Silently handled in background
      });
    }, 60000);

    return () => clearInterval(reminderInterval);
  }, [polls, announcements]);

  // Firebase Cloud Messaging Live Push Broadcasts listener
  useEffect(() => {
    const unsub = subscribeToPushBroadcasts((payload) => {
      setLiveBroadcast(payload);
      // Immediately open high-priority Urgent Alert Overlay for instant attention
      triggerUrgentAlert({
        id: payload.id || `fcm_${Date.now()}`,
        title: payload.title,
        body: payload.body,
        priority: payload.priority,
        topic: payload.topic,
        senderName: payload.senderName,
        sentAt: payload.sentAt,
        link: payload.link,
      });
    });
    return () => unsub();
  }, []);

  // Auto-register FCM tokens on user login if push notifications previously enabled
  useEffect(() => {
    if (currentUser?.uid && localStorage.getItem('gmm_notifications_enabled') === 'true') {
      registerPushNotifications(currentUser.uid, currentUser.fullName).catch(() => {});
    }
  }, [currentUser?.uid, currentUser?.fullName]);

  const handleDismissSplash = () => {
    sessionStorage.setItem('gmm_splash_shown', 'true');
    setShowSplash(false);
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  // Active Emergency or Broadcast lookup for Navbar quick-reopen
  const activeEmergency = emergencies.find((e) => e.isActive);
  const hasActiveAlert = !!urgentAlert || !!lastUrgentAlert || !!activeEmergency || !!liveBroadcast;

  const handleOpenActiveAlert = () => {
    if (lastUrgentAlert) {
      setUrgentAlert(lastUrgentAlert);
    } else if (activeEmergency) {
      triggerUrgentAlert({
        id: activeEmergency.id,
        title: `EMERGENCY ALERT: ${activeEmergency.category.toUpperCase()}`,
        body: activeEmergency.description,
        priority: 'urgent',
        category: activeEmergency.category,
        isEmergency: true,
        senderName: activeEmergency.reporterName,
        senderPhone: activeEmergency.reporterPhone,
        sentAt: activeEmergency.createdAt,
        photoUrl: activeEmergency.photoUrl,
        link: 'home',
      });
    } else if (liveBroadcast) {
      triggerUrgentAlert({
        id: liveBroadcast.id || `fcm_${Date.now()}`,
        title: liveBroadcast.title,
        body: liveBroadcast.body,
        priority: liveBroadcast.priority,
        topic: liveBroadcast.topic,
        senderName: liveBroadcast.senderName,
        sentAt: liveBroadcast.sentAt,
        link: liveBroadcast.link,
      });
    }
  };

  return (
    <div className="w-full h-full overflow-hidden flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased selection:bg-amber-200 dark:selection:bg-amber-800 selection:text-amber-900 dark:selection:text-amber-100 font-sans transition-colors duration-250">
      
      {/* Devotional Splash Screen on initial session arrival */}
      {showSplash && (
        <SplashScreen
          onDismiss={handleDismissSplash}
          logoUrl={settings.logoUrl}
        />
      )}

      {/* Real-Time High-Priority Emergency Alert Banner */}
      <EmergencyBanner
        emergencies={emergencies}
        onOpenOverlay={(emergency) => {
          triggerUrgentAlert({
            id: emergency.id,
            title: `EMERGENCY ALERT: ${emergency.category.toUpperCase()}`,
            body: emergency.description,
            priority: 'urgent',
            category: emergency.category,
            isEmergency: true,
            senderName: emergency.reporterName,
            senderPhone: emergency.reporterPhone,
            sentAt: emergency.createdAt,
            photoUrl: emergency.photoUrl,
            link: 'home',
          });
        }}
      />

      {/* Top Application Bar with Network Status & Local Cache Hub */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        unreadCount={unreadNotificationsCount}
        onOpenEmergency={() => setShowEmergencyModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        logoUrl={settings.logoUrl}
        isOnline={isOnline}
        offlineSince={offlineSince}
        onCheckConnection={checkConnection}
        hasUrgentAlert={hasActiveAlert}
        onOpenUrgentAlert={handleOpenActiveAlert}
      />

      {/* Real-Time FCM Push Notification Broadcast Alert Bar */}
      {liveBroadcast && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 text-xs shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top-2 sticky top-0 z-40">
          <div
            onClick={() => {
              triggerUrgentAlert({
                id: liveBroadcast.id || `fcm_${Date.now()}`,
                title: liveBroadcast.title,
                body: liveBroadcast.body,
                priority: liveBroadcast.priority,
                topic: liveBroadcast.topic,
                senderName: liveBroadcast.senderName,
                sentAt: liveBroadcast.sentAt,
                link: liveBroadcast.link,
              });
            }}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-95"
            title="Click to view full Urgent Alert Overlay"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 text-white animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold uppercase tracking-wider text-[9px] bg-white/20 px-1.5 py-0.5 rounded">
                  FCM Push Broadcast
                </span>
                <span className="text-[11px] opacity-80 truncate">from {liveBroadcast.senderName}</span>
              </div>
              <p className="font-bold truncate text-xs sm:text-sm">{liveBroadcast.title}</p>
              <p className="text-[11px] opacity-90 truncate max-w-md">{liveBroadcast.body}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                triggerUrgentAlert({
                  id: liveBroadcast.id || `fcm_${Date.now()}`,
                  title: liveBroadcast.title,
                  body: liveBroadcast.body,
                  priority: liveBroadcast.priority,
                  topic: liveBroadcast.topic,
                  senderName: liveBroadcast.senderName,
                  sentAt: liveBroadcast.sentAt,
                  link: liveBroadcast.link,
                });
              }}
              className="px-3 py-1 rounded-lg bg-white text-red-700 hover:bg-white/90 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Alert Overlay
            </button>
            <button
              onClick={() => setLiveBroadcast(null)}
              className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
              title="Dismiss broadcast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Persistent Offline Outage Alert Banner */}
      {!isOnline && !offlineBannerDismissed && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-4 py-2.5 text-xs font-semibold shadow-xs flex items-center justify-between gap-3 animate-in fade-in sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <WifiOff className="w-4 h-4 text-amber-200 shrink-0 animate-pulse" />
            <span className="truncate">
              <strong>Device Offline:</strong> You are viewing locally cached emergency contacts, announcements, and member directories for H. Hosahalli.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => checkConnection()}
              className="px-2.5 py-1 rounded-lg bg-black/25 hover:bg-black/35 text-amber-100 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
            <button
              onClick={() => setOfflineBannerDismissed(true)}
              className="text-amber-200 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-black/20"
              title="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main View Area with Standard Overflow-Y Auto Scrollbar */}
      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain view-scroll-container max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        <ErrorBoundary
          key={currentView}
          viewName={currentView.toUpperCase()}
          showHomeButton={currentView !== 'home'}
          onNavigateHome={() => setCurrentView('home')}
        >
          {currentView === 'home' && (
            <HomeView
              settings={settings}
              members={members}
              announcements={announcements}
              emergencies={emergencies}
              polls={polls}
              issues={issues}
              onNavigate={setCurrentView}
              onOpenJoin={() => setShowJoinModal(true)}
              onOpenEmergency={() => setShowEmergencyModal(true)}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {currentView === 'members' && (
            <MembersView
              members={members}
              joinRequests={joinRequests}
              polls={polls}
              issues={issues}
              announcements={announcements}
              onNavigate={setCurrentView}
              onOpenJoin={() => setShowJoinModal(true)}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {currentView === 'chat' && (
            <ChatView
              messages={chatMessages}
              polls={polls}
              members={members}
              onOpenAuth={() => setShowAuthModal(true)}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'discussions' && (
            <DiscussionsView
              discussions={discussions}
              polls={polls}
              onOpenAuth={() => setShowAuthModal(true)}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'announcements' && (
            <AnnouncementsView
              announcements={announcements}
              onOpenAuth={() => setShowAuthModal(true)}
              onNavigate={setCurrentView}
              onOpenUrgentAlert={triggerUrgentAlert}
            />
          )}

          {currentView === 'issues' && (
            <IssuesView
              issues={issues}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          )}

          {currentView === 'profile' && (
            <ProfileView
              onOpenAuth={() => setShowAuthModal(true)}
              onOpenJoin={() => setShowJoinModal(true)}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              polls={polls}
              announcements={announcements}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'admin' && (
            <AdminDashboardView
              settings={settings}
              members={members}
              joinRequests={joinRequests}
              issues={issues}
              emergencies={emergencies}
              polls={polls}
              announcements={announcements}
              auditLogs={auditLogs}
              onOpenEmergency={() => setShowEmergencyModal(true)}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Thumb Navigation */}
      <BottomNav
        currentView={currentView}
        onNavigate={setCurrentView}
        unreadCount={unreadNotificationsCount}
      />

      {/* Modals wrapped in ErrorBoundary to prevent modal-level unmount crashes */}
      <ErrorBoundary compact viewName="Emergency Alert">
        <EmergencyModal
          isOpen={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
          onSuccess={() => setCurrentView('home')}
        />
      </ErrorBoundary>

      <ErrorBoundary compact viewName="Join Mandali">
        <JoinModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => setCurrentView('members')}
        />
      </ErrorBoundary>

      <ErrorBoundary compact viewName="Member Authentication">
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </ErrorBoundary>

      {/* Real-Time Urgent Alert Overlay for High-Priority Broadcasts & Emergencies */}
      <UrgentAlertOverlay
        alert={urgentAlert}
        onDismiss={() => setUrgentAlert(null)}
        onNavigate={(view) => {
          setCurrentView(view);
          setUrgentAlert(null);
        }}
        onCallPhone={(phone) => {
          window.location.href = `tel:${phone}`;
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary
      fullPage
      viewName="GMM Root"
      fallbackTitle="Ganesh Mitra Mandali Portal Recovery"
      fallbackDescription="An unexpected startup or rendering state occurred. Devotees and members can reload the application to restore services."
    >
      <ThemeProvider>
        <AuthProvider>
          <MandaliAppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

