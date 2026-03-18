"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, LayoutDashboard, FileText, Calculator, Settings, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard",          href: "/",          icon: LayoutDashboard },
  { label: "Proposals",          href: "/proposals", icon: FileText },
  { label: "Estimate Generator", href: "/estimate",  icon: Calculator },
  { label: "Settings",           href: "/settings",  icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col w-64 min-h-screen shrink-0"
      style={{ background: "#111827" }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: "#1a56db" }}
          >
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">HVAC Pro</div>
            <div className="text-xs" style={{ color: "#6b7280" }}>Sales Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
              style={active ? { background: "#1a56db" } : {}}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "#374151" }}
          >
            <Wrench className="h-4 w-4" />
          </div>
          <div>
            <div className="text-white text-xs font-semibold">Houston Metro</div>
            <div className="text-xs" style={{ color: "#6b7280" }}>Texas SEER2 Region</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
