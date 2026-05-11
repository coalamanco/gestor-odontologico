"use client";

export type PredictivePatient = {
  id: string;
  name?: string | null;
  phone?: string | null;
  created_at?: string | null;
};

export type PredictiveAppointment = {
  id: string;
  patient_id?: string | null;
  date?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type PredictiveBudget = {
  id: string;
  patient_id?: string | null;
  status?: string | null;
  total?: number | string | null;
  created_at?: string | null;
};

export type PredictiveFinancialRecord = {
  id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  due_date?: string | null;
  created_at?: string | null;
};

export type PredictiveInsight = {
  id: string;
  title: string;
  interpretation: string;
  suggestedAction: string;
  riskLevel: "baixo" | "medio" | "alto" | "oportunidade";
  area: "Comercial" | "Relacionamento" | "Financeiro" | "Agenda";
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

function normalizeStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase();
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
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function getOpenBudgets(budgets: PredictiveBudget[]) {
  return budgets.filter((budget) => {
    return !isApprovedStatus(budget.status) && !isRejectedStatus(budget.status);
  });
}

function getOpenBudgetValue(budgets: PredictiveBudget[]) {
  return getOpenBudgets(budgets).reduce(
    (sum, budget) => sum + parseMoney(budget.total),
    0,
  );
}

function getOlderOpenBudgets(budgets: PredictiveBudget[], minDays: number) {
  return getOpenBudgets(budgets).filter((budget) => {
    const days = daysBetween(budget.created_at);
    return days !== null && days >= minDays;
  });
}

function getOverdueValue(financialRecords: PredictiveFinancialRecord[]) {
  return financialRecords.reduce((sum, record) => {
    const dueDate = getDateAtNoon(record.due_date);
    if (!dueDate) return sum;

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    if (dueDate.getTime() >= today.getTime()) return sum;
    if (isPaidStatus(record.status)) return sum;

    const amount = parseMoney(record.amount);
    const paid = parseMoney(record.paid_amount);

    return sum + Math.max(0, amount - paid);
  }, 0);
}

function getNoShowAppointments(appointments: PredictiveAppointment[]) {
  return appointments.filter((appointment) => {
    const status = normalizeStatus(appointment.status);
    return status === "faltou" || status === "no_show" || status === "ausente";
  });
}

function getInactivePatients(params: {
  patients: PredictivePatient[];
  appointments: PredictiveAppointment[];
  minDays: number;
}) {
  const { patients, appointments, minDays } = params;

  return patients.filter((patient) => {
    const patientAppointments = appointments
      .filter((appointment) => appointment.patient_id === patient.id)
      .sort((a, b) =>
        String(b.date || b.created_at || "").localeCompare(
          String(a.date || a.created_at || ""),
        ),
      );

    const lastAppointment = patientAppointments[0];
    const days = daysBetween(lastAppointment?.date || patient.created_at);

    return days !== null && days >= minDays;
  });
}

export function generatePredictiveInsights(params: {
  patients: PredictivePatient[];
  appointments: PredictiveAppointment[];
  budgets: PredictiveBudget[];
  financialRecords: PredictiveFinancialRecord[];
}): PredictiveInsight[] {
  const { patients, appointments, budgets, financialRecords } = params;

  const insights: PredictiveInsight[] = [];

  const openBudgetValue = getOpenBudgetValue(budgets);
  const olderOpenBudgets = getOlderOpenBudgets(budgets, 15);
  const olderOpenBudgetValue = olderOpenBudgets.reduce(
    (sum, budget) => sum + parseMoney(budget.total),
    0,
  );

  const overdueValue = getOverdueValue(financialRecords);
  const inactivePatients = getInactivePatients({
    patients,
    appointments,
    minDays: 180,
  });

  const noShows = getNoShowAppointments(appointments);

  if (olderOpenBudgets.length >= 3 || olderOpenBudgetValue >= 5000) {
    insights.push({
      id: "orcamentos-esfriando",
      title: "Orçamentos podem estar esfriando",
      interpretation:
        "Há orçamentos pendentes com tempo suficiente para perderem força comercial se não houver novo contato.",
      suggestedAction:
        "Priorize contato individual com os maiores valores e ofereça uma decisão simples: ajustar, parcelar ou agendar nova conversa.",
      riskLevel: "alto",
      area: "Comercial",
    });
  }

  if (openBudgetValue >= 15000 && olderOpenBudgetValue < 5000) {
    insights.push({
      id: "potencial-comercial-aberto",
      title: "Potencial comercial ainda ativo",
      interpretation:
        "Existe volume relevante de orçamento em aberto, mas nem todo ele parece estar antigo. Isso indica oportunidade de agir antes que esfrie.",
      suggestedAction:
        "Separe os orçamentos mais recentes e faça follow-up nos primeiros dias após a apresentação.",
      riskLevel: "oportunidade",
      area: "Comercial",
    });
  }

  if (overdueValue >= 5000) {
    insights.push({
      id: "risco-caixa",
      title: "Risco de pressão no caixa",
      interpretation:
        "Valores vencidos em aberto podem reduzir previsibilidade financeira mesmo quando o faturamento bruto parece saudável.",
      suggestedAction:
        "Reforce cobrança preventiva, revise acordos e acompanhe os maiores saldos em aberto antes de aumentar novos parcelamentos.",
      riskLevel: "medio",
      area: "Financeiro",
    });
  }

  if (inactivePatients.length >= 10) {
    insights.push({
      id: "base-reativavel",
      title: "Base de pacientes reativável",
      interpretation:
        "A clínica possui pacientes antigos suficientes para gerar movimento sem depender apenas de novos leads.",
      suggestedAction:
        "Crie uma rotina semanal de reativação com foco em revisão, limpeza e continuidade de cuidado.",
      riskLevel: "oportunidade",
      area: "Relacionamento",
    });
  }

  if (noShows.length >= 5) {
    insights.push({
      id: "risco-faltas",
      title: "Faltas podem impactar produtividade",
      interpretation:
        "O volume de faltas sugere risco de buracos improdutivos na agenda e perda de previsibilidade operacional.",
      suggestedAction:
        "Use confirmação ativa, lembretes e lista de encaixe para horários com maior chance de ausência.",
      riskLevel: "medio",
      area: "Agenda",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "previsao-estavel",
      title: "Cenário preditivo estável",
      interpretation:
        "Não há sinal forte de risco imediato nesta leitura. Isso indica boa oportunidade para manter rotina de gestão preventiva.",
      suggestedAction:
        "Continue revisando semanalmente orçamentos, pacientes sem retorno, faltas e inadimplência.",
      riskLevel: "baixo",
      area: "Comercial",
    });
  }

  return insights.slice(0, 4);
}
