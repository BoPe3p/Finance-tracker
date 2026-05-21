"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers";
import { auth } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [isSetup, setIsSetup] = useState(false); // ¿primera vez?
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    auth.status().then((s) => setIsSetup(!s.configured)).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (isSetup && password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await login(password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg === "Contraseña incorrecta." ? "Contraseña incorrecta. Intenta de nuevo." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
            }}
          >
            <svg viewBox="0 0 46 32" fill="none" className="w-7 h-7">
              <rect x="0" y="6" width="46" height="26" rx="5" stroke="#fff" strokeWidth="2.5" fill="none" />
              <path d="M7 6V3a5 5 0 015-5h22a5 5 0 015 5v3" stroke="#fff" strokeWidth="2.5" fill="none" />
              <circle cx="36" cy="19" r="4" stroke="#fff" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <h1
            className="font-[family-name:var(--font-caveat)] text-3xl font-semibold"
            style={{ color: "var(--blue-light)" }}
          >
            mis finanzas
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {isSetup ? "Crea tu contraseña maestra" : "Ingresa tu contraseña"}
          </p>
        </div>

        {/* Mensaje seguridad */}
        {isSetup && (
          <div
            className="mb-5 p-3 rounded-xl text-sm"
            style={{
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.2)",
              color: "var(--blue-light)",
            }}
          >
            🔒 Esta contraseña protege todos tus datos financieros. Elige una segura y no la olvides.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {isSetup ? "Nueva contraseña" : "Contraseña"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {isSetup && (
            <div>
              <label className="block text-sm mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: "var(--red)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            style={{
              background: loading ? "var(--blue-dim)" : "var(--blue-accent)",
              color: "#fff",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Verificando..." : isSetup ? "Crear contraseña" : "Entrar"}
          </button>
        </form>

        <p className="text-xs text-center mt-5" style={{ color: "var(--text-muted)" }}>
          La sesión expira después de 30 minutos de inactividad.
        </p>
      </div>
    </div>
  );
}
