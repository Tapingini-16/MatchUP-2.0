// Auth context — provides user state + login/logout across app
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, tokenStore } from "@/src/api/client";
import { registerForPush } from "@/src/api/push";

type User = {
  id: string;
  email: string;
  name: string;
  photo?: string | null;
  age?: number | null;
  position?: string | null;
  level?: string | null;
  foot?: string | null;
  city?: string | null;
  radius_km?: number | null;
  bio?: string | null;
  availabilities: string[];
  matches_played: number;
  goals: number;
  assists: number;
  reputation: number;
  badges: string[];
  verified: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const bootstrap = useCallback(async () => {
    try {
      const token = await tokenStore.load();
      if (token) {
        const me = await api.me();
        setUser(me);
        registerForPush();
      }
    } catch {
      await tokenStore.clear();
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      await tokenStore.save(res.token);
      setUser(res.user);
      registerForPush();
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const res = await api.register({ email, password, name });
      await tokenStore.save(res.token);
      setUser(res.user);
      registerForPush();
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await tokenStore.clear();
    setUser(null);
  };

  const refresh = async () => {
    const me = await api.me();
    setUser(me);
  };

  const updateUser = async (patch: Partial<User>) => {
    const updated = await api.updateMe(patch);
    setUser(updated);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const redirectUrl =
        Platform.OS === "web"
          ? window.location.origin + "/"
          : Linking.createURL("auth");
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      let sessionId: string | null = null;

      if (Platform.OS === "web") {
        // On web, do a full navigation. Session comes back in URL hash on remount.
        window.location.href = authUrl;
        return;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        if (result.type !== "success" || !result.url) {
          return;
        }
        const url = result.url;
        const hash = url.split("#")[1] ?? "";
        const search = url.split("?")[1]?.split("#")[0] ?? "";
        const params = new URLSearchParams(hash || search);
        sessionId = params.get("session_id");
      }

      if (!sessionId) throw new Error("Aucune session Google reçue");
      const res = await api.googleLogin(sessionId);
      await tokenStore.save(res.token);
      setUser(res.user);
      registerForPush();
    } finally {
      setLoading(false);
    }
  };

  // On web, if we land back with #session_id=..., exchange it immediately.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const w: any = typeof window !== "undefined" ? window : null;
    if (!w) return;
    const raw = (w.location.hash || "").replace(/^#/, "") || (w.location.search || "").replace(/^\?/, "");
    if (!raw) return;
    const params = new URLSearchParams(raw);
    const sessionId = params.get("session_id");
    if (!sessionId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.googleLogin(sessionId);
        await tokenStore.save(res.token);
        setUser(res.user);
        registerForPush();
        w.history.replaceState(null, "", w.location.pathname);
      } catch (e) {
        console.log("Google exchange failed", e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, ready, signIn, signUp, signOut, refresh, updateUser, signInWithGoogle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
