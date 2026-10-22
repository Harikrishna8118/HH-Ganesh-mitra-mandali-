import React, { useState } from 'react';
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  Vote,
  Megaphone,
  ShieldAlert,
  FileText,
  Settings,
  Check,
  X,
  Upload,
  Calendar,
  Clock,
  Phone,
  MapPin,
  Trash2,
  Lock,
  Radio,
  Send,
  BellRing,
} from 'lucide-react';
import {
  approveJoinRequest,
  rejectJoinRequest,
  removeMember,
  changeMemberRole,
  updateAppSettings,
  resolveEmergency,
  logAdminAction,
} from '../services/mandaliService.ts';
import { broadcastUrgentPushNotification } from '../services/fcmService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { GaneshLogo } from '../components/GaneshLogo.tsx';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import type {
  AppSettings,
  MemberProfile,
  JoinRequest,
  IssueReport,
  EmergencyReport,
  Poll,
  Announcement,
  AdminAction,
  UserRole,
} from '../types.ts';

interface AdminDashboardViewProps {
  settings: AppSettings;
  members: MemberProfile[];
  joinRequests: JoinRequest[];
  issues: IssueReport[];
  emergencies: EmergencyReport[];
  polls: Poll[];
  announcements: Announcement[];
  auditLogs: AdminAction[];
  onOpenEmergency: () => void;
}

type AdminTab =
  | 'overview'
  | 'requests'
  | 'members'
  | 'issues'
  | 'emergencies'
  | 'settings'
  | 'audit';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  settings,
  members = [],
  joinRequests = [],
  issues = [],
  emergencies = [],
  polls = [],
  announcements = [],
  auditLogs = [],
  onOpenEmergency,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');

  // Reject modal state
  const [rejectingReq, setRejectingReq] = useState<JoinRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Settings state with safe fallbacks
  const [mandaliName, setMandaliName] = useState(settings?.mandaliName || 'Ganesh Mitra Mandali');
  const [villageName, setVillageName] = useState(settings?.villageName || 'H. Hosahalli');
  const [contactPhone, setContactPhone] = useState(settings?.contactPhone || '+91 98450 12345');
  const [bannerText, setBannerText] = useState(settings?.bannerText || '');
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');

  if (!currentUser) {
    return (
      <div className="py-16 text-center space-y-4 max-w-sm mx-auto animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Member Sign In Required</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Please sign in with your mobile number to access mandali governance, member approvals, and settings.
        </p>
      </div>
    );
  }

  const pendingRequests = joinRequests.filter((r) => r.status === 'pending');
  const openIssues = issues.filter((i) => i.status !== 'resolved');
  const activeEmergencies = emergencies.filter((e) => e.isActive);

  const [adminError, setAdminError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive: boolean;
    action: () => Promise<void>;
  } | null>(null);

  // Urgent Broadcast Dispatcher state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'urgent' | 'high'>('urgent');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setIsBroadcasting(true);
    setAdminError(null);
    try {
      await broadcastUrgentPushNotification({
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        priority: broadcastPriority,
        topic: broadcastPriority === 'urgent' ? 'urgent' : 'all',
        link: 'announcements',
        senderId: currentUser?.uid || 'admin',
        senderName: currentUser?.fullName || 'Mandali Admin',
      });
      await logAdminAction(
        currentUser?.uid || 'admin',
        currentUser?.fullName || 'Admin',
        'BROADCAST_PUSH_ALERT',
        'PushBroadcast',
        `fcm_${Date.now()}`,
        `Dispatched ${broadcastPriority.toUpperCase()} broadcast: "${broadcastTitle.trim()}"`
      );
      setBroadcastSuccess('Urgent push alert successfully broadcast to all registered village devices!');
      setBroadcastTitle('');
      setBroadcastBody('');
      setTimeout(() => {
        setBroadcastSuccess(null);
        setShowBroadcastModal(false);
      }, 2500);
    } catch (err: any) {
      setAdminError(err?.message || 'Failed to dispatch broadcast');
      setTimeout(() => setAdminError(null), 4000);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleApprove = async (req: JoinRequest) => {
    try {
      setAdminError(null);
      await approveJoinRequest(
        req,
        currentUser?.uid || 'admin',
        currentUser?.fullName || 'Admin'
      );
    } catch (e: any) {
      setAdminError(e?.message || 'Failed to approve join request');
      setTimeout(() => setAdminError(null), 4000);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingReq) return;
    try {
      setAdminError(null);
      await rejectJoinRequest(
        rejectingReq.id,
        rejectingReq.userId,
        rejectingReq.fullName,
        rejectReason.trim() || 'Application not verified by committee',
        currentUser?.uid || 'admin',
        currentUser?.fullName || 'Admin'
      );
      setRejectingReq(null);
      setRejectReason('');
    } catch (e: any) {
      setAdminError(e?.message || 'Failed to reject join request');
      setTimeout(() => setAdminError(null), 4000);
    }
  };

  const handleRemoveMember = (m: MemberProfile) => {
    setConfirmAction({
      title: 'Remove Mandali Member',
      message: `Are you sure you want to remove ${m.fullName} from approved members? They will no longer have member privileges.`,
      confirmLabel: 'Remove Member',
      isDestructive: true,
      action: async () => {
        try {
          await removeMember(
            m.id,
            m.fullName,
            currentUser?.uid || 'admin',
            currentUser?.fullName || 'Admin'
          );
        } catch (e: any) {
          setAdminError(e?.message || 'Failed to remove member');
          setTimeout(() => setAdminError(null), 4000);
        }
      },
    });
  };

  const handleRoleChange = (m: MemberProfile, newRole: UserRole) => {
    setConfirmAction({
      title: 'Update Member Role',
      message: `Change ${m.fullName}'s role to ${newRole.toUpperCase()}?`,
      confirmLabel: 'Change Role',
      isDestructive: false,
      action: async () => {
        try {
          await changeMemberRole(
            m.id,
            m.fullName,
            newRole,
            currentUser?.uid || 'admin',
            currentUser?.fullName || 'Admin'
          );
        } catch (e: any) {
          setAdminError(e?.message || 'Failed to change member role');
          setTimeout(() => setAdminError(null), 4000);
        }
      },
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setAdminError(null);
    try {
      await updateAppSettings(
        {
          mandaliName: mandaliName.trim(),
          villageName: villageName.trim(),
          contactPhone: contactPhone.trim(),
          bannerText: bannerText.trim(),
          logoUrl: logoUrl.trim() || undefined,
        },
        currentUser?.uid || 'admin',
        currentUser?.fullName || 'Admin'
      );
      setSettingsSavedMsg('Mandali configuration and logo updated successfully!');
      setTimeout(() => setSettingsSavedMsg(''), 2500);
    } catch (e: any) {
      setAdminError(e?.message || 'Failed to update settings. Please check connection.');
      setTimeout(() => setAdminError(null), 4000);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-red-800 to-amber-900 text-white p-6 rounded-3xl shadow-lg border border-red-700/50">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md ring-2 ring-amber-400/40">
            <Shield className="w-7 h-7 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Mandali Administration Console
            </h1>
            <p className="text-xs text-amber-200">
              Ganesh Mitra Mandali — Village Governance (H. Hosahalli)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 bg-amber-400 text-amber-950 font-bold rounded-lg shadow-2xs">
            Member: {currentUser?.fullName}
          </span>
        </div>
      </div>

      {/* Admin Action Error Banner */}
      {adminError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <span>{adminError}</span>
          <button
            onClick={() => setAdminError(null)}
            className="text-red-600 hover:text-red-900 font-bold px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 chat-scroll">
        {[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'requests', label: `Pending Requests (${pendingRequests.length})`, icon: UserCheck },
          { id: 'members', label: `Members (${members.length})`, icon: Users },
          { id: 'issues', label: `Issues (${openIssues.length})`, icon: AlertCircle },
          { id: 'emergencies', label: `Emergency (${activeEmergencies.length})`, icon: ShieldAlert },
          { id: 'settings', label: 'Branding & Logo', icon: Settings },
          { id: 'audit', label: 'Audit Log', icon: Clock },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as AdminTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-red-700 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Total Members</span>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {members.length}
              </div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-amber-700 font-medium">Pending Requests</span>
              <div className="text-2xl font-black text-amber-900 mt-1 tabular-nums">
                {pendingRequests.length}
              </div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-orange-700 font-medium">Open Issues</span>
              <div className="text-2xl font-black text-orange-900 mt-1 tabular-nums">
                {openIssues.length}
              </div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs text-red-700 font-medium">Active Emergencies</span>
              <div className="text-2xl font-black text-red-900 mt-1 tabular-nums">
                {activeEmergencies.length}
              </div>
            </div>
          </div>

          {/* Emergency & Urgent Push Broadcast Dispatcher Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    Live Village Push Notification Dispatcher
                  </h3>
                  <p className="text-xs text-white/90">
                    Send real-time high-priority announcements & audio chimes to all registered devices in H. Hosahalli
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                className="px-4 py-2 rounded-xl bg-white text-red-700 hover:bg-white/90 text-xs font-black transition flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto cursor-pointer active:scale-95"
              >
                <BellRing className="w-4 h-4 text-red-600 animate-bounce" />
                <span>Broadcast Urgent Alert</span>
              </button>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Administrator Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="p-3 rounded-xl border border-red-300 hover:border-red-500 bg-red-50/70 text-left transition"
              >
                <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  <span>Broadcast Alert</span>
                </div>
                <div className="text-[11px] text-red-700 mt-0.5">
                  Push instant alert overlay
                </div>
              </button>
              <button
                onClick={() => setTab('requests')}
                className="p-3 rounded-xl border border-slate-200 hover:border-amber-400 bg-amber-50/40 text-left transition"
              >
                <div className="text-xs font-bold text-amber-900">Review Applications</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {pendingRequests.length} requests waiting for approval
                </div>
              </button>
              <button
                onClick={() => setTab('settings')}
                className="p-3 rounded-xl border border-slate-200 hover:border-red-400 bg-red-50/40 text-left transition"
              >
                <div className="text-xs font-bold text-red-900">Upload Mandali Logo</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Configure custom Lord Ganesha image
                </div>
              </button>
              <button
                onClick={() => setTab('audit')}
                className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-blue-50/40 text-left transition"
              >
                <div className="text-xs font-bold text-blue-900">Audit Trail</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Review administrative decisions
                </div>
              </button>
            </div>
          </div>

          {/* Recent Audit Activities */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Recent Mandali Activities</h3>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No administrative actions logged yet.
              </p>
            ) : (
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <strong className="text-slate-800">{log.actionType.replace('_', ' ')}:</strong>{' '}
                      <span className="text-slate-600">{log.details}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 tabular-nums ml-2">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: PENDING JOIN REQUESTS ================= */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Pending Membership Applications ({pendingRequests.length})
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No pending membership requests."
              description="All submitted membership requests have been processed. New applicant requests from H. Hosahalli will appear here for review."
              className="my-6"
            />
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                      <h3 className="text-sm font-bold text-slate-900">{req.fullName}</h3>
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
                    <button
                      onClick={() => setRejectingReq(req)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleApprove(req)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Member</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: MEMBERS MANAGEMENT ================= */}
      {tab === 'members' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Approved Members Management ({members.length})
          </h2>

          {members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No approved members yet."
              description="Approve pending join requests to populate the official member roster."
              className="my-6"
            />
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">
                      {m.fullName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{m.fullName}</h4>
                      <p className="text-xs text-slate-500 font-mono">+91 {m.mobileNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m, e.target.value as UserRole)}
                      className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                    >
                      <option value="member">Role: Member</option>
                      <option value="admin">Role: Admin</option>
                    </select>

                    <button
                      onClick={() => handleRemoveMember(m)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: ISSUE REPORTS ================= */}
      {tab === 'issues' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Reported Community Problems ({issues.length})
          </h2>
          {issues.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No issues reported."
              description="All festival arrangements in H. Hosahalli are currently running without reported problems."
              className="my-6"
            />
          ) : (
            <div className="space-y-3">
              {issues.map((iss) => (
                <div key={iss.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-700">{iss.category}</span>
                    <span className="text-xs uppercase font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {iss.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{iss.title}</h4>
                  <p className="text-xs text-slate-600">{iss.description}</p>
                  <p className="text-[11px] text-slate-400">
                    Reported by {iss.reporterName} ({iss.reporterPhone}) · {new Date(iss.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: EMERGENCY INCIDENTS ================= */}
      {tab === 'emergencies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Emergency Incidents Desk ({emergencies.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Dispatch FCM Alert</span>
              </button>
              <button
                onClick={onOpenEmergency}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
              >
                Report Emergency
              </button>
            </div>
          </div>

          {emergencies.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No active emergencies."
              description="Zero active emergency reports. Any crisis alert triggered by a member will broadcast directly here."
              className="my-6"
            />
          ) : (
            <div className="space-y-3">
              {emergencies.map((em) => (
                <div
                  key={em.id}
                  className={`p-4 rounded-2xl border space-y-2 ${
                    em.isActive
                      ? 'bg-red-50 border-red-300 ring-2 ring-red-400/30'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-red-700">
                      {em.category} INCIDENT
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${em.isActive ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                      {em.isActive ? 'ACTIVE' : 'RESOLVED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium">{em.description}</p>
                  <p className="text-[11px] text-slate-500">
                    Reported by {em.reporterName} (+91 {em.reporterPhone}) · {new Date(em.createdAt).toLocaleString()}
                  </p>

                  {em.isActive && (
                    <button
                      onClick={() =>
                        resolveEmergency(
                          em.id,
                          'Resolved by administrator on site',
                          currentUser?.uid || 'admin',
                          currentUser?.fullName || 'Admin'
                        )
                      }
                      className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark Incident Resolved
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 6: MANDALI SETTINGS & LOGO ================= */}
      {tab === 'settings' && (
        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Mandali Branding & Custom Logo Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure mandali name, village info, contact phone, and custom Lord Ganesha emblem image
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Logo Preview */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
              <GaneshLogo size="lg" customUrl={logoUrl} />
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800 block">
                  Active Lord Ganesha Emblem
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  This logo is displayed on the splash screen, app header, and mandali cards.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custom Logo Image URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/lord-ganesha.jpg (leave empty for default vector emblem)"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Provide an image link to replace the logo anytime.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandali Name
                </label>
                <input
                  type="text"
                  required
                  value={mandaliName}
                  onChange={(e) => setMandaliName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Village Name
                </label>
                <input
                  type="text"
                  required
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Committee Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Welcome Banner Description
              </label>
              <textarea
                rows={2}
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
              />
            </div>

            {settingsSavedMsg && (
              <p className="text-xs font-semibold text-emerald-600">{settingsSavedMsg}</p>
            )}

            <button
              type="submit"
              disabled={savingSettings}
              className="py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Update Mandali Branding'}
            </button>
          </form>
        </div>
      )}

      {/* ================= TAB 7: AUDIT LOGS ================= */}
      {tab === 'audit' && (
        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Administrative Audit Log
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure record of approvals, role adjustments, emergency resolutions, and moderations
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">No audit events recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-red-700 uppercase tracking-wide text-[11px]">
                      {log.actionType.replace('_', ' ')}
                    </span>
                    <p className="text-slate-800">{log.details}</p>
                    <p className="text-[11px] text-slate-400">
                      By {log.adminName}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
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
              Reject Membership: {rejectingReq.fullName}
            </h3>
            <p className="text-xs text-slate-500">
              Please enter the reason for rejection (this will be communicated to the applicant):
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Phone number could not be verified by committee..."
              className="w-full text-xs p-2 rounded-xl border border-slate-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectingReq(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="w-1/2 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URGENT BROADCAST DISPATCHER MODAL */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl p-6 border-2 border-red-500/80 space-y-4">
            
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-red-950 dark:text-red-100">
                    Broadcast Urgent Alert (FCM)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pushes high-priority overlay & audio beacon to all village devices
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {broadcastSuccess && (
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-xs font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{broadcastSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. URGENT: Electrical Pandhal Inspection / Water Safety"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--bg-canvas)] focus:ring-2 focus:ring-red-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Priority Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastPriority('urgent')}
                    className={`py-2 px-3 rounded-xl text-xs font-black border transition flex items-center justify-center gap-1.5 ${
                      broadcastPriority === 'urgent'
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>🚨 Urgent (Red Siren)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastPriority('high')}
                    className={`py-2 px-3 rounded-xl text-xs font-black border transition flex items-center justify-center gap-1.5 ${
                      broadcastPriority === 'high'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>⚡ High Priority</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Message & Emergency Instructions <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Provide urgent instructions for village residents and volunteers..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--bg-canvas)] focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                <span>
                  Dispatched by <strong>{currentUser?.fullName || 'Mandali Admin'}</strong> to all active web & PWA devices in H. Hosahalli.
                </span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isBroadcasting ? 'Broadcasting...' : 'Send Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable ConfirmModal for Admin Actions */}
      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.title || 'Confirm Action'}
        message={confirmAction?.message || ''}
        confirmLabel={confirmAction?.confirmLabel || 'Confirm'}
        isDestructive={confirmAction?.isDestructive ?? false}
        onConfirm={() => {
          if (confirmAction?.action) {
            confirmAction.action();
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
