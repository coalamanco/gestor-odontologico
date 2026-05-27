export type RevenueForecastBudget = {
    id?: string | null;
    patient_id?: string | null;
    status?: string | null;
    total?: number | string | null;
    created_at?: string | null;
    approved_at?: string | null;
  };
  
  export type RevenueForecastFinancialRecord = {
    id?: string | null;
    patient_id?: string | null;
    amount?: number | string | null;
    paid_amount?: number | string | null;
    status?: string | null;
    created_at?: string | null;
    paid_at?: string | null;
  };
  
  export type RevenueForecastCampaign = {
    id?: string | null;
    name?: string | null;
    estimatedRevenue?: number | null;
    estimatedConversion?: number | null;
    eligiblePatients?: number | null;
  };
  
  export type RevenueForecastScoredPatient = {
    id?: string | null;
    score?: number | null;
    closingChance?: number | null;
    vipLevel?: string | null;
    financialPotential?: string | null;
  };
  
  export type RevenueForecastInput = {
    budgets?: RevenueForecastBudget[];
    financialRecords?: RevenueForecastFinancialRecord[];
    campaigns?: RevenueForecastCampaign[];
    scoredPatients?: RevenueForecastScoredPatient[];
  };
  
  export type RevenueForecastResult = {
    confirmedRevenue: number;
    probableRevenue: number;
    potentialRevenue: number;
    commercialPipeline: number;
    monthlyTrend: "Alta" | "Estável" | "Atenção";
    conversionProjection: number;
    hotPatients: number;
    vipPatients: number;
    openBudgetsRevenue: number;
    campaignRevenueProjection: number;
    executiveSummary: string;
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
  
  function clampPercentage(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  
  function buildExecutiveSummary(params: {
    confirmedRevenue: number;
    probableRevenue: number;
    potentialRevenue: number;
    hotPatients: number;
    vipPatients: number;
    monthlyTrend: RevenueForecastResult["monthlyTrend"];
  }) {
    const {
      confirmedRevenue,
      probableRevenue,
      potentialRevenue,
      hotPatients,
      vipPatients,
      monthlyTrend,
    } = params;
  
    const growth =
      probableRevenue > confirmedRevenue
        ? probableRevenue - confirmedRevenue
        : 0;
  
    if (monthlyTrend === "Alta") {
      return `A clínica apresenta tendência positiva de crescimento, com potencial de expansão comercial relevante. Existem ${hotPatients} pacientes com alta chance de fechamento e ${vipPatients} pacientes VIP ativos. O pipeline comercial pode elevar o faturamento em aproximadamente R$ ${growth.toLocaleString(
        "pt-BR"
      )}.`;
    }
  
    if (monthlyTrend === "Atenção") {
      return `A clínica possui oportunidades abertas, porém o volume comercial exige atenção. Recomenda-se priorizar campanhas de recuperação e orçamentos parados para ampliar o faturamento potencial de R$ ${potentialRevenue.toLocaleString(
        "pt-BR"
      )}.`;
    }
  
    return `A clínica apresenta estabilidade comercial, mantendo boa previsibilidade financeira. Existem oportunidades consistentes de crescimento através do CRM, campanhas e pacientes VIP.`;
  }
  
  export function calculateRevenueForecast(
    input: RevenueForecastInput
  ): RevenueForecastResult {
    const budgets = input.budgets || [];
    const financialRecords = input.financialRecords || [];
    const campaigns = input.campaigns || [];
    const scoredPatients = input.scoredPatients || [];
  
    const confirmedRevenue = financialRecords.reduce((sum, record) => {
      const paidAmount = parseMoney(record.paid_amount);
      const amount = parseMoney(record.amount);
  
      if (paidAmount > 0) return sum + paidAmount;
      if (isPaidStatus(record.status)) return sum + amount;
  
      return sum;
    }, 0);
  
    const openBudgetsRevenue = budgets.reduce((sum, budget) => {
      const status = normalizeStatus(budget.status);
  
      if (isApprovedStatus(status) || isRejectedStatus(status)) {
        return sum;
      }
  
      return sum + parseMoney(budget.total);
    }, 0);
  
    const campaignRevenueProjection = campaigns.reduce((sum, campaign) => {
      return sum + Number(campaign.estimatedRevenue || 0);
    }, 0);
  
    const hotPatients = scoredPatients.filter((patient) => {
      return Number(patient.closingChance || 0) >= 70;
    }).length;
  
    const vipPatients = scoredPatients.filter((patient) => {
      return (
        patient.vipLevel === "Ouro" ||
        patient.vipLevel === "Diamante"
      );
    }).length;
  
    const probableRevenue =
      confirmedRevenue +
      openBudgetsRevenue * 0.45 +
      campaignRevenueProjection * 0.18 +
      hotPatients * 850;
  
    const potentialRevenue =
      confirmedRevenue +
      openBudgetsRevenue * 0.8 +
      campaignRevenueProjection * 0.35 +
      hotPatients * 1800 +
      vipPatients * 2500;
  
    const commercialPipeline =
      openBudgetsRevenue +
      campaignRevenueProjection +
      hotPatients * 1000;
  
    const conversionProjection = clampPercentage(
      hotPatients * 4 + vipPatients * 2 + campaigns.length * 3
    );
  
    let monthlyTrend: RevenueForecastResult["monthlyTrend"] = "Estável";
  
    if (probableRevenue >= confirmedRevenue * 1.45) {
      monthlyTrend = "Alta";
    } else if (probableRevenue <= confirmedRevenue * 1.1) {
      monthlyTrend = "Atenção";
    }
  
    return {
      confirmedRevenue: Math.round(confirmedRevenue),
      probableRevenue: Math.round(probableRevenue),
      potentialRevenue: Math.round(potentialRevenue),
      commercialPipeline: Math.round(commercialPipeline),
      monthlyTrend,
      conversionProjection,
      hotPatients,
      vipPatients,
      openBudgetsRevenue: Math.round(openBudgetsRevenue),
      campaignRevenueProjection: Math.round(campaignRevenueProjection),
      executiveSummary: buildExecutiveSummary({
        confirmedRevenue,
        probableRevenue,
        potentialRevenue,
        hotPatients,
        vipPatients,
        monthlyTrend,
      }),
    };
  }
  