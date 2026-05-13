"use client";

import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardQuickAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type DashboardQuickActionsProps = {
  actions: DashboardQuickAction[];
};

export default function DashboardQuickActions({
  actions,
}: DashboardQuickActionsProps) {
  return (
    <Card className="rounded-2xl border border-[#d9eeee] bg-white shadow-sm overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-lg font-bold text-slate-800">
          Ações rápidas
        </CardTitle>

        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
          Atalhos principais do consultório
        </CardDescription>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 px-5 pb-5">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <a
              key={action.title}
              href={action.href}
              className="rounded-xl border border-[#d9eeee] bg-[#fbffff] p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#eefafa] p-2.5 text-[#239d9a]">
                  <Icon size={18} />
                </div>

                <div>
                  <div className="font-bold text-slate-800">
                    {action.title}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {action.description}
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}
