"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Activity,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";
import PremiumKPI from "@/components/ui/PremiumKPI";

export type ExecutiveChartRevenueItem = {
  month: string;
  revenue: number;
  target: number;
};

export type ExecutiveChartConversionItem = {
  label: string;
  value: number;
};

export type ExecutiveChartScheduleItem = {
  day: string;
  occupied: number;
  available: number;
};

export type ExecutiveChartSourceItem = {
  source: string;
  patients: number;
};

type ExecutiveChartsProps = {
  revenueData: ExecutiveChartRevenueItem[];
  conversionData: ExecutiveChartConversionItem[];
  scheduleData: ExecutiveChartScheduleItem[];
  sourceData: ExecutiveChartSourceItem[];
};

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

const CHART_COLORS = [
  "#239d9a",
  "#3dbdb9",
  "#7bd6d3",
  "#a7e5e3",
  "#d7f5f4",
];

export default function ExecutiveCharts({
  revenueData,
  conversionData,
  scheduleData,
  sourceData,
}: ExecutiveChartsProps) {
  const safeRevenueData =
    revenueData && revenueData.length > 0
      ? revenueData
      : [{ month: "Atual", revenue: 0, target: 0 }];

  const safeConversionData =
    conversionData && conversionData.length > 0
      ? conversionData
      : [{ label: "Conversão", value: 0 }];

  const safeScheduleData =
    scheduleData && scheduleData.length > 0
      ? scheduleData
      : [{ day: "Hoje", occupied: 0, available: 100 }];

  const safeSourceData =
    sourceData && sourceData.length > 0
      ? sourceData
      : [{ source: "Sem origem", patients: 0 }];

  const currentRevenue = safeRevenueData[safeRevenueData.length - 1]?.revenue || 0;
  const currentTarget = safeRevenueData[safeRevenueData.length - 1]?.target || 0;

  const revenueProgress =
    currentTarget > 0 ? Math.round((currentRevenue / currentTarget) * 100) : 0;

  const totalPatientsFromSources = safeSourceData.reduce(
    (sum, item) => sum + Number(item.patients || 0),
    0,
  );

  const averageOccupation = Math.round(
    safeScheduleData.reduce((sum, item) => sum + Number(item.occupied || 0), 0) /
      Math.max(safeScheduleData.length, 1),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PremiumKPI
          title="Receita Atual"
          value={formatCurrency(currentRevenue)}
          subtitle={`${revenueProgress}% da meta mensal`}
          icon={DollarSign}
          iconClassName="bg-gradient-to-br from-[var(--clinic-primary)] to-[var(--clinic-primary-light)]"
        />

        <PremiumKPI
          title="Ocupação Agenda"
          value={`${averageOccupation}%`}
          subtitle="Média inteligente de ocupação semanal"
          icon={Calendar}
          iconClassName="bg-gradient-to-br from-[var(--clinic-primary)] to-[var(--clinic-primary-light)]"
        />

        <PremiumKPI
          title="Conversão CRM"
          value={`${safeConversionData[0]?.value || 0}%`}
          subtitle="Taxa de fechamento dos pacientes"
          icon={TrendingUp}
          iconClassName="bg-gradient-to-br from-[var(--clinic-primary)] to-[var(--clinic-primary-light)]"
        />

        <PremiumKPI
          title="Novos Pacientes"
          value={String(totalPatientsFromSources)}
          subtitle="Captação por origem comercial"
          icon={Users}
          iconClassName="bg-gradient-to-br from-[var(--clinic-primary)] to-[var(--clinic-primary-light)]"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          icon={<TrendingUp size={20} />}
          title="Crescimento Financeiro"
          subtitle="Receita x meta mensal da clínica."
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeRevenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#239d9a" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#239d9a" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis
                tickFormatter={(value) => `R$ ${Math.round(Number(value) / 1000)}k`}
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#239d9a"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={4}
              />

              <Area
                type="monotone"
                dataKey="target"
                stroke="#cbd5e1"
                fill="transparent"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          icon={<Activity size={20} />}
          title="Conversão Comercial"
          subtitle="Pipeline comercial e fechamento."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeConversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />

              <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                {safeConversionData.map((_, index) => (
                  <Cell
                    key={`conversion-cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          icon={<Calendar size={20} />}
          title="Ocupação da Agenda"
          subtitle="Capacidade ocupada da agenda semanal."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeScheduleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />

              <Bar dataKey="occupied" stackId="a" fill="#239d9a" radius={[10, 10, 0, 0]} />
              <Bar dataKey="available" stackId="a" fill="#d9eeee" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="premium-card-lg p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--clinic-primary-soft)] p-3 text-[var(--clinic-primary)]">
              <Users size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-[var(--clinic-text)]">
                Origem dos Pacientes
              </h2>

              <p className="text-sm text-[var(--clinic-muted)]">
                Principais canais de captação.
              </p>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={safeSourceData}
                  dataKey="patients"
                  nameKey="source"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                >
                  {safeSourceData.map((_, index) => (
                    <Cell
                      key={`source-cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {safeSourceData.map((item, index) => (
              <div
                key={`${item.source}-${index}`}
                className="flex items-center gap-3 rounded-2xl bg-[var(--clinic-surface-soft)] p-3 ring-1 ring-[var(--clinic-border)]"
              >
                <div
                  className="h-4 w-4 rounded-full"
                  style={{
                    backgroundColor:
                      CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />

                <div>
                  <p className="text-xs font-black uppercase text-[var(--clinic-muted)]">
                    {item.source}
                  </p>

                  <p className="text-sm font-black text-[var(--clinic-text)]">
                    {item.patients} pacientes
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="premium-card-lg p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-[var(--clinic-primary-soft)] p-3 text-[var(--clinic-primary)]">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-black text-[var(--clinic-text)]">
            {title}
          </h2>

          <p className="text-sm text-[var(--clinic-muted)]">{subtitle}</p>
        </div>
      </div>

      <div className="h-[320px] w-full">{children}</div>
    </div>
  );
}
