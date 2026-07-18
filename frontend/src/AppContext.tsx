import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, saveToken, getToken, clearToken } from "./api";
import { makeT, Lang } from "./i18n";
import { MOODS, Mood } from "./moods";

type User = {
  id: string;
  email: string;
  name: string;
  language: Lang;
  consents: Record<string, boolean>;
  health_connected: Record<string, boolean>;
};

type Ctx = {
  ready: boolean;
  user: User | null;
  lang: Lang;
  t: (k: string) => string;
  moods: Mood[];
  setLang: (l: Lang) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (body: any) => Promise<void>;
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

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    await saveToken(res.token);
    setUser(res.user);
    setLangState(res.user.language || "en");
  };

  const register = async (body: any) => {
    const res = await api.post("/auth/register", body);
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
      value={{ ready, user, lang, t: makeT(lang), moods, setLang, login, register, logout, refreshUser, updateConsents }}
    >
      {children}
    </AppContext.Provider>
  );
}
