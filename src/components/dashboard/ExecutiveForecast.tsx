"use client";

import Link from "next/link";
import { Brain, Target } from "lucide-react";

type SmartGoalPoint = {
  key: string;
  label: string;
  revenue: number;
};

type ExecutiveForecastProps = {
  suggestedMonthlyGoal: number;
  suggestedAnnualGoal: number;
  trend: string;
  growthRate: number;
  confidence: string;
  riskLevel: string;
  executiveRecommendation: string;
  riskMessage: string;
  opportunityMessage: string;
  lastThreeMonthsAverage: number;
  monthlySeries: SmartGoalPoint[];
  monthlyGoal: number;
};

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ExecutiveForecast({
  suggestedMonthlyGoal,
  suggestedAnnualGoal,
  trend,
  growthRate,
  confidence,
  riskLevel,
  executiveRecommendation,
  riskMessage,
  opportunityMessage,
  lastThreeMonthsAverage,
  monthlySeries,
  monthlyGoal,
}: ExecutiveForecastProps) {
  return (
    <div className="mb-6 rounded-3xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50 p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-700 shadow-sm">
            <Brain size={14} />
            Meta Inteligente Automática
          </div>

          <h2 className="mt-3 text-xl font-black text-slate-800">
            Sugestão preditiva da clínica
          </h2>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
            {executiveRecommendation}
          </p>
        </div>

        <Link
          href="/configuracoes/metas"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#239d9a] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#1f8f8c]"
        >
          <Target size={17} />
          Aplicar nas metas
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Meta mensal sugerida
          </p>
          <p className="mt-2 text-2xl font-black text-[#239d9a]">
            {formatCurrency(suggestedMonthlyGoal)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Meta anual sugerida
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-600">
            {formatCurrency(suggestedAnnualGoal)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Tendência
          </p>
          <p className="mt-2 text-2xl font-black text-slate-800">
            {trend}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            {growthRate}% vs. mês anterior
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Confiança da IA
          </p>
          <p className="mt-2 text-2xl font-black text-blue-600">
            {confidence}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Risco
          </p>
          <p
            className={`mt-2 text-2xl font-black ${
              riskLevel === "Alto"
                ? "text-rose-600"
                : riskLevel === "Médio"
                  ? "text-amber-600"
                  : "text-emerald-600"
            }`}
          >
            {riskLevel}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white bg-white/80 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-amber-600">
            Atenção executiva
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {riskMessage}
          </p>
        </div>

        <div className="rounded-3xl border border-white bg-white/80 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
            Oportunidade comercial
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {opportunityMessage}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-white/80 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Histórico usado na previsão
          </p>
          <p className="text-xs font-bold text-slate-400">
            Média 3 meses: {formatCurrency(lastThreeMonthsAverage)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {monthlySeries.map((point) => (
            <div
              key={point.key}
              className="rounded-2xl bg-slate-50 p-3"
            >
              <p className="text-xs font-black uppercase text-slate-400">
                {point.label}
              </p>
              <p className="mt-1 text-sm font-black text-slate-700">
                {formatCurrency(point.revenue)}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#239d9a]"
                  style={{
                    width: `${Math.min(
                      100,
                      monthlyGoal > 0
                        ? Math.round((point.revenue / monthlyGoal) * 100)
                        : 0
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
