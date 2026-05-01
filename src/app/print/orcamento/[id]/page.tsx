"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "@/lib/supabase";

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

type Patient = {
  id: string;
  name?: string | null;
  cpf?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

type ClinicSettings = {
  name?: string | null;
  display_name?: string | null;
  owner?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  cro?: string | null;
};

function parseMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(",", ".")) || 0;
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBr(value?: string | null) {
  if (!value) return "-";
  const clean = String(value).split("T")[0];
  const [year, month, day] = clean.split("-");
  if (!year || !month || !day) return clean;
  return `${day}/${month}/${year}`;
}

function normalizeStatus(value?: string | null) {
  const status = String(value || "pendente").toLowerCase();

  if (status === "aprovado") return "Aprovado";
  if (status === "reprovado") return "Reprovado";
  if (status === "cancelado") return "Cancelado";

  return "Pendente";
}

function receiptLabel(value?: string | null) {
  if (value === "simples") return "Recibo simples";
  if (value === "imposto_renda") return "Recibo para Imposto de Renda";
  return "Sem recibo";
}

export default function PrintOrcamentoPage() {
  const params = useParams();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement | null>(null);

  const budgetId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const subtotal = parseMoney(budget?.subtotal);
  const total = parseMoney(budget?.total);
  const discount = parseMoney(budget?.discount_value);
  const entryValue = Math.max(0, Math.min(parseMoney(budget?.entry_value), total));
  const remaining = Math.max(0, total - entryValue);
  const installments = Math.max(1, Number(budget?.installments || 1));
  const installmentValue = installments > 0 ? remaining / installments : remaining;

  const clinicName =
    clinicSettings?.name ||
    clinicSettings?.display_name ||
    "Consultório Odontológico";

  const professionalName =
    clinicSettings?.owner ||
    "Dr(a). Henrique S. Pasquali";

  const safePatientName = useMemo(() => {
    return String(patient?.name || "paciente")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }, [patient?.name]);

  const loadData = async () => {
    if (!budgetId) return;

    try {
      setLoading(true);

      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", budgetId)
        .maybeSingle();

      if (budgetError) throw budgetError;

      if (!budgetData) {
        alert("Orçamento não encontrado.");
        setBudget(null);
        return;
      }

      setBudget(budgetData as Budget);

      const [{ data: itemsData, error: itemsError }, { data: patientData }, { data: clinicData }] =
        await Promise.all([
          supabase
            .from("budget_items")
            .select("*")
            .eq("budget_id", budgetId)
            .order("created_at", { ascending: true }),
          supabase
            .from("patients")
            .select("*")
            .eq("id", budgetData.patient_id)
            .maybeSingle(),
          supabase
            .from("clinic_settings")
            .select("*")
            .eq("id", 1)
            .maybeSingle(),
        ]);

      if (itemsError) throw itemsError;

      setItems((itemsData || []) as BudgetItem[]);
      setPatient((patientData || null) as Patient | null);
      setClinicSettings((clinicData || null) as ClinicSettings | null);
    } catch (error: any) {
      alert("Erro ao carregar orçamento: " + (error?.message || "erro inesperado"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [budgetId]);

  const generatePdf = async () => {
    const element = printRef.current;

    if (!element) {
      alert("Não foi possível encontrar o conteúdo para gerar o PDF.");
      return;
    }

    try {
      setGeneratingPdf(true);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`Orcamento_${safePatientName || "paciente"}_${today}.pdf`);
    } catch (error: any) {
      alert("Erro ao gerar PDF: " + (error?.message || "erro desconhecido"));
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7ffff] p-6 text-slate-600">
        Carregando orçamento...
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7ffff] p-6">
        <div className="rounded-3xl border border-[#d9eeee] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-800">Orçamento não encontrado</h1>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 rounded-xl bg-[#239d9a] px-5 py-2 text-sm font-black text-white"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edf8f8] p-3 print:bg-white print:p-0 md:p-6">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          .print-document {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
          }

          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-[#fbffff]"
        >
          <ArrowLeft size={17} />
          Voltar
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm"
          >
            <Printer size={17} />
            Imprimir
          </button>

          <button
            type="button"
            onClick={generatePdf}
            disabled={generatingPdf}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-black text-white shadow-sm disabled:opacity-60"
          >
            <Download size={17} />
            {generatingPdf ? "Gerando..." : "Baixar PDF"}
          </button>
        </div>
      </div>

      <main
        ref={printRef}
        className="print-document mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#d9eeee] bg-white shadow-xl"
      >
        <section className="relative overflow-hidden bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] p-8 text-white md:p-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/15" />
          <div className="absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-white/10" />

          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-50">
                Proposta de tratamento
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Orçamento Odontológico
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-cyan-50">
                Documento com os procedimentos propostos, valores, condições de pagamento
                e observações clínicas registradas no sistema.
              </p>
            </div>

            <div className="rounded-3xl border border-white/25 bg-white/15 p-5 text-left shadow-sm backdrop-blur md:min-w-[260px] md:text-right">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-50">
                {clinicName}
              </div>

              <div className="mt-2 text-lg font-black">
                {professionalName}
              </div>

              {clinicSettings?.cro && (
                <div className="mt-1 text-xs font-semibold text-cyan-50">
                  CRO: {clinicSettings.cro}
                </div>
              )}

              {(clinicSettings?.phone || clinicSettings?.whatsapp) && (
                <div className="mt-2 text-xs font-semibold text-cyan-50">
                  {clinicSettings.phone || clinicSettings.whatsapp}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6 p-6 md:p-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="print-avoid-break rounded-3xl border border-[#d9eeee] bg-[#fbffff] p-5 md:col-span-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#239d9a]">
                Paciente
              </div>

              <div className="mt-2 text-2xl font-black text-slate-800">
                {patient?.name || "Paciente"}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                <div>CPF: <strong>{patient?.cpf || "-"}</strong></div>
                <div>Telefone: <strong>{patient?.phone || "-"}</strong></div>
                <div>Email: <strong>{patient?.email || "-"}</strong></div>
                <div>Data: <strong>{formatDateBr(budget.created_at)}</strong></div>
              </div>
            </div>

            <div className="print-avoid-break rounded-3xl border border-[#bde8e7] bg-[#f2fcfc] p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#239d9a]">
                Status
              </div>

              <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-[#239d9a] ring-1 ring-[#d9eeee]">
                {normalizeStatus(budget.status)}
              </div>

              <div className="mt-4 text-sm text-slate-600">
                Recibo: <strong>{receiptLabel(budget.receipt_type)}</strong>
              </div>

              <div className="mt-2 text-sm text-slate-600">
                Parcelamento: <strong>{installments}x</strong>
              </div>
            </div>
          </div>

          <div className="print-avoid-break grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Subtotal
              </div>

              <div className="mt-2 text-xl font-black text-slate-800">
                {formatCurrency(subtotal)}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                Desconto
              </div>

              <div className="mt-2 text-xl font-black text-amber-700">
                {formatCurrency(discount)}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                Entrada
              </div>

              <div className="mt-2 text-xl font-black text-emerald-700">
                {formatCurrency(entryValue)}
              </div>

              <div className="mt-1 text-[11px] font-bold text-emerald-700">
                {budget.entry_status === "pendente" ? "Pendente" : "Paga"}
              </div>
            </div>

            <div className="rounded-3xl border border-[#239d9a] bg-[#f7ffff] p-5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#239d9a]">
                Total
              </div>

              <div className="mt-2 text-2xl font-black text-[#239d9a]">
                {formatCurrency(total)}
              </div>
            </div>
          </div>

          <section className="print-avoid-break rounded-3xl border border-[#d9eeee] bg-white shadow-sm">
            <div className="border-b border-[#e8f5f5] bg-[#fbffff] px-5 py-4">
              <h2 className="text-lg font-black text-slate-800">
                Procedimentos propostos
              </h2>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Itens vinculados ao orçamento e ao odontograma funcional por faces.
              </p>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                Nenhum item encontrado neste orçamento.
              </div>
            ) : (
              <div className="divide-y divide-[#edf7f7]">
                {items.map((item, index) => {
                  const quantity = Number(item.quantity || 1);
                  const unit = parseMoney(item.unit_price);
                  const itemTotal = parseMoney(item.total || item.amount) || unit * quantity;

                  return (
                    <div
                      key={item.id || index}
                      className="grid grid-cols-1 gap-3 p-5 md:grid-cols-[1fr_110px_110px_90px_140px]"
                    >
                      <div>
                        <div className="text-sm font-black text-slate-800">
                          {item.procedure_name || item.treatment_name || "Procedimento"}
                        </div>

                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          Valor unitário: {formatCurrency(unit)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Dente
                        </div>

                        <div className="mt-1 text-sm font-bold text-slate-700">
                          {item.tooth || "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Face
                        </div>

                        <div className="mt-1 text-sm font-bold text-slate-700">
                          {item.face || "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Qtd
                        </div>

                        <div className="mt-1 text-sm font-bold text-slate-700">
                          {quantity}
                        </div>
                      </div>

                      <div className="md:text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Total
                        </div>

                        <div className="mt-1 text-base font-black text-[#239d9a]">
                          {formatCurrency(itemTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="print-avoid-break rounded-3xl border border-[#d9eeee] bg-[#fbffff] p-6">
              <h2 className="text-lg font-black text-slate-800">
                Condições de pagamento
              </h2>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex justify-between gap-4 border-b border-[#e8f5f5] pb-2">
                  <span>Entrada</span>
                  <strong>{formatCurrency(entryValue)}</strong>
                </div>

                <div className="flex justify-between gap-4 border-b border-[#e8f5f5] pb-2">
                  <span>Saldo a parcelar</span>
                  <strong>{formatCurrency(remaining)}</strong>
                </div>

                <div className="flex justify-between gap-4 border-b border-[#e8f5f5] pb-2">
                  <span>Parcelas do saldo</span>
                  <strong>{installments}x de {formatCurrency(installmentValue)}</strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Total geral</span>
                  <strong className="text-[#239d9a]">{formatCurrency(total)}</strong>
                </div>
              </div>
            </div>

            <div className="print-avoid-break rounded-3xl border border-[#d9eeee] bg-white p-6">
              <h2 className="text-lg font-black text-slate-800">
                Observações
              </h2>

              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {budget.notes ||
                  "Este orçamento foi elaborado conforme planejamento clínico apresentado. Valores e condições podem ser ajustados conforme evolução do tratamento."}
              </div>
            </div>
          </section>

          <section className="print-avoid-break pt-14">
            <div className="grid grid-cols-1 gap-14 md:grid-cols-2">
              <div className="text-center">
                <div className="h-16" />
                <div className="border-t border-slate-400 pt-3">
                  <div className="font-bold text-slate-800">
                    {patient?.name || "Paciente"}
                  </div>

                  <div className="text-sm text-slate-500">
                    Assinatura do paciente ou responsável
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="h-16" />
                <div className="border-t border-slate-400 pt-3">
                  <div className="font-bold text-slate-800">
                    {professionalName}
                  </div>

                  <div className="text-sm text-slate-500">
                    Assinatura do profissional
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-10 text-center text-xs text-slate-400">
              Documento gerado em {formatDateBr(new Date().toISOString())}.
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
