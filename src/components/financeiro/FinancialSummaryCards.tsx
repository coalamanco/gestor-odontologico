import type { ReactNode } from "react";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { PremiumCard } from "@/components/ui/PremiumUI";

type FinancialSummaryCardsProps = {
  totalLancado: string;
  totalRecebido: string;
  totalAReceber: string;
  despesasPagas: string;
  despesasPendentes: string;
  saldo: string;
  recebidoHoje: string;
  recebidoMes: string;
  totalEmAberto: string;
  taxaInadimplencia: string;
  ticketMedio: string;
  recibosPendentes: number;
};

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <PremiumCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 truncate text-[21px] font-semibold tracking-[-0.02em] text-slate-800">
            {value}
          </p>

          {helper && (
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              {helper}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-[#eefafa] text-[#239d9a]">
          <DollarSign size={18} />
        </div>
      </div>
    </PremiumCard>
  );
}

function InsightCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: ReactNode;
}) {
  return (
    <PremiumCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 truncate text-[18px] font-semibold tracking-[-0.01em] text-[#239d9a]">
            {value}
          </p>

          {helper && (
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              {helper}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-[#eefafa] text-[#239d9a]">
          {icon}
        </div>
      </div>
    </PremiumCard>
  );
}

export default function FinancialSummaryCards({
  totalLancado,
  totalRecebido,
  totalAReceber,
  despesasPagas,
  despesasPendentes,
  saldo,
  recebidoHoje,
  recebidoMes,
  totalEmAberto,
  taxaInadimplencia,
  ticketMedio,
  recibosPendentes,
}: FinancialSummaryCardsProps) {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Lançado no período"
          value={totalLancado}
          helper="Total bruto do período filtrado"
        />

        <SummaryCard
          label="Recebido"
          value={totalRecebido}
          helper="Pagamentos registrados no período"
        />

        <SummaryCard
          label="A receber"
          value={totalAReceber}
          helper="Saldo aberto do período"
        />

        <SummaryCard
          label="Despesas pagas"
          value={despesasPagas}
          helper="Saídas confirmadas no período"
        />

        <SummaryCard
          label="Despesas pendentes"
          value={despesasPendentes}
          helper="Compromissos ainda em aberto"
        />

        <SummaryCard
          label="Saldo do período"
          value={saldo}
          helper="Recebido menos despesas pagas"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <InsightCard
          label="Recebido hoje"
          value={recebidoHoje}
          helper="Entrada registrada no dia"
          icon={<TrendingUp size={18} />}
        />

        <InsightCard
          label="Recebido no mês"
          value={recebidoMes}
          helper="Total recebido no mês atual"
          icon={<TrendingUp size={18} />}
        />

        <InsightCard
          label="Total em aberto"
          value={totalEmAberto}
          helper="Soma dos saldos ainda não quitados"
          icon={<Wallet size={18} />}
        />

        <InsightCard
          label="Inadimplência"
          value={taxaInadimplencia}
          helper="Percentual de registros vencidos reais"
          icon={<Wallet size={18} />}
        />

        <InsightCard
          label="Ticket médio"
          value={ticketMedio}
          helper="Média por paciente pagante no mês"
          icon={<DollarSign size={18} />}
        />

        <InsightCard
          label="Recibos pendentes"
          value={String(recibosPendentes)}
          helper="Pagamentos com recibo solicitado"
          icon={<Wallet size={18} />}
        />
      </div>
    </section>
  );
}
