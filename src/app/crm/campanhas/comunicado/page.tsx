"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Megaphone,
  MessageCircle,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

type SendResult = {
  ok: boolean;
  dryRun?: boolean;
  totalPatients?: number;
  totalWithPhone?: number;
  totalWithoutPhone?: number;
  sent?: number;
  failed?: number;
  skipped?: number;
  results?: Array<{
    patientId: string;
    name: string;
    phone?: string;
    ok: boolean;
    skipped?: boolean;
    error?: string;
  }>;
  error?: string;
};

const messageTemplates = [
  {
    label: "Consultório fechado",
    value:
      "Olá, {{nome}}! 😊\n\nInformamos que o consultório estará fechado excepcionalmente.\n\nCaso você tenha consulta agendada, nossa equipe entrará em contato para reorganizar o horário.\n\nAgradecemos a compreensão. 🦷",
  },
  {
    label: "Recesso",
    value:
      "Olá, {{nome}}! 😊\n\nInformamos que estaremos em recesso nos próximos dias.\n\nRetornaremos normalmente após este período.\n\nAgradecemos a compreensão. 🦷",
  },
  {
    label: "Aviso geral",
    value:
      "Olá, {{nome}}! 😊\n\nPassando para compartilhar um comunicado importante da clínica.\n\nQualquer dúvida, estamos à disposição. 🦷",
  },
];

export default function ComunicadoMassaPage() {
  const [title, setTitle] = useState("Comunicado geral");
  const [message, setMessage] = useState(messageTemplates[0].value);
  const [confirmation, setConfirmation] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<SendResult | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  const messageLength = message.trim().length;
  const canSend =
    title.trim().length >= 3 && messageLength >= 10 && confirmation === "ENVIAR";

  const previewText = useMemo(() => {
    return message.replaceAll("{{nome}}", "Henrique");
  }, [message]);

  async function callApi(dryRun: boolean) {
    const response = await fetch("/api/crm/comunicado-massa", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        message,
        dryRun,
        confirmSend: dryRun ? false : confirmation === "ENVIAR",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Erro ao processar comunicado.");
    }

    return data as SendResult;
  }

  async function handlePreview() {
    try {
      setLoadingPreview(true);
      setResult(null);
      const data = await callApi(true);
      setPreview(data);
    } catch (error: any) {
      setPreview({
        ok: false,
        error: error?.message || "Erro ao simular comunicado.",
      });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleSend() {
    if (!canSend) return;

    const confirmed = window.confirm(
      "Confirma o envio deste comunicado para todos os pacientes com telefone cadastrado?"
    );

    if (!confirmed) return;

    try {
      setSending(true);
      setResult(null);
      const data = await callApi(false);
      setResult(data);
      setConfirmation("");
    } catch (error: any) {
      setResult({
        ok: false,
        error: error?.message || "Erro ao enviar comunicado.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-3 pb-28 sm:p-5 md:pb-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-[#bde4e3] bg-white shadow-sm">
          <div className="relative bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] px-5 py-5 text-white">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-cyan-200/20 blur-3xl" />

            <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-50/90">
                  Campanhas inteligentes
                </div>

                <h1 className="mt-1 text-2xl font-black tracking-tight">
                  Comunicado em Massa
                </h1>

                <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-cyan-50/90">
                  Envie uma mensagem manual para todos os pacientes com telefone cadastrado.
                  Ideal para aviso de fechamento, recesso, feriados e comunicados gerais.
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/15 px-4 py-3 text-sm font-black backdrop-blur">
                Envio gradual e confirmado
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-[#d9eeee] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-2xl bg-[#eefafa] p-3 text-[#239d9a]">
                <Megaphone size={22} />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-800">
                  Criar comunicado
                </h2>

                <p className="text-sm font-semibold text-slate-500">
                  Use {"{{nome}}"} para personalizar a saudação com o nome do paciente.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                  Título interno
                </span>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#239d9a] focus:ring-4 focus:ring-cyan-100"
                  placeholder="Ex: Aviso de fechamento"
                />
              </label>

              <div>
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                  Modelos rápidos
                </span>

                <div className="flex flex-wrap gap-2">
                  {messageTemplates.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      onClick={() => setMessage(template.value)}
                      className="rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-white hover:text-[#239d9a]"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">
                  Mensagem
                </span>

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={9}
                  className="w-full resize-none rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-[#239d9a] focus:ring-4 focus:ring-cyan-100"
                  placeholder="Digite a mensagem que será enviada aos pacientes..."
                />

                <div className="mt-1 text-right text-[11px] font-bold text-slate-400">
                  {messageLength} caracteres
                </div>
              </label>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 text-amber-700" size={20} />

                  <div>
                    <div className="text-sm font-black text-amber-800">
                      Confirmação obrigatória
                    </div>

                    <div className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                      Para evitar envio acidental, digite <strong>ENVIAR</strong> abaixo antes do disparo.
                    </div>

                    <input
                      value={confirmation}
                      onChange={(event) =>
                        setConfirmation(event.target.value.toUpperCase())
                      }
                      className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-black tracking-widest text-amber-800 outline-none focus:ring-4 focus:ring-amber-100"
                      placeholder="Digite ENVIAR"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={loadingPreview || messageLength < 10}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d9eeee] bg-white px-4 py-3 text-sm font-black text-[#239d9a] transition hover:bg-[#f2fcfc] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingPreview ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Users size={18} />
                  )}
                  Simular alcance
                </button>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend || sending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#239d9a] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#1f8d8a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                  Enviar comunicado para todos
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#d9eeee] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <ShieldCheck size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    Segurança do envio
                  </h2>

                  <p className="text-sm font-semibold text-slate-500">
                    Disparo manual, com confirmação e pausa entre mensagens.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Busca apenas pacientes com telefone.
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Mensagem enviada com intervalo gradual.
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Pacientes sem telefone são ignorados.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d9eeee] bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                <MessageCircle size={18} className="text-[#239d9a]" />
                Prévia da mensagem
              </div>

              <div className="whitespace-pre-wrap rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4 text-sm font-semibold leading-6 text-slate-700">
                {previewText}
              </div>
            </div>

            {preview && (
              <div
                className={`rounded-2xl border p-5 shadow-sm ${
                  preview.ok
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div
                  className={`text-sm font-black ${
                    preview.ok ? "text-emerald-800" : "text-red-800"
                  }`}
                >
                  {preview.ok ? "Alcance estimado" : "Erro na simulação"}
                </div>

                {preview.ok ? (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white/70 p-3">
                      <div className="text-lg font-black text-slate-800">
                        {preview.totalPatients || 0}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Pacientes
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3">
                      <div className="text-lg font-black text-emerald-700">
                        {preview.totalWithPhone || 0}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Com telefone
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3">
                      <div className="text-lg font-black text-amber-700">
                        {preview.totalWithoutPhone || 0}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Sem telefone
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm font-semibold text-red-700">
                    {preview.error}
                  </div>
                )}
              </div>
            )}

            {result && (
              <div
                className={`rounded-2xl border p-5 shadow-sm ${
                  result.ok
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div
                  className={`text-sm font-black ${
                    result.ok ? "text-emerald-800" : "text-red-800"
                  }`}
                >
                  {result.ok ? "Envio concluído" : "Erro no envio"}
                </div>

                {result.ok ? (
                  <div className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
                    Enviadas: {result.sent || 0} • Falhas: {result.failed || 0} •
                    Ignoradas: {result.skipped || 0}
                  </div>
                ) : (
                  <div className="mt-2 text-sm font-semibold text-red-700">
                    {result.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
