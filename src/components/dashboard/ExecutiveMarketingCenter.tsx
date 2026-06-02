"use client";

import type { ReactNode } from "react";
import { BarChart3, MapPin, Megaphone, TrendingUp, Users } from "lucide-react";

type SourceStats = {
  source: string;
  patients: number;
  confirmedRevenue: number;
  hotPatients: number;
  conversion: number;
};

type ExecutiveMarketingCenterProps = {
  sourceStats: SourceStats[];
  totalPatients: number;
  sourceWithoutOriginCount: number;
  formatCurrency: (value: number) => string;
};

export default function ExecutiveMarketingCenter({
  sourceStats,
  totalPatients,
  sourceWithoutOriginCount,
  formatCurrency,
}: ExecutiveMarketingCenterProps) {
  const safeSources = Array.isArray(sourceStats) ? sourceStats : [];

  const bestRevenueSource = safeSources[0];

  const bestConversionSource = [...safeSources].sort(
    (a, b) => b.conversion - a.conversion,
  )[0];

  const totalRevenue = safeSources.reduce(
    (sum, item) => sum + Number(item.confirmedRevenue || 0),
    0,
  );

  const totalHotPatients = safeSources.reduce(
    (sum, item) => sum + Number(item.hotPatients || 0),
    0,
  );

  const originCoverage =
    totalPatients > 0
      ? Math.round(((totalPatients - sourceWithoutOriginCount) / totalPatients) * 100)
      : 0;

  const estimatedMarketingRoi =
    totalRevenue > 0 ? Math.max(1, Math.round(totalRevenue / 1000)) : 0;

  return (
    <section className="premium-card-lg p-5 md:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-[var(--clinic-primary-soft)] p-3 text-[var(--clinic-primary)]">
          <Megaphone size={22} />
        </div>

        <div>
          <h2 className="text-xl font-black tracking-tight text-[var(--clinic-text)]">
            Central de Marketing Odontológico
          </h2>

          <p className="text-sm text-[var(--clinic-muted)]">
            Origem dos pacientes, canais de aquisição, conversão e retorno comercial.
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MarketingKpi
          icon={<Users size={18} />}
          label="Pacientes com origem"
          value={`${originCoverage}%`}
          description={`${Math.max(0, totalPatients - sourceWithoutOriginCount)} de ${totalPatients}`}
        />

        <MarketingKpi
          icon={<TrendingUp size={18} />}
          label="Origem que mais faturou"
          value={bestRevenueSource?.source || "Sem dados"}
          description={formatCurrency(bestRevenueSource?.confirmedRevenue || 0)}
        />

        <MarketingKpi
          icon={<BarChart3 size={18} />}
          label="Melhor conversão"
          value={bestConversionSource?.source || "Sem dados"}
          description={
            bestConversionSource
              ? `${bestConversionSource.conversion}% de conversão`
              : "Aguardando dados"
          }
        />

        <MarketingKpi
          icon={<MapPin size={18} />}
          label="Oportunidades quentes"
          value={totalHotPatients}
          description="Pacientes com maior chance comercial"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="premium-card-soft p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[var(--clinic-text)]">
                Ranking de canais
              </p>
              <p className="text-xs font-bold text-[var(--clinic-muted)]">
                Receita, pacientes e conversão por origem
              </p>
            </div>

            <div className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-[var(--clinic-muted)] ring-1 ring-[var(--clinic-border)]">
              ROI estimado: {estimatedMarketingRoi}x
            </div>
          </div>

          <div className="space-y-3">
            {safeSources.slice(0, 8).map((item) => (
              <div
                key={item.source}
                className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 ring-1 ring-[var(--clinic-border)] md:grid-cols-4 md:items-center"
              >
                <MarketingColumn label="Origem" value={item.source} />
                <MarketingColumn label="Pacientes" value={item.patients} />
                <MarketingColumn
                  label="Receita"
                  value={formatCurrency(item.confirmedRevenue)}
                  valueClassName="text-emerald-600"
                />
                <MarketingColumn
                  label="Conversão"
                  value={`${item.hotPatients} quentes • ${item.conversion}%`}
                  valueClassName="text-[var(--clinic-primary)]"
                />
              </div>
            ))}

            {safeSources.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--clinic-border)] p-8 text-center text-sm text-[var(--clinic-muted)]">
                Ainda não há origens cadastradas.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--clinic-border)] bg-[var(--clinic-primary-soft)] p-5">
          <p className="text-sm font-black text-[var(--clinic-primary-dark)]">
            Inteligência de marketing
          </p>

          <div className="mt-4 space-y-3">
            <InsightLine label="Receita rastreada" value={formatCurrency(totalRevenue)} />
            <InsightLine label="Pacientes sem origem" value={sourceWithoutOriginCount} />
            <InsightLine label="Canal dominante" value={bestRevenueSource?.source || "Sem dados"} />
            <InsightLine label="Canal mais eficiente" value={bestConversionSource?.source || "Sem dados"} />
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--clinic-border)] bg-white p-4">
            <p className="text-xs font-black uppercase tracking-widest text-[var(--clinic-primary-dark)]">
              Próxima recomendação
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--clinic-primary-dark)]">
              Preencha a origem em todos os novos pacientes. Isso melhora o ROI,
              mostra quais canais realmente geram faturamento e ajuda a decidir
              onde investir em marketing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketingKpi({
  icon,
  label,
  value,
  description,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="premium-kpi min-h-[150px]">
      <div className="mb-3 inline-flex rounded-2xl bg-[var(--clinic-primary-soft)] p-3 text-[var(--clinic-primary)]">
        {icon}
      </div>

      <p className="premium-kpi-label">{label}</p>

      <p className="mt-2 text-xl font-black text-[var(--clinic-text)]">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-[var(--clinic-muted)]">
        {description}
      </p>
    </div>
  );
}

function MarketingColumn({
  label,
  value,
  valueClassName = "text-[var(--clinic-text)]",
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-[var(--clinic-muted)]">
        {label}
      </p>
      <p className={`font-black ${valueClassName}`}>{value}</p>
    </div>
  );
}

function InsightLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/85 px-4 py-3 ring-1 ring-white/80">
      <span className="text-sm font-bold text-[var(--clinic-primary-dark)]">
        {label}
      </span>
      <span className="text-sm font-black text-[var(--clinic-text)]">
        {value}
      </span>
    </div>
  );
}
