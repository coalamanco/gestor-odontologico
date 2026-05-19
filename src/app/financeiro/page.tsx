"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import FinancialHeader from "../../components/financeiro/FinancialHeader";
import FinancialSummaryCards from "../../components/financeiro/FinancialSummaryCards";
import FinancialAlerts from "../../components/financeiro/FinancialAlerts";
import { supabaseNoSchemaCache } from "@/lib/supabase";
import {
  getFinancialRecordAnalysis,
  getFinancialRecordBalance,
  getFinancialRecordDaysOverdue,
  getFinancialRecordDueDate,
  getFinancialRecordVisualStatus,
  isFinancialRecordOverdue as isFinancialOverdueByEngine,
} from "@/lib/financialEngine";
import {
  DollarSign,
  PlusCircle,
  Trash2,
  TrendingUp,
  Wallet,
  X,
  Info,
  CalendarDays,
  ChevronDown,
  FileText,
  MessageCircle,
  AlertTriangle,
  Download,
} from "lucide-react";

type FinancialRecord = {
  id: string;
  patient_id?: string | null;
  patient_treatment_id?: string | null;
  budget_id?: string | null;
  description?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  payment_method?: string | null;
  receipt_type?: string | null;
  paid_at?: string | null;
  status?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  installment_number?: number | null;
  installments?: number | null;
};

type PaymentTransaction = {
  id: string;
  financial_record_id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  payment_method?: string | null;
  receipt_type?: string | null;
  note?: string | null;
  received_at?: string | null;
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

type PatientOption = {
  id: string;
  name: string;
};

type PeriodoFiltro =
  | "hoje"
  | "ontem"
  | "semana_atual"
  | "semana_passada"
  | "mes_atual"
  | "mes_passado"
  | "ultimos_30"
  | "proximos_30"
  | "custom";

export default function FinanceiroPage() {
  const [registros, setRegistros] = useState<FinancialRecord[]>([]);
  const [pagamentos, setPagamentos] = useState<PaymentTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [saldosPorPaciente, setSaldosPorPaciente] = useState<
    Array<{ patient_id: string; name: string; total: number; paid: number; balance: number; overdueBalance: number; dueTodayBalance: number; futureBalance: number }>
  >([]);

  const [formData, setFormData] = useState({
    patient_id: "",
    description: "",
    amount: "",
    installments: "1",
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  const [loading, setLoading] = useState(false);
  const [isReceberOpen, setIsReceberOpen] = useState(false);
  const [receberTarget, setReceberTarget] = useState<FinancialRecord | null>(null);
  const [receberValor, setReceberValor] = useState("");
  const [receberFormaPagamento, setReceberFormaPagamento] = useState("Pix");
  const [receberRecibo, setReceberRecibo] = useState("nenhum");
  const [receberObservacao, setReceberObservacao] = useState("");
  const [receberSaving, setReceberSaving] = useState(false);

  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentTransaction | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("Pix");
  const [editReceiptType, setEditReceiptType] = useState("nenhum");
  const [editReceivedAt, setEditReceivedAt] = useState(todayIso);
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const [editPaymentSaving, setEditPaymentSaving] = useState(false);

  const [detailRecord, setDetailRecord] = useState<FinancialRecord | null>(null);

  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("mes_atual");
  const [dataInicio, setDataInicio] = useState(todayIso.slice(0, 8) + "01");
  const [dataFim, setDataFim] = useState(todayIso);
  const [searchTerm, setSearchTerm] = useState("");
  const [smartFilter, setSmartFilter] = useState<"todos" | "atrasados" | "cobranca" | "recibos">("todos");
  const [periodoMenuOpen, setPeriodoMenuOpen] = useState(false);

  const resultadosRef = useRef<HTMLDivElement | null>(null);

  const parseMoney = (value: unknown) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;
    return Number(String(value).replace(",", ".")) || 0;
  };

  const formatCurrency = (value: unknown) => {
    const numberValue = parseMoney(value);
    return numberValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const toDateOnly = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const endOfDate = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
  };

  const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

  const getStartOfWeek = (date: Date) => {
    const copy = toDateOnly(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    return copy;
  };

  const getPeriodoRange = (periodo: PeriodoFiltro) => {
    const now = new Date();

    if (periodo === "hoje") {
      return { start: toDateOnly(now), end: endOfDate(now) };
    }

    if (periodo === "ontem") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return { start: toDateOnly(yesterday), end: endOfDate(yesterday) };
    }

    if (periodo === "semana_atual") {
      const start = getStartOfWeek(now);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end: endOfDate(end) };
    }

    if (periodo === "semana_passada") {
      const start = getStartOfWeek(now);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end: endOfDate(end) };
    }

    if (periodo === "mes_atual") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start, end: endOfDate(end) };
    }

    if (periodo === "mes_passado") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start, end: endOfDate(end) };
    }

    if (periodo === "ultimos_30") {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { start: toDateOnly(start), end: endOfDate(now) };
    }

    if (periodo === "proximos_30") {
      const end = new Date(now);
      end.setDate(now.getDate() + 30);
      return { start: toDateOnly(now), end: endOfDate(end) };
    }

    const start = dataInicio ? new Date(`${dataInicio}T00:00:00`) : new Date("1900-01-01T00:00:00");
    const end = dataFim ? new Date(`${dataFim}T23:59:59`) : new Date("2999-12-31T23:59:59");

    return { start, end };
  };

  const isWithinPeriodo = (dateString?: string | null) => {
    if (!dateString) return false;

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return false;

    const { start, end } = getPeriodoRange(periodoFiltro);
    return date >= start && date <= end;
  };

  const isExpensePaid = (expense: Expense) => {
    return String(expense.status || "").trim().toLowerCase() === "pago";
  };

  const getExpenseDate = (expense: Expense) => {
    return expense.payment_date || expense.created_at || null;
  };

  const applyPeriodo = (periodo: PeriodoFiltro) => {
    setPeriodoFiltro(periodo);

    if (periodo !== "custom") {
      const { start, end } = getPeriodoRange(periodo);
      setDataInicio(toInputDate(start));
      setDataFim(toInputDate(end));
    }
  };

  const labelPeriodoAtual = () => {
    const { start, end } = getPeriodoRange(periodoFiltro);
    return `${start.toLocaleDateString("pt-BR")} até ${end.toLocaleDateString("pt-BR")}`;
  };

  const labelPeriodoSelecionado = () => {
    switch (periodoFiltro) {
      case "hoje":
        return "de hoje";
      case "ontem":
        return "de ontem";
      case "semana_atual":
        return "dessa semana";
      case "semana_passada":
        return "da semana passada";
      case "mes_atual":
        return "desse mês";
      case "mes_passado":
        return "do mês passado";
      case "ultimos_30":
        return "dos últimos 30 dias";
      case "proximos_30":
        return "dos próximos 30 dias";
      case "custom":
        return "escolher período";
      default:
        return "desse mês";
    }
  };

  const periodoOptions: Array<{ value: PeriodoFiltro; label: string }> = [
    { value: "hoje", label: "de hoje" },
    { value: "ontem", label: "de ontem" },
    { value: "semana_atual", label: "dessa semana" },
    { value: "semana_passada", label: "da semana passada" },
    { value: "mes_atual", label: "desse mês" },
    { value: "mes_passado", label: "do mês passado" },
    { value: "ultimos_30", label: "dos últimos 30 dias" },
    { value: "proximos_30", label: "dos próximos 30 dias" },
    { value: "custom", label: "escolher período" },
  ];

  const labelStatus = (value: unknown) => {
    const v = String(value ?? "").trim().toLowerCase();
    if (v === "pago" || v === "paid") return "Pago";
    if (v === "parcial") return "Parcial";
    if (v === "pendente" || v === "pending") return "Pendente";
    if (v === "cancelado" || v === "cancelled" || v === "canceled") return "Cancelado";
    return v ? String(value) : "—";
  };

  const statusBadgeClass = (value: unknown) => {
    const v = String(value ?? "").trim().toLowerCase();
    if (v === "pago" || v === "paid") {
      return "border border-emerald-200 bg-emerald-50/90 text-emerald-600 shadow-sm shadow-emerald-900/5";
    }
    if (v === "parcial") {
      return "border border-amber-100 bg-white/90 text-amber-800 shadow-sm shadow-amber-900/5";
    }
    if (v === "atrasado" || v === "em_atraso") {
      return "border border-red-100 bg-white/95 text-red-600 shadow-sm shadow-red-900/5";
    }
    if (v === "pendente" || v === "pending") {
      return "border border-slate-200 bg-slate-50/95 text-slate-600 shadow-sm";
    }
    if (v === "cancelado" || v === "cancelled" || v === "canceled") {
      return "border border-slate-200 bg-slate-100 text-slate-500 shadow-sm";
    }
    return "border border-slate-200 bg-white text-slate-600 shadow-sm";
  };

  const rowStatusAccentClass = (record: FinancialRecord) => {
    const analysis = getFinancialRecordAnalysis(record);

    if (analysis.overdueBalance > 0) {
      return "border-l-4 border-l-red-400 bg-red-50/45 hover:bg-white";
    }

    if (analysis.dueTodayBalance > 0) {
      return "border-l-4 border-l-amber-400 bg-amber-50/40 hover:bg-white";
    }

    if (analysis.futureBalance > 0) {
      return "border-l-4 border-l-cyan-300 bg-cyan-50/25 hover:bg-cyan-50/50";
    }

    if (analysis.visualStatus === "pago") {
      return "border-l-4 border-l-emerald-300 bg-emerald-50/25 hover:bg-emerald-50/45";
    }

    if (hasReceipt(record.receipt_type)) {
      return "border-l-4 border-l-purple-300 bg-purple-50/35 hover:bg-purple-50/70";
    }

    return "border-l-4 border-l-transparent hover:bg-[#fbffff]";
  };

  const getDaysSince = (dateString?: string | null) => {
    if (!dateString) return 0;

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 0;

    const today = new Date();
    const diff = today.getTime() - date.getTime();

    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const getFinancialDueDate = (record: FinancialRecord) => {
    return getFinancialRecordDueDate(record);
  };

  const getDateAtNoon = (dateString?: string | null) => {
    if (!dateString) return null;

    const date = new Date(
      String(dateString).includes("T") ? dateString : `${dateString}T12:00:00`
    );

    if (Number.isNaN(date.getTime())) return null;

    date.setHours(0, 0, 0, 0);
    return date;
  };

  const isFinancialOverdue = (record: FinancialRecord) => {
    return isFinancialOverdueByEngine(record);
  };

  const getDaysOverdue = (record: FinancialRecord) => {
    return getFinancialRecordDaysOverdue(record);
  };

  const getVisualFinancialStatus = (record: FinancialRecord) => {
    return getFinancialRecordVisualStatus(record);
  };

  const labelVisualFinancialStatus = (record: FinancialRecord) => {
    const status = getVisualFinancialStatus(record);

    if (status === "em_atraso") return "Em atraso";

    return labelStatus(status);
  };

  const labelFormaPagamento = (value: unknown) => {
    const v = String(value ?? "").trim();
    if (!v) return "—";
    if (/pix/i.test(v)) return "Pix";
    if (/cart.*cred/i.test(v)) return "Cartão crédito";
    if (/cart.*deb/i.test(v)) return "Cartão débito";
    if (/cart/i.test(v)) return "Cartão";
    if (/din/i.test(v)) return "Dinheiro";
    if (/boleto/i.test(v)) return "Boleto";
    if (/transf/i.test(v)) return "Transferência";
    if (/cheque/i.test(v)) return "Cheque";
    return v;
  };

  const labelRecibo = (value: unknown) => {
    const v = String(value ?? "").trim().toLowerCase();
    if (!v || v === "nenhum") return "Sem recibo";
    if (v === "simples") return "Recibo simples";
    if (v === "imposto_renda") return "Recibo IR";
    return String(value);
  };

  const hasReceipt = (value: unknown) => {
    const v = String(value ?? "").trim().toLowerCase();
    return Boolean(v && v !== "nenhum");
  };

  const scrollToResultados = () => {
    setTimeout(() => {
      resultadosRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  };

  const receiptBadgeClass = (value: unknown) => {
    const v = String(value ?? "").trim().toLowerCase();

    if (v === "imposto_renda") {
      return "bg-purple-50 text-purple-600 border border-purple-200";
    }

    if (v === "simples") {
      return "bg-cyan-50 text-cyan-700 border border-cyan-200";
    }

    return "bg-slate-50 text-slate-500 border border-slate-200";
  };

  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of patients) {
      map.set(String(p.id), String(p.name ?? ""));
    }
    return map;
  }, [patients]);

  const transactionsByRecord = useMemo(() => {
    const grouped: Record<string, PaymentTransaction[]> = {};

    for (const tx of pagamentos) {
      if (!grouped[tx.financial_record_id]) {
        grouped[tx.financial_record_id] = [];
      }
      grouped[tx.financial_record_id].push(tx);
    }

    return grouped;
  }, [pagamentos]);

  const pagamentosFiltrados = useMemo(() => {
    return pagamentos.filter((p) => isWithinPeriodo(p.received_at || p.created_at));
  }, [pagamentos, periodoFiltro, dataInicio, dataFim]);

  const registrosFiltradosBase = useMemo(() => {
    return registros.filter((r) => {
      if (r.status === "pago") {
        return isWithinPeriodo(r.paid_at || getFinancialDueDate(r));
      }

      return isWithinPeriodo(getFinancialDueDate(r));
    });
  }, [registros, periodoFiltro, dataInicio, dataFim]);

  const registrosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let baseRecords = registrosFiltradosBase;

    if (smartFilter === "atrasados") {
      baseRecords = registros.filter((record) => isFinancialOverdue(record));
    }

    if (smartFilter === "cobranca") {
      baseRecords = registros.filter((record) => {
        return getFinancialRecordAnalysis(record).overdueBalance >= 500;
      });
    }

    if (smartFilter === "recibos") {
      baseRecords = registros.filter((record) => {
        const paid = parseMoney(record.paid_amount);
        return hasReceipt(record.receipt_type) && paid > 0;
      });
    }

    if (!term) return baseRecords;

    return baseRecords.filter((r) => {
      const patientName = r.patient_id
        ? patientNameById.get(String(r.patient_id)) || ""
        : "";

      const searchable = [
        patientName,
        r.description || "",
        r.status || "",
        labelVisualFinancialStatus(r),
        r.payment_method || "",
        labelFormaPagamento(r.payment_method),
        r.receipt_type || "",
        labelRecibo(r.receipt_type),
        r.amount || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [registrosFiltradosBase, registros, searchTerm, smartFilter, patientNameById]);

  const despesasFiltradas = useMemo(() => {
    return expenses.filter((expense) => isWithinPeriodo(getExpenseDate(expense)));
  }, [expenses, periodoFiltro, dataInicio, dataFim]);

  const summary = useMemo(() => {
    const totalLancado = registrosFiltradosBase.reduce(
      (acc, curr) => acc + parseMoney(curr.amount),
      0
    );

    const totalRecebido = pagamentosFiltrados.reduce(
      (acc, curr) => acc + parseMoney(curr.amount),
      0
    );

    const totalAReceber = registrosFiltradosBase.reduce((acc, curr) => {
      return acc + getFinancialRecordBalance(curr);
    }, 0);

    const despesasPagas = despesasFiltradas
      .filter((expense) => isExpensePaid(expense))
      .reduce((acc, expense) => acc + parseMoney(expense.amount), 0);

    const despesasPendentes = expenses
      .filter((expense) => !isExpensePaid(expense))
      .reduce((acc, expense) => acc + parseMoney(expense.amount), 0);

    const saldo = totalRecebido - despesasPagas;

    return {
      totalLancado,
      totalRecebido,
      totalAReceber,
      despesasPagas,
      despesasPendentes,
      saldo,
    };
  }, [registrosFiltradosBase, pagamentosFiltrados, despesasFiltradas, expenses]);

  const intelligentSummary = useMemo(() => {
    const now = new Date();

    const recebidoHoje = pagamentos
      .filter((p) => {
        const date = p.received_at ? new Date(p.received_at) : null;
        if (!date || Number.isNaN(date.getTime())) return false;
        return date.toDateString() === now.toDateString();
      })
      .reduce((acc, curr) => acc + parseMoney(curr.amount), 0);

    const recebidoMes = pagamentos
      .filter((p) => {
        const date = p.received_at ? new Date(p.received_at) : null;
        if (!date || Number.isNaN(date.getTime())) return false;
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      })
      .reduce((acc, curr) => acc + parseMoney(curr.amount), 0);

    const totalEmAberto = registros.reduce((acc, record) => {
      return acc + getFinancialRecordBalance(record);
    }, 0);

    const registrosComValor = registros.filter((record) => parseMoney(record.amount) > 0);
    const registrosInadimplentes = registrosComValor.filter((record) =>
      isFinancialOverdue(record)
    );

    const taxaInadimplencia =
      registrosComValor.length > 0
        ? (registrosInadimplentes.length / registrosComValor.length) * 100
        : 0;

    const pacientesPagantes = new Set(
      pagamentos
        .filter((p) => parseMoney(p.amount) > 0 && p.patient_id)
        .map((p) => String(p.patient_id))
    );

    const ticketMedio =
      pacientesPagantes.size > 0 ? recebidoMes / pacientesPagantes.size : 0;

    const recibosPendentes = registros.filter((record) => {
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      const receiptRequested = hasReceipt(record.receipt_type);
      return receiptRequested && paid > 0 && amount > 0;
    }).length;

    return {
      recebidoHoje,
      recebidoMes,
      totalEmAberto,
      taxaInadimplencia,
      ticketMedio,
      recibosPendentes,
    };
  }, [registros, pagamentos]);

  const paymentMethodSummary = useMemo(() => {
    const grouped: Record<string, number> = {};

    for (const payment of pagamentosFiltrados) {
      const label = labelFormaPagamento(payment.payment_method);
      grouped[label] = (grouped[label] || 0) + parseMoney(payment.amount);
    }

    const rows = Object.entries(grouped)
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);

    const max = rows[0]?.total || 1;

    return rows.map((row) => ({
      ...row,
      percent: Math.max(4, Math.round((row.total / max) * 100)),
    }));
  }, [pagamentosFiltrados]);

  const topOpenBalances = useMemo(() => {
    return saldosPorPaciente
      .filter((item) => item.overdueBalance > 0)
      .slice(0, 6);
  }, [saldosPorPaciente]);

  const receiptSummary = useMemo(() => {
    const simples = registros.filter((record) => record.receipt_type === "simples").length;
    const impostoRenda = registros.filter(
      (record) => record.receipt_type === "imposto_renda"
    ).length;

    return { simples, impostoRenda };
  }, [registros]);

  const patientsToCharge = useMemo(() => {
    return registros
      .map((record) => {
        const analysis = getFinancialRecordAnalysis(record);
        const patientName = record.patient_id
          ? patientNameById.get(String(record.patient_id)) || "Paciente"
          : "Paciente";

        return {
          record,
          patientName,
          balance: analysis.balance,
          overdueBalance: analysis.overdueBalance,
          dueTodayBalance: analysis.dueTodayBalance,
          futureBalance: analysis.futureBalance,
          daysOpen: analysis.daysOverdue,
          visualStatus: analysis.visualStatus,
        };
      })
      // Cobrança inteligente deve mostrar apenas atraso real.
      // Saldo futuro de orçamento parcelado em dia não entra como inadimplência.
      .filter((item) => item.overdueBalance > 0)
      .sort((a, b) => {
        if (a.daysOpen !== b.daysOpen) return b.daysOpen - a.daysOpen;
        return b.overdueBalance - a.overdueBalance;
      })
      .slice(0, 8);
  }, [registros, patientNameById]);

  const openBalanceSummary = useMemo(() => {
    return registros.reduce(
      (acc, record) => {
        const analysis = getFinancialRecordAnalysis(record);
        acc.totalOpen += analysis.balance;
        acc.totalOverdue += analysis.overdueBalance;
        acc.totalDueToday += analysis.dueTodayBalance;
        acc.totalFuture += analysis.futureBalance;
        return acc;
      },
      { totalOpen: 0, totalOverdue: 0, totalDueToday: 0, totalFuture: 0 },
    );
  }, [registros]);

  const smartAlerts = useMemo(() => {
    const overduePatients = patientsToCharge;

    const totalOverdue = overduePatients.reduce(
      (acc, item) => acc + item.overdueBalance,
      0
    );

    const totalOpen = openBalanceSummary.totalOpen;

    const receiptRequested = registros.filter((record) =>
      hasReceipt(record.receipt_type)
    );

    const receiptWithPayment = receiptRequested.filter(
      (record) => parseMoney(record.paid_amount) > 0
    );

    const highDebtPatients = patientsToCharge.filter(
      (item) => item.overdueBalance >= 500
    );

    return {
      overduePatients,
      totalOverdue,
      totalOpen,
      totalDueToday: openBalanceSummary.totalDueToday,
      totalFuture: openBalanceSummary.totalFuture,
      receiptRequested,
      receiptWithPayment,
      highDebtPatients,
    };
  }, [patientsToCharge, registros, openBalanceSummary]);

  const financialPrediction = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const getReceivableUntil = (days: number) => {
      const limit = new Date(now);
      limit.setDate(now.getDate() + days);
      limit.setHours(23, 59, 59, 999);

      return registros.reduce((acc, record) => {
        const total = parseMoney(record.amount);
        const paid = parseMoney(record.paid_amount);
        const balance = Math.max(0, total - paid);

        if (balance <= 0 || getVisualFinancialStatus(record) === "pago") {
          return acc;
        }

        const dueDate = getDateAtNoon(getFinancialDueDate(record));
        if (!dueDate) return acc;

        return dueDate >= now && dueDate <= limit ? acc + balance : acc;
      }, 0);
    };

    const getPendingExpensesUntil = (days: number) => {
      const limit = new Date(now);
      limit.setDate(now.getDate() + days);
      limit.setHours(23, 59, 59, 999);

      return expenses.reduce((acc, expense) => {
        if (isExpensePaid(expense)) return acc;

        const expenseDate = getDateAtNoon(getExpenseDate(expense));
        if (!expenseDate) return acc;

        return expenseDate >= now && expenseDate <= limit
          ? acc + parseMoney(expense.amount)
          : acc;
      }, 0);
    };

    const receivedThisMonth = intelligentSummary.recebidoMes;

    const paidExpensesThisMonth = expenses
      .filter((expense) => {
        if (!isExpensePaid(expense)) return false;

        const date = getDateAtNoon(getExpenseDate(expense));
        if (!date) return false;

        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      })
      .reduce((acc, expense) => acc + parseMoney(expense.amount), 0);

    const grossProfit = receivedThisMonth - paidExpensesThisMonth;
    const margin =
      receivedThisMonth > 0 ? Math.round((grossProfit / receivedThisMonth) * 100) : 0;

    const receivable30 = getReceivableUntil(30);
    const receivable60 = getReceivableUntil(60);
    const receivable90 = getReceivableUntil(90);

    const expenses30 = getPendingExpensesUntil(30);
    const expenses60 = getPendingExpensesUntil(60);
    const expenses90 = getPendingExpensesUntil(90);

    const net30 = receivable30 - expenses30;
    const net60 = receivable60 - expenses60;
    const net90 = receivable90 - expenses90;

    const riskLevel =
      intelligentSummary.taxaInadimplencia >= 30 || smartAlerts.totalOverdue > receivedThisMonth
        ? "Alto"
        : intelligentSummary.taxaInadimplencia >= 15
          ? "Médio"
          : "Baixo";

    return {
      receivable30,
      receivable60,
      receivable90,
      expenses30,
      expenses60,
      expenses90,
      net30,
      net60,
      net90,
      receivedThisMonth,
      paidExpensesThisMonth,
      grossProfit,
      margin,
      riskLevel,
    };
  }, [registros, expenses, intelligentSummary, smartAlerts.totalOverdue]);


  const buildChargeAllWhatsappHref = () => {
    const total = patientsToCharge.reduce((acc, item) => acc + item.overdueBalance, 0);

    const lines = patientsToCharge.map((item, index) => {
      const status =
        item.visualStatus === "em_atraso"
          ? `vencido há ${item.daysOpen} dia(s)`
          : "pendente dentro do prazo";

      return `${index + 1}. ${item.patientName} - ${formatCurrency(
        item.overdueBalance
      )} (${status})`;
    });

    const message =
      `Cobrança inteligente - pacientes com saldo vencido\n\n` +
      lines.join("\n") +
      `\n\nTotal vencido: ${formatCurrency(total)}\n\n` +
      `Use esta lista para organizar os contatos de cobrança da clínica.`;

    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  async function fetchPatients() {
    const { data, error } = await supabaseNoSchemaCache
      .from("patients")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      alert("Erro ao carregar pacientes: " + error.message);
      return;
    }

    setPatients((data || []) as PatientOption[]);
  }

  async function fetchRegistros() {
    const { data, error } = await supabaseNoSchemaCache
      .from("financial_records")
      .select("*")
      .order("created_at", { ascending: false })
      .order("installment_number", { ascending: true });

    if (error) {
      alert("Erro ao carregar financeiro: " + error.message);
      return;
    }

    const lista = (data || []) as FinancialRecord[];
    setRegistros(lista);

    const ids = lista.map((r) => r.id).filter(Boolean);

    if (ids.length === 0) {
      setPagamentos([]);
      return;
    }

    const { data: pagamentosData, error: pagamentosError } = await supabaseNoSchemaCache
      .from("payment_transactions")
      .select("*")
      .in("financial_record_id", ids)
      .order("received_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (pagamentosError) {
      alert("Erro ao carregar pagamentos: " + pagamentosError.message);
      return;
    }

    setPagamentos((pagamentosData || []) as PaymentTransaction[]);
  }

  async function fetchExpenses() {
    const { data, error } = await supabaseNoSchemaCache
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Erro ao carregar despesas:", error.message);
      setExpenses([]);
      return;
    }

    setExpenses((data || []) as Expense[]);
  }

  async function fetchSaldosPorPaciente() {
    const [patientsRes, recordsRes] = await Promise.all([
      supabaseNoSchemaCache.from("patients").select("id, name").order("name", { ascending: true }),
      supabaseNoSchemaCache
        .from("financial_records")
        .select("patient_id, amount, paid_amount, status, due_date, created_at, paid_at, installment_number, installments"),
    ]);

    if (patientsRes.error || recordsRes.error) {
      setSaldosPorPaciente([]);
      return;
    }

    const patientNameMap = new Map<string, string>();
    for (const p of patientsRes.data ?? []) {
      patientNameMap.set(String((p as any).id), String((p as any).name ?? ""));
    }

    const grouped: Record<
      string,
      {
        total: number;
        paid: number;
        balance: number;
        overdueBalance: number;
        dueTodayBalance: number;
        futureBalance: number;
      }
    > = {};

    for (const r of recordsRes.data ?? []) {
      const record = r as any;
      const patientId = String(record.patient_id ?? "");
      if (!patientId) continue;

      const analysis = getFinancialRecordAnalysis(record);

      if (!grouped[patientId]) {
        grouped[patientId] = {
          total: 0,
          paid: 0,
          balance: 0,
          overdueBalance: 0,
          dueTodayBalance: 0,
          futureBalance: 0,
        };
      }

      grouped[patientId].total += analysis.total;
      grouped[patientId].paid += analysis.paid;
      grouped[patientId].balance += analysis.balance;
      grouped[patientId].overdueBalance += analysis.overdueBalance;
      grouped[patientId].dueTodayBalance += analysis.dueTodayBalance;
      grouped[patientId].futureBalance += analysis.futureBalance;
    }

    const rows = Object.entries(grouped).map(([patient_id, values]) => ({
      patient_id,
      name: patientNameMap.get(patient_id) ?? patient_id,
      total: Number(values.total.toFixed(2)),
      paid: Number(values.paid.toFixed(2)),
      balance: Number(values.balance.toFixed(2)),
      overdueBalance: Number(values.overdueBalance.toFixed(2)),
      dueTodayBalance: Number(values.dueTodayBalance.toFixed(2)),
      futureBalance: Number(values.futureBalance.toFixed(2)),
    }));

    rows.sort((a, b) => b.overdueBalance - a.overdueBalance || b.balance - a.balance || a.name.localeCompare(b.name, "pt-BR"));
    setSaldosPorPaciente(rows);
  }

  async function reloadAll() {
    await Promise.all([
      fetchPatients(),
      fetchRegistros(),
      fetchSaldosPorPaciente(),
      fetchExpenses(),
    ]);
  }

  useEffect(() => {
    reloadAll();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const amountNumeric = parseFloat(formData.amount.replace(",", "."));
    const installmentsNumeric = Math.max(1, Number(formData.installments || "1"));

    if (!formData.patient_id) {
      alert("Selecione o paciente.");
      setLoading(false);
      return;
    }

    if (isNaN(amountNumeric) || amountNumeric <= 0) {
      alert("Por favor, insira um valor numérico válido.");
      setLoading(false);
      return;
    }

    const baseInstallmentValue = Number((amountNumeric / installmentsNumeric).toFixed(2));

    const records = Array.from({ length: installmentsNumeric }).map((_, index) => {
      const isLast = index === installmentsNumeric - 1;
      const accumulatedBefore = baseInstallmentValue * index;
      const installmentAmount = isLast
        ? Number((amountNumeric - accumulatedBefore).toFixed(2))
        : baseInstallmentValue;
      const dueDate = new Date();
      dueDate.setHours(12, 0, 0, 0);
      dueDate.setMonth(dueDate.getMonth() + index);

      return {
        patient_id: formData.patient_id,
        description:
          installmentsNumeric > 1
            ? `${formData.description} - Parcela ${index + 1}/${installmentsNumeric}`
            : formData.description,
        amount: installmentAmount,
        paid_amount: 0,
        status: "pendente",
        due_date: dueDate.toISOString().slice(0, 10),
        installment_number: index + 1,
        installments: installmentsNumeric,
      };
    });

    const { error } = await supabaseNoSchemaCache
      .from("financial_records")
      .insert(records);

    if (error) {
      alert("Erro ao realizar lançamento: " + error.message);
      setLoading(false);
      return;
    }

    setFormData({
      patient_id: "",
      description: "",
      amount: "",
      installments: "1",
    });

    await reloadAll();
    setLoading(false);
  }

  async function handleDeleteTransacao(id: string) {
    const ok = confirm("Tem certeza que deseja excluir este lançamento financeiro?");
    if (!ok) return;

    const { error: paymentsDeleteError } = await supabaseNoSchemaCache
      .from("payment_transactions")
      .delete()
      .eq("financial_record_id", id);

    if (paymentsDeleteError) {
      alert("Erro ao excluir pagamentos vinculados: " + paymentsDeleteError.message);
      return;
    }

    const { error } = await supabaseNoSchemaCache
      .from("financial_records")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erro ao excluir lançamento: " + error.message);
      return;
    }

    await reloadAll();
  }

  function openReceberModal(record: FinancialRecord) {
    const total = parseMoney(record.amount);
    const paid = parseMoney(record.paid_amount);
    const remaining = Math.max(0, total - paid);

    setReceberTarget(record);
    setReceberValor(remaining > 0 ? String(remaining.toFixed(2)) : "");
    setReceberFormaPagamento(
      labelFormaPagamento(record.payment_method) === "—"
        ? "Pix"
        : labelFormaPagamento(record.payment_method)
    );
    setReceberRecibo(String(record.receipt_type ?? "nenhum") || "nenhum");
    setReceberObservacao("");
    setIsReceberOpen(true);
  }

  function openEditPaymentModal(payment: PaymentTransaction) {
    setEditingPayment(payment);
    setEditPaymentAmount(String(parseMoney(payment.amount).toFixed(2)));
    setEditPaymentMethod(
      labelFormaPagamento(payment.payment_method) === "—"
        ? "Pix"
        : labelFormaPagamento(payment.payment_method)
    );
    setEditReceiptType(String(payment.receipt_type || "nenhum"));
    setEditReceivedAt(
      payment.received_at
        ? String(payment.received_at).slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setEditPaymentNote(payment.note || "");
    setIsEditPaymentOpen(true);
  }

  function closeEditPaymentModal() {
    if (editPaymentSaving) return;

    setIsEditPaymentOpen(false);
    setEditingPayment(null);
    setEditPaymentAmount("");
    setEditPaymentMethod("Pix");
    setEditReceiptType("nenhum");
    setEditReceivedAt(new Date().toISOString().slice(0, 10));
    setEditPaymentNote("");
  }

  async function recalculateFinancialRecordAfterPaymentEdit(financialRecordId: string) {
    const { data: recordData, error: recordError } = await supabaseNoSchemaCache
      .from("financial_records")
      .select("*")
      .eq("id", financialRecordId)
      .single();

    if (recordError) throw recordError;

    const { data: txData, error: txError } = await supabaseNoSchemaCache
      .from("payment_transactions")
      .select("*")
      .eq("financial_record_id", financialRecordId)
      .order("received_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (txError) throw txError;

    const transactions = (txData || []) as PaymentTransaction[];
    const totalPaid = transactions.reduce((acc, tx) => acc + parseMoney(tx.amount), 0);
    const totalAmount = parseMoney((recordData as FinancialRecord).amount);

    let newStatus = "pendente";
    if (totalPaid <= 0) newStatus = "pendente";
    else if (totalPaid < totalAmount) newStatus = "parcial";
    else newStatus = "pago";

    const latestPayment = transactions[0] || null;

    const { error: updateRecordError } = await supabaseNoSchemaCache
      .from("financial_records")
      .update({
        paid_amount: totalPaid,
        status: newStatus,
        payment_method: latestPayment?.payment_method || null,
        receipt_type: latestPayment?.receipt_type || "nenhum",
        paid_at: latestPayment?.received_at || null,
      })
      .eq("id", financialRecordId);

    if (updateRecordError) throw updateRecordError;
  }

  async function handleEditPaymentConfirmar() {
    if (!editingPayment) return;
    if (editPaymentSaving) return;

    const newAmount = parseFloat(String(editPaymentAmount).replace(",", "."));

    if (isNaN(newAmount) || newAmount <= 0) {
      alert("Informe um valor válido para o pagamento.");
      return;
    }

    try {
      setEditPaymentSaving(true);

      const { error: updatePaymentError } = await supabaseNoSchemaCache
        .from("payment_transactions")
        .update({
          amount: newAmount,
          payment_method: editPaymentMethod,
          receipt_type: editReceiptType,
          note: editPaymentNote || null,
          received_at: new Date(`${editReceivedAt}T12:00:00`).toISOString(),
        })
        .eq("id", editingPayment.id);

      if (updatePaymentError) throw updatePaymentError;

      await recalculateFinancialRecordAfterPaymentEdit(editingPayment.financial_record_id);

      alert("Pagamento atualizado com sucesso.");
      closeEditPaymentModal();
      await reloadAll();
    } catch (error: any) {
      alert("Erro ao editar pagamento: " + (error?.message || "erro inesperado"));
    } finally {
      setEditPaymentSaving(false);
    }
  }

  async function handleReceberConfirmar() {
    const target = receberTarget;
    if (!target?.id) return;
    if (receberSaving) return;

    const valorPagoAgora = parseFloat(String(receberValor).replace(",", "."));
    if (isNaN(valorPagoAgora) || valorPagoAgora <= 0) {
      alert("Informe um valor válido para receber.");
      return;
    }

    const total = parseMoney(target.amount);
    const pagoAtual = parseMoney(target.paid_amount);
    const novoPago = pagoAtual + valorPagoAgora;

    if (novoPago > total) {
      alert("O valor recebido não pode ser maior que o saldo do débito.");
      return;
    }

    let novoStatus = "pendente";
    if (novoPago === 0) novoStatus = "pendente";
    else if (novoPago < total) novoStatus = "parcial";
    else novoStatus = "pago";

    setReceberSaving(true);

    try {
      const { error: paymentInsertError } = await supabaseNoSchemaCache
        .from("payment_transactions")
        .insert([
          {
            financial_record_id: String(target.id),
            patient_id: target.patient_id || null,
            amount: valorPagoAgora,
            payment_method: receberFormaPagamento,
            receipt_type: receberRecibo,
            note: receberObservacao || null,
            received_at: new Date().toISOString(),
          },
        ]);

      if (paymentInsertError) {
        alert("Erro ao registrar pagamento: " + paymentInsertError.message);
        return;
      }

      const { error: recordUpdateError } = await supabaseNoSchemaCache
        .from("financial_records")
        .update({
          paid_amount: novoPago,
          payment_method: receberFormaPagamento,
          receipt_type: receberRecibo,
          status: novoStatus,
          paid_at: new Date().toISOString(),
        })
        .eq("id", String(target.id));

      if (recordUpdateError) {
        alert("Erro ao atualizar débito: " + recordUpdateError.message);
        return;
      }

      setIsReceberOpen(false);
      setReceberTarget(null);
      setReceberValor("");
      setReceberObservacao("");
      await reloadAll();
    } finally {
      setReceberSaving(false);
    }
  }


  function exportFinanceiroExcel() {
    try {
      const rows = registrosFiltrados.map((record) => {
        const total = parseMoney(record.amount);
        const paid = parseMoney(record.paid_amount);
        const balance = Math.max(0, total - paid);
        const patientName = record.patient_id
          ? patientNameById.get(String(record.patient_id)) || ""
          : "";

        return {
          Paciente: patientName,
          Descricao: record.description || "",
          Valor_total: total,
          Valor_pago: paid,
          Saldo_aberto: balance,
          Status: labelVisualFinancialStatus(record),
          Forma_pagamento: labelFormaPagamento(record.payment_method),
          Recibo: labelRecibo(record.receipt_type),
          Parcela: record.installment_number || "",
          Parcelas: record.installments || "",
          Vencimento: getFinancialDueDate(record) || "",
          Data_pagamento: record.paid_at
            ? new Date(record.paid_at).toLocaleDateString("pt-BR")
            : "",
          Criado_em: record.created_at
            ? new Date(record.created_at).toLocaleDateString("pt-BR")
            : "",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Financeiro");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const fileData = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(fileData);
      const link = document.createElement("a");

      link.href = url;
      link.download = `financeiro-${new Date().toISOString().slice(0, 10)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Erro ao exportar Excel do financeiro.");
    }
  }

  function generateFinancialPdfReport() {
    try {
      const generatedAt = new Date().toLocaleString("pt-BR");
      const activeFilterLabel =
        smartFilter === "atrasados"
          ? "Débitos atrasados"
          : smartFilter === "cobranca"
            ? "Cobranças prioritárias"
            : smartFilter === "recibos"
              ? "Recibos para emitir"
              : "Todos os lançamentos do período";

      const openTotal = registrosFiltrados.reduce((acc, record) => {
        const total = parseMoney(record.amount);
        const paid = parseMoney(record.paid_amount);
        return acc + Math.max(0, total - paid);
      }, 0);

      const paidTotal = pagamentosFiltrados.reduce(
        (acc, payment) => acc + parseMoney(payment.amount),
        0
      );

      const topRows = registrosFiltrados.slice(0, 40).map((record) => {
        const total = parseMoney(record.amount);
        const paid = parseMoney(record.paid_amount);
        const balance = Math.max(0, total - paid);
        const patientName = record.patient_id
          ? patientNameById.get(String(record.patient_id)) || "Paciente"
          : "Paciente";

        return `
          <tr>
            <td>${patientName}</td>
            <td>${record.description || "Débito"}</td>
            <td>${getFinancialDueDate(record) ? new Date(`${String(getFinancialDueDate(record)).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "-"}</td>
            <td>${labelVisualFinancialStatus(record)}</td>
            <td class="right">${formatCurrency(total)}</td>
            <td class="right">${formatCurrency(paid)}</td>
            <td class="right">${formatCurrency(balance)}</td>
          </tr>
        `;
      });

      const chargeRows = patientsToCharge.slice(0, 12).map((item, index) => `
        <tr>
          <td>${index + 1}. ${item.patientName}</td>
          <td>${item.visualStatus === "em_atraso" ? `Em atraso há ${item.daysOpen} dia(s)` : "Pendente"}</td>
          <td class="right">${formatCurrency(item.overdueBalance)}</td>
        </tr>
      `);

      const paymentRows = paymentMethodSummary.map((item) => `
        <tr>
          <td>${item.label}</td>
          <td class="right">${formatCurrency(item.total)}</td>
        </tr>
      `);

      const html = `
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <title>Relatório financeiro</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #172033; background: #f7ffff; }
              .page { max-width: 1100px; margin: 0 auto; padding: 28px; }
              .hero { background: linear-gradient(135deg, #1db7b3, #85d4d2); color: white; border-radius: 26px; padding: 26px; margin-bottom: 18px; }
              .hero h1 { margin: 0; font-size: 30px; }
              .hero p { margin: 8px 0 0; opacity: .92; }
              .meta { display: flex; justify-content: space-between; gap: 16px; margin-top: 18px; font-size: 12px; opacity: .9; }
              .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
              .card { background: white; border: 1px solid #d9eeee; border-radius: 18px; padding: 16px; }
              .label { color: #64748b; font-size: 10px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
              .value { margin-top: 8px; color: #239d9a; font-size: 22px; font-weight: 900; }
              h2 { margin: 24px 0 10px; font-size: 18px; }
              table { width: 100%; border-collapse: collapse; background: white; border-radius: 18px; overflow: hidden; border: 1px solid #d9eeee; }
              th { background: #eefafa; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: .08em; padding: 10px; }
              td { border-top: 1px solid #edf7f7; padding: 10px; font-size: 12px; vertical-align: top; }
              .right { text-align: right; white-space: nowrap; }
              .footer { margin-top: 26px; color: #64748b; font-size: 11px; text-align: center; }
              @media print { body { background: white; } .page { padding: 0; max-width: none; } .hero, .card, table { break-inside: avoid; } }
            </style>
          </head>
          <body>
            <div class="page">
              <section class="hero">
                <h1>Relatório financeiro</h1>
                <p>Gestor Odontológico — Dr. Henrique S. Pasquali</p>
                <div class="meta">
                  <div>Período: <strong>${labelPeriodoAtual()}</strong></div>
                  <div>Filtro: <strong>${activeFilterLabel}</strong></div>
                  <div>Gerado em: <strong>${generatedAt}</strong></div>
                </div>
              </section>

              <section class="grid">
                <div class="card"><div class="label">Lançado</div><div class="value">${formatCurrency(summary.totalLancado)}</div></div>
                <div class="card"><div class="label">Recebido</div><div class="value">${formatCurrency(paidTotal)}</div></div>
                <div class="card"><div class="label">Aberto filtrado</div><div class="value">${formatCurrency(openTotal)}</div></div>
                <div class="card"><div class="label">Saldo do período</div><div class="value">${formatCurrency(summary.saldo)}</div></div>
              </section>

              <h2>Alertas inteligentes</h2>
              <section class="grid">
                <div class="card"><div class="label">Atrasados</div><div class="value">${smartAlerts.overduePatients.length}</div></div>
                <div class="card"><div class="label">Acima de R$ 500</div><div class="value">${smartAlerts.highDebtPatients.length}</div></div>
                <div class="card"><div class="label">Recibos</div><div class="value">${smartAlerts.receiptWithPayment.length}</div></div>
                <div class="card"><div class="label">Total em aberto</div><div class="value">${formatCurrency(smartAlerts.totalOpen)}</div></div>
              </section>

              <h2>Principais cobranças</h2>
              <table>
                <thead><tr><th>Paciente</th><th>Status</th><th class="right">Saldo</th></tr></thead>
                <tbody>${chargeRows.join("") || `<tr><td colspan="3">Nenhuma cobrança prioritária.</td></tr>`}</tbody>
              </table>

              <h2>Formas de pagamento</h2>
              <table>
                <thead><tr><th>Método</th><th class="right">Total</th></tr></thead>
                <tbody>${paymentRows.join("") || `<tr><td colspan="2">Nenhum pagamento no período.</td></tr>`}</tbody>
              </table>

              <h2>Lançamentos financeiros</h2>
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th><th>Descrição</th><th>Vencimento</th><th>Status</th>
                    <th class="right">Total</th><th class="right">Pago</th><th class="right">Saldo</th>
                  </tr>
                </thead>
                <tbody>${topRows.join("") || `<tr><td colspan="7">Nenhum lançamento encontrado.</td></tr>`}</tbody>
              </table>

              <div class="footer">Relatório gerado automaticamente pelo Gestor Odontológico.</div>
            </div>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `;

      const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
      if (!reportWindow) {
        alert("O navegador bloqueou a janela do relatório. Libere pop-ups para este site e tente novamente.");
        return;
      }

      reportWindow.document.open();
      reportWindow.document.write(html);
      reportWindow.document.close();
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar relatório financeiro.");
    }
  }

  return (
    <div className="h-screen overflow-y-auto space-y-5 bg-gradient-to-br from-[#f7ffff] via-[#f4fbfb] to-[#eef8f8] p-4 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <FinancialHeader />


      <div className="rounded-3xl border border-[#d9eeee] bg-white/95 p-4 shadow-[0_8px_24px_rgba(35,157,154,0.06)] overflow-visible">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">
                Exibindo financeiro
              </span>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPeriodoMenuOpen((prev) => !prev)}
                  className="min-w-[250px] h-10 rounded-xl border border-[#d9eeee] bg-[#fbffff] px-4 text-left text-sm font-medium text-slate-700 flex items-center justify-between hover:bg-white transition"
                >
                  <span>{labelPeriodoSelecionado()}</span>
                  <ChevronDown
                    size={18}
                    className={`text-[#239d9a] transition ${
                      periodoMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {periodoMenuOpen && (
                  <div className="absolute left-0 top-12 z-50 w-[280px] max-h-[310px] overflow-y-auto rounded-xl border border-[#d9eeee] bg-white shadow-xl">
                    {periodoOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          applyPeriodo(option.value);
                          setPeriodoMenuOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-[13px] transition hover:bg-[#f2fcfc] ${
                          periodoFiltro === option.value
                            ? "bg-[#eefafa] text-[#239d9a] font-semibold"
                            : "text-slate-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500">
                {labelPeriodoAtual()}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 xl:min-w-[460px]">
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (smartFilter !== "todos") setSmartFilter("todos");
                }}
                placeholder="Busque por paciente, procedimento, status ou valor..."
                className="h-10 rounded-xl border-[#d9eeee] bg-[#fbffff]"
              />

              <Button
                type="button"
                onClick={generateFinancialPdfReport}
                className="h-10 rounded-xl bg-slate-700 px-4 text-[13px] font-semibold text-white hover:bg-slate-800"
              >
                <FileText size={16} className="mr-2" />
                Relatório PDF
              </Button>

              <Button
                type="button"
                onClick={exportFinanceiroExcel}
                className="h-10 rounded-xl bg-[#239d9a] px-4 text-[13px] font-semibold text-white hover:bg-[#1f8f8c]"
              >
                <Download size={16} className="mr-2" />
                Exportar Excel
              </Button>

              {(searchTerm || smartFilter !== "todos") && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setSmartFilter("todos");
                  }}
                  className="h-10 rounded-xl border-[#d9eeee]"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {smartFilter !== "todos" && (
            <div className="rounded-2xl border border-[#bfe8e7] bg-[#f2fcfc] px-4 py-3 text-sm font-bold text-[#239d9a]">
              Filtro inteligente ativo: {smartFilter === "atrasados" ? "débitos atrasados" : smartFilter === "cobranca" ? "cobranças prioritárias" : "recibos para emitir"}
            </div>
          )}

          {periodoFiltro === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Data inicial
                </label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="mt-1 h-10 rounded-xl border-[#d9eeee] bg-[#fbffff]"
                />
              </div>

              <div>
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Data final
                </label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="mt-1 h-10 rounded-xl border-[#d9eeee] bg-[#fbffff]"
                />
              </div>
            </div>
          )}
        </div>
      </div>



      <FinancialSummaryCards
        totalLancado={formatCurrency(summary.totalLancado)}
        totalRecebido={formatCurrency(summary.totalRecebido)}
        totalAReceber={formatCurrency(summary.totalAReceber)}
        despesasPagas={formatCurrency(summary.despesasPagas)}
        despesasPendentes={formatCurrency(summary.despesasPendentes)}
        saldo={formatCurrency(summary.saldo)}
        recebidoHoje={formatCurrency(intelligentSummary.recebidoHoje)}
        recebidoMes={formatCurrency(intelligentSummary.recebidoMes)}
        totalEmAberto={formatCurrency(intelligentSummary.totalEmAberto)}
        taxaInadimplencia={`${intelligentSummary.taxaInadimplencia.toFixed(1)}%`}
        ticketMedio={formatCurrency(intelligentSummary.ticketMedio)}
        recibosPendentes={intelligentSummary.recibosPendentes}
      />

      <FinancialAlerts
        overduePatientsCount={smartAlerts.overduePatients.length}
        highDebtPatientsCount={smartAlerts.highDebtPatients.length}
        receiptWithPaymentCount={smartAlerts.receiptWithPayment.length}
        totalOpenFormatted={formatCurrency(smartAlerts.totalOpen)}
        totalOverdueFormatted={formatCurrency(smartAlerts.totalOverdue)}
        patientsToChargeCount={patientsToCharge.length}
        onViewOverdue={() => {
          setSearchTerm("");
          setSmartFilter("atrasados");
          scrollToResultados();
        }}
        onGenerateCharge={() => {
          setSearchTerm("");
          setSmartFilter("cobranca");
          scrollToResultados();
          window.open(buildChargeAllWhatsappHref(), "_blank", "noopener,noreferrer");
        }}
        onViewReceipts={() => {
          setSearchTerm("");
          setSmartFilter("recibos");
          scrollToResultados();
        }}
        onViewAll={() => {
          setSearchTerm("");
          setSmartFilter("todos");
          setPeriodoFiltro("mes_atual");
          scrollToResultados();
        }}
      />

      <div className="rounded-3xl border border-[#d9eeee] bg-white/95 p-4 shadow-[0_8px_24px_rgba(35,157,154,0.06)]">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <MessageCircle size={24} />
            </div>

            <div>
              <h2 className="text-[18px] font-semibold text-slate-800 tracking-[-0.01em]">
                Cobrança inteligente
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">
                Lista automática dos principais pacientes com parcela vencida em aberto.
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-amber-600 border border-amber-100">
                  {patientsToCharge.length} paciente(s)
                </span>
                <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-amber-600 border border-amber-100">
                  Total: {formatCurrency(
                    patientsToCharge.reduce((acc, item) => acc + item.overdueBalance, 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          {patientsToCharge.length > 0 ? (
            <a
              href={buildChargeAllWhatsappHref()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1fb36e] px-5 py-3 text-[13px] font-semibold text-white shadow-sm hover:bg-[#18975d]"
            >
              <MessageCircle size={18} />
              Gerar lista no WhatsApp
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-[13px] font-semibold text-slate-400"
            >
              Nenhuma cobrança pendente
            </button>
          )}
        </div>

        {patientsToCharge.length > 0 && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {patientsToCharge.slice(0, 8).map((item, index) => (
              <div
                key={item.record.id}
                className={`rounded-2xl border p-3 ${
                  item.visualStatus === "em_atraso"
                    ? "border-red-100 bg-white"
                    : "border-amber-100 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-800 truncate">
                      {index + 1}. {item.patientName}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {item.visualStatus === "em_atraso"
                        ? `Em atraso há ${item.daysOpen} dia(s)`
                        : `Pendente há ${item.daysOpen} dia(s)`}
                    </div>
                  </div>

                  <div className="text-[13px] font-semibold text-amber-600 whitespace-nowrap">
                    {formatCurrency(item.overdueBalance)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="rounded-3xl border border-[#d5eeee] bg-white/95 px-5 py-4 shadow-sm ring-1 ring-white/60">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#eefafa] p-3 text-[#28aaa8]">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Total lançado
              </p>
              <p className="text-[17px] font-semibold text-slate-800 tracking-[-0.01em]">
                {formatCurrency(summary.totalLancado)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white/95 px-5 py-4 shadow-sm ring-1 ring-white/60">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Recebido no período
              </p>
              <p className="text-lg font-semibold text-emerald-600">
                {formatCurrency(summary.totalRecebido)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-white/95 px-5 py-4 shadow-sm ring-1 ring-white/60">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                A receber
              </p>
              <p className="text-lg font-semibold text-amber-600">
                {formatCurrency(summary.totalAReceber)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-white/95 px-5 py-4 shadow-sm ring-1 ring-white/60">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
              <Trash2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Despesas pagas
              </p>
              <p className="text-lg font-semibold text-rose-700">
                {formatCurrency(summary.despesasPagas)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-sky-100 bg-white/95 px-5 py-4 shadow-sm ring-1 ring-white/60">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
              <PlusCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Saldo real
              </p>
              <p className="text-lg font-semibold text-sky-700">
                {formatCurrency(summary.saldo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <TrendingUp size={24} />
            </div>

            <div>
              <h2 className="text-[18px] font-semibold text-slate-800 tracking-[-0.01em]">
                Previsão de caixa e DRE simplificado
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">
                Projeção financeira operacional usando recebíveis, despesas, inadimplência e saldo previsto.
              </p>
            </div>
          </div>

          <div
            className={`rounded-2xl px-4 py-3 text-[13px] font-semibold ${
              financialPrediction.riskLevel === "Alto"
                ? "bg-red-50 text-red-600"
                : financialPrediction.riskLevel === "Médio"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
            }`}
          >
            Risco financeiro: {financialPrediction.riskLevel}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-[#d9eeee] bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-emerald-600">
              <CalendarDays size={18} />
              <p className="text-[11px] font-semibold uppercase tracking-widest">
                Próximos 30 dias
              </p>
            </div>

            <p className="text-2xl font-semibold text-emerald-600">
              {formatCurrency(financialPrediction.net30)}
            </p>

            <div className="mt-3 space-y-2 text-xs font-bold text-emerald-600">
              <div className="flex justify-between gap-3">
                <span>A receber</span>
                <span>{formatCurrency(financialPrediction.receivable30)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Despesas previstas</span>
                <span>{formatCurrency(financialPrediction.expenses30)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-cyan-700">
              <CalendarDays size={18} />
              <p className="text-[11px] font-semibold uppercase tracking-widest">
                Próximos 60 dias
              </p>
            </div>

            <p className="text-2xl font-semibold text-cyan-700">
              {formatCurrency(financialPrediction.net60)}
            </p>

            <div className="mt-3 space-y-2 text-xs font-bold text-cyan-700">
              <div className="flex justify-between gap-3">
                <span>A receber</span>
                <span>{formatCurrency(financialPrediction.receivable60)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Despesas previstas</span>
                <span>{formatCurrency(financialPrediction.expenses60)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-blue-700">
              <CalendarDays size={18} />
              <p className="text-[11px] font-semibold uppercase tracking-widest">
                Próximos 90 dias
              </p>
            </div>

            <p className="text-2xl font-semibold text-blue-700">
              {formatCurrency(financialPrediction.net90)}
            </p>

            <div className="mt-3 space-y-2 text-xs font-bold text-blue-700">
              <div className="flex justify-between gap-3">
                <span>A receber</span>
                <span>{formatCurrency(financialPrediction.receivable90)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Despesas previstas</span>
                <span>{formatCurrency(financialPrediction.expenses90)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Receita do mês
            </p>
            <p className="mt-2 text-[17px] font-semibold text-slate-800 tracking-[-0.01em]">
              {formatCurrency(financialPrediction.receivedThisMonth)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Despesas pagas
            </p>
            <p className="mt-2 text-lg font-semibold text-rose-700">
              {formatCurrency(financialPrediction.paidExpensesThisMonth)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Lucro operacional
            </p>
            <p
              className={`mt-2 text-lg font-semibold ${
                financialPrediction.grossProfit >= 0
                  ? "text-emerald-600"
                  : "text-rose-700"
              }`}
            >
              {formatCurrency(financialPrediction.grossProfit)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Margem estimada
            </p>
            <p
              className={`mt-2 text-lg font-semibold ${
                financialPrediction.margin >= 20
                  ? "text-emerald-600"
                  : financialPrediction.margin >= 0
                    ? "text-amber-600"
                    : "text-rose-700"
              }`}
            >
              {financialPrediction.margin}%
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-4">
          <div className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 text-[#239d9a]" />
            <p className="text-sm leading-6 text-slate-600">
              A previsão considera parcelas a receber, saldo em aberto, despesas pendentes e pagamentos já recebidos.
              Ela não altera nenhum lançamento financeiro; serve apenas como leitura gerencial para tomada de decisão.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[17px] font-semibold text-slate-800 tracking-[-0.01em]">
              Despesas da clínica
            </h2>
            <p className="text-[13px] text-slate-500">
              Saídas registradas em Financeiro &gt; Despesas, consideradas no saldo real.
            </p>
          </div>

          <div className="text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-2 rounded-xl">
            Pendentes: {formatCurrency(summary.despesasPendentes)}
          </div>
        </div>

        {despesasFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-5 text-[13px] text-slate-500">
            Nenhuma despesa encontrada neste período.
          </div>
        ) : (
          <div className="space-y-2">
            {despesasFiltradas.slice(0, 6).map((expense) => (
              <div
                key={expense.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-2xl border border-[#eefafa] bg-[#fbffff] p-3"
              >
                <div>
                  <div className="font-bold text-slate-800">
                    {expense.description || "Despesa"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {expense.category || "Sem categoria"} • {getExpenseDate(expense) ? new Date(String(getExpenseDate(expense))).toLocaleDateString("pt-BR") : "Sem data"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      isExpensePaid(expense)
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                    }`}
                  >
                    {isExpensePaid(expense) ? "Pago" : "Pendente"}
                  </span>
                  <span className="font-semibold text-rose-700">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[17px] font-semibold text-slate-800 tracking-[-0.01em]">
              Dashboard inteligente
            </h2>
            <p className="text-[13px] text-slate-500">
              Indicadores rápidos para acompanhar a saúde financeira da clínica.
            </p>
          </div>

          <div className="text-xs font-semibold text-[#239d9a] bg-[#eefafa] px-3 py-2 rounded-xl">
            Atualizado em tempo real
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-[#d9eeee] bg-white/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Hoje
            </p>
            <p className="mt-2 text-lg font-semibold text-emerald-600">
              {formatCurrency(intelligentSummary.recebidoHoje)}
            </p>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              Este mês
            </p>
            <p className="mt-2 text-lg font-semibold text-sky-700">
              {formatCurrency(intelligentSummary.recebidoMes)}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
              Em aberto
            </p>
            <p className="mt-2 text-lg font-semibold text-amber-600">
              {formatCurrency(intelligentSummary.totalEmAberto)}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
              Inadimplência
            </p>
            <p className="mt-2 text-lg font-semibold text-rose-700">
              {intelligentSummary.taxaInadimplencia.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-600">
              Ticket médio
            </p>
            <p className="mt-2 text-lg font-semibold text-purple-600">
              {formatCurrency(intelligentSummary.ticketMedio)}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Recibos
            </p>
            <p className="mt-2 text-lg font-semibold text-cyan-700">
              {intelligentSummary.recibosPendentes}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm xl:col-span-1">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-800">
              Formas de pagamento
            </h2>
            <p className="text-[13px] text-slate-500">
              Recebimentos do período selecionado.
            </p>
          </div>

          <div className="space-y-3">
            {paymentMethodSummary.length === 0 && (
              <p className="text-sm text-slate-400">
                Nenhum pagamento no período.
              </p>
            )}

            {paymentMethodSummary.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    {item.label}
                  </span>
                  <span className="font-semibold text-[#239d9a]">
                    {formatCurrency(item.total)}
                  </span>
                </div>

                <div className="h-2 rounded-full bg-[#eefafa] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#239d9a]"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm xl:col-span-1">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-800">
              Maiores saldos vencidos
            </h2>
            <p className="text-[13px] text-slate-500">
              Pacientes com maior valor realmente vencido.
            </p>
          </div>

          <div className="space-y-2">
            {topOpenBalances.length === 0 && (
              <p className="text-sm text-slate-400">
                Nenhum saldo vencido.
              </p>
            )}

            {topOpenBalances.map((item) => (
              <div
                key={item.patient_id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#edf7f7] bg-[#fbffff] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Pago: {formatCurrency(item.paid)}
                  </div>
                </div>

                <div className="text-[13px] font-semibold text-amber-600 whitespace-nowrap">
                  {formatCurrency(item.overdueBalance)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm xl:col-span-1">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-800">
              Controle de recibos
            </h2>
            <p className="text-[13px] text-slate-500">
              Visão rápida dos recibos solicitados.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Simples
              </p>
              <p className="mt-2 text-lg font-semibold text-cyan-700">
                {receiptSummary.simples}
              </p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-600">
                IR
              </p>
              <p className="mt-2 text-lg font-semibold text-purple-600">
                {receiptSummary.impostoRenda}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#edf7f7] bg-[#fbffff] p-3 text-[13px] text-slate-600">
            Dica: os lançamentos com recibo ficam destacados no histórico financeiro.
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[17px] font-semibold text-slate-800 tracking-[-0.01em]">
              Pacientes para cobrar
            </h2>
            <p className="text-[13px] text-slate-500">
              Lista automática baseada apenas em parcelas vencidas com saldo pendente. Parcelas futuras não entram aqui.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-red-600 border border-red-100">
              {patientsToCharge.filter((item) => item.visualStatus === "em_atraso").length} em atraso
            </span>

            {patientsToCharge.length > 0 && (
              <a
                href={buildChargeAllWhatsappHref()}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#1fb36e] px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-white shadow-sm hover:bg-[#199c5f]"
              >
                Cobrar todos
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {patientsToCharge.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-6 text-center text-sm text-slate-400 xl:col-span-2">
              Nenhum paciente com parcela vencida em aberto.
            </div>
          )}

          {patientsToCharge.map((item) => (
            <div
              key={item.record.id}
              className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                item.visualStatus === "em_atraso"
                  ? "border-red-100 bg-white/60"
                  : "border-[#d9eeee] bg-[#fbffff]"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-slate-800 truncate">
                    {item.patientName}
                  </h3>

                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusBadgeClass(
                      item.visualStatus
                    )}`}
                  >
                    {item.visualStatus === "em_atraso" ? "Em atraso" : "Pendente"}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-slate-500 truncate">
                  {item.record.description || "Débito financeiro"}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  Vencido há {item.daysOpen} dia(s)
                </p>
              </div>

              <div className="flex flex-col md:items-end gap-2">
                <div className="text-base font-semibold text-[#239d9a]">
                  {formatCurrency(item.overdueBalance)}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg border-[#bfe8e7] px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#239d9a] hover:bg-[#f2fcfc]"
                  onClick={() => openReceberModal(item.record)}
                >
                  Receber
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden border border-[#d9eeee] shadow-sm">
        <CardHeader className="border-b border-[#e7f6f6] bg-gradient-to-r from-[#fbffff] to-[#f4fcfc] py-5 px-6">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight text-[#239d9a]">
              Saldo devedor por paciente
            </CardTitle>
            <CardDescription className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Total lançado, pago, vencido e a vencer
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 max-h-[280px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-[#f7ffff] to-[#eefafa]">
              <TableRow className="h-10 border-none hover:bg-transparent">
                <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Paciente</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Total</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Já pagou</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Vencido</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">A vencer</TableHead>
                <TableHead className="px-6 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">Falta pagar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saldosPorPaciente.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm font-bold text-slate-400">
                    Nenhum saldo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                saldosPorPaciente.map((r) => (
                  <TableRow key={r.patient_id} className="h-10 border-[#edf7f7] hover:bg-[#fbffff]">
                    <TableCell className="px-6 py-2 text-sm font-semibold text-slate-800">
                      {r.name || r.patient_id}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700">
                      {formatCurrency(r.total)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(r.paid)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-red-600">
                      {formatCurrency(r.overdueBalance)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-cyan-700">
                      {formatCurrency(r.futureBalance + r.dueTodayBalance)}
                    </TableCell>
                    <TableCell className="px-6 text-right text-sm font-semibold text-[#1da3a0]">
                      {formatCurrency(r.balance)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="overflow-hidden border border-[#d9eeee] shadow-sm">
          <CardHeader className="border-b border-[#e7f6f6] bg-gradient-to-r from-[#fbffff] to-[#f4fcfc] py-6 px-6">
            <CardTitle className="flex items-center gap-3 text-[#239d9a]">
              <div className="rounded-2xl bg-gradient-to-br from-[#dff4f4] to-[#c9eded] p-2.5">
                <PlusCircle className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Lançamento</span>
            </CardTitle>
            <CardDescription className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Novo débito financeiro
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pt-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Paciente
                </label>
                <select
                  className="flex h-10 w-full rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-all focus:border-[#84d5d3] focus:bg-white"
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  required
                >
                  <option value="">Selecione o paciente</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Descrição
                </label>
                <Input
                  required
                  className="h-10 rounded-xl border-[#d9eeee] bg-[#fbffff] text-sm transition-all focus:bg-white"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Orçamento aprovado"
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Valor
                  </label>
                  <Input
                    required
                    className="h-10 rounded-xl border-[#d9eeee] bg-[#fbffff] font-semibold text-[#239d9a] transition-all focus:bg-white"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Parcelas
                  </label>
                  <Input
                    type="number"
                    min="1"
                    className="h-10 rounded-xl border-[#d9eeee] bg-[#fbffff] transition-all focus:bg-white"
                    value={formData.installments}
                    onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="mt-2 h-10 w-full rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#77d0cf] text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm hover:from-[#18a6a2] hover:to-[#67c8c7]"
                disabled={loading}
              >
                {loading ? "Salvando..." : "Confirmar lançamento"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card ref={resultadosRef} className="lg:col-span-2 overflow-hidden border border-[#d9eeee] shadow-sm ring-1 ring-white/60 scroll-mt-6">
          <CardHeader className="border-b border-[#e7f6f6] bg-gradient-to-r from-[#fbffff] to-[#f4fcfc] py-6 px-6">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight text-[#239d9a]">
                Histórico financeiro
              </CardTitle>
              <CardDescription className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Débitos e recebimentos do período
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gradient-to-r from-[#f7ffff] to-[#eefafa]">
                <TableRow className="h-10 border-none hover:bg-transparent">
                  <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Data</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Paciente</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Lançamento</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Pagamento</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Status</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">Valor</TableHead>
                  <TableHead className="px-6 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {registrosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-300">
                        <div className="rounded-full bg-[#f3fbfb] p-5">
                          <DollarSign className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                          Nenhum lançamento encontrado no período
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  registrosFiltrados.map((t) => {
                    const total = parseMoney(t.amount);
                    const paid = parseMoney(t.paid_amount);
                    const balance = Math.max(0, total - paid);

                    return (
                      <TableRow
                        key={t.id}
                        className={`group h-12 border-[#edf7f7] transition-all ${rowStatusAccentClass(t)}`}
                      >
                        <TableCell className="px-6 py-2 text-sm font-medium text-slate-700">
                          <div className="font-bold text-slate-700">
                            {getFinancialDueDate(t) ? new Date(`${String(getFinancialDueDate(t)).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "-"}
                          </div>
                          {getFinancialRecordAnalysis(t).overdueBalance > 0 && (
                            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600">
                              {getFinancialRecordAnalysis(t).daysOverdue} dia(s) em atraso
                            </div>
                          )}
                          {getFinancialRecordAnalysis(t).futureBalance > 0 && getFinancialRecordAnalysis(t).overdueBalance <= 0 && (
                            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-600">
                              A vencer
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-sm font-medium text-slate-800">
                          {t.patient_id ? patientNameById.get(String(t.patient_id)) || "Paciente" : "—"}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">
                              {t.installments && t.installments > 1
                                ? `Parcela ${t.installment_number || 1}/${t.installments}`
                                : "Débito"}
                            </span>

                            <button
                              type="button"
                              onClick={() => setDetailRecord(t)}
                              className="rounded-full p-1 text-[#2d8cff] hover:bg-blue-50"
                              title="Ver detalhes"
                            >
                              <Info size={15} />
                            </button>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-slate-500">
                              {labelFormaPagamento(t.payment_method)}
                            </span>

                            {hasReceipt(t.receipt_type) ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${receiptBadgeClass(
                                  t.receipt_type
                                )}`}
                                title="Paciente solicitou recibo"
                              >
                                <FileText size={12} />
                                {labelRecibo(t.receipt_type)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">
                                • Sem recibo
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusBadgeClass(
                              getVisualFinancialStatus(t)
                            )}`}
                          >
                            {labelVisualFinancialStatus(t)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right text-[13px] font-semibold text-slate-800">
                          <div>{formatCurrency(total)}</div>
                          {balance > 0 && (
                            <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                              Saldo {formatCurrency(balance)}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {balance > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-7 rounded-lg border-[#bfe8e7] px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#239d9a] hover:bg-[#f2fcfc]"
                                onClick={() => openReceberModal(t)}
                              >
                                Receber
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-xl text-[#239d9a] hover:bg-[#f0fbfb]"
                              onClick={() => handleDeleteTransacao(String(t.id))}
                              aria-label="Excluir lançamento"
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-xl overflow-hidden border border-[#d9eeee] shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#e7f6f6] bg-gradient-to-r from-[#fbffff] to-[#f4fcfc]">
              <div>
                <CardTitle className="text-[#239d9a]">Detalhes do débito</CardTitle>
                <CardDescription>Informações completas do lançamento.</CardDescription>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setDetailRecord(null)}
                className="rounded-full hover:bg-[#eefafa]"
              >
                <X size={20} />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2 rounded-2xl border border-[#e7f6f6] bg-[#fbffff] p-4 text-sm">
                <div>
                  <span className="font-semibold text-slate-700">Descrição:</span>{" "}
                  <span className="text-slate-600">{detailRecord.description || "-"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Valor:</span>{" "}
                  <span className="text-slate-600">{formatCurrency(detailRecord.amount)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Já pago:</span>{" "}
                  <span className="text-slate-600">{formatCurrency(detailRecord.paid_amount)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Falta pagar:</span>{" "}
                  <span className="text-slate-600">
                    {formatCurrency(
                      Math.max(
                        0,
                        parseMoney(detailRecord.amount) - parseMoney(detailRecord.paid_amount)
                      )
                    )}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Status:</span>{" "}
                  <span className="text-slate-600">{labelStatus(detailRecord.status)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Parcela:</span>{" "}
                  <span className="text-slate-600">
                    {detailRecord.installment_number || 1}/{detailRecord.installments || 1}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Forma de pagamento:</span>{" "}
                  <span className="text-slate-600">{labelFormaPagamento(detailRecord.payment_method)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Recibo:</span>{" "}
                  <span className="text-slate-600">{labelRecibo(detailRecord.receipt_type)}</span>
                </div>
              </div>

              {(transactionsByRecord[detailRecord.id] || []).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-[#239d9a]">Histórico de pagamentos</h3>
                  <div className="space-y-2">
                    {(transactionsByRecord[detailRecord.id] || []).map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-xl border border-[#e7f6f6] bg-[#fbffff] px-3 py-2 text-sm"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="text-slate-700">
                            <strong>{formatCurrency(Number(tx.amount || 0))}</strong> em{" "}
                            {tx.received_at
                              ? new Date(tx.received_at).toLocaleDateString("pt-BR")
                              : "-"}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-500">
                              {labelFormaPagamento(tx.payment_method)} • {labelRecibo(tx.receipt_type)}
                            </span>

                            <button
                              type="button"
                              onClick={() => openEditPaymentModal(tx)}
                              className="rounded-lg border border-[#d9eeee] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#239d9a] hover:bg-[#eefafa]"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                        {tx.note && <div className="mt-1 text-slate-500">Obs.: {tx.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isReceberOpen && receberTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg overflow-hidden border border-[#d9eeee] shadow-xl animate-in zoom-in-95 duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#e7f6f6] bg-gradient-to-r from-[#fbffff] to-[#f4fcfc]">
              <div>
                <CardTitle className="text-[#239d9a]">Registrar pagamento</CardTitle>
                <CardDescription>Defina valor, forma de pagamento e recibo.</CardDescription>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsReceberOpen(false)}
                className="rounded-full hover:bg-[#eefafa]"
              >
                <X size={20} />
              </Button>
            </CardHeader>

            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2 rounded-2xl border border-[#e7f6f6] bg-[#fbffff] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Lançamento
                </p>
                <p className="font-semibold text-slate-800">
                  {receberTarget.installments && receberTarget.installments > 1
                    ? `Parcela ${receberTarget.installment_number || 1}/${receberTarget.installments}`
                    : "Débito"}
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Valor total
                </p>
                <p className="text-xl font-semibold text-emerald-600">
                  {formatCurrency(receberTarget.amount)}
                </p>
                <p className="text-sm font-medium text-slate-500">
                  Já pago: {formatCurrency(receberTarget.paid_amount)} • Saldo:{" "}
                  {formatCurrency(
                    parseMoney(receberTarget.amount) - parseMoney(receberTarget.paid_amount)
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Valor recebido agora
                </label>
                <Input
                  value={receberValor}
                  onChange={(e) => setReceberValor(e.target.value)}
                  className="rounded-xl border-[#d9eeee] bg-[#fbffff]"
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Forma de pagamento
                </label>
                <select
                  className="flex h-10 w-full rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#b6e3e2]"
                  value={receberFormaPagamento}
                  onChange={(e) => setReceberFormaPagamento(e.target.value)}
                >
                  <option value="Pix">Pix</option>
                  <option value="Cartão crédito">Cartão crédito</option>
                  <option value="Cartão débito">Cartão débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Tipo de recibo
                </label>
                <select
                  className="flex h-10 w-full rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#b6e3e2]"
                  value={receberRecibo}
                  onChange={(e) => setReceberRecibo(e.target.value)}
                >
                  <option value="nenhum">Sem recibo</option>
                  <option value="simples">Recibo simples</option>
                  <option value="imposto_renda">Recibo IR</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Observação
                </label>
                <Input
                  value={receberObservacao}
                  onChange={(e) => setReceberObservacao(e.target.value)}
                  className="rounded-xl border-[#d9eeee] bg-[#fbffff]"
                  placeholder="Observação do pagamento"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-[#d9eeee] font-semibold text-slate-700"
                  onClick={() => setIsReceberOpen(false)}
                  disabled={receberSaving}
                >
                  Voltar
                </Button>

                <Button
                  type="button"
                  className="h-10 rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#77d0cf] font-semibold text-white hover:from-[#18a6a2] hover:to-[#67c8c7]"
                  onClick={handleReceberConfirmar}
                  disabled={receberSaving}
                >
                  {receberSaving ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isEditPaymentOpen && editingPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg overflow-hidden border border-[#d9eeee] shadow-xl animate-in zoom-in-95 duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#e7f6f6] bg-gradient-to-r from-[#fbffff] to-[#f4fcfc]">
              <div>
                <CardTitle className="text-[#239d9a]">Editar pagamento recebido</CardTitle>
                <CardDescription>Altere valor, data, forma de pagamento e recibo.</CardDescription>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeEditPaymentModal}
                className="rounded-full hover:bg-[#eefafa]"
                disabled={editPaymentSaving}
              >
                <X size={20} />
              </Button>
            </CardHeader>

            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2 rounded-2xl border border-[#e7f6f6] bg-[#fbffff] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Pagamento selecionado
                </p>
                <p className="text-xl font-semibold text-[#239d9a]">
                  {formatCurrency(editingPayment.amount)}
                </p>
                <p className="text-sm font-medium text-slate-500">
                  {editingPayment.received_at
                    ? new Date(editingPayment.received_at).toLocaleDateString("pt-BR")
                    : "Sem data"}
                  {" • "}
                  {labelFormaPagamento(editingPayment.payment_method)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Valor recebido
                  </label>
                  <Input
                    value={editPaymentAmount}
                    onChange={(e) => setEditPaymentAmount(e.target.value)}
                    className="rounded-xl border-[#d9eeee] bg-[#fbffff]"
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Data do recebimento
                  </label>
                  <Input
                    type="date"
                    value={editReceivedAt}
                    onChange={(e) => setEditReceivedAt(e.target.value)}
                    className="rounded-xl border-[#d9eeee] bg-[#fbffff]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Forma de pagamento
                </label>
                <select
                  className="flex h-10 w-full rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#b6e3e2]"
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                >
                  <option value="Pix">Pix</option>
                  <option value="Cartão crédito">Cartão crédito</option>
                  <option value="Cartão débito">Cartão débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Tipo de recibo
                </label>
                <select
                  className="flex h-10 w-full rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#b6e3e2]"
                  value={editReceiptType}
                  onChange={(e) => setEditReceiptType(e.target.value)}
                >
                  <option value="nenhum">Sem recibo</option>
                  <option value="simples">Recibo simples</option>
                  <option value="imposto_renda">Recibo IR</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Observação
                </label>
                <Input
                  value={editPaymentNote}
                  onChange={(e) => setEditPaymentNote(e.target.value)}
                  className="rounded-xl border-[#d9eeee] bg-[#fbffff]"
                  placeholder="Observação do pagamento"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-[#d9eeee] font-semibold text-slate-700"
                  onClick={closeEditPaymentModal}
                  disabled={editPaymentSaving}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  className="h-10 rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#77d0cf] font-semibold text-white hover:from-[#18a6a2] hover:to-[#67c8c7]"
                  onClick={handleEditPaymentConfirmar}
                  disabled={editPaymentSaving}
                >
                  {editPaymentSaving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}