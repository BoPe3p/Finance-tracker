"use client";

/**
 * Config: conectar Banco Security (Fintoc Widget), manejar cuentas y categorías.
 *
 * Fintoc Widget:
 * - Carga el script de Fintoc (cdn) dinámicamente
 * - Abre la ventana segura de Fintoc donde el usuario ingresa sus credenciales BANCARIAS
 * - Fintoc retorna un link_token → lo enviamos a nuestro backend Python
 * - El backend crea las cuentas y sincroniza movimientos
 * - NUNCA vemos las credenciales del banco
 */

import { useEffect, useState } from "react";
import { accounts, categories, fintoc, type Account, type Category } from "@/lib/api";
import { useAuth } from "@/components/providers";

declare global {
  interface Window {
    // El script de Fintoc agrega este objeto al window global
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Fintoc?: { create: (options: any) => { open: () => void } };
  }
}

const FINTOC_PUBLIC_KEY = process.env.NEXT_PUBLIC_FINTOC_PUBLIC_KEY ?? "";

type ActiveTab = "banco" | "cuentas" | "categorias";

export default function ConfigPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<ActiveTab>("banco");
  const [accList, setAccList] = useState<Account[]>([]);
  const [catList, setCatList] = useState<Category[]>([]);

  // Fintoc state
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [fintocReady, setFintocReady] = useState(false);

  // Account form
  const [accForm, setAccForm] = useState({ name: "", type: "corriente", bank: "Banco Security", color: "#3b82f6" });
  const [catForm, setCatForm] = useState({ name: "", emoji: "" });

  useEffect(() => {
    if (!token) return;
    accounts.list().then(setAccList);
    categories.list().then(setCatList);
    loadFintocScript();
  }, [token]);

  function loadFintocScript() {
    if (document.getElementById("fintoc-script")) { setFintocReady(true); return; }
    const script = document.createElement("script");
    script.id = "fintoc-script";
    script.src = "https://js.fintoc.com/v1/";
    script.onload = () => setFintocReady(true);
    document.head.appendChild(script);
  }

  function openFintocWidget() {
    if (!window.Fintoc) { setSyncMsg("Error: script de Fintoc no cargado. Recarga la página."); return; }
    if (!FINTOC_PUBLIC_KEY) {
      setSyncMsg("Agrega NEXT_PUBLIC_FINTOC_PUBLIC_KEY al archivo .env del frontend. Obtén tu clave en https://app.fintoc.com/");
      return;
    }

    const widget = window.Fintoc.create({
      publicKey: FINTOC_PUBLIC_KEY,
      product: "movements",
      country: "cl",
      institutionId: "cl_security",  // Banco Security
      onSuccess: async (link: { token: string }) => {
        setSyncing(true);
        setSyncMsg("Conectando con Banco Security...");
        try {
          const res = await fintoc.connect(link.token) as { accounts: { id: number; name: string; status: string }[] };
          setSyncMsg(`✓ ${res.accounts.length} cuenta(s) conectada(s). Sincronizando movimientos...`);

          // Sincronizar cada cuenta
          for (const acc of res.accounts) {
            const syncRes = await fintoc.sync(link.token, String(acc.id));
            const r = syncRes as { imported: number; skipped: number };
            setSyncMsg(`✓ ${r.imported} movimientos importados (${r.skipped} duplicados omitidos).`);
          }
          accounts.list().then(setAccList);
        } catch (err: unknown) {
          setSyncMsg(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
        } finally {
          setSyncing(false);
        }
      },
      onExit: () => setSyncMsg(""),
    });
    widget.open();
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    await accounts.create(accForm);
    accounts.list().then(setAccList);
    setAccForm({ name: "", type: "corriente", bank: "Banco Security", color: "#3b82f6" });
  }

  async function handleDeleteAccount(id: number) {
    if (!confirm("¿Eliminar esta cuenta? Se eliminarán todas sus transacciones.")) return;
    await accounts.delete(id);
    setAccList((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    await categories.create(catForm);
    categories.list().then(setCatList);
    setCatForm({ name: "", emoji: "" });
  }

  const inputStyle = {
    background: "var(--bg-input)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 10, padding: "8px 12px",
    fontSize: 13, outline: "none",
  };

  const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4"];

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="flex flex-col gap-1 w-44 flex-shrink-0">
        {(["banco", "cuentas", "categorias"] as ActiveTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-left cursor-pointer capitalize transition-all"
            style={{
              background: tab === t ? "var(--blue-glow)" : "transparent",
              color: tab === t ? "var(--blue-light)" : "var(--text-muted)",
              border: tab === t ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
            }}>
            {t === "banco" ? "🏦 Conectar banco" : t === "cuentas" ? "💳 Cuentas" : "🏷️ Categorías"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">

        {/* ── Banco ── */}
        {tab === "banco" && (
          <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Conectar Banco Security
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Usa Fintoc para conectar tu banco de forma segura. Tus credenciales bancarias nunca pasan por esta app.
            </p>

            <div className="p-4 rounded-xl mb-5 text-sm" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--blue-light)" }}>
              🔒 <strong>¿Cómo funciona Fintoc?</strong><br />
              Al hacer clic en "Conectar", se abre una ventana segura de Fintoc (no nuestra app).
              Ingresas tu RUT y clave de Banco Security allí. Fintoc nos entrega solo un "token" de acceso.
              Si alguien roba nuestra base de datos, no puede entrar a tu banco.
            </div>

            <button onClick={openFintocWidget} disabled={syncing || !fintocReady}
              className="px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer flex items-center gap-2 transition-all"
              style={{ background: "var(--blue-accent)", color: "#fff", opacity: (syncing || !fintocReady) ? 0.7 : 1 }}>
              {syncing ? "Sincronizando..." : "🏦 Conectar Banco Security"}
            </button>

            {syncMsg && (
              <p className="mt-4 text-sm" style={{ color: syncMsg.startsWith("Error") ? "var(--red)" : "var(--green)" }}>
                {syncMsg}
              </p>
            )}

            <div className="mt-6 p-4 rounded-xl text-xs" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              <p className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Configuración requerida</p>
              <p>1. Crea una cuenta en <strong>fintoc.com</strong> (gratis)</p>
              <p>2. Obtén tu <code>Public Key</code> y <code>Secret Key</code></p>
              <p>3. Agrega en <code>frontend/.env.local</code>: <code>NEXT_PUBLIC_FINTOC_PUBLIC_KEY=pk_live_...</code></p>
              <p>4. Agrega en <code>backend/.env</code>: <code>FINTOC_SECRET_KEY=sk_live_...</code></p>
            </div>
          </div>
        )}

        {/* ── Cuentas ── */}
        {tab === "cuentas" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Agregar cuenta manual</h2>
              <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
                <input value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
                  placeholder="Nombre de la cuenta" style={{ ...inputStyle, width: "100%" }} />
                <div className="grid grid-cols-2 gap-3">
                  <select value={accForm.type} onChange={(e) => setAccForm({ ...accForm, type: e.target.value })} style={inputStyle}>
                    <option value="corriente">Cuenta corriente</option>
                    <option value="vista">Cuenta vista / RUT</option>
                    <option value="credito">Tarjeta de crédito</option>
                  </select>
                  <input value={accForm.bank} onChange={(e) => setAccForm({ ...accForm, bank: e.target.value })}
                    placeholder="Banco" style={inputStyle} />
                </div>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setAccForm({ ...accForm, color: c })}
                      className="w-7 h-7 rounded-full cursor-pointer transition-all"
                      style={{ background: c, border: accForm.color === c ? "3px solid white" : "3px solid transparent",
                        boxShadow: accForm.color === c ? `0 0 0 2px ${c}` : "none" }} />
                  ))}
                </div>
                <button type="submit" className="py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: "var(--blue-accent)", color: "#fff" }}>
                  Crear cuenta
                </button>
              </form>
            </div>

            <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Cuentas existentes</h2>
              <div className="flex flex-col gap-2">
                {accList.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2"
                    style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: a.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{a.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.bank} · {a.type}</p>
                    </div>
                    <button onClick={() => handleDeleteAccount(a.id)}
                      className="text-xs px-2 py-1 rounded-lg cursor-pointer"
                      style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}>
                      Eliminar
                    </button>
                  </div>
                ))}
                {accList.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin cuentas aún.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Categorías ── */}
        {tab === "categorias" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Nueva categoría</h2>
              <form onSubmit={handleCreateCategory} className="flex gap-3">
                <input value={catForm.emoji} onChange={(e) => setCatForm({ ...catForm, emoji: e.target.value })}
                  placeholder="🏷️" maxLength={2} style={{ ...inputStyle, width: 60, textAlign: "center" }} />
                <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="Nombre de categoría" style={{ ...inputStyle, flex: 1 }} />
                <button type="submit" className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer flex-shrink-0"
                  style={{ background: "var(--blue-accent)", color: "#fff" }}>
                  Crear
                </button>
              </form>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {catList.map((c) => (
                <div key={c.id} className="rounded-xl px-4 py-3 flex items-center gap-2"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
