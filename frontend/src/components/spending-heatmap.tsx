"use client";

import { useState } from "react";

export interface DailySpend {
  date: string;
  amount: number;
}

interface Tooltip {
  clientX: number;
  clientY: number;
  date: string;
  amount: number;
}

const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT_LABEL_W = 28;
const TOP_LABEL_H = 20;

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DAY_LABELS: { index: number; label: string }[] = [
  { index: 1, label: "Lu" },
  { index: 3, label: "Mi" },
  { index: 5, label: "Vi" },
  { index: 0, label: "Do" },
];

// Gradiente azul: oscuro casi negro → azul brillante
function colorForAmount(amount: number, max: number): string {
  if (amount === 0) return "#0d1b2e";
  const t = Math.min(amount / max, 1);
  const r = Math.round(13 + t * (59 - 13));
  const g = Math.round(27 + t * (130 - 27));
  const b = Math.round(46 + t * (246 - 46));
  return `rgb(${r},${g},${b})`;
}

export function SpendingHeatmap({ data, year, today }: { data: DailySpend[]; year: number; today: string }) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const spendMap = new Map<string, number>();
  for (const d of data) spendMap.set(d.date, d.amount);
  const maxSpend = Math.max(...data.map((d) => d.amount), 1);

  const todayMonth = parseInt(today.split("-")[1], 10);
  const janFirst = new Date(Date.UTC(year, 0, 1));
  const startOffset = (janFirst.getUTCDay() + 6) % 7;
  const endDate = new Date(Date.UTC(year, todayMonth, 0));
  const msPerDay = 86400000;
  const dayCount = Math.floor((endDate.getTime() - janFirst.getTime()) / msPerDay) + 1;
  const numWeeks = Math.ceil((startOffset + dayCount) / 7);

  const monthCols: { month: number; col: number }[] = [];
  for (let m = 1; m <= todayMonth; m++) {
    const d = new Date(Date.UTC(year, m - 1, 1));
    const dayIdx = Math.floor((d.getTime() - janFirst.getTime()) / msPerDay);
    monthCols.push({ month: m, col: Math.floor((startOffset + dayIdx) / 7) });
  }

  const svgWidth = LEFT_LABEL_W + numWeeks * STEP;
  const svgHeight = TOP_LABEL_H + 7 * STEP;
  const legendColors = Array.from({ length: 5 }, (_, i) => colorForAmount((i / 4) * maxSpend, maxSpend));

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} style={{ display: "block", minWidth: svgWidth }}>
          {DAY_LABELS.map(({ index, label }) => (
            <text key={label} x={LEFT_LABEL_W - 6} y={TOP_LABEL_H + index * STEP + CELL / 2 + 4}
              textAnchor="end" fontSize={9} fill="#4a6080" fontFamily="var(--font-dm-sans, sans-serif)">
              {label}
            </text>
          ))}
          {monthCols.map(({ month, col }, i) => {
            const nextCol = monthCols[i + 1]?.col ?? numWeeks;
            if (nextCol - col < 2) return null;
            return (
              <text key={month} x={LEFT_LABEL_W + col * STEP} y={TOP_LABEL_H - 6}
                fontSize={9} fill="#4a6080" fontFamily="var(--font-dm-sans, sans-serif)">
                {MONTH_NAMES[month - 1]}
              </text>
            );
          })}
          {Array.from({ length: numWeeks }, (_, week) =>
            Array.from({ length: 7 }, (_, dow) => {
              const cellIndex = week * 7 + dow;
              const dayIndex = cellIndex - startOffset;
              if (dayIndex < 0 || dayIndex >= dayCount) return null;
              const date = new Date(Date.UTC(year, 0, 1 + dayIndex));
              const dateStr = date.toISOString().slice(0, 10);
              const spend = spendMap.get(dateStr) ?? 0;
              const isToday = dateStr === today;
              return (
                <g key={dateStr}>
                  <rect x={LEFT_LABEL_W + week * STEP} y={TOP_LABEL_H + dow * STEP}
                    width={CELL} height={CELL} rx={3}
                    fill={colorForAmount(spend, maxSpend)}
                    stroke={isToday ? "#3b82f6" : "none"} strokeWidth={isToday ? 2 : 0}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => setTooltip({ clientX: e.clientX, clientY: e.clientY, date: dateStr, amount: spend })}
                    onMouseMove={(e) => setTooltip((p) => p ? { ...p, clientX: e.clientX, clientY: e.clientY } : p)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </g>
              );
            })
          )}
        </svg>
      </div>

      {tooltip && (
        <div className="pointer-events-none fixed z-50 rounded-xl px-3 py-2 shadow-xl text-sm"
          style={{ left: tooltip.clientX + 14, top: tooltip.clientY - 48, whiteSpace: "nowrap",
            background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <div className="font-medium">{tooltip.date}</div>
          <div style={{ color: "var(--text-secondary)" }}>
            {tooltip.amount === 0 ? "Sin gastos" : `$${tooltip.amount.toLocaleString("es-CL")}`}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Menos</span>
        {legendColors.map((color, i) => (
          <div key={i} style={{ width: CELL, height: CELL, borderRadius: 3, background: color, flexShrink: 0 }} />
        ))}
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Más</span>
      </div>
    </div>
  );
}
