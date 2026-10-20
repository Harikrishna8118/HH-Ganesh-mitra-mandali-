import React, { useState, useMemo } from 'react';
import {
  Megaphone,
  Pin,
  Plus,
  Clock,
  User,
  Trash2,
  Calendar,
  MapPin,
  BellRing,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { createAnnouncement, deleteAnnouncement } from '../services/mandaliService.ts';
import { sendManualReminder } from '../services/reminderService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import type { Announcement } from '../types.ts';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  onOpenAuth: () => void;
  onNavigate?: (view: string) => void;
}

const CATEGORIES = [
  'Meeting Announcement',
  'Pooja Schedule',
  'Festival Timings',
  'Volunteer Requirement',
  'Cultural Program',
  'Prasada Information',
  'General Notice',
];

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  announcements = [],
  onOpenAuth,
}) => {
  const { currentUser, isLoggedIn } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'pinned'>('all');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isScheduledEvent, setIsScheduledEvent] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('Ganesh Mandapa, H. Hosahalli');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reminderSendingId, setReminderSendingId] = useState<string | null>(null);
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [announcementToDeleteId, setAnnouncementToDeleteId] = useState<string | null>(null);

  const handleOpenPublish = () => {
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    // Set default event date to tomorrow same time if scheduling event
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    tomorrow.setMinutes(0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    setEventDate(localISOTime);
    setPublishError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    setPublishError(null);
    try {
      await createAnnouncement(
        {
          title: title.trim(),
          category,
          content: content.trim(),
          authorId: currentUser.uid,
          authorName: currentUser.fullName || 'Mandali Member',
          isPinned,
          isEvent: isScheduledEvent,
          eventDate: isScheduledEvent && eventDate ? new Date(eventDate).toISOString() : undefined,
          eventLocation: isScheduledEvent ? eventLocation.trim() || 'Ganesh Mandapa, H. Hosahalli' : undefined,
        },
        currentUser.uid,
        currentUser.fullName || 'Mandali Member'
      );
      setShowModal(false);
      setTitle('');
      setContent('');
      setIsPinned(false);
      setIsScheduledEvent(false);
    } catch (err: any) {
      setPublishError(err?.message || 'Failed to publish announcement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setAnnouncementToDeleteId(id);
  };

  const confirmDeleteAnnouncement = async () => {
    if (!currentUser || !announcementToDeleteId) return;
    try {
      await deleteAnnouncement(
        announcementToDeleteId,
        currentUser.uid,
        currentUser.fullName || 'Mandali Member'
      );
      setReminderFeedback('Announcement deleted successfully.');
      setTimeout(() => setReminderFeedback(null), 3000);
    } catch (err: any) {
      setReminderFeedback('Could not delete announcement: ' + (err?.message || 'Check connection'));
      setTimeout(() => setReminderFeedback(null), 4000);
    } finally {
      setAnnouncementToDeleteId(null);
    }
  };

  const handleTrigger24hReminder = async (item: Announcement) => {
    if (!item.eventDate) return;
    setReminderSendingId(item.id);
    try {
      await sendManualReminder({
        id: item.id,
        type: 'event',
        title: item.title,
        deadlineOrDate: item.eventDate,
        location: item.eventLocation,
      });
      setReminderFeedback(`24-hour reminder dispatched for "${item.title}"!`);
      setTimeout(() => setReminderFeedback(null), 4000);
    } catch (err: any) {
      setReminderFeedback('Failed to send reminder: ' + err.message);
      setTimeout(() => setReminderFeedback(null), 4000);
    } finally {
      setReminderSendingId(null);
    }
  };

  const filteredAnnouncements = useMemo(() => {
    if (activeTab === 'events') {
      return announcements.filter((a) => !!a.eventDate);
    }
    if (activeTab === 'pinned') {
      return announcements.filter((a) => a.isPinned);
    }
    return announcements;
  }, [announcements, activeTab]);

  const scheduledEventsCount = announcements.filter((a) => !!a.eventDate).length;
  const pinnedCount = announcements.filter((a) => a.isPinned).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Community Notices & Events
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-bold">
              Village Board
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pooja schedules, scheduled community events, volunteer calls, and 24h reminders (all members can publish)
          </p>
        </div>

        <button
          onClick={handleOpenPublish}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Publish Notice or Event</span>
        </button>
      </div>

      {/* Reminder Feedback banner */}
      {reminderFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{reminderFeedback}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          All Notices ({announcements.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'events'
              ? 'bg-red-700 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Scheduled Events ({scheduledEventsCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('pinned')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'pinned'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>Pinned ({pinnedCount})</span>
        </button>
      </div>

      {filteredAnnouncements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={activeTab === 'events' ? 'No scheduled community events yet.' : 'No announcements published yet.'}
          description={
            activeTab === 'events'
              ? 'Schedule pooja times, volunteer gatherings, or cultural programs with automated 24-hour reminders.'
              : 'Mandali members can post pooja schedules, meeting minutes, and volunteer alerts for H. Hosahalli.'
          }
          actionText="Publish First Notice or Event"
          onAction={handleOpenPublish}
          className="my-6"
        />
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((item) => {
            const hasEvent = !!item.eventDate;
            const now = Date.now();
            const eventTime = hasEvent ? new Date(item.eventDate!).getTime() : 0;
            const diffHours = (eventTime - now) / (1000 * 3600);
            const isWithin24h = diffHours > 0 && diffHours <= 24;
            const isPast = eventTime > 0 && eventTime < now;

            return (
              <div
                key={item.id}
                className={`p-5 bg-white rounded-2xl border transition-all ${
                  hasEvent
                    ? isWithin24h
                      ? 'border-amber-400 bg-gradient-to-r from-amber-50/50 via-white to-orange-50/40 shadow-xs ring-1 ring-amber-300'
                      : 'border-blue-200/90 shadow-2xs'
                    : item.isPinned
                    ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                    : 'border-slate-200/90 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.isPinned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          <Pin className="w-3 h-3 text-amber-700" />
                          Pinned Notice
                        </span>
                      )}

                      {hasEvent && (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          Community Event
                        </span>
                      )}

                      {isWithin24h && (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500 text-white animate-pulse">
                          <Clock className="w-3 h-3" />
                          Tomorrow · 24h Reminder Active
                        </span>
                      )}

                      <span className="text-xs font-bold text-red-700">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {item.title}
                    </h3>
                  </div>

                  {isLoggedIn && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Scheduled Event Badge Card */}
                {hasEvent && (
                  <div className="mt-3.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>
                            {new Date(item.eventDate!).toLocaleDateString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(item.eventDate!).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isPast && (
                            <span className="text-[10px] text-slate-500 font-normal">
                              (Event Concluded)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{item.eventLocation || 'Ganesh Mandapa, H. Hosahalli'}</span>
                        </div>
                      </div>
                    </div>

                    {!isPast && (
                      <button
                        onClick={() => handleTrigger24hReminder(item)}
                        disabled={reminderSendingId === item.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 transition shadow-2xs self-start sm:self-auto disabled:opacity-50"
                        title="Dispatch an automated reminder notification to all members now"
                      >
                        <BellRing className="w-3 h-3 text-blue-600" />
                        <span>
                          {reminderSendingId === item.id ? 'Sending...' : 'Send 24h Reminder'}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                <p className="mt-3 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {item.content}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <User className="w-3 h-3 text-slate-400" />
                    Published by <strong>{item.authorName}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE ANNOUNCEMENT / EVENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-5 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {isScheduledEvent ? 'Schedule Community Event' : 'Publish Mandali Notice'}
              </h2>
              <span className="text-[11px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-semibold">
                Member Action
              </span>
            </div>

            {publishError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {publishError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mahapooja Timings & Prasada Distribution"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle Scheduled Event */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="scheduleEvent"
                    checked={isScheduledEvent}
                    onChange={(e) => setIsScheduledEvent(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-slate-300"
                  />
                  <label htmlFor="scheduleEvent" className="text-xs text-slate-800 font-bold cursor-pointer flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>Schedule as Community Event (24h Automated Reminder)</span>
                  </label>
                </div>

                {isScheduledEvent && (
                  <div className="space-y-2 pt-2 border-t border-amber-200/60">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Event Date & Time <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required={isScheduledEvent}
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Location in Village
                      </label>
                      <input
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="e.g. Ganesh Mandapa, Main Temple Street, H. Hosahalli"
                        className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>

                    <p className="text-[10px] text-amber-800 leading-tight">
                      ⏰ Automated reminder notification will be dispatched to all members 24 hours before this scheduled event starts.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Details & Content <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide complete details, timings, volunteers needed, location in H. Hosahalli..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinNotice"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-slate-300"
                />
                <label htmlFor="pinNotice" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Pin this notice to the top of announcements
                </label>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : isScheduledEvent ? 'Schedule Event' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable ConfirmModal for Announcement Deletion */}
      <ConfirmModal
        isOpen={!!announcementToDeleteId}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement for everyone in the mandali? This action cannot be undone."
        confirmLabel="Delete Notice"
        cancelLabel="Keep Notice"
        isDestructive={true}
        onConfirm={confirmDeleteAnnouncement}
        onCancel={() => setAnnouncementToDeleteId(null)}
      />
    </div>
  );
};
