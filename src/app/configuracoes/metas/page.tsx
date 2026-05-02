"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  DollarSign,
  Percent,
  Save,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

import {
  DEFAULT_CLINIC_GOALS,
  getClinicGoalsFromLocalStorage,
  saveClinicGoalsToLocalStorage,
} from "@/lib/clinicGoals";

export default function ConfiguracoesMetasPage() {
  const [loading, setLoading] = useState(true);

  const [monthlyGoal, setMonthlyGoal] = useState(
    DEFAULT_CLINIC_GOALS.monthlyGoal
  );

  const [annualGoal, setAnnualGoal] = useState(
    DEFAULT_CLINIC_GOALS.annualGoal
  );

  const [crmGoal, setCrmGoal] = useState(
    DEFAULT_CLINIC_GOALS.crmGoal
  );

  const [commercialGoal, setCommercialGoal] = useState(
    DEFAULT_CLINIC_GOALS.commercialGoal
  );

  const [conversionGoal, setConversionGoal] = useState(
    DEFAULT_CLINIC_GOALS.conversionGoal
  );

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const goals = getClinicGoalsFromLocalStorage();

      setMonthlyGoal(goals.monthlyGoal);
      setAnnualGoal(goals.annualGoal);
      setCrmGoal(goals.crmGoal);
      setCommercialGoal(goals.commercialGoal);
      setConversionGoal(goals.conversionGoal);
    } catch (error) {
      console.error("Erro ao carregar metas", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const monthlyProjection = useMemo(() => {
    return Math.round(monthlyGoal * 0.82);
  }, [monthlyGoal]);

  const annualProjection = useMemo(() => {
    return Math.round(annualGoal * 0.76);
  }, [annualGoal]);

  const monthlyProgress = useMemo(() => {
    if (monthlyGoal <= 0) return 0;

    return Math.min(
      100,
      Math.round((monthlyProjection / monthlyGoal) * 100)
    );
  }, [monthlyGoal, monthlyProjection]);

  function formatCurrency(value: number) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function handleSave() {
    try {
      saveClinicGoalsToLocalStorage({
        monthlyGoal,
        annualGoal,
        crmGoal,
        commercialGoal,
        conversionGoal,
      });

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      alert("Erro ao salvar metas.");
      console.error(error);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="rounded-3xl bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">
            Carregando metas da clínica...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
              <Target size={14} />
              Metas da Clínica
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-800">
              Configuração de Metas
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Estas metas são utilizadas automaticamente no BI Executivo,
              previsões comerciais, CRM e inteligência financeira.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#239d9a] px-5 py-4 text-sm font-black text-white shadow-sm hover:bg-[#1f8f8c]"
          >
            <Save size={18} />
            Salvar metas
          </button>
        </div>

        {saved && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700">
            <CheckCircle2 size={18} />
            Metas aplicadas ao BI Executivo com sucesso.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <DollarSign size={22} />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Metas Financeiras
                </h2>

                <p className="text-sm text-slate-500">
                  Receita mensal e anual da clínica.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Meta mensal
                </label>

                <input
                  type="number"
                  value={monthlyGoal}
                  onChange={(e) =>
                    setMonthlyGoal(Number(e.target.value))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-black text-slate-800 outline-none focus:border-[#239d9a]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Meta anual
                </label>

                <input
                  type="number"
                  value={annualGoal}
                  onChange={(e) =>
                    setAnnualGoal(Number(e.target.value))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-black text-slate-800 outline-none focus:border-[#239d9a]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
                <TrendingUp size={22} />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Metas Comerciais
                </h2>

                <p className="text-sm text-slate-500">
                  Conversão, CRM e crescimento comercial.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Meta CRM
                </label>

                <input
                  type="number"
                  value={crmGoal}
                  onChange={(e) =>
                    setCrmGoal(Number(e.target.value))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-black text-slate-800 outline-none focus:border-[#239d9a]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Meta comercial
                </label>

                <input
                  type="number"
                  value={commercialGoal}
                  onChange={(e) =>
                    setCommercialGoal(Number(e.target.value))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-black text-slate-800 outline-none focus:border-[#239d9a]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Meta de conversão (%)
                </label>

                <input
                  type="number"
                  value={conversionGoal}
                  onChange={(e) =>
                    setConversionGoal(Number(e.target.value))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-black text-slate-800 outline-none focus:border-[#239d9a]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-yellow-50 p-3 text-yellow-600">
              <Trophy size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Simulação de Performance
              </h2>

              <p className="text-sm text-slate-500">
                Visualização inteligente baseada nas metas configuradas.
              </p>
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-600">
              <span>Meta mensal</span>
              <span>{monthlyProgress}%</span>
            </div>

            <div className="h-5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#239d9a]"
                style={{
                  width: `${monthlyProgress}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-emerald-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                Meta mensal
              </p>

              <p className="mt-2 text-xl font-black text-emerald-700">
                {formatCurrency(monthlyGoal)}
              </p>
            </div>

            <div className="rounded-3xl bg-cyan-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-700">
                Meta anual
              </p>

              <p className="mt-2 text-xl font-black text-cyan-700">
                {formatCurrency(annualGoal)}
              </p>
            </div>

            <div className="rounded-3xl bg-purple-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-purple-700">
                Projeção mensal
              </p>

              <p className="mt-2 text-xl font-black text-purple-700">
                {formatCurrency(monthlyProjection)}
              </p>
            </div>

            <div className="rounded-3xl bg-yellow-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-yellow-700">
                Conversão meta
              </p>

              <p className="mt-2 text-xl font-black text-yellow-700">
                {conversionGoal}%
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-cyan-600">
                <Percent size={20} />
              </div>

              <div>
                <h3 className="font-black text-cyan-700">
                  Inteligência de metas
                </h3>

                <p className="mt-1 text-sm leading-6 text-cyan-700">
                  Em breve o sistema criará metas automáticas inteligentes
                  baseado no histórico financeiro, crescimento mensal,
                  conversão comercial e sazonalidade da clínica.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}