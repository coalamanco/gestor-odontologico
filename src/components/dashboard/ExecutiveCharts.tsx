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
  const currentRevenue = revenueData[revenueData.length - 1]?.revenue || 0;
  const currentTarget = revenueData[revenueData.length - 1]?.target || 0;

  const revenueProgress =
    currentTarget > 0 ? Math.round((currentRevenue / currentTarget) * 100) : 0;

  const totalPatientsFromSources = sourceData.reduce(
    (sum, item) => sum + Number(item.patients || 0),
    0
  );

  const averageOccupation = Math.round(
    scheduleData.reduce((sum, item) => sum + Number(item.occupied || 0), 0) /
      Math.max(scheduleData.length, 1)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
                Receita Atual
              </p>

              <p className="mt-2 text-3xl font-black text-slate-800">
                {formatCurrency(currentRevenue)}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <DollarSign size={22} />
            </div>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: `${Math.min(100, revenueProgress)}%`,
              }}
            />
          </div>

          <p className="mt-2 text-xs font-bold text-slate-500">
            {revenueProgress}% da meta mensal
          </p>
        </div>

        <div className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan-700">
                Ocupação Agenda
              </p>

              <p className="mt-2 text-3xl font-black text-slate-800">
                {averageOccupation}%
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
              <Calendar size={22} />
            </div>
          </div>

          <p className="mt-4 text-sm font-bold text-slate-500">
            Média inteligente de ocupação semanal.
          </p>
        </div>

        <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-purple-700">
                Conversão CRM
              </p>

              <p className="mt-2 text-3xl font-black text-slate-800">
                {conversionData[0]?.value || 0}%
              </p>
            </div>

            <div className="rounded-2xl bg-purple-100 p-3 text-purple-700">
              <TrendingUp size={22} />
            </div>
          </div>

          <p className="mt-4 text-sm font-bold text-slate-500">
            Taxa de fechamento dos pacientes.
          </p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                Novos Pacientes
              </p>

              <p className="mt-2 text-3xl font-black text-slate-800">
                {totalPatientsFromSources}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Users size={22} />
            </div>
          </div>

          <p className="mt-4 text-sm font-bold text-slate-500">
            Captação por origem comercial.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
              <TrendingUp size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Crescimento Financeiro
              </h2>

              <p className="text-sm text-slate-500">
                Receita x meta mensal da clínica.
              </p>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#239d9a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#239d9a" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />

                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                />

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
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-purple-50 p-3 text-purple-700">
              <Activity size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Conversão Comercial
              </h2>

              <p className="text-sm text-slate-500">
                Pipeline comercial e fechamento.
              </p>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                />

                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />

                <Tooltip />

                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {conversionData.map((_, index) => (
                    <Cell
                      key={`conversion-cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <Calendar size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Ocupação da Agenda
              </h2>

              <p className="text-sm text-slate-500">
                Capacidade ocupada da agenda semanal.
              </p>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scheduleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />

                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                />

                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />

                <Tooltip />

                <Bar
                  dataKey="occupied"
                  stackId="a"
                  fill="#239d9a"
                  radius={[10, 10, 0, 0]}
                />

                <Bar
                  dataKey="available"
                  stackId="a"
                  fill="#d9eeee"
                  radius={[10, 10, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
              <Users size={20} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Origem dos Pacientes
              </h2>

              <p className="text-sm text-slate-500">
                Principais canais de captação.
              </p>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="patients"
                  nameKey="source"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                >
                  {sourceData.map((_, index) => (
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
            {sourceData.map((item, index) => (
              <div
                key={`${item.source}-${index}`}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
              >
                <div
                  className="h-4 w-4 rounded-full"
                  style={{
                    backgroundColor:
                      CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />

                <div>
                  <p className="text-xs font-black uppercase text-slate-400">
                    {item.source}
                  </p>

                  <p className="text-sm font-black text-slate-700">
                    {item.patients} pacientes
                  </p>
                </div>
              </div>
            ))}

            {sourceData.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Ainda não há dados suficientes de origem.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
