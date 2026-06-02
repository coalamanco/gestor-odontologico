"use client";

import { AlertTriangle, CheckCircle2, Zap } from "lucide-react";

type DashboardInsight = {
  id: string;
  title: string;
  description: string;
  level: "danger" | "warning" | "info" | "success" | string;
  action: string;
  href: string;
};

type DashboardInsightsProps = {
  insights: DashboardInsight[];
};

function getInsightClasses(level: DashboardInsight["level"]) {
  if (level === "danger") {
    return "border-rose-100 bg-rose-50 text-rose-700";
  }

  if (level === "warning") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  if (level === "info") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }

  return "border-emerald-100 bg-emerald-50 text-emerald-700";
}

export default function DashboardInsights({
  insights,
}: DashboardInsightsProps) {
  return (
    <section className="premium-card-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--clinic-border)] px-6 py-5">
        <div>
          <h2 className="text-[24px] font-black tracking-[-0.03em] text-[var(--clinic-text)]">
            Indicadores inteligentes
          </h2>

          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--clinic-muted)]">
            Alertas automáticos para decisões rápidas
          </p>
        </div>

        <div className="premium-dashboard-icon h-12 w-12 rounded-[18px]">
          <Zap size={22} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
        {insights.map((item) => {
          const classes = getInsightClasses(item.level);

          return (
            <div
              key={item.id}
              className={`rounded-[22px] border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${classes}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {item.level === "success" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertTriangle size={18} />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-black leading-tight">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs font-medium leading-5 opacity-90">
                    {item.description}
                  </p>

                  <a
                    href={item.href}
                    className="mt-3 inline-flex rounded-xl bg-white/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm transition hover:bg-white"
                  >
                    {item.action}
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
