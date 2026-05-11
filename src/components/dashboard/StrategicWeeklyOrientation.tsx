"use client";

import {
  AlertTriangle,
  Brain,
  CalendarClock,
  DollarSign,
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

export default function StrategicWeeklyOrientation({
  openBudgetValue,
  overdueValue,
  inactivePatientsCount,
  implantTreatmentsCount,
  totalPatients,
}: StrategicWeeklyOrientationProps) {
  const insights: Array<{
    icon: typeof Brain;
    title: string;
    description: string;
    tone: string;
  }> = [];

  if (openBudgetValue >= 15000) {
    insights.push({
      icon: DollarSign,
      title: "Potencial financeiro represado",
      description: `A clínica possui ${formatCurrency(
        openBudgetValue
      )} em orçamentos pendentes. O maior crescimento imediato provavelmente está na recuperação comercial desses pacientes.`,
      tone: "border-cyan-100 bg-cyan-50 text-cyan-800",
    });
  }

  if (overdueValue >= 5000) {
    insights.push({
      icon: AlertTriangle,
      title: "Atenção financeira",
      description: `A inadimplência atual está em ${formatCurrency(
        overdueValue
      )}. Reforçar negociação preventiva pode melhorar a previsibilidade do caixa.`,
      tone: "border-amber-100 bg-amber-50 text-amber-800",
    });
  }

  if (inactivePatientsCount >= 10) {
    insights.push({
      icon: CalendarClock,
      title: "Oportunidade de reativação",
      description: `${inactivePatientsCount} pacientes estão sem retorno há mais de 180 dias. Existe potencial de crescimento com campanhas simples de revisão e prevenção.`,
      tone: "border-emerald-100 bg-emerald-50 text-emerald-800",
    });
  }

  if (implantTreatmentsCount >= 5) {
    insights.push({
      icon: TrendingUp,
      title: "Fortalecimento de tratamentos premium",
      description:
        "Os dados mostram presença relevante de tratamentos de implante e reabilitação. Isso sugere potencial de posicionamento premium da clínica.",
      tone: "border-violet-100 bg-violet-50 text-violet-800",
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: Sparkles,
      title: "Operação estável",
      description: `A clínica apresenta estabilidade nesta leitura estratégica com base em ${totalPatients} pacientes cadastrados. O foco ideal agora é manter constância operacional e relacionamento ativo.`,
      tone: "border-slate-100 bg-slate-50 text-slate-800",
    });
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-[#239d9a]/10 p-3 text-[#239d9a]">
          <Brain className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-800">
            Orientação Estratégica da Semana
          </h2>

          <p className="text-sm text-slate-500">
            Interpretação administrativa e comercial baseada nos dados da clínica.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={`${item.title}-${index}`}
              className={`rounded-2xl border p-4 ${item.tone}`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white/70 p-2">
                  <Icon className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-black">{item.title}</h3>

                  <p className="mt-1 text-sm leading-6 opacity-90">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
