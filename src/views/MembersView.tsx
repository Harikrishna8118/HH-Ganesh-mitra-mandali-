import React, { useState, useMemo } from 'react';
import {
  Search,
  UserCheck,
  Shield,
  Phone,
  Calendar,
  MapPin,
  UserPlus,
  UserMinus,
  Edit3,
  Check,
  X,
  Clock,
  LogIn,
  AlertCircle,
  QrCode,
  Scan,
  Sparkles,
  Activity,
  Heart,
  LayoutGrid,
  List,
  Eye,
  CheckCircle2,
  Info,
  Download,
  Printer,
  ArrowUpDown,
  Tag,
} from 'lucide-react';
import { approveJoinRequest, rejectJoinRequest } from '../services/mandaliService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { MemberQRModal } from '../components/MemberQRModal.tsx';
import { MemberQRThumbnail } from '../components/MemberQRThumbnail.tsx';
import { EventQRVerifierModal } from '../components/EventQRVerifierModal.tsx';
import { MemberActivity } from '../components/MemberActivity.tsx';
import { ExitMandaliModal } from '../components/ExitMandaliModal.tsx';
import { EditMemberProfileModal } from '../components/EditMemberProfileModal.tsx';
import { MemberDetailModal } from '../components/MemberDetailModal.tsx';
import type { MemberProfile, MemberStatus, JoinRequest, Poll, IssueReport, Announcement } from '../types.ts';

interface MembersViewProps {
  members: MemberProfile[];
  joinRequests?: JoinRequest[];
  polls?: Poll[];
  issues?: IssueReport[];
  announcements?: Announcement[];
  onNavigate?: (view: string) => void;
  onOpenJoin: () => void;
  onOpenAuth: () => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  joinRequests = [],
  polls = [],
  issues = [],
  announcements = [],
  onNavigate,
  onOpenJoin,
  onOpenAuth,
}) => {
  const { currentUser, isLoggedIn, rejoinMandaliSession } = useAuth();
  const [activeTab, setActiveTab] = useState<'approved' | 'activity' | 'approvals'>('approved');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'member' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [wingFilter, setWingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'status'>('newest');
  const [viewMode, setViewMode] = useState<'rows' | 'cards'>('rows');

  // Member Detail Popup Modal state
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<MemberProfile | null>(null);

  // Exit and Edit modal states (user can edit and exit from mandali as their wish)
  const [showExitModal, setShowExitModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);

  // Rejection modal state
  const [rejectingReq, setRejectingReq] = useState<JoinRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  // QR Code Event Pass & Verifier state
  const [selectedMemberForQR, setSelectedMemberForQR] = useState<MemberProfile | null>(null);
  const [showVerifierModal, setShowVerifierModal] = useState(false);

  // Check if current user is an approved member
  const myMemberProfile = useMemo(() => {
    if (!currentUser) return null;
    return members.find((m) => m.userId === currentUser.uid || m.id === currentUser.uid) || null;
  }, [members, currentUser]);

  const pendingRequests = useMemo(() => {
    return joinRequests.filter((r) => r.status === 'pending');
  }, [joinRequests]);

  // Compute status counts for oversight badges
  const statusCounts = useMemo(() => {
    const counts = { all: members.length, active: 0, pending: 0, inactive: 0 };
    members.forEach((m) => {
      const st = m.status || 'active';
      if (st === 'active') counts.active++;
      else if (st === 'pending') counts.pending++;
      else if (st === 'inactive') counts.inactive++;
    });
    return counts;
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();
    const result = members.filter((m) => {
      const memberCode = `gmm-${m.id.slice(0, 8).toLowerCase()}`;
      const matchesSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        memberCode.includes(q) ||
        (m.villageAddress && m.villageAddress.toLowerCase().includes(q)) ||
        (m.role && (m.role === 'admin' ? 'committee admin administrator' : 'member').includes(q)) ||
        (m.bio && m.bio.toLowerCase().includes(q)) ||
        (m.areasOfInterest && m.areasOfInterest.some((a) => a.toLowerCase().includes(q))) ||
        (m.mobileNumber && m.mobileNumber.includes(q));

      const matchesRole = roleFilter === 'all' || m.role === roleFilter;
      const effectiveStatus: MemberStatus = m.status || 'active';
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
      const matchesWing = wingFilter === 'all' || (m.areasOfInterest && m.areasOfInterest.includes(wingFilter));

      return matchesSearch && matchesRole && matchesStatus && matchesWing;
    });

    // Sort according to selection
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime();
      }
      if (sortBy === 'name-asc') {
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === 'name-desc') {
        return b.fullName.localeCompare(a.fullName);
      }
      if (sortBy === 'status') {
        const order: Record<MemberStatus, number> = { active: 1, pending: 2, inactive: 3, exited: 4 };
        const stA = order[a.status || 'active'] || 5;
        const stB = order[b.status || 'active'] || 5;
        return stA - stB;
      }
      return 0;
    });

    return result;
  }, [members, search, roleFilter, statusFilter, wingFilter, sortBy]);

  /**
   * Export the filtered directory to a CSV file for panchayat records & event planning
   */
  const handleExportCSV = () => {
    if (filteredMembers.length === 0) return;
    const headers = ['Member ID', 'Full Name', 'Role', 'Status', 'Mobile', 'Village Address', 'Joined Date', 'Volunteer Wings'];
    const rows = filteredMembers.map((m) => [
      `GMM-${m.id.slice(0, 8).toUpperCase()}`,
      `"${m.fullName.replace(/"/g, '""')}"`,
      m.role === 'admin' ? 'Committee Admin' : 'Member',
      (m.status || 'active').toUpperCase(),
      m.isPhonePublic ? `+91 ${m.mobileNumber}` : 'Private',
      `"${(m.villageAddress || 'H. Hosahalli').replace(/"/g, '""')}"`,
      m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-IN') : 'N/A',
      `"${(m.areasOfInterest || []).join('; ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GMM_Members_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Print roster sheet for village notice board & check-in gates
   */
  const handlePrintRoster = () => {
    window.print();
  };

  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleApprove = async (req: JoinRequest) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setIsProcessingId(req.id);
    setActionFeedback(null);
    try {
      await approveJoinRequest(
        req,
        currentUser.uid,
        currentUser.fullName || 'Mandali Member'
      );
      setActionFeedback(`Approved membership for ${req.fullName}`);
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err: any) {
      setActionFeedback(err?.message || 'Failed to approve member. Please check connection.');
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingReq || !currentUser) return;
    setIsProcessingId(rejectingReq.id);
    setActionFeedback(null);
    try {
      await rejectJoinRequest(
        rejectingReq.id,
        rejectingReq.userId,
        rejectingReq.fullName,
        rejectReason.trim() || 'Application verified and rejected by mandali member.',
        currentUser.uid,
        currentUser.fullName || 'Mandali Member'
      );
      setActionFeedback(`Request rejected for ${rejectingReq.fullName}`);
      setTimeout(() => setActionFeedback(null), 3500);
      setRejectingReq(null);
      setRejectReason('');
    } catch (err: any) {
      setActionFeedback(err?.message || 'Failed to reject request. Please check connection.');
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-300">
      
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Members & Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Community directory and member-driven join request approvals for H. Hosahalli
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowVerifierModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 font-bold text-xs shadow-2xs transition active:scale-95"
            title="Scan or verify member QR passes at event entry gate"
          >
            <Scan className="w-3.5 h-3.5 text-amber-700" />
            <span>Verify Event Pass</span>
          </button>

          <button
            onClick={onOpenJoin}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Apply to Join</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <span>{actionFeedback}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-amber-700 hover:text-amber-950 font-bold px-1.5 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Tabs: Approved Directory vs Member Activity vs Pending Approvals */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('approved')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
            activeTab === 'approved'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Approved Directory ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
            activeTab === 'activity'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Member Activity Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition relative shrink-0 ${
            activeTab === 'approvals'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Approvals ({pendingRequests.length})</span>
          {pendingRequests.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>
      </div>

      {/* TAB 1: APPROVED MEMBERS DIRECTORY */}
      {activeTab === 'approved' && (
        <div className="space-y-4">
          {/* Quick Access to Current User's Event Pass & Mandali Actions */}
          {myMemberProfile && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-800 via-amber-700 to-amber-600 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-amber-400/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-black/20 backdrop-blur-xs text-amber-300 shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
                      Your Official Event Pass
                    </span>
                    <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded text-amber-100">
                      GMM-{myMemberProfile.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold truncate text-white">{myMemberProfile.fullName}</h4>
                  <p className="text-[11px] text-amber-100/90">
                    Display your unique QR code for instant identity check-in during community events
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedMemberForQR(myMemberProfile)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-900 font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-700" />
                  <span>Show Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/30 transition flex items-center gap-1.5 cursor-pointer"
                  title="Edit your mandali profile as your wish"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-200" />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowExitModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-200 hover:text-white font-bold text-xs border border-red-400/40 transition flex items-center gap-1.5 cursor-pointer"
                  title="Exit from Ganesh Mitra Mandali as your wish"
                >
                  <UserMinus className="w-3.5 h-3.5 text-red-300" />
                  <span>Exit Mandali</span>
                </button>
              </div>
            </div>
          )}

          {/* Devotee / Exited Member Notice */}
          {isLoggedIn && !myMemberProfile && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
                  <UserMinus className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-amber-950 block">Currently in Devotee / Visitor Mode</strong>
                  <span className="text-amber-800">
                    You can edit your details or rejoin Ganesh Mitra Mandali anytime as your wish!
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 text-amber-900 font-bold text-xs bg-white hover:bg-amber-100 transition flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsRejoining(true);
                    try {
                      await rejoinMandaliSession();
                    } finally {
                      setIsRejoining(false);
                    }
                  }}
                  disabled={isRejoining}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isRejoining ? 'Rejoining...' : 'Rejoin Mandali'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Search, Status & Role Filters, and Layout Mode */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members by name, phone, role, interests, or residence..."
                  className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* View Layout Toggle (Rows vs Cards) */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('rows')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    viewMode === 'rows'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="List / Table Row View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Rows</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            {/* Filter Bar: Status Indicators & Role Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
              {/* Visual Status Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-slate-400" />
                  <span>Status:</span>
                </span>

                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap border ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  All ({statusCounts.all})
                </button>

                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap border flex items-center gap-1.5 ${
                    statusFilter === 'active'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'active' ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`} />
                  <span>Active ({statusCounts.active})</span>
                </button>

                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap border flex items-center gap-1.5 ${
                    statusFilter === 'pending'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'pending' ? 'bg-white' : 'bg-amber-500'}`} />
                  <span>Pending ({statusCounts.pending})</span>
                </button>

                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap border flex items-center gap-1.5 ${
                    statusFilter === 'inactive'
                      ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'inactive' ? 'bg-white' : 'bg-slate-400'}`} />
                  <span>Inactive ({statusCounts.inactive})</span>
                </button>
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    roleFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Roles
                </button>
                <button
                  onClick={() => setRoleFilter('admin')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    roleFilter === 'admin'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Committee
                </button>
                <button
                  onClick={() => setRoleFilter('member')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    roleFilter === 'member'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Members
                </button>
              </div>
            </div>

            {/* Advanced Filters & Utilities: Wing Filter, Sorting & Export Roster */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Volunteer Wing Filter */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
                  <Tag className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-[11px] font-bold text-slate-600">Wing:</span>
                  <select
                    value={wingFilter}
                    onChange={(e) => setWingFilter(e.target.value)}
                    className="text-[11px] font-semibold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Volunteer Wings</option>
                    <option value="Pooja & Rituals">Pooja & Rituals</option>
                    <option value="Prasada Distribution">Prasada Distribution</option>
                    <option value="Stage & Decoration">Stage & Decoration</option>
                    <option value="Sound & Lighting">Sound & Lighting</option>
                    <option value="Cultural Programs">Cultural Programs</option>
                    <option value="Finance & Accounts">Finance & Accounts</option>
                    <option value="Crowd & Queue Management">Crowd & Queue Management</option>
                    <option value="Youth Volunteer">Youth Volunteer</option>
                  </select>
                </div>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-bold text-slate-600">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-[11px] font-semibold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="newest">Recently Joined</option>
                    <option value="oldest">Earliest Members</option>
                    <option value="name-asc">Name (A to Z)</option>
                    <option value="name-desc">Name (Z to A)</option>
                    <option value="status">By Status (Active first)</option>
                  </select>
                </div>
              </div>

              {/* Export CSV & Print Actions */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredMembers.length === 0}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold transition disabled:opacity-40"
                  title="Export filtered directory to CSV spreadsheet"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintRoster}
                  disabled={filteredMembers.length === 0}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold transition disabled:opacity-40"
                  title="Print member roster for notice board or gate desk"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print Roster</span>
                </button>
              </div>
            </div>
          </div>

          {/* Members List */}
          {members.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No members have joined yet."
              description="The membership directory is currently empty. Villagers from H. Hosahalli can submit their application using the 'Apply to Join' button above."
              actionText="Apply to Join Mandali"
              onAction={onOpenJoin}
              className="my-6"
            />
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 p-8">
              <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No members match the selected filter criteria.</p>
              <p className="text-[11px] text-slate-400 mt-1">Try resetting the search keyword or status filter to see all members.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setRoleFilter('all');
                }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Reset All Filters
              </button>
            </div>
          ) : viewMode === 'rows' ? (
            /* TABLE / ROW VIEW (Click any row to view popup detail) */
            <div className="space-y-2">
              <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100/60 rounded-xl">
                <div className="col-span-4">Member & ID</div>
                <div className="col-span-2">Visual Status</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Joining Date</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {filteredMembers.map((m) => {
                const initials = m.fullName
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'GM';

                const isMe = currentUser && (m.userId === currentUser.uid || m.id === currentUser.uid);
                const effectiveStatus: MemberStatus = m.status || 'active';
                const memberCode = `GMM-${m.id.slice(0, 8).toUpperCase()}`;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMemberForDetail(m)}
                    className={`p-3 sm:px-4 sm:py-3 rounded-2xl border transition-all cursor-pointer flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:items-center group ${
                      isMe
                        ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400 hover:shadow-md'
                        : 'bg-white border-slate-200/90 hover:border-amber-300 hover:shadow-md hover:bg-amber-50/20'
                    }`}
                    title="Click row to view full member details & contact information"
                  >
                    {/* Col 1: Avatar, Name & ID */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.fullName}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-300/60"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-amber-100 text-red-800 font-bold text-xs flex items-center justify-center ring-2 ring-amber-300/60 shadow-xs">
                            {initials}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            effectiveStatus === 'active'
                              ? 'bg-emerald-500'
                              : effectiveStatus === 'pending'
                              ? 'bg-amber-500'
                              : effectiveStatus === 'inactive'
                              ? 'bg-slate-400'
                              : 'bg-rose-500'
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-red-700 transition">
                            {m.fullName}
                          </h4>
                          {isMe && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-600 text-white px-1.5 py-0.2 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-mono">{memberCode}</span>
                          {m.villageAddress && (
                            <span className="truncate hidden sm:inline text-slate-500">
                              • {m.villageAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Visual Status Indicator */}
                    <div className="col-span-2 flex items-center">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          effectiveStatus === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : effectiveStatus === 'pending'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : effectiveStatus === 'inactive'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            effectiveStatus === 'active'
                              ? 'bg-emerald-500 animate-pulse'
                              : effectiveStatus === 'pending'
                              ? 'bg-amber-500'
                              : effectiveStatus === 'inactive'
                              ? 'bg-slate-400'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="capitalize">{effectiveStatus}</span>
                      </span>
                    </div>

                    {/* Col 3: Role Badge */}
                    <div className="col-span-2 flex items-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.role === 'admin'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {m.role === 'admin' ? 'Committee' : 'Member'}
                      </span>
                    </div>

                    {/* Col 4: Joining Date */}
                    <div className="col-span-2 text-slate-600 text-[11px] flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {m.joinedAt
                          ? new Date(m.joinedAt).toLocaleDateString([], {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Member'}
                      </span>
                    </div>

                    {/* Col 5: Actions (View Detail popup, Pass, Contact) */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMemberForDetail(m);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-amber-50 group-hover:bg-amber-100 text-amber-900 border border-amber-300/80 font-bold text-[11px] flex items-center gap-1 transition shadow-2xs"
                        title="Open full member details"
                      >
                        <Eye className="w-3 h-3 text-amber-700" />
                        <span>View Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMemberForQR(m);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-amber-800 transition"
                        title="View Official Event Pass"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* CARD GRID VIEW (Click any card to view popup detail) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredMembers.map((m) => {
                const initials = m.fullName
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'GM';

                const isMe = currentUser && (m.userId === currentUser.uid || m.id === currentUser.uid);
                const effectiveStatus: MemberStatus = m.status || 'active';
                const memberCode = `GMM-${m.id.slice(0, 8).toUpperCase()}`;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMemberForDetail(m)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                      isMe
                        ? 'bg-amber-50/30 border-amber-400 ring-2 ring-amber-400/30 shadow-xs hover:shadow-md'
                        : 'bg-white border-slate-200/90 shadow-2xs hover:border-amber-300 hover:shadow-md'
                    }`}
                    title="Click card to view popup detail"
                  >
                    <div>
                      {/* Top Header: Avatar + Names + Badges */}
                      <div className="flex items-start gap-3">
                        {/* Avatar with status dot */}
                        <div className="relative shrink-0">
                          {m.avatarUrl ? (
                            <img
                              src={m.avatarUrl}
                              alt={m.fullName}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-300/60"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-100 to-amber-100 text-red-800 font-bold text-sm flex items-center justify-center ring-2 ring-amber-300/60 shadow-xs">
                              {initials}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              effectiveStatus === 'active'
                                ? 'bg-emerald-500'
                                : effectiveStatus === 'pending'
                                ? 'bg-amber-500'
                                : effectiveStatus === 'inactive'
                                ? 'bg-slate-400'
                                : 'bg-rose-500'
                            }`}
                          />
                        </div>

                        {/* Title, Role & Visual Status */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-red-700 transition">
                              {m.fullName}
                            </h3>
                            {isMe && (
                              <span className="text-[9px] font-black uppercase tracking-wider bg-amber-600 text-white px-1.5 py-0.5 rounded-full shrink-0">
                                You
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                m.role === 'admin'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {m.role === 'admin' ? 'Committee' : 'Member'}
                            </span>

                            {/* Visual Status Indicator Pill */}
                            <span
                              className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                                effectiveStatus === 'active'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : effectiveStatus === 'pending'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : effectiveStatus === 'inactive'
                                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300'
                              }`}
                            >
                              <span
                                className={`w-1.2 h-1.2 rounded-full ${
                                  effectiveStatus === 'active'
                                    ? 'bg-emerald-500'
                                    : effectiveStatus === 'pending'
                                    ? 'bg-amber-500'
                                    : effectiveStatus === 'inactive'
                                    ? 'bg-slate-400'
                                    : 'bg-rose-500'
                                }`}
                              />
                              <span className="capitalize">{effectiveStatus}</span>
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            {memberCode}
                          </span>
                        </div>
                      </div>

                      {/* Address */}
                      {m.villageAddress && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-2">
                          <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate">{m.villageAddress}</span>
                        </p>
                      )}

                      {/* Areas of Interest / Volunteer tags */}
                      {m.areasOfInterest && m.areasOfInterest.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {m.areasOfInterest.slice(0, 2).map((area) => (
                            <span
                              key={area}
                              className="text-[9px] font-medium bg-amber-50 text-amber-900 px-1.5 py-0.2 rounded border border-amber-200/70"
                            >
                              {area}
                            </span>
                          ))}
                          {m.areasOfInterest.length > 2 && (
                            <span className="text-[9px] text-slate-400 font-mono">
                              +{m.areasOfInterest.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Metadata & Quick Actions */}
                    <div className="pt-3 border-t border-slate-100 mt-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-red-600" />
                          Joined {new Date(m.joinedAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                        </span>

                        {m.isPhonePublic && m.mobileNumber ? (
                          <a
                            href={`tel:${m.mobileNumber}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-red-600 font-bold hover:underline"
                            title="Call Member"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[9px]">Private contact</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/70">
                        <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1 group-hover:underline">
                          <Eye className="w-3 h-3" />
                          <span>View Detail Popup</span>
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMemberForQR(m);
                            }}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold flex items-center gap-1 transition"
                            title="View Official Event Pass"
                          >
                            <QrCode className="w-3 h-3 text-amber-700" />
                            <span>Pass</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEMBER ACTIVITY TIMELINE */}
      {activeTab === 'activity' && (
        <MemberActivity
          members={members}
          polls={polls}
          issues={issues}
          announcements={announcements}
          onNavigate={onNavigate}
          onOpenMemberQR={(m) => setSelectedMemberForQR(m)}
          onSharePollToChat={() => onNavigate && onNavigate('chat')}
        />
      )}

      {/* TAB 3: PENDING MEMBERSHIP APPROVALS (ALL MEMBERS CAN APPROVE) */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Community Member Governance:</strong> Any member of Ganesh Mitra Mandali can review, verify, and approve new membership requests.
              </span>
            </div>
            {!isLoggedIn && (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs self-start sm:self-auto shrink-0 shadow-2xs"
              >
                Sign In to Approve
              </button>
            )}
          </div>

          {pendingRequests.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No pending membership requests."
              description="All submitted membership requests have been processed. New applicant requests from H. Hosahalli will appear here for all members to review."
              actionText="Invite a Village Member"
              onAction={onOpenJoin}
              className="my-6"
            />
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    {req.photoUrl ? (
                      <img
                        src={req.photoUrl}
                        alt={req.fullName}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-300"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 font-bold text-sm flex items-center justify-center">
                        {req.fullName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{req.fullName}</h3>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.2 rounded">
                          Awaiting Approval
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        +91 {req.mobileNumber}
                      </p>
                      {req.villageAddress && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {req.villageAddress}
                        </p>
                      )}
                      <span className="text-[10px] text-slate-400 block pt-1">
                        Applied: {new Date(req.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isLoggedIn ? (
                      <>
                        <button
                          onClick={() => setRejectingReq(req)}
                          disabled={isProcessingId === req.id}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={isProcessingId === req.id}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition shadow-xs disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isProcessingId === req.id ? 'Approving...' : 'Approve Member'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={onOpenAuth}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In to Approve</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Reject Membership Request
            </h3>
            <p className="text-xs text-slate-500">
              Applicant: <strong>{rejectingReq.fullName}</strong>. Please enter the reason for rejection:
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Applicant information could not be verified in H. Hosahalli..."
              className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectingReq(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessingId === rejectingReq.id}
                className="w-1/2 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-2xs disabled:opacity-50"
              >
                {isProcessingId === rejectingReq.id ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DETAIL VIEW FOR MEMBERS IN DIRECTORY */}
      <MemberDetailModal
        isOpen={!!selectedMemberForDetail}
        member={selectedMemberForDetail}
        onClose={() => setSelectedMemberForDetail(null)}
        onOpenQRPass={(m) => setSelectedMemberForQR(m)}
        onEditProfile={() => setShowEditModal(true)}
        onExitMandali={() => setShowExitModal(true)}
        onNavigate={onNavigate}
      />

      {/* MEMBER OFFICIAL EVENT QR IDENTITY PASS MODAL */}
      <MemberQRModal
        member={selectedMemberForQR}
        onClose={() => setSelectedMemberForQR(null)}
      />

      {/* EVENT GATE QR CODE VERIFIER MODAL */}
      {showVerifierModal && (
        <EventQRVerifierModal
          members={members}
          onClose={() => setShowVerifierModal(false)}
          onSelectMemberPass={(m) => {
            setShowVerifierModal(false);
            setSelectedMemberForQR(m);
          }}
        />
      )}

      {/* VOLUNTARY EXIT FROM MANDALI MODAL */}
      <ExitMandaliModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
      />

      {/* EDIT MANDALI PROFILE MODAL */}
      <EditMemberProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        initialProfile={myMemberProfile}
      />
    </div>
  );
};
