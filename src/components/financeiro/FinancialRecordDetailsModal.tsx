"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinancialRecord, PaymentTransaction } from "@/lib/financeiro/financeiroService";
import { X } from "lucide-react";

type FinancialRecordDetailsModalProps = {
  record: FinancialRecord | null;
  transactions: PaymentTransaction[];
  onClose: () => void;
  onEditPayment: (payment: PaymentTransaction) => void;
  parseMoney: (value: unknown) => number;
  formatCurrency: (value: unknown) => string;
  labelStatus: (value: unknown) => string;
  labelPaymentMethod: (value: unknown) => string;
  labelReceipt: (value: unknown) => string;
};

export default function FinancialRecordDetailsModal({
  record,
  transactions,
  onClose,
  onEditPayment,
  parseMoney,
  formatCurrency,
  labelStatus,
  labelPaymentMethod,
  labelReceipt,
}: FinancialRecordDetailsModalProps) {
  if (!record) return null;

  const remainingBalance = Math.max(
    0,
    parseMoney(record.amount) - parseMoney(record.paid_amount)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-xl overflow-hidden border border-[#d9eeee] shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#e7f6f6] bg-gradient-to-r from-[#fbffff] to-[#f4fcfc]">
          <div>
            <CardTitle className="text-[#239d9a]">Detalhes do débito</CardTitle>
            <CardDescription>Informações completas do lançamento.</CardDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-[#eefafa]"
          >
            <X size={20} />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2 rounded-2xl border border-[#e7f6f6] bg-[#fbffff] p-4 text-sm">
            <div>
              <span className="font-semibold text-slate-700">Descrição:</span>{" "}
              <span className="text-slate-600">{record.description || "-"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Valor:</span>{" "}
              <span className="text-slate-600">{formatCurrency(record.amount)}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Já pago:</span>{" "}
              <span className="text-slate-600">{formatCurrency(record.paid_amount)}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Falta pagar:</span>{" "}
              <span className="text-slate-600">{formatCurrency(remainingBalance)}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Status:</span>{" "}
              <span className="text-slate-600">{labelStatus(record.status)}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Parcela:</span>{" "}
              <span className="text-slate-600">
                {record.installment_number || 1}/{record.installments || 1}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Forma de pagamento:</span>{" "}
              <span className="text-slate-600">{labelPaymentMethod(record.payment_method)}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Recibo:</span>{" "}
              <span className="text-slate-600">{labelReceipt(record.receipt_type)}</span>
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#239d9a]">Histórico de pagamentos</h3>
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-xl border border-[#e7f6f6] bg-[#fbffff] px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="text-slate-700">
                        <strong>{formatCurrency(Number(transaction.amount || 0))}</strong> em{" "}
                        {transaction.received_at
                          ? new Date(transaction.received_at).toLocaleDateString("pt-BR")
                          : "-"}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-500">
                          {labelPaymentMethod(transaction.payment_method)} • {labelReceipt(transaction.receipt_type)}
                        </span>

                        <button
                          type="button"
                          onClick={() => onEditPayment(transaction)}
                          className="rounded-lg border border-[#d9eeee] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#239d9a] hover:bg-[#eefafa]"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                    {transaction.note && (
                      <div className="mt-1 text-slate-500">Obs.: {transaction.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
