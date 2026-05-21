"use client";

import { useEffect, useState } from "react";
import { dashboard, type DashboardData } from "@/lib/api";
import { formatCLP, MONTH_FULL_ES, formatDate } from "@/lib/format";
import { SpendingHeatmap } from "@/components/spending-heatmap";
import { useAuth } from "@/components/providers";

const DONUT_PALETTE = [
  "#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#2563eb",
  "#7c3aed", "#8b5cf6", "#06b6d4", "#0ea5e9", "#38bdf8",
];

function DonutChart({ segments }: { segments: { name: string; emoji: string; total: number; pct: number }[] }) {
  if (segments.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin gastos este mes</p>;
  }
  let cumulative = 0;
  const stops = segments.map((s, i) => {
    const start = cumulative;
    cumulative += s.pct;
    return `${DONUT_PALETTE[i % DONUT_PALETTE.length]} ${start.toFixed(2)}% ${cumulative.toFixed(2)}%`;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <div style={{
          width: 140, height: 140, borderRadius: "50%",
          background: `conic-gradient(${stops.join(", ")})`,
          mask: "radial-gradient(circle, transparent 48px, black 48px)",
          WebkitMask: "radial-gradient(circle, transparent 48px, black 48px)",
        }} />
      </div>
      <div className="flex flex-col gap-2">
        {segments.map((s, i) => (
          <div key={s.name} className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: DONUT_PALETTE[i % DONUT_PALETTE.length] }} />
            <span className="text-sm flex-1 min-w-0 truncate" style={{ color: "var(--text-secondary)" }}>
              {s.emoji} {s.name}
            </span>
            <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
              {s.pct.toFixed(0)}%
            </span>
            <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
              {formatCLP(s.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-4"
      style={{ color: "var(--text-muted)" }}>
      {children}
    </h2>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    dashboard.get().then(setData).catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p style={{ color: "var(--red)" }}>Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p style={{ color: "var(--text-muted)" }}>Cargando...</p>
      </div>
    );
  }

  const now = new Date();
  const monthName = MONTH_FULL_ES[now.getMonth()];
  const year = now.getFullYear();
  const todayStr = now.toISOString().slice(0, 10);

  const totalCat = data.categories.reduce((s, c) => s + c.total, 0);
  const segments = data.categories.map((c) => ({
    ...c,
    pct: totalCat > 0 ? (c.total / totalCat) * 100 : 0,
  }));

  const isMore = data.month_change_pct >= 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <section className="flex flex-col items-center text-center gap-2 pt-4 pb-2">
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Gastado en {monthName}
        </p>
        <p className="text-5xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {formatCLP(data.current_month_expenses)}
        </p>
        {data.month_change_pct !== 0 && (
          <p className="text-sm font-medium" style={{ color: isMore ? "var(--red)" : "var(--green)" }}>
            {isMore ? "+" : ""}{data.month_change_pct}% que el mes anterior
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Balance total:{" "}
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
            {formatCLP(data.total_balance)}
          </span>{" "}
          en {data.account_count} cuenta{data.account_count !== 1 ? "s" : ""}
        </p>
      </section>

      {/* Heatmap */}
      <Card>
        <SectionTitle>Actividad de gastos {year}</SectionTitle>
        <SpendingHeatmap data={data.heatmap} year={year} today={todayStr} />
      </Card>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Donut */}
        <Card>
          <SectionTitle>Gastos por categoría</SectionTitle>
          <DonutChart segments={segments} />
        </Card>

        {/* Last transactions */}
        <Card>
          <SectionTitle>Últimas transacciones</SectionTitle>
          <div className="flex flex-col gap-1">
            {data.last_transactions.map((tx) => {
              const isExpense = tx.amount < 0;
              return (
                <div key={tx.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors"
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.1)" }}>
                    {tx.category_emoji}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {tx.description}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                      {formatDate(tx.date)} · {tx.account_name}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums flex-shrink-0"
                    style={{ color: isExpense ? "var(--red)" : "var(--green)" }}>
                    {isExpense ? "" : "+"}{formatCLP(tx.amount)}
                  </p>
                </div>
              );
            })}
            {data.last_transactions.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
                Sin transacciones aún. Conecta tu banco en Config.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
