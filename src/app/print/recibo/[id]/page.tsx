"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBr(value?: string | null) {
  if (!value) return "";

  const cleanValue = String(value).split("T")[0];
  const [year, month, day] = cleanValue.split("-");

  if (!year || !month || !day) return cleanValue;

  return `${day}/${month}/${year}`;
}

function normalizeDocument(type?: string | null, document?: string | null) {
  if (!document) return "";

  const digits = String(document).replace(/\D/g, "");

  if (type === "cnpj" && digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  }

  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  return document;
}

function getRecordAmount(record: any) {
  const paid = Number(record?.paid_amount || 0);
  const amount = Number(record?.amount || 0);

  if (paid > 0) return paid;
  return amount;
}

function cleanProfessionalName(value?: string | null) {
  return String(value || "Dr. Henrique S. Pasquali")
    .replace("Dr(a).", "Dr.")
    .replace("Dra(a).", "Dra.")
    .replace("(a)", "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function PrintReciboPage() {
  const params = useParams();
  const router = useRouter();

  const recordId = params?.id as string;
  const printRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [clinicSettings, setClinicSettings] = useState<any>(null);
  const [financialSettings, setFinancialSettings] = useState<any>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const loadData = async () => {
    if (!recordId) return;

    setLoading(true);

    const { data: financialRecord, error: recordError } = await supabase
      .from("financial_records")
      .select("*")
      .eq("id", recordId)
      .maybeSingle();

    if (recordError) {
      alert("Erro ao carregar recibo: " + recordError.message);
      setLoading(false);
      return;
    }

    setRecord(financialRecord);

    if (financialRecord?.patient_id) {
      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("id", financialRecord.patient_id)
        .maybeSingle();

      setPatient(patientData || null);
    }

    const { data: clinicData } = await supabase
      .from("clinic_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    setClinicSettings(clinicData || null);

    const { data: financialData } = await supabase
      .from("financial_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    setFinancialSettings(financialData || null);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [recordId]);

  const receiptValue = useMemo(() => {
    return getRecordAmount(record);
  }, [record]);

  const receiptType = useMemo(() => {
    return (
      record?.receipt_type ||
      financialSettings?.default_receipt_type ||
      "simples"
    );
  }, [record, financialSettings]);

  const clinicName =
    clinicSettings?.name ||
    clinicSettings?.display_name ||
    "Consultório Odontológico";

  const professionalName = cleanProfessionalName(
    clinicSettings?.owner || clinicName
  );

  const clinicDocument = normalizeDocument(
    clinicSettings?.document_type,
    clinicSettings?.document || clinicSettings?.cnpj
  );

  const patientName =
    patient?.name ||
    record?.patient_name ||
    record?.name ||
    "Paciente não identificado";

  const description =
    record?.description ||
    record?.procedure_name ||
    record?.category ||
    "Serviços odontológicos prestados";

  const paymentMethod =
    record?.payment_method ||
    record?.method ||
    "Forma de pagamento não informada";

  const paymentDate =
    record?.paid_at ||
    record?.payment_date ||
    record?.date ||
    record?.created_at ||
    new Date().toISOString();

  const goBackToPatient = () => {
    const patientId = record?.patient_id || patient?.id;

    if (patientId) {
      try {
        window.localStorage.setItem("patientActiveTab", "financeiro");
      } catch {
        // localStorage pode estar indisponível em alguns ambientes
      }

      router.push(`/pacientes/${patientId}`);
      return;
    }

    router.back();
  };

  const generatePDF = async () => {
    const element = printRef.current;
    if (!element) return;

    try {
      setGeneratingPdf(true);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
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

      const cleanPatientName = String(patientName || "paciente")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      const cleanValue = Number(receiptValue || 0)
        .toFixed(2)
        .replace(".", "_");

      const today = new Date().toISOString().split("T")[0];

      pdf.save(
        `Recibo_${cleanPatientName || "paciente"}_${cleanValue}_${today}.pdf`
      );
    } catch (error: any) {
      alert("Erro ao gerar PDF: " + (error?.message || "tente novamente."));
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#edf8f8] p-6 text-slate-600">
        Carregando recibo...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-[#edf8f8] p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#d9eeee] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-800">
            Recibo não encontrado
          </h1>
          <button
            onClick={goBackToPatient}
            className="mt-4 rounded-xl bg-[#239d9a] px-4 py-2 text-sm font-bold text-white"
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

          .receipt-page {
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

      <div className="no-print mx-auto mb-4 flex max-w-4xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={goBackToPatient}
          className="rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-[#fbffff]"
        >
          Voltar
        </button>

        <div className="flex flex-col gap-2 md:flex-row">
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm"
          >
            Imprimir recibo
          </button>

          <button
            onClick={generatePDF}
            disabled={generatingPdf}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
          >
            {generatingPdf ? "Gerando PDF..." : "Baixar PDF"}
          </button>
        </div>
      </div>

      <main
        ref={printRef}
        className="receipt-page mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-[#d9eeee] bg-white shadow-xl"
      >
        <header className="relative overflow-hidden bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] p-8 text-white md:p-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/15" />
          <div className="absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-white/10" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-50">
                Documento financeiro
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight">
                Recibo de Pagamento
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-cyan-50">
                Comprovante de recebimento vinculado ao financeiro do paciente.
              </p>
            </div>

            <div className="rounded-3xl border border-white/25 bg-white/15 p-5 text-left shadow-sm backdrop-blur md:min-w-[240px] md:text-right">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-50">
                Recibo
              </div>
              <div className="mt-2 text-lg font-black">
                Nº {String(record.id).slice(0, 8).toUpperCase()}
              </div>
              <div className="mt-2 text-xs font-semibold text-cyan-50">
                Emitido em {formatDateBr(new Date().toISOString())}
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-8 p-6 md:p-10">
          <section className="print-avoid-break rounded-3xl border border-[#d9eeee] bg-[#fbffff] p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.5fr_1fr]">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#239d9a]">
                  Emitente
                </div>

                <h2 className="mt-2 text-2xl font-black text-slate-800">
                  {clinicName}
                </h2>

                {clinicDocument && (
                  <p className="mt-1 text-sm text-slate-600">
                    {clinicSettings?.document_type === "cnpj" ? "CNPJ" : "CPF"}:{" "}
                    <strong>{clinicDocument}</strong>
                  </p>
                )}

                {professionalName && (
                  <p className="text-sm text-slate-600">
                    Responsável: <strong>{professionalName}</strong>
                  </p>
                )}

                {clinicSettings?.cro && (
                  <p className="text-sm text-slate-600">
                    CRO: <strong>{clinicSettings.cro}</strong>
                  </p>
                )}
              </div>

              <div className="text-sm text-slate-600 md:text-right">
                {(clinicSettings?.address || clinicSettings?.city) && (
                  <p>
                    {clinicSettings?.address || ""} {clinicSettings?.number || ""}{" "}
                    {clinicSettings?.district
                      ? `- ${clinicSettings.district}`
                      : ""}
                    <br />
                    {clinicSettings?.city || ""}{" "}
                    {clinicSettings?.state ? `- ${clinicSettings.state}` : ""}
                    {clinicSettings?.zip_code
                      ? ` | CEP: ${clinicSettings.zip_code}`
                      : ""}
                  </p>
                )}

                {(clinicSettings?.phone || clinicSettings?.whatsapp) && (
                  <p className="mt-2">
                    Contato: {clinicSettings?.phone || clinicSettings?.whatsapp}
                  </p>
                )}

                {clinicSettings?.email && (
                  <p className="mt-1">Email: {clinicSettings.email}</p>
                )}
              </div>
            </div>
          </section>

          <section className="print-avoid-break">
            <h2 className="text-center text-2xl font-black uppercase tracking-widest text-slate-800">
              Recibo de pagamento
            </h2>

            <p className="mt-8 text-justify text-base leading-8 text-slate-700">
              Recebi de <strong>{patientName}</strong> a importância de{" "}
              <strong className="text-[#239d9a]">
                {formatCurrency(receiptValue)}
              </strong>
              , referente a <strong>{description}</strong>.
            </p>
          </section>

          <section className="print-avoid-break grid grid-cols-1 gap-4 rounded-3xl border border-[#d9eeee] bg-[#fbffff] p-5 md:grid-cols-2">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Paciente
              </div>
              <div className="mt-1 font-bold text-slate-800">{patientName}</div>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Valor recebido
              </div>
              <div className="mt-1 text-lg font-black text-[#239d9a]">
                {formatCurrency(receiptValue)}
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Forma de pagamento
              </div>
              <div className="mt-1 font-bold text-slate-800">
                {paymentMethod}
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Data do pagamento
              </div>
              <div className="mt-1 font-bold text-slate-800">
                {formatDateBr(paymentDate)}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Tipo de recibo
              </div>
              <div className="mt-1 font-bold text-slate-800">
                {receiptType === "ir" || receiptType === "imposto_renda"
                  ? "Recibo para declaração de Imposto de Renda"
                  : "Recibo simples"}
              </div>
            </div>
          </section>

          {financialSettings?.receipt_note && (
            <section className="print-avoid-break rounded-3xl border border-[#d9eeee] bg-white p-5 text-sm leading-7 text-slate-600">
              {financialSettings.receipt_note}
            </section>
          )}

          <section className="print-avoid-break pt-8">
            <p className="text-right text-base text-slate-700">
              {new Date(paymentDate).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>

            <div className="ml-auto mt-16 max-w-sm text-center">
              <div className="h-16" />

              <div className="border-t border-slate-500 pt-3">
                <div className="font-bold text-slate-800">
                  {professionalName || clinicName}
                </div>

                <div className="text-sm text-slate-500">
                  {clinicSettings?.cro
                    ? `CRO: ${clinicSettings.cro}`
                    : "Assinatura do responsável"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e8f5f5] bg-[#fbffff] p-4 text-center text-xs leading-6 text-slate-500">
            <strong>{clinicName}</strong>
            <br />
            {professionalName}
            {clinicSettings?.cro ? ` • CRO ${clinicSettings.cro}` : ""}
            <br />
            {clinicSettings?.phone || clinicSettings?.whatsapp || ""}
            {clinicSettings?.address ? ` • ${clinicSettings.address}` : ""}
            <br />
            Documento gerado em {formatDateBr(new Date().toISOString())}.
          </section>
        </section>
      </main>
    </div>
  );
}