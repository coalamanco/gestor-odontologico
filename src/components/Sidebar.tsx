"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Brain,
  Calendar,
  Calculator,
  DollarSign,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
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

type MenuItem = {
  label: string;
  href: string;
  icon: any;
  roles: string[];
  section: "Visão geral" | "Atendimento" | "Relacionamento" | "Gestão" | "Sistema";
  mobile?: boolean;
  child?: boolean;
};

const menu: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "secretaria"],
    section: "Visão geral",
    mobile: true,
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
    mobile: true,
  },
  {
    label: "Pacientes",
    href: "/pacientes",
    icon: Users,
    roles: ["admin", "secretaria"],
    section: "Atendimento",
    mobile: true,
  },
  {
    label: "CRM",
    href: "/crm",
    icon: Megaphone,
    roles: ["admin", "secretaria"],
    section: "Relacionamento",
    mobile: true,
  },
  {
    label: "Campanhas",
    href: "/crm/campanhas",
    icon: MessageCircle,
    roles: ["admin", "secretaria"],
    section: "Relacionamento",
    child: true,
  },
  {
    label: "IA Estratégica",
    href: "/crm/ia",
    icon: Brain,
    roles: ["admin", "secretaria"],
    section: "Relacionamento",
    child: true,
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: DollarSign,
    roles: ["admin", "secretaria"],
    section: "Gestão",
    mobile: true,
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
    label: "Precificação",
    href: "/configuracoes/precificacao",
    icon: Calculator,
    roles: ["admin"],
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

const sections: MenuItem["section"][] = [
  "Visão geral",
  "Atendimento",
  "Relacionamento",
  "Gestão",
  "Sistema",
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  visibleMenu,
  onNavigate,
  showCloseButton,
}: {
  visibleMenu: MenuItem[];
  onNavigate?: () => void;
  showCloseButton?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#0f766e] via-[#159e96] to-[#35bcb3] text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)]">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#159e96] shadow-sm">
                <span className="text-sm font-black">HP</span>
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-black leading-tight">
                  Dr. Henrique S. Pasquali
                </div>

                <div className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/70">
                  Implantodontia
                </div>
              </div>
            </div>
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onNavigate}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
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
            const sectionItems = visibleMenu.filter(
              (item) => item.section === section,
            );

            if (sectionItems.length === 0) return null;

            return (
              <div key={section} className="space-y-1.5">
                <div className="px-3 text-[9px] font-black uppercase tracking-[0.22em] text-emerald-100/45">
                  {section}
                </div>

                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const active = isActiveRoute(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`group relative flex items-center gap-3 rounded-2xl transition-all duration-200 ${
                          item.child ? "ml-4 px-3 py-2 text-xs font-black" : "px-3 py-2.5 text-sm font-black"
                        } ${
                          active
                            ? "bg-white text-[#159e96] shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
                            : item.child
                              ? "text-white/60 hover:translate-x-1 hover:bg-white/10 hover:text-white"
                              : "text-white/75 hover:translate-x-1 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#159e96]" />
                        )}

                        {item.child && !active && (
                          <span className="absolute -left-2 top-1/2 h-px w-3 -translate-y-1/2 bg-white/25" />
                        )}

                        <span
                          className={`flex shrink-0 items-center justify-center rounded-xl transition ${
                            item.child ? "h-7 w-7" : "h-8 w-8"
                          } ${
                            active
                              ? "bg-[#dff8f5] text-[#159e96]"
                              : "bg-white/10 text-white/85 group-hover:bg-white/15 group-hover:text-white"
                          }`}
                        >
                          <Icon size={item.child ? 15 : 17} />
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
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,0.15)]" />
            <span className="text-xs font-black text-white">Sistema ativo</span>
          </div>

          <div className="mt-1 text-[10px] font-semibold text-emerald-100/60">
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

  const visibleMenu = useMemo(() => {
    return menu.filter((item) => item.roles.includes(role || "admin"));
  }, [role]);

  const mainMobileMenu = useMemo(() => {
    return visibleMenu.filter((item) => item.mobile);
  }, [visibleMenu]);

  return (
    <>
      <aside className="hidden h-screen w-56 shrink-0 flex-col md:flex">
        <SidebarContent visibleMenu={visibleMenu} />
      </aside>

      <div
        className={`fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
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

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#d8f1ee] bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5">
          {mainMobileMenu.map((item) => {
            const active = isActiveRoute(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-black ${
                  active ? "text-[#159e96]" : "text-slate-500"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-2xl ${
                    active ? "bg-[#dff8f5]" : "bg-transparent"
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
