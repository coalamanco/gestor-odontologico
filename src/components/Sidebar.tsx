"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  DollarSign,
  LayoutDashboard,
  Megaphone,
  MonitorSmartphone,
  Package,
  Receipt,
  Settings,
  Users,
  X,
} from "lucide-react";
import { getUserRole } from "@/lib/getUserRole";

type SidebarProps = {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

const menu = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "secretaria"],
  },
  {
    label: "BI Executivo",
    href: "/dashboard/executivo",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: Calendar,
    roles: ["admin", "secretaria"],
  },
  {
    label: "Recepção",
    href: "/recepcao",
    icon: MonitorSmartphone,
    roles: ["admin", "secretaria"],
  },
  {
    label: "Pacientes",
    href: "/pacientes",
    icon: Users,
    roles: ["admin", "secretaria"],
  },
  {
    label: "CRM",
    href: "/crm",
    icon: Megaphone,
    roles: ["admin", "secretaria"],
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: DollarSign,
    roles: ["admin", "secretaria"],
  },
  {
    label: "Despesas",
    href: "/financeiro/despesas",
    icon: Receipt,
    roles: ["admin"],
  },
  {
    label: "Estoque",
    href: "/estoque",
    icon: Package,
    roles: ["admin", "secretaria"],
  },
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    roles: ["admin"],
  },
];

function SidebarContent({
  visibleMenu,
  onNavigate,
  showCloseButton,
}: {
  visibleMenu: typeof menu;
  onNavigate?: () => void;
  showCloseButton?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-[#239d9a] text-white">
      <div className="border-b border-white/20 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-black leading-tight">
              Dr. Henrique S. Pasquali
            </div>

            <div className="mt-1 text-xs font-bold opacity-80">
              IMPLANTODONTIA
            </div>
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onNavigate}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white hover:bg-white/25"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleMenu.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                active ? "bg-white text-[#239d9a]" : "hover:bg-white/20"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/20 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="text-xs opacity-80">Sistema ativo</div>
      </div>
    </div>
  );
}

export default function Sidebar({
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function loadRole() {
      const userRole = await getUserRole();
      setRole(userRole || "admin");
    }

    loadRole();
  }, []);

  const visibleMenu = menu.filter((item) =>
    item.roles.includes(role || "admin")
  );

  const mainMobileMenu = visibleMenu.filter((item) =>
    ["/", "/agenda", "/pacientes", "/crm", "/financeiro"].includes(item.href)
  );

  return (
    <>
      <aside className="hidden h-screen w-52 shrink-0 flex-col md:flex">
        <SidebarContent visibleMenu={visibleMenu} />
      </aside>

      <div
        className={`fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed left-0 top-0 z-[80] h-[100dvh] w-[82vw] max-w-[310px] overflow-hidden rounded-r-[2rem] shadow-2xl transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          visibleMenu={visibleMenu}
          onNavigate={onCloseMobile}
          showCloseButton
        />
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#d4e8e8] bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5">
          {mainMobileMenu.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-black ${
                  active ? "text-[#239d9a]" : "text-slate-500"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-2xl ${
                    active ? "bg-[#e7f8f7]" : "bg-transparent"
                  }`}
                >
                  <Icon size={17} />
                </span>

                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
