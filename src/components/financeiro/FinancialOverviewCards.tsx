"use client";

export type PaymentMethodSummaryItem = {
  label: string;
  total: number;
  percent: number;
};

export type OpenBalanceSummaryItem = {
  patient_id: string;
  name: string;
  paid: number;
  overdueBalance: number;
};

type ReceiptSummary = {
  simples: number;
  impostoRenda: number;
};

type Props = {
  paymentMethods: PaymentMethodSummaryItem[];
  topOpenBalances: OpenBalanceSummaryItem[];
  receiptSummary: ReceiptSummary;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function FinancialOverviewCards({
  paymentMethods,
  topOpenBalances,
  receiptSummary,
}: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm xl:col-span-1">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">Formas de pagamento</h2>
          <p className="text-[13px] text-slate-500">Recebimentos do período selecionado.</p>
        </div>

        <div className="space-y-3">
          {paymentMethods.length === 0 && (
            <p className="text-sm text-slate-400">Nenhum pagamento no período.</p>
          )}

          {paymentMethods.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="font-semibold text-[#239d9a]">
                  {currencyFormatter.format(item.total)}
                </span>
              </div>

              <div className="h-2 rounded-full bg-[#eefafa] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#239d9a]"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm xl:col-span-1">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">Maiores saldos vencidos</h2>
          <p className="text-[13px] text-slate-500">
            Pacientes com maior valor realmente vencido.
          </p>
        </div>

        <div className="space-y-2">
          {topOpenBalances.length === 0 && (
            <p className="text-sm text-slate-400">Nenhum saldo vencido.</p>
          )}

          {topOpenBalances.map((item) => (
            <div
              key={item.patient_id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#edf7f7] bg-[#fbffff] px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-800">{item.name}</div>
                <div className="text-[11px] text-slate-500">
                  Pago: {currencyFormatter.format(item.paid)}
                </div>
              </div>

              <div className="text-[13px] font-semibold text-amber-600 whitespace-nowrap">
                {currencyFormatter.format(item.overdueBalance)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm xl:col-span-1">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">Controle de recibos</h2>
          <p className="text-[13px] text-slate-500">Visão rápida dos recibos solicitados.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Simples
            </p>
            <p className="mt-2 text-lg font-semibold text-cyan-700">{receiptSummary.simples}</p>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-600">
              IR
            </p>
            <p className="mt-2 text-lg font-semibold text-purple-600">
              {receiptSummary.impostoRenda}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#edf7f7] bg-[#fbffff] p-3 text-[13px] text-slate-600">
          Dica: os lançamentos com recibo ficam destacados no histórico financeiro.
        </div>
      </div>
    </div>
  );
}
