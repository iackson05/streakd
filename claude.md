# Streakd - Goal Accountability App

## Project Overview
React Native mobile app for goal accountability with friends. Users create goals, post progress photos on scheduled times, and friends provide support through reactions and visibility.

**Core Concept**: BeReal-style accountability - scheduled notifications prompt users to post proof of working on their goals. Friends see posts from last 24 hours, creating social motivation.

## Tech Stack

### Frontend
- **Framework**: React Native 0.81.5, Expo ~54.0.20
- **Navigation**: React Navigation 7 (Stack Navigator)
- **State**: Context API (AuthContext, DataContext)
- **HTTP Client**: Custom JWT fetch wrapper (`services/api.js`) with auto-refresh
- **Icons**: lucide-react-native
- **Gestures**: react-native-gesture-handler (swipe-to-delete)
- **Storage**: AsyncStorage (tokens, session persistence)
- **Notifications**: Expo Notifications + push tokens
- **Camera/Images**: Expo Camera, Expo Image Picker
- **Deployment**: EAS (Expo Application Services)

### Backend
- **Framework**: FastAPI (Python) on Uvicorn
- **Database**: PostgreSQL (async via SQLAlchemy + asyncpg)
- **Migrations**: Alembic
- **Auth**: JWT (python-jose) — access + refresh tokens; bcrypt for passwords
- **Image Storage**: Cloudflare R2 (S3-compatible, via boto3)
- **Deployment**: Docker + Docker Compose

**Base URL**: `http://localhost:8000`

## Database Schema

### users
- id (uuid, pk)
- username (text, unique)
- email (text, unique)
- password_hash (text)
- profile_picture_url (text)
- push_token (text)
- push_notifications_enabled (boolean)
- created_at (timestamp)

### goals
- id (uuid, pk)
- user_id (uuid, fk → users, cascade delete)
- title (text)
- description (text)
- completed (boolean)
- privacy (enum: 'friends', 'private')
- streak_count (int, default 0)
- streak_interval (int) — days between required posts
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

### Goals (`/goals`)
- `GET /` — All goals for current user
- `GET /active` — Non-completed goals only
- `POST /` — Create goal (enforces max 3 active)
- `DELETE /{goal_id}` — Delete goal + cascade delete posts/reactions, cleanup R2 images
- `PUT /{goal_id}/complete` — Mark goal as completed
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
- `GET /` — All friendships with friend info
- `GET /accepted-ids` — List of accepted friend user IDs
- `POST /request` — Send friend request (bidirectional duplicate check)
- `PUT /accept` — Accept pending request
- `DELETE /reject` — Reject pending request
- `DELETE /{friend_id}` — Remove accepted friendship

## Frontend Services (`services/`)

- **api.js** — JWT HTTP client. Stores tokens under `streakd_access_token` / `streakd_refresh_token` in AsyncStorage. Auto-refreshes on 401 and retries. Exposes `apiGet`, `apiPost`, `apiPut`, `apiDelete`. Supports FormData for file uploads.
- **supabase.js** — Auth wrapper: `signUp`, `signIn`, `signOut`, `getCurrentUser`, `getUserProfile`, `checkUsernameAvailable`. (Named supabase.js for legacy reasons — hits the custom API, not Supabase.)
- **goals.js** — `getUserGoals`, `getUserActiveGoals`, `createGoal`, `incrementGoalStreak`, `deleteGoal`, `completeGoal`
- **posts.js** — `getFeedPosts`, `getGoalPosts`, `createPost` (uploads image to R2), `getUserReactionsForPosts`, `deletePost`
- **users.js** — `searchUsers`, `getUserFriendships`, `getAcceptedFriendIds`, `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `removeFriend`, `updateUsername`, `uploadProfilePicture`, `updateNotificationSettings`, `getNotificationSettings`

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
│   └── users.js
│
├── contexts/
│   ├── AuthContext.js
│   └── DataContext.js
│
├── screens/
│   ├── Feed.js
│   ├── Profile.js
│   ├── CreatePost.js
│   ├── GoalFeed.js
│   ├── Onboarding.js
│   ├── LoginScreen.js
│   ├── SignUpScreen.js
│   └── NotificationsSettings.js
│
├── components/
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
    │       └── 002_add_push_columns.py
    └── app/
        ├── main.py              # FastAPI app + router registration
        ├── config.py            # Settings (JWT, R2, DB, CORS)
        ├── database.py          # SQLAlchemy async engine + session
        ├── dependencies.py      # JWT auth dependency injection
        ├── models/              # SQLAlchemy ORM models
        ├── schemas/             # Pydantic request/response schemas
        ├── routers/             # auth, users, goals, posts, reactions, friends
        └── services/
            ├── auth.py          # JWT creation/verification, password hashing
            └── storage.py       # R2 upload/delete helpers
```

## Backend Environment Variables (`backend/.env`)
```
DATABASE_URL=postgresql+asyncpg://streakd:streakd_password@db:5432/streakd
JWT_SECRET_KEY=change-me-to-a-random-secret
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=streakd
R2_PUBLIC_URL=
CORS_ORIGINS=["*"]
```

## Current State
- ✅ JWT auth (signup/login/token refresh)
- ✅ Feed (24h, friend + privacy filtered)
- ✅ Goals (CRUD, max 3 active, privacy controls, swipe-to-delete)
- ✅ Posts (Cloudflare R2 upload, caption, feed display)
- ✅ Reactions (toggle, batch fetch, optimistic UI)
- ✅ Friends (request, accept, reject, remove, search)
- ✅ Streak display (🔥 on goals + posts)
- ✅ Streak increment on post
- ✅ Profile editing (username, profile picture)
- ✅ Push notification token registration
- ✅ Notification settings (per-type toggles)
- ✅ User onboarding flow
- ⏳ Push notification sending (no delivery logic yet)
- ⏳ Streak reset on missed deadline
- ⏳ Goal completion UI
- ⏳ Empty states polish

## Developer Notes
- **Experience Level**: No prior JS/React experience — require clear explanations, avoid assumptions
- **Error Handling**: Use comprehensive try-catch blocks throughout
- **Security**: No RLS (not using Supabase) — authorization is enforced in FastAPI route handlers via JWT dependency; always verify the authenticated user owns the resource before mutating it
- **When Making Changes**: Use async/await, test edge cases (no friends, no posts, empty goals), keep responses concise but complete
