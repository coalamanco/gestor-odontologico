"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FinancialRecord } from "@/lib/financeiro/financeiroService";
import { X } from "lucide-react";

type ReceivePaymentModalProps = {
  open: boolean;
  target: FinancialRecord | null;
  value: string;
  onValueChange: (value: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  receiptType: string;
  onReceiptTypeChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  parseMoney: (value: unknown) => number;
  formatCurrency: (value: unknown) => string;
};

export default function ReceivePaymentModal({
  open,
  target,
  value,
  onValueChange,
  paymentMethod,
  onPaymentMethodChange,
  receiptType,
  onReceiptTypeChange,
  note,
  onNoteChange,
  saving,
  onClose,
  onConfirm,
  parseMoney,
  formatCurrency,
}: ReceivePaymentModalProps) {
  if (!open || !target) return null;

  const total = parseMoney(target.amount);
  const paid = parseMoney(target.paid_amount);
  const balance = Math.max(0, total - paid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg overflow-hidden border border-[#d9eeee] shadow-xl animate-in zoom-in-95 duration-300">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#e7f6f6] bg-gradient-to-r from-[#fbffff] to-[#f4fcfc]">
          <div>
            <CardTitle className="text-[#239d9a]">Registrar pagamento</CardTitle>
            <CardDescription>Defina valor, forma de pagamento e recibo.</CardDescription>
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Lançamento</p>
            <p className="font-semibold text-slate-800">
              {target.installments && target.installments > 1
                ? `Parcela ${target.installment_number || 1}/${target.installments}`
                : "Débito"}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Valor total</p>
            <p className="text-xl font-semibold text-emerald-600">{formatCurrency(total)}</p>
            <p className="text-sm font-medium text-slate-500">
              Já pago: {formatCurrency(paid)} • Saldo: {formatCurrency(balance)}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Valor recebido agora</label>
            <Input
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              className="rounded-xl border-[#d9eeee] bg-[#fbffff]"
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Forma de pagamento</label>
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
            <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Tipo de recibo</label>
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
            <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Observação</label>
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
              Voltar
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-gradient-to-r from-[#1db7b3] via-[#46c1bf] to-[#77d0cf] font-semibold text-white hover:from-[#18a6a2] hover:to-[#67c8c7]"
              onClick={onConfirm}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
