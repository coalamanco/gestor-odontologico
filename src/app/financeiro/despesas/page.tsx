"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  Clock,
  Download,
  Edit3,
  Filter,
  PlusCircle,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

type ExpenseStatus = "pendente" | "pago";

type Expense = {
  id: string;
  description: string;
  category?: string | null;
  amount: number | string;
  payment_date?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type PeriodFilter = "todos" | "hoje" | "mes_atual" | "mes_passado" | "proximos_30" | "atrasadas";

const CATEGORIAS_PADRAO = [
  "Aluguel",
  "Fornecedor",
  "Material odontológico",
  "Laboratório",
  "Impostos",
  "Funcionários",
  "Marketing",
  "Manutenção",
  "Equipamentos",
  "Software",
  "Água/Luz/Internet",
  "Outros",
];

const STATUS_OPTIONS: Array<{ value: ExpenseStatus; label: string }> = [
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toDateAtNoon(value?: string | null) {
  if (!value) return null;
  const date = new Date(String(value).includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("mes_atual");
  const [statusFilter, setStatusFilter] = useState<"todos" | ExpenseStatus>("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");

  const [form, setForm] = useState({
    description: "",
    category: "",
    amount: "",
    payment_date: todayIso(),
    status: "pendente" as ExpenseStatus,
  });

  const parseMoney = (value: unknown) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;
    return Number(String(value).replace(",", ".")) || 0;
  };

  const formatCurrency = (value: unknown) => {
    return parseMoney(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDateBr = (value?: string | null) => {
    const date = toDateAtNoon(value);
    if (!date) return "Sem data";
    return date.toLocaleDateString("pt-BR");
  };

  const isPaid = (expense: Expense) => String(expense.status || "").toLowerCase() === "pago";

  const isOverdue = (expense: Expense) => {
    if (isPaid(expense)) return false;
    const dueDate = toDateAtNoon(expense.payment_date);
    if (!dueDate) return false;
    const today = toDateAtNoon(todayIso());
    if (!today) return false;
    return dueDate < today;
  };

  const getExpenseDate = (expense: Expense) => expense.payment_date || expense.created_at || null;

  async function loadExpenses() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExpenses((data || []) as Expense[]);
    } catch (error: any) {
      alert("Erro ao carregar despesas: " + (error?.message || "erro inesperado"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  const categories = useMemo(() => {
    const fromData = expenses
      .map((expense) => String(expense.category || "").trim())
      .filter(Boolean);

    return Array.from(new Set([...CATEGORIAS_PADRAO, ...fromData])).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [expenses]);

  const isWithinPeriod = (expense: Expense) => {
    if (periodFilter === "todos") return true;
    if (periodFilter === "atrasadas") return isOverdue(expense);

    const date = toDateAtNoon(getExpenseDate(expense));
    if (!date) return false;

    const now = new Date();
    const today = toDateAtNoon(todayIso());
    if (!today) return false;

    if (periodFilter === "hoje") {
      return date.toDateString() === today.toDateString();
    }

    if (periodFilter === "mes_atual") {
      return date >= startOfMonth(now) && date <= endOfMonth(now);
    }

    if (periodFilter === "mes_passado") {
      const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date >= startOfMonth(previous) && date <= endOfMonth(previous);
    }

    if (periodFilter === "proximos_30") {
      const limit = new Date(today);
      limit.setDate(limit.getDate() + 30);
      limit.setHours(23, 59, 59, 999);
      return date >= today && date <= limit;
    }

    return true;
  };

  const filteredExpenses = useMemo(() => {
    const term = normalizeText(search);

    return expenses.filter((expense) => {
      if (!isWithinPeriod(expense)) return false;

      if (statusFilter !== "todos") {
        const status = isPaid(expense) ? "pago" : "pendente";
        if (status !== statusFilter) return false;
      }

      if (categoryFilter !== "todos") {
        if (normalizeText(expense.category) !== normalizeText(categoryFilter)) return false;
      }

      if (!term) return true;

      const searchable = [
        expense.description,
        expense.category,
        expense.status,
        expense.amount,
        formatDateBr(expense.payment_date),
      ]
        .join(" ")
        .toLowerCase();

      return normalizeText(searchable).includes(term);
    });
  }, [expenses, search, periodFilter, statusFilter, categoryFilter]);

  const summary = useMemo(() => {
    const total = filteredExpenses.reduce((acc, expense) => acc + parseMoney(expense.amount), 0);
    const paid = filteredExpenses
      .filter((expense) => isPaid(expense))
      .reduce((acc, expense) => acc + parseMoney(expense.amount), 0);
    const pending = filteredExpenses
      .filter((expense) => !isPaid(expense))
      .reduce((acc, expense) => acc + parseMoney(expense.amount), 0);
    const overdue = filteredExpenses
      .filter((expense) => isOverdue(expense))
      .reduce((acc, expense) => acc + parseMoney(expense.amount), 0);

    return { total, paid, pending, overdue };
  }, [filteredExpenses]);

  const categorySummary = useMemo(() => {
    const grouped: Record<string, number> = {};

    for (const expense of filteredExpenses) {
      const category = expense.category?.trim() || "Sem categoria";
      grouped[category] = (grouped[category] || 0) + parseMoney(expense.amount);
    }

    return Object.entries(grouped)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [filteredExpenses]);

  function updateForm(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditingExpense(null);
    setForm({
      description: "",
      category: "",
      amount: "",
      payment_date: todayIso(),
      status: "pendente",
    });
  }

  function startEdit(expense: Expense) {
    setEditingExpense(expense);
    setForm({
      description: expense.description || "",
      category: expense.category || "",
      amount: String(parseMoney(expense.amount).toFixed(2)),
      payment_date: expense.payment_date ? String(expense.payment_date).slice(0, 10) : todayIso(),
      status: isPaid(expense) ? "pago" : "pendente",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const amount = parseMoney(form.amount);

    if (!form.description.trim()) {
      alert("Informe a descrição da despesa.");
      return;
    }

    if (amount <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        description: form.description.trim(),
        category: form.category.trim() || "Outros",
        amount,
        payment_date: form.payment_date || null,
        status: form.status,
      };

      const query = editingExpense?.id
        ? supabase.from("expenses").update(payload).eq("id", editingExpense.id)
        : supabase.from("expenses").insert(payload);

      const { error } = await query;
      if (error) throw error;

      resetForm();
      await loadExpenses();
    } catch (error: any) {
      alert("Erro ao salvar despesa: " + (error?.message || "erro inesperado"));
    } finally {
      setSaving(false);
    }
  }

  async function markAsPaid(expense: Expense) {
    const { error } = await supabase
      .from("expenses")
      .update({
        status: "pago",
        payment_date: expense.payment_date || todayIso(),
      })
      .eq("id", expense.id);

    if (error) {
      alert("Erro ao marcar como pago: " + error.message);
      return;
    }

    await loadExpenses();
  }

  async function markAsPending(expense: Expense) {
    const { error } = await supabase
      .from("expenses")
      .update({ status: "pendente" })
      .eq("id", expense.id);

    if (error) {
      alert("Erro ao reabrir despesa: " + error.message);
      return;
    }

    await loadExpenses();
  }

  async function deleteExpense(id: string) {
    const confirmDelete = confirm("Deseja excluir essa despesa? Essa ação não pode ser desfeita.");
    if (!confirmDelete) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      alert("Erro ao excluir despesa: " + error.message);
      return;
    }

    if (editingExpense?.id === id) resetForm();
    await loadExpenses();
  }

  function exportCsv() {
    try {
      const rows = filteredExpenses.map((expense) => ({
        Descricao: expense.description || "",
        Categoria: expense.category || "",
        Valor: parseMoney(expense.amount).toFixed(2).replace(".", ","),
        Data: formatDateBr(expense.payment_date),
        Status: isPaid(expense) ? "Pago" : "Pendente",
      }));

      const headers = Object.keys(rows[0] || {
        Descricao: "",
        Categoria: "",
        Valor: "",
        Data: "",
        Status: "",
      });

      const csv = [
        headers.join(";"),
        ...rows.map((row: any) =>
          headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(";"),
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `despesas-${todayIso()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao exportar despesas.");
    }
  }

  const periodLabel = {
    todos: "Todos os períodos",
    hoje: "Hoje",
    mes_atual: "Mês atual",
    mes_passado: "Mês passado",
    proximos_30: "Próximos 30 dias",
    atrasadas: "Atrasadas",
  }[periodFilter];

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-[#f7ffff] via-[#f2fcfc] to-[#eef8f8] p-3 pb-28 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-[#b6e3e2] bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#88d4d3] p-5 shadow-lg shadow-cyan-900/10 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-50/90">
                financeiro da clínica
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">
                Despesas
              </h1>
              <p className="mt-1 max-w-2xl text-sm font-medium text-cyan-50/95">
                Controle de contas da clínica, categorias, vencimentos e pagamentos integrados ao financeiro geral.
              </p>
            </div>

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/95 px-4 text-sm font-black text-[#239d9a] shadow-sm hover:bg-white"
            >
              <Download size={17} className="mr-2" />
              Exportar CSV
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-[#d9eeee] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total filtrado</p>
              <Wallet size={19} className="text-[#239d9a]" />
            </div>
            <div className="mt-3 text-2xl font-black text-slate-800">{formatCurrency(summary.total)}</div>
            <p className="mt-1 text-xs font-semibold text-slate-400">{periodLabel}</p>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pendentes</p>
              <Clock size={19} className="text-rose-600" />
            </div>
            <div className="mt-3 text-2xl font-black text-rose-600">{formatCurrency(summary.pending)}</div>
            <p className="mt-1 text-xs font-semibold text-slate-400">A pagar</p>
          </div>

          <div className="rounded-3xl border border-red-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Atrasadas</p>
              <AlertTriangle size={19} className="text-red-600" />
            </div>
            <div className="mt-3 text-2xl font-black text-red-600">{formatCurrency(summary.overdue)}</div>
            <p className="mt-1 text-xs font-semibold text-slate-400">Exige atenção</p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pagas</p>
              <CheckCircle size={19} className="text-emerald-600" />
            </div>
            <div className="mt-3 text-2xl font-black text-emerald-600">{formatCurrency(summary.paid)}</div>
            <p className="mt-1 text-xs font-semibold text-slate-400">Baixadas</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <form onSubmit={handleSubmit} className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    {editingExpense ? "Editar despesa" : "Nova despesa"}
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Lance contas fixas, fornecedores, materiais e pagamentos administrativos.
                  </p>
                </div>

                {editingExpense && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 hover:bg-slate-50"
                  >
                    <X size={16} className="mr-2" />
                    Cancelar edição
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição *</label>
                  <input
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Ex.: Laboratório, aluguel, material..."
                    className="h-11 w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#239d9a] focus:bg-white"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Categoria</label>
                  <input
                    value={form.category}
                    onChange={(e) => updateForm("category", e.target.value)}
                    placeholder="Categoria"
                    list="expense-categories"
                    className="h-11 w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#239d9a] focus:bg-white"
                  />
                  <datalist id="expense-categories">
                    {categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Valor *</label>
                  <input
                    value={form.amount}
                    onChange={(e) => updateForm("amount", e.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="h-11 w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#239d9a] focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Data</label>
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => updateForm("payment_date", e.target.value)}
                    className="h-11 w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#239d9a] focus:bg-white"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => updateForm("status", e.target.value)}
                    className="h-11 w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-2 text-xs font-black text-slate-700 outline-none focus:border-[#239d9a] focus:bg-white"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#239d9a] px-5 text-sm font-black text-white shadow-sm hover:bg-[#1e8c8a] disabled:opacity-60"
                >
                  <PlusCircle size={17} className="mr-2" />
                  {saving ? "Salvando..." : editingExpense ? "Salvar edição" : "Adicionar despesa"}
                </button>
              </div>
            </form>

            <section className="rounded-3xl border border-[#d9eeee] bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-800">Lista de despesas</h2>
                  <p className="text-sm font-medium text-slate-500">{filteredExpenses.length} lançamento(s) encontrado(s).</p>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-4 xl:min-w-[720px]">
                  <div className="relative md:col-span-1">
                    <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="h-11 w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#239d9a] focus:bg-white"
                    />
                  </div>

                  <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                    className="h-11 rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 text-sm font-bold text-slate-700 outline-none"
                  >
                    <option value="todos">Todos os períodos</option>
                    <option value="hoje">Hoje</option>
                    <option value="mes_atual">Mês atual</option>
                    <option value="mes_passado">Mês passado</option>
                    <option value="proximos_30">Próximos 30 dias</option>
                    <option value="atrasadas">Atrasadas</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "todos" | ExpenseStatus)}
                    className="h-11 rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 text-sm font-bold text-slate-700 outline-none"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="pendente">Pendentes</option>
                    <option value="pago">Pagas</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-11 rounded-2xl border border-[#d9eeee] bg-[#fbffff] px-3 text-sm font-bold text-slate-700 outline-none"
                  >
                    <option value="todos">Todas categorias</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-[#eefafa] bg-[#fbffff] p-6 text-center text-sm font-bold text-slate-400">
                  Carregando despesas...
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#cfe8e8] bg-[#fbffff] p-8 text-center">
                  <Filter size={26} className="mx-auto text-[#239d9a]" />
                  <p className="mt-3 text-sm font-bold text-slate-500">Nenhuma despesa encontrada para os filtros atuais.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredExpenses.map((expense) => (
                    <article
                      key={expense.id}
                      className={`rounded-2xl border p-4 transition hover:shadow-sm ${
                        isOverdue(expense)
                          ? "border-red-200 bg-red-50/60"
                          : isPaid(expense)
                            ? "border-emerald-100 bg-white"
                            : "border-[#e5f3f3] bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-black text-slate-800">{expense.description}</h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                                isPaid(expense)
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : isOverdue(expense)
                                    ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                                    : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                              }`}
                            >
                              {isPaid(expense) ? "Pago" : isOverdue(expense) ? "Atrasada" : "Pendente"}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                            <span>{expense.category || "Sem categoria"}</span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays size={13} />
                              {formatDateBr(expense.payment_date)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
                          <div className="text-left sm:text-right">
                            <div className="text-lg font-black text-[#239d9a]">{formatCurrency(expense.amount)}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {isPaid(expense) ? "Despesa paga" : "A pagar"}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {!isPaid(expense) ? (
                              <button
                                type="button"
                                onClick={() => markAsPaid(expense)}
                                className="inline-flex h-9 items-center rounded-xl bg-emerald-50 px-3 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                              >
                                <CheckCircle size={15} className="mr-1.5" />
                                Pagar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => markAsPending(expense)}
                                className="inline-flex h-9 items-center rounded-xl bg-slate-50 px-3 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                              >
                                Reabrir
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => startEdit(expense)}
                              className="inline-flex h-9 items-center rounded-xl bg-[#eefafa] px-3 text-xs font-black text-[#239d9a] ring-1 ring-[#d9eeee] hover:bg-[#dff3f2]"
                            >
                              <Edit3 size={15} className="mr-1.5" />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteExpense(expense.id)}
                              className="inline-flex h-9 items-center rounded-xl bg-red-50 px-3 text-xs font-black text-red-600 ring-1 ring-red-100 hover:bg-red-100"
                            >
                              <Trash2 size={15} className="mr-1.5" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-800">Categorias principais</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Maiores centros de custo no filtro atual.</p>

              <div className="mt-4 space-y-3">
                {categorySummary.length === 0 ? (
                  <p className="rounded-2xl bg-[#fbffff] p-4 text-sm font-bold text-slate-400">Sem despesas no período.</p>
                ) : (
                  categorySummary.map((item) => {
                    const percent = summary.total > 0 ? Math.round((item.total / summary.total) * 100) : 0;
                    return (
                      <div key={item.category}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-bold text-slate-700">{item.category}</span>
                          <span className="font-black text-[#239d9a]">{formatCurrency(item.total)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#eefafa]">
                          <div className="h-full rounded-full bg-[#239d9a]" style={{ width: `${Math.max(6, percent)}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
              <h2 className="text-base font-black text-amber-900">Dica financeira</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-amber-800">
                Use categorias padronizadas para o dashboard mostrar melhor onde a clínica está gastando mais. Para contas fixas, cadastre com a data prevista de pagamento.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
