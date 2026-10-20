import React, { useState } from 'react';
import {
  Vote,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Lock,
  Pin,
  ChevronDown,
  ChevronUp,
  User,
  Send,
  BellRing,
  Check,
  BarChart3,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  createDiscussion,
  addDiscussionReply,
  voteInPoll,
  createPoll,
  closePoll,
  sharePollResultsToChat,
} from '../services/mandaliService.ts';
import { sendManualReminder } from '../services/reminderService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { PollCharts } from '../components/PollCharts.tsx';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import { ErrorBoundary } from '../components/ErrorBoundary.tsx';
import type { DiscussionTopic, Poll, PollOption } from '../types.ts';

interface DiscussionsViewProps {
  discussions: DiscussionTopic[];
  polls: Poll[];
  onOpenAuth: () => void;
  onNavigate?: (view: string) => void;
}

const DISCUSSION_CATEGORIES = [
  'Ganesh Chaturthi Arrangements',
  'Decorations',
  'Pooja & Rituals',
  'Cultural Programs',
  'Food & Prasada',
  'Volunteers',
  'Cleaning & Seva',
  'Finance & Donations',
  'General Discussion',
];

export const DiscussionsView: React.FC<DiscussionsViewProps> = ({
  discussions = [],
  polls = [],
  onOpenAuth,
  onNavigate,
}) => {
  const { currentUser, isLoggedIn, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'polls' | 'discussions'>('polls');

  // Poll creation modal state
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollDesc, setPollDesc] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDeadline, setPollDeadline] = useState('');
  const [pollVotingLoading, setPollVotingLoading] = useState<string | null>(null);
  const [sharingPollId, setSharingPollId] = useState<string | null>(null);
  const [pollReminderSendingId, setPollReminderSendingId] = useState<string | null>(null);
  const [pollReminderFeedback, setPollReminderFeedback] = useState<string | null>(null);

  // Poll Chart Visualization state
  const [expandedChartPollIds, setExpandedChartPollIds] = useState<Record<string, boolean>>({});
  const [pollViewMode, setPollViewMode] = useState<'standard' | 'charts'>('standard');

  const togglePollChart = (pollId: string) => {
    setExpandedChartPollIds((prev) => ({
      ...prev,
      [pollId]: !prev[pollId],
    }));
  };

  const [pollToCloseId, setPollToCloseId] = useState<string | null>(null);
  const [pollSubmitError, setPollSubmitError] = useState<string | null>(null);
  const [discSubmitError, setDiscSubmitError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Handle Share Poll Results To Chat
  const handleSharePollToChat = async (poll: Poll) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setSharingPollId(poll.id);
    try {
      await sharePollResultsToChat(
        poll,
        currentUser.uid,
        currentUser.fullName,
        currentUser.role
      );
      if (onNavigate) {
        onNavigate('chat');
      }
    } catch (err: any) {
      setPollReminderFeedback('Could not share poll: ' + (err?.message || 'Check network connection'));
      setTimeout(() => setPollReminderFeedback(null), 4000);
    } finally {
      setSharingPollId(null);
    }
  };

  // Handle Send 24h Reminder for Poll
  const handleSendPollReminder = async (poll: Poll) => {
    setPollReminderSendingId(poll.id);
    try {
      await sendManualReminder({
        id: poll.id,
        type: 'poll',
        title: poll.question,
        deadlineOrDate: poll.deadline,
      });
      setPollReminderFeedback(`24h reminder notification dispatched for "${poll.question}"!`);
      setTimeout(() => setPollReminderFeedback(null), 4000);
    } catch (err: any) {
      setPollReminderFeedback('Failed to send reminder: ' + (err?.message || 'Unexpected issue'));
      setTimeout(() => setPollReminderFeedback(null), 4000);
    } finally {
      setPollReminderSendingId(null);
    }
  };

  // Discussion state
  const [showCreateDiscussion, setShowCreateDiscussion] = useState(false);
  const [discTitle, setDiscTitle] = useState('');
  const [discCategory, setDiscCategory] = useState(DISCUSSION_CATEGORIES[0]);
  const [discContent, setDiscContent] = useState('');
  const [discMediaUrl, setDiscMediaUrl] = useState('');
  const [expandedDiscussionId, setExpandedDiscussionId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Handle Poll Vote
  const handleVote = async (pollId: string, optionId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setPollVotingLoading(optionId);
    try {
      await voteInPoll(pollId, optionId, currentUser.uid);
    } catch (err: any) {
      setPollReminderFeedback('Could not register vote: ' + (err?.message || 'Check connection'));
      setTimeout(() => setPollReminderFeedback(null), 4000);
    } finally {
      setPollVotingLoading(null);
    }
  };

  // Handle Close Poll with ConfirmModal
  const handleConfirmClosePoll = async () => {
    if (!isAdmin || !pollToCloseId) return;
    try {
      await closePoll(pollToCloseId, currentUser?.uid || 'admin', currentUser?.fullName || 'Admin');
      setPollReminderFeedback('Poll finalized and voting closed.');
      setTimeout(() => setPollReminderFeedback(null), 3000);
    } catch (err: any) {
      setPollReminderFeedback('Failed to close poll: ' + (err?.message || 'Error occurred'));
      setTimeout(() => setPollReminderFeedback(null), 4000);
    } finally {
      setPollToCloseId(null);
    }
  };

  // Submit New Poll
  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const cleanOptions: PollOption[] = pollOptions
      .filter((o) => o.trim().length > 0)
      .map((text, idx) => ({ id: `opt_${Date.now()}_${idx}`, text: text.trim(), votes: 0 }));

    if (cleanOptions.length < 2) {
      setPollSubmitError('Please provide at least 2 distinct options for the poll.');
      return;
    }

    try {
      setPollSubmitError(null);
      await createPoll(
        {
          question: pollQuestion.trim(),
          description: pollDesc.trim() || undefined,
          createdBy: currentUser.uid,
          authorName: currentUser.fullName,
          status: 'active',
          deadline: pollDeadline || new Date(Date.now() + 7 * 86400000).toISOString(),
          options: cleanOptions,
        },
        currentUser.uid,
        currentUser.fullName
      );

      setShowCreatePoll(false);
      setPollQuestion('');
      setPollDesc('');
      setPollOptions(['', '']);
    } catch (err: any) {
      setPollSubmitError(err?.message || 'Failed to publish decision poll. Please try again.');
    }
  };

  // Submit New Discussion
  const handleCreateDiscussionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    try {
      setDiscSubmitError(null);
      let mType: 'image' | 'video' | undefined = undefined;
      if (discMediaUrl.trim()) {
        const u = discMediaUrl.toLowerCase();
        mType = u.match(/\.(mp4|webm|mov)$/) || u.includes('youtube') ? 'video' : 'image';
      }

      await createDiscussion({
        title: discTitle.trim(),
        category: discCategory,
        description: discContent.trim(),
        mediaUrl: discMediaUrl.trim() || undefined,
        mediaType: mType,
        authorId: currentUser.uid,
        authorName: currentUser.fullName,
        isPinned: false,
        isClosed: false,
      });

      setShowCreateDiscussion(false);
      setDiscTitle('');
      setDiscContent('');
      setDiscMediaUrl('');
    } catch (err: any) {
      setDiscSubmitError(err?.message || 'Failed to create discussion topic. Please try again.');
    }
  };

  // Submit Reply to Discussion
  const handleAddReply = async (discussionId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!replyText.trim()) return;

    try {
      setReplyError(null);
      await addDiscussionReply(
        discussionId,
        currentUser.uid,
        currentUser.fullName,
        replyText.trim()
      );
      setReplyText('');
    } catch (err: any) {
      setReplyError(err?.message || 'Unable to post reply. Please try again.');
      setTimeout(() => setReplyError(null), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* View Header with Segments */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Decisions & Mandali Discussions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Democratic village voting, topic coordination, and committee planning
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('polls')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'polls' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Vote className="w-4 h-4 text-red-600" />
            <span>Group Decisions ({polls.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('discussions')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'discussions' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-red-600" />
            <span>Topic Discussions ({discussions.length})</span>
          </button>
        </div>
      </div>

      {/* ================= POLLS & DECISIONS TAB ================= */}
      {activeTab === 'polls' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Democratic Mandali Decisions
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                  {polls.length} Poll{polls.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time voting & interactive Recharts bar and pie data visualization
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle View Mode: Standard vs Visual Charts */}
              {polls.length > 0 && (
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPollViewMode('standard')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      pollViewMode === 'standard'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Ballot View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPollViewMode('charts')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      pollViewMode === 'charts'
                        ? 'bg-white text-red-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-red-600" />
                    <span>Visual Charts</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  if (!isLoggedIn) onOpenAuth();
                  else setShowCreatePoll(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Poll</span>
              </button>
            </div>
          </div>

          {pollReminderFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{pollReminderFeedback}</span>
            </div>
          )}

          {polls.length === 0 ? (
            <EmptyState
              icon={Vote}
              title="No polls or decisions yet."
              description="The decision system is initially empty. Mandali administrators and coordinators can create a poll for meeting dates, pooja times, or decoration themes."
              actionText="Create First Decision Poll"
              onAction={() => {
                if (!isLoggedIn) onOpenAuth();
                else setShowCreatePoll(true);
              }}
              className="my-6"
            />
          ) : (
            <div className="space-y-4">
              {polls.map((poll) => {
                const isClosed = poll.status === 'closed';
                const total = poll.totalVotes || 0;
                const now = Date.now();
                const deadlineMs = poll.deadline ? new Date(poll.deadline).getTime() : 0;
                const diffMs = deadlineMs - now;
                const diffHours = diffMs / (1000 * 3600);
                const isClosingSoon = !isClosed && diffMs > 0 && diffHours <= 24;

                return (
                  <div
                    key={poll.id}
                    className={`p-5 bg-white rounded-2xl border transition-all space-y-3 ${
                      isClosingSoon
                        ? 'border-amber-400 bg-gradient-to-r from-amber-50/40 via-white to-orange-50/30 shadow-xs ring-1 ring-amber-300/50'
                        : 'border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isClosed
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isClosed ? 'Closed' : 'Active Voting'}
                          </span>

                          {isClosingSoon && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500 text-white flex items-center gap-1 animate-pulse">
                              <Clock className="w-3 h-3" />
                              Closes in {Math.max(1, Math.round(diffHours))}h · 24h Reminder Active
                            </span>
                          )}

                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500">
                            Created by <strong>{poll.authorName}</strong>
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          {poll.question}
                        </h3>
                        {poll.description && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {poll.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePollChart(poll.id)}
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
                            expandedChartPollIds[poll.id] || pollViewMode === 'charts'
                              ? 'border-purple-300 bg-purple-100 text-purple-900'
                              : 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800'
                          }`}
                          title="Toggle interactive Recharts visualization"
                        >
                          <BarChart3 className="w-3 h-3 text-purple-600" />
                          <span>{expandedChartPollIds[poll.id] || pollViewMode === 'charts' ? 'Hide Chart' : 'Chart View'}</span>
                        </button>

                        {isAdmin && !isClosed && (
                          <button
                            onClick={() => setPollToCloseId(poll.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-lg shrink-0"
                          >
                            Close Poll
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Interactive Recharts Data Visualization Component */}
                    {(pollViewMode === 'charts' || expandedChartPollIds[poll.id]) && (
                      <div className="pt-1 pb-2 animate-in fade-in">
                        <PollCharts poll={poll} />
                      </div>
                    )}

                    {/* Options list with progress bars */}
                    <div className="space-y-2 pt-1">
                      {poll.options.map((opt) => {
                        const count = opt.votes || 0;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                        return (
                          <div key={opt.id} className="relative">
                            <button
                              type="button"
                              disabled={isClosed || pollVotingLoading === opt.id}
                              onClick={() => handleVote(poll.id, opt.id)}
                              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-all relative overflow-hidden group ${
                                isClosed
                                  ? 'bg-slate-50 border-slate-200 cursor-default'
                                  : 'bg-white hover:border-red-400 border-slate-200 active:scale-[0.99]'
                              }`}
                            >
                              {/* Background percentage fill bar */}
                              <div
                                className="absolute inset-y-0 left-0 bg-amber-100/70 group-hover:bg-amber-200/60 transition-all duration-500 pointer-events-none"
                                style={{ width: `${pct}%` }}
                              />

                              <span className="relative z-10 font-semibold text-slate-800 flex items-center gap-2">
                                <span>{opt.text}</span>
                              </span>

                              <div className="relative z-10 flex items-center gap-2 font-bold tabular-nums">
                                <span className="text-amber-900">{pct}%</span>
                                <span className="text-slate-400 text-[11px]">({count} votes)</span>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer metadata & actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="tabular-nums font-medium">
                          Total Participation: <strong>{total}</strong> votes
                        </span>
                        <span className="flex items-center gap-1 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Deadline: {new Date(poll.deadline).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Toggle Recharts Button in Footer */}
                        <button
                          type="button"
                          onClick={() => togglePollChart(poll.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 shadow-2xs ${
                            expandedChartPollIds[poll.id] || pollViewMode === 'charts'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
                          }`}
                          title="Display interactive Recharts bar and pie chart"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                          <span>{expandedChartPollIds[poll.id] || pollViewMode === 'charts' ? 'Hide Chart' : 'View Recharts'}</span>
                        </button>

                        {!isClosed && (
                          <button
                            type="button"
                            onClick={() => handleSendPollReminder(poll)}
                            disabled={pollReminderSendingId === poll.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200/90 text-xs font-bold transition active:scale-95 disabled:opacity-50 shadow-2xs"
                            title="Send a 24-hour deadline reminder notification to all members"
                          >
                            <BellRing className="w-3.5 h-3.5 text-red-600" />
                            <span>{pollReminderSendingId === poll.id ? 'Sending...' : 'Send 24h Reminder'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSharePollToChat(poll)}
                          disabled={sharingPollId === poll.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-bold transition active:scale-95 disabled:opacity-50 self-start sm:self-auto shadow-2xs"
                          title="Share poll decision & results into WhatsApp-style community chat"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-red-600" />
                          <span>{sharingPollId === poll.id ? 'Sharing to Chat...' : 'Share Results to Chat'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TOPIC DISCUSSIONS TAB ================= */}
      {activeTab === 'discussions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Community Mandali Topics
            </span>
            <button
              onClick={() => {
                if (!isLoggedIn) onOpenAuth();
                else setShowCreateDiscussion(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start Discussion</span>
            </button>
          </div>

          {discussions.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No discussions started yet."
              description="No community topics have been posted yet. Start a discussion on pooja preparations, volunteer assignments, or village arrangements."
              actionText="Start First Discussion"
              onAction={() => {
                if (!isLoggedIn) onOpenAuth();
                else setShowCreateDiscussion(true);
              }}
              className="my-6"
            />
          ) : (
            <div className="space-y-3">
              {discussions.map((topic) => {
                const isExpanded = expandedDiscussionId === topic.id;

                return (
                  <div
                    key={topic.id}
                    className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">
                            {topic.category}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">
                            By <strong>{topic.authorName}</strong>
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          {topic.title}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {topic.description}
                        </p>
                        {topic.mediaUrl && (
                          <div className="mt-2.5 rounded-xl overflow-hidden">
                            {topic.mediaType === 'video' ? (
                              <video
                                src={topic.mediaUrl}
                                controls
                                playsInline
                                className="max-h-64 w-full rounded-xl bg-black"
                              />
                            ) : (
                              <img
                                src={topic.mediaUrl}
                                alt={topic.title}
                                referrerPolicy="no-referrer"
                                className="max-h-64 w-full object-cover rounded-xl border border-slate-200"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setExpandedDiscussionId(isExpanded ? null : topic.id)
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        title={isExpanded ? 'Collapse thread' : 'Expand replies'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Replies count & expand action */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <button
                        onClick={() =>
                          setExpandedDiscussionId(isExpanded ? null : topic.id)
                        }
                        className="text-red-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{topic.replyCount || 0} Replies</span>
                      </button>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {new Date(topic.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Thread Reply Input if expanded */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a response to this topic..."
                            className="flex-1 text-xs p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                          />
                          <button
                            onClick={() => handleAddReply(topic.id)}
                            className="p-2 rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE POLL MODAL */}
      {showCreatePoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5 border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Create New Decision Poll</h2>
            {pollSubmitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {pollSubmitError}
              </div>
            )}
            <form onSubmit={handleCreatePollSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Question <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. When should we organize the volunteer meeting?"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={pollDesc}
                  onChange={(e) => setPollDesc(e.target.value)}
                  placeholder="Add details for members..."
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Voting Options (Minimum 2) <span className="text-red-600">*</span>
                </label>
                <div className="space-y-2">
                  {pollOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const copy = [...pollOptions];
                        copy[idx] = e.target.value;
                        setPollOptions(copy);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                    />
                  ))}
                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      + Add another option
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Voting Deadline
                  </label>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    ⏰ 24h Reminder Enabled
                  </span>
                </div>

                <input
                  type="date"
                  value={pollDeadline}
                  onChange={(e) => setPollDeadline(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-medium">Quick presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 24 * 3600 * 1000);
                      setPollDeadline(d.toISOString().slice(0, 10));
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition"
                  >
                    24 Hours (Demo Alert)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 3 * 86400 * 1000);
                      setPollDeadline(d.toISOString().slice(0, 10));
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                  >
                    3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 7 * 86400 * 1000);
                      setPollDeadline(d.toISOString().slice(0, 10));
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                  >
                    7 Days
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 mt-1.5">
                  Members receive an automated notification alert 24 hours prior to the voting deadline.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePoll(false)}
                  className="w-1/2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                >
                  Publish Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DISCUSSION MODAL */}
      {showCreateDiscussion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5 border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Start Committee Discussion</h2>
            {discSubmitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {discSubmitError}
              </div>
            )}
            <form onSubmit={handleCreateDiscussionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Topic Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={discTitle}
                  onChange={(e) => setDiscTitle(e.target.value)}
                  placeholder="e.g. Mandapa lighting and sound arrangement plan"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={discCategory}
                  onChange={(e) => setDiscCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  {DISCUSSION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Points for Discussion <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={discContent}
                  onChange={(e) => setDiscContent(e.target.value)}
                  placeholder="Explain what the committee needs to discuss or organize..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attach Photo / Video URL (Optional)
                </label>
                <input
                  type="url"
                  value={discMediaUrl}
                  onChange={(e) => setDiscMediaUrl(e.target.value)}
                  placeholder="https://example.com/festival-photo.jpg or video link"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 font-mono"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDiscussion(false)}
                  className="w-1/2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                >
                  Start Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Close Poll Modal */}
      <ConfirmModal
        isOpen={!!pollToCloseId}
        title="Finalize Decision Poll"
        message="Are you sure you want to finalize this decision poll? Once closed, further voting will be locked and results will be permanently archived."
        confirmLabel="Finalize & Lock"
        cancelLabel="Keep Open"
        isDestructive={false}
        onConfirm={handleConfirmClosePoll}
        onCancel={() => setPollToCloseId(null)}
      />
    </div>
  );
};
