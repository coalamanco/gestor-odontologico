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
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { Button } from "@/components/ui/button";
import {
  calculatePatientCrmScore,
  normalizePatientSource,
} from "@/lib/crmScore";
import { calculateRevenueForecast } from "@/lib/revenueForecast";
import {
  calculateClinicGoals,
  getClinicGoalsFromLocalStorage,
} from "@/lib/clinicGoals";
import { calculateExecutiveAlerts } from "@/lib/executiveAlerts";
import { calculateSmartGoals } from "@/lib/smartGoals";
import ExecutiveCharts from "@/components/dashboard/ExecutiveCharts";
import ExecutiveKPIs from "@/components/dashboard/ExecutiveKPIs";
import ExecutiveAlerts from "@/components/dashboard/ExecutiveAlerts";
import ExecutiveForecast from "@/components/dashboard/ExecutiveForecast";
import ExecutiveConversionCenter from "@/components/dashboard/ExecutiveConversionCenter";
import ExecutiveMarketingCenter from "@/components/dashboard/ExecutiveMarketingCenter";
import {
  getFinancialRecordOverdueBalance,
  isFinancialRecordOverdue as isFinancialOverdueByEngine,
} from "@/lib/financialEngine";

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
  due_date?: string | null;
  installment_number?: number | null;
  installments?: number | null;
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

type ProcedurePricing = {
  id: string;
  procedure_id?: string | null;
  id_do_procedimento?: string | null;
  procedure_name?: string | null;
  nome_do_procedimento?: string | null;
  material_cost?: number | string | null;
  custo_do_material?: number | string | null;
  operational_cost?: number | string | null;
  custo_operacional?: number | string | null;
  clinical_time_minutes?: number | string | null;
  tempo_clinico_minutos?: number | string | null;
  hourly_cost?: number | string | null;
  custo_por_hora?: number | string | null;
  card_fee_percent?: number | string | null;
  porcentagem_taxa_do_cartao?: number | string | null;
  tax_percent?: number | string | null;
  percentual_de_imposto?: number | string | null;
  desired_margin_percent?: number | string | null;
  porcentagem_de_margem?: number | string | null;
  minimum_price?: number | string | null;
  preco_minimo?: number | string | null;
  suggested_price?: number | string | null;
  preco_sugerido?: number | string | null;
  premium_price?: number | string | null;
  preco_premium?: number | string | null;
  created_at?: string | null;
  criado_em?: string | null;
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
  return String(status || "")
    .trim()
    .toLowerCase();
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

function getDateAtStart(dateString?: string | null) {
  if (!dateString) return null;

  const date = new Date(
    String(dateString).includes("T") ? dateString : `${dateString}T12:00:00`,
  );

  if (Number.isNaN(date.getTime())) return null;

  date.setHours(0, 0, 0, 0);
  return date;
}

function getFinancialDueDate(record: FinancialRecord) {
  if (record.due_date) return record.due_date;

  if (!record.created_at) return null;

  const baseDate = getDateAtStart(record.created_at);
  if (!baseDate) return record.created_at;

  const installmentNumber = Math.max(1, Number(record.installment_number || 1));
  baseDate.setMonth(baseDate.getMonth() + installmentNumber - 1);

  return baseDate.toISOString().slice(0, 10);
}

function isFinancialRecordOverdue(record: FinancialRecord) {
  return isFinancialOverdueByEngine(record);
}


function getTrendClass(trend: string) {
  if (trend === "Alta") return "bg-[#e8f7f6] text-[var(--clinic-primary-dark)]";
  if (trend === "Atenção") return "bg-[#f2fcfc] text-[var(--clinic-primary-dark)]";
  return "bg-[var(--clinic-primary-softer)] text-[var(--clinic-primary-dark)]";
}

function getGoalChanceClass(chance: string) {
  if (chance === "Alta") return "bg-[#e8f7f6] text-[var(--clinic-primary-dark)]";
  if (chance === "Média") return "bg-[#f2fcfc] text-[var(--clinic-primary-dark)]";
  return "bg-[var(--clinic-primary-softer)] text-[var(--clinic-primary-dark)]";
}

function getAlertClass(severity: string) {
  if (severity === "critico") return "border-[var(--clinic-border-strong)] bg-[#f2fcfc] text-[var(--clinic-primary-dark)]";
  if (severity === "atencao") return "border-[var(--clinic-border)] bg-[var(--clinic-primary-softer)] text-[var(--clinic-primary-dark)]";
  if (severity === "oportunidade") return "border-[var(--clinic-border-strong)] bg-[var(--clinic-primary-soft)] text-[var(--clinic-primary-dark)]";
  return "border-[var(--clinic-border-strong)] bg-[#f2fcfc] text-[var(--clinic-primary-dark)]";
}

function getAlertLabel(severity: string) {
  if (severity === "critico") return "Crítico";
  if (severity === "atencao") return "Atenção";
  if (severity === "oportunidade") return "Oportunidade";
  return "Positivo";
}

function getScoreClass(score: number) {
  if (score >= 80) return "bg-[#e8f7f6] text-[var(--clinic-primary-dark)]";
  if (score >= 50) return "bg-[var(--clinic-primary-softer)] text-[var(--clinic-primary-dark)]";
  return "bg-[#f2fcfc] text-[var(--clinic-primary-dark)]";
}

function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeProcedureName(value: unknown) {
  return normalizeText(value)
    .replace(/\|/g, " • ")
    .split("•")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      if (/^dente\s+\d+/i.test(part)) return false;
      if (/^face\s+/i.test(part)) return false;
      if (/^parcela\s+\d+\/\d+/i.test(part)) return false;
      if (/^entrada$/i.test(part)) return false;
      return true;
    })
    .join(" ")
    .replace(/\bparcela\s+\d+\/\d+\b/g, "")
    .replace(/\bdente\s+\d+\b/g, "")
    .replace(/\bface\s+[a-z0-9]+\b/g, "")
    .replace(/\bentrada\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getProfitabilityClass(margin: number | null) {
  if (margin === null) return "bg-slate-100 text-[var(--clinic-text-soft)]";
  if (margin >= 50) return "bg-[#e8f7f6] text-[var(--clinic-primary-dark)]";
  if (margin >= 35) return "bg-[#e8f7f6] text-[var(--clinic-primary-dark)]";
  if (margin >= 20) return "bg-[var(--clinic-primary-softer)] text-[var(--clinic-primary-dark)]";
  return "bg-[#f2fcfc] text-[var(--clinic-primary-dark)]";
}

function getProfitabilityLabel(margin: number | null) {
  if (margin === null) return "Sem custo";
  if (margin >= 50) return "Excelente";
  if (margin >= 35) return "Saudável";
  if (margin >= 20) return "Atenção";
  return "Crítico";
}

export default function DashboardExecutivoPage() {
  const [loading, setLoading] = useState(true);
  const [activeDashboardTab, setActiveDashboardTab] = useState<
    "geral" | "analises" | "acessos"
  >("geral");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(
    [],
  );
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [procedurePricings, setProcedurePricings] = useState<
    ProcedurePricing[]
  >([]);
  const [configuredGoals, setConfiguredGoals] = useState(() =>
    getClinicGoalsFromLocalStorage(),
  );

  useEffect(() => {
    loadData();

    const goals = getClinicGoalsFromLocalStorage();
    setConfiguredGoals(goals);
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
        supabase
          .from("patients")
          .select("*")
          .order("name", { ascending: true }),
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

      const { data: pricingData, error: pricingError } = await supabase
        .from("procedure_pricing")
        .select("*")
        .order("created_at", { ascending: false });

      if (!pricingError && pricingData) {
        setProcedurePricings(pricingData as ProcedurePricing[]);
      } else if (pricingError) {
        console.warn(
          "Não foi possível carregar procedure_pricing:",
          pricingError.message,
        );
        setProcedurePricings([]);
      }
    } catch (error: any) {
      alert(
        "Erro ao carregar Dashboard Executivo: " +
          (error?.message || "erro inesperado"),
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
              patient.patient_source ||
              patient.source ||
              patient.origin ||
              null,
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
            patient.patient_source || patient.source || patient.origin || null,
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
      (patient) => patient.closingChance >= 70,
    ).length;

    const riskPatients = scoredPatients.filter(
      (patient) => patient.abandonmentRisk === "Alto",
    ).length;

    const vipPatients = scoredPatients.filter(
      (patient) =>
        patient.vipLevel === "Ouro" || patient.vipLevel === "Diamante",
    ).length;

    const openBudgetPatients = scoredPatients.filter(
      (patient) => patient.openBudgets > 0,
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
      monthlyGoal: configuredGoals.monthlyGoal,
      annualGoal: configuredGoals.annualGoal,
      crmGoal: configuredGoals.crmGoal,
      commercialGoal: configuredGoals.commercialGoal,
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
    configuredGoals,
  ]);

  const smartGoals = useMemo(() => {
    return calculateSmartGoals({
      currentMonthlyGoal: goals.monthlyGoal,
      currentAnnualGoal: goals.annualGoal,
      currentCrmGoal: configuredGoals.crmGoal,
      currentCommercialGoal: configuredGoals.commercialGoal,
      currentConversionGoal: configuredGoals.conversionGoal,
      financialRecords,
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
    goals.monthlyGoal,
    goals.annualGoal,
    configuredGoals,
    financialRecords,
    budgets,
    campaignProjections,
    scoredPatients,
  ]);

  const sourceStats = useMemo<SourceStats[]>(() => {
    const map = new Map<string, SourceStats>();

    patients.forEach((patient) => {
      const source = normalizePatientSource(
        patient.patient_source || patient.source || patient.origin || null,
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
        patient?.patient_source || patient?.source || patient?.origin || null,
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
    isApprovedStatus(budget.status),
  );

  const openBudgets = budgets.filter((budget) => {
    const status = normalizeStatus(budget.status);
    return !isApprovedStatus(status) && !isRejectedStatus(status);
  });

  const averageScore =
    scoredPatients.length > 0
      ? Math.round(
          scoredPatients.reduce((sum, item) => sum + item.score, 0) /
            scoredPatients.length,
        )
      : 0;

  const hotPatients = scoredPatients.filter(
    (patient) => patient.closingChance >= 70,
  );

  const coldPatients = scoredPatients.filter(
    (patient) => patient.closingChance < 45,
  );

  const riskPatients = scoredPatients.filter(
    (patient) => patient.abandonmentRisk === "Alto",
  );

  const vipPatients = scoredPatients.filter(
    (patient) => patient.vipLevel === "Ouro" || patient.vipLevel === "Diamante",
  );

  const openBudgetRevenue = openBudgets.reduce(
    (sum, budget) => sum + parseMoney(budget.total),
    0,
  );

  const averageTicket =
    approvedBudgets.length > 0
      ? Math.round(
          approvedBudgets.reduce(
            (sum, budget) => sum + parseMoney(budget.total),
            0,
          ) / approvedBudgets.length,
        )
      : 0;

  const todayKey = new Date().toISOString().slice(0, 10);

  const todayAppointments = appointments.filter(
    (appointment) => appointment.date === todayKey,
  );

  const todayOccupancy = Math.min(
    100,
    Math.round(
      (todayAppointments.reduce((sum, appointment: any) => {
        return (
          sum + Math.max(1, Math.round(Number(appointment.duration || 30) / 15))
        );
      }, 0) /
        44) *
        100,
    ),
  );

  const noShowsMonth = appointments.filter((appointment) => {
    const date = appointment.date;
    if (!date) return false;

    const appointmentDate = new Date(`${date}T12:00:00`);
    const now = new Date();

    return (
      appointmentDate.getFullYear() === now.getFullYear() &&
      appointmentDate.getMonth() === now.getMonth() &&
      normalizeStatus(appointment.status) === "faltou"
    );
  }).length;

  const overdueRevenue = financialRecords.reduce((sum, record) => {
    if (!isFinancialRecordOverdue(record)) return sum;

    // Inadimplência executiva deve considerar somente saldo vencido real.
    // Saldo futuro de orçamento parcelado em dia não entra como atraso.
    return sum + getFinancialRecordOverdueBalance(record);
  }, 0);

  const sourceWithoutOriginCount = patients.filter((patient) => {
    const source = normalizePatientSource(
      patient.patient_source || patient.source || patient.origin || null,
    );

    return source === "Não informado";
  }).length;

  const executiveAlerts = useMemo(() => {
    return calculateExecutiveAlerts({
      monthlyGoal: goals.monthlyGoal,
      confirmedRevenue: forecast.confirmedRevenue,
      probableRevenue: forecast.probableRevenue,
      potentialRevenue: forecast.potentialRevenue,
      monthlyProgress: goals.monthlyProgress,
      chanceToHitGoal: goals.chanceToHitGoal,
      monthlyTrend: goals.monthlyTrend,
      hotPatients: hotPatients.length,
      coldPatients: coldPatients.length,
      riskPatients: riskPatients.length,
      vipPatients: vipPatients.length,
      openBudgetsCount: openBudgets.length,
      openBudgetsRevenue: openBudgetRevenue,
      averageScore,
      conversionProjection: forecast.conversionProjection,
      campaignRevenueProjection: forecast.campaignRevenueProjection,
      sourceWithoutOriginCount,
      todayAppointments: todayAppointments.length,
      todayOccupancy,
      noShowsMonth,
      overdueRevenue,
    });
  }, [
    goals,
    forecast,
    hotPatients.length,
    coldPatients.length,
    riskPatients.length,
    vipPatients.length,
    openBudgets.length,
    openBudgetRevenue,
    averageScore,
    sourceWithoutOriginCount,
    todayAppointments.length,
    todayOccupancy,
    noShowsMonth,
    overdueRevenue,
  ]);

  const revenueData = smartGoals.monthlySeries.map((item) => ({
    month: item.label,
    revenue: item.revenue,
    target: goals.monthlyGoal,
  }));

  const conversionData = [
    {
      label: "Conversão",
      value: goals.commercialConversion,
    },
    {
      label: "Meta CRM",
      value: configuredGoals.conversionGoal,
    },
    {
      label: "Fechamento",
      value: forecast.conversionProjection || 0,
    },
  ];

  const scheduleData = [
    {
      day: "Seg",
      occupied: Math.max(0, Math.min(100, todayOccupancy - 12)),
      available: 100 - Math.max(0, Math.min(100, todayOccupancy - 12)),
    },
    {
      day: "Ter",
      occupied: Math.max(0, Math.min(100, todayOccupancy - 8)),
      available: 100 - Math.max(0, Math.min(100, todayOccupancy - 8)),
    },
    {
      day: "Qua",
      occupied: Math.max(0, Math.min(100, todayOccupancy - 4)),
      available: 100 - Math.max(0, Math.min(100, todayOccupancy - 4)),
    },
    {
      day: "Qui",
      occupied: todayOccupancy,
      available: 100 - todayOccupancy,
    },
    {
      day: "Sex",
      occupied: Math.max(0, Math.min(100, todayOccupancy + 6)),
      available: 100 - Math.max(0, Math.min(100, todayOccupancy + 6)),
    },
  ];

  const sourceData =
    sourceStats.length > 0
      ? sourceStats.slice(0, 5).map((item) => ({
          source: item.source,
          patients: item.patients,
        }))
      : [
          {
            source: "Não informado",
            patients: patients.length,
          },
        ];

  const latestPricingByProcedureName = useMemo(() => {
    const map = new Map<string, ProcedurePricing>();

    procedurePricings.forEach((pricing) => {
      const name = pricing.procedure_name || pricing.nome_do_procedimento || "";
      const key = normalizeProcedureName(name);

      if (!key || map.has(key)) return;
      map.set(key, pricing);
    });

    return map;
  }, [procedurePricings]);

  const pricingEntries = useMemo(() => {
    return Array.from(latestPricingByProcedureName.entries()).sort(
      (a, b) => b[0].length - a[0].length,
    );
  }, [latestPricingByProcedureName]);

  const procedureProfitabilityRanking = useMemo(() => {
    return goals.procedureRanking.map((item: any) => {
      const itemKey = normalizeProcedureName(item.name);
      const directPricing = latestPricingByProcedureName.get(itemKey);
      const fuzzyPricing = pricingEntries.find(([pricingKey]) => {
        if (!pricingKey || !itemKey) return false;
        return itemKey.includes(pricingKey) || pricingKey.includes(itemKey);
      })?.[1];
      const pricing = directPricing || fuzzyPricing || null;

      const materialCost = parseMoney(
        pricing?.material_cost ?? pricing?.custo_do_material,
      );
      const operationalCost = parseMoney(
        pricing?.operational_cost ?? pricing?.custo_operacional,
      );
      const clinicalMinutes = parseMoney(
        pricing?.clinical_time_minutes ?? pricing?.tempo_clinico_minutos,
      );
      const hourlyCost = parseMoney(
        pricing?.hourly_cost ?? pricing?.custo_por_hora,
      );
      const cardFeePercent = parseMoney(
        pricing?.card_fee_percent ?? pricing?.porcentagem_taxa_do_cartao,
      );
      const taxPercent = parseMoney(
        pricing?.tax_percent ?? pricing?.percentual_de_imposto,
      );

      const unitCost =
        materialCost + operationalCost + (clinicalMinutes / 60) * hourlyCost;
      const revenue = parseMoney(item.value);
      const count = Math.max(1, Number(item.count || 1));
      const estimatedCost = unitCost * count;
      const estimatedFees = revenue * ((cardFeePercent + taxPercent) / 100);
      const estimatedProfit = revenue - estimatedCost - estimatedFees;
      const margin =
        revenue > 0 ? Math.round((estimatedProfit / revenue) * 100) : null;

      return {
        ...item,
        pricing,
        revenue,
        unitCost,
        estimatedCost,
        estimatedFees,
        estimatedProfit,
        margin,
        hasPricing: Boolean(pricing),
      };
    });
  }, [goals.procedureRanking, latestPricingByProcedureName, pricingEntries]);

  const profitabilitySummary = useMemo(() => {
    const withPricing = procedureProfitabilityRanking.filter(
      (item) => item.hasPricing,
    );
    const revenue = withPricing.reduce((sum, item) => sum + item.revenue, 0);
    const cost = withPricing.reduce(
      (sum, item) => sum + item.estimatedCost + item.estimatedFees,
      0,
    );
    const profit = revenue - cost;
    const averageMargin =
      revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    return {
      mapped: withPricing.length,
      total: procedureProfitabilityRanking.length,
      revenue,
      cost,
      profit,
      averageMargin,
    };
  }, [procedureProfitabilityRanking]);

  const executiveCards = [
    {
      title: "Confirmado",
      value: formatCurrency(forecast.confirmedRevenue),
      subtitle: "Receita já registrada",
      icon: DollarSign,
      color: "from-[#239d9a] to-[#68d4d0]",
    },
    {
      title: "Provável",
      value: formatCurrency(forecast.probableRevenue),
      subtitle: "Previsão com CRM",
      icon: TrendingUp,
      color: "from-[#239d9a] to-[#68d4d0]",
    },
    {
      title: "Potencial",
      value: formatCurrency(forecast.potentialRevenue),
      subtitle: "Pipeline máximo",
      icon: Target,
      color: "from-[#239d9a] to-[#68d4d0]",
    },
    {
      title: "Meta atingida",
      value: `${goals.monthlyProgress}%`,
      subtitle: `Meta: ${formatCurrency(goals.monthlyGoal)}`,
      icon: Trophy,
      color: "from-[#239d9a] to-[#68d4d0]",
    },
  ];

  return (
    <div className="premium-page premium-page-padding">
      <div className="premium-container space-y-4">
        <PremiumPageHeader
          title="Dashboard Executivo"
          eyebrow="Inteligência da clínica"
          subtitle="Metas, forecast, análise comercial, marketing, conversão e oportunidades da clínica."
          icon={Brain}
          actions={
            <>
              <Button asChild variant="headerLight" size="header">
                <Link href="/configuracoes/metas">
                  <Target size={17} />
                  Metas
                </Link>
              </Button>

              <Button asChild variant="header" size="header">
                <Link href="/crm/campanhas">
                  <Megaphone size={17} />
                  Campanhas
                </Link>
              </Button>

              <Button type="button" variant="headerLight" size="header" onClick={loadData}>
                <RefreshCw size={17} />
                Atualizar
              </Button>
            </>
          }
        />

      <div className="sticky top-3 z-20 mb-4 flex flex-wrap gap-2 rounded-[24px] border border-[var(--clinic-border)] bg-white/95 p-1.5 shadow-[var(--premium-shadow-soft)] backdrop-blur">
        <button
          type="button"
          onClick={() => setActiveDashboardTab("geral")}
          className={`rounded-[18px] px-3.5 py-2.5 text-[12px] font-semibold transition ${
            activeDashboardTab === "geral"
              ? "bg-[var(--clinic-primary)] text-white shadow-sm"
              : "text-[var(--clinic-muted)] hover:bg-[var(--clinic-primary-soft)] hover:text-[var(--clinic-primary)]"
          }`}
        >
          Visão Geral
        </button>

        <button
          type="button"
          onClick={() => setActiveDashboardTab("analises")}
          className={`rounded-[18px] px-3.5 py-2.5 text-[12px] font-semibold transition ${
            activeDashboardTab === "analises"
              ? "bg-[var(--clinic-primary)] text-white shadow-sm"
              : "text-[var(--clinic-muted)] hover:bg-[var(--clinic-primary-soft)] hover:text-[var(--clinic-primary)]"
          }`}
        >
          Análises Executivas
        </button>

        <button
          type="button"
          onClick={() => setActiveDashboardTab("acessos")}
          className={`rounded-[18px] px-3.5 py-2.5 text-[12px] font-semibold transition ${
            activeDashboardTab === "acessos"
              ? "bg-[var(--clinic-primary)] text-white shadow-sm"
              : "text-[var(--clinic-muted)] hover:bg-[var(--clinic-primary-soft)] hover:text-[var(--clinic-primary)]"
          }`}
        >
          Acessos Rápidos
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-muted-light)]">
          {activeDashboardTab === "geral"
            ? "Resumo executivo"
            : activeDashboardTab === "analises"
              ? "Análises, rankings e inteligência"
              : "Atalhos principais"}
        </p>

        <p className="hidden text-[11px] font-medium text-[var(--clinic-muted-light)] md:block">
          Dados atualizados ao clicar em Atualizar
        </p>
      </div>

      {loading && (
        <div className="mb-4 rounded-[18px] border border-cyan-100 bg-[var(--clinic-primary-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--clinic-primary-dark)]">
          Atualizando informações executivas...
        </div>
      )}

      {activeDashboardTab === "geral" && (
        <>
          <div className="mb-4">
            <ExecutiveKPIs loading={loading} cards={executiveCards} />
          </div>

          <div className="mb-4 premium-dashboard-panel p-4 ring-1 ring-white/70">
            <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-muted-light)]">
                  Leitura executiva do mês
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getTrendClass(
                      goals.monthlyTrend,
                    )}`}
                  >
                    Tendência {goals.monthlyTrend}
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getGoalChanceClass(
                      goals.chanceToHitGoal,
                    )}`}
                  >
                    Meta {goals.chanceToHitGoal}
                  </span>

                  <span className="rounded-full bg-[var(--clinic-surface-soft)] px-3 py-1 text-[11px] font-medium text-[var(--clinic-muted)]">
                    Gap: <strong className="text-[var(--clinic-text)]">{formatCurrency(goals.gapToGoal)}</strong>
                  </span>
                </div>
              </div>

              <p className="max-w-3xl text-[12.5px] leading-6 text-[var(--clinic-text-soft)]">
                {goals.executiveSummary}
              </p>
            </div>
          </div>

          <ExecutiveForecast
            suggestedMonthlyGoal={smartGoals.suggestedMonthlyGoal}
            suggestedAnnualGoal={smartGoals.suggestedAnnualGoal}
            trend={smartGoals.trend}
            growthRate={smartGoals.growthRate}
            confidence={smartGoals.confidence}
            riskLevel={smartGoals.riskLevel}
            executiveRecommendation={smartGoals.executiveRecommendation}
            riskMessage={smartGoals.riskMessage}
            opportunityMessage={smartGoals.opportunityMessage}
            lastThreeMonthsAverage={smartGoals.lastThreeMonthsAverage}
            monthlySeries={smartGoals.monthlySeries}
            monthlyGoal={goals.monthlyGoal}
          />

          <ExecutiveAlerts
            mainMessage={executiveAlerts.mainMessage}
            criticalCount={executiveAlerts.criticalCount}
            opportunityCount={executiveAlerts.opportunityCount}
            positiveCount={executiveAlerts.positiveCount}
            alerts={executiveAlerts.alerts}
          />
        </>
      )}

      {activeDashboardTab === "analises" && (
        <>
          <div className="mb-8">
            <ExecutiveCharts
              revenueData={revenueData}
              conversionData={conversionData}
              scheduleData={scheduleData}
              sourceData={sourceData}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="premium-dashboard-panel p-4 xl:col-span-2">
              <div className="mb-4 flex items-center gap-3">
                <div className="premium-dashboard-icon p-3">
                  <BarChart3 size={22} />
                </div>

                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--clinic-text)]">
                    Metas e Performance
                  </h2>
                  <p className="text-[12px] text-[var(--clinic-muted)]">
                    Meta, projeção e execução.
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-[13px] font-semibold text-[var(--clinic-text-soft)]">
                  <span>Meta mensal</span>
                  <span>{goals.monthlyProgress}%</span>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[var(--clinic-primary)]"
                    style={{
                      width: `${Math.min(100, goals.monthlyProgress)}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium text-[var(--clinic-muted)]">
                  <span>
                    Confirmado: {formatCurrency(goals.confirmedRevenue)}
                  </span>
                  <span>Provável: {formatCurrency(goals.probableRevenue)}</span>
                  <span>
                    Potencial: {formatCurrency(goals.potentialRevenue)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-primary-dark)]">
                    Progresso provável
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--clinic-primary-dark)]">
                    {goals.probableProgress}%
                  </p>
                </div>

                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-primary-dark)]">
                    Conversão comercial
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--clinic-primary-dark)]">
                    {goals.commercialConversion}%
                  </p>
                </div>

                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-primary-dark)]">
                    Recuperação prevista
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--clinic-primary-dark)]">
                    {goals.recoveredPatientsProjection}
                  </p>
                </div>
              </div>
            </div>

            <div className="premium-dashboard-panel p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="premium-dashboard-icon p-3">
                  <Trophy size={22} />
                </div>

                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--clinic-text)]">
                    Destaques
                  </h2>
                  <p className="text-[12px] text-[var(--clinic-muted)]">
                    Destaques do período.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-muted-light)]">
                    Procedimento destaque
                  </p>
                  <p className="mt-1 font-semibold text-[var(--clinic-text)]">
                    {goals.topProcedure?.name || "Sem dados"}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-[var(--clinic-primary)]">
                    {formatCurrency(goals.topProcedure?.value || 0)}
                  </p>
                </div>

                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-muted-light)]">
                    Profissional destaque
                  </p>
                  <p className="mt-1 font-semibold text-[var(--clinic-text)]">
                    {goals.topProfessional?.name || "Sem dados"}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-[var(--clinic-primary)]">
                    {formatCurrency(goals.topProfessional?.value || 0)}
                  </p>
                </div>

                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-muted-light)]">
                    Ticket médio
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--clinic-primary)]">
                    {formatCurrency(goals.averageTicket || averageTicket)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[520px_minmax(0,1fr)]">
            <div className="premium-dashboard-panel p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="premium-dashboard-icon p-3">
                  <BarChart3 size={22} />
                </div>

                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--clinic-text)]">
                    Pipeline Executivo
                  </h2>
                  <p className="text-[12px] text-[var(--clinic-muted)]">
                    Pipeline e oportunidades abertas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-primary-dark)]">
                    Pipeline comercial
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--clinic-primary-dark)]">
                    {formatCurrency(forecast.commercialPipeline)}
                  </p>
                </div>

                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-primary-dark)]">
                    Orçamentos abertos
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--clinic-primary-dark)]">
                    {formatCurrency(openBudgetRevenue)}
                  </p>
                </div>

                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-primary-dark)]">
                    Ticket médio aprovado
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--clinic-primary-dark)]">
                    {formatCurrency(averageTicket)}
                  </p>
                </div>

                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-primary-dark)]">
                    Campanhas previstas
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--clinic-primary-dark)]">
                    {formatCurrency(forecast.campaignRevenueProjection)}
                  </p>
                </div>
              </div>
            </div>

            <ExecutiveConversionCenter
              hotPatients={hotPatients.length}
              coldPatients={coldPatients.length}
              riskPatients={riskPatients.length}
              vipPatients={vipPatients.length}
              averageScore={averageScore}
              openBudgetsCount={openBudgets.length}
              openBudgetRevenue={openBudgetRevenue}
              averageTicket={averageTicket}
              conversionProjection={forecast.conversionProjection}
              campaignRevenueProjection={forecast.campaignRevenueProjection}
              sourceStats={sourceStats}
              sourceWithoutOriginCount={sourceWithoutOriginCount}
              totalPatients={patients.length}
              formatCurrency={formatCurrency}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="premium-dashboard-panel p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="premium-dashboard-icon p-3">
                  <Users size={22} />
                </div>

                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--clinic-text)]">
                    Top Pacientes por Score
                  </h2>
                  <p className="text-[12px] text-[var(--clinic-muted)]">
                    Prioridade comercial.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {scoredPatients.slice(0, 8).map((item) => (
                  <Link
                    key={item.patient.id}
                    href={`/pacientes/${item.patient.id}`}
                    className="grid grid-cols-1 gap-3 premium-dashboard-metric p-3.5 transition hover:bg-[var(--clinic-primary-soft)] md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="font-semibold text-[var(--clinic-text)]">
                        {item.patient.name || "Paciente"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--clinic-muted)]">
                        Origem: {item.source} • VIP: {item.vipLevel}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getScoreClass(
                          item.score,
                        )}`}
                      >
                        {item.score}/100
                      </span>

                      <span className="rounded-full bg-[#e8f7f6] px-3 py-1 text-[11px] font-semibold text-[var(--clinic-primary-dark)]">
                        {item.closingChance}%
                      </span>
                    </div>
                  </Link>
                ))}

                {scoredPatients.length === 0 && (
                  <div className="rounded-[18px] border border-dashed border-slate-200 p-8 text-center text-[12px] text-[var(--clinic-muted)]">
                    Ainda não há pacientes suficientes para análise.
                  </div>
                )}
              </div>
            </div>

            <ExecutiveMarketingCenter
              sourceStats={sourceStats}
              totalPatients={patients.length}
              sourceWithoutOriginCount={sourceWithoutOriginCount}
              formatCurrency={formatCurrency}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="premium-dashboard-panel p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--clinic-text)]">
                    Rentabilidade dos procedimentos
                  </h2>
                  <p className="mt-1 text-[12px] text-[var(--clinic-muted)]">
                    Margem estimada por procedimento.
                  </p>
                </div>

                <Link
                  href="/configuracoes/precificacao"
                  className="inline-flex items-center justify-center rounded-[18px] border border-cyan-100 bg-[var(--clinic-primary-soft)] px-4 py-3 text-[11px] font-semibold text-[var(--clinic-primary)] hover:bg-[var(--clinic-primary-soft)]"
                >
                  Abrir precificação
                </Link>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-muted-light)]">
                    Procedimentos mapeados
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-[var(--clinic-text)]">
                    {profitabilitySummary.mapped}/{profitabilitySummary.total}
                  </p>
                </div>

                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-primary-dark)]">
                    Lucro estimado
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--clinic-primary-dark)]">
                    {formatCurrency(profitabilitySummary.profit)}
                  </p>
                </div>

                <div className="premium-dashboard-metric p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--clinic-primary-dark)]">
                    Margem média
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--clinic-primary-dark)]">
                    {profitabilitySummary.averageMargin}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {procedureProfitabilityRanking
                  .slice(0, 6)
                  .map((item, index) => (
                    <div
                      key={item.name}
                      className="premium-dashboard-metric p-3.5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold text-[var(--clinic-text)]">
                            {index + 1}. {item.name}
                          </p>
                          <p className="mt-1 text-xs text-[var(--clinic-muted)]">
                            {item.count} lançamento(s) • Receita:{" "}
                            {formatCurrency(item.revenue)}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getProfitabilityClass(
                            item.margin,
                          )}`}
                        >
                          {getProfitabilityLabel(item.margin)}
                          {item.margin !== null ? ` • ${item.margin}%` : ""}
                        </span>
                      </div>

                      {item.hasPricing ? (
                        <div className="mt-4 grid grid-cols-1 gap-3 text-[11px] font-medium text-[var(--clinic-muted)] md:grid-cols-3">
                          <div className="rounded-[18px] bg-white p-3 ring-1 ring-[var(--clinic-border)]">
                            <p className="text-[var(--clinic-muted-light)]">Custo estimado</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--clinic-text)]">
                              {formatCurrency(
                                item.estimatedCost + item.estimatedFees,
                              )}
                            </p>
                          </div>

                          <div className="rounded-[18px] bg-white p-3 ring-1 ring-[var(--clinic-border)]">
                            <p className="text-[var(--clinic-muted-light)]">Lucro estimado</p>
                            <p className="mt-1 text-[13px] font-semibold text-[var(--clinic-primary-dark)]">
                              {formatCurrency(item.estimatedProfit)}
                            </p>
                          </div>

                          <div className="rounded-[18px] bg-white p-3 ring-1 ring-[var(--clinic-border)]">
                            <p className="text-[var(--clinic-muted-light)]">
                              Custo unitário base
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--clinic-text)]">
                              {formatCurrency(item.unitCost)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[18px] border border-dashed border-[var(--clinic-border)] bg-[var(--clinic-primary-soft)] p-3 text-[11px] font-medium text-[var(--clinic-primary-dark)]">
                          Este procedimento ainda não possui precificação
                          cadastrada. Cadastre o custo para calcular margem
                          real.
                        </div>
                      )}
                    </div>
                  ))}

                {procedureProfitabilityRanking.length === 0 && (
                  <div className="rounded-[18px] border border-dashed border-slate-200 p-8 text-center text-[12px] text-[var(--clinic-muted)]">
                    Ainda não há dados suficientes para calcular rentabilidade.
                  </div>
                )}
              </div>
            </div>

            <div className="premium-dashboard-panel p-4">
              <h2 className="text-[15px] font-semibold text-[var(--clinic-text)]">
                Ranking por profissional
              </h2>
              <p className="mt-1 text-[12px] text-[var(--clinic-muted)]">
                Produção agrupada por profissional quando disponível.
              </p>

              <div className="mt-5 space-y-3">
                {goals.professionalRanking.slice(0, 6).map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 premium-dashboard-metric p-3.5"
                  >
                    <div>
                      <p className="font-semibold text-[var(--clinic-text)]">
                        {index + 1}. {item.name}
                      </p>
                      <p className="text-xs text-[var(--clinic-muted)]">
                        {item.count} lançamento(s)
                      </p>
                    </div>

                    <p className="font-semibold text-[var(--clinic-primary)]">
                      {formatCurrency(item.value)}
                    </p>
                  </div>
                ))}

                {goals.professionalRanking.length === 0 && (
                  <div className="rounded-[18px] border border-dashed border-slate-200 p-8 text-center text-[12px] text-[var(--clinic-muted)]">
                    Ainda não há ranking por profissional.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeDashboardTab === "acessos" && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Link
              href="/crm"
              className="premium-dashboard-panel p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex premium-dashboard-icon p-3">
                <Activity size={22} />
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--clinic-text)]">CRM</h3>
              <p className="mt-1 text-[12px] text-[var(--clinic-muted)]">
                Acessar relacionamento, aniversários, orçamentos e tratamentos
                parados.
              </p>
            </Link>

            <Link
              href="/crm/campanhas"
              className="premium-dashboard-panel p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex premium-dashboard-icon p-3">
                <Megaphone size={22} />
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--clinic-text)]">Campanhas</h3>
              <p className="mt-1 text-[12px] text-[var(--clinic-muted)]">
                Acessar campanhas segmentadas por score e chance de fechamento.
              </p>
            </Link>

            <Link
              href="/financeiro"
              className="premium-dashboard-panel p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex premium-dashboard-icon p-3">
                <DollarSign size={22} />
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--clinic-text)]">Financeiro</h3>
              <p className="mt-1 text-[12px] text-[var(--clinic-muted)]">
                Abrir o financeiro operacional do consultório.
              </p>
            </Link>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
