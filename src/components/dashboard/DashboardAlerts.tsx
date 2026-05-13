"use client";

import { AlertCircle, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    <>
      {vencidoEmAberto > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <AlertCircle size={18} />
            </div>

            <div>
              <div className="font-bold text-amber-800">
                Atenção: existem parcelas vencidas em aberto
              </div>

              <div className="text-xs text-amber-700">
                {parcelasVencidas} parcela(s) vencida(s) • Total vencido:{" "}
                {formatCurrency(vencidoEmAberto)}
              </div>
            </div>
          </div>

          <a
            href="/financeiro"
            className="rounded-lg bg-amber-600 px-3 py-2 text-center text-xs font-bold text-white hover:bg-amber-700"
          >
            Abrir financeiro
          </a>
        </div>
      )}

      <Card className="rounded-2xl border border-[#d9eeee] bg-white shadow-sm overflow-hidden">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#eefafa] p-3 text-[#239d9a]">
              <BarChart3 size={20} />
            </div>

            <div>
              <div className="text-sm font-black text-slate-800">
                Dashboard principal focado na operação
              </div>

              <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Use esta tela para acompanhar o dia a dia. Para análise profunda,
                metas, forecast, marketing e BI completo, acesse o Dashboard
                Executivo.
              </div>
            </div>
          </div>

          <a
            href="/dashboard/executivo"
            className="inline-flex items-center justify-center rounded-xl bg-[#239d9a] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#1f8d8a]"
          >
            Abrir BI Executivo
          </a>
        </CardContent>
      </Card>
    </>
  );
}
