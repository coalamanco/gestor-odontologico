"use client";

import {
  AlertTriangle,
  Brain,
  Crown,
  DollarSign,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

interface Props {
  patientName: string;
  source?: string;
  vipLevel?: string;
  closingChance?: number | string;
  abandonmentRisk?: string;
  financialPotential?: string;
  lastCRMContact?: string;
  commercialScore?: number;
  bestApproach?: string;
}

export default function PatientSmartInsights({
  patientName,
  source = "Não informado",
  vipLevel = "Bronze",
  closingChance = 72,
  abandonmentRisk = "Baixo",
  financialPotential = "Médio",
  lastCRMContact = "Sem contato recente",
  commercialScore = 0,
  bestApproach = "Abordagem leve de relacionamento, perguntando como o paciente está e oferecendo retorno.",
}: Props) {
  const numericClosingChance =
    typeof closingChance === "string"
      ? Number(String(closingChance).replace("%", "")) || 0
      : Number(closingChance || 0);

  function getChanceColor() {
    if (numericClosingChance >= 80) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (numericClosingChance >= 50) {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-red-100 text-red-700";
  }

  function getRiskColor() {
    if (abandonmentRisk === "Baixo") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (abandonmentRisk === "Médio") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-red-100 text-red-700";
  }

  function getVipColor() {
    if (vipLevel === "Diamante") {
      return "bg-cyan-100 text-cyan-700";
    }

    if (vipLevel === "Ouro") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (vipLevel === "Prata") {
      return "bg-slate-200 text-slate-700";
    }

    return "bg-orange-100 text-orange-700";
  }

  function getScoreColor() {
    if (commercialScore >= 80) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (commercialScore >= 50) {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-red-100 text-red-700";
  }

  function getScoreLabel() {
    if (commercialScore >= 80) return "Paciente quente";
    if (commercialScore >= 50) return "Potencial moderado";
    return "Risco comercial";
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
          <Brain size={22} />
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-800">
            Inteligência Comercial
          </h2>

          <p className="text-sm text-slate-500">
            Insights automáticos do paciente
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Paciente
        </p>

        <h3 className="mt-1 text-lg font-black text-slate-800">
          {patientName}
        </h3>
      </div>

      {commercialScore > 0 && (
        <div className="mb-5 rounded-2xl border border-[#d8eeee] bg-[#f8ffff] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-[#239d9a]" />

              <p className="font-bold text-slate-800">
                Score comercial
              </p>
            </div>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getScoreColor()}`}
            >
              {getScoreLabel()}
            </span>
          </div>

          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-[#239d9a]">
              {commercialScore}
            </span>

            <span className="pb-1 text-sm font-bold text-slate-400">
              /100
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-600" />

            <p className="font-bold text-slate-800">
              Chance de fechamento
            </p>
          </div>

          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getChanceColor()}`}
          >
            {numericClosingChance}%
          </span>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />

            <p className="font-bold text-slate-800">
              Risco de abandono
            </p>
          </div>

          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getRiskColor()}`}
          >
            {abandonmentRisk}
          </span>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Crown size={18} className="text-yellow-500" />

            <p className="font-bold text-slate-800">
              Nível VIP
            </p>
          </div>

          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getVipColor()}`}
          >
            {vipLevel}
          </span>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle size={18} className="text-cyan-600" />

            <p className="font-bold text-slate-800">
              Origem do paciente
            </p>
          </div>

          <p className="text-sm text-slate-600">
            {source}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-600" />

            <p className="font-bold text-slate-800">
              Potencial financeiro
            </p>
          </div>

          <p className="text-sm text-slate-600">
            {financialPotential}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle size={18} className="text-blue-600" />

            <p className="font-bold text-slate-800">
              Último contato CRM
            </p>
          </div>

          <p className="text-sm text-slate-600">
            {lastCRMContact}
          </p>
        </div>

        <div className="rounded-2xl border border-[#d8eeee] bg-[#f8ffff] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={18} className="text-[#239d9a]" />

            <p className="font-bold text-slate-800">
              Melhor abordagem
            </p>
          </div>

          <p className="text-sm leading-6 text-slate-600">
            {bestApproach}
          </p>
        </div>
      </div>
    </div>
  );
}
