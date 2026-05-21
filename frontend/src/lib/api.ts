/**
 * Cliente de la API Python.
 * Todos los llamados al backend pasan por aquí — así si cambia la URL,
 * solo hay que editar este archivo.
 *
 * next.config.ts reescribe /api/* → http://localhost:8000/*
 * Entonces fetch("/api/accounts") llama al backend Python.
 */

const BASE = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("auth_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expirado → limpiar sesión y redirigir al login
    sessionStorage.removeItem("auth_token");
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Error desconocido");
  }

  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  status: () => request<{ configured: boolean }>("/auth/status"),
  setup: (password: string) =>
    request<{ access_token: string }>("/auth/setup", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  login: (password: string) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export type DashboardData = {
  current_month_expenses: number;
  prev_month_expenses: number;
  month_change_pct: number;
  total_balance: number;
  account_count: number;
  categories: { name: string; emoji: string; total: number }[];
  last_transactions: Transaction[];
  heatmap: { date: string; amount: number }[];
};

export const dashboard = {
  get: () => request<DashboardData>("/transactions/dashboard"),
};

// ─── Accounts ────────────────────────────────────────────────────────────────

export type Account = {
  id: number;
  name: string;
  type: string;
  bank: string;
  balance: number;
  color: string;
  fintoc_link_id: string | null;
};

export const accounts = {
  list: () => request<Account[]>("/accounts/"),
  create: (data: Omit<Account, "id" | "fintoc_link_id">) =>
    request("/accounts/", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) => request(`/accounts/${id}`, { method: "DELETE" }),
  summary: (id: number) => request<AccountSummary>(`/accounts/${id}/summary`),
};

export type AccountSummary = {
  account_id: number;
  balance: number;
  monthly_expenses: number;
  recent_transactions: Transaction[];
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  account_id: number;
  account_name: string | null;
  category_id: number | null;
  category_name: string | null;
  category_emoji: string | null;
};

export const transactions = {
  list: (params?: { search?: string; account_id?: number; category_id?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.account_id) qs.set("account_id", String(params.account_id));
    if (params?.category_id) qs.set("category_id", String(params.category_id));
    return request<Transaction[]>(`/transactions/?${qs}`);
  },
  create: (data: Omit<Transaction, "id" | "account_name" | "category_name" | "category_emoji">) =>
    request("/transactions/", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) => request(`/transactions/${id}`, { method: "DELETE" }),
};

// ─── Categories ───────────────────────────────────────────────────────────────

export type Category = { id: number; name: string; emoji: string };

export const categories = {
  list: () => request<Category[]>("/categories/"),
  create: (data: { name: string; emoji: string }) =>
    request("/categories/", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) => request(`/categories/${id}`, { method: "DELETE" }),
};

// ─── Investments ─────────────────────────────────────────────────────────────

export type Investment = {
  id: number;
  ticker: string;
  name: string;
  shares: number;
  buy_price: number;
  buy_date: string;
  platform: string | null;
  current_price: number;
  current_value: number;
  invested_value: number;
  gain_loss: number;
  gain_loss_pct: number;
};

export type PortfolioSummary = {
  total_invested: number;
  total_current: number;
  total_gain: number;
  total_gain_pct: number;
  count: number;
};

export type PerformanceData = {
  ticker: string;
  gain_loss_pct: number;
  investment_line: { date: string; value: number }[];
};

export const investments = {
  list: () => request<Investment[]>("/investments/"),
  portfolio: () => request<PortfolioSummary>("/investments/portfolio/summary"),
  performance: (id: number) => request<PerformanceData>(`/investments/${id}/performance`),
  create: (data: Omit<Investment, "id" | "current_price" | "current_value" | "invested_value" | "gain_loss" | "gain_loss_pct">) =>
    request("/investments/", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) => request(`/investments/${id}`, { method: "DELETE" }),
};

// ─── Fintoc ───────────────────────────────────────────────────────────────────

export const fintoc = {
  connect: (link_token: string) =>
    request("/fintoc/connect", { method: "POST", body: JSON.stringify({ link_token }) }),
  sync: (link_token: string, account_fintoc_id: string) =>
    request<{ imported: number; skipped: number; bank: string }>("/fintoc/sync", {
      method: "POST",
      body: JSON.stringify({ link_token, account_fintoc_id }),
    }),
};

// ─── Transfers ────────────────────────────────────────────────────────────────

export type TransferPreview = {
  valid: boolean;
  recipient_rut: string;
  recipient_name: string | null;
  recipient_bank: string;
  amount: number;
  deeplink: string;
  instructions: string;
};

export const transfers = {
  banks: () => request<{ id: string; name: string }[]>("/transfers/banks"),
  prepare: (data: { recipient_rut: string; recipient_bank: string; amount: number; message?: string }) =>
    request<TransferPreview>("/transfers/prepare", { method: "POST", body: JSON.stringify(data) }),
  save: (data: { recipient_rut: string; recipient_bank: string; amount: number; message?: string }) =>
    request("/transfers/save", { method: "POST", body: JSON.stringify(data) }),
  history: () => request("/transfers/history"),
};
