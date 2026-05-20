"use client";

import type { LucideIcon } from "lucide-react";

type ExecutiveKpiCard = {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
};

type ExecutiveKPIsProps = {
  loading: boolean;
  cards: ExecutiveKpiCard[];
};

export default function ExecutiveKPIs({ loading, cards }: ExecutiveKPIsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="group overflow-hidden rounded-[24px] border border-[#d9eeee] bg-white/95 p-4 shadow-[0_8px_24px_rgba(35,157,154,0.055)] ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(35,157,154,0.10)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {card.title}
                </p>

                <h2 className="mt-2 truncate text-[22px] font-semibold tracking-tight text-slate-800 md:text-[24px]">
                  {loading ? "..." : card.value}
                </h2>

                <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                  {card.subtitle}
                </p>
              </div>

              <div
                className={`shrink-0 rounded-[20px] bg-gradient-to-br ${card.color} p-3 text-white shadow-sm shadow-[#239d9a]/20 transition group-hover:scale-105`}
              >
                <Icon size={21} />
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#eefafa]">
              <div className={`h-full w-2/3 rounded-full bg-gradient-to-r ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
