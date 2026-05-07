"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProcedureOption = {
  id: string;
  name: string;
  price?: number | string | null;
  default_price?: number | string | null;
  value?: number | string | null;
};

type MaterialItem = {
  id: string;
  name: string;
  quantity: string;
  unit_cost: string;
};

type SavedPricing = {
  id: string;
  procedure_id: string | null;
  procedure_name: string;
  materials: MaterialItem[];
  material_cost: number;
  operational_cost: number;
  clinical_time_minutes: number;
  hourly_cost: number;
  card_fee_percent: number;
  tax_percent: number;
  desired_margin_percent: number;
  premium_markup_percent: number;
  minimum_price: number;
  suggested_price: number;
  premium_price: number;
  notes?: string | null;
  created_at?: string | null;
};

function parseNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(/\./g, "").replace(",", ".")) || 0;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function createEmptyMaterial(): MaterialItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: "",
    quantity: "1",
    unit_cost: "",
  };
}

export default function PrecificacaoProcedimentosPage() {
  const [procedures, setProcedures] = useState<ProcedureOption[]>([]);
  const [savedPricings, setSavedPricings] = useState<SavedPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingPrice, setApplyingPrice] = useState(false);

  const [selectedProcedureId, setSelectedProcedureId] = useState("");
  const [manualProcedureName, setManualProcedureName] = useState("");

  const [materials, setMaterials] = useState<MaterialItem[]>([
    createEmptyMaterial(),
  ]);

  const [clinicalTimeMinutes, setClinicalTimeMinutes] = useState("60");
  const [hourlyCost, setHourlyCost] = useState("0");
  const [operationalCost, setOperationalCost] = useState("0");
  const [cardFeePercent, setCardFeePercent] = useState("0");
  const [taxPercent, setTaxPercent] = useState("0");
  const [desiredMarginPercent, setDesiredMarginPercent] = useState("60");
  const [premiumMarkupPercent, setPremiumMarkupPercent] = useState("20");
  const [notes, setNotes] = useState("");

  const selectedProcedure = useMemo(() => {
    return procedures.find((item) => item.id === selectedProcedureId) || null;
  }, [procedures, selectedProcedureId]);

  const procedureName = useMemo(() => {
    return selectedProcedure?.name || manualProcedureName.trim();
  }, [selectedProcedure, manualProcedureName]);

  const currentRegisteredPrice = useMemo(() => {
    if (!selectedProcedure) return 0;

    return (
      parseNumber(selectedProcedure.price) ||
      parseNumber(selectedProcedure.default_price) ||
      parseNumber(selectedProcedure.value)
    );
  }, [selectedProcedure]);

  const materialCost = useMemo(() => {
    return materials.reduce((acc, item) => {
      return acc + parseNumber(item.quantity) * parseNumber(item.unit_cost);
    }, 0);
  }, [materials]);

  const timeCost = useMemo(() => {
    return (parseNumber(clinicalTimeMinutes) / 60) * parseNumber(hourlyCost);
  }, [clinicalTimeMinutes, hourlyCost]);

  const directCost = useMemo(() => {
    return materialCost + timeCost + parseNumber(operationalCost);
  }, [materialCost, timeCost, operationalCost]);

  const totalPercentFees = useMemo(() => {
    return parseNumber(cardFeePercent) + parseNumber(taxPercent);
  }, [cardFeePercent, taxPercent]);

  const minimumPrice = useMemo(() => {
    const factor = 1 - totalPercentFees / 100;
    if (factor <= 0) return directCost;
    return directCost / factor;
  }, [directCost, totalPercentFees]);

  const suggestedPrice = useMemo(() => {
    const margin = parseNumber(desiredMarginPercent);
    const factor = 1 - (margin + totalPercentFees) / 100;
    if (factor <= 0) return minimumPrice;
    return directCost / factor;
  }, [directCost, desiredMarginPercent, totalPercentFees, minimumPrice]);

  const premiumPrice = useMemo(() => {
    return suggestedPrice * (1 + parseNumber(premiumMarkupPercent) / 100);
  }, [suggestedPrice, premiumMarkupPercent]);

  const estimatedProfit = useMemo(() => {
    return suggestedPrice - directCost - suggestedPrice * (totalPercentFees / 100);
  }, [suggestedPrice, directCost, totalPercentFees]);

  const registeredMargin = useMemo(() => {
    if (!currentRegisteredPrice) return null;

    const fees = currentRegisteredPrice * (totalPercentFees / 100);
    const profit = currentRegisteredPrice - directCost - fees;

    return (profit / currentRegisteredPrice) * 100;
  }, [currentRegisteredPrice, directCost, totalPercentFees]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: procedureData } = await supabase
        .from("procedures")
        .select("*")
        .order("name");

      if (procedureData) {
        setProcedures(
          procedureData.map((item: any) => ({
            id: item.id,
            name:
              item.name ||
              item.title ||
              item.procedure_name ||
              item.description ||
              "Procedimento sem nome",
            price: item.price,
            default_price: item.default_price,
            value: item.value,
          })),
        );
      }

      const { data: pricingData, error } = await supabase
        .from("procedure_pricing")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && pricingData) {
        setSavedPricings(pricingData as SavedPricing[]);
      }
    } catch (error) {
      console.error("Erro ao carregar precificação:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateMaterial = (
    id: string,
    field: keyof MaterialItem,
    value: string,
  ) => {
    setMaterials((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addMaterial = () => {
    setMaterials((current) => [...current, createEmptyMaterial()]);
  };

  const removeMaterial = (id: string) => {
    setMaterials((current) => {
      if (current.length <= 1) return current;
      return current.filter((item) => item.id !== id);
    });
  };

  const clearForm = () => {
    setSelectedProcedureId("");
    setManualProcedureName("");
    setMaterials([createEmptyMaterial()]);
    setClinicalTimeMinutes("60");
    setHourlyCost("0");
    setOperationalCost("0");
    setCardFeePercent("0");
    setTaxPercent("0");
    setDesiredMarginPercent("60");
    setPremiumMarkupPercent("20");
    setNotes("");
  };

  const savePricing = async () => {
    if (!procedureName) {
      alert("Selecione ou informe o nome do procedimento.");
      return;
    }

    const cleanMaterials = materials
      .map((item) => ({
        ...item,
        name: item.name.trim(),
      }))
      .filter((item) => item.name || parseNumber(item.unit_cost) > 0);

    try {
      setSaving(true);

      const payload = {
        procedure_id: selectedProcedureId || null,
        procedure_name: procedureName,
        materials: cleanMaterials,
        material_cost: materialCost,
        operational_cost: parseNumber(operationalCost),
        clinical_time_minutes: parseNumber(clinicalTimeMinutes),
        hourly_cost: parseNumber(hourlyCost),
        card_fee_percent: parseNumber(cardFeePercent),
        tax_percent: parseNumber(taxPercent),
        desired_margin_percent: parseNumber(desiredMarginPercent),
        premium_markup_percent: parseNumber(premiumMarkupPercent),
        minimum_price: minimumPrice,
        suggested_price: suggestedPrice,
        premium_price: premiumPrice,
        notes: notes.trim() || null,
      };

      const { error } = await supabase.from("procedure_pricing").insert(payload);

      if (error) {
        alert(
          "Erro ao salvar precificação. Confira se a tabela procedure_pricing foi criada corretamente no Supabase.\n\n" +
            error.message,
        );
        return;
      }

      alert("Precificação salva com sucesso.");
      await loadData();
    } catch (error: any) {
      alert("Erro inesperado ao salvar: " + (error?.message || "erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const updateProcedurePrice = async () => {
    if (!selectedProcedureId) {
      alert("Selecione um procedimento cadastrado antes de aplicar o preço.");
      return;
    }

    if (!suggestedPrice || suggestedPrice <= 0) {
      alert("O preço sugerido precisa ser maior que zero.");
      return;
    }

    const confirmed = window.confirm(
      `Deseja aplicar ${formatCurrency(
        suggestedPrice,
      )} como novo preço cadastrado para "${procedureName}"?`,
    );

    if (!confirmed) return;

    try {
      setApplyingPrice(true);

      const { error } = await supabase
        .from("procedures")
        .update({
          price: Number(suggestedPrice.toFixed(2)),
        })
        .eq("id", selectedProcedureId);

      if (error) {
        alert(
          "Erro ao aplicar preço sugerido.\n\nConfira se a tabela procedures possui a coluna price.\n\n" +
            error.message,
        );
        return;
      }

      alert("Preço sugerido aplicado com sucesso.");
      await loadData();
    } catch (error: any) {
      alert(
        "Erro inesperado ao aplicar preço sugerido: " +
          (error?.message || "erro desconhecido"),
      );
    } finally {
      setApplyingPrice(false);
    }
  };

  const applySavedPricing = (pricing: SavedPricing) => {
    setSelectedProcedureId(pricing.procedure_id || "");
    setManualProcedureName(pricing.procedure_id ? "" : pricing.procedure_name || "");
    setMaterials(
      pricing.materials && pricing.materials.length
        ? pricing.materials
        : [createEmptyMaterial()],
    );
    setOperationalCost(String(pricing.operational_cost || 0));
    setClinicalTimeMinutes(String(pricing.clinical_time_minutes || 60));
    setHourlyCost(String(pricing.hourly_cost || 0));
    setCardFeePercent(String(pricing.card_fee_percent || 0));
    setTaxPercent(String(pricing.tax_percent || 0));
    setDesiredMarginPercent(String(pricing.desired_margin_percent || 60));
    setPremiumMarkupPercent(String(pricing.premium_markup_percent || 20));
    setNotes(pricing.notes || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7ffff] via-[#f4fbfb] to-[#eef8f8] p-3 pb-24 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#239d9a]">
                Gestão financeira clínica
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
                Precificação de procedimentos
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
                Calcule o preço mínimo, sugerido e premium considerando
                materiais, tempo clínico, custos operacionais, taxas e margem de
                lucro desejada.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d9eeee] bg-[#f8ffff] p-4 text-sm shadow-sm">
              <p className="font-black text-slate-800">Resumo rápido</p>
              <p className="mt-1 text-slate-500">
                Custo direto:{" "}
                <span className="font-black text-slate-800">
                  {formatCurrency(directCost)}
                </span>
              </p>
              <p className="text-slate-500">
                Lucro estimado:{" "}
                <span className="font-black text-[#239d9a]">
                  {formatCurrency(estimatedProfit)}
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">
                Procedimento
              </h2>
              <p className="mb-4 text-sm font-medium text-slate-500">
                Selecione um procedimento cadastrado ou informe um nome manual.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-600">
                    Procedimento cadastrado
                  </label>
                  <select
                    value={selectedProcedureId}
                    onChange={(event) => {
                      setSelectedProcedureId(event.target.value);
                      if (event.target.value) setManualProcedureName("");
                    }}
                    className="w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#84d5d3] focus:bg-white"
                  >
                    <option value="">Selecionar procedimento</option>
                    {procedures.map((procedure) => (
                      <option key={procedure.id} value={procedure.id}>
                        {procedure.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-600">
                    Nome manual
                  </label>
                  <input
                    value={manualProcedureName}
                    onChange={(event) => {
                      setManualProcedureName(event.target.value);
                      if (event.target.value) setSelectedProcedureId("");
                    }}
                    placeholder="Ex.: Implante unitário"
                    className="w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#84d5d3] focus:bg-white"
                  />
                </div>
              </div>

              {currentRegisteredPrice > 0 && (
                <div className="mt-4 rounded-2xl border border-[#d9eeee] bg-[#f8ffff] p-4">
                  <p className="text-sm font-bold text-slate-600">
                    Preço cadastrado atualmente
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="text-xl font-black text-slate-900">
                      {formatCurrency(currentRegisteredPrice)}
                    </span>

                    {registeredMargin !== null && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          registeredMargin >= parseNumber(desiredMarginPercent)
                            ? "bg-emerald-50 text-emerald-700"
                            : registeredMargin > 20
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        Margem estimada: {formatPercent(registeredMargin)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Materiais utilizados
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Inclua todos os materiais que entram no custo do
                    procedimento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addMaterial}
                  className="rounded-2xl bg-[#239d9a] px-4 py-3 text-sm font-black text-white shadow-sm hover:opacity-90"
                >
                  + Adicionar material
                </button>
              </div>

              <div className="space-y-3">
                {materials.map((item, index) => {
                  const lineTotal =
                    parseNumber(item.quantity) * parseNumber(item.unit_cost);

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 gap-3 rounded-2xl border border-[#e0eeee] bg-[#fbffff] p-3 md:grid-cols-[1.4fr_0.5fr_0.7fr_0.7fr_auto]"
                    >
                      <div>
                        <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Material {index + 1}
                        </label>
                        <input
                          value={item.name}
                          onChange={(event) =>
                            updateMaterial(item.id, "name", event.target.value)
                          }
                          placeholder="Ex.: implante, sutura, anestésico"
                          className="w-full rounded-xl border border-[#d9eeee] bg-white p-2.5 text-sm font-semibold outline-none focus:border-[#84d5d3]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Qtd.
                        </label>
                        <input
                          value={item.quantity}
                          onChange={(event) =>
                            updateMaterial(
                              item.id,
                              "quantity",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-[#d9eeee] bg-white p-2.5 text-sm font-semibold outline-none focus:border-[#84d5d3]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Custo unit.
                        </label>
                        <input
                          value={item.unit_cost}
                          onChange={(event) =>
                            updateMaterial(
                              item.id,
                              "unit_cost",
                              event.target.value,
                            )
                          }
                          placeholder="0,00"
                          className="w-full rounded-xl border border-[#d9eeee] bg-white p-2.5 text-sm font-semibold outline-none focus:border-[#84d5d3]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Total
                        </label>
                        <div className="rounded-xl border border-[#d9eeee] bg-white p-2.5 text-sm font-black text-slate-800">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeMaterial(item.id)}
                          className="w-full rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-600 hover:bg-rose-100 md:w-auto"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">
                Custos, taxas e margem
              </h2>
              <p className="mb-4 text-sm font-medium text-slate-500">
                Ajuste os parâmetros para encontrar um preço seguro.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field
                  label="Tempo clínico (min)"
                  value={clinicalTimeMinutes}
                  onChange={setClinicalTimeMinutes}
                />
                <Field
                  label="Custo hora clínica"
                  value={hourlyCost}
                  onChange={setHourlyCost}
                  placeholder="Ex.: 250"
                />
                <Field
                  label="Custo operacional fixo"
                  value={operationalCost}
                  onChange={setOperationalCost}
                  placeholder="Ex.: 80"
                />
                <Field
                  label="Taxa cartão (%)"
                  value={cardFeePercent}
                  onChange={setCardFeePercent}
                  placeholder="Ex.: 3"
                />
                <Field
                  label="Impostos / perdas (%)"
                  value={taxPercent}
                  onChange={setTaxPercent}
                  placeholder="Ex.: 8"
                />
                <Field
                  label="Margem desejada (%)"
                  value={desiredMarginPercent}
                  onChange={setDesiredMarginPercent}
                  placeholder="Ex.: 60"
                />
                <Field
                  label="Acréscimo premium (%)"
                  value={premiumMarkupPercent}
                  onChange={setPremiumMarkupPercent}
                  placeholder="Ex.: 20"
                />

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-slate-600">
                    Observações
                  </label>
                  <input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Ex.: cálculo para implante nacional, sem enxerto"
                    className="w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-3 text-sm font-semibold outline-none focus:border-[#84d5d3] focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="sticky top-4 rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">
                Resultado da precificação
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Valores calculados automaticamente.
              </p>

              <div className="mt-5 space-y-3">
                <ResultCard
                  label="Custo dos materiais"
                  value={formatCurrency(materialCost)}
                />
                <ResultCard
                  label="Custo de tempo clínico"
                  value={formatCurrency(timeCost)}
                />
                <ResultCard
                  label="Custo direto total"
                  value={formatCurrency(directCost)}
                />

                <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">
                    Preço mínimo
                  </p>
                  <p className="mt-1 text-2xl font-black text-amber-800">
                    {formatCurrency(minimumPrice)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-amber-700">
                    Cobre custos e taxas, evitando prejuízo.
                  </p>
                </div>

                <div className="rounded-3xl border border-[#bfe8e7] bg-[#edffff] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#239d9a]">
                    Preço sugerido
                  </p>
                  <p className="mt-1 text-3xl font-black text-[#0f807d]">
                    {formatCurrency(suggestedPrice)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#239d9a]">
                    Busca atingir a margem desejada.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-900 p-4 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                    Preço premium
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {formatCurrency(premiumPrice)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-300">
                    Sugestão para casos complexos ou maior valor percebido.
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    Lucro estimado no preço sugerido
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-800">
                    {formatCurrency(estimatedProfit)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={savePricing}
                  disabled={saving}
                  className="rounded-2xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#7ccfce] px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar precificação"}
                </button>

                <button
                  type="button"
                  onClick={updateProcedurePrice}
                  disabled={!selectedProcedureId || applyingPrice}
                  className="rounded-2xl border border-[#bfe8e7] bg-[#edffff] px-5 py-3 text-sm font-black text-[#0f807d] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applyingPrice
                    ? "Aplicando..."
                    : "Aplicar preço sugerido no procedimento"}
                </button>

                <button
                  type="button"
                  onClick={clearForm}
                  className="rounded-2xl border border-[#d9eeee] bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-[#f8ffff]"
                >
                  Limpar simulação
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Precificações salvas
              </h2>
              <p className="text-sm font-medium text-slate-500">
                Últimos cálculos salvos para consulta e reaproveitamento.
              </p>
            </div>

            {loading && (
              <span className="text-sm font-bold text-slate-400">
                Carregando...
              </span>
            )}
          </div>

          {savedPricings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-5 text-sm font-semibold text-slate-500">
              Nenhuma precificação salva ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {savedPricings.map((pricing) => (
                <button
                  key={pricing.id}
                  type="button"
                  onClick={() => applySavedPricing(pricing)}
                  className="rounded-3xl border border-[#e0eeee] bg-[#fbffff] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                >
                  <p className="text-sm font-black text-slate-900">
                    {pricing.procedure_name}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {pricing.created_at
                      ? new Date(pricing.created_at).toLocaleDateString("pt-BR")
                      : "Sem data"}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
                    <span>
                      Custo: {formatCurrency(Number(pricing.material_cost || 0))}
                    </span>
                    <span>
                      Margem:{" "}
                      {formatPercent(Number(pricing.desired_margin_percent || 0))}
                    </span>
                    <span className="col-span-2 rounded-xl bg-[#edfafa] px-3 py-2 font-black text-[#239d9a]">
                      Sugerido:{" "}
                      {formatCurrency(Number(pricing.suggested_price || 0))}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-600">
        {props.label}
      </label>
      <input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-3 text-sm font-semibold outline-none focus:border-[#84d5d3] focus:bg-white"
      />
    </div>
  );
}

function ResultCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#e0eeee] bg-[#fbffff] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {props.label}
      </p>
      <p className="mt-1 text-xl font-black text-slate-900">{props.value}</p>
    </div>
  );
}