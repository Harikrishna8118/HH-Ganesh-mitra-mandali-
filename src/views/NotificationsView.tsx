import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  Clock,
  ShieldAlert,
  Megaphone,
  Vote,
  UserCheck,
  AlertCircle,
  Calendar,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Shield,
  Volume2,
  Check,
  Radio,
} from 'lucide-react';
import { markNotificationAsRead } from '../services/mandaliService.ts';
import {
  getUpcoming24hItems,
  checkAndSendAutomatedReminders,
  sendManualReminder,
  requestBrowserNotificationPermission,
  Upcoming24hItem,
} from '../services/reminderService.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import type { NotificationItem, Poll, Announcement } from '../types.ts';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  polls?: Poll[];
  announcements?: Announcement[];
  onNavigate: (view: string) => void;
}

type FilterType = 'all' | 'reminder' | 'poll' | 'announcement' | 'emergency';

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications = [],
  polls = [],
  announcements = [],
  onNavigate,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [upcomingItems, setUpcomingItems] = useState<Upcoming24hItem[]>([]);
  const [testSending, setTestSending] = useState(false);

  // Check browser notification permission status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  // Compute upcoming 24h items whenever polls or announcements change
  useEffect(() => {
    const items = getUpcoming24hItems(polls, announcements);
    setUpcomingItems(items);
  }, [polls, announcements]);

  const handleMarkAllRead = async () => {
    for (const notif of notifications) {
      if (!notif.isRead) {
        await markNotificationAsRead(notif.id);
      }
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      const result = await checkAndSendAutomatedReminders(polls, announcements);
      const items = getUpcoming24hItems(polls, announcements);
      setUpcomingItems(items);

      if (result.sentCount > 0) {
        setScanMessage(`Dispatched ${result.sentCount} automated 24-hour reminder(s) to members!`);
      } else if (items.length > 0) {
        setScanMessage(`Automated check complete: All ${items.length} upcoming 24h deadline(s) already have reminders dispatched.`);
      } else {
        setScanMessage('Automated check complete: No deadlines or events occurring in the next 24 hours.');
      }
    } catch (err: any) {
      setScanMessage(err.message || 'Scan completed with issues.');
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanMessage(null), 5000);
    }
  };

  const handleRequestPermission = async () => {
    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
  };

  const handleSendTestReminder = async () => {
    setTestSending(true);
    try {
      // Find an active poll or scheduled event, or simulate a demo reminder
      const targetPoll = polls.find((p) => p.status === 'active');
      const targetEvent = announcements.find((a) => a.eventDate);

      if (targetPoll) {
        await sendManualReminder({
          id: targetPoll.id,
          type: 'poll',
          title: targetPoll.question,
          deadlineOrDate: targetPoll.deadline,
        });
        setScanMessage(`Sent 24h automated test reminder for poll: "${targetPoll.question}"`);
      } else if (targetEvent && targetEvent.eventDate) {
        await sendManualReminder({
          id: targetEvent.id,
          type: 'event',
          title: targetEvent.title,
          deadlineOrDate: targetEvent.eventDate,
          location: targetEvent.eventLocation,
        });
        setScanMessage(`Sent 24h automated test reminder for event: "${targetEvent.title}"`);
      } else {
        // Send demonstration reminder for H. Hosahalli Mandali
        const demoDeadline = new Date(Date.now() + 23 * 3600 * 1000).toISOString();
        await sendManualReminder({
          id: 'demo_event_' + Date.now(),
          type: 'event',
          title: 'Ganesh Chaturthi Mahapooja & Aarti',
          deadlineOrDate: demoDeadline,
          location: 'Ganesh Mandapa, H. Hosahalli',
        });
        setScanMessage('Sent demonstration 24-hour reminder for Ganesh Chaturthi Mahapooja & Aarti!');
      }
    } catch (err: any) {
      setScanMessage('Failed to send test reminder: ' + err.message);
    } finally {
      setTestSending(false);
      setTimeout(() => setScanMessage(null), 5000);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'reminder') return notifications.filter((n) => n.type === 'reminder');
    if (activeFilter === 'poll') return notifications.filter((n) => n.type === 'poll');
    if (activeFilter === 'announcement') return notifications.filter((n) => n.type === 'announcement');
    if (activeFilter === 'emergency') return notifications.filter((n) => n.type === 'emergency');
    return notifications;
  }, [notifications, activeFilter]);

  const reminderCount = notifications.filter((n) => n.type === 'reminder').length;
  const pollCount = notifications.filter((n) => n.type === 'poll').length;
  const announcementCount = notifications.filter((n) => n.type === 'announcement').length;
  const emergencyCount = notifications.filter((n) => n.type === 'emergency').length;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'reminder':
        return <BellRing className="w-5 h-5 text-amber-600 animate-bounce" />;
      case 'emergency':
        return <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />;
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-blue-600" />;
      case 'poll':
        return <Vote className="w-5 h-5 text-purple-600" />;
      case 'membership':
        return <UserCheck className="w-5 h-5 text-emerald-600" />;
      case 'issue':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Bell className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Notifications & Reminders
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
              <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
              24h Alerts Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated 24-hour reminders for poll deadlines and scheduled village events
          </p>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* 24-Hour Automated Reminder Engine Hub Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 border border-amber-300/80 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-6 h-6 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  24-Hour Automated Reminder System
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Automatically scans active polls and scheduled mandali events, alerting members 24h prior.
              </p>
            </div>
          </div>
        </div>

        {/* Scan Message Alert */}
        {scanMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{scanMessage}</span>
          </div>
        )}

        {/* Upcoming 24-Hour Windows List */}
        <div className="space-y-2 pt-1 border-t border-amber-200/60">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Upcoming 24-Hour Windows ({upcomingItems.length})</span>
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              Auto-checks every 60s
            </span>
          </div>

          {upcomingItems.length === 0 ? (
            <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/80 text-center">
              <p className="text-xs text-slate-600 font-medium">
                No poll deadlines or scheduled events within the next 24 hours.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                When a poll deadline or event enters the 24-hour mark, reminders will automatically fire here and in device notifications.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingItems.map((item) => (
                <div
                  key={`${item.type}_${item.id}`}
                  className="p-3 bg-white rounded-2xl border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        item.type === 'poll' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {item.type === 'poll' ? <Vote className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.type === 'poll' ? 'Poll Deadline' : 'Scheduled Event'}
                        </span>
                        {item.reminderSent ? (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> 24h Reminder Dispatched
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 animate-pulse">
                            ● Reminder Ready
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {item.type === 'poll' ? 'Voting ends' : 'Starts'} in{' '}
                        <strong className="text-red-700">
                          {item.hoursRemaining > 0 ? `${item.hoursRemaining}h ` : ''}
                          {item.minutesRemaining}m
                        </strong>{' '}
                        · {new Date(item.deadlineOrDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {item.location ? ` (${item.location})` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => onNavigate(item.type === 'poll' ? 'discussions' : 'announcements')}
                      className="px-2.5 py-1 text-xs font-bold rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 transition flex items-center gap-1"
                    >
                      <span>{item.type === 'poll' ? 'Vote' : 'View'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Engine Controls / Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/60">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunScan}
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-slate-800 border border-slate-200 text-xs font-bold transition shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-600' : 'text-slate-600'}`} />
              <span>{isScanning ? 'Scanning...' : 'Check & Send Reminders Now'}</span>
            </button>

            <button
              onClick={handleSendTestReminder}
              disabled={testSending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-2xs active:scale-95 disabled:opacity-50"
              title="Dispatches an instant 24h reminder notification for testing"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>{testSending ? 'Sending...' : 'Test 24h Reminder'}</span>
            </button>
          </div>

          {/* Browser / Device Alert Permission Button */}
          {browserPermission !== 'granted' ? (
            <button
              onClick={handleRequestPermission}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs active:scale-95"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Enable Device Alerts</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Device Notifications Enabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 chat-scroll">
        {[
          { id: 'all', label: `All (${notifications.length})` },
          { id: 'reminder', label: `⏰ 24h Reminders (${reminderCount})` },
          { id: 'poll', label: `Polls (${pollCount})` },
          { id: 'announcement', label: `Notices & Events (${announcementCount})` },
          { id: 'emergency', label: `Emergency (${emergencyCount})` },
        ].map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as FilterType)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={
            activeFilter === 'reminder'
              ? 'No 24-hour reminders yet.'
              : 'No notifications in this category.'
          }
          description={
            activeFilter === 'reminder'
              ? 'Automated 24-hour reminders will appear here whenever a community decision poll is closing or an event is taking place tomorrow.'
              : 'You are completely caught up! New announcements, decision polls, and mandali updates will appear here.'
          }
          className="my-8"
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            const isReminder = n.type === 'reminder';

            return (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) markNotificationAsRead(n.id);
                  if (n.link) onNavigate(n.link);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isReminder
                    ? n.isRead
                      ? 'bg-amber-50/20 border-amber-200 hover:border-amber-400 shadow-2xs'
                      : 'bg-gradient-to-r from-amber-50 to-orange-50/80 border-amber-400 shadow-xs ring-1 ring-amber-400/30'
                    : n.isRead
                    ? 'bg-white border-slate-200/80 shadow-2xs hover:border-slate-300'
                    : 'bg-amber-50/40 border-amber-300 shadow-xs ring-1 ring-amber-400/20'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                    isReminder
                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isReminder && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-white tracking-wider">
                          24h Reminder
                        </span>
                      )}
                      <h3
                        className={`text-xs sm:text-sm font-bold truncate ${
                          n.isRead ? 'text-slate-800' : 'text-slate-950 font-black'
                        }`}
                      >
                        {n.title}
                      </h3>
                    </div>

                    {!n.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 ring-2 ring-white" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {n.message}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-slate-400 tabular-nums">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {n.link && (
                      <span className="text-red-700 font-bold hover:underline flex items-center gap-0.5">
                        <span>Open {n.link === 'discussions' ? 'Polls' : n.link}</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
