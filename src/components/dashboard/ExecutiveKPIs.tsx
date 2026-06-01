"use client";

import type { LucideIcon } from "lucide-react";
import PremiumKPI from "@/components/ui/PremiumKPI";

type ExecutiveKpiCard = {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  color?: string;
};

type ExecutiveKPIsProps = {
  loading: boolean;
  cards: ExecutiveKpiCard[];
};

export default function ExecutiveKPIs({
  loading,
  cards,
}: ExecutiveKPIsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <PremiumKPI
          key={card.title}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          loading={loading}
          iconClassName={
            card.color
              ? `bg-gradient-to-br ${card.color}`
              : undefined
          }
        />
      ))}
    </div>
  );
}
