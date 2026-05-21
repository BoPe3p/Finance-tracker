"use client";

import { useEffect, useState } from "react";
import { accounts, type Account, type AccountSummary } from "@/lib/api";
import { formatCLP, formatDate } from "@/lib/format";
import { useAuth } from "@/components/providers";

export default function CuentasPage() {
  const { token } = useAuth();
  const [accList, setAccList] = useState<Account[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (!token) return;
    accounts.list().then(setAccList);
  }, [token]);

  function selectAccount(id: number) {
    if (selected === id) { setSelected(null); setSummary(null); return; }
    setSelected(id);
    setSummary(null);
    setLoadingSummary(true);
    accounts.summary(id).then(setSummary).finally(() => setLoadingSummary(false));
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Cuentas</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accList.map((acc) => (
          <button key={acc.id} onClick={() => selectAccount(acc.id)}
            className="rounded-2xl p-5 text-left transition-all cursor-pointer"
            style={{
              background: "var(--bg-card)",
              border: selected === acc.id ? `1px solid ${acc.color}` : "1px solid var(--border)",
              boxShadow: selected === acc.id ? `0 0 16px ${acc.color}22` : "none",
            }}>
            <div className="h-1.5 w-10 rounded-full mb-3" style={{ background: acc.color }} />
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{acc.bank}</p>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{acc.name}</p>
            <p className="text-xl font-bold tabular-nums"
              style={{ color: acc.balance < 0 ? "var(--red)" : "var(--text-primary)" }}>
              {formatCLP(acc.balance)}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{acc.type}</p>
          </button>
        ))}
        {accList.length === 0 && (
          <p className="text-sm col-span-3" style={{ color: "var(--text-muted)" }}>
            Sin cuentas. Ve a Config para conectar Banco Security.
          </p>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {loadingSummary && <p style={{ color: "var(--text-muted)" }}>Cargando...</p>}
          {summary && (
            <>
              <div className="flex gap-6 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Balance</p>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {formatCLP(summary.balance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Gastos del mes</p>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--red)" }}>
                    {formatCLP(summary.monthly_expenses)}
                  </p>
                </div>
              </div>

              <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                Últimas transacciones
              </p>
              <div className="flex flex-col gap-1">
                {summary.recent_transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 px-2 py-2 rounded-xl transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: "rgba(59,130,246,0.1)" }}>
                      {tx.category_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{tx.description}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(tx.date)}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums flex-shrink-0"
                      style={{ color: tx.amount < 0 ? "var(--red)" : "var(--green)" }}>
                      {tx.amount > 0 ? "+" : ""}{formatCLP(tx.amount)}
                    </p>
                  </div>
                ))}
                {summary.recent_transactions.length === 0 && (
                  <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
                    Sin movimientos recientes
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
