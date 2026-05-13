"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bot,
  Brain,
  CalendarClock,
  Cake,
  CheckCircle2,
  FileText,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  Target,
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
  patient_name?: string | null;
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
  approved_at?: string | null;
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

type CrmPatientRow = {
  patient: Patient;
  lastAppointment?: Appointment | null;
  nextAppointment?: Appointment | null;
  daysWithoutReturn?: number | null;
  openBudgetTotal?: number;
  openBudgetCount?: number;
  stoppedTreatments?: PatientTreatment[];
};

type CrmFilter = "retorno" | "aniversariantes" | "orcamentos" | "tratamentos";

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

  const raw = String(value).trim();
  if (!raw) return null;

  const clean = raw.split("T")[0].trim();

  // Formato brasileiro: DD/MM/YYYY
  // Exemplo: 25/05/1985
  if (clean.includes("/")) {
    const parts = clean.split("/").map((part) => part.trim());

    if (parts.length === 3) {
      const day = Number(parts[0]);
      const month = Number(parts[1]);
      const year = Number(parts[2]);

      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year > 1800) {
        const date = new Date(year, month - 1, day, 12, 0, 0);

        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
    }
  }

  // Formato ISO usado pelo Supabase: YYYY-MM-DD
  // Exemplo: 1985-05-25
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const date = new Date(`${clean}T12:00:00`);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  // Última tentativa para formatos já aceitos pelo JavaScript
  const fallbackDate = new Date(raw);

  if (Number.isNaN(fallbackDate.getTime())) {
    return null;
  }

  fallbackDate.setHours(12, 0, 0, 0);
  return fallbackDate;
}

function daysBetween(from: Date, to: Date) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
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

function buildWhatsappHref(phoneValue: string | null | undefined, message: string) {
  const digits = normalizePhone(phoneValue);
  if (!digits) return "#";
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
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

function isBirthdayToday(patient: Patient, base = new Date()) {
  const birth = getDateAtNoon(getBirthDate(patient));
  if (!birth) return false;
  return birth.getMonth() === base.getMonth() && birth.getDate() === base.getDate();
}

export default function CrmPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [treatments, setTreatments] = useState<PatientTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<CrmFilter>("retorno");
  const [search, setSearch] = useState("");
  const [daysThreshold, setDaysThreshold] = useState(90);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        { data: patientsData, error: patientsError },
        { data: appointmentsData, error: appointmentsError },
        { data: budgetsData, error: budgetsError },
        { data: treatmentsData, error: treatmentsError },
      ] = await Promise.all([
        supabase.from("patients").select("*").order("name", { ascending: true }),
        supabase.from("appointments").select("*").order("date", { ascending: false }).order("start_time", { ascending: false }),
        supabase.from("budgets").select("*").order("created_at", { ascending: false }),
        supabase.from("patient_treatments").select("*").order("created_at", { ascending: false }),
      ]);

      if (patientsError) throw patientsError;
      if (appointmentsError) throw appointmentsError;
      if (budgetsError) throw budgetsError;
      if (treatmentsError) throw treatmentsError;

      setPatients((patientsData || []) as Patient[]);
      setAppointments((appointmentsData || []) as Appointment[]);
      setBudgets((budgetsData || []) as Budget[]);
      setTreatments((treatmentsData || []) as PatientTreatment[]);
    } catch (error: any) {
      alert("Erro ao carregar CRM: " + (error?.message || "erro inesperado"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const patientRows = useMemo(() => {
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

      const futureAppointments = patientAppointments
        .filter((appointment) => {
          if (!appointment.date) return false;
          return appointment.date > todayKey;
        })
        .sort((a, b) => {
          const aKey = `${a.date || ""} ${a.start_time || ""}`;
          const bKey = `${b.date || ""} ${b.start_time || ""}`;
          return aKey.localeCompare(bKey);
        });

      const lastAppointment = pastAppointments[0] || null;
      const nextAppointment = futureAppointments[0] || null;
      const lastDate = getDateAtNoon(lastAppointment?.date || patient.created_at);
      const daysWithoutReturn = lastDate ? daysBetween(lastDate, new Date()) : null;

      const patientOpenBudgets = budgets.filter((budget) => {
        const status = normalizeStatus(budget.status);
        return budget.patient_id === patient.id && status !== "aprovado" && status !== "reprovado" && status !== "cancelado";
      });

      const openBudgetTotal = patientOpenBudgets.reduce((acc, budget) => acc + parseMoney(budget.total), 0);

      const stoppedTreatments = treatments.filter((treatment) => {
        if (treatment.patient_id !== patient.id) return false;
        const status = normalizeStatus(treatment.status);
        if (status === "finalizado" || status === "concluido" || status === "concluído") return false;
        const created = getDateAtNoon(treatment.created_at);
        if (!created) return false;
        return daysBetween(created, new Date()) >= 30;
      });

      return {
        patient,
        lastAppointment,
        nextAppointment,
        daysWithoutReturn,
        openBudgetCount: patientOpenBudgets.length,
        openBudgetTotal,
        stoppedTreatments,
      };
    });
  }, [patients, appointments, budgets, treatments]);

  const returnRows = useMemo(() => {
    return patientRows
      .filter((row) => !row.nextAppointment && Number(row.daysWithoutReturn || 0) >= daysThreshold)
      .sort((a, b) => Number(b.daysWithoutReturn || 0) - Number(a.daysWithoutReturn || 0));
  }, [patientRows, daysThreshold]);

  const birthdayRows = useMemo(() => {
    return patientRows
      .filter((row) => isBirthdayThisMonth(row.patient, new Date()))
      .sort((a, b) => {
        const aBirth = getDateAtNoon(getBirthDate(a.patient));
        const bBirth = getDateAtNoon(getBirthDate(b.patient));
        return Number(aBirth?.getDate() || 0) - Number(bBirth?.getDate() || 0);
      });
  }, [patientRows]);

  const openBudgetRows = useMemo(() => {
    return patientRows
      .filter((row) => Number(row.openBudgetCount || 0) > 0)
      .sort((a, b) => Number(b.openBudgetTotal || 0) - Number(a.openBudgetTotal || 0));
  }, [patientRows]);

  const stoppedTreatmentRows = useMemo(() => {
    return patientRows
      .filter((row) => Number(row.stoppedTreatments?.length || 0) > 0)
      .sort((a, b) => Number(b.stoppedTreatments?.length || 0) - Number(a.stoppedTreatments?.length || 0));
  }, [patientRows]);

  const visibleRows = useMemo(() => {
    let base: CrmPatientRow[] = [];

    if (activeFilter === "retorno") base = returnRows;
    if (activeFilter === "aniversariantes") base = birthdayRows;
    if (activeFilter === "orcamentos") base = openBudgetRows;
    if (activeFilter === "tratamentos") base = stoppedTreatmentRows;

    const term = search.trim().toLowerCase();
    if (!term) return base;

    return base.filter((row) => {
      return [row.patient.name, row.patient.phone, row.patient.email, row.patient.cpf]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [activeFilter, returnRows, birthdayRows, openBudgetRows, stoppedTreatmentRows, search]);

  const stats = [
    { title: "Sem retorno", value: returnRows.length, description: `${daysThreshold}+ dias sem nova consulta`, icon: CalendarClock, filter: "retorno" as CrmFilter, tone: "text-amber-700 bg-amber-50 border-amber-100" },
    { title: "Aniversariantes", value: birthdayRows.length, description: "Pacientes do mês", icon: Cake, filter: "aniversariantes" as CrmFilter, tone: "text-pink-700 bg-pink-50 border-pink-100" },
    { title: "Orçamentos pendentes", value: openBudgetRows.length, description: formatCurrency(openBudgetRows.reduce((acc, row) => acc + Number(row.openBudgetTotal || 0), 0)), icon: FileText, filter: "orcamentos" as CrmFilter, tone: "text-cyan-700 bg-cyan-50 border-cyan-100" },
    { title: "Tratamentos parados", value: stoppedTreatmentRows.length, description: "Há mais de 30 dias", icon: Stethoscope, filter: "tratamentos" as CrmFilter, tone: "text-purple-700 bg-purple-50 border-purple-100" },
  ];

  const buildMessage = (row: CrmPatientRow) => {
    const firstName = patientFirstName(row.patient);

    if (activeFilter === "aniversariantes") {
      return `Olá, ${firstName}! Tudo bem?\n\nA equipe do consultório deseja um feliz aniversário! 🎉\nQue seu novo ciclo seja cheio de saúde, alegria e muitos motivos para sorrir.\n\nUm abraço, Dr. Henrique S. Pasquali.`;
    }

    if (activeFilter === "orcamentos") {
      return `Olá, ${firstName}! Tudo bem?\n\nPassando para saber se ficou alguma dúvida sobre o orçamento odontológico que conversamos.\n\nPodemos te ajudar a organizar o melhor plano de tratamento e forma de pagamento.\n\nFicamos à disposição 🙂`;
    }

    if (activeFilter === "tratamentos") {
      const treatment = row.stoppedTreatments?.[0];
      const treatmentName = treatment?.procedure_name || treatment?.treatment_name || treatment?.title || "tratamento";
      return `Olá, ${firstName}! Tudo bem?\n\nEstamos entrando em contato para dar continuidade ao seu tratamento odontológico: ${treatmentName}.\n\nQuando puder, nos responda para organizarmos o melhor horário para seu retorno.\n\nFicamos à disposição 🙂`;
    }

    return `Olá, ${firstName}! Tudo bem?\n\nSentimos sua falta por aqui e gostaríamos de saber como está sua saúde bucal.\n\nSe desejar, podemos organizar um horário de retorno para avaliação e acompanhamento.\n\nFicamos à disposição 🙂`;
  };

  const activeTitle = {
    retorno: "Pacientes sem retorno",
    aniversariantes: "Aniversariantes do mês",
    orcamentos: "Orçamentos pendentes",
    tratamentos: "Tratamentos parados",
  }[activeFilter];

  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-2 pb-28 md:p-6 md:pb-10">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="overflow-hidden rounded-[1.35rem] border border-[#bde4e3] bg-white shadow-sm md:rounded-[2rem]">
          <div className="bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] px-6 py-3 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-50 ring-1 ring-white/20">
                  <Sparkles size={13} />
                  CRM inteligente
                </div>
                <h1 className="mt-3 text-xl md:text-2xl font-black tracking-tight">
                  Relacionamento e Marketing
                </h1>
                <p className="mt-2 max-w-3xl text-xs opacity-90 font-medium leading-5 text-cyan-50">
                  Acompanhe pacientes sem retorno, aniversariantes, orçamentos pendentes e tratamentos parados com mensagens prontas para WhatsApp.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/crm/automacoes"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-[#239d9a] shadow-sm hover:bg-cyan-50"
                >
                  <Bot size={17} />
                  Automações
                </Link>

                <button
                  type="button"
                  onClick={loadData}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-2 text-xs font-black text-white shadow-sm backdrop-blur hover:bg-white/20"
                >
                  <RefreshCw size={17} />
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Link
            href="/crm/campanhas"
            className="group overflow-hidden rounded-[1.25rem] border border-[#bde4e3] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#eefafa] p-3 text-[#239d9a] transition group-hover:bg-[#239d9a] group-hover:text-white">
                <MessageCircle size={21} />
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Execução comercial
                </div>

                <h2 className="mt-1 text-base font-black text-slate-800">
                  Campanhas
                </h2>

                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Acesse campanhas por perfil, listas de pacientes, funil e mensagens prontas.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/crm/ia"
            className="group overflow-hidden rounded-[1.25rem] border border-[#bde4e3] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#f0f9ff] p-3 text-cyan-700 transition group-hover:bg-cyan-600 group-hover:text-white">
                <Brain size={21} />
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Inteligência estratégica
                </div>

                <h2 className="mt-1 text-base font-black text-slate-800">
                  IA Estratégica
                </h2>

                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Veja recomendações, pacientes estratégicos e ideias de conteúdo para marketing.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/crm/automacoes"
            className="group overflow-hidden rounded-[1.25rem] border border-[#bde4e3] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                <Target size={21} />
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Rotinas inteligentes
                </div>

                <h2 className="mt-1 text-base font-black text-slate-800">
                  Automações
                </h2>

                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Configure ações automáticas de relacionamento, retorno e campanhas.
                </p>
              </div>
            </div>
          </Link>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setActiveFilter(item.filter)}
              className={`rounded-[1.25rem] border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                activeFilter === item.filter ? "border-[#84d5d3] ring-2 ring-[#dff5f4]" : "border-[#d9eeee]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.title}</div>
                  <div className="mt-2 text-3xl font-black text-slate-800">{item.value}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{item.description}</div>
                </div>
                <div className={`rounded-2xl border p-2.5 ${item.tone}`}>
                  <item.icon size={20} />
                </div>
              </div>
            </button>
          ))}
        </section>

        <section className="rounded-[1.25rem] border border-[#d9eeee] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#eefafa] p-2.5 text-[#239d9a]">
                <Megaphone size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">Painel de ação</h2>
                <p className="mt-1 text-sm text-slate-500">Use esta tela para campanhas manuais rápidas. Para listas automáticas, clique em Automações.</p>
              </div>
            </div>

            {activeFilter === "retorno" && (
              <div className="flex flex-wrap items-center gap-2">
                {[30, 60, 90, 180].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDaysThreshold(days)}
                    className={`rounded-xl px-3 py-2 text-xs font-black ${
                      daysThreshold === days ? "bg-[#239d9a] text-white" : "border border-[#d9eeee] bg-[#fbffff] text-slate-600"
                    }`}
                  >
                    {days}+ dias
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar paciente, telefone, CPF ou e-mail..."
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-[#d9eeee] bg-white shadow-sm">
          <div className="border-b border-[#e8f5f5] px-4 py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">{activeTitle}</h2>
                <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">{visibleRows.length} paciente(s) encontrado(s)</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f7ffff] px-3 py-1.5 text-xs font-bold text-[#239d9a] ring-1 ring-[#d9eeee]">
                <CheckCircle2 size={14} />
                Mensagens prontas
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#edf7f7]">
            {loading && <div className="p-6 text-center text-sm font-semibold text-slate-500">Carregando CRM...</div>}

            {!loading && visibleRows.length === 0 && (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eefafa] text-[#239d9a]">
                  <CheckCircle2 size={22} />
                </div>
                <h3 className="mt-3 text-base font-black text-slate-800">Nenhum paciente nesta lista</h3>
                <p className="mt-1 text-sm text-slate-500">Tudo certo para este filtro no momento.</p>
              </div>
            )}

            {!loading &&
              visibleRows.map((row) => {
                const patient = row.patient;
                const hasPhone = Boolean(normalizePhone(patient.phone));
                const message = buildMessage(row);
                const whatsappHref = buildWhatsappHref(patient.phone, message);

                return (
                  <div key={patient.id} className="grid grid-cols-1 gap-4 p-4 transition hover:bg-[#fbffff] xl:grid-cols-[1fr_1.1fr_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/pacientes/${patient.id}`} className="truncate text-base font-black text-slate-800 hover:text-[#239d9a]">
                          {patient.name || "Paciente"}
                        </Link>
                        {activeFilter === "aniversariantes" && isBirthdayToday(patient, new Date()) && (
                          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-pink-700">Hoje</span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                        <span>Telefone: {patient.phone || "-"}</span>
                        {patient.cpf && <span>CPF: {patient.cpf}</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#e8f5f5] bg-[#fbffff] p-3">
                        <div className="font-black uppercase tracking-widest text-slate-400">Última consulta</div>
                        <div className="mt-1 font-bold text-slate-700">
                          {row.lastAppointment ? `${formatDateBr(row.lastAppointment.date)} • ${row.lastAppointment.status || "agendado"}` : "Sem consulta registrada"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#e8f5f5] bg-[#fbffff] p-3">
                        <div className="font-black uppercase tracking-widest text-slate-400">Motivo do contato</div>
                        <div className="mt-1 font-bold text-slate-700">
                          {activeFilter === "retorno" && `${row.daysWithoutReturn || 0} dias sem retorno`}
                          {activeFilter === "aniversariantes" && `Aniversário: ${formatDateBr(getBirthDate(patient))}`}
                          {activeFilter === "orcamentos" && `${row.openBudgetCount || 0} orçamento(s) • ${formatCurrency(row.openBudgetTotal || 0)}`}
                          {activeFilter === "tratamentos" && `${row.stoppedTreatments?.length || 0} tratamento(s) parado(s)`}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:flex-col xl:items-stretch">
                      <Link href={`/pacientes/${patient.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9eeee] bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-[#fbffff]">
                        <Users size={15} />
                        Prontuário
                      </Link>

                      {hasPhone ? (
                        <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1fb36e] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#1c9f63]">
                          <MessageCircle size={15} />
                          WhatsApp
                        </a>
                      ) : (
                        <button type="button" disabled className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-xs font-black text-slate-500">
                          <AlertCircle size={15} />
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
