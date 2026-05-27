"use client";

export type StrategicPatient = {
  id: string;
  name?: string | null;
  phone?: string | null;
  patient_source?: string | null;
  source?: string | null;
  origin?: string | null;
  created_at?: string | null;
};

export type StrategicAppointment = {
  id: string;
  patient_id?: string | null;
  date?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type StrategicBudget = {
  id: string;
  patient_id?: string | null;
  status?: string | null;
  total?: number | string | null;
  created_at?: string | null;
};

export type StrategicFinancialRecord = {
  id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  due_date?: string | null;
  created_at?: string | null;
};

export type StrategicTreatment = {
  id: string;
  patient_id?: string | null;
  procedure_name?: string | null;
  treatment_name?: string | null;
  title?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type StrategicRecommendation = {
  id: string;
  title: string;
  description: string;
  action: string;
  severity: "critico" | "atencao" | "oportunidade" | "positivo";
  area: "Financeiro" | "CRM" | "Agenda" | "Marketing" | "Administração";
};

export type StrategicSocialPost = {
  id: string;
  title: string;
  content: string;
  objective: string;
};

export type StrategicPatientOpportunity = {
  id: string;
  name: string;
  score: number;
  reason: string;
};

export type StrategicAnalysisResult = {
  totalPatients: number;
  inactivePatientsCount: number;
  openBudgetValue: number;
  overdueValue: number;
  implantTreatmentsCount: number;
  diagnosis: string;
  recommendations: StrategicRecommendation[];
  socialPosts: StrategicSocialPost[];
  patientOpportunities: StrategicPatientOpportunity[];
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

  return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getPatientSource(patient: StrategicPatient) {
  const source = String(
    patient.patient_source || patient.source || patient.origin || "",
  ).trim();

  return source || "Origem não informada";
}

function getTreatmentText(treatment: StrategicTreatment) {
  return String(
    treatment.procedure_name ||
      treatment.treatment_name ||
      treatment.title ||
      "",
  ).toLowerCase();
}

function calculateOpenBudgetValue(budgets: StrategicBudget[]) {
  return budgets
    .filter((budget) => {
      const status = normalizeStatus(budget.status);
      return !isApprovedStatus(status) && !isRejectedStatus(status);
    })
    .reduce((sum, budget) => sum + parseMoney(budget.total), 0);
}

function calculateOverdueValue(financialRecords: StrategicFinancialRecord[]) {
  return financialRecords
    .filter((record) => {
      const dueDate = getDateAtNoon(record.due_date);
      if (!dueDate) return false;

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      return (
        dueDate.getTime() < today.getTime() && !isPaidStatus(record.status)
      );
    })
    .reduce((sum, record) => {
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      return sum + Math.max(0, amount - paid);
    }, 0);
}

function getInactivePatients(
  patients: StrategicPatient[],
  appointments: StrategicAppointment[],
) {
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

    return days !== null && days >= 180;
  });
}

function getImplantTreatments(treatments: StrategicTreatment[]) {
  return treatments.filter((treatment) => {
    const text = getTreatmentText(treatment);
    return text.includes("implante") || text.includes("protocolo");
  });
}

function getPatientOpportunities(params: {
  patients: StrategicPatient[];
  appointments: StrategicAppointment[];
  budgets: StrategicBudget[];
  financialRecords: StrategicFinancialRecord[];
}) {
  const { patients, appointments, budgets, financialRecords } = params;

  return patients
    .map((patient) => {
      const patientFinancial = financialRecords.filter(
        (record) => record.patient_id === patient.id,
      );

      const patientBudgets = budgets.filter(
        (budget) => budget.patient_id === patient.id,
      );

      const patientAppointments = appointments.filter(
        (appointment) => appointment.patient_id === patient.id,
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
        if (
          isApprovedStatus(budget.status) ||
          isRejectedStatus(budget.status)
        ) {
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
            sourceBonus,
        ),
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
}

function buildDiagnosis(params: {
  inactivePatientsCount: number;
  openBudgetValue: number;
  overdueValue: number;
  implantTreatmentsCount: number;
}) {
  const {
    inactivePatientsCount,
    openBudgetValue,
    overdueValue,
    implantTreatmentsCount,
  } = params;

  if (overdueValue >= 5000 && openBudgetValue >= 10000) {
    return "A clínica apresenta potencial comercial em aberto, mas precisa reforçar controle financeiro e recuperação de valores vencidos.";
  }

  if (openBudgetValue >= 20000) {
    return "A clínica possui boa geração de oportunidades, porém precisa transformar orçamentos pendentes em tratamentos iniciados.";
  }

  if (inactivePatientsCount >= 20) {
    return "Existe uma base relevante de pacientes antigos que pode ser reativada com campanhas simples e contato humanizado.";
  }

  if (implantTreatmentsCount >= 5) {
    return "Há sinais de força em tratamentos de maior ticket, especialmente implantes e reabilitações.";
  }

  return "A clínica está estável nesta leitura. O foco recomendado é manter rotina semanal de análise, recuperação de oportunidades e relacionamento ativo.";
}

function buildRecommendations(params: {
  inactivePatientsCount: number;
  openBudgetValue: number;
  overdueValue: number;
  implantTreatmentsCount: number;
}) {
  const {
    inactivePatientsCount,
    openBudgetValue,
    overdueValue,
    implantTreatmentsCount,
  } = params;

  const recommendations: StrategicRecommendation[] = [];

  if (overdueValue >= 5000) {
    recommendations.push({
      id: "financeiro-inadimplencia",
      title: "Revisar inadimplência em aberto",
      description: `A inadimplência atual está em ${formatCurrency(
        overdueValue,
      )}. Isso merece acompanhamento próximo para evitar perda de previsibilidade financeira.`,
      action:
        "Priorize contato com pacientes de maior saldo, revise parcelamentos e ofereça negociação simples.",
      severity: "atencao",
      area: "Financeiro",
    });
  }

  if (openBudgetValue >= 20000) {
    recommendations.push({
      id: "crm-orcamentos-pendentes",
      title: "Recuperar orçamentos pendentes",
      description: `Existem ${formatCurrency(
        openBudgetValue,
      )} em orçamentos ainda não convertidos.`,
      action:
        "Faça follow-up humano dos maiores orçamentos e ofereça um próximo passo objetivo: avaliação, ajuste do plano ou condição de pagamento.",
      severity: "oportunidade",
      area: "CRM",
    });
  }

  if (inactivePatientsCount >= 10) {
    recommendations.push({
      id: "marketing-reativacao",
      title: "Ativar pacientes antigos",
      description: `${inactivePatientsCount} pacientes estão sem retorno há mais de 180 dias.`,
      action:
        "Crie campanha de revisão preventiva, limpeza ou acompanhamento, começando pelos pacientes com histórico de tratamento.",
      severity: "oportunidade",
      area: "Marketing",
    });
  }

  if (implantTreatmentsCount >= 5) {
    recommendations.push({
      id: "marketing-implantes",
      title: "Explorar tratamentos de alto ticket",
      description:
        "O histórico da clínica indica presença relevante de implantes ou reabilitações.",
      action:
        "Publique conteúdos educativos sobre implantes e crie campanha para pacientes com perfil premium ou orçamento pendente.",
      severity: "positivo",
      area: "Marketing",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "administracao-rotina",
      title: "Manter rotina de gestão estratégica",
      description:
        "Não há alerta crítico nesta leitura, o que sugere estabilidade operacional.",
      action:
        "Faça uma revisão semanal de orçamentos, pacientes sem retorno, agenda ociosa e conteúdo de relacionamento.",
      severity: "positivo",
      area: "Administração",
    });
  }

  return recommendations;
}

function buildSocialPosts(params: {
  inactivePatientsCount: number;
  openBudgetValue: number;
  implantTreatmentsCount: number;
}) {
  const { inactivePatientsCount, openBudgetValue, implantTreatmentsCount } =
    params;

  const permanentPosts: StrategicSocialPost[] = [
    {
      id: "post-limpeza",
      title: "Limpeza profissional",
      objective: "Conteúdo educativo permanente",
      content:
        "A limpeza profissional ajuda a prevenir gengivite, mau hálito e acúmulo de tártaro. Manter esse cuidado em dia é uma forma simples de proteger sua saúde bucal. 🦷✨",
    },
    {
      id: "post-checkup",
      title: "Check-up odontológico",
      objective: "Estimular revisões periódicas",
      content:
        "Mesmo sem dor, o acompanhamento odontológico regular é essencial. Muitas alterações bucais começam silenciosamente e são mais simples de tratar quando identificadas no início.",
    },
    {
      id: "post-gengiva",
      title: "Saúde gengival",
      objective: "Conscientização periodontal",
      content:
        "Sangramento na gengiva não deve ser ignorado. Esse pode ser um sinal de inflamação e merece avaliação profissional para evitar que o problema avance.",
    },
    {
      id: "post-clareamento",
      title: "Clareamento dental",
      objective: "Estimular estética e autoestima",
      content:
        "Um sorriso mais claro pode melhorar a autoestima, mas o clareamento dental precisa de avaliação e acompanhamento profissional para ser feito com segurança.",
    },
    {
      id: "post-prevencao-infantil",
      title: "Odontologia infantil",
      objective: "Educação preventiva",
      content:
        "Levar a criança ao dentista regularmente ajuda a criar bons hábitos desde cedo. A prevenção torna as consultas mais tranquilas e evita problemas futuros. 🧒🦷",
    },
    {
      id: "post-sensibilidade",
      title: "Sensibilidade dental",
      objective: "Atrair pacientes com sintomas comuns",
      content:
        "Sentir dor ou incômodo com alimentos frios, quentes ou doces pode indicar sensibilidade dental. Uma avaliação ajuda a identificar a causa e orientar o melhor cuidado.",
    },
    {
      id: "post-estetica",
      title: "Estética do sorriso",
      objective: "Fortalecer tratamentos estéticos",
      content:
        "Pequenos detalhes podem transformar a harmonia do sorriso. O planejamento estético avalia saúde, função e naturalidade antes de qualquer procedimento. ✨",
    },
    {
      id: "post-manutencao",
      title: "Manutenção preventiva",
      objective: "Reforçar acompanhamento contínuo",
      content:
        "Cuidar do sorriso não é apenas tratar quando dói. Consultas preventivas ajudam a manter a saúde bucal em dia e reduzem o risco de tratamentos mais complexos.",
    },
  ];

  const strategicPosts: StrategicSocialPost[] = [];

  if (inactivePatientsCount >= 10) {
    strategicPosts.push({
      id: "post-prevencao-retorno",
      title: "Prevenção e retorno",
      objective: "Reativar pacientes antigos",
      content:
        "Faz tempo que você não faz uma revisão odontológica? 🦷 Pequenas alterações podem passar despercebidas no início. A prevenção ajuda a evitar tratamentos maiores e mantém seu sorriso saudável.",
    });
  }

  if (openBudgetValue >= 10000) {
    strategicPosts.push({
      id: "post-planejamento",
      title: "Planejamento odontológico",
      objective: "Estimular pacientes com orçamento pendente",
      content:
        "Cada sorriso precisa de um plano individualizado ✨ Com planejamento adequado, é possível organizar etapas, prioridades e formas de pagamento com mais tranquilidade.",
    });
  }

  if (implantTreatmentsCount >= 5) {
    strategicPosts.push({
      id: "post-implantes",
      title: "Implantes dentários",
      objective: "Fortalecer autoridade em tratamentos de alto ticket",
      content:
        "Perder um dente não afeta apenas a estética. Também pode interferir na mastigação, na fala e na segurança ao sorrir. Os implantes dentários podem devolver função e confiança.",
    });
  }

  const allPosts = [...strategicPosts, ...permanentPosts];

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const daySeed = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));

  const rotatedPosts = allPosts
    .map((post, index) => ({
      post,
      order:
        (post.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) +
          daySeed +
          index * 17) %
        997,
    }))
    .sort((a, b) => a.order - b.order)
    .map((item) => item.post);

  return rotatedPosts.slice(0, 4);
}

export function generateStrategicAnalysis(params: {
  patients: StrategicPatient[];
  appointments: StrategicAppointment[];
  budgets: StrategicBudget[];
  financialRecords: StrategicFinancialRecord[];
  treatments: StrategicTreatment[];
}): StrategicAnalysisResult {
  const { patients, appointments, budgets, financialRecords, treatments } =
    params;

  const totalPatients = patients.length;
  const inactivePatients = getInactivePatients(patients, appointments);
  const openBudgetValue = calculateOpenBudgetValue(budgets);
  const overdueValue = calculateOverdueValue(financialRecords);
  const implantTreatments = getImplantTreatments(treatments);

  const baseParams = {
    inactivePatientsCount: inactivePatients.length,
    openBudgetValue,
    overdueValue,
    implantTreatmentsCount: implantTreatments.length,
  };

  return {
    totalPatients,
    inactivePatientsCount: inactivePatients.length,
    openBudgetValue,
    overdueValue,
    implantTreatmentsCount: implantTreatments.length,
    diagnosis: buildDiagnosis(baseParams),
    recommendations: buildRecommendations(baseParams),
    socialPosts: buildSocialPosts(baseParams),
    patientOpportunities: getPatientOpportunities({
      patients,
      appointments,
      budgets,
      financialRecords,
    }),
  };
}
