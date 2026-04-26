"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CreditCard,
  Download,
  FileText,
  Printer,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabaseNoSchemaCache } from "@/lib/supabase";

type PeriodFilter =
  | "hoje"
  | "semana"
  | "mes"
  | "mes_passado"
  | "ultimos_30"
  | "ano"
  | "custom";

type FinancialRecord = {
  id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  receipt_type?: string | null;
  description?: string | null;
  type?: string | null;
};

type PaymentTransaction = {
  id: string;
  financial_record_id: string;
  patient_id?: string | null;
  amount?: number | string | null;
  payment_method?: string | null;
  receipt_type?: string | null;
  received_at?: string | null;
  created_at?: string | null;
};

type Patient = {
  id: string;
  name?: string | null;
};

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

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
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
      return "Não informado";
  }
}

function receiptLabel(value?: string | null) {
  if (value === "simples") return "Recibo simples";
  if (value === "imposto_renda") return "Recibo IR";
  return "Sem recibo";
}

export default function RelatoriosPage() {
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(
    []
  );
  const [paymentTransactions, setPaymentTransactions] = useState<
    PaymentTransaction[]
  >([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [period, setPeriod] = useState<PeriodFilter>("mes");
  const [startDate, setStartDate] = useState(
    toInputDate(new Date(today.getFullYear(), today.getMonth(), 1))
  );
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [{ data: financial }, { data: payments }, { data: patientsData }] =
          await Promise.all([
            supabaseNoSchemaCache
              .from("financial_records")
              .select("*")
              .order("created_at", { ascending: false }),
            supabaseNoSchemaCache
              .from("payment_transactions")
              .select("*")
              .order("received_at", { ascending: false }),
            supabaseNoSchemaCache
              .from("patients")
              .select("id, name")
              .order("name", { ascending: true }),
          ]);

        setFinancialRecords((financial || []) as FinancialRecord[]);
        setPaymentTransactions((payments || []) as PaymentTransaction[]);
        setPatients((patientsData || []) as Patient[]);
      } catch (error: any) {
        alert("Erro ao carregar relatórios: " + error.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const patientNameById = useMemo(() => {
    return new Map(patients.map((patient) => [patient.id, patient.name || "Paciente"]));
  }, [patients]);

  const getPeriodRange = (selected: PeriodFilter) => {
    const now = new Date();

    if (selected === "hoje") {
      return { start: startOfDay(now), end: endOfDay(now) };
    }

    if (selected === "semana") {
      const start = startOfWeek(now);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end: endOfDay(end) };
    }

    if (selected === "mes") {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    }

    if (selected === "mes_passado") {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    }

    if (selected === "ultimos_30") {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { start: startOfDay(start), end: endOfDay(now) };
    }

    if (selected === "ano") {
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: endOfDay(new Date(now.getFullYear(), 11, 31)),
      };
    }

    return {
      start: new Date(`${startDate}T00:00:00`),
      end: new Date(`${endDate}T23:59:59`),
    };
  };

  const applyPeriod = (selected: PeriodFilter) => {
    setPeriod(selected);

    if (selected !== "custom") {
      const range = getPeriodRange(selected);
      setStartDate(toInputDate(range.start));
      setEndDate(toInputDate(range.end));
    }
  };

  const withinPeriod = (dateString?: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return false;

    const { start, end } = getPeriodRange(period);
    return date >= start && date <= end;
  };

  const filteredPayments = useMemo(() => {
    return paymentTransactions.filter((payment) =>
      withinPeriod(payment.received_at || payment.created_at)
    );
  }, [paymentTransactions, period, startDate, endDate]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return financialRecords.filter((record) => {
      const createdInPeriod = withinPeriod(record.created_at || record.paid_at);
      const paidInPeriod = record.paid_at ? withinPeriod(record.paid_at) : false;

      if (!createdInPeriod && !paidInPeriod) return false;

      if (!term) return true;

      const patientName = record.patient_id
        ? patientNameById.get(record.patient_id) || ""
        : "";

      const searchable = [
        patientName,
        record.description || "",
        record.status || "",
        record.payment_method || "",
        record.receipt_type || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [financialRecords, period, startDate, endDate, search, patientNameById]);

  const summary = useMemo(() => {
    const recebido = filteredPayments.reduce(
      (acc, payment) => acc + parseMoney(payment.amount),
      0
    );

    const lancado = filteredRecords.reduce(
      (acc, record) => acc + parseMoney(record.amount),
      0
    );

    const aReceber = filteredRecords.reduce((acc, record) => {
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      return acc + Math.max(0, amount - paid);
    }, 0);

    const recibos = filteredRecords.filter(
      (record) => record.receipt_type && record.receipt_type !== "nenhum"
    ).length;

    const pagos = filteredRecords.filter((record) => record.status === "pago").length;
    const pendentes = filteredRecords.filter((record) => record.status !== "pago")
      .length;

    const ticketMedio =
      filteredPayments.length > 0 ? recebido / filteredPayments.length : 0;

    return {
      recebido,
      lancado,
      aReceber,
      recibos,
      pagos,
      pendentes,
      ticketMedio,
    };
  }, [filteredPayments, filteredRecords]);

  const monthlyChart = useMemo(() => {
    const grouped: Record<string, number> = {};

    filteredPayments.forEach((payment) => {
      const date = payment.received_at || payment.created_at;
      if (!date) return;

      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) return;

      const key = parsed.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });

      grouped[key] = (grouped[key] || 0) + parseMoney(payment.amount);
    });

    return Object.entries(grouped).map(([name, amount]) => ({ name, amount }));
  }, [filteredPayments]);

  const paymentMethodChart = useMemo(() => {
    const grouped: Record<string, number> = {};

    filteredPayments.forEach((payment) => {
      const method = paymentMethodLabel(payment.payment_method);
      grouped[method] = (grouped[method] || 0) + parseMoney(payment.amount);
    });

    return Object.entries(grouped)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredPayments]);

  const patientRanking = useMemo(() => {
    const grouped: Record<string, number> = {};

    filteredPayments.forEach((payment) => {
      if (!payment.patient_id) return;
      grouped[payment.patient_id] =
        (grouped[payment.patient_id] || 0) + parseMoney(payment.amount);
    });

    return Object.entries(grouped)
      .map(([patientId, amount]) => ({
        patientId,
        name: patientNameById.get(patientId) || "Paciente",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredPayments, patientNameById]);

  const openBalances = useMemo(() => {
    return filteredRecords
      .map((record) => {
        const amount = parseMoney(record.amount);
        const paid = parseMoney(record.paid_amount);
        return {
          ...record,
          patientName: record.patient_id
            ? patientNameById.get(record.patient_id) || "Paciente"
            : "Paciente",
          balance: Math.max(0, amount - paid),
        };
      })
      .filter((record) => record.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);
  }, [filteredRecords, patientNameById]);

  const exportCsv = () => {
    const header = [
      "Paciente",
      "Descricao",
      "Valor",
      "Pago",
      "Saldo",
      "Status",
      "Forma de pagamento",
      "Recibo",
      "Data",
    ];

    const rows = filteredRecords.map((record) => {
      const amount = parseMoney(record.amount);
      const paid = parseMoney(record.paid_amount);
      const balance = Math.max(0, amount - paid);

      return [
        record.patient_id ? patientNameById.get(record.patient_id) || "Paciente" : "Paciente",
        record.description || "",
        String(amount).replace(".", ","),
        String(paid).replace(".", ","),
        String(balance).replace(".", ","),
        record.status || "pendente",
        paymentMethodLabel(record.payment_method),
        receiptLabel(record.receipt_type),
        record.created_at
          ? new Date(record.created_at).toLocaleDateString("pt-BR")
          : "",
      ];
    });

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-financeiro-${startDate}-a-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const cards = [
    {
      title: "Recebido",
      value: formatCurrency(summary.recebido),
      icon: TrendingUp,
      className: "text-emerald-700 bg-emerald-50 border-emerald-100",
    },
    {
      title: "A receber",
      value: formatCurrency(summary.aReceber),
      icon: AlertCircle,
      className: "text-amber-700 bg-amber-50 border-amber-100",
    },
    {
      title: "Lançado",
      value: formatCurrency(summary.lancado),
      icon: Wallet,
      className: "text-[#239d9a] bg-[#eefafa] border-[#d9eeee]",
    },
    {
      title: "Ticket médio",
      value: formatCurrency(summary.ticketMedio),
      icon: CreditCard,
      className: "text-purple-700 bg-purple-50 border-purple-100",
    },
    {
      title: "Pendentes",
      value: String(summary.pendentes),
      icon: FileText,
      className: "text-rose-700 bg-rose-50 border-rose-100",
    },
    {
      title: "Recibos",
      value: String(summary.recibos),
      icon: FileText,
      className: "text-cyan-700 bg-cyan-50 border-cyan-100",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-6">
        <div className="rounded-3xl bg-white border border-[#d9eeee] p-8 text-slate-500">
          Carregando relatórios...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-6">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-table {
            font-size: 11px;
          }

          .print-header {
            display: block !important;
          }
        }
      `}</style>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        <div className="print-header hidden bg-white border-b border-slate-200 pb-4 mb-4">
          <h1 className="text-2xl font-black text-slate-900">
            Relatório Financeiro - Consultório Odontológico
          </h1>
          <p className="text-sm text-slate-600">
            Período: {new Date(`${startDate}T12:00:00`).toLocaleDateString("pt-BR")} até{" "}
            {new Date(`${endDate}T12:00:00`).toLocaleDateString("pt-BR")}
          </p>
          <p className="text-sm text-slate-600">
            Gerado em: {new Date().toLocaleDateString("pt-BR")} às{" "}
            {new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="rounded-3xl border border-[#bde4e3] bg-white shadow-sm overflow-hidden no-print">
          <div className="bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#85d4d2] p-6 md:p-8 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-widest border border-white/20">
                  <BarChart3 size={14} />
                  Relatórios
                </div>

                <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">
                  Relatório financeiro completo
                </h1>

                <p className="mt-2 text-sm md:text-base text-cyan-50 max-w-2xl">
                  Analise recebimentos, saldos em aberto, formas de pagamento,
                  recibos e ranking de pacientes.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={printReport}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/20 border border-white/25 px-5 py-3 text-sm font-black text-white hover:bg-white/25"
                >
                  <Printer size={18} />
                  Gerar PDF
                </button>

                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/20 border border-white/25 px-5 py-3 text-sm font-black text-white hover:bg-white/25"
                >
                  <Download size={18} />
                  Exportar CSV
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                ["hoje", "Hoje"],
                ["semana", "Semana"],
                ["mes", "Mês"],
                ["mes_passado", "Mês passado"],
                ["ultimos_30", "Últimos 30 dias"],
                ["ano", "Ano"],
                ["custom", "Escolher período"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyPeriod(value as PeriodFilter)}
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition ${
                    period === value
                      ? "bg-[#239d9a] text-white"
                      : "bg-[#eefafa] text-[#239d9a] hover:bg-[#def5f4]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {period === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Data inicial
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Data final
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl bg-[#fbffff] border border-[#d9eeee] px-3 py-2 text-sm text-slate-500">
                <CalendarDays size={16} className="text-[#239d9a]" />
                {new Date(`${startDate}T12:00:00`).toLocaleDateString("pt-BR")} até{" "}
                {new Date(`${endDate}T12:00:00`).toLocaleDateString("pt-BR")}
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar paciente, procedimento, status ou recibo..."
                className="h-11 w-full md:max-w-md rounded-xl border border-[#d9eeee] bg-[#fbffff] px-4 text-sm outline-none focus:bg-white focus:border-[#84d5d3]"
              />
            </div>
          </div>
        </div>

        {summary.aReceber > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <AlertCircle size={22} />
              </div>
              <div>
                <div className="font-black text-amber-800">
                  Valores pendentes no período
                </div>
                <div className="text-sm text-amber-700">
                  Total em aberto: {formatCurrency(summary.aReceber)}
                </div>
              </div>
            </div>

            <a
              href="/financeiro"
              className="rounded-xl bg-amber-600 px-4 py-2 text-center text-sm font-black text-white hover:bg-amber-700"
            >
              Abrir financeiro
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {cards.map((card) => (
            <div
              key={card.title}
              className="print-card rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {card.title}
                  </div>
                  <div className="mt-3 text-3xl font-black tracking-tight text-slate-800">
                    {card.value}
                  </div>
                </div>

                <div className={`rounded-2xl border p-3 ${card.className}`}>
                  <card.icon size={22} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="print-card xl:col-span-2 rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-black text-slate-800">
                Recebimentos no período
              </h2>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Evolução de pagamentos
              </p>
            </div>

            <div className="h-[320px] min-h-[320px] min-w-0 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChart}>
                  <defs>
                    <linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1">
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
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#239d9a"
                    strokeWidth={4}
                    fill="url(#reportGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="print-card rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-black text-slate-800">
                Formas de pagamento
              </h2>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Total recebido por método
              </p>
            </div>

            <div className="h-[320px] min-h-[320px] min-w-0 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9eeee" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value || 0)), "Recebido"]}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #d9eeee",
                    }}
                  />
                  <Bar dataKey="amount" radius={[10, 10, 0, 0]}>
                    {paymentMethodChart.map((_, index) => (
                      <Cell key={index} fill="#239d9a" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="print-card rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-black text-slate-800">
                Ranking de pacientes
              </h2>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Maiores receitas no período
              </p>
            </div>

            <div className="space-y-3">
              {patientRanking.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-5 text-center text-sm text-slate-400">
                  Nenhum pagamento no período.
                </div>
              )}

              {patientRanking.map((item, index) => (
                <div
                  key={item.patientId}
                  className="rounded-2xl border border-[#d9eeee] bg-[#fbffff] p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-2xl bg-[#eefafa] text-[#239d9a] flex items-center justify-center font-black">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500">Receita recebida</div>
                    </div>
                  </div>

                  <div className="font-black text-[#239d9a]">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="print-card rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-black text-slate-800">
                Maiores saldos em aberto
              </h2>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Prioridade para cobrança
              </p>
            </div>

            <div className="space-y-3">
              {openBalances.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-5 text-center text-sm text-slate-400">
                  Nenhum saldo em aberto.
                </div>
              )}

              {openBalances.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 truncate">
                        {item.patientName}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {item.description || "Débito financeiro"}
                      </div>
                    </div>
                  </div>

                  <div className="font-black text-amber-700">
                    {formatCurrency(item.balance)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="print-card rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-800">
              Lançamentos do período
            </h2>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Base usada para exportação
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="print-table min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#d9eeee] text-left text-xs uppercase tracking-widest text-slate-400">
                  <th className="py-3 pr-4">Paciente</th>
                  <th className="py-3 pr-4">Descrição</th>
                  <th className="py-3 pr-4">Valor</th>
                  <th className="py-3 pr-4">Pago</th>
                  <th className="py-3 pr-4">Saldo</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Recibo</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => {
                  const amount = parseMoney(record.amount);
                  const paid = parseMoney(record.paid_amount);
                  const balance = Math.max(0, amount - paid);

                  return (
                    <tr key={record.id} className="border-b border-[#edf7f7]">
                      <td className="py-3 pr-4 font-semibold text-slate-800">
                        {record.patient_id
                          ? patientNameById.get(record.patient_id) || "Paciente"
                          : "Paciente"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {record.description || "-"}
                      </td>
                      <td className="py-3 pr-4 font-bold text-slate-700">
                        {formatCurrency(amount)}
                      </td>
                      <td className="py-3 pr-4 font-bold text-emerald-700">
                        {formatCurrency(paid)}
                      </td>
                      <td className="py-3 pr-4 font-bold text-amber-700">
                        {formatCurrency(balance)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-[#eefafa] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#239d9a]">
                          {record.status || "pendente"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {receiptLabel(record.receipt_type)}
                      </td>
                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-sm text-slate-400"
                    >
                      Nenhum lançamento encontrado neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
