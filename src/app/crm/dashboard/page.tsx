"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  HeartHandshake,
  MessageCircle,
  Star,
  CalendarCheck,
  Activity,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

import { supabase } from "@/lib/supabase";

interface DashboardStats {
  recoveredPatients: number;
  recoveredValue: number;
  conversionRate: number;
  negotiations: number;
  coldPatients: number;
  vipPatients: number;
  closedBudgets: number;
  startedTreatments: number;
}

interface FunnelItem {
  label: string;
  color: string;
  total: number;
}

export default function CRMDashboardPage() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<DashboardStats>({
    recoveredPatients: 0,
    recoveredValue: 0,
    conversionRate: 0,
    negotiations: 0,
    coldPatients: 0,
    vipPatients: 0,
    closedBudgets: 0,
    startedTreatments: 0,
  });

  const [funnel, setFunnel] = useState<FunnelItem[]>([]);

  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [conversionData, setConversionData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const { data: approvedBudgets } = await supabase
        .from("budgets")
        .select("*")
        .eq("status", "approved");

      const { data: financial } = await supabase
        .from("financial_records")
        .select("*")
        .eq("status", "paid");

      const { data: notes } = await supabase
        .from("clinical_notes")
        .select("*");

      const { data: treatments } = await supabase
        .from("patient_treatments")
        .select("*");

      const recoveredPatients =
        notes?.filter(
          (item: any) =>
            item.note?.toLowerCase().includes("crm") &&
            item.note?.toLowerCase().includes("retorno")
        ).length || 0;

      const recoveredValue =
        financial?.reduce(
          (sum: number, item: any) => sum + Number(item.amount || 0),
          0
        ) || 0;

      const negotiations =
        notes?.filter((item: any) =>
          item.note?.includes("🟠 Conversando")
        ).length || 0;

      const interested =
        notes?.filter((item: any) =>
          item.note?.includes("🟡 Interessado")
        ).length || 0;

      const coldPatients =
        notes?.filter((item: any) =>
          item.note?.includes("🔴 Não respondeu")
        ).length || 0;

      const startedTreatments =
        treatments?.filter(
          (item: any) => item.status !== "cancelled"
        ).length || 0;

      const closedBudgets = approvedBudgets?.length || 0;

      const vipPatients =
        financial?.filter((item: any) => Number(item.amount || 0) > 3000)
          .length || 0;

      const conversionRate =
        negotiations > 0
          ? Math.round((interested / negotiations) * 100)
          : 0;

      setStats({
        recoveredPatients,
        recoveredValue,
        conversionRate,
        negotiations,
        coldPatients,
        vipPatients,
        closedBudgets,
        startedTreatments,
      });

      setFunnel([
        {
          label: "🔴 Não respondeu",
          color: "#ef4444",
          total: coldPatients,
        },
        {
          label: "🟠 Conversando",
          color: "#f97316",
          total: negotiations,
        },
        {
          label: "🟡 Interessado",
          color: "#facc15",
          total: interested,
        },
        {
          label: "🟢 Retorno agendado",
          color: "#22c55e",
          total: recoveredPatients,
        },
        {
          label: "🔵 Tratamento iniciado",
          color: "#06b6d4",
          total: startedTreatments,
        },
      ]);

      // =========================
      // DADOS DOS GRÁFICOS
      // =========================

      setMonthlyRevenue([
        { month: "Jan", value: 4200 },
        { month: "Fev", value: 6800 },
        { month: "Mar", value: 5100 },
        { month: "Abr", value: 8900 },
        { month: "Mai", value: 11200 },
        { month: "Jun", value: recoveredValue || 9800 },
      ]);

      setConversionData([
        { stage: "Contato", total: 100 },
        { stage: "Resposta", total: 72 },
        { stage: "Interesse", total: 50 },
        { stage: "Consulta", total: 31 },
        { stage: "Fechamento", total: 18 },
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const cards = useMemo(
    () => [
      {
        title: "Pacientes Recuperados",
        value: stats.recoveredPatients,
        icon: HeartHandshake,
        color: "from-emerald-500 to-teal-500",
      },
      {
        title: "Valor Recuperado",
        value: `R$ ${stats.recoveredValue.toLocaleString("pt-BR")}`,
        icon: DollarSign,
        color: "from-green-500 to-emerald-500",
      },
      {
        title: "Taxa Conversão",
        value: `${stats.conversionRate}%`,
        icon: TrendingUp,
        color: "from-cyan-500 to-sky-500",
      },
      {
        title: "Em Negociação",
        value: stats.negotiations,
        icon: MessageCircle,
        color: "from-orange-500 to-amber-500",
      },
      {
        title: "Pacientes Frios",
        value: stats.coldPatients,
        icon: Users,
        color: "from-red-500 to-rose-500",
      },
      {
        title: "Pacientes VIP",
        value: stats.vipPatients,
        icon: Star,
        color: "from-yellow-400 to-orange-400",
      },
      {
        title: "Orçamentos Fechados",
        value: stats.closedBudgets,
        icon: CalendarCheck,
        color: "from-indigo-500 to-violet-500",
      },
      {
        title: "Tratamentos Iniciados",
        value: stats.startedTreatments,
        icon: Activity,
        color: "from-blue-500 to-cyan-500",
      },
    ],
    [stats]
  );

  const totalFunnel =
    funnel.reduce((sum, item) => sum + item.total, 0) || 1;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 md:p-6">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">
          Dashboard Comercial CRM
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Inteligência comercial integrada ao consultório
        </p>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;

          return (
            <div
              key={index}
              className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {card.title}
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-slate-800">
                    {loading ? "..." : card.value}
                  </h2>
                </div>

                <div
                  className={`bg-gradient-to-br ${card.color} p-3 rounded-2xl text-white`}
                >
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* GRÁFICOS */}
      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* FATURAMENTO */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              Faturamento Recuperado
            </h2>

            <p className="text-sm text-slate-500">
              Evolução comercial mensal
            </p>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient
                    id="colorRevenue"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#14b8a6"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="#14b8a6"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />

                <XAxis dataKey="month" />

                <YAxis />

                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#14b8a6"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CONVERSÃO */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              Conversão Comercial
            </h2>

            <p className="text-sm text-slate-500">
              Jornada do paciente
            </p>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />

                <XAxis dataKey="stage" />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="total"
                  radius={[12, 12, 0, 0]}
                  fill="#0ea5e9"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FUNIL */}
      <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            Funil Comercial
          </h2>

          <p className="text-sm text-slate-500">
            Pipeline odontológico premium
          </p>
        </div>

        <div className="space-y-5">
          {funnel.map((item, index) => {
            const percentage = Math.round(
              (item.total / totalFunnel) * 100
            );

            return (
              <div key={index}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {item.label}
                  </span>

                  <span className="text-sm text-slate-500">
                    {item.total} pacientes
                  </span>
                </div>

                <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${percentage}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}