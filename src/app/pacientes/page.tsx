"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Users, RefreshCw, AlertTriangle, Download } from "lucide-react";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
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
      const email = String(p.email || "").toLowerCase();

      return (
        name.includes(term) ||
        phone.includes(term) ||
        cpf.includes(term) ||
        email.includes(term)
      );
    });
  }, [search, patients]);

  const getPatientInitials = (name?: string | null) => {
    const parts = String(name || "Paciente")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) return "P";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Sem data";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Sem data";

    return date.toLocaleDateString("pt-BR");
  };

  const formatPhone = (value?: string | null) => {
    if (!value) return "Telefone não informado";

    const digits = String(value).replace(/\D/g, "");

    if (digits.length === 11) {
      return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    }

    if (digits.length === 10) {
      return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    }

    return String(value);
  };

  const formatCpf = (value?: string | null) => {
    if (!value) return "CPF não informado";

    const digits = String(value).replace(/\D/g, "");

    if (digits.length === 11) {
      return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    }

    return String(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-3 md:p-6">
        <div className="mx-auto w-full max-w-[1800px] space-y-4">
          <div className="overflow-hidden rounded-[30px] border border-[#d9eeee] bg-white/95 shadow-[0_8px_24px_rgba(35,157,154,0.05)]">
            <div className="h-32 animate-pulse bg-gradient-to-r from-[#effafa] via-white to-[#f4fbfb]" />
            <div className="space-y-4 p-6">
              <div className="h-5 w-48 animate-pulse rounded-full bg-slate-100" />
              <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-100" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7ffff] via-[#f3fcfc] to-[#eef8f8] p-3 pb-24 md:p-4">
      <div className="mx-auto w-full max-w-[1800px] space-y-4">
        <PremiumPageHeader
          title="Pacientes"
          eyebrow="Central de relacionamento"
          subtitle="Base clínica, prontuários e cadastro de pacientes"
          icon={Users}
          actions={
            <>
              <button
                type="button"
                onClick={loadPatients}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 text-[12px] font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25"
              >
                <RefreshCw size={18} />
                Atualizar
              </button>

              <button
                type="button"
                onClick={exportPatientsExcel}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 text-[12px] font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25"
              >
                <Download size={18} />
                Exportar Excel
              </button>

              <Link
                href="/pacientes/novo"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white px-4 text-[12px] font-bold text-[#239d9a] shadow-sm transition hover:bg-[#fbffff]"
              >
                <Plus size={18} />
                Novo paciente
              </Link>
            </>
          }
        />

        {errorMessage && (
          <div className="rounded-[24px] border border-[#d9eeee] bg-[#f7ffff] p-4 text-[#0f766e] shadow-[0_6px_18px_rgba(35,157,154,0.05)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[#eefafa] p-2 text-[#239d9a]">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="font-semibold">Erro ao carregar pacientes</div>
                <div className="mt-1 whitespace-pre-wrap text-sm">
                  {errorMessage}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-[26px] border border-[#d9eeee] bg-white/95 px-4 py-3.5 shadow-[0_6px_18px_rgba(35,157,154,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Total carregado
                </div>
                <div className="mt-2 text-[28px] font-semibold text-slate-800">
                  {patients.length}
                </div>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eefafa] text-[#239d9a]">
                <Users size={22} />
              </div>
            </div>

            {loadedAt && (
              <div className="mt-2 text-[11px] font-medium text-slate-400">
                Atualizado em {loadedAt}
              </div>
            )}
          </div>

          <div className="rounded-[26px] border border-[#d9eeee] bg-white/95 px-4 py-3.5 shadow-[0_6px_18px_rgba(35,157,154,0.05)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Resultado da busca
            </div>
            <div className="mt-2 text-[28px] font-semibold text-slate-800">
              {filtered.length}
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-400">
              {search.trim() ? "paciente(s) encontrados no filtro" : "sem filtro aplicado"}
            </div>
          </div>

          <div className="rounded-[26px] border border-[#d9eeee] bg-white/95 px-4 py-3.5 shadow-[0_6px_18px_rgba(35,157,154,0.05)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Atalho rápido
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/pacientes/novo"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#239d9a] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#1f8f8c]"
              >
                <Plus size={17} />
                Cadastrar paciente
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-[#d9eeee] bg-white/95 px-4 py-3.5 shadow-[0_6px_18px_rgba(35,157,154,0.05)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone, CPF ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-2xl border border-[#d9eeee] bg-[#fbffff] pl-12 pr-4 text-[13px] text-slate-700 outline-none transition focus:border-[#84d5d3] focus:bg-white focus:shadow-sm"
              />
            </div>

            <button
              type="button"
              onClick={exportPatientsExcel}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-700 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Download size={18} />
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-[#d9eeee] bg-white/95 shadow-[0_8px_24px_rgba(35,157,154,0.05)]">
          <div className="border-b border-[#edf5f5] bg-[#fbffff] px-5 py-3.5 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eaf7f7] text-[#239d9a]">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-slate-800">
                    Lista de pacientes
                  </h2>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    clique para abrir o prontuário
                  </p>
                </div>
              </div>

              <div className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#239d9a] ring-1 ring-[#d9eeee]">
                {filtered.length} exibido(s)
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-[#eefafa] text-[#239d9a]">
                <Search size={24} />
              </div>
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
                  className="group block px-5 py-3.5 transition hover:bg-[#fbffff] md:px-6"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#dff6f5] to-[#edfafa] text-base font-semibold text-[#239d9a] ring-1 ring-[#d9eeee] transition group-hover:scale-[1.03]">
                        {getPatientInitials(p.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-[15px] font-semibold text-slate-800">
                            {p.name || "Paciente sem nome"}
                          </div>

                          {p.created_at && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              desde {formatDate(p.created_at)}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-slate-500">
                          <span>{formatPhone(p.phone)}</span>
                          <span className="hidden text-slate-300 sm:inline">•</span>
                          <span>{formatCpf(p.cpf)}</span>
                          {p.email && (
                            <>
                              <span className="hidden text-slate-300 sm:inline">•</span>
                              <span className="truncate">{p.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <div className="rounded-full bg-[#eefafa] px-2.5 py-0.5 text-[10px] font-semibold text-[#239d9a] transition group-hover:bg-[#239d9a] group-hover:text-white">
                        Abrir prontuário →
                      </div>
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
