"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import PremiumKPI from "@/components/ui/PremiumKPI";
import PremiumSection from "@/components/ui/PremiumSection";
import { Button } from "@/components/ui/button";

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
          "Você não está logado. Faça login novamente para carregar os pacientes.",
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
          `O Supabase informou ${count} paciente(s), mas a tela não recebeu a lista. Verifique permissões/RLS da tabela patients.`,
        );
      }
    } catch (error: any) {
      console.error("Erro ao carregar pacientes:", error);
      setPatients([]);
      setErrorMessage(
        error?.message || "Erro inesperado ao carregar pacientes.",
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

      XLSX.utils.book_append_sheet(workbook, worksheet, "Pacientes");

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
      link.download = `pacientes-${new Date().toISOString().slice(0, 10)}.xlsx`;

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
      .split(/\\s+/)
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

    const digits = String(value).replace(/\\D/g, "");

    if (digits.length === 11) {
      return digits.replace(/^(\\d{2})(\\d{5})(\\d{4})$/, "($1) $2-$3");
    }

    if (digits.length === 10) {
      return digits.replace(/^(\\d{2})(\\d{4})(\\d{4})$/, "($1) $2-$3");
    }

    return String(value);
  };

  const formatCpf = (value?: string | null) => {
    if (!value) return "CPF não informado";

    const digits = String(value).replace(/\\D/g, "");

    if (digits.length === 11) {
      return digits.replace(/^(\\d{3})(\\d{3})(\\d{3})(\\d{2})$/, "$1.$2.$3-$4");
    }

    return String(value);
  };

  if (loading) {
    return (
      <div className="premium-page premium-page-padding">
        <div className="premium-container space-y-4">
          <div className="premium-card-lg overflow-hidden">
            <div className="h-32 animate-pulse bg-gradient-to-r from-[var(--clinic-primary-soft)] via-white to-[var(--clinic-surface-soft)]" />

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
    <div className="premium-page premium-page-padding">
      <div className="premium-container space-y-4">
        <PremiumPageHeader
          title="Pacientes"
          eyebrow="Central de relacionamento"
          subtitle="Base clínica, prontuários e cadastro de pacientes"
          icon={Users}
          actions={
            <>
              <Button type="button" variant="header" size="header" onClick={loadPatients}>
                <RefreshCw size={18} />
                Atualizar
              </Button>

              <Button
                type="button"
                variant="header"
                size="header"
                onClick={exportPatientsExcel}
              >
                <Download size={18} />
                Exportar Excel
              </Button>

              <Button asChild variant="headerLight" size="header">
                <Link href="/pacientes/novo">
                  <Plus size={18} />
                  Novo paciente
                </Link>
              </Button>
            </>
          }
        />

        {errorMessage && (
          <div className="premium-card-soft p-4 text-[var(--clinic-primary-dark)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--clinic-primary-soft)] p-2 text-[var(--clinic-primary)]">
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
          <PremiumKPI
            title="Total carregado"
            value={String(patients.length)}
            subtitle={loadedAt ? `Atualizado em ${loadedAt}` : "Base de pacientes"}
            icon={Users}
          />

          <PremiumKPI
            title="Resultado da busca"
            value={String(filtered.length)}
            subtitle={
              search.trim()
                ? "paciente(s) encontrados no filtro"
                : "sem filtro aplicado"
            }
            icon={Search}
          />

          <div className="premium-kpi relative min-h-[132px] overflow-hidden">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--clinic-primary-soft)] opacity-70" />

            <div className="relative flex h-full flex-col justify-between gap-4">
              <div>
                <p className="premium-kpi-label">Atalho rápido</p>
                <p className="mt-3 premium-kpi-value text-[var(--clinic-primary)]">
                  Novo cadastro
                </p>
                <p className="mt-2 text-[12px] font-semibold text-[var(--clinic-muted)]">
                  Criar paciente no sistema
                </p>
              </div>

              <Button asChild size="sm" className="w-full">
                <Link href="/pacientes/novo">
                  <Plus size={16} />
                  Cadastrar paciente
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <PremiumSection>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--clinic-muted-light)]" />

              <input
                type="text"
                placeholder="Buscar por nome, telefone, CPF ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="premium-input h-12 pl-12"
              />
            </div>

            <Button type="button" variant="outline" onClick={exportPatientsExcel}>
              <Download size={18} />
              Exportar Excel
            </Button>
          </div>
        </PremiumSection>

        <PremiumSection
          title="Lista de pacientes"
          subtitle="Clique para abrir o prontuário"
          actions={
            <span className="premium-badge premium-badge-primary">
              {filtered.length} exibido(s)
            </span>
          }
        >
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--clinic-muted)]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--clinic-primary-soft)] text-[var(--clinic-primary)]">
                <Search size={24} />
              </div>

              {patients.length === 0
                ? "Nenhum paciente foi carregado na tela. Se o Supabase mostra pacientes, o problema pode estar na permissão/leitura da tabela patients."
                : "Nenhum paciente encontrado para essa busca."}
            </div>
          ) : (
            <div className="-mx-6 -my-6 divide-y divide-[var(--clinic-border)]">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  href={`/pacientes/${p.id}`}
                  className="group block px-5 py-3.5 transition hover:bg-[var(--clinic-surface-soft)] md:px-6"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--clinic-primary-soft)] to-[var(--clinic-primary-softer)] text-base font-semibold text-[var(--clinic-primary)] ring-1 ring-[var(--clinic-border)] transition group-hover:scale-[1.03]">
                        {getPatientInitials(p.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-[15px] font-semibold text-[var(--clinic-text)]">
                            {p.name || "Paciente sem nome"}
                          </div>

                          {p.created_at && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[var(--clinic-muted)]">
                              desde {formatDate(p.created_at)}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-[var(--clinic-muted)]">
                          <span>{formatPhone(p.phone)}</span>
                          <span className="hidden text-slate-300 sm:inline">•</span>
                          <span>{formatCpf(p.cpf)}</span>

                          {p.email && (
                            <>
                              <span className="hidden text-slate-300 sm:inline">
                                •
                              </span>
                              <span className="truncate">{p.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <div className="rounded-full bg-[var(--clinic-primary-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--clinic-primary)] transition group-hover:bg-[var(--clinic-primary)] group-hover:text-white">
                        Abrir prontuário →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </PremiumSection>
      </div>
    </div>
  );
}
