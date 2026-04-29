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

  return (
    <aside className="w-52 min-h-screen bg-[#239d9a] text-white flex flex-col">
      <div className="p-5 border-b border-white/20">
        <div className="font-black text-lg">
          Dr. Henrique S. Pasquali
        </div>

        <div className="text-xs opacity-80">
          IMPLANTODONTIA
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {visibleMenu.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition ${
                active
                  ? "bg-white text-[#239d9a]"
                  : "hover:bg-white/20"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/20">
        <div className="text-xs opacity-80">
          Sistema ativo
        </div>
      </div>
    </aside>
  );
}