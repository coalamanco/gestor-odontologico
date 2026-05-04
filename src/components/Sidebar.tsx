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
    section: "Visão geral",
  },
  {
    label: "BI Executivo",
    href: "/dashboard/executivo",
    icon: BarChart3,
    roles: ["admin"],
    section: "Visão geral",
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: Calendar,
    roles: ["admin", "secretaria"],
    section: "Atendimento",
  },
  {
    label: "Recepção",
    href: "/recepcao",
    icon: MonitorSmartphone,
    roles: ["admin", "secretaria"],
    section: "Atendimento",
  },
  {
    label: "Pacientes",
    href: "/pacientes",
    icon: Users,
    roles: ["admin", "secretaria"],
    section: "Atendimento",
  },
  {
    label: "CRM",
    href: "/crm",
    icon: Megaphone,
    roles: ["admin", "secretaria"],
    section: "Relacionamento",
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: DollarSign,
    roles: ["admin", "secretaria"],
    section: "Gestão",
  },
  {
    label: "Despesas",
    href: "/financeiro/despesas",
    icon: Receipt,
    roles: ["admin"],
    section: "Gestão",
  },
  {
    label: "Estoque",
    href: "/estoque",
    icon: Package,
    roles: ["admin", "secretaria"],
    section: "Gestão",
  },
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    roles: ["admin"],
    section: "Sistema",
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

  const sections = ["Visão geral", "Atendimento", "Relacionamento", "Gestão", "Sistema"];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#166f70] via-[#239d9a] to-[#2bb5b1] text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.12)]">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-full rounded-2xl border border-white/10 bg-white/10 p-3 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#239d9a] shadow-sm">
                <span className="text-sm font-black">HP</span>
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-black leading-tight">
                  Dr. Henrique S. Pasquali
                </div>

                <div className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/80">
                  Implantodontia
                </div>
              </div>
            </div>
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onNavigate}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {sections.map((section) => {
            const sectionItems = visibleMenu.filter((item) => item.section === section);

            if (sectionItems.length === 0) return null;

            return (
              <div key={section} className="space-y-1.5">
                <div className="px-3 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-50/55">
                  {section}
                </div>

                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));

                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black transition-all duration-200 ${
                          active
                            ? "bg-white text-[#166f70] shadow-[0_10px_28px_rgba(15,23,42,0.14)]"
                            : "text-white/78 hover:translate-x-1 hover:bg-white/12 hover:text-white"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#166f70]" />
                        )}

                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
                            active
                              ? "bg-[#e7f8f7] text-[#239d9a]"
                              : "bg-white/10 text-white/85 group-hover:bg-white/18 group-hover:text-white"
                          }`}
                        >
                          <Icon size={17} />
                        </span>

                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,0.16)]" />
            <span className="text-xs font-black text-white">Sistema ativo</span>
          </div>

          <div className="mt-1 text-[10px] font-semibold text-cyan-50/70">
            Operação clínica online
          </div>
        </div>
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
      <aside className="hidden h-screen w-56 shrink-0 flex-col md:flex">
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
