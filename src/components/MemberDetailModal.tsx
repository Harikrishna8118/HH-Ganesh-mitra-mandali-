import React, { useState } from 'react';
import {
  X,
  Phone,
  MapPin,
  Calendar,
  QrCode,
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageCircle,
  Copy,
  Check,
  Edit3,
  UserMinus,
  Sparkles,
  ExternalLink,
  Tag,
  FileText,
  UserCheck,
  Activity,
  HeartHandshake,
  Download,
  Share2,
  UserPlus,
  Send,
} from 'lucide-react';
import type { MemberProfile, MemberStatus } from '../types.ts';
import { updateMemberStatus } from '../services/mandaliService.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface MemberDetailModalProps {
  member: MemberProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenQRPass?: (member: MemberProfile) => void;
  onEditProfile?: () => void;
  onExitMandali?: () => void;
  onNavigate?: (view: string) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  isOpen,
  onClose,
  onOpenQRPass,
  onEditProfile,
  onExitMandali,
  onNavigate,
}) => {
  const { currentUser, isLoggedIn } = useAuth();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusNoteInput, setStatusNoteInput] = useState('');
  const [showStatusControls, setShowStatusControls] = useState(false);

  if (!isOpen || !member) return null;

  const isMe = currentUser && (member.userId === currentUser.uid || member.id === currentUser.uid);
  const isAdmin = currentUser?.role === 'admin';
  const memberCode = `GMM-${member.id.slice(0, 8).toUpperCase()}`;

  // Current visual status (defaulting to 'active' if not explicitly defined)
  const effectiveStatus: MemberStatus = member.status || 'active';

  // Format joining date nicely
  const joinDate = member.joinedAt ? new Date(member.joinedAt) : null;
  const formattedJoinDate = joinDate && !isNaN(joinDate.getTime())
    ? joinDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Registered Member';

  // Calculate duration since joining
  const getJoiningDuration = () => {
    if (!joinDate || isNaN(joinDate.getTime())) return null;
    const diffTime = Math.abs(Date.now() - joinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) {
      return diffDays <= 1 ? 'Joined recently' : `Joined ${diffDays} days ago`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `Joined ${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    }
    const diffYears = Math.floor(diffDays / 365);
    return `Joined ${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  };

  const cleanPhone = member.mobileNumber ? member.mobileNumber.replace(/\D/g, '') : '';
  const canViewPhone = member.isPhonePublic || isMe || isAdmin || isLoggedIn;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(memberCode);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyPhone = async () => {
    if (!member.mobileNumber) return;
    try {
      await navigator.clipboard.writeText(member.mobileNumber);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      // fallback
    }
  };

  /**
   * Generates and downloads a standard vCard (.vcf) file to save directly
   * to Android, iPhone, or Desktop contacts.
   */
  const handleDownloadVCard = () => {
    const vCardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${member.fullName}`,
      member.mobileNumber ? `TEL;TYPE=CELL,VOICE:+91${cleanPhone}` : '',
      'ORG:Shri Ganesh Mitra Mandali, H. Hosahalli',
      `TITLE:${member.role === 'admin' ? 'Committee Member' : 'Mandali Member'}`,
      `ADR;TYPE=HOME:;;${member.villageAddress || 'H. Hosahalli Village'};;;Mandya;Karnataka;India`,
      `NOTE:Member ID: ${memberCode}. Status: ${effectiveStatus}. Joined: ${formattedJoinDate}`,
      'END:VCARD',
    ].filter(Boolean);

    const blob = new Blob([vCardLines.join('\r\n')], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${member.fullName.replace(/\s+/g, '_')}_GMM.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Shares member details via Web Share API or copies to clipboard
   */
  const handleShareMember = async () => {
    const shareText = `Shri Ganesh Mitra Mandali, H. Hosahalli\nMember: ${member.fullName}\nID: ${memberCode}\nRole: ${
      member.role === 'admin' ? 'Committee Admin' : 'Member'
    }\nStatus: ${effectiveStatus.toUpperCase()}\nJoined: ${formattedJoinDate}${
      member.mobileNumber && canViewPhone ? `\nPhone: +91 ${member.mobileNumber}` : ''
    }\nVillage: ${member.villageAddress || 'H. Hosahalli'}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${member.fullName} - Ganesh Mitra Mandali Member`,
          text: shareText,
        });
      } catch {
        // user cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } catch {
        // fallback
      }
    }
  };

  const handleStatusChange = async (newStatus: MemberStatus) => {
    if (!currentUser) return;
    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      await updateMemberStatus(
        member.userId || member.id,
        newStatus,
        currentUser.uid,
        currentUser.fullName || 'Admin',
        statusNoteInput.trim() || undefined
      );
      setStatusMessage(`Status updated to ${newStatus.toUpperCase()}`);
      setShowStatusControls(false);
      setStatusNoteInput('');
      // update local member reference
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status. Please try again.';
      setStatusMessage(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: MemberStatus) => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          label: 'Active Member',
          desc: 'Verified and participating in community events',
          icon: CheckCircle2,
        };
      case 'pending':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          label: 'Pending Oversight',
          desc: 'Awaiting leadership review or profile verification',
          icon: Clock,
        };
      case 'inactive':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
          label: 'Inactive',
          desc: 'Temporary pause in active festival responsibilities',
          icon: AlertTriangle,
        };
      case 'exited':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
          label: 'Exited Mandali',
          desc: 'Voluntarily exited or moved outside H. Hosahalli',
          icon: UserMinus,
        };
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          label: 'Active',
          desc: 'Community member',
          icon: CheckCircle2,
        };
    }
  };

  const statusConfig = getStatusBadge(effectiveStatus);
  const StatusIcon = statusConfig.icon;

  const initials = member.fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'GM';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with GMM Branding */}
        <div className="relative bg-gradient-to-r from-red-800 via-amber-700 to-amber-600 p-5 text-white">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition active:scale-95"
            aria-label="Close detail view"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded-full text-amber-200">
              Shri Ganesh Mitra Mandali
            </span>
            <span className="text-[10px] text-amber-100/90 font-mono">
              H. Hosahalli
            </span>
          </div>

          <div className="flex items-center gap-3.5 mt-2">
            {/* Avatar */}
            <div className="relative shrink-0">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.fullName}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover ring-4 ring-white/30 shadow-md bg-white"
                />
              ) : (
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-amber-100 text-amber-900 font-black text-xl flex items-center justify-center ring-4 ring-white/30 shadow-md">
                  {initials}
                </div>
              )}
              {/* Online / Active status pulse */}
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${statusConfig.dot}`}
                title={statusConfig.label}
              />
            </div>

            {/* Main Title & Badges */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
                  {member.fullName}
                </h2>
                {isMe && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>

              {/* ID & Roles */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1 text-[11px] font-mono bg-black/30 hover:bg-black/50 text-amber-200 px-2 py-0.5 rounded-md transition"
                  title="Click to copy official member ID"
                >
                  <span>{memberCode}</span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-300" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-70" />
                  )}
                </button>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    member.role === 'admin'
                      ? 'bg-amber-300 text-amber-950'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <Shield className="w-2.5 h-2.5" />
                  <span>{member.role === 'admin' ? 'Committee Admin' : 'Mandali Member'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800">

          {/* Visual Status Oversight Card */}
          <div className="p-3.5 rounded-2xl border bg-slate-50 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${statusConfig.bg}`}>
                <StatusIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">
                    Status:
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.bg} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                    <span>{statusConfig.label}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {statusConfig.desc}
                </p>
                {member.statusNote && (
                  <p className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded mt-1 border border-amber-200/80 inline-block">
                    Note: {member.statusNote}
                  </p>
                )}
              </div>
            </div>

            {/* Committee / Admin Oversight Action */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowStatusControls(!showStatusControls)}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100/70 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1 self-start sm:self-auto shrink-0"
              >
                <Activity className="w-3.5 h-3.5 text-amber-700" />
                <span>{showStatusControls ? 'Hide Oversight' : 'Update Status'}</span>
              </button>
            )}
          </div>

          {/* Status update controls (for Admins / Committee oversight) */}
          {showStatusControls && isAdmin && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-700" />
                  <span>Committee Oversight Status</span>
                </h4>
                <span className="text-[10px] text-amber-700">Audit logged</span>
              </div>
              
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['active', 'pending', 'inactive', 'exited'] as MemberStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    disabled={isUpdatingStatus || effectiveStatus === st}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition flex items-center gap-1 border ${
                      effectiveStatus === st
                        ? 'bg-amber-700 text-white border-amber-800 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-100/60'
                    } disabled:opacity-50`}
                  >
                    <span>{st}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={statusNoteInput}
                  onChange={(e) => setStatusNoteInput(e.target.value)}
                  placeholder="Optional oversight remark or reason..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {statusMessage && (
                <p className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {statusMessage}
                </p>
              )}
            </div>
          )}

          {/* Joining Date & Timeline Section */}
          <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-2">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-red-600" />
              <span>Membership Timeline & Joining Date</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 block">
                  Official Joining Date
                </span>
                <span className="font-bold text-slate-900 block">
                  {formattedJoinDate}
                </span>
                {getJoiningDuration() && (
                  <span className="text-[10px] text-amber-700 font-medium block">
                    {getJoiningDuration()}
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 block">
                  Mandali Tenure & Status
                </span>
                <span className="font-bold text-slate-900 block capitalize">
                  {effectiveStatus === 'exited' ? 'Former Member' : `${effectiveStatus} Member`}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  H. Hosahalli Mandali Unit
                </span>
              </div>
            </div>

            {member.exitedAt && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                <span className="font-bold block">Exited On: {new Date(member.exitedAt).toLocaleDateString()}</span>
                {member.statusNote && (
                  <span className="text-[11px] block text-rose-800">Reason: {member.statusNote}</span>
                )}
              </div>
            )}
          </div>

          {/* Additional Contact Information */}
          <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-red-600" />
              <span>Additional Contact Information</span>
            </h3>

            {/* Mobile Number Row */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 block">
                  Mobile Number
                </span>
                {canViewPhone && member.mobileNumber ? (
                  <span className="text-xs font-mono font-bold text-slate-900 tracking-wide">
                    +91 {member.mobileNumber}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    Contact number marked private
                  </span>
                )}
              </div>

              {canViewPhone && member.mobileNumber ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                    title="Copy Phone Number"
                  >
                    {copiedPhone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={`tel:${member.mobileNumber}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </a>
                  {cleanPhone.length >= 10 && (
                    <a
                      href={`https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
                        `Namaskara ${member.fullName}, regarding Shri Ganesh Mitra Mandali H. Hosahalli...`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-700" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">Private</span>
              )}
            </div>

            {/* Residence / Village Address */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Village Address & Residence</span>
              </span>
              <p className="text-xs font-semibold text-slate-800">
                {member.villageAddress || 'H. Hosahalli Village, Mandya District, Karnataka'}
              </p>
              <p className="text-[10px] text-slate-500">
                Local resident of Shri Ganesh Mitra Mandali jurisdiction
              </p>
            </div>

            {/* Bio / Devotee Statement */}
            {member.bio && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 block flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>About / Devotee Message</span>
                </span>
                <p className="text-xs text-slate-700 italic leading-relaxed">
                  "{member.bio}"
                </p>
              </div>
            )}

            {/* Areas of Interest / Volunteer Wings */}
            {member.areasOfInterest && member.areasOfInterest.length > 0 && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 block flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span>Volunteer Responsibilities & Interests</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {member.areasOfInterest.map((interest) => (
                    <span
                      key={interest}
                      className="text-[11px] font-bold bg-amber-100/80 text-amber-900 border border-amber-300/70 px-2 py-0.5 rounded-lg flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                      <span>{interest}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions & Utilities */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {canViewPhone && member.mobileNumber && (
              <button
                type="button"
                onClick={handleDownloadVCard}
                className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-slate-200"
                title="Save contact file (.vcf) directly to phone or computer"
              >
                <Download className="w-3.5 h-3.5 text-slate-700" />
                <span>Save Contact</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShareMember}
              className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-slate-200"
              title="Share member profile or copy details"
            >
              {copiedShare ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>Share Profile</span>
                </>
              )}
            </button>

            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('chat');
                }}
                className="py-2 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-red-200 col-span-2 sm:col-span-1"
                title="Open Mandali Group Chat"
              >
                <Send className="w-3.5 h-3.5 text-red-700" />
                <span>Mandali Chat</span>
              </button>
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            {onOpenQRPass && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQRPass(member);
                }}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-2xs"
              >
                <QrCode className="w-4 h-4 text-amber-700" />
                <span>View Official Event Pass</span>
              </button>
            )}

            {isMe && onEditProfile && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditProfile();
                }}
                className="w-full sm:w-auto py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Profile</span>
              </button>
            )}

            {isMe && onExitMandali && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExitMandali();
                }}
                className="w-full sm:w-auto py-2.5 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <UserMinus className="w-3.5 h-3.5 text-red-600" />
                <span>Exit</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">
            H. Hosahalli Mandali Directory
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
