export type CrmScorePatient = {
    id?: string | null;
    name?: string | null;
    patient_source?: string | null;
    created_at?: string | null;
  };
  
  export type CrmScoreAppointment = {
    id?: string | null;
    patient_id?: string | null;
    date?: string | null;
    start_time?: string | null;
    status?: string | null;
    created_at?: string | null;
  };
  
  export type CrmScoreBudget = {
    id?: string | null;
    patient_id?: string | null;
    status?: string | null;
    total?: number | string | null;
    created_at?: string | null;
    approved_at?: string | null;
  };
  
  export type CrmScoreFinancialRecord = {
    id?: string | null;
    patient_id?: string | null;
    amount?: number | string | null;
    paid_amount?: number | string | null;
    status?: string | null;
    created_at?: string | null;
    paid_at?: string | null;
  };
  
  export type CrmScoreTreatment = {
    id?: string | null;
    patient_id?: string | null;
    status?: string | null;
    total?: number | string | null;
    unit_price?: number | string | null;
    created_at?: string | null;
    completed_at?: string | null;
  };
  
  export type CrmScoreClinicalNote = {
    id?: string | null;
    patient_id?: string | null;
    title?: string | null;
    content?: string | null;
    note?: string | null;
    created_at?: string | null;
  };
  
  export type CrmScoreInput = {
    patient?: CrmScorePatient | null;
    appointments?: CrmScoreAppointment[];
    budgets?: CrmScoreBudget[];
    financialRecords?: CrmScoreFinancialRecord[];
    treatments?: CrmScoreTreatment[];
    clinicalNotes?: CrmScoreClinicalNote[];
  };
  
  export type CrmScoreResult = {
    score: number;
    closingChance: number;
    abandonmentRisk: "Baixo" | "Médio" | "Alto";
    financialPotential: "Baixo" | "Médio" | "Alto";
    vipLevel: "Bronze" | "Prata" | "Ouro" | "Diamante";
    bestApproach: string;
    lastCRMContact: string;
    totalPaid: number;
    totalOpen: number;
    approvedBudgets: number;
    openBudgets: number;
    appointmentsCount: number;
    daysWithoutReturn: number | null;
  };
  
  export function parseCrmMoney(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return 0;
  
    if (typeof value === "number") return value;
  
    const normalized = String(value)
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();
  
    return Number(normalized) || 0;
  }
  
  export function normalizeCrmStatus(status?: string | null) {
    return String(status || "").trim().toLowerCase();
  }
  
  export function isApprovedBudgetStatus(status?: string | null) {
    const normalized = normalizeCrmStatus(status);
  
    return (
      normalized === "approved" ||
      normalized === "aprovado" ||
      normalized === "aprovada" ||
      normalized === "fechado" ||
      normalized === "fechada"
    );
  }
  
  export function isRejectedBudgetStatus(status?: string | null) {
    const normalized = normalizeCrmStatus(status);
  
    return (
      normalized === "reprovado" ||
      normalized === "reprovada" ||
      normalized === "cancelado" ||
      normalized === "cancelada" ||
      normalized === "rejected"
    );
  }
  
  export function isPaidFinancialStatus(status?: string | null) {
    const normalized = normalizeCrmStatus(status);
  
    return (
      normalized === "paid" ||
      normalized === "pago" ||
      normalized === "paga" ||
      normalized === "recebido" ||
      normalized === "quitado"
    );
  }
  
  export function getCrmDate(value?: string | null) {
    if (!value) return null;
  
    const raw = String(value).trim();
  
    if (!raw) return null;
  
    if (raw.includes("/")) {
      const parts = raw.split("/");
  
      if (parts.length === 3) {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);
        const date = new Date(year, month, day, 12, 0, 0);
  
        if (!Number.isNaN(date.getTime())) return date;
      }
    }
  
    const clean = raw.split("T")[0];
    const date = new Date(`${clean}T12:00:00`);
  
    if (Number.isNaN(date.getTime())) return null;
  
    return date;
  }
  
  export function daysBetweenCrmDates(from: Date, to = new Date()) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
  
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
  
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  export function formatCrmDateBr(value?: string | null) {
    const date = getCrmDate(value);
  
    if (!date) return "Sem contato recente";
  
    return date.toLocaleDateString("pt-BR");
  }
  
  export function normalizePatientSource(value?: string | null) {
    const source = String(value || "").trim();
  
    if (!source) return "Não informado";
  
    const lower = source.toLowerCase();
  
    if (lower.includes("insta")) return "Instagram";
    if (lower.includes("google")) return "Google";
    if (lower.includes("indic")) return "Indicação";
    if (lower.includes("whats")) return "WhatsApp";
    if (lower.includes("face")) return "Facebook";
    if (lower.includes("tiktok") || lower.includes("tik tok")) return "TikTok";
  
    if (
      lower.includes("tráfego") ||
      lower.includes("trafego") ||
      lower.includes("pago")
    ) {
      return "Tráfego Pago";
    }
  
    if (lower.includes("site")) return "Site";
    if (lower.includes("conv")) return "Convênio";
  
    return source;
  }
  
  function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  
  function getVipLevel(totalPaid: number): CrmScoreResult["vipLevel"] {
    if (totalPaid >= 10000) return "Diamante";
    if (totalPaid >= 5000) return "Ouro";
    if (totalPaid >= 3000) return "Prata";
  
    return "Bronze";
  }
  
  function getFinancialPotential(totalPaid: number, openBudgetTotal: number) {
    const commercialValue = totalPaid + openBudgetTotal;
  
    if (commercialValue >= 8000) return "Alto";
    if (commercialValue >= 2500) return "Médio";
  
    return "Baixo";
  }
  
  function getLatestDate(values: Array<string | null | undefined>) {
    const dates = values
      .map((value) => getCrmDate(value))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime());
  
    return dates[0] || null;
  }
  
  function getLastCRMContact(clinicalNotes: CrmScoreClinicalNote[]) {
    const crmNotes = clinicalNotes.filter((note) => {
      const text = `${note.title || ""} ${note.content || ""} ${note.note || ""}`;
      return text.toLowerCase().includes("crm");
    });
  
    const latest = getLatestDate(crmNotes.map((note) => note.created_at));
  
    if (!latest) return "Sem contato recente";
  
    return latest.toLocaleDateString("pt-BR");
  }
  
  function getBestApproach(params: {
    source: string;
    abandonmentRisk: CrmScoreResult["abandonmentRisk"];
    financialPotential: CrmScoreResult["financialPotential"];
    openBudgets: number;
    daysWithoutReturn: number | null;
  }) {
    const {
      source,
      abandonmentRisk,
      financialPotential,
      openBudgets,
      daysWithoutReturn,
    } = params;
  
    if (openBudgets > 0) {
      return "Retomar orçamento com abordagem consultiva e facilitar forma de pagamento.";
    }
  
    if (abandonmentRisk === "Alto") {
      return "Contato acolhedor de recuperação, sem pressão comercial, oferecendo avaliação de retorno.";
    }
  
    if (financialPotential === "Alto") {
      return "Abordagem premium, destacando planejamento completo e continuidade do tratamento.";
    }
  
    if (daysWithoutReturn !== null && daysWithoutReturn >= 180) {
      return "Convidar para revisão preventiva e atualização do plano de cuidados.";
    }
  
    if (source === "Indicação") {
      return "Valorizar confiança da indicação e reforçar atendimento personalizado.";
    }
  
    if (source === "Instagram" || source === "Google" || source === "Tráfego Pago") {
      return "Usar abordagem objetiva, reforçando diferenciais do consultório e facilidade de agendamento.";
    }
  
    return "Abordagem leve de relacionamento, perguntando como o paciente está e oferecendo retorno.";
  }
  
  export function calculatePatientCrmScore(input: CrmScoreInput): CrmScoreResult {
    const patient = input.patient || null;
    const appointments = input.appointments || [];
    const budgets = input.budgets || [];
    const financialRecords = input.financialRecords || [];
    const treatments = input.treatments || [];
    const clinicalNotes = input.clinicalNotes || [];
  
    const today = new Date();
  
    const pastAppointments = appointments.filter((appointment) => {
      const date = getCrmDate(appointment.date || appointment.created_at);
      return date ? date.getTime() <= today.getTime() : false;
    });
  
    const futureAppointments = appointments.filter((appointment) => {
      const date = getCrmDate(appointment.date || appointment.created_at);
      return date ? date.getTime() > today.getTime() : false;
    });
  
    const latestAppointmentDate = getLatestDate(
      pastAppointments.map((appointment) => appointment.date || appointment.created_at)
    );
  
    const daysWithoutReturn = latestAppointmentDate
      ? daysBetweenCrmDates(latestAppointmentDate, today)
      : null;
  
    const approvedBudgets = budgets.filter((budget) =>
      isApprovedBudgetStatus(budget.status)
    ).length;
  
    const openBudgetsList = budgets.filter((budget) => {
      const status = normalizeCrmStatus(budget.status);
  
      return Boolean(status) && !isApprovedBudgetStatus(status) && !isRejectedBudgetStatus(status);
    });
  
    const openBudgets = openBudgetsList.length;
  
    const openBudgetTotal = openBudgetsList.reduce(
      (sum, budget) => sum + parseCrmMoney(budget.total),
      0
    );
  
    const totalPaid = financialRecords.reduce((sum, record) => {
      const paidAmount = parseCrmMoney(record.paid_amount);
      const amount = parseCrmMoney(record.amount);
  
      if (paidAmount > 0) return sum + paidAmount;
      if (isPaidFinancialStatus(record.status)) return sum + amount;
  
      return sum;
    }, 0);
  
    const totalOpen = financialRecords.reduce((sum, record) => {
      const amount = parseCrmMoney(record.amount);
      const paidAmount = parseCrmMoney(record.paid_amount);
  
      return sum + Math.max(0, amount - paidAmount);
    }, 0);
  
    const completedTreatments = treatments.filter((treatment) => {
      const status = normalizeCrmStatus(treatment.status);
      return status === "finalizado" || status === "concluido" || status === "concluído";
    }).length;
  
    const activeTreatments = treatments.filter((treatment) => {
      const status = normalizeCrmStatus(treatment.status);
      return status !== "finalizado" && status !== "concluido" && status !== "concluído";
    }).length;
  
    const crmInteractions = clinicalNotes.filter((note) => {
      const text = `${note.title || ""} ${note.content || ""} ${note.note || ""}`;
      return text.toLowerCase().includes("crm");
    }).length;
  
    let score = 35;
  
    score += Math.min(15, pastAppointments.length * 2);
    score += Math.min(15, approvedBudgets * 5);
    score += Math.min(10, completedTreatments * 3);
    score += Math.min(10, activeTreatments * 2);
    score += Math.min(15, Math.floor(totalPaid / 1000) * 2);
    score += Math.min(8, crmInteractions * 2);
  
    if (futureAppointments.length > 0) score += 10;
    if (openBudgets > 0) score += 6;
    if (openBudgetTotal >= 3000) score += 6;
  
    if (daysWithoutReturn !== null) {
      if (daysWithoutReturn >= 365) score -= 25;
      else if (daysWithoutReturn >= 180) score -= 18;
      else if (daysWithoutReturn >= 90) score -= 10;
      else if (daysWithoutReturn <= 30) score += 5;
    }
  
    if (totalOpen > totalPaid && totalOpen > 0) score -= 8;
  
    const finalScore = clampScore(score);
  
    let abandonmentRisk: CrmScoreResult["abandonmentRisk"] = "Baixo";
  
    if (
      (daysWithoutReturn !== null && daysWithoutReturn >= 180) ||
      (openBudgets > 0 && daysWithoutReturn !== null && daysWithoutReturn >= 60)
    ) {
      abandonmentRisk = "Alto";
    } else if (
      (daysWithoutReturn !== null && daysWithoutReturn >= 90) ||
      openBudgets > 0 ||
      totalOpen > 0
    ) {
      abandonmentRisk = "Médio";
    }
  
    const financialPotential = getFinancialPotential(totalPaid, openBudgetTotal);
    const vipLevel = getVipLevel(totalPaid);
  
    let closingChance = finalScore;
  
    if (openBudgets > 0) closingChance += 8;
    if (futureAppointments.length > 0) closingChance += 6;
    if (approvedBudgets > 0) closingChance += 5;
    if (abandonmentRisk === "Alto") closingChance -= 15;
    if (abandonmentRisk === "Médio") closingChance -= 7;
  
    closingChance = clampScore(closingChance);
  
    const source = normalizePatientSource(patient?.patient_source);
  
    return {
      score: finalScore,
      closingChance,
      abandonmentRisk,
      financialPotential,
      vipLevel,
      bestApproach: getBestApproach({
        source,
        abandonmentRisk,
        financialPotential,
        openBudgets,
        daysWithoutReturn,
      }),
      lastCRMContact: getLastCRMContact(clinicalNotes),
      totalPaid,
      totalOpen,
      approvedBudgets,
      openBudgets,
      appointmentsCount: appointments.length,
      daysWithoutReturn,
    };
  }
  