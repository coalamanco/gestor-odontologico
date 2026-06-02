"use client";

import { Wallet } from "lucide-react";

type DashboardDebtor = {
  patientId: string;
  name: string;
  amount: number;
};

type DashboardDebtorsProps = {
  debtors: DashboardDebtor[];
  formatCurrency: (value: number) => string;
};

export default function DashboardDebtors({
  debtors,
  formatCurrency,
}: DashboardDebtorsProps) {
  return (
    <section className="premium-card-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--clinic-border)] px-5 py-4">
        <div>
          <h2 className="text-[21px] font-black tracking-[-0.03em] text-[var(--clinic-text)]">
            Pacientes com saldo em aberto
          </h2>

          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--clinic-muted)]">
            Prioridade para cobrança
          </p>
        </div>

        <div className="premium-dashboard-icon h-11 w-11 rounded-[16px]">
          <Wallet size={20} />
        </div>
      </div>

      <div className="space-y-3 p-5">
        {debtors.length === 0 && (
          <div className="rounded-[22px] border border-dashed border-[var(--clinic-border)] bg-[var(--clinic-surface-soft)] p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--clinic-primary-soft)] text-[var(--clinic-primary)]">
              <Wallet size={22} />
            </div>

            <p className="text-sm font-bold text-[var(--clinic-muted)]">
              Nenhum saldo em aberto.
            </p>
          </div>
        )}

        {debtors.map((debtor, index) => (
          <div
            key={debtor.patientId}
            className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--clinic-border)] bg-white p-4 shadow-[var(--premium-shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 font-black text-amber-700 ring-1 ring-amber-100">
                {index + 1}
              </div>

              <div className="min-w-0">
                <div className="truncate text-[15px] font-black text-[var(--clinic-text)]">
                  {debtor.name}
                </div>

                <div className="text-[12px] font-semibold text-[var(--clinic-muted)]">
                  Saldo pendente
                </div>
              </div>
            </div>

            <div className="shrink-0 text-[15px] font-black text-amber-700">
              {formatCurrency(debtor.amount)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
