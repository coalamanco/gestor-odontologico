"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Cake,
  CalendarClock,
  CheckCircle2,
  FileText,
  MessageCircle,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Patient = {
  id: string;
  name?: string | null;
  cpf?: string | null;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  birthday?: string | null;
  date_of_birth?: string | null;
  created_at?: string | null;
};

type Appointment = {
  id: string;
  patient_id?: string | null;
  date?: string | null;
  start_time?: string | null;
  status?: string | null;
  title?: string | null;
  type?: string | null;
  created_at?: string | null;
};

type Budget = {
  id: string;
  patient_id?: string | null;
  status?: string | null;
  total?: number | string | null;
  created_at?: string | null;
};

type PatientTreatment = {
  id: string;
  patient_id?: string | null;
  title?: string | null;
  treatment_name?: string | null;
  procedure_name?: string | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

type ClinicalNote = {
  id: string;
  patient_id?: string | null;
  title?: string | null;
  content?: string | null;
  created_at?: string | null;
};

type CampaignType =
  | "revisao"
  | "limpeza"
  | "aniversario"
  | "orcamento"
  | "tratamento"
  | "sem_retorno";

type CampaignRow = {
  patient: Patient;
  reason: string;
  detail: string;
  lastAppointment?: Appointment | null;
  openBudgetTotal?: number;
  stoppedTreatments?: PatientTreatment[];
  lastCrmContact?: ClinicalNote | null;
  daysSinceLastCrmContact?: number | null;
  message: string;
};

function parseMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(",", ".")) || 0;
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateAtNoon(value?: string | null) {
  if (!value) return null;
  const clean = String(value).split("T")[0];
  const date = new Date(`${clean}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function daysBetween(from: Date, to: Date) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateBr(value?: string | null) {
  const date = getDateAtNoon(value);
  if (!date) return "-";
  return date.toLocaleDateString("pt-BR");
}

function normalizeStatus(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function hasPhone(patient: Patient) {
  return normalizePhone(patient.phone).length >= 10;
}

function buildWhatsappHref(phoneValue: string | null | undefined, message: string) {
  const digits = normalizePhone(phoneValue);
  if (!digits) return "#";
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function crmContactLabel(days?: number | null) {
  if (days === null || days === undefined) return "Nunca contatado pelo CRM";
  if (days === 0) return "Último contato hoje";
  if (days === 1) return "Último contato há 1 dia";
  return `Último contato há ${days} dias`;
}

function crmContactBadgeClass(days?: number | null) {
  if (days === null || days === undefined) {
    return "border-rose-100 bg-rose-50 text-rose-700";
  }

  if (days <= 7) {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (days <= 30) {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function patientFirstName(patient?: Patient | null) {
  return String(patient?.name || "Paciente").trim().split(" ")[0] || "Paciente";
}

function getBirthDate(patient: Patient) {
  return patient.birth_date || patient.birthday || patient.date_of_birth || null;
}

function isBirthdayThisMonth(patient: Patient, base = new Date()) {
  const birth = getDateAtNoon(getBirthDate(patient));
  if (!birth) return false;
  return birth.getMonth() === base.getMonth();
}

export default function CrmAutomacoesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [treatments, setTreatments] = useState<PatientTreatment[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCampaign, setActiveCampaign] = useState<CampaignType>("revisao");
  const [search, setSearch] = useState("");
  const [loggingContactId, setLoggingContactId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        { data: patientsData, error: patientsError },
        { data: appointmentsData, error: appointmentsError },
        { data: budgetsData, error: budgetsError },
        { data: treatmentsData, error: treatmentsError },
        { data: clinicalNotesData, error: clinicalNotesError },
      ] = await Promise.all([
        supabase.from("patients").select("*").order("name", { ascending: true }),
        supabase
          .from("appointments")
          .select("*")
          .order("date", { ascending: false })
          .order("start_time", { ascending: false }),
        supabase.from("budgets").select("*").order("created_at", { ascending: false }),
        supabase
          .from("patient_treatments")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("clinical_notes")
          .select("*")
          .ilike("title", "CRM -%")
          .order("created_at", { ascending: false }),
      ]);

      if (patientsError) throw patientsError;
      if (appointmentsError) throw appointmentsError;
      if (budgetsError) throw budgetsError;
      if (treatmentsError) throw treatmentsError;
      if (clinicalNotesError) throw clinicalNotesError;

      setPatients((patientsData || []) as Patient[]);
      setAppointments((appointmentsData || []) as Appointment[]);
      setBudgets((budgetsData || []) as Budget[]);
      setTreatments((treatmentsData || []) as PatientTreatment[]);
      setClinicalNotes((clinicalNotesData || []) as ClinicalNote[]);
    } catch (error: any) {
      alert("Erro ao carregar automações do CRM: " + (error?.message || "erro inesperado"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const patientContext = useMemo(() => {
    const todayKey = toDateKey(new Date());

    return patients.map((patient) => {
      const patientAppointments = appointments
        .filter((appointment) => appointment.patient_id === patient.id)
        .sort((a, b) => {
          const aKey = `${a.date || ""} ${a.start_time || ""}`;
          const bKey = `${b.date || ""} ${b.start_time || ""}`;
          return bKey.localeCompare(aKey);
        });

      const pastAppointments = patientAppointments.filter((appointment) => {
        if (!appointment.date) return false;
        return appointment.date <= todayKey;
      });

      const futureAppointments = patientAppointments.filter((appointment) => {
        if (!appointment.date) return false;
        return appointment.date > todayKey;
      });

      const lastAppointment = pastAppointments[0] || null;
      const nextAppointment = futureAppointments[0] || null;
      const lastDate = getDateAtNoon(lastAppointment?.date || patient.created_at);
      const daysWithoutReturn = lastDate ? daysBetween(lastDate, new Date()) : null;

      const openBudgets = budgets.filter((budget) => {
        const status = normalizeStatus(budget.status);
        return (
          budget.patient_id === patient.id &&
          status !== "aprovado" &&
          status !== "reprovado" &&
          status !== "cancelado"
        );
      });

      const openBudgetTotal = openBudgets.reduce(
        (acc, budget) => acc + parseMoney(budget.total),
        0
      );

      const stoppedTreatments = treatments.filter((treatment) => {
        if (treatment.patient_id !== patient.id) return false;
        const status = normalizeStatus(treatment.status);
        if (status === "finalizado" || status === "concluido" || status === "concluído") return false;
        const created = getDateAtNoon(treatment.created_at);
        if (!created) return false;
        return daysBetween(created, new Date()) >= 30;
      });

      const patientCrmNotes = clinicalNotes
        .filter((note) => note.patient_id === patient.id)
        .sort((a, b) => {
          const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bDate - aDate;
        });

      const lastCrmContact = patientCrmNotes[0] || null;
      const lastCrmDate = getDateAtNoon(lastCrmContact?.created_at);
      const daysSinceLastCrmContact = lastCrmDate
        ? daysBetween(lastCrmDate, new Date())
        : null;

      return {
        patient,
        lastAppointment,
        nextAppointment,
        daysWithoutReturn,
        openBudgets,
        openBudgetTotal,
        stoppedTreatments,
        lastCrmContact,
        daysSinceLastCrmContact,
      };
    });
  }, [patients, appointments, budgets, treatments, clinicalNotes]);

  const campaignRows = useMemo(() => {
    const rows: Record<CampaignType, CampaignRow[]> = {
      revisao: [],
      limpeza: [],
      aniversario: [],
      orcamento: [],
      tratamento: [],
      sem_retorno: [],
    };

    patientContext.forEach((context) => {
      const { patient, lastAppointment, nextAppointment, daysWithoutReturn } = context;
      const firstName = patientFirstName(patient);

      if (!nextAppointment && Number(daysWithoutReturn || 0) >= 180) {
        rows.revisao.push({
          patient,
          lastAppointment,
          reason: "Revisão semestral",
          detail: `${daysWithoutReturn} dias desde o último contato`,
          message:
            `Olá, ${firstName}! Tudo bem?\n\n` +
            `Já faz um tempo desde sua última consulta e gostaríamos de te convidar para uma revisão odontológica preventiva.\n\n` +
            `A revisão ajuda a identificar pequenos problemas antes que eles se tornem tratamentos maiores.\n\n` +
            `Quando puder, nos responda para organizarmos um horário 🙂`,
        });
      }

      if (!nextAppointment && Number(daysWithoutReturn || 0) >= 120) {
        rows.limpeza.push({
          patient,
          lastAppointment,
          reason: "Limpeza / profilaxia",
          detail: `${daysWithoutReturn} dias desde a última consulta`,
          message:
            `Olá, ${firstName}! Tudo bem?\n\n` +
            `Passando para lembrar da importância da limpeza odontológica periódica.\n\n` +
            `Podemos organizar um horário para sua profilaxia e avaliação preventiva.\n\n` +
            `Ficamos à disposição 🙂`,
        });
      }

      if (isBirthdayThisMonth(patient, new Date())) {
        rows.aniversario.push({
          patient,
          lastAppointment,
          reason: "Aniversariante do mês",
          detail: `Aniversário: ${formatDateBr(getBirthDate(patient))}`,
          message:
            `Olá, ${firstName}! Tudo bem?\n\n` +
            `A equipe do consultório deseja um feliz aniversário! 🎉\n` +
            `Que seu novo ciclo seja cheio de saúde, alegria e muitos motivos para sorrir.\n\n` +
            `Um abraço, Dr. Henrique S. Pasquali.`,
        });
      }

      if (context.openBudgets.length > 0) {
        rows.orcamento.push({
          patient,
          lastAppointment,
          reason: "Orçamento pendente",
          detail: `${context.openBudgets.length} orçamento(s) • ${formatCurrency(context.openBudgetTotal)}`,
          openBudgetTotal: context.openBudgetTotal,
          message:
            `Olá, ${firstName}! Tudo bem?\n\n` +
            `Passando para saber se ficou alguma dúvida sobre o orçamento odontológico que conversamos.\n\n` +
            `Podemos te ajudar a organizar o melhor plano de tratamento e forma de pagamento.\n\n` +
            `Ficamos à disposição 🙂`,
        });
      }

      if (context.stoppedTreatments.length > 0) {
        const treatment = context.stoppedTreatments[0];
        const treatmentName =
          treatment.procedure_name ||
          treatment.treatment_name ||
          treatment.title ||
          "tratamento";

        rows.tratamento.push({
          patient,
          lastAppointment,
          stoppedTreatments: context.stoppedTreatments,
          reason: "Tratamento parado",
          detail: `${context.stoppedTreatments.length} tratamento(s) sem finalização`,
          message:
            `Olá, ${firstName}! Tudo bem?\n\n` +
            `Estamos entrando em contato para dar continuidade ao seu tratamento odontológico: ${treatmentName}.\n\n` +
            `Quando puder, nos responda para organizarmos o melhor horário para seu retorno.\n\n` +
            `Ficamos à disposição 🙂`,
        });
      }

      if (!nextAppointment && Number(daysWithoutReturn || 0) >= 90) {
        rows.sem_retorno.push({
          patient,
          lastAppointment,
          reason: "Paciente sem retorno",
          detail: `${daysWithoutReturn} dias sem retorno`,
          message:
            `Olá, ${firstName}! Tudo bem?\n\n` +
            `Sentimos sua falta por aqui e gostaríamos de saber como está sua saúde bucal.\n\n` +
            `Se desejar, podemos organizar um horário de retorno para avaliação e acompanhamento.\n\n` +
            `Ficamos à disposição 🙂`,
        });
      }
    });

    rows.revisao.sort((a, b) => String(a.patient.name || "").localeCompare(String(b.patient.name || ""), "pt-BR"));
    rows.limpeza.sort((a, b) => String(a.patient.name || "").localeCompare(String(b.patient.name || ""), "pt-BR"));
    rows.aniversario.sort((a, b) => {
      const aDate = getDateAtNoon(getBirthDate(a.patient));
      const bDate = getDateAtNoon(getBirthDate(b.patient));
      return Number(aDate?.getDate() || 0) - Number(bDate?.getDate() || 0);
    });
    rows.orcamento.sort((a, b) => Number(b.openBudgetTotal || 0) - Number(a.openBudgetTotal || 0));
    rows.tratamento.sort((a, b) => Number(b.stoppedTreatments?.length || 0) - Number(a.stoppedTreatments?.length || 0));

    return rows;
  }, [patientContext]);

  const campaigns = [
    { id: "revisao" as CampaignType, title: "Revisão semestral", description: "Pacientes sem retorno há 180+ dias", icon: CalendarClock, tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
    { id: "limpeza" as CampaignType, title: "Limpeza periódica", description: "Profilaxia e avaliação preventiva", icon: Sparkles, tone: "border-cyan-100 bg-cyan-50 text-cyan-700" },
    { id: "aniversario" as CampaignType, title: "Aniversariantes", description: "Relacionamento do mês", icon: Cake, tone: "border-pink-100 bg-pink-50 text-pink-700" },
    { id: "orcamento" as CampaignType, title: "Orçamento parado", description: "Recuperação comercial", icon: FileText, tone: "border-amber-100 bg-amber-50 text-amber-700" },
    { id: "tratamento" as CampaignType, title: "Tratamento parado", description: "Reativação clínica", icon: Stethoscope, tone: "border-purple-100 bg-purple-50 text-purple-700" },
    { id: "sem_retorno" as CampaignType, title: "Sem retorno", description: "Paciente afastado da clínica", icon: Users, tone: "border-slate-200 bg-slate-50 text-slate-700" },
  ];

  const selectedRows = useMemo(() => {
    const base = campaignRows[activeCampaign] || [];
    const term = search.trim().toLowerCase();

    if (!term) return base;

    return base.filter((row) => {
      return [row.patient.name, row.patient.phone, row.patient.cpf, row.patient.email, row.reason, row.detail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [campaignRows, activeCampaign, search]);

  const selectedCampaign = campaigns.find((item) => item.id === activeCampaign) || campaigns[0];
  const totalWithPhone = selectedRows.filter((row) => hasPhone(row.patient)).length;
  const totalWithoutPhone = selectedRows.length - totalWithPhone;

  const copyCampaignList = async () => {
    const content = selectedRows
      .map((row, index) => `${index + 1}. ${row.patient.name || "Paciente"} | ${row.patient.phone || "sem telefone"} | ${row.reason} | ${row.detail}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(content || "Nenhum paciente nesta campanha.");
      alert("Lista copiada.");
    } catch {
      alert("Não foi possível copiar automaticamente.");
    }
  };

  const registerCrmContact = async (row: CampaignRow) => {
    if (!row?.patient?.id) return;

    try {
      setLoggingContactId(row.patient.id);

      const now = new Date();

      const content =
        `Contato registrado pelo CRM em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}.\n\n` +
        `Campanha: ${row.reason}\n` +
        `Detalhe: ${row.detail}\n\n` +
        `Mensagem preparada:\n${row.message}`;

      const { error } = await supabase.from("clinical_notes").insert({
        patient_id: row.patient.id,
        title: `CRM - ${row.reason}`,
        content,
      });

      if (error) throw error;

      setClinicalNotes((current) => [
        {
          id: `temp-${Date.now()}`,
          patient_id: row.patient.id,
          title: `CRM - ${row.reason}`,
          content,
          created_at: new Date().toISOString(),
        },
        ...current,
      ]);
    } catch (error: any) {
      alert("Não foi possível registrar o contato no prontuário: " + (error?.message || "erro inesperado"));
    } finally {
      setLoggingContactId(null);
    }
  };

  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-2 pb-28 md:p-6 md:pb-10">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="overflow-hidden rounded-[1.35rem] border border-[#bde4e3] bg-white shadow-sm md:rounded-[2rem]">
          <div className="bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] p-5 text-white md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-50 ring-1 ring-white/20">
                  <Bot size={13} />
                  Automação assistida
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight md:text-4xl">
                  Automações do CRM
                </h1>

                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-cyan-50">
                  O sistema prepara listas inteligentes e mensagens prontas. Você confirma manualmente cada envio pelo WhatsApp.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/crm"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#239d9a] shadow-sm hover:bg-cyan-50"
                >
                  <ArrowLeft size={17} />
                  Voltar ao CRM
                </Link>

                <button
                  type="button"
                  onClick={loadData}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-sm font-black text-white shadow-sm backdrop-blur hover:bg-white/20"
                >
                  <RefreshCw size={17} />
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => {
            const count = campaignRows[campaign.id]?.length || 0;
            const active = activeCampaign === campaign.id;

            return (
              <button
                key={campaign.id}
                type="button"
                onClick={() => setActiveCampaign(campaign.id)}
                className={`rounded-[1.25rem] border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  active ? "border-[#84d5d3] ring-2 ring-[#dff5f4]" : "border-[#d9eeee]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {campaign.title}
                    </div>

                    <div className="mt-2 text-3xl font-black text-slate-800">
                      {count}
                    </div>

                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      {campaign.description}
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-2.5 ${campaign.tone}`}>
                    <campaign.icon size={20} />
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <section className="rounded-[1.25rem] border border-[#d9eeee] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800">
                {selectedCampaign.title}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedRows.length} paciente(s) na lista • {totalWithPhone} com WhatsApp • {totalWithoutPhone} sem telefone
              </p>
            </div>

            <button
              type="button"
              onClick={copyCampaignList}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9eeee] bg-[#fbffff] px-4 py-2 text-xs font-black text-slate-700 hover:bg-white"
            >
              <CheckCircle2 size={15} />
              Copiar lista
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2">
            <Search size={17} className="text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar paciente nesta campanha..."
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-[#d9eeee] bg-white shadow-sm">
          <div className="border-b border-[#e8f5f5] px-4 py-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  Lista de envio assistido
                </h2>

                <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                  Nenhum envio automático é feito sem você clicar
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-[#f7ffff] px-3 py-1.5 text-xs font-bold text-[#239d9a] ring-1 ring-[#d9eeee]">
                <MessageCircle size={14} />
                WhatsApp manual
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#edf7f7]">
            {loading && (
              <div className="p-6 text-center text-sm font-semibold text-slate-500">
                Carregando automações...
              </div>
            )}

            {!loading && selectedRows.length === 0 && (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eefafa] text-[#239d9a]">
                  <CheckCircle2 size={22} />
                </div>

                <h3 className="mt-3 text-base font-black text-slate-800">
                  Nenhum paciente nesta automação
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Esta campanha está em dia no momento.
                </p>
              </div>
            )}

            {!loading &&
              selectedRows.map((row) => {
                const whatsappHref = buildWhatsappHref(row.patient.phone, row.message);
                const canSend = hasPhone(row.patient);

                return (
                  <div
                    key={`${activeCampaign}-${row.patient.id}`}
                    className="grid grid-cols-1 gap-4 p-4 transition hover:bg-[#fbffff] xl:grid-cols-[1fr_1.1fr_auto]"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/pacientes/${row.patient.id}`}
                        className="truncate text-base font-black text-slate-800 hover:text-[#239d9a]"
                      >
                        {row.patient.name || "Paciente"}
                      </Link>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                        <span>Telefone: {row.patient.phone || "-"}</span>
                        {row.patient.cpf && <span>CPF: {row.patient.cpf}</span>}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#e8f5f5] bg-[#fbffff] p-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Motivo da automação
                      </div>

                      <div className="mt-1 font-bold text-slate-700">
                        {row.reason}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {row.detail}
                      </div>

                      <div
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${crmContactBadgeClass(row.daysSinceLastCrmContact)}`}
                      >
                        {crmContactLabel(row.daysSinceLastCrmContact)}
                      </div>

                      {row.lastAppointment && (
                        <div className="mt-2 text-xs text-slate-500">
                          Última consulta: {formatDateBr(row.lastAppointment.date)}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:flex-col xl:items-stretch">
                      <Link
                        href={`/pacientes/${row.patient.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-[#fbffff]"
                      >
                        <Users size={15} />
                        Prontuário
                      </Link>

                      {canSend ? (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => registerCrmContact(row)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1fb36e] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#1c9f63]"
                        >
                          <MessageCircle size={15} />
                          {loggingContactId === row.patient.id
                            ? "Registrando..."
                            : row.daysSinceLastCrmContact !== null && Number(row.daysSinceLastCrmContact) <= 7
                              ? "Enviar novamente"
                              : "Enviar WhatsApp"}
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-xs font-black text-slate-500"
                        >
                          Sem telefone
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </div>
  );
}
