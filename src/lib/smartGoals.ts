"use client";

export type SmartGoalFinancialRecord = {
  id?: string | null;
  patient_id?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
};

export type SmartGoalBudget = {
  id?: string | null;
  patient_id?: string | null;
  total?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  approved_at?: string | null;
};

export type SmartGoalCampaign = {
  name?: string | null;
  estimatedRevenue?: number | null;
  estimatedConversion?: number | null;
  eligiblePatients?: number | null;
};

export type SmartGoalScoredPatient = {
  id?: string | null;
  score?: number | null;
  closingChance?: number | null;
  vipLevel?: string | null;
  financialPotential?: string | null;
};

export type SmartGoalsInput = {
  currentMonthlyGoal?: number;
  currentAnnualGoal?: number;
  currentCrmGoal?: number;
  currentCommercialGoal?: number;
  currentConversionGoal?: number;
  financialRecords?: SmartGoalFinancialRecord[];
  budgets?: SmartGoalBudget[];
  campaigns?: SmartGoalCampaign[];
  scoredPatients?: SmartGoalScoredPatient[];
  baseDate?: Date;
};

export type MonthlyRevenuePoint = {
  key: string;
  label: string;
  revenue: number;
  approvedBudgetsRevenue: number;
  openBudgetsRevenue: number;
  patients: number;
};

export type SmartGoalsResult = {
  suggestedMonthlyGoal: number;
  suggestedAnnualGoal: number;
  suggestedCrmGoal: number;
  suggestedCommercialGoal: number;
  suggestedConversionGoal: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  lastThreeMonthsAverage: number;
  lastSixMonthsAverage: number;
  growthRate: number;
  trend: "Crescimento" | "Estável" | "Queda";
  confidence: "Baixa" | "Média" | "Alta";
  riskLevel: "Baixo" | "Médio" | "Alto";
  riskMessage: string;
  opportunityMessage: string;
  executiveRecommendation: string;
  monthlySeries: MonthlyRevenuePoint[];
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
    normalized === "rejected"
  );
}

function getDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(String(value).includes("T") ? value : `${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function getRecordPaidValue(record: SmartGoalFinancialRecord) {
  const paid = parseMoney(record.paid_amount);
  const amount = parseMoney(record.amount);

  if (paid > 0) return paid;
  if (isPaidStatus(record.status)) return amount;

  return 0;
}

function roundToHundreds(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / 100) * 100;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (validValues.length === 0) return 0;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function buildMonthlySeries(
  financialRecords: SmartGoalFinancialRecord[],
  budgets: SmartGoalBudget[],
  baseDate: Date
): MonthlyRevenuePoint[] {
  const points: MonthlyRevenuePoint[] = [];

  for (let index = 5; index >= 0; index -= 1) {
    const date = addMonths(baseDate, -index);
    const key = getMonthKey(date);

    points.push({
      key,
      label: getMonthLabel(date),
      revenue: 0,
      approvedBudgetsRevenue: 0,
      openBudgetsRevenue: 0,
      patients: 0,
    });
  }

  const pointMap = new Map(points.map((point) => [point.key, point]));

  const patientsByMonth = new Map<string, Set<string>>();

  financialRecords.forEach((record) => {
    const date = getDate(record.paid_at || record.created_at);
    if (!date) return;

    const key = getMonthKey(date);
    const point = pointMap.get(key);
    if (!point) return;

    const paidValue = getRecordPaidValue(record);

    point.revenue += paidValue;

    if (record.patient_id && paidValue > 0) {
      if (!patientsByMonth.has(key)) {
        patientsByMonth.set(key, new Set<string>());
      }

      patientsByMonth.get(key)!.add(String(record.patient_id));
    }
  });

  budgets.forEach((budget) => {
    const date = getDate(budget.approved_at || budget.created_at);
    if (!date) return;

    const key = getMonthKey(date);
    const point = pointMap.get(key);
    if (!point) return;

    const total = parseMoney(budget.total);

    if (isApprovedStatus(budget.status)) {
      point.approvedBudgetsRevenue += total;
    } else if (!isRejectedStatus(budget.status)) {
      point.openBudgetsRevenue += total;
    }
  });

  points.forEach((point) => {
    point.revenue = Math.round(point.revenue);
    point.approvedBudgetsRevenue = Math.round(point.approvedBudgetsRevenue);
    point.openBudgetsRevenue = Math.round(point.openBudgetsRevenue);
    point.patients = patientsByMonth.get(point.key)?.size || 0;
  });

  return points;
}

function buildRiskMessage(
  trend: SmartGoalsResult["trend"],
  riskLevel: SmartGoalsResult["riskLevel"],
  growthRate: number
) {
  if (riskLevel === "Alto") {
    return "A clínica apresenta risco elevado de não atingir a próxima meta. Priorize recuperação de pacientes, orçamentos parados e campanhas de alta conversão.";
  }

  if (trend === "Queda") {
    return `Existe sinal de queda no faturamento recente (${growthRate}%). Recomenda-se revisar faltas, inadimplência, agenda ociosa e baixa conversão comercial.`;
  }

  if (riskLevel === "Médio") {
    return "A clínica está em zona de atenção. A meta sugerida é conservadora e deve ser acompanhada semanalmente pelo Dashboard Executivo.";
  }

  return "O risco atual é baixo. A clínica possui base suficiente para trabalhar uma meta inteligente com crescimento controlado.";
}

function buildOpportunityMessage(
  hotPatients: number,
  openBudgetsRevenue: number,
  campaignProjection: number
) {
  if (hotPatients > 0 && openBudgetsRevenue > 0) {
    return `Há oportunidade comercial ativa em pacientes quentes e orçamentos abertos. Priorize ${hotPatients} paciente(s) com maior chance de fechamento.`;
  }

  if (campaignProjection > 0) {
    return "As campanhas CRM possuem potencial para ajudar no atingimento da meta sugerida.";
  }

  if (openBudgetsRevenue > 0) {
    return "Os orçamentos em aberto representam a principal oportunidade imediata para melhorar a projeção.";
  }

  return "Cadastre origem dos pacientes, campanhas e orçamentos para que a meta inteligente fique mais precisa.";
}

function buildExecutiveRecommendation(input: {
  suggestedMonthlyGoal: number;
  currentMonthlyGoal: number;
  trend: SmartGoalsResult["trend"];
  confidence: SmartGoalsResult["confidence"];
  lastThreeMonthsAverage: number;
  growthRate: number;
}) {
  const formattedSuggested = input.suggestedMonthlyGoal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const formattedAverage = input.lastThreeMonthsAverage.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  if (input.confidence === "Baixa") {
    return `Ainda há poucos dados para uma sugestão muito precisa. Como ponto de partida, a meta inteligente sugerida é ${formattedSuggested}, baseada na média recente de ${formattedAverage}.`;
  }

  if (input.trend === "Crescimento") {
    return `A clínica está em tendência de crescimento. A meta inteligente sugerida é ${formattedSuggested}, mantendo avanço controlado sobre a média recente de ${formattedAverage}.`;
  }

  if (input.trend === "Queda") {
    return `A clínica apresenta queda recente. A meta inteligente sugerida é ${formattedSuggested}, com foco em recuperação antes de elevar metas agressivas.`;
  }

  return `A clínica está estável. A meta inteligente sugerida é ${formattedSuggested}, equilibrando histórico recente, pipeline comercial e segurança operacional.`;
}

export function calculateSmartGoals(input: SmartGoalsInput): SmartGoalsResult {
  const baseDate = input.baseDate || new Date();

  const financialRecords = input.financialRecords || [];
  const budgets = input.budgets || [];
  const campaigns = input.campaigns || [];
  const scoredPatients = input.scoredPatients || [];

  const currentMonthlyGoal = Number(input.currentMonthlyGoal || 80000);
  const currentAnnualGoal = Number(input.currentAnnualGoal || currentMonthlyGoal * 12);
  const currentCrmGoal = Number(input.currentCrmGoal || 30);
  const currentCommercialGoal = Number(input.currentCommercialGoal || 20);
  const currentConversionGoal = Number(input.currentConversionGoal || 35);

  const monthlySeries = buildMonthlySeries(financialRecords, budgets, baseDate);
  const revenues = monthlySeries.map((point) => point.revenue);

  const currentMonthRevenue = revenues[revenues.length - 1] || 0;
  const previousMonthRevenue = revenues[revenues.length - 2] || 0;

  const lastThreeMonthsAverage = Math.round(average(revenues.slice(-3)));
  const lastSixMonthsAverage = Math.round(average(revenues));

  const growthRate =
    previousMonthRevenue > 0
      ? Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
      : currentMonthRevenue > 0
        ? 100
        : 0;

  let trend: SmartGoalsResult["trend"] = "Estável";

  if (growthRate >= 12) {
    trend = "Crescimento";
  } else if (growthRate <= -12) {
    trend = "Queda";
  }

  const hotPatients = scoredPatients.filter((patient) => {
    return Number(patient.closingChance || 0) >= 70;
  }).length;

  const highValuePatients = scoredPatients.filter((patient) => {
    return (
      patient.financialPotential === "Alto" ||
      patient.vipLevel === "Ouro" ||
      patient.vipLevel === "Diamante"
    );
  }).length;

  const openBudgetsRevenue = budgets.reduce((sum, budget) => {
    if (isApprovedStatus(budget.status) || isRejectedStatus(budget.status)) {
      return sum;
    }

    return sum + parseMoney(budget.total);
  }, 0);

  const campaignProjection = campaigns.reduce((sum, campaign) => {
    return sum + Number(campaign.estimatedRevenue || 0);
  }, 0);

  const weightedBase =
    lastThreeMonthsAverage > 0
      ? lastThreeMonthsAverage * 0.65 + lastSixMonthsAverage * 0.35
      : currentMonthlyGoal * 0.75;

  const opportunityBoost =
    openBudgetsRevenue * 0.08 +
    campaignProjection * 0.06 +
    hotPatients * 450 +
    highValuePatients * 300;

  let growthMultiplier = 1.08;

  if (trend === "Crescimento") growthMultiplier = 1.15;
  if (trend === "Queda") growthMultiplier = 1.02;

  const suggestedMonthlyGoal = roundToHundreds(
    Math.max(
      weightedBase * growthMultiplier + opportunityBoost,
      currentMonthlyGoal * 0.65
    )
  );

  const suggestedAnnualGoal = roundToHundreds(
    Math.max(suggestedMonthlyGoal * 12, currentAnnualGoal * 0.65)
  );

  const suggestedCrmGoal = Math.max(
    10,
    Math.round(
      currentCrmGoal * 0.6 +
        hotPatients * 0.45 +
        highValuePatients * 0.25 +
        campaigns.length * 2
    )
  );

  const suggestedCommercialGoal = Math.max(
    10,
    Math.round(
      currentCommercialGoal * 0.55 +
        hotPatients * 0.35 +
        Math.min(openBudgetsRevenue / 5000, 30)
    )
  );

  const suggestedConversionGoal = clampNumber(
    Math.round(
      currentConversionGoal * 0.65 +
        (hotPatients > 0 && scoredPatients.length > 0
          ? (hotPatients / scoredPatients.length) * 100 * 0.35
          : currentConversionGoal * 0.35)
    ),
    15,
    85
  );

  let confidence: SmartGoalsResult["confidence"] = "Baixa";

  const monthsWithRevenue = monthlySeries.filter((point) => point.revenue > 0).length;

  if (monthsWithRevenue >= 5 && financialRecords.length >= 20) {
    confidence = "Alta";
  } else if (monthsWithRevenue >= 3 || financialRecords.length >= 10) {
    confidence = "Média";
  }

  let riskLevel: SmartGoalsResult["riskLevel"] = "Baixo";

  if (trend === "Queda" && currentMonthRevenue < currentMonthlyGoal * 0.55) {
    riskLevel = "Alto";
  } else if (
    trend === "Queda" ||
    currentMonthRevenue < currentMonthlyGoal * 0.75 ||
    confidence === "Baixa"
  ) {
    riskLevel = "Médio";
  }

  const riskMessage = buildRiskMessage(trend, riskLevel, growthRate);

  const opportunityMessage = buildOpportunityMessage(
    hotPatients,
    Math.round(openBudgetsRevenue),
    Math.round(campaignProjection)
  );

  const executiveRecommendation = buildExecutiveRecommendation({
    suggestedMonthlyGoal,
    currentMonthlyGoal,
    trend,
    confidence,
    lastThreeMonthsAverage,
    growthRate,
  });

  return {
    suggestedMonthlyGoal,
    suggestedAnnualGoal,
    suggestedCrmGoal,
    suggestedCommercialGoal,
    suggestedConversionGoal,
    currentMonthRevenue: Math.round(currentMonthRevenue),
    previousMonthRevenue: Math.round(previousMonthRevenue),
    lastThreeMonthsAverage,
    lastSixMonthsAverage,
    growthRate,
    trend,
    confidence,
    riskLevel,
    riskMessage,
    opportunityMessage,
    executiveRecommendation,
    monthlySeries,
  };
}
