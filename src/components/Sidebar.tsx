"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Package,
  Settings,
  Receipt,
  MonitorSmartphone,
} from "lucide-react";
import { getUserRole } from "@/lib/getUserRole";

const menu = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "secretaria"],
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

export default function Sidebar() {
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
    ["/", "/agenda", "/recepcao", "/pacientes", "/financeiro"].includes(item.href)
  );

  return (
    <>
      <aside className="hidden h-screen w-52 shrink-0 flex-col bg-[#239d9a] text-white md:flex">
        <div className="border-b border-white/20 p-5">
          <div className="text-lg font-black">
            Dr. Henrique S. Pasquali
          </div>

          <div className="text-xs opacity-80">
            IMPLANTODONTIA
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleMenu.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  active ? "bg-white text-[#239d9a]" : "hover:bg-white/20"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/20 p-4">
          <div className="text-xs opacity-80">
            Sistema ativo
          </div>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#d4e8e8] bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5">
          {mainMobileMenu.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

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
                  <item.icon size={17} />
                </span>
                <span className="truncate">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
