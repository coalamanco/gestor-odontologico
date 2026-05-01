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
  Medal,
  Crown,
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

interface VIPPatient {
  id: string;
  name: string;
  totalPaid: number;
  appointments: number;
  treatments: number;
  lastVisit: string;
  level: string;
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
  const [vipPatientsList, setVipPatientsList] = useState<VIPPatient[]>([]);

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

      const { data: notes } = await supabase.from("clinical_notes").select("*");

      const { data: treatments } = await supabase
        .from("patient_treatments")
        .select("*");

      const { data: patients } = await supabase.from("patients").select("*");

      const { data: appointments } = await supabase
        .from("appointments")
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
        notes?.filter((item: any) => item.note?.includes("🟠 Conversando"))
          .length || 0;

      const interested =
        notes?.filter((item: any) => item.note?.includes("🟡 Interessado"))
          .length || 0;

      const coldPatients =
        notes?.filter((item: any) => item.note?.includes("🔴 Não respondeu"))
          .length || 0;

      const startedTreatments =
        treatments?.filter((item: any) => item.status !== "cancelled").length ||
        0;

      const closedBudgets = approvedBudgets?.length || 0;

      const vipMap = new Map<string, VIPPatient>();

      patients?.forEach((patient: any) => {
        vipMap.set(patient.id, {
          id: patient.id,
          name: patient.name || "Paciente sem nome",
          totalPaid: 0,
          appointments: 0,
          treatments: 0,
          lastVisit: "",
          level: "Bronze",
        });
      });

      financial?.forEach((item: any) => {
        const patientId = item.patient_id;
        if (!patientId || !vipMap.has(patientId)) return;

        const current = vipMap.get(patientId)!;
        current.totalPaid += Number(item.amount || 0);
      });

      treatments?.forEach((item: any) => {
        const patientId = item.patient_id;
        if (!patientId || !vipMap.has(patientId)) return;

        const current = vipMap.get(patientId)!;
        current.treatments += 1;
      });

      appointments?.forEach((item: any) => {
        const patientId = item.patient_id;
        if (!patientId || !vipMap.has(patientId)) return;

        const current = vipMap.get(patientId)!;
        current.appointments += 1;

        const appointmentDate = item.date || item.created_at || "";
        if (!current.lastVisit || appointmentDate > current.lastVisit) {
          current.lastVisit = appointmentDate;
        }
      });

      const vipRanking = Array.from(vipMap.values())
        .filter((patient) => patient.totalPaid > 0)
        .map((patient) => {
          let level = "Bronze";

          if (patient.totalPaid >= 10000) level = "Diamante";
          else if (patient.totalPaid >= 5000) level = "Ouro";
          else if (patient.totalPaid >= 3000) level = "Prata";

          return {
            ...patient,
            level,
          };
        })
        .sort((a, b) => b.totalPaid - a.totalPaid)
        .slice(0, 8);

      const vipPatients = vipRanking.filter(
        (patient) => patient.totalPaid >= 3000
      ).length;

      const conversionRate =
        negotiations > 0 ? Math.round((interested / negotiations) * 100) : 0;

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

      setMonthlyRevenue([
        { month: "Jan", value: 4200 },
        { month: "Fev", value: 6800 },
        { month: "Mar", value: 5100 },
        { month: "Abr", value: 8900 },
        { month: "Mai", value: 11200 },
        { month: "Jun", value: recoveredValue || 9800 },
      ]);

      setConversionData([
        { stage: "Contato", total: notes?.length || 0 },
        { stage: "Resposta", total: negotiations },
        { stage: "Interesse", total: interested },
        { stage: "Retorno", total: recoveredPatients },
        { stage: "Fechamento", total: closedBudgets },
      ]);

      setVipPatientsList(vipRanking);
    } catch (error) {
      console.error("Erro ao carregar Dashboard Comercial CRM:", error);
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
        value: `R$ ${stats.recoveredValue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
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

  const totalFunnel = funnel.reduce((sum, item) => sum + item.total, 0) || 1;

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(value: string) {
    if (!value) return "Sem registro";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sem registro";

    return date.toLocaleDateString("pt-BR");
  }

  function getVipBadge(level: string) {
    if (level === "Diamante") return "bg-cyan-50 text-cyan-700";
    if (level === "Ouro") return "bg-yellow-50 text-yellow-700";
    if (level === "Prata") return "bg-slate-100 text-slate-700";
    return "bg-orange-50 text-orange-700";
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">
          Dashboard Comercial CRM
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Inteligência comercial integrada ao consultório
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;

          return (
            <div
              key={index}
              className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">{card.title}</p>

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

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
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

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              Conversão Comercial
            </h2>

            <p className="text-sm text-slate-500">Jornada do paciente</p>
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
            const percentage = Math.round((item.total / totalFunnel) * 100);

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

      <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Ranking de Pacientes VIP
            </h2>

            <p className="text-sm text-slate-500">
              Pacientes com maior faturamento, recorrência e relacionamento
            </p>
          </div>

          <div className="hidden md:flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600">
            <Crown size={22} />
          </div>
        </div>

        {vipPatientsList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">
              O ranking VIP será exibido automaticamente conforme os pagamentos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vipPatientsList.map((patient, index) => (
              <div
                key={patient.id}
                className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    {index < 3 ? <Medal size={20} /> : index + 1}
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800">
                      {patient.name}
                    </p>

                    <p className="text-xs text-slate-500">
                      Última visita: {formatDate(patient.lastVisit)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm md:flex md:items-center md:gap-6">
                  <div>
                    <p className="text-xs text-slate-400">Faturamento</p>
                    <p className="font-bold text-emerald-600">
                      {formatCurrency(patient.totalPaid)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Consultas</p>
                    <p className="font-semibold text-slate-700">
                      {patient.appointments}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Tratamentos</p>
                    <p className="font-semibold text-slate-700">
                      {patient.treatments}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getVipBadge(
                        patient.level
                      )}`}
                    >
                      {patient.level}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}