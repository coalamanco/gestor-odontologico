"use client";

import Link from "next/link";
import { Brain, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

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

function getRiskClass(riskLevel: string) {
  if (riskLevel === "Alto") return "text-rose-600";
  if (riskLevel === "Médio") return "text-amber-600";
  return "text-emerald-600";
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
    <section className="premium-card-lg mb-6 p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--clinic-primary-soft)] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--clinic-primary-dark)] ring-1 ring-[var(--clinic-border)]">
            <Brain size={14} />
            Meta Inteligente Automática
          </div>

          <h2 className="mt-3 text-xl font-black tracking-tight text-[var(--clinic-text)]">
            Sugestão preditiva da clínica
          </h2>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-[var(--clinic-muted)]">
            {executiveRecommendation}
          </p>
        </div>

        <Button asChild>
          <Link href="/configuracoes/metas">
            <Target size={17} />
            Aplicar nas metas
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Meta mensal sugerida"
          value={formatCurrency(suggestedMonthlyGoal)}
          valueClassName="text-[var(--clinic-primary)]"
        />

        <MetricCard
          label="Meta anual sugerida"
          value={formatCurrency(suggestedAnnualGoal)}
          valueClassName="text-emerald-600"
        />

        <MetricCard
          label="Tendência"
          value={trend}
          description={`${growthRate}% vs. mês anterior`}
        />

        <MetricCard
          label="Confiança da IA"
          value={confidence}
          valueClassName="text-blue-600"
        />

        <MetricCard
          label="Risco"
          value={riskLevel}
          valueClassName={getRiskClass(riskLevel)}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="premium-card-soft p-5">
          <p className="text-xs font-black uppercase tracking-widest text-amber-600">
            Atenção executiva
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--clinic-muted)]">
            {riskMessage}
          </p>
        </div>

        <div className="premium-card-soft p-5">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
            Oportunidade comercial
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--clinic-muted)]">
            {opportunityMessage}
          </p>
        </div>
      </div>

      <div className="premium-card-soft mt-4 p-5">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--clinic-muted)]">
            Histórico usado na previsão
          </p>
          <p className="text-xs font-bold text-[var(--clinic-muted)]">
            Média 3 meses: {formatCurrency(lastThreeMonthsAverage)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {monthlySeries.map((point) => {
            const progress = Math.min(
              100,
              monthlyGoal > 0
                ? Math.round((point.revenue / monthlyGoal) * 100)
                : 0,
            );

            return (
              <div key={point.key} className="rounded-2xl bg-white p-3 ring-1 ring-[var(--clinic-border)]">
                <p className="text-xs font-black uppercase text-[var(--clinic-muted)]">
                  {point.label}
                </p>
                <p className="mt-1 text-sm font-black text-[var(--clinic-text)]">
                  {formatCurrency(point.revenue)}
                </p>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--clinic-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--clinic-primary)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
  valueClassName = "text-[var(--clinic-text)]",
}: {
  label: string;
  value: string;
  description?: string;
  valueClassName?: string;
}) {
  return (
    <div className="premium-kpi min-h-[116px]">
      <p className="premium-kpi-label">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-tight ${valueClassName}`}>
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs font-bold text-[var(--clinic-muted)]">
          {description}
        </p>
      )}
    </div>
  );
}
