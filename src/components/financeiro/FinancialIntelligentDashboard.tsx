interface FinancialIntelligentDashboardProps {
  recebidoHoje: string;
  recebidoMes: string;
  totalEmAberto: string;
  taxaInadimplencia: string;
  ticketMedio: string;
  recibosPendentes: number;
}

export default function FinancialIntelligentDashboard({
  recebidoHoje,
  recebidoMes,
  totalEmAberto,
  taxaInadimplencia,
  ticketMedio,
  recibosPendentes,
}: FinancialIntelligentDashboardProps) {
  return (
    <div className="rounded-3xl border border-[#d9eeee] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-800">
            Dashboard inteligente
          </h2>
          <p className="text-[13px] text-slate-500">
            Indicadores rápidos para acompanhar a saúde financeira da clínica.
          </p>
        </div>

        <div className="rounded-xl bg-[#eefafa] px-3 py-2 text-xs font-semibold text-[#239d9a]">
          Atualizado em tempo real
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <IndicatorCard
          label="Hoje"
          value={recebidoHoje}
          containerClassName="border-[#d9eeee] bg-white/50"
          textClassName="text-emerald-600"
        />
        <IndicatorCard
          label="Este mês"
          value={recebidoMes}
          containerClassName="border-sky-100 bg-sky-50/50"
          textClassName="text-sky-700"
        />
        <IndicatorCard
          label="Em aberto"
          value={totalEmAberto}
          containerClassName="border-amber-100 bg-amber-50/50"
          textClassName="text-amber-600"
        />
        <IndicatorCard
          label="Inadimplência"
          value={taxaInadimplencia}
          containerClassName="border-rose-100 bg-rose-50/50"
          textClassName="text-rose-700"
        />
        <IndicatorCard
          label="Ticket médio"
          value={ticketMedio}
          containerClassName="border-purple-100 bg-purple-50/50"
          textClassName="text-purple-600"
        />
        <IndicatorCard
          label="Recibos"
          value={String(recibosPendentes)}
          containerClassName="border-cyan-100 bg-cyan-50/50"
          textClassName="text-cyan-700"
        />
      </div>
    </div>
  );
}

interface IndicatorCardProps {
  label: string;
  value: string;
  containerClassName: string;
  textClassName: string;
}

function IndicatorCard({
  label,
  value,
  containerClassName,
  textClassName,
}: IndicatorCardProps) {
  return (
    <div className={`rounded-2xl border p-4 ${containerClassName}`}>
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${textClassName}`}
      >
        {label}
      </p>
      <p className={`mt-2 text-lg font-semibold ${textClassName}`}>{value}</p>
    </div>
  );
}
