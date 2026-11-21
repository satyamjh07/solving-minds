# 📱 Solving Minds Mobile Application Specification
### Comprehensive Architectural, Database, & Feature Specification for React Native / Expo Developers

This document serves as an exhaustive blueprint to replicate the "Solving Minds" next-generation study platform into a premium **React Native (iOS & Android)** mobile app. It details every screen, every Supabase database table, exact data fields, query patterns, RLS requirements, and edge-case logic so that any AI coder (like a Replit Agent) can implement it flawlessly.

---

## 🧭 1. Screen & Route Directory

The Next.js web application comprises several core high-fidelity pages. The table below maps each Next.js route to its recommended React Native / Expo Router equivalent:

| Next.js Route | Screen Name | Description |
| :--- | :--- | :--- |
| `/auth/login` | `Login` | Native login form supporting Email/Password and Google OAuth credentials. |
| `/auth/signup` | `Signup` | Register form with links to Privacy Policy and Terms of Use. |
| `/auth/onboarding` | `Onboarding` | Forced initialization screen for new accounts. Collects `name`, `class` (Class 11, Class 12, Dropper), `target_year` (2026, 2027, etc.), and `bio` before unlocking the main app. |
| `/auth/update-password` | `UpdatePassword` | Password recovery and credential rotation panel. |
| `/dashboard` | `HomeDashboard` | The Command Center. Displays streaks, weekly metrics, accuracy percentages by subject, study logs, today's targets, and daily progress bars. |
| `/solving` | `Solver` | PYQ practice suite. Users select **Subject** (Physics, Chemistry, Mathematics), **Chapter**, and view/solve formatted MCQ or Integer-type questions. |
| `/community` | `Community` | Discussion feed. Supports filtering posts (All, Popular, My Posts), tag categories, viewing attached images (up to 5), upvoting/downvoting, and expandable comments sections. |
| `/moderation` | `ModPanel` | Visible only to roles: `mod` or `admin`. Allows viewing pending user reports, muting/unmuting users, and deleting offending posts or comments. |
| `/admin` | `AdminDashboard` | Complete dashboard accessible only to `admin`. Features: user management, global reports monitoring, PYQ booklet creations, and direct questions uploads. |
| `/settings` | `Settings` | User configuration. Edit profile photo, name, bio, target year, or view/resend account details. |
| `/privacy-policy` | `PrivacyPolicy` | Complete privacy legal document (renders the 12-section compliance text). |
| `/terms-of-use` | `TermsOfUse` | Complete terms and conditions legal document (renders the 16-section compliance text). |

---

## 🗄️ 2. Supabase Database Schema

Below is the exact schema structure of the Supabase PostgreSQL database utilized in "Solving Minds". Ensure all constraints, relationships, and datatypes match precisely when recreating interfaces in React Native.

### 2.1. `profiles` (User Profiles)
Stores core details, credentials, custom visual styles, and user score metrics.
* **Fields**:
  * `id`: `uuid` (Primary Key, foreign key referencing `auth.users.id` on delete cascade)
  * `email`: `text` (Unique, user's email address)
  * `name`: `text` (Full name, checked to ensure it isn't empty)
  * `class`: `text` (Options: `'CLASS 11'`, `'CLASS 12'`, `'DROPPER'`)
  * `target_year`: `text` (Target year, e.g. `'2026'`, `'2027'`)
  * `bio`: `text` (Default: `'A fresh mind ready to solve.'`)
  * `avatar_url`: `text` (URL pointing to profile photo, hosted in Supabase bucket or public URI)
  * `role`: `text` (Default: `'user'`. Admin panel check constraint: `'user' | 'mod' | 'admin'`)
  * `theme`: `text` (Default: `'space'`)
  * `aura_score`: `integer` (Default: `0`. Cumulative score calculated from solved questions, accuracy, and active streaks)
  * `aura_level`: `text` (Default: `'Level 1'`. String format like `"Level X"`)
  * `muted_until`: `timestamp with time zone` (Null by default. If present and in the future, user is blocked from posting/commenting)
  * `daily_target`: `integer` (Default: `70`. Number of questions user targets to solve daily)
  * `created_at`: `timestamp with time zone` (Default: `now()`)
  * `updated_at`: `timestamp with time zone` (Default: `now()`)

### 2.2. `posts` (Community Posts)
Houses community discussions, doubt threads, and social media media arrays.
* **Fields**:
  * `id`: `uuid` (Primary Key, default: `gen_random_uuid()`)
  * `user_id`: `uuid` (Foreign key referencing `profiles.id` on delete cascade)
  * `title`: `text` (Title of the post, nullable if content is exhaustive)
  * `content`: `text` (Markdown content of the post text)
  * `image_urls`: `jsonb` or `text[]` (Array containing URLs of uploaded files, supporting up to 5 attachments)
  * `tags`: `text[]` (Standard tags: `'physics' \| 'chemistry' \| 'maths' \| 'doubts' \| 'help' \| 'jee' \| 'neet' \| 'organic' \| 'physical' \| 'inorganic' \| 'strategy' \| 'storytime' \| 'mock test'`)
  * `created_at`: `timestamp with time zone` (Default: `now()`)

### 2.3. `votes` (Post Vote Ledger)
A transactional record of post downvotes and upvotes used to dynamic-calculate popularity metrics.
* **Fields**:
  * `id`: `uuid` (Primary Key)
  * `post_id`: `uuid` (Foreign key referencing `posts.id` on delete cascade)
  * `user_id`: `uuid` (Foreign key referencing `profiles.id` on delete cascade)
  * `value`: `integer` (Constraint: must be `1` (upvote) or `-1` (downvote))
  * `created_at`: `timestamp with time zone` (Default: `now()`)
* **Unique Index**: Composite unique constraint on `(post_id, user_id)` to ensure each user can cast exactly one vote per post.

### 2.4. `comments` (Post Comments Feed)
Stores responses under community posts.
* **Fields**:
  * `id`: `uuid` (Primary Key)
  * `post_id`: `uuid` (Foreign key referencing `posts.id` on delete cascade)
  * `user_id`: `uuid` (Foreign key referencing `profiles.id` on delete cascade)
  * `content`: `text` (Comment text content)
  * `image_url`: `text` (Optional URL to an attached image comment)
  * `created_at`: `timestamp with time zone` (Default: `now()`)

### 2.5. `comment_votes` (Comment Votes Ledger)
Same upvote/downvote ledger style mapping specifically to individual comments.
* **Fields**:
  * `id`: `uuid` (Primary Key)
  * `comment_id`: `uuid` (Foreign key referencing `comments.id` on delete cascade)
  * `user_id`: `uuid` (Foreign key referencing `profiles.id` on delete cascade)
  * `value`: `integer` (Constraint: `1` or `-1`)
  * `created_at`: `timestamp with time zone` (Default: `now()`)
* **Unique Index**: Composite unique constraint on `(comment_id, user_id)`.

### 2.6. `questions` (JEE/NEET Question Bank)
Holds the metadata, structures, and assets for PYQ solver screens.
* **Fields**:
  * `id`: `uuid` or `text` (Primary key, e.g. text identifier formatted as `"PYQ-YEAR-SUB"`)
  * `subject`: `text` (Lowercased. Constraints: `'physics' \| 'chemistry' \| 'mathematics' \| 'math' \| 'maths'`)
  * `chapter`: `text` (The educational chapter name, e.g. `'Electrostatics'`)
  * `topic`: `text` (Specific subtopic, e.g. `'Coulombs Law'`)
  * `difficulty`: `text` (Constraints: `'easy' \| 'medium' \| 'hard'`)
  * `exam_type`: `text` (Constraint: `'pyq'`, other types expandable)
  * `year`: `integer` (The academic year of release, e.g. `2024`)
  * `shift`: `text` (Shift designation, e.g. `'Jan 27 Shift 1'`)
  * `question_text`: `text` (Formatted LaTeX/Markdown question string)
  * `question_image_url`: `text` (Optional URL to question schematic/diagram)
  * `options`: `jsonb` (JSON Array containing options. Structure: `[{"text": "A", "image": "url"}, {"text": "B", "image": ""}, ...]`)
  * `correct_answer`: `text` (For MCQs, stores the zero-indexed integer: `'0' \| '1' \| '2' \| '3'`. For Integer-type, stores the exact numeric string)
  * `explanation`: `text` (LaTeX/Markdown text breaking down step-by-step solution)
  * `explanation_image_url`: `text` (Optional URL to schematic math breakdown)
  * `type`: `text` (Constraint: `'mcq' \| 'integer'`)
  * `created_at`: `timestamp with time zone` (Default: `now()`)

### 2.7. `user_attempts` (Question Attempts Log)
Records student inputs on solver screens. Directly affects Aura Calculations, Streaks, and Analytics.
* **Fields**:
  * `id`: `uuid` (Primary Key)
  * `user_id`: `uuid` (Foreign key referencing `profiles.id` on delete cascade)
  * `question_id`: `uuid` or `text` (Foreign key referencing `questions.id` on delete cascade)
  * `is_correct`: `boolean` (True if student answer matched `correct_answer`)
  * `selected_answer`: `text` (The raw user input response submitted)
  * `created_at`: `timestamp with time zone` (Default: `now()`)

### 2.8. `study_sessions` (Active Timer Log)
Tracks durations, subjects, and completions for study clock dashboard tools.
* **Fields**:
  * `id`: `uuid` (Primary Key)
  * `user_id`: `uuid` (Foreign key referencing `profiles.id` on delete cascade)
  * `subject`: `text` (Subject studied)
  * `duration_seconds`: `integer` (Total seconds spent studying)
  * `status`: `text` (Constraint: `'complete' \| 'incomplete'`)
  * `start_time`: `timestamp with time zone`
  * `end_time`: `timestamp with time zone`

### 2.9. `reports` (Moderation Flags)
Handles moderation flags for offensive posts or comments.
* **Fields**:
  * `id`: `uuid` (Primary Key)
  * `post_id`: `uuid` (Foreign key referencing `posts.id` on delete cascade, optional)
  * `comment_id`: `uuid` (Foreign key referencing `comments.id` on delete cascade, optional)
  * `reporter_id`: `uuid` (Foreign key referencing `profiles.id` on delete cascade)
  * `reason`: `text` (Report reason text)
  * `status`: `text` (Default: `'pending'`. Constraint: `'pending' \| 'resolved' \| 'dismissed'`)
  * `created_at`: `timestamp with time zone` (Default: `now()`)

### 2.10. `support_tickets` (Support Tickets Desk)
Initiates help tickets between admins/staff and regular users.
* **Fields**:
  * `id`: `uuid` (Primary Key)
  * `user_id`: `uuid` (Foreign key referencing `profiles.id` on delete cascade)
  * `subject`: `text` (Ticket core topic)
  * `status`: `text` (Default: `'open'`. Constraint: `'open' \| 'closed'`)
  * `created_at`: `timestamp with time zone` (Default: `now()`)

### 2.11. `support_messages` (Ticket Chat Ledger)
Conversation feed within helpdesk tickets.
* **Fields**:
  * `id`: `uuid` (Primary Key)
  * `ticket_id`: `uuid` (Foreign key referencing `support_tickets.id` on delete cascade)
  * `sender_id`: `uuid` (Foreign key referencing `profiles.id` on delete cascade)
  * `message`: `text` (Help content message text)
  * `image_url`: `text` (Optional URL to screenshots attached)
  * `created_at`: `timestamp with time zone` (Default: `now()`)

### 2.12. `notifications` (User Alerts)
System notifications pushed to active clients.
* **Fields**:
  * `id`: `uuid` (Primary Key)
  * `user_id`: `uuid` (Foreign key referencing `profiles.id` on delete cascade)
  * `title`: `text`
  * `message`: `text`
  * `read`: `boolean` (Default: `false`)
  * `created_at`: `timestamp with time zone` (Default: `now()`)

---

## 🔌 3. Custom Stored Procedures & Edge Functions

### 3.1. Stored Procedure: `get_leaderboard`
Used to compute top weekly and daily active students using their overall solved counts.
* **Arguments**:
  * `since_ts`: `timestamp with time zone` (Calculates active contributions since this timestamp)
  * `row_limit`: `integer` (Amount of records to return, e.g. `10`)
* **Underlying Query**: Renders active logs from `study_sessions` and `user_attempts` grouped by user details, sorting users by cumulative productive seconds.
* **Fallback API**: If RPC fails, fallback to retrieving directly from `profiles` ordered by `aura_score` descending.

### 3.2. Supabase Edge Functions:
Located under `/supabase/functions/` in your backend repo:
* `add-comment`: Sanitizes comment text, records values, checks rate limits.
* `calculate-aura`: Triggers calculations to assign aura scores/levels based on stats.
* `create-post`: Handles posting, parsing tags, appending assets.
* `save-session`: Completes study session database inserts.
* `send-notification`: Triggers Firebase Cloud Messaging payloads to device FCM tokens.

---

## ⚙️ 4. Premium Core Business Logic & Constraints

When developing the mobile app client, ensure the following core logic constraints are implemented identically:

### 4.1. The Anti-Spam Comment Rate Limiter
To prevent bot spam, users are restricted in the comment section:
* **Constraint**: A user can submit a maximum of **5 comments in any 10-minute window**.
* **Client Implementation**:
  1. On loading the comment sheet, query the user's active comments database feed.
  2. If the count of comments submitted within `now() - 10 minutes` is `5`:
     * Disable the Comment input field, image upload icon, and send button.
     * Calculate the precise remaining cooldown time. This is determined by taking the `created_at` timestamp of the *oldest* comment within that 5-comment set, adding 10 minutes, and calculating the difference from the current time.
     * Start a 1-second countdown timer. Renders in the composer as: `Spam protection: Wait Xm Ys...`
     * Pop up a warning Toast: `"Anti-Spam Cooldown active! Max 5 comments per 10 minutes."`
     * Automatically unlock the composer once the timer hits zero.

### 4.2. Aura Score & Level Logic
User prestige score is calculated using `calculateAura` with three parameters:
* **Formulas**:
  * **Solved Multiplier**: `totalQuestionsSolved * 5` (Each solved question provides 5 Aura)
  * **Streak Multiplier**: `currentActiveStreak * 25` (Each consecutive daily streak awards 25 Aura)
  * **Accuracy modifier**: Adds `accuracyPercentage * 2` to the score.
  * **Aura Level Scale**: `Level = Math.floor(auraScore / 500) + 1` (e.g. 500 Aura = Level 2, 1000 Aura = Level 3). Renders in the app as `Level X`.
* **Database Sync**: The mobile app should run this sync algorithm on solving a question or finishing a study clock session to update `aura_score` and `aura_level` in `profiles`.

### 4.3. Onboarding Enforcement
The application must strictly lock new accounts until profile creation details are finalized:
* **Logic**: On user authorization login/signup, fetch the profile data row.
* **Trigger condition**: If `name` is empty/null, or `class` is empty, or `target_year` is empty:
  * Force redirect the screen immediately to the Onboarding router screen.
  * Disable swipe-back navigation or home navigation on this onboarding panel.
  * Once the student fills in all fields and taps "Initialize Command Center", write an `upsert` query to write details into the `profiles` table. On success, route them back to the `/dashboard`.

---

## 🛠️ 5. Mobile Implementation Recommendations (Expo + React Native)

When providing this document to the Replit Agent to build the mobile client, recommend the following architecture choices:

1. **Routing & Navigation**: Use `expo-router` (file-based navigation matching the Next.js directories) or `react-navigation` with a bottom tab layout (`Home`, `Solver`, `Community`, `Settings`).
2. **Styling System**: Use **NativeWind** (Tailwind CSS for React Native) to import the CSS classes directly from the Next.js app, maintaining the futuristic space design system:
   * Main Background: Sleek cosmic dark `#03000a` or `#080710`
   * Accent Colors: Glowing cyan `#00f0ff`, vibrant violet `#b26bff`, emerald `#00e5a0`, and warning crimson `#ff4d6a`.
   * Glow Effects: Use Native `shadowColor` and elevation, or SVG radial gradients to implement glowing box highlights.
3. **Database Client Integration**: Integrate the official `@supabase/supabase-js` client package. Store JWT auth credentials inside `expo-secure-store` to keep the user signed in across app launches.
4. **LaTeX & Math Rendering**: To display JEE/NEET equations inside question texts, use a native component like `react-native-math-view` or a configured `react-native-webview` with KaTeX.
5. **Real-time Subscriptions**: Use Supabase real-time channels (`supabase.channel().on(...)`) on the `posts`, `comments`, and `support_messages` tables so the feed updates dynamically without manual refreshes.
