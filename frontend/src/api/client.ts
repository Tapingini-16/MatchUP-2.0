// PitchFinder API client — thin fetch wrapper with token injection
import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
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

  // User
  updateMe: (body: any) => request<any>("/users/me", { method: "PATCH", body: JSON.stringify(body) }),
  getUser: (id: string) => request<any>(`/users/${id}`),

  // Groups
  listGroups: (params?: { q?: string; level?: string; city?: string; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.level) qs.set("level", params.level);
    if (params?.city) qs.set("city", params.city);
    if (params?.sort) qs.set("sort", params.sort);
    const s = qs.toString();
    return request<any[]>(`/groups${s ? "?" + s : ""}`);
  },
  getGroup: (id: string) => request<any>(`/groups/${id}`),
  createGroup: (body: any) => request<any>("/groups", { method: "POST", body: JSON.stringify(body) }),
  joinGroup: (id: string) =>
    request<any>(`/groups/${id}/join`, { method: "POST", body: JSON.stringify({}) }),
  leaveGroup: (id: string) => request<any>(`/groups/${id}/leave`, { method: "POST" }),
  groupMembers: (id: string) => request<any[]>(`/groups/${id}/members`),
  myGroups: () => request<any[]>("/groups/mine/list"),

  // Messages
  getMessages: (groupId: string) => request<any[]>(`/groups/${groupId}/messages`),
  sendMessage: (groupId: string, text: string) =>
    request<any>(`/groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  // Matches
  listMatches: (groupId: string) => request<any[]>(`/groups/${groupId}/matches`),
  createMatch: (body: any) =>
    request<any>("/matches", { method: "POST", body: JSON.stringify(body) }),
  joinMatch: (id: string) => request<any>(`/matches/${id}/join`, { method: "POST" }),
  leaveMatch: (id: string) => request<any>(`/matches/${id}/leave`, { method: "POST" }),
};

export { ApiError };
