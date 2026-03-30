# Streakd - Goal Accountability App

## Project Overview
React Native mobile app for goal accountability with friends. Users create goals, post progress photos on scheduled times, and friends provide support through reactions and visibility.

**Core Concept**: BeReal-style accountability - scheduled notifications prompt users to post proof of working on their goals. Friends see posts from last 24 hours, creating social motivation.

## Tech Stack

### Frontend
- **Framework**: React Native 0.81.5, Expo ~54.0.20
- **Navigation**: React Navigation 7 (Stack Navigator)
- **State**: Context API (AuthContext, DataContext, SubscriptionContext)
- **HTTP Client**: Custom JWT fetch wrapper (`services/api.js`) with auto-refresh
- **Icons**: lucide-react-native
- **Gestures**: react-native-gesture-handler (swipe-to-delete)
- **Storage**: AsyncStorage (tokens, session persistence)
- **Notifications**: Expo Notifications + push tokens
- **Camera/Images**: Expo Camera, Expo Image Picker
- **Payments**: RevenueCat (monthly subscription)
- **Deployment**: EAS (Expo Application Services)

### Backend
- **Framework**: FastAPI (Python) on Uvicorn
- **Database**: PostgreSQL (async via SQLAlchemy + asyncpg)
- **Migrations**: Alembic
- **Auth**: JWT (python-jose) — access + refresh tokens; bcrypt for passwords
- **Image Storage**: Cloudflare R2 (S3-compatible, via boto3)
- **Deployment**: Docker + Docker Compose

**Base URL**: `https://api.streakd.social` (Digital Ocean droplet — HTTPS confirmed working via nginx + Let's Encrypt)
**Website**: `https://streakd.social` (live on same droplet — privacy policy and ToS pages are live)

## Database Schema

### users
- id (uuid, pk)
- username (text, unique)
- name (text)
- email (text, unique)
- password_hash (text)
- profile_picture_url (text)
- push_token (text)
- push_notifications_enabled (boolean)
- is_subscribed (boolean, default false)
- created_at (timestamp)

### goals
- id (uuid, pk)
- user_id (uuid, fk → users, cascade delete)
- title (text)
- description (text)
- completed (boolean)
- archived (boolean, default false) — subscribers can archive instead of delete
- privacy (enum: 'friends', 'private')
- streak_count (int, default 0)
- streak_interval (int) — days between required posts
- notification_time (time) — preferred reminder time for this goal
- last_posted_at (timestamp)
- created_at (timestamp)

### posts
- id (uuid, pk)
- user_id (uuid, fk → users, cascade delete)
- goal_id (uuid, fk → goals, cascade delete)
- image_url (text)
- caption (text)
- created_at (timestamp)
- reaction_fire (int, default 0)
- reaction_fist (int, default 0)
- reaction_party (int, default 0)
- reaction_heart (int, default 0)

### reactions
- id (uuid, pk)
- post_id (uuid, fk → posts, cascade delete)
- user_id_who_reacted (uuid, fk → users)
- react_emoji (text: '🔥', '👊', '🎉', '❤️')
- created_at (timestamp)
- **Unique constraint**: (post_id, user_id_who_reacted)

### blocks
- id (uuid, pk)
- blocker_id (uuid, fk → users, cascade delete)
- blocked_id (uuid, fk → users, cascade delete)
- created_at (timestamp)
- **Unique constraint**: (blocker_id, blocked_id)

### reports
- id (uuid, pk)
- reporter_id (uuid, fk → users, cascade delete)
- reported_user_id (uuid, fk → users, cascade delete)
- post_id (uuid, fk → posts, SET NULL, nullable)
- reason (text: 'inappropriate', 'spam', 'harassment', 'other')
- details (text, nullable)
- created_at (timestamp)

### friendships
- id (uuid, pk)
- user_id (uuid, fk → users)
- friend_id (uuid, fk → users)
- status (enum: 'pending', 'accepted', 'rejected')
- created_at (timestamp)

### notification_settings
- id (uuid, pk)
- user_id (uuid, fk → users, unique, cascade delete)
- friend_requests (boolean)
- reactions (boolean)
- streak_reminders (boolean)

## API Endpoints

### Auth (`/auth`)
- `POST /signup` — Register user, auto-creates notification_settings row
- `POST /login` — Login, returns access + refresh tokens
- `POST /refresh` — Refresh access token
- `GET /me` — Get current user profile from JWT

### Users (`/users`)
- `GET /profile/{user_id}` — Get profile with friend count
- `GET /search?q=` — Search users by username (fuzzy, excludes self, limit 20)
- `PUT /username` — Update username (checks availability)
- `GET /check-username/{username}` — Check availability
- `PUT /profile-picture` — Upload profile picture to R2 (replaces old)
- `GET /notification-settings` — Get notification preferences
- `PUT /notification-settings` — Update notification preferences
- `PUT /push-token` — Save Expo push token
- `DELETE /me` — Permanently delete account + all data (cascades goals, posts, reactions, friendships, R2 images)

### Goals (`/goals`)
- `GET /` — All goals for current user
- `GET /active` — Non-completed goals only
- `POST /` — Create goal (max 2 active for free users, unlimited for subscribers — enforced server-side)
- `DELETE /{goal_id}` — Delete goal + cascade delete posts/reactions, cleanup R2 images
- `PUT /{goal_id}/complete` — Mark goal as completed
- `PUT /{goal_id}/archive` — Archive goal (subscribers only)
- `PUT /{goal_id}/streak` — Increment streak_count + update last_posted_at

### Posts (`/posts`)
- `GET /feed` — Friends + self posts from last 24h, filters private goals
- `GET /goal/{goal_id}` — All posts for a specific goal
- `POST /` — Create post with image upload to R2 (multipart form)
- `DELETE /{post_id}` — Delete post + cleanup R2 image

### Reactions (`/reactions`)
- `POST /toggle` — Toggle reaction emoji on post (atomic with row lock)
- `GET /user?post_ids=` — Batch fetch user's reactions (comma-separated IDs)
- `GET /post/{post_id}` — User's reactions for a specific post

### Friends (`/friends`)
- `GET /` — All friendships with friend info (single joined query)
- `GET /accepted-ids` — List of accepted friend user IDs
- `POST /request` — Send friend request (bidirectional duplicate check)
- `PUT /accept` — Accept pending request
- `DELETE /reject` — Reject pending request
- `DELETE /{friend_id}` — Remove accepted friendship

### Blocks (`/blocks`)
- `POST /` — Block a user (also removes any existing friendship)
- `DELETE /{user_id}` — Unblock a user
- `GET /` — List blocked users (id, username, profile_picture_url)
- `POST /report` — Report a user/post (reason: inappropriate, spam, harassment, other)

### Notifications (`/notifications`)
- `POST /internal/send-streak-notifications` — Internal endpoint to send streak reminders (protected by `INTERNAL_API_SECRET` header)
- `POST /internal/send-instant-notification` — Internal endpoint to send a push notification to a specific user

## Frontend Services (`services/`)

- **api.js** — JWT HTTP client. Stores tokens under `streakd_access_token` / `streakd_refresh_token` in AsyncStorage. Auto-refreshes on 401 and retries. Exposes `apiGet`, `apiPost`, `apiPut`, `apiDelete`. Supports FormData for file uploads.
- **supabase.js** — Auth wrapper: `signUp`, `signIn`, `signOut`, `getCurrentUser`, `getUserProfile`, `checkUsernameAvailable`. (Named supabase.js for legacy reasons — hits the custom API, not Supabase.)
- **goals.js** — `getUserGoals`, `getUserActiveGoals`, `createGoal`, `incrementGoalStreak`, `deleteGoal`, `completeGoal`
- **posts.js** — `getFeedPosts`, `getGoalPosts`, `createPost` (uploads image to R2), `getUserReactionsForPosts`, `deletePost`
- **users.js** — `searchUsers`, `getUserFriendships`, `getAcceptedFriendIds`, `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `removeFriend`, `updateUsername`, `uploadProfilePicture`, `updateNotificationSettings`, `getNotificationSettings`
- **subscription.js** — RevenueCat integration: `initSubscription`, `checkSubscriptionStatus`, `purchaseSubscription`, `restorePurchases`

## Frontend Contexts

### AuthContext.js
State: `user`, `profile`, `loading`, `isNewUser`
- `checkUser()` — Restore session from stored tokens on app launch
- `signOut()` — Clear user + tokens
- `refreshProfile()` — Re-fetch latest user data
- `setAuthUser(userData)` — Set after login (navigate to Feed)
- `signUpUser(userData)` — Set after signup with `isNewUser=true` (navigate to Onboarding)
- `completeOnboarding()` — Mark onboarding done

### DataContext.js
Cached data with 5-minute expiration per data type:
- **profileData**: goals, posts, stats (totalPosts, daysOnStreakd, friendCount)
- **friendsData**: friends array, pendingRequests array
- **feedData**: posts array

Methods: `fetchProfileData(force)`, `fetchFriendsData(force)`, `fetchFeedData(force)`, plus optimistic update helpers (`addGoal`, `removeGoal`, `markGoalCompleted`, `addPost`, `removePost`) and cache invalidation (`invalidateProfile`, `invalidateFriends`, `invalidateFeed`).

### SubscriptionContext.js
State: `isSubscribed`, `loading`
- Wraps RevenueCat SDK — listens for subscription status changes
- Syncs `is_subscribed` flag to backend on change
- Gates premium features: unlimited goals, goal archiving

## Screens

| Screen | Purpose |
|--------|---------|
| Feed.js | 24h posts from friends + self, pull-to-refresh, reactions |
| Profile.js | Stats, profile editing, logout |
| CreatePost.js | Camera/gallery, caption, goal selection, post + streak increment |
| GoalFeed.js | All posts for a goal, streak display, delete goal |
| Onboarding.js | New user welcome, username/avatar setup, friend discovery |
| LoginScreen.js | Email/password login |
| SignUpScreen.js | Email/password/username signup |
| Settings.js | App settings, account management, logout |
| Friends.js | Friends list, pending requests, accept/reject |
| AddFriends.js | Search users, send friend requests |
| EditProfile.js | Update username, profile picture |
| Paywall.js | Subscription purchase screen (RevenueCat) |
| LegalText.js | Privacy Policy / Terms of Service viewer |
| UserProfile.js | View other user's profile, add/block/report, view friend goals |
| NotificationsSettings.js | Toggle: friend requests, reactions, streak reminders |

## Key Architecture Patterns

### Auth Flow
1. Login/Signup → backend returns `access_token` + `refresh_token`
2. Tokens stored in AsyncStorage
3. All requests include `Authorization: Bearer <access_token>`
4. On 401: auto-refresh, retry once; if refresh fails, sign out
5. Tokens restored from AsyncStorage on app launch

### Image Storage (Cloudflare R2)
- Frontend sends image as `multipart/form-data` to backend
- Backend uploads to R2, returns public URL stored in DB
- On delete: backend extracts R2 key from URL, deletes from R2
- Profile pictures and post images stored in separate R2 folders

### Streak System
- `PUT /goals/{id}/streak` called by frontend after each successful post
- Stores `streak_count` + `last_posted_at`
- Displayed with 🔥 emoji on goal cards and post cards
- Streak reset not yet implemented in core API (edge function referenced in old docs is removed)

### Performance Patterns
- Optimistic UI updates for reactions (revert on error)
- Optimistic updates for goals/posts in DataContext
- Batch fetch reactions with `GET /reactions/user?post_ids=` to avoid N+1 queries
- 5-minute client-side cache in DataContext with force-refresh option
- Friend count computed from friendships table (not a stored column)

## Common Gotchas
- `services/supabase.js` is a legacy name — it calls the custom FastAPI backend, not Supabase
- Always check `user` exists before making API calls
- JWT access token expires in 15 min; refresh token lasts 30 days (configurable in `backend/app/config.py`)
- Friendships are bidirectional: check both `user_id` and `friend_id` when querying
- Reactions are unique per user per post (one reaction per post, toggle to change)
- Goal privacy is `'friends'` or `'private'` only — no `'public'` option
- R2 key is extracted from the public URL via string replacement in `storage.py`
- `App.js` must wrap with `GestureHandlerRootView` for swipe gestures to work
- Posts joined with user/goal info in backend — returned as flat response to frontend
- `api.js` has a hardcoded local IP (`192.168.2.94:8000`) as `API_BASE` — must be updated for production

## File Structure
```
streakd/
├── App.js                        # Root navigator, push notification setup
├── index.js                      # Entry point
├── package.json
├── app.json                      # Expo config
│
├── services/
│   ├── api.js                   # JWT HTTP client (core)
│   ├── supabase.js              # Auth wrapper (calls custom API)
│   ├── goals.js
│   ├── posts.js
│   ├── users.js
│   └── subscription.js          # RevenueCat integration
│
├── contexts/
│   ├── AuthContext.js
│   ├── DataContext.js
│   └── SubscriptionContext.js
│
├── constants/                    # App constants
│
├── screens/
│   ├── Feed.js
│   ├── Profile.js
│   ├── CreatePost.js
│   ├── GoalFeed.js
│   ├── Onboarding.js
│   ├── LoginScreen.js
│   ├── SignUpScreen.js
│   ├── Settings.js
│   ├── Friends.js
│   ├── AddFriends.js
│   ├── EditProfile.js
│   ├── Paywall.js
│   ├── LegalText.js             # Privacy Policy / Terms of Service viewer
│   └── NotificationsSettings.js
│
├── utils/
│   └── formatTimestamp.js       # Shared relative time formatter
│
├── legal/
│   ├── privacy-policy.txt       # Privacy policy text
│   └── terms-of-service.txt     # Terms of service text
│
├── components/
│   ├── UserNotFound.js
│   └── feed/
│       └── PostCard.js          # Post display + reaction buttons
│
└── backend/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── requirements.txt
    ├── alembic/
    │   └── versions/
    │       ├── 001_initial.py
    │       ├── 002_add_push_columns.py
    │       ├── 003_add_name_to_users.py
    │       ├── 004_add_notification_time_to_goals.py
    │       ├── 005_add_archived_to_goals.py
    │       ├── 006_add_is_subscribed_to_users.py
    │       └── 007_add_friendship_unique_constraint.py
    └── app/
        ├── main.py              # FastAPI app + router registration
        ├── config.py            # Settings (JWT, R2, DB, CORS)
        ├── database.py          # SQLAlchemy async engine + session
        ├── dependencies.py      # JWT auth dependency injection
        ├── models/              # SQLAlchemy ORM models
        ├── schemas/             # Pydantic request/response schemas
        ├── routers/             # auth, users, goals, posts, reactions, friends, notifications
        └── services/
            ├── auth.py          # JWT creation/verification, password hashing
            ├── storage.py       # R2 upload/delete helpers
            ├── notifications.py # Expo push notification sending
            └── revenuecat.py    # RevenueCat subscription verification
```

## Backend Environment Variables (`backend/.env`)
```
DATABASE_URL=postgresql+asyncpg://streakd:streakd_password@db:5432/streakd
JWT_SECRET_KEY=change-me-to-a-random-secret
INTERNAL_API_SECRET=change-me-to-a-random-secret
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=streakd
R2_PUBLIC_URL=
CORS_ORIGINS=["*"]
EXPO_ACCESS_TOKEN=
REVENUECAT_API_KEY=
```

## Subscription Model (RevenueCat)
- **Free tier**: 2 active goals, delete only
- **Subscriber tier**: Unlimited active goals, archive goals (instead of delete)
- Frontend uses RevenueCat SDK (`subscription.js`) with public key
- Backend stores `is_subscribed` flag on user, synced via SubscriptionContext listener
- `services/revenuecat.py` can verify subscription status server-side
- **NOTE**: `subscription.js` currently uses a `test_` sandbox key — must swap to production key before App Store submission

## Current State
- ✅ JWT auth (signup/login/token refresh)
- ✅ Feed (24h, friend + privacy filtered)
- ✅ Goals (CRUD, privacy controls, swipe-to-delete, archive for subscribers)
- ✅ Posts (Cloudflare R2 upload, caption, feed display)
- ✅ Reactions (toggle, batch fetch, optimistic UI)
- ✅ Friends (request, accept, reject, remove, search)
- ✅ Streak display (on goals + posts)
- ✅ Streak increment on post
- ✅ Profile editing (username, name, profile picture)
- ✅ Push notification token registration
- ✅ Push notification sending (streak reminders, reactions, friend requests)
- ✅ Notification settings (per-type toggles)
- ✅ User onboarding flow
- ✅ Subscription/paywall (RevenueCat)
- ✅ Settings screen (notifications, account management)
- ⏳ Streak reset on missed deadline
- ✅ In-app account deletion (`DELETE /users/me` + Settings.js flow)
- ✅ Privacy Policy / Terms of Service (in-app via LegalText screen; live at streakd.social/privacy.html and streakd.social/terms.html)
- ✅ Content moderation (block users, report users/posts, feed/search filtering)
- ✅ UserProfile screen (view other users, add/block/report, view friend goals)
- ⏳ Empty states polish

## Known Issues & Required Fixes

### App Store Blockers
1. ~~**No in-app account deletion**~~ — FIXED: `DELETE /users/me` endpoint added, Settings.js calls it directly with double confirmation. Verified working end-to-end.
2. ~~**No Privacy Policy or Terms of Service**~~ — FIXED: In-app LegalText screen + hosted live at streakd.social/privacy.html and streakd.social/terms.html.
3. ~~**No content moderation**~~ — FIXED: Added block/report system with `blocks` and `reports` tables, `/blocks/` router, feed/search filtering, UserProfile screen with report/block actions.
4. **RevenueCat production key** — `subscription.js` uses test key. Requires Apple Developer account first: create subscription product in App Store Connect, add shared secret to RevenueCat, link product to `streakd+` entitlement and `default` offering, then copy production `appl_...` key.
5. **Bundle ID placeholder** — `app.json` still uses `com.yourname.streakd`. Requires Apple Developer account to register real bundle ID.
6. ~~**Backend HTTPS**~~ — FIXED: `api.streakd.social` is live with nginx + Let's Encrypt, proxying to port 8000. `app.json` updated to use it.
7. **Missing photo library permission** — `app.json` needs `NSPhotoLibraryUsageDescription` string added under `ios.infoPlist`. App accesses photo library for post images and profile pictures; without this string iOS will crash.
8. **APNs certificate** — Push notifications require an APNs key configured in Apple Developer account and linked in EAS.
9. **App Store Connect metadata** — Requires Apple Developer account: app listing, screenshots (have website assets), description, keywords, age rating, category.

### Security Issues
5. ~~**CORS wildcard + credentials**~~ — FIXED: `main.py` now disables credentials when origins is `["*"]`. Set `CORS_ORIGINS` in `.env` to your domain(s) for production.
6. ~~**Hardcoded default secrets**~~ — FIXED: `config.py` now logs warnings at startup for default secrets. Must set real values in `.env` for production.
7. ~~**Hardcoded API URL**~~ — FIXED: `api.js` now reads from `app.json > extra > apiUrl` via expo-constants. Set production URL in `app.json` before deployment.
8. ~~**No password requirements**~~ — FIXED: `schemas/auth.py` now requires min 8 chars, max 128.
9. **No rate limiting** — No protection against brute-force login or spam signups.
10. ~~**No input length validation in Pydantic schemas**~~ — FIXED: Added `Field` constraints matching DB column lengths across auth, user, goal, and post schemas.

### Backend Bugs
11. ~~**Max goals limit not enforced**~~ — FIXED: `create_goal` now counts active goals and returns 403 for free users at limit.
12. ~~**N+1 query in friendships**~~ — FIXED: `GET /friends/` now uses a single joined query with aliased User.
13. ~~**No unique constraint on friendships table**~~ — FIXED: Added `UniqueConstraint` on model + migration 007.
14. ~~**Notification settings bug**~~ — FIXED: Changed `not ns` to `ns is None` in `reactions.py`.
15. ~~**R2 orphaned files**~~ — FIXED: Goal deletion now cleans up R2 files before committing DB delete.

### Frontend Bugs
16. ~~**DataContext dependency cycles**~~ — FIXED: `lastFetch` moved to refs, `useCallback` deps only include `user`.
17. ~~**FeedHeader.js is dead code**~~ — FIXED: Deleted.
18. ~~**Duplicate `formatTimestamp()`**~~ — FIXED: Extracted to `utils/formatTimestamp.js`, used by Feed.js and GoalFeed.js.
19. ~~**EditProfile.js username check not debounced**~~ — FIXED: 400ms debounce added.
20. ~~**PostCard unmount race**~~ — FIXED: Added `cancelled` flag in useEffect cleanup.
21. ~~**Push token spam**~~ — FIXED: Tracks `lastRegisteredUserId` ref, only registers on user change.

### Minor Issues (Remaining)
22. **No token revocation** — JWTs remain valid after logout until expiry. Leaked tokens can't be invalidated.
23. **No pagination on feed or search** — All matching results loaded at once. Will degrade with scale.
24. ~~**Silent streak increment failure**~~ — FIXED: CreatePost.js now shows a specific message if streak update fails after post creation.

## Developer Notes
- **Experience Level**: No prior JS/React experience — require clear explanations, avoid assumptions
- **Error Handling**: Use comprehensive try-catch blocks throughout
- **Security**: No RLS (not using Supabase) — authorization is enforced in FastAPI route handlers via JWT dependency; always verify the authenticated user owns the resource before mutating it
- **When Making Changes**: Use async/await, test edge cases (no friends, no posts, empty goals), keep responses concise but complete
