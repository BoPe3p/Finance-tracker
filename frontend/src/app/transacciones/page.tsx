"use client";

import { useEffect, useState, useMemo } from "react";
import { transactions, categories, accounts, type Transaction, type Category, type Account } from "@/lib/api";
import { formatCLP, formatDate } from "@/lib/format";
import { useAuth } from "@/components/providers";

export default function TransaccionesPage() {
  const { token } = useAuth();
  const [txList, setTxList] = useState<Transaction[]>([]);
  const [catList, setCatList] = useState<Category[]>([]);
  const [accList, setAccList] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([transactions.list(), categories.list(), accounts.list()])
      .then(([tx, cats, accs]) => {
        setTxList(tx);
        setCatList(cats);
        setAccList(accs);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    return txList.filter((tx) => {
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase()) &&
          !(tx.account_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (filterAccount && tx.account_id !== filterAccount) return false;
      if (filterCategory && tx.category_id !== filterCategory) return false;
      return true;
    });
  }, [txList, search, filterAccount, filterCategory]);

  const totalExpenses = filtered.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  const inputStyle = {
    background: "var(--bg-input)", border: "1px solid var(--border)",
    color: "var(--text-primary)", borderRadius: 10, padding: "8px 12px",
    fontSize: 13, outline: "none",
  };

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]">
    <p style={{ color: "var(--text-muted)" }}>Cargando...</p>
  </div>;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Transacciones</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: String(filtered.length), color: "var(--text-primary)" },
          { label: "Gastos", value: formatCLP(totalExpenses), color: "var(--red)" },
          { label: "Ingresos", value: formatCLP(totalIncome), color: "var(--green)" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, minWidth: 200 }} />
        <select value={filterAccount ?? ""} onChange={(e) => setFilterAccount(e.target.value ? Number(e.target.value) : null)}
          style={inputStyle}>
          <option value="">Todas las cuentas</option>
          {accList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterCategory ?? ""} onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : null)}
          style={inputStyle}>
          <option value="">Todas las categorías</option>
          {catList.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        {(search || filterAccount || filterCategory) && (
          <button onClick={() => { setSearch(""); setFilterAccount(null); setFilterCategory(null); }}
            className="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)" }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
              {["Fecha", "Descripción", "Categoría", "Monto"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx) => (
              <tr key={tx.id} style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card)")}>
                <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {formatDate(tx.date)}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{tx.description}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{tx.account_name}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full"
                    style={{ background: "rgba(59,130,246,0.1)", color: "var(--blue-light)" }}>
                    {tx.category_emoji} {tx.category_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold tabular-nums text-right"
                  style={{ color: tx.amount < 0 ? "var(--red)" : "var(--green)" }}>
                  {tx.amount > 0 ? "+" : ""}{formatCLP(tx.amount)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  Sin transacciones con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
