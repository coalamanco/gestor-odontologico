"use client";

import {
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  DollarSign,
  HeartHandshake,
  Target,
} from "lucide-react";
import type { PredictiveInsight } from "@/lib/ai/predictiveInsights";

type PredictiveInsightsPanelProps = {
  insights: PredictiveInsight[];
};

function getTone(riskLevel: PredictiveInsight["riskLevel"]) {
  if (riskLevel === "alto") {
    return "border-rose-100 bg-rose-50 text-rose-800";
  }

  if (riskLevel === "medio") {
    return "border-amber-100 bg-amber-50 text-amber-800";
  }

  if (riskLevel === "oportunidade") {
    return "border-cyan-100 bg-cyan-50 text-cyan-800";
  }

  return "border-emerald-100 bg-emerald-50 text-emerald-800";
}

function getIcon(area: PredictiveInsight["area"]) {
  if (area === "Financeiro") return DollarSign;
  if (area === "Relacionamento") return HeartHandshake;
  if (area === "Agenda") return CalendarClock;
  return Target;
}

export default function PredictiveInsightsPanel({
  insights,
}: PredictiveInsightsPanelProps) {
  const safeInsights = Array.isArray(insights) ? insights : [];

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-2xl bg-[#239d9a]/10 p-3 text-[#239d9a]">
          <BrainCircuit className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-800">
            Previsões Leves da IA
          </h2>

          <p className="text-sm text-slate-500">
            Tendências e riscos prováveis, sem repetir os dashboards.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {safeInsights.map((insight) => {
          const Icon = getIcon(insight.area);

          return (
            <div
              key={insight.id}
              className={`rounded-2xl border p-4 ${getTone(
                insight.riskLevel,
              )}`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white/70 p-2">
                  {insight.riskLevel === "alto" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{insight.title}</h3>

                    <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                      {insight.area}
                    </span>
                  </div>

                  <p className="text-sm leading-6 opacity-90">
                    {insight.interpretation}
                  </p>

                  <p className="mt-2 text-sm font-bold leading-6">
                    Próxima ação: {insight.suggestedAction}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {safeInsights.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            Ainda não há previsões suficientes.
          </div>
        )}
      </div>
    </div>
  );
}
