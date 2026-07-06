# PitchFinder — Product Requirements Document

## Vision
PitchFinder is the reference mobile app for local amateur football. It connects amateur players so they can join or create groups of nearby players, easily organize matches, and build a genuine local community.

## Tech Stack
- **Frontend**: Expo Router (React Native), TypeScript, Reanimated, expo-blur, expo-linear-gradient, expo-image, expo-haptics, expo-image-picker, expo-secure-store
- **Backend**: FastAPI, MongoDB (motor), JWT (python-jose), bcrypt
- **Fonts**: Barlow Condensed (display/tactical) + DM Sans (body) + Space Mono (code)
- **Theme**: Dark-first premium (Obsidian #090A0C · Terrain Green #1ED760)

## Core User Flows

### 1. Onboarding + Auth
- 3-slide onboarding with full-bleed football imagery, gradient scrim
- Email/password sign up (name, email, password ≥ 6 chars)
- Email/password sign in (demo credentials pre-filled)
- Token persisted in expo-secure-store; auto-login on relaunch

### 2. Home Feed (`/(tabs)`)
- Personal greeting + avatar
- Notification button with dot
- "Create your group" CTA card
- List of nearby groups sorted by distance

### 3. Discover (`/(tabs)/discover`)
- Search bar (name, city, description)
- **Sticky horizontal level chips** (Tous · Débutant · Intermédiaire · Avancé · Élite · Mixte) — 56pt row, 36pt chips, no wrap, `flexShrink:0`
- Sort chips: Proche · Populaire · Récent
- Filtered group list

### 4. Group Detail (`/group/[id]`)
- Hero image with gradient + level pill + back/share buttons
- About, next match card, member horizontal list
- Sticky bottom bar: Join (instant) or "Voir le chat" if member

### 5. Private Group Chat (`/chat/[id]`)
- Header with group name + members count (tap → group detail)
- Realtime-ish messaging (5s polling)
- Own messages green primary, others surface, sender name + timestamp
- Keyboard-aware input bar

### 6. Chat list (`/(tabs)/chat`)
- My groups list with photo, name, level, member count

### 7. Profile (`/(tabs)/profile`)
- Banner gradient + avatar (online + verified badges)
- Level / position / foot pills
- Bio card (or CTA if empty)
- Stats trio: Matches / Goals / Assists + Reputation bar
- Badge wall (11 badge types with icons + colors)
- Edit profile + logout

### 8. Edit Profile (`/edit-profile`)
- Photo picker (expo-image-picker) → base64
- Name, bio (280 chars), city, age, radius
- Position / Level / Foot pills
- Availabilities multi-select

### 9. Create Group (`/create-group`)
- Cover picker (6 stock covers)
- Name, city, description, level, max members

### 10. Notifications & Settings
- Notifications feed (sample data)
- Settings groups: Compte, Préférences (notifs, thème, langue), Aide, Logout

## Backend API (all `/api` prefixed, JWT bearer)

| Route | Method | Description |
|-------|--------|-------------|
| `/auth/register` | POST | Create account |
| `/auth/login` | POST | Authenticate |
| `/auth/me` | GET | Current user |
| `/users/me` | PATCH | Update profile |
| `/users/{id}` | GET | Public profile |
| `/groups` | GET | Search + filter + sort (q, level, city, sort) |
| `/groups` | POST | Create |
| `/groups/{id}` | GET | Detail |
| `/groups/{id}/members` | GET | Members list |
| `/groups/{id}/join` | POST | Join (instant) |
| `/groups/{id}/leave` | POST | Leave |
| `/groups/mine/list` | GET | My groups |
| `/groups/{id}/messages` | GET/POST | Chat |
| `/groups/{id}/matches` | GET | List matches |
| `/matches` | POST | Create match |
| `/matches/{id}/join` `/leave` | POST | Toggle |
| `/seed` | POST | Idempotent seed |

## Data Models
- **User**: id, email, password_hash (bcrypt), name, photo (base64/url), age, position (GK/DEF/MID/FWD), level, foot, city, radius_km, bio, availabilities[], matches_played, goals, assists, reputation, badges[], verified
- **Group**: id, name, description, photo, city, level, max_members, admin_id, distance_km
- **GroupMember**: group_id, user_id, role (admin/member), joined_at
- **Message**: id, group_id, user_id, user_name, user_photo, text, created_at
- **Match**: id, group_id, title, location, date, max_players, players[], created_by

## Design Tokens (see `/app/frontend/src/theme/index.ts`)
- Colors, spacing (4→56), radius (8→pill), fonts, type scale, shadow presets, level & position mappers

## Seed Data
4 demo users (Alex, Sarah, Léo, Tom) + 8 groups + 1 upcoming match per group + 3 messages per group. Auto-runs on backend startup if DB empty.
