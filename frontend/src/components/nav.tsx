"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./providers";

const tabs = [
  { name: "Dashboard", href: "/" },
  { name: "Transacciones", href: "/transacciones" },
  { name: "Cuentas", href: "/cuentas" },
  { name: "Inversiones", href: "/inversiones" },
  { name: "Transferir", href: "/transferir" },
  { name: "Config", href: "/config" },
];

export function Nav() {
  const pathname = usePathname();
  const { token, logout } = useAuth();

  if (!token) return null;

  return (
    <nav
      className="sticky top-0 z-50 px-6 py-3 flex justify-between items-center"
      style={{
        background: "rgba(10, 15, 30, 0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 no-underline">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            boxShadow: "0 2px 12px rgba(59,130,246,0.35)",
          }}
        >
          <svg viewBox="0 0 46 32" fill="none" className="w-5 h-5">
            <rect x="0" y="6" width="46" height="26" rx="5" stroke="#fff" strokeWidth="2.5" fill="none" />
            <path d="M7 6V3a5 5 0 015-5h22a5 5 0 015 5v3" stroke="#fff" strokeWidth="2.5" fill="none" />
            <circle cx="36" cy="19" r="4" stroke="#fff" strokeWidth="2" fill="none" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span
            className="font-[family-name:var(--font-caveat)] text-xl font-semibold leading-none"
            style={{ color: "var(--blue-light)" }}
          >
            mis finanzas
          </span>
          <span className="text-[10px] tracking-wider" style={{ color: "var(--text-muted)" }}>
            tu plata, tu control
          </span>
        </div>
      </Link>

      {/* Tabs */}
      <div className="flex gap-1 items-center">
        {tabs.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all no-underline"
              style={{
                background: isActive ? "var(--blue-glow)" : "transparent",
                color: isActive ? "var(--blue-light)" : "var(--text-muted)",
                border: isActive ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
              }}
            >
              {tab.name}
            </Link>
          );
        })}

        {/* Logout */}
        <button
          onClick={logout}
          className="ml-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer"
          style={{
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            background: "transparent",
          }}
        >
          Salir
        </button>
      </div>
    </nav>
  );
}
