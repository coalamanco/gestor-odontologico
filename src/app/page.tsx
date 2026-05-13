"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  AlertCircle,
  BarChart3,
  CalendarCheck,
  Clock,
  DollarSign,
  LineChart as LineChartIcon,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { supabaseNoSchemaCache } from "@/lib/supabase";
import { getUserRole } from "@/lib/getUserRole";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import DashboardCards from "@/components/dashboard/DashboardCards";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type FinancialRecord = {
  id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  due_date?: string | null;
  installment_number?: number | null;
  installments?: number | null;
  payment_method?: string | null;
  receipt_type?: string | null;
  description?: string | null;
  procedure_name?: string | null;
  treatment_name?: string | null;
  category?: string | null;
  type?: string | null;
};

type Appointment = {
  id: string;
  patient_id?: string | null;
  patient_name?: string | null;
  title?: string | null;
  date?: string | null;
  start_time?: string | null;
  duration?: number | string | null;
  status?: string | null;
  type?: string | null;
};

type Patient = {
  id: string;
  name?: string | null;
  created_at?: string | null;
};

type Expense = {
  id: string;
  description?: string | null;
  category?: string | null;
  amount?: number | string | null;
  payment_date?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type DashboardPeriod = "hoje" | "semana" | "mes";

type DashboardStats = {
  recebidoHoje: number;
  recebidoMes: number;
  despesasMes: number;
  lucroMes: number;
  aReceber: number;
  vencidoEmAberto: number;
  parcelasVencidas: number;
  saldoPrevisto: number;
  pacientes: number;
  novosPacientesMes: number;
  consultasHoje: number;
  confirmadosHoje: number;
  faltasMes: number;
  ocupacaoHoje: number;
  taxaConfirmacao: number;
  taxaFaltas: number;
  ticketMedio: number;
};

const weekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function parseMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(",", ".")) || 0;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercentChange(value: number) {
  if (!Number.isFinite(value)) return "0%";
  const signal = value > 0 ? "+" : "";
  return `${signal}${Math.round(value)}%`;
}

function calculatePercentChange(current: number, previous: number) {
  if (!previous && current > 0) return 100;
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}


function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(dateString?: string | null, base = new Date()) {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === base.getFullYear() &&
    date.getMonth() === base.getMonth()
  );
}

function isSameDay(dateString?: string | null, base = new Date()) {
  if (!dateString) return false;
  return dateString.slice(0, 10) === toDateKey(base);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
}

function endOfMonth(date: Date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function getPeriodRange(period: DashboardPeriod, base = new Date()) {
  if (period === "hoje") {
    return { start: startOfDay(base), end: endOfDay(base) };
  }

  if (period === "semana") {
    return { start: startOfWeek(base), end: endOfWeek(base) };
  }

  return { start: startOfMonth(base), end: endOfMonth(base) };
}

function getPreviousPeriodRange(period: DashboardPeriod, base = new Date()) {
  if (period === "hoje") {
    const previous = new Date(base);
    previous.setDate(base.getDate() - 1);
    return { start: startOfDay(previous), end: endOfDay(previous) };
  }

  if (period === "semana") {
    const previous = new Date(base);
    previous.setDate(base.getDate() - 7);
    return { start: startOfWeek(previous), end: endOfWeek(previous) };
  }

  const previous = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  return { start: startOfMonth(previous), end: endOfMonth(previous) };
}

function isWithinRange(dateString: string | null | undefined, range: { start: Date; end: Date }) {
  if (!dateString) return false;
  const date = getDateAtStart(dateString);
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

function getPeriodLabel(period: DashboardPeriod) {
  if (period === "hoje") return "hoje";
  if (period === "semana") return "na semana";
  return "no mês";
}

function getPeriodDescription(period: DashboardPeriod) {
  if (period === "hoje") return "do dia";
  if (period === "semana") return "da semana atual";
  return "do mês atual";
}

function normalizeStatus(status?: string | null) {
  return String(status || "agendado").trim().toLowerCase();
}

function paymentMethodLabel(value?: string | null) {
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
      return "Sem método";
  }
}

function isExpensePaid(expense: Expense) {
  return String(expense.status || "").trim().toLowerCase() === "pago";
}

function getExpenseDate(expense: Expense) {
  return expense.payment_date || expense.created_at || null;
}

function getFinancialDueDate(record: FinancialRecord) {
  if (record.due_date) return record.due_date;

  if (!record.created_at) return null;

  const baseDate = getDateAtStart(record.created_at);
  if (!baseDate) return record.created_at;

  const installmentNumber = Math.max(1, Number(record.installment_number || 1));
  baseDate.setMonth(baseDate.getMonth() + installmentNumber - 1);

  return baseDate.toISOString().slice(0, 10);
}

function getDateAtStart(dateString?: string | null) {
  if (!dateString) return null;

  const date = new Date(
    String(dateString).includes("T") ? dateString : `${dateString}T12:00:00`
  );

  if (Number.isNaN(date.getTime())) return null;

  date.setHours(0, 0, 0, 0);
  return date;
}

function isPaidFinancialStatus(status?: string | null) {
  const normalized = normalizeStatus(status);

  return (
    normalized === "pago" ||
    normalized === "paga" ||
    normalized === "paid" ||
    normalized === "recebido" ||
    normalized === "quitado" ||
    normalized === "quitada"
  );
}

function isFinancialOverdue(record: FinancialRecord) {
  const amount = parseMoney(record.amount);
  const paid = parseMoney(record.paid_amount);
  const remaining = Math.max(0, amount - paid);

  if (remaining <= 0 || isPaidFinancialStatus(record.status)) return false;

  const dueDate = getDateAtStart(getFinancialDueDate(record));
  if (!dueDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}


function normalizeLabel(value?: string | null) {
  const label = String(value || "").trim();
  return label || "Não informado";
}

function statusLabel(value?: string | null) {
  const status = normalizeStatus(value);

  switch (status) {
    case "confirmado":
      return "Confirmado";
    case "em atendimento":
    case "em_atendimento":
      return "Em atendimento";
    case "finalizado":
      return "Finalizado";
    case "faltou":
      return "Faltou";
    case "cancelado":
    case "cancelada":
      return "Cancelado";
    default:
      return "Agendado";
  }
}

const statusColors: Record<string, string> = {
  Agendado: "#239d9a",
  Confirmado: "#2563eb",
  "Em atendimento": "#7c3aed",
  Finalizado: "#059669",
  Faltou: "#dc2626",
  Cancelado: "#64748b",
};

function CheckCircleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function Dashboard() {
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<DashboardPeriod>("mes");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const currentRole = await getUserRole();
        setRole(currentRole || "admin");

        const [
          { data: financial },
          { data: expensesData },
          { data: appointmentsData },
          { data: patientsData },
        ] = await Promise.all([
            supabaseNoSchemaCache
              .from("financial_records")
              .select("*")
              .order("created_at", { ascending: false }),
            supabaseNoSchemaCache
              .from("expenses")
              .select("*")
              .order("created_at", { ascending: false }),
            supabaseNoSchemaCache
              .from("appointments")
              .select("*")
              .order("date", { ascending: true })
              .order("start_time", { ascending: true }),
            supabaseNoSchemaCache
              .from("patients")
              .select("*")
              .order("created_at", { ascending: false }),
          ]);

        setFinancialRecords((financial || []) as FinancialRecord[]);
        setExpenses((expensesData || []) as Expense[]);
        setAppointments((appointmentsData || []) as Appointment[]);
        setPatients((patientsData || []) as Patient[]);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const today = useMemo(() => new Date(), []);

  const periodRange = useMemo(() => getPeriodRange(period, today), [period, today]);
  const previousPeriodRange = useMemo(
    () => getPreviousPeriodRange(period, today),
    [period, today]
  );

  const periodLabel = getPeriodLabel(period);
  const periodDescription = getPeriodDescription(period);

  const financialRecordsInPeriod = useMemo(() => {
    return financialRecords.filter((record) =>
      isWithinRange(record.paid_at || record.created_at, periodRange)
    );
  }, [financialRecords, periodRange]);

  const openFinancialRecordsDueInPeriod = useMemo(() => {
    return financialRecords.filter((record) => {
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      const remaining = Math.max(0, amount - paid);
      if (remaining <= 0 || isPaidFinancialStatus(record.status)) return false;
      return isWithinRange(getFinancialDueDate(record), periodRange);
    });
  }, [financialRecords, periodRange]);

  const expensesInPeriod = useMemo(() => {
    return expenses.filter((expense) => isWithinRange(getExpenseDate(expense), periodRange));
  }, [expenses, periodRange]);

  const appointmentsInPeriod = useMemo(() => {
    return appointments.filter((appointment) => isWithinRange(appointment.date, periodRange));
  }, [appointments, periodRange]);

  const patientsInPeriod = useMemo(() => {
    return patients.filter((patient) => isWithinRange(patient.created_at, periodRange));
  }, [patients, periodRange]);

  const stats: DashboardStats = useMemo(() => {
    const todayKey = toDateKey(new Date());

    const recebidoPeriodo = financialRecordsInPeriod.reduce((acc, record) => {
      const paid = parseMoney(record.paid_amount);
      return paid > 0 ? acc + paid : acc;
    }, 0);

    const despesasPeriodo = expensesInPeriod.reduce((acc, expense) => {
      if (!isExpensePaid(expense)) return acc;
      return acc + parseMoney(expense.amount);
    }, 0);

    const lucroPeriodo = recebidoPeriodo - despesasPeriodo;

    const aReceber = openFinancialRecordsDueInPeriod.reduce((acc, record) => {
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      return acc + Math.max(0, amount - paid);
    }, 0);

    const overdueFinancialRecords = financialRecords.filter((record) =>
      isFinancialOverdue(record)
    );

    const vencidoEmAberto = overdueFinancialRecords.reduce((acc, record) => {
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      return acc + Math.max(0, amount - paid);
    }, 0);

    const consultasHojeList = appointments.filter(
      (appointment) => appointment.date === todayKey
    );

    const confirmadosHoje = consultasHojeList.filter(
      (appointment) => normalizeStatus(appointment.status) === "confirmado"
    ).length;

    const consultasPeriodoList = appointmentsInPeriod;

    const faltasPeriodo = consultasPeriodoList.filter(
      (appointment) => normalizeStatus(appointment.status) === "faltou"
    ).length;

    const novosPacientesPeriodo = patientsInPeriod.length;

    const totalSlotsDia = 11 * 4;
    const usedSlots = consultasHojeList.reduce((acc, appointment) => {
      return acc + Math.max(1, Math.round(Number(appointment.duration || 30) / 15));
    }, 0);

    const confirmedPeriod = consultasPeriodoList.filter(
      (appointment) => normalizeStatus(appointment.status) === "confirmado"
    ).length;

    const taxaConfirmacao =
      consultasPeriodoList.length > 0
        ? Math.round((confirmedPeriod / consultasPeriodoList.length) * 100)
        : 0;

    const taxaFaltas =
      consultasPeriodoList.length > 0
        ? Math.round((faltasPeriodo / consultasPeriodoList.length) * 100)
        : 0;

    const pacientesComPagamentoNoPeriodo = new Set(
      financialRecordsInPeriod
        .filter((record) => {
          const paid = parseMoney(record.paid_amount);
          return paid > 0 && record.patient_id;
        })
        .map((record) => String(record.patient_id))
    );

    const ticketMedio =
      pacientesComPagamentoNoPeriodo.size > 0
        ? recebidoPeriodo / pacientesComPagamentoNoPeriodo.size
        : 0;

    return {
      recebidoHoje: recebidoPeriodo,
      recebidoMes: recebidoPeriodo,
      despesasMes: despesasPeriodo,
      lucroMes: lucroPeriodo,
      aReceber,
      vencidoEmAberto,
      parcelasVencidas: overdueFinancialRecords.length,
      saldoPrevisto: recebidoPeriodo + aReceber - despesasPeriodo,
      pacientes: patients.length,
      novosPacientesMes: novosPacientesPeriodo,
      consultasHoje: period === "hoje" ? consultasHojeList.length : consultasPeriodoList.length,
      confirmadosHoje: period === "hoje" ? confirmadosHoje : confirmedPeriod,
      faltasMes: faltasPeriodo,
      ocupacaoHoje: Math.min(100, Math.round((usedSlots / totalSlotsDia) * 100)),
      taxaConfirmacao,
      taxaFaltas,
      ticketMedio,
    };
  }, [
    financialRecords,
    financialRecordsInPeriod,
    expensesInPeriod,
    appointments,
    appointmentsInPeriod,
    patients,
    patientsInPeriod,
    openFinancialRecordsDueInPeriod,
    period,
  ]);

  const weeklyRevenue = useMemo(() => {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + index);
      const key = toDateKey(date);

      const amount = financialRecords.reduce((acc, record) => {
        const paid = parseMoney(record.paid_amount);
        const paidAt = record.paid_at || record.created_at;
        if (paid > 0 && paidAt?.slice(0, 10) === key) return acc + paid;
        return acc;
      }, 0);

      return {
        name: weekLabels[index],
        amount,
      };
    });
  }, [financialRecords]);

  const monthlyRevenue = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 6 }).map((_, reverseIndex) => {
      const index = 5 - reverseIndex;
      const date = new Date(base.getFullYear(), base.getMonth() - index, 1);
      const month = date.toLocaleDateString("pt-BR", { month: "short" });

      const amount = financialRecords.reduce((acc, record) => {
        const paid = parseMoney(record.paid_amount);
        const paidAt = record.paid_at || record.created_at;
        if (!paidAt) return acc;

        const paidDate = new Date(paidAt);
        if (
          paid > 0 &&
          paidDate.getFullYear() === date.getFullYear() &&
          paidDate.getMonth() === date.getMonth()
        ) {
          return acc + paid;
        }

        return acc;
      }, 0);

      return {
        name: month.replace(".", ""),
        amount,
      };
    });
  }, [financialRecords]);

  const paymentMethods = useMemo(() => {
    const grouped: Record<string, number> = {};

    financialRecordsInPeriod.forEach((record) => {
      const paid = parseMoney(record.paid_amount);
      if (paid <= 0) return;

      const label = paymentMethodLabel(record.payment_method);
      grouped[label] = (grouped[label] || 0) + paid;
    });

    return Object.entries(grouped)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [financialRecordsInPeriod]);

  const todayAppointments = useMemo(() => {
    const todayKey = toDateKey(new Date());

    return appointments
      .filter((appointment) => appointment.date === todayKey)
      .sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")))
      .slice(0, 7);
  }, [appointments]);

  const debtors = useMemo(() => {
    const patientNameById = new Map(
      patients.map((patient) => [patient.id, patient.name || "Paciente"])
    );

    const grouped: Record<string, number> = {};

    financialRecords.forEach((record) => {
      if (!record.patient_id) return;
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      const remaining = Math.max(0, amount - paid);

      if (remaining <= 0) return;

      grouped[record.patient_id] = (grouped[record.patient_id] || 0) + remaining;
    });

    return Object.entries(grouped)
      .map(([patientId, amount]) => ({
        patientId,
        name: patientNameById.get(patientId) || "Paciente",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [financialRecords, patients]);

  const intelligentInsights = useMemo(() => {
    const now = new Date();

    const overdueRecords = financialRecords.filter((record) =>
      isFinancialOverdue(record)
    );

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowKey = toDateKey(tomorrow);

    const tomorrowAppointments = appointments.filter(
      (appointment) => appointment.date === tomorrowKey
    );

    const tomorrowNotConfirmed = tomorrowAppointments.filter((appointment) => {
      const status = String(appointment.status || "agendado").toLowerCase();
      return status !== "confirmado" && status !== "finalizado";
    });

    const noShowsThisMonth = appointments.filter(
      (appointment) =>
        isSameMonth(appointment.date, now) &&
        normalizeStatus(appointment.status) === "faltou"
    );

    const todayKey = toDateKey(now);
    const todayAppointmentsList = appointments.filter(
      (appointment) => appointment.date === todayKey
    );

    const todayPending = todayAppointmentsList.filter((appointment) => {
      const status = String(appointment.status || "agendado").toLowerCase();
      return status === "agendado";
    });

    const emptyAgendaToday = todayAppointmentsList.length === 0;

    const totalOverdue = overdueRecords.reduce((acc, record) => {
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      return acc + Math.max(0, amount - paid);
    }, 0);

    return [
      {
        id: "overdue",
        title: "Parcelas vencidas em aberto",
        description:
          overdueRecords.length > 0
            ? `${overdueRecords.length} parcela(s) vencida(s) somando ${formatCurrency(totalOverdue)}.`
            : "Nenhuma parcela vencida em aberto.",
        level: overdueRecords.length > 0 ? "warning" : "success",
        action: "Abrir financeiro",
        href: "/financeiro",
      },
      {
        id: "tomorrow",
        title: "Consultas de amanhã sem confirmação",
        description:
          tomorrowNotConfirmed.length > 0
            ? `${tomorrowNotConfirmed.length} consulta(s) ainda precisam de confirmação.`
            : "Agenda de amanhã está sob controle.",
        level: tomorrowNotConfirmed.length > 0 ? "warning" : "success",
        action: "Abrir agenda",
        href: "/agenda",
      },
      {
        id: "today",
        title: "Consultas de hoje ainda agendadas",
        description:
          todayPending.length > 0
            ? `${todayPending.length} consulta(s) ainda sem mudança de status.`
            : emptyAgendaToday
              ? "Nenhuma consulta agendada para hoje."
              : "Fluxo do dia está atualizado.",
        level: todayPending.length > 0 ? "info" : "success",
        action: "Ver agenda",
        href: "/agenda",
      },
      {
        id: "noshow",
        title: "Faltas no mês",
        description:
          noShowsThisMonth.length > 0
            ? `${noShowsThisMonth.length} falta(s) registrada(s) neste mês.`
            : "Nenhuma falta registrada neste mês.",
        level: noShowsThisMonth.length > 0 ? "danger" : "success",
        action: "Ver agenda",
        href: "/agenda",
      },
    ];
  }, [financialRecords, appointments]);

  const productionByProcedure = useMemo(() => {
    const grouped: Record<string, { name: string; amount: number; count: number }> = {};

    financialRecords.forEach((record) => {
      const date = record.paid_at || record.created_at;
      if (!isWithinRange(date, periodRange)) return;

      const label = normalizeLabel(
        record.procedure_name ||
          record.treatment_name ||
          record.category ||
          record.description ||
          "Procedimento não informado"
      );

      const amount = parseMoney(record.paid_amount) || parseMoney(record.amount);

      if (!grouped[label]) {
        grouped[label] = { name: label, amount: 0, count: 0 };
      }

      grouped[label].amount += amount;
      grouped[label].count += 1;
    });

    return Object.values(grouped)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [financialRecords, periodRange]);

  const appointmentsByWeekday = useMemo(() => {
    const grouped = weekLabels.map((name) => ({ name, total: 0 }));

    appointmentsInPeriod.forEach((appointment) => {
      if (!appointment.date) return;

      const date = new Date(`${appointment.date}T12:00:00`);
      if (Number.isNaN(date.getTime())) return;

      grouped[date.getDay()].total += 1;
    });

    return grouped;
  }, [appointmentsInPeriod]);

  const appointmentStatusData = useMemo(() => {
    const grouped: Record<string, number> = {};

    appointmentsInPeriod.forEach((appointment) => {
      const label = statusLabel(appointment.status);
      grouped[label] = (grouped[label] || 0) + 1;
    });

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [appointmentsInPeriod]);

  const executiveComparison = useMemo(() => {
    const receivedPreviousPeriod = financialRecords.reduce((acc, record) => {
      const paid = parseMoney(record.paid_amount);
      const paidAt = record.paid_at || record.created_at;
      if (paid <= 0 || !isWithinRange(paidAt, previousPeriodRange)) return acc;
      return acc + paid;
    }, 0);

    const newPatientsPreviousPeriod = patients.filter((patient) =>
      isWithinRange(patient.created_at, previousPeriodRange)
    ).length;

    const noShowsPreviousPeriod = appointments.filter(
      (appointment) =>
        isWithinRange(appointment.date, previousPeriodRange) &&
        normalizeStatus(appointment.status) === "faltou"
    ).length;

    return {
      receivedMonthChange: calculatePercentChange(stats.recebidoMes, receivedPreviousPeriod),
      newPatientsChange: calculatePercentChange(stats.novosPacientesMes, newPatientsPreviousPeriod),
      noShowsChange: calculatePercentChange(stats.faltasMes, noShowsPreviousPeriod),
    };
  }, [
    financialRecords,
    patients,
    appointments,
    previousPeriodRange,
    stats.recebidoMes,
    stats.novosPacientesMes,
    stats.faltasMes,
  ]);

  const executiveInsights = useMemo(() => {
    const bestWeekday = appointmentsByWeekday.reduce(
      (best, item) => (item.total > best.total ? item : best),
      { name: "-", total: 0 }
    );

    const topPaymentMethod = paymentMethods[0];
    const topProcedure = productionByProcedure[0];

    return [
      {
        label: "Tendência financeira",
        value: formatPercentChange(executiveComparison.receivedMonthChange),
        description:
          executiveComparison.receivedMonthChange >= 0
            ? "Recebimento acima do período anterior"
            : "Recebimento abaixo do período anterior",
        positive: executiveComparison.receivedMonthChange >= 0,
      },
      {
        label: "Melhor dia da agenda",
        value: bestWeekday.total > 0 ? bestWeekday.name : "Sem dados",
        description:
          bestWeekday.total > 0
            ? `${bestWeekday.total} consulta(s) ${periodLabel}`
            : "Ainda sem movimento suficiente",
        positive: true,
      },
      {
        label: "Forma mais usada",
        value: topPaymentMethod?.name || "Sem dados",
        description: topPaymentMethod ? formatCurrency(topPaymentMethod.amount) : "Nenhum pagamento registrado",
        positive: true,
      },
      {
        label: "Produção destaque",
        value: topProcedure?.name || "Sem dados",
        description: topProcedure ? formatCurrency(topProcedure.amount) : "Sem produção no período",
        positive: true,
      },
    ];
  }, [appointmentsByWeekday, paymentMethods, productionByProcedure, executiveComparison, periodLabel]);

  const isAdminUser = role === "admin";

  const quickActions = [
    {
      title: "Nova consulta",
      description: "Abrir agenda para criar atendimento",
      href: "/agenda",
      icon: CalendarCheck,
    },
    {
      title: "Novo paciente",
      description: "Cadastrar paciente no sistema",
      href: "/pacientes",
      icon: Users,
    },
    {
      title: "Novo orçamento",
      description: "Abrir pacientes para gerar orçamento",
      href: "/pacientes",
      icon: Wallet,
    },
    {
      title: "BI Executivo",
      description: "Abrir análise comercial e previsão financeira",
      href: "/dashboard/executivo",
      icon: BarChart3,
    },
    {
      title: "Relatórios",
      description: "Analisar financeiro da clínica",
      href: "/relatorios",
      icon: LineChartIcon,
    },
  ].filter((action) =>
    isAdminUser || !["Relatórios", "BI Executivo"].includes(action.title)
  );

  const cards = [
    {
      title: `Recebido ${periodLabel}`,
      value: formatCurrency(stats.recebidoHoje),
      icon: DollarSign,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      description: `Entradas registradas ${periodDescription}`,
    },
    {
      title: "Saldo previsto",
      value: formatCurrency(stats.saldoPrevisto),
      icon: TrendingUp,
      color: "text-[#239d9a]",
      bg: "bg-[#eefafa]",
      description: `Recebido + a receber - despesas ${periodDescription}`,
      trend: `${formatPercentChange(executiveComparison.receivedMonthChange)} vs período anterior`,
    },
    {
      title: `Despesas ${periodLabel}`,
      value: formatCurrency(stats.despesasMes),
      icon: Wallet,
      color: "text-rose-700",
      bg: "bg-rose-50",
      description: `Saídas pagas ${periodDescription}`,
    },
    {
      title: "Lucro real",
      value: formatCurrency(stats.lucroMes),
      icon: Zap,
      color: stats.lucroMes >= 0 ? "text-emerald-700" : "text-rose-700",
      bg: stats.lucroMes >= 0 ? "bg-emerald-50" : "bg-rose-50",
      description: `Recebido ${periodDescription} - despesas pagas`,
    },
    {
      title: "A receber",
      value: formatCurrency(stats.aReceber),
      icon: AlertCircle,
      color: "text-amber-700",
      bg: "bg-amber-50",
      description: `Parcelas em aberto com vencimento ${periodDescription}`,
    },
    {
      title: period === "hoje" ? "Consultas hoje" : period === "semana" ? "Consultas na semana" : "Consultas no mês",
      value: String(stats.consultasHoje),
      icon: CalendarCheck,
      color: "text-blue-700",
      bg: "bg-blue-50",
      description: `${stats.confirmadosHoje} confirmada(s) ${periodDescription}`,
    },
    {
      title: "Pacientes",
      value: String(stats.pacientes),
      icon: Users,
      color: "text-slate-700",
      bg: "bg-slate-100",
      description: `${stats.novosPacientesMes} novo(s) ${periodDescription}`,
      trend: `${formatPercentChange(executiveComparison.newPatientsChange)} vs período anterior`,
    },
    {
      title: "Ocupação hoje",
      value: `${stats.ocupacaoHoje}%`,
      icon: Clock,
      color: "text-purple-700",
      bg: "bg-purple-50",
      description: "Baseado na agenda",
    },
    {
      title: "Confirmação",
      value: `${stats.taxaConfirmacao}%`,
      icon: CalendarCheck,
      color: "text-cyan-700",
      bg: "bg-cyan-50",
      description: `${stats.confirmadosHoje}/${stats.consultasHoje} consulta(s) ${periodDescription}`,
    },
    {
      title: "Taxa de faltas",
      value: `${stats.taxaFaltas}%`,
      icon: AlertTriangle,
      color: "text-red-700",
      bg: "bg-red-50",
      description: `${stats.faltasMes} falta(s) ${periodDescription}`,
      trend: `${formatPercentChange(executiveComparison.noShowsChange)} vs período anterior`,
    },
    {
      title: "Ticket médio",
      value: formatCurrency(stats.ticketMedio),
      icon: Wallet,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      description: `Média por paciente pagante ${periodDescription}`,
    },
  ].filter((card) => {
    if (isAdminUser) return true;

    const restrictedTitles = ["Lucro real", "A receber", "Ticket médio"];
    return (
      !String(card.title).startsWith("Recebido") &&
      !String(card.title).startsWith("Despesas") &&
      !restrictedTitles.includes(String(card.title))
    );
  });

  return (
    <div className="min-h-full bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-3 pb-28 md:space-y-4 md:pb-10">
        <div className="overflow-hidden rounded-[1.4rem] border border-[#bde4e3] bg-white shadow-sm md:rounded-2xl">
          <div className="relative min-h-[72px] bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] px-4 py-3 text-white md:px-5 md:py-4">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-cyan-200/20 blur-3xl" />
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-50/90">
                  Dashboard da clínica
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <h1 className="text-xl md:text-2xl font-black tracking-tight">
                    Visão geral do consultório
                  </h1>
                  <span className="hidden md:inline text-xs font-medium text-cyan-50/90">
                    Agenda, recebimentos e indicadores principais.
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <div className="flex items-center gap-1.5 rounded-xl bg-white/15 p-1 border border-white/20">
                  {(["hoje", "semana", "mes"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPeriod(item)}
                      className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
                        period === item
                          ? "bg-white text-[#239d9a] shadow-sm"
                          : "text-cyan-50 hover:bg-white/15"
                      }`}
                    >
                      {item === "hoje" ? "Hoje" : item === "semana" ? "Semana" : "Mês"}
                    </button>
                  ))}
                </div>

                {isAdminUser && (
                  <div className="rounded-xl bg-white/15 border border-white/25 px-3 py-2 text-right min-w-[190px]">
                    <div className="text-[9px] font-black uppercase tracking-widest text-cyan-50/90">
                      Saldo previsto
                    </div>
                    <div className="text-lg font-black leading-tight">
                      {formatCurrency(stats.saldoPrevisto)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isAdminUser && stats.vencidoEmAberto > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                <AlertCircle size={18} />
              </div>
              <div>
                <div className="font-bold text-amber-800">
                  Atenção: existem parcelas vencidas em aberto
                </div>
                <div className="text-xs text-amber-700">
                  {stats.parcelasVencidas} parcela(s) vencida(s) • Total vencido: {formatCurrency(stats.vencidoEmAberto)}
                </div>
              </div>
            </div>

            <a
              href="/financeiro"
              className="rounded-lg bg-amber-600 px-3 py-2 text-center text-xs font-bold text-white hover:bg-amber-700"
            >
              Abrir financeiro
            </a>
          </div>
        )}

        {isAdminUser && (
          <Card className="rounded-2xl border border-[#d9eeee] bg-white shadow-sm overflow-hidden">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[#eefafa] p-3 text-[#239d9a]">
                  <BarChart3 size={20} />
                </div>

                <div>
                  <div className="text-sm font-black text-slate-800">
                    Dashboard principal focado na operação
                  </div>

                  <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Use esta tela para acompanhar o dia a dia. Para análise profunda, metas, forecast, marketing e BI completo, acesse o Dashboard Executivo.
                  </div>
                </div>
              </div>

              <a
                href="/dashboard/executivo"
                className="inline-flex items-center justify-center rounded-xl bg-[#239d9a] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#1f8d8a]"
              >
                Abrir BI Executivo
              </a>
            </CardContent>
          </Card>
        )}

        <div className="hidden">
          {executiveInsights.map((insight) => (
            <div
              key={insight.label}
              className="group overflow-hidden rounded-2xl border border-[#d9eeee] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {insight.label}
                  </div>
                  <div className={`mt-2 truncate text-xl font-black ${
                    insight.positive ? "text-[#239d9a]" : "text-rose-700"
                  }`}>
                    {insight.value}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {insight.description}
                  </div>
                </div>

                <div className={`rounded-2xl p-2.5 ${
                  insight.positive ? "bg-[#eefafa] text-[#239d9a]" : "bg-rose-50 text-rose-700"
                }`}>
                  <TrendingUp size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <DashboardQuickActions actions={quickActions} />

        <DashboardCards cards={cards} />

        <Card className="rounded-2xl border border-[#d9eeee] bg-white shadow-sm overflow-hidden">
          <CardHeader className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">
                  Indicadores inteligentes
                </CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                  Alertas automáticos para decisões rápidas
                </CardDescription>
              </div>

              <div className="rounded-xl bg-[#eefafa] p-2.5 text-[#239d9a]">
                <Zap size={18} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 px-5 pb-5">
            {intelligentInsights.map((item) => {
              const classes =
                item.level === "danger"
                  ? "border-red-100 bg-red-50 text-red-700"
                  : item.level === "warning"
                    ? "border-amber-100 bg-amber-50 text-amber-700"
                    : item.level === "info"
                      ? "border-blue-100 bg-blue-50 text-blue-700"
                      : "border-emerald-100 bg-emerald-50 text-emerald-700";

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${classes}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {item.level === "success" ? (
                        <CheckCircleIcon />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-black leading-tight">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs font-medium opacity-90">
                        {item.description}
                      </div>

                      <a
                        href={item.href}
                        className="mt-2 inline-flex rounded-lg bg-white/70 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-white"
                      >
                        {item.action}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {isAdminUser && (
            <Card className="hidden xl:col-span-2 rounded-2xl border border-[#d9eeee] bg-white shadow-sm overflow-hidden">
              <CardHeader className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">
                      Evolução financeira
                    </CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                    Recebimentos dos últimos meses
                  </CardDescription>
                </div>

                <div className="rounded-xl bg-[#eefafa] p-2.5 text-[#239d9a]">
                  <LineChartIcon size={22} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-4 pb-6">
              <div className="h-[220px] min-h-[220px] min-w-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient id="financialGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#239d9a" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#239d9a" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9eeee" />

                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                    />

                    <YAxis hide />

                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value || 0)), "Recebido"]}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #d9eeee",
                        boxShadow: "0 10px 25px rgba(15, 23, 42, 0.10)",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#239d9a"
                      strokeWidth={3}
                      fill="url(#financialGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border border-[#d9eeee] bg-white shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-lg font-bold text-slate-800">
                Agenda de hoje
              </CardTitle>
              <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
                Próximas consultas
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 px-5 pb-5">
              {todayAppointments.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-4 text-center text-sm text-slate-400">
                  Nenhuma consulta para hoje.
                </div>
              )}

              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-xl border border-[#d9eeee] bg-[#fbffff] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">
                        {appointment.patient_name || appointment.title || "Paciente"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {appointment.start_time || "--:--"} •{" "}
                        {appointment.title || "Consulta"}
                      </div>
                    </div>

                    <span className="rounded-full bg-[#eefafa] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#239d9a]">
                      {appointment.status || "agendado"}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {isAdminUser && (
            <Card className="hidden rounded-2xl border border-[#d9eeee] bg-white shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-lg font-bold text-slate-800">
                  Recebimentos por dia da semana
              </CardTitle>
              <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
                Distribuição diária
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="h-[220px] min-h-[220px] min-w-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9eeee" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value || 0)), "Recebido"]}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #d9eeee",
                      }}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {weeklyRevenue.map((_, index) => (
                        <Cell key={`cell-${index}`} fill="#239d9a" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              </CardContent>
            </Card>
          )}

          {isAdminUser && (
            <Card className="rounded-2xl border border-[#d9eeee] bg-white shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-lg font-bold text-slate-800">
                  Pacientes com saldo em aberto
              </CardTitle>
              <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
                Prioridade para cobrança
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 px-5 pb-5">
              {debtors.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-4 text-center text-sm text-slate-400">
                  Nenhum saldo em aberto.
                </div>
              )}

              {debtors.map((debtor, index) => (
                <div
                  key={debtor.patientId}
                  className="rounded-xl border border-[#d9eeee] bg-[#fbffff] p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">
                        {debtor.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Saldo pendente
                      </div>
                    </div>
                  </div>

                  <div className="font-black text-amber-700">
                    {formatCurrency(debtor.amount)}
                  </div>
                </div>
              ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {isAdminUser && (
            <Card className="hidden xl:col-span-2 rounded-2xl border border-[#d9eeee] bg-white shadow-sm overflow-hidden">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-lg font-bold text-slate-800">
                  Produção da clínica
              </CardTitle>
              <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
                Faturamento por procedimento no período selecionado
              </CardDescription>
            </CardHeader>

            <CardContent>
              {productionByProcedure.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-4 text-center text-sm text-slate-400">
                  Nenhuma produção registrada neste mês.
                </div>
              ) : (
                <div className="space-y-3">
                  {productionByProcedure.map((item, index) => {
                    const maxAmount = Math.max(...productionByProcedure.map((row) => row.amount), 1);
                    const percent = Math.max(8, Math.round((item.amount / maxAmount) * 100));

                    return (
                      <div
                        key={item.name}
                        className="rounded-xl border border-[#d9eeee] bg-[#fbffff] p-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                              #{index + 1} • {item.count} lançamento(s)
                            </div>
                            <div className="mt-1 truncate font-bold text-slate-800">
                              {item.name}
                            </div>
                          </div>

                          <div className="text-right font-black text-[#239d9a]">
                            {formatCurrency(item.amount)}
                          </div>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eefafa]">
                          <div
                            className="h-full rounded-full bg-[#239d9a]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </CardContent>
            </Card>
          )}

          <Card className="hidden rounded-2xl border border-[#d9eeee] bg-white shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-lg font-bold text-slate-800">
                Status da agenda
              </CardTitle>
              <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
                Distribuição do período selecionado
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="h-[220px] min-h-[220px] min-w-0 w-full">
                {appointmentStatusData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] text-center text-sm text-slate-400">
                    Nenhuma consulta no mês.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={appointmentStatusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={76}
                        paddingAngle={3}
                      >
                        {appointmentStatusData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={statusColors[entry.name] || "#239d9a"}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any) => [`${value} consulta(s)`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {appointmentStatusData.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {appointmentStatusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: statusColors[item.name] || "#239d9a" }}
                      />
                      {item.name}: {item.value}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="hidden rounded-2xl border border-[#d9eeee] bg-white shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-lg font-bold text-slate-800">
              Movimento da agenda
            </CardTitle>
            <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
              Consultas por dia da semana no período selecionado
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="h-[230px] min-h-[230px] min-w-0 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentsByWeekday}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9eeee" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value || 0)} consulta(s)`, "Consultas"]}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #d9eeee",
                    }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    {appointmentsByWeekday.map((_, index) => (
                      <Cell key={`agenda-cell-${index}`} fill="#239d9a" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {isAdminUser && (
          <Card className="hidden rounded-2xl border border-[#d9eeee] bg-white shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-lg font-bold text-slate-800">
                Formas de pagamento
            </CardTitle>
            <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
              Principais métodos recebidos
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {paymentMethods.length === 0 && (
                <div className="md:col-span-5 rounded-xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-4 text-center text-sm text-slate-400">
                  Nenhum pagamento registrado ainda.
                </div>
              )}

              {paymentMethods.map((method) => (
                <div
                  key={method.name}
                  className="rounded-xl border border-[#d9eeee] bg-[#fbffff] p-3"
                >
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {method.name}
                  </div>
                  <div className="mt-2 text-base font-bold text-[#239d9a]">
                    {formatCurrency(method.amount)}
                  </div>
                </div>
              ))}
            </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
