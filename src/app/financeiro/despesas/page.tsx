"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trash2, CheckCircle } from "lucide-react";

type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  payment_date?: string | null;
  status: string;
  created_at?: string | null;
};

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState({
    description: "",
    category: "",
    amount: "",
    payment_date: "",
  });

  async function loadExpenses() {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    setExpenses(data || []);
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function handleSubmit(e: any) {
    e.preventDefault();

    if (!form.description || !form.amount) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    await supabase.from("expenses").insert({
      description: form.description,
      category: form.category,
      amount: Number(form.amount),
      payment_date: form.payment_date,
      status: "pendente",
    });

    setForm({
      description: "",
      category: "",
      amount: "",
      payment_date: "",
    });

    loadExpenses();
  }

  async function markAsPaid(expense: Expense) {
    await supabase
      .from("expenses")
      .update({
        status: "pago",
        payment_date: expense.payment_date || new Date().toISOString().slice(0, 10),
      })
      .eq("id", expense.id);

    loadExpenses();
  }

  async function deleteExpense(id: string) {
    const confirmDelete = confirm("Deseja excluir essa despesa?");
    if (!confirmDelete) return;

    await supabase.from("expenses").delete().eq("id", id);
    loadExpenses();
  }

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const totalPendente = expenses
    .filter((expense) => expense.status !== "pago")
    .reduce((acc, expense) => acc + Number(expense.amount || 0), 0);

  const totalPago = expenses
    .filter((expense) => expense.status === "pago")
    .reduce((acc, expense) => acc + Number(expense.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f7ffff] p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER PREMIUM */}
        <div className="rounded-3xl border border-[#b6e3e2] bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#88d4d3] px-6 py-3 shadow-md">
          <div>
            <h1 className="text-xl font-black text-white md:text-2xl">
              Despesas da Clínica
            </h1>
            <p className="mt-0.5 text-xs font-medium text-cyan-50 opacity-90">
              Controle completo de gastos integrado ao financeiro geral e ao dashboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Despesas pendentes
            </div>
            <div className="mt-2 text-2xl font-black text-rose-600">
              {formatCurrency(totalPendente)}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Despesas pagas
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600">
              {formatCurrency(totalPago)}
            </div>
          </div>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#d9eeee] rounded-2xl p-5 space-y-4 shadow-sm"
        >
          <div className="grid md:grid-cols-4 gap-3">
            <input
              placeholder="Descrição"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="border p-3 rounded-xl"
            />

            <input
              placeholder="Categoria"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
              className="border p-3 rounded-xl"
            />

            <input
              type="number"
              placeholder="Valor"
              value={form.amount}
              onChange={(e) =>
                setForm({ ...form, amount: e.target.value })
              }
              className="border p-3 rounded-xl"
            />

            <input
              type="date"
              value={form.payment_date}
              onChange={(e) =>
                setForm({ ...form, payment_date: e.target.value })
              }
              className="border p-3 rounded-xl"
            />
          </div>

          <button className="bg-[#239d9a] text-white px-5 py-2 rounded-xl font-bold hover:bg-[#1e8c8a]">
            Adicionar despesa
          </button>
        </form>

        {/* LISTA */}
        <div className="bg-white border border-[#d9eeee] rounded-2xl p-5 shadow-sm">
          <h2 className="font-black text-slate-700 mb-4">
            Lista de despesas
          </h2>

          {expenses.length === 0 && (
            <p className="text-slate-400 text-sm">
              Nenhuma despesa cadastrada.
            </p>
          )}

          <div className="space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between border border-[#eefafa] rounded-xl p-3"
              >
                <div>
                  <div className="font-bold text-slate-800">
                    {expense.description}
                  </div>
                  <div className="text-sm text-slate-500">
                    {expense.category} •{" "}
                    {expense.payment_date || "Sem data"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="font-black text-[#239d9a]">
                    {formatCurrency(expense.amount)}
                  </div>

                  {expense.status !== "pago" && (
                    <button
                      onClick={() => markAsPaid(expense)}
                      className="text-green-600"
                    >
                      <CheckCircle size={20} />
                    </button>
                  )}

                  <button
                    onClick={() => deleteExpense(expense.id)}
                    className="text-red-500"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}