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

      const vipPatients =
        financial?.filter((item: any) => Number(item.amount || 0) > 3000)
          .length || 0;

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
          color: "bg-red-500",
          total: coldPatients,
        },
        {
          label: "🟠 Conversando",
          color: "bg-orange-500",
          total: negotiations,
        },
        {
          label: "🟡 Interessado",
          color: "bg-yellow-400",
          total: interested,
        },
        {
          label: "🟢 Retorno agendado",
          color: "bg-green-500",
          total: recoveredPatients,
        },
        {
          label: "🔵 Tratamento iniciado",
          color: "bg-cyan-500",
          total: startedTreatments,
        },
      ]);
    } catch (error) {
      console.error("Erro ao carregar Dashboard CRM:", error);
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

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
          Dashboard Comercial CRM
        </h1>

        <p className="text-sm text-slate-500">
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

      <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            Funil Comercial
          </h2>

          <p className="text-sm text-slate-500">
            Pipeline de relacionamento odontológico
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
                    className={`${item.color} h-full rounded-full transition-all duration-700`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-800">
              Campanhas Mais Eficientes
            </h2>

            <p className="text-sm text-slate-500">
              Performance das automações CRM
            </p>
          </div>

          <div className="space-y-4">
            {[
              "Revisão Semestral",
              "Orçamento Parado",
              "Pacientes Sem Retorno",
              "Tratamento Parado",
            ].map((campaign, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-700">
                  {campaign}
                </span>

                <span className="text-sm font-bold text-emerald-600">
                  Ativa
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-800">
              Pacientes VIP
            </h2>

            <p className="text-sm text-slate-500">
              Maior relacionamento e faturamento
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">
              Ranking VIP será exibido automaticamente conforme os pagamentos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}