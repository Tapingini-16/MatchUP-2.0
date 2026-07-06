# PitchFinder — Product Requirements Document (V2)

## Vision
PitchFinder is the reference mobile app for local amateur football. It connects amateur players so they can join or create groups of nearby players, easily organize matches, and build a genuine local community.

## Tech Stack
- **Frontend**: Expo Router (React Native), TypeScript, Reanimated, expo-blur, expo-linear-gradient, expo-image, expo-haptics, expo-image-picker, expo-secure-store, expo-notifications, expo-web-browser, expo-linking
- **Backend**: FastAPI, MongoDB (motor), JWT (python-jose), bcrypt, httpx
- **Fonts**: Barlow Condensed (display/tactical) + DM Sans (body) + Space Mono (mono)
- **Theme**: Dark-first premium (Obsidian #090A0C · Terrain Green #1ED760)

## V1 Core (from iteration 1)
- 3-slide onboarding + Email/password auth (sign-in, sign-up)
- 4-tab nav: Home / Discover (search + level chips + sort) / Chat list / Profile
- Group detail with hero, description, members, next match
- Chat with 5s polling
- Profile with stats, badges, reputation
- Edit profile (photo picker + all fields)
- Create group, notifications, settings
- Auto-seeded demo data (4 users, 8 groups, matches, welcome messages)

## V2 Additions (this iteration)

### 1. Join Request System (admin approval)
- `/api/groups/{id}/join` now creates a **pending** request instead of instant join
- Admin sees pending requests inside group detail (yellow highlighted section, testID `join-requests-toggle`)
- Approve → user becomes member + push notification "Ta demande a été acceptée"
- Reject → request marked rejected
- User can cancel their own pending request
- `join_status` field: `none | pending | member | admin` drives the CTA button label
- Modal (testID `join-modal`) with optional message on join

### 2. Match RSVP + Team Composition (`/match/[id]`)
- Big date hero + stats bar (Présents / Peut-être / Places)
- **RSVP row**: J'y suis / Peut-être / Non (green / amber / red)
- **Composition** section: 3 zones (Équipe A green · Équipe B blue · Banc gray) + NON AFFECTÉS pool
- Admin flow: tap player chip to select → "Ici" button appears in each team zone → tap to assign (mobile-native alternative to drag & drop)
- New `create-match` route with quick presets (Demain 19h, Samedi 15h…)
- `going` RSVP auto-adds to players; `maybe/decline` removes from players AND all teams
- Push to all members on match creation

### 3. Emergent Google Auth
- "Continuer avec Google" button on sign-in (testID `signin-google-button`)
- `signInWithGoogle()` opens `https://auth.emergentagent.com/?redirect=...` in WebBrowser (mobile) or full nav (web)
- Callback URL contains `session_id` in hash/query → exchanged via `POST /api/auth/google`
- Backend calls `demobackend.emergentagent.com/auth/v1/env/oauth/session-data` to get user info, upserts by email, issues our own JWT
- Google-signed-up users are marked `verified: true`

### 4. Emergent Push Notifications
- `EMERGENT_PUSH_KEY=placeholder` env (replaced by deploy pipeline)
- Backend `send_push()` helper (fire-and-forget, never blocks business ops)
- Push triggers: (a) admin receives new join request, (b) applicant receives approval, (c) group members receive new match, (d) group members receive new chat message
- Frontend `registerForPush()` runs after login/bootstrap (no-op on web, silently skips if permission denied)
- Deep-link handling on notification tap via `Notifications.addNotificationResponseReceivedListener` in `_layout.tsx`
- Graceful degrade: `/register-push` returns `{status: skipped}` when key is placeholder — endpoint never 500s

## Backend API (V2 additions marked ★)

| Route | Method | Description |
|-------|--------|-------------|
| `/auth/google` ★ | POST | Exchange Emergent session_id → JWT |
| `/register-push` ★ | POST | Register device with Emergent relay |
| `/groups/{id}/join` (mod) | POST | Creates pending request |
| `/groups/{id}/join-requests` ★ | GET | Admin-only pending list |
| `/groups/{id}/join-requests/{req_id}/approve` ★ | POST | Admin approves |
| `/groups/{id}/join-requests/{req_id}/reject` ★ | POST | Admin rejects |
| `/groups/{id}/join-requests/cancel` ★ | POST | User cancels own |
| `/matches/{id}` ★ | GET | Full match with users map + rsvps + teams |
| `/matches/{id}/rsvp` ★ | POST | body {status} |
| `/matches/{id}/team` ★ | POST | Admin-only body {user_id, team} |

## Data Models (extended)
- **JoinRequest**: id, group_id, user_id, user_name, user_photo, message, status, created_at, resolved_at
- **Match**: + `rsvps: {user_id: going/maybe/decline}`, + `teams: {a: [], b: [], bench: []}`
- **User**: + `auth_provider` (optional)

## Deploy Requirements
- `EMERGENT_PUSH_KEY` — auto-set by deploy pipeline (leave as `placeholder` in dev)
- **`google-services.json`** — user must upload from Firebase Console for Android push (required only when building an Android app store binary; web + iOS work with defaults)
- Push notifications only work on real device builds — **not testable in Expo Go**
