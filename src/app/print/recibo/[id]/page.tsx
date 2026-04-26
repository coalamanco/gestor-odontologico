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
        position = heightLeft - imgHeight;
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
      <div className="min-h-screen bg-slate-100 p-6 text-slate-600">
        Carregando recibo...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-800">
            Recibo não encontrado
          </h1>
          <button
            onClick={goBackToPatient}
            className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
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
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-4xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={goBackToPatient}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </button>

        <div className="flex flex-col gap-2 md:flex-row">
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm"
          >
            Imprimir recibo
          </button>

          <button
            onClick={generatePDF}
            disabled={generatingPdf}
            className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-700 disabled:opacity-60"
          >
            {generatingPdf ? "Gerando PDF..." : "Baixar PDF"}
          </button>
        </div>
      </div>

      <main
        ref={printRef}
        className="receipt-page mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm"
      >
        <header className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800">
                {clinicName}
              </h1>

              {clinicDocument && (
                <p className="mt-1 text-sm text-slate-600">
                  {clinicSettings?.document_type === "cnpj" ? "CNPJ" : "CPF"}: {" "}
                  {clinicDocument}
                </p>
              )}

              {clinicSettings?.owner && (
                <p className="text-sm text-slate-600">
                  Responsável: {clinicSettings.owner}
                </p>
              )}

              {clinicSettings?.cro && (
                <p className="text-sm text-slate-600">
                  CRO: {clinicSettings.cro}
                </p>
              )}

              {(clinicSettings?.address || clinicSettings?.city) && (
                <p className="text-sm text-slate-600">
                  {clinicSettings?.address || ""} {clinicSettings?.number || ""}{" "}
                  {clinicSettings?.district ? `- ${clinicSettings.district}` : ""}
                  <br />
                  {clinicSettings?.city || ""} {clinicSettings?.state ? `- ${clinicSettings.state}` : ""}
                  {clinicSettings?.zip_code ? ` | CEP: ${clinicSettings.zip_code}` : ""}
                </p>
              )}

              {(clinicSettings?.phone || clinicSettings?.whatsapp) && (
                <p className="text-sm text-slate-600">
                  Contato: {clinicSettings?.phone || clinicSettings?.whatsapp}
                </p>
              )}

              {clinicSettings?.email && (
                <p className="text-sm text-slate-600">
                  Email: {clinicSettings.email}
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="rounded-2xl bg-[#eefafa] px-5 py-3 text-[#239d9a]">
                <div className="text-xs font-black uppercase tracking-widest">
                  Recibo
                </div>
                <div className="mt-1 text-lg font-black">
                  Nº {String(record.id).slice(0, 8).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="py-8">
          <h2 className="text-center text-2xl font-black uppercase tracking-widest text-slate-800">
            Recibo de pagamento
          </h2>

          <p className="mt-8 text-justify text-base leading-8 text-slate-700">
            Recebi de <strong>{patientName}</strong> a importância de {" "}
            <strong>{formatCurrency(receiptValue)}</strong>, referente a {" "}
            <strong>{description}</strong>.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
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
              <div className="mt-1 font-bold text-slate-800">
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
          </div>

          {financialSettings?.receipt_note && (
            <div className="mt-6 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
              {financialSettings.receipt_note}
            </div>
          )}

          <p className="mt-10 text-right text-base text-slate-700">
            {new Date(paymentDate).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </section>

        <footer className="pt-10">
          <div className="ml-auto max-w-sm border-t border-slate-500 pt-3 text-center">
            <div className="font-bold text-slate-800">
              {clinicSettings?.owner || clinicName}
            </div>
            <div className="text-sm text-slate-500">
              Assinatura do responsável
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
