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

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getValue(obj: any, keys: string[]) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") {
      return obj[key];
    }
  }

  return "";
}

async function safeSelect(table: string, patientId: string) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export default function PrintProntuarioPage() {
  const params = useParams();
  const router = useRouter();

  const patientId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [patientProcedures, setPatientProcedures] = useState<any[]>([]);
  const [financialRecords, setFinancialRecords] = useState<any[]>([]);

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

    const [anamnesisRows, treatmentRows, procedureRows, financialRows] =
      await Promise.all([
        safeSelect("anamnesis_answers", patientId),
        safeSelect("treatments", patientId),
        safeSelect("patient_procedures", patientId),
        safeSelect("financial_records", patientId),
      ]);

    setAnamnesisAnswers(anamnesisRows);
    setTreatments(treatmentRows);
    setPatientProcedures(procedureRows);
    setFinancialRecords(financialRows);

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

  const totalPaid = useMemo(() => {
    return financialRecords.reduce((sum, item) => {
      return sum + Number(item.paid_amount || 0);
    }, 0);
  }, [financialRecords]);

  const totalOpen = useMemo(() => {
    return financialRecords.reduce((sum, item) => {
      const amount = Number(item.amount || 0);
      const paid = Number(item.paid_amount || 0);
      return sum + Math.max(0, amount - paid);
    }, 0);
  }, [financialRecords]);

  const prepareCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2.4;
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
            document_title: "Prontuário",
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
            document_title: "Prontuário",
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

      const safePatientName = String(patientName || "paciente")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "_")
        .replace(/^_+|_+$/g, "");

      const today = new Date().toISOString().slice(0, 10);

      pdf.save(`Prontuario_${safePatientName || "paciente"}_${today}.pdf`);
    } catch (error: any) {
      alert("Erro ao gerar PDF: " + (error?.message || "erro desconhecido"));
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-600">
        Carregando prontuário...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
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
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
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
          }

          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-5xl justify-between gap-3">
        <button
          onClick={goBackToPatient}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </button>

        <button
          onClick={() => window.print()}
          className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm"
        >
          Imprimir prontuário
        </button>

        <button
          onClick={generatePDF}
          className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-700"
        >
          Baixar PDF
        </button>
      </div>

      <main ref={printRef} className="print-page mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800">
                {clinicSettings?.name ||
                  clinicSettings?.display_name ||
                  "Consultório Odontológico"}
              </h1>

              {clinicSettings?.owner && (
                <p className="mt-1 text-sm text-slate-600">
                  Responsável: {clinicSettings.owner}
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

            <div className="rounded-2xl bg-[#eefafa] px-5 py-3 text-right text-[#239d9a]">
              <div className="text-xs font-black uppercase tracking-widest">
                Prontuário
              </div>
              <div className="mt-1 text-lg font-black">
                {formatDateBr(new Date().toISOString())}
              </div>
            </div>
          </div>
        </header>

        <section className="py-6">
          <h2 className="text-xl font-black text-slate-800">
            Dados do paciente
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Nome
              </div>
              <div className="mt-1 font-bold text-slate-800">{patientName}</div>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Documento
              </div>
              <div className="mt-1 font-bold text-slate-800">
                {patientDocument || "-"}
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Nascimento
              </div>
              <div className="mt-1 font-bold text-slate-800">
                {formatDateBr(patientBirth) || "-"}
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Telefone
              </div>
              <div className="mt-1 font-bold text-slate-800">
                {patient?.phone || patient?.whatsapp || "-"}
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Email
              </div>
              <div className="mt-1 font-bold text-slate-800">
                {patient?.email || "-"}
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Endereço
              </div>
              <div className="mt-1 font-bold text-slate-800">
                {patient?.address || patient?.endereco || "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="py-6">
          <h2 className="text-xl font-black text-slate-800">Anamnese</h2>

          {anamnesisAnswers.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 p-5 text-sm text-slate-500">
              Nenhuma resposta de anamnese registrada.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              {anamnesisAnswers.map((item, index) => (
                <div
                  key={item.id || index}
                  className="grid grid-cols-[1.2fr_1fr] border-b border-slate-100 last:border-b-0"
                >
                  <div className="p-3 text-sm font-bold text-slate-700">
                    {getValue(item, ["question", "pergunta", "label"]) ||
                      `Pergunta ${index + 1}`}
                  </div>
                  <div className="p-3 text-sm text-slate-700">
                    {getValue(item, ["answer", "resposta", "value"]) || "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="py-6">
          <h2 className="text-xl font-black text-slate-800">
            Histórico de consultas
          </h2>

          {appointments.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 p-5 text-sm text-slate-500">
              Nenhuma consulta registrada.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[120px_90px_1fr_130px] bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
                <div className="p-3">Data</div>
                <div className="p-3">Hora</div>
                <div className="p-3">Descrição</div>
                <div className="p-3">Status</div>
              </div>

              {appointments.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[120px_90px_1fr_130px] border-t border-slate-100 text-sm"
                >
                  <div className="p-3">{formatDateBr(item.date)}</div>
                  <div className="p-3">{item.start_time || "-"}</div>
                  <div className="p-3">
                    <div className="font-bold text-slate-700">
                      {item.title || item.type || "Consulta"}
                    </div>
                    {item.description && (
                      <div className="mt-1 text-xs text-slate-500">
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div className="p-3">{item.status || "agendado"}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="py-6">
          <h2 className="text-xl font-black text-slate-800">
            Procedimentos e tratamentos
          </h2>

          {treatments.length === 0 && patientProcedures.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 p-5 text-sm text-slate-500">
              Nenhum procedimento ou tratamento registrado.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {[...treatments, ...patientProcedures].map((item, index) => (
                <div
                  key={item.id || index}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black text-slate-800">
                        {getValue(item, [
                          "procedure_name",
                          "treatment_name",
                          "name",
                          "title",
                        ]) || `Registro ${index + 1}`}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Dente: {getValue(item, ["tooth", "dente"]) || "-"} •
                        Face: {getValue(item, ["face", "faces"]) || "-"}
                      </div>
                    </div>

                    <div className="text-right text-sm font-bold text-slate-700">
                      {item.total || item.amount || item.price
                        ? formatCurrency(
                            Number(
                              item.total || item.amount || item.price || 0,
                            ),
                          )
                        : ""}
                    </div>
                  </div>

                  {getValue(item, ["description", "notes", "observations"]) && (
                    <div className="mt-3 text-sm leading-6 text-slate-600">
                      {getValue(item, ["description", "notes", "observations"])}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-slate-400">
                    Data:{" "}
                    {formatDateBr(
                      getValue(item, ["date", "created_at", "completed_at"]),
                    ) || "-"}{" "}
                    • Status: {getValue(item, ["status"]) || "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="py-6">
          <h2 className="text-xl font-black text-slate-800">
            Resumo financeiro
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Total pago
              </div>
              <div className="mt-1 text-xl font-black text-slate-800">
                {formatCurrency(totalPaid)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Total em aberto
              </div>
              <div className="mt-1 text-xl font-black text-slate-800">
                {formatCurrency(totalOpen)}
              </div>
            </div>
          </div>
        </section>

        <section className="page-break pt-12">
          <h2 className="text-xl font-black text-slate-800">Assinaturas</h2>

          <div className="no-print mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
                  Assinatura digital do paciente
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Desenhe a assinatura abaixo, salve e depois imprima o
                  prontuário.
                </p>
              </div>

              {signatureDataUrl && (
                <button
                  type="button"
                  onClick={allowNewSignature}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
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
                  className="h-[190px] w-full touch-none rounded-2xl border border-slate-300 bg-white cursor-crosshair"
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
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
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
                <div className="text-sm text-slate-500">
                  Assinatura do paciente ou responsável
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="h-24" />
              <div className="border-t border-slate-500 pt-3">
                <div className="font-bold text-slate-800">
                  {clinicSettings?.owner ||
                    clinicSettings?.name ||
                    "Responsável técnico"}
                </div>
                <div className="text-sm text-slate-500">
                  Assinatura do profissional
                </div>
              </div>
            </div>
          </div>

          <p className="mt-12 text-center text-xs text-slate-400">
            Documento impresso em {formatDateBr(new Date().toISOString())}.
          </p>
        </section>
      </main>
    </div>
  );
}
