import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, saveToken, getToken, clearToken } from "./api";
import { makeT, Lang } from "./i18n";
import { MOODS, Mood } from "./moods";

type User = {
  id: string;
  phone?: string;
  email?: string | null;
  name: string;
  language: Lang;
  consents: Record<string, boolean>;
  health_connected: Record<string, boolean>;
  assigned_resources?: string[];
};

type Ctx = {
  ready: boolean;
  user: User | null;
  lang: Lang;
  t: (k: string) => string;
  moods: Mood[];
  setLang: (l: Lang) => Promise<void>;
  requestOtp: (payload: any) => Promise<{ dev_code?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateConsents: (c: Record<string, boolean>) => Promise<void>;
};

const AppContext = createContext<Ctx>(null as any);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLangState] = useState<Lang>("en");
  const [moods, setMoods] = useState<Mood[]>(MOODS);

  const bootstrap = useCallback(async () => {
    try {
      const cfg = await api.get("/config");
      if (cfg?.moods?.length) setMoods(cfg.moods);
    } catch {}
    const token = await getToken();
    if (token) {
      try {
        const u = await api.get("/auth/me");
        setUser(u);
        setLangState(u.language || "en");
      } catch {
        await clearToken();
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const requestOtp = async (payload: any) => {
    return api.post("/auth/request-otp", payload);
  };

  const verifyOtp = async (phone: string, code: string) => {
    const res = await api.post("/auth/verify-otp", { phone, code });
    await saveToken(res.token);
    setUser(res.user);
    setLangState(res.user.language || "en");
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const u = await api.get("/auth/me");
      setUser(u);
    } catch {}
  };

  const setLang = async (l: Lang) => {
    setLangState(l);
    if (user) {
      try {
        await api.put("/me/language", { language: l });
        setUser({ ...user, language: l });
      } catch {}
    }
  };

  const updateConsents = async (c: Record<string, boolean>) => {
    const res = await api.put("/me/consents", { consents: c });
    if (user) setUser({ ...user, consents: res.consents });
  };

  return (
    <AppContext.Provider
      value={{ ready, user, lang, t: makeT(lang), moods, setLang, requestOtp, verifyOtp, logout, refreshUser, updateConsents }}
    >
      {children}
    </AppContext.Provider>
  );
}
