import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PremiumUI";

export default function FinancialHeader() {
  return (
    <PageHeader
      eyebrow="Gestão financeira"
      title="Financeiro"
      subtitle="Controle financeiro inteligente com vencimentos reais, parcelas, recebimentos e cobrança premium."
      icon={<Wallet size={18} />}
    />
  );
}
