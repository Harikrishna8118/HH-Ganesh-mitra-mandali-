import React from 'react';
import { GaneshLogo } from '../components/GaneshLogo.tsx';
import { MemberActivity } from '../components/MemberActivity.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import type {
  AppSettings,
  MemberProfile,
  Announcement,
  EmergencyReport,
  Poll,
  IssueReport,
} from '../types.ts';
import {
  Users,
  MessageSquare,
  Megaphone,
  AlertCircle,
  ShieldAlert,
  UserPlus,
  Calendar,
  Sparkles,
  ChevronRight,
  Vote,
  Activity,
  BellRing,
} from 'lucide-react';
import { getUpcoming24hItems } from '../services/reminderService.ts';

interface HomeViewProps {
  settings: AppSettings;
  members: MemberProfile[];
  announcements: Announcement[];
  emergencies: EmergencyReport[];
  polls?: Poll[];
  issues?: IssueReport[];
  onNavigate: (view: string) => void;
  onOpenJoin: () => void;
  onOpenEmergency: () => void;
  onOpenAuth: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  settings,
  members = [],
  announcements = [],
  emergencies = [],
  polls = [],
  issues = [],
  onNavigate,
  onOpenJoin,
  onOpenEmergency,
  onOpenAuth,
}) => {
  const { isLoggedIn, isMember, currentUser } = useAuth();

  const safeMembers = members || [];
  const safeAnnouncements = announcements || [];
  const safeEmergencies = emergencies || [];
  const safePolls = polls || [];
  const safeIssues = issues || [];

  const approvedMemberCount = safeMembers.length;
  const latestAnnouncement = safeAnnouncements[0] || null;
  const upcoming24h = React.useMemo(() => getUpcoming24hItems(safePolls, safeAnnouncements), [safePolls, safeAnnouncements]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Hero Mandali Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-700 via-red-800 to-amber-900 text-white p-6 sm:p-8 shadow-xl border border-red-600/50">
        <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none">
          <GaneshLogo size="xl" customUrl={settings.logoUrl} className="w-56 h-56" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="shrink-0 p-1.5 bg-white/10 backdrop-blur-md rounded-full ring-2 ring-amber-400/60 shadow-lg">
            <GaneshLogo size="xl" customUrl={settings.logoUrl} />
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Village Community Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {settings.mandaliName}
            </h1>
            <p className="text-sm font-semibold tracking-wide text-amber-200/90 uppercase">
              {settings.villageName}
            </p>
            <p className="text-xs text-amber-100/80 max-w-xl pt-1 leading-relaxed">
              {settings.bannerText || 'Official digital portal for Ganesh Chaturthi celebrations, village decisions, and mutual support.'}
            </p>
          </div>
        </div>

        {/* Real Dynamic Counters */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-red-600/40">
          <div className="p-3 bg-black/20 rounded-2xl backdrop-blur-xs border border-white/10">
            <div className="text-[11px] font-medium text-amber-200/90">Approved Members</div>
            <div className="text-2xl font-black tracking-tight text-white mt-0.5 tabular-nums">
              {approvedMemberCount}
            </div>
          </div>
          <div className="p-3 bg-black/20 rounded-2xl backdrop-blur-xs border border-white/10">
            <div className="text-[11px] font-medium text-amber-200/90">Official Notices</div>
            <div className="text-2xl font-black tracking-tight text-white mt-0.5 tabular-nums">
              {announcements.length}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3 bg-black/20 rounded-2xl backdrop-blur-xs border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-amber-200/90">Your Status</div>
              <div className="text-xs font-bold text-white mt-0.5 uppercase tracking-wide">
                {currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'member' ? 'Approved Member' : 'Public Visitor'}
              </div>
            </div>
            {!isLoggedIn && (
              <button
                onClick={onOpenAuth}
                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold transition shadow-xs"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 24-Hour Urgent Reminder Notification Alert Banner */}
      {upcoming24h.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/15 border-2 border-amber-400 shadow-sm animate-in fade-in space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-950 flex items-center gap-1.5">
                  <span>24-Hour Reminders & Approaching Deadlines</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">
                    {upcoming24h.length} Urgent
                  </span>
                </h3>
                <p className="text-xs text-slate-600">
                  Automated reminders have been dispatched to all members for items occurring within 24 hours.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('notifications')}
              className="text-xs font-bold text-red-700 hover:text-red-800 hover:underline flex items-center gap-0.5 shrink-0"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {upcoming24h.slice(0, 2).map((item) => (
              <div
                key={`${item.type}_${item.id}`}
                onClick={() => onNavigate(item.type === 'poll' ? 'discussions' : 'announcements')}
                className="p-3 bg-white rounded-2xl border border-amber-200 shadow-2xs hover:border-amber-400 transition cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800 uppercase">
                    <span>{item.type === 'poll' ? '📊 Poll Deadline' : '📅 Village Event'}</span>
                    <span>·</span>
                    <span className="text-red-700 font-extrabold">
                      {item.hoursRemaining > 0 ? `${item.hoursRemaining}h ` : ''}
                      {item.minutesRemaining}m remaining
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                    {item.title}
                  </h4>
                </div>

                <button
                  type="button"
                  className="px-2.5 py-1 text-xs font-bold rounded-xl bg-amber-100 text-amber-950 shrink-0"
                >
                  {item.type === 'poll' ? 'Vote' : 'View'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Quick Actions Grid */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800 tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          
          {/* JOIN MANDALI */}
          <button
            onClick={onOpenJoin}
            className="flex flex-col items-start p-4 bg-white hover:bg-red-50/50 rounded-2xl border border-slate-200/90 shadow-xs hover:border-red-300 transition text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <UserPlus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-red-700 transition-colors">
              JOIN MANDALI
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">Apply for membership</span>
          </button>

          {/* MEMBERS */}
          <button
            onClick={() => onNavigate('members')}
            className="flex flex-col items-start p-4 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 transition text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
              MEMBERS
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">Approved village roster</span>
          </button>

          {/* CHAT */}
          <button
            onClick={() => onNavigate('chat')}
            className="flex flex-col items-start p-4 bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 transition text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              CHAT
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">Real-time mandali group</span>
          </button>

          {/* ANNOUNCEMENTS */}
          <button
            onClick={() => onNavigate('announcements')}
            className="flex flex-col items-start p-4 bg-white hover:bg-blue-50/50 rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Megaphone className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
              ANNOUNCEMENTS
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">Pooja & event schedules</span>
          </button>

          {/* REPORT ISSUE */}
          <button
            onClick={() => onNavigate('issues')}
            className="flex flex-col items-start p-4 bg-white hover:bg-orange-50/50 rounded-2xl border border-slate-200/90 shadow-xs hover:border-orange-300 transition text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-orange-700 transition-colors">
              REPORT ISSUE
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">Electricity, sound, water</span>
          </button>

          {/* EMERGENCY */}
          <button
            onClick={onOpenEmergency}
            className="flex flex-col items-start p-4 bg-gradient-to-br from-red-50 to-red-100/60 hover:from-red-100 hover:to-red-200/80 rounded-2xl border border-red-300 shadow-xs transition text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform shadow-xs">
              <ShieldAlert className="w-5 h-5 animate-pulse stroke-[2.2]" />
            </div>
            <span className="text-xs font-black text-red-700">
              EMERGENCY
            </span>
            <span className="text-[11px] text-red-600/90 mt-0.5 font-medium">Instant village alert</span>
          </button>
        </div>
      </div>

      {/* Latest Announcement Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-red-600" />
            Latest Mandali Announcement
          </h2>
          <button
            onClick={() => onNavigate('announcements')}
            className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {latestAnnouncement ? (
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 transition space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-red-700">{latestAnnouncement.category}</span>
              <span className="tabular-nums">
                {new Date(latestAnnouncement.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {latestAnnouncement.title}
            </h3>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {latestAnnouncement.content}
            </p>
            <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
              <span>Author: <strong>{latestAnnouncement.authorName}</strong></span>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
            <p className="text-xs font-medium text-slate-700">No announcements posted yet.</p>
            <p className="text-[11px] text-slate-400">
              Mandali administrators will publish pooja schedules and meeting notices here.
            </p>
          </div>
        )}
      </div>

      {/* Live Member Activity & Community Pulse Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-red-600" />
            <span>Community Pulse & Member Activity</span>
          </h2>
          <button
            onClick={() => onNavigate('members')}
            className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <MemberActivity
          members={members}
          polls={polls}
          issues={issues}
          announcements={announcements}
          emergencies={emergencies}
          onNavigate={onNavigate}
          onSharePollToChat={() => onNavigate('chat')}
          compact={true}
        />
      </div>

      {/* Upcoming Activities / Festival Schedule card */}
      <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50/60 rounded-2xl border border-amber-200/80 shadow-xs flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
            Ganesh Chaturthi Preparations — H. Hosahalli
          </h3>
          <p className="text-xs text-amber-900/80 leading-relaxed">
            All devotees and village volunteers are welcome to participate in mandapa decoration, prasada seva, cultural rehearsals, and pooja arrangements.
          </p>
          <div className="pt-1">
            <button
              onClick={() => onNavigate('discussions')}
              className="text-xs font-bold text-red-700 hover:text-red-800 hover:underline flex items-center gap-1"
            >
              Participate in Committee Discussions <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
