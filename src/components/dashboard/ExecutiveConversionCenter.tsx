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
      ? Math.round(((totalPatients - sourceWithoutOriginCount) / totalPatients) * 100)
      : 0;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
          <Brain size={22} />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-800">
            Central Executiva de Conversão
          </h2>

          <p className="text-sm text-slate-500">
            Visão consolidada de CRM, comercial e marketing da clínica.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-3xl bg-cyan-50 p-5">
          <div className="mb-4 flex items-center gap-2 text-cyan-700">
            <Users size={18} />
            <p className="text-xs font-black uppercase tracking-widest">
              CRM executivo
            </p>
          </div>

          <div className="space-y-3">
            <MetricLine label="Pacientes quentes" value={hotPatients} />
            <MetricLine label="Pacientes frios" value={coldPatients} />
            <MetricLine label="Risco de abandono" value={riskPatients} />
            <MetricLine label="Pacientes VIP" value={vipPatients} />
            <MetricLine label="Score médio" value={`${averageScore}/100`} />
          </div>
        </div>

        <div className="rounded-3xl bg-emerald-50 p-5">
          <div className="mb-4 flex items-center gap-2 text-emerald-700">
            <Target size={18} />
            <p className="text-xs font-black uppercase tracking-widest">
              Comercial
            </p>
          </div>

          <div className="space-y-3">
            <MetricLine label="Orçamentos abertos" value={openBudgetsCount} />
            <MetricLine
              label="Valor em oportunidades"
              value={formatCurrency(openBudgetRevenue)}
            />
            <MetricLine label="Ticket médio" value={formatCurrency(averageTicket)} />
            <MetricLine label="Previsão de conversão" value={`${conversionProjection}%`} />
            <MetricLine
              label="Campanhas previstas"
              value={formatCurrency(campaignRevenueProjection)}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-amber-50 p-5">
          <div className="mb-4 flex items-center gap-2 text-amber-700">
            <Megaphone size={18} />
            <p className="text-xs font-black uppercase tracking-widest">
              Marketing
            </p>
          </div>

          <div className="space-y-3">
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
                  ? `${bestConversionSource.source} • ${bestConversionSource.conversion}%`
                  : "Sem dados"
              }
            />
            <MetricLine label="Pacientes de fora/região" value={outsidePatients} />
            <MetricLine label="Origem preenchida" value={`${originCoverage}%`} />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-cyan-100 bg-cyan-50 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-cyan-800">
              Recomendação executiva
            </p>

            <p className="mt-1 text-sm leading-6 text-cyan-700">
              Priorize pacientes quentes, orçamentos em aberto e canais com maior
              conversão. Complete a origem dos pacientes para melhorar a precisão do BI.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-cyan-700">
            <TrendingUp size={18} />
            {originCoverage}% dos pacientes com origem
          </div>
        </div>
      </div>
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
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <span className="text-sm font-black text-slate-800">{value}</span>
    </div>
  );
}
