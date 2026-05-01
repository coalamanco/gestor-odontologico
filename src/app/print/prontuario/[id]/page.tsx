"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function formatDateBr(value?: string | null) {
  if (!value) return "";

  const cleanValue = String(value).split("T")[0];
  const [year, month, day] = cleanValue.split("-");

  if (!year || !month || !day) return cleanValue;

  return `${day}/${month}/${year}`;
}

function formatDateTimeBr(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDateBr(value);

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number | string | null | undefined) {
  const numberValue = parseMoney(value);
  return Number(numberValue || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(",", ".")) || 0;
}

function getValue(obj: any, keys: string[]) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") {
      return obj[key];
    }
  }

  return "";
}

function normalizeStatus(value?: string | null) {
  const status = String(value || "").trim().toLowerCase();

  if (status === "pago") return "Pago";
  if (status === "parcial") return "Parcial";
  if (status === "pendente") return "Pendente";
  if (status === "aprovado") return "Aprovado";
  if (status === "reprovado") return "Reprovado";
  if (status === "finalizado") return "Finalizado";
  if (status === "em_atendimento") return "Em atendimento";
  if (status === "confirmado") return "Confirmado";
  if (status === "faltou") return "Faltou";
  if (status === "cancelado" || status === "cancelada") return "Cancelado";
  if (status === "agendado" || status === "agendada") return "Agendado";

  return value || "-";
}

function safeFileName(name: string) {
  return String(name || "paciente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function safeSelect(table: string, patientId: string, orderColumn = "created_at") {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("patient_id", patientId)
      .order(orderColumn, { ascending: true });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4 border-b border-[#d9eeee] pb-3">
      <div>
        <h2 className="text-[18px] font-black text-slate-800">{title}</h2>
        {subtitle && <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-5 text-center text-sm font-semibold text-slate-400">
      {text}
    </div>
  );
}

function StatusBadge({ value }: { value?: string | null }) {
  const label = normalizeStatus(value);
  const lower = label.toLowerCase();

  const className =
    lower.includes("pago") || lower.includes("aprovado") || lower.includes("finalizado") || lower.includes("confirmado")
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : lower.includes("parcial") || lower.includes("pendente") || lower.includes("agendado")
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : lower.includes("faltou") || lower.includes("cancelado") || lower.includes("reprovado")
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${className}`}>
      {label}
    </span>
  );
}

export default function PrintProntuarioPage() {
  const params = useParams();
  const router = useRouter();

  const patientId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [patientProcedures, setPatientProcedures] = useState<any[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<any[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [treatmentNotes, setTreatmentNotes] = useState<any[]>([]);
  const [financialRecords, setFinancialRecords] = useState<any[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [patientFiles, setPatientFiles] = useState<any[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const printRef = useRef<HTMLElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);

  const loadData = async () => {
    if (!patientId) return;

    setLoading(true);

    const { data: patientData, error: patientError } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .maybeSingle();

    if (patientError) {
      alert("Erro ao carregar paciente: " + patientError.message);
      setLoading(false);
      return;
    }

    setPatient(patientData || null);

    const { data: clinicData } = await supabase
      .from("clinic_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    setClinicSettings(clinicData || null);

    const { data: apptData } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", patientId)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    setAppointments(apptData || []);

    const [
      anamnesisRows,
      treatmentRows,
      procedureRows,
      patientTreatmentRows,
      clinicalNoteRows,
      treatmentNoteRows,
      financialRows,
      fileRows,
    ] = await Promise.all([
      safeSelect("anamnesis_answers", patientId),
      safeSelect("treatments", patientId),
      safeSelect("patient_procedures", patientId),
      safeSelect("patient_treatments", patientId),
      safeSelect("clinical_notes", patientId),
      safeSelect("treatment_notes", patientId),
      safeSelect("financial_records", patientId),
      safeSelect("patient_files", patientId),
    ]);

    setAnamnesisAnswers(anamnesisRows);
    setTreatments(treatmentRows);
    setPatientProcedures(procedureRows);
    setPatientTreatments(patientTreatmentRows);
    setClinicalNotes(clinicalNoteRows);
    setTreatmentNotes(treatmentNoteRows);
    setFinancialRecords(financialRows);
    setPatientFiles(fileRows);

    if (financialRows.length > 0) {
      try {
        const ids = financialRows.map((item: any) => item.id).filter(Boolean);
        const { data: txRows } = await supabase
          .from("payment_transactions")
          .select("*")
          .in("financial_record_id", ids)
          .order("received_at", { ascending: true })
          .order("created_at", { ascending: true });

        setPaymentTransactions(txRows || []);
      } catch {
        setPaymentTransactions([]);
      }
    } else {
      setPaymentTransactions([]);
    }

    const { data: signatureRow } = await supabase
      .from("digital_signatures")
      .select("*")
      .eq("patient_id", patientId)
      .eq("document_type", "prontuario")
      .order("signed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setSignatureId(signatureRow?.id || null);
    setSignatureDataUrl(
      signatureRow?.signature_data_url || signatureRow?.signature_data || null,
    );

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  const goBackToPatient = () => {
    try {
      window.localStorage.setItem("patientActiveTab", "sobre");
    } catch {
      // localStorage pode estar indisponível em alguns ambientes
    }

    router.push(`/pacientes/${patientId}`);
  };

  const patientName = patient?.name || "Paciente não identificado";

  const patientDocument =
    patient?.cpf ||
    patient?.document ||
    patient?.rg ||
    patient?.document_number ||
    "";

  const patientBirth =
    patient?.birth_date || patient?.birthday || patient?.date_of_birth || "";

  const patientAddress = [
    patient?.address || patient?.endereco,
    patient?.neighborhood,
    patient?.city,
    patient?.state,
  ]
    .filter(Boolean)
    .join(" • ");

  const allTreatments = useMemo(() => {
    const rows = [...patientTreatments, ...treatments, ...patientProcedures];

    return rows.sort((a, b) => {
      const aDate = getValue(a, ["completed_at", "date", "created_at"]);
      const bDate = getValue(b, ["completed_at", "date", "created_at"]);
      return String(aDate || "").localeCompare(String(bDate || ""));
    });
  }, [patientTreatments, treatments, patientProcedures]);

  const totalPlanned = useMemo(() => {
    return financialRecords.reduce((sum, item) => sum + parseMoney(item.amount), 0);
  }, [financialRecords]);

  const totalPaid = useMemo(() => {
    return financialRecords.reduce((sum, item) => sum + parseMoney(item.paid_amount), 0);
  }, [financialRecords]);

  const totalOpen = useMemo(() => {
    return financialRecords.reduce((sum, item) => {
      const amount = parseMoney(item.amount);
      const paid = parseMoney(item.paid_amount);
      return sum + Math.max(0, amount - paid);
    }, 0);
  }, [financialRecords]);

  const paymentsByRecord = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    paymentTransactions.forEach((tx) => {
      if (!grouped[tx.financial_record_id]) grouped[tx.financial_record_id] = [];
      grouped[tx.financial_record_id].push(tx);
    });

    return grouped;
  }, [paymentTransactions]);

  const clinicalTimeline = useMemo(() => {
    const rows = [
      ...clinicalNotes.map((item) => ({
        id: `clinical-${item.id}`,
        date: item.created_at,
        title: item.title || "Evolução clínica",
        content: item.content || "",
        type: "Prontuário",
      })),
      ...treatmentNotes.map((item) => ({
        id: `treatment-note-${item.id}`,
        date: item.created_at,
        title: item.title || "Evolução do tratamento",
        content: item.content || "",
        type: "Tratamento",
      })),
    ];

    return rows.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }, [clinicalNotes, treatmentNotes]);

  const prepareCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  };

  const getCanvasPosition = (event: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches?.[0]?.clientX ?? event.clientX;
    const clientY = event.touches?.[0]?.clientY ?? event.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawingSignature = (event: any) => {
    event.preventDefault?.();
    prepareCanvas();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const position = getCanvasPosition(event);
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    setIsDrawing(true);
  };

  const drawSignature = (event: any) => {
    event.preventDefault?.();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const position = getCanvasPosition(event);
    ctx.lineTo(position.x, position.y);
    ctx.stroke();
  };

  const stopDrawingSignature = () => {
    setIsDrawing(false);
  };

  const clearSignatureCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsDrawing(false);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");

    try {
      setSavingSignature(true);

      if (signatureId) {
        const { error } = await supabase
          .from("digital_signatures")
          .update({
            document_title: "Prontuário odontológico",
            signature_data_url: dataUrl,
            signed_name: patientName,
            signed_at: new Date().toISOString(),
          })
          .eq("id", signatureId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("digital_signatures")
          .insert({
            patient_id: patientId,
            document_type: "prontuario",
            document_title: "Prontuário odontológico",
            signature_data_url: dataUrl,
            signed_name: patientName,
            signed_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) throw error;
        setSignatureId(data?.id || null);
      }

      setSignatureDataUrl(dataUrl);
      alert("Assinatura salva com sucesso.");
    } catch (error: any) {
      alert("Erro ao salvar assinatura: " + error.message);
    } finally {
      setSavingSignature(false);
    }
  };

  const allowNewSignature = () => {
    setSignatureDataUrl(null);
    setTimeout(() => {
      clearSignatureCanvas();
      prepareCanvas();
    }, 50);
  };

  const generatePDF = async () => {
    const element = printRef.current;

    if (!element) {
      alert("Não foi possível encontrar o conteúdo do prontuário para gerar o PDF.");
      return;
    }

    try {
      setGeneratingPdf(true);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 0;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`Prontuario_${safeFileName(patientName) || "paciente"}_${today}.pdf`);
    } catch (error: any) {
      alert("Erro ao gerar PDF: " + (error?.message || "erro desconhecido"));
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7ffff] p-6 text-slate-600">
        Carregando prontuário...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-[#f7ffff] p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-800">
            Paciente não encontrado
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
    <div className="min-h-screen bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-3 print:bg-white print:p-0 md:p-6">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          .print-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
          }

          .page-break {
            page-break-before: always;
          }

          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-col gap-2 sm:flex-row sm:justify-between">
        <button
          onClick={goBackToPatient}
          className="rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-[#fbffff]"
        >
          Voltar ao paciente
        </button>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm"
          >
            Imprimir prontuário
          </button>

          <button
            onClick={generatePDF}
            disabled={generatingPdf}
            className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-700 disabled:opacity-60"
          >
            {generatingPdf ? "Gerando PDF..." : "Baixar PDF premium"}
          </button>
        </div>
      </div>

      <main ref={printRef} className="print-page mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#d9eeee] bg-white shadow-sm">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#139895] via-[#2ebbb8] to-[#8bd7d5] px-8 py-9 text-white md:px-10">
          <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-white/15" />
          <div className="absolute -bottom-28 left-1/2 h-64 w-64 rounded-full bg-white/10" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-50/90">
                Prontuário odontológico premium
              </div>
              <h1 className="mt-3 text-3xl font-black leading-tight md:text-4xl">
                {patientName}
              </h1>
              <p className="mt-3 text-sm font-semibold text-cyan-50/90">
                Documento clínico consolidado com histórico, tratamentos, financeiro e assinaturas.
              </p>
            </div>

            <div className="rounded-3xl border border-white/25 bg-white/15 p-4 text-right shadow-sm backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-50/90">
                Emissão
              </div>
              <div className="mt-1 text-xl font-black">
                {formatDateBr(new Date().toISOString())}
              </div>
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-50/90">
                Paciente
              </div>
              <div className="mt-1 text-sm font-bold">
                {patientDocument || "Documento não informado"}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#d9eeee] bg-[#fbffff] px-8 py-6 md:px-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#d9eeee] bg-white p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clínica</div>
              <div className="mt-1 font-black text-slate-800">
                {clinicSettings?.name || clinicSettings?.display_name || "Consultório Odontológico"}
              </div>
              {(clinicSettings?.owner || clinicSettings?.responsible_name) && (
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {clinicSettings?.owner || clinicSettings?.responsible_name}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#d9eeee] bg-white p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contato</div>
              <div className="mt-1 font-bold text-slate-800">
                {clinicSettings?.phone || clinicSettings?.whatsapp || patient?.phone || "-"}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                {clinicSettings?.email || patient?.email || "Email não informado"}
              </div>
            </div>

            <div className="rounded-2xl border border-[#d9eeee] bg-white p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo clínico</div>
              <div className="mt-1 font-bold text-slate-800">
                {allTreatments.length} tratamento(s) • {appointments.length} consulta(s)
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                {clinicalTimeline.length} evolução(ões) registrada(s)
              </div>
            </div>
          </div>
        </section>

        <div className="px-8 py-8 md:px-10">
          <section className="avoid-break pb-8">
            <SectionTitle title="Dados do paciente" subtitle="Identificação e dados cadastrais principais" />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4 md:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome completo</div>
                <div className="mt-1 font-black text-slate-800">{patientName}</div>
              </div>
              <div className="rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documento</div>
                <div className="mt-1 font-bold text-slate-800">{patientDocument || "-"}</div>
              </div>
              <div className="rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nascimento</div>
                <div className="mt-1 font-bold text-slate-800">{formatDateBr(patientBirth) || "-"}</div>
              </div>
              <div className="rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone</div>
                <div className="mt-1 font-bold text-slate-800">{patient?.phone || patient?.whatsapp || "-"}</div>
              </div>
              <div className="rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</div>
                <div className="mt-1 break-words font-bold text-slate-800">{patient?.email || "-"}</div>
              </div>
              <div className="rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4 md:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endereço</div>
                <div className="mt-1 font-bold text-slate-800">{patientAddress || "-"}</div>
              </div>
              {patient?.notes && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:col-span-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">Observações</div>
                  <div className="mt-1 text-sm font-semibold leading-6 text-amber-900">{patient.notes}</div>
                </div>
              )}
            </div>
          </section>

          <section className="avoid-break pb-8">
            <SectionTitle title="Resumo financeiro do paciente" subtitle="Valores vinculados ao prontuário" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-5">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total lançado</div>
                <div className="mt-2 text-2xl font-black text-slate-800">{formatCurrency(totalPlanned)}</div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Total pago</div>
                <div className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(totalPaid)}</div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">Total em aberto</div>
                <div className="mt-2 text-2xl font-black text-amber-800">{formatCurrency(totalOpen)}</div>
              </div>
            </div>
          </section>

          <section className="pb-8">
            <SectionTitle title="Timeline clínica" subtitle="Evoluções e registros clínicos do paciente" />

            {clinicalTimeline.length === 0 ? (
              <EmptyBox text="Nenhuma evolução clínica registrada." />
            ) : (
              <div className="space-y-3">
                {clinicalTimeline.map((item) => (
                  <div key={item.id} className="avoid-break rounded-2xl border border-[#d9eeee] bg-white p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#239d9a]">{item.type}</div>
                        <div className="mt-1 font-black text-slate-800">{item.title}</div>
                      </div>
                      <div className="rounded-full bg-[#eefafa] px-3 py-1 text-xs font-black text-[#239d9a]">
                        {formatDateTimeBr(item.date)}
                      </div>
                    </div>
                    {item.content && (
                      <div className="mt-3 whitespace-pre-wrap rounded-xl bg-[#fbffff] p-3 text-sm leading-6 text-slate-600">
                        {item.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="pb-8">
            <SectionTitle title="Anamnese" subtitle="Respostas registradas no atendimento" />

            {anamnesisAnswers.length === 0 ? (
              <EmptyBox text="Nenhuma resposta de anamnese registrada." />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#d9eeee]">
                {anamnesisAnswers.map((item, index) => (
                  <div key={item.id || index} className="grid grid-cols-1 border-b border-[#edf7f7] last:border-b-0 md:grid-cols-[1.2fr_1fr]">
                    <div className="bg-[#fbffff] p-3 text-sm font-black text-slate-700">
                      {getValue(item, ["question", "pergunta", "label"]) || `Pergunta ${index + 1}`}
                    </div>
                    <div className="p-3 text-sm font-semibold text-slate-600">
                      {getValue(item, ["answer", "resposta", "value"]) || "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="pb-8">
            <SectionTitle title="Histórico de consultas" subtitle="Consultas, retornos e compromissos vinculados ao paciente" />

            {appointments.length === 0 ? (
              <EmptyBox text="Nenhuma consulta registrada." />
            ) : (
              <div className="space-y-3">
                {appointments.map((item) => (
                  <div key={item.id} className="avoid-break rounded-2xl border border-[#d9eeee] bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {formatDateBr(item.date)} • {item.start_time || "--:--"}
                        </div>
                        <div className="mt-1 font-black text-slate-800">{item.title || item.type || "Consulta"}</div>
                        {item.description && <div className="mt-1 text-sm text-slate-500">{item.description}</div>}
                      </div>
                      <StatusBadge value={item.status || "agendado"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="pb-8">
            <SectionTitle title="Procedimentos e tratamentos" subtitle="Tratamentos aprovados, realizados ou em andamento" />

            {allTreatments.length === 0 ? (
              <EmptyBox text="Nenhum procedimento ou tratamento registrado." />
            ) : (
              <div className="space-y-3">
                {allTreatments.map((item, index) => {
                  const name = getValue(item, ["procedure_name", "treatment_name", "name", "title"]) || `Registro ${index + 1}`;
                  const tooth = getValue(item, ["tooth", "dente"]);
                  const face = getValue(item, ["face", "faces"]);
                  const value = getValue(item, ["total", "amount", "price", "unit_price"]);
                  const description = getValue(item, ["description", "notes", "observations", "content"]);

                  return (
                    <div key={item.id || index} className="avoid-break rounded-2xl border border-[#d9eeee] bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="font-black text-slate-800">{name}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-500">
                            Dente: {tooth || "-"} • Face: {face || "-"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusBadge value={getValue(item, ["status"])} />
                            <span className="rounded-full border border-[#d9eeee] bg-[#fbffff] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              {formatDateBr(getValue(item, ["completed_at", "date", "created_at"])) || "Sem data"}
                            </span>
                          </div>
                        </div>

                        {value && (
                          <div className="rounded-2xl bg-[#eefafa] px-4 py-3 text-right font-black text-[#239d9a]">
                            {formatCurrency(value)}
                          </div>
                        )}
                      </div>

                      {description && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-[#fbffff] p-3 text-sm leading-6 text-slate-600">{description}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="pb-8">
            <SectionTitle title="Detalhamento financeiro" subtitle="Débitos, pagamentos, recibos e saldo por lançamento" />

            {financialRecords.length === 0 ? (
              <EmptyBox text="Nenhum registro financeiro vinculado ao paciente." />
            ) : (
              <div className="space-y-3">
                {financialRecords.map((record) => {
                  const amount = parseMoney(record.amount);
                  const paid = parseMoney(record.paid_amount);
                  const open = Math.max(0, amount - paid);
                  const transactions = paymentsByRecord[record.id] || [];

                  return (
                    <div key={record.id} className="avoid-break rounded-2xl border border-[#d9eeee] bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="font-black text-slate-800">{record.description || "Lançamento financeiro"}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            Parcela {record.installment_number || 1}/{record.installments || 1} • Criado em {formatDateBr(record.created_at)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusBadge value={record.status} />
                            <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-purple-700">
                              {record.receipt_type === "imposto_renda" ? "Recibo IR" : record.receipt_type === "simples" ? "Recibo simples" : "Sem recibo"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-right text-xs md:min-w-[320px]">
                          <div className="rounded-xl bg-[#fbffff] p-2">
                            <div className="font-black uppercase text-slate-400">Valor</div>
                            <div className="mt-1 font-black text-slate-800">{formatCurrency(amount)}</div>
                          </div>
                          <div className="rounded-xl bg-emerald-50 p-2">
                            <div className="font-black uppercase text-emerald-700">Pago</div>
                            <div className="mt-1 font-black text-emerald-700">{formatCurrency(paid)}</div>
                          </div>
                          <div className="rounded-xl bg-amber-50 p-2">
                            <div className="font-black uppercase text-amber-700">Saldo</div>
                            <div className="mt-1 font-black text-amber-800">{formatCurrency(open)}</div>
                          </div>
                        </div>
                      </div>

                      {transactions.length > 0 && (
                        <div className="mt-3 rounded-xl border border-[#edf7f7] bg-[#fbffff] p-3">
                          <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Pagamentos registrados</div>
                          <div className="space-y-2">
                            {transactions.map((tx) => (
                              <div key={tx.id} className="flex flex-col gap-1 rounded-lg bg-white p-2 text-xs md:flex-row md:items-center md:justify-between">
                                <div className="font-bold text-slate-700">
                                  {formatDateBr(tx.received_at || tx.created_at)} • {tx.payment_method || "Método não informado"}
                                </div>
                                <div className="font-black text-emerald-700">{formatCurrency(tx.amount)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="pb-8">
            <SectionTitle title="Imagens e documentos" subtitle="Arquivos vinculados ao prontuário" />

            {patientFiles.length === 0 ? (
              <EmptyBox text="Nenhum arquivo vinculado ao prontuário." />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {patientFiles.map((file) => (
                  <div key={file.id} className="avoid-break rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {file.file_type?.startsWith("image/") ? "Imagem/RX" : "Documento"}
                    </div>
                    <div className="mt-1 break-words font-black text-slate-800">{file.file_name || "Arquivo"}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Enviado em {formatDateBr(file.created_at)}</div>
                    {file.file_url && (
                      <div className="mt-2 break-all text-[11px] text-[#239d9a]">{file.file_url}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="page-break pt-10">
            <SectionTitle title="Assinaturas" subtitle="Validação do paciente/responsável e do profissional" />

            <div className="no-print mb-8 rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
                    Assinatura digital do paciente
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Desenhe a assinatura abaixo, salve e depois imprima ou baixe o PDF.
                  </p>
                </div>

                {signatureDataUrl && (
                  <button
                    type="button"
                    onClick={allowNewSignature}
                    className="rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
                  >
                    Refazer assinatura
                  </button>
                )}
              </div>

              {!signatureDataUrl && (
                <div className="mt-4">
                  <canvas
                    ref={canvasRef}
                    width={900}
                    height={260}
                    className="h-[190px] w-full touch-none cursor-crosshair rounded-2xl border border-[#d9eeee] bg-white"
                    onMouseDown={startDrawingSignature}
                    onMouseMove={drawSignature}
                    onMouseUp={stopDrawingSignature}
                    onMouseLeave={stopDrawingSignature}
                    onTouchStart={startDrawingSignature}
                    onTouchMove={drawSignature}
                    onTouchEnd={stopDrawingSignature}
                  />

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={clearSignatureCanvas}
                      className="rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
                      disabled={savingSignature}
                    >
                      Limpar
                    </button>

                    <button
                      type="button"
                      onClick={saveSignature}
                      className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm disabled:opacity-60"
                      disabled={savingSignature}
                    >
                      {savingSignature ? "Salvando..." : "Salvar assinatura"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-20 grid grid-cols-1 gap-16 md:grid-cols-2">
              <div className="text-center">
                {signatureDataUrl && (
                  <img
                    src={signatureDataUrl}
                    alt="Assinatura do paciente"
                    className="mx-auto mb-1 h-24 max-w-full object-contain"
                  />
                )}

                <div className="border-t border-slate-500 pt-3">
                  <div className="font-bold text-slate-800">{patientName}</div>
                  <div className="text-sm text-slate-500">Assinatura do paciente ou responsável</div>
                </div>
              </div>

              <div className="text-center">
                <div className="h-24" />
                <div className="border-t border-slate-500 pt-3">
                  <div className="font-bold text-slate-800">
                    {clinicSettings?.owner || clinicSettings?.name || "Responsável técnico"}
                  </div>
                  <div className="text-sm text-slate-500">Assinatura do profissional</div>
                </div>
              </div>
            </div>

            <div className="mt-12 rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4 text-center text-xs font-semibold text-slate-500">
              Documento impresso em {formatDateTimeBr(new Date().toISOString())}. Este relatório consolida informações clínicas e financeiras registradas no sistema.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
