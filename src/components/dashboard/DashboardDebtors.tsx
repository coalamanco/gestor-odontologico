"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card className="rounded-2xl border border-[#d9eeee] bg-white shadow-sm">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-lg font-bold text-slate-800">
          Pacientes com saldo em aberto
        </CardTitle>

        <CardDescription className="text-xs font-black uppercase tracking-widest text-slate-400">
          Prioridade para cobrança
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 px-5 pb-5">
        {debtors.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d9eeee] bg-[#fbffff] p-4 text-center text-sm text-slate-400">
            Nenhum saldo em aberto.
          </div>
        )}

        {debtors.map((debtor, index) => (
          <div
            key={debtor.patientId}
            className="rounded-xl border border-[#d9eeee] bg-[#fbffff] p-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                {index + 1}
              </div>

              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate">
                  {debtor.name}
                </div>

                <div className="text-xs text-slate-500">
                  Saldo pendente
                </div>
              </div>
            </div>

            <div className="font-black text-amber-700">
              {formatCurrency(debtor.amount)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
