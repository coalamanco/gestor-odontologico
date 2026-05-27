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
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
          <Brain size={22} />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-800">
            Central Executiva de Conversão
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Visão consolidada de CRM, comercial e marketing da clínica.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SectionCard
          icon={<Users size={18} />}
          title="CRM Executivo"
          tone="bg-cyan-50 text-cyan-700"
        >
          <MetricLine label="Pacientes quentes" value={hotPatients} />
          <MetricLine label="Pacientes frios" value={coldPatients} />
          <MetricLine label="Risco abandono" value={riskPatients} />
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
            label="Valor oportunidade"
            value={formatCurrency(openBudgetRevenue)}
          />
          <MetricLine
            label="Ticket médio"
            value={formatCurrency(averageTicket)}
          />
          <MetricLine
            label="Conversão"
            value={`${conversionProjection}%`}
          />
          <MetricLine
            label="Campanhas"
            value={formatCurrency(campaignRevenueProjection)}
          />
        </SectionCard>

        <SectionCard
          icon={<Megaphone size={18} />}
          title="Marketing"
          tone="bg-amber-50 text-amber-700"
        >
          <MetricLine
            label="Maior faturamento"
            value={bestSource?.source || "Sem dados"}
          />

          <MetricLine
            label="Receita origem"
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
            label="Canal eficiente"
            value={bestConversionSource?.source || "Sem dados"}
          />

          <MetricLine
            label="Pacientes região"
            value={outsidePatients}
          />

          <MetricLine
            label="Origem preenchida"
            value={`${originCoverage}%`}
          />
        </SectionCard>
      </div>

      <div className="mt-5 rounded-3xl border border-cyan-100 bg-cyan-50 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-cyan-800">
              Recomendação executiva
            </p>

            <p className="mt-1 text-sm leading-6 text-cyan-700">
              Priorize pacientes quentes, orçamentos em aberto e campanhas com melhor conversão.
            </p>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-cyan-700">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp size={18} />
              {originCoverage}%
            </div>

            <p className="mt-1 text-xs font-bold text-slate-500">
              dos pacientes com origem definida
            </p>
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

      <div className="space-y-2">{children}</div>
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
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-3">
      <span className="text-sm font-bold text-slate-600">
        {label}
      </span>

      <span className="text-sm font-black text-slate-800 text-right">
        {value}
      </span>
    </div>
  );
}
