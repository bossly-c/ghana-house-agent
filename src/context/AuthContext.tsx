"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { UserPayload } from "@/lib/auth";

interface AuthCtx {
  user: UserPayload | null;
  token: string | null;
  login: (token: string, user: UserPayload) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem("gha_token");
      const u = localStorage.getItem("gha_user");
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u));
      }
    } catch {}
  }, []);

  const login = (t: string, u: UserPayload) => {
    localStorage.setItem("gha_token", t);
    localStorage.setItem("gha_user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("gha_token");
    localStorage.removeItem("gha_user");
    setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, token, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);