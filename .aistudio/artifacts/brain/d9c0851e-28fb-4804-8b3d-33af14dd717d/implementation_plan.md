# Ganesh Mitra Mandali — Community Mobile & Web Platform (H. Hosahalli)

A full-stack, production-grade community mobile application and PWA for Ganesh Mitra Mandali (H. Hosahalli), providing real-time communication, member lifecycle management, democratic polls, announcements, issue tracking, and emergency response with a clean devotional vermilion-and-amber aesthetic.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and design decisions have been established based on your inputs:
>
> - **Confirmed: Authentication Strategy**: Mobile number with instant SMS OTP verification (simulation-supported with instant copyable OTP code display for local testing and secure session tokens).
> - **Confirmed: Visual Identity & Emblem**: Minimalist modern vermilion (#DC2626) and warm amber (#F59E0B / #D97706) Lord Ganesha icon with custom admin logo upload and image replacement capability.
> - **Confirmed: Data Persistence & Real-time Sync**: Relational database architecture targeting Cloud SQL PostgreSQL (via Drizzle ORM and connection pooling) paired with Express WebSocket / Socket.IO real-time event streaming for instant chat, alerts, polls, and status updates.
> - **Strict Zero-Fake Data Policy**: Database starts 100% empty of members, chat messages, polls, and issues. Only the core mandali system configuration (Name: Ganesh Mitra Mandali, Village: H. Hosahalli) is pre-configured.

---

## 1. Overview & Core Concept

- **What It Does**: Ganesh Mitra Mandali is a dedicated mobile-first digital platform for the village community of H. Hosahalli. It bridges traditional mandali operations with contemporary digital community tools: public registration, admin approval, verified public directory, real-time WhatsApp-style group communication with emoji and message replies, structured mandali topic discussions, democratic member voting/polls, village announcements, structured civic/event issue reporting, and immediate multi-channel emergency broadcasting.
- **Target Audience / Persona**:
  1. *Public Villagers & Devotees*: Discover mandali details, browse verified public member roster, review event schedules, and submit join requests.
  2. *Registered & Approved Members*: Participate in daily coordination chats, vote in festival decisions, raise issues (electrical, sound, cleaning), and trigger high-priority emergency alerts.
  3. *Mandali Administrators & Committee*: Review and verify member applications, moderate group chats, publish official schedules, analyze poll results, manage issue resolutions, and configure mandali branding.
- **Key Value**: Replaces scattered messaging groups and informal paperwork with an authoritative, transparent, secure community operating system built specifically for the village of H. Hosahalli.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Guest & Onboarding Flow**:
   - Splash screen with Lord Ganesha vermilion emblem and subtle entrance reveal ("Ganesh Mitra Mandali — H. Hosahalli").
   - Public Home screen displaying verified member tally, pinned festival notices, and quick-action cards.
   - "Join Mandali" modal form: Full Name, 10-digit Mobile Number, optional profile photo upload, optional village details/address, public directory consent checkbox.
   - Instant OTP verification screen, transitioning to "Request Submitted — Awaiting Administrator Approval".

2. **Member Experience Flow**:
   - Bottom tab navigation: **Home**, **Members**, **Chat**, **Announcements**, **Profile** (plus quick emergency action floating button).
   - Real-time WhatsApp-style group chat with instant message delivery, reply threading, timestamps, online presence badge, and search.
   - Structured Topic Discussions: arrangements, pooja schedules, cultural programs, prasada distribution, volunteer assignments, and finances.
   - Group Decisions & Polls: Active votes with instant bar visualization, participant count, and countdown deadlines.
   - Issue Reporting: Form with categories (Electricity, Sound, Cleaning, Water, Safety), priority selector, photo attachment, and live status tracker (Open, In Progress, Resolved).
   - Dedicated Emergency Trigger: Two-step confirmation modal with categorized panic reasons (Medical, Fire, Electrical, Security) that triggers an immediate high-priority alert banner across all connected users.

3. **Administrator Governance Flow**:
   - Secure Admin Dashboard tab (accessible only by authenticated admins with valid credentials).
   - Pending Join Requests: One-tap Approve / Reject actions with automatic welcome notification.
   - Member Directory Management: Role elevation, public contact visibility toggle, member deactivation.
   - Content Moderation: Pin announcements, close polls, moderate chat messages, and manage emergency incidents with resolution notes.
   - Brand & Settings: Logo replacement upload mechanism and mandali profile editor.

### Visual Identity & Theme

- **Aesthetic Direction**: Sacred cultural reverence paired with crisp modern mobile ergonomics. Respectful, clean, utilitarian, and warm without excessive decorative clutter or sensory overload.
- **Color Palette (60-30-10 Rule)**:
  - *Dominant Canvas (60%)*: Warm soft cream and pearl white (`#FAFAF8` / `#FFFFFF` in light mode; deep slate-black `#0F172A` in dark mode).
  - *Structural Surfaces (30%)*: Subdued card surfaces (`#F1F1EB` / `#1E293B`) with crisp hairline borders (`rgba(0,0,0,0.06)` or `#E2E8F0`).
  - *Accent & Sacred Budget (10%)*: Vermilion Red (`#DC2626` / `#B91C1C`) and Marigold Gold/Amber (`#D97706` / `#F59E0B`), applied strictly to primary interactive CTAs, active tab icons, and emergency alerts.
- **Typography & Scale**:
  - *Display / Brand*: `Plus Jakarta Sans` (weights 600, 700, 800) for confident title hierarchy.
  - *Body Prose*: `Inter` / `Plus Jakarta Sans` (weight 400, 500; 15px–16px; 1.5 line-height).
  - *Tabular Figures*: `tabular-nums` for member counters, poll percentages, and timestamps.
- **Ergonomics & Touch**:
  - Mobile bottom navigation bar ($64\text{px}$ touch height) with $48 \times 48\text{px}$ minimum hitboxes.
  - Desktop responsive expansion to a clean 3-column dashboard (`max-w-6xl` centered layout) with full keyboard navigation.
  - PWA installability prompt with iOS Safari Add-to-Home-Screen instructions and Android native installation triggers.

---

## 3. Key Product Decisions & Trade-Offs

- **Authentication: Mobile OTP + Role-Based Session**:
  - *Decision*: Secure phone-based authentication with OTP verification. Provides a built-in development OTP simulator/auto-fill banner so developers and evaluators can log in as Admin or Member instantly without a third-party paid SMS gateway blocker.
  - *Why*: In rural village contexts, phone numbers are the primary identity token, not passwords.
- **Relational Cloud SQL / Drizzle Architecture with Graceful Fallback**:
  - *Decision*: Strictly implement the Cloud SQL setup protocol per skill guidelines (Consent Gate via `show_aistudio_ui`, provisioning, Drizzle ORM schema, and `pg.Pool` connection pooling).
  - *Why*: High data integrity across 18+ interconnected relational entities (memberships, join requests, chat replies, poll votes, issue updates, and audit logs).
- **Real-Time Communication**:
  - *Decision*: WebSocket / Socket.IO event server integrated with Express backend for instantaneous chat messaging, live typing/online indicators, poll vote streaming, and instant emergency broadcasts.
- **Zero Dummy Data Guarantee**:
  - *Decision*: Empty states designed with meaningful guidance ("No members have joined yet. Tap 'Join Mandali' to become the first member!") instead of placeholder rows.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Client Layer (React 19 + PWA)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Top App Bar (Logo, Brand Title, Search, Notification Bell, PWA Install)   │
│  ├─ Home View (Counters, Quick Actions, Pinned Notice, Upcoming Event)      │
│  ├─ Members Directory (Approved Members, Role Badges, Search & Filter)     │
│  ├─ Real-Time Chat (WhatsApp Style, Replies, Emojis, System Messages)       │
│  ├─ Discussions & Polls (Decisions, Live Voting, Topic Categories)          │
│  ├─ Issue & Emergency Desk (Photo Upload, Status Track, Panic Broadcast)    │
│  └─ Admin Console (Approvals, Role Mgmt, Moderation, Audit Log, Logo Setup) │
│  Bottom Tab Bar (Mobile Ergonomics, Thumb Reach Zone)                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST + WebSockets (Socket.IO)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    Express Full-Stack Server (server.ts)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Auth Middleware (Bearer Token / Mobile Session Verification)             │
│  • Rate Limiting & Input Validation (Zod schemas)                           │
│  • WebSocket Gateway (Chat rooms, notification dispatcher, emergency push)  │
│  • File / Image Upload Handler (Multer with size/MIME verification)         │
│  • REST Endpoints:                                                          │
│    /api/auth/*       (request-otp, verify-otp, session, logout)             │
│    /api/members/*    (directory, join-request, approve, reject, role)       │
│    /api/messages/*   (history, send, reply, delete, moderate)              │
│    /api/polls/*      (list, create, vote, close)                            │
│    /api/issues/*     (submit, list, update-status, resolve)                 │
│    /api/emergency/*  (panic-alert, active-alerts, resolve)                  │
│    /api/settings/*   (logo-upload, mandali-info, audit-logs)                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Drizzle ORM (Connection Pool)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                   PostgreSQL Database (Cloud SQL)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  • users               • join_requests       • issue_reports                │
│  • profiles            • chat_messages       • issue_updates                │
│  • memberships         • message_replies     • emergency_reports            │
│  • announcements       • discussions         • admin_actions (Audit Log)    │
│  • polls & poll_votes  • notifications       • app_settings & logo          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Relational Entities

1. `users`: `id`, `mobile_number`, `role` (public, member, admin), `is_active`, `created_at`
2. `profiles`: `id`, `user_id`, `full_name`, `avatar_url`, `bio`, `address`, `is_phone_public`, `joined_at`
3. `join_requests`: `id`, `user_id`, `full_name`, `mobile_number`, `photo_url`, `village_address`, `status` (pending, approved, rejected), `admin_note`, `created_at`
4. `chat_messages`: `id`, `sender_id`, `text`, `reply_to_id`, `is_deleted`, `is_announcement`, `created_at`
5. `polls` & `poll_options` & `poll_votes`: `id`, `question`, `description`, `created_by`, `status` (active, closed), `deadline`, `option_id`, `user_id`
6. `announcements`: `id`, `title`, `content`, `category`, `is_pinned`, `author_id`, `created_at`
7. `issue_reports`: `id`, `reported_by`, `title`, `category`, `description`, `image_url`, `priority`, `status` (open, in_progress, resolved), `resolved_at`
8. `emergency_reports`: `id`, `reported_by`, `category`, `description`, `photo_url`, `is_active`, `resolved_by`, `created_at`
9. `admin_actions`: `id`, `admin_id`, `action_type`, `target_entity`, `target_id`, `details`, `created_at`
10. `app_settings`: `key`, `value`, `updated_at` (stores mandali name, village name, active logo URL)

---

## 5. Execution Steps

1. **Step 1: Database & Cloud SQL Provisioning Gate**: Execute eligibility check via `rpc_action`, display Cloud SQL Consent UI, and configure Drizzle schema and connection pooling.
2. **Step 2: Server & Real-Time Socket Architecture**: Create `server.ts` with Express, Socket.IO, authentication routes, member lifecycle handlers, chat websockets, and audit logging.
3. **Step 3: Frontend Layout & Divine Vermilion Design**: Build responsive mobile-first shell with splash screen, Ganesha branding, PWA manifest, and bottom navigation.
4. **Step 4: Membership & Directory Module**: Implement zero-fake-data public member directory, join request flow with OTP verification, and admin approval workflows.
5. **Step 5: WhatsApp-Style Group Chat & Discussions**: Real-time message exchange with replies, deletion, message moderation, and discussion threads.
6. **Step 6: Polls, Decisions & Announcements**: Admin poll creation, live option voting, deadline countdowns, and pinned announcements.
7. **Step 7: Issue Reporting & Emergency Panic Protocol**: Secure problem ticketing, status lifecycles, and prominent emergency alert system.
8. **Step 8: Admin Dashboard & Settings**: Comprehensive management console with audit logging and custom logo upload.
9. **Step 9: PWA, Responsive Testing & Build Verification**: Add service worker, install prompts, offline state indicators, and run `compile_applet`.
