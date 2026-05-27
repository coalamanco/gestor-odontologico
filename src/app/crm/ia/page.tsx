"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  CalendarClock,
  Check,
  Copy,
  Crown,
  DollarSign,
  HeartHandshake,
  Megaphone,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateStrategicAnalysis } from "@/lib/ai/strategicInsights";
import StrategicWeeklyOrientation from "@/components/dashboard/StrategicWeeklyOrientation";

type Patient = {
  id: string;
  name?: string | null;
  phone?: string | null;
  patient_source?: string | null;
  source?: string | null;
  origin?: string | null;
  created_at?: string | null;
};

type Appointment = {
  id: string;
  patient_id?: string | null;
  date?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type Budget = {
  id: string;
  patient_id?: string | null;
  status?: string | null;
  total?: number | string | null;
  created_at?: string | null;
};

type FinancialRecord = {
  id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  due_date?: string | null;
  created_at?: string | null;
};

type Treatment = {
  id: string;
  patient_id?: string | null;
  procedure_name?: string | null;
  treatment_name?: string | null;
  title?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type SocialPost = {
  id: string;
  title: string;
  content: string;
  objective: string;
};

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getRecommendationClass(severity: string) {
  if (severity === "critico") {
    return "border-rose-100 bg-rose-50 text-rose-800";
  }

  if (severity === "atencao") {
    return "border-amber-100 bg-amber-50 text-amber-800";
  }

  if (severity === "oportunidade") {
    return "border-cyan-100 bg-cyan-50 text-cyan-800";
  }

  return "border-emerald-100 bg-emerald-50 text-emerald-800";
}

function getRecommendationIconClass(severity: string) {
  if (severity === "critico") return "bg-rose-100 text-rose-700";
  if (severity === "atencao") return "bg-amber-100 text-amber-700";
  if (severity === "oportunidade") return "bg-cyan-100 text-cyan-700";
  return "bg-emerald-100 text-emerald-700";
}

function buildSocialHashtags(item: SocialPost) {
  const title = String(item.title || "").toLowerCase();
  const objective = String(item.objective || "").toLowerCase();
  const text = `${title} ${objective}`;

  const tags = ["#odontologia", "#saudebucal", "#sorriso", "#dentista"];

  if (text.includes("limpeza") || text.includes("preven")) {
    tags.push("#prevencao", "#limpezadental");
  }

  if (text.includes("clareamento") || text.includes("estética") || text.includes("estetica")) {
    tags.push("#esteticadental", "#clareamentodental");
  }

  if (text.includes("implante")) {
    tags.push("#implantesdentarios", "#reabilitacaooral");
  }

  if (text.includes("infantil") || text.includes("criança") || text.includes("crianca")) {
    tags.push("#odontopediatria", "#saudeinfantil");
  }

  if (text.includes("gengiva") || text.includes("periodontal")) {
    tags.push("#gengiva", "#periodontia");
  }

  return Array.from(new Set(tags)).slice(0, 8).join(" ");
}

function buildSocialCaption(item: SocialPost) {
  const hashtags = buildSocialHashtags(item);

  return `${item.content}\n\nQuer cuidar melhor do seu sorriso? Agende uma avaliação e mantenha sua saúde bucal em dia.\n\n${hashtags}`;
}

export default function CrmIaPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(
    []
  );
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);

      const [
        patientsResponse,
        appointmentsResponse,
        budgetsResponse,
        financialResponse,
        treatmentsResponse,
      ] = await Promise.all([
        supabase.from("patients").select("*"),
        supabase.from("appointments").select("*"),
        supabase.from("budgets").select("*"),
        supabase.from("financial_records").select("*"),
        supabase.from("patient_treatments").select("*"),
      ]);

      if (patientsResponse.error) throw patientsResponse.error;
      if (appointmentsResponse.error) throw appointmentsResponse.error;
      if (budgetsResponse.error) throw budgetsResponse.error;
      if (financialResponse.error) throw financialResponse.error;
      if (treatmentsResponse.error) throw treatmentsResponse.error;

      setPatients((patientsResponse.data || []) as Patient[]);
      setAppointments((appointmentsResponse.data || []) as Appointment[]);
      setBudgets((budgetsResponse.data || []) as Budget[]);
      setFinancialRecords((financialResponse.data || []) as FinancialRecord[]);
      setTreatments((treatmentsResponse.data || []) as Treatment[]);
    } catch (error: any) {
      console.error("Erro ao carregar IA estratégica:", error);
      alert(
        "Erro ao carregar IA estratégica: " +
          (error?.message || "erro inesperado")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopySocialPost(item: SocialPost) {
    const caption = buildSocialCaption(item);

    try {
      await navigator.clipboard.writeText(caption);
      setCopiedPostId(item.id);

      window.setTimeout(() => {
        setCopiedPostId((current) => (current === item.id ? null : current));
      }, 2200);
    } catch (error) {
      console.error("Erro ao copiar legenda:", error);
      alert("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const analysis = useMemo(() => {
    return generateStrategicAnalysis({
      patients,
      appointments,
      budgets,
      financialRecords,
      treatments,
    });
  }, [patients, appointments, budgets, financialRecords, treatments]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#239d9a] via-[#1f8d8a] to-[#166b68] p-6 text-white shadow-xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-6 w-6" />

                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-widest">
                  IA Estratégica
                </span>
              </div>

              <h1 className="text-3xl font-black md:text-4xl">
                Central Estratégica da Clínica
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-white/90 md:text-base">
                Diagnóstico administrativo, comercial e de marketing baseado nos
                dados reais da clínica.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadData}
                className="flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-3 text-sm font-black transition hover:bg-white/30"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>

              <Link
                href="/crm"
                className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:opacity-90"
              >
                <ArrowLeft className="h-4 w-4" />
                CRM
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#239d9a]/10">
              <RefreshCw className="h-8 w-8 animate-spin text-[#239d9a]" />
            </div>

            <h2 className="text-xl font-black text-slate-800">
              Carregando inteligência estratégica...
            </h2>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                    <Users className="h-6 w-6" />
                  </div>

                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Pacientes
                  </span>
                </div>

                <h2 className="text-3xl font-black text-slate-800">
                  {analysis.totalPatients}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Pacientes cadastrados.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                    <CalendarClock className="h-6 w-6" />
                  </div>

                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Retorno
                  </span>
                </div>

                <h2 className="text-3xl font-black text-slate-800">
                  {analysis.inactivePatientsCount}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Pacientes sem retorno há mais de 180 dias.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <DollarSign className="h-6 w-6" />
                  </div>

                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Orçamentos
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-800">
                  {formatCurrency(analysis.openBudgetValue)}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Valor potencial em orçamentos pendentes.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
                    <AlertTriangle className="h-6 w-6" />
                  </div>

                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Inadimplência
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-800">
                  {formatCurrency(analysis.overdueValue)}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Valores vencidos em aberto.
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[#239d9a]/10 p-3 text-[#239d9a]">
                    <Brain className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-800">
                      Leitura Executiva da IA
                    </h2>

                    <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
                      {analysis.diagnosis}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500">
                  Análise local segura
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-[#239d9a]/10 p-3 text-[#239d9a]">
                    <Sparkles className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-800">
                      Recomendações Administrativas
                    </h2>

                    <p className="text-sm text-slate-500">
                      Posturas práticas sugeridas a partir das métricas.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {analysis.recommendations.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 ${getRecommendationClass(
                        item.severity
                      )}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`rounded-xl p-2 ${getRecommendationIconClass(
                            item.severity
                          )}`}
                        >
                          <Sparkles className="h-5 w-5" />
                        </div>

                        <div>
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="font-black">{item.title}</h3>

                            <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                              {item.area}
                            </span>
                          </div>

                          <p className="text-sm leading-6 opacity-90">
                            {item.description}
                          </p>

                          <p className="mt-2 text-sm font-bold leading-6">
                            Postura sugerida: {item.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                    <Crown className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-800">
                      Pacientes Estratégicos
                    </h2>

                    <p className="text-sm text-slate-500">
                      Maiores oportunidades da clínica.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {analysis.patientOpportunities.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-100 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black text-slate-800">
                            {item.name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.reason}
                          </p>
                        </div>

                        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {item.score} pts
                        </div>
                      </div>
                    </div>
                  ))}

                  {analysis.patientOpportunities.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                      Ainda não há pacientes estratégicos suficientes.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <StrategicWeeklyOrientation
                openBudgetValue={analysis.openBudgetValue}
                overdueValue={analysis.overdueValue}
                inactivePatientsCount={analysis.inactivePatientsCount}
                implantTreatmentsCount={analysis.implantTreatmentsCount}
                totalPatients={analysis.totalPatients}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                    <Megaphone className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-800">
                      Estratégias de Marketing
                    </h2>

                    <p className="text-sm text-slate-500">
                      Campanhas sugeridas de acordo com os dados.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-cyan-800">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="mt-1 h-5 w-5" />

                      <div>
                        <h3 className="font-black">Campanha da semana</h3>

                        <p className="mt-1 text-sm leading-6">
                          Reativação de pacientes sem retorno e recuperação de
                          orçamentos pendentes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
                    <div className="flex items-start gap-3">
                      <Target className="mt-1 h-5 w-5" />

                      <div>
                        <h3 className="font-black">Foco comercial</h3>

                        <p className="mt-1 text-sm leading-6">
                          Priorizar pacientes com orçamento relevante, bom vínculo
                          com a clínica ou histórico financeiro forte.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800">
                    <div className="flex items-start gap-3">
                      <HeartHandshake className="mt-1 h-5 w-5" />

                      <div>
                        <h3 className="font-black">Relacionamento</h3>

                        <p className="mt-1 text-sm leading-6">
                          Usar abordagem humana, sem tom agressivo de venda,
                          reforçando cuidado, prevenção e continuidade.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                    <Activity className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-800">
                      Conteúdo para Redes Sociais
                    </h2>

                    <p className="text-sm text-slate-500">
                      Legendas prontas com CTA e hashtags para copiar e publicar.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {analysis.socialPosts.map((item) => {
                    const caption = buildSocialCaption(item);
                    const hashtags = buildSocialHashtags(item);
                    const isCopied = copiedPostId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4"
                      >
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-[#239d9a]" />

                              <h3 className="font-black text-slate-800">
                                {item.title}
                              </h3>
                            </div>

                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                              Objetivo: {item.objective}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopySocialPost(item)}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-black transition sm:w-auto ${
                              isCopied
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-[#239d9a] text-white hover:bg-[#1f8d8a]"
                            }`}
                          >
                            {isCopied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            {isCopied ? "Copiado" : "Copiar legenda"}
                          </button>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white p-4">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Legenda pronta
                          </p>

                          <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                            {caption}
                          </p>
                        </div>

                        <div className="mt-3 rounded-2xl bg-violet-50 px-4 py-3 text-xs font-bold leading-5 text-violet-700">
                          {hashtags}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
