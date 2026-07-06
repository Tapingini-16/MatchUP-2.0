// Auth context — provides user state + login/logout across app
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, tokenStore } from "@/src/api/client";

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

  return (
    <Ctx.Provider value={{ user, loading, ready, signIn, signUp, signOut, refresh, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
