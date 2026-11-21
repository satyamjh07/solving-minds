# Solving Minds — Architectural Walkthrough & Codebase Guide

Welcome to the comprehensive architectural and functional walkthrough for **Solving Minds**, a competitive examination preparation ecosystem designed for **JEE (Main & Advanced)** and **NEET** aspirants.

This document details the codebase architecture, design patterns, directory organization, core features, database schemas, user flows, and operational setup.

---

## 1. System Architecture & Tech Stack

Solving Minds is built on a modern full-stack TypeScript architecture optimized for high-performance test simulation, real-time community interactions, and mathematical rendering.

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Next.js 16 + React 18)"]
        UI["UI Layer (Tailwind CSS, Lucide, Bebas Neue)"]
        Math["KaTeX Engine (Math Delimiter Parser)"]
        State["State Management (Hooks, Session Cache, Custom Events)"]
        FCMClient["Firebase Messaging Client (Service Worker)"]
    end

    subgraph Middleware["Edge & Middleware"]
        MW["Next.js Middleware (Session Refresher & Route Guard)"]
    end

    subgraph Backend["Backend Services"]
        SupaAuth["Supabase Auth (SSR Cookie Exchange)"]
        SupaDB["Supabase PostgreSQL (RLS & Stored Procedures)"]
        SupaRT["Supabase Realtime (Live Support & Chat)"]
        FCMAdmin["Firebase Admin SDK (Multicast Push Dispatcher)"]
        Cloudinary["Cloudinary API (Optimized Media Delivery)"]
        Puppeteer["Puppeteer / Chromium (Serverless PDF Engine)"]
    end

    UI --> MW
    MW --> SupaAuth
    Client --> SupaDB
    Client --> SupaRT
    Client --> Cloudinary
    Client --> FCMClient
    Client -->|API Routes| FCMAdmin
    Client -->|Analysis PDF Export| Puppeteer
```

### Core Technologies

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with React 18, React Server Components (RSC), and Turbopack support.
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) in strict mode.
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) alongside modular CSS sheets ([`analytics.css`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/(dashboard)/dashboard/analytics.css), [`homepage.css`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/(dashboard)/dashboard/homepage.css), and [`solving-redesign.css`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/(dashboard)/solving/solving-redesign.css)).
- **Database & Identity**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, SSR Cookie authentication via `@supabase/ssr`, and Realtime websocket subscriptions).
- **Mathematical Typesetting**: [KaTeX](https://katex.org/) and `react-katex` with custom LaTeX sanitization and delimiter parsers (`$$`, `$`, `\[`, `\(`).
- **Media & Asset Management**: [Cloudinary](https://cloudinary.com/) unsigned/signed image uploads with automatic format (`f_auto`) and quality (`q_auto`) transformations.
- **Push Notification Infrastructure**: [Firebase Cloud Messaging (FCM)](https://firebase.google.com/docs/cloud-messaging) with background service workers and server-side `firebase-admin` multicasting.
- **Data Visualization**: [Recharts](https://recharts.org/) and custom SVG score and accuracy rings.

---

## 2. Directory & File Structure

```
solving-minds-main/
├── .env.local                    # Local environment variables & secrets
├── .eslintrc.json                # ESLint configuration
├── .gitignore                    # Git file exclusion rules
├── migrations.sql                # PostgreSQL migrations & table definitions
├── next.config.mjs               # Next.js bundler configuration
├── package.json                  # Project dependencies & npm scripts
├── postcss.config.js             # PostCSS plugins configuration
├── tailwind.config.js            # Tailwind CSS theme configuration
├── tsconfig.json                 # TypeScript compiler options
├── public/                       # Static public assets
│   ├── firebase-messaging-sw.js  # FCM background push listener & PWA shell cache
│   ├── logo.png                  # Application brand emblem
│   └── manifest.json             # Web App Manifest
├── src/
│   ├── middleware.ts             # Session refresh & authentication route guard
│   ├── app/                      # App Router root
│   │   ├── layout.tsx            # Global HTML root layout with font imports
│   │   ├── page.tsx              # Landing page redirection logic
│   │   ├── globals.css           # Global typography & root variables
│   │   ├── (dashboard)/          # Authenticated application shell
│   │   │   ├── layout.tsx        # Dashboard shell with sidebar & mobile navigation
│   │   │   ├── dashboard/        # Command Center dashboard & analytics
│   │   │   ├── solving/          # JEE / NEET PYQ Solver interface
│   │   │   ├── tests/            # Mock test catalog & simulation center
│   │   │   ├── community/        # Student discussion feed & post detail
│   │   │   ├── levelup/          # Atoms economy & elemental league status
│   │   │   ├── moderation/       # Moderator portal (reports & tickets)
│   │   │   ├── settings/         # Profile customizations, themes, & account
│   │   │   └── admin/            # Admin push notification dispatcher
│   │   ├── admin/                # Main administration hub
│   │   │   ├── layout.tsx        # Full-width admin layout wrapper
│   │   │   ├── page.tsx          # Admin control panel (users, posts, reports)
│   │   │   ├── QuestionsTab.tsx  # Dynamic question creator & KaTeX previewer
│   │   │   ├── BookletsTab.tsx   # Subject booklet assembler
│   │   │   └── MockTestsTab.tsx  # Custom mock builder & PYP paper generator
│   │   ├── analysis/             # Diagnostic post-test performance analysis
│   │   │   └── [attemptId]/      # Attempt dynamic analytics & print view
│   │   ├── api/                  # Backend Next.js API routes
│   │   │   ├── auth/callback/    # Supabase OAuth / email code exchange
│   │   │   └── notifications/    # FCM push notification dispatcher
│   │   ├── auth/                 # Authentication pages
│   │   │   ├── login/            # Candidate login
│   │   │   ├── signup/           # Account registration
│   │   │   ├── forgot-password/  # Password reset request
│   │   │   ├── update-password/  # Password modification
│   │   │   ├── onboarding/       # Candidate profile onboarding
│   │   │   └── confirm/          # Email verification link confirmation
│   │   └── exam/                 # High-fidelity CBT Exam Engine
│   │       └── [id]/             # Exam instructions, attempt, & solutions
│   ├── components/               # Modular UI components
│   │   ├── AppLayout.tsx         # Sidebar, top bar, & navigation shell
│   │   ├── DialogProvider.tsx    # Modal alerts, confirmation dialogs, & toasts
│   │   ├── ThemeProvider.tsx     # Dynamic theme provider (Dark, Neon, Aurora, etc.)
│   │   ├── Admin/                # ReportsTab, TicketsTab
│   │   ├── Community/            # PostCard, CreatePostModal, CommentsSection, Lightbox
│   │   ├── Solving/              # ReportQuestionModal
│   │   └── Support/              # SupportModal, SupportChat (Realtime)
│   ├── hooks/                    # Custom React state & data hooks
│   │   ├── useProfile.ts         # User profile fetching & caching
│   │   ├── useQuestions.ts       # PYQ fetching with subject/chapter filters
│   │   ├── useAttempts.ts        # Attempt history fetching & memoization
│   │   ├── usePosts.ts           # Community post feed filtering & upvotes
│   │   ├── useLeaderboard.ts     # Global & periodic leaderboard ranking
│   │   ├── useNotifications.ts   # FCM token registration & permission handling
│   │   └── useDashboardAnalytics.ts # Study streak, accuracy, & chapter insights
│   └── lib/                      # Core business logic & SDK clients
│       ├── atoms.ts              # Atoms transaction ledger & league advancement
│       ├── aura.ts               # League thresholds & progression levels
│       ├── cloudinary.ts         # Image upload utility & URL optimization
│       ├── wordFilter.ts         # Multi-language profanity & abuse filter
│       ├── puppeteer.ts          # Serverless Chromium launcher for reports
│       ├── utils.ts              # ClassName merger & formatting utilities
│       ├── firebase/client.ts    # Firebase client initialization
│       └── supabase/             # Supabase browser, server, & middleware clients
└── scratch/                      # Database diagnosis & inspection scripts
```

---

## 3. Core Functional Modules & Application Flow

### 3.1. Authentication & Session Management
- **Flow**: Authentication is handled via [`src/lib/supabase/client.ts`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/lib/supabase/client.ts) (browser client) and [`src/lib/supabase/server.ts`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/lib/supabase/server.ts) (server client using cookie storage).
- **Route Guarding**: [`src/middleware.ts`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/middleware.ts) refreshes Supabase session tokens on every request and redirects unauthenticated users away from `/dashboard`, `/solving`, `/tests`, `/community`, `/settings`, and `/admin`.
- **OAuth & Magic Link Flow**: Callbacks are processed in [`src/app/api/auth/callback/route.ts`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/api/auth/callback/route.ts) and OTP verifications in [`src/app/auth/confirm/route.ts`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/auth/confirm/route.ts).
- **Onboarding**: First-time users are directed to [`src/app/auth/onboarding/page.tsx`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/auth/onboarding/page.tsx) to configure their full name, target year (2025–2028), academic class (11th, 12th, or Dropper), and initial bio.

### 3.2. Command Center Dashboard
- Located in [`src/app/(dashboard)/dashboard/page.tsx`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/(dashboard)/dashboard/page.tsx).
- **Banner Carousel**: Highlights active previous year papers, newly uploaded subject booklets, and system announcements.
- **Session Continuity**: Queries the candidate's most recent attempt from `user_attempts` to provide a one-click resume button back into the active chapter.
- **Analytics Matrix**: Displays total questions solved, current study streak, overall accuracy rate, and weak chapters computed by [`src/hooks/useDashboardAnalytics.ts`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/hooks/useDashboardAnalytics.ts).

### 3.3. JEE & NEET PYQ Solver
- Located in [`src/app/(dashboard)/solving/page.tsx`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/(dashboard)/solving/page.tsx).
- **Taxonomy Navigation**: Candidates select exam type (`jee-main`, `jee-advanced`, `neet`), subject (Physics, Chemistry, Mathematics, Biology), and specific chapter.
- **Mathematical Layout**: Utilizes KaTeX via `formatText()` and memoized `QuestionText` components to format complex equations, matrices, and chemical formulas.
- **Question Types**:
  1. **MCQ (Single-Correct)**: 4 choices with radio selection.
  2. **Numerical / Integer**: Direct numeric input box with verification against exact numerical answers.
  3. **Multi-Select**: Multi-checkbox option array for Advanced JEE questions.
- **Instant Evaluation & Cooldowns**:
  - Immediate feedback indicating correct vs wrong options.
  - Correct attempts lock the question into a 12-hour cooldown (`COOLDOWN_MS = 12 * 60 * 60 * 1000`) before allowing re-solving.
  - In-place bug reporting via [`ReportQuestionModal`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/components/Solving/ReportQuestionModal.tsx).

### 3.4. Computer Based Test (CBT) Simulation Center
- Located in [`src/app/exam/[id]/attempt/page.tsx`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/exam/[id]/attempt/page.tsx).
- Emulates the official National Testing Agency (NTA) exam portal:
  - **Fullscreen Launcher**: Initiated in a dedicated window with browser fullscreen enforcement in [`instructions/page.tsx`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/exam/[id]/instructions/page.tsx).
  - **Anti-Cheat Tab Detection**: Listens to the `visibilitychange` API. 5 tab switches trigger an automatic exam submission.
  - **Subsection Grouping**: Dynamic splitting between *Single Correct (MCQ)* and *Numerical Value* subsections, adjusting question indices relative to the active subsection.
  - **NTA Question Palette**: Status tracking using official NTA color badges: *Not Visited*, *Not Answered*, *Answered*, *Marked for Review*, and *Answered & Marked for Review*.
  - **Marking Scheme Header**: Real-time display of positive (+4) and negative (-1) marking rules.
  - **Periodic Autosave**: Question durations and candidate response selections sync every 30 seconds to `mock_test_live_attempts`.

```
+-----------------------------------------------------------------------------------+
|  [JEE MAIN SIMULATION]  Physics | Chemistry | Mathematics     Time Left: 02:45:10 |
+------------------------------------+----------------------------------------------+
|  Question 12 (Single Correct)      |  QUESTION PALETTE                            |
|  Section: Chemistry                |  [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ]                   |
|  Marking: +4 / -1                  |  [ 6 ][ 7 ][ 8 ][ 9 ][10]                    |
|                                    |                                              |
|  A sample of gas occupies 2.5 L... |  [x] Answered (Green)                        |
|                                    |  [!] Marked for Review (Purple)              |
|  (A) 1.2 atm                       |  [-] Not Visited (Gray)                      |
|  (B) 2.4 atm                       |                                              |
|  (C) 3.6 atm                       |  [ Instructions Modal ]                      |
|  (D) 4.8 atm                       |  [ Submit Exam ]                             |
+------------------------------------+----------------------------------------------+
```

### 3.5. Post-Exam Diagnostic Analytics
- Located in [`src/app/analysis/[attemptId]/page.tsx`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/analysis/[attemptId]/page.tsx) and computed by [`analyticsHelper.ts`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/analysis/[attemptId]/analyticsHelper.ts).
- **Score Ring**: Radial SVG visualization showing total score against maximum obtainable marks.
- **Accuracy Breakdown**: Distinct accuracy percentages comparing MCQ elimination skills against Numerical calculation precision.
- **Pacing & Speed Metrics**: Tracks average seconds spent on questions answered correctly versus questions answered incorrectly to identify where the student gets "stuck".
- **Difficulty Matrix**: Table crossing Subject $\times$ Difficulty (Easy, Medium, Hard) with question counts, accuracy, and average time.
- **Weak Chapter Detection**: Cross-references mistakes with overall database frequency from `question_stats` to highlight high-yield weak areas.
- **Print View**: Clean print-optimized layout at [`/analysis/[attemptId]/print`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/analysis/[attemptId]/print/page.tsx).

### 3.6. Community Protocol & Discussion Hub
- Located in [`src/app/(dashboard)/community/page.tsx`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/(dashboard)/community/page.tsx).
- **Feed Filtering**: Filters posts by Class (`11th`, `12th`, `dropper`), Target Year, Tag (`physics`, `organic`, `maths`, `strategy`), and Timeframe.
- **Anonymous Posting**: Authors can enable anonymous posting via [`CreatePostModal`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/components/Community/CreatePostModal.tsx).
- **Automated Content Moderation**: [`wordFilter.ts`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/lib/wordFilter.ts) scans titles and content against abusive keywords in English, Hindi (Devanagari), and Hinglish (Latin script) with leetspeak normalization.
- **Discussion Threads**: Interactive comment threads with voting, image uploads, and real-time event updates via [`CommentsSection`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/components/Community/CommentsSection.tsx).

### 3.7. Atoms Economy & League Progression
- Located in [`src/lib/atoms.ts`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/lib/atoms.ts) and [`src/lib/aura.ts`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/lib/aura.ts).
- **Progression Logic**: Points are tracked as "Atoms" stored in `atom_transactions` and cached on the user profile (`aura_score` for season atoms, `lifetime_atoms` for all-time points).
- **Elemental Leagues**:
  1. Carbon (0 Atoms)
  2. Silicon (300 Atoms)
  3. Aluminium (800 Atoms)
  4. Titanium (1,600 Atoms)
  5. Chromium (3,000 Atoms)
  6. Nickel (5,000 Atoms)
  7. Cobalt (8,000 Atoms)
  8. Tungsten (12,000 Atoms)
  9. Platinum (18,000 Atoms)
  10. Iridium (26,000 Atoms)
- **Gamification Triggers**: Browser dispatches `atoms-earned` (for floating HUD indicators) and `league-promoted` (for promotion celebration modals).

### 3.8. Administration & Moderation Centers
- **Admin Hub** ([`src/app/admin/page.tsx`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/admin/page.tsx)):
  - **Users Tab**: Search candidates, inspect joined dates, and assign roles (`member`, `mod`, `admin`).
  - **Posts Tab**: Review community posts and perform deletions.
  - **Questions Tab**: Add single or bulk questions with LaTeX math preview, option image attachments, and answer keys.
  - **Booklets Tab**: Assemble chapter booklets with custom domain tags.
  - **Mock Tests Tab**: Build custom mock tests or auto-assemble Previous Year Papers (PYP) by selecting Year and Shift.
- **Moderator Portal** ([`src/app/(dashboard)/moderation/page.tsx`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/(dashboard)/moderation/page.tsx)):
  - **Reports Tab**: Review flagged posts and reported question issues with mandatory resolution notes.
  - **Tickets Tab**: Support helpdesk with ticket assignment, resolution logs, and live messaging.
- **Push Broadcast Center** ([`src/app/(dashboard)/admin/notifications/page.tsx`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/src/app/(dashboard)/admin/notifications/page.tsx)):
  - Target broadcasts to `everyone`, specific academic classes, or individual user IDs.

---

## 4. Database Schema & Key Entities

The underlying PostgreSQL database hosted on Supabase contains the following primary tables:

| Table | Description | Key Columns |
|---|---|---|
| `profiles` | User profiles and progression state | `id`, `name`, `email`, `role`, `class`, `target_year`, `aura_score`, `lifetime_atoms`, `aura_level`, `muted_until` |
| `questions` | Question repository for PYQs and mocks | `id`, `subject`, `chapter`, `topic`, `difficulty`, `type`, `question_text`, `question_image_url`, `options`, `correct_answer`, `explanation`, `year`, `shift`, `exam_type` |
| `mock_tests` | Mock test definitions and PYP metadata | `id`, `title`, `exam_type`, `duration`, `total_questions`, `total_marks`, `is_pyp`, `year`, `shift`, `subjects`, `status` |
| `mock_test_live_attempts` | Active and completed CBT mock attempts | `id`, `user_id`, `test_id`, `answers`, `statuses`, `time_left`, `completed`, `question_durations`, `created_at`, `updated_at` |
| `user_attempts` | Granular PYQ solver attempts log | `id`, `user_id`, `question_id`, `is_correct`, `selected_answer`, `time_taken`, `created_at` |
| `atom_transactions` | Ledger recording atom awards/deductions | `id`, `user_id`, `type`, `atoms`, `season`, `created_at` |
| `posts` | Community discussion threads | `id`, `user_id`, `title`, `content`, `image_urls`, `tags`, `is_anonymous`, `is_blocked`, `created_at` |
| `comments` | Replies on community posts | `id`, `post_id`, `user_id`, `content`, `image_url`, `created_at` |
| `votes` | Upvotes/downvotes on community posts | `id`, `post_id`, `user_id`, `value` (+1 / -1) |
| `reports` | Flagged posts or question issue reports | `id`, `reporter_id`, `post_id`, `question_id`, `reason`, `status`, `admin_note`, `resolved_by` |
| `support_tickets` | Support desk tickets | `id`, `user_id`, `subject`, `status`, `resolution_note`, `resolved_by`, `created_at` |
| `support_messages` | Live chat messages inside support tickets | `id`, `ticket_id`, `user_id`, `content`, `image_urls`, `created_at` |
| `push_tokens` | FCM push registration tokens | `id`, `user_id`, `token`, `created_at` |
| `banners` | Promotional and announcement banners | `id`, `title`, `subtitle`, `button_text`, `button_link`, `image_url`, `is_active` |

---

## 5. Security & Vulnerability Analysis Cross-Reference

A thorough security audit of this codebase has been performed. Thirteen security vulnerabilities—ranging from hardcoded service credentials and unauthenticated notification broadcasting to client-side answer leakage, score forgery, and direct role escalation—have been identified and compiled with exact code locations, threat mechanics, and defensive remediation instructions.

> [!IMPORTANT]
> Refer to the newly created file **[`probleum.text`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/probleum.text)** for the complete vulnerability list, threat impact analysis, and patching guidelines.

---

## 6. Setup, Configuration & Running Locally

### 6.1. Prerequisites
- **Node.js**: v18.18.0 or newer (Node.js 20+ recommended)
- **Package Manager**: `npm` or `pnpm`

### 6.2. Installation
Clone the repository and install project dependencies:
```bash
npm install
```

### 6.3. Environment Variables Configuration
Create a `.env.local` file in the root directory with the required API keys:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
ADMIN_EMAIL=admin@solvingminds.com

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your-cloud-name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<your-preset>

# Firebase Web (FCM)
NEXT_PUBLIC_FIREBASE_API_KEY=<your-fcm-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project>.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
NEXT_PUBLIC_FIREBASE_VAPID_KEY=<vapid-key>

# Firebase Admin SDK (Server Only)
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 6.4. Database Migration
Open your Supabase SQL Editor and execute the schema definitions found in [`migrations.sql`](file:///c:/Users/SATYAM%20KUMAR%20JHA/Downloads/solving-minds-main/solving-minds-main/migrations.sql).

### 6.5. Development Server
Start the Next.js local development server:
```bash
npm run dev
```
Access the application at [http://localhost:3000](http://localhost:3000).

### 6.6. Production Build & Linting
```bash
# Typecheck and compile the Next.js production bundle
npm run build

# Start production server
npm run start

# Run ESLint validation
npm run lint
```
