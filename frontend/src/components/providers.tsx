"use client";

/**
 * AuthProvider: maneja la sesión JWT en memoria (sessionStorage).
 * Al recargar la página se pide la contraseña de nuevo — intencional por seguridad.
 *
 * useAuth() retorna { token, login, logout, isLoading }
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/api";

type AuthContextType = {
  token: string | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Recuperar token de sessionStorage al montar (solo dura la pestaña)
    const stored = sessionStorage.getItem("auth_token");
    setToken(stored);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !token && pathname !== "/login") {
      router.replace("/login");
    }
  }, [token, isLoading, pathname, router]);

  async function login(password: string) {
    const status = await auth.status();
    const res = status.configured
      ? await auth.login(password)
      : await auth.setup(password);
    sessionStorage.setItem("auth_token", res.access_token);
    setToken(res.access_token);
    router.replace("/");
  }

  function logout() {
    sessionStorage.removeItem("auth_token");
    setToken(null);
    router.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
