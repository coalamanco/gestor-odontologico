"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="-mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-1 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            key={card.title}
            className="min-w-[78vw] snap-start overflow-hidden rounded-2xl border border-[#d9eeee] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:min-w-0"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2 px-5 pt-5">
              <div>
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {card.title}
                </CardTitle>

                <div className={`mt-2 text-2xl font-bold tracking-tight ${card.color}`}>
                  {card.value}
                </div>
              </div>

              <div className={`rounded-xl p-2.5 ${card.bg} ${card.color}`}>
                <Icon size={18} />
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-xs text-slate-500">
                {card.description}
              </p>

              {card.trend && (
                <div className="mt-2 inline-flex rounded-full bg-[#f2fcfc] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#239d9a] ring-1 ring-[#d9eeee]">
                  {card.trend}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
