"use client";

import { Brain, Megaphone, Target, TrendingUp, Users } from "lucide-react";

type SourceStats = {
  source: string;
  patients: number;
  confirmedRevenue: number;
  hotPatients: number;
  conversion: number;
};

type ExecutiveConversionCenterProps = {
  hotPatients: number;
  coldPatients: number;
  riskPatients: number;
  vipPatients: number;
  averageScore: number;
  openBudgetsCount: number;
  openBudgetRevenue: number;
  averageTicket: number;
  conversionProjection: number;
  campaignRevenueProjection: number;
  sourceStats: SourceStats[];
  sourceWithoutOriginCount: number;
  totalPatients: number;
  formatCurrency: (value: number) => string;
};

export default function ExecutiveConversionCenter({
  hotPatients,
  coldPatients,
  riskPatients,
  vipPatients,
  averageScore,
  openBudgetsCount,
  openBudgetRevenue,
  averageTicket,
  conversionProjection,
  campaignRevenueProjection,
  sourceStats,
  sourceWithoutOriginCount,
  totalPatients,
  formatCurrency,
}: ExecutiveConversionCenterProps) {
  const safeSources = Array.isArray(sourceStats) ? sourceStats : [];

  const bestSource = safeSources[0];

  const bestConversionSource = [...safeSources].sort(
    (a, b) => b.conversion - a.conversion
  )[0];

  const outsidePatients = safeSources
    .filter((item) => {
      const name = String(item.source || "").toLowerCase();

      return (
        name.includes("fora") ||
        name.includes("outra") ||
        name.includes("região") ||
        name.includes("regiao") ||
        name.includes("estado")
      );
    })
    .reduce((sum, item) => sum + item.patients, 0);

  const originCoverage =
    totalPatients > 0
      ? Math.round(
          ((totalPatients - sourceWithoutOriginCount) / totalPatients) * 100
        )
      : 0;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm xl:p-5">
      <div className="mb-5 flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-2xl bg-purple-50 p-3 text-purple-600">
          <Brain size={22} />
        </div>

        <div className="min-w-0">
          <h2 className="break-words text-xl font-black text-slate-800">
            Central Executiva de Conversão
          </h2>

          <p className="mt-1 break-words text-sm leading-6 text-slate-500">
            Visão consolidada de CRM, comercial e marketing da clínica.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 2xl:grid-cols-3">
        <SectionCard
          icon={<Users size={18} />}
          title="CRM Executivo"
          tone="bg-cyan-50 text-cyan-700"
        >
          <MetricLine label="Pacientes quentes" value={hotPatients} />
          <MetricLine label="Pacientes frios" value={coldPatients} />
          <MetricLine label="Risco de abandono" value={riskPatients} />
          <MetricLine label="Pacientes VIP" value={vipPatients} />
          <MetricLine label="Score médio" value={`${averageScore}/100`} />
        </SectionCard>

        <SectionCard
          icon={<Target size={18} />}
          title="Comercial"
          tone="bg-emerald-50 text-emerald-700"
        >
          <MetricLine label="Orçamentos abertos" value={openBudgetsCount} />
          <MetricLine
            label="Valor em oportunidade"
            value={formatCurrency(openBudgetRevenue)}
          />
          <MetricLine
            label="Ticket médio"
            value={formatCurrency(averageTicket)}
          />
          <MetricLine
            label="Previsão de conversão"
            value={`${conversionProjection}%`}
          />
          <MetricLine
            label="Campanhas previstas"
            value={formatCurrency(campaignRevenueProjection)}
          />
        </SectionCard>

        <SectionCard
          icon={<Megaphone size={18} />}
          title="Marketing"
          tone="bg-amber-50 text-amber-700"
        >
          <MetricLine
            label="Origem que mais faturou"
            value={bestSource?.source || "Sem dados"}
          />

          <MetricLine
            label="Receita da origem"
            value={formatCurrency(bestSource?.confirmedRevenue || 0)}
          />

          <MetricLine
            label="Melhor conversão"
            value={
              bestConversionSource
                ? `${bestConversionSource.conversion}%`
                : "Sem dados"
            }
          />

          <MetricLine
            label="Canal mais eficiente"
            value={bestConversionSource?.source || "Sem dados"}
          />

          <MetricLine
            label="Pacientes fora/região"
            value={outsidePatients}
          />

          <MetricLine
            label="Origem preenchida"
            value={`${originCoverage}%`}
          />
        </SectionCard>
      </div>

      <div className="mt-4 rounded-3xl border border-cyan-100 bg-cyan-50 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-cyan-800">
              Recomendação executiva
            </p>

            <p className="mt-1 break-words text-sm leading-6 text-cyan-700">
              Priorize pacientes quentes, orçamentos em aberto e canais com maior
              conversão. Complete a origem dos pacientes para melhorar a precisão do BI.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-cyan-700">
            <TrendingUp size={18} />
            {originCoverage}% dos pacientes com origem definida
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-3xl p-4 ${tone}`}>
      <div className="mb-4 flex items-center gap-2">
        {icon}

        <p className="text-xs font-black uppercase tracking-widest">
          {title}
        </p>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function MetricLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 rounded-2xl bg-white/80 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3">
      <span className="min-w-0 break-words text-sm font-bold leading-5 text-slate-600">
        {label}
      </span>

      <span className="min-w-0 break-words text-sm font-black leading-5 text-slate-800 sm:text-right">
        {value}
      </span>
    </div>
  );
}
