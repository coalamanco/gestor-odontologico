"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import OdontogramaNovo from "@/components/OdontogramaNovo";

type Budget = {
  id: string;
  patient_id: string;
  status?: string | null;
  discount_type?: string | null;
  discount_value?: number | string | null;
  subtotal?: number | string | null;
  total?: number | string | null;
  installments?: number | null;
  entry_value?: number | string | null;
  entry_status?: string | null;
  receipt_type?: string | null;
  notes?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
};

type BudgetItem = {
  id?: string;
  budget_id?: string;
  tooth?: string | null;
  face?: string | null;
  procedure_name?: string | null;
  treatment_name?: string | null;
  unit_price?: number | string | null;
  quantity?: number | null;
  discount_value?: number | string | null;
  total?: number | string | null;
  amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

type Procedure = {
  id: string;
  name: string;
  categoria?: string | null;
  price?: number | string | null;
};

type DraftItem = {
  tooth: string;
  face: string;
  procedure_name: string;
  treatment_name: string;
  unit_price: string;
  quantity: string;
};

type PatientTreatment = {
  id: string;
  patient_id: string;
  budget_id?: string | null;
  budget_item_id?: string | null;
  title?: string | null;
  treatment_name?: string | null;
  procedure_name?: string | null;
  tooth?: string | null;
  face?: string | null;
  unit_price?: number | string | null;
  quantity?: number | null;
  total?: number | string | null;
  status?: string | null;
};

const emptyDraftItem: DraftItem = {
  tooth: "",
  face: "",
  procedure_name: "",
  treatment_name: "",
  unit_price: "",
  quantity: "1",
};

const superioresEsquerda = ["18", "17", "16", "15", "14", "13", "12", "11"];
const superioresDireita = ["21", "22", "23", "24", "25", "26", "27", "28"];
const inferioresEsquerda = ["48", "47", "46", "45", "44", "43", "42", "41"];
const inferioresDireita = ["31", "32", "33", "34", "35", "36", "37", "38"];

type ArcadaTab = "permanentes" | "deciduos" | "hof";

function parseSelectedFaces(faceString: string) {
  if (!faceString) return [];
  return faceString
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
}

function toggleFace(currentFaceString: string, face: string) {
  const current = parseSelectedFaces(currentFaceString);
  const exists = current.includes(face);
  const next = exists ? current.filter((f) => f !== face) : [...current, face];
  return next.join(", ");
}

function ToothIcon({
  upper,
  selected,
}: {
  upper: boolean;
  selected: boolean;
}) {
  return (
    <svg viewBox="0 0 80 120" className="w-10 h-14">
      {upper ? (
        <path
          d="M20 12
             C28 4, 52 4, 60 12
             C70 22, 68 38, 64 52
             C60 66, 58 82, 58 96
             C58 106, 52 112, 47 112
             C44 112, 42 108, 40 104
             C38 108, 36 112, 33 112
             C28 112, 22 106, 22 96
             C22 82, 20 66, 16 52
             C12 38, 10 22, 20 12Z"
          fill={selected ? "#d5f5f4" : "#ffffff"}
          stroke={selected ? "#1db7b3" : "#cbd5e1"}
          strokeWidth="2.4"
        />
      ) : (
        <path
          d="M20 18
             C28 10, 52 10, 60 18
             C68 26, 68 44, 62 56
             C57 66, 54 78, 52 94
             C50 108, 46 118, 41 118
             C36 118, 34 106, 32 94
             C30 78, 23 66, 18 56
             C12 44, 12 26, 20 18Z"
          fill={selected ? "#d5f5f4" : "#ffffff"}
          stroke={selected ? "#1db7b3" : "#cbd5e1"}
          strokeWidth="2.4"
        />
      )}
    </svg>
  );
}

function FaceChip({
  active,
  children,
  onClick,
  compact = false,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border text-[9px] font-semibold transition ${
        compact ? "px-1.5 py-0.5 min-w-[22px]" : "px-2 py-0.5"
      } ${
        active
          ? "bg-[#1db7b3] text-white border-[#1db7b3]"
          : "bg-white text-slate-600 border-[#d9eeee] hover:bg-[#eefafa]"
      }`}
    >
      {children}
    </button>
  );
}

function ToothPicker({
  tooth,
  upper,
  selectedTooth,
  selectedFaces,
  onSelectTooth,
  onToggleFace,
}: {
  tooth: string;
  upper: boolean;
  selectedTooth: string;
  selectedFaces: string[];
  onSelectTooth: (tooth: string) => void;
  onToggleFace: (face: string) => void;
}) {
  const selected = selectedTooth === tooth;

  const handleFaceClick = (face: string) => {
    onSelectTooth(tooth);
    onToggleFace(face);
  };

  const quadranteEsquerdoDaTela = [
    "18", "17", "16", "15", "14", "13", "12", "11",
    "48", "47", "46", "45", "44", "43", "42", "41",
  ].includes(tooth);

  const faceEsquerda = quadranteEsquerdoDaTela ? "D" : "M";
  const faceDireita = quadranteEsquerdoDaTela ? "M" : "D";

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-1.5 transition ${
        selected
          ? "border-[#7cd8d6] bg-[#f6ffff] shadow-sm"
          : "border-[#e1f1f1] bg-white hover:bg-[#fbffff]"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelectTooth(tooth)}
        className={`text-[13px] font-bold leading-none ${
          selected ? "text-[#1b8f8d]" : "text-slate-800"
        }`}
      >
        {tooth}
      </button>

      <button
        type="button"
        onClick={() => onSelectTooth(tooth)}
        className="rounded-xl p-1 hover:bg-[#eefafa]"
        title={`Selecionar dente ${tooth}`}
      >
        <ToothIcon upper={upper} selected={selected} />
      </button>

      <div className="grid grid-cols-3 gap-1">
        <div></div>

        <FaceChip
          active={selected && selectedFaces.includes("V")}
          onClick={() => handleFaceClick("V")}
          compact
        >
          V
        </FaceChip>

        <div></div>

        <FaceChip
          active={selected && selectedFaces.includes(faceEsquerda)}
          onClick={() => handleFaceClick(faceEsquerda)}
          compact
        >
          {faceEsquerda}
        </FaceChip>

        <FaceChip
          active={selected && selectedFaces.includes("O")}
          onClick={() => handleFaceClick("O")}
          compact
        >
          O
        </FaceChip>

        <FaceChip
          active={selected && selectedFaces.includes(faceDireita)}
          onClick={() => handleFaceClick(faceDireita)}
          compact
        >
          {faceDireita}
        </FaceChip>

        <div></div>

        <FaceChip
          active={selected && selectedFaces.includes("L")}
          onClick={() => handleFaceClick("L")}
          compact
        >
          L
        </FaceChip>

        <div></div>
      </div>
    </div>
  );
}
function OdontogramaProfissional({
  draftItem,
  setDraftItem,
}: {
  draftItem: DraftItem;
  setDraftItem: React.Dispatch<React.SetStateAction<DraftItem>>;
}) {
  const [tab, setTab] = useState<ArcadaTab>("permanentes");
  const selectedFaces = parseSelectedFaces(draftItem.face);

  const selectTooth = (tooth: string) => {
    setDraftItem((prev) => ({ ...prev, tooth }));
  };

  const toggleCurrentFace = (face: string) => {
    setDraftItem((prev) => ({
      ...prev,
      face: toggleFace(prev.face, face),
    }));
  };

  const clearSelection = () => {
    setDraftItem((prev) => ({
      ...prev,
      tooth: "",
      face: "",
    }));
  };

  return (
    <div className="bg-white border border-[#d9eeee] rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(15,118,110,0.04)]">
      <div className="border-b border-[#e8f5f5] px-4 py-2.5 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-slate-700">
          Selecionar Dente/Região
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="text-[13px] text-slate-500 hover:text-slate-700"
        >
          Limpar seleção
        </button>
      </div>

      <div className="px-4 pt-2 border-b border-[#eef6f6]">
        <div className="flex gap-5 text-xs">
          <button
            type="button"
            onClick={() => setTab("permanentes")}
            className={`pb-2.5 border-b-2 font-semibold ${
              tab === "permanentes"
                ? "border-[#1db7b3] text-[#1b8f8d]"
                : "border-transparent text-slate-500"
            }`}
          >
            PERMANENTES
          </button>

          <button
            type="button"
            onClick={() => setTab("deciduos")}
            className={`pb-2.5 border-b-2 font-semibold ${
              tab === "deciduos"
                ? "border-[#1db7b3] text-[#1b8f8d]"
                : "border-transparent text-slate-500"
            }`}
          >
            DECÍDUOS
          </button>

          <button
            type="button"
            onClick={() => setTab("hof")}
            className={`pb-2.5 border-b-2 font-semibold ${
              tab === "hof"
                ? "border-[#1db7b3] text-[#1b8f8d]"
                : "border-transparent text-slate-500"
            }`}
          >
            HOF
          </button>
        </div>
      </div>

      {tab !== "permanentes" ? (
        <div className="p-8 text-center text-[13px] text-slate-500">
          Nesta etapa deixei funcional a arcada <strong>permanente</strong>, que é a usada no fluxo principal.
        </div>
      ) : (
        <div className="p-3.5 space-y-4">
          <div className="overflow-x-auto">
            <div className="min-w-[900px] space-y-5">
              <div className="grid grid-cols-2 gap-5 items-start">
                <div className="grid grid-cols-8 gap-1.5">
                  {superioresEsquerda.map((tooth) => (
                    <ToothPicker
                      key={tooth}
                      tooth={tooth}
                      upper
                      selectedTooth={draftItem.tooth}
                      selectedFaces={selectedFaces}
                      onSelectTooth={selectTooth}
                      onToggleFace={toggleCurrentFace}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-8 gap-1.5">
                  {superioresDireita.map((tooth) => (
                    <ToothPicker
                      key={tooth}
                      tooth={tooth}
                      upper
                      selectedTooth={draftItem.tooth}
                      selectedFaces={selectedFaces}
                      onSelectTooth={selectTooth}
                      onToggleFace={toggleCurrentFace}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t border-dashed border-[#d9eeee]" />

              <div className="grid grid-cols-2 gap-5 items-start">
                <div className="grid grid-cols-8 gap-1.5">
                  {inferioresEsquerda.map((tooth) => (
                    <ToothPicker
                      key={tooth}
                      tooth={tooth}
                      upper={false}
                      selectedTooth={draftItem.tooth}
                      selectedFaces={selectedFaces}
                      onSelectTooth={selectTooth}
                      onToggleFace={toggleCurrentFace}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-8 gap-1.5">
                  {inferioresDireita.map((tooth) => (
                    <ToothPicker
                      key={tooth}
                      tooth={tooth}
                      upper={false}
                      selectedTooth={draftItem.tooth}
                      selectedFaces={selectedFaces}
                      onSelectTooth={selectTooth}
                      onToggleFace={toggleCurrentFace}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {["Maxila", "Mandíbula", "Face", "Arcada superior", "Arcada inferior", "Arcadas"].map(
              (label) => (
                <span
                  key={label}
                  className="px-3 py-1.5 rounded-full border border-[#d9eeee] bg-[#fbffff] text-xs text-slate-600"
                >
                  {label}
                </span>
              )
            )}
          </div>

          <div className="rounded-xl bg-[#f7ffff] border border-[#d9eeee] px-3 py-2.5 text-xs text-slate-600">
            Dente selecionado:{" "}
            <span className="font-bold text-slate-900">{draftItem.tooth || "-"}</span>
            {" "}• Face(s):{" "}
            <span className="font-bold text-slate-900">{draftItem.face || "-"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrcamentoPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const budgetId = searchParams.get("budgetId");

  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [search, setSearch] = useState("");
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [draftItem, setDraftItem] = useState<DraftItem>({ ...emptyDraftItem });
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [odontogramResetKey, setOdontogramResetKey] = useState(0);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBudget, setSavingBudget] = useState(false);
  const [approvingBudgetId, setApprovingBudgetId] = useState<string | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  const [installments, setInstallments] = useState("1");
  const [entryValue, setEntryValue] = useState("0");
  const [entryStatus, setEntryStatus] = useState("pago");
  const [receiptType, setReceiptType] = useState("nenhum");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState("valor");
  const [discountValue, setDiscountValue] = useState("0");

  const parseMoney = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;
    return Number(String(value).replace(",", ".")) || 0;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const normalizeBudgetStatus = (status?: string | null) => {
    return String(status || "pendente").trim().toLowerCase();
  };

  const resetForm = () => {
    setSearch("");
    setFilteredProcedures([]);
    setShowDropdown(false);
    setDraftItem({ ...emptyDraftItem });
    setDraftItems([]);
    setOdontogramResetKey((current) => current + 1);
    setInstallments("1");
    setEntryValue("0");
    setEntryStatus("pago");
    setReceiptType("nenhum");
    setNotes("");
    setDiscountType("valor");
    setDiscountValue("0");
  };

  const closePage = () => {
    router.push(`/pacientes/${params.id}`);
  };

  const splitIntoInstallments = (total: number, quantity: number) => {
    const count = Math.max(1, Number(quantity || 1));
    const normalizedTotal = Number(total || 0);

    if (count === 1) {
      return [Number(normalizedTotal.toFixed(2))];
    }

    const values: number[] = [];
    const base = Number((normalizedTotal / count).toFixed(2));

    for (let i = 0; i < count; i++) {
      if (i < count - 1) {
        values.push(base);
      } else {
        const partial = values.reduce((acc, v) => acc + v, 0);
        values.push(Number((normalizedTotal - partial).toFixed(2)));
      }
    }

    return values;
  };

  const getMonthlyInstallmentDate = (index: number) => {
    const baseDate = new Date();
    baseDate.setHours(12, 0, 0, 0);
    baseDate.setMonth(baseDate.getMonth() + index);
    return baseDate;
  };

  const fillFormFromBudget = async (budget: Budget) => {
    setInstallments(String(budget.installments || 1));
    setEntryValue(String(budget.entry_value ?? "0"));
    setEntryStatus(budget.entry_status || "pago");
    setReceiptType(budget.receipt_type || "nenhum");
    setNotes(budget.notes || "");
    setDiscountType(budget.discount_type || "valor");
    setDiscountValue(String(budget.discount_value ?? "0"));

    const { data: itemsData, error: itemsError } = await supabase
      .from("budget_items")
      .select("*")
      .eq("budget_id", budget.id)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;

    const mappedItems: DraftItem[] = (itemsData || []).map((item: any) => ({
      tooth: item.tooth || "",
      face: item.face || "",
      procedure_name: item.procedure_name || "",
      treatment_name: item.treatment_name || item.procedure_name || "",
      unit_price: String(item.unit_price ?? ""),
      quantity: String(item.quantity ?? 1),
    }));

    setDraftItems(mappedItems);
    setBudgetItems((itemsData || []) as BudgetItem[]);
    setSearch("");
    setFilteredProcedures([]);
    setShowDropdown(false);
    setDraftItem({ ...emptyDraftItem });
    setOdontogramResetKey((current) => current + 1);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: proceduresData, error: proceduresError } = await supabase
        .from("procedures")
        .select("*")
        .order("name", { ascending: true });

      if (proceduresError) throw proceduresError;
      setProcedures((proceduresData || []) as Procedure[]);

      const { data: budgetsData, error: budgetsError } = await supabase
        .from("budgets")
        .select("*")
        .eq("patient_id", params.id)
        .order("created_at", { ascending: false });

      if (budgetsError) throw budgetsError;
      const loadedBudgets = (budgetsData || []) as Budget[];
      setBudgets(loadedBudgets);

      if (budgetId) {
        const selected = loadedBudgets.find((b) => b.id === budgetId);

        if (selected) {
          await fillFormFromBudget(selected);
        } else {
          setBudgetItems([]);
        }
      } else {
        setBudgetItems([]);
      }
    } catch (error: any) {
      alert("Erro ao carregar orçamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id, budgetId]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredProcedures([]);
      return;
    }

    const result = procedures.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredProcedures(result);
  }, [search, procedures]);

  const subtotal = useMemo(() => {
    return draftItems.reduce((acc, item) => {
      const price = parseMoney(item.unit_price);
      const quantity = Number(item.quantity || 1);
      return acc + price * quantity;
    }, 0);
  }, [draftItems]);

  const computedDiscount = useMemo(() => {
    const rawDiscount = parseMoney(discountValue);

    if (discountType === "percentual") {
      const percent = Math.max(0, Math.min(rawDiscount, 100));
      return (subtotal * percent) / 100;
    }

    return Math.max(0, Math.min(rawDiscount, subtotal));
  }, [discountType, discountValue, subtotal]);

  const total = useMemo(() => {
    const result = subtotal - computedDiscount;
    return result > 0 ? result : 0;
  }, [subtotal, computedDiscount]);

  const selectProcedure = (procedure: Procedure) => {
    setSearch(procedure.name);
    setDraftItem((current) => ({
      ...current,
      procedure_name: procedure.name,
      treatment_name: procedure.name,
      unit_price: String(procedure.price || ""),
    }));
    setShowDropdown(false);
  };

  const addItem = () => {
    if (!draftItem.procedure_name.trim() && !draftItem.treatment_name.trim()) {
      alert("Selecione um procedimento.");
      return;
    }

    const unitPrice = parseMoney(draftItem.unit_price);
    const quantity = Number(draftItem.quantity || 1);

    if (unitPrice <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    if (quantity <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    const selectedTeeth = Array.from(
      new Set(
        String(draftItem.tooth || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      )
    );

    const faceMap = new Map<string, string>();
    const encodedFaces = String(draftItem.face || "").trim();

    if (encodedFaces.includes("|")) {
      encodedFaces.split("|").forEach((entry) => {
        const [tooth, faces] = entry.split(":");
        if (tooth?.trim()) {
          faceMap.set(tooth.trim(), (faces || "").trim());
        }
      });
    }

    const itemsToAdd =
      selectedTeeth.length > 1
        ? selectedTeeth.map((tooth) => ({
            ...draftItem,
            tooth,
            face: faceMap.get(tooth) || "",
            quantity: "1",
          }))
        : [
            {
              ...draftItem,
              tooth: draftItem.tooth,
              face: encodedFaces.includes("|")
                ? faceMap.get(String(draftItem.tooth || "").trim()) || ""
                : draftItem.face,
            },
          ];

    setDraftItems((current) => [...current, ...itemsToAdd]);
    setSearch("");
    setFilteredProcedures([]);
    setShowDropdown(false);
    setDraftItem({ ...emptyDraftItem });
    setOdontogramResetKey((current) => current + 1);
  };

  const removeItem = (index: number) => {
    setDraftItems((current) => current.filter((_, i) => i !== index));
  };

  const saveBudget = async () => {
    if (draftItems.length === 0) {
      alert("Adicione pelo menos um item ao orçamento.");
      return;
    }

    try {
      setSavingBudget(true);

      let currentBudgetId = budgetId;

      if (!currentBudgetId) {
        const { data: createdBudget, error: budgetError } = await supabase
          .from("budgets")
          .insert({
            patient_id: params.id,
            status: "pendente",
            discount_type: discountType,
            discount_value: parseMoney(discountValue),
            subtotal,
            total,
            installments: Number(installments || 1),
            entry_value: Math.max(0, Math.min(parseMoney(entryValue), total)),
            entry_status: entryStatus,
            receipt_type: receiptType,
            notes: notes || null,
          })
          .select("*")
          .single();

        if (budgetError) throw budgetError;

        currentBudgetId = createdBudget.id;
      } else {
        const { error: updateError } = await supabase
          .from("budgets")
          .update({
            discount_type: discountType,
            discount_value: parseMoney(discountValue),
            subtotal,
            total,
            installments: Number(installments || 1),
            entry_value: Math.max(0, Math.min(parseMoney(entryValue), total)),
            entry_status: entryStatus,
            receipt_type: receiptType,
            notes: notes || null,
          })
          .eq("id", currentBudgetId);

        if (updateError) throw updateError;

        const { error: deleteItemsError } = await supabase
          .from("budget_items")
          .delete()
          .eq("budget_id", currentBudgetId);

        if (deleteItemsError) throw deleteItemsError;
      }

      const itemsToInsert = draftItems.map((item) => {
        const unitPrice = parseMoney(item.unit_price);
        const quantity = Number(item.quantity || 1);
        const itemTotal = unitPrice * quantity;

        return {
          budget_id: currentBudgetId,
          tooth: item.tooth || null,
          face: item.face || null,
          procedure_name: item.procedure_name || null,
          treatment_name: item.treatment_name || null,
          unit_price: unitPrice,
          quantity,
          discount_value: 0,
          total: itemTotal,
          amount: itemTotal,
          status: "pendente",
        };
      });

      const { error: itemsError } = await supabase
        .from("budget_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert("Orçamento salvo com sucesso.");
      resetForm();
      router.push(`/pacientes/${params.id}/orcamento`);
      await loadData();
    } catch (error: any) {
      alert("Erro ao salvar orçamento: " + error.message);
    } finally {
      setSavingBudget(false);
    }
  };

  const deleteBudget = async (budget: Budget) => {
    if (normalizeBudgetStatus(budget.status) === "aprovado") {
      alert("Não é permitido excluir orçamento aprovado.");
      return;
    }

    const confirmed = confirm("Deseja realmente excluir este orçamento salvo?");
    if (!confirmed) return;

    try {
      setDeletingBudgetId(budget.id);

      const { error: deleteItemsError } = await supabase
        .from("budget_items")
        .delete()
        .eq("budget_id", budget.id);

      if (deleteItemsError) throw deleteItemsError;

      const { error: deleteBudgetError } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budget.id);

      if (deleteBudgetError) throw deleteBudgetError;

      if (budgetId === budget.id) {
        resetForm();
        router.push(`/pacientes/${params.id}/orcamento`);
      } else {
        await loadData();
      }

      alert("Orçamento excluído com sucesso.");
    } catch (error: any) {
      alert("Erro ao excluir orçamento: " + error.message);
    } finally {
      setDeletingBudgetId(null);
    }
  };

  const ensureFinancialForApprovedBudget = async (
    budget: Budget,
    treatments: PatientTreatment[]
  ) => {
    const { data: existingFinancial, error: existingFinancialError } =
      await supabase
        .from("financial_records")
        .select("id")
        .eq("budget_id", budget.id)
        .limit(1);

    if (existingFinancialError) throw existingFinancialError;

    if (existingFinancial && existingFinancial.length > 0) {
      return;
    }

    const numberOfInstallments = Math.max(1, Number(budget.installments || 1));
    const receipt = budget.receipt_type || "nenhum";
    const totalValue = Number(budget.total || 0);
    const rawEntryValue = Number(budget.entry_value || 0);
    const entryValue = Math.max(0, Math.min(rawEntryValue, totalValue));
    const entryStatus = budget.entry_status === "pendente" ? "pendente" : "pago";
    const remainingValue = Math.max(0, Number((totalValue - entryValue).toFixed(2)));
    const installmentValues =
      remainingValue > 0
        ? splitIntoInstallments(remainingValue, numberOfInstallments)
        : [];

    const resumoTratamentos = treatments
      .map((t) => {
        const nome = t.procedure_name || t.treatment_name || t.title || "Tratamento";
        const dente = t.tooth ? ` • Dente ${t.tooth}` : "";
        const face = t.face ? ` • Face ${t.face}` : "";
        return `${nome}${dente}${face}`;
      })
      .join(" | ");

    const descricaoBase =
      resumoTratamentos.trim() !== "" ? resumoTratamentos : "Orçamento aprovado";

    const financialRecords: any[] = [];

    if (entryValue > 0) {
      const entryDate = new Date();
      entryDate.setHours(12, 0, 0, 0);

      financialRecords.push({
        patient_id: budget.patient_id,
        patient_treatment_id: null,
        budget_id: budget.id,
        description: `${descricaoBase} • Entrada`,
        amount: entryValue,
        paid_amount: entryStatus === "pago" ? entryValue : 0,
        installment_number: 0,
        installments: numberOfInstallments,
        status: entryStatus === "pago" ? "pago" : "pendente",
        receipt_type: receipt,
        due_date: entryDate.toISOString().slice(0, 10),
        created_at: entryDate.toISOString(),
      });
    }

    installmentValues.forEach((installmentAmount, index) => {
      const installmentDate = getMonthlyInstallmentDate(entryValue > 0 ? index + 1 : index);

      financialRecords.push({
        patient_id: budget.patient_id,
        patient_treatment_id: null,
        budget_id: budget.id,
        description: `${descricaoBase} • Parcela ${index + 1}/${numberOfInstallments}`,
        amount: installmentAmount,
        paid_amount: 0,
        installment_number: index + 1,
        installments: numberOfInstallments,
        status: "pendente",
        receipt_type: receipt,
        due_date: installmentDate.toISOString().slice(0, 10),
        created_at: installmentDate.toISOString(),
      });
    });

    if (financialRecords.length === 0) {
      return;
    }

    const { error: financialError } = await supabase
      .from("financial_records")
      .insert(financialRecords);

    if (financialError) {
      const message = String(financialError.message || "").toLowerCase();

      if (message.includes("due_date") || message.includes("schema cache")) {
        const fallbackRecords = financialRecords.map(({ due_date, ...record }) => record);

        const { error: fallbackFinancialError } = await supabase
          .from("financial_records")
          .insert(fallbackRecords);

        if (fallbackFinancialError) throw fallbackFinancialError;
      } else {
        throw financialError;
      }
    }
  };


  const confirmApproveBudget = async (budget: Budget) => {
    try {
      const { data: items, error: itemsError } = await supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", budget.id)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        alert("Este orçamento não possui itens para aprovar.");
        return;
      }

      const totalValue = Number(budget.total || 0);
      const parcelas = Math.max(1, Number(budget.installments || 1));
      const entrada = Math.max(
        0,
        Math.min(Number(budget.entry_value || 0), totalValue)
      );
      const entradaStatus =
        budget.entry_status === "pendente" ? "pendente" : "pago";
      const restante = Math.max(0, Number((totalValue - entrada).toFixed(2)));
      const installmentValues =
        restante > 0 ? splitIntoInstallments(restante, parcelas) : [];
      const valorParcelaTexto =
        installmentValues.length === 0
          ? "Sem parcelas restantes."
          : installmentValues
              .map((value, index) => {
                const date = getMonthlyInstallmentDate(
                  entrada > 0 ? index + 1 : index
                ).toLocaleDateString("pt-BR");
                return `Parcela ${index + 1}: ${formatCurrency(value)} - ${date}`;
              })
              .join("\n");

      const entradaTexto =
        entrada > 0
          ? `• Entrada: ${formatCurrency(entrada)} (${entradaStatus === "pago" ? "paga" : "pendente"})\n`
          : "";

      const mensagem =
        `Este orçamento irá gerar:\n\n` +
        `• ${items.length} tratamento(s) no prontuário\n` +
        `• Total: ${formatCurrency(totalValue)}\n` +
        entradaTexto +
        `• Saldo a parcelar: ${formatCurrency(restante)}\n` +
        `• ${parcelas} parcela(s) no financeiro\n\n` +
        `${valorParcelaTexto}\n\n` +
        `Deseja continuar com a aprovação?`;

      const confirmado = window.confirm(mensagem);
      if (!confirmado) return;

      await approveBudget(budget);
    } catch (error: any) {
      alert("Erro ao preparar aprovação: " + error.message);
    }
  };

  const approveBudget = async (budget: Budget) => {
    try {
      setApprovingBudgetId(budget.id);

      const { data: items, error: itemsError } = await supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", budget.id)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        alert("Este orçamento não possui itens para aprovar.");
        return;
      }

      const { data: existingTreatments, error: existingTreatmentsError } =
        await supabase
          .from("patient_treatments")
          .select("*")
          .eq("budget_id", budget.id);

      if (existingTreatmentsError) throw existingTreatmentsError;

      let treatmentsForBudget: PatientTreatment[] =
        (existingTreatments || []) as PatientTreatment[];

      // Ordem corrigida: tratamentos, nota clínica e financeiro primeiro.
      // Só depois o orçamento vira "aprovado".
      if (!treatmentsForBudget || treatmentsForBudget.length === 0) {
        const treatmentsToInsert = items.map((item: any) => ({
          patient_id: budget.patient_id,
          budget_id: budget.id,
          budget_item_id: item.id,
          title: item.procedure_name || item.treatment_name || "Tratamento",
          treatment_name: item.treatment_name || null,
          procedure_name: item.procedure_name || null,
          tooth: item.tooth || null,
          face: item.face || null,
          unit_price: Number(item.unit_price || 0),
          quantity: Number(item.quantity || 1),
          total: Number(item.total || item.amount || 0),
          status: "pendente",
        }));

        const { data: insertedTreatments, error: treatmentInsertError } =
          await supabase
            .from("patient_treatments")
            .insert(treatmentsToInsert)
            .select("*");

        if (treatmentInsertError) throw treatmentInsertError;

        treatmentsForBudget = (insertedTreatments || []) as PatientTreatment[];

        const resumo = items
          .map((item: any) => {
            const nome =
              item.procedure_name || item.treatment_name || "Procedimento";
            const dente = item.tooth ? ` | Dente: ${item.tooth}` : "";
            const face = item.face ? ` | Face: ${item.face}` : "";
            return `• ${nome}${dente}${face}`;
          })
          .join("\n");

        const { error: noteError } = await supabase.from("clinical_notes").insert({
          patient_id: budget.patient_id,
          title: "Orçamento aprovado",
          content:
            `Orçamento aprovado em ${new Date().toLocaleDateString("pt-BR")}.\n` +
            `Valor total: R$ ${Number(budget.total || 0).toFixed(2)}.\n` +
            `Parcelas: ${Math.max(1, Number(budget.installments || 1))}.\n\n` +
            `Tratamentos liberados:\n${resumo}`,
        });

        if (noteError) throw noteError;
      }

      await ensureFinancialForApprovedBudget(budget, treatmentsForBudget);

      const { error: budgetStatusError } = await supabase
        .from("budgets")
        .update({
          status: "aprovado",
          approved_at: new Date().toISOString(),
        })
        .eq("id", budget.id);

      if (budgetStatusError) throw budgetStatusError;

      alert("Orçamento aprovado, tratamentos criados e financeiro lançado.");
      router.push(`/pacientes/${params.id}`);
    } catch (error: any) {
      alert("Erro ao aprovar orçamento: " + error.message);
    } finally {
      setApprovingBudgetId(null);
    }
  };

  const selectedBudget = budgets.find((b) => b.id === budgetId);

  const pendingBudgets = budgets.filter(
    (budget) => normalizeBudgetStatus(budget.status) !== "aprovado"
  );

  const approvedBudgets = budgets.filter(
    (budget) => normalizeBudgetStatus(budget.status) === "aprovado"
  );

  const orderedBudgets = [...pendingBudgets, ...approvedBudgets];

  const budgetStatusBadgeClass = (status?: string | null) => {
    if (normalizeBudgetStatus(status) === "aprovado") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  const budgetStatusLabel = (status?: string | null) => {
    if (normalizeBudgetStatus(status) === "aprovado") return "Aprovado";
    return "Pendente";
  };

  const budgetCreatedDate = (budget: Budget) => {
    return budget.created_at
      ? new Date(budget.created_at).toLocaleDateString("pt-BR")
      : "-";
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-4 pb-24">
        <div className="bg-white border border-[#d9eeee] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-slate-800">
              Orçamentos do paciente
            </h1>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closePage}
                className="px-3.5 py-2 border border-[#d9eeee] rounded-xl text-[13px] bg-white"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  router.push(`/pacientes/${params.id}/orcamento`);
                }}
                className="px-3.5 py-2 border border-[#d9eeee] rounded-xl text-[13px] bg-white"
              >
                Novo orçamento
              </button>
            </div>
          </div>

          <h2 className="text-[16px] font-semibold text-slate-800 mb-3">
            {budgetId ? "Editar orçamento" : "Novo orçamento"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            <div className="md:col-span-6 relative">
              <label className="block text-xs font-medium text-slate-500 mb-1">Procedimento</label>
              <input
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearch(value);
                  setShowDropdown(true);
                  setDraftItem((current) => ({
                    ...current,
                    procedure_name: value,
                    treatment_name: value,
                  }));
                }}
                placeholder="Digite o procedimento..."
                className="border border-[#d9eeee] rounded-xl px-3 py-2.5 text-[13px] w-full bg-[#fbffff]"
              />

              {showDropdown && filteredProcedures.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-[#d9eeee] rounded-xl shadow max-h-56 overflow-y-auto">
                  {filteredProcedures.map((procedure) => (
                    <button
                      key={procedure.id}
                      type="button"
                      onClick={() => selectProcedure(procedure)}
                      className="w-full text-left px-3 py-2 hover:bg-[#f6ffff] text-sm"
                    >
                      <div className="font-medium text-slate-800">
                        {procedure.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {procedure.categoria || "Sem categoria"} •{" "}
                        {formatCurrency(parseMoney(procedure.price))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={draftItem.unit_price}
                onChange={(e) =>
                  setDraftItem((current) => ({
                    ...current,
                    unit_price: e.target.value,
                  }))
                }
                className="border border-[#d9eeee] rounded-xl px-3 py-2.5 text-[13px] bg-[#fbffff] w-full"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">Dente / Região</label>
              <select
                value={draftItem.tooth}
                onChange={(e) =>
                  setDraftItem((prev) => ({
                    ...prev,
                    tooth: e.target.value,
                    face: "",
                  }))
                }
                className="w-full h-[42px] border border-[#d9eeee] rounded-xl px-3 text-[13px] bg-[#fbffff] text-slate-700"
              >
                <option value="">Selecionar dente</option>
                {[...superioresEsquerda, ...superioresDireita, ...inferioresEsquerda, ...inferioresDireita].map((tooth) => (
                  <option key={tooth} value={tooth}>
                    Dente {tooth}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                type="button"
                onClick={addItem}
                className="w-full bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#7ccfce] text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-sm"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-[#e4f3f3] bg-white/80 p-2 shadow-[0_8px_24px_rgba(15,118,110,0.035)]">
            <OdontogramaNovo
              key={odontogramResetKey}
              draftItem={draftItem}
              setDraftItem={setDraftItem}
            />
          </div>

          <div className="mt-3 space-y-2">
            {draftItems.length === 0 && (
              <p className="text-[13px] text-slate-500">
                Nenhum item adicionado ainda.
              </p>
            )}

            {draftItems.map((item, index) => {
              const itemTotal =
                parseMoney(item.unit_price) * Number(item.quantity || 1);

              return (
                <div
                  key={`${item.procedure_name}-${index}`}
                  className="border border-[#e3f2f2] rounded-xl p-3 bg-[#fbffff] flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="text-sm text-slate-700">
                    <div className="font-semibold text-slate-800">
                      {item.procedure_name || item.treatment_name || "Item"}
                    </div>
                    {item.tooth && <div>Dente: {item.tooth}</div>}
                    {item.face && <div>Face(s): {item.face}</div>}
                    <div>
                      {Number(item.quantity || 1)} ×{" "}
                      {formatCurrency(parseMoney(item.unit_price))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-slate-800">
                      {formatCurrency(itemTotal)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="px-3 py-1.5 rounded-xl border border-[#d9eeee] text-sm bg-white"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5 mt-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Parcelas do saldo
              </label>
              <input
                type="number"
                min="1"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                className="w-full border border-[#d9eeee] rounded-xl px-3 py-2.5 text-[13px] bg-[#fbffff]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Entrada
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={entryValue}
                onChange={(e) => setEntryValue(e.target.value)}
                className="w-full border border-[#d9eeee] rounded-xl px-3 py-2.5 text-[13px] bg-[#fbffff]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Status entrada
              </label>
              <select
                value={entryStatus}
                onChange={(e) => setEntryStatus(e.target.value)}
                className="w-full border border-[#d9eeee] rounded-xl px-3 py-2.5 text-[13px] bg-[#fbffff]"
              >
                <option value="pago">Paga</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Tipo de desconto
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full border border-[#d9eeee] rounded-xl px-3 py-2.5 text-[13px] bg-[#fbffff]"
              >
                <option value="valor">Desconto R$</option>
                <option value="percentual">Desconto %</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Desconto
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full border border-[#d9eeee] rounded-xl px-3 py-2.5 text-[13px] bg-[#fbffff]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Tipo de recibo
              </label>
              <select
                value={receiptType}
                onChange={(e) => setReceiptType(e.target.value)}
                className="w-full border border-[#d9eeee] rounded-xl px-3 py-2.5 text-[13px] bg-[#fbffff]"
              >
                <option value="nenhum">Sem recibo</option>
                <option value="simples">Recibo simples</option>
                <option value="imposto_renda">Recibo IR</option>
              </select>
            </div>

            <div className="bg-[#f7ffff] border border-[#d9eeee] rounded-xl px-3 py-2.5 text-[13px]">
              <div>Subtotal: {formatCurrency(subtotal)}</div>
              <div>Desconto: {formatCurrency(computedDiscount)}</div>
              <div>Entrada: {formatCurrency(Math.max(0, Math.min(parseMoney(entryValue), total)))}</div>
              <div>Saldo: {formatCurrency(Math.max(0, total - Math.max(0, Math.min(parseMoney(entryValue), total))))}</div>
              <div className="font-semibold text-slate-800">
                Total: {formatCurrency(total)}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[100px] border border-[#d9eeee] rounded-xl px-3 py-2.5 text-[13px] bg-[#fbffff]"
              placeholder="Observações do orçamento"
            />
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3.5 py-2 border border-[#d9eeee] rounded-xl text-[13px] bg-white"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={saveBudget}
              disabled={savingBudget}
              className="bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#7ccfce] text-white px-3.5 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-60 shadow-sm"
            >
              {savingBudget ? "Salvando..." : "Salvar orçamento"}
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#d9eeee] rounded-2xl p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-slate-800">
                Orçamentos cadastrados
              </h2>
              <p className="text-[13px] text-slate-500">
                Pendentes em destaque. Aprovados ficam como histórico do paciente.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-amber-700">
                Pendentes: {pendingBudgets.length}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                Aprovados: {approvedBudgets.length}
              </span>
            </div>
          </div>

          {budgets.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-6 text-center text-[13px] text-slate-500">
              Nenhum orçamento encontrado para este paciente.
            </div>
          )}

          <div className="space-y-2">
            {orderedBudgets.map((budget) => {
              const isApproved = normalizeBudgetStatus(budget.status) === "aprovado";
              const isSelected = selectedBudget?.id === budget.id;

              return (
                <div
                  key={budget.id}
                  className={`rounded-2xl border px-3 py-2.5 transition ${
                    isSelected
                      ? "border-[#1db7b3] bg-white shadow-sm"
                      : isApproved
                        ? "border-[#e8f2f2] bg-white/70 opacity-85"
                        : "border-[#d9eeee] bg-[#fbffff] hover:bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          Orçamento de {budgetCreatedDate(budget)}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal ${budgetStatusBadgeClass(
                            budget.status
                          )}`}
                        >
                          {budgetStatusLabel(budget.status)}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                        <span>
                          Total: <strong className="text-slate-800">{formatCurrency(parseMoney(budget.total))}</strong>
                        </span>
                        <span>Entrada: {formatCurrency(parseMoney(budget.entry_value))}</span>
                        <span>{budget.installments || 1} parcela(s)</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Link
                        href={`/pacientes/${params.id}/orcamento?budgetId=${budget.id}`}
                        className="rounded-xl border border-[#d9eeee] bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-[#f7ffff]"
                      >
                        Abrir
                      </Link>

                      <Link
                        href={`/print/orcamento/${budget.id}`}
                        target="_blank"
                        className="rounded-xl border border-[#bde8e7] bg-[#eefafa] px-3 py-2 text-[13px] font-semibold text-[#239d9a] hover:bg-[#dff5f4]"
                      >
                        PDF
                      </Link>

                      {!isApproved && (
                        <>
                          <button
                            type="button"
                            onClick={() => confirmApproveBudget(budget)}
                            disabled={approvingBudgetId === budget.id}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                          >
                            {approvingBudgetId === budget.id ? "Aprovando..." : "Aprovar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteBudget(budget)}
                            disabled={deletingBudgetId === budget.id}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                          >
                            {deletingBudgetId === budget.id ? "Excluindo..." : "Excluir"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedBudget && (
          <div className="bg-white border border-[#d9eeee] rounded-2xl p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-bold text-slate-800">
                    Itens do orçamento aberto
                  </h2>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal ${budgetStatusBadgeClass(
                      selectedBudget.status
                    )}`}
                  >
                    {budgetStatusLabel(selectedBudget.status)}
                  </span>
                </div>
                <p className="text-[13px] text-slate-500">
                  Exibindo apenas o orçamento selecionado na lista.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/print/orcamento/${selectedBudget.id}`}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#7ccfce] px-4 py-2 text-sm font-black text-white shadow-sm hover:opacity-95"
                >
                  Imprimir orçamento premium
                </Link>

                <Link
                  href={`/pacientes/${params.id}/orcamento`}
                  className="inline-flex items-center justify-center rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-[#f7ffff]"
                >
                  Fechar detalhes
                </Link>
              </div>
            </div>

            {budgetItems.length === 0 && (
              <p className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-4 text-[13px] text-slate-500">
                Nenhum item encontrado neste orçamento.
              </p>
            )}

            <div className="space-y-2">
              {budgetItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#e3f2f2] bg-[#fbffff] px-3 py-2.5 text-[13px] text-slate-700"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="font-black text-slate-800">
                        {item.procedure_name || item.treatment_name || "Procedimento"}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-[#168f8d]">
                        {item.tooth && (
                          <span className="rounded-full bg-[#e9fbfb] px-2 py-0.5">
                            Dente {item.tooth}
                          </span>
                        )}
                        {item.face && (
                          <span className="rounded-full bg-[#e9fbfb] px-2 py-0.5">
                            Face(s) {item.face}
                          </span>
                        )}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                          Qtd. {item.quantity || 1}
                        </span>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <div className="text-xs text-slate-500">
                        Unitário: {formatCurrency(parseMoney(item.unit_price))}
                      </div>
                      <div className="text-sm font-semibold text-slate-800">
                        {formatCurrency(parseMoney(item.total || item.amount))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={closePage}
            className="px-3.5 py-2 border border-[#d9eeee] rounded-xl text-[13px] bg-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}