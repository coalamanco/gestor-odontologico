"use client";

import type { LucideIcon } from "lucide-react";

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
    <section className="premium-card-lg overflow-hidden">
      <div className="border-b border-[var(--clinic-border)] px-6 py-5">
        <h2 className="text-[24px] font-black tracking-[-0.03em] text-[var(--clinic-text)]">
          Ações rápidas
        </h2>

        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--clinic-muted)]">
          Atalhos principais do consultório
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <a
              key={action.title}
              href={action.href}
              className="premium-dashboard-card group rounded-[24px] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-start gap-4">
                <div className="premium-dashboard-icon h-14 w-14 shrink-0 rounded-[18px]">
                  <Icon size={24} />
                </div>

                <div>
                  <h3 className="text-[20px] font-black text-[var(--clinic-text)]">
                    {action.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[var(--clinic-muted)]">
                    {action.description}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
