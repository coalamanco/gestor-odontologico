"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PaymentTransaction } from "@/lib/financeiro/financeiroService";

type EditPaymentModalProps = {
  open: boolean;
  payment: PaymentTransaction | null;
  amount: string;
  onAmountChange: (value: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  receiptType: string;
  onReceiptTypeChange: (value: string) => void;
  receivedAt: string;
  onReceivedAtChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formatCurrency: (value: unknown) => string;
  labelPaymentMethod: (value: unknown) => string;
};

export default function EditPaymentModal({
  open,
  payment,
  amount,
  onAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  receiptType,
  onReceiptTypeChange,
  receivedAt,
  onReceivedAtChange,
  note,
  onNoteChange,
  saving,
  onClose,
  onConfirm,
  formatCurrency,
  labelPaymentMethod,
}: EditPaymentModalProps) {
  if (!open || !payment) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg overflow-hidden border border-[#d9eeee] shadow-xl animate-in zoom-in-95 duration-300">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#e7f6f6] bg-gradient-to-r from-[#fbffff] to-[#f4fcfc]">
          <div>
            <CardTitle className="text-[#239d9a]">Editar pagamento recebido</CardTitle>
            <CardDescription>Altere valor, data, forma de pagamento e recibo.</CardDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-[#eefafa]"
            disabled={saving}
          >
            <X size={20} />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2 rounded-2xl border border-[#e7f6f6] bg-[#fbffff] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Pagamento selecionado
            </p>
            <p className="text-xl font-semibold text-[#239d9a]">
              {formatCurrency(payment.amount)}
            </p>
            <p className="text-sm font-medium text-slate-500">
              {payment.received_at
                ? new Date(payment.received_at).toLocaleDateString("pt-BR")
                : "Sem data"}
              {" • "}
              {labelPaymentMethod(payment.payment_method)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Valor recebido
              </label>
              <Input
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                className="rounded-xl border-[#d9eeee] bg-[#fbffff]"
                placeholder="0,00"
              />
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Data do recebimento
              </label>
              <Input
                type="date"
                value={receivedAt}
                onChange={(event) => onReceivedAtChange(event.target.value)}
                className="rounded-xl border-[#d9eeee] bg-[#fbffff]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Forma de pagamento
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#b6e3e2]"
              value={paymentMethod}
              onChange={(event) => onPaymentMethodChange(event.target.value)}
            >
              <option value="Pix">Pix</option>
              <option value="Cartão crédito">Cartão crédito</option>
              <option value="Cartão débito">Cartão débito</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Boleto">Boleto</option>
              <option value="Transferência">Transferência</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Tipo de recibo
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-[#d9eeee] bg-[#fbffff] px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#b6e3e2]"
              value={receiptType}
              onChange={(event) => onReceiptTypeChange(event.target.value)}
            >
              <option value="nenhum">Sem recibo</option>
              <option value="simples">Recibo simples</option>
              <option value="imposto_renda">Recibo IR</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Observação
            </label>
            <Input
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              className="rounded-xl border-[#d9eeee] bg-[#fbffff]"
              placeholder="Observação do pagamento"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-[#d9eeee] font-semibold text-slate-700"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              className="h-10 rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#77d0cf] font-semibold text-white hover:from-[#18a6a2] hover:to-[#67c8c7]"
              onClick={onConfirm}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
