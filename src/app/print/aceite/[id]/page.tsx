"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RecordData = Record<string, unknown>;
const money = (v: unknown) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const str = (v: unknown) => String(v ?? "");
const dateBR = (v: unknown) => { if (!v) return "—"; const d = str(v).slice(0,10).split("-"); return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : str(v); };

export default function TermoAceitePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const [budget, setBudget] = useState<RecordData | null>(null);
  const [patient, setPatient] = useState<RecordData | null>(null);
  const [clinic, setClinic] = useState<RecordData | null>(null);
  const [items, setItems] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [savedSignature, setSavedSignature] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const b = await supabase.from("budgets").select("*").eq("id", id).maybeSingle();
        if (b.error) throw b.error;
        if (!b.data) throw new Error("Orçamento não encontrado.");
        const [p, it, c] = await Promise.all([
          supabase.from("patients").select("*").eq("id", b.data.patient_id).maybeSingle(),
          supabase.from("budget_items").select("*").eq("budget_id", id).order("created_at", { ascending: true }),
          supabase.from("clinic_settings").select("*").eq("id", 1).maybeSingle(),
        ]);
        if (p.error) throw p.error;
        if (it.error) throw it.error;
        if (c.error) throw c.error;
        const existing = await supabase.from("digital_signatures")
          .select("signature_data_url, signed_at")
          .eq("patient_id", b.data.patient_id)
          .eq("document_type", `aceite_orcamento_${id}`)
          .order("signed_at", { ascending: false }).limit(1).maybeSingle();
        if (active) {
          setBudget(b.data); setPatient(p.data); setItems(it.data || []); setClinic(c.data);
          if (!existing.error && existing.data?.signature_data_url) {
            setSignature(existing.data.signature_data_url);
            setSignedDate(existing.data.signed_at ? new Date(existing.data.signed_at).toLocaleString("pt-BR") : "");
            setSavedSignature(true);
          }
        }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Falha ao carregar documento."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id]);

  const start = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const el = canvas.current; if (!el) return;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    const ctx = el.getContext("2d"); if (!ctx) return;
    ctx.strokeStyle = "#152c38"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo((e.clientX-r.left)*el.width/r.width, (e.clientY-r.top)*el.height/r.height);
    drawing.current = true;
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !canvas.current) return;
    const el = canvas.current, r = el.getBoundingClientRect(), ctx = el.getContext("2d"); if (!ctx) return;
    ctx.lineTo((e.clientX-r.left)*el.width/r.width, (e.clientY-r.top)*el.height/r.height); ctx.stroke();
  };
  const stop = () => {
    if (!drawing.current || !canvas.current) return;
    drawing.current = false;
    setSignature(canvas.current.toDataURL("image/png"));
    setSignedDate(new Date().toLocaleString("pt-BR"));
  };
  const clear = () => {
    const el = canvas.current; if (el) el.getContext("2d")?.clearRect(0,0,el.width,el.height);
    setSignature(""); setSignedDate(""); setSavedSignature(false);
  };

  const saveSignature = async () => {
    if (!signature || !patient || !budget || savingSignature) return;
    try {
      setSavingSignature(true);
      const now = new Date().toISOString();
      const { error: saveError } = await supabase.from("digital_signatures").insert({
        patient_id: String(patient.id),
        document_type: `aceite_orcamento_${id}`,
        document_title: `Aceite do orçamento ${id}`,
        signature_data_url: signature,
        signed_name: str(patient.name),
        signed_at: now,
      });
      if (saveError) throw saveError;
      setSignedDate(new Date(now).toLocaleString("pt-BR"));
      setSavedSignature(true);
      alert("Assinatura registrada no sistema.");
    } catch (e) {
      alert("Não foi possível salvar a assinatura: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSavingSignature(false); }
  };

  if (loading) return <p className="p-8">Carregando termo de aceite...</p>;
  if (error || !budget || !patient) return <p className="p-8 text-red-700">{error || "Dados incompletos."}</p>;

  const total = Number(budget.total || 0);
  const entry = Number(budget.entry_value || 0);
  const discount = Number(budget.discount_value || 0);
  const installments = Math.max(1, Number(budget.installments || 1));
  const remaining = Math.max(0, total - entry);
  const professional = str(clinic?.owner || "Dr. Henrique S. Pasquali");
  const cro = str(clinic?.cro || "SC 8308");

  return <div className="accept-page min-h-screen bg-slate-100 py-6 text-slate-900">
    <div className="actions mx-auto mb-4 flex max-w-[210mm] flex-wrap gap-2 px-4">
      <button onClick={() => router.back()} className="rounded bg-white px-4 py-2 text-sm shadow">Voltar</button>
      <button onClick={() => window.print()} className="rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Imprimir / Salvar PDF</button>
      <button onClick={saveSignature} disabled={!signature || savedSignature || savingSignature} className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingSignature ? "Salvando..." : savedSignature ? "Assinatura salva" : "Salvar assinatura"}</button>
      <span className="self-center text-xs text-slate-600">Para gerar PDF, selecione “Salvar como PDF” na janela de impressão.</span>
    </div>
    <main className="paper mx-auto w-[210mm] max-w-full bg-white px-[17mm] py-[14mm] shadow-md">
      <header className="border-b border-slate-500 pb-3 text-center">
        <p className="text-xs font-semibold">{professional} · CRO {cro}</p>
        <h1 className="mt-2 text-base font-bold uppercase">Termo de Aceite e Autorização para Execução do Orçamento Odontológico</h1>
      </header>
      <section className="mt-4 text-xs leading-relaxed">
        <p><strong>Paciente:</strong> {str(patient.name)} &nbsp; <strong>CPF:</strong> {str(patient.cpf) || "—"}</p>
        <p><strong>Orçamento:</strong> {id} &nbsp; <strong>Data:</strong> {dateBR(budget.created_at)}</p>
        <p><strong>Situação do orçamento:</strong> {str(budget.status || "Pendente")}</p>
      </section>
      <section className="mt-4">
        <h2 className="mb-2 border-b pb-1 text-sm font-bold">Procedimentos previstos</h2>
        <table className="w-full border-collapse text-left text-xs">
          <thead><tr className="border-b"><th className="py-1">Procedimento</th><th>Dente</th><th>Face</th><th>Qtd.</th><th className="text-right">Valor</th></tr></thead>
          <tbody>{items.map((it, i) => <tr key={str(it.id || i)} className="border-b border-slate-200">
            <td className="py-1 pr-2">{str(it.procedure_name || it.treatment_name || "Procedimento")}</td><td>{str(it.tooth || "—")}</td><td>{str(it.face || "—")}</td><td>{str(it.quantity || 1)}</td><td className="text-right">{money(it.total ?? it.amount ?? (Number(it.unit_price || 0) * Number(it.quantity || 1)))}</td>
          </tr>)}</tbody>
        </table>
      </section>
      <section className="mt-4 text-xs">
        <h2 className="mb-2 border-b pb-1 text-sm font-bold">Condições financeiras</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-1">
          <p>Subtotal: {money(budget.subtotal)}</p><p>Desconto informado: {money(discount)}</p>
          <p><strong>Total do orçamento: {money(total)}</strong></p><p>Entrada: {money(entry)}</p>
          <p>Saldo: {money(remaining)}</p><p>Parcelamento: {installments}x de {money(remaining/installments)}</p>
        </div>
        {budget.notes ? <p className="mt-2"><strong>Observações:</strong> {str(budget.notes)}</p> : null}
      </section>
      <section className="mt-4 space-y-2 text-justify text-xs leading-relaxed">
        <h2 className="border-b pb-1 text-sm font-bold">Declaração de aceite e autorização</h2>
        <p>Declaro que recebi e analisei o orçamento identificado acima, com os procedimentos propostos, valores e condições de pagamento, e que tive oportunidade de esclarecer dúvidas antes de decidir.</p>
        <p><strong>Aceito o orçamento apresentado e autorizo o início da execução dos procedimentos nele discriminados</strong>, observadas as condições clínicas e financeiras acordadas.</p>
        <p>Estou ciente de que alterações relevantes no plano de tratamento, inclusão de procedimentos ou mudanças de valores deverão ser previamente explicadas e submetidas à minha concordância. Este termo não substitui os consentimentos informados específicos dos procedimentos, quando necessários.</p>
        <p>O presente aceite não constitui declaração de pagamento ou quitação. Os pagamentos e respectivos comprovantes serão registrados separadamente.</p>
      </section>
      <section className="signature-section mt-5">
        <div className="actions mb-2 flex items-center justify-between text-xs"><strong>Assinatura do paciente ou responsável</strong><button onClick={clear} className="rounded border px-3 py-1">Limpar assinatura</button></div>
        <canvas ref={canvas} width={750} height={120} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className={`signature-canvas h-24 w-full touch-none rounded border border-slate-300 bg-white ${savedSignature ? "hidden" : ""}`} />
        {signature && savedSignature && <img src={signature} alt="Assinatura do paciente" className={`signature-image mx-auto h-20 max-w-full object-contain ${savedSignature ? "block" : "hidden"}`} />}
        <div className="patient-signature-line mx-auto mt-3 max-w-[95mm] border-t border-slate-600 pt-1 text-center text-xs">
          <strong>{str(patient.name)}</strong><p>Paciente ou responsável</p>
        </div>
        <p className="mt-2 text-right text-[10px]">{signedDate ? `Assinatura ${savedSignature ? "salva" : "desenhada (não salva)"} em ${signedDate}` : "Data: ____/____/________"}</p>
      </section>
      <p className="mt-4 border-t pt-2 text-center text-[9px] text-slate-500">Documento vinculado ao orçamento {id}. Assinatura eletrônica armazenada quando confirmada em “Salvar assinatura”. O aceite não substitui os consentimentos clínicos específicos.</p>
    </main>
    <style jsx global>{`
      @page { size: A4 portrait; margin: 12mm; }
      @media print {
        html, body { margin:0!important; padding:0!important; background:white!important; }
        /* Oculta a navegação e qualquer outro elemento do layout do aplicativo. */
        body * { visibility:hidden!important; }
        .accept-page, .accept-page * { visibility:visible!important; }
        .accept-page { position:absolute!important; left:0!important; top:0!important; width:100%!important; z-index:2147483647!important; }
        .accept-page { padding:0!important; background:white!important; min-height:0!important; }
        .actions { display:none!important; }
        .paper { width:100%!important; max-width:none!important; box-shadow:none!important; padding:0!important; margin:0!important; }
        .signature-section { break-inside:avoid; }
        .signature-canvas { display:none!important; }
        .signature-image { width:auto!important; max-width:95mm!important; max-height:22mm!important; height:auto!important; object-fit:contain!important; margin:0 auto!important; }
        .patient-signature-line { max-width:95mm!important; }
        .signature-image { display:block!important; }
        h1,h2 { break-after:avoid; }
        tr { break-inside:avoid; }
      }
    `}</style>
  </div>;
}
