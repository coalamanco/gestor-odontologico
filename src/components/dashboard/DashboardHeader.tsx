"use client";

import { BarChart3 } from "lucide-react";

type DashboardPeriod = "hoje" | "semana" | "mes";

type DashboardHeaderProps = {
  period: DashboardPeriod;
  setPeriod: (period: DashboardPeriod) => void;
  isAdminUser: boolean;
  saldoPrevisto: number;
  formatCurrency: (value: number) => string;
};

export default function DashboardHeader({
  period,
  setPeriod,
  isAdminUser,
  saldoPrevisto,
  formatCurrency,
}: DashboardHeaderProps) {
  return (
    <section className="premium-header relative overflow-hidden px-4 md:px-5">
      <div className="pointer-events-none absolute -right-16 -top-24 h-44 w-44 rounded-full bg-white/20" />
      <div className="pointer-events-none absolute -bottom-24 left-12 h-40 w-40 rounded-full bg-white/10" />

      <div className="relative z-10 flex min-h-[68px] flex-col justify-center gap-3 py-3 md:flex-row md:items-center md:justify-between md:py-0">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-white/25 bg-white/18 text-white shadow-sm backdrop-blur">
            <BarChart3 size={20} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-cyan-50/95">
              Dashboard da clínica
            </p>

            <h1 className="truncate text-[18px] font-black leading-tight text-white md:text-[21px]">
              Visão geral do consultório
            </h1>

            <p className="mt-0.5 max-w-3xl truncate text-[11px] font-medium text-cyan-50/90 md:text-[12px]">
              Acompanhe operação, agenda, financeiro e alertas principais.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          <div className="flex items-center gap-1 rounded-[15px] border border-white/25 bg-white/15 p-1 shadow-sm backdrop-blur">
            {(["hoje", "semana", "mes"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`h-8 rounded-[12px] px-2.5 text-[9px] font-black uppercase tracking-[0.11em] transition ${
                  period === item
                    ? "bg-white text-[var(--clinic-primary)] shadow-sm"
                    : "text-white hover:bg-white/15"
                }`}
              >
                {item === "hoje" ? "Hoje" : item === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>

          {isAdminUser && (
            <div className="rounded-[15px] border border-white/25 bg-white/15 px-3 py-1.5 text-right shadow-sm backdrop-blur">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/85">
                Saldo previsto
              </div>

              <div className="text-[13px] font-black leading-tight text-white">
                {formatCurrency(saldoPrevisto)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}