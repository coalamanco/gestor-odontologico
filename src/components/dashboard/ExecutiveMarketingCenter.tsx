"use client";

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
    (a, b) => b.conversion - a.conversion
  )[0];

  const totalRevenue = safeSources.reduce(
    (sum, item) => sum + Number(item.confirmedRevenue || 0),
    0
  );

  const totalHotPatients = safeSources.reduce(
    (sum, item) => sum + Number(item.hotPatients || 0),
    0
  );

  const originCoverage =
    totalPatients > 0
      ? Math.round(((totalPatients - sourceWithoutOriginCount) / totalPatients) * 100)
      : 0;

  const estimatedMarketingRoi =
    totalRevenue > 0 ? Math.max(1, Math.round(totalRevenue / 1000)) : 0;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          <Megaphone size={22} />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-800">
            Central de Marketing Odontológico
          </h2>

          <p className="text-sm text-slate-500">
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
        <div className="rounded-3xl bg-slate-50 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-800">
                Ranking de canais
              </p>
              <p className="text-xs font-bold text-slate-400">
                Receita, pacientes e conversão por origem
              </p>
            </div>

            <div className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-500">
              ROI estimado: {estimatedMarketingRoi}x
            </div>
          </div>

          <div className="space-y-3">
            {safeSources.slice(0, 8).map((item) => (
              <div
                key={item.source}
                className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 md:grid-cols-4 md:items-center"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Origem
                  </p>
                  <p className="font-black text-slate-800">{item.source}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Pacientes
                  </p>
                  <p className="font-black text-slate-800">{item.patients}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Receita
                  </p>
                  <p className="font-black text-emerald-600">
                    {formatCurrency(item.confirmedRevenue)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Conversão
                  </p>
                  <p className="font-black text-cyan-600">
                    {item.hotPatients} quentes • {item.conversion}%
                  </p>
                </div>
              </div>
            ))}

            {safeSources.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Ainda não há origens cadastradas.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-cyan-50 p-5">
          <p className="text-sm font-black text-cyan-800">
            Inteligência de marketing
          </p>

          <div className="mt-4 space-y-3">
            <InsightLine
              label="Receita rastreada"
              value={formatCurrency(totalRevenue)}
            />

            <InsightLine
              label="Pacientes sem origem"
              value={sourceWithoutOriginCount}
            />

            <InsightLine
              label="Canal dominante"
              value={bestRevenueSource?.source || "Sem dados"}
            />

            <InsightLine
              label="Canal mais eficiente"
              value={bestConversionSource?.source || "Sem dados"}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-cyan-100 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-widest text-cyan-700">
              Próxima recomendação
            </p>

            <p className="mt-2 text-sm leading-6 text-cyan-700">
              Preencha a origem em todos os novos pacientes. Isso melhora o ROI,
              mostra quais canais realmente geram faturamento e ajuda a decidir
              onde investir em marketing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketingKpi({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5">
      <div className="mb-3 inline-flex rounded-2xl bg-white p-3 text-[#239d9a]">
        {icon}
      </div>

      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-slate-800">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-400">
        {description}
      </p>
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
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3">
      <span className="text-sm font-bold text-cyan-700">{label}</span>
      <span className="text-sm font-black text-slate-800">{value}</span>
    </div>
  );
}
