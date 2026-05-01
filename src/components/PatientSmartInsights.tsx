"use client";

import {
  AlertTriangle,
  Brain,
  Crown,
  DollarSign,
  MessageCircle,
  TrendingUp,
} from "lucide-react";

interface Props {
  patientName: string;
  source?: string;
  vipLevel?: string;
  closingChance?: number;
  abandonmentRisk?: string;
  financialPotential?: string;
  lastCRMContact?: string;
}

export default function PatientSmartInsights({
  patientName,
  source = "Não informado",
  vipLevel = "Bronze",
  closingChance = 72,
  abandonmentRisk = "Baixo",
  financialPotential = "Médio",
  lastCRMContact = "Sem contato recente",
}: Props) {
  function getChanceColor() {
    if (closingChance >= 80) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (closingChance >= 50) {
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

      <div className="space-y-4">
        {/* CHANCE */}
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
            {closingChance}%
          </span>
        </div>

        {/* RISCO */}
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

        {/* VIP */}
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

        {/* ORIGEM */}
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

        {/* POTENCIAL */}
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

        {/* CRM */}
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
      </div>
    </div>
  );
}