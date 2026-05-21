"use client";

import { useEffect, useState, useRef } from "react";
import { accounts, categories, bank, type Account, type Category } from "@/lib/api";
import { useAuth } from "@/components/providers";

type ActiveTab = "banco" | "cuentas" | "categorias";
type BancoSubTab = "auto" | "csv";

export default function ConfigPage() {
  const { token } = useAuth();
  const [tab, setTab]           = useState<ActiveTab>("banco");
  const [bancoSub, setBancoSub] = useState<BancoSubTab>("auto");
  const [accList, setAccList]   = useState<Account[]>([]);
  const [catList, setCatList]   = useState<Category[]>([]);
  const [supportedBanks, setSupportedBanks] = useState<{ id: string; name: string }[]>([]);

  // Sync automático (open-banking-chile)
  const [syncForm, setSyncForm] = useState({ rut: "", password: "", bank_id: "" });
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState("");
  const [syncOk, setSyncOk]     = useState(false);

  // Importación CSV (Banco Security)
  const [csvAccountId, setCsvAccountId] = useState<number | "">("");
  const [csvFile, setCsvFile]           = useState<File | null>(null);
  const [csvLoading, setCsvLoading]     = useState(false);
  const [csvMsg, setCsvMsg]             = useState("");
  const [csvOk, setCsvOk]               = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account / Category forms
  const [accForm, setAccForm] = useState({ name: "", type: "corriente", bank: "Banco Security", color: "#3b82f6" });
  const [catForm, setCatForm] = useState({ name: "", emoji: "" });

  useEffect(() => {
    if (!token) return;
    accounts.list().then(setAccList);
    categories.list().then(setCatList);
    bank.supported().then(setSupportedBanks);
  }, [token]);

  async function handleAutoSync(e: React.FormEvent) {
    e.preventDefault();
    if (!syncForm.bank_id) return;
    setSyncing(true);
    setSyncMsg("Abriendo Chrome y conectando con el banco...");
    setSyncOk(false);
    try {
      const res = await bank.sync({
        rut: syncForm.rut,
        password: syncForm.password,
        bank_id: syncForm.bank_id,
      });
      setSyncMsg(`${res.bank}: ${res.accounts_synced} cuenta(s) sincronizada(s), ${res.imported} movimientos importados.`);
      setSyncOk(true);
      setSyncForm(f => ({ ...f, password: "" }));  // limpia la clave inmediatamente
      accounts.list().then(setAccList);
    } catch (err: unknown) {
      setSyncMsg(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
      setSyncOk(false);
    } finally {
      setSyncing(false);
    }
  }

  async function handleCsvImport(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile || csvAccountId === "") return;
    setCsvLoading(true);
    setCsvMsg("Procesando archivo...");
    setCsvOk(false);
    try {
      const res = await bank.importCsv(Number(csvAccountId), csvFile);
      setCsvMsg(`${res.imported} movimientos importados, ${res.skipped} duplicados omitidos.`);
      setCsvOk(true);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setCsvMsg(`Error: ${err instanceof Error ? err.message : "desconocido"}`);
      setCsvOk(false);
    } finally {
      setCsvLoading(false);
    }
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
          <div className="flex flex-col gap-4">

            {/* Sub-tabs */}
            <div className="flex gap-2">
              {([["auto", "🤖 Sync automático"], ["csv", "📄 Importar CSV (Banco Security)"]] as [BancoSubTab, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setBancoSub(id)}
                  className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
                  style={{
                    background: bancoSub === id ? "var(--blue-glow)" : "var(--bg-card)",
                    color: bancoSub === id ? "var(--blue-light)" : "var(--text-muted)",
                    border: bancoSub === id ? "1px solid rgba(59,130,246,0.3)" : "1px solid var(--border)",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Sync automático ── */}
            {bancoSub === "auto" && (
              <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Sync automático
                </h2>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  Abre Chrome en segundo plano, inicia sesión en tu banco y descarga tus movimientos.
                  <strong style={{ color: "var(--text-secondary)" }}> Tus credenciales nunca se guardan.</strong>
                </p>

                <div className="p-3 rounded-xl mb-4 text-xs" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)", color: "var(--blue-light)" }}>
                  Bancos disponibles: Santander, BCI, Itaú, BancoEstado, Scotiabank, Banco de Chile, BICE, Falabella, Edwards, Cencosud.
                  <br />Banco Security: usa la pestaña "Importar CSV" mientras está pendiente la contribución al proyecto open-banking-chile.
                </div>

                <form onSubmit={handleAutoSync} className="flex flex-col gap-3">
                  <select
                    value={syncForm.bank_id}
                    onChange={(e) => setSyncForm(f => ({ ...f, bank_id: e.target.value }))}
                    style={inputStyle} required>
                    <option value="">Selecciona tu banco...</option>
                    {supportedBanks.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <input
                    value={syncForm.rut}
                    onChange={(e) => setSyncForm(f => ({ ...f, rut: e.target.value }))}
                    placeholder="RUT (ej: 12345678-9)"
                    style={inputStyle} required />
                  <input
                    type="password"
                    value={syncForm.password}
                    onChange={(e) => setSyncForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Clave del banco"
                    style={inputStyle} required />
                  <button type="submit" disabled={syncing}
                    className="py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                    style={{ background: "var(--blue-accent)", color: "#fff", opacity: syncing ? 0.7 : 1 }}>
                    {syncing ? "Sincronizando (puede tardar ~30s)..." : "🔄 Sincronizar movimientos"}
                  </button>
                </form>

                {syncMsg && (
                  <p className="mt-3 text-sm" style={{ color: syncOk ? "var(--green)" : "var(--red)" }}>
                    {syncOk ? "✓ " : "✗ "}{syncMsg}
                  </p>
                )}
              </div>
            )}

            {/* ── CSV Banco Security ── */}
            {bancoSub === "csv" && (
              <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Importar CSV — Banco Security
                </h2>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  Banco Security aún no está en open-banking-chile. Mientras tanto, exporta tus movimientos manualmente.
                </p>

                <div className="p-4 rounded-xl mb-4 text-xs flex flex-col gap-1"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <p className="font-semibold mb-1">Cómo exportar desde Banco Security:</p>
                  <p>1. Inicia sesión en <strong>bancosecurity.cl</strong></p>
                  <p>2. Ve a tu cuenta corriente → <strong>Movimientos</strong></p>
                  <p>3. Filtra el rango de fechas que quieras</p>
                  <p>4. Haz clic en <strong>Exportar → CSV</strong></p>
                  <p>5. Sube ese archivo aquí</p>
                </div>

                <form onSubmit={handleCsvImport} className="flex flex-col gap-3">
                  <select
                    value={csvAccountId}
                    onChange={(e) => setCsvAccountId(e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle} required>
                    <option value="">Selecciona la cuenta destino...</option>
                    {accList.map(a => (
                      <option key={a.id} value={a.id}>{a.name} — {a.bank}</option>
                    ))}
                  </select>
                  {accList.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Crea primero una cuenta en la pestaña "Cuentas".
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                    required />
                  <button type="submit" disabled={csvLoading || !csvFile || csvAccountId === ""}
                    className="py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                    style={{ background: "var(--blue-accent)", color: "#fff", opacity: (csvLoading || !csvFile || csvAccountId === "") ? 0.7 : 1 }}>
                    {csvLoading ? "Importando..." : "📤 Importar movimientos"}
                  </button>
                </form>

                {csvMsg && (
                  <p className="mt-3 text-sm" style={{ color: csvOk ? "var(--green)" : "var(--red)" }}>
                    {csvOk ? "✓ " : "✗ "}{csvMsg}
                  </p>
                )}

                <div className="mt-5 p-3 rounded-xl text-xs" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)", color: "var(--blue-light)" }}>
                  ¿Quieres que Banco Security sea automático? Contribuye el scraper al proyecto open source:<br />
                  <strong>github.com/kaihv/open-banking-chile</strong> — ver CONTRIBUTING.md
                </div>
              </div>
            )}
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
