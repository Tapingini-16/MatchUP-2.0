# MatchUp — Product Requirements Document (V4)

## Vision
MatchUp (formerly PitchFinder) is the reference mobile app for local amateur football. It connects amateur players so they can join or create groups of nearby players, easily organize matches, and build a genuine local community.

## Tech Stack
- **Frontend**: Expo Router (React Native), TypeScript, Reanimated, expo-linear-gradient, expo-image, expo-haptics, expo-image-picker, expo-secure-store, expo-notifications, expo-web-browser, expo-linking, expo-clipboard, @react-native-community/slider, react-native-keyboard-controller, react-native-maps
- **Backend**: FastAPI, MongoDB (motor), JWT (python-jose), bcrypt, httpx
- **Fonts**: Barlow Condensed + DM Sans + Space Mono
- **Theme**: Dark & Light mode (Obsidian / Airbnb-white)

## V1 (base — from iteration 1)
Onboarding + email/password auth + 4 tabs (Home / Discover / Chat / Profile) + Group detail + Chat (5s polling) + Profile with stats/badges + Edit profile + Create group + Notifications + Settings.

## V2 (from iteration 2)
Join request system (admin approval), Match RSVP + team composition (tap-to-assign), Emergent Google Auth ("Continuer avec Google"), Emergent Push Notifications (graceful degrade with placeholder key).

## V3 Additions (this iteration)

### 1. Advanced Search
- **New Group fields**: `preferred_days: string[]` (mon..sun) and `positions_needed: string[]` (GK/DEF/MID/FWD) — updatable in create/edit
- **Discover query params**: `radius_km`, `day`, `position` (in addition to q, level, sort). `day` and `position` accept **CSV** for multi-select (e.g., `day=sat,sun&position=GK,DEF`) — backend uses `$in` on MongoDB. Single value still works (backward compatible).
- **Backend filtering**:
  - `day` (CSV) filters `preferred_days` array-contains any of the values
  - `position` (CSV) filters `positions_needed` array-contains any of the values
  - `radius_km` post-filters by `distance_km <= radius_km`
- **Frontend** (`Discover`):
  - New filters button (top-right of header) with active-count badge (sums radius + N days + N positions)
  - Bottom-sheet **AdvancedFiltersSheet** with: radius slider (1–30km, 30=∞), day chips (7 days, **multi-select toggle**), position chips (4 positions, **multi-select toggle**). Subtitle "Multi-sélection possible" clarifies UX.
  - Active-filter pills row under sort chips — one pill per selected day + one per position + one for radius. Tap × to clear individually.
  - `Réinitialiser` button resets all filters to defaults (`days: []`, `positions: []`, `radius_km: 30`)
- **Frontend** (`Group Detail`): new section showing preferred_days + positions_needed as chips
- **Frontend** (`Create Group`): pill selectors for both fields at bottom of form

### 2. Report + Block (Moderation)
- **New endpoints**:
  - `POST /reports` — body `{target_type: user|group, target_id, reason, message?}` — reasons enumerated: spam/harassment/inappropriate/fake/other. Self-report → 400
  - `POST /blocks` — upsert (idempotent). Self-block → 400
  - `DELETE /blocks/{target_type}/{target_id}` — unblock
  - `GET /blocks` — list with populated target (user or group)
- **Automatic filtering**:
  - `GET /groups` excludes groups the caller has blocked
  - `GET /groups/{id}/messages` excludes messages from blocked users
- **Frontend**:
  - `ReportModal` (bottom-sheet) reusable for user or group targets — 5 radio-style reason chips + optional details textarea + submit → success animation
  - Group detail top-right ellipsis → **group-menu** bottom-sheet with Share / Report / Block. Block hidden for the group admin
  - Chat: long-press a foreign message → open ReportModal to report that user
  - New `/blocked` screen (linked from Settings → Compte → 'Utilisateurs & groupes bloqués') with unblock action per item
  - Menu contextuel bottom sheet with 3 actions
- **Data model**: `reports` collection `{id, reporter_id, target_type, target_id, reason, message, status, created_at}`; `blocks` collection `{user_id, target_type, target_id, created_at}` (upsert key = user_id+target_type+target_id)

## Backend API Overview (V3 additions marked ★)

| Route | Method | Description |
|-------|--------|-------------|
| `/groups` (extended) | GET | + `radius_km`, `day`, `position` params; auto-excludes blocked groups |
| `/groups/{id}` | PATCH ★ | Admin-only update (name, description, preferred_days, positions_needed, level, max_members, photo, city) |
| `/reports` ★ | POST | Create moderation report |
| `/blocks` ★ | POST | Block a user or group (idempotent) |
| `/blocks/{type}/{id}` ★ | DELETE | Unblock |
| `/blocks` ★ | GET | List my blocks with populated targets |

## Testing Coverage
- V1 iter 1: 23/23 backend + full frontend flows
- V2 iter 2: 19/20 backend + all V2 flows (register-push graceful degrade fix)
- V3 iter 3: 15/15 backend + all V3 flows

## V4 Additions (this iteration — MatchUp rebrand)
- **Rebrand** PitchFinder → **MatchUp** across UI, docs and seeded demo emails
- **Keyboard UX Fix**: `react-native-keyboard-controller` (`KeyboardProvider` at root, `KeyboardAwareScrollView` on all forms, `KeyboardAvoidingView` + `keyboardDidShow` auto-scroll in chat) — TextInputs never hidden behind keyboard
- **Dark / Light theme**: `ThemeProvider` with persisted mode, `darkPalette` + `lightPalette`, `useThemeColors()`
- **Friends system**: send/accept/decline requests + list + status per user
- **Polls in chat**: `PollComposer` bottom sheet, `PollCard` with animated vote fill, single-vote per user
- **Photo sharing in chat**: `expo-image-picker` (with permission fallback → OpenSettings on denied) → base64 image messages
- **Field location card** on group detail (opens Google Maps deep-link)
- **Share group** bottom sheet: light card + copier + native `Share.share`
- **Leave group** action with confirmation `Alert`
- **Clickable member avatars** in group detail + chat → profile route
- **Post-match ratings**: `RatingModal` (Niveau / Ponctualité / Fair-play) tied to menu item
- **Map screen** (`/map`): real `react-native-maps` on iOS/Android (via platform-split `NativeMap.native.tsx` / `.web.tsx`), stylized field mock on web
- **Security center** (`/security`): OTP for email / phone / MFA (dev accepts `000000`) + password change
- **Legal / Support pages** (`/legal/[page]`)

## Deploy Notes
- `EMERGENT_PUSH_KEY` remains placeholder until deploy pipeline injection
- `google-services.json` required for Android push (upload during Publish flow)
- Push not testable in Expo Go — requires real device build
- `react-native-maps` requires a native build (not testable in web preview — mock shown instead)
