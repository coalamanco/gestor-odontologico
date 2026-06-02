"use client";

import { AlertCircle, BarChart3 } from "lucide-react";

type DashboardAlertsProps = {
  isAdminUser: boolean;
  vencidoEmAberto: number;
  parcelasVencidas: number;
  formatCurrency: (value: number) => string;
};

export default function DashboardAlerts({
  isAdminUser,
  vencidoEmAberto,
  parcelasVencidas,
  formatCurrency,
}: DashboardAlertsProps) {
  if (!isAdminUser) return null;

  return (
    <div className="space-y-5">
      {vencidoEmAberto > 0 && (
        <section className="rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-[18px] bg-amber-100 p-3 text-amber-700">
                <AlertCircle size={22} />
              </div>

              <div>
                <h3 className="text-[18px] font-black text-amber-900">
                  Atenção: existem parcelas vencidas em aberto
                </h3>

                <p className="mt-1 text-sm font-semibold text-amber-700">
                  {parcelasVencidas} parcela(s) vencida(s) • Total vencido:{" "}
                  {formatCurrency(vencidoEmAberto)}
                </p>
              </div>
            </div>

            <a
              href="/financeiro"
              className="rounded-[18px] bg-amber-600 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-700"
            >
              Abrir financeiro
            </a>
          </div>
        </section>
      )}

      <section className="premium-card-lg overflow-hidden">
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="premium-dashboard-icon h-14 w-14 rounded-[18px]">
              <BarChart3 size={24} />
            </div>

            <div>
              <h3 className="text-[22px] font-black text-[var(--clinic-text)]">
                Dashboard principal focado na operação
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--clinic-muted)]">
                Use esta tela para acompanhar o dia a dia. Para análise profunda,
                metas, forecast, marketing e BI completo, utilize o Dashboard
                Executivo.
              </p>
            </div>
          </div>

          <a
            href="/dashboard/executivo"
            className="inline-flex items-center justify-center rounded-[18px] bg-[var(--clinic-primary)] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-90"
          >
            Abrir BI Executivo
          </a>
        </div>
      </section>
    </div>
  );
}
