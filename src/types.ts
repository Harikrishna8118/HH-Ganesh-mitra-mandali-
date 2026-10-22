export type UserRole = 'public' | 'member' | 'admin';

export interface UserAccount {
  uid: string;
  mobileNumber: string;
  fullName: string;
  role: UserRole;
  isApproved: boolean;
  avatarUrl?: string;
  villageAddress?: string;
  bio?: string;
  areasOfInterest?: string[];
  isPhonePublic: boolean;
  joinedAt?: string;
  createdAt: string;
  exitedAt?: string;
  exitReason?: string;
}

export type MemberStatus = 'active' | 'pending' | 'inactive' | 'exited';

export interface MemberProfile {
  id: string;
  userId: string;
  fullName: string;
  mobileNumber: string;
  avatarUrl?: string;
  bio?: string;
  villageAddress?: string;
  areasOfInterest?: string[];
  isPhonePublic: boolean;
  role: UserRole;
  joinedAt: string;
  exitedAt?: string;
  status?: MemberStatus;
  statusNote?: string;
  lastActiveAt?: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  fullName: string;
  mobileNumber: string;
  photoUrl?: string;
  villageAddress?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  isPhonePublic: boolean;
  createdAt: string;
}

export interface ChatPollOption {
  text: string;
  votes: number;
  pct: number;
}

export interface ChatPollResult {
  pollId: string;
  question: string;
  totalVotes: number;
  status: 'active' | 'closed';
  winningOptionText: string;
  winningOptionPct: number;
  options: ChatPollOption[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  audioDuration?: number;
  fileName?: string;
  replyToId?: string;
  replyToText?: string;
  replyToSender?: string;
  isDeleted?: boolean;
  isAnnouncement?: boolean;
  pollResult?: ChatPollResult;
  createdAt: string;
}

export type ActivityType =
  | 'member_joined'
  | 'poll_created'
  | 'poll_vote'
  | 'poll_closed'
  | 'issue_resolved'
  | 'announcement';

export interface MemberActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  actorName: string;
  actorAvatar?: string;
  targetId?: string;
  badge?: string;
  meta?: {
    votes?: number;
    winner?: string;
    category?: string;
    resolutionNote?: string;
  };
}

export interface DiscussionReply {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  audioDuration?: number;
  createdAt: string;
}

export interface DiscussionTopic {
  id: string;
  title: string;
  category: string;
  description: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  audioDuration?: number;
  authorId: string;
  authorName: string;
  isPinned: boolean;
  isClosed: boolean;
  replyCount: number;
  replies?: DiscussionReply[];
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  description?: string;
  createdBy: string;
  authorName: string;
  status: 'active' | 'closed';
  deadline: string;
  totalVotes: number;
  options: PollOption[];
  userVotedOptionId?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  authorId: string;
  authorName: string;
  isPinned: boolean;
  createdAt: string;
  eventDate?: string;
  eventLocation?: string;
  isEvent?: boolean;
  priority?: 'urgent' | 'high' | 'normal';
  isUrgent?: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'message' | 'announcement' | 'poll' | 'membership' | 'emergency' | 'issue' | 'reminder';
  isRead: boolean;
  link?: string;
  reminderKey?: string;
  targetId?: string;
  targetType?: 'poll' | 'event';
  deadline?: string;
  createdAt: string;
}

export type IssuePriority = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface IssueReport {
  id: string;
  reportedBy: string;
  reporterName: string;
  reporterPhone: string;
  title: string;
  category: string;
  description: string;
  imageUrl?: string;
  priority: IssuePriority;
  status: IssueStatus;
  adminResponse?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmergencyReport {
  id: string;
  reportedBy: string;
  reporterName: string;
  reporterPhone: string;
  category: 'Medical' | 'Fire' | 'Electrical' | 'Security' | 'Accident' | 'Other';
  description: string;
  photoUrl?: string;
  isActive: boolean;
  priority: 'CRITICAL';
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AppSettings {
  mandaliName: string;
  villageName: string;
  logoUrl?: string;
  contactPhone: string;
  bannerText?: string;
  updatedAt: string;
}

export interface AdminAction {
  id: string;
  adminId: string;
  adminName: string;
  actionType: string;
  targetEntity: string;
  targetId: string;
  details: string;
  createdAt: string;
}
