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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{card.title}</p>

                <h2 className="mt-2 text-2xl font-black text-slate-800">
                  {loading ? "..." : card.value}
                </h2>

                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {card.subtitle}
                </p>
              </div>

              <div
                className={`rounded-2xl bg-gradient-to-br ${card.color} p-3 text-white`}
              >
                <Icon size={22} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
