"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ReceiptType = "nenhum" | "simples" | "imposto_renda";
type PaymentMethod =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "boleto"
  | "transferencia"
  | "cheque";

type TabId =
  | "sobre"
  | "tratamentos"
  | "agendamentos"
  | "orcamentos"
  | "financeiro"
  | "linha_tempo"
  | "imagens_rx"
  | "documentos";

type FinancialRecord = {
  id: string;
  patient_id: string;
  patient_treatment_id?: string | null;
  budget_id?: string | null;
  description?: string | null;
  installment_number?: number | null;
  installments?: number | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  payment_method?: string | null;
  receipt_type?: string | null;
  paid_at?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type PaymentTransaction = {
  id: string;
  financial_record_id: string;
  patient_id?: string | null;
  amount: number | string;
  payment_method?: string | null;
  receipt_type?: string | null;
  note?: string | null;
  received_at: string;
  created_at?: string | null;
};

type ClinicalNote = {
  id: string;
  patient_id: string;
  title?: string | null;
  content?: string | null;
  created_at?: string | null;
};

type PatientTreatment = {
  id: string;
  patient_id: string;
  budget_id?: string | null;
  budget_item_id?: string | null;
  title?: string | null;
  treatment_name?: string | null;
  procedure_name?: string | null;
  tooth?: string | null;
  face?: string | null;
  unit_price?: number | string | null;
  quantity?: number | null;
  total?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

type TreatmentNote = {
  id: string;
  patient_treatment_id: string;
  patient_id: string;
  title?: string | null;
  content: string;
  created_at?: string | null;
};

type PatientFile = {
  id: string;
  patient_id: string;
  file_name?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  storage_path?: string | null;
  created_at?: string | null;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "sobre", label: "Sobre" },
  { id: "tratamentos", label: "Tratamentos" },
  { id: "agendamentos", label: "Agendamentos" },
  { id: "orcamentos", label: "Orçamentos" },
  { id: "financeiro", label: "Financeiro" },
  { id: "linha_tempo", label: "Linha do tempo" },
  { id: "imagens_rx", label: "Imagens e RX" },
  { id: "documentos", label: "Documentos" },
];


function NovoPacientePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: "",
    birth_date: "",
    gender: "",
    plan: "",
    cep: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    notes: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const onlyDigits = (value: string) => {
    return String(value || "").replace(/\D/g, "");
  };

  const searchAddressByCep = async (value: string) => {
    updateField("cep", value);

    const cleanCep = onlyDigits(value);
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data?.erro) {
        alert("CEP não encontrado.");
        return;
      }

      setForm((current) => ({
        ...current,
        cep: value,
        address: data.logradouro || current.address,
        neighborhood: data.bairro || current.neighborhood,
        city: data.localidade || current.city,
        state: data.uf || current.state,
      }));
    } catch {
      alert("Não foi possível buscar o CEP agora.");
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Informe o nome do paciente.");
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from("patients")
        .insert({
          name: form.name.trim(),
          cpf: onlyDigits(form.cpf) || null,
          phone: onlyDigits(form.phone) || null,
          email: form.email.trim() || null,
          birth_date: form.birth_date || null,
          gender: form.gender || null,
          plan: form.plan.trim() || null,
          address: form.address.trim() || null,
          neighborhood: form.neighborhood.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          notes: form.notes.trim() || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      alert("Paciente cadastrado com sucesso.");

      if (data?.id) {
        router.push(`/pacientes/${data.id}`);
      } else {
        router.push("/pacientes");
      }
    } catch (error: any) {
      alert("Erro ao cadastrar paciente: " + (error?.message || "erro inesperado"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-2 pb-32 sm:p-3 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5 pb-20">
        <div className="bg-white border border-[#d9eeee] rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-black leading-tight text-slate-800 md:text-3xl">Novo paciente</h1>
              <p className="text-sm text-slate-500 mt-1">
                Cadastre um novo paciente no sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/pacientes")}
              className="px-5 py-3 rounded-2xl border border-[#d9eeee] bg-white text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#d9eeee] rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-800">Dados principais</h2>
            <p className="text-sm text-slate-500">
              O nome é obrigatório. Os demais campos podem ser preenchidos depois.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-600 mb-1">
                Nome completo *
              </label>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Nome do paciente"
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">CPF</label>
              <input
                value={form.cpf}
                onChange={(e) => updateField("cpf", e.target.value)}
                placeholder="CPF"
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Telefone"
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="E-mail"
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">
                Data de nascimento
              </label>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => updateField("birth_date", e.target.value)}
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Gênero</label>
              <select
                value={form.gender}
                onChange={(e) => updateField("gender", e.target.value)}
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              >
                <option value="">Não informado</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">
                Convênio / Plano
              </label>
              <input
                value={form.plan}
                onChange={(e) => updateField("plan", e.target.value)}
                placeholder="Particular, convênio etc."
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#d9eeee] rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-800">Endereço</h2>
            <p className="text-sm text-slate-500">Campos opcionais.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-600 mb-1">CEP</label>
              <input
                value={form.cep}
                onChange={(e) => searchAddressByCep(e.target.value)}
                placeholder="CEP"
                maxLength={9}
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-sm font-bold text-slate-600 mb-1">Endereço</label>
              <input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Rua, número, complemento"
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-600 mb-1">Bairro</label>
              <input
                value={form.neighborhood}
                onChange={(e) => updateField("neighborhood", e.target.value)}
                placeholder="Bairro"
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-slate-600 mb-1">Cidade</label>
              <input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Cidade"
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-600 mb-1">UF</label>
              <input
                value={form.state}
                onChange={(e) => updateField("state", e.target.value.toUpperCase())}
                placeholder="SC"
                maxLength={2}
                className="w-full border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#d9eeee] rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Observações gerais"
              className="w-full min-h-[120px] border border-[#d9eeee] rounded-2xl p-3 bg-[#fbffff] outline-none focus:bg-white focus:border-[#84d5d3]"
            />
          </div>

          <div className="flex flex-col md:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/pacientes")}
              className="px-5 py-3 rounded-2xl border border-[#d9eeee] bg-white text-sm font-bold text-slate-700 hover:bg-[#fbffff]"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#7ccfce] text-sm font-black text-white shadow-sm disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar paciente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PacienteProntuarioPage({
  params,
}: {
  params: { id: string };
}) {
  if (params.id === "novo") {
    return <NovoPacientePage />;
  }

  return <PacienteProntuarioContent params={params} />;
}

function PacienteProntuarioContent({
  params,
}: {
  params: { id: string };
}) {
  const [activeTab, setActiveTab] = useState<TabId>("sobre");
  const [showSecurityHistory, setShowSecurityHistory] = useState(false);

  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<PatientTreatment[]>(
    []
  );
  const [treatmentNotes, setTreatmentNotes] = useState<TreatmentNote[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(
    []
  );
  const [paymentTransactions, setPaymentTransactions] = useState<
    PaymentTransaction[]
  >([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [patientFiles, setPatientFiles] = useState<PatientFile[]>([]);
  const [uploadingPatientFile, setUploadingPatientFile] = useState(false);
  const [selectedPatientFile, setSelectedPatientFile] = useState<PatientFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCompletedTreatments, setShowCompletedTreatments] = useState(true);

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] =
    useState<PatientTreatment | null>(null);
  const [finalizeProfessional, setFinalizeProfessional] = useState(
    "Dr(a). Henrique S. Pasquali"
  );
  const [finalizeDate, setFinalizeDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [finalizeEvolution, setFinalizeEvolution] = useState("");
  const [submittingFinalize, setSubmittingFinalize] = useState(false);
  const [finalizeShouldReceive, setFinalizeShouldReceive] = useState(true);

  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [selectedEvolutionTreatment, setSelectedEvolutionTreatment] =
    useState<PatientTreatment | null>(null);
  const [evolutionTitle, setEvolutionTitle] = useState("Evolução clínica");
  const [evolutionProfessional, setEvolutionProfessional] = useState(
    "Dr(a). Henrique S. Pasquali"
  );
  const [evolutionDate, setEvolutionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [evolutionContent, setEvolutionContent] = useState("");
  const [submittingEvolution, setSubmittingEvolution] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(
    null
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [receiptType, setReceiptType] = useState<ReceiptType>("nenhum");
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [selectedPaymentTransaction, setSelectedPaymentTransaction] =
    useState<PaymentTransaction | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] =
    useState<PaymentMethod>("pix");
  const [editReceiptType, setEditReceiptType] =
    useState<ReceiptType>("nenhum");
  const [editReceivedAt, setEditReceivedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const [submittingEditPayment, setSubmittingEditPayment] = useState(false);

  const [detailRecord, setDetailRecord] = useState<FinancialRecord | null>(null);

  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [submittingPatientEdit, setSubmittingPatientEdit] = useState(false);
  const [patientForm, setPatientForm] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: "",
    birth_date: "",
    gender: "",
    plan: "",
    cep: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    notes: "",
  });

  const parseMoney = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;
    return Number(String(value).replace(",", ".")) || 0;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const paymentMethodLabel = (value?: string | null) => {
    switch (value) {
      case "dinheiro":
        return "Dinheiro";
      case "pix":
        return "Pix";
      case "cartao_credito":
        return "Crédito";
      case "cartao_debito":
        return "Débito";
      case "boleto":
        return "Boleto";
      case "transferencia":
        return "Transferência";
      case "cheque":
        return "Cheque";
      default:
        return "-";
    }
  };

  const receiptLabel = (value?: string | null) => {
    if (value === "simples") return "Recibo simples";
    if (value === "imposto_renda") return "Recibo IR";
    return "Sem recibo";
  };

  const hasReceipt = (value?: string | null) => {
    return Boolean(value && value !== "nenhum");
  };

  const receiptHighlightClass = (value?: string | null) => {
    if (value === "imposto_renda") {
      return "bg-purple-50 border-purple-200";
    }

    if (value === "simples") {
      return "bg-cyan-50 border-cyan-200";
    }

    return "bg-[#fbffff] border-[#e3f2f2]";
  };

  const receiptBadgeClass = (value?: string | null) => {
    if (value === "imposto_renda") {
      return "bg-purple-100 text-purple-700 border border-purple-200";
    }

    if (value === "simples") {
      return "bg-cyan-100 text-cyan-700 border border-cyan-200";
    }

    return "bg-slate-100 text-slate-500 border border-slate-200";
  };

  const budgetStatusColor = (status?: string | null) => {
    if (status === "aprovado") return "bg-emerald-100 text-emerald-700";
    if (status === "reprovado") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  };

  const financialStatusColor = (status?: string | null) => {
    if (status === "pago") return "bg-emerald-100 text-emerald-700";
    if (status === "parcial") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
  };

  const treatmentStatusColor = (status?: string | null) => {
    if (status === "finalizado") return "bg-emerald-100 text-emerald-700";
    if (status === "em_atendimento") return "bg-sky-100 text-sky-700";
    return "bg-amber-100 text-amber-700";
  };

  const normalizePhone = (value?: string | null) => {
    if (!value) return "";
    return String(value).replace(/\D/g, "");
  };

  const auditActionLabel = (action?: string | null) => {
    if (action === "INSERT") return "Criou";
    if (action === "UPDATE") return "Alterou";
    if (action === "DELETE") return "Excluiu";
    return action || "Ação";
  };

  const auditTableLabel = (tableName?: string | null) => {
    switch (tableName) {
      case "patients":
        return "Paciente";
      case "appointments":
        return "Agenda";
      case "financial_records":
        return "Financeiro";
      case "payment_transactions":
        return "Pagamento";
      case "budgets":
        return "Orçamento";
      case "budget_items":
        return "Item do orçamento";
      case "clinical_notes":
        return "Prontuário";
      case "patient_treatments":
        return "Tratamento";
      default:
        return tableName || "Registro";
    }
  };

  const auditActionClass = (action?: string | null) => {
    if (action === "INSERT") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (action === "UPDATE") return "bg-blue-50 text-blue-700 border-blue-100";
    if (action === "DELETE") return "bg-rose-50 text-rose-700 border-rose-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: p, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", params.id)
        .single();

      if (patientError) throw patientError;

      const { data: a, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", params.id)
        .order("date", { ascending: false })
        .order("start_time", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      const { data: b, error: budgetsError } = await supabase
        .from("budgets")
        .select("*")
        .eq("patient_id", params.id)
        .order("created_at", { ascending: false });

      if (budgetsError) throw budgetsError;

      const { data: pt, error: treatmentsError } = await supabase
        .from("patient_treatments")
        .select("*")
        .eq("patient_id", params.id)
        .order("created_at", { ascending: false });

      if (treatmentsError) throw treatmentsError;

      const { data: tn, error: treatmentNotesError } = await supabase
        .from("treatment_notes")
        .select("*")
        .eq("patient_id", params.id)
        .order("created_at", { ascending: false });

      if (treatmentNotesError) throw treatmentNotesError;

      const { data: f, error: financialError } = await supabase
        .from("financial_records")
        .select("*")
        .eq("patient_id", params.id)
        .order("created_at", { ascending: false });

      if (financialError) throw financialError;

      const { data: cn, error: clinicalNotesError } = await supabase
        .from("clinical_notes")
        .select("*")
        .eq("patient_id", params.id)
        .order("created_at", { ascending: false });

      if (clinicalNotesError) throw clinicalNotesError;

      const { data: pf, error: patientFilesError } = await supabase
        .from("patient_files")
        .select("*")
        .eq("patient_id", params.id)
        .order("created_at", { ascending: false });

      if (patientFilesError) throw patientFilesError;

      const { data: auditData, error: auditError } = await supabase
        .from("audit_logs")
        .select("id, user_email, action, table_name, record_id, old_data, new_data, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (auditError) throw auditError;

      const patientAuditLogs = (auditData || []).filter((log: any) => {
        const oldData = log.old_data || {};
        const newData = log.new_data || {};

        return (
          log.record_id === params.id ||
          oldData.patient_id === params.id ||
          newData.patient_id === params.id ||
          oldData.id === params.id ||
          newData.id === params.id
        );
      });

      let txs: PaymentTransaction[] = [];

      if (f && f.length > 0) {
        const ids = f.map((item: FinancialRecord) => item.id);

        const { data: t, error: txError } = await supabase
          .from("payment_transactions")
          .select("*")
          .in("financial_record_id", ids)
          .order("received_at", { ascending: false })
          .order("created_at", { ascending: false });

        if (txError) throw txError;

        txs = (t || []) as PaymentTransaction[];
      }

      setPatient(p);
      setAppointments(a || []);
      setBudgets(b || []);
      setPatientTreatments((pt || []) as PatientTreatment[]);
      setTreatmentNotes((tn || []) as TreatmentNote[]);
      setFinancialRecords((f || []) as FinancialRecord[]);
      setPaymentTransactions(txs);
      setClinicalNotes((cn || []) as ClinicalNote[]);
      setPatientFiles((pf || []) as PatientFile[]);
      setAuditLogs(patientAuditLogs);
    } catch (error: any) {
      alert("Erro ao carregar prontuário: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  useEffect(() => {
    try {
      const requestedTab = window.localStorage.getItem("patientActiveTab");

      const validTabs: TabId[] = [
        "sobre",
        "tratamentos",
        "agendamentos",
        "orcamentos",
        "financeiro",
        "linha_tempo",
        "imagens_rx",
        "documentos",
      ];

      if (requestedTab && validTabs.includes(requestedTab as TabId)) {
        setActiveTab(requestedTab as TabId);
        window.localStorage.removeItem("patientActiveTab");
      }
    } catch {
      // localStorage pode estar indisponível em alguns ambientes
    }
  }, []);

  const openEditPatientModal = () => {
    setPatientForm({
      name: patient?.name || "",
      cpf: patient?.cpf || "",
      phone: patient?.phone || "",
      email: patient?.email || "",
      birth_date: patient?.birth_date || patient?.date_of_birth || "",
      gender: patient?.gender || "",
      plan: patient?.plan || "",
      cep: "",
      address: patient?.address || "",
      neighborhood: patient?.neighborhood || "",
      city: patient?.city || "",
      state: patient?.state || "",
      notes: patient?.notes || "",
    });
    setShowEditPatientModal(true);
  };

  const closeEditPatientModal = () => {
    if (submittingPatientEdit) return;
    setShowEditPatientModal(false);
  };

  const updatePatientForm = (field: string, value: string) => {
    setPatientForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const searchAddressByCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");

    updatePatientForm("cep", cepValue);

    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data?.erro) {
        alert("CEP não encontrado.");
        return;
      }

      setPatientForm((current) => ({
        ...current,
        cep: cepValue,
        address: data.logradouro || current.address || "",
        neighborhood: data.bairro || current.neighborhood || "",
        city: data.localidade || current.city || "",
        state: data.uf || current.state || "",
      }));
    } catch {
      alert("Não foi possível buscar o CEP agora. Confira sua internet e tente novamente.");
    }
  };

  const savePatientEdit = async () => {
    if (!patientForm.name.trim()) {
      alert("Informe o nome do paciente.");
      return;
    }

    try {
      setSubmittingPatientEdit(true);

      const { error } = await supabase
        .from("patients")
        .update({
          name: patientForm.name.trim(),
          cpf: patientForm.cpf.trim() || null,
          phone: patientForm.phone.trim() || null,
          email: patientForm.email.trim() || null,
          birth_date: patientForm.birth_date || null,
          gender: patientForm.gender.trim() || null,
          plan: patientForm.plan.trim() || null,
          address: patientForm.address.trim() || null,
          neighborhood: patientForm.neighborhood.trim() || null,
          city: patientForm.city.trim() || null,
          state: patientForm.state.trim() || null,
          notes: patientForm.notes.trim() || null,
        })
        .eq("id", params.id);

      if (error) throw error;

      alert("Dados do paciente atualizados com sucesso.");
      setShowEditPatientModal(false);
      await loadData();
    } catch (error: any) {
      alert("Erro ao atualizar paciente: " + error.message);
    } finally {
      setSubmittingPatientEdit(false);
    }
  };

  const openFinalizeModal = (treatment: PatientTreatment) => {
    const nome =
      treatment.procedure_name ||
      treatment.treatment_name ||
      treatment.title ||
      "Tratamento";

    setSelectedTreatment(treatment);
    setFinalizeProfessional("Dr(a). Henrique S. Pasquali");
    setFinalizeDate(new Date().toISOString().slice(0, 10));
    setFinalizeEvolution(`${nome} foi finalizado`);
    setFinalizeShouldReceive(true);
    setShowFinalizeModal(true);
  };

  const closeFinalizeModal = () => {
    if (submittingFinalize) return;
    setShowFinalizeModal(false);
    setSelectedTreatment(null);
    setFinalizeProfessional("Dr(a). Henrique S. Pasquali");
    setFinalizeDate(new Date().toISOString().slice(0, 10));
    setFinalizeEvolution("");
    setFinalizeShouldReceive(true);
  };

  const openEvolutionModal = (treatment: PatientTreatment) => {
    setSelectedEvolutionTreatment(treatment);
    setEvolutionTitle("Evolução clínica");
    setEvolutionProfessional("Dr(a). Henrique S. Pasquali");
    setEvolutionDate(new Date().toISOString().slice(0, 10));
    setEvolutionContent("");
    setShowEvolutionModal(true);
  };

  const closeEvolutionModal = () => {
    if (submittingEvolution) return;

    setShowEvolutionModal(false);
    setSelectedEvolutionTreatment(null);
    setEvolutionTitle("Evolução clínica");
    setEvolutionProfessional("Dr(a). Henrique S. Pasquali");
    setEvolutionDate(new Date().toISOString().slice(0, 10));
    setEvolutionContent("");
  };

  const confirmEvolution = async () => {
    if (!selectedEvolutionTreatment) return;

    if (!evolutionContent.trim()) {
      alert("Descreva a evolução clínica.");
      return;
    }

    try {
      setSubmittingEvolution(true);

      const evolutionAtIso = new Date(`${evolutionDate}T12:00:00`).toISOString();

      const nome =
        selectedEvolutionTreatment.procedure_name ||
        selectedEvolutionTreatment.treatment_name ||
        selectedEvolutionTreatment.title ||
        "Tratamento";

      const dente = selectedEvolutionTreatment.tooth
        ? ` | Dente: ${selectedEvolutionTreatment.tooth}`
        : "";

      const face = selectedEvolutionTreatment.face
        ? ` | Face: ${selectedEvolutionTreatment.face}`
        : "";

      const content =
        `${evolutionContent.trim()}\n\n` +
        `Profissional: ${evolutionProfessional}\n` +
        `Data: ${new Date(evolutionAtIso).toLocaleDateString("pt-BR")}`;

      const { error: treatmentNoteError } = await supabase
        .from("treatment_notes")
        .insert({
          patient_treatment_id: selectedEvolutionTreatment.id,
          patient_id: params.id,
          title: evolutionTitle || "Evolução clínica",
          content,
        });

      if (treatmentNoteError) throw treatmentNoteError;

      const { error: clinicalNoteError } = await supabase
        .from("clinical_notes")
        .insert({
          patient_id: params.id,
          title: evolutionTitle || "Evolução clínica",
          content: `${nome}${dente}${face}\n\n${content}`,
        });

      if (clinicalNoteError) throw clinicalNoteError;

      setActiveTab("tratamentos");

      alert("Evolução registrada com sucesso.");
      closeEvolutionModal();
      await loadData();
    } catch (error: any) {
      alert("Erro ao registrar evolução: " + error.message);
    } finally {
      setSubmittingEvolution(false);
    }
  };

  const findExistingFinancialForTreatment = async (
    treatment: PatientTreatment,
    selectFields = "*"
  ) => {
    if (!treatment?.id) return null;

    const { data: byTreatment, error: byTreatmentError } = await supabase
      .from("financial_records")
      .select(selectFields)
      .eq("patient_id", params.id)
      .eq("patient_treatment_id", treatment.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (byTreatmentError) throw byTreatmentError;

    if (byTreatment && byTreatment.length > 0) {
      return byTreatment[0] as unknown as FinancialRecord;
    }

    if (!treatment.budget_id) {
      return null;
    }

    const { data: byBudget, error: byBudgetError } = await supabase
      .from("financial_records")
      .select(selectFields)
      .eq("patient_id", params.id)
      .eq("budget_id", treatment.budget_id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (byBudgetError) throw byBudgetError;

    return byBudget && byBudget.length > 0
      ? (byBudget[0] as unknown as FinancialRecord)
      : null;
  };

  const confirmFinalizeTreatment = async () => {
    if (!selectedTreatment) return;

    if (!finalizeEvolution.trim()) {
      alert("Descreva a evolução do tratamento.");
      return;
    }

    try {
      setSubmittingFinalize(true);

      const completedAtIso = new Date(`${finalizeDate}T12:00:00`).toISOString();

      const { error: updateError } = await supabase
        .from("patient_treatments")
        .update({
          status: "finalizado",
          completed_at: completedAtIso,
        })
        .eq("id", selectedTreatment.id);

      if (updateError) throw updateError;

      const nomeFinanceiro =
        selectedTreatment.procedure_name ||
        selectedTreatment.treatment_name ||
        selectedTreatment.title ||
        "Tratamento";

      const denteFinanceiro = selectedTreatment.tooth
        ? ` - Dente ${selectedTreatment.tooth}`
        : "";

      const faceFinanceiro = selectedTreatment.face
        ? ` - Face(s): ${selectedTreatment.face}`
        : "";

      const valorTratamento =
        parseMoney(selectedTreatment.total) ||
        parseMoney(selectedTreatment.unit_price);

      const existingFinancialRecord = await findExistingFinancialForTreatment(
        selectedTreatment,
        "id"
      );


      // O financeiro deve ser criado somente na aprovação do orçamento.
      // A finalização do tratamento é apenas clínica e não deve gerar novo débito.
      if (!existingFinancialRecord) {
        console.warn(
          "Tratamento finalizado sem financeiro vinculado ao orçamento/tratamento:",
          selectedTreatment.id
        );
      }

      const { error: treatmentNoteError } = await supabase
        .from("treatment_notes")
        .insert({
          patient_treatment_id: selectedTreatment.id,
          patient_id: params.id,
          title: "Tratamento finalizado",
          content:
            `${finalizeEvolution.trim()}\n\n` +
            `Profissional: ${finalizeProfessional}\n` +
            `Data: ${new Date(completedAtIso).toLocaleDateString("pt-BR")}`,
        });

      if (treatmentNoteError) throw treatmentNoteError;

      const nome =
        selectedTreatment.procedure_name ||
        selectedTreatment.treatment_name ||
        selectedTreatment.title ||
        "Tratamento";

      const dente = selectedTreatment.tooth
        ? ` | Dente: ${selectedTreatment.tooth}`
        : "";
      const face = selectedTreatment.face
        ? ` | Face: ${selectedTreatment.face}`
        : "";

      const { error: clinicalNoteError } = await supabase
        .from("clinical_notes")
        .insert({
          patient_id: params.id,
          title: "Tratamento finalizado",
          content:
            `${nome}${dente}${face}\n\n` +
            `${finalizeEvolution.trim()}\n\n` +
            `Profissional: ${finalizeProfessional}\n` +
            `Data: ${new Date(completedAtIso).toLocaleDateString("pt-BR")}`,
        });

      if (clinicalNoteError) throw clinicalNoteError;

      setActiveTab("tratamentos");
      setShowCompletedTreatments(true);

      alert("Tratamento finalizado com sucesso.");
      closeFinalizeModal();

      const financialRecordToReceive = await findExistingFinancialForTreatment(
        selectedTreatment,
        "*"
      );

      await loadData();

      if (false && financialRecordToReceive) {
        openPaymentModal(financialRecordToReceive as FinancialRecord);
      }
    } catch (error: any) {
      alert("Erro ao finalizar tratamento: " + error.message);
    } finally {
      setSubmittingFinalize(false);
    }
  };

  const openPaymentModal = (record: FinancialRecord) => {
    const total = parseMoney(record.amount);
    const paid = parseMoney(record.paid_amount);
    const remaining = Math.max(0, total - paid);

    setSelectedRecord(record);
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : "");
    setPaymentMethod("pix");
    setReceiptType("nenhum");
    setReceivedAt(new Date().toISOString().slice(0, 10));
    setPaymentNote("");
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    if (submittingPayment) return;

    setShowPaymentModal(false);
    setSelectedRecord(null);
    setPaymentAmount("");
    setPaymentMethod("pix");
    setReceiptType("nenhum");
    setReceivedAt(new Date().toISOString().slice(0, 10));
    setPaymentNote("");
  };

  const createFinancialRecordFromTreatment = async (
    treatment: PatientTreatment
  ) => {
    const nome =
      treatment.procedure_name ||
      treatment.treatment_name ||
      treatment.title ||
      "Tratamento";

    const dente = treatment.tooth ? ` - Dente ${treatment.tooth}` : "";
    const face = treatment.face ? ` - Face(s): ${treatment.face}` : "";

    const valor = parseMoney(treatment.total) || parseMoney(treatment.unit_price);

    if (valor <= 0) {
      alert("Este tratamento não possui valor para receber.");
      return null;
    }

    const existing = await findExistingFinancialForTreatment(treatment, "*");

    if (existing) {
      return existing as FinancialRecord;
    }

    const { data: created, error: insertError } = await supabase
      .from("financial_records")
      .insert({
        patient_id: params.id,
        patient_treatment_id: treatment.id,
        budget_id: treatment.budget_id || null,
        description: `${nome}${dente}${face}`,
        amount: valor,
        paid_amount: 0,
        status: "pendente",
        installment_number: 1,
        installments: 1,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    return created as FinancialRecord;
  };

  const receiveTreatment = async (treatment: PatientTreatment) => {
    try {
      const record = await createFinancialRecordFromTreatment(treatment);

      if (!record) return;

      openPaymentModal(record);
      await loadData();
    } catch (error: any) {
      alert("Erro ao preparar recebimento: " + error.message);
    }
  };

  const deleteFinancialRecord = async (record: FinancialRecord) => {
    const confirmed = window.confirm(
      "Deseja realmente excluir este débito?\n\nEssa ação também remove pagamentos vinculados a ele e não pode ser desfeita."
    );

    if (!confirmed) return;

    try {
      const { error: txError } = await supabase
        .from("payment_transactions")
        .delete()
        .eq("financial_record_id", record.id);

      if (txError) throw txError;

      const { error } = await supabase
        .from("financial_records")
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      if (detailRecord?.id === record.id) {
        setDetailRecord(null);
      }

      alert("Débito excluído com sucesso.");
      await loadData();
    } catch (error: any) {
      alert("Erro ao excluir débito: " + error.message);
    }
  };

  const openEditPaymentModal = (transaction: PaymentTransaction) => {
    setSelectedPaymentTransaction(transaction);
    setEditPaymentAmount(String(parseMoney(transaction.amount).toFixed(2)));
    setEditPaymentMethod((transaction.payment_method as PaymentMethod) || "pix");
    setEditReceiptType((transaction.receipt_type as ReceiptType) || "nenhum");
    setEditReceivedAt(
      transaction.received_at
        ? String(transaction.received_at).slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setEditPaymentNote(transaction.note || "");
    setShowEditPaymentModal(true);
  };

  const closeEditPaymentModal = () => {
    if (submittingEditPayment) return;

    setShowEditPaymentModal(false);
    setSelectedPaymentTransaction(null);
    setEditPaymentAmount("");
    setEditPaymentMethod("pix");
    setEditReceiptType("nenhum");
    setEditReceivedAt(new Date().toISOString().slice(0, 10));
    setEditPaymentNote("");
  };

  const confirmEditPayment = async () => {
    if (!selectedPaymentTransaction) return;

    const editedAmount = Number(String(editPaymentAmount).replace(",", "."));

    if (isNaN(editedAmount) || editedAmount <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    const record =
      financialRecords.find(
        (item) => item.id === selectedPaymentTransaction.financial_record_id
      ) || detailRecord;

    if (!record) {
      alert("Não encontrei o débito vinculado a este pagamento.");
      return;
    }

    const relatedTransactions = paymentTransactions.filter(
      (transaction) =>
        transaction.financial_record_id ===
        selectedPaymentTransaction.financial_record_id
    );

    const updatedPaidAmount = relatedTransactions.reduce((acc, transaction) => {
      if (transaction.id === selectedPaymentTransaction.id) {
        return acc + editedAmount;
      }

      return acc + parseMoney(transaction.amount);
    }, 0);

    const totalAmount = parseMoney(record.amount);

    if (updatedPaidAmount > totalAmount) {
      alert("A soma dos pagamentos não pode ser maior que o valor total do débito.");
      return;
    }

    let newStatus = "pendente";
    if (updatedPaidAmount === 0) newStatus = "pendente";
    else if (updatedPaidAmount < totalAmount) newStatus = "parcial";
    else newStatus = "pago";

    try {
      setSubmittingEditPayment(true);

      const receivedAtIso = new Date(editReceivedAt + "T12:00:00").toISOString();

      const { error: transactionError } = await supabase
        .from("payment_transactions")
        .update({
          amount: editedAmount,
          payment_method: editPaymentMethod,
          receipt_type: editReceiptType,
          note: editPaymentNote || null,
          received_at: receivedAtIso,
        })
        .eq("id", selectedPaymentTransaction.id);

      if (transactionError) throw transactionError;

      const { error: recordError } = await supabase
        .from("financial_records")
        .update({
          paid_amount: updatedPaidAmount,
          status: newStatus,
          payment_method: editPaymentMethod,
          receipt_type: editReceiptType,
          paid_at: receivedAtIso,
        })
        .eq("id", selectedPaymentTransaction.financial_record_id);

      if (recordError) throw recordError;

      alert("Pagamento editado com sucesso.");
      closeEditPaymentModal();
      await loadData();
    } catch (error: any) {
      alert("Erro ao editar pagamento: " + error.message);
    } finally {
      setSubmittingEditPayment(false);
    }
  };

  const confirmPayment = async () => {
    if (!selectedRecord) return;

    const paymentNow = Number(String(paymentAmount).replace(",", "."));

    if (isNaN(paymentNow) || paymentNow <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    const totalAmount = parseMoney(selectedRecord.amount);
    const currentPaid = parseMoney(selectedRecord.paid_amount);
    const newPaidAmount = currentPaid + paymentNow;

    if (newPaidAmount > totalAmount) {
      alert("O valor recebido não pode ser maior que o saldo do débito.");
      return;
    }

    let newStatus = "pendente";
    if (newPaidAmount === 0) newStatus = "pendente";
    else if (newPaidAmount < totalAmount) newStatus = "parcial";
    else newStatus = "pago";

    try {
      setSubmittingPayment(true);

      const { error: insertError } = await supabase
        .from("payment_transactions")
        .insert({
          financial_record_id: selectedRecord.id,
          patient_id: selectedRecord.patient_id,
          amount: paymentNow,
          payment_method: paymentMethod,
          receipt_type: receiptType,
          note: paymentNote || null,
          received_at: receivedAt,
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("financial_records")
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
          payment_method: paymentMethod,
          receipt_type: receiptType,
          paid_at: new Date(`${receivedAt}T12:00:00`).toISOString(),
        })
        .eq("id", selectedRecord.id);

      if (updateError) throw updateError;

      alert("Pagamento registrado com sucesso.");
      closePaymentModal();
      await loadData();
    } catch (error: any) {
      alert("Erro ao registrar pagamento: " + error.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const transactionsByRecord = useMemo(() => {
    const grouped: Record<string, PaymentTransaction[]> = {};

    for (const tx of paymentTransactions) {
      if (!grouped[tx.financial_record_id]) {
        grouped[tx.financial_record_id] = [];
      }
      grouped[tx.financial_record_id].push(tx);
    }

    return grouped;
  }, [paymentTransactions]);

  const treatmentNotesByTreatment = useMemo(() => {
    const grouped: Record<string, TreatmentNote[]> = {};

    for (const note of treatmentNotes) {
      if (!grouped[note.patient_treatment_id]) {
        grouped[note.patient_treatment_id] = [];
      }
      grouped[note.patient_treatment_id].push(note);
    }

    return grouped;
  }, [treatmentNotes]);

  const pendingTreatments = patientTreatments.filter(
    (item) => item.status !== "finalizado"
  ).length;

  const treatmentSummary = useMemo(() => {
    return {
      pendentes: patientTreatments.filter(
        (item) => !item.status || item.status === "pendente"
      ).length,
      emAtendimento: patientTreatments.filter(
        (item) => item.status === "em_atendimento"
      ).length,
      finalizados: patientTreatments.filter(
        (item) => item.status === "finalizado"
      ).length,
    };
  }, [patientTreatments]);

  const filteredTreatments = [...patientTreatments].sort((a, b) => {
    const aDone = a.status === "finalizado" ? 1 : 0;
    const bDone = b.status === "finalizado" ? 1 : 0;

    if (aDone !== bDone) return aDone - bDone;

    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;

    return bDate - aDate;
  });

  const recentAppointments = appointments.slice(0, 5);
  const latestClinicalNote = clinicalNotes.length > 0 ? clinicalNotes[0] : null;

  const clinicalTimeline = useMemo(() => {
    return clinicalNotes
      .map((note) => ({
        id: note.id,
        title: note.title || "Evolução clínica",
        content: note.content || "",
        date: note.created_at || "",
      }))
      .sort((a, b) => {
        const aDate = a.date ? new Date(a.date).getTime() : 0;
        const bDate = b.date ? new Date(b.date).getTime() : 0;
        return bDate - aDate;
      });
  }, [clinicalNotes]);


  const completeTimeline = useMemo(() => {
    const events: {
      id: string;
      date: string;
      type: "clinical" | "appointment" | "budget" | "financial" | "payment" | "audit" | "treatment";
      title: string;
      subtitle?: string;
      content?: string;
      amount?: number;
      status?: string | null;
      userEmail?: string | null;
    }[] = [];

    clinicalNotes.forEach((note) => {
      events.push({
        id: `clinical-${note.id}`,
        date: note.created_at || "",
        type: "clinical",
        title: note.title || "Evolução clínica",
        subtitle: "Prontuário",
        content: note.content || "",
      });
    });

    appointments.forEach((appointment) => {
      const dateTime = appointment.date
        ? `${appointment.date}T${appointment.start_time || "12:00"}:00`
        : appointment.created_at || "";

      events.push({
        id: `appointment-${appointment.id}`,
        date: dateTime,
        type: "appointment",
        title: appointment.type === "compromisso" ? "Compromisso" : "Consulta agendada",
        subtitle: `${appointment.date || "Data não informada"} às ${appointment.start_time || "-"}`,
        content: appointment.description || appointment.title || appointment.status || "",
        status: appointment.status || null,
      });
    });

    patientTreatments.forEach((treatment) => {
      const name =
        treatment.procedure_name ||
        treatment.treatment_name ||
        treatment.title ||
        "Tratamento";

      events.push({
        id: `treatment-${treatment.id}`,
        date: treatment.completed_at || treatment.created_at || "",
        type: "treatment",
        title: treatment.status === "finalizado" ? "Tratamento finalizado" : "Tratamento criado",
        subtitle: name,
        content: [
          treatment.tooth ? `Dente ${treatment.tooth}` : "",
          treatment.face ? `Face ${treatment.face}` : "",
        ]
          .filter(Boolean)
          .join(" • "),
        amount: parseMoney(treatment.total),
        status: treatment.status || null,
      });
    });

    budgets.forEach((budget) => {
      events.push({
        id: `budget-${budget.id}`,
        date: budget.approved_at || budget.created_at || "",
        type: "budget",
        title: budget.status === "aprovado" ? "Orçamento aprovado" : "Orçamento criado",
        subtitle: budget.status || "pendente",
        amount: parseMoney(budget.total),
        status: budget.status || null,
      });
    });

    financialRecords.forEach((record) => {
      events.push({
        id: `financial-${record.id}`,
        date: record.paid_at || record.created_at || "",
        type: "financial",
        title: record.status === "pago" ? "Débito pago" : "Débito lançado",
        subtitle: record.description || "Financeiro",
        amount: parseMoney(record.amount),
        status: record.status || null,
      });
    });

    paymentTransactions.forEach((transaction) => {
      events.push({
        id: `payment-${transaction.id}`,
        date: transaction.received_at || transaction.created_at || "",
        type: "payment",
        title: "Pagamento recebido",
        subtitle: paymentMethodLabel(transaction.payment_method),
        content: transaction.note || "",
        amount: parseMoney(transaction.amount),
      });
    });

    auditLogs.forEach((log) => {
      events.push({
        id: `audit-${log.id}`,
        date: log.created_at || "",
        type: "audit",
        title: `${auditActionLabel(log.action)} ${auditTableLabel(log.table_name)}`,
        subtitle: "Auditoria de segurança",
        userEmail: log.user_email || null,
        status: log.action || null,
      });
    });

    return events.sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return bDate - aDate;
    });
  }, [
    appointments,
    auditLogs,
    budgets,
    clinicalNotes,
    financialRecords,
    patientTreatments,
    paymentTransactions,
  ]);

  const timelineTypeLabel = (type: string) => {
    switch (type) {
      case "clinical":
        return "Prontuário";
      case "appointment":
        return "Agenda";
      case "budget":
        return "Orçamento";
      case "financial":
        return "Financeiro";
      case "payment":
        return "Pagamento";
      case "audit":
        return "Auditoria";
      case "treatment":
        return "Tratamento";
      default:
        return "Registro";
    }
  };

  const timelineTypeClass = (type: string) => {
    switch (type) {
      case "clinical":
        return "bg-cyan-50 text-cyan-700 border-cyan-100";
      case "appointment":
        return "bg-sky-50 text-sky-700 border-sky-100";
      case "budget":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "financial":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "payment":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "audit":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "treatment":
        return "bg-purple-50 text-purple-700 border-purple-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const activeTreatments = filteredTreatments.filter(
    (treatment) => treatment.status !== "finalizado"
  );

  const totalLancadoPaciente = financialRecords.reduce(
    (acc, record) => acc + parseMoney(record.amount),
    0
  );

  const totalPagoPaciente = financialRecords.reduce(
    (acc, record) => acc + parseMoney(record.paid_amount),
    0
  );

  const totalAbertoPaciente = financialRecords.reduce((acc, record) => {
    const total = parseMoney(record.amount);
    const pago = parseMoney(record.paid_amount);
    return acc + Math.max(0, total - pago);
  }, 0);

  const phoneDigits = normalizePhone(patient?.phone);
  const whatsappHref = phoneDigits
    ? `https://wa.me/55${
        phoneDigits.startsWith("55") ? phoneDigits.slice(2) : phoneDigits
      }`
    : "#";

  const buildChargeWhatsappHref = (record: FinancialRecord) => {
    if (!phoneDigits) {
      alert("Paciente sem telefone cadastrado.");
      return "#";
    }

    const phone = phoneDigits.startsWith("55")
      ? phoneDigits
      : `55${phoneDigits}`;

    const amount = parseMoney(record.amount);
    const paid = parseMoney(record.paid_amount);
    const remaining = Math.max(0, amount - paid);

    const description = record.description || "tratamento odontológico";

    const message =
      `Olá, ${patient?.name || ""}! Tudo bem?\n\n` +
      `Aqui é da clínica odontológica.\n\n` +
      `Identificamos um valor pendente referente a:\n` +
      `🦷 ${description}\n\n` +
      `💰 Valor em aberto: ${formatCurrency(remaining)}\n\n` +
      `Quando puder, nos avise para organizarmos a melhor forma de pagamento.\n\n` +
      `Ficamos à disposição 🙂`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const createNoShowFee = async (appointment: any) => {
    const feeAmountText = window.prompt(
      "Informe o valor da taxa de falta. Deixe vazio para cancelar.",
      "50"
    );

    if (!feeAmountText) return;

    const feeAmount = Number(String(feeAmountText).replace(",", "."));

    if (Number.isNaN(feeAmount) || feeAmount <= 0) {
      alert("Valor inválido.");
      return;
    }

    try {
      const description = `Taxa de falta - consulta de ${
        appointment.date
          ? new Date(`${appointment.date}T12:00:00`).toLocaleDateString("pt-BR")
          : "data não informada"
      } às ${appointment.start_time || "-"}`;

      const { data: existing, error: existingError } = await supabase
        .from("financial_records")
        .select("id")
        .eq("patient_id", params.id)
        .eq("description", description)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        alert("Já existe uma taxa de falta lançada para esta consulta.");
        return;
      }

      const { error } = await supabase.from("financial_records").insert({
        patient_id: params.id,
        description,
        amount: feeAmount,
        paid_amount: 0,
        status: "pendente",
        installment_number: 1,
        installments: 1,
      });

      if (error) throw error;

      alert("Taxa de falta lançada no financeiro do paciente.");
      await loadData();
      setActiveTab("financeiro");
    } catch (error: any) {
      alert("Erro ao lançar taxa de falta: " + error.message);
    }
  };


  const isImageFile = (file?: PatientFile | null) => {
    return Boolean(file?.file_type?.startsWith("image/"));
  };

  const safeFileName = (name: string) => {
    return String(name || "arquivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();
  };

  const uploadPatientFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingPatientFile(true);

      const storagePath = `${params.id}/${Date.now()}-${safeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-files")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("patient-files")
        .getPublicUrl(storagePath);

      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        throw new Error("Não foi possível gerar o link público do arquivo.");
      }

      const { error: insertError } = await supabase.from("patient_files").insert({
        patient_id: params.id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type || "application/octet-stream",
        storage_path: storagePath,
      });

      if (insertError) throw insertError;

      event.target.value = "";

      await loadData();

      alert("Arquivo enviado com sucesso.");
    } catch (error: any) {
      alert("Erro ao enviar arquivo: " + (error?.message || "erro inesperado"));
    } finally {
      setUploadingPatientFile(false);
    }
  };

  const deletePatientFile = async (file: PatientFile) => {
    const confirmed = window.confirm(
      "Deseja realmente excluir este arquivo do prontuário?"
    );

    if (!confirmed) return;

    try {
      if (file.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("patient-files")
          .remove([file.storage_path]);

        if (storageError) {
          console.warn("Arquivo removido do registro, mas houve erro no Storage:", storageError);
        }
      }

      const { error } = await supabase
        .from("patient_files")
        .delete()
        .eq("id", file.id);

      if (error) throw error;

      if (selectedPatientFile?.id === file.id) {
        setSelectedPatientFile(null);
      }

      await loadData();

      alert("Arquivo excluído com sucesso.");
    } catch (error: any) {
      alert("Erro ao excluir arquivo: " + (error?.message || "erro inesperado"));
    }
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!patient) {
    return <div className="p-6">Paciente não encontrado.</div>;
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-2 pb-32 sm:p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-3 pb-32 md:space-y-4 md:pb-24">
        <div className="flex flex-col gap-3 rounded-[1.35rem] border border-[#d8eeee] bg-white p-3 shadow-sm md:flex-row md:items-start md:justify-between md:p-5">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dfeff0] text-lg font-semibold text-[#5f7f84] md:h-20 md:w-20 md:text-2xl">
              {patient.name?.charAt(0)?.toUpperCase() || "P"}
            </div>

            <div>
              <h1 className="text-xl font-black leading-tight text-slate-800 md:text-3xl">
                {patient.name}
              </h1>

              <div className="mt-1 space-y-0.5 text-xs text-slate-600 md:mt-2 md:space-y-1 md:text-sm">
                {patient.phone && <p>{patient.phone}</p>}
                {patient.cpf && <p>CPF: {patient.cpf}</p>}
              </div>

              {(patient.allergies ||
                patient.health_alert ||
                patient.medical_alert) && (
                <div className="mt-2 inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 md:mt-3 md:px-3 md:text-sm">
                  Alerta clínico:{" "}
                  {patient.allergies ||
                    patient.health_alert ||
                    patient.medical_alert}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">

            <button
              type="button"
              onClick={openEditPatientModal}
              className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-200 md:flex-none md:px-4 md:text-sm"
            >
              Editar
            </button>

            {phoneDigits ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-xl bg-[#1fb36e] px-3 py-2 text-center text-xs font-bold text-white md:flex-none md:px-4 md:text-sm"
              >
                WhatsApp
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-500 md:flex-none md:px-4 md:text-sm"
              >
                WhatsApp
              </button>
            )}

            <Link
              href={`/pacientes/${params.id}/orcamento`}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] px-3 py-2 text-center text-xs font-black text-white shadow-sm md:flex-none md:px-4 md:text-sm"
            >
              Abrir orçamento
            </Link>
          </div>
        </div>

        <div className="sticky top-0 z-20 rounded-[1.25rem] border border-[#d8eeee] bg-white/95 px-2 pt-2 shadow-sm backdrop-blur md:static md:px-5 md:pt-3">
          <div className="flex gap-2 overflow-x-auto pb-1 md:gap-6 md:pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-t-xl border-b-2 px-2 pb-2 pt-1 text-xs transition md:px-0 md:pb-3 md:pt-0 md:text-sm ${
                  activeTab === tab.id
                    ? "border-[#2ab7b3] text-[#239d9a] font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                {tab.id === "tratamentos" && patientTreatments.length > 0 && (
                  <span className="ml-2 text-xs text-slate-400">
                    ({pendingTreatments})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="fixed bottom-4 right-3 z-40 flex flex-col items-end gap-2 md:hidden">
          {phoneDigits && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#1fb36e] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/10"
            >
              WhatsApp
            </a>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("financeiro")}
            className="rounded-full border border-[#d8eeee] bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-[#239d9a] shadow-lg shadow-slate-900/10"
          >
            Financeiro
          </button>

          <Link
            href={`/pacientes/${params.id}/orcamento`}
            className="rounded-full bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-900/10"
          >
            Orçamento
          </Link>
        </div>

        {activeTab === "sobre" && (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
            <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                Dados pessoais

<button
                  type="button"
                  onClick={() => window.location.href = `/print/prontuario/${params.id}`}
                  className="ml-4 mb-3 rounded-xl bg-[#239d9a] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1f8f8c]"
                >
                  Imprimir prontuário
                </button>
              </h2>

              <div className="grid grid-cols-1 gap-y-2 gap-x-4 text-sm md:grid-cols-2 md:gap-y-3 md:gap-x-6">
                <div>
                  <div className="text-slate-500">Nome</div>
                  <div className="text-slate-800 font-medium">
                    {patient.name || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">CPF</div>
                  <div className="text-slate-800 font-medium">
                    {patient.cpf || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">Telefone</div>
                  <div className="text-slate-800 font-medium">
                    {patient.phone || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">Nascimento</div>
                  <div className="text-slate-800 font-medium">
                    {patient.birth_date || patient.date_of_birth || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">Sexo</div>
                  <div className="text-slate-800 font-medium">
                    {patient.gender || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">Plano</div>
                  <div className="text-slate-800 font-medium">
                    {patient.plan || "Particular"}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-slate-500">Endereço</div>
                  <div className="text-slate-800 font-medium">
                    {patient.address || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">Bairro</div>
                  <div className="text-slate-800 font-medium">
                    {patient.neighborhood || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">Cidade / UF</div>
                  <div className="text-slate-800 font-medium">
                    {[patient.city, patient.state].filter(Boolean).join(" / ") ||
                      "-"}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#d8eeee] bg-[#fbffff] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSecurityHistory((current) => !current)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#f5ffff] transition"
                >
                  <div>
                    <h3 className="text-base font-black text-slate-800">
                      Histórico de segurança
                    </h3>
                    <p className="text-xs text-slate-500">
                      Clique para {showSecurityHistory ? "ocultar" : "ver"} as últimas ações registradas neste prontuário.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#e8f7f6] px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#239d9a]">
                      Auditoria
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-[#d8eeee] text-slate-500 text-lg font-black">
                      {showSecurityHistory ? "−" : "+"}
                    </span>
                  </div>
                </button>

                {showSecurityHistory && (
                  <div className="px-4 pb-4">
                    {auditLogs.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nenhuma ação registrada para este paciente.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {auditLogs.slice(0, 12).map((log) => (
                          <div
                            key={log.id}
                            className="rounded-xl border border-[#e3f2f2] bg-white p-3 text-sm"
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${auditActionClass(
                                    log.action
                                  )}`}
                                >
                                  {auditActionLabel(log.action)}
                                </span>
                                <span className="truncate font-bold text-slate-700">
                                  {auditTableLabel(log.table_name)}
                                </span>
                              </div>

                              <span className="text-xs text-slate-400">
                                {log.created_at
                                  ? new Date(log.created_at).toLocaleString("pt-BR")
                                  : "-"}
                              </span>
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {log.user_email || "Usuário não identificado"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5">
                <h2 className="text-lg font-bold text-slate-800 mb-4">
                  Última evolução
                </h2>

                {latestClinicalNote ? (
                  <div className="space-y-2 text-sm">
                    <div className="text-slate-500">
                      {latestClinicalNote.created_at
                        ? new Date(
                            latestClinicalNote.created_at
                          ).toLocaleDateString("pt-BR")
                        : "-"}
                    </div>
                    {latestClinicalNote.title && (
                      <div className="font-semibold text-slate-800">
                        {latestClinicalNote.title}
                      </div>
                    )}
                    <div className="text-slate-700 whitespace-pre-wrap">
                      {latestClinicalNote.content}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Nenhuma evolução registrada.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5">
                <h2 className="text-lg font-bold text-slate-800 mb-4">
                  Consultas
                </h2>

                <div className="space-y-3">
                  {recentAppointments.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Nenhuma consulta encontrada.
                    </p>
                  )}

                  {recentAppointments.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b last:border-b-0 pb-3 last:pb-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {a.date} às {a.start_time}
                        </div>
                        <div className="text-sm text-slate-500">
                          {a.title || "Consulta"}
                        </div>
                      </div>

                      <div className="text-sm text-[#239d9a] font-medium">
                        {a.status || "Agendada"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tratamentos" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5 xl:col-span-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Tratamentos em andamento
                  </h2>
                  <p className="text-sm text-slate-500">
                    Procedimentos aprovados que ainda não foram finalizados.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                      Pendentes: {treatmentSummary.pendentes}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-700 font-semibold">
                      Em atendimento: {treatmentSummary.emAtendimento}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {activeTreatments.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#d8eeee] bg-[#fbffff] p-6 text-center">
                    <p className="text-sm text-slate-500">
                      Nenhum tratamento em andamento.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Quando um tratamento for finalizado, sua evolução ficará na linha do tempo.
                    </p>
                  </div>
                )}

                {activeTreatments.map((treatment) => {
                const notesForTreatment =
                  treatmentNotesByTreatment[treatment.id] || [];

                return (
                  <div
                    key={treatment.id}
                    className={`border rounded-xl p-3 space-y-3 ${
                      treatment.status === "finalizado"
                        ? "bg-slate-50 opacity-70"
                        : "bg-white shadow-sm border-[#d9eeee]"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-800 text-sm leading-tight">
                          {treatment.procedure_name ||
                            treatment.treatment_name ||
                            treatment.title ||
                            "Tratamento"}
                        </div>

                        {treatment.treatment_name &&
                          treatment.procedure_name &&
                          treatment.treatment_name !== treatment.procedure_name && (
                            <div className="text-sm text-slate-600">
                              Plano/tratamento: {treatment.treatment_name}
                            </div>
                          )}

                        <div className="flex flex-wrap gap-2">
                          {treatment.tooth && (
                            <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-xs font-medium">
                              Dente: {treatment.tooth}
                            </span>
                          )}

                          {treatment.face && (
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">
                              Face: {treatment.face}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                          <span>Qtd: {treatment.quantity || 1}</span>
                          <span>Valor: {formatCurrency(parseMoney(treatment.total))}</span>
                        </div>

                        {treatment.created_at && (
                          <div className="text-xs text-slate-500">
                            Criado em:{" "}
                            {new Date(treatment.created_at).toLocaleDateString(
                              "pt-BR"
                            )}
                          </div>
                        )}

                        {treatment.completed_at && (
                          <div className="text-xs text-slate-500">
                            Finalizado em:{" "}
                            {new Date(treatment.completed_at).toLocaleDateString(
                              "pt-BR"
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-start md:items-end gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${treatmentStatusColor(
                            treatment.status
                          )}`}
                        >
                          {treatment.status || "pendente"}
                        </span>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEvolutionModal(treatment)}
                            className="bg-white border border-[#d9eeee] text-[#239d9a] px-3 py-1.5 rounded-lg text-xs font-medium"
                          >
                            Evolução
                          </button>


                          {treatment.status !== "finalizado" && (
                            <button
                              type="button"
                              onClick={() => openFinalizeModal(treatment)}
                              className="bg-[#239d9a] text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                            >
                              Finalizar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Evoluções do tratamento
                      </h3>

                      <div className="space-y-2">
                        {notesForTreatment.length === 0 && (
                          <p className="text-sm text-slate-500">
                            Nenhuma evolução registrada para este tratamento.
                          </p>
                        )}

                        {notesForTreatment.map((note) => (
                          <div
                            key={note.id}
                            className="bg-[#fbffff] border border-[#e3f2f2] rounded-lg p-3"
                          >
                            <div className="text-xs text-slate-500">
                              {note.created_at
                                ? new Date(note.created_at).toLocaleDateString(
                                    "pt-BR"
                                  )
                                : "-"}
                            </div>

                            {note.title && (
                              <div className="font-semibold text-sm text-slate-800">
                                {note.title}
                              </div>
                            )}

                            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {note.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5 xl:col-span-1">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Evolução do tratamento
                  </h2>
                  <p className="text-sm text-slate-500">
                    Linha do tempo clínica deste paciente.
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                {clinicalTimeline.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#d8eeee] bg-[#fbffff] p-5 text-center">
                    <p className="text-sm text-slate-500">
                      Nenhuma evolução registrada.
                    </p>
                  </div>
                )}

                {clinicalTimeline.map((item) => (
                  <div
                    key={item.id}
                    className="border border-[#e3f2f2] rounded-xl bg-[#fbffff] p-3"
                  >
                    <div className="flex flex-col gap-1 mb-2">
                      <div className="text-sm font-semibold text-slate-800">
                        {item.title}
                      </div>

                      <div className="text-xs text-slate-500">
                        {item.date
                          ? new Date(item.date).toLocaleDateString("pt-BR")
                          : "-"}
                      </div>
                    </div>

                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "agendamentos" && (
          <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5">
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              Histórico de agendamentos
            </h2>

            <div className="space-y-2">
              {appointments.length === 0 && (
                <p className="text-slate-500 text-sm">
                  Nenhum agendamento encontrado.
                </p>
              )}

              {appointments.map((a) => (
                <div key={a.id} className="border rounded-xl p-3 bg-slate-50">
                  <div className="font-semibold text-slate-800 text-sm">
                    {a.date} às {a.start_time}
                  </div>
                  <div className="text-sm text-slate-600">
                    Tipo: {a.type === "compromisso" ? "Compromisso" : a.title}
                  </div>
                  <div className="text-sm text-slate-600">
                    Duração: {a.duration || 30} min
                  </div>
                  {a.description && (
                    <div className="text-sm text-slate-600 mt-1">
                      {a.description}
                    </div>
                  )}

                  {(a.status === "faltou" || a.status === "Faltou") && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => createNoShowFee(a)}
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-red-700 border border-red-100 hover:bg-red-100"
                      >
                        Lançar taxa de falta
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "orcamentos" && (
          <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-800">Orçamentos</h2>

              <Link
                href={`/pacientes/${params.id}/orcamento`}
                className="text-[#239d9a] font-medium text-sm"
              >
                Gerenciar
              </Link>
            </div>

            <div className="space-y-2">
              {budgets.length === 0 && (
                <p className="text-slate-500 text-sm">
                  Nenhum orçamento encontrado.
                </p>
              )}

              {budgets.map((b) => (
                <Link
                  key={b.id}
                  href={`/pacientes/${params.id}/orcamento?budgetId=${b.id}`}
                  className="block border rounded-xl p-3 bg-slate-50 hover:bg-slate-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">
                        Orçamento
                      </div>
                      <div className="text-sm text-slate-600">
                        Criado em{" "}
                        {new Date(b.created_at).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="text-sm text-slate-600">
                        Total: {formatCurrency(Number(b.total || 0))}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${budgetStatusColor(
                        b.status
                      )}`}
                    >
                      {b.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeTab === "financeiro" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] font-black text-slate-400">
                  Total lançado
                </div>
                <div className="mt-2 text-2xl font-black text-slate-800">
                  {formatCurrency(totalLancadoPaciente)}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] font-black text-slate-400">
                  Já pagou
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-600">
                  {formatCurrency(totalPagoPaciente)}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] font-black text-slate-400">
                  Falta pagar
                </div>
                <div className="mt-2 text-2xl font-black text-[#239d9a]">
                  {formatCurrency(totalAbertoPaciente)}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                Débitos do paciente
              </h2>

              {financialRecords.length === 0 && (
                <p className="text-slate-500 text-sm">
                  Nenhum débito encontrado.
                </p>
              )}

              <div className="space-y-2">
                {financialRecords.map((record) => {
                  const amount = parseMoney(record.amount);
                  const paidAmount = parseMoney(record.paid_amount);
                  const remaining = Math.max(0, amount - paidAmount);

                  return (
                    <div
                      key={record.id}
                      className={`grid grid-cols-12 items-center gap-2 rounded-xl border px-3 py-3 md:gap-3 md:px-4 ${receiptHighlightClass(
                        record.receipt_type
                      )}`}
                    >
                      <div className="col-span-12 md:col-span-2 text-sm font-medium text-slate-600">
                        {record.created_at
                          ? new Date(record.created_at).toLocaleDateString("pt-BR")
                          : "-"}
                      </div>

                      <div className="col-span-12 md:col-span-3 flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {record.installments && record.installments > 1
                            ? `Parcela ${record.installment_number || 1}/${record.installments}`
                            : "Débito"}
                        </span>

                        <button
                          type="button"
                          onClick={() => setDetailRecord(record)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold"
                          title="Ver detalhes"
                        >
                          i
                        </button>
                      </div>

                      <div className="col-span-12 md:col-span-2 text-sm text-slate-500">
                        {paymentMethodLabel(record.payment_method)}
                      </div>

                      <div className="col-span-6 md:col-span-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${financialStatusColor(
                            record.status
                          )}`}
                        >
                          {record.status || "pendente"}
                        </span>
                      </div>

                      <div className="col-span-6 md:col-span-1 text-right text-sm font-black text-slate-800">
                        {formatCurrency(amount)}
                      </div>

                      <div className="col-span-12 flex flex-wrap justify-start gap-2 md:col-span-2 md:justify-end">
                        {record.status === "pago" && (
                          <button
                            type="button"
                            onClick={() => window.location.href = `/print/recibo/${record.id}`}
                            className="bg-[#eefafa] text-[#239d9a] px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-[#d8eeee] hover:bg-[#dff3f2]"
                          >
                            Imprimir recibo
                          </button>
                        )}

                        {record.status !== "pago" && remaining > 0 && (
                          <>
                            {phoneDigits && (
                              <a
                                href={buildChargeWhatsappHref(record)}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-[#1fb36e] text-white px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest"
                              >
                                Cobrar
                              </a>
                            )}

                            <button
                              onClick={() => openPaymentModal(record)}
                              className="bg-[#239d9a] text-white px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest"
                            >
                              Receber
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteFinancialRecord(record)}
                          className="bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-700"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {activeTab === "linha_tempo" && (
          <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  Linha do tempo completa
                </h2>
                <p className="text-sm text-slate-500">
                  Prontuário, agenda, orçamentos, financeiro e auditoria em uma única visão.
                </p>
              </div>

              <span className="rounded-full bg-[#e8f7f6] px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#239d9a]">
                {completeTimeline.length} registros
              </span>
            </div>

            {completeTimeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8eeee] bg-[#fbffff] p-8 text-center">
                <p className="text-sm text-slate-500">
                  Nenhum evento encontrado para este paciente.
                </p>
              </div>
            ) : (
              <div className="relative space-y-3 md:space-y-4">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#d8eeee]" />

                {completeTimeline.map((event) => (
                  <div key={event.id} className="relative pl-8 md:pl-10">
                    <div className="absolute left-0 top-4 flex h-6 w-6 items-center justify-center rounded-full border border-[#d8eeee] bg-white shadow-sm md:h-8 md:w-8">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#239d9a] md:h-3 md:w-3" />
                    </div>

                    <div className="rounded-2xl border border-[#e3f2f2] bg-[#fbffff] p-3 shadow-sm md:p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${timelineTypeClass(
                                event.type
                              )}`}
                            >
                              {timelineTypeLabel(event.type)}
                            </span>

                            {event.status && (
                              <span className="rounded-full bg-white border border-[#d8eeee] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {event.status}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-2 text-base font-black text-slate-800">
                            {event.title}
                          </h3>

                          {event.subtitle && (
                            <p className="mt-1 text-sm font-semibold text-slate-600">
                              {event.subtitle}
                            </p>
                          )}

                          {event.content && (
                            <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                              {event.content}
                            </p>
                          )}

                          {event.userEmail && (
                            <p className="mt-2 text-xs text-slate-500">
                              Usuário: {event.userEmail}
                            </p>
                          )}
                        </div>

                        <div className="text-left md:text-right shrink-0">
                          <div className="text-xs font-semibold text-slate-500">
                            {event.date
                              ? new Date(event.date).toLocaleString("pt-BR")
                              : "Data não informada"}
                          </div>

                          {typeof event.amount === "number" && event.amount > 0 && (
                            <div className="mt-2 text-sm font-black text-slate-800">
                              {formatCurrency(event.amount)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {activeTab === "imagens_rx" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    Imagens e RX
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Tire fotos pela câmera do celular ou envie radiografias, fotografias intraorais, panorâmicas e PDFs.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-[#239d9a] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#1f8f8c] sm:w-auto">
                    {uploadingPatientFile ? "Enviando..." : "Tirar foto"}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={uploadingPatientFile}
                      onChange={uploadPatientFile}
                    />
                  </label>

                  <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-[#d8eeee] bg-white px-5 py-3 text-sm font-black text-[#239d9a] shadow-sm hover:bg-[#eefafa] sm:w-auto">
                    {uploadingPatientFile ? "Enviando..." : "Enviar arquivo"}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      disabled={uploadingPatientFile}
                      onChange={uploadPatientFile}
                    />
                  </label>
                </div>
              </div>
            </div>

            {patientFiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#d8eeee] p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#eefafa] text-2xl">
                  🩻
                </div>
                <h3 className="mt-4 text-base font-black text-slate-800">
                  Nenhuma imagem ou RX enviado
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Use “Tirar foto” no celular ou “Enviar arquivo” para anexar imagens e RX ao prontuário.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {patientFiles.map((file) => (
                  <div
                    key={file.id}
                    className="overflow-hidden rounded-2xl border border-[#d8eeee] bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPatientFile(file)}
                      className="block w-full bg-[#f7ffff] text-left"
                    >
                      {isImageFile(file) ? (
                        <img
                          src={file.file_url || ""}
                          alt={file.file_name || "Arquivo do paciente"}
                          className="h-44 w-full object-cover md:h-48"
                        />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center bg-[#eefafa] md:h-48">
                          <div className="text-center">
                            <div className="text-4xl">📄</div>
                            <div className="mt-2 text-xs font-black uppercase tracking-widest text-[#239d9a]">
                              Documento/PDF
                            </div>
                          </div>
                        </div>
                      )}
                    </button>

                    <div className="p-4">
                      <div className="truncate text-sm font-black text-slate-800">
                        {file.file_name || "Arquivo"}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {file.created_at
                          ? new Date(file.created_at).toLocaleString("pt-BR")
                          : "Data não informada"}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={file.file_url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-[#d8eeee] bg-[#fbffff] px-3 py-2 text-xs font-black text-[#239d9a] hover:bg-[#eefafa]"
                        >
                          Abrir
                        </a>

                        <button
                          type="button"
                          onClick={() => setSelectedPatientFile(file)}
                          className="rounded-xl border border-[#d8eeee] bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                        >
                          Visualizar
                        </button>

                        <button
                          type="button"
                          onClick={() => deletePatientFile(file)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "documentos" && (
          <div className="bg-white rounded-2xl border border-[#d8eeee] p-3 shadow-sm md:p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Documentos</h2>
                <p className="text-sm text-slate-500">
                  Impressão de prontuário, termos e documentos do paciente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => window.location.href = `/print/prontuario/${params.id}`}
                className="text-left rounded-2xl border border-[#d8eeee] bg-[#fbffff] p-5 hover:bg-[#eefafa] transition"
              >
                <div className="text-sm font-black uppercase tracking-widest text-[#239d9a]">
                  Prontuário
                </div>
                <div className="mt-2 text-lg font-bold text-slate-800">
                  Imprimir prontuário
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Abre o prontuário do paciente em uma tela própria para impressão.
                </p>
              </button>

              <button
                type="button"
                onClick={() => window.location.href = `/print/termo/${params.id}`}
                className="text-left rounded-2xl border border-[#d8eeee] bg-[#fbffff] p-5 hover:bg-[#eefafa] transition"
              >
                <div className="text-sm font-black uppercase tracking-widest text-[#239d9a]">
                  Termo
                </div>
                <div className="mt-2 text-lg font-bold text-slate-800">
                  Gerar termo
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Abre o termo de consentimento do paciente para impressão.
                </p>
              </button>

              <Link
                href={`/pacientes/${params.id}/orcamento`}
                className="text-left rounded-2xl border border-[#d8eeee] bg-[#fbffff] p-5 hover:bg-[#eefafa] transition"
              >
                <div className="text-sm font-black uppercase tracking-widest text-[#239d9a]">
                  Orçamento
                </div>
                <div className="mt-2 text-lg font-bold text-slate-800">
                  Abrir orçamento
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Acesse a área de orçamento para gerar ou revisar propostas.
                </p>
              </Link>
            </div>
          </div>
        )}
      </div>


      {selectedPatientFile && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-[#d8eeee]">
            <div className="flex items-center justify-between gap-3 border-b border-[#d8eeee] p-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-slate-800">
                  {selectedPatientFile.file_name || "Arquivo do paciente"}
                </h3>
                <p className="text-xs text-slate-500">
                  Imagens e RX do prontuário
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPatientFile(null)}
                className="rounded-xl border border-[#d8eeee] bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[76vh] overflow-auto bg-[#f8ffff] p-4">
              {isImageFile(selectedPatientFile) ? (
                <img
                  src={selectedPatientFile.file_url || ""}
                  alt={selectedPatientFile.file_name || "Arquivo do paciente"}
                  className="mx-auto max-h-[72vh] max-w-full rounded-2xl object-contain shadow-sm"
                />
              ) : (
                <div className="rounded-2xl border border-[#d8eeee] bg-white p-8 text-center">
                  <div className="text-5xl">📄</div>
                  <h4 className="mt-4 text-lg font-black text-slate-800">
                    Visualização direta disponível em nova aba
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Clique em abrir para visualizar este documento.
                  </p>
                  <a
                    href={selectedPatientFile.file_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex rounded-xl bg-[#239d9a] px-5 py-3 text-sm font-black text-white hover:bg-[#1f8f8c]"
                  >
                    Abrir arquivo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditPatientModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-[#d8eeee]">
            <div className="p-5 border-b flex items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  Editar paciente
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Atualize os dados cadastrais e endereço do paciente.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditPatientModal}
                className="w-9 h-9 rounded-full border text-slate-500 hover:bg-slate-50"
                disabled={submittingPatientEdit}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block mb-1 text-slate-600 text-sm font-medium">
                    Nome do paciente *
                  </label>
                  <input
                    type="text"
                    value={patientForm.name}
                    onChange={(e) => updatePatientForm("name", e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-600 text-sm font-medium">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={patientForm.cpf}
                    onChange={(e) => updatePatientForm("cpf", e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-600 text-sm font-medium">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={patientForm.phone}
                    onChange={(e) => updatePatientForm("phone", e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-600 text-sm font-medium">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={patientForm.email}
                    onChange={(e) => updatePatientForm("email", e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                    placeholder="paciente@email.com"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-600 text-sm font-medium">
                    Data de nascimento
                  </label>
                  <input
                    type="date"
                    value={patientForm.birth_date}
                    onChange={(e) => updatePatientForm("birth_date", e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-600 text-sm font-medium">
                    Sexo
                  </label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) => updatePatientForm("gender", e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800 bg-white"
                  >
                    <option value="">Não informado</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-slate-600 text-sm font-medium">
                    Plano
                  </label>
                  <input
                    type="text"
                    value={patientForm.plan}
                    onChange={(e) => updatePatientForm("plan", e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                    placeholder="Particular, convênio, etc."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#d8eeee] bg-[#fbffff] p-4">
                <h4 className="font-bold text-slate-800 mb-3">Endereço</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-slate-600 text-sm font-medium">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={patientForm.cep}
                      onChange={(e) => searchAddressByCep(e.target.value)}
                      className="w-full border rounded-xl p-3 text-base text-slate-800"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Ao informar 8 números, rua, bairro, cidade e UF são preenchidos automaticamente.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-1 text-slate-600 text-sm font-medium">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={patientForm.address}
                      onChange={(e) => updatePatientForm("address", e.target.value)}
                      className="w-full border rounded-xl p-3 text-base text-slate-800"
                      placeholder="Rua, número, complemento"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-600 text-sm font-medium">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={patientForm.neighborhood}
                      onChange={(e) =>
                        updatePatientForm("neighborhood", e.target.value)
                      }
                      className="w-full border rounded-xl p-3 text-base text-slate-800"
                      placeholder="Bairro"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-600 text-sm font-medium">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={patientForm.city}
                      onChange={(e) => updatePatientForm("city", e.target.value)}
                      className="w-full border rounded-xl p-3 text-base text-slate-800"
                      placeholder="Cidade"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-600 text-sm font-medium">
                      Estado / UF
                    </label>
                    <input
                      type="text"
                      value={patientForm.state}
                      onChange={(e) => updatePatientForm("state", e.target.value)}
                      className="w-full border rounded-xl p-3 text-base text-slate-800"
                      placeholder="SC"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-600 text-sm font-medium">
                  Observações
                </label>
                <textarea
                  value={patientForm.notes}
                  onChange={(e) => updatePatientForm("notes", e.target.value)}
                  className="w-full min-h-[120px] border rounded-xl p-3 text-sm text-slate-800"
                  placeholder="Observações gerais do cadastro..."
                />
              </div>
            </div>

            <div className="p-5 border-t flex justify-end gap-2 bg-white sticky bottom-0">
              <button
                type="button"
                onClick={closeEditPatientModal}
                className="px-4 py-2 border rounded-xl text-sm"
                disabled={submittingPatientEdit}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={savePatientEdit}
                className="px-4 py-2 bg-[#239d9a] text-white rounded-xl text-sm font-semibold disabled:opacity-60"
                disabled={submittingPatientEdit}
              >
                {submittingPatientEdit ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#d8eeee] overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">
                Detalhes do débito
              </h3>
              <button
                type="button"
                onClick={() => setDetailRecord(null)}
                className="w-9 h-9 rounded-full border text-slate-500 hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <div className="rounded-xl border bg-slate-50 p-4 space-y-2">
                <div>
                  <span className="font-semibold text-slate-700">Descrição:</span>{" "}
                  <span className="text-slate-600">
                    {detailRecord.description || "-"}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-700">Valor:</span>{" "}
                  <span className="text-slate-600">
                    {formatCurrency(parseMoney(detailRecord.amount))}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-700">Já pago:</span>{" "}
                  <span className="text-slate-600">
                    {formatCurrency(parseMoney(detailRecord.paid_amount))}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-700">Saldo:</span>{" "}
                  <span className="text-slate-600">
                    {formatCurrency(
                      Math.max(
                        0,
                        parseMoney(detailRecord.amount) -
                          parseMoney(detailRecord.paid_amount)
                      )
                    )}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-700">Parcela:</span>{" "}
                  <span className="text-slate-600">
                    {detailRecord.installment_number || 1}/
                    {detailRecord.installments || 1}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-700">Status:</span>{" "}
                  <span className="text-slate-600">
                    {detailRecord.status || "pendente"}
                  </span>
                </div>
              </div>

              {(transactionsByRecord[detailRecord.id] || []).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800">
                    Histórico de pagamentos
                  </h4>

                  {(transactionsByRecord[detailRecord.id] || []).map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-xl border bg-white p-3 text-sm"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <strong>
                            {formatCurrency(Number(tx.amount || 0))}
                          </strong>{" "}
                          em{" "}
                          {new Date(tx.received_at).toLocaleDateString("pt-BR")}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-slate-500">
                          <span>
                            {paymentMethodLabel(tx.payment_method)} •{" "}
                            {receiptLabel(tx.receipt_type)}
                          </span>

                          <button
                            type="button"
                            onClick={() => openEditPaymentModal(tx)}
                            className="rounded-lg border border-[#d8eeee] bg-[#fbffff] px-2 py-1 text-[11px] font-bold text-[#239d9a] hover:bg-[#eefafa]"
                          >
                            Editar
                          </button>
                        </div>
                      </div>

                      {tx.note && (
                        <div className="mt-1 text-slate-500">
                          Obs.: {tx.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEvolutionModal && selectedEvolutionTreatment && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#d8eeee] overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-2xl font-bold text-slate-800">
                Adicionar evolução
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {selectedEvolutionTreatment.procedure_name ||
                  selectedEvolutionTreatment.treatment_name ||
                  selectedEvolutionTreatment.title ||
                  "Tratamento"}
                {selectedEvolutionTreatment.tooth
                  ? ` • Dente ${selectedEvolutionTreatment.tooth}`
                  : ""}
                {selectedEvolutionTreatment.face
                  ? ` • Face(s): ${selectedEvolutionTreatment.face}`
                  : ""}
              </p>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1 text-slate-500 text-sm">
                    Título
                  </label>
                  <input
                    type="text"
                    value={evolutionTitle}
                    onChange={(e) => setEvolutionTitle(e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-500 text-sm">
                    Profissional
                  </label>
                  <input
                    type="text"
                    value={evolutionProfessional}
                    onChange={(e) => setEvolutionProfessional(e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-500 text-sm">
                    Data
                  </label>
                  <input
                    type="date"
                    value={evolutionDate}
                    onChange={(e) => setEvolutionDate(e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-slate-700 text-sm font-medium">
                  Evolução clínica
                </label>
                <textarea
                  value={evolutionContent}
                  onChange={(e) => setEvolutionContent(e.target.value)}
                  className="w-full min-h-[240px] border rounded-xl p-3 text-sm text-slate-800"
                  placeholder="Descreva a evolução clínica desta sessão..."
                />
              </div>
            </div>

            <div className="p-5 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEvolutionModal}
                className="px-4 py-2 border rounded-xl text-sm"
                disabled={submittingEvolution}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmEvolution}
                className="px-4 py-2 bg-[#239d9a] text-white rounded-xl text-sm disabled:opacity-60"
                disabled={submittingEvolution}
              >
                {submittingEvolution ? "Salvando..." : "Salvar evolução"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalizeModal && selectedTreatment && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#d8eeee] overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-2xl font-bold text-slate-800">
                Finalizar tratamento
              </h3>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-slate-500 text-sm">
                    Profissional
                  </label>
                  <input
                    type="text"
                    value={finalizeProfessional}
                    onChange={(e) => setFinalizeProfessional(e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-500 text-sm">
                    Data
                  </label>
                  <input
                    type="date"
                    value={finalizeDate}
                    onChange={(e) => setFinalizeDate(e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-slate-700 text-sm font-medium">
                  Evolução
                </label>
                <textarea
                  value={finalizeEvolution}
                  onChange={(e) => setFinalizeEvolution(e.target.value)}
                  className="w-full min-h-[240px] border rounded-xl p-3 text-sm text-slate-800"
                  placeholder="Descreva o que foi feito no tratamento..."
                />
              </div>

              <div className="rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-700">
                    Abrir recebimento após finalizar
                  </div>
                  <div className="text-xs text-slate-500">
                    Desative se quiser apenas finalizar e cobrar depois.
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={finalizeShouldReceive}
                    onChange={(e) => setFinalizeShouldReceive(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#239d9a] peer-checked:after:translate-x-5" />
                </label>
              </div>
            </div>

            <div className="p-5 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={closeFinalizeModal}
                className="px-4 py-2 border rounded-xl text-sm"
                disabled={submittingFinalize}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmFinalizeTreatment}
                className="px-4 py-2 bg-[#239d9a] text-white rounded-xl text-sm disabled:opacity-60"
                disabled={submittingFinalize}
              >
                {submittingFinalize ? "Finalizando..." : "Finalizar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditPaymentModal && selectedPaymentTransaction && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-[#d8eeee] overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-xl font-bold text-slate-800">
                Editar pagamento recebido
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Ajuste valor, forma de pagamento, recibo, data ou observação.
              </p>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">
                  Meio de pagamento
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 border rounded-xl overflow-hidden text-sm">
                  {[
                    ["dinheiro", "Dinheiro"],
                    ["cartao_credito", "Crédito"],
                    ["cartao_debito", "Débito"],
                    ["pix", "Pix"],
                    ["transferencia", "Transferência"],
                    ["boleto", "Boleto"],
                    ["cheque", "Cheque"],
                  ].map(([value, label], index, array) => {
                    const active = editPaymentMethod === value;
                    const last = index === array.length - 1;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setEditPaymentMethod(value as PaymentMethod)
                        }
                        className={`px-3 py-3 transition ${
                          !last ? "border-r" : ""
                        } ${
                          active
                            ? "bg-cyan-50 text-cyan-700 font-semibold"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <label className="block mb-1 text-slate-500">
                    Valor pago
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPaymentAmount}
                    onChange={(e) => setEditPaymentAmount(e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-500">
                    Data de recebimento
                  </label>
                  <input
                    type="date"
                    value={editReceivedAt}
                    onChange={(e) => setEditReceivedAt(e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-500">
                    Tipo de recibo
                  </label>
                  <select
                    value={editReceiptType}
                    onChange={(e) =>
                      setEditReceiptType(e.target.value as ReceiptType)
                    }
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                  >
                    <option value="nenhum">Sem recibo</option>
                    <option value="simples">Imprimir recibo simples</option>
                    <option value="imposto_renda">Imprimir recibo IR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1 text-slate-500">
                  Observação
                </label>
                <textarea
                  value={editPaymentNote}
                  onChange={(e) => setEditPaymentNote(e.target.value)}
                  className="w-full min-h-[120px] border rounded-xl p-3 text-sm text-slate-800"
                  placeholder="Observações do recebimento"
                  maxLength={500}
                />
                <div className="text-right text-sm text-slate-400 mt-1">
                  {editPaymentNote.length} / 500
                </div>
              </div>
            </div>

            <div className="p-5 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditPaymentModal}
                className="px-4 py-2 border rounded-xl text-sm"
                disabled={submittingEditPayment}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmEditPayment}
                className="px-4 py-2 bg-[#239d9a] text-white rounded-xl text-sm disabled:opacity-60"
                disabled={submittingEditPayment}
              >
                {submittingEditPayment ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-[#d8eeee] overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-xl font-bold text-slate-800">
                Receber receita de {patient.name}
              </h3>

              <div className="mt-3 space-y-1 text-slate-600 text-sm">
                <div className="font-medium text-slate-800">
                  {selectedRecord.description || "Procedimento"}
                </div>

                <div className="text-slate-500">{patient.name}</div>

                <div className="flex flex-wrap gap-4 mt-2">
                  <span>
                    <strong>Total:</strong>{" "}
                    {formatCurrency(parseMoney(selectedRecord.amount))}
                  </span>
                  <span>
                    <strong>Pago:</strong>{" "}
                    {formatCurrency(parseMoney(selectedRecord.paid_amount))}
                  </span>
                  <span>
                    <strong>Saldo:</strong>{" "}
                    {formatCurrency(
                      Math.max(
                        0,
                        parseMoney(selectedRecord.amount) -
                          parseMoney(selectedRecord.paid_amount)
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">
                  Meio de pagamento
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 border rounded-xl overflow-hidden text-sm">
                  {[
                    ["dinheiro", "Dinheiro"],
                    ["cartao_credito", "Crédito"],
                    ["cartao_debito", "Débito"],
                    ["pix", "Pix"],
                    ["transferencia", "Transferência"],
                    ["boleto", "Boleto"],
                    ["cheque", "Cheque"],
                  ].map(([value, label], index, array) => {
                    const active = paymentMethod === value;
                    const last = index === array.length - 1;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPaymentMethod(value as PaymentMethod)}
                        className={`px-3 py-3 transition ${
                          !last ? "border-r" : ""
                        } ${
                          active
                            ? "bg-cyan-50 text-cyan-700 font-semibold"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <label className="block mb-1 text-slate-500">
                    Valor pago
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-500">
                    Data de recebimento
                  </label>
                  <input
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-500">
                    Tipo de recibo
                  </label>
                  <select
                    value={receiptType}
                    onChange={(e) =>
                      setReceiptType(e.target.value as ReceiptType)
                    }
                    className="w-full border rounded-xl p-3 text-base text-slate-800"
                  >
                    <option value="nenhum">Sem recibo</option>
                    <option value="simples">Imprimir recibo simples</option>
                    <option value="imposto_renda">Imprimir recibo IR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1 text-slate-500">
                  Observação
                </label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full min-h-[120px] border rounded-xl p-3 text-sm text-slate-800"
                  placeholder="Observações do recebimento"
                  maxLength={500}
                />
                <div className="text-right text-sm text-slate-400 mt-1">
                  {paymentNote.length} / 500
                </div>
              </div>
            </div>

            <div className="p-5 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={closePaymentModal}
                className="px-4 py-2 border rounded-xl text-sm"
                disabled={submittingPayment}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmPayment}
                className="px-4 py-2 bg-[#239d9a] text-white rounded-xl text-sm disabled:opacity-60"
                disabled={submittingPayment}
              >
                {submittingPayment ? "Salvando..." : "Receber"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}