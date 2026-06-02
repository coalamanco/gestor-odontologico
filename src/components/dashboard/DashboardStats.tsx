"use client";

import type { LucideIcon } from "lucide-react";
import PremiumKPI from "@/components/ui/PremiumKPI";

type DashboardCard = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  trend?: string;
};

type DashboardStatsProps = {
  cards: DashboardCard[];
};

export default function DashboardStats({ cards }: DashboardStatsProps) {
  return (
    <div className="-mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-3">
      {cards.map((card) => (
        <div key={card.title} className="min-w-[78vw] snap-start md:min-w-0">
          <div className="relative">
            <PremiumKPI
              title={card.title}
              value={card.value}
              subtitle={card.description}
              icon={card.icon}
              iconClassName="bg-gradient-to-br from-[var(--clinic-primary)] to-[var(--clinic-primary-light)]"
            />

            {card.trend && (
              <div className="absolute bottom-3 left-4 inline-flex rounded-full bg-[var(--clinic-primary-soft)] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--clinic-primary-dark)] ring-1 ring-[var(--clinic-border)]">
                {card.trend}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}