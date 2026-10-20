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
} from 'lucide-react';
import {
  approveJoinRequest,
  rejectJoinRequest,
  removeMember,
  changeMemberRole,
  updateAppSettings,
  resolveEmergency,
} from '../services/mandaliService.ts';
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

          {/* Quick Shortcuts */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Administrator Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <button
              onClick={onOpenEmergency}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
            >
              Test Emergency Broadcast
            </button>
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
