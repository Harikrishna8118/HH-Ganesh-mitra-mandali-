import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import type {
  AppSettings,
  MemberProfile,
  JoinRequest,
  ChatMessage,
  ChatPollResult,
  DiscussionTopic,
  DiscussionReply,
  Poll,
  Announcement,
  IssueReport,
  EmergencyReport,
  NotificationItem,
  AdminAction,
  UserRole,
  IssueStatus,
  MemberStatus,
} from '../types.ts';

/**
 * Recursively strips undefined fields from an object so Firestore operations never fail
 * with 'Unsupported field value: undefined'.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        sanitized[key] = sanitizeForFirestore(val);
      }
    }
    return sanitized as T;
  }
  return data;
}

// Default App Settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
  mandaliName: 'Ganesh Mitra Mandali',
  villageName: 'H. Hosahalli',
  contactPhone: '+91 98450 12345',
  bannerText: 'Welcome to Ganesh Mitra Mandali, H. Hosahalli. Connecting our village community for Ganesh Chaturthi.',
  updatedAt: new Date().toISOString(),
};

/* -------------------------------------------------------------
 * App Settings & Logo
 * ----------------------------------------------------------- */
export function subscribeSettings(callback: (settings: AppSettings) => void) {
  const docRef = doc(db, 'app_settings', 'config');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as AppSettings);
      } else {
        // Fallback to in-memory default settings without unneeded write
        callback(DEFAULT_APP_SETTINGS);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'app_settings/config');
      callback(DEFAULT_APP_SETTINGS);
    }
  );
}

export async function updateAppSettings(settings: Partial<AppSettings>, adminId: string, adminName: string) {
  const docRef = doc(db, 'app_settings', 'config');
  const payload = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });
  await logAdminAction(adminId, adminName, 'UPDATE_SETTINGS', 'AppSettings', 'config', 'Updated mandali branding/details');
}

/* -------------------------------------------------------------
 * Member Directory & Profiles (Approved only)
 * ----------------------------------------------------------- */
export function subscribeProfiles(callback: (profiles: MemberProfile[]) => void) {
  const q = query(collection(db, 'profiles'), orderBy('joinedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: MemberProfile[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as MemberProfile);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
      callback([]);
    }
  );
}

export async function updateProfile(userId: string, updates: Partial<MemberProfile>) {
  const docRef = doc(db, 'profiles', userId);
  await setDoc(docRef, sanitizeForFirestore(updates), { merge: true });
}

/**
 * Updates a member's visual status (Active, Pending, Inactive) for community directory oversight.
 */
export async function updateMemberStatus(
  userId: string,
  newStatus: MemberStatus,
  adminId?: string,
  adminName?: string,
  statusNote?: string
) {
  const profileRef = doc(db, 'profiles', userId);
  const updates: Record<string, any> = {
    status: newStatus,
    statusUpdatedAt: new Date().toISOString(),
  };
  if (statusNote !== undefined && statusNote.trim().length > 0) {
    updates.statusNote = statusNote.trim();
  }
  await updateDoc(profileRef, sanitizeForFirestore(updates));

  // Sync status to user document
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { status: newStatus }, { merge: true });
  } catch {
    // Optional user doc sync note handled
  }

  // Record admin action for community oversight log
  if (adminId && adminName) {
    await logAdminAction(
      adminId,
      adminName,
      'UPDATE_MEMBER_STATUS',
      'Profile',
      userId,
      `Changed member status to ${newStatus.toUpperCase()}${statusNote ? ` (${statusNote})` : ''}`
    );
  }
}

/* -------------------------------------------------------------
 * Membership Join Requests
 * ----------------------------------------------------------- */
export function subscribeJoinRequests(callback: (requests: JoinRequest[]) => void) {
  const q = query(collection(db, 'join_requests'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: JoinRequest[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as JoinRequest);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'join_requests');
      callback([]);
    }
  );
}

export async function submitJoinRequest(reqData: Omit<JoinRequest, 'id' | 'createdAt' | 'status'>) {
  const colRef = collection(db, 'join_requests');
  const payload: Omit<JoinRequest, 'id'> = {
    ...reqData,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const docCreated = await addDoc(colRef, sanitizeForFirestore(payload));

  // Send admin notification
  await createNotification({
    userId: 'admin',
    title: 'New Membership Application',
    message: `${reqData.fullName} from H. Hosahalli requested to join Ganesh Mitra Mandali.`,
    type: 'membership',
    link: 'admin',
  });

  return docCreated.id;
}

export async function approveJoinRequest(
  request: JoinRequest,
  adminId: string,
  adminName: string
) {
  // 1. Mark request as approved
  const reqRef = doc(db, 'join_requests', request.id);
  await updateDoc(reqRef, { status: 'approved' });

  // 2. Add to public profiles
  const profileRef = doc(db, 'profiles', request.userId);
  const newProfile: MemberProfile = {
    id: request.userId,
    userId: request.userId,
    fullName: request.fullName,
    mobileNumber: request.mobileNumber,
    avatarUrl: request.photoUrl,
    villageAddress: request.villageAddress,
    isPhonePublic: request.isPhonePublic,
    role: 'member',
    joinedAt: new Date().toISOString(),
    status: 'active',
  };
  await setDoc(profileRef, sanitizeForFirestore(newProfile));

  // 3. Update user role
  const userRef = doc(db, 'users', request.userId);
  await setDoc(userRef, { role: 'member', isApproved: true }, { merge: true });

  // 4. Notify member
  await createNotification({
    userId: request.userId,
    title: 'Membership Approved!',
    message: `Congratulations ${request.fullName}, your membership in Ganesh Mitra Mandali has been approved!`,
    type: 'membership',
    link: 'members',
  });

  // 5. System announcement in chat
  await sendChatMessage({
    senderId: 'system',
    senderName: 'Mandali System',
    senderRole: 'admin',
    text: `🎉 Welcome ${request.fullName} to Ganesh Mitra Mandali!`,
    isAnnouncement: true,
  });

  // 6. Log admin action
  await logAdminAction(
    adminId,
    adminName,
    'APPROVE_MEMBER',
    'JoinRequest',
    request.id,
    `Approved membership for ${request.fullName}`
  );
}

export async function rejectJoinRequest(
  requestId: string,
  userId: string,
  fullName: string,
  adminNote: string,
  adminId: string,
  adminName: string
) {
  const reqRef = doc(db, 'join_requests', requestId);
  await updateDoc(reqRef, { status: 'rejected', adminNote });

  await createNotification({
    userId: userId,
    title: 'Membership Update',
    message: `Your membership request was reviewed: ${adminNote || 'Contact committee administrator for details.'}`,
    type: 'membership',
    link: 'join',
  });

  await logAdminAction(
    adminId,
    adminName,
    'REJECT_MEMBER',
    'JoinRequest',
    requestId,
    `Rejected request of ${fullName}. Reason: ${adminNote}`
  );
}

export async function removeMember(
  userId: string,
  fullName: string,
  adminId: string,
  adminName: string
) {
  await deleteDoc(doc(db, 'profiles', userId));
  await updateDoc(doc(db, 'users', userId), { role: 'public', isApproved: false });

  await logAdminAction(
    adminId,
    adminName,
    'REMOVE_MEMBER',
    'Profile',
    userId,
    `Removed ${fullName} from approved members`
  );
}

/**
 * Voluntary Exit from Mandali:
 * A member can voluntarily step down or exit from the mandali anytime as their wish.
 * Removes their public profile from directory and transitions user to Devotee (public).
 */
export async function exitMandali(
  userId: string,
  fullName: string,
  reason?: string
) {
  const now = new Date().toISOString();

  // 1. Remove profile from public approved member directory
  try {
    await deleteDoc(doc(db, 'profiles', userId));
  } catch {
    // Profile might already be removed
  }

  // 2. Transition user account to public visitor
  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      role: 'public',
      isApproved: false,
      exitedAt: now,
      exitReason: reason?.trim() || 'Voluntary exit as per member wish',
    },
    { merge: true }
  );

  // 3. Remove admin privilege if had any
  try {
    await deleteDoc(doc(db, 'admins', userId));
  } catch {
    // Ignore if not an admin
  }

  // 4. Log voluntary exit in mandali audit log
  await logAdminAction(
    userId,
    fullName,
    'VOLUNTARY_EXIT',
    'Profile',
    userId,
    `${fullName} voluntarily exited from Ganesh Mitra Mandali. Reason: ${reason?.trim() || 'Personal choice'}`
  );

  // 5. Send personal notification
  await createNotification({
    userId,
    title: 'Exited Ganesh Mitra Mandali',
    message: `You have voluntarily stepped down from Ganesh Mitra Mandali membership. You are now browsing as a Devotee. You are always welcome to edit your profile or rejoin anytime as your wish!`,
    type: 'membership',
    link: 'profile',
  });
}

/**
 * Rejoin Mandali:
 * Allows a previously exited member or visitor to rejoin Ganesh Mitra Mandali.
 */
export async function rejoinMandali(
  userId: string,
  fullName: string,
  mobileNumber: string,
  villageAddress?: string,
  avatarUrl?: string
) {
  const now = new Date().toISOString();

  // 1. Create / Restore active profile
  const profileRef = doc(db, 'profiles', userId);
  const restoredProfile: MemberProfile = {
    id: userId,
    userId,
    fullName: fullName.trim(),
    mobileNumber: mobileNumber.replace(/\D/g, '').slice(-10),
    avatarUrl: avatarUrl?.trim() || undefined,
    villageAddress: villageAddress?.trim() || 'H. Hosahalli',
    isPhonePublic: false,
    role: 'member',
    joinedAt: now,
    status: 'active',
  };
  await setDoc(profileRef, restoredProfile, { merge: true });

  // 2. Update user document
  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      role: 'member',
      isApproved: true,
      joinedAt: now,
      exitedAt: null,
      exitReason: null,
    },
    { merge: true }
  );

  // 3. Log audit action
  await logAdminAction(
    userId,
    fullName,
    'REJOIN_MANDALI',
    'Profile',
    userId,
    `${fullName} rejoined Ganesh Mitra Mandali as active member`
  );

  // 4. Notify member
  await createNotification({
    userId,
    title: 'Welcome Back to Mandali!',
    message: `You have successfully rejoined Ganesh Mitra Mandali. Your member privileges and event pass are now active!`,
    type: 'membership',
    link: 'members',
  });
}

export async function changeMemberRole(
  userId: string,
  fullName: string,
  newRole: UserRole,
  adminId: string,
  adminName: string
) {
  await updateDoc(doc(db, 'profiles', userId), { role: newRole });
  await updateDoc(doc(db, 'users', userId), { role: newRole });

  if (newRole === 'admin') {
    await setDoc(doc(db, 'admins', userId), { uid: userId, addedBy: adminId });
  } else {
    await deleteDoc(doc(db, 'admins', userId));
  }

  await logAdminAction(
    adminId,
    adminName,
    'CHANGE_ROLE',
    'Profile',
    userId,
    `Changed role of ${fullName} to ${newRole}`
  );
}

/* -------------------------------------------------------------
 * WhatsApp-Style Group Chat Messages
 * ----------------------------------------------------------- */
export function subscribeChatMessages(callback: (messages: ChatMessage[]) => void) {
  const q = query(collection(db, 'chat_messages'), orderBy('createdAt', 'asc'), limit(150));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ChatMessage);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chat_messages');
      callback([]);
    }
  );
}

export async function sendChatMessage(msgData: Omit<ChatMessage, 'id' | 'createdAt'>) {
  const colRef = collection(db, 'chat_messages');
  const payload = sanitizeForFirestore({
    ...msgData,
    createdAt: new Date().toISOString(),
  });
  return await addDoc(colRef, payload);
}

export async function deleteChatMessage(
  messageId: string,
  adminId?: string,
  adminName?: string
) {
  const docRef = doc(db, 'chat_messages', messageId);
  await updateDoc(docRef, { isDeleted: true, text: 'This message was deleted' });

  if (adminId && adminName) {
    await logAdminAction(adminId, adminName, 'DELETE_CHAT_MESSAGE', 'ChatMessage', messageId, 'Moderated chat message');
  }
}

export async function sharePollResultsToChat(
  poll: Poll,
  senderId: string,
  senderName: string,
  senderRole: UserRole,
  customComment?: string
) {
  const totalVotes = poll.totalVotes || 0;
  const optionsWithPct = (poll.options || []).map((opt) => {
    const votes = opt.votes || 0;
    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
    return {
      text: opt.text,
      votes,
      pct,
    };
  });

  const sorted = [...optionsWithPct].sort((a, b) => b.votes - a.votes);
  const winner = sorted[0];

  const pollResult: ChatPollResult = {
    pollId: poll.id,
    question: poll.question,
    totalVotes,
    status: poll.status,
    winningOptionText: winner && winner.votes > 0 ? winner.text : (winner?.text || 'No votes yet'),
    winningOptionPct: winner && winner.votes > 0 ? winner.pct : 0,
    options: optionsWithPct,
  };

  const text = customComment && customComment.trim().length > 0
    ? customComment.trim()
    : `📊 Shared Poll Decision: "${poll.question}" (${totalVotes} votes counted)`;

  return await sendChatMessage({
    senderId,
    senderName,
    senderRole,
    text,
    pollResult,
  });
}

/* -------------------------------------------------------------
 * Structured Topic Discussions
 * ----------------------------------------------------------- */
export function subscribeDiscussions(callback: (discussions: DiscussionTopic[]) => void) {
  const q = query(collection(db, 'discussions'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: DiscussionTopic[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as DiscussionTopic);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'discussions');
      callback([]);
    }
  );
}

export async function createDiscussion(topic: Omit<DiscussionTopic, 'id' | 'createdAt' | 'replyCount'>) {
  const colRef = collection(db, 'discussions');
  const payload = {
    ...topic,
    replyCount: 0,
    createdAt: new Date().toISOString(),
  };
  return await addDoc(colRef, sanitizeForFirestore(payload));
}

export async function subscribeDiscussionReplies(
  discussionId: string,
  callback: (replies: DiscussionReply[]) => void
) {
  const q = query(
    collection(db, `discussions/${discussionId}/replies`),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: DiscussionReply[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as DiscussionReply);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `discussions/${discussionId}/replies`);
      callback([]);
    }
  );
}

export async function addDiscussionReply(
  discussionId: string,
  authorId: string,
  authorName: string,
  text: string,
  mediaUrl?: string,
  mediaType?: 'image' | 'video'
) {
  const colRef = collection(db, `discussions/${discussionId}/replies`);
  const payload = {
    authorId,
    authorName,
    text,
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || null,
    createdAt: new Date().toISOString(),
  };
  await addDoc(colRef, sanitizeForFirestore(payload));

  // Increment reply count
  const discRef = doc(db, 'discussions', discussionId);
  const snap = await getDoc(discRef);
  if (snap.exists()) {
    const cur = snap.data().replyCount || 0;
    await updateDoc(discRef, { replyCount: cur + 1 });
  }
}

/* -------------------------------------------------------------
 * Democratic Polls & Group Decisions
 * ----------------------------------------------------------- */
export function subscribePolls(callback: (polls: Poll[]) => void) {
  const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Poll[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Poll);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'polls');
      callback([]);
    }
  );
}

export async function createPoll(
  pollData: Omit<Poll, 'id' | 'createdAt' | 'totalVotes'>,
  adminId: string,
  adminName: string
) {
  const colRef = collection(db, 'polls');
  const payload = {
    ...pollData,
    totalVotes: 0,
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(colRef, sanitizeForFirestore(payload));

  await logAdminAction(adminId, adminName, 'CREATE_POLL', 'Poll', docRef.id, `Created poll: "${pollData.question}"`);

  // Notification for all members with deadline info
  const deadlineStr = pollData.deadline ? ` (Deadline: ${new Date(pollData.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })})` : '';
  await createNotification({
    userId: 'all',
    title: 'New Decision Poll',
    message: `Mandali decision voting opened: ${pollData.question}${deadlineStr}. Automated reminder will alert members 24h prior.`,
    type: 'poll',
    link: 'discussions',
  });

  return docRef.id;
}

export async function voteInPoll(pollId: string, optionId: string, userId: string) {
  const voteRef = doc(db, `polls/${pollId}/votes`, userId);
  const voteSnap = await getDoc(voteRef);

  if (voteSnap.exists()) {
    throw new Error('You have already cast your vote in this poll.');
  }

  // Record member vote
  await setDoc(voteRef, {
    pollId,
    optionId,
    userId,
    votedAt: new Date().toISOString(),
  });

  // Update poll option vote count
  const pollRef = doc(db, 'polls', pollId);
  const pollSnap = await getDoc(pollRef);
  if (pollSnap.exists()) {
    const data = pollSnap.data() as Poll;
    const updatedOptions = (data.options || []).map((opt) =>
      opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
    );
    await updateDoc(pollRef, {
      options: updatedOptions,
      totalVotes: (data.totalVotes || 0) + 1,
    });
  }
}

export async function closePoll(pollId: string, adminId: string, adminName: string) {
  const pollRef = doc(db, 'polls', pollId);
  await updateDoc(pollRef, { status: 'closed' });
  await logAdminAction(adminId, adminName, 'CLOSE_POLL', 'Poll', pollId, 'Closed decision poll');
}

/* -------------------------------------------------------------
 * Announcements
 * ----------------------------------------------------------- */
export function subscribeAnnouncements(callback: (announcements: Announcement[]) => void) {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Announcement[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Announcement);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
      callback([]);
    }
  );
}

export async function createAnnouncement(
  data: Omit<Announcement, 'id' | 'createdAt'>,
  adminId: string,
  adminName: string
) {
  const colRef = collection(db, 'announcements');
  const payload = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(colRef, sanitizeForFirestore(payload));

  await logAdminAction(
    adminId,
    adminName,
    'CREATE_ANNOUNCEMENT',
    'Announcement',
    docRef.id,
    `Published announcement: "${data.title}"`
  );

  // In-app alert
  if (data.eventDate) {
    const formatted = new Date(data.eventDate).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) + ' at ' + new Date(data.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await createNotification({
      userId: 'all',
      title: `📅 Event Scheduled: ${data.title}`,
      message: `Scheduled for ${formatted} at ${data.eventLocation || 'Ganesh Mandapa, H. Hosahalli'}. 24h reminder will alert members prior to the event!`,
      type: 'announcement',
      link: 'announcements',
    });
  } else {
    await createNotification({
      userId: 'all',
      title: `Notice: ${data.title}`,
      message: data.content.slice(0, 100) + '...',
      type: 'announcement',
      link: 'announcements',
    });
  }

  return docRef.id;
}

export async function deleteAnnouncement(announcementId: string, adminId: string, adminName: string) {
  await deleteDoc(doc(db, 'announcements', announcementId));
  await logAdminAction(adminId, adminName, 'DELETE_ANNOUNCEMENT', 'Announcement', announcementId, 'Deleted announcement');
}

/* -------------------------------------------------------------
 * Problem & Issue Reporting
 * ----------------------------------------------------------- */
export function subscribeIssues(callback: (issues: IssueReport[]) => void) {
  const q = query(collection(db, 'issue_reports'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: IssueReport[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as IssueReport);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issue_reports');
      callback([]);
    }
  );
}

export async function reportIssue(issue: Omit<IssueReport, 'id' | 'createdAt' | 'status'>) {
  const colRef = collection(db, 'issue_reports');
  const payload: Omit<IssueReport, 'id'> = {
    ...issue,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(colRef, sanitizeForFirestore(payload));

  // Notify admins
  await createNotification({
    userId: 'admin',
    title: `Issue Reported: ${issue.title}`,
    message: `Category: ${issue.category} | Reported by ${issue.reporterName}`,
    type: 'issue',
    link: 'admin',
  });

  return docRef.id;
}

export async function updateIssueStatus(
  issueId: string,
  status: IssueStatus,
  adminResponse: string,
  reporterId: string,
  adminId: string,
  adminName: string
) {
  const docRef = doc(db, 'issue_reports', issueId);
  await updateDoc(docRef, {
    status,
    adminResponse,
    updatedAt: new Date().toISOString(),
  });

  // Notify original reporter
  if (reporterId) {
    await createNotification({
      userId: reporterId,
      title: `Issue Status: ${status.toUpperCase()}`,
      message: `Your reported issue status changed to ${status}. Response: ${adminResponse || 'No note added.'}`,
      type: 'issue',
      link: 'issues',
    });
  }

  await logAdminAction(
    adminId,
    adminName,
    'UPDATE_ISSUE_STATUS',
    'IssueReport',
    issueId,
    `Updated issue status to ${status}`
  );
}

/* -------------------------------------------------------------
 * Emergency Reporting System
 * ----------------------------------------------------------- */
export function subscribeEmergencies(callback: (emergencies: EmergencyReport[]) => void) {
  const q = query(collection(db, 'emergency_reports'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: EmergencyReport[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as EmergencyReport);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'emergency_reports');
      callback([]);
    }
  );
}

export async function reportEmergency(
  emergencyData: Omit<EmergencyReport, 'id' | 'createdAt' | 'isActive' | 'priority'>
) {
  const colRef = collection(db, 'emergency_reports');
  const payload: Omit<EmergencyReport, 'id'> = {
    ...emergencyData,
    isActive: true,
    priority: 'CRITICAL',
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(colRef, sanitizeForFirestore(payload));

  // Broadcast immediate emergency alert notification to all users
  await createNotification({
    userId: 'all',
    title: `🚨 EMERGENCY ALERT: ${emergencyData.category}`,
    message: `${emergencyData.description} (Reported by ${emergencyData.reporterName})`,
    type: 'emergency',
    link: 'home',
  });

  return docRef.id;
}

export async function resolveEmergency(
  emergencyId: string,
  resolutionNotes: string,
  adminId: string,
  adminName: string
) {
  const docRef = doc(db, 'emergency_reports', emergencyId);
  await updateDoc(docRef, {
    isActive: false,
    resolvedBy: adminName,
    resolutionNotes,
    resolvedAt: new Date().toISOString(),
  });

  await logAdminAction(
    adminId,
    adminName,
    'RESOLVE_EMERGENCY',
    'EmergencyReport',
    emergencyId,
    `Resolved emergency report. Notes: ${resolutionNotes}`
  );
}

/* -------------------------------------------------------------
 * Notifications System
 * ----------------------------------------------------------- */
export function subscribeNotifications(
  userId: string,
  isAdmin: boolean,
  callback: (notifications: NotificationItem[]) => void
) {
  const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: NotificationItem[] = [];
      snapshot.forEach((d) => {
        const item = { id: d.id, ...d.data() } as NotificationItem;
        if (item.userId === 'all' || item.userId === userId || (isAdmin && item.userId === 'admin')) {
          list.push(item);
        }
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      callback([]);
    }
  );
}

export async function createNotification(
  notification: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>
) {
  const colRef = collection(db, 'notifications');
  const payload: Omit<NotificationItem, 'id'> = {
    ...notification,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  await addDoc(colRef, sanitizeForFirestore(payload));
}

export async function markNotificationAsRead(notificationId: string) {
  const docRef = doc(db, 'notifications', notificationId);
  await updateDoc(docRef, { isRead: true });
}

/* -------------------------------------------------------------
 * Administrator Audit Log
 * ----------------------------------------------------------- */
export function subscribeAdminActions(callback: (actions: AdminAction[]) => void) {
  const q = query(collection(db, 'admin_actions'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: AdminAction[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AdminAction);
      });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admin_actions');
      callback([]);
    }
  );
}

export async function logAdminAction(
  adminId: string,
  adminName: string,
  actionType: string,
  targetEntity: string,
  targetId: string,
  details: string
) {
  try {
    const colRef = collection(db, 'admin_actions');
    await addDoc(colRef, sanitizeForFirestore({
      adminId,
      adminName,
      actionType,
      targetEntity,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    }));
  } catch {
    // Admin audit write skipped if offline or permissions restricted
  }
}
