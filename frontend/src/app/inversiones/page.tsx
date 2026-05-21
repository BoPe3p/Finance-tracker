"use client";

/**
 * Tab de Inversiones.
 * Muestra:
 * - Resumen del portafolio (valor total, ganancia/pérdida)
 * - Cards por inversión con rendimiento
 * - Gráfico de líneas (Recharts) al seleccionar una inversión
 * - Formulario para agregar nuevas inversiones
 *
 * Soporta acciones USA (AAPL), Chile (COPEC.SN), ETFs (VOO), crypto (BTC-USD)
 * y fondos Fintual (risky-norris, clooney, pitt, einstein)
 */

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { investments, type Investment, type PortfolioSummary, type PerformanceData } from "@/lib/api";
import { formatCLP, formatUSD } from "@/lib/format";
import { useAuth } from "@/components/providers";

const FINTUAL_TICKERS = ["risky-norris", "clooney", "pitt", "einstein"];
const FINTUAL_NAMES: Record<string, string> = {
  "risky-norris": "Risky Norris (Fintual)",
  "clooney": "George Clooney (Fintual)",
  "pitt": "Brad Pitt (Fintual)",
  "einstein": "Albert Einstein (Fintual)",
};

function GainBadge({ pct }: { pct: number }) {
  const color = pct >= 0 ? "var(--green)" : "var(--red)";
  const bg = pct >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums"
      style={{ background: bg, color }}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

export default function InversionesPage() {
  const { token } = useAuth();
  const [invList, setInvList] = useState<Investment[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [perfData, setPerfData] = useState<PerformanceData | null>(null);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    ticker: "", name: "", shares: "", buy_price: "", buy_date: "", platform: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  function loadData() {
    setLoading(true);
    Promise.all([investments.list(), investments.portfolio()])
      .then(([inv, port]) => { setInvList(inv); setPortfolio(port); })
      .finally(() => setLoading(false));
  }

  function selectInvestment(id: number) {
    if (selected === id) { setSelected(null); setPerfData(null); return; }
    setSelected(id);
    setPerfData(null);
    setLoadingPerf(true);
    investments.performance(id).then(setPerfData).finally(() => setLoadingPerf(false));
  }

  async function handleAddInvestment(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.ticker || !form.shares || !form.buy_price || !form.buy_date) {
      setFormError("Completa todos los campos obligatorios.");
      return;
    }
    setFormLoading(true);
    try {
      const isFintual = FINTUAL_TICKERS.includes(form.ticker.toLowerCase());
      await investments.create({
        ticker: form.ticker.toLowerCase(),
        name: isFintual ? FINTUAL_NAMES[form.ticker.toLowerCase()] : (form.name || form.ticker.toUpperCase()),
        shares: parseFloat(form.shares),
        buy_price: parseFloat(form.buy_price),
        buy_date: new Date(form.buy_date).toISOString(),
        platform: form.platform || null,
      });
      setForm({ ticker: "", name: "", shares: "", buy_price: "", buy_date: "", platform: "" });
      setShowForm(false);
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al agregar inversión");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: number) {
    await investments.delete(id);
    setInvList((prev) => prev.filter((i) => i.id !== id));
    if (selected === id) { setSelected(null); setPerfData(null); }
    investments.portfolio().then(setPortfolio);
  }

  const inputStyle = {
    background: "var(--bg-input)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 10, padding: "9px 12px",
    fontSize: 13, outline: "none", width: "100%",
  };

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]">
    <p style={{ color: "var(--text-muted)" }}>Cargando inversiones...</p>
  </div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Inversiones</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
          style={{ background: "var(--blue-accent)", color: "#fff" }}>
          {showForm ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {/* Portfolio summary */}
      {portfolio && portfolio.count > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Valor actual", value: formatUSD(portfolio.total_current), color: "var(--text-primary)" },
            { label: "Invertido", value: formatUSD(portfolio.total_invested), color: "var(--text-secondary)" },
            { label: "Ganancia / Pérdida", value: formatUSD(portfolio.total_gain), color: portfolio.total_gain >= 0 ? "var(--green)" : "var(--red)" },
            { label: "Rendimiento", value: `${portfolio.total_gain_pct >= 0 ? "+" : ""}${portfolio.total_gain_pct.toFixed(2)}%`, color: portfolio.total_gain_pct >= 0 ? "var(--green)" : "var(--red)" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--blue-accent)" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Nueva inversión</h2>
          <div className="mb-3 p-3 rounded-xl text-xs" style={{ background: "rgba(59,130,246,0.08)", color: "var(--blue-light)" }}>
            <strong>Tickers:</strong> AAPL, TSLA, NVDA (USA) · COPEC.SN, ECL.SN (Chile) · VOO, SPY (ETF) · BTC-USD (crypto)<br />
            <strong>Fintual:</strong> risky-norris · clooney · pitt · einstein
          </div>
          <form onSubmit={handleAddInvestment} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Ticker *</label>
              <input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                placeholder="ej: AAPL o risky-norris" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Nombre (opcional)</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ej: Apple Inc." style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Cantidad / Cuotas *</label>
              <input type="number" step="any" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })}
                placeholder="ej: 10" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Precio de compra *</label>
              <input type="number" step="any" value={form.buy_price} onChange={(e) => setForm({ ...form, buy_price: e.target.value })}
                placeholder="ej: 150.00" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Fecha de compra *</label>
              <input type="date" value={form.buy_date} onChange={(e) => setForm({ ...form, buy_date: e.target.value })}
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Plataforma</label>
              <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                placeholder="ej: Fintual, Interactive Brokers" style={inputStyle} />
            </div>
            {formError && <p className="col-span-2 text-sm" style={{ color: "var(--red)" }}>{formError}</p>}
            <button type="submit" disabled={formLoading}
              className="col-span-2 py-3 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: "var(--blue-accent)", color: "#fff", opacity: formLoading ? 0.7 : 1 }}>
              {formLoading ? "Agregando..." : "Agregar inversión"}
            </button>
          </form>
        </div>
      )}

      {/* Investment cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {invList.map((inv) => (
          <div key={inv.id} className="rounded-2xl p-5 cursor-pointer transition-all"
            style={{
              background: "var(--bg-card)",
              border: selected === inv.id ? "1px solid var(--blue-accent)" : "1px solid var(--border)",
            }}
            onClick={() => selectInvestment(inv.id)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-lg font-bold" style={{ color: "var(--blue-light)" }}>
                    {inv.ticker.toUpperCase()}
                  </span>
                  <GainBadge pct={inv.gain_loss_pct} />
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{inv.name}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                className="text-xs px-2 py-1 rounded-lg cursor-pointer"
                style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}>
                Eliminar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <span style={{ color: "var(--text-muted)" }}>Acciones: </span>
                <span style={{ color: "var(--text-primary)" }}>{inv.shares}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Precio actual: </span>
                <span style={{ color: "var(--text-primary)" }}>{formatUSD(inv.current_price)}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Invertido: </span>
                <span style={{ color: "var(--text-primary)" }}>{formatUSD(inv.invested_value)}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Valor hoy: </span>
                <span style={{ color: "var(--text-primary)" }}>{formatUSD(inv.current_value)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 flex justify-between items-center" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {inv.platform && `${inv.platform} · `}Comprado el {inv.buy_date.slice(0, 10)}
              </span>
              <span className="text-sm font-bold tabular-nums"
                style={{ color: inv.gain_loss >= 0 ? "var(--green)" : "var(--red)" }}>
                {inv.gain_loss >= 0 ? "+" : ""}{formatUSD(inv.gain_loss)}
              </span>
            </div>
          </div>
        ))}
        {invList.length === 0 && (
          <p className="col-span-2 text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
            Sin inversiones. Haz clic en "+ Agregar" para registrar tu primera inversión.
          </p>
        )}
      </div>

      {/* Performance chart */}
      {selected && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {loadingPerf && <p style={{ color: "var(--text-muted)" }}>Cargando historial...</p>}
          {perfData && (
            <>
              <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Rendimiento histórico — {perfData.ticker.toUpperCase()}
              </h2>
              <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
                Valor de tu inversión en el tiempo desde la fecha de compra
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={perfData.investment_line} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10 }}
                    labelStyle={{ color: "var(--text-secondary)" }}
                    itemStyle={{ color: "var(--blue-light)" }}
                    formatter={(v: number) => [`$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`, "Valor"]}
                  />
                  <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="var(--blue-accent)" strokeWidth={2}
                    dot={false} name="Mi inversión" activeDot={{ r: 4, fill: "var(--blue-light)" }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}
    </div>
  );
}
