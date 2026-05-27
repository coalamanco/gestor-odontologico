export type ClinicGoalFinancialRecord = {
    id?: string | null;
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
  
  export type ClinicGoalTreatment = {
    id?: string | null;
    patient_id?: string | null;
    procedure_name?: string | null;
    treatment_name?: string | null;
    title?: string | null;
    total?: number | string | null;
    unit_price?: number | string | null;
    status?: string | null;
    created_at?: string | null;
    completed_at?: string | null;
    professional_name?: string | null;
    dentist_name?: string | null;
  };
  
  export type ClinicGoalBudget = {
    id?: string | null;
    patient_id?: string | null;
    status?: string | null;
    total?: number | string | null;
    created_at?: string | null;
    approved_at?: string | null;
  };
  
  export type ClinicGoalCampaign = {
    name?: string | null;
    estimatedRevenue?: number | null;
    estimatedConversion?: number | null;
    eligiblePatients?: number | null;
  };
  
  export type ClinicGoalScoredPatient = {
    id?: string | null;
    score?: number | null;
    closingChance?: number | null;
    vipLevel?: string | null;
    financialPotential?: string | null;
  };
  
  export type ClinicGoals = {
    monthlyGoal: number;
    annualGoal: number;
    crmGoal: number;
    commercialGoal: number;
    conversionGoal: number;
  };
  
  export type ClinicGoalsInput = {
    monthlyGoal?: number;
    annualGoal?: number;
    crmGoal?: number;
    commercialGoal?: number;
    conversionGoal?: number;
    confirmedRevenue?: number;
    probableRevenue?: number;
    potentialRevenue?: number;
    financialRecords?: ClinicGoalFinancialRecord[];
    treatments?: ClinicGoalTreatment[];
    budgets?: ClinicGoalBudget[];
    campaigns?: ClinicGoalCampaign[];
    scoredPatients?: ClinicGoalScoredPatient[];
    baseDate?: Date;
  };
  
  export type ClinicRankingItem = {
    name: string;
    value: number;
    count: number;
  };
  
  export type ClinicGoalsResult = {
    monthlyGoal: number;
    annualGoal: number;
    crmGoal: number;
    commercialGoal: number;
    conversionGoal: number;
    confirmedRevenue: number;
    probableRevenue: number;
    potentialRevenue: number;
    monthlyProgress: number;
    probableProgress: number;
    potentialProgress: number;
    chanceToHitGoal: "Baixa" | "Média" | "Alta";
    monthlyTrend: "Alta" | "Estável" | "Atenção";
    gapToGoal: number;
    projectedSurplus: number;
    averageTicket: number;
    commercialConversion: number;
    hotPatients: number;
    recoveredPatientsProjection: number;
    campaignRoiProjection: number;
    topProcedure: ClinicRankingItem | null;
    topProfessional: ClinicRankingItem | null;
    procedureRanking: ClinicRankingItem[];
    professionalRanking: ClinicRankingItem[];
    executiveSummary: string;
  };
  
  export const CLINIC_GOALS_STORAGE_KEY = "clinic_goals";
  
  export const DEFAULT_CLINIC_GOALS: ClinicGoals = {
    monthlyGoal: 80000,
    annualGoal: 960000,
    crmGoal: 30,
    commercialGoal: 20,
    conversionGoal: 35,
  };
  
  function parseMoney(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return 0;
  
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  
    const normalized = String(value)
      .replace("R$", "")
      .replace(/\s/g, "")
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
      normalized === "recebida" ||
      normalized === "quitado" ||
      normalized === "quitada"
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
      normalized === "finalizado" ||
      normalized === "finalizada"
    );
  }
  
  function clampPercentage(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  
  function normalizePositiveNumber(value: unknown, fallback: number) {
    const parsed = parseMoney(value as string | number | null | undefined);
    return parsed > 0 ? parsed : fallback;
  }
  
  function normalizeGoals(value?: Partial<ClinicGoals> | null): ClinicGoals {
    const monthlyGoal = normalizePositiveNumber(
      value?.monthlyGoal,
      DEFAULT_CLINIC_GOALS.monthlyGoal
    );
  
    return {
      monthlyGoal,
      annualGoal: normalizePositiveNumber(value?.annualGoal, monthlyGoal * 12),
      crmGoal: normalizePositiveNumber(value?.crmGoal, DEFAULT_CLINIC_GOALS.crmGoal),
      commercialGoal: normalizePositiveNumber(
        value?.commercialGoal,
        DEFAULT_CLINIC_GOALS.commercialGoal
      ),
      conversionGoal: normalizePositiveNumber(
        value?.conversionGoal,
        DEFAULT_CLINIC_GOALS.conversionGoal
      ),
    };
  }
  
  export function getClinicGoalsFromLocalStorage(): ClinicGoals {
    if (typeof window === "undefined") return DEFAULT_CLINIC_GOALS;
  
    try {
      const stored = window.localStorage.getItem(CLINIC_GOALS_STORAGE_KEY);
      if (!stored) return DEFAULT_CLINIC_GOALS;
  
      return normalizeGoals(JSON.parse(stored));
    } catch {
      return DEFAULT_CLINIC_GOALS;
    }
  }
  
  export function saveClinicGoalsToLocalStorage(goals: Partial<ClinicGoals>) {
    if (typeof window === "undefined") return;
  
    const normalized = normalizeGoals(goals);
    window.localStorage.setItem(
      CLINIC_GOALS_STORAGE_KEY,
      JSON.stringify(normalized)
    );
  }
  
  export function mergeClinicGoalsWithInput(input: ClinicGoalsInput): ClinicGoalsInput {
    const configuredGoals = getClinicGoalsFromLocalStorage();
  
    return {
      ...input,
      monthlyGoal: input.monthlyGoal ?? configuredGoals.monthlyGoal,
      annualGoal: input.annualGoal ?? configuredGoals.annualGoal,
      crmGoal: input.crmGoal ?? configuredGoals.crmGoal,
      commercialGoal: input.commercialGoal ?? configuredGoals.commercialGoal,
      conversionGoal: input.conversionGoal ?? configuredGoals.conversionGoal,
    };
  }
  
  function getDate(value?: string | null) {
    if (!value) return null;
  
    const date = new Date(String(value).includes("T") ? value : `${value}T12:00:00`);
  
    if (Number.isNaN(date.getTime())) return null;
  
    return date;
  }
  
  function isSameMonth(value?: string | null, base = new Date()) {
    const date = getDate(value);
  
    if (!date) return false;
  
    return (
      date.getFullYear() === base.getFullYear() &&
      date.getMonth() === base.getMonth()
    );
  }
  
  function getRecordPaidValue(record: ClinicGoalFinancialRecord) {
    const paid = parseMoney(record.paid_amount);
    const amount = parseMoney(record.amount);
  
    if (paid > 0) return paid;
    if (isPaidStatus(record.status)) return amount;
  
    return 0;
  }
  
  function getProcedureName(record: ClinicGoalFinancialRecord | ClinicGoalTreatment) {
    return (
      record.procedure_name ||
      record.treatment_name ||
      ("title" in record ? record.title : null) ||
      ("category" in record ? record.category : null) ||
      ("description" in record ? record.description : null) ||
      "Procedimento não informado"
    );
  }
  
  function getProfessionalName(record: ClinicGoalFinancialRecord | ClinicGoalTreatment) {
    return (
      record.professional_name ||
      record.dentist_name ||
      "Profissional não informado"
    );
  }
  
  function buildRanking<T>(
    items: T[],
    getName: (item: T) => string,
    getValue: (item: T) => number
  ): ClinicRankingItem[] {
    const grouped = new Map<string, ClinicRankingItem>();
  
    items.forEach((item) => {
      const name = getName(item);
      const value = getValue(item);
  
      if (!grouped.has(name)) {
        grouped.set(name, {
          name,
          value: 0,
          count: 0,
        });
      }
  
      const current = grouped.get(name)!;
      current.value += value;
      current.count += 1;
    });
  
    return Array.from(grouped.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }
  
  function buildExecutiveSummary(result: {
    monthlyProgress: number;
    chanceToHitGoal: "Baixa" | "Média" | "Alta";
    gapToGoal: number;
    projectedSurplus: number;
    topProcedure: ClinicRankingItem | null;
  }) {
    if (result.chanceToHitGoal === "Alta") {
      return `A clínica apresenta alta chance de bater a meta mensal. O desempenho atual já atingiu ${result.monthlyProgress}% da meta e a projeção indica sobra estimada de R$ ${Math.max(
        0,
        result.projectedSurplus
      ).toLocaleString("pt-BR")}. O procedimento com melhor desempenho é ${
        result.topProcedure?.name || "não identificado"
      }.`;
    }
  
    if (result.chanceToHitGoal === "Média") {
      return `A clínica está próxima da meta, mas ainda precisa reforçar campanhas, orçamentos parados e pacientes quentes. Faltam aproximadamente R$ ${Math.max(
        0,
        result.gapToGoal
      ).toLocaleString("pt-BR")} para atingir a meta mensal.`;
    }
  
    return "A clínica exige atenção para alcançar a meta mensal. Recomenda-se priorizar recuperação de pacientes, campanhas de maior conversão e oportunidades com score comercial alto.";
  }
  
  export function calculateClinicGoals(input: ClinicGoalsInput): ClinicGoalsResult {
    const baseDate = input.baseDate || new Date();
  
    const financialRecords = input.financialRecords || [];
    const treatments = input.treatments || [];
    const budgets = input.budgets || [];
    const campaigns = input.campaigns || [];
    const scoredPatients = input.scoredPatients || [];
  
    const monthlyGoal = normalizePositiveNumber(
      input.monthlyGoal,
      DEFAULT_CLINIC_GOALS.monthlyGoal
    );
    const annualGoal = normalizePositiveNumber(input.annualGoal, monthlyGoal * 12);
    const crmGoal = normalizePositiveNumber(
      input.crmGoal,
      DEFAULT_CLINIC_GOALS.crmGoal
    );
    const commercialGoal = normalizePositiveNumber(
      input.commercialGoal,
      DEFAULT_CLINIC_GOALS.commercialGoal
    );
    const conversionGoal = normalizePositiveNumber(
      input.conversionGoal,
      DEFAULT_CLINIC_GOALS.conversionGoal
    );
  
    const currentMonthFinancialRecords = financialRecords.filter((record) => {
      const date = record.paid_at || record.created_at;
      return isSameMonth(date, baseDate);
    });
  
    const currentMonthTreatments = treatments.filter((treatment) => {
      const date = treatment.completed_at || treatment.created_at;
      return isSameMonth(date, baseDate);
    });
  
    const confirmedRevenue =
      typeof input.confirmedRevenue === "number"
        ? input.confirmedRevenue
        : currentMonthFinancialRecords.reduce(
            (sum, record) => sum + getRecordPaidValue(record),
            0
          );
  
    const openBudgetsRevenue = budgets.reduce((sum, budget) => {
      if (isApprovedStatus(budget.status)) return sum;
      return sum + parseMoney(budget.total);
    }, 0);
  
    const campaignProjection = campaigns.reduce((sum, campaign) => {
      return sum + Number(campaign.estimatedRevenue || 0);
    }, 0);
  
    const hotPatients = scoredPatients.filter((patient) => {
      return Number(patient.closingChance || 0) >= 70;
    }).length;
  
    const probableRevenue =
      typeof input.probableRevenue === "number"
        ? input.probableRevenue
        : confirmedRevenue + openBudgetsRevenue * 0.45 + campaignProjection * 0.2;
  
    const potentialRevenue =
      typeof input.potentialRevenue === "number"
        ? input.potentialRevenue
        : confirmedRevenue +
          openBudgetsRevenue * 0.8 +
          campaignProjection * 0.35 +
          hotPatients * 1200;
  
    const monthlyProgress = clampPercentage((confirmedRevenue / monthlyGoal) * 100);
    const probableProgress = clampPercentage((probableRevenue / monthlyGoal) * 100);
    const potentialProgress = clampPercentage((potentialRevenue / monthlyGoal) * 100);
  
    let chanceToHitGoal: ClinicGoalsResult["chanceToHitGoal"] = "Baixa";
  
    if (probableProgress >= 95 || potentialProgress >= 110) {
      chanceToHitGoal = "Alta";
    } else if (probableProgress >= 75 || potentialProgress >= 90) {
      chanceToHitGoal = "Média";
    }
  
    let monthlyTrend: ClinicGoalsResult["monthlyTrend"] = "Estável";
  
    if (probableRevenue >= monthlyGoal) {
      monthlyTrend = "Alta";
    } else if (probableRevenue < monthlyGoal * 0.7) {
      monthlyTrend = "Atenção";
    }
  
    const gapToGoal = Math.max(0, monthlyGoal - confirmedRevenue);
    const projectedSurplus = probableRevenue - monthlyGoal;
  
    const paidPatients = new Set(
      currentMonthFinancialRecords
        .filter((record) => getRecordPaidValue(record) > 0 && record.patient_id)
        .map((record) => String(record.patient_id))
    );
  
    const averageTicket =
      paidPatients.size > 0 ? Math.round(confirmedRevenue / paidPatients.size) : 0;
  
    const commercialConversion = clampPercentage(
      scoredPatients.length > 0 ? (hotPatients / scoredPatients.length) * 100 : 0
    );
  
    const recoveredPatientsProjection = Math.round(
      Math.min(crmGoal, hotPatients * 0.35 + campaigns.length * 2)
    );
  
    const campaignRoiProjection =
      campaignProjection > 0
        ? Math.round((probableRevenue / Math.max(1, campaignProjection)) * 100)
        : 0;
  
    const rankingBase =
      currentMonthFinancialRecords.length > 0
        ? currentMonthFinancialRecords
        : currentMonthTreatments;
  
    const procedureRanking = buildRanking(
      rankingBase,
      (item: ClinicGoalFinancialRecord | ClinicGoalTreatment) =>
        getProcedureName(item),
      (item: ClinicGoalFinancialRecord | ClinicGoalTreatment) => {
        if ("paid_amount" in item || "amount" in item) {
          return getRecordPaidValue(item as ClinicGoalFinancialRecord);
        }
  
        return (
          parseMoney((item as ClinicGoalTreatment).total) ||
          parseMoney((item as ClinicGoalTreatment).unit_price)
        );
      }
    );
  
    const professionalRanking = buildRanking(
      rankingBase,
      (item: ClinicGoalFinancialRecord | ClinicGoalTreatment) =>
        getProfessionalName(item),
      (item: ClinicGoalFinancialRecord | ClinicGoalTreatment) => {
        if ("paid_amount" in item || "amount" in item) {
          return getRecordPaidValue(item as ClinicGoalFinancialRecord);
        }
  
        return (
          parseMoney((item as ClinicGoalTreatment).total) ||
          parseMoney((item as ClinicGoalTreatment).unit_price)
        );
      }
    );
  
    const topProcedure = procedureRanking[0] || null;
    const topProfessional = professionalRanking[0] || null;
  
    return {
      monthlyGoal: Math.round(monthlyGoal),
      annualGoal: Math.round(annualGoal),
      crmGoal: Math.round(crmGoal),
      commercialGoal: Math.round(commercialGoal),
      conversionGoal: Math.round(conversionGoal),
      confirmedRevenue: Math.round(confirmedRevenue),
      probableRevenue: Math.round(probableRevenue),
      potentialRevenue: Math.round(potentialRevenue),
      monthlyProgress,
      probableProgress,
      potentialProgress,
      chanceToHitGoal,
      monthlyTrend,
      gapToGoal: Math.round(gapToGoal),
      projectedSurplus: Math.round(projectedSurplus),
      averageTicket,
      commercialConversion,
      hotPatients,
      recoveredPatientsProjection,
      campaignRoiProjection,
      topProcedure,
      topProfessional,
      procedureRanking,
      professionalRanking,
      executiveSummary: buildExecutiveSummary({
        monthlyProgress,
        chanceToHitGoal,
        gapToGoal,
        projectedSurplus,
        topProcedure,
      }),
    };
  }
  