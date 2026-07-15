// MatchUp API client — thin fetch wrapper with token injection
import { storage } from "@/src/utils/storage";

// Base URL strategy (works across local dev, native, and preview URLs):
//  1. Explicit env var wins (EXPO_PUBLIC_BACKEND_URL) — useful for staging overrides.
//  2. Web on a NON-localhost origin (Emergent preview URL, custom domain) → "" so
//     /api/* is served from the SAME origin (routed by ingress to the backend).
//  3. Web on localhost OR native (iOS/Android) → fallback to http://localhost:8001.
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (explicit && explicit.length > 0) return explicit.replace(/\/+$/, "");
  if (typeof window !== "undefined" && (window as any).location) {
    const host = ((window as any).location.hostname || "").toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
    if (!isLocal) return ""; // same-origin: /api/* handled by ingress
  }
  return "http://localhost:8001";
}

const BASE_URL = resolveBaseUrl();
const TOKEN_KEY = "pf_auth_token";

let cachedToken: string | null = null;

export const tokenStore = {
  async load(): Promise<string | null> {
    if (cachedToken) return cachedToken;
    cachedToken = await storage.secureGet<string>(TOKEN_KEY, "");
    return cachedToken || null;
  },
  async save(token: string) {
    cachedToken = token;
    await storage.secureSet(TOKEN_KEY, token);
  },
  async clear() {
    cachedToken = null;
    await storage.secureRemove(TOKEN_KEY);
  },
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await tokenStore.load();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api${path}`, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new ApiError(typeof msg === "string" ? msg : JSON.stringify(msg), res.status);
  }
  return data as T;
}

export const api = {
  // Auth
  register: (body: { email: string; password: string; name: string }) =>
    request<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<any>("/auth/me"),
  googleLogin: (session_id: string) =>
    request<{ token: string; user: any }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ session_id }),
    }),
  registerPush: (platform: string, device_token: string) =>
    request<any>("/register-push", {
      method: "POST",
      body: JSON.stringify({ platform, device_token }),
    }),

  // User
  updateMe: (body: any) => request<any>("/users/me", { method: "PATCH", body: JSON.stringify(body) }),
  getUser: (id: string) => request<any>(`/users/${id}`),

  // Groups
  listGroups: (params?: {
    q?: string;
    level?: string;
    city?: string;
    sort?: string;
    radius_km?: number;
    day?: string;
    position?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.level) qs.set("level", params.level);
    if (params?.city) qs.set("city", params.city);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.radius_km !== undefined) qs.set("radius_km", String(params.radius_km));
    if (params?.day) qs.set("day", params.day);
    if (params?.position) qs.set("position", params.position);
    const s = qs.toString();
    return request<any[]>(`/groups${s ? "?" + s : ""}`);
  },
  getGroup: (id: string) => request<any>(`/groups/${id}`),
  createGroup: (body: any) => request<any>("/groups", { method: "POST", body: JSON.stringify(body) }),
  updateGroup: (id: string, body: any) =>
    request<any>(`/groups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  joinGroup: (id: string, message?: string) =>
    request<any>(`/groups/${id}/join`, {
      method: "POST",
      body: JSON.stringify({ message: message ?? null }),
    }),
  cancelJoin: (id: string) =>
    request<any>(`/groups/${id}/join-requests/cancel`, { method: "POST" }),
  leaveGroup: (id: string) => request<any>(`/groups/${id}/leave`, { method: "POST" }),
  groupMembers: (id: string) => request<any[]>(`/groups/${id}/members`),
  myGroups: () => request<any[]>("/groups/mine/list"),
  joinRequests: (id: string) => request<any[]>(`/groups/${id}/join-requests`),
  approveRequest: (groupId: string, reqId: string) =>
    request<any>(`/groups/${groupId}/join-requests/${reqId}/approve`, { method: "POST" }),
  rejectRequest: (groupId: string, reqId: string) =>
    request<any>(`/groups/${groupId}/join-requests/${reqId}/reject`, { method: "POST" }),

  // Messages
  getMessages: (groupId: string) => request<any[]>(`/groups/${groupId}/messages`),
  sendMessage: (groupId: string, body: { text?: string; image?: string; poll?: any }) =>
    request<any>(`/groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  votePoll: (msgId: string, option_index: number) =>
    request<any>(`/messages/${msgId}/poll/vote`, {
      method: "POST",
      body: JSON.stringify({ option_index }),
    }),

  // Matches
  listMatches: (groupId: string) => request<any[]>(`/groups/${groupId}/matches`),
  getMatch: (id: string) => request<any>(`/matches/${id}`),
  createMatch: (body: any) =>
    request<any>("/matches", { method: "POST", body: JSON.stringify(body) }),
  rsvp: (id: string, status: "going" | "maybe" | "decline") =>
    request<any>(`/matches/${id}/rsvp`, { method: "POST", body: JSON.stringify({ status }) }),
  assignTeam: (matchId: string, user_id: string, team: "a" | "b" | "bench" | "none") =>
    request<any>(`/matches/${matchId}/team`, {
      method: "POST",
      body: JSON.stringify({ user_id, team }),
    }),
  joinMatch: (id: string) => request<any>(`/matches/${id}/join`, { method: "POST" }),
  leaveMatch: (id: string) => request<any>(`/matches/${id}/leave`, { method: "POST" }),

  // Reports & Blocks (moderation)
  report: (body: { target_type: "user" | "group"; target_id: string; reason: string; message?: string }) =>
    request<any>("/reports", { method: "POST", body: JSON.stringify(body) }),
  block: (target_type: "user" | "group", target_id: string) =>
    request<any>("/blocks", {
      method: "POST",
      body: JSON.stringify({ target_type, target_id }),
    }),
  unblock: (target_type: "user" | "group", target_id: string) =>
    request<any>(`/blocks/${target_type}/${target_id}`, { method: "DELETE" }),
  listBlocks: () => request<any[]>("/blocks"),

  // Friends
  friendRequest: (to_user_id: string) =>
    request<any>("/friends/request", { method: "POST", body: JSON.stringify({ to_user_id }) }),
  friendAccept: (id: string) => request<any>(`/friends/${id}/accept`, { method: "POST" }),
  friendDecline: (id: string) => request<any>(`/friends/${id}/decline`, { method: "POST" }),
  friendRemove: (id: string) => request<any>(`/friends/${id}`, { method: "DELETE" }),
  friends: () => request<any>("/friends"),
  friendStatus: (id: string) => request<{ status: string }>(`/friends/status/${id}`),

  // Ratings
  rateMatch: (matchId: string, ratings: Record<string, { level: number; punctuality: number; fairplay: number }>) =>
    request<any>(`/matches/${matchId}/ratings`, {
      method: "POST",
      body: JSON.stringify({ match_id: matchId, ratings }),
    }),
  myRatings: (matchId: string) =>
    request<Record<string, { level: number; punctuality: number; fairplay: number }>>(
      `/matches/${matchId}/ratings/mine`,
    ),

  // Security
  changePassword: (current_password: string, new_password: string) =>
    request<any>("/users/me/password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
  requestOtp: (target: "email" | "phone" | "mfa") =>
    request<any>(`/security/otp/request?target=${target}`, { method: "POST" }),
  verifyOtp: (code: string, target: "email" | "phone" | "mfa") =>
    request<any>("/security/otp/verify", {
      method: "POST",
      body: JSON.stringify({ code, target }),
    }),

  // Geocoding (OpenStreetMap Nominatim proxy)
  geocodeSearch: (q: string, limit = 6) => {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    return request<any[]>(`/geocode/search?${qs.toString()}`);
  },
  geocodeReverse: (lat: number, lon: number) => {
    const qs = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    return request<any>(`/geocode/reverse?${qs.toString()}`);
  },
};

export { ApiError };
