"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Brain,
  Crown,
  DollarSign,
  FileText,
  Megaphone,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  calculatePatientCrmScore,
  normalizePatientSource,
} from "@/lib/crmScore";
import { calculateRevenueForecast } from "@/lib/revenueForecast";
import { calculateClinicGoals } from "@/lib/clinicGoals";

type Patient = {
  id: string;
  name?: string | null;
  phone?: string | null;
  patient_source?: string | null;
  source?: string | null;
  origin?: string | null;
  created_at?: string | null;
};

type Appointment = {
  id: string;
  patient_id?: string | null;
  date?: string | null;
  start_time?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type Budget = {
  id: string;
  patient_id?: string | null;
  status?: string | null;
  total?: number | string | null;
  created_at?: string | null;
  approved_at?: string | null;
};

type FinancialRecord = {
  id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  procedure_name?: string | null;
  treatment_name?: string | null;
  description?: string | null;
  category?: string | null;
  professional_name?: string | null;
  dentist_name?: string | null;
};

type Treatment = {
  id: string;
  patient_id?: string | null;
  procedure_name?: string | null;
  treatment_name?: string | null;
  title?: string | null;
  status?: string | null;
  total?: number | string | null;
  unit_price?: number | string | null;
  created_at?: string | null;
  completed_at?: string | null;
  professional_name?: string | null;
  dentist_name?: string | null;
};

type ClinicalNote = {
  id: string;
  patient_id?: string | null;
  title?: string | null;
  content?: string | null;
  note?: string | null;
  created_at?: string | null;
};

type ScoredPatient = {
  patient: Patient;
  score: number;
  closingChance: number;
  abandonmentRisk: "Baixo" | "Médio" | "Alto";
  financialPotential: "Baixo" | "Médio" | "Alto";
  vipLevel: "Bronze" | "Prata" | "Ouro" | "Diamante";
  totalPaid: number;
  openBudgets: number;
  source: string;
};

type SourceStats = {
  source: string;
  patients: number;
  confirmedRevenue: number;
  hotPatients: number;
  conversion: number;
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

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

function isApprovedStatus(status?: string | null) {
  const normalized = normalizeStatus(status);

  return (
    normalized === "approved" ||
    normalized === "aprovado" ||
    normalized === "aprovada" ||
    normalized === "fechado" ||
    normalized === "fechada" ||
    normalized === "finalizado"
  );
}

function isRejectedStatus(status?: string | null) {
  const normalized = normalizeStatus(status);

  return (
    normalized === "reprovado" ||
    normalized === "reprovada" ||
    normalized === "cancelado" ||
    normalized === "cancelada" ||
    normalized === "rejected"
  );
}

function isPaidStatus(status?: string | null) {
  const normalized = normalizeStatus(status);

  return (
    normalized === "paid" ||
    normalized === "pago" ||
    normalized === "paga" ||
    normalized === "recebido" ||
    normalized === "quitado"
  );
}

function getTrendClass(trend: string) {
  if (trend === "Alta") return "bg-emerald-100 text-emerald-700";
  if (trend === "Atenção") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function getGoalChanceClass(chance: string) {
  if (chance === "Alta") return "bg-emerald-100 text-emerald-700";
  if (chance === "Média") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function getScoreClass(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export default function DashboardExecutivoPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(
    []
  );
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [
        { data: patientsData, error: patientsError },
        { data: appointmentsData, error: appointmentsError },
        { data: budgetsData, error: budgetsError },
        { data: financialData, error: financialError },
        { data: treatmentsData, error: treatmentsError },
        { data: notesData, error: notesError },
      ] = await Promise.all([
        supabase.from("patients").select("*").order("name", { ascending: true }),
        supabase
          .from("appointments")
          .select("*")
          .order("date", { ascending: false }),
        supabase
          .from("budgets")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("financial_records")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("patient_treatments")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("clinical_notes")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (patientsError) throw patientsError;
      if (appointmentsError) throw appointmentsError;
      if (budgetsError) throw budgetsError;
      if (financialError) throw financialError;
      if (treatmentsError) throw treatmentsError;
      if (notesError) throw notesError;

      setPatients((patientsData || []) as Patient[]);
      setAppointments((appointmentsData || []) as Appointment[]);
      setBudgets((budgetsData || []) as Budget[]);
      setFinancialRecords((financialData || []) as FinancialRecord[]);
      setTreatments((treatmentsData || []) as Treatment[]);
      setClinicalNotes((notesData || []) as ClinicalNote[]);
    } catch (error: any) {
      alert(
        "Erro ao carregar Dashboard Executivo: " +
          (error?.message || "erro inesperado")
      );
    } finally {
      setLoading(false);
    }
  }

  const appointmentsByPatient = useMemo(() => {
    const map = new Map<string, Appointment[]>();

    appointments.forEach((appointment) => {
      if (!appointment.patient_id) return;
      const list = map.get(appointment.patient_id) || [];
      list.push(appointment);
      map.set(appointment.patient_id, list);
    });

    return map;
  }, [appointments]);

  const budgetsByPatient = useMemo(() => {
    const map = new Map<string, Budget[]>();

    budgets.forEach((budget) => {
      if (!budget.patient_id) return;
      const list = map.get(budget.patient_id) || [];
      list.push(budget);
      map.set(budget.patient_id, list);
    });

    return map;
  }, [budgets]);

  const financialByPatient = useMemo(() => {
    const map = new Map<string, FinancialRecord[]>();

    financialRecords.forEach((record) => {
      if (!record.patient_id) return;
      const list = map.get(record.patient_id) || [];
      list.push(record);
      map.set(record.patient_id, list);
    });

    return map;
  }, [financialRecords]);

  const treatmentsByPatient = useMemo(() => {
    const map = new Map<string, Treatment[]>();

    treatments.forEach((treatment) => {
      if (!treatment.patient_id) return;
      const list = map.get(treatment.patient_id) || [];
      list.push(treatment);
      map.set(treatment.patient_id, list);
    });

    return map;
  }, [treatments]);

  const notesByPatient = useMemo(() => {
    const map = new Map<string, ClinicalNote[]>();

    clinicalNotes.forEach((note) => {
      if (!note.patient_id) return;
      const list = map.get(note.patient_id) || [];
      list.push(note);
      map.set(note.patient_id, list);
    });

    return map;
  }, [clinicalNotes]);

  const scoredPatients = useMemo<ScoredPatient[]>(() => {
    return patients
      .map((patient) => {
        const result = calculatePatientCrmScore({
          patient: {
            id: patient.id,
            name: patient.name,
            patient_source:
              patient.patient_source || patient.source || patient.origin || null,
            created_at: patient.created_at,
          },
          appointments: appointmentsByPatient.get(patient.id) || [],
          budgets: budgetsByPatient.get(patient.id) || [],
          financialRecords: financialByPatient.get(patient.id) || [],
          treatments: treatmentsByPatient.get(patient.id) || [],
          clinicalNotes: notesByPatient.get(patient.id) || [],
        });

        return {
          patient,
          score: result.score,
          closingChance: result.closingChance,
          abandonmentRisk: result.abandonmentRisk,
          financialPotential: result.financialPotential,
          vipLevel: result.vipLevel,
          totalPaid: result.totalPaid,
          openBudgets: result.openBudgets,
          source: normalizePatientSource(
            patient.patient_source || patient.source || patient.origin || null
          ),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [
    patients,
    appointmentsByPatient,
    budgetsByPatient,
    financialByPatient,
    treatmentsByPatient,
    notesByPatient,
  ]);

  const campaignProjections = useMemo(() => {
    const hotPatients = scoredPatients.filter(
      (patient) => patient.closingChance >= 70
    ).length;

    const riskPatients = scoredPatients.filter(
      (patient) => patient.abandonmentRisk === "Alto"
    ).length;

    const vipPatients = scoredPatients.filter(
      (patient) => patient.vipLevel === "Ouro" || patient.vipLevel === "Diamante"
    ).length;

    const openBudgetPatients = scoredPatients.filter(
      (patient) => patient.openBudgets > 0
    ).length;

    return [
      {
        name: "Pacientes quentes",
        estimatedRevenue: hotPatients * 1800 * 0.42,
        estimatedConversion: 42,
        eligiblePatients: hotPatients,
      },
      {
        name: "Recuperação de risco",
        estimatedRevenue: riskPatients * 650 * 0.2,
        estimatedConversion: 20,
        eligiblePatients: riskPatients,
      },
      {
        name: "Pacientes VIP",
        estimatedRevenue: vipPatients * 2200 * 0.35,
        estimatedConversion: 35,
        eligiblePatients: vipPatients,
      },
      {
        name: "Orçamentos parados",
        estimatedRevenue: openBudgetPatients * 1800 * 0.28,
        estimatedConversion: 28,
        eligiblePatients: openBudgetPatients,
      },
    ];
  }, [scoredPatients]);

  const forecast = useMemo(() => {
    return calculateRevenueForecast({
      budgets,
      financialRecords,
      campaigns: campaignProjections,
      scoredPatients: scoredPatients.map((item) => ({
        id: item.patient.id,
        score: item.score,
        closingChance: item.closingChance,
        vipLevel: item.vipLevel,
        financialPotential: item.financialPotential,
      })),
    });
  }, [budgets, financialRecords, campaignProjections, scoredPatients]);

  const goals = useMemo(() => {
    return calculateClinicGoals({
      monthlyGoal: 80000,
      annualGoal: 960000,
      crmGoal: 30,
      commercialGoal: 20,
      confirmedRevenue: forecast.confirmedRevenue,
      probableRevenue: forecast.probableRevenue,
      potentialRevenue: forecast.potentialRevenue,
      financialRecords,
      treatments,
      budgets,
      campaigns: campaignProjections,
      scoredPatients: scoredPatients.map((item) => ({
        id: item.patient.id,
        score: item.score,
        closingChance: item.closingChance,
        vipLevel: item.vipLevel,
        financialPotential: item.financialPotential,
      })),
    });
  }, [
    forecast,
    financialRecords,
    treatments,
    budgets,
    campaignProjections,
    scoredPatients,
  ]);

  const sourceStats = useMemo<SourceStats[]>(() => {
    const map = new Map<string, SourceStats>();

    patients.forEach((patient) => {
      const source = normalizePatientSource(
        patient.patient_source || patient.source || patient.origin || null
      );

      if (!map.has(source)) {
        map.set(source, {
          source,
          patients: 0,
          confirmedRevenue: 0,
          hotPatients: 0,
          conversion: 0,
        });
      }

      map.get(source)!.patients += 1;
    });

    financialRecords.forEach((record) => {
      if (!record.patient_id) return;

      const patient = patients.find((item) => item.id === record.patient_id);
      const source = normalizePatientSource(
        patient?.patient_source || patient?.source || patient?.origin || null
      );

      if (!map.has(source)) {
        map.set(source, {
          source,
          patients: 0,
          confirmedRevenue: 0,
          hotPatients: 0,
          conversion: 0,
        });
      }

      const paid = parseMoney(record.paid_amount);
      const amount = parseMoney(record.amount);

      if (paid > 0) {
        map.get(source)!.confirmedRevenue += paid;
      } else if (isPaidStatus(record.status)) {
        map.get(source)!.confirmedRevenue += amount;
      }
    });

    scoredPatients.forEach((item) => {
      if (item.closingChance < 70) return;

      if (!map.has(item.source)) {
        map.set(item.source, {
          source: item.source,
          patients: 0,
          confirmedRevenue: 0,
          hotPatients: 0,
          conversion: 0,
        });
      }

      map.get(item.source)!.hotPatients += 1;
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        conversion:
          item.patients > 0
            ? Math.round((item.hotPatients / item.patients) * 100)
            : 0,
      }))
      .sort((a, b) => b.confirmedRevenue - a.confirmedRevenue);
  }, [patients, financialRecords, scoredPatients]);

  const approvedBudgets = budgets.filter((budget) =>
    isApprovedStatus(budget.status)
  );

  const openBudgets = budgets.filter((budget) => {
    const status = normalizeStatus(budget.status);
    return !isApprovedStatus(status) && !isRejectedStatus(status);
  });

  const averageScore =
    scoredPatients.length > 0
      ? Math.round(
          scoredPatients.reduce((sum, item) => sum + item.score, 0) /
            scoredPatients.length
        )
      : 0;

  const hotPatients = scoredPatients.filter(
    (patient) => patient.closingChance >= 70
  );

  const coldPatients = scoredPatients.filter(
    (patient) => patient.closingChance < 45
  );

  const riskPatients = scoredPatients.filter(
    (patient) => patient.abandonmentRisk === "Alto"
  );

  const vipPatients = scoredPatients.filter(
    (patient) => patient.vipLevel === "Ouro" || patient.vipLevel === "Diamante"
  );

  const openBudgetRevenue = openBudgets.reduce(
    (sum, budget) => sum + parseMoney(budget.total),
    0
  );

  const averageTicket =
    approvedBudgets.length > 0
      ? Math.round(
          approvedBudgets.reduce(
            (sum, budget) => sum + parseMoney(budget.total),
            0
          ) / approvedBudgets.length
        )
      : 0;

  const executiveCards = [
    {
      title: "Confirmado",
      value: formatCurrency(forecast.confirmedRevenue),
      subtitle: "Receita já registrada",
      icon: DollarSign,
      color: "from-emerald-500 to-green-500",
    },
    {
      title: "Provável",
      value: formatCurrency(forecast.probableRevenue),
      subtitle: "Previsão com CRM",
      icon: TrendingUp,
      color: "from-cyan-500 to-teal-500",
    },
    {
      title: "Potencial",
      value: formatCurrency(forecast.potentialRevenue),
      subtitle: "Pipeline máximo",
      icon: Target,
      color: "from-blue-500 to-indigo-500",
    },
    {
      title: "Meta atingida",
      value: `${goals.monthlyProgress}%`,
      subtitle: `Meta: ${formatCurrency(goals.monthlyGoal)}`,
      icon: Trophy,
      color: "from-yellow-400 to-orange-400",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
          <Sparkles size={14} />
          BI Executivo
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 md:text-3xl">
              Dashboard Executivo Odontológico
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Visão executiva de faturamento, metas, CRM, campanhas, marketing,
              pipeline comercial e previsão financeira.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/crm/campanhas"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#239d9a] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#1f8f8c]"
            >
              <Megaphone size={17} />
              Campanhas
            </Link>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-black text-[#239d9a] shadow-sm hover:bg-cyan-50"
            >
              <RefreshCw size={17} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Metas e tendência mensal
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-4 py-2 text-sm font-black ${getTrendClass(
                  goals.monthlyTrend
                )}`}
              >
                Tendência: {goals.monthlyTrend}
              </span>

              <span
                className={`rounded-full px-4 py-2 text-sm font-black ${getGoalChanceClass(
                  goals.chanceToHitGoal
                )}`}
              >
                Chance de bater meta: {goals.chanceToHitGoal}
              </span>

              <span className="text-sm text-slate-500">
                Faltam{" "}
                <strong className="text-slate-800">
                  {formatCurrency(goals.gapToGoal)}
                </strong>{" "}
                para a meta confirmada.
              </span>
            </div>
          </div>

          <p className="max-w-4xl text-sm leading-6 text-slate-600">
            {goals.executiveSummary}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {executiveCards.map((card) => {
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
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {card.subtitle}
                  </p>
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

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
              <BarChart3 size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Metas e Performance
              </h2>
              <p className="text-sm text-slate-500">
                Meta mensal, projeção provável e potencial da clínica.
              </p>
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
              <span>Meta mensal</span>
              <span>{goals.monthlyProgress}%</span>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#239d9a]"
                style={{ width: `${Math.min(100, goals.monthlyProgress)}%` }}
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
              <span>Confirmado: {formatCurrency(goals.confirmedRevenue)}</span>
              <span>Provável: {formatCurrency(goals.probableRevenue)}</span>
              <span>Potencial: {formatCurrency(goals.potentialRevenue)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-emerald-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                Progresso provável
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-700">
                {goals.probableProgress}%
              </p>
            </div>

            <div className="rounded-3xl bg-cyan-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-700">
                Conversão comercial
              </p>
              <p className="mt-2 text-2xl font-black text-cyan-700">
                {goals.commercialConversion}%
              </p>
            </div>

            <div className="rounded-3xl bg-purple-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-purple-700">
                Recuperação prevista
              </p>
              <p className="mt-2 text-2xl font-black text-purple-700">
                {goals.recoveredPatientsProjection}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-yellow-50 p-3 text-yellow-600">
              <Trophy size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Destaques
              </h2>
              <p className="text-sm text-slate-500">
                Produção e performance.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Procedimento destaque
              </p>
              <p className="mt-1 font-black text-slate-800">
                {goals.topProcedure?.name || "Sem dados"}
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-600">
                {formatCurrency(goals.topProcedure?.value || 0)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Profissional destaque
              </p>
              <p className="mt-1 font-black text-slate-800">
                {goals.topProfessional?.name || "Sem dados"}
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-600">
                {formatCurrency(goals.topProfessional?.value || 0)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Ticket médio
              </p>
              <p className="mt-1 text-xl font-black text-[#239d9a]">
                {formatCurrency(goals.averageTicket || averageTicket)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
              <BarChart3 size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Pipeline Executivo
              </h2>
              <p className="text-sm text-slate-500">
                Confirmado, provável, potencial e oportunidades abertas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-emerald-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                Pipeline comercial
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-700">
                {formatCurrency(forecast.commercialPipeline)}
              </p>
            </div>

            <div className="rounded-3xl bg-cyan-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-700">
                Orçamentos abertos
              </p>
              <p className="mt-2 text-2xl font-black text-cyan-700">
                {formatCurrency(openBudgetRevenue)}
              </p>
            </div>

            <div className="rounded-3xl bg-blue-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-blue-700">
                Ticket médio aprovado
              </p>
              <p className="mt-2 text-2xl font-black text-blue-700">
                {formatCurrency(averageTicket)}
              </p>
            </div>

            <div className="rounded-3xl bg-purple-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-purple-700">
                Campanhas previstas
              </p>
              <p className="mt-2 text-2xl font-black text-purple-700">
                {formatCurrency(forecast.campaignRevenueProjection)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
              <Brain size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Saúde CRM
              </h2>
              <p className="text-sm text-slate-500">
                Temperatura comercial dos pacientes.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
              <div>
                <p className="font-black text-emerald-700">
                  Pacientes quentes
                </p>
                <p className="text-xs text-emerald-600">
                  Alta chance de fechamento
                </p>
              </div>
              <span className="text-2xl font-black text-emerald-700">
                {hotPatients.length}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-rose-50 p-4">
              <div>
                <p className="font-black text-rose-700">
                  Pacientes frios
                </p>
                <p className="text-xs text-rose-600">
                  Baixa chance comercial
                </p>
              </div>
              <span className="text-2xl font-black text-rose-700">
                {coldPatients.length}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-4">
              <div>
                <p className="font-black text-amber-700">
                  Risco de abandono
                </p>
                <p className="text-xs text-amber-600">
                  Priorizar recuperação
                </p>
              </div>
              <span className="text-2xl font-black text-amber-700">
                {riskPatients.length}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-yellow-50 p-4">
              <div>
                <p className="font-black text-yellow-700">
                  Pacientes VIP
                </p>
                <p className="text-xs text-yellow-600">
                  Ouro e Diamante
                </p>
              </div>
              <span className="text-2xl font-black text-yellow-700">
                {vipPatients.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <Users size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Top Pacientes por Score
              </h2>
              <p className="text-sm text-slate-500">
                Maiores oportunidades comerciais.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {scoredPatients.slice(0, 8).map((item) => (
              <Link
                key={item.patient.id}
                href={`/pacientes/${item.patient.id}`}
                className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 transition hover:bg-cyan-50 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-black text-slate-800">
                    {item.patient.name || "Paciente"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Origem: {item.source} • VIP: {item.vipLevel}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${getScoreClass(
                      item.score
                    )}`}
                  >
                    {item.score}/100
                  </span>

                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-700">
                    {item.closingChance}%
                  </span>
                </div>
              </Link>
            ))}

            {scoredPatients.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Ainda não há pacientes suficientes para análise.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Megaphone size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Marketing e Origem
              </h2>
              <p className="text-sm text-slate-500">
                Canais com maior impacto comercial.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {sourceStats.slice(0, 8).map((item) => (
              <div
                key={item.source}
                className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-4 md:items-center"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Origem
                  </p>
                  <p className="font-black text-slate-800">
                    {item.source}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Pacientes
                  </p>
                  <p className="font-black text-slate-800">
                    {item.patients}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Receita
                  </p>
                  <p className="font-black text-emerald-600">
                    {formatCurrency(item.confirmedRevenue)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Quentes
                  </p>
                  <p className="font-black text-cyan-600">
                    {item.hotPatients} • {item.conversion}%
                  </p>
                </div>
              </div>
            ))}

            {sourceStats.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Ainda não há origens cadastradas.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-800">
            Ranking de procedimentos
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Procedimentos com maior performance financeira.
          </p>

          <div className="mt-5 space-y-3">
            {goals.procedureRanking.slice(0, 6).map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
              >
                <div>
                  <p className="font-black text-slate-800">
                    {index + 1}. {item.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.count} lançamento(s)
                  </p>
                </div>

                <p className="font-black text-emerald-600">
                  {formatCurrency(item.value)}
                </p>
              </div>
            ))}

            {goals.procedureRanking.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Ainda não há ranking de procedimentos.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-800">
            Ranking por profissional
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Produção agrupada por profissional quando disponível.
          </p>

          <div className="mt-5 space-y-3">
            {goals.professionalRanking.slice(0, 6).map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
              >
                <div>
                  <p className="font-black text-slate-800">
                    {index + 1}. {item.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.count} lançamento(s)
                  </p>
                </div>

                <p className="font-black text-emerald-600">
                  {formatCurrency(item.value)}
                </p>
              </div>
            ))}

            {goals.professionalRanking.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Ainda não há ranking por profissional.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Link
          href="/crm"
          className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 inline-flex rounded-2xl bg-cyan-50 p-3 text-cyan-600">
            <Activity size={22} />
          </div>
          <h3 className="text-lg font-black text-slate-800">CRM</h3>
          <p className="mt-1 text-sm text-slate-500">
            Acessar relacionamento, aniversários, orçamentos e tratamentos parados.
          </p>
        </Link>

        <Link
          href="/crm/campanhas"
          className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600">
            <Megaphone size={22} />
          </div>
          <h3 className="text-lg font-black text-slate-800">Campanhas</h3>
          <p className="mt-1 text-sm text-slate-500">
            Acessar campanhas segmentadas por score e chance de fechamento.
          </p>
        </Link>

        <Link
          href="/financeiro"
          className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <DollarSign size={22} />
          </div>
          <h3 className="text-lg font-black text-slate-800">Financeiro</h3>
          <p className="mt-1 text-sm text-slate-500">
            Abrir o financeiro operacional do consultório.
          </p>
        </Link>
      </div>
    </div>
  );
}
