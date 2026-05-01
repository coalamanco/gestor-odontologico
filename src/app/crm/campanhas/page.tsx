"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Brain,
  CalendarClock,
  CheckCircle2,
  Crown,
  DollarSign,
  FileText,
  HeartHandshake,
  Megaphone,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  calculatePatientCrmScore,
  normalizePatientSource,
} from "@/lib/crmScore";

type Patient = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
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
};

type ClinicalNote = {
  id: string;
  patient_id?: string | null;
  title?: string | null;
  content?: string | null;
  note?: string | null;
  created_at?: string | null;
};

type CampaignKey =
  | "implantes"
  | "limpeza"
  | "ortodontia"
  | "orcamentos"
  | "vip"
  | "retorno"
  | "quentes"
  | "risco";

type ScoredPatient = {
  patient: Patient;
  score: number;
  closingChance: number;
  abandonmentRisk: "Baixo" | "Médio" | "Alto";
  financialPotential: "Baixo" | "Médio" | "Alto";
  vipLevel: "Bronze" | "Prata" | "Ouro" | "Diamante";
  bestApproach: string;
  totalPaid: number;
  openBudgets: number;
  daysWithoutReturn: number | null;
  source: string;
};

type CampaignCard = {
  key: CampaignKey;
  title: string;
  description: string;
  icon: any;
  gradient: string;
  audience: ScoredPatient[];
  estimatedConversion: number;
  estimatedRevenue: number;
  message: string;
  strategy: string;
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
    normalized === "cancelled" ||
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

function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function getDate(value?: string | null) {
  if (!value) return null;

  const raw = String(value).trim();

  if (!raw) return null;

  const clean = raw.split("T")[0];
  const date = new Date(`${clean}T12:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function daysBetween(from: Date, to = new Date()) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);

  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function patientFirstName(patient?: Patient | null) {
  return String(patient?.name || "Paciente").trim().split(" ")[0] || "Paciente";
}

function buildWhatsappHref(patient: Patient, message: string) {
  const digits = normalizePhone(patient.phone);

  if (!digits) return "#";

  const phone = digits.startsWith("55") ? digits : `55${digits}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function treatmentText(treatment: Treatment) {
  return String(
    treatment.procedure_name ||
      treatment.treatment_name ||
      treatment.title ||
      ""
  ).toLowerCase();
}

function getScoreBadge(score: number) {
  if (score >= 80) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (score >= 50) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

function getRiskBadge(risk: string) {
  if (risk === "Baixo") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (risk === "Médio") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

export default function CampanhasInteligentesPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(
    []
  );
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignKey>("quentes");

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
        "Erro ao carregar Central de Campanhas: " +
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

  function getLastAppointment(patientId: string) {
    const list = appointmentsByPatient.get(patientId) || [];

    const past = list
      .map((appointment) => getDate(appointment.date || appointment.created_at))
      .filter((date): date is Date => Boolean(date))
      .filter((date) => date.getTime() <= new Date().getTime())
      .sort((a, b) => b.getTime() - a.getTime());

    return past[0] || null;
  }

  function getDaysWithoutReturn(patientId: string) {
    const last = getLastAppointment(patientId);

    if (!last) return null;

    return daysBetween(last, new Date());
  }

  function getPatientPaidTotal(patientId: string) {
    const list = financialByPatient.get(patientId) || [];

    return list.reduce((sum, record) => {
      const paid = parseMoney(record.paid_amount);
      const amount = parseMoney(record.amount);

      if (paid > 0) return sum + paid;
      if (isPaidStatus(record.status)) return sum + amount;

      return sum;
    }, 0);
  }

  function getPatientOpenBudgetTotal(patientId: string) {
    const list = budgetsByPatient.get(patientId) || [];

    return list.reduce((sum, budget) => {
      const status = normalizeStatus(budget.status);

      if (isApprovedStatus(status) || isRejectedStatus(status)) return sum;

      return sum + parseMoney(budget.total);
    }, 0);
  }

  function hasOpenBudget(patientId: string) {
    return getPatientOpenBudgetTotal(patientId) > 0;
  }

  function hasApprovedBudget(patientId: string) {
    const list = budgetsByPatient.get(patientId) || [];

    return list.some((budget) => isApprovedStatus(budget.status));
  }

  function hasTreatmentTerm(patientId: string, terms: string[]) {
    const list = treatmentsByPatient.get(patientId) || [];

    return list.some((treatment) => {
      const text = treatmentText(treatment);
      return terms.some((term) => text.includes(term));
    });
  }

  const scoredPatients = useMemo<ScoredPatient[]>(() => {
    return patients
      .filter((patient) => Boolean(normalizePhone(patient.phone)))
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
          bestApproach: result.bestApproach,
          totalPaid: result.totalPaid,
          openBudgets: result.openBudgets,
          daysWithoutReturn: result.daysWithoutReturn,
          source: normalizePatientSource(
            patient.patient_source || patient.source || patient.origin || null
          ),
        };
      })
      .sort((a, b) => b.closingChance - a.closingChance);
  }, [
    patients,
    appointmentsByPatient,
    budgetsByPatient,
    financialByPatient,
    treatmentsByPatient,
    notesByPatient,
  ]);

  const campaignCards = useMemo<CampaignCard[]>(() => {
    const calcEstimatedRevenue = (
      audience: ScoredPatient[],
      averageTicket: number,
      conversion: number
    ) => {
      return Math.round(audience.length * averageTicket * (conversion / 100));
    };

    const quentesAudience = scoredPatients
      .filter((item) => item.closingChance >= 70)
      .sort((a, b) => b.closingChance - a.closingChance);

    const riscoAudience = scoredPatients
      .filter((item) => item.abandonmentRisk === "Alto")
      .sort((a, b) => b.daysWithoutReturn || 0 - (a.daysWithoutReturn || 0));

    const retornoAudience = scoredPatients
      .filter((item) => item.daysWithoutReturn === null || item.daysWithoutReturn >= 120)
      .sort((a, b) => (b.daysWithoutReturn || 0) - (a.daysWithoutReturn || 0));

    const orcamentosAudience = scoredPatients
      .filter((item) => hasOpenBudget(item.patient.id))
      .sort((a, b) => b.closingChance - a.closingChance);

    const vipAudience = scoredPatients
      .filter((item) => item.totalPaid >= 3000 || item.vipLevel !== "Bronze")
      .sort((a, b) => b.totalPaid - a.totalPaid);

    const implantesAudience = scoredPatients
      .filter((item) => {
        const paidTotal = getPatientPaidTotal(item.patient.id);
        const openBudget = getPatientOpenBudgetTotal(item.patient.id);
        const hasImplantHistory = hasTreatmentTerm(item.patient.id, [
          "implante",
          "protocolo",
          "enxerto",
        ]);

        return paidTotal >= 2500 || openBudget >= 2500 || hasImplantHistory;
      })
      .sort((a, b) => b.closingChance - a.closingChance);

    const limpezaAudience = scoredPatients
      .filter((item) => item.daysWithoutReturn === null || item.daysWithoutReturn >= 180)
      .sort((a, b) => (b.daysWithoutReturn || 0) - (a.daysWithoutReturn || 0));

    const ortodontiaAudience = scoredPatients
      .filter((item) => {
        const hasOrthoHistory = hasTreatmentTerm(item.patient.id, [
          "orto",
          "aparelho",
          "alinhador",
        ]);

        return hasOrthoHistory || !hasApprovedBudget(item.patient.id);
      })
      .sort((a, b) => b.closingChance - a.closingChance);

    return [
      {
        key: "quentes",
        title: "Pacientes Quentes",
        description:
          "Pacientes com maior score comercial e maior chance de fechamento.",
        icon: Brain,
        gradient: "from-emerald-500 to-teal-500",
        audience: quentesAudience,
        estimatedConversion: 42,
        estimatedRevenue: calcEstimatedRevenue(quentesAudience, 1800, 42),
        strategy:
          "Priorizar contato da recepção com abordagem objetiva, usando o histórico do paciente e oferecendo próxima ação clara.",
        message:
          "Olá, {nome}! Tudo bem?\n\nEstamos acompanhando seu plano odontológico e vimos uma ótima oportunidade de dar sequência ao seu cuidado.\n\nPodemos organizar um horário para conversar e alinhar o próximo passo?\n\nFicamos à disposição 🙂",
      },
      {
        key: "risco",
        title: "Recuperação de Risco",
        description:
          "Pacientes com risco alto de abandono ou muito tempo sem retorno.",
        icon: RefreshCw,
        gradient: "from-rose-500 to-red-500",
        audience: riscoAudience,
        estimatedConversion: 20,
        estimatedRevenue: calcEstimatedRevenue(riscoAudience, 650, 20),
        strategy:
          "Contato acolhedor, sem pressão comercial, focado em reaproximação e revisão preventiva.",
        message:
          "Olá, {nome}! Tudo bem?\n\nPassando para saber como você está. Faz um tempo que não nos vemos por aqui e gostaríamos de acompanhar sua saúde bucal.\n\nSe desejar, podemos organizar uma revisão com tranquilidade.\n\nFicamos à disposição 🙂",
      },
      {
        key: "retorno",
        title: "Recuperação de Pacientes",
        description:
          "Pacientes sem consulta recente ou sem retorno registrado.",
        icon: HeartHandshake,
        gradient: "from-emerald-500 to-teal-500",
        audience: retornoAudience,
        estimatedConversion: 18,
        estimatedRevenue: calcEstimatedRevenue(retornoAudience, 450, 18),
        strategy:
          "Mensagem acolhedora, convidando para revisão e retomada de acompanhamento.",
        message:
          "Olá, {nome}! Tudo bem?\n\nSentimos sua falta por aqui e gostaríamos de saber como está sua saúde bucal.\n\nPodemos organizar um horário de retorno para uma revisão preventiva.\n\nFicamos à disposição 🙂",
      },
      {
        key: "orcamentos",
        title: "Orçamentos Parados",
        description:
          "Pacientes com orçamento pendente e oportunidade comercial aberta.",
        icon: FileText,
        gradient: "from-cyan-500 to-sky-500",
        audience: orcamentosAudience,
        estimatedConversion: 28,
        estimatedRevenue: calcEstimatedRevenue(orcamentosAudience, 1800, 28),
        strategy:
          "Retomar dúvidas, reforçar benefícios e facilitar formas de pagamento.",
        message:
          "Olá, {nome}! Tudo bem?\n\nPassando para saber se ficou alguma dúvida sobre o orçamento odontológico que conversamos.\n\nPodemos te ajudar a organizar o melhor plano de tratamento e forma de pagamento.\n\nFicamos à disposição 🙂",
      },
      {
        key: "vip",
        title: "Pacientes VIP",
        description:
          "Pacientes com maior histórico financeiro e relacionamento com a clínica.",
        icon: Crown,
        gradient: "from-yellow-400 to-orange-400",
        audience: vipAudience,
        estimatedConversion: 35,
        estimatedRevenue: calcEstimatedRevenue(vipAudience, 2200, 35),
        strategy:
          "Abordagem premium e personalizada, com foco em continuidade de tratamento.",
        message:
          "Olá, {nome}! Tudo bem?\n\nEstamos entrando em contato para acompanhar sua saúde bucal e avaliar se há algo que possamos fazer por você neste momento.\n\nSerá um prazer cuidar de você novamente 🙂",
      },
      {
        key: "implantes",
        title: "Campanha de Implantes",
        description:
          "Pacientes com alto potencial financeiro, histórico ou interesse em reabilitação.",
        icon: Target,
        gradient: "from-purple-500 to-indigo-500",
        audience: implantesAudience,
        estimatedConversion: 16,
        estimatedRevenue: calcEstimatedRevenue(implantesAudience, 4500, 16),
        strategy:
          "Foco em reabilitação, planejamento, segurança e melhora da qualidade de vida.",
        message:
          "Olá, {nome}! Tudo bem?\n\nEstamos organizando uma campanha de avaliação para tratamentos reabilitadores e implantes.\n\nSe fizer sentido para você, podemos agendar uma avaliação e montar um planejamento personalizado.\n\nFicamos à disposição 🙂",
      },
      {
        key: "limpeza",
        title: "Limpeza e Revisão",
        description:
          "Pacientes sem retorno há bastante tempo, ideais para campanha preventiva.",
        icon: CalendarClock,
        gradient: "from-green-500 to-emerald-500",
        audience: limpezaAudience,
        estimatedConversion: 32,
        estimatedRevenue: calcEstimatedRevenue(limpezaAudience, 280, 32),
        strategy:
          "Campanha preventiva, simples, leve e com alta taxa de resposta.",
        message:
          "Olá, {nome}! Tudo bem?\n\nJá faz um tempinho desde sua última revisão odontológica.\n\nA prevenção ajuda a evitar problemas maiores. Podemos organizar um horário para sua limpeza e avaliação?\n\nFicamos à disposição 🙂",
      },
      {
        key: "ortodontia",
        title: "Campanha Ortodontia",
        description:
          "Pacientes com histórico ortodôntico, interesse ou oportunidade de avaliação.",
        icon: Activity,
        gradient: "from-pink-500 to-rose-500",
        audience: ortodontiaAudience,
        estimatedConversion: 14,
        estimatedRevenue: calcEstimatedRevenue(ortodontiaAudience, 2500, 14),
        strategy:
          "Abordagem educativa, destacando estética, função e planejamento.",
        message:
          "Olá, {nome}! Tudo bem?\n\nEstamos abrindo horários para avaliação ortodôntica e planejamento de alinhamento dentário.\n\nSe tiver interesse, podemos organizar uma avaliação para entender o melhor caminho para o seu caso.\n\nFicamos à disposição 🙂",
      },
    ];
  }, [
    scoredPatients,
    appointmentsByPatient,
    budgetsByPatient,
    financialByPatient,
    treatmentsByPatient,
  ]);

  const selectedCampaignData =
    campaignCards.find((item) => item.key === selectedCampaign) ||
    campaignCards[0];

  const totalEligible = campaignCards.reduce(
    (sum, campaign) => sum + campaign.audience.length,
    0
  );

  const totalEstimatedRevenue = campaignCards.reduce(
    (sum, campaign) => sum + campaign.estimatedRevenue,
    0
  );

  const bestCampaign = [...campaignCards].sort(
    (a, b) => b.estimatedRevenue - a.estimatedRevenue
  )[0];

  const averageScore =
    scoredPatients.length > 0
      ? Math.round(
          scoredPatients.reduce((sum, item) => sum + item.score, 0) /
            scoredPatients.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
          <Sparkles size={14} />
          CRM premium
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 md:text-3xl">
              Central de Campanhas Inteligentes
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Campanhas segmentadas com score comercial, chance de fechamento,
              risco de abandono e previsão de faturamento.
            </p>
          </div>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Campanhas ativas</p>
              <h2 className="mt-2 text-2xl font-black text-slate-800">
                {loading ? "..." : campaignCards.length}
              </h2>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 p-3 text-white">
              <Megaphone size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Pacientes elegíveis</p>
              <h2 className="mt-2 text-2xl font-black text-slate-800">
                {loading ? "..." : totalEligible}
              </h2>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-3 text-white">
              <Users size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Receita prevista</p>
              <h2 className="mt-2 text-2xl font-black text-slate-800">
                {loading ? "..." : formatCurrency(totalEstimatedRevenue)}
              </h2>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 p-3 text-white">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Score médio</p>
              <h2 className="mt-2 text-2xl font-black text-slate-800">
                {loading ? "..." : `${averageScore}/100`}
              </h2>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 p-3 text-white">
              <Brain size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Melhor campanha</p>
              <h2 className="mt-2 line-clamp-1 text-2xl font-black text-slate-800">
                {loading ? "..." : bestCampaign?.title || "-"}
              </h2>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 p-3 text-white">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
              <Brain size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Campanhas sugeridas
              </h2>
              <p className="text-sm text-slate-500">
                Agora ordenadas pelo score comercial centralizado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {campaignCards.map((campaign) => {
              const Icon = campaign.icon;
              const isActive = selectedCampaign === campaign.key;

              return (
                <button
                  key={campaign.key}
                  type="button"
                  onClick={() => setSelectedCampaign(campaign.key)}
                  className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    isActive
                      ? "border-cyan-200 bg-cyan-50/40 ring-2 ring-cyan-100"
                      : "border-slate-100 bg-white"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div
                      className={`rounded-2xl bg-gradient-to-br ${campaign.gradient} p-3 text-white`}
                    >
                      <Icon size={22} />
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                      {campaign.audience.length} pacientes
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-800">
                    {campaign.title}
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {campaign.description}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Conversão
                      </p>
                      <p className="mt-1 font-black text-cyan-600">
                        {campaign.estimatedConversion}%
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Previsão
                      </p>
                      <p className="mt-1 font-black text-emerald-600">
                        {formatCurrency(campaign.estimatedRevenue)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <Target size={22} />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Estratégia da campanha
                </h2>
                <p className="text-sm text-slate-500">
                  Orientação comercial sugerida.
                </p>
              </div>
            </div>

            <h3 className="text-lg font-black text-slate-800">
              {selectedCampaignData?.title}
            </h3>

            <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {selectedCampaignData?.strategy}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-cyan-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">
                  Elegíveis
                </p>
                <p className="mt-1 text-2xl font-black text-cyan-700">
                  {selectedCampaignData?.audience.length || 0}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  Receita prevista
                </p>
                <p className="mt-1 text-lg font-black text-emerald-700">
                  {formatCurrency(selectedCampaignData?.estimatedRevenue || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Mensagem sugerida
                </h2>
                <p className="text-sm text-slate-500">
                  Use como base para WhatsApp assistido.
                </p>
              </div>
            </div>

            <pre className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {selectedCampaignData?.message.replace("{nome}", "Paciente")}
            </pre>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              Pacientes elegíveis
            </h2>
            <p className="text-sm text-slate-500">
              Lista ordenada por maior chance de fechamento e score comercial.
            </p>
          </div>

          <div className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-700">
            {selectedCampaignData?.audience.length || 0} pacientes
          </div>
        </div>

        {!selectedCampaignData || selectedCampaignData.audience.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-500">
              Nenhum paciente elegível para esta campanha no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedCampaignData.audience.slice(0, 30).map((item) => {
              const patient = item.patient;
              const paidTotal = getPatientPaidTotal(patient.id);
              const openBudgetTotal = getPatientOpenBudgetTotal(patient.id);
              const firstName = patientFirstName(patient);
              const message = selectedCampaignData.message.replace(
                "{nome}",
                firstName
              );
              const whatsappHref = buildWhatsappHref(patient, message);

              return (
                <div
                  key={patient.id}
                  className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 xl:grid-cols-[1fr_1.25fr_auto] xl:items-center"
                >
                  <div>
                    <Link
                      href={`/pacientes/${patient.id}`}
                      className="font-black text-slate-800 hover:text-[#239d9a]"
                    >
                      {patient.name || "Paciente"}
                    </Link>

                    <p className="mt-1 text-sm text-slate-500">
                      Origem: {item.source || "Não informado"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {item.bestApproach}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Score
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${getScoreBadge(
                          item.score
                        )}`}
                      >
                        {item.score}/100
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Fechamento
                      </p>
                      <p className="font-black text-cyan-600">
                        {item.closingChance}%
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Risco
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${getRiskBadge(
                          item.abandonmentRisk
                        )}`}
                      >
                        {item.abandonmentRisk}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Pago
                      </p>
                      <p className="font-black text-emerald-600">
                        {formatCurrency(paidTotal)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Sem retorno
                      </p>
                      <p className="font-black text-slate-700">
                        {item.daysWithoutReturn === null
                          ? "Sem consulta"
                          : `${item.daysWithoutReturn} dias`}
                      </p>
                    </div>

                    {openBudgetTotal > 0 && (
                      <div className="col-span-2 md:col-span-5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          Orçamento aberto
                        </p>
                        <p className="font-black text-cyan-600">
                          {formatCurrency(openBudgetTotal)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                    <Link
                      href={`/pacientes/${patient.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                      Prontuário
                    </Link>

                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl bg-[#1fb36e] px-4 py-2 text-xs font-black text-white hover:bg-[#1c9f63]"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
