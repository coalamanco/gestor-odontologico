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
  const clean = String(value).split("T")[0];
  const [year, month, day] = clean.split("-");
  if (!year || !month || !day) return clean;
  return `${day}/${month}/${year}`;
}

function normalizeDocument(type?: string | null, document?: string | null) {
  if (!document) return "";
  const digits = String(document).replace(/\D/g, "");

  if (type === "cnpj" && digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  return document;
}

function cleanProfessionalName(value?: string | null) {
  return String(value || "Dr. Henrique S. Pasquali")
    .replace("Dr(a).", "Dr.")
    .replace("Dra(a).", "Dra.")
    .replace("(a)", "")
    .replace(/\s+/g, " ")
    .trim();
}

function getRecordAmount(record: any) {
  const paid = Number(record?.paid_amount || 0);
  const amount = Number(record?.amount || 0);
  return paid > 0 ? paid : amount;
}

function getPaymentDate(record: any) {
  return (
    record?.paid_at ||
    record?.payment_date ||
    record?.date ||
    record?.created_at ||
    null
  );
}

export default function PrintIRPage() {
  const params = useParams();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement | null>(null);

  const patientId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [clinicSettings, setClinicSettings] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const loadData = async () => {
    if (!patientId) return;

    setLoading(true);

    const { data: patientData } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .maybeSingle();

    setPatient(patientData || null);

    const { data: clinicData } = await supabase
      .from("clinic_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    setClinicSettings(clinicData || null);

    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const { data: financialData, error } = await supabase
      .from("financial_records")
      .select("*")
      .eq("patient_id", patientId)
      .gte("paid_at", start)
      .lte("paid_at", end)
      .order("paid_at", { ascending: true });

    if (error) {
      const { data: fallbackData } = await supabase
        .from("financial_records")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true });

      setRecords(
        (fallbackData || []).filter((record: any) => {
          const date = getPaymentDate(record);
          return String(date || "").startsWith(year);
        })
      );
    } else {
      setRecords(financialData || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [patientId, year]);

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

  const patientDocument = normalizeDocument("cpf", patient?.cpf);

  const totalPaid = useMemo(() => {
    return records.reduce((sum, record) => sum + getRecordAmount(record), 0);
  }, [records]);

  const goBackToPatient = () => {
    if (patientId) {
      try {
        window.localStorage.setItem("patientActiveTab", "financeiro");
      } catch {}
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

      const cleanName = String(patient?.name || "paciente")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      pdf.save(`Declaracao_IR_${cleanName || "paciente"}_${year}.pdf`);
    } catch (error: any) {
      alert("Erro ao gerar PDF: " + (error?.message || "tente novamente."));
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#edf8f8] p-6 text-slate-600">
        Carregando declaração...
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

          .ir-page {
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
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            {Array.from({ length: 6 }).map((_, index) => {
              const optionYear = String(new Date().getFullYear() - index);
              return (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              );
            })}
          </select>

          <button
            onClick={() => window.print()}
            className="rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm"
          >
            Imprimir declaração
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
        className="ir-page mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-[#d9eeee] bg-white shadow-xl"
      >
        <header className="relative overflow-hidden bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] p-8 text-white md:p-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/15" />
          <div className="absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-white/10" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-50">
                Documento fiscal
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight">
                Declaração para Imposto de Renda
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-cyan-50">
                Relação de pagamentos odontológicos realizados pelo paciente no ano-calendário selecionado.
              </p>
            </div>

            <div className="rounded-3xl border border-white/25 bg-white/15 p-5 text-left shadow-sm backdrop-blur md:min-w-[240px] md:text-right">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-50">
                Ano-calendário
              </div>
              <div className="mt-2 text-2xl font-black">{year}</div>
              <div className="mt-2 text-xs font-semibold text-cyan-50">
                Emitido em {formatDateBr(new Date().toISOString())}
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-8 p-6 md:p-10">
          <section className="print-avoid-break grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[#d9eeee] bg-[#fbffff] p-6">
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

              <p className="text-sm text-slate-600">
                Responsável: <strong>{professionalName}</strong>
              </p>

              {clinicSettings?.cro && (
                <p className="text-sm text-slate-600">
                  CRO: <strong>{clinicSettings.cro}</strong>
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-[#d9eeee] bg-white p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#239d9a]">
                Paciente
              </div>

              <h2 className="mt-2 text-2xl font-black text-slate-800">
                {patient?.name || "Paciente não identificado"}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                CPF: <strong>{patientDocument || "-"}</strong>
              </p>

              {patient?.phone && (
                <p className="text-sm text-slate-600">
                  Telefone: <strong>{patient.phone}</strong>
                </p>
              )}
            </div>
          </section>

          <section className="print-avoid-break rounded-3xl border border-[#d9eeee] bg-[#fbffff] p-6">
            <h2 className="text-lg font-black text-slate-800">
              Declaração
            </h2>

            <p className="mt-4 text-justify text-base leading-8 text-slate-700">
              Declaramos, para fins de comprovação junto ao Imposto de Renda, que
              o(a) paciente <strong>{patient?.name || "Paciente não identificado"}</strong>
              {patientDocument ? (
                <>
                  , CPF <strong>{patientDocument}</strong>
                </>
              ) : null}
              , realizou pagamentos referentes a serviços odontológicos no ano-calendário de{" "}
              <strong>{year}</strong>, totalizando a importância de{" "}
              <strong className="text-[#239d9a]">{formatCurrency(totalPaid)}</strong>.
            </p>
          </section>

          <section className="rounded-3xl border border-[#d9eeee] bg-white shadow-sm">
            <div className="border-b border-[#e8f5f5] bg-[#fbffff] px-5 py-4">
              <h2 className="text-lg font-black text-slate-800">
                Pagamentos considerados
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Registros financeiros encontrados para este paciente no ano selecionado.
              </p>
            </div>

            {records.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                Nenhum pagamento encontrado para o ano selecionado.
              </div>
            ) : (
              <div className="divide-y divide-[#edf7f7]">
                {records.map((record, index) => {
                  const value = getRecordAmount(record);
                  const date = getPaymentDate(record);
                  const description =
                    record?.description ||
                    record?.procedure_name ||
                    record?.category ||
                    "Serviços odontológicos";

                  return (
                    <div
                      key={record?.id || index}
                      className="grid grid-cols-1 gap-3 p-5 md:grid-cols-[120px_1fr_150px]"
                    >
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Data
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-700">
                          {formatDateBr(date)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Descrição
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-700">
                          {description}
                        </div>
                      </div>

                      <div className="md:text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Valor
                        </div>
                        <div className="mt-1 text-base font-black text-[#239d9a]">
                          {formatCurrency(value)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="print-avoid-break rounded-3xl border border-[#239d9a] bg-[#f7ffff] p-6 text-center">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#239d9a]">
              Total declarado
            </div>
            <div className="mt-2 text-3xl font-black text-[#239d9a]">
              {formatCurrency(totalPaid)}
            </div>
          </section>

          <section className="print-avoid-break pt-8">
            <p className="text-right text-base text-slate-700">
              {new Date().toLocaleDateString("pt-BR", {
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