"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ConfigTab = "clinica" | "procedimentos" | "equipe" | "anamnese" | "comunicacao" | "financeiro" | "backup";

type ProcedureItem = {
  id: string;
  name: string;
  categoria: string | null;
  price: number | null;
};

type ProfessionalItem = {
  id: string;
  name: string;
  cro: string | null;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  active: boolean | null;
  google_calendar_id: string | null;
  google_calendar_email: string | null;
  google_connected: boolean | null;
};

type AnamnesisItem = {
  id: string;
  question: string;
  type: string | null;
  options: string | null;
  active: boolean | null;
};

type MessageTemplateItem = {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  active: boolean | null;
};


type BackupTableSummary = {
  key: string;
  label: string;
  count: number;
  required: boolean;
  present: boolean;
};

type BackupValidationSummary = {
  fileName: string;
  fileSize: string;
  valid: boolean;
  version: string;
  generatedAt: string;
  generatedAtLabel: string;
  totalRecords: number;
  patientsCount: number;
  appointmentsCount: number;
  financialCount: number;
  requiredPresentCount: number;
  requiredTotalCount: number;
  optionalPresentCount: number;
  optionalTotalCount: number;
  optionalMissingCount: number;
  compatibilityPercent: number;
  tables: BackupTableSummary[];
  warnings: string[];
  errors: string[];
};

type BackupRestoreResult = {
  key: string;
  label: string;
  count: number;
  success: boolean;
  message: string;
};

type CloudBackupFile = {
  name: string;
  path: string;
  size: number;
  createdAt: string;
};


export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<ConfigTab>("clinica");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as ConfigTab | null;
    const allowedTabs: ConfigTab[] = [
      "clinica",
      "procedimentos",
      "equipe",
      "anamnese",
      "comunicacao",
      "financeiro",
      "backup",
    ];

    if (tabParam && allowedTabs.includes(tabParam)) {
      setTab(tabParam);
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [form, setForm] = useState({
    name: "",
    document_type: "cpf",
    document: "",
    display_name: "",
    owner: "",
    cro: "",
    email: "",
    phone: "",
    whatsapp: "",
    zip_code: "",
    address: "",
    number: "",
    district: "",
    city: "",
    state: "",
    start_hour: "08",
    end_hour: "20",
    max_patients_day: "15",
    timezone: "America/Sao_Paulo",
  });

  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [procedureSearch, setProcedureSearch] = useState("");
  const [procedureLoading, setProcedureLoading] = useState(false);
  const [procedureForm, setProcedureForm] = useState({
    id: "",
    name: "",
    categoria: "",
    price: "",
  });

  const [team, setTeam] = useState<ProfessionalItem[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamLoading, setTeamLoading] = useState(false);
  const [memberForm, setMemberForm] = useState({
    id: "",
    name: "",
    cro: "",
    specialty: "",
    phone: "",
    email: "",
    active: true,
  });

  const [anamnesis, setAnamnesis] = useState<AnamnesisItem[]>([]);
  const [anamnesisSearch, setAnamnesisSearch] = useState("");
  const [anamnesisLoading, setAnamnesisLoading] = useState(false);
  const [anamnesisForm, setAnamnesisForm] = useState({
    id: "",
    question: "",
    type: "yes_no",
    options: "",
    active: true,
  });

  const [messages, setMessages] = useState<MessageTemplateItem[]>([]);
  const [messageSearch, setMessageSearch] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageForm, setMessageForm] = useState({
    id: "",
    type: "lembrete",
    title: "",
    content: "",
    active: true,
  });

  const [financialSettings, setFinancialSettings] = useState({
    default_receipt_type: "simples",
    accepted_payment_methods: "Pix, Dinheiro, Cartão de crédito, Cartão de débito",
    pix_key: "",
    receipt_note: "",
    late_fee_percent: "0",
    interest_percent_month: "0",
    default_due_days: "0",
  });
  const [financialLoading, setFinancialLoading] = useState(false);

  const [backupFileName, setBackupFileName] = useState("");
  const [backupChecking, setBackupChecking] = useState(false);
  const [backupValidation, setBackupValidation] = useState<BackupValidationSummary | null>(null);
  const [backupDataToRestore, setBackupDataToRestore] = useState<any | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [restoreModeAccepted, setRestoreModeAccepted] = useState(false);
  const [backupRestoring, setBackupRestoring] = useState(false);
  const [backupRestoreResults, setBackupRestoreResults] = useState<BackupRestoreResult[]>([]);
  const [cloudBackupLoading, setCloudBackupLoading] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<CloudBackupFile[]>([]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);

      const { data, error } = await supabase
        .from("clinic_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        alert("Erro ao carregar configurações: " + error.message);
        return;
      }

      if (data) {
        setForm({
          name: data.name || "",
          document_type: data.document_type || "cpf",
          document: data.document || data.cnpj || "",
          display_name: data.display_name || "",
          owner: data.owner || "",
          cro: data.cro || "",
          email: data.email || "",
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
          zip_code: data.zip_code || "",
          address: data.address || "",
          number: data.number || "",
          district: data.district || data.neighborhood || "",
          city: data.city || "",
          state: data.state || "",
          start_hour: String(data.start_hour || "08"),
          end_hour: String(data.end_hour || "20"),
          max_patients_day: String(data.max_patients_day || "15"),
          timezone: data.timezone || "America/Sao_Paulo",
        });
      }
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadProcedures = async () => {
    setProcedureLoading(true);

    const { data, error } = await supabase
      .from("procedures")
      .select("id, name, categoria, price")
      .order("name");

    if (error) {
      alert("Erro ao carregar procedimentos: " + error.message);
      setProcedureLoading(false);
      return;
    }

    setProcedures((data || []) as ProcedureItem[]);
    setProcedureLoading(false);
  };

  const loadTeam = async () => {
    setTeamLoading(true);

    const { data, error } = await supabase
      .from("professionals")
      .select("id, name, cro, specialty, phone, email, active, google_calendar_id, google_calendar_email, google_connected")
      .order("name");

    if (error) {
      alert("Erro ao carregar equipe: " + error.message);
      setTeamLoading(false);
      return;
    }

    setTeam((data || []) as ProfessionalItem[]);
    setTeamLoading(false);
  };

  const loadAnamnesis = async () => {
    setAnamnesisLoading(true);

    const { data, error } = await supabase
      .from("anamnesis_templates")
      .select("id, question, type, options, active")
      .order("created_at");

    if (error) {
      alert("Erro ao carregar anamnese: " + error.message);
      setAnamnesisLoading(false);
      return;
    }

    setAnamnesis((data || []) as AnamnesisItem[]);
    setAnamnesisLoading(false);
  };

  const loadMessages = async () => {
    setMessageLoading(true);

    const { data, error } = await supabase
      .from("message_templates")
      .select("id, type, title, content, active")
      .order("type");

    if (error) {
      alert("Erro ao carregar comunicação: " + error.message);
      setMessageLoading(false);
      return;
    }

    setMessages((data || []) as MessageTemplateItem[]);
    setMessageLoading(false);
  };

  const loadFinancialSettings = async () => {
    setFinancialLoading(true);

    const { data, error } = await supabase
      .from("financial_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      alert("Erro ao carregar financeiro/fiscal: " + error.message);
      setFinancialLoading(false);
      return;
    }

    if (data) {
      setFinancialSettings({
        default_receipt_type: data.default_receipt_type || "simples",
        accepted_payment_methods:
          data.accepted_payment_methods ||
          "Pix, Dinheiro, Cartão de crédito, Cartão de débito",
        pix_key: data.pix_key || "",
        receipt_note: data.receipt_note || "",
        late_fee_percent: String(data.late_fee_percent ?? "0"),
        interest_percent_month: String(data.interest_percent_month ?? "0"),
        default_due_days: String(data.default_due_days ?? "0"),
      });
    }

    setFinancialLoading(false);
  };

  useEffect(() => {
    loadSettings();
    loadProcedures();
    loadTeam();
    loadAnamnesis();
    loadMessages();
    loadFinancialSettings();
  }, []);

  useEffect(() => {
    if (tab === "backup") {
      loadCloudBackups();
    }
  }, [tab]);

  const saveClinicSettings = async () => {
    setLoading(true);

    const { error } = await supabase
      .from("clinic_settings")
      .upsert([{ id: 1, ...form }]);

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      alert("Configurações salvas com sucesso.");
      await loadSettings();
    }

    setLoading(false);
  };

  const resetProcedureForm = () => {
    setProcedureForm({
      id: "",
      name: "",
      categoria: "",
      price: "",
    });
  };

  const saveProcedure = async () => {
    if (!procedureForm.name.trim()) {
      alert("Informe o nome do procedimento.");
      return;
    }

    const payload = {
      name: procedureForm.name.trim(),
      categoria: procedureForm.categoria.trim() || null,
      price: Number(procedureForm.price || 0),
    };

    setProcedureLoading(true);

    const query = procedureForm.id
      ? supabase.from("procedures").update(payload).eq("id", procedureForm.id)
      : supabase.from("procedures").insert([payload]);

    const { error } = await query;

    if (error) {
      alert("Erro ao salvar procedimento: " + error.message);
      setProcedureLoading(false);
      return;
    }

    resetProcedureForm();
    await loadProcedures();
    setProcedureLoading(false);
  };

  const editProcedure = (item: ProcedureItem) => {
    setProcedureForm({
      id: item.id,
      name: item.name || "",
      categoria: item.categoria || "",
      price: String(item.price || ""),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProcedure = async (item: ProcedureItem) => {
    const ok = window.confirm(`Excluir o procedimento "${item.name}"?`);
    if (!ok) return;

    setProcedureLoading(true);

    const { error } = await supabase
      .from("procedures")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Erro ao excluir procedimento: " + error.message);
      setProcedureLoading(false);
      return;
    }

    await loadProcedures();
    setProcedureLoading(false);
  };

  const resetMemberForm = () => {
    setMemberForm({
      id: "",
      name: "",
      cro: "",
      specialty: "",
      phone: "",
      email: "",
      active: true,
    });
  };

  const saveMember = async () => {
    if (!memberForm.name.trim()) {
      alert("Informe o nome do profissional.");
      return;
    }

    const payload = {
      name: memberForm.name.trim(),
      cro: memberForm.cro.trim() || null,
      specialty: memberForm.specialty.trim() || null,
      phone: memberForm.phone.trim() || null,
      email: memberForm.email.trim() || null,
      active: memberForm.active,
    };

    setTeamLoading(true);

    const query = memberForm.id
      ? supabase.from("professionals").update(payload).eq("id", memberForm.id)
      : supabase.from("professionals").insert([payload]);

    const { error } = await query;

    if (error) {
      alert("Erro ao salvar profissional: " + error.message);
      setTeamLoading(false);
      return;
    }

    resetMemberForm();
    await loadTeam();
    setTeamLoading(false);
  };

  const editMember = (item: ProfessionalItem) => {
    setMemberForm({
      id: item.id,
      name: item.name || "",
      cro: item.cro || "",
      specialty: item.specialty || "",
      phone: item.phone || "",
      email: item.email || "",
      active: item.active ?? true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteMember = async (item: ProfessionalItem) => {
    const ok = window.confirm(`Excluir o profissional "${item.name}"?`);
    if (!ok) return;

    setTeamLoading(true);

    const { error } = await supabase
      .from("professionals")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Erro ao excluir profissional: " + error.message);
      setTeamLoading(false);
      return;
    }

    await loadTeam();
    setTeamLoading(false);
  };

  const connectProfessionalGoogle = async (item: ProfessionalItem) => {
    if (!item.id) {
      alert("Salve o profissional antes de conectar ao Google Agenda.");
      return;
    }

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!user?.id) {
        alert("Usuário não autenticado. Faça login novamente antes de conectar o Google Agenda.");
        return;
      }

      const params = new URLSearchParams({
        userId: user.id,
        professionalId: item.id,
        professional_id: item.id,
        redirect: "/configuracoes?tab=equipe",
        origin: "professional_settings",
      });

      window.location.href = `/api/google/calendar/connect?${params.toString()}`;
    } catch (error: any) {
      console.error("Erro ao iniciar conexão Google do profissional:", error);
      alert(error?.message || "Erro ao iniciar conexão com Google Agenda.");
    }
  };

  const removeProfessionalGoogleConnection = async (item: ProfessionalItem) => {
    const ok = window.confirm(
      `Remover a conexão do Google Agenda de "${item.name}"? As consultas já criadas no Google não serão apagadas automaticamente.`
    );

    if (!ok) return;

    setTeamLoading(true);

    const { error } = await supabase
      .from("professionals")
      .update({
        google_calendar_id: null,
        google_calendar_email: null,
        google_connected: false,
      })
      .eq("id", item.id);

    if (error) {
      alert("Erro ao remover conexão com o Google Agenda: " + error.message);
      setTeamLoading(false);
      return;
    }

    await loadTeam();
    setTeamLoading(false);
  };

  const resetAnamnesisForm = () => {
    setAnamnesisForm({
      id: "",
      question: "",
      type: "yes_no",
      options: "",
      active: true,
    });
  };

  const saveAnamnesisQuestion = async () => {
    if (!anamnesisForm.question.trim()) {
      alert("Informe a pergunta da anamnese.");
      return;
    }

    const payload = {
      question: anamnesisForm.question.trim(),
      type: anamnesisForm.type,
      options: anamnesisForm.options.trim() || null,
      active: anamnesisForm.active,
    };

    setAnamnesisLoading(true);

    const query = anamnesisForm.id
      ? supabase
          .from("anamnesis_templates")
          .update(payload)
          .eq("id", anamnesisForm.id)
      : supabase.from("anamnesis_templates").insert([payload]);

    const { error } = await query;

    if (error) {
      alert("Erro ao salvar pergunta: " + error.message);
      setAnamnesisLoading(false);
      return;
    }

    resetAnamnesisForm();
    await loadAnamnesis();
    setAnamnesisLoading(false);
  };

  const editAnamnesisQuestion = (item: AnamnesisItem) => {
    setAnamnesisForm({
      id: item.id,
      question: item.question || "",
      type: item.type || "yes_no",
      options: item.options || "",
      active: item.active ?? true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteAnamnesisQuestion = async (item: AnamnesisItem) => {
    const ok = window.confirm(`Excluir a pergunta "${item.question}"?`);
    if (!ok) return;

    setAnamnesisLoading(true);

    const { error } = await supabase
      .from("anamnesis_templates")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Erro ao excluir pergunta: " + error.message);
      setAnamnesisLoading(false);
      return;
    }

    await loadAnamnesis();
    setAnamnesisLoading(false);
  };

  const seedDefaultAnamnesis = async () => {
    const ok = window.confirm(
      "Inserir uma anamnese odontológica completa? Isso não apaga perguntas existentes."
    );

    if (!ok) return;

    const defaultQuestions = [
      { question: "Está em tratamento médico atualmente?", type: "yes_no" },
      { question: "Faz uso de medicamentos contínuos? Quais?", type: "text" },
      { question: "Possui alergia a medicamentos, alimentos, látex ou anestésicos?", type: "text" },
      { question: "Possui diabetes?", type: "yes_no" },
      { question: "Possui hipertensão arterial?", type: "yes_no" },
      { question: "Possui problemas cardíacos?", type: "yes_no" },
      { question: "Já teve infarto, AVC ou trombose?", type: "yes_no" },
      { question: "Possui problemas respiratórios como asma, bronquite ou rinite?", type: "yes_no" },
      { question: "Possui problemas renais?", type: "yes_no" },
      { question: "Possui problemas hepáticos?", type: "yes_no" },
      { question: "Possui distúrbios de coagulação ou sangramento excessivo?", type: "yes_no" },
      { question: "Faz uso de anticoagulantes?", type: "yes_no" },
      { question: "Já realizou cirurgias? Quais?", type: "text" },
      { question: "Já teve reação ou complicação com anestesia?", type: "yes_no" },
      { question: "Está grávida ou existe suspeita de gravidez?", type: "yes_no" },
      { question: "Fuma?", type: "yes_no" },
      { question: "Consome bebida alcoólica com frequência?", type: "yes_no" },
      { question: "Range ou aperta os dentes?", type: "yes_no" },
      { question: "Sente dor dentária atualmente?", type: "yes_no" },
      { question: "Tem sensibilidade dentária?", type: "yes_no" },
      { question: "Apresenta sangramento gengival?", type: "yes_no" },
      { question: "Já realizou tratamento de canal?", type: "yes_no" },
      { question: "Já fez implantes dentários?", type: "yes_no" },
      { question: "Usa prótese dentária?", type: "yes_no" },
      { question: "Qual o principal motivo da consulta?", type: "text" },
      { question: "Observações gerais do paciente", type: "text" },
    ].map((item) => ({
      ...item,
      active: true,
      options: null,
    }));

    setAnamnesisLoading(true);

    const { error } = await supabase
      .from("anamnesis_templates")
      .insert(defaultQuestions);

    if (error) {
      alert("Erro ao inserir anamnese padrão: " + error.message);
      setAnamnesisLoading(false);
      return;
    }

    await loadAnamnesis();
    setAnamnesisLoading(false);
  };

  const resetMessageForm = () => {
    setMessageForm({
      id: "",
      type: "lembrete",
      title: "",
      content: "",
      active: true,
    });
  };

  const saveMessageTemplate = async () => {
    if (!messageForm.title.trim()) {
      alert("Informe o título da mensagem.");
      return;
    }

    if (!messageForm.content.trim()) {
      alert("Informe o conteúdo da mensagem.");
      return;
    }

    const payload = {
      type: messageForm.type,
      title: messageForm.title.trim(),
      content: messageForm.content.trim(),
      active: messageForm.active,
    };

    setMessageLoading(true);

    const query = messageForm.id
      ? supabase
          .from("message_templates")
          .update(payload)
          .eq("id", messageForm.id)
      : supabase.from("message_templates").insert([payload]);

    const { error } = await query;

    if (error) {
      alert("Erro ao salvar mensagem: " + error.message);
      setMessageLoading(false);
      return;
    }

    resetMessageForm();
    await loadMessages();
    setMessageLoading(false);
  };

  const editMessageTemplate = (item: MessageTemplateItem) => {
    setMessageForm({
      id: item.id,
      type: item.type || "lembrete",
      title: item.title || "",
      content: item.content || "",
      active: item.active ?? true,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteMessageTemplate = async (item: MessageTemplateItem) => {
    const ok = window.confirm(`Excluir a mensagem "${item.title}"?`);
    if (!ok) return;

    setMessageLoading(true);

    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Erro ao excluir mensagem: " + error.message);
      setMessageLoading(false);
      return;
    }

    await loadMessages();
    setMessageLoading(false);
  };

  const seedDefaultMessages = async () => {
    const ok = window.confirm(
      "Inserir mensagens padrão de comunicação? Isso não apaga mensagens existentes."
    );

    if (!ok) return;

    const defaultMessages = [
      {
        type: "confirmacao",
        title: "Confirmação de consulta",
        content:
          "Olá {{nome}}, tudo bem? Sua consulta está agendada para {{data}} às {{hora}}. Poderia confirmar sua presença?",
      },
      {
        type: "lembrete",
        title: "Lembrete de consulta",
        content:
          "Olá {{nome}}, passando para lembrar da sua consulta em {{data}} às {{hora}}. Te aguardamos!",
      },
      {
        type: "cobranca",
        title: "Cobrança",
        content:
          "Olá {{nome}}, identificamos um valor pendente de {{valor}} em seu atendimento. Podemos combinar a melhor forma de pagamento?",
      },
      {
        type: "retorno",
        title: "Retorno",
        content:
          "Olá {{nome}}, já está na hora do seu retorno odontológico. Gostaria de agendar um horário?",
      },
      {
        type: "aniversario",
        title: "Aniversário",
        content:
          "Olá {{nome}}, feliz aniversário! Desejamos muita saúde, alegria e muitos motivos para sorrir.",
      },
    ].map((item) => ({
      ...item,
      active: true,
    }));

    setMessageLoading(true);

    const { error } = await supabase
      .from("message_templates")
      .insert(defaultMessages);

    if (error) {
      alert("Erro ao inserir mensagens padrão: " + error.message);
      setMessageLoading(false);
      return;
    }

    await loadMessages();
    setMessageLoading(false);
  };

  const handleFinancialChange = (field: string, value: string) => {
    setFinancialSettings((prev) => ({ ...prev, [field]: value }));
  };

  const saveFinancialSettings = async () => {
    setFinancialLoading(true);

    const payload = {
      id: 1,
      default_receipt_type: financialSettings.default_receipt_type,
      accepted_payment_methods: financialSettings.accepted_payment_methods,
      pix_key: financialSettings.pix_key,
      receipt_note: financialSettings.receipt_note,
      late_fee_percent: Number(financialSettings.late_fee_percent || 0),
      interest_percent_month: Number(financialSettings.interest_percent_month || 0),
      default_due_days: Number(financialSettings.default_due_days || 0),
    };

    const { error } = await supabase
      .from("financial_settings")
      .upsert([payload]);

    if (error) {
      alert("Erro ao salvar financeiro/fiscal: " + error.message);
      setFinancialLoading(false);
      return;
    }

    alert("Configurações financeiras salvas com sucesso.");
    await loadFinancialSettings();
    setFinancialLoading(false);
  };


  const backupTables = [
    { key: "patients", label: "Pacientes", required: true },
    { key: "appointments", label: "Consultas / agenda", required: true },
    { key: "financial_records", label: "Financeiro", required: true },
    { key: "payment_transactions", label: "Pagamentos recebidos", required: false },
    { key: "budgets", label: "Orçamentos", required: true },
    { key: "budget_items", label: "Itens dos orçamentos", required: true },
    { key: "patient_treatments", label: "Tratamentos", required: true },
    { key: "treatment_notes", label: "Evoluções dos tratamentos", required: false },
    { key: "clinical_notes", label: "Anotações clínicas", required: false },
    { key: "patient_files", label: "Imagens e RX", required: false },
    { key: "expenses", label: "Despesas", required: false },
    { key: "procedures", label: "Procedimentos", required: false },
    { key: "professionals", label: "Profissionais", required: false },
    { key: "clinic_settings", label: "Configurações da clínica", required: false },
    { key: "message_templates", label: "Mensagens", required: false },
    { key: "anamnesis_templates", label: "Anamnese", required: false },
    { key: "financial_settings", label: "Configurações financeiras", required: false },
  ];

  const backupRestoreOrder = [
    "clinic_settings",
    "financial_settings",
    "professionals",
    "procedures",
    "patients",
    "message_templates",
    "anamnesis_templates",
    "budgets",
    "budget_items",
    "patient_treatments",
    "treatment_notes",
    "clinical_notes",
    "appointments",
    "financial_records",
    "payment_transactions",
    "patient_files",
    "expenses",
  ];

  const formatBackupDate = (value: string) => {
    if (!value) return "Data não informada";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Data inválida ou não reconhecida";
    }

    return date.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getBackupArray = (backup: any, key: string) => {
    if (Array.isArray(backup?.[key])) return backup[key];

    if (key === "patient_treatments" && Array.isArray(backup?.treatments)) {
      return backup.treatments;
    }

    if (key === "patient_files" && Array.isArray(backup?.images)) {
      return backup.images;
    }

    if (key === "clinic_settings" && Array.isArray(backup?.settings)) {
      return backup.settings;
    }

    return null;
  };

  const buildSystemBackup = async () => {
    const backupResponses = await Promise.all(
      backupTables.map((item) => supabase.from(item.key).select("*"))
    );

    const errors = backupResponses
      .map((response, index) => ({ response, table: backupTables[index] }))
      .filter(({ response, table }) => response.error && table.required);

    if (errors.length > 0) {
      throw new Error(
        "Erro ao gerar backup nas tabelas obrigatórias: " +
          errors.map(({ table }) => table.label).join(", ")
      );
    }

    const backup: Record<string, any> = {
      generated_at: new Date().toISOString(),
      version: "1.2",
      app: "Gestor Odontológico",
      backup_type: "manual",
    };

    backupResponses.forEach((response, index) => {
      backup[backupTables[index].key] = response.data || [];
    });

    return backup;
  };

  const generateSystemBackup = async () => {
    try {
      const backup = await buildSystemBackup();

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json;charset=utf-8",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `backup-consultorio-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      alert("Backup completo gerado com sucesso.");
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Erro ao gerar backup.");
    }
  };

  const loadCloudBackups = async () => {
    setCloudBackupLoading(true);

    const { data, error } = await supabase.storage
      .from("backups")
      .list("manuais", {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error("Erro ao carregar backups online:", error);
      setCloudBackups([]);
      setCloudBackupLoading(false);
      return;
    }

    const files = (data || [])
      .filter((item) => item.name.toLowerCase().endsWith(".json"))
      .map((item) => ({
        name: item.name,
        path: `manuais/${item.name}`,
        size: item.metadata?.size || 0,
        createdAt: item.created_at || item.updated_at || "",
      }));

    setCloudBackups(files);
    setCloudBackupLoading(false);
  };

  const generateCloudBackupNow = async () => {
    try {
      setCloudBackupLoading(true);

      const backup = await buildSystemBackup();
      backup.backup_type = "manual_online";

      const fileName = `backup-consultorio-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;
      const path = `manuais/${fileName}`;

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json;charset=utf-8",
      });

      const { error } = await supabase.storage
        .from("backups")
        .upload(path, blob, {
          contentType: "application/json;charset=utf-8",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      await loadCloudBackups();
      alert("Backup online salvo com sucesso no Supabase Storage.");
    } catch (error: any) {
      console.error("Erro ao salvar backup online:", error);
      alert(
        error?.message ||
          "Erro ao salvar backup online. Confira se o bucket backups existe e se as políticas do Storage estão liberadas para usuário autenticado."
      );
    } finally {
      setCloudBackupLoading(false);
    }
  };

  const generateGoogleDriveBackupNow = async () => {
    try {
      setCloudBackupLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user?.id) {
        alert("Usuário não autenticado. Faça login novamente antes de enviar o backup ao Google Drive.");
        return;
      }

      const backup = await buildSystemBackup();
      backup.backup_type = "manual_google_drive";

      const fileName = `backup-consultorio-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;

      const response = await fetch("/api/google/drive/upload-backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          fileName,
          backup,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        if (result?.reconnectRequired) {
          throw new Error(
            result?.error ||
              "O Google Drive ainda não foi autorizado. Reconecte o Google Agenda em Configurações > Equipe para liberar o Drive."
          );
        }

        throw new Error(
          result?.details ||
            result?.error ||
            "Erro ao enviar backup para o Google Drive."
        );
      }

      alert(
        `Backup salvo com sucesso no Google Drive.\n\nPasta: ${
          result.folderName || "Backups Gestor Odontológico"
        }\nArquivo: ${result.fileName || fileName}`
      );
    } catch (error: any) {
      console.error("Erro ao salvar backup no Google Drive:", error);
      alert(
        error?.message ||
          "Erro ao salvar backup no Google Drive. Verifique se a conta Google está conectada e se o Drive foi autorizado."
      );
    } finally {
      setCloudBackupLoading(false);
    }
  };

  const downloadCloudBackup = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("backups")
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      alert("Não foi possível gerar o link de download do backup.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const deleteCloudBackup = async (path: string) => {
    const ok = window.confirm("Excluir este backup online? Esta ação não altera os dados do sistema, apenas remove o arquivo do Storage.");
    if (!ok) return;

    setCloudBackupLoading(true);

    const { error } = await supabase.storage.from("backups").remove([path]);

    if (error) {
      alert("Erro ao excluir backup online: " + error.message);
      setCloudBackupLoading(false);
      return;
    }

    await loadCloudBackups();
    setCloudBackupLoading(false);
  };

  const verifyBackupFile = async (file: File | null) => {
    setBackupValidation(null);
    setBackupDataToRestore(null);
    setRestoreConfirmation("");
    setRestoreModeAccepted(false);
    setBackupRestoreResults([]);
    setBackupFileName(file?.name || "");

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      setBackupValidation({
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        valid: false,
        version: "Não identificada",
        generatedAt: "",
        generatedAtLabel: "Não identificada",
        totalRecords: 0,
        patientsCount: 0,
        appointmentsCount: 0,
        financialCount: 0,
        requiredPresentCount: 0,
        requiredTotalCount: 0,
        optionalPresentCount: 0,
        optionalTotalCount: 0,
        optionalMissingCount: 0,
        compatibilityPercent: 0,
        tables: [],
        warnings: [],
        errors: ["Selecione um arquivo no formato .json."],
      });
      return;
    }

    setBackupChecking(true);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
        errors.push("O arquivo não possui uma estrutura JSON válida de backup.");
      }

      const version = String(backup?.version || "");
      const generatedAt = String(backup?.generated_at || backup?.generatedAt || "");

      if (!version) {
        errors.push("Versão do backup não encontrada.");
      }

      if (!generatedAt) {
        warnings.push("Data de geração do backup não encontrada.");
      }

      const tables = backupTables.map((table) => {
        const rows = getBackupArray(backup, table.key);
        const present = Array.isArray(rows);

        if (table.required && !present) {
          errors.push(`Tabela obrigatória ausente: ${table.label}.`);
        }


        return {
          key: table.key,
          label: table.label,
          count: present ? rows.length : 0,
          required: table.required,
          present,
        };
      });

      const totalRecords = tables.reduce((sum, table) => sum + table.count, 0);
      const patientsCount = tables.find((item) => item.key === "patients")?.count || 0;
      const appointmentsCount = tables.find((item) => item.key === "appointments")?.count || 0;
      const financialCount = tables.find((item) => item.key === "financial_records")?.count || 0;
      const requiredTables = tables.filter((item) => item.required);
      const optionalTables = tables.filter((item) => !item.required);
      const requiredPresentCount = requiredTables.filter((item) => item.present).length;
      const optionalPresentCount = optionalTables.filter((item) => item.present).length;
      const requiredTotalCount = requiredTables.length;
      const optionalTotalCount = optionalTables.length;
      const optionalMissingCount = Math.max(optionalTotalCount - optionalPresentCount, 0);
      const compatibilityPercent = requiredTotalCount > 0
        ? Math.round((requiredPresentCount / requiredTotalCount) * 100)
        : 0;

      if (totalRecords === 0) {
        errors.push("Nenhum registro foi encontrado dentro do backup.");
      }

      setBackupValidation({
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        valid: errors.length === 0,
        version: version || "Não identificada",
        generatedAt,
        generatedAtLabel: formatBackupDate(generatedAt),
        totalRecords,
        patientsCount,
        appointmentsCount,
        financialCount,
        requiredPresentCount,
        requiredTotalCount,
        optionalPresentCount,
        optionalTotalCount,
        optionalMissingCount,
        compatibilityPercent,
        tables,
        warnings,
        errors,
      });

      if (errors.length === 0) {
        setBackupDataToRestore(backup);
      }
    } catch (error) {
      console.error(error);
      setBackupValidation({
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        valid: false,
        version: "Não identificada",
        generatedAt: "",
        generatedAtLabel: "Não identificada",
        totalRecords: 0,
        patientsCount: 0,
        appointmentsCount: 0,
        financialCount: 0,
        requiredPresentCount: 0,
        requiredTotalCount: 0,
        optionalPresentCount: 0,
        optionalTotalCount: 0,
        optionalMissingCount: 0,
        compatibilityPercent: 0,
        tables: [],
        warnings: [],
        errors: ["Não foi possível ler o arquivo. Verifique se ele é um JSON válido."],
      });
    } finally {
      setBackupChecking(false);
    }
  };

  const restoreVerifiedBackup = async () => {
    if (!backupValidation?.valid || !backupDataToRestore) {
      alert("Antes de restaurar, selecione e verifique um backup válido.");
      return;
    }

    if (!restoreModeAccepted) {
      alert("Marque a confirmação de segurança antes de restaurar.");
      return;
    }

    if (restoreConfirmation.trim().toUpperCase() !== "RESTAURAR") {
      alert("Digite RESTAURAR no campo de confirmação para continuar.");
      return;
    }

    const finalConfirm = window.confirm(
      "Confirma a restauração segura deste backup?\n\n" +
        "Modo atual: importar/atualizar registros do backup.\n" +
        "Este processo NÃO apaga automaticamente registros que já existem no banco.\n\n" +
        "Mesmo assim, esta ação grava informações no banco de produção."
    );

    if (!finalConfirm) return;

    setBackupRestoring(true);
    setBackupRestoreResults([]);

    const results: BackupRestoreResult[] = [];

    try {
      for (const key of backupRestoreOrder) {
        const table = backupTables.find((item) => item.key === key);
        if (!table) continue;

        const rows = getBackupArray(backupDataToRestore, table.key);

        if (!Array.isArray(rows) || rows.length === 0) {
          results.push({
            key: table.key,
            label: table.label,
            count: 0,
            success: true,
            message: "Sem registros para restaurar.",
          });
          setBackupRestoreResults([...results]);
          continue;
        }

        const { error } = await supabase.from(table.key).upsert(rows, {
          onConflict: "id",
          ignoreDuplicates: false,
        });

        if (error) {
          results.push({
            key: table.key,
            label: table.label,
            count: rows.length,
            success: false,
            message: error.message,
          });
          setBackupRestoreResults([...results]);
          throw error;
        }

        results.push({
          key: table.key,
          label: table.label,
          count: rows.length,
          success: true,
          message: "Restaurado com sucesso.",
        });
        setBackupRestoreResults([...results]);
      }

      alert("Restauração concluída com sucesso. Recarregue o sistema para conferir os dados.");
      setRestoreConfirmation("");
      setRestoreModeAccepted(false);

      await Promise.all([
        loadSettings(),
        loadProcedures(),
        loadTeam(),
        loadAnamnesis(),
        loadMessages(),
        loadFinancialSettings(),
      ]);
    } catch (error: any) {
      console.error("Erro ao restaurar backup:", error);
      alert(
        "A restauração foi interrompida. Confira a lista de resultados abaixo.\n\n" +
          (error?.message || "Erro desconhecido ao restaurar backup.")
      );
    } finally {
      setBackupRestoring(false);
    }
  };

  const filteredProcedures = useMemo(() => {
    const term = procedureSearch.trim().toLowerCase();

    if (!term) return procedures;

    return procedures.filter((item) => {
      return (
        String(item.name || "").toLowerCase().includes(term) ||
        String(item.categoria || "").toLowerCase().includes(term)
      );
    });
  }, [procedures, procedureSearch]);

  const filteredTeam = useMemo(() => {
    const term = teamSearch.trim().toLowerCase();

    if (!term) return team;

    return team.filter((item) => {
      return (
        String(item.name || "").toLowerCase().includes(term) ||
        String(item.cro || "").toLowerCase().includes(term) ||
        String(item.specialty || "").toLowerCase().includes(term) ||
        String(item.email || "").toLowerCase().includes(term)
      );
    });
  }, [team, teamSearch]);

  const filteredAnamnesis = useMemo(() => {
    const term = anamnesisSearch.trim().toLowerCase();

    if (!term) return anamnesis;

    return anamnesis.filter((item) => {
      return (
        String(item.question || "").toLowerCase().includes(term) ||
        String(item.type || "").toLowerCase().includes(term)
      );
    });
  }, [anamnesis, anamnesisSearch]);

  const getQuestionTypeLabel = (type?: string | null) => {
    if (type === "yes_no") return "Sim/Não";
    if (type === "multiple") return "Múltipla escolha";
    return "Texto";
  };

  const filteredMessages = useMemo(() => {
    const term = messageSearch.trim().toLowerCase();

    if (!term) return messages;

    return messages.filter((item) => {
      return (
        String(item.type || "").toLowerCase().includes(term) ||
        String(item.title || "").toLowerCase().includes(term) ||
        String(item.content || "").toLowerCase().includes(term)
      );
    });
  }, [messages, messageSearch]);

  const getMessageTypeLabel = (type?: string | null) => {
    if (type === "confirmacao") return "Confirmação";
    if (type === "lembrete") return "Lembrete";
    if (type === "cobranca") return "Cobrança";
    if (type === "retorno") return "Retorno";
    if (type === "aniversario") return "Aniversário";
    return "Outro";
  };

  const formatCurrency = (value: number | null) => {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            Configurações do Consultório
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Dados usados na agenda, comunicações, recibos e procedimentos.
          </p>
        </div>

        {(loadingSettings || procedureLoading || teamLoading || anamnesisLoading || messageLoading || financialLoading) && (
          <div className="rounded-full bg-[#eefafa] px-3 py-1 text-xs font-black text-[#239d9a]">
            Carregando...
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#d9eeee]">
        <button
          type="button"
          onClick={() => setTab("clinica")}
          className={`px-4 py-3 text-sm font-black border-b-2 ${
            tab === "clinica"
              ? "border-[#239d9a] text-[#239d9a]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Clínica
        </button>

        <button
          type="button"
          onClick={() => setTab("procedimentos")}
          className={`px-4 py-3 text-sm font-black border-b-2 ${
            tab === "procedimentos"
              ? "border-[#239d9a] text-[#239d9a]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Procedimentos
        </button>

        <button
          type="button"
          onClick={() => setTab("equipe")}
          className={`px-4 py-3 text-sm font-black border-b-2 ${
            tab === "equipe"
              ? "border-[#239d9a] text-[#239d9a]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Equipe
        </button>

        <button
          type="button"
          onClick={() => setTab("anamnese")}
          className={`px-4 py-3 text-sm font-black border-b-2 ${
            tab === "anamnese"
              ? "border-[#239d9a] text-[#239d9a]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Anamnese
        </button>

        <button
          type="button"
          onClick={() => setTab("comunicacao")}
          className={`px-4 py-3 text-sm font-black border-b-2 ${
            tab === "comunicacao"
              ? "border-[#239d9a] text-[#239d9a]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Comunicação
        </button>

        <button
          type="button"
          onClick={() => setTab("financeiro")}
          className={`px-4 py-3 text-sm font-black border-b-2 ${
            tab === "financeiro"
              ? "border-[#239d9a] text-[#239d9a]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Financeiro/Fiscal
        </button>

        <button
          type="button"
          onClick={() => setTab("backup")}
          className={`px-4 py-3 text-sm font-black border-b-2 ${
            tab === "backup"
              ? "border-[#239d9a] text-[#239d9a]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Backup
        </button>
      </div>

      {tab === "clinica" && (
        <>
          <div className="bg-white border border-[#c2dddd] rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="font-bold text-slate-700">Dados do Consultório</h2>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <input
                placeholder="Nome do consultório"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="xl:col-span-2 border border-[#c2dddd] p-3 rounded-xl"
              />

              <div className="flex gap-2">
                <select
                  value={form.document_type}
                  onChange={(e) => handleChange("document_type", e.target.value)}
                  className="border border-[#c2dddd] p-3 rounded-xl w-28 bg-white"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                </select>

                <input
                  placeholder={form.document_type === "cpf" ? "CPF" : "CNPJ"}
                  value={form.document}
                  onChange={(e) => handleChange("document", e.target.value)}
                  className="border border-[#c2dddd] p-3 rounded-xl flex-1"
                />
              </div>

              <input
                placeholder="Nome para comunicação"
                value={form.display_name}
                onChange={(e) => handleChange("display_name", e.target.value)}
                className="border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="Responsável pelo consultório"
                value={form.owner}
                onChange={(e) => handleChange("owner", e.target.value)}
                className="xl:col-span-2 border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="CRO do responsável técnico"
                value={form.cro}
                onChange={(e) => handleChange("cro", e.target.value)}
                className="border border-[#c2dddd] p-3 rounded-xl"
              />
            </div>
          </div>

          <div className="bg-white border border-[#c2dddd] rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="font-bold text-slate-700">
              Horário de funcionamento
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="number"
                value={form.start_hour}
                onChange={(e) => handleChange("start_hour", e.target.value)}
                className="border border-[#c2dddd] p-3 rounded-xl"
                placeholder="Horário inicial"
              />

              <input
                type="number"
                value={form.end_hour}
                onChange={(e) => handleChange("end_hour", e.target.value)}
                className="border border-[#c2dddd] p-3 rounded-xl"
                placeholder="Horário final"
              />

              <select
                value={form.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
                className="border border-[#c2dddd] p-3 rounded-xl md:col-span-2 bg-white"
              >
                <option value="America/Sao_Paulo">
                  Brasília / São Paulo
                </option>
              </select>

              <input
                type="number"
                value={form.max_patients_day}
                onChange={(e) =>
                  handleChange("max_patients_day", e.target.value)
                }
                className="border border-[#c2dddd] p-3 rounded-xl"
                placeholder="Máx pacientes"
              />
            </div>
          </div>

          <div className="bg-white border border-[#c2dddd] rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="font-bold text-slate-700">
              Informações do consultório
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                placeholder="Email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="Telefone"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="WhatsApp"
                value={form.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                className="border border-[#c2dddd] p-3 rounded-xl"
              />
            </div>
          </div>

          <div className="bg-white border border-[#c2dddd] rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="font-bold text-slate-700">Endereço do consultório</h2>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <input
                placeholder="CEP"
                value={form.zip_code}
                onChange={(e) => handleChange("zip_code", e.target.value)}
                className="md:col-span-2 border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="Rua / Avenida"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="md:col-span-4 border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="Número"
                value={form.number}
                onChange={(e) => handleChange("number", e.target.value)}
                className="md:col-span-1 border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="Bairro"
                value={form.district}
                onChange={(e) => handleChange("district", e.target.value)}
                className="md:col-span-2 border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="Cidade"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="md:col-span-2 border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="UF"
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
                maxLength={2}
                className="md:col-span-1 border border-[#c2dddd] p-3 rounded-xl uppercase"
              />
            </div>

            <p className="text-xs text-slate-400">
              Estes dados ficarão prontos para aparecer automaticamente em recibos, termos e prontuários impressos.
            </p>
          </div>

          <div className="sticky bottom-0 bg-slate-50/90 backdrop-blur-sm border-t border-[#d9eeee] py-4 flex justify-end">
            <button
              onClick={saveClinicSettings}
              disabled={loading}
              className="bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] text-white px-6 py-3 rounded-xl font-bold disabled:opacity-60 shadow-sm"
            >
              {loading ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </>
      )}

      {tab === "procedimentos" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#c2dddd] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-700">
                  Cadastro de procedimentos
                </h2>
                <p className="text-sm text-slate-500">
                  Base usada nos orçamentos e tratamentos.
                </p>
              </div>

              <input
                placeholder="Buscar procedimento"
                value={procedureSearch}
                onChange={(e) => setProcedureSearch(e.target.value)}
                className="border border-[#c2dddd] p-3 rounded-xl lg:w-80"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
              <input
                placeholder="Nome do procedimento"
                value={procedureForm.name}
                onChange={(e) =>
                  setProcedureForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="xl:col-span-2 border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="Categoria"
                value={procedureForm.categoria}
                onChange={(e) =>
                  setProcedureForm((prev) => ({
                    ...prev,
                    categoria: e.target.value,
                  }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                type="number"
                placeholder="Valor"
                value={procedureForm.price}
                onChange={(e) =>
                  setProcedureForm((prev) => ({ ...prev, price: e.target.value }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {procedureForm.id && (
                <button
                  type="button"
                  onClick={resetProcedureForm}
                  className="rounded-xl border border-[#c2dddd] px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar edição
                </button>
              )}

              <button
                type="button"
                onClick={saveProcedure}
                disabled={procedureLoading}
                className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm disabled:opacity-60"
              >
                {procedureForm.id ? "Salvar alteração" : "Adicionar procedimento"}
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#c2dddd] rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[2fr_1fr_1fr_150px] bg-[#f7ffff] border-b border-[#c2dddd] text-xs font-black uppercase tracking-widest text-slate-500">
              <div className="p-3">Procedimento</div>
              <div className="p-3">Categoria</div>
              <div className="p-3">Valor</div>
              <div className="p-3 text-right">Ações</div>
            </div>

            {filteredProcedures.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Nenhum procedimento encontrado.
              </div>
            ) : (
              filteredProcedures.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1fr_1fr_150px] border-b border-slate-100 text-sm last:border-b-0"
                >
                  <div className="p-3 font-black text-slate-700">
                    {item.name}
                  </div>

                  <div className="p-3 text-slate-600">
                    {item.categoria || "-"}
                  </div>

                  <div className="p-3 font-bold text-slate-700">
                    {formatCurrency(item.price)}
                  </div>

                  <div className="p-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => editProcedure(item)}
                      className="rounded-lg bg-[#eefafa] px-3 py-1 text-xs font-black text-[#239d9a] hover:bg-[#dff3f2]"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProcedure(item)}
                      className="rounded-lg bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-100"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "equipe" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#c2dddd] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-700">
                  Cadastro da equipe
                </h2>
                <p className="text-sm text-slate-500">
                  Profissionais que poderão ser vinculados à agenda, prontuário, financeiro e Google Agenda individual.
                </p>
              </div>

              <input
                placeholder="Buscar profissional"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="border border-[#c2dddd] p-3 rounded-xl lg:w-80"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <input
                placeholder="Nome do profissional"
                value={memberForm.name}
                onChange={(e) =>
                  setMemberForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="xl:col-span-2 border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="CRO"
                value={memberForm.cro}
                onChange={(e) =>
                  setMemberForm((prev) => ({ ...prev, cro: e.target.value }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="Especialidade"
                value={memberForm.specialty}
                onChange={(e) =>
                  setMemberForm((prev) => ({
                    ...prev,
                    specialty: e.target.value,
                  }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="Telefone"
                value={memberForm.phone}
                onChange={(e) =>
                  setMemberForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl"
              />

              <input
                placeholder="Email"
                value={memberForm.email}
                onChange={(e) =>
                  setMemberForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={memberForm.active}
                  onChange={(e) =>
                    setMemberForm((prev) => ({
                      ...prev,
                      active: e.target.checked,
                    }))
                  }
                />
                Profissional ativo
              </label>

              <div className="flex gap-2">
                {memberForm.id && (
                  <button
                    type="button"
                    onClick={resetMemberForm}
                    className="rounded-xl border border-[#c2dddd] px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar edição
                  </button>
                )}

                <button
                  type="button"
                  onClick={saveMember}
                  disabled={teamLoading}
                  className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm disabled:opacity-60"
                >
                  {memberForm.id ? "Salvar alteração" : "Adicionar profissional"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4 text-sm text-slate-600">
            <span className="font-black text-[#239d9a]">Google Agenda individual:</span>{" "}
            conecte cada profissional ao próprio calendário. Na próxima etapa, cada consulta poderá ser enviada para o calendário do profissional selecionado.
          </div>

          <div className="bg-white border border-[#c2dddd] rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1.4fr_0.8fr_1fr_1fr_1.3fr_220px] bg-[#f7ffff] border-b border-[#c2dddd] text-xs font-black uppercase tracking-widest text-slate-500">
              <div className="p-3">Profissional</div>
              <div className="p-3">CRO</div>
              <div className="p-3">Especialidade</div>
              <div className="p-3">Contato</div>
              <div className="p-3">Google Agenda</div>
              <div className="p-3 text-right">Ações</div>
            </div>

            {filteredTeam.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Nenhum profissional encontrado.
              </div>
            ) : (
              filteredTeam.map((item) => {
                const isGoogleConnected = item.google_connected === true;

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1.4fr_0.8fr_1fr_1fr_1.3fr_220px] border-b border-slate-100 text-sm last:border-b-0"
                  >
                    <div className="p-3">
                      <div className="font-black text-slate-700">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.active === false ? "Inativo" : "Ativo"}
                      </div>
                    </div>

                    <div className="p-3 text-slate-600">
                      {item.cro || "-"}
                    </div>

                    <div className="p-3 text-slate-600">
                      {item.specialty || "-"}
                    </div>

                    <div className="p-3 text-slate-600">
                      <div>{item.phone || "-"}</div>
                      <div className="text-xs text-slate-400">{item.email || ""}</div>
                    </div>

                    <div className="p-3">
                      <div
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                          isGoogleConnected
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isGoogleConnected ? "Conectado" : "Desconectado"}
                      </div>

                      <div className="mt-2 text-xs text-slate-500 break-all">
                        {item.google_calendar_email || "Nenhum e-mail Google vinculado"}
                      </div>

                      {item.google_calendar_id && (
                        <div className="mt-1 text-[11px] text-slate-400 break-all">
                          Calendário: {item.google_calendar_id}
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex flex-col items-end gap-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => editMember(item)}
                          className="rounded-lg bg-[#eefafa] px-3 py-1 text-xs font-black text-[#239d9a] hover:bg-[#dff3f2]"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteMember(item)}
                          className="rounded-lg bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => connectProfessionalGoogle(item)}
                          className="rounded-lg bg-[#eefafa] px-3 py-1 text-xs font-black text-[#239d9a] hover:bg-[#dff3f2]"
                        >
                          {isGoogleConnected ? "Reconectar Google" : "Conectar Google"}
                        </button>

                        {isGoogleConnected && (
                          <button
                            type="button"
                            onClick={() => removeProfessionalGoogleConnection(item)}
                            className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 hover:bg-amber-100"
                          >
                            Remover Google
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === "anamnese" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#c2dddd] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-700">
                  Modelo de anamnese odontológica
                </h2>
                <p className="text-sm text-slate-500">
                  Perguntas que serão usadas depois no prontuário do paciente.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={seedDefaultAnamnesis}
                  disabled={anamnesisLoading}
                  className="rounded-xl border border-[#c2dddd] bg-[#eefafa] px-4 py-3 text-sm font-black text-[#239d9a] hover:bg-[#dff3f2] disabled:opacity-60"
                >
                  Inserir anamnese completa
                </button>

                <input
                  placeholder="Buscar pergunta"
                  value={anamnesisSearch}
                  onChange={(e) => setAnamnesisSearch(e.target.value)}
                  className="border border-[#c2dddd] p-3 rounded-xl lg:w-80"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[2fr_220px_1fr] gap-3">
              <input
                placeholder="Pergunta da anamnese"
                value={anamnesisForm.question}
                onChange={(e) =>
                  setAnamnesisForm((prev) => ({
                    ...prev,
                    question: e.target.value,
                  }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl"
              />

              <select
                value={anamnesisForm.type}
                onChange={(e) =>
                  setAnamnesisForm((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl bg-white"
              >
                <option value="yes_no">Sim/Não</option>
                <option value="text">Texto</option>
                <option value="multiple">Múltipla escolha</option>
              </select>

              <input
                placeholder="Opções, se múltipla escolha"
                value={anamnesisForm.options}
                onChange={(e) =>
                  setAnamnesisForm((prev) => ({
                    ...prev,
                    options: e.target.value,
                  }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={anamnesisForm.active}
                  onChange={(e) =>
                    setAnamnesisForm((prev) => ({
                      ...prev,
                      active: e.target.checked,
                    }))
                  }
                />
                Pergunta ativa
              </label>

              <div className="flex gap-2">
                {anamnesisForm.id && (
                  <button
                    type="button"
                    onClick={resetAnamnesisForm}
                    className="rounded-xl border border-[#c2dddd] px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar edição
                  </button>
                )}

                <button
                  type="button"
                  onClick={saveAnamnesisQuestion}
                  disabled={anamnesisLoading}
                  className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm disabled:opacity-60"
                >
                  {anamnesisForm.id ? "Salvar alteração" : "Adicionar pergunta"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#c2dddd] rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[2fr_180px_120px_150px] bg-[#f7ffff] border-b border-[#c2dddd] text-xs font-black uppercase tracking-widest text-slate-500">
              <div className="p-3">Pergunta</div>
              <div className="p-3">Tipo</div>
              <div className="p-3">Status</div>
              <div className="p-3 text-right">Ações</div>
            </div>

            {filteredAnamnesis.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Nenhuma pergunta encontrada.
              </div>
            ) : (
              filteredAnamnesis.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_180px_120px_150px] border-b border-slate-100 text-sm last:border-b-0"
                >
                  <div className="p-3">
                    <div className="font-black text-slate-700">
                      {item.question}
                    </div>
                    {item.options && (
                      <div className="mt-1 text-xs text-slate-400">
                        Opções: {item.options}
                      </div>
                    )}
                  </div>

                  <div className="p-3 text-slate-600">
                    {getQuestionTypeLabel(item.type)}
                  </div>

                  <div className="p-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        item.active === false
                          ? "bg-slate-100 text-slate-500"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.active === false ? "Inativa" : "Ativa"}
                    </span>
                  </div>

                  <div className="p-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => editAnamnesisQuestion(item)}
                      className="rounded-lg bg-[#eefafa] px-3 py-1 text-xs font-black text-[#239d9a] hover:bg-[#dff3f2]"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteAnamnesisQuestion(item)}
                      className="rounded-lg bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-100"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "comunicacao" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#c2dddd] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-700">
                  Modelos de comunicação
                </h2>
                <p className="text-sm text-slate-500">
                  Mensagens usadas em WhatsApp, lembretes, cobranças e retornos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={seedDefaultMessages}
                  disabled={messageLoading}
                  className="rounded-xl border border-[#c2dddd] bg-[#eefafa] px-4 py-3 text-sm font-black text-[#239d9a] hover:bg-[#dff3f2] disabled:opacity-60"
                >
                  Inserir mensagens padrão
                </button>

                <input
                  placeholder="Buscar mensagem"
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  className="border border-[#c2dddd] p-3 rounded-xl lg:w-80"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4 text-xs text-slate-600">
              <span className="font-black text-[#239d9a]">Campos disponíveis:</span>{" "}
              {"{{nome}}"}, {"{{data}}"}, {"{{hora}}"}, {"{{valor}}"}, {"{{procedimento}}"}.
              Eles serão preenchidos automaticamente nas próximas integrações.
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-3">
              <select
                value={messageForm.type}
                onChange={(e) =>
                  setMessageForm((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl bg-white"
              >
                <option value="confirmacao">Confirmação</option>
                <option value="lembrete">Lembrete</option>
                <option value="cobranca">Cobrança</option>
                <option value="retorno">Retorno</option>
                <option value="aniversario">Aniversário</option>
                <option value="outro">Outro</option>
              </select>

              <input
                placeholder="Título da mensagem"
                value={messageForm.title}
                onChange={(e) =>
                  setMessageForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="border border-[#c2dddd] p-3 rounded-xl"
              />
            </div>

            <textarea
              placeholder="Conteúdo da mensagem"
              value={messageForm.content}
              onChange={(e) =>
                setMessageForm((prev) => ({
                  ...prev,
                  content: e.target.value,
                }))
              }
              className="min-h-[140px] w-full border border-[#c2dddd] p-3 rounded-xl"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={messageForm.active}
                  onChange={(e) =>
                    setMessageForm((prev) => ({
                      ...prev,
                      active: e.target.checked,
                    }))
                  }
                />
                Mensagem ativa
              </label>

              <div className="flex gap-2">
                {messageForm.id && (
                  <button
                    type="button"
                    onClick={resetMessageForm}
                    className="rounded-xl border border-[#c2dddd] px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar edição
                  </button>
                )}

                <button
                  type="button"
                  onClick={saveMessageTemplate}
                  disabled={messageLoading}
                  className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-2 text-sm font-black text-white shadow-sm disabled:opacity-60"
                >
                  {messageForm.id ? "Salvar alteração" : "Adicionar mensagem"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#c2dddd] rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[160px_1fr_120px_150px] bg-[#f7ffff] border-b border-[#c2dddd] text-xs font-black uppercase tracking-widest text-slate-500">
              <div className="p-3">Tipo</div>
              <div className="p-3">Mensagem</div>
              <div className="p-3">Status</div>
              <div className="p-3 text-right">Ações</div>
            </div>

            {filteredMessages.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Nenhuma mensagem encontrada.
              </div>
            ) : (
              filteredMessages.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[160px_1fr_120px_150px] border-b border-slate-100 text-sm last:border-b-0"
                >
                  <div className="p-3 font-bold text-slate-600">
                    {getMessageTypeLabel(item.type)}
                  </div>

                  <div className="p-3">
                    <div className="font-black text-slate-700">
                      {item.title || "-"}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {item.content || ""}
                    </div>
                  </div>

                  <div className="p-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        item.active === false
                          ? "bg-slate-100 text-slate-500"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.active === false ? "Inativa" : "Ativa"}
                    </span>
                  </div>

                  <div className="p-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => editMessageTemplate(item)}
                      className="rounded-lg bg-[#eefafa] px-3 py-1 text-xs font-black text-[#239d9a] hover:bg-[#dff3f2]"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteMessageTemplate(item)}
                      className="rounded-lg bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-100"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "financeiro" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#c2dddd] rounded-2xl p-5 space-y-4 shadow-sm">
            <div>
              <h2 className="font-bold text-slate-700">
                Configurações financeiro/fiscal
              </h2>
              <p className="text-sm text-slate-500">
                Dados usados em cobranças, recibos, financeiro do paciente e orçamentos.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                  Tipo de recibo padrão
                </label>
                <select
                  value={financialSettings.default_receipt_type}
                  onChange={(e) =>
                    handleFinancialChange("default_receipt_type", e.target.value)
                  }
                  className="w-full border border-[#c2dddd] p-3 rounded-xl bg-white"
                >
                  <option value="simples">Recibo simples</option>
                  <option value="ir">Recibo para declaração de IR</option>
                  <option value="nenhum">Não emitir por padrão</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                  Vencimento padrão
                </label>
                <input
                  type="number"
                  value={financialSettings.default_due_days}
                  onChange={(e) =>
                    handleFinancialChange("default_due_days", e.target.value)
                  }
                  placeholder="Dias após lançamento"
                  className="w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                  Chave Pix do consultório
                </label>
                <input
                  value={financialSettings.pix_key}
                  onChange={(e) => handleFinancialChange("pix_key", e.target.value)}
                  placeholder="CPF, celular, e-mail ou chave aleatória"
                  className="w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                Formas de pagamento aceitas
              </label>
              <input
                value={financialSettings.accepted_payment_methods}
                onChange={(e) =>
                  handleFinancialChange("accepted_payment_methods", e.target.value)
                }
                placeholder="Pix, Dinheiro, Cartão de crédito..."
                className="w-full border border-[#c2dddd] p-3 rounded-xl"
              />
              <p className="mt-1 text-xs text-slate-400">
                Separe as formas de pagamento por vírgula.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                  Multa por atraso (%)
                </label>
                <input
                  type="number"
                  value={financialSettings.late_fee_percent}
                  onChange={(e) =>
                    handleFinancialChange("late_fee_percent", e.target.value)
                  }
                  className="w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                  Juros ao mês (%)
                </label>
                <input
                  type="number"
                  value={financialSettings.interest_percent_month}
                  onChange={(e) =>
                    handleFinancialChange("interest_percent_month", e.target.value)
                  }
                  className="w-full border border-[#c2dddd] p-3 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                Observação padrão do recibo
              </label>
              <textarea
                value={financialSettings.receipt_note}
                onChange={(e) =>
                  handleFinancialChange("receipt_note", e.target.value)
                }
                placeholder="Ex.: Recebemos a importância referente aos serviços odontológicos prestados."
                className="min-h-[120px] w-full border border-[#c2dddd] p-3 rounded-xl"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveFinancialSettings}
                disabled={financialLoading}
                className="rounded-xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-6 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60"
              >
                {financialLoading ? "Salvando..." : "Salvar financeiro/fiscal"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4 text-sm text-slate-600">
            <span className="font-black text-[#239d9a]">Próxima integração:</span>{" "}
            usar estas configurações automaticamente no financeiro do paciente,
            emissão de recibo e mensagem de cobrança por WhatsApp.
          </div>
        </div>
      )}


      {tab === "backup" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#c2dddd] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Backup completo do sistema
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                  Gere uma cópia completa dos principais dados do consultório em arquivo JSON.
                  Esse backup não altera o banco de dados e serve como cópia de segurança local.
                </p>
              </div>

              <button
                type="button"
                onClick={generateSystemBackup}
                className="rounded-2xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-6 py-4 text-sm font-black text-white shadow-sm hover:opacity-90"
              >
                Gerar backup completo
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4">
                <div className="text-sm font-black text-slate-800">
                  Dados incluídos
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Pacientes, agenda, financeiro, pagamentos, orçamentos, tratamentos, imagens/RX e configurações.
                </p>
              </div>

              <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4">
                <div className="text-sm font-black text-slate-800">
                  Formato
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Arquivo .json, ideal para guarda, auditoria e futura restauração.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-black text-amber-800">
                  Recomendação
                </div>
                <p className="mt-1 text-xs text-amber-700">
                  Faça um backup semanal e guarde em local seguro, como HD externo ou nuvem.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#c2dddd] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Backup online
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                  Salve uma cópia do backup no Supabase Storage e, quando desejar, envie também uma cópia externa para o Google Drive.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={loadCloudBackups}
                  disabled={cloudBackupLoading}
                  className="rounded-2xl border border-[#c2dddd] bg-[#f7ffff] px-5 py-3 text-sm font-black text-[#239d9a] hover:bg-[#eefafa] disabled:opacity-60"
                >
                  Atualizar histórico
                </button>

                <button
                  type="button"
                  onClick={generateCloudBackupNow}
                  disabled={cloudBackupLoading}
                  className="rounded-2xl bg-gradient-to-r from-[#1db7b3] to-[#7ccfce] px-5 py-3 text-sm font-black text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                >
                  {cloudBackupLoading ? "Processando..." : "Gerar backup online agora"}
                </button>

                <button
                  type="button"
                  onClick={generateGoogleDriveBackupNow}
                  disabled={cloudBackupLoading}
                  className="rounded-2xl border border-[#c2dddd] bg-white px-5 py-3 text-sm font-black text-[#239d9a] shadow-sm hover:bg-[#eefafa] disabled:opacity-60"
                >
                  {cloudBackupLoading ? "Processando..." : "Enviar ao Google Drive"}
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4 text-xs text-slate-600">
              <span className="font-black text-[#239d9a]">Modo atual:</span>{" "}
              backup manual online. Agora também há envio manual ao Google Drive; a automação por horário será feita na próxima etapa com rota segura e agendamento.
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[#c2dddd] bg-white">
              <div className="grid grid-cols-[1fr_130px_170px_180px] bg-[#f7ffff] border-b border-[#c2dddd] text-xs font-black uppercase tracking-widest text-slate-500">
                <div className="p-3">Arquivo</div>
                <div className="p-3 text-center">Tamanho</div>
                <div className="p-3 text-center">Criado em</div>
                <div className="p-3 text-right">Ações</div>
              </div>

              {cloudBackups.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  {cloudBackupLoading ? "Carregando backups online..." : "Nenhum backup online encontrado ainda."}
                </div>
              ) : (
                cloudBackups.map((item) => (
                  <div
                    key={item.path}
                    className="grid grid-cols-[1fr_130px_170px_180px] border-b border-slate-100 text-sm last:border-b-0"
                  >
                    <div className="p-3">
                      <div className="font-black text-slate-700 break-all">{item.name}</div>
                      <div className="text-xs text-slate-400 break-all">{item.path}</div>
                    </div>

                    <div className="p-3 text-center font-bold text-slate-700">
                      {formatFileSize(item.size)}
                    </div>

                    <div className="p-3 text-center text-slate-600">
                      {formatBackupDate(item.createdAt)}
                    </div>

                    <div className="p-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => downloadCloudBackup(item.path)}
                        className="rounded-lg bg-[#eefafa] px-3 py-1 text-xs font-black text-[#239d9a] hover:bg-[#dff3f2]"
                      >
                        Download
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteCloudBackup(item.path)}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-black text-red-700 hover:bg-red-100"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#c2dddd] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Verificar backup
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                  Selecione um arquivo .json para validar a versão, a estrutura e as tabelas do backup.
                  Esta etapa é apenas uma leitura de segurança e não altera nenhuma informação do banco de dados.
                </p>
              </div>

              <label className="cursor-pointer rounded-2xl border border-[#c2dddd] bg-[#f7ffff] px-6 py-4 text-center text-sm font-black text-[#239d9a] hover:bg-[#eefafa]">
                Selecionar arquivo JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => verifyBackupFile(event.target.files?.[0] || null)}
                />
              </label>
            </div>

            {backupFileName && (
              <div className="mt-4 rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4 text-sm text-slate-600">
                <span className="font-black text-[#239d9a]">Arquivo selecionado:</span>{" "}
                {backupFileName}
              </div>
            )}

            {backupChecking && (
              <div className="mt-4 rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4 text-sm font-black text-[#239d9a]">
                Verificando backup...
              </div>
            )}

            {backupValidation && !backupChecking && (
              <div className="mt-6 space-y-4">
                <div
                  className={`rounded-2xl border p-4 ${
                    backupValidation.valid
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div
                    className={`text-sm font-black ${
                      backupValidation.valid ? "text-emerald-800" : "text-red-800"
                    }`}
                  >
                    {backupValidation.valid
                      ? "Backup válido para a próxima etapa de restauração."
                      : "Backup com problemas. Não restaure este arquivo antes de corrigir."}
                  </div>

                  <p
                    className={`mt-1 text-xs ${
                      backupValidation.valid ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    A verificação foi feita apenas no navegador. Nenhum dado foi enviado ou alterado no banco.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Data do backup
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-800">
                      {backupValidation.generatedAtLabel}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Versão
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-800">
                      {backupValidation.version}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Pacientes
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-800">
                      {backupValidation.patientsCount}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Consultas
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-800">
                      {backupValidation.appointmentsCount}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Financeiro
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-800">
                      {backupValidation.financialCount}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#c2dddd] bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-800">
                        Compatibilidade do backup
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Tabelas obrigatórias: {backupValidation.requiredPresentCount} de {backupValidation.requiredTotalCount} encontradas.
                        {backupValidation.optionalMissingCount > 0
                          ? ` ${backupValidation.optionalMissingCount} tabelas opcionais não vieram neste arquivo, mas isso não impede a restauração segura.`
                          : " Todas as tabelas opcionais previstas também foram encontradas."}
                      </p>
                    </div>

                    <div className="rounded-full bg-[#eefafa] px-4 py-2 text-sm font-black text-[#239d9a]">
                      {backupValidation.compatibilityPercent}% compatível
                    </div>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={backupValidation.valid ? "h-full rounded-full bg-[#239d9a]" : "h-full rounded-full bg-red-500"}
                      style={{ width: `${Math.max(backupValidation.compatibilityPercent, 6)}%` }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-[#d9eeee] bg-[#f7ffff] p-3">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Total</div>
                      <div className="mt-1 text-lg font-black text-slate-800">{backupValidation.totalRecords}</div>
                    </div>
                    <div className="rounded-xl border border-[#d9eeee] bg-[#f7ffff] p-3">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Obrigatórias OK</div>
                      <div className="mt-1 text-lg font-black text-slate-800">{backupValidation.requiredPresentCount}/{backupValidation.requiredTotalCount}</div>
                    </div>
                    <div className="rounded-xl border border-[#d9eeee] bg-[#f7ffff] p-3">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Opcionais presentes</div>
                      <div className="mt-1 text-lg font-black text-slate-800">{backupValidation.optionalPresentCount}/{backupValidation.optionalTotalCount}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#c2dddd] bg-white overflow-hidden">
                  <div className="grid grid-cols-[1fr_120px_120px] bg-[#f7ffff] border-b border-[#c2dddd] text-xs font-black uppercase tracking-widest text-slate-500">
                    <div className="p-3">Tabela</div>
                    <div className="p-3 text-center">Registros</div>
                    <div className="p-3 text-right">Status</div>
                  </div>

                  {backupValidation.tables.map((item) => (
                    <div
                      key={item.key}
                      className="grid grid-cols-[1fr_120px_120px] border-b border-slate-100 text-sm last:border-b-0"
                    >
                      <div className="p-3">
                        <div className="font-black text-slate-700">{item.label}</div>
                        <div className="text-xs text-slate-400">
                          {item.required ? "Obrigatória" : "Opcional"}
                        </div>
                      </div>

                      <div className="p-3 text-center font-black text-slate-700">
                        {item.count}
                      </div>

                      <div className="p-3 text-right">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            item.present
                              ? "bg-emerald-100 text-emerald-700"
                              : item.required
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.present ? "OK" : item.required ? "Ausente" : "Opcional"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {backupValidation.optionalMissingCount > 0 && backupValidation.valid && (
                  <div className="rounded-2xl border border-[#d9eeee] bg-[#f7ffff] p-4 text-sm text-slate-600">
                    <span className="font-black text-[#239d9a]">Observação:</span>{" "}
                    este backup não contém algumas tabelas opcionais. Isso é normal em backups antigos ou quando essas áreas ainda não tinham registros.
                  </div>
                )}

                {(backupValidation.errors.length > 0 || backupValidation.warnings.length > 0) && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {backupValidation.errors.length > 0 && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <div className="text-sm font-black text-red-800">
                          Erros encontrados
                        </div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-700">
                          {backupValidation.errors.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {backupValidation.warnings.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="text-sm font-black text-amber-800">
                          Alertas importantes
                        </div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
                          {backupValidation.warnings.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {backupValidation.valid && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-amber-900">
                        Restaurar backup
                      </h3>
                      <p className="mt-1 text-sm text-amber-800">
                        Esta restauração usa modo seguro: importa/atualiza os registros do backup, mas não apaga automaticamente registros que já existem no banco e não estão no arquivo.
                      </p>
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white/70 p-4 text-sm text-amber-900">
                      <input
                        type="checkbox"
                        checked={restoreModeAccepted}
                        onChange={(event) => setRestoreModeAccepted(event.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        Entendo que esta ação grava dados no banco de produção. Já conferi o resumo acima e quero continuar com a restauração segura.
                      </span>
                    </label>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
                      <input
                        value={restoreConfirmation}
                        onChange={(event) => setRestoreConfirmation(event.target.value)}
                        placeholder="Digite RESTAURAR para liberar o botão"
                        className="rounded-xl border border-amber-200 bg-white p-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-400"
                      />

                      <button
                        type="button"
                        onClick={restoreVerifiedBackup}
                        disabled={
                          backupRestoring ||
                          !restoreModeAccepted ||
                          restoreConfirmation.trim().toUpperCase() !== "RESTAURAR"
                        }
                        className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {backupRestoring ? "Restaurando..." : "Restaurar backup seguro"}
                      </button>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-white/70 p-4 text-xs text-amber-800">
                      <span className="font-black">Importante:</span>{" "}
                      se alguma tabela falhar, o processo será interrompido e mostrará exatamente onde parou. Por segurança, o ideal é gerar um novo backup antes de qualquer restauração.
                    </div>
                  </div>
                )}

                {backupRestoreResults.length > 0 && (
                  <div className="rounded-2xl border border-[#c2dddd] bg-white overflow-hidden">
                    <div className="grid grid-cols-[1fr_120px_160px] bg-[#f7ffff] border-b border-[#c2dddd] text-xs font-black uppercase tracking-widest text-slate-500">
                      <div className="p-3">Restauração</div>
                      <div className="p-3 text-center">Registros</div>
                      <div className="p-3 text-right">Resultado</div>
                    </div>

                    {backupRestoreResults.map((item) => (
                      <div
                        key={item.key}
                        className="grid grid-cols-[1fr_120px_160px] border-b border-slate-100 text-sm last:border-b-0"
                      >
                        <div className="p-3">
                          <div className="font-black text-slate-700">{item.label}</div>
                          <div className="text-xs text-slate-400">{item.message}</div>
                        </div>

                        <div className="p-3 text-center font-black text-slate-700">
                          {item.count}
                        </div>

                        <div className="p-3 text-right">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              item.success
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.success ? "OK" : "Erro"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
