"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "@/lib/supabase";

type Patient = {
  id: string;
  name?: string | null;
  cpf?: string | null;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  date_of_birth?: string | null;
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

type PatientTreatment = {
  id: string;
  title?: string | null;
  treatment_name?: string | null;
  procedure_name?: string | null;
  tooth?: string | null;
  face?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type ConsentType =
  | "implante"
  | "extracao"
  | "endodontia"
  | "clareamento"
  | "ortodontia"
  | "protese"
  | "cirurgia"
  | "harmonizacao"
  | "geral";

const CONSENT_OPTIONS: { value: ConsentType; label: string; subtitle: string }[] = [
  {
    value: "implante",
    label: "Implante dentário",
    subtitle: "Cirurgia, instalação de implante, enxertos e reabilitação sobre implantes.",
  },
  {
    value: "extracao",
    label: "Extração dentária",
    subtitle: "Exodontias simples, cirúrgicas e remoção de dentes inclusos/semi-inclusos.",
  },
  {
    value: "endodontia",
    label: "Endodontia",
    subtitle: "Tratamento de canal, retratamento endodôntico e urgências pulpares.",
  },
  {
    value: "clareamento",
    label: "Clareamento dental",
    subtitle: "Clareamento de consultório, caseiro supervisionado ou combinado.",
  },
  {
    value: "ortodontia",
    label: "Ortodontia",
    subtitle: "Tratamento ortodôntico com aparelhos fixos, alinhadores ou contenções.",
  },
  {
    value: "protese",
    label: "Prótese odontológica",
    subtitle: "Coroas, pontes, próteses totais, removíveis e provisórios.",
  },
  {
    value: "cirurgia",
    label: "Cirurgia odontológica",
    subtitle: "Procedimentos cirúrgicos odontológicos em geral.",
  },
  {
    value: "harmonizacao",
    label: "Harmonização orofacial",
    subtitle: "Procedimentos estéticos e funcionais em região orofacial.",
  },
  {
    value: "geral",
    label: "Consentimento odontológico geral",
    subtitle: "Consentimento amplo para procedimentos odontológicos planejados.",
  },
];

function formatDateBr(value?: string | null) {
  if (!value) return "-";
  const clean = String(value).split("T")[0];
  const [year, month, day] = clean.split("-");
  if (!year || !month || !day) return clean;
  return `${day}/${month}/${year}`;
}

function normalizeText(value?: string | null) {
  const text = String(value || "").trim();
  return text || "-";
}

function getTreatmentName(treatment?: PatientTreatment | null) {
  return (
    treatment?.procedure_name ||
    treatment?.treatment_name ||
    treatment?.title ||
    "Procedimento odontológico"
  );
}

function consentContent(type: ConsentType) {
  const common = [
    "Declaro que recebi explicações claras sobre o diagnóstico, planejamento, alternativas de tratamento, benefícios esperados, limitações e possíveis intercorrências.",
    "Estou ciente de que todo procedimento odontológico pode apresentar respostas individuais diferentes, não sendo possível garantir resultado absoluto ou permanente.",
    "Autorizo a realização dos procedimentos necessários dentro do planejamento apresentado, bem como eventuais ajustes clínicos indicados durante a execução do tratamento.",
    "Comprometo-me a seguir as orientações profissionais, comparecer aos retornos agendados e comunicar qualquer alteração de saúde, medicação em uso, alergias, dor, sangramento ou desconforto relevante.",
  ];

  const specific: Record<ConsentType, string[]> = {
    implante: [
      "Fui informado(a) de que procedimentos envolvendo implantes podem incluir cirurgia, anestesia local, incisões, suturas, enxertos, exames complementares e etapas protéticas posteriores.",
      "Estou ciente de possíveis riscos, como dor, edema, sangramento, infecção, parestesia, sinusite, perda do implante, necessidade de nova cirurgia, falha de osseointegração ou necessidade de alteração do plano inicial.",
      "Compreendo que higiene oral, controle de doenças sistêmicas, tabagismo, hábitos parafuncionais e comparecimento aos retornos influenciam diretamente no prognóstico.",
    ],
    extracao: [
      "Fui informado(a) de que a extração dentária pode envolver anestesia local, desgaste ósseo, odontosecção, suturas e cuidados pós-operatórios.",
      "Estou ciente de possíveis riscos, como dor, edema, sangramento, infecção, alveolite, limitação de abertura bucal, fratura radicular, comunicação buco-sinusal ou alteração temporária de sensibilidade.",
      "Comprometo-me a seguir as orientações pós-operatórias, evitar esforços, respeitar a medicação prescrita e comparecer aos retornos quando indicado.",
    ],
    endodontia: [
      "Fui informado(a) de que o tratamento endodôntico busca tratar a polpa dentária e canais radiculares, podendo exigir múltiplas sessões, medicação intracanal e restauração posterior adequada.",
      "Estou ciente de possíveis riscos, como dor pós-operatória, necessidade de retratamento, fratura de instrumento, perfuração, reabsorções, insucesso biológico ou necessidade futura de cirurgia/endodontia complementar.",
      "Compreendo que a permanência do dente depende também de restauração definitiva, controle de infiltrações, estrutura remanescente e acompanhamento clínico/radiográfico.",
    ],
    clareamento: [
      "Fui informado(a) de que o clareamento dental pode gerar sensibilidade temporária, irritação gengival e variação individual de resultado.",
      "Estou ciente de que restaurações, coroas, facetas e próteses não clareiam da mesma forma que dentes naturais, podendo exigir substituição estética posterior.",
      "Comprometo-me a seguir as orientações de uso, evitar excesso de produto e comunicar sensibilidade intensa ou qualquer reação incomum.",
    ],
    ortodontia: [
      "Fui informado(a) de que o tratamento ortodôntico depende de colaboração, higiene adequada, uso de elásticos/aparelhos auxiliares quando indicado e comparecimento regular às consultas.",
      "Estou ciente de possíveis riscos, como desconforto, aftas, reabsorções radiculares, cáries, manchas brancas, inflamação gengival, recidiva e necessidade de contenção após o tratamento.",
      "Compreendo que quebras, faltas, má higiene e não uso de dispositivos indicados podem prolongar o tratamento e comprometer o resultado.",
    ],
    protese: [
      "Fui informado(a) de que tratamentos protéticos podem envolver preparos dentários, moldagens/escaneamentos, provisórios, ajustes oclusais e etapas laboratoriais.",
      "Estou ciente de possíveis riscos, como sensibilidade, necessidade de tratamento endodôntico, fratura, descimentação, ajustes estéticos/fonéticos e adaptação gradual ao uso.",
      "Compreendo que próteses exigem manutenção, higiene adequada, retornos periódicos e podem necessitar reparos ou substituições ao longo do tempo.",
    ],
    cirurgia: [
      "Fui informado(a) de que procedimentos cirúrgicos odontológicos podem envolver anestesia local, incisões, suturas, medicações, exames complementares e acompanhamento pós-operatório.",
      "Estou ciente de possíveis riscos, como dor, edema, sangramento, infecção, hematoma, limitação de abertura bucal, alterações sensoriais temporárias ou necessidade de procedimentos complementares.",
      "Comprometo-me a seguir rigorosamente as orientações pós-operatórias e comunicar qualquer intercorrência.",
    ],
    harmonizacao: [
      "Fui informado(a) de que procedimentos de harmonização orofacial possuem finalidade estética e/ou funcional, com resultados variáveis conforme características individuais.",
      "Estou ciente de possíveis riscos, como edema, hematoma, assimetrias, sensibilidade, necessidade de retoques, efeitos temporários e reações individuais aos materiais utilizados.",
      "Compreendo que alguns procedimentos podem exigir manutenção periódica e que o resultado depende de avaliação clínica, técnica utilizada e resposta biológica individual.",
    ],
    geral: [
      "Fui informado(a) de que o tratamento odontológico pode envolver anestesia local, exames complementares, restaurações, procedimentos periodontais, cirúrgicos, protéticos ou outros atos necessários ao planejamento.",
      "Estou ciente de possíveis riscos gerais, como dor, sensibilidade, sangramento, inflamação, necessidade de ajustes, retornos, exames adicionais ou mudança de conduta clínica.",
      "Compreendo que a manutenção do resultado depende de higiene adequada, hábitos, retornos preventivos e colaboração do paciente.",
    ],
  };

  return [...common, ...specific[type]];
}

export default function PrintTermoConsentimentoPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = String(params?.id || "");

  const printRef = useRef<HTMLDivElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [treatments, setTreatments] = useState<PatientTreatment[]>([]);
  const [consentType, setConsentType] = useState<ConsentType>("implante");
  const [selectedTreatmentId, setSelectedTreatmentId] = useState("");
  const [customProcedure, setCustomProcedure] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);

  const selectedTreatment = useMemo(() => {
    return treatments.find((item) => item.id === selectedTreatmentId) || null;
  }, [treatments, selectedTreatmentId]);

  const consentOption = CONSENT_OPTIONS.find((item) => item.value === consentType) || CONSENT_OPTIONS[0];

  const procedureName =
    customProcedure.trim() ||
    getTreatmentName(selectedTreatment) ||
    consentOption.label;

  const professionalName = String(
    clinicSettings?.owner || "Dr. Henrique S. Pasquali"
  ).replace("Dr(a).", "Dr.");

  const clinicName =
    clinicSettings?.name ||
    clinicSettings?.display_name ||
    "Consultório Odontológico";

  const safePatientName = useMemo(() => {
    return String(patient?.name || "paciente")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }, [patient?.name]);

  const loadData = async () => {
    if (!patientId) return;

    try {
      setLoading(true);

      const [{ data: patientData, error: patientError }, { data: clinicData }, { data: treatmentData }] =
        await Promise.all([
          supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
          supabase.from("clinic_settings").select("*").eq("id", 1).maybeSingle(),
          supabase
            .from("patient_treatments")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false }),
        ]);

      if (patientError) throw patientError;

      setPatient((patientData || null) as Patient | null);
      setClinicSettings((clinicData || null) as ClinicSettings | null);
      setTreatments((treatmentData || []) as PatientTreatment[]);

      if (treatmentData && treatmentData.length > 0) {
        setSelectedTreatmentId(treatmentData[0].id);
      }
    } catch (error: any) {
      alert("Erro ao carregar termo: " + (error?.message || "erro inesperado"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  const prepareSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  };

  const getSignaturePosition = (event: any) => {
    const canvas = signatureCanvasRef.current;
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

  const startSignature = (event: any) => {
    event.preventDefault?.();
    prepareSignatureCanvas();

    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const position = getSignaturePosition(event);
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    setIsDrawingSignature(true);
  };

  const drawSignature = (event: any) => {
    event.preventDefault?.();
    if (!isDrawingSignature) return;

    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const position = getSignaturePosition(event);
    ctx.lineTo(position.x, position.y);
    ctx.stroke();
  };

  const stopSignature = () => {
    const canvas = signatureCanvasRef.current;

    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL("image/png"));
    }

    setIsDrawingSignature(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    setSignatureDataUrl(null);
    setIsDrawingSignature(false);
  };

  const saveTermRecord = async () => {
    try {
      const title = `Termo de consentimento - ${consentOption.label}`;
      const content =
        `Termo gerado em ${new Date().toLocaleDateString("pt-BR")}\n` +
        `Procedimento: ${procedureName}\n` +
        `Profissional: ${professionalName}`;

      const { error } = await supabase.from("clinical_notes").insert({
        patient_id: patientId,
        title,
        content,
      });

      if (error) throw error;
    } catch (error) {
      console.warn("Não foi possível registrar o termo na linha do tempo:", error);
    }
  };

  const generatePdf = async () => {
    const element = printRef.current;

    if (!element) {
      alert("Não foi possível encontrar o conteúdo para gerar o PDF.");
      return;
    }

    try {
      setGeneratingPdf(true);
      await saveTermRecord();

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
      pdf.save(`Termo_${safePatientName || "paciente"}_${today}.pdf`);
    } catch (error: any) {
      alert("Erro ao gerar PDF: " + (error?.message || "erro desconhecido"));
    } finally {
      setGeneratingPdf(false);
    }
  };

  const printTerm = async () => {
    await saveTermRecord();
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7ffff] p-6 text-slate-600">
        Carregando termo de consentimento...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7ffff] p-6">
        <div className="rounded-3xl border border-[#d9eeee] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-800">Paciente não encontrado</h1>

          <button
            type="button"
            onClick={() => router.push("/pacientes")}
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
          onClick={() => router.push(`/pacientes/${patientId}`)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-[#fbffff]"
        >
          <ArrowLeft size={17} />
          Voltar ao paciente
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={printTerm}
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

      <div className="no-print mx-auto mb-4 max-w-5xl rounded-3xl border border-[#d9eeee] bg-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">
              Tipo de termo
            </label>
            <select
              value={consentType}
              onChange={(event) => setConsentType(event.target.value as ConsentType)}
              className="w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#84d5d3]"
            >
              {CONSENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">
              Tratamento vinculado
            </label>
            <select
              value={selectedTreatmentId}
              onChange={(event) => setSelectedTreatmentId(event.target.value)}
              className="w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#84d5d3]"
            >
              <option value="">Sem tratamento específico</option>
              {treatments.map((treatment) => (
                <option key={treatment.id} value={treatment.id}>
                  {getTreatmentName(treatment)}
                  {treatment.tooth ? ` - Dente ${treatment.tooth}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">
              Procedimento personalizado
            </label>
            <input
              value={customProcedure}
              onChange={(event) => setCustomProcedure(event.target.value)}
              placeholder="Opcional"
              className="w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#84d5d3]"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">
            Observações adicionais
          </label>
          <textarea
            value={extraNotes}
            onChange={(event) => setExtraNotes(event.target.value)}
            placeholder="Ex.: medicações, cuidados especiais, particularidades clínicas..."
            className="min-h-[90px] w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 py-3 text-sm text-slate-700 outline-none focus:border-[#84d5d3]"
          />
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
                Termo de consentimento informado
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                {consentOption.label}
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-cyan-50">
                {consentOption.subtitle}
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
                {patient.name || "Paciente"}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                <div>CPF: <strong>{normalizeText(patient.cpf)}</strong></div>
                <div>Telefone: <strong>{normalizeText(patient.phone)}</strong></div>
                <div>Email: <strong>{normalizeText(patient.email)}</strong></div>
                <div>Nascimento: <strong>{formatDateBr(patient.birth_date || patient.date_of_birth)}</strong></div>
              </div>
            </div>

            <div className="print-avoid-break rounded-3xl border border-[#bde8e7] bg-[#f2fcfc] p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#239d9a]">
                Procedimento
              </div>

              <div className="mt-2 text-base font-black text-slate-800">
                {procedureName}
              </div>

              {selectedTreatment?.tooth && (
                <div className="mt-2 text-sm font-semibold text-slate-600">
                  Dente: {selectedTreatment.tooth}
                  {selectedTreatment.face ? ` • Face: ${selectedTreatment.face}` : ""}
                </div>
              )}

              <div className="mt-3 text-xs font-bold text-slate-500">
                Data: {formatDateBr(new Date().toISOString())}
              </div>
            </div>
          </div>

          <section className="print-avoid-break rounded-3xl border border-[#d9eeee] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-800">
              Declaração de consentimento
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
              {consentContent(consentType).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="print-avoid-break rounded-3xl border border-[#d9eeee] bg-[#fbffff] p-6">
            <h2 className="text-lg font-black text-slate-800">
              Procedimento autorizado
            </h2>

            <div className="mt-4 rounded-2xl border border-[#d9eeee] bg-white p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Descrição
              </div>

              <div className="mt-2 text-base font-black text-slate-800">
                {procedureName}
              </div>

              {(selectedTreatment?.tooth || selectedTreatment?.face) && (
                <div className="mt-2 text-sm font-semibold text-slate-600">
                  {selectedTreatment?.tooth ? `Dente: ${selectedTreatment.tooth}` : ""}
                  {selectedTreatment?.face ? ` • Face(s): ${selectedTreatment.face}` : ""}
                </div>
              )}
            </div>

            {extraNotes.trim() && (
              <div className="mt-4 rounded-2xl border border-[#d9eeee] bg-white p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Observações adicionais
                </div>

                <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {extraNotes}
                </div>
              </div>
            )}
          </section>

          <section className="no-print print-avoid-break rounded-3xl border border-[#d9eeee] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  Assinatura digital do paciente
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  O paciente ou responsável pode assinar diretamente na tela antes de imprimir ou baixar o PDF.
                </p>
              </div>

              <button
                type="button"
                onClick={clearSignature}
                className="rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
              >
                Limpar assinatura
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[#d9eeee] bg-white">
              <canvas
                ref={signatureCanvasRef}
                width={900}
                height={260}
                className="h-[190px] w-full touch-none bg-white"
                onMouseDown={startSignature}
                onMouseMove={drawSignature}
                onMouseUp={stopSignature}
                onMouseLeave={stopSignature}
                onTouchStart={startSignature}
                onTouchMove={drawSignature}
                onTouchEnd={stopSignature}
              />
            </div>
          </section>

          <section className="print-avoid-break pt-14">
            <div className="grid grid-cols-1 gap-14 md:grid-cols-2">
              <div className="text-center">
                <div className="flex h-20 items-end justify-center">
                  {signatureDataUrl ? (
                    <img
                      src={signatureDataUrl}
                      alt="Assinatura do paciente"
                      className="max-h-20 max-w-full object-contain"
                    />
                  ) : null}
                </div>

                <div className="border-t border-slate-400 pt-3">
                  <div className="font-bold text-slate-800">
                    {patient.name || "Paciente"}
                  </div>

                  <div className="text-sm text-slate-500">
                    Assinatura do paciente ou responsável
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="h-20" />
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
