"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  CalendarClock,
  Crown,
  DollarSign,
  HeartHandshake,
  Megaphone,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  status?: string | null;
  created_at?: string | null;
};

type Budget = {
  id: string;
  patient_id?: string | null;
  status?: string | null;
  total?: number | string | null;
  created_at?: string | null;
};

type FinancialRecord = {
  id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  due_date?: string | null;
  created_at?: string | null;
};

type Treatment = {
  id: string;
  patient_id?: string | null;
  procedure_name?: string | null;
  treatment_name?: string | null;
  title?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type HighPotentialPatient = {
  id: string;
  name: string;
  score: number;
  reason: string;
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

function getDateAtNoon(value?: string | null) {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const clean = raw.split("T")[0];
  const date = new Date(`${clean}T12:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function daysBetween(value?: string | null) {
  const date = getDateAtNoon(value);

  if (!date) return null;

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return Math.floor(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
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

function getPatientSource(patient: Patient) {
  const source = String(
    patient.patient_source || patient.source || patient.origin || ""
  ).trim();

  return source || "Origem não informada";
}

function getTreatmentText(treatment: Treatment) {
  return String(
    treatment.procedure_name || treatment.treatment_name || treatment.title || ""
  ).toLowerCase();
}

function buildSocialSuggestions() {
  return [
    {
      title: "Prevenção odontológica",
      content:
        "Você sabia que consultas preventivas ajudam a evitar tratamentos maiores no futuro? 🦷✨ Manter o acompanhamento em dia é um investimento em saúde e qualidade de vida.",
    },
    {
      title: "Clareamento dental",
      content:
        "Seu sorriso influencia diretamente sua autoestima ✨ O clareamento dental é uma forma segura e eficaz de devolver brilho e naturalidade ao sorriso.",
    },
    {
      title: "Implantes dentários",
      content:
        "Os implantes devolvem função, estética e segurança ao sorrir 😁 Agende sua avaliação e descubra as possibilidades para o seu caso.",
    },
  ];
}

export default function CrmIaPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(
    []
  );
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  async function loadData() {
    try {
      setLoading(true);

      const [
        patientsResponse,
        appointmentsResponse,
        budgetsResponse,
        financialResponse,
        treatmentsResponse,
      ] = await Promise.all([
        supabase.from("patients").select("*"),
        supabase.from("appointments").select("*"),
        supabase.from("budgets").select("*"),
        supabase.from("financial_records").select("*"),
        supabase.from("patient_treatments").select("*"),
      ]);

      if (patientsResponse.error) throw patientsResponse.error;
      if (appointmentsResponse.error) throw appointmentsResponse.error;
      if (budgetsResponse.error) throw budgetsResponse.error;
      if (financialResponse.error) throw financialResponse.error;
      if (treatmentsResponse.error) throw treatmentsResponse.error;

      setPatients((patientsResponse.data || []) as Patient[]);
      setAppointments((appointmentsResponse.data || []) as Appointment[]);
      setBudgets((budgetsResponse.data || []) as Budget[]);
      setFinancialRecords((financialResponse.data || []) as FinancialRecord[]);
      setTreatments((treatmentsResponse.data || []) as Treatment[]);
    } catch (error: any) {
      console.error("Erro ao carregar IA estratégica:", error);
      alert(
        "Erro ao carregar IA estratégica: " +
          (error?.message || "erro inesperado")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const insights = useMemo(() => {
    const totalPatients = patients.length;

    const openBudgets = budgets.filter((budget) => {
      const status = normalizeStatus(budget.status);
      return !isApprovedStatus(status) && !isRejectedStatus(status);
    });

    const openBudgetValue = openBudgets.reduce(
      (sum, budget) => sum + parseMoney(budget.total),
      0
    );

    const overdueRecords = financialRecords.filter((record) => {
      const dueDate = getDateAtNoon(record.due_date);
      if (!dueDate) return false;

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      return dueDate.getTime() < today.getTime() && !isPaidStatus(record.status);
    });

    const overdueValue = overdueRecords.reduce((sum, record) => {
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      return sum + Math.max(0, amount - paid);
    }, 0);

    const inactivePatients = patients.filter((patient) => {
      const patientAppointments = appointments
        .filter((appointment) => appointment.patient_id === patient.id)
        .sort((a, b) =>
          String(b.date || b.created_at || "").localeCompare(
            String(a.date || a.created_at || "")
          )
        );

      const lastAppointment = patientAppointments[0];
      const days = daysBetween(lastAppointment?.date || patient.created_at);

      return days !== null && days >= 180;
    });

    const implantTreatments = treatments.filter((treatment) => {
      const text = getTreatmentText(treatment);
      return text.includes("implante") || text.includes("protocolo");
    });

    const highPotentialPatients: HighPotentialPatient[] = patients
      .map((patient) => {
        const patientFinancial = financialRecords.filter(
          (record) => record.patient_id === patient.id
        );

        const patientBudgets = budgets.filter(
          (budget) => budget.patient_id === patient.id
        );

        const patientAppointments = appointments.filter(
          (appointment) => appointment.patient_id === patient.id
        );

        const totalPaid = patientFinancial.reduce((sum, record) => {
          if (parseMoney(record.paid_amount) > 0) {
            return sum + parseMoney(record.paid_amount);
          }

          if (isPaidStatus(record.status)) {
            return sum + parseMoney(record.amount);
          }

          return sum;
        }, 0);

        const openBudgetTotal = patientBudgets.reduce((sum, budget) => {
          if (isApprovedStatus(budget.status) || isRejectedStatus(budget.status)) {
            return sum;
          }

          return sum + parseMoney(budget.total);
        }, 0);

        const source = getPatientSource(patient);
        const sourceBonus = source === "Origem não informada" ? 0 : 8;

        const score = Math.min(
          100,
          Math.round(
            totalPaid / 300 +
              openBudgetTotal / 200 +
              patientAppointments.length * 4 +
              sourceBonus
          )
        );

        let reason = "Potencial comercial moderado";

        if (openBudgetTotal >= 3000) {
          reason = "Possui orçamento pendente relevante";
        } else if (totalPaid >= 3000) {
          reason = "Histórico financeiro forte";
        } else if (patientAppointments.length >= 3) {
          reason = "Bom vínculo com a clínica";
        }

        return {
          id: patient.id,
          name: patient.name || "Paciente",
          score,
          reason,
        };
      })
      .filter((patient) => patient.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const recommendations: string[] = [];

    if (inactivePatients.length >= 10) {
      recommendations.push(
        `Existem ${inactivePatients.length} pacientes sem retorno há mais de 180 dias. Recomenda-se campanha de reativação com contato humano e mensagem preventiva.`
      );
    }

    if (openBudgetValue >= 20000) {
      recommendations.push(
        `A clínica possui ${formatCurrency(
          openBudgetValue
        )} em orçamentos pendentes. A postura recomendada é priorizar follow-up com os maiores valores e oferecer próximo passo claro.`
      );
    }

    if (overdueValue >= 5000) {
      recommendations.push(
        `A inadimplência atual está em ${formatCurrency(
          overdueValue
        )}. Reforce negociação, cobrança preventiva e revisão dos parcelamentos em aberto.`
      );
    }

    if (implantTreatments.length >= 5) {
      recommendations.push(
        "Implantes apresentam potencial estratégico. Considere campanhas educativas e conteúdo de autoridade para tratamentos de maior ticket."
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "A clínica não apresenta alertas críticos nesta leitura. A postura recomendada é manter recuperação ativa, acompanhar orçamentos pendentes e revisar oportunidades semanalmente."
      );
    }

    return {
      totalPatients,
      inactivePatients,
      openBudgetValue,
      overdueValue,
      implantTreatments,
      recommendations,
      highPotentialPatients,
    };
  }, [patients, appointments, budgets, financialRecords, treatments]);

  const socialSuggestions = useMemo(() => buildSocialSuggestions(), []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#239d9a] via-[#1f8d8a] to-[#166b68] p-6 text-white shadow-xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-6 w-6" />

                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-widest">
                  IA Estratégica
                </span>
              </div>

              <h1 className="text-3xl font-black md:text-4xl">
                Central Estratégica da Clínica
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-white/90 md:text-base">
                Inteligência administrativa, comercial e estratégica integrada ao
                CRM.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadData}
                className="flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-3 text-sm font-black transition hover:bg-white/30"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>

              <Link
                href="/crm"
                className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:opacity-90"
              >
                <ArrowLeft className="h-4 w-4" />
                CRM
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#239d9a]/10">
              <RefreshCw className="h-8 w-8 animate-spin text-[#239d9a]" />
            </div>

            <h2 className="text-xl font-black text-slate-800">
              Carregando inteligência estratégica...
            </h2>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                    <Users className="h-6 w-6" />
                  </div>

                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Pacientes
                  </span>
                </div>

                <h2 className="text-3xl font-black text-slate-800">
                  {insights.totalPatients}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Pacientes cadastrados.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                    <CalendarClock className="h-6 w-6" />
                  </div>

                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Retorno
                  </span>
                </div>

                <h2 className="text-3xl font-black text-slate-800">
                  {insights.inactivePatients.length}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Pacientes sem retorno há mais de 180 dias.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <DollarSign className="h-6 w-6" />
                  </div>

                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Orçamentos
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-800">
                  {formatCurrency(insights.openBudgetValue)}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Valor potencial em orçamentos pendentes.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
                    <AlertTriangle className="h-6 w-6" />
                  </div>

                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Inadimplência
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-800">
                  {formatCurrency(insights.overdueValue)}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Valores vencidos em aberto.
                </p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-[#239d9a]/10 p-3 text-[#239d9a]">
                    <Brain className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-800">
                      Diagnóstico Estratégico
                    </h2>

                    <p className="text-sm text-slate-500">
                      Interpretação inteligente dos dados da clínica.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {insights.recommendations.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-[#239d9a]/10 p-2 text-[#239d9a]">
                          <Sparkles className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="font-black text-slate-800">
                            Recomendação da IA
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {item}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                    <Crown className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-800">
                      Pacientes Estratégicos
                    </h2>

                    <p className="text-sm text-slate-500">
                      Maiores oportunidades da clínica.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {insights.highPotentialPatients.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-100 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black text-slate-800">
                            {item.name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.reason}
                          </p>
                        </div>

                        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {item.score} pts
                        </div>
                      </div>
                    </div>
                  ))}

                  {insights.highPotentialPatients.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                      Ainda não há pacientes estratégicos suficientes.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                    <Megaphone className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-800">
                      Sugestões de Marketing
                    </h2>

                    <p className="text-sm text-slate-500">
                      Estratégias recomendadas automaticamente.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="mt-1 h-5 w-5 text-cyan-700" />

                      <div>
                        <h3 className="font-black text-cyan-900">
                          Campanha recomendada
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-cyan-800">
                          Criar campanha de reativação para pacientes sem retorno
                          há mais de 180 dias.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-start gap-3">
                      <Target className="mt-1 h-5 w-5 text-emerald-700" />

                      <div>
                        <h3 className="font-black text-emerald-900">
                          Oportunidade comercial
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-emerald-800">
                          Priorizar pacientes com orçamentos pendentes acima de
                          R$ 3.000.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <HeartHandshake className="mt-1 h-5 w-5 text-amber-700" />

                      <div>
                        <h3 className="font-black text-amber-900">
                          Relacionamento
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-800">
                          Reforçar contatos humanizados para aumentar conversão
                          de tratamentos premium.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                    <Activity className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-800">
                      Conteúdo para Redes Sociais
                    </h2>

                    <p className="text-sm text-slate-500">
                      Sugestões automáticas geradas pela IA.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {socialSuggestions.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#239d9a]" />

                        <h3 className="font-black text-slate-800">
                          {item.title}
                        </h3>
                      </div>

                      <p className="text-sm leading-6 text-slate-600">
                        {item.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
