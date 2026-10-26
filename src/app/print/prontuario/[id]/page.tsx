"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import ExpandedSignaturePad from "@/components/ExpandedSignaturePad";
import { useParams, useRouter } from "next/navigation";

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
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function getValue(obj: any, keys: string[]) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") {
      return obj[key];
    }
  }

  return "";
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
  const status = String(value || "Não informado").trim();
  const label = status.replace(/_/g, " ");
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
      {label}
    </span>
  );
}

export default function PrintProntuarioPage() {
  const params = useParams();
  const router = useRouter();

  const patientId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const generatingPdf = false;
  const [patient, setPatient] = useState<any>(null);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [patientProcedures, setPatientProcedures] = useState<any[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<any[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [treatmentNotes, setTreatmentNotes] = useState<any[]>([]);
  const [patientFiles, setPatientFiles] = useState<any[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const printRef = useRef<HTMLElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [expandedSignatureDraft, setExpandedSignatureDraft] = useState<string | null>(null);

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
      fileRows,
    ] = await Promise.all([
      safeSelect("anamnesis_answers", patientId),
      safeSelect("treatments", patientId),
      safeSelect("patient_procedures", patientId),
      safeSelect("patient_treatments", patientId),
      safeSelect("clinical_notes", patientId),
      safeSelect("treatment_notes", patientId),
      safeSelect("patient_files", patientId),
    ]);

    setAnamnesisAnswers(anamnesisRows);
    setTreatments(treatmentRows);
    setPatientProcedures(procedureRows);
    setPatientTreatments(patientTreatmentRows);
    setClinicalNotes(clinicalNoteRows);
    setTreatmentNotes(treatmentNoteRows);
    setPatientFiles(fileRows);

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

  const clinicalTimeline = useMemo(() => {
    const rows = [
      ...clinicalNotes.filter((item) => {
        const title = String(item.title || "").toLowerCase();
        const content = String(item.content || "").toLowerCase();
        const category = String(item.category || item.type || "").toLowerCase();
        return !(
          /^(crm|campanha|marketing|cobrança|cobranca|orçamento pendente|orcamento pendente)/.test(title.trim()) ||
          /^(crm|marketing|financeiro|cobrança|cobranca)$/.test(category.trim()) ||
          /contato registrado pelo crm|campanha:|mensagem de cobrança|mensagem de cobranca/.test(content)
        );
      }).map((item) => ({
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
    if (!canvas && !expandedSignatureDraft) return;

    const dataUrl = expandedSignatureDraft || canvas!.toDataURL("image/png");

    try {
      setSavingSignature(true);

      if (signatureId) {
        const { error } = await supabase
          .from("digital_signatures")
          .update({
            document_title: "Comprovante de recebimento de cópia do prontuário odontológico",
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
            document_title: "Comprovante de recebimento de cópia do prontuário odontológico",
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
      setExpandedSignatureDraft(null);
      alert("Assinatura salva com sucesso.");
    } catch (error: any) {
      alert("Erro ao salvar assinatura: " + error.message);
    } finally {
      setSavingSignature(false);
    }
  };

  const allowNewSignature = () => {
    setExpandedSignatureDraft(null);
    setSignatureDataUrl(null);
    setTimeout(() => {
      clearSignatureCanvas();
      prepareCanvas();
    }, 50);
  };

  // Usa o mesmo documento clínico compacto para papel e PDF.
  // O usuário seleciona "Salvar como PDF" no destino da impressão.
  const generatePDF = () => {
    alert('Na janela que abrir, escolha "Salvar como PDF" em Destino e clique em Salvar. Assim o PDF terá exatamente a formatação compacta da impressão.');
    printProfessionalDocument();
  };

  const printProfessionalDocument = () => {
    const source = printRef.current;
    if (!source) { alert("Prontuário indisponível para impressão."); return; }

    // Documento independente: não importa CSS/Tailwind do Gestor.
    const copy = source.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(".no-print,button,input,textarea,select,canvas").forEach((node) => node.remove());
    // Evita fundos decorativos, cartões e quebras forçadas da interface.
    copy.querySelectorAll("*").forEach((node) => {
      const element = node as HTMLElement;
      const original = element.getAttribute("class") || "";
      if (original.split(/\s+/).includes("absolute")) { element.remove(); return; }
      element.removeAttribute("class");
      element.removeAttribute("style");
    });
    copy.removeAttribute("class");
    copy.removeAttribute("style");
    copy.id = "clinical-print";

    const frame = document.createElement("iframe");
    frame.title = "Impressão do prontuário";
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) { frame.remove(); alert("Não foi possível abrir a impressão."); return; }
    const css = `
      @page { size:A4 portrait; margin:13mm 15mm; }
      *, *::before, *::after { box-sizing:border-box; }
      html, body { margin:0; padding:0; background:white; color:#20252a; font:9pt/1.35 Arial,Helvetica,sans-serif; }
      #clinical-print { width:100%; margin:0; padding:0; }
      #clinical-print > section:first-child { border-bottom:1px solid #555; padding:0 0 3mm; margin-bottom:3mm; }
      #clinical-print > section:nth-child(2) { padding:0 0 2mm; border-bottom:1px solid #bbb; margin-bottom:2mm; }
      #clinical-print > div { padding:0; }
      h1 { font-size:15pt; margin:1mm 0; line-height:1.2; }
      h2 { font-size:11pt; margin:0 0 1.5mm; padding:0 0 1mm; border-bottom:1px solid #888; }
      h3 { font-size:9pt; margin:0 0 1mm; }
      p { margin:1mm 0 2mm; orphans:3; widows:3; }
      section { margin:0 0 3mm; padding:0; }
      section > div { margin:0 0 1.5mm; }
      section > div > div { margin-bottom:1mm; }
      section > div > div > div { margin-bottom:.7mm; }
      div { min-width:0; }
      main > section:first-child > div { display:flex; justify-content:space-between; gap:8mm; align-items:start; }
      main > section:nth-child(2) > div { display:flex; flex-wrap:wrap; gap:3mm; }
      main > section:nth-child(2) > div > div { flex:1; min-width:40mm; }
      strong, b { font-weight:700; }
      img { max-width:100%; max-height:20mm; object-fit:contain; }
      table { width:100%; border-collapse:collapse; }
      th,td { padding:1.2mm; border-bottom:1px solid #ddd; text-align:left; }
      h1,h2,h3 { break-after:avoid; }
      tr,img { break-inside:avoid; }
      section { break-before:auto; break-after:auto; }
      section > div > div { break-inside:auto; }
      /* Assinaturas: compactas e sem salto de página artificial. */
      section:last-child > div { margin-top:3mm; }
      section:last-child > div > div { margin:0 0 3mm; }
      a { color:#20252a; text-decoration:none; }
      @media print { body { print-color-adjust:economy; -webkit-print-color-adjust:economy; } }
    `;
    doc.open();
    doc.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prontuário odontológico</title><style>' + css + '</style></head><body>' + copy.outerHTML + '</body></html>');
    doc.close();
    const cleanup = () => window.setTimeout(() => frame.remove(), 2000);
    frame.contentWindow?.addEventListener("afterprint", cleanup, { once:true });
    window.setTimeout(() => { frame.contentWindow?.focus(); frame.contentWindow?.print(); }, 500);
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
          @page { size: A4 portrait; margin: 12mm; }
          html, body { height: auto !important; overflow: visible !important; }
          body * { visibility: hidden !important; }
          .print-page, .print-page * { visibility: visible !important; }
          .print-page {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            transform: none !important;
          }
          body:has(.print-page) { margin: 0 !important; padding: 0 !important; }
          body:has(.print-page) :is(header, nav, aside, footer):not(.print-page *) { visibility: hidden !important; }
          .print-page :is(table, tr, img, svg) { break-inside: avoid; page-break-inside: avoid; }

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
            onClick={printProfessionalDocument}
            className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm"
          >
            Imprimir prontuário
          </button>

          <button
            onClick={generatePDF}
            disabled={generatingPdf}
            className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-700 disabled:opacity-60"
          >
            {generatingPdf ? "Gerando PDF..." : "Salvar PDF (A4 compacto)"}
          </button>
        </div>
      </div>

      <main ref={printRef} className="print-page mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#d9eeee] bg-white shadow-sm">
        <section className="border-b border-slate-300 bg-white px-8 py-5 md:px-10">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wide text-slate-800">Prontuário Odontológico</h1>
              <p className="mt-1 text-xs font-semibold text-slate-600">Dr. Henrique S. Pasquali · CRO-SC 8308</p>
              <p className="mt-2 text-sm font-bold text-slate-800">{patientName}</p>
            </div>
            <div className="text-xs text-slate-600 sm:text-right">
              <div>Emissão: {formatDateBr(new Date().toISOString())}</div>
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
            <SectionTitle title="Entrega de cópia do prontuário" subtitle="Assinatura de recebimento pelo paciente ou responsável" />

            <div className="no-print mb-8 rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
                    Assinatura digital do paciente
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Assinatura destinada a registrar o recebimento de uma cópia do prontuário. Não significa concordância com todas as evoluções clínicas. Salve antes de imprimir.
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
                  <button type="button" onClick={() => setSignatureModalOpen(true)} className="mb-3 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white">✍️ Assinar em tela ampliada (XP-Pen)</button>
                  {expandedSignatureDraft && <div className="mb-3"><img src={expandedSignatureDraft} alt="Assinatura ainda não salva" className="mx-auto max-h-28 max-w-full object-contain"/><p className="text-xs text-amber-700">Assinatura capturada. Clique em Salvar assinatura.</p></div>}
                  <ExpandedSignaturePad open={signatureModalOpen} onClose={() => setSignatureModalOpen(false)} onConfirm={(data) => { setExpandedSignatureDraft(data); setSignatureModalOpen(false); }} />
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

            <p className="mt-5 text-center text-xs text-slate-600">Declaro ter recebido uma cópia do prontuário odontológico disponibilizado nesta data.</p>
            <div className="mt-10 grid grid-cols-1 gap-16 md:grid-cols-2">
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
                  <div className="text-sm text-slate-500">Recebimento da cópia pelo paciente ou responsável</div>
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
              Documento impresso em {formatDateTimeBr(new Date().toISOString())}. Este documento reúne os registros clínicos disponíveis no sistema na data de emissão.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
