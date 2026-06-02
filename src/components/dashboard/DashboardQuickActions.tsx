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
      <div className="flex flex-col gap-2 border-b border-[var(--clinic-border)] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[18px] font-black tracking-[-0.025em] text-[var(--clinic-text)]">
            Ações rápidas
          </h2>

          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--clinic-muted)]">
            Atalhos principais do consultório
          </p>
        </div>

        <div className="hidden rounded-full bg-[var(--clinic-primary-soft)] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--clinic-primary-dark)] ring-1 ring-[var(--clinic-border)] md:inline-flex">
          {actions.length} atalho(s)
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <a
              key={action.title}
              href={action.href}
              className="group rounded-[18px] border border-[var(--clinic-border)] bg-white p-3.5 shadow-[var(--premium-shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 xl:flex-col xl:items-start">
                <div className="premium-dashboard-icon h-10 w-10 shrink-0 rounded-[14px] transition group-hover:scale-105">
                  <Icon size={18} />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-[14px] font-black text-[var(--clinic-text)]">
                    {action.title}
                  </h3>

                  <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-4 text-[var(--clinic-muted)]">
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