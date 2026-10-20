import React, { useState, useMemo } from 'react';
import {
  Users,
  Vote,
  CheckCircle2,
  Megaphone,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  Heart,
  ThumbsUp,
  MessageSquare,
  Search,
  Filter,
  Share2,
  Calendar,
  AlertCircle,
  QrCode,
  TrendingUp,
} from 'lucide-react';
import type {
  MemberProfile,
  Poll,
  IssueReport,
  Announcement,
  EmergencyReport,
  MemberActivityItem,
  ActivityType,
} from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface MemberActivityProps {
  members: MemberProfile[];
  polls: Poll[];
  issues: IssueReport[];
  announcements: Announcement[];
  emergencies?: EmergencyReport[];
  onNavigate?: (view: string) => void;
  onOpenMemberQR?: (member: MemberProfile) => void;
  onSharePollToChat?: (poll: Poll) => void;
  compact?: boolean;
}

export const MemberActivity: React.FC<MemberActivityProps> = ({
  members = [],
  polls = [],
  issues = [],
  announcements = [],
  emergencies = [],
  onNavigate,
  onOpenMemberQR,
  onSharePollToChat,
  compact = false,
}) => {
  const { currentUser } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<'all' | ActivityType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local reactive cheers / applause social counters stored per item ID
  const [reactions, setReactions] = useState<Record<string, { namaste: number; clap: number; heart: number; userLiked?: string }>>(() => {
    try {
      const saved = localStorage.getItem('gmm_activity_reactions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleReaction = (activityId: string, type: 'namaste' | 'clap' | 'heart') => {
    setReactions((prev) => {
      const current = prev[activityId] || { namaste: 0, clap: 0, heart: 0 };
      const alreadyClicked = current.userLiked === type;
      const updated = {
        ...current,
        [type]: alreadyClicked ? Math.max(0, current[type] - 1) : current[type] + 1,
        userLiked: alreadyClicked ? undefined : type,
      };
      const next = { ...prev, [activityId]: updated };
      try {
        localStorage.setItem('gmm_activity_reactions', JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Build Unified Timeline of Recent Community Activities
  const activities: MemberActivityItem[] = useMemo(() => {
    const items: MemberActivityItem[] = [];

    // 1. Members Joined (Approved)
    members.forEach((m) => {
      items.push({
        id: `member_${m.id}`,
        type: 'member_joined',
        title: `${m.fullName} joined the Mandali`,
        description: m.villageAddress
          ? `Resident of ${m.villageAddress} is now an active verified village member.`
          : 'Joined as an approved member of the village community.',
        timestamp: m.joinedAt || new Date().toISOString(),
        actorName: m.fullName,
        actorAvatar: m.avatarUrl,
        targetId: m.id,
        badge: m.role === 'admin' ? 'Administrator' : 'Verified Member',
        meta: {
          category: 'Membership',
        },
      });
    });

    // 2. Polls Created & Completed
    polls.forEach((p) => {
      const total = p.totalVotes || 0;
      const sorted = [...(p.options || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
      const winner = sorted[0];
      const isClosed = p.status === 'closed';

      items.push({
        id: `poll_${p.id}`,
        type: isClosed ? 'poll_closed' : total > 0 ? 'poll_vote' : 'poll_created',
        title: isClosed
          ? `Decision Finalized: "${p.question}"`
          : total > 5
          ? `High Voter Engagement: "${p.question}"`
          : `Decision Poll: "${p.question}"`,
        description: isClosed && winner
          ? `Poll closed with ${total} votes. Selected choice: "${winner.text}" (${total > 0 ? Math.round(((winner.votes || 0) / total) * 100) : 0}% of votes).`
          : total > 0 && winner
          ? `${total} members have cast their votes. Currently leading: "${winner.text}".`
          : p.description || 'Community voting poll opened for mandali decisions.',
        timestamp: p.createdAt || new Date().toISOString(),
        actorName: p.authorName,
        targetId: p.id,
        badge: isClosed ? 'Poll Closed' : `${total} Votes Cast`,
        meta: {
          votes: total,
          winner: winner?.text,
          category: 'Community Poll',
        },
      });
    });

    // 3. Issue Reports Resolved
    issues
      .filter((i) => i.status === 'resolved')
      .forEach((i) => {
        items.push({
          id: `issue_res_${i.id}`,
          type: 'issue_resolved',
          title: `Issue Resolved: "${i.title}"`,
          description: i.adminResponse
            ? `Committee Action: ${i.adminResponse}`
            : `Issue in ${i.category} category was inspected and resolved for the community.`,
          timestamp: i.updatedAt || i.createdAt || new Date().toISOString(),
          actorName: i.reporterName,
          targetId: i.id,
          badge: i.category,
          meta: {
            category: i.category,
            resolutionNote: i.adminResponse,
          },
        });
      });

    // 4. Official Announcements
    announcements.forEach((a) => {
      items.push({
        id: `ann_${a.id}`,
        type: 'announcement',
        title: a.title,
        description: a.content.length > 130 ? `${a.content.substring(0, 130)}...` : a.content,
        timestamp: a.createdAt || new Date().toISOString(),
        actorName: a.authorName,
        targetId: a.id,
        badge: a.category,
        meta: {
          category: a.category,
        },
      });
    });

    // Sort descending by timestamp
    return items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [members, polls, issues, announcements]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Type filter
      if (selectedFilter !== 'all') {
        if (selectedFilter === 'poll_vote' || selectedFilter === 'poll_created' || selectedFilter === 'poll_closed') {
          if (!act.type.startsWith('poll_')) return false;
        } else if (act.type !== selectedFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          act.title.toLowerCase().includes(q) ||
          act.description.toLowerCase().includes(q) ||
          act.actorName.toLowerCase().includes(q) ||
          (act.badge && act.badge.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [activities, selectedFilter, searchQuery]);

  // Relative Time Formatter
  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDays = Math.floor(diffHour / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  // Icon & Style mapping for activity types
  const getActivityMeta = (type: ActivityType) => {
    switch (type) {
      case 'member_joined':
        return {
          icon: Users,
          iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
          dotBg: 'bg-purple-500',
          typeLabel: 'New Member',
        };
      case 'poll_created':
      case 'poll_vote':
      case 'poll_closed':
        return {
          icon: Vote,
          iconBg: 'bg-amber-100 text-amber-800 border-amber-200',
          dotBg: 'bg-amber-500',
          typeLabel: 'Decision & Poll',
        };
      case 'issue_resolved':
        return {
          icon: CheckCircle2,
          iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          dotBg: 'bg-emerald-500',
          typeLabel: 'Resolved Issue',
        };
      case 'announcement':
        return {
          icon: Megaphone,
          iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
          dotBg: 'bg-blue-500',
          typeLabel: 'Notice',
        };
      default:
        return {
          icon: Sparkles,
          iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
          dotBg: 'bg-slate-500',
          typeLabel: 'Activity',
        };
    }
  };

  const displayedList = compact ? filteredActivities.slice(0, 5) : filteredActivities;

  return (
    <div className="space-y-4">
      {/* Header / Community Vitality Bar */}
      <div className="bg-gradient-to-r from-red-800 via-amber-900 to-red-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-red-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Real-Time Community Pulse</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Member Activity Timeline</span>
            </h2>
            <p className="text-xs text-amber-100/80">
              Live updates on poll decisions, resolved reports, and new devotees joining our mandali.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="px-3 py-1.5 bg-black/30 backdrop-blur-xs rounded-xl border border-white/10 text-center">
              <span className="block text-[10px] text-amber-200 uppercase font-bold">Approved</span>
              <span className="text-sm font-black text-white tabular-nums">{members.length}</span>
            </div>
            <div className="px-3 py-1.5 bg-black/30 backdrop-blur-xs rounded-xl border border-white/10 text-center">
              <span className="block text-[10px] text-amber-200 uppercase font-bold">Decisions</span>
              <span className="text-sm font-black text-white tabular-nums">{polls.length}</span>
            </div>
            <div className="px-3 py-1.5 bg-black/30 backdrop-blur-xs rounded-xl border border-white/10 text-center">
              <span className="block text-[10px] text-emerald-300 uppercase font-bold">Solved</span>
              <span className="text-sm font-black text-emerald-300 tabular-nums">
                {issues.filter((i) => i.status === 'resolved').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      {!compact && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Scrollable Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-semibold">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
                selectedFilter === 'all'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Activities ({activities.length})
            </button>
            <button
              onClick={() => setSelectedFilter('poll_vote')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                selectedFilter === 'poll_vote'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Polls & Decisions ({polls.length})</span>
            </button>
            <button
              onClick={() => setSelectedFilter('issue_resolved')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                selectedFilter === 'issue_resolved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Issues Solved ({issues.filter((i) => i.status === 'resolved').length})</span>
            </button>
            <button
              onClick={() => setSelectedFilter('member_joined')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                selectedFilter === 'member_joined'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>New Members ({members.length})</span>
            </button>
            <button
              onClick={() => setSelectedFilter('announcement')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                selectedFilter === 'announcement'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Notices ({announcements.length})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative shrink-0 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions or members..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>
      )}

      {/* Timeline List */}
      {displayedList.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-amber-500 mx-auto opacity-70" />
          <h3 className="text-sm font-bold text-slate-700">No community activity found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try modifying your search query or clear the filter.'
              : 'As members join, cast votes in polls, and report community issues, actions will appear here.'}
          </p>
        </div>
      ) : (
        <div className="relative pl-4 sm:pl-6 space-y-4 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {displayedList.map((item) => {
            const meta = getActivityMeta(item.type);
            const IconComponent = meta.icon;
            const itemReactions = reactions[item.id] || { namaste: 0, clap: 0, heart: 0 };

            // Find corresponding objects for quick actions
            const relatedPoll = item.type.startsWith('poll_')
              ? polls.find((p) => p.id === item.targetId)
              : undefined;
            const relatedMember = item.type === 'member_joined'
              ? members.find((m) => m.id === item.targetId)
              : undefined;

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-3 w-8 h-8 rounded-full border-2 border-white shadow-xs flex items-center justify-center shrink-0 ${meta.iconBg} ring-2 ring-white`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                {/* Card Container */}
                <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-amber-300 p-4 sm:p-5 shadow-2xs hover:shadow-sm transition-all space-y-3">
                  {/* Top Bar: Actor & Timestamp */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.actorAvatar ? (
                        <img
                          src={item.actorAvatar}
                          alt={item.actorName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-amber-600 text-white font-bold text-[11px] flex items-center justify-center">
                          {item.actorName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{item.actorName}</span>
                          {item.badge && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(item.timestamp)}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500 font-medium">{meta.typeLabel}</span>
                        </span>
                      </div>
                    </div>

                    {/* Quick navigation action */}
                    {item.type.startsWith('poll_') && onNavigate && (
                      <button
                        onClick={() => onNavigate('discussions')}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shrink-0"
                      >
                        <span>View Poll</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {item.type === 'member_joined' && relatedMember && onOpenMemberQR && (
                      <button
                        onClick={() => onOpenMemberQR(relatedMember)}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shrink-0"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Event Pass</span>
                      </button>
                    )}

                    {item.type === 'issue_resolved' && onNavigate && (
                      <button
                        onClick={() => onNavigate('issues')}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shrink-0"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Activity Narrative Content */}
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.description}
                    </p>

                    {/* If this is a poll with results or winner, display interactive progress snapshot */}
                    {relatedPoll && (
                      <div className="mt-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                            <span>Voting Summary</span>
                          </span>
                          <span className="text-amber-800 font-semibold tabular-nums">
                            {relatedPoll.totalVotes || 0} votes recorded
                          </span>
                        </div>

                        {/* Top 2 choices snapshot */}
                        <div className="space-y-1.5">
                          {relatedPoll.options.slice(0, 2).map((opt) => {
                            const total = relatedPoll.totalVotes || 0;
                            const count = opt.votes || 0;
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={opt.id} className="space-y-0.5">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                                  <span>{opt.text}</span>
                                  <span className="tabular-nums text-amber-900">{pct}% ({count})</span>
                                </div>
                                <div className="h-1.5 w-full bg-amber-200/60 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-600 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Share Poll to Chat Action */}
                        {onSharePollToChat && (
                          <div className="pt-1 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => onSharePollToChat(relatedPoll)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 hover:text-red-800 hover:underline cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Discuss results in Chat</span>
                            </button>
                            <span className="text-[10px] text-amber-700 font-medium">
                              {relatedPoll.status === 'closed' ? 'Final Decision' : 'Active Poll'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Social Engagement Reaction Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleReaction(item.id, 'namaste')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition active:scale-95 ${
                          itemReactions.userLiked === 'namaste'
                            ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                        title="Jai Ganesha / Namaste"
                      >
                        <span>🙏</span>
                        <span className="text-[11px] tabular-nums">
                          {itemReactions.namaste > 0 ? itemReactions.namaste : 'Namaste'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReaction(item.id, 'clap')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition active:scale-95 ${
                          itemReactions.userLiked === 'clap'
                            ? 'bg-red-100 text-red-900 font-bold border border-red-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                        title="Applaud / Bravo"
                      >
                        <span>👏</span>
                        <span className="text-[11px] tabular-nums">
                          {itemReactions.clap > 0 ? itemReactions.clap : 'Approve'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReaction(item.id, 'heart')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition active:scale-95 ${
                          itemReactions.userLiked === 'heart'
                            ? 'bg-pink-100 text-pink-900 font-bold border border-pink-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                        title="Love / Seva"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            itemReactions.userLiked === 'heart'
                              ? 'fill-pink-600 text-pink-600'
                              : 'text-slate-400'
                          }`}
                        />
                        {itemReactions.heart > 0 && (
                          <span className="text-[11px] tabular-nums font-semibold">
                            {itemReactions.heart}
                          </span>
                        )}
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      Community action
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View All Button when compact */}
      {compact && activities.length > 5 && onNavigate && (
        <div className="text-center pt-2">
          <button
            onClick={() => onNavigate('members')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-xl transition"
          >
            <span>View Complete Member Activity Timeline ({activities.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
