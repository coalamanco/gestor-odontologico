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

type DashboardCardsProps = {
  cards: DashboardCard[];
};

export default function DashboardCards({ cards }: DashboardCardsProps) {
  return (
    <div className="-mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-1 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-3">
      {cards.map((card) => (
        <div key={card.title} className="min-w-[78vw] snap-start md:min-w-0">
          <PremiumKPI
            title={card.title}
            value={card.value}
            subtitle={card.description}
            icon={card.icon}
            iconClassName="bg-gradient-to-br from-[var(--clinic-primary)] to-[var(--clinic-primary-light)]"
          />

          {card.trend && (
            <div className="-mt-8 ml-5 inline-flex rounded-full bg-[var(--clinic-primary-soft)] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--clinic-primary-dark)] ring-1 ring-[var(--clinic-border)]">
              {card.trend}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
