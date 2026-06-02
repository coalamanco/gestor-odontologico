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
      <div className="flex flex-col gap-2 border-b border-[var(--clinic-border)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[21px] font-black tracking-[-0.03em] text-[var(--clinic-text)]">
            Ações rápidas
          </h2>

          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--clinic-muted)]">
            Atalhos principais do consultório
          </p>
        </div>

        <div className="hidden rounded-full bg-[var(--clinic-primary-soft)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--clinic-primary-dark)] ring-1 ring-[var(--clinic-border)] md:inline-flex">
          {actions.length} atalho(s)
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <a
              key={action.title}
              href={action.href}
              className="group rounded-[22px] border border-[var(--clinic-border)] bg-white p-4 shadow-[var(--premium-shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 xl:flex-col xl:items-start">
                <div className="premium-dashboard-icon h-11 w-11 shrink-0 rounded-[16px] transition group-hover:scale-105">
                  <Icon size={20} />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-[16px] font-black text-[var(--clinic-text)]">
                    {action.title}
                  </h3>

                  <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-[var(--clinic-muted)]">
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
