"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Users, RefreshCw, AlertTriangle, Download } from "lucide-react";
import * as XLSX from "xlsx";

type Patient = {
  id: string;
  name?: string | null;
  phone?: string | null;
  cpf?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadedAt, setLoadedAt] = useState("");

  const loadPatients = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        setPatients([]);
        setErrorMessage(
          "Você não está logado. Faça login novamente para carregar os pacientes."
        );
        return;
      }

      const { data, error, count } = await supabase
        .from("patients")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })
        .range(0, 2000);

      if (error) {
        throw error;
      }

      setPatients((data || []) as Patient[]);
      setLoadedAt(new Date().toLocaleString("pt-BR"));

      if ((data || []).length === 0 && Number(count || 0) > 0) {
        setErrorMessage(
          `O Supabase informou ${count} paciente(s), mas a tela não recebeu a lista. Verifique permissões/RLS da tabela patients.`
        );
      }
    } catch (error: any) {
      console.error("Erro ao carregar pacientes:", error);
      setPatients([]);
      setErrorMessage(
        error?.message || "Erro inesperado ao carregar pacientes."
      );
    } finally {
      setLoading(false);
    }
  };


  const exportPatientsExcel = () => {
    try {
      const exportData = patients.map((patient) => ({
        Nome: patient.name || "",
        Telefone: patient.phone || "",
        CPF: patient.cpf || "",
        Email: patient.email || "",
        Endereco: patient.address || "",
        Observacoes: patient.notes || "",
        Cadastro: patient.created_at
          ? new Date(patient.created_at).toLocaleDateString("pt-BR")
          : "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Pacientes"
      );

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
      link.download = `pacientes-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Erro ao exportar Excel.");
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return patients;

    return patients.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const phone = String(p.phone || "").toLowerCase();
      const cpf = String(p.cpf || "").toLowerCase();

      return name.includes(term) || phone.includes(term) || cpf.includes(term);
    });
  }, [search, patients]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-[#d9eeee] rounded-3xl p-8 shadow-sm">
            <div className="text-slate-500">Carregando pacientes...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-3xl border border-[#b6e3e2] bg-gradient-to-r from-[#1db7b3] via-[#44c1bf] to-[#88d4d3] px-6 py-6 shadow-lg shadow-cyan-900/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                Pacientes
              </h1>
              <p className="mt-1 text-sm text-cyan-50">
                Lista de pacientes cadastrados no consultório.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={loadPatients}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-bold text-white border border-white/25 backdrop-blur-sm hover:bg-white/25 transition"
              >
                <RefreshCw size={18} />
                Atualizar
              </button>

              <button
                type="button"
                onClick={exportPatientsExcel}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-bold text-white border border-white/25 backdrop-blur-sm hover:bg-white/25 transition"
              >
                <Download size={18} />
                Exportar Excel
              </button>

              <Link
                href="/pacientes/novo"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/20 px-5 py-3 text-sm font-bold text-white border border-white/30 backdrop-blur-sm hover:bg-white/25 transition"
              >
                <Plus size={18} />
                Novo paciente
              </Link>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-red-100 p-2 text-red-700">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="font-black">Erro ao carregar pacientes</div>
                <div className="mt-1 text-sm whitespace-pre-wrap">
                  {errorMessage}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#d5eeee] bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Total carregado na tela
            </div>
            <div className="mt-2 text-3xl font-black text-slate-800">
              {patients.length}
            </div>
            {loadedAt && (
              <div className="mt-1 text-[11px] font-semibold text-slate-400">
                Atualizado em {loadedAt}
              </div>
            )}
          </div>

          <div className="md:col-span-2 rounded-2xl border border-[#d5eeee] bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por nome, telefone ou CPF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-2xl border border-[#d9eeee] bg-[#fbffff] text-sm text-slate-700 outline-none focus:bg-white focus:border-[#84d5d3]"
                />
              </div>

              <button
                type="button"
                onClick={exportPatientsExcel}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#239d9a] px-5 text-sm font-black text-white shadow-sm hover:bg-[#1f8f8c]"
              >
                <Download size={18} />
                Exportar Excel
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#d9eeee] rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[#e8f4f4] bg-[#f7ffff] flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eaf7f7] flex items-center justify-center text-[#239d9a]">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">
                Lista de pacientes
              </h2>
              <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                clique para abrir o prontuário
              </p>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-sm text-slate-500">
              {patients.length === 0
                ? "Nenhum paciente foi carregado na tela. Se o Supabase mostra 787 pacientes, o problema está na permissão/leitura da tabela patients."
                : "Nenhum paciente encontrado para essa busca."}
            </div>
          ) : (
            <div className="divide-y divide-[#edf7f7]">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  href={`/pacientes/${p.id}`}
                  className="block px-6 py-4 hover:bg-[#fbffff] transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-[#deeff0] text-[#5f7f84] flex items-center justify-center font-bold text-lg shrink-0">
                        {p.name?.charAt(0)?.toUpperCase() || "P"}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">
                          {p.name || "Paciente sem nome"}
                        </div>
                        <div className="text-sm text-slate-500 truncate">
                          {p.phone || "-"} {p.cpf && `• CPF: ${p.cpf}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm font-bold text-[#239d9a] shrink-0">
                      Abrir prontuário →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
