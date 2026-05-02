export type ExecutiveAlertSeverity = "critico" | "atencao" | "oportunidade" | "positivo";
export type ExecutiveAlertArea = "financeiro" | "crm" | "agenda" | "comercial" | "marketing" | "metas";

export type ExecutiveAlert = {
  id: string;
  area: ExecutiveAlertArea;
  severity: ExecutiveAlertSeverity;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  priority: number;
};

export type ExecutiveAlertsInput = {
  monthlyGoal?: number;
  confirmedRevenue?: number;
  probableRevenue?: number;
  potentialRevenue?: number;
  monthlyProgress?: number;
  chanceToHitGoal?: "Baixa" | "Média" | "Alta";
  monthlyTrend?: "Alta" | "Estável" | "Atenção";
  hotPatients?: number;
  coldPatients?: number;
  riskPatients?: number;
  vipPatients?: number;
  openBudgetsCount?: number;
  openBudgetsRevenue?: number;
  averageScore?: number;
  conversionProjection?: number;
  campaignRevenueProjection?: number;
  sourceWithoutOriginCount?: number;
  todayAppointments?: number;
  todayOccupancy?: number;
  noShowsMonth?: number;
  overdueRevenue?: number;
};

export type ExecutiveAlertsResult = {
  alerts: ExecutiveAlert[];
  criticalCount: number;
  opportunityCount: number;
  positiveCount: number;
  mainMessage: string;
};

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function sortAlerts(alerts: ExecutiveAlert[]) {
  const severityWeight: Record<ExecutiveAlertSeverity, number> = {
    critico: 4,
    atencao: 3,
    oportunidade: 2,
    positivo: 1,
  };

  return [...alerts].sort((a, b) => {
    const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];

    if (severityDiff !== 0) return severityDiff;

    return b.priority - a.priority;
  });
}

function buildMainMessage(params: {
  criticalCount: number;
  opportunityCount: number;
  positiveCount: number;
}) {
  if (params.criticalCount > 0) {
    return `Existem ${params.criticalCount} alerta(s) crítico(s) que merecem atenção imediata. Priorize metas, pacientes em risco e oportunidades comerciais abertas.`;
  }

  if (params.opportunityCount > 0) {
    return `O cenário está controlado e existem ${params.opportunityCount} oportunidade(s) comerciais para aumentar o faturamento.`;
  }

  if (params.positiveCount > 0) {
    return `A clínica apresenta indicadores positivos. Mantenha o ritmo e acompanhe as campanhas com maior conversão.`;
  }

  return "Ainda não há dados suficientes para gerar alertas executivos relevantes.";
}

export function calculateExecutiveAlerts(
  input: ExecutiveAlertsInput
): ExecutiveAlertsResult {
  const alerts: ExecutiveAlert[] = [];

  const monthlyGoal = Number(input.monthlyGoal || 0);
  const confirmedRevenue = Number(input.confirmedRevenue || 0);
  const probableRevenue = Number(input.probableRevenue || 0);
  const potentialRevenue = Number(input.potentialRevenue || 0);
  const monthlyProgress = Number(input.monthlyProgress || 0);
  const hotPatients = Number(input.hotPatients || 0);
  const coldPatients = Number(input.coldPatients || 0);
  const riskPatients = Number(input.riskPatients || 0);
  const vipPatients = Number(input.vipPatients || 0);
  const openBudgetsCount = Number(input.openBudgetsCount || 0);
  const openBudgetsRevenue = Number(input.openBudgetsRevenue || 0);
  const averageScore = Number(input.averageScore || 0);
  const conversionProjection = Number(input.conversionProjection || 0);
  const campaignRevenueProjection = Number(input.campaignRevenueProjection || 0);
  const sourceWithoutOriginCount = Number(input.sourceWithoutOriginCount || 0);
  const todayAppointments = Number(input.todayAppointments || 0);
  const todayOccupancy = Number(input.todayOccupancy || 0);
  const noShowsMonth = Number(input.noShowsMonth || 0);
  const overdueRevenue = Number(input.overdueRevenue || 0);

  if (input.chanceToHitGoal === "Baixa" || input.monthlyTrend === "Atenção") {
    alerts.push({
      id: "goal-risk",
      area: "metas",
      severity: "critico",
      title: "Meta mensal em risco",
      description:
        monthlyGoal > 0
          ? `A clínica atingiu ${monthlyProgress}% da meta mensal de ${formatCurrency(
              monthlyGoal
            )}. A projeção provável está em ${formatCurrency(probableRevenue)}.`
          : `A clínica atingiu ${monthlyProgress}% da meta mensal. Reforce campanhas e orçamentos parados.`,
      actionLabel: "Ver campanhas",
      actionHref: "/crm/campanhas",
      priority: 100,
    });
  }

  if (overdueRevenue > 0) {
    alerts.push({
      id: "overdue-revenue",
      area: "financeiro",
      severity: "critico",
      title: "Valores vencidos em aberto",
      description: `Existem ${formatCurrency(
        overdueRevenue
      )} em valores vencidos ou pendentes que podem impactar o caixa.`,
      actionLabel: "Abrir financeiro",
      actionHref: "/financeiro",
      priority: 95,
    });
  }

  if (riskPatients >= 5) {
    alerts.push({
      id: "risk-patients",
      area: "crm",
      severity: "atencao",
      title: "Pacientes com risco de abandono",
      description: `${riskPatients} paciente(s) estão com alto risco de abandono. Uma campanha de recuperação pode reduzir perda de relacionamento.`,
      actionLabel: "Abrir CRM",
      actionHref: "/crm",
      priority: 90,
    });
  }

  if (openBudgetsCount >= 3 || openBudgetsRevenue >= 3000) {
    alerts.push({
      id: "open-budgets",
      area: "comercial",
      severity: "oportunidade",
      title: "Orçamentos parados com potencial",
      description: `${openBudgetsCount} orçamento(s) em aberto somam aproximadamente ${formatCurrency(
        openBudgetsRevenue
      )}. Priorize os pacientes com maior score.`,
      actionLabel: "Ver campanhas",
      actionHref: "/crm/campanhas",
      priority: 86,
    });
  }

  if (hotPatients >= 5) {
    alerts.push({
      id: "hot-patients",
      area: "comercial",
      severity: "oportunidade",
      title: "Pacientes quentes para contato",
      description: `${hotPatients} paciente(s) possuem alta chance de fechamento. Esta é a melhor fila para a recepção priorizar.`,
      actionLabel: "Ver BI Executivo",
      actionHref: "/dashboard/executivo",
      priority: 82,
    });
  }

  if (todayAppointments === 0) {
    alerts.push({
      id: "empty-agenda",
      area: "agenda",
      severity: "atencao",
      title: "Agenda do dia vazia",
      description:
        "Não há consultas registradas para hoje. Considere acionar pacientes em retorno, limpeza ou orçamento parado.",
      actionLabel: "Abrir agenda",
      actionHref: "/agenda",
      priority: 78,
    });
  } else if (todayOccupancy > 0 && todayOccupancy < 35) {
    alerts.push({
      id: "low-occupancy",
      area: "agenda",
      severity: "atencao",
      title: "Baixa ocupação da agenda",
      description: `A ocupação estimada de hoje está em ${todayOccupancy}%. Há espaço para encaixes e retornos preventivos.`,
      actionLabel: "Abrir CRM",
      actionHref: "/crm",
      priority: 76,
    });
  }

  if (noShowsMonth >= 3) {
    alerts.push({
      id: "no-shows",
      area: "agenda",
      severity: "atencao",
      title: "Faltas acima do ideal",
      description: `${noShowsMonth} falta(s) foram registradas no mês. Reforce confirmação e lembretes pré-consulta.`,
      actionLabel: "Abrir agenda",
      actionHref: "/agenda",
      priority: 74,
    });
  }

  if (averageScore > 0 && averageScore < 45) {
    alerts.push({
      id: "low-score",
      area: "crm",
      severity: "atencao",
      title: "Score médio comercial baixo",
      description: `O score médio dos pacientes está em ${averageScore}/100. O relacionamento comercial precisa ser reativado.`,
      actionLabel: "Abrir CRM",
      actionHref: "/crm",
      priority: 72,
    });
  }

  if (coldPatients >= 10) {
    alerts.push({
      id: "cold-patients",
      area: "crm",
      severity: "atencao",
      title: "Muitos pacientes frios",
      description: `${coldPatients} paciente(s) estão com baixa chance comercial. Campanhas leves de relacionamento podem reaquecer a base.`,
      actionLabel: "Ver campanhas",
      actionHref: "/crm/campanhas",
      priority: 70,
    });
  }

  if (sourceWithoutOriginCount >= 10) {
    alerts.push({
      id: "missing-source",
      area: "marketing",
      severity: "atencao",
      title: "Muitos pacientes sem origem",
      description: `${sourceWithoutOriginCount} paciente(s) não possuem origem cadastrada. Isso prejudica a análise de ROI do marketing.`,
      actionLabel: "Abrir pacientes",
      actionHref: "/pacientes",
      priority: 62,
    });
  }

  if (campaignRevenueProjection >= 5000) {
    alerts.push({
      id: "campaign-opportunity",
      area: "marketing",
      severity: "oportunidade",
      title: "Campanhas com bom potencial",
      description: `As campanhas atuais projetam aproximadamente ${formatCurrency(
        campaignRevenueProjection
      )} em oportunidades comerciais.`,
      actionLabel: "Ver campanhas",
      actionHref: "/crm/campanhas",
      priority: 60,
    });
  }

  if (vipPatients >= 3) {
    alerts.push({
      id: "vip-opportunity",
      area: "comercial",
      severity: "oportunidade",
      title: "Base VIP ativa",
      description: `${vipPatients} paciente(s) VIP podem ser trabalhados com abordagem premium e planejamento contínuo.`,
      actionLabel: "Ver BI Executivo",
      actionHref: "/dashboard/executivo",
      priority: 58,
    });
  }

  if (
    input.chanceToHitGoal === "Alta" &&
    monthlyProgress >= 70 &&
    probableRevenue >= monthlyGoal
  ) {
    alerts.push({
      id: "goal-positive",
      area: "metas",
      severity: "positivo",
      title: "Boa chance de bater a meta",
      description: `A projeção provável está em ${formatCurrency(
        probableRevenue
      )}, acima da meta mensal de ${formatCurrency(monthlyGoal)}.`,
      actionLabel: "Ver BI Executivo",
      actionHref: "/dashboard/executivo",
      priority: 50,
    });
  }

  if (potentialRevenue > probableRevenue && potentialRevenue >= monthlyGoal * 1.2) {
    alerts.push({
      id: "potential-positive",
      area: "comercial",
      severity: "positivo",
      title: "Potencial comercial acima da meta",
      description: `O potencial comercial estimado chegou a ${formatCurrency(
        potentialRevenue
      )}. O foco deve ser converter pacientes quentes e orçamentos abertos.`,
      actionLabel: "Ver campanhas",
      actionHref: "/crm/campanhas",
      priority: 45,
    });
  }

  if (conversionProjection >= 35) {
    alerts.push({
      id: "conversion-positive",
      area: "comercial",
      severity: "positivo",
      title: "Conversão projetada saudável",
      description: `A conversão projetada está em ${conversionProjection}%, indicando boa qualidade das oportunidades comerciais.`,
      actionLabel: "Ver CRM",
      actionHref: "/crm",
      priority: 42,
    });
  }

  const sortedAlerts = sortAlerts(alerts).slice(0, 12);

  const criticalCount = sortedAlerts.filter(
    (alert) => alert.severity === "critico"
  ).length;

  const opportunityCount = sortedAlerts.filter(
    (alert) => alert.severity === "oportunidade"
  ).length;

  const positiveCount = sortedAlerts.filter(
    (alert) => alert.severity === "positivo"
  ).length;

  return {
    alerts: sortedAlerts,
    criticalCount,
    opportunityCount,
    positiveCount,
    mainMessage: buildMainMessage({
      criticalCount,
      opportunityCount,
      positiveCount,
    }),
  };
}
