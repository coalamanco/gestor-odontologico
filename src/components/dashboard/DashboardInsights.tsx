"use client";

import { AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    return "border-red-100 bg-red-50 text-red-700";
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
    <Card className="rounded-2xl border border-[#d9eeee] bg-white shadow-sm overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">
              Indicadores inteligentes
            </CardTitle>

            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
              Alertas automáticos para decisões rápidas
            </CardDescription>
          </div>

          <div className="rounded-xl bg-[#eefafa] p-2.5 text-[#239d9a]">
            <Zap size={18} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 px-5 pb-5">
        {insights.map((item) => {
          const classes = getInsightClasses(item.level);

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3 ${classes}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {item.level === "success" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-black leading-tight">
                    {item.title}
                  </div>

                  <div className="mt-1 text-xs font-medium opacity-90">
                    {item.description}
                  </div>

                  <a
                    href={item.href}
                    className="mt-2 inline-flex rounded-lg bg-white/70 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-white"
                  >
                    {item.action}
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
