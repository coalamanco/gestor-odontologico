"use client";

import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  DollarSign,
  Lightbulb,
  Megaphone,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export type StrategicWeeklyOrientationProps = {
  openBudgetValue: number;
  overdueValue: number;
  inactivePatientsCount: number;
  implantTreatmentsCount: number;
  totalPatients: number;
};

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getStrategicReading({
  openBudgetValue,
  overdueValue,
  inactivePatientsCount,
  implantTreatmentsCount,
  totalPatients,
}: StrategicWeeklyOrientationProps) {
  if (overdueValue >= 5000 && openBudgetValue >= 10000) {
    return {
      title: "Foco da semana: proteger caixa e recuperar oportunidades",
      text:
        `A clínica possui ${formatCurrency(
          overdueValue,
        )} em valores vencidos e ${formatCurrency(
          openBudgetValue,
        )} em orçamentos pendentes. A postura mais inteligente é agir em duas frentes: cobrança preventiva com tom humanizado e recuperação dos orçamentos de maior valor.`,
      priority: "Alta prioridade",
      tone: "border-amber-100 bg-amber-50 text-amber-900",
      icon: AlertTriangle,
    };
  }

  if (openBudgetValue >= 15000) {
    return {
      title: "Foco da semana: converter orçamentos pendentes",
      text:
        `O maior potencial imediato está nos orçamentos ainda não fechados, somando ${formatCurrency(
          openBudgetValue,
        )}. A recomendação é priorizar os pacientes com maior valor e oferecer uma decisão simples: ajustar o plano, parcelar ou agendar uma nova conversa.`,
      priority: "Oportunidade comercial",
      tone: "border-cyan-100 bg-cyan-50 text-cyan-900",
      icon: DollarSign,
    };
  }

  if (inactivePatientsCount >= 10) {
    return {
      title: "Foco da semana: reativar pacientes antigos",
      text:
        `Existem ${inactivePatientsCount} pacientes sem retorno há mais de 180 dias. Essa base pode gerar movimento na agenda com campanhas de revisão, limpeza e prevenção, sem depender apenas de novos pacientes.`,
      priority: "Relacionamento",
      tone: "border-emerald-100 bg-emerald-50 text-emerald-900",
      icon: Megaphone,
    };
  }

  if (implantTreatmentsCount >= 5) {
    return {
      title: "Foco da semana: fortalecer posicionamento premium",
      text:
        "Os dados indicam presença relevante de implantes ou reabilitações. Vale reforçar autoridade com conteúdos educativos, casos explicativos e abordagem consultiva para tratamentos de maior ticket.",
      priority: "Crescimento premium",
      tone: "border-violet-100 bg-violet-50 text-violet-900",
      icon: TrendingUp,
    };
  }

  return {
    title: "Foco da semana: manter consistência operacional",
    text:
      `A operação está estável com ${totalPatients} pacientes cadastrados. A recomendação é manter rotina de revisão semanal: orçamentos, retornos, agenda ociosa e conteúdos de relacionamento.`,
    priority: "Estabilidade",
    tone: "border-slate-100 bg-slate-50 text-slate-900",
    icon: CheckCircle2,
  };
}

export default function StrategicWeeklyOrientation(props: StrategicWeeklyOrientationProps) {
  const reading = getStrategicReading(props);
  const Icon = reading.icon;

  const actions = [
    {
      title: "Ação administrativa",
      text: "Separar 30 minutos na semana para revisar orçamentos pendentes, vencidos e pacientes estratégicos.",
      icon: Brain,
    },
    {
      title: "Ação comercial",
      text: "Priorizar contato humano com pacientes de maior potencial antes de disparar campanhas amplas.",
      icon: Lightbulb,
    },
    {
      title: "Ação de marketing",
      text: "Publicar um conteúdo curto alinhado ao foco da semana e usar a recepção para reforçar a mesma mensagem.",
      icon: Sparkles,
    },
  ];

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#239d9a]/10 p-3 text-[#239d9a]">
            <Brain className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-800">
              Consultor Estratégico da Semana
            </h2>

            <p className="text-sm text-slate-500">
              Interpretação prática dos dados, sem repetir os dashboards.
            </p>
          </div>
        </div>

        <span className="w-fit rounded-full bg-[#239d9a]/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-[#239d9a]">
          IA local
        </span>
      </div>

      <div className={`rounded-2xl border p-5 ${reading.tone}`}>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white/70 p-2">
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black">{reading.title}</h3>

              <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                {reading.priority}
              </span>
            </div>

            <p className="text-sm leading-6 opacity-90">{reading.text}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
        {actions.map((action) => {
          const ActionIcon = action.icon;

          return (
            <div
              key={action.title}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-xl bg-white p-2 text-[#239d9a]">
                  <ActionIcon className="h-4 w-4" />
                </div>

                <h4 className="font-black text-slate-800">{action.title}</h4>
              </div>

              <p className="text-sm leading-6 text-slate-600">{action.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
