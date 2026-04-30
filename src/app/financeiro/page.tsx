"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabaseNoSchemaCache } from "@/lib/supabase";
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
    Array<{ patient_id: string; name: string; total: number; paid: number; balance: number }>
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
  const [periodoMenuOpen, setPeriodoMenuOpen] = useState(false);

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
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (v === "parcial") {
      return "bg-amber-50 text-amber-800 border border-amber-200";
    }
    if (v === "atrasado" || v === "em_atraso") {
      return "bg-red-50 text-red-700 border border-red-200";
    }
    if (v === "pendente" || v === "pending") {
      return "bg-rose-50 text-rose-700 border border-rose-200";
    }
    return "bg-slate-100 text-slate-700 border border-slate-200";
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
    if (record.due_date) return record.due_date;

    if (!record.created_at) return null;

    const baseDate = getDateAtNoon(record.created_at);
    if (!baseDate) return record.created_at;

    const installmentNumber = Math.max(1, Number(record.installment_number || 1));
    baseDate.setMonth(baseDate.getMonth() + installmentNumber - 1);

    return baseDate.toISOString().slice(0, 10);
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
    const total = parseMoney(record.amount);
    const paid = parseMoney(record.paid_amount);
    const balance = Math.max(0, total - paid);

    if (balance <= 0 || record.status === "pago") return false;

    const dueDate = getDateAtNoon(getFinancialDueDate(record));
    if (!dueDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dueDate < today;
  };

  const getDaysOverdue = (record: FinancialRecord) => {
    if (!isFinancialOverdue(record)) return 0;

    const dueDate = getDateAtNoon(getFinancialDueDate(record));
    if (!dueDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Math.max(
      0,
      Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );
  };

  const getVisualFinancialStatus = (record: FinancialRecord) => {
    const total = parseMoney(record.amount);
    const paid = parseMoney(record.paid_amount);
    const balance = Math.max(0, total - paid);

    if (balance <= 0 || record.status === "pago") return "pago";
    if (isFinancialOverdue(record)) return "em_atraso";
    if (paid > 0 || record.status === "parcial") return "parcial";

    return "pendente";
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

  const receiptBadgeClass = (value: unknown) => {
    const v = String(value ?? "").trim().toLowerCase();

    if (v === "imposto_renda") {
      return "bg-purple-50 text-purple-700 border border-purple-200";
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

    if (!term) return registrosFiltradosBase;

    return registrosFiltradosBase.filter((r) => {
      const patientName = r.patient_id
        ? patientNameById.get(String(r.patient_id)) || ""
        : "";

      const searchable = [
        patientName,
        r.description || "",
        r.status || "",
        r.payment_method || "",
        r.receipt_type || "",
        r.amount || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [registrosFiltradosBase, searchTerm, patientNameById]);

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
      const total = parseMoney(curr.amount);
      const paid = parseMoney(curr.paid_amount);
      return acc + Math.max(0, total - paid);
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
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      return acc + Math.max(0, amount - paid);
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
      .filter((item) => item.balance > 0)
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
        const amount = parseMoney(record.amount);
        const paid = parseMoney(record.paid_amount);
        const balance = Math.max(0, amount - paid);
        const patientName = record.patient_id
          ? patientNameById.get(String(record.patient_id)) || "Paciente"
          : "Paciente";
        const daysOpen = getDaysOverdue(record);
        const visualStatus = getVisualFinancialStatus(record);

        return {
          record,
          patientName,
          balance,
          daysOpen,
          visualStatus,
        };
      })
      .filter((item) => item.balance > 0)
      .sort((a, b) => {
        const aLate = a.visualStatus === "em_atraso" ? 1 : 0;
        const bLate = b.visualStatus === "em_atraso" ? 1 : 0;

        if (aLate !== bLate) return bLate - aLate;
        if (a.daysOpen !== b.daysOpen) return b.daysOpen - a.daysOpen;

        return b.balance - a.balance;
      })
      .slice(0, 8);
  }, [registros, patientNameById]);

  const smartAlerts = useMemo(() => {
    const overduePatients = patientsToCharge.filter(
      (item) => item.visualStatus === "em_atraso"
    );

    const totalOverdue = overduePatients.reduce(
      (acc, item) => acc + item.balance,
      0
    );

    const totalOpen = patientsToCharge.reduce(
      (acc, item) => acc + item.balance,
      0
    );

    const receiptRequested = registros.filter((record) =>
      hasReceipt(record.receipt_type)
    );

    const receiptWithPayment = receiptRequested.filter(
      (record) => parseMoney(record.paid_amount) > 0
    );

    const highDebtPatients = patientsToCharge.filter(
      (item) => item.balance >= 500
    );

    return {
      overduePatients,
      totalOverdue,
      totalOpen,
      receiptRequested,
      receiptWithPayment,
      highDebtPatients,
    };
  }, [patientsToCharge, registros]);

  const buildChargeAllWhatsappHref = () => {
    const total = patientsToCharge.reduce((acc, item) => acc + item.balance, 0);

    const lines = patientsToCharge.map((item, index) => {
      const status =
        item.visualStatus === "em_atraso"
          ? `vencido há ${item.daysOpen} dia(s)`
          : "pendente dentro do prazo";

      return `${index + 1}. ${item.patientName} - ${formatCurrency(
        item.balance
      )} (${status})`;
    });

    const message =
      `Cobrança inteligente - pacientes com saldo em aberto\n\n` +
      lines.join("\n") +
      `\n\nTotal em aberto: ${formatCurrency(total)}\n\n` +
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
      supabaseNoSchemaCache.from("financial_records").select("patient_id, amount, paid_amount"),
    ]);

    if (patientsRes.error || recordsRes.error) {
      setSaldosPorPaciente([]);
      return;
    }

    const patientNameMap = new Map<string, string>();
    for (const p of patientsRes.data ?? []) {
      patientNameMap.set(String((p as any).id), String((p as any).name ?? ""));
    }

    const grouped: Record<string, { total: number; paid: number }> = {};

    for (const r of recordsRes.data ?? []) {
      const patientId = String((r as any).patient_id ?? "");
      if (!patientId) continue;

      const amount = parseMoney((r as any).amount);
      const paid = parseMoney((r as any).paid_amount);

      if (!grouped[patientId]) {
        grouped[patientId] = { total: 0, paid: 0 };
      }

      grouped[patientId].total += amount;
      grouped[patientId].paid += paid;
    }

    const rows = Object.entries(grouped).map(([patient_id, values]) => ({
      patient_id,
      name: patientNameMap.get(patient_id) ?? patient_id,
      total: values.total,
      paid: values.paid,
      balance: Math.max(0, values.total - values.paid),
    }));

    rows.sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, "pt-BR"));
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

  return (
    <div className="h-screen overflow-y-auto space-y-5 bg-gradient-to-br from-[#f7ffff] via-[#f2fcfc] to-[#edf8f8] p-1 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="rounded-3xl border border-[#b6e3e2] bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#88d4d3] px-6 py-6 shadow-lg shadow-cyan-900/10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Financeiro
          </h1>
          <p className="mt-1 text-sm text-cyan-50">
            Controle de débitos, recebimentos e saldo de pacientes.
          </p>
        </div>
      </div>


      <div className="rounded-2xl border border-[#d9eeee] bg-white p-4 shadow-sm overflow-visible">
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
                  className="min-w-[250px] h-11 rounded-xl border border-[#d9eeee] bg-[#fbffff] px-4 text-left text-sm font-medium text-slate-700 flex items-center justify-between hover:bg-white transition"
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
                        className={`w-full px-4 py-3 text-left text-sm transition hover:bg-[#f2fcfc] ${
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

              <div className="text-xs text-slate-500">
                {labelPeriodoAtual()}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 xl:min-w-[460px]">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busque por paciente, procedimento, status ou valor..."
                className="h-11 rounded-xl border-[#d9eeee] bg-[#fbffff]"
              />

              <Button
                type="button"
                onClick={exportFinanceiroExcel}
                className="h-11 rounded-xl bg-[#239d9a] px-4 text-sm font-black text-white hover:bg-[#1f8f8c]"
              >
                <Download size={16} className="mr-2" />
                Exportar Excel
              </Button>

              {searchTerm && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSearchTerm("")}
                  className="h-11 rounded-xl border-[#d9eeee]"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {periodoFiltro === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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



      <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-red-50 p-3 text-red-700">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Alertas inteligentes
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Avisos automáticos para priorizar cobranças e pendências importantes.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#eefafa] px-4 py-3 text-sm font-black text-[#239d9a]">
            {smartAlerts.overduePatients.length +
              smartAlerts.highDebtPatients.length +
              smartAlerts.receiptWithPayment.length} alerta(s)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div
            className={`rounded-2xl border p-4 ${
              smartAlerts.overduePatients.length > 0
                ? "border-red-200 bg-red-50"
                : "border-emerald-100 bg-emerald-50"
            }`}
          >
            <div className="text-sm font-black text-slate-800">
              Débitos com mais de 30 dias
            </div>

            <div
              className={`mt-2 text-2xl font-black ${
                smartAlerts.overduePatients.length > 0
                  ? "text-red-700"
                  : "text-emerald-700"
              }`}
            >
              {smartAlerts.overduePatients.length}
            </div>

            <div className="mt-1 text-xs font-medium text-slate-600">
              Total: {formatCurrency(smartAlerts.totalOverdue)}
            </div>

            {smartAlerts.overduePatients.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("em atraso");
                  setPeriodoFiltro("ultimos_30");
                }}
                className="mt-3 rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-700 border border-red-100 hover:bg-red-100"
              >
                Ver atrasados
              </button>
            )}
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              smartAlerts.highDebtPatients.length > 0
                ? "border-amber-200 bg-amber-50"
                : "border-emerald-100 bg-emerald-50"
            }`}
          >
            <div className="text-sm font-black text-slate-800">
              Dívidas acima de R$ 500
            </div>

            <div
              className={`mt-2 text-2xl font-black ${
                smartAlerts.highDebtPatients.length > 0
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              {smartAlerts.highDebtPatients.length}
            </div>

            <div className="mt-1 text-xs font-medium text-slate-600">
              Prioridade alta para cobrança
            </div>

            {smartAlerts.highDebtPatients.length > 0 && (
              <a
                href={buildChargeAllWhatsappHref()}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-700 border border-amber-100 hover:bg-amber-100"
              >
                Gerar cobrança
              </a>
            )}
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              smartAlerts.receiptWithPayment.length > 0
                ? "border-purple-200 bg-purple-50"
                : "border-emerald-100 bg-emerald-50"
            }`}
          >
            <div className="text-sm font-black text-slate-800">
              Recibos para emitir
            </div>

            <div
              className={`mt-2 text-2xl font-black ${
                smartAlerts.receiptWithPayment.length > 0
                  ? "text-purple-700"
                  : "text-emerald-700"
              }`}
            >
              {smartAlerts.receiptWithPayment.length}
            </div>

            <div className="mt-1 text-xs font-medium text-slate-600">
              Pagamentos com recibo solicitado
            </div>

            {smartAlerts.receiptWithPayment.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchTerm("recibo")}
                className="mt-3 rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-purple-700 border border-purple-100 hover:bg-purple-100"
              >
                Ver recibos
              </button>
            )}
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              smartAlerts.totalOpen > 0
                ? "border-[#bfe8e7] bg-[#f2fcfc]"
                : "border-emerald-100 bg-emerald-50"
            }`}
          >
            <div className="text-sm font-black text-slate-800">
              Total em aberto
            </div>

            <div
              className={`mt-2 text-xl font-black ${
                smartAlerts.totalOpen > 0
                  ? "text-[#239d9a]"
                  : "text-emerald-700"
              }`}
            >
              {formatCurrency(smartAlerts.totalOpen)}
            </div>

            <div className="mt-1 text-xs font-medium text-slate-600">
              {patientsToCharge.length} paciente(s) com saldo
            </div>

            {patientsToCharge.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setPeriodoFiltro("mes_atual");
                }}
                className="mt-3 rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#239d9a] border border-[#bfe8e7] hover:bg-[#eefafa]"
              >
                Ver todos
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-[#fbffff] p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <MessageCircle size={24} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-800">
                Cobrança inteligente
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Lista automática dos principais pacientes com saldo em aberto.
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-3 py-1 font-black text-amber-700 border border-amber-100">
                  {patientsToCharge.length} paciente(s)
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-black text-amber-700 border border-amber-100">
                  Total: {formatCurrency(
                    patientsToCharge.reduce((acc, item) => acc + item.balance, 0)
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1fb36e] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-[#18975d]"
            >
              <MessageCircle size={18} />
              Gerar lista no WhatsApp
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-400"
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
                    ? "border-red-100 bg-red-50"
                    : "border-amber-100 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-800 truncate">
                      {index + 1}. {item.patientName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.visualStatus === "em_atraso"
                        ? `Em atraso há ${item.daysOpen} dia(s)`
                        : `Pendente há ${item.daysOpen} dia(s)`}
                    </div>
                  </div>

                  <div className="text-sm font-black text-amber-700 whitespace-nowrap">
                    {formatCurrency(item.balance)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-[#d5eeee] bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#eefafa] p-3 text-[#28aaa8]">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Total lançado
              </p>
              <p className="text-lg font-black text-slate-800">
                {formatCurrency(summary.totalLancado)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Recebido no período
              </p>
              <p className="text-lg font-black text-emerald-600">
                {formatCurrency(summary.totalRecebido)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                A receber
              </p>
              <p className="text-lg font-black text-amber-700">
                {formatCurrency(summary.totalAReceber)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
              <Trash2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Despesas pagas
              </p>
              <p className="text-lg font-black text-rose-700">
                {formatCurrency(summary.despesasPagas)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
              <PlusCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Saldo real
              </p>
              <p className="text-lg font-black text-sky-700">
                {formatCurrency(summary.saldo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Despesas da clínica
            </h2>
            <p className="text-sm text-slate-500">
              Saídas registradas em Financeiro &gt; Despesas, consideradas no saldo real.
            </p>
          </div>

          <div className="text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-2 rounded-xl">
            Pendentes: {formatCurrency(summary.despesasPendentes)}
          </div>
        </div>

        {despesasFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-5 text-sm text-slate-500">
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
                  <div className="text-xs text-slate-500">
                    {expense.category || "Sem categoria"} • {getExpenseDate(expense) ? new Date(String(getExpenseDate(expense))).toLocaleDateString("pt-BR") : "Sem data"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                      isExpensePaid(expense)
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                    }`}
                  >
                    {isExpensePaid(expense) ? "Pago" : "Pendente"}
                  </span>
                  <span className="font-black text-rose-700">
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
            <h2 className="text-lg font-black text-slate-800">
              Dashboard inteligente
            </h2>
            <p className="text-sm text-slate-500">
              Indicadores rápidos para acompanhar a saúde financeira da clínica.
            </p>
          </div>

          <div className="text-xs font-semibold text-[#239d9a] bg-[#eefafa] px-3 py-2 rounded-xl">
            Atualizado em tempo real
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
              Hoje
            </p>
            <p className="mt-2 text-lg font-black text-emerald-700">
              {formatCurrency(intelligentSummary.recebidoHoje)}
            </p>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
              Este mês
            </p>
            <p className="mt-2 text-lg font-black text-sky-700">
              {formatCurrency(intelligentSummary.recebidoMes)}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
              Em aberto
            </p>
            <p className="mt-2 text-lg font-black text-amber-700">
              {formatCurrency(intelligentSummary.totalEmAberto)}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">
              Inadimplência
            </p>
            <p className="mt-2 text-lg font-black text-rose-700">
              {intelligentSummary.taxaInadimplencia.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-700">
              Ticket médio
            </p>
            <p className="mt-2 text-lg font-black text-purple-700">
              {formatCurrency(intelligentSummary.ticketMedio)}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
              Recibos
            </p>
            <p className="mt-2 text-lg font-black text-cyan-700">
              {intelligentSummary.recibosPendentes}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm xl:col-span-1">
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-800">
              Formas de pagamento
            </h2>
            <p className="text-sm text-slate-500">
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
                  <span className="font-black text-[#239d9a]">
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
            <h2 className="text-base font-black text-slate-800">
              Maiores saldos em aberto
            </h2>
            <p className="text-sm text-slate-500">
              Pacientes com maior valor pendente.
            </p>
          </div>

          <div className="space-y-2">
            {topOpenBalances.length === 0 && (
              <p className="text-sm text-slate-400">
                Nenhum saldo em aberto.
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
                  <div className="text-xs text-slate-500">
                    Pago: {formatCurrency(item.paid)}
                  </div>
                </div>

                <div className="text-sm font-black text-amber-700 whitespace-nowrap">
                  {formatCurrency(item.balance)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm xl:col-span-1">
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-800">
              Controle de recibos
            </h2>
            <p className="text-sm text-slate-500">
              Visão rápida dos recibos solicitados.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                Simples
              </p>
              <p className="mt-2 text-2xl font-black text-cyan-700">
                {receiptSummary.simples}
              </p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-700">
                IR
              </p>
              <p className="mt-2 text-2xl font-black text-purple-700">
                {receiptSummary.impostoRenda}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#edf7f7] bg-[#fbffff] p-3 text-sm text-slate-600">
            Dica: os lançamentos com recibo ficam destacados no histórico financeiro.
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              Pacientes para cobrar
            </h2>
            <p className="text-sm text-slate-500">
              Lista automática baseada nos saldos em aberto. Após 30 dias, o débito aparece como em atraso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-red-700 border border-red-100">
              {patientsToCharge.filter((item) => item.visualStatus === "em_atraso").length} em atraso
            </span>

            {patientsToCharge.length > 0 && (
              <a
                href={buildChargeAllWhatsappHref()}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#1fb36e] px-3 py-2 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#199c5f]"
              >
                Cobrar todos
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {patientsToCharge.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-6 text-center text-sm text-slate-400 xl:col-span-2">
              Nenhum paciente com saldo em aberto.
            </div>
          )}

          {patientsToCharge.map((item) => (
            <div
              key={item.record.id}
              className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                item.visualStatus === "em_atraso"
                  ? "border-red-200 bg-red-50/60"
                  : "border-[#d9eeee] bg-[#fbffff]"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-slate-800 truncate">
                    {item.patientName}
                  </h3>

                  <span
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusBadgeClass(
                      item.visualStatus
                    )}`}
                  >
                    {item.visualStatus === "em_atraso" ? "Em atraso" : "Pendente"}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500 truncate">
                  {item.record.description || "Débito financeiro"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Aberto há {item.daysOpen} dia(s)
                </p>
              </div>

              <div className="flex flex-col md:items-end gap-2">
                <div className="text-base font-black text-[#239d9a]">
                  {formatCurrency(item.balance)}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg border-[#bfe8e7] px-3 text-[10px] font-black uppercase tracking-widest text-[#239d9a] hover:bg-[#f2fcfc]"
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
            <CardTitle className="text-base font-black tracking-tight text-[#239d9a]">
              Saldo devedor por paciente
            </CardTitle>
            <CardDescription className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Total lançado, pago e saldo em aberto
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 max-h-[280px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-[#f7ffff]">
              <TableRow className="h-9 border-none hover:bg-transparent">
                <TableHead className="px-6 text-xs text-slate-500">Paciente</TableHead>
                <TableHead className="text-xs text-slate-500">Total</TableHead>
                <TableHead className="text-xs text-slate-500">Já pagou</TableHead>
                <TableHead className="px-6 text-right text-xs text-slate-500">Falta pagar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saldosPorPaciente.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm font-bold text-slate-400">
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
                    <TableCell className="text-sm font-semibold text-emerald-700">
                      {formatCurrency(r.paid)}
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
              <span className="text-lg font-black tracking-tight">Lançamento</span>
            </CardTitle>
            <CardDescription className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Novo débito financeiro
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pt-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                className="mt-2 h-10 w-full rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#77d0cf] text-xs font-black uppercase tracking-[0.18em] text-white shadow-sm hover:from-[#18a6a2] hover:to-[#67c8c7]"
                disabled={loading}
              >
                {loading ? "Salvando..." : "Confirmar lançamento"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden border border-[#d9eeee] shadow-sm">
          <CardHeader className="border-b border-[#e7f6f6] bg-gradient-to-r from-[#fbffff] to-[#f4fcfc] py-6 px-6">
            <div>
              <CardTitle className="text-lg font-black tracking-tight text-[#239d9a]">
                Histórico financeiro
              </CardTitle>
              <CardDescription className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Débitos e recebimentos do período
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#f7ffff]">
                <TableRow className="h-9 border-none hover:bg-transparent">
                  <TableHead className="px-6 text-xs text-slate-500">Data</TableHead>
                  <TableHead className="text-xs text-slate-500">Paciente</TableHead>
                  <TableHead className="text-xs text-slate-500">Lançamento</TableHead>
                  <TableHead className="text-xs text-slate-500">Pagamento</TableHead>
                  <TableHead className="text-xs text-slate-500">Status</TableHead>
                  <TableHead className="text-right text-xs text-slate-500">Valor</TableHead>
                  <TableHead className="px-6 text-right text-xs text-slate-500">Ações</TableHead>
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
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
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
                        className={`group h-10 border-[#edf7f7] transition-all ${
                          getVisualFinancialStatus(t) === "em_atraso"
                            ? "bg-red-50/50 hover:bg-red-50"
                            : hasReceipt(t.receipt_type)
                              ? "bg-purple-50/40 hover:bg-purple-50/70"
                              : "hover:bg-[#fbffff]"
                        }`}
                      >
                        <TableCell className="px-6 py-2 text-sm font-medium text-slate-700">
                          {getFinancialDueDate(t) ? new Date(`${String(getFinancialDueDate(t)).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "-"}
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
                            <span className="text-xs text-slate-500">
                              {labelFormaPagamento(t.payment_method)}
                            </span>

                            {hasReceipt(t.receipt_type) ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${receiptBadgeClass(
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
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusBadgeClass(
                              getVisualFinancialStatus(t)
                            )}`}
                          >
                            {labelVisualFinancialStatus(t)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right text-sm font-bold text-emerald-700">
                          {formatCurrency(total)}
                        </TableCell>

                        <TableCell className="px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {balance > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-7 rounded-lg border-[#bfe8e7] px-3 text-[10px] font-black uppercase tracking-widest text-[#239d9a] hover:bg-[#f2fcfc]"
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
                              className="rounded-lg border border-[#d9eeee] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#239d9a] hover:bg-[#eefafa]"
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
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Lançamento
                </p>
                <p className="font-semibold text-slate-800">
                  {receberTarget.installments && receberTarget.installments > 1
                    ? `Parcela ${receberTarget.installment_number || 1}/${receberTarget.installments}`
                    : "Débito"}
                </p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Valor total
                </p>
                <p className="text-xl font-black text-emerald-700">
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
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                  className="h-10 rounded-xl border-[#d9eeee] font-black text-slate-700"
                  onClick={() => setIsReceberOpen(false)}
                  disabled={receberSaving}
                >
                  Voltar
                </Button>

                <Button
                  type="button"
                  className="h-10 rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#77d0cf] font-black text-white hover:from-[#18a6a2] hover:to-[#67c8c7]"
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
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Pagamento selecionado
                </p>
                <p className="text-xl font-black text-[#239d9a]">
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
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                  className="h-10 rounded-xl border-[#d9eeee] font-black text-slate-700"
                  onClick={closeEditPaymentModal}
                  disabled={editPaymentSaving}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  className="h-10 rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#77d0cf] font-black text-white hover:from-[#18a6a2] hover:to-[#67c8c7]"
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