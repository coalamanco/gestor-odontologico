import { AlertTriangle } from "lucide-react";

type FinancialAlertsProps = {
  overduePatientsCount: number;
  highDebtPatientsCount: number;
  receiptWithPaymentCount: number;
  totalOpenFormatted: string;
  totalOverdueFormatted: string;
  patientsToChargeCount: number;
  onViewOverdue: () => void;
  onGenerateCharge: () => void;
  onViewReceipts: () => void;
  onViewAll: () => void;
};

function AlertMiniCard({
  title,
  value,
  helper,
  showAction,
  actionLabel,
  onAction,
  emphasis = "teal",
}: {
  title: string;
  value: string | number;
  helper: string;
  showAction?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  emphasis?: "teal" | "danger";
}) {
  const activeClass =
    emphasis === "danger"
      ? "border-red-100 bg-white"
      : "border-[#d9eeee] bg-white";

  const valueClass =
    emphasis === "danger" ? "text-red-600" : "text-[#239d9a]";

  const buttonClass =
    emphasis === "danger"
      ? "border-red-100 text-red-600 hover:bg-red-50"
      : "border-[#bfe8e7] text-[#239d9a] hover:bg-[#eefafa]";

  return (
    <div className={`rounded-2xl border p-4 ${activeClass}`}>
      <div className="text-[13px] font-semibold text-slate-800">
        {title}
      </div>

      <div className={`mt-2 text-lg font-semibold ${valueClass}`}>
        {value}
      </div>

      <div className="mt-1 text-xs font-medium text-slate-600">
        {helper}
      </div>

      {showAction && actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`mt-3 rounded-xl border bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${buttonClass}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function FinancialAlerts({
  overduePatientsCount,
  highDebtPatientsCount,
  receiptWithPaymentCount,
  totalOpenFormatted,
  totalOverdueFormatted,
  patientsToChargeCount,
  onViewOverdue,
  onGenerateCharge,
  onViewReceipts,
  onViewAll,
}: FinancialAlertsProps) {
  const totalAlerts =
    overduePatientsCount + highDebtPatientsCount + receiptWithPaymentCount;

  return (
    <section className="rounded-3xl border border-[#d9eeee] bg-white/95 p-4 shadow-[0_8px_24px_rgba(35,157,154,0.06)] ring-1 ring-white/60">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-[#eefafa] p-3 text-[#239d9a]">
            <AlertTriangle size={24} />
          </div>

          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-800">
              Alertas inteligentes
            </h2>

            <p className="mt-1 text-[13px] text-slate-500">
              Avisos automáticos para priorizar cobranças e pendências importantes.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#eefafa] px-4 py-3 text-[13px] font-semibold text-[#239d9a]">
          {totalAlerts} alerta(s)
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AlertMiniCard
          title="Débitos com mais de 30 dias"
          value={overduePatientsCount}
          helper={`Total: ${totalOverdueFormatted}`}
          showAction={overduePatientsCount > 0}
          actionLabel="Ver atrasados"
          onAction={onViewOverdue}
          emphasis={overduePatientsCount > 0 ? "danger" : "teal"}
        />

        <AlertMiniCard
          title="Dívidas acima de R$ 500"
          value={highDebtPatientsCount}
          helper="Prioridade alta para cobrança"
          showAction={highDebtPatientsCount > 0}
          actionLabel="Gerar cobrança"
          onAction={onGenerateCharge}
        />

        <AlertMiniCard
          title="Recibos para emitir"
          value={receiptWithPaymentCount}
          helper="Pagamentos com recibo solicitado"
          showAction={receiptWithPaymentCount > 0}
          actionLabel="Ver recibos"
          onAction={onViewReceipts}
        />

        <AlertMiniCard
          title="Total em aberto"
          value={totalOpenFormatted}
          helper={`${patientsToChargeCount} paciente(s) com atraso real`}
          showAction={patientsToChargeCount > 0}
          actionLabel="Ver todos"
          onAction={onViewAll}
        />
      </div>
    </section>
  );
}
