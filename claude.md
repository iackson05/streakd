# Streakd - Goal Accountability App

## Project Overview
React Native mobile app for goal accountability with friends. Users create goals, post progress photos on scheduled times, and friends provide support through reactions and visibility.

**Core Concept**: BeReal-style accountability - scheduled notifications prompt users to post proof of working on their goals. Friends see posts from last 24 hours, creating social motivation.

## Tech Stack
- **Frontend**: React Native (Expo ~54.0.20)
- **Backend**: Supabase (auth, database, storage)
- **Navigation**: React Navigation (Stack)
- **Icons**: lucide-react-native

## Database Schema

### users
- id (uuid, pk)
- username (text)
- email (text)
- profile_picture_url (text)
- created_at (timestamp)

### goals
- id (uuid, pk)
- user_id (uuid, fk → users)
- title (text)
- description (text)
- completed (boolean)
- privacy (enum: 'public', 'friends', 'private')
- streak_count (int, default 0)
- streak_interval (int) - days between required posts
- last_posted_at (timestamp)
- created_at (timestamp)

### posts
- id (uuid, pk)
- user_id (uuid, fk → users)
- goal_id (uuid, fk → goals)
- image_url (text)
- caption (text)
- created_at (timestamp)
- reaction_fire (int, default 0)
- reaction_fist (int, default 0)
- reaction_party (int, default 0)
- reaction_heart (int, default 0)

### reactions
- id (uuid, pk)
- post_id (uuid, fk → posts)
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

## Key Features Implemented

### Authentication
- Supabase Auth with email/password
- AuthContext provider managing user state
- Profile auto-creation on signup via database trigger

### Feed System
- Shows posts from accepted friends + self (last 24 hours)
- Respects goal privacy settings (filters out private goals from friends)
- Real-time reaction counts via Postgres function
- Pull-to-refresh functionality

### Reactions
- Uses `toggle_reaction()` RPC function to bypass RLS
- Optimistic UI updates with local state
- Aggregated counts stored directly on posts table

### Friends System
- Send/accept/reject friend requests
- Search users by username
- Status-based filtering (pending vs accepted)

### Goals System
- Max 3 active goals per user
- Privacy tags (Private/Friends) displayed on goal cards
- Swipe-to-delete using `react-native-gesture-handler` Swipeable
- Streak count displayed with 🔥 emoji on goals and posts

### Streak System
- `streak_count` incremented via `incrementGoalStreak()` when user posts
- `last_posted_at` updated on each post
- Streak reset to 0 handled by `send-streak-notification` edge function if deadline passes
- `streak_interval` defines days between required posts

## Important Implementation Details

### RLS (Row Level Security)
- Enabled on all tables
- Reactions use RPC function to bypass RLS for atomic updates
- Posts filter based on friendship status and goal privacy

### Performance Patterns
- Local state for reaction counts (avoid re-fetching entire post)
- Batch queries using Supabase joins
- Filter privacy client-side after fetching (simpler than complex SQL)
- Batch fetch user reactions with `getUserReactionsForPosts()` to avoid N+1 queries
- Friend count computed from friendships table (not stored as column)

### Common Gotchas
- Always check `user` exists before Supabase calls
- Use `maybeSingle()` when expecting 0 or 1 results
- Handle `PGRST116` error code (no rows returned)
- Image URLs need proper error handling (broken/missing images)
- App.js must wrap with `GestureHandlerRootView` for swipe gestures to work

## File Structure
```
src/
├── screens/
│   ├── Feed.js          # Main feed, shows friend posts
│   ├── Login.js         # Auth screen
│   └── ...
├── components/
│   └── feed/
│       └── PostCard.js  # Individual post with reactions
├── contexts/
│   └── AuthContext.js   # User session management
└── services/
    └── supabase.js      # Supabase client config
    └── ...              # Supabase API calls (used in screen files)
```

## Developer Notes
- **Experience Level**: No prior JS/React/Supabase experience
- **Code Style**: Require clear explanations, avoid assumptions
- **Error Handling**: Implement comprehensive try-catch blocks
- **Security**: Always explain RLS implications when modifying queries

## Current State
- ✅ Auth flow (login/signup)
- ✅ Feed with real posts
- ✅ Reactions system
- ✅ Friends system
- ✅ Goal privacy controls
- ✅ Scheduled notifications
- ✅ Profile editing
- ✅ Streak display (on posts and goals)
- ✅ Swipe-to-delete goals
- ✅ 3 active goals limit
- ✅ Privacy tags on goals
- ⏳ Post creation UI (camera preview size doesn't match PostCard aspect ratio)
- ⏳ User onboarding (no walkthrough, profile setup, or friend discovery for new users)
- ⏳ Goal completion flow (no way to mark goals as completed)
- ⏳ Empty states polish (better UX for no goals, no friends, etc.)


## When Making Changes
1. Always consider RLS policies
2. Explain security implications
3. Use async/await with proper error handling
4. Test edge cases (no friends, no posts, etc.)
5. Keep responses concise but complete