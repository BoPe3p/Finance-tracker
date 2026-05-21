"use client";

/**
 * Tab de Transferencias.
 *
 * Cómo funciona:
 * 1. El usuario completa el formulario (RUT, banco, monto, mensaje)
 * 2. Presiona "Preparar transferencia" → el backend valida los datos
 * 3. Se muestra un resumen con los datos a transferir
 * 4. El botón "Ir a Banco Security" abre la banca en línea
 * 5. Se guarda en el historial local para referencia futura
 *
 * Nota: Las transferencias reales las completa el usuario en la banca online.
 * Fintoc actualmente provee API de datos (lectura), no de pagos para Banco Security.
 */

import { useEffect, useState } from "react";
import { transfers, type TransferPreview } from "@/lib/api";
import { formatCLP } from "@/lib/format";
import { useAuth } from "@/components/providers";

const BANCO_SECURITY_URL = "https://www.bancosecurity.cl/bancosecurity/servlet/com.orienta.retail.MainServlet?area=Transferencias";

export default function TransferirPage() {
  const { token } = useAuth();
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ recipient_rut: "", recipient_bank: "banco_security", amount: "", message: "" });
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [history, setHistory] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    transfers.banks().then(setBanks);
    transfers.history().then(setHistory);
  }, [token]);

  async function handlePrepare(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPreview(null);
    setSaved(false);
    if (!form.recipient_rut || !form.amount || !form.recipient_bank) {
      setError("Completa los campos obligatorios.");
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { setError("Monto inválido."); return; }
    setLoading(true);
    try {
      const p = await transfers.prepare({
        recipient_rut: form.recipient_rut,
        recipient_bank: form.recipient_bank,
        amount,
        message: form.message,
      });
      if (!p.valid) { setError(p.error ?? "Error de validación"); return; }
      setPreview(p);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAndOpen() {
    if (!preview) return;
    await transfers.save({
      recipient_rut: preview.recipient_rut,
      recipient_bank: preview.recipient_bank,
      amount: preview.amount,
      message: preview.message ?? "",
    });
    setSaved(true);
    transfers.history().then(setHistory);
    window.open(BANCO_SECURITY_URL, "_blank");
  }

  const inputStyle = {
    background: "var(--bg-input)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 10, padding: "9px 12px",
    fontSize: 13, outline: "none", width: "100%",
  };

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Transferencias</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Prepara una transferencia y complétala en Banco Security.
        </p>
      </div>

      {/* Aviso */}
      <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--yellow)" }}>
        ⚡ La app prepara los datos y los guarda en tu historial. La transferencia real se completa en la banca online de Banco Security.
      </div>

      {/* Form */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Nueva transferencia</h2>
        <form onSubmit={handlePrepare} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>RUT destinatario *</label>
            <input value={form.recipient_rut} onChange={(e) => setForm({ ...form, recipient_rut: e.target.value })}
              placeholder="12.345.678-9" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Banco destino *</label>
            <select value={form.recipient_bank} onChange={(e) => setForm({ ...form, recipient_bank: e.target.value })}
              style={inputStyle}>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Monto (CLP) *</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="50000" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Mensaje (opcional)</label>
            <input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="ej: Arriendo mes de junio" style={inputStyle} />
          </div>
          {error && <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
            style={{ background: "var(--blue-accent)", color: "#fff", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Preparando..." : "Preparar transferencia"}
          </button>
        </form>
      </div>

      {/* Preview */}
      {preview && (
        <div className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--blue-accent)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Resumen de la transferencia</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "RUT", value: preview.recipient_rut },
              { label: "Nombre", value: preview.recipient_name ?? "No disponible" },
              { label: "Banco", value: preview.recipient_bank },
              { label: "Monto", value: formatCLP(preview.amount) },
              { label: "Mensaje", value: preview.message || "—" },
            ].map((r) => (
              <div key={r.label}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.label}</p>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>{r.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{preview.instructions}</p>
          {saved && (
            <p className="text-xs" style={{ color: "var(--green)" }}>✓ Guardado en el historial</p>
          )}
          <button onClick={handleSaveAndOpen}
            className="py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "#fff" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Guardar e ir a Banco Security
          </button>
        </div>
      )}

      {/* History */}
      {Array.isArray(history) && history.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
            Historial
          </h2>
          <div className="flex flex-col gap-2">
            {(history as Array<{ id: number; recipient_rut: string; recipient_bank: string; amount: number; message: string; created_at: string }>).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t.recipient_rut}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {t.recipient_bank} · {t.created_at.slice(0, 10)}
                  </p>
                </div>
                <p className="text-sm font-bold tabular-nums" style={{ color: "var(--red)" }}>
                  {formatCLP(t.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
