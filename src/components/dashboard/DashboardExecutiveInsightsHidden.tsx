"use client";

import { TrendingUp } from "lucide-react";

type DashboardExecutiveInsight = {
  label: string;
  value: string;
  description: string;
  positive: boolean;
};

type DashboardExecutiveInsightsHiddenProps = {
  insights: DashboardExecutiveInsight[];
};

export default function DashboardExecutiveInsightsHidden({
  insights,
}: DashboardExecutiveInsightsHiddenProps) {
  return (
    <div className="hidden">
      {insights.map((insight) => (
        <div
          key={insight.label}
          className="group overflow-hidden rounded-2xl border border-[#d9eeee] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {insight.label}
              </div>

              <div
                className={`mt-2 truncate text-xl font-black ${
                  insight.positive ? "text-[#239d9a]" : "text-rose-700"
                }`}
              >
                {insight.value}
              </div>

              <div className="mt-1 text-xs font-semibold text-slate-500">
                {insight.description}
              </div>
            </div>

            <div
              className={`rounded-2xl p-2.5 ${
                insight.positive
                  ? "bg-[#eefafa] text-[#239d9a]"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              <TrendingUp size={18} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
