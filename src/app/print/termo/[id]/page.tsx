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

function normalizeDocument(document?: string | null) {
  if (!document) return "";
  const digits = String(document).replace(/\D/g, "");

  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  return document;
}

const DEFAULT_CONSENT_TEXT = `Declaro que fui informado(a), de forma clara e compreensível, sobre o procedimento odontológico proposto, seus objetivos, benefícios, limitações, alternativas de tratamento, cuidados necessários e possíveis riscos.

Declaro ter recebido orientações sobre a importância de informar corretamente meu histórico de saúde, uso de medicamentos, alergias, doenças sistêmicas, gestação ou qualquer condição que possa interferir no atendimento odontológico.

Estou ciente de que todo procedimento odontológico pode apresentar variações individuais de resposta, desconfortos, sensibilidade, dor, sangramento, inflamação, infecção, necessidade de ajustes, retorno clínico ou realização de procedimentos complementares.

Autorizo a realização do tratamento proposto pelo profissional responsável e declaro que todas as minhas dúvidas foram esclarecidas antes da assinatura deste termo.

Comprometo-me a seguir as orientações fornecidas, comparecer aos retornos agendados e comunicar imediatamente qualquer intercorrência.`;

export default function PrintTermoPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params?.id as string;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [clinicSettings, setClinicSettings] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [procedureDescription, setProcedureDescription] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [signatureId, setSignatureId] = useState<string>("");
  const [savingSignature, setSavingSignature] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const goBackToPatient = () => {
    if (patientId) {
      router.push(`/pacientes/${patientId}`);
      return;
    }
    router.back();
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0f172a";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, []);

  const getPosition = (event: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const touch = event.touches?.[0] || event.changedTouches?.[0];

    if (touch) {
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: any) => {
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getPosition(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setHasDrawn(true);
  };

  const draw = (event: any) => {
    event.preventDefault();
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getPosition(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (event?: any) => {
    event?.preventDefault?.();
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    setupCanvas();
    setHasDrawn(false);
  };

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

    const { data: consentTemplates } = await supabase
      .from("consent_templates")
      .select("*")
      .eq("active", true)
      .order("title");

    const loadedTemplates = consentTemplates || [];
    setTemplates(loadedTemplates);

    if (loadedTemplates.length > 0) {
      setSelectedTemplateId(loadedTemplates[0].id);
    }

    const { data: savedSignature } = await supabase
      .from("digital_signatures")
      .select("*")
      .eq("patient_id", patientId)
      .eq("document_type", "termo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (savedSignature) {
      setSignatureId(savedSignature.id || "");
      setSignatureDataUrl(savedSignature.signature_data_url || savedSignature.signature || "");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  const selectedTemplate = useMemo(() => {
    return templates.find((item) => item.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const patientName = patient?.name || "Paciente não identificado";
  const patientDocument = patient?.cpf || patient?.document || patient?.rg || patient?.document_number || "";
  const patientBirth = patient?.birth_date || patient?.birthday || patient?.date_of_birth || "";

  const clinicName = clinicSettings?.name || clinicSettings?.display_name || "Consultório Odontológico";
  const consentTitle = selectedTemplate?.title || "Termo de consentimento odontológico";
  const consentContent = selectedTemplate?.content || DEFAULT_CONSENT_TEXT;

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasDrawn) {
      alert("Faça a assinatura antes de salvar.");
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");

    try {
      setSavingSignature(true);

      const payload = {
        patient_id: patientId,
        document_type: "termo",
        document_title: consentTitle,
        signature_data_url: dataUrl,
        signed_name: patientName,
        signed_at: new Date().toISOString(),
      };

      if (signatureId) {
        const { error } = await supabase
          .from("digital_signatures")
          .update(payload)
          .eq("id", signatureId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("digital_signatures")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        setSignatureId(data?.id || "");
      }

      setSignatureDataUrl(dataUrl);
      alert("Assinatura salva com sucesso.");
    } catch (error: any) {
      alert("Erro ao salvar assinatura: " + error.message);
    } finally {
      setSavingSignature(false);
    }
  };


  const generatePDF = async () => {
    const element = printRef.current;
    if (!element) return;

    try {
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

      const cleanName = String(patientName || "paciente")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      const today = new Date().toISOString().split("T")[0];

      pdf.save(`Termo_${cleanName || "paciente"}_${today}.pdf`);
    } catch (error: any) {
      alert("Erro ao gerar PDF: " + (error?.message || "tente novamente."));
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-100 p-6 text-slate-600">Carregando termo...</div>;
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-800">Paciente não encontrado</h1>
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
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
          .signature-image-print {
            display: block !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            onClick={goBackToPatient}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Voltar ao prontuário
          </button>

          <div className="flex flex-col gap-2 md:flex-row">
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm"
            >
              Imprimir termo
            </button>

            <button
              onClick={generatePDF}
              className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-700"
            >
              Baixar PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr]">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">Modelo de termo</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-700"
            >
              {templates.length === 0 && <option value="">Termo odontológico padrão</option>}
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title || template.procedure_type || "Termo"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">Procedimento / observação</label>
            <input
              value={procedureDescription}
              onChange={(e) => setProcedureDescription(e.target.value)}
              placeholder="Ex.: Implante unitário, extração, enxerto..."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-700"
            />
          </div>
        </div>
      </div>

      <main ref={printRef} className="print-page mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800">{clinicName}</h1>

              {clinicSettings?.owner && (
                <p className="mt-1 text-sm text-slate-600">
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
                  {clinicSettings?.city || ""}
                  {clinicSettings?.state ? ` - ${clinicSettings.state}` : ""}
                  {clinicSettings?.zip_code ? ` | CEP: ${clinicSettings.zip_code}` : ""}
                </p>
              )}

              {(clinicSettings?.phone || clinicSettings?.whatsapp) && (
                <p className="text-sm text-slate-600">
                  Contato: {clinicSettings?.phone || clinicSettings?.whatsapp}
                </p>
              )}

              {clinicSettings?.email && (
                <p className="text-sm text-slate-600">Email: {clinicSettings.email}</p>
              )}
            </div>

            <div className="rounded-2xl bg-[#eefafa] px-5 py-3 text-right text-[#239d9a]">
              <div className="text-xs font-black uppercase tracking-widest">Termo</div>
              <div className="mt-1 text-lg font-black">{formatDateBr(new Date().toISOString())}</div>
            </div>
          </div>
        </header>

        <section className="py-6">
          <h2 className="text-center text-2xl font-black uppercase tracking-widest text-slate-800">{consentTitle}</h2>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Identificação do paciente</h3>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">Nome</div>
                <div className="mt-1 font-bold text-slate-800">{patientName}</div>
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">Documento</div>
                <div className="mt-1 font-bold text-slate-800">{normalizeDocument(patientDocument) || "-"}</div>
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">Nascimento</div>
                <div className="mt-1 font-bold text-slate-800">{formatDateBr(patientBirth) || "-"}</div>
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">Telefone</div>
                <div className="mt-1 font-bold text-slate-800">{patient?.phone || patient?.whatsapp || "-"}</div>
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">Email</div>
                <div className="mt-1 font-bold text-slate-800">{patient?.email || "-"}</div>
              </div>

              {(procedureDescription || selectedTemplate?.procedure_type) && (
                <div className="md:col-span-3">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">Procedimento</div>
                  <div className="mt-1 font-bold text-slate-800">{procedureDescription || selectedTemplate?.procedure_type}</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 whitespace-pre-line text-justify text-base leading-8 text-slate-700">{consentContent}</div>

          <div className="mt-8 rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Declaração</h3>
            <p className="mt-3 text-justify text-base leading-8 text-slate-700">
              Declaro que li, compreendi e concordo com as informações acima. Autorizo a realização do procedimento odontológico indicado, estando ciente de que poderei solicitar esclarecimentos adicionais a qualquer momento.
            </p>
          </div>

          <p className="mt-10 text-right text-base text-slate-700">
            {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </section>

        <footer className="pt-14">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <div className="relative border-t border-slate-500 pt-3 text-center">
              {signatureDataUrl && (
                <img
                  src={signatureDataUrl}
                  alt="Assinatura digital do paciente"
                  className="absolute left-1/2 top-[-88px] h-24 w-[85%] -translate-x-1/2 object-contain"
                />
              )}
              <div className="font-bold text-slate-800">{patientName}</div>
              <div className="text-sm text-slate-500">Assinatura do paciente ou responsável</div>
            </div>

            <div className="border-t border-slate-500 pt-3 text-center">
              <div className="font-bold text-slate-800">{clinicSettings?.owner || clinicSettings?.name || "Responsável técnico"}</div>
              <div className="text-sm text-slate-500">Assinatura do profissional</div>
            </div>
          </div>
        </footer>
      </main>

      <div className="no-print mx-auto mt-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Assinatura digital do paciente</h3>

        {signatureDataUrl && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            Assinatura salva. Ela já aparecerá na linha de assinatura do paciente e também na impressão.
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-3">
          <canvas
            ref={canvasRef}
            className="h-[220px] w-full touch-none rounded-xl bg-white cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={clearSignature}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Limpar assinatura
          </button>

          <button
            type="button"
            onClick={saveSignature}
            disabled={savingSignature}
            className="rounded-xl bg-[#239d9a] px-5 py-2 text-sm font-black text-white shadow-sm disabled:opacity-60"
          >
            {savingSignature ? "Salvando..." : "Salvar assinatura"}
          </button>
        </div>
      </div>
    </div>
  );
}
