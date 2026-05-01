"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  DollarSign,
  Megaphone,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import {
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
import { supabase } from "@/lib/supabase";

type Patient = {
  id: string;
  name?: string | null;
  patient_source?: string | null;
};

type FinancialRecord = {
  id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  status?: string | null;
};

type Budget = {
  id: string;
  patient_id?: string | null;
  status?: string | null;
  total?: number | string | null;
};

type Treatment = {
  id: string;
  patient_id?: string | null;
  procedure_name?: string | null;
  treatment_name?: string | null;
  title?: string | null;
  total?: number | string | null;
  unit_price?: number | string | null;
};

type ChannelStats = {
  source: string;
  patients: number;
  revenue: number;
  approvedBudgets: number;
  conversion: number;
  averageTicket: number;
};

type TreatmentStats = {
  name: string;
  total: number;
  count: number;
};

function parseMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;

  const normalized = String(value)
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  return Number(normalized) || 0;
}

function normalizeSource(value?: string | null) {
  const source = String(value || "").trim();

  if (!source) return "Não informado";

  const lower = source.toLowerCase();

  if (lower.includes("insta")) return "Instagram";
  if (lower.includes("google")) return "Google";
  if (lower.includes("indic")) return "Indicação";
  if (lower.includes("whats")) return "WhatsApp";
  if (lower.includes("face")) return "Facebook";
  if (lower.includes("tiktok") || lower.includes("tik tok")) return "TikTok";
  if (
    lower.includes("tráfego") ||
    lower.includes("trafego") ||
    lower.includes("pago")
  ) {
    return "Tráfego Pago";
  }
  if (lower.includes("site")) return "Site";
  if (lower.includes("conv")) return "Convênio";

  return source;
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function isApprovedStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();

  return (
    normalized === "approved" ||
    normalized === "aprovado" ||
    normalized === "aprovada" ||
    normalized === "finalizado" ||
    normalized === "fechado"
  );
}

function isPaidStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();

  return (
    normalized === "paid" ||
    normalized === "pago" ||
    normalized === "paga" ||
    normalized === "recebido" ||
    normalized === "quitado"
  );
}

export default function MarketingCRMDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [financial, setFinancial] = useState<FinancialRecord[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  useEffect(() => {
    loadMarketingData();
  }, []);

  async function loadMarketingData() {
    try {
      setLoading(true);

      const [
        { data: patientsData, error: patientsError },
        { data: financialData, error: financialError },
        { data: budgetsData, error: budgetsError },
        { data: treatmentsData, error: treatmentsError },
      ] = await Promise.all([
        supabase.from("patients").select("*"),
        supabase.from("financial_records").select("*"),
        supabase.from("budgets").select("*"),
        supabase.from("patient_treatments").select("*"),
      ]);

      if (patientsError) throw patientsError;
      if (financialError) throw financialError;
      if (budgetsError) throw budgetsError;
      if (treatmentsError) throw treatmentsError;

      setPatients((patientsData || []) as Patient[]);
      setFinancial((financialData || []) as FinancialRecord[]);
      setBudgets((budgetsData || []) as Budget[]);
      setTreatments((treatmentsData || []) as Treatment[]);
    } catch (error) {
      console.error("Erro ao carregar Central de Marketing:", error);
      alert("Erro ao carregar Central de Marketing.");
    } finally {
      setLoading(false);
    }
  }

  const patientById = useMemo(() => {
    const map = new Map<string, Patient>();

    patients.forEach((patient) => {
      map.set(patient.id, patient);
    });

    return map;
  }, [patients]);

  const channelStats = useMemo<ChannelStats[]>(() => {
    const map = new Map<string, ChannelStats>();

    patients.forEach((patient) => {
      const source = normalizeSource(patient.patient_source);

      if (!map.has(source)) {
        map.set(source, {
          source,
          patients: 0,
          revenue: 0,
          approvedBudgets: 0,
          conversion: 0,
          averageTicket: 0,
        });
      }

      const current = map.get(source)!;
      current.patients += 1;
    });

    financial.forEach((record) => {
      if (!record.patient_id) return;
      if (!isPaidStatus(record.status)) return;

      const patient = patientById.get(record.patient_id);
      const source = normalizeSource(patient?.patient_source);

      if (!map.has(source)) {
        map.set(source, {
          source,
          patients: 0,
          revenue: 0,
          approvedBudgets: 0,
          conversion: 0,
          averageTicket: 0,
        });
      }

      const current = map.get(source)!;
      current.revenue += parseMoney(record.amount);
    });

    budgets.forEach((budget) => {
      if (!budget.patient_id) return;
      if (!isApprovedStatus(budget.status)) return;

      const patient = patientById.get(budget.patient_id);
      const source = normalizeSource(patient?.patient_source);

      if (!map.has(source)) {
        map.set(source, {
          source,
          patients: 0,
          revenue: 0,
          approvedBudgets: 0,
          conversion: 0,
          averageTicket: 0,
        });
      }

      const current = map.get(source)!;
      current.approvedBudgets += 1;
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        conversion:
          item.patients > 0
            ? Math.round((item.approvedBudgets / item.patients) * 100)
            : 0,
        averageTicket:
          item.patients > 0 ? Math.round(item.revenue / item.patients) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [patients, financial, budgets, patientById]);

  const treatmentStats = useMemo<TreatmentStats[]>(() => {
    const map = new Map<string, TreatmentStats>();

    treatments.forEach((treatment) => {
      const name =
        treatment.procedure_name ||
        treatment.treatment_name ||
        treatment.title ||
        "Tratamento não informado";

      if (!map.has(name)) {
        map.set(name, {
          name,
          total: 0,
          count: 0,
        });
      }

      const current = map.get(name)!;
      current.count += 1;
      current.total += parseMoney(treatment.total || treatment.unit_price);
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [treatments]);

  const totalPatients = channelStats.reduce(
    (sum, item) => sum + item.patients,
    0
  );

  const totalRevenue = channelStats.reduce(
    (sum, item) => sum + item.revenue,
    0
  );

  const totalApprovedBudgets = channelStats.reduce(
    (sum, item) => sum + item.approvedBudgets,
    0
  );

  const generalConversion =
    totalPatients > 0
      ? Math.round((totalApprovedBudgets / totalPatients) * 100)
      : 0;

  const bestChannel = channelStats[0];

  const bestTicketChannel =
    channelStats.length > 0
      ? [...channelStats].sort((a, b) => b.averageTicket - a.averageTicket)[0]
      : null;

  const cards = [
    {
      title: "Pacientes rastreados",
      value: totalPatients,
      icon: Users,
      color: "from-cyan-500 to-teal-500",
    },
    {
      title: "Faturamento por origem",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: "from-emerald-500 to-green-500",
    },
    {
      title: "Conversão geral",
      value: `${generalConversion}%`,
      icon: Target,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Melhor canal",
      value: bestChannel?.source || "-",
      icon: Trophy,
      color: "from-yellow-400 to-orange-400",
    },
  ];

  const chartColors = [
    "#14b8a6",
    "#0ea5e9",
    "#f97316",
    "#22c55e",
    "#a855f7",
    "#ec4899",
    "#facc15",
    "#64748b",
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
          <Megaphone size={14} />
          Central de Marketing
        </div>

        <h1 className="text-2xl font-black text-slate-800 md:text-3xl">
          Marketing Odontológico
        </h1>

        <p className="text-sm text-slate-500">
          Origem dos pacientes, conversão por canal, faturamento e tratamentos
          mais vendidos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-800">
                    {loading ? "..." : card.value}
                  </h2>
                </div>

                <div
                  className={`rounded-2xl bg-gradient-to-br ${card.color} p-3 text-white`}
                >
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-800">
              Faturamento por Canal
            </h2>
            <p className="text-sm text-slate-500">
              Quanto cada origem gerou em receita registrada.
            </p>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelStats}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Bar
                  dataKey="revenue"
                  radius={[12, 12, 0, 0]}
                  fill="#14b8a6"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-800">
              Distribuição de Pacientes
            </h2>
            <p className="text-sm text-slate-500">
              Quantidade de pacientes por origem.
            </p>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelStats}
                  dataKey="patients"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={105}
                  label
                >
                  {channelStats.map((entry, index) => (
                    <Cell
                      key={entry.source}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
            <BarChart3 size={22} />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-800">
              Conversão por Canal
            </h2>
            <p className="text-sm text-slate-500">
              Pacientes, faturamento, ticket médio e conversão.
            </p>
          </div>
        </div>

        {channelStats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Nenhum dado de origem encontrado ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {channelStats.map((channel) => (
              <div
                key={channel.source}
                className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-5 md:items-center"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Origem
                  </p>
                  <p className="font-black text-slate-800">
                    {channel.source}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Pacientes
                  </p>
                  <p className="font-black text-slate-800">
                    {channel.patients}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Faturamento
                  </p>
                  <p className="font-black text-emerald-600">
                    {formatCurrency(channel.revenue)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Ticket médio
                  </p>
                  <p className="font-black text-slate-800">
                    {formatCurrency(channel.averageTicket)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Conversão
                  </p>
                  <p className="font-black text-cyan-600">
                    {channel.conversion}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <Activity size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Procedimentos Mais Vendidos
              </h2>
              <p className="text-sm text-slate-500">
                Tratamentos com maior valor registrado.
              </p>
            </div>
          </div>

          {treatmentStats.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Ainda não há tratamentos suficientes para ranking.
            </div>
          ) : (
            <div className="space-y-3">
              {treatmentStats.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-black text-slate-800">
                      {index + 1}. {item.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.count} lançamento(s)
                    </p>
                  </div>

                  <p className="font-black text-emerald-600">
                    {formatCurrency(item.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <TrendingUp size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Leitura Comercial
              </h2>
              <p className="text-sm text-slate-500">
                Resumo inteligente do marketing.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-800">
                Canal com maior faturamento
              </p>
              <p className="mt-1">
                {bestChannel
                  ? `${bestChannel.source} gerou ${formatCurrency(
                      bestChannel.revenue
                    )} em receita registrada.`
                  : "Ainda não há canal dominante."}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-800">Melhor ticket médio</p>
              <p className="mt-1">
                {bestTicketChannel
                  ? `${bestTicketChannel.source} tem ticket médio de ${formatCurrency(
                      bestTicketChannel.averageTicket
                    )}.`
                  : "Ainda não há dados suficientes."}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-800">Próxima evolução</p>
              <p className="mt-1">
                Quando os pacientes tiverem origem preenchida, este painel
                mostrará quais canais realmente trazem retorno ao consultório.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
